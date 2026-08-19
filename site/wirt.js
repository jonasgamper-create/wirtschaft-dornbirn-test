// Die einfache Wirt-Ansicht, gebaut wie die besten Service-Apps: drei Zahlen
// oben, darunter EINE chronologische Liste des Tages - Reservierungen und
// Abholungen gemischt, je Zeile ein grosser Statusknopf. Sie rechnet nichts
// selbst aus, was der Dienst besser weiss: Tische vergibt der Server, damit
// zwei Handys nie denselben letzten Tisch erwischen.

import {
  apiAdresse, bleibVerbunden, hausToken, holeKarteInfo, holeStand, karteAdresse,
  leereTag, legeEinfach, loescheKarte, schluesselAusAdresse, sendeAktion,
  sendeKarte, sendeLaufkunde, sendeTakeawayAktion, sendeTakeawayKarte,
  stelleTagWiederHer
} from './haus-api.js?v=ae22f464';
import { buildFloorplan } from './floorplan-layout.mjs?v=8cd1fbb4';
import { durationFor, occupiesAt } from './table-assignment.mjs?v=ec7c8e39';

const byId = id => document.getElementById(id);
const pad = zahl => String(zahl).padStart(2, '0');
const jetzt = () => {
  const d = new Date();
  return {
    datum: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    zeit: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
};

let stand = null;

start();

async function start() {
  schluesselAusAdresse();
  if (!(await apiAdresse())) {
    byId('verbindungText').textContent = 'Kein Dienst eingetragen';
    byId('zahlErwartet').textContent = '–';
    return;
  }

  byId('tagZeile').textContent = `Heute Mittag · ${new Date().toLocaleDateString('de-AT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })}`;

  // Erst der letzte bekannte Stand, dann der offene Draht. So steht sofort
  // etwas da, auch wenn der Draht eine Sekunde braucht.
  const erster = await holeStand(hausToken());
  if (erster?.stand) { stand = erster.stand; male(); }

  bleibVerbunden(hausToken() || 'offen', neuerStand => {
    stand = neuerStand;
    male();
  }, zustand => {
    byId('verbindung').dataset.zustand = zustand;
    byId('verbindungText').textContent = zustand === 'verbunden' ? 'Live verbunden' : 'Getrennt – verbinde neu …';
  });

  // Die Uhr laeuft weiter, auch wenn nichts passiert: nach der Essenszeit
  // wird ein Tisch von selbst frei, und die Zahlen muessen mitgehen.
  setInterval(male, 60 * 1000);

  verdrahteHeuteListe();
  verdrahteNeueReservierung();
  verdrahteLaufkundschaft();
  verdrahteTagLeeren();
  verdrahteKarten();
}

function sag(wo, text, art = '') {
  const ziel = byId(wo);
  ziel.textContent = text;
  if (art) ziel.dataset.art = art; else delete ziel.dataset.art;
}

// ---- Der Tag als eine Liste ------------------------------------------------

function verdrahteHeuteListe() {
  byId('heuteListe').addEventListener('click', async event => {
    const knopf = event.target.closest('[data-aktion]');
    if (!knopf) return;
    knopf.disabled = true;
    const { aktion, id } = knopf.dataset;
    const nu = jetzt();
    if (aktion === 'ankunft') await sendeAktion(hausToken(), { art: 'ankunft', id, zeit: nu.zeit });
    if (aktion === 'abgang') await sendeAktion(hausToken(), { art: 'abgang', id, zeit: nu.zeit });
    if (aktion === 'zurueck') await sendeAktion(hausToken(), { art: 'abgang', id, zeit: null });
    if (aktion === 'abgeholt') await sendeTakeawayAktion(hausToken(), { art: 'abgeholt', id, zeit: nu.zeit });
    if (aktion === 'doch-nicht') await sendeTakeawayAktion(hausToken(), { art: 'offen', id });
    // Die Antwort kommt ueber den Draht zurueck und malt die Liste neu.
  });
}

/**
 * Eine Zeile der Tagesliste. Links die Zeit, in der Mitte wer und was,
 * rechts genau ein Knopf - der naechste sinnvolle Schritt und sonst nichts.
 */
function zeile({ zeit, titel, info, knopfText, aktion, id, erledigt = false, leiseKnopf = false, ton = '' }) {
  const li = document.createElement('li');
  if (erledigt) li.dataset.erledigt = '';
  if (ton) li.dataset.ton = ton;
  const zeitEl = document.createElement('span');
  zeitEl.className = 'zeit';
  zeitEl.textContent = zeit;
  const wer = document.createElement('div');
  wer.className = 'wer';
  const b = document.createElement('b');
  b.textContent = titel;
  const s = document.createElement('span');
  s.textContent = info;
  wer.append(b, s);
  li.append(zeitEl, wer);
  if (knopfText) {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = leiseKnopf ? 'knopf leise' : 'knopf';
    knopf.dataset.aktion = aktion;
    knopf.dataset.id = id;
    knopf.textContent = knopfText;
    li.append(knopf);
  }
  return li;
}

/** Alles neu malen: die eine Wahrheit ist der Stand des Dienstes. */
function male() {
  if (!stand?.floorplan) return;
  const plan = buildFloorplan(stand.floorplan);
  const policy = stand.floorplan.policy || {};
  const nu = jetzt();
  const at = `${nu.datum}T${nu.zeit}`;
  const dauer = party => durationFor(party.guests, policy);

  const heute = (stand.parties || []).filter(party => party.date === nu.datum);
  const takeaway = (stand.takeaway || []).filter(bestellung => bestellung.date === nu.datum);

  // Wer sitzt gerade, was ist belegt.
  const belegt = new Set();
  let imHaus = 0;
  for (const party of heute) {
    if (!party.tableIds?.length) continue;
    if (!occupiesAt(party, { at, minutes: dauer(party) })) continue;
    imHaus += party.guests;
    for (const id of party.tableIds) belegt.add(id);
  }
  const gesperrt = new Set(stand.blockedTables || []);
  const offen = plan.tables.filter(table => !gesperrt.has(table.id));
  const freie = offen.filter(table => !belegt.has(table.id));

  // Die drei Zahlen.
  const erwartete = heute.filter(party => !party.arrived && !party.left);
  byId('zahlErwartet').textContent = String(erwartete.length);
  byId('subErwartet').textContent = erwartete.length
    ? `${erwartete.reduce((sum, party) => sum + party.guests, 0)} Personen`
    : 'nichts offen';
  byId('zahlImHaus').textContent = String(imHaus);
  byId('subImHaus').textContent = imHaus ? 'sitzen an Tischen' : 'noch leer';
  byId('zahlFrei').textContent = `${freie.length}`;
  const offeneAbholungen = takeaway.filter(bestellung => bestellung.status === 'offen').length;
  byId('subFrei').textContent = `von ${offen.length} Tischen`
    + (offeneAbholungen ? ` · ${offeneAbholungen} Abholung${offeneAbholungen === 1 ? '' : 'en'} offen` : '');

  // Rueckgaengig-Balken, wenn ein geleerter Tag im Papierkorb liegt.
  const korb = stand.papierkorb;
  byId('korbBalken').hidden = !korb;
  if (korb) {
    byId('korbText').textContent = `Tag geleert – ${korb.anzahl} ${korb.anzahl === 1 ? 'Eintrag' : 'Einträge'} im Papierkorb (15 Minuten).`;
  }

  // Die Tagesliste: Reservierungen und Abholungen gemischt, nach Zeit.
  const eintraege = [];
  for (const party of heute) {
    const zeitVon = party.time;
    const tische = party.tableIds?.length
      ? `Tisch ${party.tableIds.map(id => plan.tables.find(t => t.id === id)?.number ?? '?').join(' + ')}`
      : 'noch ohne Tisch';
    const [stunde, minute] = zeitVon.split(':').map(Number);
    const bis = stunde * 60 + minute + dauer(party);
    const bisText = `${pad(Math.floor(bis / 60) % 24)}:${pad(bis % 60)}`;
    const personen = `${party.guests} P.`;

    if (party.left) {
      eintraege.push(zeile({
        zeit: zeitVon, id: party.id,
        titel: `${party.name} · ${personen}`,
        info: `fertig um ${party.left} · ${tische}`,
        knopfText: 'Zurück', aktion: 'zurueck', erledigt: true, leiseKnopf: true
      }));
    } else if (party.arrived) {
      eintraege.push(zeile({
        zeit: zeitVon, id: party.id,
        titel: `${party.name} · ${personen}`,
        info: `im Haus seit ${party.arrived} · ${tische} · frei gegen ${bisText}`,
        knopfText: 'Fertig', aktion: 'abgang', ton: 'da'
      }));
    } else {
      const ueberfaellig = zeitVon < nu.zeit && !party.arrived;
      eintraege.push(zeile({
        zeit: zeitVon, id: party.id,
        titel: `${party.name} · ${personen}`,
        info: `${ueberfaellig ? 'überfällig' : 'erwartet'} · ${tische}`,
        knopfText: 'Da', aktion: 'ankunft', ton: ueberfaellig ? 'spaet' : ''
      }));
    }
  }
  for (const bestellung of takeaway) {
    const essen = (bestellung.posten || []).map(eintrag => `${eintrag.menge}× ${eintrag.name}`).join(', ');
    const summe = `€ ${Number(bestellung.summe).toFixed(2).replace('.', ',')}`;
    if (bestellung.status === 'abgeholt') {
      eintraege.push(zeile({
        zeit: bestellung.abholzeit, id: bestellung.id,
        titel: `Takeaway Nr. ${bestellung.nummer} · ${bestellung.name}`,
        info: `${essen} · ${summe}${bestellung.abgeholtUm ? ` · abgeholt ${bestellung.abgeholtUm}` : ''}`,
        knopfText: 'Doch nicht', aktion: 'doch-nicht', erledigt: true, leiseKnopf: true
      }));
    } else {
      eintraege.push(zeile({
        zeit: bestellung.abholzeit, id: bestellung.id,
        titel: `Takeaway Nr. ${bestellung.nummer} · ${bestellung.name}`,
        info: `${essen} · ${summe} · zahlt bei Abholung`,
        knopfText: 'Abgeholt', aktion: 'abgeholt', ton: 'takeaway'
      }));
    }
  }
  eintraege.sort((a, b) => a.querySelector('.zeit').textContent.localeCompare(b.querySelector('.zeit').textContent));

  const liste = byId('heuteListe');
  liste.textContent = '';
  for (const eintrag of eintraege) liste.append(eintrag);
  if (!eintraege.length) {
    const leer = document.createElement('li');
    leer.className = 'leer';
    leer.textContent = 'Heute steht noch nichts an. Reservierungen und Bestellungen erscheinen hier von selbst.';
    liste.append(leer);
  }
}

// ---- Telefonische Reservierung ---------------------------------------------

function verdrahteNeueReservierung() {
  const form = byId('neuForm');
  byId('neuZeigen').addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden) {
      // Naechste Viertelstunde vorschlagen - meistens ist es "gleich".
      const d = new Date();
      const minuten = Math.min(13 * 60 + 30, Math.max(11 * 60 + 30, Math.ceil((d.getHours() * 60 + d.getMinutes() + 15) / 15) * 15));
      byId('neuZeit').value = `${pad(Math.floor(minuten / 60))}:${pad(minuten % 60)}`;
      byId('neuName').focus();
    }
  });
  byId('neuWeg').addEventListener('click', () => { form.hidden = true; });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = byId('neuName').value.trim();
    const time = byId('neuZeit').value;
    const guests = Number(byId('neuPersonen').value);
    if (name.length < 2 || !time || !guests) {
      return sag('neuErgebnis', 'Name, Uhrzeit und Personenzahl eintragen – mehr braucht es nicht.', 'fehler');
    }
    sag('neuErgebnis', 'Einen Moment …');
    const antwort = await legeEinfach(hausToken(), {
      name, time, guests,
      date: jetzt().datum,
      telefon: byId('neuTelefon').value.trim() || null
    });
    if (!antwort?.ok) {
      return sag('neuErgebnis', 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    }
    form.hidden = true;
    byId('neuName').value = '';
    byId('neuTelefon').value = '';
    byId('neuPersonen').value = '2';
    sag('neuErgebnis', antwort.tisch
      ? `Eingetragen: ${name}, ${guests} P. um ${time} – Tisch ${antwort.tisch}.`
      : `Eingetragen: ${name}, ${guests} P. um ${time} – noch ohne Tisch, in der großen Einteilung zuteilen.`, 'gut');
  });
}

