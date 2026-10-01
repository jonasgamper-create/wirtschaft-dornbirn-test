// Live-Abgleich (01.10.): steht jeder Abend, den die eigenen Eventseiten des
// Hauses auf Ticketist verlinken, auch auf der Webseite?
//
// Verglichen werden drei Stellen:
//   1. die eigenen Eventseiten (wirtschaft-dornbirn.at/event, eugen.family/event)
//   2. der Dienst (/api/termine) - von dort liest die Webseite ihre Abende
//   3. die veroeffentlichte Webseite (data/termine.json - Bilder und Preise)
//
// Fehlt ein KOMMENDER Abend im Dienst, schlaegt die Pruefung fehl. GitHub
// fuehrt sie jeden Morgen aus (.github/workflows/termine-abgleich.yml) und
// schickt bei einem Fehlschlag eine Mail. Abende ohne eigenes Pressefoto
// sind nur ein Hinweis: sie stehen mit Ersatzbild auf der Seite, bis
// `npm run sync:termine` gelaufen ist.
import { entdecke, holeTermin } from '../server/src/ticketist.mjs';

const DIENST = process.env.DIENST || 'https://wirtschaft-reservierung.jonas-gamper.workers.dev';
const SEITE = process.env.SEITE || 'https://wirtschaft-dornbirn.pages.dev';
const heute = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Vienna' });

const json = async url => {
  const antwort = await fetch(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
  if (!antwort.ok) throw new Error(`${url}: ${antwort.status}`);
  return antwort.json();
};

let fehler = 0;
const melde = (ok, text) => { if (!ok) fehler += 1; console.log(`${ok ? '  ✓' : '  ✗'} ${text}`); };

const { kennungen: aufSeiten } = await entdecke({}, { hoechstens: 0 });
melde(aufSeiten.length > 0, `Eigene Eventseiten gelesen: ${aufSeiten.length} Ticketwege verlinkt`);

const dienst = await json(`${DIENST}/api/termine`);
const imDienst = new Map();
for (const t of dienst.termine || []) {
  imDienst.set(t.id, t);
  for (const v of t.varianten || []) imDienst.set(v.id, { ...t, id: v.id, ticketUrl: v.ticketUrl });
}
melde(imDienst.size > 0, `Dienst liefert ${dienst.termine?.length || 0} Abende (${imDienst.size} Ticketwege)`);

const seite = await json(`${SEITE}/data/termine.json`);
const mitBild = new Set();
for (const t of seite.termine || []) {
  if (t.bild) mitBild.add(t.id);
  for (const v of t.varianten || []) if (t.bild) mitBild.add(v.id);
}

const fehlen = [];
const ohneBild = [];
for (const kennung of aufSeiten) {
  const termin = imDienst.get(kennung);
  if (termin) {
    if (termin.date >= heute && !mitBild.has(kennung)) ohneBild.push(kennung);
    continue;
  }
  // Nicht im Dienst: ist der Abend vorbei, ist das richtig. Sonst fehlt er.
  const roh = await holeTermin(kennung).catch(() => null);
  if (roh && roh.date < heute) continue;
  fehlen.push(`${kennung}${roh ? ` (${roh.date} ${roh.title})` : ' (beim Ticketdienst nicht lesbar)'}`);
}
melde(!fehlen.length, fehlen.length
  ? `${fehlen.length} kommende Abende fehlen auf der Webseite: ${fehlen.join(', ')}`
  : 'Jeder kommende Abend der Eventseiten steht auf der Webseite');
if (ohneBild.length) console.log(`  · Hinweis: ${ohneBild.length} Abende noch mit Ersatzbild (npm run sync:termine): ${ohneBild.join(', ')}`);

// Gegenprobe: jeder Ticketlink im Dienst zeigt auf seine eigene Kennung.
const falsch = [...imDienst.values()].filter(t => !String(t.ticketUrl || '').endsWith(`/events/${t.id}`));
melde(!falsch.length, falsch.length ? `Ticketlinks passen nicht: ${falsch.map(t => t.id).join(', ')}` : 'Jeder Ticketlink zeigt auf den richtigen Abend');

if (fehler) {
  console.error(`Live-Abgleich FEHLGESCHLAGEN: ${fehler} Punkt(e).`);
  process.exit(1);
}
console.log(`Live-Abgleich OK: ${aufSeiten.length} Ticketwege der Eventseiten, alle kommenden auf der Webseite.`);
