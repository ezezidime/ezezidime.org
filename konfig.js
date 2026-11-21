/*
 * Ez Êzîdî me – Konfiguration
 *
 * speicher:
 *   'prototyp-server' – Prototyp: verschlüsselte Dateien gehen an den lokalen
 *                       Prototyp-Server (prototyp_server.py) und landen im Ordner testdaten/.
 *   'apps-script'     – Version 1 (vorbereitet, noch NICHT aktiv): Google-Apps-Script
 *                       im Admin-Konto legt die verschlüsselten Dateien im Drive-Ordner ab.
 *                       Entwurf: admin-werkzeug/drive-vorbereitung/Code.gs
 */
window.EZM_KONFIG = {
  speicher: 'apps-script',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycby_hXwKbdqJH2_SfVvtwl24lSjRPsuI3CFfV2KL8WRjfKxuG2OjKFb_PX02_rMQPNY-Yg/exec',
  prototyp: false,
  // Gesamtzahl auf der Startseite erst ab so vielen echten Einträgen anzeigen
  zaehlerAb: 300000
};
