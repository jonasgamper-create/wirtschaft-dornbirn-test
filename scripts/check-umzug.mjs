// Umzugspruefung (01.10.): landet jede Adresse der alten Seite auf der neuen
// Seite an einer sinnvollen Stelle - und spricht der Dienst mit ihr?
//
//   npm run check:umzug                                   # gegen die Testadresse
//   SEITE=https://neu.wirtschaft-dornbirn.at npm run check:umzug   # Generalprobe
//   SEITE=https://wirtschaft-dornbirn.at npm run check:umzug       # nach dem Umschalten
//
// Geprueft werden: alle alten Adressen (site/data/alte-adressen.json, aus der
// Sitemap der WordPress-Seite), die Hauptseiten, die QR-Ziele (auf die
// gepruefte Seite umgerechnet) und ob der Dienst diese Herkunft annimmt.
import { readFile } from 'node:fs/promises';

const SEITE = (process.env.SEITE || 'https://wirtschaft-dornbirn.pages.dev').replace(/\/+$/, '');
const haus = JSON.parse(await readFile(new URL('../site/data/haus.json', import.meta.url), 'utf8'));
const alte = JSON.parse(await readFile(new URL('../site/data/alte-adressen.json', import.meta.url), 'utf8'));
const qr = JSON.parse(await readFile(new URL('../site/data/qr-ziele.json', import.meta.url), 'utf8'));

let fehler = 0;
const zeile = (ok, text) => { if (!ok) fehler += 1; console.log(`${ok ? '  ✓' : '  ✗'} ${text}`); };

async function landet(pfad) {
  try {
    const antwort = await fetch(SEITE + pfad, { redirect: 'follow', headers: { 'user-agent': 'Wirtschaft-Umzugspruefung' } });
    const ziel = antwort.url;
    const fremd = !ziel.startsWith(SEITE);
    const text = fremd ? '' : await antwort.text();
    const leer = /Seite nicht gefunden/i.test(text.slice(0, 4000));
    return { ok: antwort.status < 400 && !leer, status: antwort.status, ziel: ziel.replace(SEITE, '') || '/', fremd };
  } catch (e) {
    return { ok: false, status: 'Netz', ziel: String(e.message) };
  }
}

console.log(`Umzugspruefung gegen ${SEITE}\n`);
console.log('Hauptseiten');
for (const p of ['/', '/events', '/tischreservierung', '/takeaway', '/feste-catering', '/agentur', '/mittagskarte', '/impressum', '/datenschutz-sicherheit', '/tischplan/wirt.html']) {
  const r = await landet(p);
  zeile(r.ok, `${p} → ${r.status}`);
}

console.log(`\nAlte Adressen (${alte.pfade.length})`);
for (const p of alte.pfade) {
  const r = await landet(p);
  zeile(r.ok, `${p} → ${r.ziel} (${r.status})${r.fremd ? ' extern' : ''}`);
}

console.log('\nQR-Ziele (auf diese Seite umgerechnet)');
for (const [name, ziel] of Object.entries(qr).filter(([k]) => !k.startsWith('_'))) {
  const pfad = new URL(ziel.url).pathname.replace(/^\/wirtschaft-dornbirn-test/, '');
  const r = await landet(pfad);
  zeile(r.ok, `${name}: ${pfad} → ${r.ziel} (${r.status})`);
}

// Eine Testadresse muss vom ECHTEN Dienst abgewiesen werden - das ist die
// zweite Schranke gegen eine Probe, die im echten Bestand landet. Fuer eine
// echte Adresse gilt das Gegenteil. Darum haengt die Erwartung daran, was
// hier geprueft wird.
const istTestadresse = new URL(SEITE).hostname.split('.')
  .some(teil => /^(test|probe|staging)(-|$)/i.test(teil));

console.log('\nDienst');
for (const [art, adresse] of [['Echtbetrieb', haus.api], ['Probe', haus.probe]]) {
  if (!adresse) continue;
  const sollAnnehmen = art === 'Probe' ? istTestadresse : !istTestadresse;
  try {
    const antwort = await fetch(`${adresse.replace(/\/+$/, '')}/api/gesundheit`, { headers: { origin: SEITE } });
    const erlaubt = antwort.headers.get('access-control-allow-origin');
    const nimmtAn = erlaubt === SEITE;
    if (sollAnnehmen) {
      zeile(antwort.ok && nimmtAn,
        `${art}: erreichbar ${antwort.status}, nimmt ${SEITE} ${nimmtAn ? 'an' : 'NICHT an – ALLOWED_ORIGINS ergaenzen und neu ausrollen'}`);
    } else {
      zeile(!nimmtAn,
        `${art}: weist ${SEITE} ${nimmtAn ? 'NICHT ab – das waere die falsche Richtung' : 'ab (richtig so)'}`);
    }
  } catch (e) {
    zeile(false, `${art}: nicht erreichbar (${e.message})`);
  }
}

// ---- Sichtbarkeit bei Google ------------------------------------------------
//
// Die stillste Falle des ganzen Umzugs: Solange die Seite nicht unter der
// echten Domain liegt, traegt JEDE Seite "noindex" und robots.txt sperrt
// alles. Das ist richtig - ein zweiter Abzug der Seite soll nicht neben dem
// Original im Suchergebnis stehen.
//
// Umgelegt wird das erst im Build, und zwar nur mit PUBLIC_ENV=production
// (scripts/build-public.mjs). Vergisst das jemand am Umzugstag, geht die
// Seite live und ist fuer Google unsichtbar. Niemand merkt es, bis die
// Gaeste ausbleiben.
//
// Darum prueft das hier in BEIDE Richtungen: auf einer Testadresse muss die
// Sperre stehen, auf der echten Domain muss sie weg sein.

const echteDomain = /^https:\/\/(www\.)?wirtschaft-dornbirn\.at$/.test(SEITE);
console.log('\nSichtbarkeit bei Google');
try {
  const seite = await (await fetch(SEITE + '/')).text();
  const robots = await (await fetch(SEITE + '/robots.txt')).text();
  const gesperrt = /<meta\s+name="robots"\s+content="[^"]*noindex/i.test(seite);
  const robotsZu = /^\s*Disallow:\s*\/\s*$/m.test(robots);
  if (echteDomain) {
    zeile(!gesperrt, 'Startseite ist fuer Google freigegeben (kein noindex)');
    zeile(!robotsZu, 'robots.txt sperrt nicht die ganze Seite');
    if (gesperrt || robotsZu) {
      console.log('     → Der Build lief ohne PUBLIC_ENV=production.');
      console.log('       Richtig: PUBLIC_ENV=production npm run deploy:seite');
    }
  } else {
    zeile(gesperrt, 'Testadresse traegt noindex (darf nicht im Suchergebnis stehen)');
    zeile(robotsZu, 'Testadresse sperrt per robots.txt');
  }
} catch (e) {
  zeile(false, `Sichtbarkeit nicht pruefbar (${e.message})`);
}

if (fehler) { console.error(`\nUmzugspruefung: ${fehler} Punkt(e) offen.`); process.exit(1); }
console.log(`\nUmzugspruefung OK: alle Seiten, alle ${alte.pfade.length} alten Adressen, QR-Ziele und Dienst passen fuer ${SEITE}.`);
