// Die einfache Wirt-Ansicht: was ist frei, Laufkundschaft setzen, Karte
// tauschen. Sie rechnet nichts selbst aus, was der Dienst besser weiss -
// der Tisch wird serverseitig vergeben, damit zwei Handys nie denselben
// letzten Tisch erwischen.

import {
  apiAdresse, bleibVerbunden, hausToken, holeKarteInfo, holeStand, karteAdresse,
  loescheKarte, schluesselAusAdresse, sendeAktion, sendeKarte, sendeLaufkunde
} from './haus-api.js?v=a0e5d122';
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
    byId('freiGross').textContent = 'Dienst fehlt';
    return;
  }

  // Erst der letzte bekannte Stand, dann der offene Draht. So steht sofort
  // etwas da, auch wenn der Draht eine Sekunde braucht.
  const erster = await holeStand(hausToken());
  if (erster?.stand) { stand = erster.stand; male(); }

  // Laeuft der Dienst offen, braucht der Draht keinen echten Schluessel -
  // der Platzhalter haelt nur die Verbindungslogik zufrieden.
  bleibVerbunden(hausToken() || 'offen', neuerStand => {
    stand = neuerStand;
    male();
  }, zustand => {
    byId('verbindung').dataset.zustand = zustand;
    byId('verbindungText').textContent = zustand === 'verbunden' ? 'Live verbunden' : 'Getrennt – verbinde neu …';
  });

  // Die Uhr laeuft weiter, auch wenn nichts passiert: nach 90 Minuten wird
  // ein Tisch von selbst frei, und die Zahlen muessen mitgehen.
  setInterval(male, 60 * 1000);

  byId('laufErgebnis').textContent = '';
  document.querySelector('.lauf-knoepfe').addEventListener('click', async event => {
    const knopf = event.target.closest('[data-personen]');
    if (!knopf) return;
    const personen = Number(knopf.dataset.personen);
    knopf.disabled = true;
    sag('laufErgebnis', 'Einen Moment …');
    const antwort = await sendeLaufkunde(hausToken(), personen);
    knopf.disabled = false;
    if (antwort?.ok) {
      sag('laufErgebnis', `${personen} ${personen === 1 ? 'Person' : 'Personen'} an Tisch ${antwort.tisch}`
        + `${antwort.etage ? ` (${antwort.etage})` : ''} – belegt bis ${antwort.bis} Uhr.`, 'gut');
      return;
    }
    sag('laufErgebnis', antwort?.grund === 'voll'
      ? 'Gerade ist kein passender Tisch frei. Unten nachsehen, wer bald geht.'
      : 'Das hat nicht geklappt – bitte noch einmal drücken.', 'fehler');
  });

  byId('imHaus').addEventListener('click', async event => {
    const knopf = event.target.closest('[data-frei-id]');
    if (!knopf) return;
    knopf.disabled = true;
    await sendeAktion(hausToken(), { art: 'abgang', id: knopf.dataset.freiId, zeit: jetzt().zeit });
    // Die Antwort kommt ueber den Draht zurueck und malt die Liste neu.
  });

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
}

function sag(wo, text, art = '') {
  const ziel = byId(wo);
  ziel.textContent = text;
  if (art) ziel.dataset.art = art; else delete ziel.dataset.art;
}

/** Alles neu malen: die eine Wahrheit ist der Stand des Dienstes. */
function male() {
  if (!stand?.floorplan) return;
  const plan = buildFloorplan(stand.floorplan);
  const policy = stand.floorplan.policy || {};
  const nu = jetzt();
  const at = `${nu.datum}T${nu.zeit}`;

  const heute = (stand.parties || []).filter(party => party.date === nu.datum);
  const belegt = new Set();
  const sitzen = [];
  for (const party of heute) {
    if (!party.tableIds?.length) continue;
    if (!occupiesAt(party, { at, minutes: durationFor(party.guests, policy) })) continue;
    sitzen.push(party);
    for (const id of party.tableIds) belegt.add(id);
  }
  const gesperrt = new Set(stand.blockedTables || []);
  const offen = plan.tables.filter(table => !gesperrt.has(table.id));
  const freie = offen.filter(table => !belegt.has(table.id));

  byId('freiGross').textContent = freie.length === 0
    ? 'Alles besetzt'
    : `${freie.length} von ${offen.length} Tischen frei`;
  byId('freiPlaetze').textContent = freie.length
    ? `${freie.reduce((summe, table) => summe + table.seats, 0)} Plätze insgesamt`
    : 'Unten steht, wer wann wieder geht.';

  // Nach Groesse, wie man am Telefon denkt: "Habt ihr noch einen Vierer?"
  const groessen = new Map();
  for (const table of offen) {
    const eintrag = groessen.get(table.seats) || { frei: 0, gesamt: 0 };
    eintrag.gesamt += 1;
    if (!belegt.has(table.id)) eintrag.frei += 1;
    groessen.set(table.seats, eintrag);
  }
  const liste = byId('freiGroessen');
  liste.textContent = '';
  for (const [plaetze, eintrag] of [...groessen.entries()].sort((a, b) => a[0] - b[0])) {
    const punkt = document.createElement('li');
    punkt.textContent = `${plaetze}er · ${eintrag.frei} von ${eintrag.gesamt} frei`;
    if (!eintrag.frei) punkt.setAttribute('data-leer', '');
    liste.append(punkt);
  }

  // Wer sitzt gerade - und wer kommt noch. Sortiert nach Beginn, damit oben
  // steht, wer als Naechstes fertig wird.
  const kasten = byId('imHaus');
  kasten.textContent = '';
  const dauer = party => durationFor(party.guests, policy);
  for (const party of [...sitzen].sort((a, b) => a.time.localeCompare(b.time))) {
    const zeile = document.createElement('li');
    const wer = document.createElement('div');
    wer.className = 'wer';
    const titel = document.createElement('b');
    titel.textContent = `Tisch ${party.tableIds.map(id => plan.tables.find(t => t.id === id)?.number ?? '?').join(' + ')} · ${party.guests} P.`;
    const info = document.createElement('span');
    const [stunde, minute] = party.time.split(':').map(Number);
    const bisMinuten = stunde * 60 + minute + dauer(party);
    info.textContent = `${party.name} · seit ${party.arrived || party.time} · frei gegen ${pad(Math.floor(bisMinuten / 60) % 24)}:${pad(bisMinuten % 60)}`;
    wer.append(titel, info);
    const frei = document.createElement('button');
    frei.type = 'button';
    frei.className = 'knopf leise';
    frei.dataset.freiId = party.id;
    frei.textContent = 'Wieder frei';
    zeile.append(wer, frei);
    kasten.append(zeile);
  }
  if (!sitzen.length) {
    const zeile = document.createElement('li');
    zeile.className = 'leer';
    zeile.textContent = 'Gerade sitzt niemand.';
    kasten.append(zeile);
  }

  const kommende = heute
    .filter(party => party.time > nu.zeit && !party.arrived && !party.left)
    .sort((a, b) => a.time.localeCompare(b.time));
  byId('kommend').textContent = kommende.length
    ? `Reserviert für später: ${kommende.length} ${kommende.length === 1 ? 'Gruppe' : 'Gruppen'}, die nächste um ${kommende[0].time} (${kommende[0].name}, ${kommende[0].guests} P.).`
    : 'Für später ist heute nichts reserviert.';
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
