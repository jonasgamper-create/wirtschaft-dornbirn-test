// Takeaway-Bestellung. Ohne Dienst oder ohne Karte bleibt die Seite ehrlich:
// sie zeigt den Anrufknopf und sonst nichts - ein Formular, das ins Leere
// schickt, waere schlimmer als keines.

import { apiAdresse, bestelleTakeaway, holeBestellStatus, holeTakeawayKarte } from './haus-api.js?v=64b16db1';

const byId = id => document.getElementById(id);

// ---- Der Stand der eigenen Bestellung --------------------------------------
//
// Der Gast hat gerade bestellt, die Seite ist offen - hier steht die Auskunft,
// die er in den naechsten zwanzig Minuten braucht. Sie ersetzt keine Nachricht
// aufs Telefon; wer alles schliesst, kommt zur genannten Zeit. Aber wer die
// Seite offen laesst, sieht es sofort.
//
// Gefragt wird alle zwanzig Sekunden. Ein offener Draht waere sparsamer, wuerde
// aber eine Rolle fuer Gaeste verlangen - und damit eine Tuer, durch die man
// mehr sieht als die eigene Bestellung. Zwanzig Sekunden reichen fuer eine
// Kueche, die zwanzig Minuten braucht.

let statusUhr = 0;
let statusTitelAlt = '';

function statusTon() {
  try {
    const kontext = new (window.AudioContext || window.webkitAudioContext)();
    const oszillator = kontext.createOscillator();
    const laut = kontext.createGain();
    oszillator.frequency.value = 880;
    laut.gain.setValueAtTime(0.0001, kontext.currentTime);
    laut.gain.exponentialRampToValueAtTime(0.14, kontext.currentTime + 0.02);
    laut.gain.exponentialRampToValueAtTime(0.0001, kontext.currentTime + 0.4);
    oszillator.connect(laut).connect(kontext.destination);
    oszillator.start();
    oszillator.stop(kontext.currentTime + 0.45);
  } catch { /* ohne Ton ist die Seite nicht kaputt */ }
}

function zeigeStatus(stand) {
  const kasten = byId('taStatus');
  if (!kasten || !stand?.ok) return;
  const fertig = stand.status === 'fertig';
  const abgeholt = stand.status === 'abgeholt';
  kasten.dataset.stufe = stand.status;

  // Kommt der Gast ueber die Adresse zurueck, ist die Bestaetigung oben leer -
  // sie wird hier aus dem Stand gefuellt. Die Abholzeit kommt ohnehin von hier
  // und ist damit auch nach einer Verschiebung die richtige.
  byId('taDoneNummer').textContent = `Nr. ${stand.nummer}`;
  byId('taDoneZeit').textContent = `${stand.vorbestellung ? 'am nächsten Werktag' : 'heute'}, ca. ${stand.abholzeit} Uhr`;
  byId('taDoneSumme').textContent = alsPreis(stand.summe);

  // In der Leiste unten steht die Nummer mit: wer sie liest, geht damit an
  // den Tresen, ohne noch einmal nach oben zu scrollen.
  byId('taStatusText').textContent = abgeholt
    ? 'Abgeholt. Lass es dir schmecken!'
    : (fertig
      ? `Abholbereit – Nr. ${stand.nummer}. Wir halten es warm.`
      : `Nr. ${stand.nummer} ist in der Küche. Fertig gegen ${stand.abholzeit} Uhr.`);

  // Wurde verschoben, muss das dastehen - sonst wundert sich der Gast, warum
  // die Zeit eine andere ist als vorhin.
  // Der Hinweis beantwortet die Frage, die gerade dran ist - und die aendert
  // sich mit dem Stand. "Aktualisiert sich von selbst" ist nur solange die
  // richtige Auskunft, wie es noch etwas zu warten gibt.
  byId('taStatusHinweis').textContent = abgeholt
    ? 'Danke fürs Kommen – bis zum nächsten Mal.'
    : (fertig
      ? 'Komm einfach an den Tresen und sag deine Nummer.'
      : (stand.verschobenVon
        ? `Es dauert etwas länger als gedacht: statt ${stand.verschobenVon} Uhr jetzt ${stand.abholzeit} Uhr. Danke fürs Warten!`
        : 'Diese Seite aktualisiert sich von selbst – du kannst sie offen lassen.'));

  // Der Umschlag auf "fertig" passiert genau einmal - hier haengt alles dran,
  // was den Gast erreichen soll, ohne dass er etwas drueckt.
  if (fertig && !statusTitelAlt) {
    statusTitelAlt = document.title;
    document.title = '✓ Fertig! · Wirtschaft Dornbirn';
    if (document.hidden) statusTon();
    // Kurzes Rumpeln in der Hosentasche. Android und Chrome koennen das,
    // iPhone-Safari kennt navigator.vibrate nicht - dort bleiben Ton,
    // Reitertitel und die gruene Leiste. Deshalb geprueft statt vorausgesetzt.
    try { navigator.vibrate?.([180, 90, 180]); } catch { /* nicht erlaubt */ }
  }
  if (!fertig && statusTitelAlt) {
    document.title = statusTitelAlt;
    statusTitelAlt = '';
  }
  if (abgeholt) clearInterval(statusUhr);
}

