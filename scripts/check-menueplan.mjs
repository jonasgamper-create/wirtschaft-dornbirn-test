// Goldene Testfaelle fuer den Menueplan: eintragen, glaetten, in die
// Takeaway-Karte uebersetzen, die Woche beschriften. Laeuft in Node - es ist
// dieselbe Logik, die im Worker laeuft. Dazu: die hinterlegte Ersatzwoche und
// die QR-Ziele der Faltkarte muessen stimmen, denn die werden gedruckt.

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  allergenCodes, alsZahl, datumPlus, normalisiereMenueplan, tagIndex, takeawayAusPlan, wochenText
} from '../server/src/menueplan.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Menüplan: ${name}${detail ? ` - ${detail}` : ''}`);
};

// ---- 1. Eintrag des Wirts -> gespeicherter Plan --------------------------

const roh = {
  montag: '2026-08-31',
  preise: { mittag: '15,90', vital: '' },
  tage: [
    { gerichte: [{ name: '  Cordon bleu  vom Schwein ', beilage: 'Schnittlauchkartoffeln | Salat', allergene: 'A, c, G, l, m, x' }] },
    { gerichte: [{ name: 'Kalbsleber', beilage: 'Kartoffelrösti', allergene: 'a f' }, { name: 'Älpler Käshörnle', beilage: '', allergene: '', preis: '16,90' }] },
    { gerichte: [] },
    { gerichte: [{ name: 'T', beilage: 'zu kurz - fällt weg' }] },
    { gerichte: [{ name: 'Rindsstreifen', beilage: 'Basmatireis', allergene: '(f, l, m, n)' }] }
  ],
  vital: [
    { titel: 'vital', name: 'Lachsschnitte', beilage: 'Mango-Bulgur', allergene: 'a, c' },
    { titel: '', name: 'Maultaschen', beilage: '', allergene: 'g' }
  ],
  alacarte: [
    { name: 'Pommes frites', preis: '5,00' },
    { name: 'Ohne Preis', preis: '' },
    { name: 'Burger', beilage: 'Pommes', preis: 18.9, allergene: 'a, c, g' }
  ]
};
const ergebnis = normalisiereMenueplan(roh, '2026-08-31T08:00:00Z');
check('Plan wird angenommen', ergebnis.ok === true, JSON.stringify(ergebnis));
const plan = ergebnis.plan;
check('Preis mit Komma wird gelesen', plan.preise.mittag === 15.9);
check('Vital ohne Preis erbt den Mittagspreis', plan.preise.vital === 15.9);
check('Name wird geglaettet', plan.tage[0].gerichte[0].name === 'Cordon bleu vom Schwein');
check('Unbekannte Allergene fallen weg, Reihenfolge bleibt', plan.tage[0].gerichte[0].allergene === 'a, c, g, l, m');
check('Zweites Gericht mit eigenem Preis', plan.tage[1].gerichte[1].preis === 16.9);
check('Erstes Gericht ohne eigenen Preis', plan.tage[1].gerichte[0].preis === undefined);
check('Leerer Tag bleibt leer', plan.tage[2].gerichte.length === 0);
check('Zu kurzer Name faellt weg', plan.tage[3].gerichte.length === 0);
check('Allergene in Klammern gehen auch', plan.tage[4].gerichte[0].allergene === 'f, l, m, n');
check('Vital ohne Titel heisst vital-gericht', plan.vital[1].titel === 'vital-gericht');
check('A la carte ohne Preis faellt weg', plan.alacarte.length === 2 && plan.alacarte[1].name === 'Burger');
check('Stand wird uebernommen', plan.stand === '2026-08-31T08:00:00Z');
check('Ohne Angabe ist alles zum Mitnehmen freigegeben',
  plan.tage[0].gerichte[0].takeaway === true && plan.alacarte[0].takeaway === true);
