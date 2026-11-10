// Die Termine beider Häuser einmal zu uns holen: Daten und Bilder.
//
//   npm run sync:termine
//
// Gelesen wird beim Ticketdienst - eine Kennung je Abend, dieselbe, unter
// der dort verkauft wird. Die Liste der Kennungen steht in
// site/data/termine.json und ist das Einzige, was von Hand gepflegt wird;
// alles andere (Name, Untertitel, Tag, Uhrzeit, Ort, Bild, Beschreibung,
// und seit 10.11.2026 die Ticketkategorien mit Preis und freien Karten)
// kommt vom Dienst.
//
// Der Dienst im Haus liest dieselbe Liste selbst und mehrmals täglich - auf
// der Eventseite steht also immer der aktuelle Stand, auch ohne diesen
// Schritt. Was der Dienst nicht kann, sind die Fotos: sie wandern hier
// einmal zu uns, damit kein Gast beim Blättern eine Spur beim Ticketdienst
// hinterlässt.
//
// Neue Kennung? In termine.json eintragen, diesen Schritt laufen lassen -
// oder sie dem Dienst nennen, der holt sie beim nächsten Durchgang selbst.

import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entdecke, gruppiere, holeKategorien, holeTermin, KENNUNGEN } from '../server/src/ticketist.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ziel = path.join(root, 'site', 'data', 'termine.json');
const bilderOrdner = path.join(root, 'site', 'assets', 'events', 'ticketist');

// Feste Kennungen plus alles, was die eigenen Eventseiten des Hauses auf
// den Ticketdienst verlinken (30.09.): ein neuer Abend braucht keinen
// Eintrag im Code mehr, um mit Bild auf die Seite zu kommen.
const gefunden = await entdecke({}, { hoechstens: 40 }).catch(() => ({ kennungen: [] }));
const neuGefunden = gefunden.kennungen.filter(k => !KENNUNGEN.includes(k));
if (neuGefunden.length) console.log(`  Auf den eigenen Eventseiten neu gefunden: ${neuGefunden.join(', ')}`);