async function verfolge(schluessel) {
  const kasten = byId('taStatus');
  if (!kasten || !schluessel) return;
  kasten.hidden = false;

  // Die Adresse zum Wiederfinden. Der Schluessel steht hinter dem Doppelkreuz
  // nicht - er muss an den Dienst, also gehoert er in die Abfrage. Dafuer
  // steht er in keinem Verlauf eines fremden Geraets.
  const adresse = `${location.origin}${location.pathname}?bestellung=${encodeURIComponent(schluessel)}`;
  const link = byId('taStatusAdresse');
  if (link) { link.href = adresse; link.textContent = 'Diesen Stand später wieder öffnen'; }

  const hole = async () => zeigeStatus(await holeBestellStatus(schluessel));
  await hole();
  clearInterval(statusUhr);
  statusUhr = setInterval(hole, 20000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) hole(); });
}
const alsPreis = wert => `€ ${Number(wert).toFixed(2).replace('.', ',')}`;

// ---- Name und Telefon auf diesem Geraet ------------------------------------
//
// Stammgaeste bestellen woechentlich dasselbe und tippen jedes Mal dieselben
// zwei Felder. Gemerkt wird erst nach einer gelungenen Bestellung - vorher
// waere es geraten - und ausschliesslich im Browser des Gastes: nichts davon
// geht an den Dienst, der bekommt die Angaben ohnehin mit jeder Bestellung.
// Weil es das Geraet nicht verlaesst, braucht es keine Einwilligung; weil es
// trotzdem eine Speicherung ist, steht es sichtbar da und laesst sich mit
// einem Klick loeschen.

const GEMERKT = 'wirtschaft-takeaway-kontakt';

function holeGemerkt() {
  const zeile = byId('taGemerkt');
  let daten = null;
  try { daten = JSON.parse(localStorage.getItem(GEMERKT) || 'null'); } catch { daten = null; }
  if (!daten?.name || !daten?.telefon) return;
  byId('taName').value = daten.name;
  byId('taTelefon').value = daten.telefon;
  // Wer schon zugestimmt hat, soll das Haekchen gesetzt vorfinden - sonst
  // waere die naechste Bestellung stillschweigend ein Widerruf.
  byId('taMerken').checked = true;
  if (zeile) zeile.hidden = false;
}

/**
 * Nach einer gelungenen Bestellung: merken, wenn das Haekchen steht - und
 * loeschen, wenn es abgewaehlt wurde. Das Abwaehlen ist der Widerruf, und der
 * muss so einfach sein wie das Zustimmen.
 */