// ---- Laufkundschaft --------------------------------------------------------

function verdrahteLaufkundschaft() {
  byId('laufErgebnis').textContent = '';

  async function setze(personen, sperre) {
    if (sperre) sperre.disabled = true;
    sag('laufErgebnis', 'Einen Moment …');
    const antwort = await sendeLaufkunde(hausToken(), personen);
    if (sperre) sperre.disabled = false;
    if (antwort?.ok) {
      sag('laufErgebnis', `${personen} ${personen === 1 ? 'Person' : 'Personen'} an Tisch ${antwort.tisch}`
        + `${antwort.etage ? ` (${antwort.etage})` : ''} – belegt bis ${antwort.bis} Uhr.`, 'gut');
      return;
    }
    sag('laufErgebnis', antwort?.grund === 'voll'
      ? 'Gerade ist kein passender Tisch frei. Oben nachsehen, wer bald fertig ist.'
      : 'Das hat nicht geklappt – bitte noch einmal drücken.', 'fehler');
  }

  document.querySelector('.lauf-knoepfe').addEventListener('click', event => {
    const knopf = event.target.closest('[data-personen]');
    if (knopf) setze(Number(knopf.dataset.personen), knopf);
  });

  // Die grosse Gesellschaft: bis 20 eintippen, derselbe Weg dahinter.
  byId('laufMehr').addEventListener('submit', event => {
    event.preventDefault();
    const feld = byId('laufZahl');
    const personen = Math.trunc(Number(feld.value));
    if (!Number.isFinite(personen) || personen < 1 || personen > 20) {
      return sag('laufErgebnis', 'Bitte eine Zahl von 1 bis 20 eintragen.', 'fehler');
    }
    feld.value = '';
    setze(personen, event.submitter);
  });
}

