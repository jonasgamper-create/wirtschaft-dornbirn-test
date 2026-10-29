// Unterdomain-Pruefung (29.10.2026): ueberleben die fremden Dienste des
// Hauses den Domainumzug?
//
//   npm run check:unterdomains
//
// Der Befund, der diese Pruefung ausgeloest hat: gutscheine.,
// lieferservice. und tischreservierung.wirtschaft-dornbirn.at sind KEINE
// eigenstaendigen Eintraege. Sie zeigen per CNAME auf www, und www zeigt auf
// den alten Webserver. Wer www auf die neue Seite stellt, nimmt alle drei
// mit - und damit Gutscheinverkauf, Lieferdienst und das alte
// Reservierungssystem vom Netz, ohne sie angefasst zu haben.
//
// Die Seite verlinkt den Lieferdienst sogar selbst (ALT_TAKEAWAY), der
// Ausfall fiele also sofort Gaesten auf.
//
// Diese Pruefung sagt zweierlei:
//   1. Antwortet jede der drei Adressen noch?
//   2. Haengt sie noch an www - oder ist sie schon losgebunden?

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const fuehreAus = promisify(execFile);

const UNTERDOMAINS = ['gutscheine', 'lieferservice', 'tischreservierung'];
const DOMAIN = process.env.DOMAIN || 'wirtschaft-dornbirn.at';
const HAUPT = `www.${DOMAIN}`;

let fehler = 0;
let haengtNochAnWww = 0;
const zeile = (ok, text) => { if (!ok) fehler += 1; console.log(`  ${ok ? '✓' : '✗'} ${text}`); };

async function kette(name) {
  try {
    const { stdout } = await fuehreAus('dig', ['+short', name]);
    return stdout.trim().split('\n').filter(Boolean);
  } catch { return []; }
}

async function antwortet(name) {
  try {
    const steuerung = AbortSignal.timeout(12000);
    const antwort = await fetch(`https://${name}`, { redirect: 'follow', signal: steuerung });
    return antwort.status;
  } catch (e) { return `Netz (${e.name})`; }
}

console.log(`Unterdomain-Prüfung für ${DOMAIN}\n`);
for (const kurz of UNTERDOMAINS) {
  const name = `${kurz}.${DOMAIN}`;
  const eintraege = await kette(name);
  const status = await antwortet(name);
  const ueberWww = eintraege.some(e => e.replace(/\.$/, '') === HAUPT);
  zeile(status === 200, `${name} antwortet (${status})`);
  if (ueberWww) {
    haengtNochAnWww += 1;
    console.log(`    ⚠ zeigt auf ${HAUPT} – zieht www um, geht diese Adresse mit unter`);
  } else {
    console.log(`    losgebunden: ${eintraege.join(' → ') || '(kein Eintrag)'}`);
  }
}

console.log();
if (haengtNochAnWww) {
  console.log(`${haengtNochAnWww} von ${UNTERDOMAINS.length} Adressen hängen noch an ${HAUPT}.`);
  console.log('VOR dem Umzug lösen: je einen A-Eintrag direkt auf die Adresse des alten');
  console.log('Servers setzen, dann diese Prüfung wiederholen. Siehe docs/testlauf-und-umzug.md,');
  console.log('Stufe 4, Schritt 2.');
} else {
  console.log('Alle Adressen sind von www losgebunden – der Umzug kann sie nicht mitreißen.');
}
if (fehler) { console.error(`\n${fehler} Adresse(n) antworten nicht.`); process.exit(1); }
