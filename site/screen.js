// Gaestebildschirm am Eingang: wer sitzt gerade wo.
//
// Liest denselben Browser-Speicher wie die interne Planung. Das heisst: der
// Bildschirm muss auf demselben Geraet laufen wie das Werkzeug - dann ist er
// wirklich live, ueber das storage-Ereignis ohne jede Verzoegerung. Ein Geraet
// im anderen Netz braeuchte einen Server.

import { activeLayout, buildFloorplan, seatingPlan, serviceOf } from './floorplan-layout.mjs?v=d8056338';
import { durationFor, occupiesAt, stamp } from './table-assignment.mjs?v=e03ddbf8';
import { renderFloorplan } from './floorplan.js?v=e371595f';

import { bleibVerbunden, hausToken } from './haus-api.js?v=d2fd0923';

const KEY = 'wirtschaft-dornbirn-host-control-v1';
const SICHT = 'wirtschaft-screen-namen';
const byId = id => document.getElementById(id);
if (byId('scList')) start();

async function start() {
  // Ist auf diesem Geraet noch nichts geplant, zeigt der Schirm wenigstens den
  // Saal. Sonst stuende er am Eingang leer da.
  let raum = window.WIRTSCHAFT_FLOORPLAN || null;
  if (!raum) {
    try { raum = await (await fetch('data/floorplan.json', { cache: 'no-store' })).json(); } catch { /* dann eben ohne */ }
  }
  // Kommt der Stand vom Dienst, gilt er. Nur ohne Dienst liest der Schirm den
  // Browser-Speicher desselben Geraets - dann ist er wie bisher an den einen
  // Rechner gebunden.
  let vomDienst = null;

  const lies = () => {
    if (vomDienst) return vomDienst;
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}');
    } catch {
      return {};
    }
  };

  const jetzt = () => {
    const date = new Date();
    const pad = n => String(n).padStart(2, '0');
    return {
      tag: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
      zeit: `${pad(date.getHours())}:${pad(date.getMinutes())}`
    };
  };

  // Namen am Eingang sind fuer jeden sichtbar. Drei Stufen, damit das Haus
  // entscheiden kann, wie viel es preisgibt.
  const stufen = ['voll', 'kurz', 'ohne'];
  let sicht = stufen.includes(localStorage.getItem(SICHT)) ? localStorage.getItem(SICHT) : 'voll';

  const zeige = name => {
    if (sicht === 'ohne') return 'Reserviert';
    if (sicht === 'kurz') {
      const teile = name.trim().split(/\s+/);
      return teile.length > 1
        ? `${teile[0]} ${teile[teile.length - 1][0]}.`
        : `${name.slice(0, 1)}.`;
    }
    return name;
  };

  function zeichne() {
    const state = lies();
    const plan = state.floorplan || raum;
    const { tag, zeit } = jetzt();
    byId('scClock').textContent = zeit;

    if (!plan) {
      byId('scList').textContent = '';
      const hinweis = document.createElement('p');
      hinweis.className = 'sc-empty';
      hinweis.textContent = 'Der Saalplan ist auf diesem Gerät noch nicht eingerichtet.';
      byId('scList').append(hinweis);
      return;
    }

    const built = buildFloorplan(plan);
    const service = serviceOf(activeLayout(plan));
    const schichten = service.mode === 'schichten' ? seatingPlan(service) : [];
    const dauer = party => {
      const schicht = schichten.find(entry => entry.time === party.time);
      if (schicht) return schicht.minutes;
      return durationFor(party.guests, plan.policy || {});
    };

    const marke = stamp(`${tag}T${zeit}`);
    // Wer abgerechnet hat und gegangen ist, verschwindet sofort vom Schirm.
    // Ein Name, der noch am Eingang steht, obwohl der Tisch neu vergeben ist,
    // schickt die naechsten Gaeste an den falschen Platz.
    const sitzend = (state.parties || [])
      .filter(party => party.date === tag && party.tableIds.length)
      .filter(party => occupiesAt(party, { at: `${tag}T${zeit}`, minutes: dauer(party) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));

    const nummer = new Map(built.tables.map(table => [table.id, table]));

    const liste = byId('scList');
    liste.textContent = '';
    if (!sitzend.length) {
      const leer = document.createElement('p');
      leer.className = 'sc-empty';
      const naechste = (state.parties || [])
        .filter(party => party.date === tag && party.tableIds.length && stamp(`${party.date}T${party.time}`) > marke)
        .sort((a, b) => a.time.localeCompare(b.time))[0];
      leer.textContent = naechste
        ? `Die ersten Gäste erwarten wir um ${naechste.time}.`
        : 'Herzlich willkommen. Bitte melden Sie sich beim Service.';
      liste.append(leer);
    }
    for (const party of sitzend) {
      const zeile = document.createElement('div');
      zeile.className = 'sc-row';
      const name = document.createElement('b');
      name.textContent = zeige(party.name);
      const tische = document.createElement('span');
      tische.className = 'sc-table';
      tische.textContent = party.tableIds.map(id => nummer.get(id)?.number ?? '?').join(' + ');
      const etage = document.createElement('em');
      etage.textContent = nummer.get(party.tableIds[0])?.levelName || '';
      zeile.append(name, etage, tische);
      liste.append(zeile);
    }

    byId('scCount').textContent = sitzend.length
      ? `${sitzend.reduce((sum, party) => sum + party.guests, 0)} Gäste an ${sitzend.length} Tischen`
      : 'Noch niemand am Platz';

    // Die Karte zeigt dasselbe: belegte Tische in Creme, freie in Weiss.
    const belegung = {};
    for (const party of sitzend) {
      for (const id of party.tableIds) belegung[id] = { name: zeige(party.name), guests: party.guests };
    }
    renderFloorplan(byId('scPlan'), plan, { mode: 'orientation', seating: belegung });
  }

  byId('scNames').addEventListener('click', () => {
    sicht = stufen[(stufen.indexOf(sicht) + 1) % stufen.length];
    try { localStorage.setItem(SICHT, sicht); } catch { /* privater Modus */ }
    byId('scNames').textContent = { voll: 'Namen: vollständig', kurz: 'Namen: abgekürzt', ohne: 'Namen: aus' }[sicht];
    zeichne();
  });

  byId('scFull').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });

  // Live ueber den Dienst: eine Onlinebuchung erscheint in dem Moment, in dem
  // sie eingeht - ohne Abfragen im Sekundentakt und ohne dass der Schirm auf
  // demselben Geraet laufen muss wie die Planung.
  const draht = byId('scLink');
  bleibVerbunden(hausToken(), stand => {
    vomDienst = stand;
    zeichne();
  }, zustand => {
    if (!draht) return;
    draht.hidden = zustand === 'verbunden';
    draht.textContent = 'Verbindung unterbrochen – die Anzeige kann veraltet sein.';
  });

  // Ohne Dienst bleibt es beim bisherigen Weg: das storage-Ereignis desselben
  // Geraets. Der Takt daneben ist fuer die Uhr und den Schichtwechsel.
  window.addEventListener('storage', event => {
    if (!vomDienst && (!event.key || event.key === KEY)) zeichne();
  });
  setInterval(zeichne, 15000);

  byId('scNames').textContent = { voll: 'Namen: vollständig', kurz: 'Namen: abgekürzt', ohne: 'Namen: aus' }[sicht];
  zeichne();
}
