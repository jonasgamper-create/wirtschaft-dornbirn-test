// Der Bildschirm am Herd. Bewusst schmal: offene Bestellungen, ein grosser
// Knopf je Zeile, sonst nichts.
//
// Die Ansicht meldet sich mit der Rolle "kueche" an und bekommt vom Dienst
// deshalb weder Reservierungen noch Gaestekontakte - nicht einmal die
// Telefonnummer der Bestellung. Die SMS verschickt der Dienst; dafuer muss
// sie hier niemand sehen. Datensparsamkeit an einem Geraet, das offen in der
// Kueche steht, ist keine Formalie.

import {
  apiAdresse, bleibVerbunden, hausToken, holeStand, schluesselAusAdresse, sendeTakeawayAktion
} from './haus-api.js?v=1aec1725';

const byId = id => document.getElementById(id);
const pad = zahl => String(zahl).padStart(2, '0');
const jetzt = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

let stand = null;
start();

async function start() {
  schluesselAusAdresse();
  if (!(await apiAdresse())) {
    byId('verbindungText').textContent = 'Kein Dienst eingetragen';
    return;
  }

  const erster = await holeStand(hausToken());
  if (erster?.stand) { stand = erster.stand; male(); }

  bleibVerbunden(hausToken() || 'offen', neuerStand => {
    stand = neuerStand;
    male();
  }, zustand => {
    byId('verbindung').dataset.zustand = zustand;
    byId('verbindungText').textContent = zustand === 'verbunden' ? 'Live verbunden' : 'Getrennt – verbinde neu …';
  }, 'kueche');

  verdrahte();
}

const portionenVon = bestellung =>
  (bestellung.posten || []).reduce((summe, posten) => summe + posten.menge, 0);

/** Heute und noch nicht abgeholt - alles andere geht die Kueche nichts an. */
function heutige() {
  const heute = new Date();
  const datum = `${heute.getFullYear()}-${pad(heute.getMonth() + 1)}-${pad(heute.getDate())}`;
  return (stand?.takeaway || [])
    .filter(bestellung => bestellung.date === datum && bestellung.status !== 'abgeholt')
    .sort((a, b) => String(a.abholzeit).localeCompare(String(b.abholzeit)));
}

function zeile(bestellung, fertig) {
  const li = document.createElement('li');
  if (bestellung.eng) li.dataset.ton = 'spaet';

  const zeit = document.createElement('span');
  zeit.className = 'zeit';
  zeit.textContent = bestellung.abholzeit;

  const wer = document.createElement('div');
  wer.className = 'wer';
  const b = document.createElement('b');
  b.textContent = `Nr. ${bestellung.nummer} · ${bestellung.name}`;
  // Die Gerichte sind der eigentliche Inhalt fuer die Kueche - sie stehen
  // deshalb ausgeschrieben da, nicht als Zahl.
  const was = document.createElement('span');
  was.textContent = (bestellung.posten || [])
    .map(posten => `${posten.menge}× ${posten.name}`).join(' · ');
  wer.append(b, was);
  if (bestellung.eng) {
    const eng = document.createElement('span');
    eng.className = 'wunsch';
    eng.textContent = '● viel los um diese Zeit';
    wer.append(eng);
  }

  const knopf = document.createElement('button');
  knopf.type = 'button';
  knopf.className = fertig ? 'knopf leise' : 'knopf';
  knopf.dataset.aktion = fertig ? 'zurueck' : 'fertig';
  knopf.dataset.id = bestellung.id;
  knopf.textContent = fertig ? 'Doch nicht' : 'Fertig';

  li.append(zeit, wer, knopf);
  return li;
}

function male() {
  const alle = heutige();
  const offen = alle.filter(bestellung => bestellung.status !== 'fertig');
  const fertig = alle.filter(bestellung => bestellung.status === 'fertig');

  byId('zahlOffen').textContent = String(offen.length);
  byId('zahlFertig').textContent = String(fertig.length);
  byId('zahlPortionen').textContent = String(offen.reduce((summe, b) => summe + portionenVon(b), 0));
  byId('subOffen').textContent = offen.length ? `nächste ${offen[0].abholzeit}` : 'nichts offen';
  byId('subFertig').textContent = fertig.length ? 'am Tresen' : '';
  byId('subPortionen').textContent = '';

  // Ob der Gast eine Nachricht bekommt, muss am Herd sichtbar sein: sonst
  // wartet jemand auf einen Anruf, den niemand macht.
  byId('smsHinweis').textContent = stand?.smsAn
    ? '„Fertig“ schickt dem Gast eine SMS.'
    : '„Fertig“ meldet nur hier – der Gast bekommt keine Nachricht.';

  for (const [liste, eintraege, leerText] of [
    [byId('offenListe'), offen, 'Gerade nichts zu kochen.'],
    [byId('fertigListe'), fertig, 'Nichts wartet.']
  ]) {
    liste.textContent = '';
    if (!eintraege.length) {
      const leer = document.createElement('li');
      leer.className = 'leer';
      leer.textContent = leerText;
      liste.append(leer);
      continue;
    }
    for (const bestellung of eintraege) liste.append(zeile(bestellung, bestellung.status === 'fertig'));
  }
}

function verdrahte() {
  const behandle = async event => {
    const knopf = event.target.closest('[data-aktion]');
    if (!knopf) return;
    knopf.disabled = true;
    const { aktion, id } = knopf.dataset;
    if (aktion === 'fertig') await sendeTakeawayAktion(hausToken(), { art: 'fertig', id, zeit: jetzt() });
    if (aktion === 'zurueck') await sendeTakeawayAktion(hausToken(), { art: 'offen', id });
    // Die Antwort kommt ueber den Draht zurueck und malt neu.
  };
  byId('offenListe').addEventListener('click', behandle);
  byId('fertigListe').addEventListener('click', behandle);
}
