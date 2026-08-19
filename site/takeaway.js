// Takeaway-Bestellung. Ohne Dienst oder ohne Karte bleibt die Seite ehrlich:
// sie zeigt den Anrufknopf und sonst nichts - ein Formular, das ins Leere
// schickt, waere schlimmer als keines.

import { apiAdresse, bestelleTakeaway, holeTakeawayKarte } from './haus-api.js?v=ba7ec801';

const byId = id => document.getElementById(id);
const alsPreis = wert => `€ ${Number(wert).toFixed(2).replace('.', ',')}`;

const BESTELLSCHLUSS = 13 * 60 + 45;
const LETZTE_ABHOLUNG = 14 * 60;
const VORLAUF = 20;

let karte = [];
let allergenNamen = {};
const mengen = new Map();
let abholung = 'sofort';

start();

async function start() {
  if (!(await apiAdresse())) return;
  const antwort = await holeTakeawayKarte();
  if (!antwort?.ok || !Array.isArray(antwort.gerichte) || !antwort.gerichte.length) return;

  // Nach Bestellschluss gibt es heute nichts mehr zu bestellen.
  const jetzt = new Date();
  const minuten = jetzt.getHours() * 60 + jetzt.getMinutes();
  const werktag = jetzt.getDay() >= 1 && jetzt.getDay() <= 5;
  if (!werktag || minuten > BESTELLSCHLUSS) {
    byId('taLeer').innerHTML = werktag
      ? 'Für heute ist die Küche durch – die letzte Bestellung geht bis 13:45 Uhr. Morgen ab 11:00 Uhr wieder, oder ruf’ uns an: <a href="tel:+43557220540">+43 (0)5572 20 540</a>'
      : 'Takeaway gibt es Montag bis Freitag zum Mittag. Am Wochenende öffnen wir abends für Events.';
    return;
  }

  karte = antwort.gerichte;
  allergenNamen = antwort.allergenNamen || {};
  byId('taLeer').hidden = true;
  byId('taForm').hidden = false;
  byId('taSenden').hidden = false;
  zeigeKarte();
  zeigeAllergene();
  zeigeZeiten(minuten);
  zeigeSumme();
}

/**
 * Die Allergen-Legende: nur die Buchstaben, die heute wirklich vorkommen,
 * mit ihren Klarnamen - plus der ehrliche Satz zu Spuren, den jede gute
 * Karte traegt.
 */
function zeigeAllergene() {
  const kasten = byId('taAllergene');
  const codes = [...new Set(karte.flatMap(gericht => gericht.allergene || []))].sort();
  if (!codes.length) { kasten.hidden = true; return; }
  kasten.textContent = `Allergene: ${codes.map(code => `${code} = ${allergenNamen[code] || code}`).join(' · ')}. `
    + 'Trotz sorgfältiger Zubereitung können unsere Gerichte Spuren weiterer Allergene enthalten. '
    + 'Fragen zu Zutaten beantworten wir gerne: +43 (0)5572 20 540.';
  kasten.hidden = false;
}

function zeigeKarte() {
  const kasten = byId('taKarte');
  kasten.textContent = '';
  for (const gericht of karte) {
    const zeile = document.createElement('div');
    zeile.className = 'ta-gericht';
    const name = document.createElement('span');
    name.className = 'ta-gericht-name';
    name.textContent = gericht.name;
    if (gericht.allergene?.length) {
      const codes = document.createElement('small');
      codes.className = 'ta-codes';
      codes.textContent = gericht.allergene.join(', ');
      codes.setAttribute('aria-label', `Allergene: ${gericht.allergene.map(code => allergenNamen[code] || code).join(', ')}`);
      name.append(codes);
    }
    const preis = document.createElement('span');
    preis.className = 'ta-gericht-preis';
    preis.textContent = alsPreis(gericht.preis);
    const menge = document.createElement('span');
    menge.className = 'ta-menge';
    const weniger = knopf('−', `Eine Portion ${gericht.name} weniger`);
    const zahl = document.createElement('output');
    zahl.textContent = '0';
    const mehr = knopf('+', `Eine Portion ${gericht.name} mehr`);
    weniger.addEventListener('click', () => aendere(gericht.id, -1, zahl, weniger));
    mehr.addEventListener('click', () => aendere(gericht.id, 1, zahl, weniger));
    weniger.disabled = true;
    menge.append(weniger, zahl, mehr);
    zeile.append(name, preis, menge);
    kasten.append(zeile);
  }
}

function knopf(text, label) {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = text;
  element.setAttribute('aria-label', label);
  return element;
}

function aendere(id, schritt, zahl, weniger) {
  const wert = Math.max(0, Math.min(10, (mengen.get(id) || 0) + schritt));
  mengen.set(id, wert);
  zahl.textContent = String(wert);
  weniger.disabled = wert === 0;
  zeigeSumme();
}