check('takeaway:false wird uebernommen',
  normalisiereMenueplan({ ...roh, alacarte: [{ name: 'Nur im Haus', preis: '9,90', takeaway: false }] })
    .plan.alacarte[0].takeaway === false);
check('Fenster, Hinweis, Fussnote kommen als Vorgabe, wenn nicht mitgeschickt',
  plan.fenster === '11:30 bis 13:00 uhr' && plan.hinweis === 'diese gerichte ändern sich wöchentlich.'
  && plan.alacarteFenster === '11:30 bis 13:00 uhr' && plan.fussnote.startsWith('takeaway:'));
const ohneZeilen = normalisiereMenueplan({ ...roh, fenster: '', hinweis: '  ', fussnote: '' }).plan;
check('Leer mitgeschickt bleibt leer (wer die Zeile nicht will, loescht sie)',
  ohneZeilen.fenster === '' && ohneZeilen.hinweis === '' && ohneZeilen.fussnote === '');
check('Eigener Text wird uebernommen', normalisiereMenueplan({ ...roh, fenster: '11:30 bis 14:00 uhr' }).plan.fenster === '11:30 bis 14:00 uhr');

check('Kein Montag wird abgelehnt', normalisiereMenueplan({ ...roh, montag: '2026-09-01' }).grund === 'kein_montag');
check('Ohne Datum abgelehnt', normalisiereMenueplan({ ...roh, montag: '' }).grund === 'montag');
check('Ohne Preis abgelehnt', normalisiereMenueplan({ ...roh, preise: {} }).grund === 'preis');
check('Ohne ein einziges Gericht abgelehnt', normalisiereMenueplan({ ...roh, tage: [] }).grund === 'leer');
check('Nichts hineingeben sprengt nichts', normalisiereMenueplan(null).ok === false);

// ---- 2. Der Plan als Takeaway-Karte --------------------------------------

const montag = takeawayAusPlan(plan, '2026-08-31');
check('Montag: nur das Montagsgericht', montag.gruppen[0].id === 'tag-1' && montag.gruppen[0].gerichte.length === 1);
check('Montag: Gruppenpreis am Tagesgericht', montag.gruppen[0].gerichte[0].preis === 15.9);
check('Montag: Allergene als Codes', JSON.stringify(montag.gruppen[0].gerichte[0].allergene) === '["A","C","G","L","M"]');
check('Montag: dann vital, dann a la carte', montag.gruppen.map(g => g.id).join(',') === 'tag-1,vital,alacarte');
check('Gruppen tragen das Zeitfenster der Karte', montag.gruppen[0].fenster === '11:30 bis 13:00 uhr' && montag.gruppen[2].fenster === '11:30 bis 13:00 uhr');
check('Vital traegt seinen Titel im Namen', montag.gruppen[1].gerichte[0].name === 'vital: Lachsschnitte');
check('Tagesgericht traegt den Praefix der Karte', montag.gruppen[0].gerichte[0].name === 'mittagsgericht: Cordon bleu vom Schwein');

const dienstag = takeawayAusPlan(plan, '2026-09-01');
check('Dienstag: zwei Gerichte zur Wahl', dienstag.gruppen[0].gerichte.length === 2 && dienstag.gruppen[0].hinweis === 'zur wahl');
check('Dienstag: eigener Preis schlaegt Gruppenpreis', dienstag.gruppen[0].gerichte[1].preis === 16.9);
check('Mittwoch ohne Gericht: keine Tagesgruppe', takeawayAusPlan(plan, '2026-09-02').gruppen[0].id === 'vital');
check('Samstag: keine Tagesgruppe', takeawayAusPlan(plan, '2026-09-05').gruppen[0].id === 'vital');
check('Naechste Woche Montag: dasselbe Montagsgericht', takeawayAusPlan(plan, '2026-09-07').gruppen[0].id === 'tag-1');