// Was die Seite schon kennt, bleibt (10.11.2026): jeder Abend, den der
// Dienst im Haus fuehrt - auch die, die das Haus selbst aufgenommen hat und
// die auf keiner alten Seite (mehr) verlinkt sind. Sonst fiele ein Abend aus
// dem Rueckfall, sobald die Suche ihn nicht mehr findet (italiantribute-2027
// am 10.11.), und nach der Abschaltung der alten Seiten fielen alle
// gefundenen auf einmal weg. Die Liste des Dienstes ist dabei die Wahrheit:
// ein Abend, den das Haus dort wieder entfernt hat, kommt nicht zurueck. Nur
// wenn der Dienst nicht antwortet, gilt ersatzweise der bisherige Stand.
const bisher = await readFile(ziel, 'utf8').then(JSON.parse).catch(() => ({ termine: [] }));
// Dasselbe Fenster wie der Dienst: ein Abend bleibt eine Woche nach seinem
// Datum stehen ("verpasst"), damit geteilte Links nicht ins Leere fuehren.
const nachlaufIso = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const wegeVon = abende => (abende || []).flatMap(t => [t?.id, ...(t?.varianten || []).map(v => v?.id)]);
const ausBisher = wegeVon((bisher.termine || []).filter(t => String(t.date || '') >= nachlaufIso));
const ausDienst = await (async () => {
  try {
    const haus = JSON.parse(await readFile(path.join(root, 'site', 'data', 'haus.json'), 'utf8'));
    const basis = String(haus?.api || '').trim().replace(/\/+$/, '');
    if (!/^https:\/\//.test(basis)) return [];
    const antwort = await fetch(`${basis}/api/termine`);
    return antwort.ok ? wegeVon((await antwort.json())?.termine) : [];
  } catch {
    return [];
  }
})();
const gueltig = k => typeof k === 'string' && /^[a-z0-9-]{3,60}$/.test(k);
const zusaetzlich = ausDienst.length ? ausDienst : ausBisher;
if (!ausDienst.length) console.warn('  Der Dienst antwortet nicht - ersatzweise gilt der bisherige Stand.');
const dazu = [...new Set(zusaetzlich)]
  .filter(k => gueltig(k) && !KENNUNGEN.includes(k) && !gefunden.kennungen.includes(k));
if (dazu.length) console.log(`  ${ausDienst.length ? 'Vom Dienst' : 'Aus dem bisherigen Stand'}: ${dazu.join(', ')}`);
const kennungen = [...new Set([...KENNUNGEN, ...gefunden.kennungen, ...zusaetzlich])].filter(gueltig).sort();

await mkdir(bilderOrdner, { recursive: true });
const vorhanden = new Set(await readdir(bilderOrdner).catch(() => []));
/** 1200er-Fassung -> 2x-Fassung, damit geteilte Aufnahmen beide bekommen. */
const zweifach = new Map();

/** Aus einem geladenen Bild ein webp machen; ohne cwebp bleibt das Original. */
function alsWebp(rohdatei, zieldatei) {
  try {
    execFileSync('cwebp', ['-quiet', '-q', '72', '-resize', '1200', '0', rohdatei, '-o', zieldatei]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Die scharfe Fassung fuer Retina-Bildschirme (Jonas, 24.09.: "1500x3000"):
 * hoechstens 1500 px hoch und 3000 px breit, nie hochgerechnet. Die Kachel
 * laedt sie nur auf Bildschirmen, die die Pixel auch zeigen (srcset 2x); am
 * Telefon bleibt die 1200er-Fassung, damit die Seite leicht bleibt.
 */
function alsWebp2x(rohdatei, zieldatei) {
  try {
    let breite = 0; let hoehe = 0;
    try {
      const mass = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', rohdatei]).toString();
      breite = Number(/pixelWidth:\s*(\d+)/.exec(mass)?.[1] || 0);
      hoehe = Number(/pixelHeight:\s*(\d+)/.exec(mass)?.[1] || 0);
    } catch { /* ohne sips: Groesse unbekannt, dann Hoehe 1500 als Ziel */ }
    const groesse = hoehe > 1500 ? ['-resize', '0', '1500']
      : breite > 3000 ? ['-resize', '3000', '0']
      : (breite && hoehe) ? [] : ['-resize', '0', '1500'];
    execFileSync('cwebp', ['-quiet', '-q', '60', ...groesse, rohdatei, '-o', zieldatei]);
    return true;
  } catch {
    return false;
  }
}

// Die Preise: Kategorien, Preis und freie Karten stehen nicht auf der
// Eventseite, aber oeffentlich unter /api/ticket-categories?eventId=<nummer>
// (seit 10.11.2026; bis dahin eine Abschrift vom 14.09., der die 20 Abende
// ab Jaenner 2027 fehlten). Dieses Skript liest sie je Abend und schreibt
// sie nach site/data/ticketist-preise.json. Die Datei ist der Rueckfall fuer
// Seite und Dienst, wenn der Ticketdienst einmal nicht antwortet; im
// Betrieb liest der Dienst die Kategorien selbst. Antwortet er hier nicht,
// bleibt fuer diesen Abend der bisherige Eintrag.
const preisPfad = path.join(root, 'site', 'data', 'ticketist-preise.json');
const preisDatei = JSON.parse(await readFile(preisPfad, 'utf8'));
const preise = preisDatei.preise || {};
const neuePreise = {};
const ohneKategorien = [];
let kategorienGelesen = 0;

// Der bisherige Stand. Er ist der Rueckfall fuer jeden Abend, der sich
// gerade nicht lesen laesst: ein Aussetzer beim Ticketdienst darf keinen
// kommenden Abend aus der Datei loeschen. Genau das ist am 20.09.2026
// passiert - der Abend am 22.09. war nach einem einzigen misslungenen
// Abruf weg, ohne dass es jemandem aufgefallen waere.
const bisherNachId = new Map((bisher.termine || []).map(t => [t.id, t]));
// Auch die zweiten Wege (10.11.2026): faellt nur "comedy only" aus, haengt
// sein bisheriger Eintrag wieder am frisch gelesenen Abend - sonst stuende
// der Abend ohne ihn da und mit ausverkauftem Dinner als ganz ausverkauft.
const bisherVariante = new Map((bisher.termine || []).flatMap(t =>
  (t.varianten || []).map(v => [v.id, { abendId: t.id, variante: v }])));

const termine = [];
const fehlend = [];
const nachQuelle = new Map();
let geholt = 0;

for (const kennung of kennungen) {
  // Zwei Versuche: der Ticketdienst antwortet gelegentlich nicht, und ein
  // einzelner Aussetzer soll keinen Abend kosten.
  let termin = await holeTermin(kennung);
  if (!termin) {
    await new Promise(fertig => setTimeout(fertig, 1500));
    termin = await holeTermin(kennung);
  }
  if (!termin) { fehlend.push(kennung); continue; }
  // Auch hier zwei Versuche - ohne Antwort gilt der bisherige Eintrag.
  let kategorien = await holeKategorien(termin.eventId);
  if (!Array.isArray(kategorien)) {
    await new Promise(fertig => setTimeout(fertig, 1000));
    kategorien = await holeKategorien(termin.eventId);
  }
  if (Array.isArray(kategorien) && kategorien.length) {
    neuePreise[kennung] = kategorien;
    kategorienGelesen += 1;
  } else {
    ohneKategorien.push(kennung);
    if (Array.isArray(preise[kennung]) && preise[kennung].length) neuePreise[kennung] = preise[kennung];
  }
  termin.preise = neuePreise[kennung] || [];

  if (termin.bildQuelle) {
    // Dieselbe Aufnahme für mehrere Abende (die drei Luis-Termine teilen
    // sich ein Pressefoto): einmal holen genügt.
    const schon = nachQuelle.get(termin.bildQuelle);
    if (schon) { termin.bild = schon; if (zweifach.get(schon)) termin.bild2x = zweifach.get(schon); }
    else {
      const name = `${kennung}.webp`;
      const name2x = `${kennung}@2x.webp`;
      termin.bild = `assets/events/ticketist/${name}`;
      nachQuelle.set(termin.bildQuelle, termin.bild);
      if (vorhanden.has(name2x)) { termin.bild2x = `assets/events/ticketist/${name2x}`; zweifach.set(termin.bild, termin.bild2x); }
      // Auch holen, wenn nur die scharfe Fassung fehlt (seit 24.09.).
      if (!vorhanden.has(name) || !vorhanden.has(name2x)) {
        try {
          const antwort = await fetch(termin.bildQuelle);
          if (!antwort.ok) throw new Error(String(antwort.status));
          const roh = path.join(bilderOrdner, `${kennung}.roh`);
          await writeFile(roh, Buffer.from(await antwort.arrayBuffer()));
          const klein = vorhanden.has(name) || alsWebp(roh, path.join(bilderOrdner, name));
          if (klein && alsWebp2x(roh, path.join(bilderOrdner, name2x))) {
            termin.bild2x = `assets/events/ticketist/${name2x}`;
            zweifach.set(termin.bild, termin.bild2x);
          }
          if (klein) await rm(roh, { force: true });
          else {
            const ersatz = `${kennung}.jpg`;
            await rename(roh, path.join(bilderOrdner, ersatz));
            termin.bild = `assets/events/ticketist/${ersatz}`;
            nachQuelle.set(termin.bildQuelle, termin.bild);
          }
          geholt += 1;
        } catch (fehler) {
          console.warn(`  Bild fehlt: ${kennung} (${fehler.message}) - dort steht vorerst ein Abendfoto.`);
          delete termin.bild;
          nachQuelle.delete(termin.bildQuelle);
        }
      }
    }
  }

  // Die Adresse des Bildes beim Dienst gehört nicht in die veröffentlichte
  // Datei: sie würde einladen, doch wieder von außen zu laden.
  const { bildQuelle, ...schlank } = termin;
  termine.push(schlank);
}

// Zwei Wege zu einem Abend zusammenlegen - dieselbe Regel wie im Dienst.
const abende = gruppiere(termine);
// Die Preise des zweiten Weges haengen an SEINER Kennung ("comedy only" hat
// eigene Kategorien). Bis 20.09. bekamen nur die Hauptwege ihre Preise -
// ein zweiter Weg mit 0 frei stand auf der Seite als buchbar (rock4,
// 22.10.: "konzert only" war laut Liste weg, der Knopf sagte "buchbar").
for (const abend of abende) {
  for (const v of abend.varianten || []) v.preise = neuePreise[v.id] || preise[v.id] || [];
}

// Was auch beim zweiten Versuch nicht kam: den bisherigen Eintrag behalten,
// solange der Abend nicht vorbei ist. Ein alter Stand ist besser als eine
// Luecke - die Kachel bleibt stehen, der Ticketlink stimmt weiter.
const heute = new Date().toISOString().slice(0, 10);
const gerettet = [];
for (const kennung of fehlend) {
  const alt = bisherNachId.get(kennung);
  if (alt && alt.date >= heute) {
    // Ein geretteter Abend bringt seine zweiten Wege mit. Wurde einer davon
    // frisch gelesen, stuende er sonst zweimal da - einmal als eigener Abend.
    const seine = new Set((alt.varianten || []).map(v => v.id));
    for (let i = abende.length - 1; i >= 0; i -= 1) if (seine.has(abende[i].id)) abende.splice(i, 1);
    abende.push(alt);
    gerettet.push(kennung);
  } else {
    const teil = bisherVariante.get(kennung);
    const abend = teil && abende.find(a => a.id === teil.abendId);
    if (abend && abend.date >= heute && !(abend.varianten || []).some(v => v.id === kennung)) {
      abend.varianten = [...(abend.varianten || []), teil.variante];
      gerettet.push(kennung);
    }
  }
  // Seine Preise bleiben ebenso im Rueckfall stehen.
  if (!neuePreise[kennung] && Array.isArray(preise[kennung]) && preise[kennung].length) neuePreise[kennung] = preise[kennung];
}
if (gerettet.length) {
  abende.sort((a, b) => a.date.localeCompare(b.date) || String(a.zeit).localeCompare(String(b.zeit)));
  console.warn(`  Aus dem bisherigen Stand behalten: ${gerettet.join(', ')}`);
}

if (fehlend.length) {
  console.warn(`  Nicht gelesen: ${fehlend.join(', ')}`);
  console.warn('  (Kennung falsch geschrieben, oder der Termin ist beim Dienst nicht mehr da.)');
}

// Mehr als eine Handvoll Ausfaelle heisst: beim Ticketdienst klemmt etwas.
// Dann wird die gute Datei NICHT durch eine halbe ersetzt.
// Verloren ist, was am Ende weder als Abend noch als zweiter Weg dasteht -
// auch ein zweiter Weg, der mit seinem geretteten Abend zurueckkam, zaehlt
// als vorhanden.
const stehtDa = new Set(abende.flatMap(a => [a.id, ...(a.varianten || []).map(v => v.id)]));
const verloren = fehlend.filter(k => !stehtDa.has(k));
if (fehlend.length > 5) {
  console.error(`sync-termine FEHLER: ${fehlend.length} Abende nicht lesbar - die alte Datei bleibt stehen.`);
  process.exit(1);
}
if (verloren.length) {
  console.warn(`  Ohne Eintrag (weder gelesen noch im bisherigen Stand): ${verloren.join(', ')}`);
}
if (!termine.length) {
  console.error('sync-termine FEHLER: kein einziger Termin gelesen - die alte Datei bleibt stehen.');
  process.exit(1);
}

// Kein Weg doppelt - weder zwei Abende mit derselben Kennung noch ein Abend,
// der zugleich zweiter Weg eines anderen ist. Sonst lieber die alte Datei.
{
  const alle = abende.flatMap(a => [a.id, ...(a.varianten || []).map(v => v.id)]);
  const doppelt = alle.filter((k, i) => alle.indexOf(k) !== i);
  if (doppelt.length) {
    console.error(`sync-termine FEHLER: doppelt eingetragen: ${[...new Set(doppelt)].join(', ')} - die alte Datei bleibt stehen.`);
    process.exit(1);
  }
}

await writeFile(ziel, JSON.stringify({
  version: 1,
  updatedAt: new Date().toISOString().slice(0, 10),
  quelle: 'https://www.ticketist.io/events/<kennung>',
  kennungen,
  termine: abende
}, null, 2) + '\n');

// Die Rueckfall-Liste nur neu schreiben, wenn wirklich gelesen wurde: ohne
// eine einzige Antwort bliebe sonst der alte Stand mit neuem Datum stehen.
if (kategorienGelesen) {
  await writeFile(preisPfad, JSON.stringify({
    _hinweis: 'Preise und freie Karten je Ticketkategorie, gelesen aus der oeffentlichen Schnittstelle des Ticketdienstes '
      + '(/api/ticket-categories?eventId=<nummer>) von scripts/sync-termine.mjs - nicht von Hand aendern. Rueckfall fuer '
      + 'Eventseite, Startseite und Dienst, wenn der Ticketdienst nicht antwortet; im Betrieb liest der Dienst die Kategorien '
      + "selbst. 'frei' ist der Stand vom Datum unten - eine Kategorie mit 0 ist ausverkauft.",
    stand: heute,
    quelle: 'https://www.ticketist.io/api/ticket-categories?eventId=<nummer>',
    preise: Object.fromEntries(Object.entries(neuePreise).sort(([a], [b]) => a.localeCompare(b)))
  }, null, 2) + '\n');
} else {
  console.warn('  Keine einzige Kategorie gelesen - site/data/ticketist-preise.json bleibt, wie sie ist.');
}
if (ohneKategorien.length) console.warn(`  Ohne frisch gelesene Kategorien: ${ohneKategorien.join(', ')}`);

const haeuser = abende.reduce((zahl, t) => ({ ...zahl, [t.haus]: (zahl[t.haus] || 0) + 1 }), {});
const zweiWege = abende.filter(a => a.varianten?.length).length;
console.log(`Termine: ${abende.length} Abende (${termine.length} Veranstaltungen, ${zweiWege} mit zweitem Ticketweg)`
  + ` (${Object.entries(haeuser).map(([h, n]) => `${n}× ${h}`).join(', ')}), `
  + `${geholt} Bilder neu geholt, ${kategorienGelesen} mit frisch gelesenen Kategorien`
  + `${fehlend.length ? `, ${fehlend.length} ohne Treffer` : ''}.`);
