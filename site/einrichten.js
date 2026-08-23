// Einrichten, neu gedacht: der Raum in Zahlen, live am Dienst.
//
// Die alte grosse Einteilung war ein Offline-Werkzeug mit eigenem Speicher im
// Browser - sechs Reiter, Sicherungen, ein zweiter Zustand neben dem Dienst.
// Diese Seite ist das Gegenteil: EIN Zustand (der des Dienstes), keine
// Speichern-Knoepfe, jede Aenderung gilt sofort. Wer auf einem Tisch sitzt,
// der wegfaellt, wird vom Dienst umgesetzt und gemeldet - dieselbe
// Absicherung, an der auch die Wirt-Ansicht haengt.

import {
  apiAdresse, bleibVerbunden, hausToken, holeStand, schluesselAusAdresse, sendePlan
} from './haus-api.js?v=c3eb22ff';
import { setzeAnzahl, zaehleGroessen } from './tisch-anzahlen.mjs?v=11ecb06c';

const byId = id => document.getElementById(id);

let stand = null;
/** Waehrend eine Veroeffentlichung laeuft, nimmt die Seite keine zweite an. */
let laeuft = false;

start();

async function start() {
  schluesselAusAdresse();
  if (!(await apiAdresse())) {
    byId('verbindungText').textContent = 'Kein Dienst eingetragen';
    return;
  }
  const erster = await holeStand(hausToken());
  if (erster?.grund === 'token') {
    byId('verbindungText').textContent = 'Kein Zugang – bitte den Einrichtungslink öffnen';
    return;
  }
  if (erster?.stand) { stand = erster.stand; male(); }

  bleibVerbunden(hausToken() || 'offen', neuerStand => { stand = neuerStand; male(); }, zustand => {
    byId('verbindung').dataset.zustand = zustand;
    byId('verbindungText').textContent = zustand === 'verbunden' ? 'Live verbunden' : 'Getrennt – verbinde neu …';
  }, 'haus');

  verdrahte();
}

function sag(text, art = '') {
  const kasten = byId('planInfo');
  kasten.textContent = text;
  kasten.dataset.art = art;
}

const kopie = wert => JSON.parse(JSON.stringify(wert));
const aktiveOrdnung = config => (config.layouts || []).find(l => l.id === config.activeLayout) || config.layouts?.[0];

/**
 * Der eine Weg nach draussen. Nimmt einen fertig geaenderten Plan, schickt
 * ihn, uebernimmt die Antwort und erzaehlt, was mit entwurzelten
 * Reservierungen passiert ist.
 */
