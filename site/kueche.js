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
} from './haus-api.js?v=64b16db1';

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

/**
 * Ist die Kueche gerade fuers Fertigmelden zustaendig? Die Einstellung kommt
 * vom Dienst, damit hier und beim Wirt nie zwei verschiedene Wahrheiten
 * stehen. Kein Wert heisst Kueche - so war es, bevor es den Schalter gab.
 */
const darfFertig = () => {
  const wer = stand?.fertigWer || 'kueche';
  return wer === 'kueche' || wer === 'beide';
};

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

  // Meldet der Wirt fertig, steht hier kein Knopf - aber sehr wohl der Stand.
  // Wer am Herd steht, muss wissen, was schon draussen ist, auch wenn er es
  // nicht selbst umschaltet. Ein leeres Feld waere die schlechtere Antwort.
  if (darfFertig()) {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = fertig ? 'knopf leise' : 'knopf';
    knopf.dataset.aktion = fertig ? 'zurueck' : 'fertig';
    knopf.dataset.id = bestellung.id;
    knopf.textContent = fertig ? 'Doch nicht' : 'Fertig';
    li.append(zeit, wer, knopf);
  } else {
    const lage = document.createElement('span');
    lage.className = 'knopf-ersatz';
    lage.textContent = fertig
      ? `fertig${bestellung.fertigSeit ? ` ${bestellung.fertigSeit}` : ''}`
      : 'in Arbeit';
    li.append(zeit, wer, lage);
  }

  // "Dauert laenger" ist die nuetzlichste Auskunft ueberhaupt: die Abholzeit
  // kennt der Gast schon, aber nicht, dass sie nicht haelt. Nur bei noch
  // offenen Bestellungen - was fertig ist, dauert nicht mehr.
  //
  // Das bleibt der Kueche auch dann, wenn der Wirt fertigmeldet: ob es laenger
  // dauert, weiss nur der Herd. Zustaendig ist der Wirt fuers Melden, nicht
  // fuers Schaetzen.
  if (!fertig) {
    const spaeter = document.createElement('button');
    spaeter.type = 'button';
    spaeter.className = 'knopf leise spaeter';
    spaeter.dataset.aktion = 'spaeter';
    spaeter.dataset.id = bestellung.id;
    spaeter.textContent = '+10 Min';
    spaeter.setAttribute('aria-label', `Abholzeit von Nr. ${bestellung.nummer} um zehn Minuten verschieben`);
    li.append(spaeter);
  }
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
  // wartet jemand auf einen Anruf, den niemand macht. Und wenn der Wirt
  // fertigmeldet, gehoert genau das hierher - sonst sucht die Kueche einen
  // Knopf, den es fuer sie nicht gibt.
  byId('smsHinweis').textContent = !darfFertig()
    ? 'Fertigmelden macht der Wirt am Tresen – hier steht nur, was läuft.'
    : (stand?.smsAn
      ? '„Fertig“ schickt dem Gast eine SMS.'
      : '„Fertig“ meldet nur hier – der Gast bekommt keine Nachricht.');

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
    // Die Rolle geht mit: stellt der Wirt waehrenddessen um, laesst der Dienst
    // ein "fertig" von diesem Bildschirm nicht mehr durch.
    if (aktion === 'fertig') await sendeTakeawayAktion(hausToken(), { art: 'fertig', id, zeit: jetzt(), rolle: 'kueche' });
    if (aktion === 'zurueck') await sendeTakeawayAktion(hausToken(), { art: 'offen', id });
    if (aktion === 'spaeter') await sendeTakeawayAktion(hausToken(), { art: 'spaeter', id, minuten: 10 });
    // Die Antwort kommt ueber den Draht zurueck und malt neu.
  };
  byId('offenListe').addEventListener('click', behandle);
  byId('fertigListe').addEventListener('click', behandle);
}
