/*
 * Ez Êzîdî me – App-Logik (Klick-Prototyp, Phase 2)
 *
 * Ansichten: sprachwahl → start → s1 (Einwilligung) → s2 (Person) → s3 (Familie)
 *            → s4 (Kontakt) → pruefen → fertig;  profil (eigene Daten, löschen)
 *
 * Sichtbarkeit V1: Nutzer sehen nur ihre eigenen Daten (lokale Kopie auf diesem Gerät).
 * Keine Suche, keine Liste, kein Stammbaum. Startseite zeigt nur die Gesamtzahl.
 * Alle Nutzereingaben werden per textContent ausgegeben (kein innerHTML).
 */
(function () {
  'use strict';

  const T = window.EZM_TEXTE;
  const SPRACHEN = window.EZM_SPRACHEN;
  const HERKUNFT = window.EZM_HERKUNFT;
  const KRYPTO = window.EZM_KRYPTO;
  const SPEICHER = window.EZM_SPEICHER;
  const LS_SPRACHE = 'ezm.sprache';
  const LS_EINTRAG = 'ezm.meinEintrag';
  const TEXTVERSION_EINWILLIGUNG = 'entwurf-2026-11';
  const JAHR_MIN = 1900;

  const app = document.getElementById('app');

  /* ---------- Browser-Speicher (immer mit try/catch) ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) { /* egal */ } }

  function ladeEintrag() {
    try { const s = lsGet(LS_EINTRAG); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }

  /* ---------- Zustand ---------- */
  let sprache = T[lsGet(LS_SPRACHE)] ? lsGet(LS_SPRACHE) : null;
  let ansicht = sprache ? 'start' : 'sprachwahl';
  let vorSprachwahl = null;
  let entwurf = neuerEntwurf();
  let fehler = {};
  let meldung = null;          // { typ: 'ok' | 'fehler', key }
  let letzteId = null;
  let letzteLokalGespeichert = true;

  function neuerEntwurf() {
    return {
      einwilligung: false,
      einwilligungZeit: null,
      person: { vorname: '', vater: '', grossvater: '', geburtsdatum: '', geburtsort: '', herkunft: '', herkunft_andere: '' },
      familie: { verheiratet: false, ehepartner: { vorname: '', vater: '', grossvater: '' }, kinder: [] },
      kontakt: { telefon: '', email: '' }
    };
  }

  /* ---------- Hilfen ---------- */
  function spr() { return SPRACHEN.find(s => s.code === sprache) || SPRACHEN[0]; }
  function t(key, vars) {
    let s = (T[sprache] && T[sprache][key]);
    if (s === undefined) s = T.de[key];
    if (s === undefined) s = key;
    if (vars && typeof s === 'string') for (const k in vars) s = s.replace('{' + k + '}', vars[k]);
    return s;
  }
  function ortName(key) {
    const o = T[sprache] && T[sprache].orte;
    return (o && o[key]) || key;
  }
  function fmtZahl(n) {
    try { return new Intl.NumberFormat(spr().locale).format(n); } catch (e) { return String(n); }
  }
  function fmtDatum(iso) {
    if (!iso) return t('none');
    if (/^\d{4}$/.test(iso)) return iso;
    const mm = /^(\d{4})-(\d{2})$/.exec(iso);
    if (mm) { try { return new Date(Date.UTC(+mm[1], +mm[2] - 1, 1)).toLocaleDateString(spr().locale, { timeZone: 'UTC', year: 'numeric', month: 'long' }); } catch (e) { return iso; } }
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return iso;
    try {
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString(spr().locale, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return iso; }
  }
  function leer(s) { return !s || !String(s).trim(); }

  /* Element bauen – Text immer als Textknoten, nie als HTML */
  function h(tag, attrs) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k of Object.keys(attrs)) {
        const v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (let i = 2; i < arguments.length; i++) haenge(el, arguments[i]);
    return el;
  }
  function haenge(el, kind) {
    if (kind === null || kind === undefined || kind === false) return;
    if (Array.isArray(kind)) { kind.forEach(k => haenge(el, k)); return; }
    el.append(kind instanceof Node ? kind : String(kind));
  }

  /* ---------- Navigation ---------- */
  function zeige(name, opt) {
    opt = opt || {};
    ansicht = name;
    if (opt.ersetzen) history.replaceState({ ansicht: name }, '');
    else history.pushState({ ansicht: name }, '');
    fehler = opt.fehlerBehalten ? fehler : {};
    render();
    window.scrollTo(0, 0);
  }

  window.addEventListener('popstate', function (e) {
    const s = e.state && e.state.ansicht;
    if (!s) return;
    ansicht = s;
    fehler = {};
    render();
  });

  document.getElementById('kopf-start').addEventListener('click', () => { if (sprache) zeige('start'); });
  document.getElementById('kopf-sprache').addEventListener('click', () => {
    if (ansicht !== 'sprachwahl') vorSprachwahl = ansicht;
    zeige('sprachwahl');
  });

  function wendeSpracheAn() {
    const s = spr();
    document.documentElement.lang = s.code;
    document.documentElement.dir = s.dir;
    document.title = sprache ? t('appName') : 'Ez Êzîdî me';
    document.getElementById('kopf-titel').textContent = sprache ? t('appName') : 'Ez Êzîdî me';
    document.getElementById('kopf-sprache-text').textContent = sprache ? s.code.toUpperCase() : '';
    document.getElementById('kopf-sprache').setAttribute('aria-label', sprache ? t('language') : 'Language');
    const band = document.getElementById('prototyp-band');
    const istTest = (window.EZM_KONFIG && window.EZM_KONFIG.prototyp) || (window.EZM_SCHLUESSEL && window.EZM_SCHLUESSEL.test);
    band.hidden = !(istTest && sprache);
    band.textContent = sprache ? t('prototype') : '';
  }

  /* ---------- Rendern ---------- */
  function render() {
    // Schutz: ohne Sprache → Sprachwahl; Formularschritte nur nach Einwilligung
    if (!sprache) ansicht = 'sprachwahl';
    if (['s2', 's3', 's4', 'pruefen'].indexOf(ansicht) >= 0 && !entwurf.einwilligung) ansicht = 's1';
    // V1: ein Eintrag pro Gerät – wer schon eingetragen ist, landet im Profil
    if (['s1', 's2', 's3', 's4', 'pruefen'].indexOf(ansicht) >= 0 && ladeEintrag()) ansicht = 'profil';

    wendeSpracheAn();
    const bauer = {
      sprachwahl: ansichtSprachwahl, start: ansichtStart,
      s1: ansichtEinwilligung, s2: ansichtPerson, s3: ansichtFamilie, s4: ansichtKontakt,
      pruefen: ansichtPruefen, fertig: ansichtFertig, profil: ansichtProfil
    }[ansicht] || ansichtStart;
    app.replaceChildren(bauer());
  }

  function fokusErsterFehler() {
    const el = app.querySelector('.fehler input, .fehler select, .haken.fehler input');
    if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); }
  }

  /* ---------- Sprachwahl ---------- */
  function ansichtSprachwahl() {
    return h('div', null,
      h('div', { class: 'sprachwahl-kopf' },
        h('img', { src: 'assets/sonne.svg', alt: '' }),
        h('h1', { text: 'Ez Êzîdî me' }),
        h('p', { class: 'sprachwahl-hinweis', text: SPRACHEN.map(s => T[s.code].chooseLanguage).join(' · ') })
      ),
      h('div', { class: 'sprachliste' },
        SPRACHEN.map(s => h('button', {
          type: 'button', class: 'sprachknopf', lang: s.code, dir: s.dir,
          'aria-current': s.code === sprache ? 'true' : null,
          onclick: () => {
            sprache = s.code;
            lsSet(LS_SPRACHE, s.code);
            const ziel = vorSprachwahl || 'start';
            vorSprachwahl = null;
            zeige(ziel);
          }
        },
          h('span', { class: 'sprachname', text: s.name }),
          h('span', { class: 'appname', text: T[s.code].appName })
        ))
      )
    );
  }

  /* ---------- Startseite ---------- */
  function ansichtStart() {
    const eintrag = ladeEintrag();
    const zahl = h('div', { class: 'zaehler-zahl', 'aria-live': 'polite', text: '…' });
    const zahlHinweis = h('div', { class: 'leise' });
    // Gesamtzahl erst ab einer Grenze anzeigen (konfig.js: zaehlerAb), vorher bleibt die Karte unsichtbar
    const ZAEHLER_AB = (window.EZM_KONFIG && +window.EZM_KONFIG.zaehlerAb) || 0;
    const zaehlerKarte = h('div', { class: 'karte zaehler', hidden: true },
      zahl,
      h('div', { class: 'zaehler-text', text: t('totalEntries') }),
      zahlHinweis
    );
    SPEICHER.anzahl()
      .then(n => { zahl.textContent = fmtZahl(n); if (n >= ZAEHLER_AB) zaehlerKarte.hidden = false; })
      .catch(() => { /* ohne Zahl bleibt die Karte unsichtbar */ });

    const kryptoOk = KRYPTO.verfuegbar();
    const m = meldung; meldung = null;

    return h('div', null,
      m ? h('div', { class: 'meldung meldung-' + m.typ, role: 'status', text: t(m.key) }) : null,
      !kryptoOk ? h('div', { class: 'meldung meldung-fehler', role: 'alert', text: t('cryptoUnavailable') }) : null,
      h('img', { src: 'assets/sonne.svg', alt: '', class: 'start-sonne' }),
      h('h1', { class: 'mitte', text: t('appName') }),
      h('p', { class: 'mitte leise', text: t('tagline') }),
      h('p', { class: 'mitte frage', text: t('howMany') }),
      h('p', { class: 'mitte zaehlt', text: t('everyCounts') }),
      h('p', { class: 'mitte', text: t('homeIntro') }),
      zaehlerKarte,
      eintrag
        ? h('div', { class: 'knopfstapel' },
            h('p', { class: 'mitte leise', text: t('alreadyRegistered') }),
            h('button', { type: 'button', class: 'knopf knopf-haupt knopf-breit', onclick: () => zeige('profil'), text: t('myData') }))
        : h('div', { class: 'knopfstapel' },
            h('button', { type: 'button', class: 'knopf knopf-haupt knopf-breit', disabled: !kryptoOk, onclick: () => zeige('s1'), text: t('startEntry') }))
    );
  }

  /* ---------- Schritt-Rahmen ---------- */
  function schrittRahmen(n, titelKey, inhalt, weiter, zurueck, weiterText) {
    return h('div', null,
      h('div', { class: 'schritt-anzeige' },
        h('div', { class: 'schritt-text', text: t('stepOf', { n: n }) }),
        h('div', { class: 'schritt-balken', 'aria-hidden': 'true' }, [1, 2, 3, 4].map(i => h('span', { class: i <= n ? 'an' : '' })))
      ),
      h('div', { class: 'karte' }, h('h2', { text: t(titelKey) }), inhalt),
      h('div', { class: 'knopfreihe' },
        h('button', { type: 'button', class: 'knopf knopf-neben', onclick: zurueck, text: t('back') }),
        h('button', { type: 'button', class: 'knopf knopf-haupt', onclick: weiter, text: weiterText || t('next') })
      )
    );
  }

  /* Textfeld, gebunden an obj[key]; Fehler-Schlüssel = fkey */
  function textfeld(obj, key, labelKey, fkey, opt) {
    opt = opt || {};
    const id = 'f-' + fkey.replace(/[^a-z0-9]/gi, '-');
    const err = fehler[fkey];
    const input = h('input', {
      id: id, type: opt.type || 'text', name: fkey,
      autocomplete: opt.autocomplete || 'off', inputmode: opt.inputmode || null,
      maxlength: opt.maxlength || '80', max: opt.max || null, min: opt.min || null,
      dir: opt.dir || 'auto',
      'aria-required': opt.pflicht ? 'true' : null,
      'aria-invalid': err ? 'true' : null,
      'aria-describedby': err ? id + '-err' : null,
      oninput: e => {
        obj[key] = e.target.value;
        if (fehler[fkey]) {           // Fehler verschwindet, sobald man tippt
          delete fehler[fkey];
          wrap.classList.remove('fehler');
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-describedby');
          if (errEl) errEl.remove();
        }
      }
    });
    input.value = obj[key] == null ? '' : obj[key];
    const errEl = err ? h('div', { class: 'fehlertext', id: id + '-err', text: t(err) }) : null;
    const wrap = h('div', { class: 'feld' + (err ? ' fehler' : '') },
      h('label', { for: id }, t(labelKey), opt.pflicht ? h('span', { class: 'pflicht', 'aria-hidden': 'true', text: '*' }) : null),
      input,
      errEl
    );
    return wrap;
  }

  /* ---------- Schritt 1: Einwilligung ---------- */
  function ansichtEinwilligung() {
    const err = fehler.einwilligung;
    const cb = h('input', {
      type: 'checkbox', id: 'f-einwilligung',
      'aria-invalid': err ? 'true' : null,
      onchange: e => {
        entwurf.einwilligung = e.target.checked;
        entwurf.einwilligungZeit = e.target.checked ? new Date().toISOString() : null;
      }
    });
    cb.checked = entwurf.einwilligung;

    const inhalt = [
      h('p', { text: t('consentIntro') }),
      h('ul', { class: 'punkte' }, t('consentPoints').map(p => h('li', { text: p }))),
      h('div', { class: 'hinweis-kinder', role: 'note', text: t('under16') }),
      h('label', { class: 'haken' + (err ? ' fehler' : ''), for: 'f-einwilligung' },
        cb, h('span', null, t('consentCheck'), h('span', { class: 'pflicht', 'aria-hidden': 'true', text: '*' }))),
      err ? h('div', { class: 'fehlertext', role: 'alert', text: t(err) }) : null,
      h('p', { class: 'entwurf-hinweis', text: t('draftNote') })
    ];
    return schrittRahmen(1, 'stepConsent', inhalt,
      () => {
        if (!entwurf.einwilligung) { fehler = { einwilligung: 'consentRequired' }; render(); fokusErsterFehler(); return; }
        zeige('s2');
      },
      () => zeige('start'));
  }

  /* ---------- Schritt 2: Person ---------- */
  function heuteIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function gueltigesDatum(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCMonth() !== +m[2] - 1) return false;
    return +m[1] >= JAHR_MIN && s <= heuteIso();
  }

  /* Geburtsdatum: Tag / Monat / Jahr als Auswahl – nur Jahr reicht.
     Gespeichert als "JJJJ", "JJJJ-MM" oder "JJJJ-MM-TT". */
  function datumFeld(p) {
    const err = fehler['p.geburtsdatum'];
    const pad = n => String(n).padStart(2, '0');
    if (p.gj === undefined && p.geburtsdatum) {
      const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(p.geburtsdatum);
      if (m) { p.gj = m[1]; p.gm = m[2] ? String(+m[2]) : ''; p.gt = m[3] ? String(+m[3]) : ''; }
    }
    function setze() {
      p.geburtsdatum = p.gj ? p.gj + (p.gm ? '-' + pad(p.gm) + (p.gt ? '-' + pad(p.gt) : '') : '') : '';
    }
    function auswahl(key, labelKey, optionen) {
      const sel = h('select', { id: 'f-g' + key, 'aria-label': t(labelKey), onchange: e => { p[key] = e.target.value; setze(); } },
        h('option', { value: '', text: t(labelKey) }),
        optionen.map(o => h('option', { value: o[0], text: o[1] })));
      sel.value = p[key] || '';
      return sel;
    }
    const tage = []; for (let i = 1; i <= 31; i++) tage.push([String(i), String(i)]);
    const monate = []; for (let i = 1; i <= 12; i++) {
      let n = String(i);
      try { n = new Date(Date.UTC(2000, i - 1, 1)).toLocaleDateString(spr().locale, { timeZone: 'UTC', month: 'long' }); } catch (e) {}
      monate.push([String(i), n]);
    }
    const jahre = []; for (let j = new Date().getFullYear(); j >= JAHR_MIN; j--) jahre.push([String(j), String(j)]);
    return h('div', { class: 'feld' + (err ? ' fehler' : '') },
      h('span', { class: 'label', text: t('birthDate') }),
      h('div', { class: 'datum3' }, auswahl('gt', 'day', tage), auswahl('gm', 'month', monate), auswahl('gj', 'year', jahre)),
      h('div', { class: 'leise', text: t('yearOnlyHint') }),
      err ? h('div', { class: 'fehlertext', text: t(err) }) : null);
  }

  function ansichtPerson() {
    const p = entwurf.person;
    const select = h('select', {
      id: 'f-herkunft',
      onchange: e => { p.herkunft = e.target.value; render(); }
    },
      h('option', { value: '', text: t('choose') }),
      HERKUNFT.map(o => h('option', { value: o, text: ortName(o) }))
    );
    select.value = p.herkunft;

    const inhalt = [
      h('p', { class: 'pflicht-legende', text: t('requiredLegend') }),
      textfeld(p, 'vorname', 'firstName', 'p.vorname', { pflicht: true, autocomplete: 'given-name' }),
      textfeld(p, 'vater', 'father', 'p.vater', { pflicht: true }),
      textfeld(p, 'grossvater', 'grandfather', 'p.grossvater', { pflicht: true }),
      datumFeld(p),
      textfeld(p, 'geburtsort', 'birthPlace', 'p.geburtsort', {}),
      h('div', { class: 'feld' }, h('label', { for: 'f-herkunft', text: t('origin') }), select),
      p.herkunft === 'Andere'
        ? textfeld(p, 'herkunft_andere', 'originOther', 'p.herkunft_andere', { pflicht: true })
        : null
    ];
    return schrittRahmen(2, 'stepPerson', inhalt,
      () => {
        const f = {};
        ['vorname', 'vater', 'grossvater'].forEach(k => { if (leer(p[k])) f['p.' + k] = 'errRequired'; });
        if ((p.gt && (!p.gm || !p.gj)) || (p.gm && !p.gj)) f['p.geburtsdatum'] = 'errDate';
        else if (/^\d{4}-\d{2}-\d{2}$/.test(p.geburtsdatum || '') && !gueltigesDatum(p.geburtsdatum)) f['p.geburtsdatum'] = 'errDate';
        // nur Jahr + Monat: darf nicht nach dem aktuellen Monat liegen
        else if (/^\d{4}-\d{2}$/.test(p.geburtsdatum || '') && p.geburtsdatum > heuteIso().slice(0, 7)) f['p.geburtsdatum'] = 'errDate';
        if (p.herkunft === 'Andere' && leer(p.herkunft_andere)) f['p.herkunft_andere'] = 'errRequired';
        if (Object.keys(f).length) { fehler = f; render(); fokusErsterFehler(); return; }
        zeige('s3');
      },
      () => zeige('s1'));
  }

  /* ---------- Schritt 3: Familie ---------- */
  function ansichtFamilie() {
    const fam = entwurf.familie;
    const jahrMax = new Date().getFullYear();

    function jaNein(wert) {
      return h('button', {
        type: 'button', 'aria-pressed': fam.verheiratet === wert ? 'true' : 'false',
        onclick: () => { fam.verheiratet = wert; fehler = {}; render(); },
        text: wert ? t('yes') : t('no')
      });
    }

    const kinderListe = fam.kinder.length === 0
      ? h('p', { class: 'leise', text: t('noChildren') })
      : fam.kinder.map((kind, i) => h('div', { class: 'unterbox' },
          h('div', { class: 'unterbox-kopf' },
            h('h3', { text: t('childN', { n: i + 1 }) }),
            h('button', {
              type: 'button', class: 'knopf knopf-gefahr knopf-klein',
              onclick: () => { fam.kinder.splice(i, 1); fehler = {}; render(); },
              text: t('removeChild')
            })
          ),
          h('div', { class: 'zeile2' },
            textfeld(kind, 'name', 'childName', 'k' + i + '.name', { pflicht: true }),
            textfeld(kind, 'geburtsjahr', 'birthYear', 'k' + i + '.geburtsjahr', { inputmode: 'numeric', maxlength: '4', dir: 'ltr' })
          )
        ));

    const inhalt = [
      h('div', { class: 'feld' },
        h('span', { class: 'label', id: 'l-verheiratet', text: t('married') }),
        h('div', { class: 'wahl', role: 'group', 'aria-labelledby': 'l-verheiratet' }, jaNein(true), jaNein(false))
      ),
      fam.verheiratet
        ? h('div', { class: 'unterbox' },
            h('h3', { text: t('spouse') }),
            textfeld(fam.ehepartner, 'vorname', 'firstName', 'e.vorname', { pflicht: true }),
            textfeld(fam.ehepartner, 'vater', 'father', 'e.vater', {}),
            textfeld(fam.ehepartner, 'grossvater', 'grandfather', 'e.grossvater', {}))
        : null,
      h('h3', { text: t('children') }),
      kinderListe,
      h('button', {
        type: 'button', class: 'knopf knopf-neben knopf-breit',
        onclick: () => {
          fam.kinder.push({ name: '', geburtsjahr: '' });
          render();
          const felder = app.querySelectorAll('input[name$=".name"]');
          if (felder.length) felder[felder.length - 1].focus();
        },
        text: t('addChild')
      })
    ];

    return schrittRahmen(3, 'stepFamily', inhalt,
      () => {
        // ganz leere Kinderzeilen entfernen
        fam.kinder = fam.kinder.filter(k => !leer(k.name) || !leer(k.geburtsjahr));
        const f = {};
        if (fam.verheiratet && leer(fam.ehepartner.vorname)) f['e.vorname'] = 'errRequired';
        fam.kinder.forEach((k, i) => {
          if (leer(k.name)) f['k' + i + '.name'] = 'errRequired';
          if (!leer(k.geburtsjahr)) {
            const j = String(k.geburtsjahr).trim();
            if (!/^\d{4}$/.test(j) || +j < JAHR_MIN || +j > jahrMax) f['k' + i + '.geburtsjahr'] = 'errYear';
          }
        });
        if (Object.keys(f).length) { fehler = f; render(); fokusErsterFehler(); return; }
        zeige('s4');
      },
      () => zeige('s2'));
  }

  /* ---------- Schritt 4: Kontakt ---------- */
  function ansichtKontakt() {
    const k = entwurf.kontakt;
    const inhalt = [
      h('p', { class: 'leise', text: t('contactHint') }),
      textfeld(k, 'telefon', 'phone', 'c.telefon', { type: 'tel', autocomplete: 'tel', inputmode: 'tel', dir: 'ltr', maxlength: '30' }),
      textfeld(k, 'email', 'email', 'c.email', { type: 'email', autocomplete: 'email', inputmode: 'email', dir: 'ltr', maxlength: '120' })
    ];
    return schrittRahmen(4, 'stepContact', inhalt,
      () => {
        const f = {};
        if (!leer(k.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(k.email.trim())) f['c.email'] = 'errEmail';
        if (Object.keys(f).length) { fehler = f; render(); fokusErsterFehler(); return; }
        zeige('pruefen');
      },
      () => zeige('s3'));
  }

  /* ---------- Datenanzeige (Prüfen + Profil) ---------- */
  function zeile(labelKey, wert) {
    // dir="auto": lateinische Namen bleiben auch in der arabischen Ansicht richtig herum
    return h('div', null, h('dt', { text: t(labelKey) }), h('dd', { dir: 'auto', text: leer(wert) ? t('none') : wert }));
  }
  function herkunftText(p) {
    if (!p.herkunft) return '';
    if (p.herkunft === 'Andere') return ortName('Andere') + (p.herkunft_andere ? ': ' + p.herkunft_andere : '');
    return ortName(p.herkunft);
  }
  function abschnitt(titelKey, zeilen, bearbeitenZiel) {
    return h('div', { class: 'karte' },
      h('div', { class: 'abschnitt-kopf' },
        h('h3', { text: t(titelKey) }),
        bearbeitenZiel ? h('button', { type: 'button', class: 'knopf-text', onclick: () => zeige(bearbeitenZiel), text: t('edit') }) : null
      ),
      h('dl', { class: 'daten' }, zeilen)
    );
  }
  function datenAbschnitte(d, mitBearbeiten) {
    const p = d.person, fam = d.familie, k = d.kontakt;
    const kinder = (fam.kinder || []).filter(c => !leer(c.name) || !leer(c.geburtsjahr));
    return [
      abschnitt('stepPerson', [
        zeile('firstName', p.vorname), zeile('father', p.vater), zeile('grandfather', p.grossvater),
        zeile('birthDate', p.geburtsdatum ? fmtDatum(p.geburtsdatum) : ''), zeile('birthPlace', p.geburtsort),
        zeile('origin', herkunftText(p))
      ], mitBearbeiten && 's2'),
      abschnitt('stepFamily', [
        zeile('married', fam.verheiratet ? t('yes') : t('no')),
        fam.verheiratet && fam.ehepartner
          ? zeile('spouse', [fam.ehepartner.vorname, fam.ehepartner.vater, fam.ehepartner.grossvater].filter(x => !leer(x)).join(' · '))
          : null,
        zeile('children', kinder.length
          ? kinder.map(c => c.name + (leer(c.geburtsjahr) ? '' : ' (' + c.geburtsjahr + ')')).join(', ')
          : '')
      ], mitBearbeiten && 's3'),
      abschnitt('stepContact', [zeile('phone', k.telefon), zeile('email', k.email)], mitBearbeiten && 's4')
    ];
  }

  /* ---------- Prüfen und absenden ---------- */
  function baueDaten(id) {
    const tr = s => (s == null ? '' : String(s)).trim();
    const p = entwurf.person, fam = entwurf.familie, k = entwurf.kontakt;
    const jetzt = new Date().toISOString();
    return {
      id: id,
      version: 1,
      erstellt: jetzt,
      sprache: sprache,
      einwilligung: { erteilt: true, zeitpunkt: entwurf.einwilligungZeit || jetzt, textversion: TEXTVERSION_EINWILLIGUNG },
      person: {
        vorname: tr(p.vorname), vater: tr(p.vater), grossvater: tr(p.grossvater),
        geburtsdatum: p.geburtsdatum || '', geburtsort: tr(p.geburtsort),
        herkunft: p.herkunft || '', herkunft_andere: p.herkunft === 'Andere' ? tr(p.herkunft_andere) : ''
      },
      familie: {
        verheiratet: !!fam.verheiratet,
        ehepartner: fam.verheiratet
          ? { vorname: tr(fam.ehepartner.vorname), vater: tr(fam.ehepartner.vater), grossvater: tr(fam.ehepartner.grossvater) }
          : null,
        kinder: fam.kinder
          .filter(c => !leer(c.name) || !leer(c.geburtsjahr))
          .map(c => ({ name: tr(c.name), geburtsjahr: leer(c.geburtsjahr) ? null : parseInt(c.geburtsjahr, 10) }))
      },
      kontakt: { telefon: tr(k.telefon), email: tr(k.email) }
    };
  }

  function ansichtPruefen() {
    const fehlerBox = h('div', { class: 'meldung meldung-fehler', role: 'alert', hidden: true });
    const knopf = h('button', { type: 'button', class: 'knopf knopf-haupt knopf-breit', text: t('submit') });
    knopf.addEventListener('click', async () => {
      if (!KRYPTO.verfuegbar()) { fehlerBox.hidden = false; fehlerBox.textContent = t('cryptoUnavailable'); return; }
      knopf.disabled = true;
      knopf.replaceChildren(h('span', { class: 'laden', 'aria-hidden': 'true' }), t('sending'));
      fehlerBox.hidden = true;
      try {
        const id = KRYPTO.neueId();
        const daten = baueDaten(id);
        const datei = await KRYPTO.dateiname(id);
        const umschlag = await KRYPTO.verschluesseln('eintrag', daten);
        await SPEICHER.eintragSenden(datei, umschlag);
        letzteId = id;
        letzteLokalGespeichert = lsSet(LS_EINTRAG, JSON.stringify({ daten: daten, datei: datei, schluessel_id: umschlag.schluessel_id }));
        entwurf = neuerEntwurf();
        zeige('fertig', { ersetzen: true });
      } catch (e) {
        console.error(e);
        knopf.disabled = false;
        knopf.textContent = t('submit');
        fehlerBox.hidden = false;
        fehlerBox.textContent = t('sendError');
      }
    });

    return h('div', null,
      h('h2', { text: t('review') }),
      h('p', { class: 'leise', text: t('reviewIntro') }),
      datenAbschnitte(baueDaten(''), true),
      fehlerBox,
      knopf,
      h('div', { class: 'knopfstapel' },
        h('button', { type: 'button', class: 'knopf knopf-neben knopf-breit', onclick: () => zeige('s4'), text: t('back') }))
    );
  }

  /* ---------- Fertig ---------- */
  function idBlock(id) {
    const kopieren = h('button', { type: 'button', class: 'knopf knopf-neben knopf-klein', text: t('copy') });
    kopieren.addEventListener('click', () => {
      if (navigator.clipboard) navigator.clipboard.writeText(id).then(() => { kopieren.textContent = t('copied'); }).catch(() => {});
    });
    return h('div', null,
      h('div', { class: 'label', text: t('entryId') }),
      h('div', { class: 'id-box', text: id }),
      kopieren,
      h('p', { class: 'leise', text: t('idHint') })
    );
  }

  function ansichtFertig() {
    return h('div', { class: 'mitte' },
      h('div', { class: 'erfolg-symbol', 'aria-hidden': 'true', text: '✓' }),
      h('h1', { text: t('thanks') }),
      h('p', { class: 'danke-text', text: t('thanksText') }),
      h('p', { class: 'leise', text: t('sentOk') }),
      letzteId ? h('div', { class: 'karte' }, idBlock(letzteId)) : null,
      h('div', { class: 'knopfstapel' },
        letzteLokalGespeichert && ladeEintrag()
          ? h('button', { type: 'button', class: 'knopf knopf-haupt knopf-breit', onclick: () => zeige('profil'), text: t('myData') })
          : null,
        h('a', { class: 'knopf knopf-teilen knopf-breit', href: 'https://wa.me/?text=' + encodeURIComponent(t('shareMsg') + ' https://ezezidime.org'), target: '_blank', rel: 'noopener', text: '📲 ' + t('shareFamily') }),
        h('button', { type: 'button', class: 'knopf knopf-neben knopf-breit', onclick: () => zeige('start'), text: t('toHome') }))
    );
  }

  /* ---------- Profil: nur eigene Daten ---------- */
  function ansichtProfil() {
    const e = ladeEintrag();
    if (!e || !e.daten) {
      return h('div', null,
        h('h2', { text: t('myData') }),
        h('p', { text: t('noEntry') }),
        h('button', { type: 'button', class: 'knopf knopf-neben knopf-breit', onclick: () => zeige('start'), text: t('toHome') }));
    }
    const d = e.daten;
    return h('div', null,
      h('h2', { text: t('myData') }),
      h('p', { class: 'leise', text: t('localHint') }),
      h('div', { class: 'karte' },
        idBlock(d.id),
        h('dl', { class: 'daten' }, zeile('sentOn', fmtDatum(d.erstellt)))),
      datenAbschnitte(d, false),
      h('div', { class: 'knopfstapel' },
        h('button', { type: 'button', class: 'knopf knopf-gefahr knopf-breit', onclick: () => loeschDialog(e), text: t('deleteMine') }),
        h('button', { type: 'button', class: 'knopf knopf-neben knopf-breit', onclick: () => zeige('start'), text: t('toHome') }))
    );
  }

  function loeschDialog(e) {
    const vorher = document.activeElement;
    const fehlerBox = h('div', { class: 'meldung meldung-fehler', role: 'alert', hidden: true });
    const ja = h('button', { type: 'button', class: 'knopf knopf-gefahr-voll', text: t('deleteYes') });
    const nein = h('button', { type: 'button', class: 'knopf knopf-neben', text: t('cancel') });
    const dialog = h('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'd-titel', 'aria-describedby': 'd-text' },
      h('h2', { id: 'd-titel', text: t('deleteMine') }),
      h('p', { id: 'd-text', text: t('deleteConfirm') }),
      fehlerBox,
      h('div', { class: 'knopfreihe' }, nein, ja));
    const hintergrund = h('div', { class: 'dialog-hintergrund', dir: spr().dir }, dialog);

    function schliessen() {
      document.removeEventListener('keydown', taste);
      hintergrund.remove();
      if (vorher && vorher.focus) vorher.focus();
    }
    function taste(ev) { if (ev.key === 'Escape' && !ja.disabled) schliessen(); }
    document.addEventListener('keydown', taste);
    nein.addEventListener('click', schliessen);
    hintergrund.addEventListener('click', ev => { if (ev.target === hintergrund && !ja.disabled) schliessen(); });

    ja.addEventListener('click', async () => {
      ja.disabled = true; nein.disabled = true;
      ja.replaceChildren(h('span', { class: 'laden', 'aria-hidden': 'true' }), t('deleting'));
      try {
        const id = e.daten.id;
        const datei = await KRYPTO.dateiname(id);
        const umschlag = await KRYPTO.verschluesseln('loeschantrag', { id: id, angefragt: new Date().toISOString() });
        await SPEICHER.loeschantragSenden(datei, umschlag);
        // Erst nach erfolgreichem Senden lokal löschen – sonst ginge die ID verloren.
        lsDel(LS_EINTRAG);
        letzteId = null;
        schliessen();
        meldung = { typ: 'ok', key: 'deleted' };
        zeige('start', { ersetzen: true });
      } catch (err) {
        console.error(err);
        ja.disabled = false; nein.disabled = false;
        ja.textContent = t('deleteYes');
        fehlerBox.hidden = false;
        fehlerBox.textContent = t('deleteError');
      }
    });

    document.body.append(hintergrund);
    nein.focus();
  }

  /* ---------- Start ---------- */
  history.replaceState({ ansicht: ansicht }, '');
  render();
})();
