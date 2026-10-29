// Unterdomain-Pruefung (29.10.2026): ueberleben die fremden Dienste des
// Hauses den Domainumzug?
//
//   npm run check:unterdomains
//
// Der Befund, der diese Pruefung ausgeloest hat (29.10.2026): In der Zone
// steht ein PLATZHALTER. Jeder erdenkliche Name unter der Domain zeigt auf
// www, und www zeigt auf den alten Webserver - auch Namen, die nie jemand
// angelegt hat. Nachweisbar daran, dass ein ausgedachter Name antwortet.
//
// Fuer den Umzug heisst das: Es gibt keine einzelnen Eintraege, die man
// nacheinander umstellen koennte. Wer www auf die neue Seite stellt, nimmt
// ALLES mit, was heute ueber den Platzhalter laeuft - Gutscheinverkauf,
// Lieferdienst, das alte Reservierungssystem und jeden Namen, an den gerade
// niemand denkt. Die neue Seite verlinkt den Lieferdienst sogar selbst
// (ALT_TAKEAWAY), der Ausfall fiele also sofort Gaesten auf.
//
// Der Ausweg: fuer jede Adresse, die gebraucht wird, VOR dem Umzug einen
// eigenen Eintrag anlegen. Ein eigener Eintrag sticht den Platzhalter.
//
// Diese Pruefung sagt dreierlei:
//   1. Gibt es den Platzhalter (noch)?
//   2. Antwortet jede gebrauchte Adresse?
//   3. Hat sie schon einen eigenen Eintrag - oder haengt sie am Platzhalter?

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

// Zuerst der Platzhalter. Ein ausgedachter Name, den niemand angelegt haben
// kann: antwortet er, faengt ein Platzhalter alles ab.
const erfunden = `gibtsnicht-${Date.now().toString(36)}`;
const platzhalter = (await kette(`${erfunden}.${DOMAIN}`)).length > 0;
if (platzhalter) {
  console.log(`  ⚠ PLATZHALTER in der Zone: auch "${erfunden}" löst auf.`);
  console.log('    Jeder Name unter der Domain folgt damit www. Zieht www um,');
  console.log('    zieht alles mit - auch was hier gar nicht aufgezählt ist.\n');
} else {
  console.log('  ✓ Kein Platzhalter: es lösen nur angelegte Namen auf.\n');
}
for (const kurz of UNTERDOMAINS) {
  const name = `${kurz}.${DOMAIN}`;
  const eintraege = await kette(name);
  const status = await antwortet(name);
  const ueberWww = eintraege.some(e => e.replace(/\.$/, '') === HAUPT);
  zeile(status === 200, `${name} antwortet (${status})`);
  if (ueberWww) {
    haengtNochAnWww += 1;
    console.log(`    ⚠ folgt ${HAUPT} – zieht www um, geht diese Adresse mit unter`);
  } else {
    console.log(`    eigener Eintrag: ${eintraege.join(' → ') || '(kein Eintrag)'}`);
  }
}

console.log();
if (haengtNochAnWww) {
  console.log(`${haengtNochAnWww} von ${UNTERDOMAINS.length} Adressen haben noch keinen eigenen Eintrag.`);
  console.log('VOR dem Umzug anlegen: je einen A-Eintrag direkt auf die Adresse des alten');
  console.log('Servers, dann diese Prüfung wiederholen. Ein eigener Eintrag sticht den');
  console.log('Platzhalter. Siehe docs/vorgehen-webseite.md, Schritt 6.');
} else {
  console.log('Jede Adresse hat ihren eigenen Eintrag – der Umzug kann sie nicht mitreißen.');
}
if (fehler) { console.error(`\n${fehler} Adresse(n) antworten nicht.`); process.exit(1); }