function merke(name, telefon) {
  const zeile = byId('taGemerkt');
  if (!byId('taMerken')?.checked) {
    try { localStorage.removeItem(GEMERKT); } catch { /* privater Modus */ }
    if (zeile) zeile.hidden = true;
    return;
  }
  try { localStorage.setItem(GEMERKT, JSON.stringify({ name, telefon })); } catch { return; }
  if (zeile) zeile.hidden = false;
}

byId('taVergiss')?.addEventListener('click', () => {
  try { localStorage.removeItem(GEMERKT); } catch { /* privater Modus */ }
  byId('taName').value = '';
  byId('taTelefon').value = '';
  byId('taMerken').checked = false;
  byId('taGemerkt').hidden = true;
  byId('taName').focus();
});

/** Muss mit MAX_PORTIONEN im Dienst uebereinstimmen. */
const MAX_PORTIONEN = 10;
/**
 * Ab wie wenigen freien Portionen die Zahl beim Slot steht. Die Grenze selbst
 * (wie viel die Kueche schafft) steht nur im Dienst - hier steht nur, ab wann
 * es sich zu sagen lohnt.
 */
const REST_SICHTBAR_AB = 6;
const BESTELLSCHLUSS = 13 * 60 + 45;
const LETZTE_ABHOLUNG = 14 * 60;
const VORLAUF = 20;

let karte = [];
let allergenNamen = {};
const mengen = new Map();
let abholung = 'sofort';
/** Gilt die Bestellung fuer heute oder fuer den naechsten Werktag? */
let vorbestellung = false;

start();

async function start() {
  if (!(await apiAdresse())) return;

  // Mit Schluessel in der Adresse: der Gast kommt auf seinen Stand zurueck.
  // Dann steht der Status oben, die Karte darunter - bestellen kann er
  // trotzdem noch einmal.
  const wieder = new URLSearchParams(location.search).get('bestellung');
  if (wieder) {
    byId('taFertig').hidden = false;
    document.body.classList.add('ta-abgeschickt');
    byId('taDoneNummer').textContent = '…';
    verfolge(wieder);
  }
  const antwort = await holeTakeawayKarte();
  if (!antwort?.ok || !Array.isArray(antwort.gerichte) || !antwort.gerichte.length) return;

  karte = antwort.gerichte;
  allergenNamen = antwort.allergenNamen || {};

  // Die Karte wird immer gezeigt - auch wenn die Kueche durch ist. Wer abends
  // oder am Sonntag nachschaut, will wissen, was es gibt; eine Seite, die
  // dann nur "geschlossen" sagt, verschweigt genau das, wofuer man
  // hergekommen ist. Zu ist nur das Bestellen, nicht die Karte.
  zeigeKarte();
  zeigeAllergene();
  byId('taForm').hidden = false;
  byId('taAbschluss').hidden = false;
  holeGemerkt();

  const jetzt = new Date();
  const minuten = jetzt.getHours() * 60 + jetzt.getMinutes();
  const werktag = jetzt.getDay() >= 1 && jetzt.getDay() <= 5;
  // Bestellt werden kann immer. Solange die Kueche kocht, fuer heute - sonst
  // als Vorbestellung fuer den naechsten Werktag. Eine Seite, die abends tot
  // ist, verliert genau die Gaeste, die dann planen, was sie morgen mitnehmen.
  vorbestellung = !werktag || minuten > BESTELLSCHLUSS;

  byId('taLeer').hidden = !vorbestellung;
  if (vorbestellung) {
    byId('taLeer').textContent = `Die Küche ist für heute durch – deine Bestellung geht auf ${naechsterWerktagText(jetzt)}. `
      + 'Wähl einfach die Abholzeit, wir haben es dann fertig.';
  }
  byId('taSenden').hidden = false;
  zeigeZeiten(minuten);
  markiereVolleSlots(antwort.slots);
  zeigeSumme();
}

/**
 * Volle Abholzeiten ausgrauen - dieselbe Loesung wie bei den Uhrzeiten der
 * Reservierung. Sie stehen sichtbar da, aber gesperrt: sie zu verstecken
 * waere verwirrend, der Gast suchte dann eine Zeit, die es nicht mehr gibt.
 */
