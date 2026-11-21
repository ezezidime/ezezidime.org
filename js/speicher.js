/*
 * Ez Êzîdî me – Speicher-Schnittstelle
 *
 * Jede Variante bietet dieselben drei Funktionen:
 *   anzahl()                               -> Promise<number>  Gesamtzahl gültiger Einträge (ohne Namen)
 *   eintragSenden(datei, umschlag)         -> Promise          verschlüsselten Eintrag ablegen
 *   loeschantragSenden(datei, umschlag)    -> Promise          verschlüsselten Löschantrag ablegen
 *
 * "datei" ist SHA-256(Eintrags-ID) als Hex – der Dateiname im Drive-Ordner.
 * Es werden NUR verschlüsselte Umschläge übertragen.
 */
(function () {
  'use strict';

  async function postJson(url, daten, extraOptionen) {
    const antwort = await fetch(url, Object.assign({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(daten),
      cache: 'no-store'
    }, extraOptionen || {}));
    if (!antwort.ok) throw new Error('HTTP ' + antwort.status);
    return antwort.json().catch(() => ({}));
  }

  /* Prototyp: lokaler Server (prototyp_server.py) legt Dateien in testdaten/ ab. */
  const PrototypServer = {
    async anzahl() {
      const r = await fetch('api/anzahl', { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      return j.anzahl;
    },
    eintragSenden(datei, umschlag) {
      return postJson('api/eintrag', { datei, umschlag });
    },
    loeschantragSenden(datei, umschlag) {
      return postJson('api/loeschantrag', { datei, umschlag });
    }
  };

  /*
   * Version 1 – VORBEREITET, NOCH NICHT AKTIV und NICHT GETESTET.
   * Google-Apps-Script (im Admin-Konto bereitgestellt) nimmt die Umschläge an
   * und legt sie im Drive-Ordner ab. Entwurf: admin-werkzeug/drive-vorbereitung/Code.gs
   * Content-Type text/plain vermeidet die CORS-Vorabfrage, die Apps Script nicht beantwortet.
   */
  const GoogleAppsScript = {
    url() {
      const u = window.EZM_KONFIG.appsScriptUrl;
      if (!u) throw new Error('appsScriptUrl fehlt in konfig.js');
      return u;
    },
    async anzahl() {
      const r = await fetch(this.url() + '?aktion=anzahl', { cache: 'no-store' });
      const j = await r.json();
      if (typeof j.anzahl !== 'number') throw new Error('Antwort ungültig');
      return j.anzahl;
    },
    async senden(aktion, datei, umschlag) {
      const j = await postJson(this.url(), { aktion, datei, umschlag },
        { headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
      if (!j.ok) throw new Error(j.fehler || 'Fehler');
      return j;
    },
    eintragSenden(datei, umschlag) { return this.senden('eintrag', datei, umschlag); },
    loeschantragSenden(datei, umschlag) { return this.senden('loeschantrag', datei, umschlag); }
  };

  window.EZM_SPEICHER = (window.EZM_KONFIG && window.EZM_KONFIG.speicher === 'apps-script')
    ? GoogleAppsScript
    : PrototypServer;
})();
