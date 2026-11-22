/*
 * Ez Êzîdî me – App-Logik, Version 2 (anonym, Dorf im Mittelpunkt)
 *
 * Ansichten: sprachwahl → start (Zahlen + Rangliste) → formular → fertig
 * Keine Namen, kein Telefon, keine E-Mail. Die Angaben werden im Handy verschlüsselt.
 * Offen übertragen (für die öffentliche Zählung) werden nur: Orts-ID aus der Liste
 * (oder "andere"), Wohnland-Code und Personenzahl.
 * Alle Nutzereingaben werden per textContent ausgegeben (kein innerHTML).
 */
(function () {
  'use strict';

  const T = window.EZM_TEXTE;
  const SPRACHEN = window.EZM_SPRACHEN;
  const ORTE = window.EZM_ORTE || [];
  const LAENDER = window.EZM_LAENDER || [];
  const KRYPTO = window.EZM_KRYPTO;
  const SPEICHER = window.EZM_SPEICHER;
  const LS_SPRACHE = 'ezm.sprache';
  const LS_DABEI = 'ezm.dabei.v2';
  const SEITE = 'https://ezezidime.org';

  const app = document.getElementById('app');

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function dabei() { try { const s = lsGet(LS_DABEI); return s ? JSON.parse(s) : null; } catch (e) { return null; } }

  /* ---------- Zustand ---------- */
  let sprache = T[lsGet(LS_SPRACHE)] ? lsGet(LS_SPRACHE) : null;
  let ansicht = sprache ? 'start' : 'sprachwahl';
  let vorSprachwahl = null;
  let entwurf = neuerEntwurf();
  let fehler = {};
  let ergebnis = null;   // nach dem Senden: { ortId, ortName, n }
  let rangCache = null;

  function neuerEntwurf() {
    return { ezidi: false, ort: '', land: '', stadt: '', personen: '', verheiratet: '', kinder: '' };
  }

  /* ---------- Hilfen ---------- */
  function spr() { return SPRACHEN.find(s => s.code === sprache) || SPRACHEN[0]; }
  function t(key, vars) {
    let s = (T[sprache] && T[sprache][key]);
    if (s === undefined) s = T.de[key];
    if (s === undefined) s = key;
    if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }
  function fmtZahl(n) { try { return new Intl.NumberFormat(spr().locale).format(n); } catch (e) { return String(n); } }
  function landName(code) {
    if (code === 'xx') return t('otherCountry');
    if (sprache === 'ku' && window.EZM_LAENDER_KU && window.EZM_LAENDER_KU[code]) return window.EZM_LAENDER_KU[code];
    try { return new Intl.DisplayNames([spr().locale], { type: 'region' }).of(code.toUpperCase()) || code; }
    catch (e) { return (window.EZM_LAENDER_KU && window.EZM_LAENDER_KU[code]) || code; }
  }
  const ORT_NACH_ID = {};
  ORTE.forEach(o => { ORT_NACH_ID[o.id] = o; });
  function ortAnzeige(o) { return o.n + ' – ' + o.r; }
  function normal(s) { return String(s || '').trim().toLocaleLowerCase('tr').replace(/\s+/g, ' '); }
  /* Eingabe → Orts-ID aus der Liste, sonst '' (dann Freitext) */
  function findeOrt(text) {
    const n = normal(text);
    if (!n) return '';
    const o = ORTE.find(x => normal(ortAnzeige(x)) === n || normal(x.n) === n);
    return o ? o.id : '';
  }
  function zahlFeld(s, min) {
    if (s === '' || s === null || s === undefined) return null;
    const n = Number(s);
    return Number.isInteger(n) && n >= min && n <= 50 ? n : NaN;
  }

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
    if (!opt.fehlerBehalten) fehler = {};
    render();
    window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', function (e) {
    const s = e.state && e.state.ansicht;
    if (!s) return;
    ansicht = s; fehler = {}; render();
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

  function render() {
    if (!sprache) ansicht = 'sprachwahl';
    if (ansicht === 'formular' && dabei()) ansicht = 'start';
    if (ansicht === 'fertig' && !ergebnis) ansicht = 'start';
    wendeSpracheAn();
    const bauer = { sprachwahl: ansichtSprachwahl, start: ansichtStart, formular: ansichtFormular, fertig: ansichtFertig }[ansicht] || ansichtStart;
    app.replaceChildren(bauer());
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
            sprache = s.code; lsSet(LS_SPRACHE, s.code);
            const ziel = vorSprachwahl || 'start'; vorSprachwahl = null; zeige(ziel);
          }
        }, h('span', { class: 'sprachname', text: s.name }), h('span', { class: 'appname', text: T[s.code].appName })))
      )
    );
  }

  /* ---------- Teilen ---------- */
  function teilenKnopf(textKey, ortName) {
    const msg = t(textKey, { ort: ortName || '' }) + ' ' + SEITE;
    return h('a', { class: 'knopf knopf-teilen knopf-breit', href: 'https://wa.me/?text=' + encodeURIComponent(msg),
      target: '_blank', rel: 'noopener', text: '📲 ' + t('shareVillage') });
  }

  /* ---------- Startseite ---------- */
  function balkenListe(eintraege, max) {
    return h('ol', { class: 'rang' }, eintraege.map(e => h('li', null,
      h('div', { class: 'rang-zeile' }, h('span', { class: 'rang-name', text: e.name }), h('span', { class: 'rang-zahl', text: fmtZahl(e.n) })),
      h('div', { class: 'rang-balken', 'aria-hidden': 'true' }, h('span', { style: 'width:' + Math.max(4, Math.round(100 * e.n / max)) + '%' }))
    )));
  }

  function fuelleRangliste(ziel, r) {
    const zahlen = ziel.querySelector('.zahlen');
    const listen = ziel.querySelector('.listen');
    if (!r) { zahlen.replaceChildren(h('p', { class: 'leise mitte', text: t('notAvailable') })); return; }
    zahlen.replaceChildren(
      h('div', { class: 'zahl-block' }, h('div', { class: 'zaehler-zahl', text: fmtZahl(r.anzahl || 0) }), h('div', { class: 'leise', text: t('total') })),
      h('div', { class: 'zahl-block' }, h('div', { class: 'zaehler-zahl', text: fmtZahl(r.personen || 0) }), h('div', { class: 'leise', text: t('personsTotal') }))
    );
    const orte = [];
    let andere = 0;
    for (const id in (r.orte || {})) {
      if (ORT_NACH_ID[id]) orte.push({ name: ORT_NACH_ID[id].n, n: r.orte[id] });
      else andere += r.orte[id];
    }
    orte.sort((a, b) => b.n - a.n);
    const top = orte.slice(0, 10);
    andere += orte.slice(10).reduce((s, e) => s + e.n, 0);
    if (andere) top.push({ name: t('otherPlaces'), n: andere });
    const laender = Object.keys(r.laender || {}).filter(c => LAENDER.indexOf(c) >= 0)
      .map(c => ({ name: landName(c), n: r.laender[c] })).sort((a, b) => b.n - a.n).slice(0, 8);
    listen.replaceChildren(...[
      !top.length ? h('p', { class: 'leise mitte', text: t('noData') }) : null,
      top.length ? h('div', { class: 'karte' }, h('h2', { text: t('rankingVillages') }), balkenListe(top, Math.max.apply(null, top.map(e => e.n)))) : null,
      laender.length ? h('div', { class: 'karte' }, h('h2', { text: t('rankingCountries') }), balkenListe(laender, laender[0].n)) : null
    ].filter(Boolean));
  }

  function ansichtStart() {
    const ich = dabei();
    const kryptoOk = KRYPTO.verfuegbar();
    const rang = h('div', null, h('div', { class: 'karte zahlen', 'aria-live': 'polite' }, h('div', { class: 'zaehler-zahl mitte', text: '…' })), h('div', { class: 'listen' }));
    if (rangCache) fuelleRangliste(rang, rangCache);
    SPEICHER.rangliste().then(r => { rangCache = r; fuelleRangliste(rang, r); }).catch(() => { if (!rangCache) fuelleRangliste(rang, null); });
    return h('div', null,
      !kryptoOk ? h('div', { class: 'meldung meldung-fehler', role: 'alert', text: t('cryptoUnavailable') }) : null,
      h('img', { src: 'assets/sonne.svg', alt: '', class: 'start-sonne' }),
      h('h1', { class: 'mitte', text: t('appName') }),
      h('p', { class: 'mitte frage', text: t('howMany') }),
      h('p', { class: 'mitte zaehlt', text: t('everyCounts') }),
      ich
        ? h('div', { class: 'knopfstapel' }, h('p', { class: 'mitte', text: t('alreadyIn') }), teilenKnopf(ich.ortName ? 'shareMsgVillage' : 'shareMsg', ich.ortName))
        : h('div', { class: 'knopfstapel' },
            h('button', { type: 'button', class: 'knopf knopf-haupt knopf-breit', disabled: !kryptoOk, onclick: () => zeige('formular'), text: t('startEntry') }),
            h('p', { class: 'mitte leise', text: t('anonymNote') })),
      rang
    );
  }

  /* ---------- Formular ---------- */
  function feld(labelKey, fkey, input, hinweisKey, pflicht) {
    const err = fehler[fkey];
    return h('div', { class: 'feld' + (err ? ' fehler' : '') },
      h('label', { for: input.id }, t(labelKey), pflicht ? h('span', { class: 'pflicht', 'aria-hidden': 'true', text: '*' }) : null),
      hinweisKey ? h('div', { class: 'leise klein', text: t(hinweisKey) }) : null,
      input,
      err ? h('div', { class: 'fehlertext', text: t(err) }) : null);
  }
  function eingabe(id, key, opt) {
    opt = opt || {};
    const el = h('input', { id: id, type: opt.type || 'text', autocomplete: 'off', maxlength: opt.max || '60',
      inputmode: opt.inputmode || null, list: opt.list || null, dir: 'auto', min: opt.min || null,
      oninput: e => {
        entwurf[key] = e.target.value;
        if (fehler[key]) {
          delete fehler[key];
          const w = el.closest('.feld');
          if (w) { w.classList.remove('fehler'); const f = w.querySelector('.fehlertext'); if (f) f.remove(); }
        }
      } });
    el.value = entwurf[key];
    return el;
  }

  function ansichtFormular() {
    const haken = h('input', { type: 'checkbox', id: 'f-ezidi', onchange: e => { entwurf.ezidi = e.target.checked; } });
    haken.checked = entwurf.ezidi;
    const liste = h('datalist', { id: 'orte-liste' }, ORTE.map(o => h('option', { value: ortAnzeige(o) })));
    const land = h('select', { id: 'f-land', onchange: e => { entwurf.land = e.target.value; } },
      h('option', { value: '', text: t('choose') }),
      LAENDER.filter(c => c !== 'xx').map(c => ({ c: c, n: landName(c) })).sort((a, b) => a.n.localeCompare(b.n))
        .map(x => h('option', { value: x.c, text: x.n })),
      h('option', { value: 'xx', text: t('otherCountry') }));
    land.value = entwurf.land;
    const verh = h('select', { id: 'f-verh', onchange: e => { entwurf.verheiratet = e.target.value; } },
      h('option', { value: '', text: t('choose') }), h('option', { value: 'ja', text: t('yes') }), h('option', { value: 'nein', text: t('no') }));
    verh.value = entwurf.verheiratet;

    const fehlerBox = h('div', { class: 'meldung meldung-fehler', role: 'alert', hidden: true });
    const knopf = h('button', { type: 'button', class: 'knopf knopf-haupt knopf-breit', text: t('submit') });
    knopf.addEventListener('click', () => absenden(knopf, fehlerBox));

    return h('div', null,
      h('h2', { text: t('formTitle') }),
      h('p', { class: 'leise', text: t('anonymNote') }),
      h('div', { class: 'karte' },
        h('label', { class: 'haken' + (fehler.ezidi ? ' fehler' : ''), for: 'f-ezidi' }, haken, h('span', { class: 'haken-text', text: t('iAmEzidi') })),
        fehler.ezidi ? h('div', { class: 'fehlertext', text: t(fehler.ezidi) }) : null,
        feld('village', 'ort', eingabe('f-ort', 'ort', { list: 'orte-liste', max: '60' }), 'villageHint', true),
        liste),
      h('div', { class: 'karte' },
        h('h3', { text: t('liveNow') }),
        h('div', { class: 'feld' }, h('label', { for: 'f-land', text: t('country') }), land),
        feld('city', 'stadt', eingabe('f-stadt', 'stadt', { max: '60' }))),
      h('div', { class: 'karte' },
        h('h3', { text: t('familyOpt') }),
        feld('persons', 'personen', eingabe('f-pers', 'personen', { type: 'number', inputmode: 'numeric', min: '1', max: '2' })),
        h('div', { class: 'feld' }, h('label', { for: 'f-verh', text: t('married') }), verh),
        feld('children', 'kinder', eingabe('f-kind', 'kinder', { type: 'number', inputmode: 'numeric', min: '0', max: '2' }))),
      h('p', { class: 'leise klein', text: t('privacy') }),
      fehlerBox,
      knopf,
      h('div', { class: 'knopfstapel' }, h('button', { type: 'button', class: 'knopf knopf-neben knopf-breit', onclick: () => zeige('start'), text: t('back') }))
    );
  }

  async function absenden(knopf, fehlerBox) {
    fehler = {};
    if (!entwurf.ezidi) fehler.ezidi = 'iAmEzidiErr';
    if (!String(entwurf.ort).trim()) fehler.ort = 'villageErr';
    const personen = zahlFeld(entwurf.personen, 1), kinder = zahlFeld(entwurf.kinder, 0);
    if (Number.isNaN(personen)) fehler.personen = 'numberErr';
    if (Number.isNaN(kinder)) fehler.kinder = 'numberErr';
    if (Object.keys(fehler).length) {
      render();
      const el = app.querySelector('.fehler input, .fehler select');
      if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); }
      return;
    }
    if (!KRYPTO.verfuegbar()) { fehlerBox.hidden = false; fehlerBox.textContent = t('cryptoUnavailable'); return; }
    knopf.disabled = true;
    knopf.replaceChildren(h('span', { class: 'laden', 'aria-hidden': 'true' }), t('sending'));
    fehlerBox.hidden = true;
    try {
      const ortId = findeOrt(entwurf.ort);
      const jetzt = new Date().toISOString();
      const daten = {
        version: 2, erstellt: jetzt.slice(0, 7), sprache: sprache, ezidi: true,
        ort_id: ortId, ort_text: ortId ? '' : String(entwurf.ort).trim().slice(0, 60),
        wohnland: entwurf.land || '', wohnstadt: String(entwurf.stadt).trim().slice(0, 60),
        personen: personen, verheiratet: entwurf.verheiratet || '', kinder: kinder
      };
      const id = KRYPTO.neueId();
      const datei = await KRYPTO.dateiname(id);
      const umschlag = await KRYPTO.verschluesseln('eintrag', daten);
      const antwort = await SPEICHER.eintragSenden(datei, umschlag, { ort: ortId || 'andere', land: daten.wohnland, personen: personen || 1 });
      const ortName = ortId ? ORT_NACH_ID[ortId].n : '';
      ergebnis = { ortId: ortId, ortName: ortName, n: antwort && typeof antwort.ort_anzahl === 'number' ? antwort.ort_anzahl : null };
      lsSet(LS_DABEI, JSON.stringify({ ortName: ortName, zeit: jetzt.slice(0, 10) }));
      rangCache = null;
      entwurf = neuerEntwurf();
      zeige('fertig', { ersetzen: true });
    } catch (e) {
      console.error(e);
      knopf.disabled = false;
      knopf.textContent = t('submit');
      fehlerBox.hidden = false;
      fehlerBox.textContent = t('sendError');
    }
  }

  /* ---------- Fertig ---------- */
  function ansichtFertig() {
    const e = ergebnis;
    return h('div', { class: 'mitte' },
      h('div', { class: 'erfolg-symbol', 'aria-hidden': 'true', text: '✓' }),
      h('h1', { text: t('thanks') }),
      h('p', { class: 'danke-text', text: t('thanksText') }),
      e.ortName && e.n ? h('div', { class: 'karte' }, h('p', { class: 'dorf-zahl', text: t('villageCount', { ort: e.ortName, n: fmtZahl(e.n) }) })) : null,
      h('div', { class: 'knopfstapel' },
        teilenKnopf(e.ortName ? 'shareMsgVillage' : 'shareMsg', e.ortName),
        h('button', { type: 'button', class: 'knopf knopf-neben knopf-breit', onclick: () => zeige('start'), text: t('toHome') }))
    );
  }

  history.replaceState({ ansicht: ansicht }, '');
  render();
})();
