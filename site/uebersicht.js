// Die Uebersicht fuers Haus: der Tag in vier Zahlen, die faelligen
// Handgriffe, die naechsten eigenen Termine. Sie verwaltet nichts selbst -
// jede Handlung fuehrt in das Werkzeug, das dafuer da ist. Eine Uebersicht,
// in der man auch arbeiten kann, ist bald keine Uebersicht mehr.

import {
  apiAdresse, bleibVerbunden, hausToken, holeEigeneEvents, holeKarteInfo,
  holeNewsletterZahlen, holeStand, schluesselAusAdresse
} from './haus-api.js?v=92aa5302';

const byId = id => document.getElementById(id);
const pad = zahl => String(zahl).padStart(2, '0');
const heuteIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

let stand = null;

start();

async function start() {
  schluesselAusAdresse();
  byId('heuteTitel').textContent = new Date().toLocaleDateString('de-AT', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
  if (!(await apiAdresse())) {
    byId('verbindungText').textContent = 'Kein Dienst eingetragen';
    return;
  }

  const erster = await holeStand(hausToken());
  if (erster?.stand) { stand = erster.stand; male(); }
  else if (erster?.grund === 'token') {
    byId('verbindungText').textContent = 'Kein Zugang – bitte den Einrichtungslink öffnen';
    return;
  }

  bleibVerbunden(hausToken() || 'offen', neuerStand => { stand = neuerStand; male(); }, zustand => {
    byId('verbindung').dataset.zustand = zustand;
    byId('verbindungText').textContent = zustand === 'verbunden' ? 'Live verbunden' : 'Getrennt – verbinde neu …';
  }, 'haus');

  // Karte, Abos und Termine aendern sich selten - einmal beim Laden reicht,
  // der Rest kommt live ueber den Draht.
  zeigeRanddaten();
}

function male() {
  const heute = heuteIso();
  const parties = (stand?.parties || []).filter(party => party.date === heute && !party.nichtDa);
  const personen = parties.reduce((summe, party) => summe + (Number(party.guests) || 0), 0);
  byId('zahlReservierungen').textContent = String(parties.length);
  byId('subReservierungen').textContent = parties.length ? `${personen} Personen` : 'noch frei';

  const bestellungen = (stand?.takeaway || []).filter(bestellung => bestellung.date === heute);
  const offen = bestellungen.filter(bestellung => bestellung.status === 'offen').length;
  const fertig = bestellungen.filter(bestellung => bestellung.status === 'fertig').length;
  byId('zahlTakeaway').textContent = String(bestellungen.length);
  byId('subTakeaway').textContent = bestellungen.length
    ? `${offen} offen · ${fertig} zum Abholen`
    : 'keine Bestellungen';

  zeigeAufgaben();
}

async function zeigeRanddatenEinzeln(hole, male) {
  try { male(await hole()); } catch { /* Kachel bleibt leer statt falsch */ }
}

let karteDa = null;

function zeigeRanddaten() {
  zeigeRanddatenEinzeln(holeKarteInfo, info => {
    karteDa = info?.da === true;
    byId('zahlKarte').textContent = karteDa ? '✓' : '–';
    byId('subKarte').textContent = karteDa
      ? (info?.stand ? `Stand ${new Date(info.stand).toLocaleDateString('de-AT')}` : 'hinterlegt')
      : 'keine Karte hinterlegt';
    zeigeAufgaben();
  });
  zeigeRanddatenEinzeln(() => holeNewsletterZahlen(hausToken()), zahlen => {
    if (!zahlen?.ok) return;
    // `bestaetigt` zaehlt beide Listen zusammen, `events` nur die Termine -
    // die Karte ist also die Differenz.
    const gesamt = Number(zahlen.bestaetigt) || 0;
    const events = Number(zahlen.events) || 0;
    byId('zahlAbos').textContent = String(gesamt);
    byId('subAbos').textContent = `${Math.max(0, gesamt - events)} Karte · ${events} Termine`;
  });
  zeigeRanddatenEinzeln(holeEigeneEvents, antwort => {
    const liste = byId('terminListe');
    liste.textContent = '';
    const events = antwort?.events || [];
    if (!events.length) {
      const leer = document.createElement('li');
      leer.className = 'leer';
      leer.textContent = 'Nichts angesetzt.';
      liste.append(leer);
      return;
    }
    for (const event of events.slice(0, 6)) {
      const li = document.createElement('li');
      const wann = document.createElement('span');
      wann.className = 'event-wann';
      wann.textContent = new Date(`${event.date}T12:00:00`).toLocaleDateString('de-AT', {
        weekday: 'short', day: '2-digit', month: 'short'
      }) + (event.beginn ? ` · ${event.beginn}` : '');
      const was = document.createElement('span');
      was.className = 'event-was';
      was.textContent = event.title;
      li.append(wann, was);
      liste.append(li);
    }
  });
}

/**
 * Die Aufgaben sind abgeleitet, nicht gepflegt: was faellig ist, ergibt sich
 * aus dem Zustand. Eine handgefuehrte Liste veraltet; diese hier kann nicht
 * veralten, weil sie jedes Mal neu entsteht.
 */
function zeigeAufgaben() {
  const liste = byId('aufgabenListe');
  if (!liste) return;
  const aufgaben = [];

  const wochentag = new Date().getDay();
  if (karteDa === false && wochentag >= 1 && wochentag <= 5) {
    aufgaben.push({ text: 'Keine Mittagskarte hinterlegt – Gäste sehen nur die Beispielgerichte.', wohin: 'wirt.html', wo: 'Karte hochladen' });
  }

  const heute = heuteIso();
  const wartend = (stand?.takeaway || []).filter(bestellung => bestellung.date === heute && bestellung.status === 'fertig');
  if (wartend.length >= 3) {
    aufgaben.push({ text: `${wartend.length} fertige Bestellungen warten am Tresen.`, wohin: 'kueche.html', wo: 'Küche öffnen' });
  }

  const unzugeteilt = (stand?.parties || []).filter(party => party.date === heute && !party.nichtDa && !(party.tableIds || []).length);
  if (unzugeteilt.length) {
    aufgaben.push({ text: `${unzugeteilt.length} Reservierung(en) heute ohne Tisch.`, wohin: 'wirt.html', wo: 'Einteilen' });
  }

  liste.textContent = '';
  if (!aufgaben.length) {
    const leer = document.createElement('li');
    leer.className = 'leer';
    leer.textContent = 'Nichts fällig – alles läuft.';
    liste.append(leer);
    return;
  }
  for (const aufgabe of aufgaben) {
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = aufgabe.text;
    const hin = document.createElement('a');
    hin.href = aufgabe.wohin;
    hin.textContent = aufgabe.wo;
    li.append(text, hin);
    liste.append(li);
  }
}