// ---- Tag leeren mit Rueckgaengig -------------------------------------------

function verdrahteTagLeeren() {
  byId('tagLeeren').addEventListener('click', async () => {
    const knopf = byId('tagLeeren');
    knopf.disabled = true;
    const antwort = await leereTag(hausToken());
    knopf.disabled = false;
    if (!antwort?.ok) return sag('laufErgebnis', 'Leeren hat nicht geklappt – bitte noch einmal.', 'fehler');
    if (!antwort.geleert) return sag('laufErgebnis', 'Heute war nichts zu leeren.', '');
    // Der Balken kommt ueber den Draht (Stand enthaelt den Papierkorb).
  });
  byId('korbZurueck').addEventListener('click', async () => {
    const knopf = byId('korbZurueck');
    knopf.disabled = true;
    const antwort = await stelleTagWiederHer(hausToken());
    knopf.disabled = false;
    if (!antwort?.ok) {
      byId('korbText').textContent = antwort?.grund === 'abgelaufen'
        ? 'Die 15 Minuten sind vorbei – der Tag bleibt geleert.'
        : 'Da war nichts wiederherzustellen.';
      return;
    }
    byId('korbBalken').hidden = true;
  });
}

// ---- Mittagskarte und Takeaway-Karte ---------------------------------------