async function veroeffentliche(config, extras = {}, erfolgsText = 'Übernommen – gilt sofort.') {
  if (laeuft) return false;
  laeuft = true;
  sag('Einen Moment …');
  const antwort = await sendePlan(hausToken(), { floorplan: config, ...extras });
  laeuft = false;
  if (!antwort?.ok) {
    sag(antwort?.grund === 'token'
      ? 'Kein Zugang – bitte den Einrichtungslink neu öffnen.'
      : 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    return false;
  }
  if (antwort.stand) { stand = antwort.stand; male(); }
  const bewegt = antwort.umgesetzt || [];
  const ohne = bewegt.filter(eintrag => !eintrag.tische);
  if (ohne.length) {
    sag(`Übernommen. ${ohne.map(e => `${e.name} (${e.time})`).join(', ')} hat keinen freien Tisch mehr – bitte in der Wirt-Ansicht einteilen.`, 'fehler');
  } else if (bewegt.length) {
    sag(`Übernommen. Umgesetzt: ${bewegt.map(e => `${e.name} (${e.time})`).join(', ')}.`);
  } else {
    sag(erfolgsText, 'gut');
  }
  return true;
}

// ---- Malen -----------------------------------------------------------------

function male() {
  const config = stand?.floorplan;
  if (!config) return;
  maleOrdnungen(config);
  maleEtagen(config);
  maleBetrieb(config);
}

function maleOrdnungen(config) {
  const kasten = byId('ordnungListe');
  kasten.textContent = '';
  const aktiv = aktiveOrdnung(config);
  for (const layout of config.layouts || []) {
    const zeile = document.createElement('div');
    zeile.className = 'ordnung-zeile';
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = layout.id === aktiv?.id ? 'ordnung aktiv' : 'ordnung';
    knopf.dataset.ordnung = layout.id;
    knopf.setAttribute('aria-pressed', String(layout.id === aktiv?.id));
    const name = document.createElement('b');
    name.textContent = layout.name;
    const meta = document.createElement('span');
    const tische = (layout.levels || []).reduce((n, level) => n + (level.tables?.length || 0), 0);
    const plaetze = (layout.levels || []).reduce((n, level) =>
      n + (level.tables || []).reduce((m, t) => m + (Number(t.seats) || 0), 0), 0);
    meta.textContent = `${tische} Tische · ${plaetze} Plätze`;
    knopf.append(name, meta);
    zeile.append(knopf);
    // Loeschen: nie die aktive und nie die letzte - eine Wirtschaft ohne
    // Tischordnung waere ein Dienst, der nichts mehr zuweisen kann.
    if (layout.id !== aktiv?.id && (config.layouts || []).length > 1) {
      const weg = document.createElement('button');
      weg.type = 'button';
      weg.className = 'knopf leise ordnung-weg';
      weg.dataset.loesche = layout.id;
      weg.textContent = 'Löschen';
      zeile.append(weg);
    }
    kasten.append(zeile);
  }
}

function maleEtagen(config) {
  const kasten = byId('etagenListe');
  kasten.textContent = '';
  const layout = aktiveOrdnung(config);
  if (!layout) return;
  for (const level of [...layout.levels].sort((a, b) => (a.order || 0) - (b.order || 0))) {
    const block = document.createElement('div');
    block.className = 'bestand-etage';

    const kopfzeile = document.createElement('div');
    kopfzeile.className = 'etage-kopf';
    const name = document.createElement('input');
    Object.assign(name, { type: 'text', maxLength: 40, value: level.name });
    name.dataset.etage = level.id;
    name.setAttribute('aria-label', `Name der Etage ${level.name}`);
    kopfzeile.append(name);
    if (layout.levels.length > 1) {
      const weg = document.createElement('button');
      weg.type = 'button';
      weg.className = 'knopf leise';
      weg.dataset.etageWeg = level.id;
      weg.textContent = 'Etage löschen';
      kopfzeile.append(weg);
    }
    block.append(kopfzeile);

    const groessen = zaehleGroessen(level);
    if (!groessen.length) {
      const leer = document.createElement('p');
      leer.className = 'bestand-leer';
      leer.textContent = 'Noch keine Tische – unten eine Größe wählen.';
      block.append(leer);
    }
    for (const { seats, anzahl } of groessen) {
      const zeile = document.createElement('div');
      zeile.className = 'bestand-zeile';
      const beschriftung = document.createElement('span');
      beschriftung.textContent = `${seats}er-Tische`;
      const weniger = document.createElement('button');
      weniger.type = 'button';
      weniger.textContent = '−';
      weniger.setAttribute('aria-label', `Einen ${seats}er-Tisch in ${level.name} weniger`);
      Object.assign(weniger.dataset, { etage: level.id, seats: String(seats), soll: String(anzahl - 1) });
      const zahl = document.createElement('b');
      zahl.textContent = String(anzahl);
      const mehr = document.createElement('button');
      mehr.type = 'button';
      mehr.textContent = '+';
      mehr.setAttribute('aria-label', `Ein ${seats}er-Tisch in ${level.name} mehr`);
      Object.assign(mehr.dataset, { etage: level.id, seats: String(seats), soll: String(anzahl + 1) });
      zeile.append(beschriftung, weniger, zahl, mehr);
      block.append(zeile);
    }

    // Neue Groesse je Etage: ein Griff, kein Formularflug.
    const neu = document.createElement('div');
    neu.className = 'groesse-neu';
    const auswahl = document.createElement('select');
    auswahl.setAttribute('aria-label', `Neue Tischgröße für ${level.name}`);
    for (let seats = 1; seats <= 12; seats += 1) {
      if (groessen.some(g => g.seats === seats)) continue;
      const option = document.createElement('option');
      option.value = String(seats);
      option.textContent = `${seats} Plätze`;
      auswahl.append(option);
    }
    const dazu = document.createElement('button');
    dazu.type = 'button';
    dazu.className = 'knopf leise';
    dazu.textContent = 'Größe ergänzen';
    dazu.dataset.groesseNeu = level.id;
    neu.append(auswahl, dazu);
    block.append(neu);
    kasten.append(block);
  }
}

function maleBetrieb(config) {
  const dauer = Number(config.policy?.durations?.[0]?.minutes) || 90;
  byId('feldDauer').value = String([60, 75, 90, 105, 120].includes(dauer) ? dauer : 90);
  const puffer = Number(config.policy?.bufferMinutes ?? 15);
  byId('feldPuffer').value = String([0, 5, 10, 15, 20].includes(puffer) ? puffer : 15);
  byId('feldNummern').value = config.numbering?.mode === 'fortlaufend' ? 'fortlaufend' : 'pro-etage';

  const auswahl = byId('feldStandardEtage');
  auswahl.textContent = '';
  const layout = aktiveOrdnung(config);
  for (const level of layout?.levels || []) {
    const option = document.createElement('option');
    option.value = level.id;
    option.textContent = level.name;
    auswahl.append(option);
  }
  if (stand?.standardEtage && [...auswahl.options].some(o => o.value === stand.standardEtage)) {
    auswahl.value = stand.standardEtage;
  }
}

// ---- Handeln ---------------------------------------------------------------

function verdrahte() {
  // Ordnung wechseln oder loeschen
  byId('ordnungListe').addEventListener('click', ereignis => {
    const wechsel = ereignis.target.closest('[data-ordnung]');
    const loeschen = ereignis.target.closest('[data-loesche]');
    const config = kopie(stand.floorplan);
    if (wechsel && wechsel.dataset.ordnung !== config.activeLayout) {
      config.activeLayout = wechsel.dataset.ordnung;
      // Eine Ordnung ohne Tische stellt das Haus auf null - das darf man,
      // aber nicht unbemerkt: ab jetzt wuerde jede Onlinebuchung abgewiesen.
      const ziel = aktiveOrdnung(config);
      const tische = (ziel?.levels || []).reduce((n, level) => n + (level.tables?.length || 0), 0);
      veroeffentliche(config, {}, tische
        ? 'Ordnung gewechselt – gilt sofort.'
        : 'Ordnung gewechselt – aber sie hat KEINE Tische. Unten welche anlegen, sonst kann online niemand reservieren.');
    }
    if (loeschen) {
      config.layouts = config.layouts.filter(layout => layout.id !== loeschen.dataset.loesche);
      veroeffentliche(config, {}, 'Ordnung gelöscht.');
    }
  });

  // Neue Ordnung als Kopie der aktiven
  byId('ordnungNeu').addEventListener('submit', ereignis => {
    ereignis.preventDefault();
    const name = byId('ordnungName').value.trim().slice(0, 40);
    if (name.length < 2) return sag('Bitte einen Namen für die Ordnung eintragen.', 'fehler');
    const config = kopie(stand.floorplan);
    const vorlage = kopie(aktiveOrdnung(config));
    let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ordnung';
    while (config.layouts.some(layout => layout.id === id)) id += '2';
    vorlage.id = id;
    vorlage.name = name;
    config.layouts.push(vorlage);
    config.activeLayout = id;
    byId('ordnungName').value = '';
    veroeffentliche(config, {}, `„${name}“ angelegt und aktiv – Tische anpassen unten.`);
  });

  // Tische: Zahl rauf, Zahl runter, Groesse neu; Etage umbenennen/loeschen
  byId('etagenListe').addEventListener('click', ereignis => {
    const zaehler = ereignis.target.closest('button[data-seats]');
    const groesse = ereignis.target.closest('button[data-groesse-neu]');
    const etageWeg = ereignis.target.closest('button[data-etage-weg]');
    if (zaehler) {
      const config = kopie(stand.floorplan);
      const level = aktiveOrdnung(config).levels.find(l => l.id === zaehler.dataset.etage);
      const tables = setzeAnzahl(level, Number(zaehler.dataset.seats), Number(zaehler.dataset.soll));
      if (!tables) return;
      level.tables = tables;
      veroeffentliche(config);
    }
    if (groesse) {
      const config = kopie(stand.floorplan);
      const level = aktiveOrdnung(config).levels.find(l => l.id === groesse.dataset.groesseNeu);
      const seats = Number(groesse.previousElementSibling?.value || groesse.parentElement.querySelector('select').value);
      const tables = setzeAnzahl(level, seats, 1);
      if (!tables) return;
      level.tables = tables;
      veroeffentliche(config);
    }
    if (etageWeg) {
      const config = kopie(stand.floorplan);
      const layout = aktiveOrdnung(config);
      layout.levels = layout.levels.filter(l => l.id !== etageWeg.dataset.etageWeg);
      veroeffentliche(config, {}, 'Etage gelöscht.');
    }
  });

  // Umbenennen beim Verlassen des Feldes - nicht bei jedem Buchstaben.
  byId('etagenListe').addEventListener('change', ereignis => {
    const feld = ereignis.target.closest('input[data-etage]');
    if (!feld) return;
    const name = feld.value.trim().slice(0, 40);
    if (name.length < 2) return sag('Der Etagenname braucht mindestens zwei Zeichen.', 'fehler');
    const config = kopie(stand.floorplan);
    const level = aktiveOrdnung(config).levels.find(l => l.id === feld.dataset.etage);
    if (!level || level.name === name) return;
    level.name = name;
    veroeffentliche(config, {}, `Etage heißt jetzt „${name}“.`);
  });

  // Neue Etage
  byId('etageNeu').addEventListener('submit', ereignis => {
    ereignis.preventDefault();
    const name = byId('etageName').value.trim().slice(0, 40);
    if (name.length < 2) return sag('Bitte einen Namen für die Etage eintragen.', 'fehler');
    const config = kopie(stand.floorplan);
    const layout = aktiveOrdnung(config);
    let id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'etage';
    while (layout.levels.some(level => level.id === id)) id += '2';
    const order = Math.max(0, ...layout.levels.map(level => level.order || 0)) + 1;
    layout.levels.push({ id, name, order, tables: [] });
    byId('etageName').value = '';
    veroeffentliche(config, {}, `„${name}“ ergänzt – jetzt Tische dazugeben.`);
  });

  // Betrieb
  byId('feldDauer').addEventListener('change', () => {
    const config = kopie(stand.floorplan);
    config.policy = { ...(config.policy || {}), durations: [{ upTo: 24, minutes: Number(byId('feldDauer').value) }] };
    veroeffentliche(config, {}, 'Sitzdauer übernommen.');
  });
  byId('feldPuffer').addEventListener('change', () => {
    const config = kopie(stand.floorplan);
    config.policy = { ...(config.policy || {}), bufferMinutes: Number(byId('feldPuffer').value) };
    veroeffentliche(config, {}, 'Abräumzeit übernommen.');
  });
  byId('feldNummern').addEventListener('change', () => {
    const config = kopie(stand.floorplan);
    config.numbering = { ...(config.numbering || { start: 1 }), mode: byId('feldNummern').value };
    veroeffentliche(config, {}, 'Nummerierung übernommen.');
  });
  byId('feldStandardEtage').addEventListener('change', () => {
    veroeffentliche(kopie(stand.floorplan), { standardEtage: byId('feldStandardEtage').value }, 'Online füllt jetzt zuerst diese Etage.');
  });
}