const alles = takeawayAusPlan(plan);
const kennungen = alles.gerichte.map(g => g.id);
check('Ohne Datum: alle Tage, vital, a la carte', kennungen.join(',') === 'm1-1,m2-1,m2-2,m5-1,v1,v2,a1,a2');
check('Kennungen sind eindeutig', new Set(kennungen).size === kennungen.length);
check('Kennung des Tagesgerichts ist am Tag dieselbe wie im Ganzen', montag.gerichte[0].id === 'm1-1');
check('Leerer Plan: leere Karte', takeawayAusPlan(null).gerichte.length === 0);

// ---- 2b. Der Haken "auch zum mitnehmen" ----------------------------------
//
// Der gefaehrlichste Fehler waere eine verrutschte Kennung: nimmt der Wirt
// einen Haken weg, muessen die anderen Gerichte ihre Kennung BEHALTEN -
// sonst zeigt eine laufende Bestellung ploetzlich auf ein anderes Gericht.

const halb = normalisiereMenueplan({
  ...roh,
  tage: [
    { gerichte: [{ name: 'Nur im Haus', takeaway: false }] },
    { gerichte: [{ name: 'Kalbsleber', takeaway: false }, { name: 'Käshörnle', preis: '16,90' }] },
    { gerichte: [] }, { gerichte: [] },
    { gerichte: [{ name: 'Rindsstreifen' }] }
  ],
  vital: [{ titel: 'vital', name: 'Lachs', takeaway: false }, { titel: 'vegi', name: 'Maultaschen' }],
  alacarte: [{ name: 'Suppe', preis: '5,30', takeaway: false }, { name: 'Burger', preis: '18,90' }]
}).plan;
const halbeKarte = takeawayAusPlan(halb);
check('Nicht angehakte Gerichte fehlen im Takeaway',
  !halbeKarte.gerichte.some(g => /Nur im Haus|Kalbsleber|Lachs|Suppe/.test(g.name)),
  JSON.stringify(halbeKarte.gerichte.map(g => g.name)));
check('Angehakte Gerichte behalten ihre Kennung trotz Luecke davor',
  halbeKarte.gerichte.map(g => g.id).join(',') === 'm2-2,m5-1,v2,a2',
  halbeKarte.gerichte.map(g => g.id).join(','));
check('Ein Tag ohne freigegebenes Gericht hat keine Gruppe',
  !halbeKarte.gruppen.some(gruppe => gruppe.id === 'tag-1'));
check('Montag einzeln abgefragt: keine Tagesgruppe, aber vital und a la carte',
  takeawayAusPlan(halb, '2026-08-31').gruppen.map(g => g.id).join(',') === 'vital,alacarte');
check('Die Karte selbst zeigt weiter ALLES - der Haken gilt nur fuers Takeaway',
  halb.tage[0].gerichte.length === 1 && halb.vital.length === 2 && halb.alacarte.length === 2);

// ---- 3. Woche und Datum --------------------------------------------------

check('Woche wird ausgeschrieben', wochenText(plan) === '31. august – 04. september', wochenText(plan));
check('Datum plus vier Tage', datumPlus('2026-08-31', 4) === '2026-09-04');
check('Jahreswechsel', wochenText({ montag: '2026-12-28' }) === '28. dezember – 01. jänner');
check('Tagindex Montag 0, Freitag 4, Sonntag -1',
  tagIndex('2026-08-31') === 0 && tagIndex('2026-09-04') === 4 && tagIndex('2026-09-06') === -1);
check('Zahl aus Text', alsZahl('12,50') === 12.5 && alsZahl('abc') === null && alsZahl(0) === null);
check('Allergencodes aus freiem Text', allergenCodes('(a, c, g)').join('') === 'ACG');

// ---- 3b. Der Wochenwechsel am Freitagabend --------------------------------

