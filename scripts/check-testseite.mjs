// Testseiten-Pruefung (29.10.2026): kann eine Probe vor dem Domainumzug
// jemals im echten Bestand landen?
//
// Der Testlauf vor dem Umzug (docs/vorgehen-webseite.md) stellt die fertige
// Seite unter einen Testnamen - neu.wirtschaft-dornbirn.at -, waehrend die
// alte Seite weiterlaeuft. Damit dort niemand aus Versehen einen echten Tisch
// belegt, gibt es ZWEI Schranken:
//
//   1. site/probe.js erkennt den Namen und spricht den Probe-Dienst an.
//   2. Der ECHTE Dienst nimmt eine Testadresse gar nicht erst an
//      (ALLOWED_ORIGINS), falls Schranke 1 ausfaellt.
//
// Diese Pruefung haelt beide fest - und prueft den Namensabgleich, indem sie
// ihn wirklich laufen laesst: an den echten Namen darf er nicht anschlagen.

import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const probe = await readFile('site/probe.js', 'utf8');
const wrangler = await readFile('server/wrangler.jsonc', 'utf8');
const fehler = [];
const pruefe = (was, ok) => { if (!ok) fehler.push(was); };

// ---- Schranke 1: die Seite erkennt sich selbst -----------------------------

pruefe('site/probe.js prueft nicht mehr jeden Namensteil',
  /split\('\.'\)\.some\(teil => TESTWORT\.test\(teil\)\)/.test(probe));

// ---- Und zwar wirklich: die Datei laufen lassen --------------------------
//
// Ein Mustervergleich sagt nur, dass der Abgleich DASTEHT. Hier laeuft die
// Datei selbst, in einer Minimal-Umgebung, und wir sehen nach, was sie setzt.

function laufMit(hostname, suche = '') {
  const bauteil = () => ({ style: {}, dataset: {}, append() {}, appendChild() {},
    setAttribute() {}, addEventListener() {}, textContent: '', offsetHeight: 40,
    querySelectorAll: () => [] });
  const fenster = {
    location: { hostname, search: suche, hash: '', pathname: '/' },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    innerWidth: 1200, addEventListener() {}, setTimeout() {},
    document: { body: bauteil(), documentElement: { style: { setProperty() {} } },
      createElement: bauteil, addEventListener() {}, querySelectorAll: () => [] },
    getComputedStyle: () => ({ position: 'static' })
  };
  fenster.window = fenster;
  const ktx = vm.createContext(fenster);
  vm.runInContext(probe, ktx);
  return { probe: Boolean(fenster.WIRTSCHAFT_PROBE), testseite: Boolean(fenster.WIRTSCHAFT_TESTSEITE) };
}

const FAELLE = [
  ['wirtschaft-dornbirn.at', '', false, false],
  ['www.wirtschaft-dornbirn.at', '', false, false],
  ['wirtschaft-dornbirn.pages.dev', '', false, false],
  ['067146d4.wirtschaft-dornbirn.pages.dev', '', false, false],
  ['jonasgamper-create.github.io', '', false, false],
  ['wirtschaft-dornbirn.at', '?probe=1', true, false],
  ['neu.wirtschaft-dornbirn.at', '', true, true],
  ['test.wirtschaft-dornbirn.at', '', true, true],
  ['staging.wirtschaft-dornbirn.at', '', true, true],
  ['probe-wirtschaft-dornbirn.pages.dev', '', true, true],
  ['f2afe30d.probe-wirtschaft-dornbirn.pages.dev', '', true, true],
  ['localhost', '', false, false]
];
for (const [host, suche, erwartetProbe, erwartetTest] of FAELLE) {
  let ergebnis;
  try { ergebnis = laufMit(host, suche); }
  catch (e) { pruefe(`probe.js laeuft nicht fuer ${host}: ${e.message}`, false); continue; }
  pruefe(`${host}${suche}: Probemodus ist ${ergebnis.probe}, erwartet ${erwartetProbe}`,
    ergebnis.probe === erwartetProbe);
  pruefe(`${host}${suche}: Testseite ist ${ergebnis.testseite}, erwartet ${erwartetTest}`,
    ergebnis.testseite === erwartetTest);
}

pruefe('Auf einer Testseite wird kein Band gezeigt',
  /const BAND_ZEIGEN = istTestseite;/.test(probe));
pruefe('Die Testseite bekommt einen Ausstieg zum Echtbetrieb - den darf sie nicht haben',
  /if \(!istTestseite\) band\.append\(raus\);/.test(probe));
pruefe('Der Probemodus wird auf einer Testseite nicht erzwungen',
  /const an = istTestseite \|\| ausAdresse\(\) \|\| lies\(\);/.test(probe));

// ---- Schranke 2: der echte Dienst weist Testadressen ab ---------------------

const listen = [...wrangler.matchAll(/"ALLOWED_ORIGINS": "([^"]*)"/g)].map(m => m[1]);
pruefe(`ALLOWED_ORIGINS steht nicht genau zweimal (gefunden: ${listen.length})`, listen.length === 2);
if (listen.length === 2) {
  const [echt, probeListe] = listen;
  const testnamen = /\/\/(neu|test|probe|staging)\./;
  for (const herkunft of echt.split(',')) {
    pruefe(`Der ECHTE Dienst erlaubt eine Testadresse: ${herkunft}`, !testnamen.test(herkunft));
  }
  pruefe('Der Probe-Dienst erlaubt neu.wirtschaft-dornbirn.at nicht',
    probeListe.includes('https://neu.wirtschaft-dornbirn.at'));
  pruefe('Der Probe-Dienst erlaubt die kostenlose Testadresse nicht',
    probeListe.includes('https://probe-wirtschaft-dornbirn.pages.dev'));
}

if (fehler.length) {
  console.error('Testseiten-Prüfung FEHLGESCHLAGEN:');
  for (const f of fehler) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`Testseiten-Prüfung OK: ${FAELLE.length} Adressen wirklich durch probe.js geschickt, `
  + 'Band und fehlender Ausstieg geprüft, echter Dienst weist Testadressen ab.');