/** Abholzeiten: "so bald wie moeglich" plus Viertelstunden bis 14:00. */
function zeigeZeiten(minuten) {
  const kasten = byId('taZeiten');
  kasten.textContent = '';
  const sofort = document.createElement('button');
  sofort.type = 'button';
  sofort.setAttribute('role', 'radio');
  sofort.setAttribute('aria-checked', 'true');
  sofort.dataset.abholung = 'sofort';
  sofort.textContent = 'So bald wie möglich';
  kasten.append(sofort);

  const fruehestens = Math.ceil((minuten + VORLAUF) / 15) * 15;
  for (let zeit = Math.max(fruehestens, 12 * 60); zeit <= LETZTE_ABHOLUNG; zeit += 15) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.setAttribute('role', 'radio');
    slot.setAttribute('aria-checked', 'false');
    slot.dataset.abholung = `${String(Math.floor(zeit / 60)).padStart(2, '0')}:${String(zeit % 60).padStart(2, '0')}`;
    slot.textContent = slot.dataset.abholung;
    kasten.append(slot);
  }
  byId('taZeitInfo').textContent = '„So bald wie möglich“ heißt: fertig in etwa 20–30 Minuten.';

  kasten.addEventListener('click', event => {
    const gewaehlt = event.target.closest('[data-abholung]');
    if (!gewaehlt) return;
    abholung = gewaehlt.dataset.abholung;
    kasten.querySelectorAll('[data-abholung]').forEach(andere =>
      andere.setAttribute('aria-checked', String(andere === gewaehlt)));
  });
}

function posten() {
  return karte
    .filter(gericht => (mengen.get(gericht.id) || 0) > 0)
    .map(gericht => ({ id: gericht.id, menge: mengen.get(gericht.id) }));
}

function zeigeSumme() {
  const summe = karte.reduce((sum, gericht) => sum + gericht.preis * (mengen.get(gericht.id) || 0), 0);
  const portionen = [...mengen.values()].reduce((sum, wert) => sum + wert, 0);
  byId('taSumme').textContent = portionen
    ? `${portionen} ${portionen === 1 ? 'Portion' : 'Portionen'} · ${alsPreis(summe)} – bezahlt wird bei der Abholung.`
    : 'Wähl’ oben deine Gerichte.';
}

function sag(text, art = 'info') {
  const kasten = byId('taErgebnis');
  kasten.hidden = false;
  kasten.textContent = text;
  kasten.dataset.art = art;
}

byId('taBestellen')?.addEventListener('click', async () => {
  const name = byId('taName').value.trim();
  const telefon = byId('taTelefon').value.trim();
  if (!posten().length) return sag('Bitte zuerst ein Gericht wählen.', 'fehler');
  if (name.length < 2) return sag('Bitte den Namen eintragen, auf den die Bestellung laufen soll.', 'fehler');
  if (!telefon) return sag('Bitte eine Telefonnummer angeben – wir rufen an, falls etwas ausgeht.', 'fehler');

  const knopfSenden = byId('taBestellen');
  knopfSenden.disabled = true;
  sag('Einen Moment, die Bestellung geht in die Küche …');
  const antwort = await bestelleTakeaway({ name, telefon, posten: posten(), abholung });
  knopfSenden.disabled = false;

  if (!antwort?.ok) {
    const gruende = {
      name: 'Der Name ist zu kurz.',
      telefon: 'Diese Telefonnummer sieht nicht richtig aus. Bitte noch einmal prüfen.',
      leer: 'Bitte zuerst ein Gericht wählen.',
      zu_viel: 'Mehr als 10 Portionen nehmen wir online nicht an – ruf’ uns kurz an: +43 (0)5572 20 540.',
      schluss: 'Die letzte Bestellung geht bis 13:45 Uhr. Ruf’ uns an, vielleicht geht noch was: +43 (0)5572 20 540.',
      zu_frueh: 'So schnell schafft es die Küche nicht – wähl’ eine spätere Abholzeit.',
      wochenende: 'Takeaway gibt es Montag bis Freitag zum Mittag.',
      karte: 'Die Karte wird gerade gewechselt. Versuch’ es gleich noch einmal.',
      zu_viele: 'Gerade kommen sehr viele Bestellungen. Bitte ruf’ uns kurz an.',
      netz: 'Die Verbindung hat nicht geklappt. Bitte ruf’ uns kurz an: +43 (0)5572 20 540.'
    };
    return sag(gruende[antwort?.grund] || 'Das hat nicht geklappt. Bitte ruf’ uns kurz an: +43 (0)5572 20 540.', 'fehler');
  }

  byId('taDoneNummer').textContent = `Nr. ${antwort.nummer}`;
  byId('taDoneZeit').textContent = `heute, ca. ${antwort.abholzeit} Uhr`;
  byId('taDoneSumme').textContent = alsPreis(antwort.summe);
  byId('taFertig').hidden = false;
  byId('taFertig').scrollIntoView({ block: 'center', behavior: 'smooth' });
  sag(antwort.doppelt
    ? `Diese Bestellung haben wir schon – Nummer ${antwort.nummer}, abholbereit ca. ${antwort.abholzeit} Uhr.`
    : `Passt, ${name}! Bestellung Nr. ${antwort.nummer}, abholbereit ca. ${antwort.abholzeit} Uhr.`, 'gut');
});