function verdrahteKarten() {
  zeigeKarte();
  byId('karteDatei').addEventListener('change', async event => {
    const datei = event.target.files?.[0];
    event.target.value = '';
    if (!datei) return;
    sag('karteInfo', 'Lade hoch …');
    const antwort = await sendeKarte(hausToken(), datei);
    sag('karteInfo', antwort?.ok
      ? 'Die neue Karte ist da und steht ab sofort auf der Webseite.'
      : 'Hochladen hat nicht geklappt. Ist es ein PDF?', antwort?.ok ? 'gut' : 'fehler');
    zeigeKarte();
  });
  byId('karteWeg').addEventListener('click', async () => {
    sag('karteInfo', 'Entferne …');
    const antwort = await loescheKarte(hausToken());
    sag('karteInfo', antwort?.ok ? 'Karte entfernt.' : 'Entfernen hat nicht geklappt.', antwort?.ok ? 'gut' : 'fehler');
    zeigeKarte();
  });

  // Takeaway-Karte: vorbefuellt vom Dienst, nie ueberschrieben beim Tippen.
  const feld = byId('taKarteText');
  feld.addEventListener('input', () => { feld.dataset.beruehrt = '1'; });
  const fuelleVor = () => {
    if (!feld.dataset.beruehrt && typeof stand?.takeawayKarteText === 'string') {
      feld.value = stand.takeawayKarteText;
    }
  };
  fuelleVor();
  setInterval(fuelleVor, 5000);
  byId('taKarteSetzen').addEventListener('click', async () => {
    sag('taKarteInfo', 'Wird veröffentlicht …');
    const antwort = await sendeTakeawayKarte(hausToken(), feld.value);
    if (!antwort?.ok) return sag('taKarteInfo', 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    sag('taKarteInfo', antwort.gerichte.length
      ? `Veröffentlicht: ${antwort.gerichte.length} Gericht(e) sind jetzt bestellbar.`
      : 'Karte geleert – die Seite nimmt keine Bestellungen mehr an.', 'gut');
  });
}

async function zeigeKarte() {
  const info = await holeKarteInfo();
  const da = Boolean(info?.ok && info.da);
  byId('karteAnsehen').hidden = !da;
  byId('karteWeg').hidden = !da;
  if (!da) { byId('karteStand').textContent = 'Noch keine Karte hochgeladen.'; return; }
  byId('karteAnsehen').href = await karteAdresse();
  const von = new Date(info.stand);
  byId('karteStand').textContent = Number.isNaN(von.getTime())
    ? 'Eine Karte ist hinterlegt.'
    : `Aktuelle Karte vom ${von.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}.`;
}
