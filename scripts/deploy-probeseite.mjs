// Die Testseite veroeffentlichen (29.10.2026).
//
//   npm run deploy:probeseite
//
// Dieselben Dateien wie die echte Seite, nur unter einer anderen Adresse:
//
//   https://probe-wirtschaft-dornbirn.pages.dev
//
// Dort schaltet sich die Seite von selbst auf den Probe-Dienst (site/probe.js
// erkennt den Namen). Eigene leere Datenbank, kein Mailversand, Band am
// unteren Rand. Die echte Domain wird dabei NICHT angefasst - kein Eintrag,
// keine Umstellung, nichts.
//
// Warum dieses Skript und nicht der nackte wrangler-Befehl: Der gibt am Ende
// eine Adresse MIT KENNUNG aus (f2afe30d.probe-...), die zu genau dieser
// einen Veroeffentlichung gehoert und sich jedes Mal aendert. Wer die
// weitergibt, verteilt einen Link, der beim naechsten Mal veraltet ist und
// den der Dienst nicht als bekannte Herkunft annimmt. Hier steht am Ende die
// FESTE Adresse - die eine, die man weitergibt.

import { execFileSync } from 'node:child_process';

const PROJEKT = 'probe-wirtschaft-dornbirn';
const ADRESSE = `https://${PROJEKT}.pages.dev`;

console.log('Seite bauen und prüfen …\n');
execFileSync('npm', ['run', 'ci'], { stdio: 'inherit' });

console.log('\nTestseite veröffentlichen …\n');
execFileSync('npx', ['wrangler@4', 'pages', 'deploy', './dist',
  `--project-name=${PROJEKT}`, '--branch=main', '--commit-dirty=true'], { stdio: 'inherit' });

console.log(`
──────────────────────────────────────────────────────────────
Die Testseite liegt unter:

   ${ADRESSE}

Das ist die Adresse, die weitergegeben wird. Die Adresse mit der
Kennung davor (oben in der Ausgabe) gehört nur zu dieser einen
Veröffentlichung und ändert sich beim nächsten Mal.

Dort gilt: eigene leere Datenbank, kein Mailversand, Band am
unteren Rand. Die echte Seite unter wirtschaft-dornbirn.at ist
unberührt.
──────────────────────────────────────────────────────────────`);
