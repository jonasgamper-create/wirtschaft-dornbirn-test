// Der Monat in Zahlen, fuer den Blick am Monatsende: welche Gerichte wie
// oft bestellt wurden, wie viele Bestellungen, Reservierungen und Gaeste.
// Die Seite zeigt nur - gezaehlt wird im Dienst, anonym und dauerhaft,
// waehrend die Bestellungen selbst nach 30 Tagen geloescht werden.

import { apiAdresse, hausToken, holeZahlen, schluesselAusAdresse } from './haus-api.js?v=0b5227a8';

const byId = id => document.getElementById(id);

// Der angezeigte Monat. Start: der laufende.
let monat = new Date().toISOString().slice(0, 7);
let bekannteMonate = [];

const monatsName = wert => {
  const [jahr, nummer] = wert.split('-').map(Number);
  return new Date(Date.UTC(jahr, nummer - 1, 1)).toLocaleDateString('de-AT', {
    month: 'long', year: 'numeric', timeZone: 'UTC'
  });
};

const verschiebe = (wert, schritt) => {
  const [jahr, nummer] = wert.split('-').map(Number);
  const datum = new Date(Date.UTC(jahr, nummer - 1 + schritt, 1));
  return datum.toISOString().slice(0, 7);
};

start();

async function start() {
  schluesselAusAdresse();
  byId('monatZurueck').addEventListener('click', () => { monat = verschiebe(monat, -1); lade(); });
  byId('monatVor').addEventListener('click', () => { monat = verschiebe(monat, 1); lade(); });
  if (!(await apiAdresse())) {
    byId('zustand').textContent = 'Kein Dienst eingetragen.';
    return;
  }
  lade();
}

async function lade() {
  byId('monatTitel').textContent = monatsName(monat);
  const antwort = await holeZahlen(monat, hausToken());
  if (!antwort?.ok) {
    byId('zustand').textContent = antwort?.grund === 'token'
      ? 'Kein Zugang – bitte den Einrichtungslink öffnen.'
      : 'Der Dienst antwortet gerade nicht.';
    return;
  }
  byId('zustand').hidden = true;
  bekannteMonate = antwort.monate || [];
  male(antwort);
}

function male(daten) {
  const s = daten.summen || {};
  byId('zahlBestellungen').textContent = String(s.bestellungen || 0);
  byId('subBestellungen').textContent = s.portionen ? `${s.portionen} Portionen` : '';
  byId('zahlReservierungen').textContent = String(s.reservierungen || 0);
  byId('subReservierungen').textContent = s.laufkunde ? `+ ${s.laufkunde}× Laufkundschaft` : '';
  byId('zahlGaeste').textContent = String(s.gaeste || 0);
  byId('subGaeste').textContent = 'aus Reservierung und Laufkundschaft';

  // Die Gerichte als Rangliste mit Balken. Der Balken misst sich am
  // beliebtesten Gericht - so liest sich das Verhaeltnis auf einen Blick.
  const liste = byId('gerichteListe');
  liste.textContent = '';
  const gerichte = daten.gerichte || [];
  if (!gerichte.length) {
    const leer = document.createElement('li');
    leer.className = 'leer';
    leer.textContent = 'In diesem Monat wurde (noch) nichts bestellt.';
    liste.append(leer);
  }
  const spitze = gerichte[0]?.menge || 1;
  for (const gericht of gerichte) {
    const zeile = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'gericht-name';
    name.textContent = gericht.name;
    const balken = document.createElement('i');
    balken.className = 'gericht-balken';
    balken.style.width = `${Math.max(4, Math.round(gericht.menge / spitze * 100))}%`;
    const menge = document.createElement('b');
    menge.textContent = `${gericht.menge}×`;
    zeile.append(name, balken, menge);
    liste.append(zeile);
  }

  // Die Tage: nur die, an denen etwas war - eine Zeile je Tag.
  const tage = byId('tageListe');
  tage.textContent = '';
  const proTag = (daten.proTag || []).filter(tag => tag.bestellungen || tag.gaeste);
  if (!proTag.length) {
    const leer = document.createElement('li');
    leer.className = 'leer';
    leer.textContent = 'Noch keine Einträge in diesem Monat.';
    tage.append(leer);
  }
  for (const tag of proTag) {
    const zeile = document.createElement('li');
    const wann = document.createElement('span');
    wann.textContent = new Date(`${tag.tag}T12:00:00`).toLocaleDateString('de-AT', {
      weekday: 'short', day: 'numeric', month: 'numeric'
    });
    const was = document.createElement('small');
    const teile = [];
    if (tag.bestellungen) teile.push(`${tag.bestellungen} Takeaway`);
    if (tag.gaeste) teile.push(`${tag.gaeste} Gäste`);
    was.textContent = teile.join(' · ');
    zeile.append(wann, was);
    tage.append(zeile);
  }

  // Seit wann gezaehlt wird - damit ein duenner Altmonat nicht raetselhaft ist.
  const seit = byId('seitHinweis');
  if (daten.seit) {
    seit.hidden = false;
    seit.textContent = `Gezählt wird seit ${new Date(daten.seit).toLocaleDateString('de-AT', {
      day: 'numeric', month: 'long', year: 'numeric'
    })} – ältere Monate bleiben leer.`;
  }
}