function markiereVolleSlots(slots) {
  if (!Array.isArray(slots)) return;
  const nachZeit = new Map(slots.map(slot => [slot.zeit, slot]));
  for (const knopf of document.querySelectorAll('#taZeiten [data-abholung]')) {
    const eintrag = nachZeit.get(knopf.dataset.abholung);
    const voll = eintrag ? eintrag.lage === 'voll' : false;
    const eng = eintrag ? eintrag.lage === 'eng' : false;
    knopf.disabled = voll;
    if (voll) knopf.setAttribute('data-voll', ''); else knopf.removeAttribute('data-voll');
    // Eng ist waehlbar, sieht aber anders aus: der Gast soll wissen, worauf
    // er sich einlaesst, bevor er waehlt - nicht erst an der Tuer.
    if (eng) knopf.setAttribute('data-eng', ''); else knopf.removeAttribute('data-eng');
    knopf.title = voll
      ? 'Zu dieser Zeit ist die Küche schon ausgelastet'
      : (eng ? 'Um diese Zeit ist viel los – es kann etwas länger dauern' : '');

    // Wie viel zu dieser Zeit noch geht - aber erst, wenn es knapp wird. Bei
    // einem ruhigen Mittag stuende sonst ueberall eine Zahl, die nur Druck
    // macht, wo keiner ist. Knapp heisst: es passt noch, aber nicht mehr oft.
    const rest = Number.isFinite(eintrag?.rest) ? eintrag.rest : null;
    let restZeile = knopf.querySelector('.ta-rest');
    if (!voll && rest !== null && rest > 0 && rest <= REST_SICHTBAR_AB) {
      if (!restZeile) {
        restZeile = document.createElement('span');
        restZeile.className = 'ta-rest';
        knopf.append(restZeile);
      }
      restZeile.textContent = `noch ${rest}`;
      knopf.setAttribute('aria-label', `${knopf.dataset.abholung} Uhr – noch ${rest} Portionen frei`);
    } else {
      restZeile?.remove();
      knopf.removeAttribute('aria-label');
    }
    // Eine bereits gewaehlte, nun volle Zeit wieder abwaehlen.
    if (voll && knopf.getAttribute('aria-checked') === 'true') {
      knopf.setAttribute('aria-checked', 'false');
      const ersatz = [...document.querySelectorAll('#taZeiten [data-abholung]:not([data-voll])')][0];
      if (ersatz) { ersatz.setAttribute('aria-checked', 'true'); abholung = ersatz.dataset.abholung; }
    }
  }
}

/** Die Slot-Belegung neu holen - nach einer Ablehnung und nach dem Bestellen. */
async function ladeSlots() {
  const antwort = await holeTakeawayKarte();
  if (antwort?.ok) markiereVolleSlots(antwort.slots);
}

