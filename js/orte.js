/*
 * Ez Êzîdî me – Liste der Herkunftsorte (Dörfer/Städte) und Länder.
 * ⚠ Erste Liste von Claude – muss von Kennern geprüft und ergänzt werden.
 * id: nur a–z, 0–9, "-" (wird öffentlich gezählt). n: Name in Kurmancî. r: Region (zur Anzeige).
 * Ein Ort, der hier fehlt, kann im Formular frei eingetragen werden (bleibt verschlüsselt).
 */
window.EZM_ORTE = [
  // Şengal (Irak)
  { id: 'sengal', n: 'Şengal (bajar)', r: 'Şengal' },
  { id: 'sinune', n: 'Sinûnê', r: 'Şengal' },
  { id: 'xanesor', n: 'Xanesor', r: 'Şengal' },
  { id: 'borek', n: 'Borek', r: 'Şengal' },
  { id: 'dugure', n: 'Dugurê', r: 'Şengal' },
  { id: 'gir-zerik', n: 'Gir Zerik', r: 'Şengal' },
  { id: 'til-ezer', n: 'Til Ezêr', r: 'Şengal' },
  { id: 'siba-sex-xidir', n: 'Siba Şêx Xidir', r: 'Şengal' },
  { id: 'koco', n: 'Koço', r: 'Şengal' },
  { id: 'hardan', n: 'Hardan', r: 'Şengal' },
  { id: 'solax', n: 'Solax', r: 'Şengal' },
  { id: 'zorava', n: 'Zorava', r: 'Şengal' },
  { id: 'til-qeseb', n: 'Til Qeseb', r: 'Şengal' },
  // Şêxan / Nînewa (Irak)
  { id: 'sexan', n: 'Şêxan (Eyn Sifnî)', r: 'Şêxan' },
  { id: 'baedre', n: 'Ba’edrê', r: 'Şêxan' },
  { id: 'lalis', n: 'Laliş', r: 'Şêxan' },
  { id: 'xetare', n: 'Xetare', r: 'Şêxan' },
  { id: 'mem-sivan', n: 'Mem Şivan', r: 'Şêxan' },
  { id: 'kebertu', n: 'Kebertû', r: 'Şêxan' },
  { id: 'besiqe', n: 'Beşîqe', r: 'Nînewa' },
  { id: 'behzane', n: 'Behzanê', r: 'Nînewa' },
  // Dihok / Zaxo (Irak)
  { id: 'dihok', n: 'Dihok', r: 'Dihok' },
  { id: 'sarya', n: 'Şarya', r: 'Dihok' },
  { id: 'xanike', n: 'Xanikê', r: 'Dihok' },
  { id: 'esiyan', n: 'Êsiyan', r: 'Dihok' },
  { id: 'derebun', n: 'Dêrebûn', r: 'Zaxo' },
  { id: 'zaxo', n: 'Zaxo', r: 'Zaxo' },
  // Tirkiye
  { id: 'bersive', n: 'Bêrsivê', r: 'Tirkiye' },
  { id: 'batman', n: 'Êlih (Batman)', r: 'Tirkiye' },
  { id: 'besiri', n: 'Qubin (Beşîrî)', r: 'Êlih' },
  { id: 'sere-qere', n: 'Serê Qerê', r: 'Êlih' },
  { id: 'wiransehir', n: 'Wêranşehir', r: 'Riha' },
  { id: 'midyad', n: 'Midyad', r: 'Mêrdîn' },
  { id: 'nisebin', n: 'Nisêbîn', r: 'Mêrdîn' },
  { id: 'merdin', n: 'Mêrdîn', r: 'Tirkiye' },
  { id: 'sert', n: 'Sêrt', r: 'Tirkiye' },
  { id: 'amed', n: 'Amed (Diyarbekir)', r: 'Tirkiye' },
  { id: 'qers', n: 'Qers', r: 'Tirkiye' },
  // Sûriye
  { id: 'efrin', n: 'Efrîn', r: 'Sûriye' },
  { id: 'qamislo', n: 'Qamişlo', r: 'Sûriye' },
  { id: 'heseke', n: 'Hesekê', r: 'Sûriye' },
  { id: 'amude', n: 'Amûdê', r: 'Sûriye' },
  { id: 'dirbesiye', n: 'Dirbêsiyê', r: 'Sûriye' },
  { id: 'sere-kaniye', n: 'Serê Kaniyê', r: 'Sûriye' },
  // Kafkasya
  { id: 'elegez', n: 'Elegez', r: 'Ermenistan' },
  { id: 'armavir', n: 'Armavir', r: 'Ermenistan' },
  { id: 'yerevan', n: 'Yêrêvan', r: 'Ermenistan' },
  { id: 'tiflis', n: 'Tiflîs', r: 'Gurcistan' }
];

/* Länder für "Wo lebst du heute?" – Code: ISO-ähnlich, wird öffentlich gezählt */
window.EZM_LAENDER = ['de', 'iq', 'tr', 'sy', 'am', 'ge', 'ru', 'ua', 'kz', 'se', 'nl', 'be', 'fr', 'at', 'ch', 'gb', 'dk', 'us', 'ca', 'au', 'xx'];
