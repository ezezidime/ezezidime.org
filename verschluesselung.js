/*
 * Ez Êzîdî me – Verschlüsselung im Handy (Web Crypto API)
 *
 * Verfahren je Datei (hybrid):
 *   1. Zufälliger AES-256-GCM-Schlüssel, zufälliger 12-Byte-IV
 *   2. Inhalt (JSON) mit AES-GCM verschlüsseln, Zusatzdaten (AAD) = "ezm-1|<typ>"
 *   3. AES-Schlüssel mit dem ÖFFENTLICHEN Admin-Schlüssel (RSA-OAEP-4096, SHA-256) verschlüsseln
 * Ergebnis ("Umschlag"):
 *   { format, typ, schluessel_id, alg, k, iv, c }   (k/iv/c Base64)
 * Entschlüsseln kann nur das Admin-Werkzeug mit dem privaten Schlüssel.
 * Dieser Code enthält und kennt KEINEN privaten Schlüssel.
 */
(function () {
  'use strict';
  const FORMAT = 'ezm-1';
  const ALG = 'RSA-OAEP-4096-SHA256+AES-256-GCM';
  let rsaSchluessel = null;

  function verfuegbar() {
    return !!(window.isSecureContext && window.crypto && crypto.subtle && crypto.randomUUID);
  }

  function b64(puffer) {
    const bytes = new Uint8Array(puffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }

  async function oeffentlicherSchluessel() {
    if (rsaSchluessel) return rsaSchluessel;
    const s = window.EZM_SCHLUESSEL;
    if (!s || !s.jwk || s.jwk.d) {
      // s.jwk.d wäre ein privater Schlüssel – das darf in der App nie vorkommen.
      throw new Error('Kein gültiger öffentlicher Schlüssel');
    }
    rsaSchluessel = await crypto.subtle.importKey(
      'jwk', s.jwk, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']
    );
    return rsaSchluessel;
  }

  async function verschluesseln(typ, objekt) {
    const rsa = await oeffentlicherSchluessel();
    const aes = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aad = new TextEncoder().encode(FORMAT + '|' + typ);
    const klartext = new TextEncoder().encode(JSON.stringify(objekt));
    const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: aad }, aes, klartext);
    const roh = await crypto.subtle.exportKey('raw', aes);
    const k = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, rsa, roh);
    return {
      format: FORMAT,
      typ: typ,
      schluessel_id: window.EZM_SCHLUESSEL.id,
      alg: ALG,
      k: b64(k),
      iv: b64(iv),
      c: b64(c)
    };
  }

  /* Dateiname = SHA-256 der Eintrags-ID (hex). Die ID selbst steht nur verschlüsselt in der Datei. */
  async function dateiname(id) {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id));
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /* Zufällige, nicht erratbare Eintrags-ID (UUID v4, 122 Bit Zufall). */
  function neueId() {
    return crypto.randomUUID();
  }

  window.EZM_KRYPTO = { verfuegbar, verschluesseln, dateiname, neueId };
})();