const { montagDanach, naechsteWoche } = await import('../server/src/menueplan.mjs');
check('Montag nach einem Freitag ist der naechste Montag', montagDanach('2026-09-04') === '2026-09-07');
check('Montag nach einem Montag ist der Montag darauf', montagDanach('2026-08-31') === '2026-09-07');
check('Montag nach einem Sonntag ist der Tag danach', montagDanach('2026-09-06') === '2026-09-07');
const weiter = naechsteWoche(plan, '2026-09-04T20:00:00Z');
check('Die naechste Woche beginnt sieben Tage spaeter', weiter.montag === '2026-09-07');
check('Die Gerichte bleiben stehen', JSON.stringify(weiter.tage) === JSON.stringify(plan.tage));
check('A la carte bleibt stehen', weiter.alacarte.length === plan.alacarte.length);
check('Der Stand ist neu', weiter.stand === '2026-09-04T20:00:00Z');
check('Ohne Plan kein Entwurf', naechsteWoche(null) === null);

// ---- 4. Die hinterlegte Ersatzwoche ---------------------------------------
//
// Ohne Dienst zeigt die Webseite diese Datei. Sie muss durch dieselbe
// Pruefung wie ein Eintrag des Wirts - sonst zeigt die Seite ohne Dienst
// eine Karte, die der Dienst ablehnen wuerde.

const datei = JSON.parse(await readFile(path.join(root, 'site/data/menueplan.json'), 'utf8'));
const dateiPlan = normalisiereMenueplan(datei, datei.stand);
check('Ersatzwoche ist gueltig', dateiPlan.ok === true, JSON.stringify(dateiPlan));
check('Ersatzwoche hat alle fuenf Tage', dateiPlan.ok && dateiPlan.plan.tage.every(t => t.gerichte.length >= 1));
check('Ersatzwoche hat vital und vegetarisch', dateiPlan.ok && dateiPlan.plan.vital.length === 2);
check('Ersatzwoche hat a la carte', dateiPlan.ok && dateiPlan.plan.alacarte.length >= 8);
check('Ersatzwoche ist so gespeichert, wie sie geglaettet wird',
  dateiPlan.ok && JSON.stringify(dateiPlan.plan) === JSON.stringify(datei),
  'site/data/menueplan.json weicht von der geglaetteten Form ab - npm run sync:menueplan');

// ---- 5. Die QR-Ziele der Faltkarte ----------------------------------------
//
// Gedruckt heisst dauerhaft. Beide Ziele muessen auf der eigenen Domain
// liegen, und die erzeugten Codes muessen da sein.

const ziele = JSON.parse(await readFile(path.join(root, 'site/data/qr-ziele.json'), 'utf8'));
for (const name of ['events', 'takeaway']) {
  const ziel = ziele[name]?.url || '';
  // Die eigene Domain oder die Seite selbst - nie ein fremder Dienst.
  check(`QR-Ziel ${name} liegt auf der eigenen Seite`,
    /^https:\/\/([\w-]+\.)*wirtschaft-dornbirn\.at\//.test(ziel) || /^https:\/\/jonasgamper-create\.github\.io\/wirtschaft-dornbirn-test\//.test(ziel), ziel);
  check(`QR-Ziel ${name} hat einen Text`, typeof ziele[name]?.text === 'string' && ziele[name].text.length > 5);
  try {
    const svg = await readFile(path.join(root, `site/assets/qr/${name}.svg`), 'utf8');
    check(`QR-Code ${name} ist ein SVG`, svg.startsWith('<svg'));
    check(`QR-Code ${name} traegt sein Ziel als Kommentar`, svg.includes(`<!-- ${ziel} -->`),
      'Ziel geaendert? npm run sync:qr');
  } catch {
    check(`QR-Code ${name} liegt bereit`, false, 'npm run sync:qr');
  }
}
for (const seite of ['site/mittagskarte.html', 'site/menuekarte-falten.html']) {
  try { await access(path.join(root, seite)); } catch { check(`${seite} liegt bereit`, false); }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`Menüplan-Prüfung OK: Eintrag, Takeaway-Karte, Woche, Ersatzwoche und QR-Ziele geprüft (${kennungen.length} Kennungen).`);