/** "Montag" oder "morgen" - was der Gast auf dem Zettel lesen will. */
function naechsterWerktagText(jetzt) {
  const tag = new Date(jetzt);
  do {
    tag.setDate(tag.getDate() + 1);
  } while (tag.getDay() === 0 || tag.getDay() === 6);
  const morgen = new Date(jetzt);
  morgen.setDate(morgen.getDate() + 1);
  const istMorgen = tag.toDateString() === morgen.toDateString();
  return istMorgen ? 'morgen' : tag.toLocaleDateString('de-AT', { weekday: 'long' });
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
    // Die Zahl ist tippbar: Knoepfe fuer eine Portion, das Feld fuer die
    // sechs fuers Buero. Sechsmal Plus druecken ist kein Bedienweg.
    const zahl = document.createElement('input');
    zahl.type = 'number';
    zahl.inputMode = 'numeric';
    zahl.min = '0';
    zahl.max = String(MAX_PORTIONEN);
    zahl.step = '1';
    zahl.value = '0';
    zahl.setAttribute('aria-label', `Portionen ${gericht.name} – auch direkt eintippbar`);
    const mehr = knopf('+', `Eine Portion ${gericht.name} mehr`);
    weniger.addEventListener('click', () => aendere(gericht.id, -1, zahl, weniger));
    mehr.addEventListener('click', () => aendere(gericht.id, 1, zahl, weniger));
    // Waehrend des Tippens nichts ueberschreiben, erst beim Verlassen in die
    // Grenzen holen - sonst wird aus einer getippten 10 sofort eine 1.
    zahl.addEventListener('input', () => {
      const getippt = Math.trunc(Number(zahl.value));
      if (!Number.isFinite(getippt) || getippt < 0 || getippt > MAX_PORTIONEN) return;
      mengen.set(gericht.id, getippt);
      weniger.disabled = getippt === 0;
      zeigeSumme();
    });
    zahl.addEventListener('blur', () => setze(gericht.id, Number(zahl.value), zahl, weniger));
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

const aendere = (id, schritt, zahl, weniger) =>
  setze(id, (mengen.get(id) || 0) + schritt, zahl, weniger);

function setze(id, wunsch, zahl, weniger) {
  const wert = Math.max(0, Math.min(MAX_PORTIONEN, Math.trunc(Number(wunsch)) || 0));
  mengen.set(id, wert);
  zahl.value = String(wert);
  weniger.disabled = wert === 0;
  zeigeSumme();
}

/** Abholzeiten: "so bald wie moeglich" plus Viertelstunden bis 14:00. */
function zeigeZeiten(minuten) {
  const kasten = byId('taZeiten');
  kasten.textContent = '';
  // "So bald wie moeglich" gibt es nur heute. Bei einer Vorbestellung waere
  // das eine leere Zusage - morgen frueh steht niemand mit dem Sackerl da.
  if (!vorbestellung) {
    const sofort = document.createElement('button');
    sofort.type = 'button';
    sofort.setAttribute('role', 'radio');
    sofort.setAttribute('aria-checked', 'true');
    sofort.dataset.abholung = 'sofort';
    sofort.textContent = 'So bald wie möglich';
    kasten.append(sofort);
  }

  // Vorbestellung: das ganze Fenster ab 11:30 steht offen, die heutige Uhr
  // spielt keine Rolle mehr.
  const fruehestens = vorbestellung
    ? 11 * 60 + 30
    : Math.max(Math.ceil((minuten + VORLAUF) / 15) * 15, 12 * 60);
  for (let zeit = fruehestens; zeit <= LETZTE_ABHOLUNG; zeit += 15) {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.setAttribute('role', 'radio');
    slot.setAttribute('aria-checked', 'false');
    slot.dataset.abholung = `${String(Math.floor(zeit / 60)).padStart(2, '0')}:${String(zeit % 60).padStart(2, '0')}`;
    slot.textContent = slot.dataset.abholung;
    kasten.append(slot);
  }
  // Bei einer Vorbestellung gibt es kein "so bald wie moeglich", also steht
  // die erste Zeit vorgewaehlt da - sonst haette der Gast nichts gewaehlt und
  // wuesste nicht, warum der Knopf meckert.
  if (vorbestellung) {
    const erster = kasten.querySelector('[data-abholung]');
    if (erster) {
      erster.setAttribute('aria-checked', 'true');
      abholung = erster.dataset.abholung;
    }
  }
  // Vor der Öffnung heisst "so bald wie moeglich" nicht "in zwanzig Minuten",
  // sondern "sobald die Kueche aufsperrt". Der Dienst rechnet es ohnehin so -
  // hier steht es, bevor der Gast waehlt, statt erst in der Bestaetigung.
  const vorDerOeffnung = !vorbestellung && minuten + VORLAUF < 11 * 60 + 30;
  byId('taZeitInfo').textContent = vorbestellung
    ? 'Wähl die Zeit, zu der du es abholen möchtest.'
    : (vorDerOeffnung
      ? '„So bald wie möglich“ heißt heute: fertig ab 11:30 Uhr, sobald die Küche aufsperrt.'
      : '„So bald wie möglich“ heißt: fertig in etwa 20–30 Minuten.');

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
  const kasten = byId('taSumme');
  kasten.textContent = '';
  if (!portionen) { kasten.textContent = 'Wähl’ oben deine Gerichte.'; return; }

  // Am Handy steht diese Zeile in der festen Leiste und wird bei jedem
  // Blaettern mitgelesen. Dort zaehlt nur, was sich aendert - der Hinweis
  // aufs Zahlen steht ohnehin ueber der Karte und in der Bestaetigung und
  // wird deshalb schmalen Schirmen erspart.
  const zahl = document.createElement('span');
  zahl.className = 'ta-summe-zahl';
  zahl.textContent = `${portionen} ${portionen === 1 ? 'Portion' : 'Portionen'} · ${alsPreis(summe)}`;
  const zusatz = document.createElement('span');
  zusatz.className = 'ta-summe-zusatz';
  zusatz.textContent = ' – bezahlt wird bei der Abholung.';
  kasten.append(zahl, zusatz);
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
    // Volle Viertelstunde: die Kueche schafft nur so viel auf einmal. Die
    // freien Zeiten stehen in der Antwort - sie zu verschweigen hiesse, den
    // Gast raten zu lassen.
    if (antwort?.grund === 'slot_voll') {
      await ladeSlots();
      const frei = (antwort.frei || []).join(', ');
      return sag(frei
        ? `Um ${abholung} Uhr ist die Küche schon ausgelastet. Frei wäre es um ${frei} – wähl’ einfach eine andere Zeit.`
        : 'Für heute ist die Küche ausgelastet. Ruf’ uns kurz an: +43 (0)5572 20 540.', 'warnung');
    }
    return sag(gruende[antwort?.grund] || 'Das hat nicht geklappt. Bitte ruf’ uns kurz an: +43 (0)5572 20 540.', 'fehler');
  }

  // "heute" stimmt nur, solange die Kueche kocht. Bei einer Vorbestellung
  // stand hier trotzdem "heute" - eine Bestaetigung, die den falschen Tag
  // nennt, ist schlimmer als gar keine.
  const wann = vorbestellung ? naechsterWerktagText(new Date()) : 'heute';
  byId('taDoneNummer').textContent = `Nr. ${antwort.nummer}`;
  byId('taDoneZeit').textContent = `${wann}, ca. ${antwort.abholzeit} Uhr`;
  byId('taDoneSumme').textContent = alsPreis(antwort.summe);
  byId('taFertig').hidden = false;
  // Die feste Leiste am Handy hat ihren Zweck erfuellt. Ab jetzt wuerde sie
  // nur die Bestaetigung verdecken, also gibt sie ihren Platz wieder her.
  document.body.classList.add('ta-abgeschickt');
  merke(name, telefon);
  // Ab hier verfolgt die Seite den Stand: der Gast hat gerade bestellt und
  // sieht in den naechsten zwanzig Minuten, was in der Kueche passiert.
  verfolge(antwort.schluessel);
  byId('taFertig').scrollIntoView({ block: 'center', behavior: 'smooth' });
  // Volle Viertelstunde, aber noch machbar: sagen, dass es dauern kann.
  const verzug = antwort.eng ? ' Um die Zeit ist viel los – es kann ein paar Minuten länger dauern.' : '';
  sag(antwort.doppelt
    ? `Diese Bestellung haben wir schon – Nummer ${antwort.nummer}, abholbereit ${wann} ca. ${antwort.abholzeit} Uhr.`
    : `Passt, ${name}! Bestellung Nr. ${antwort.nummer}, abholbereit ${wann} ca. ${antwort.abholzeit} Uhr.${verzug}`,
  antwort.eng ? 'warnung' : 'gut');
  await ladeSlots();
});
