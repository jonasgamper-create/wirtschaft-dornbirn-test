// Die Mittagskarte zum Ansehen und als PDF speichern - gesetzt aus dem
// Menueplan, den der Wirt eintraegt. Dieselbe Quelle wie Takeaway und
// Faltkarte; ein anderer Stand ist hier nicht moeglich.

import { ladePlan, legende, standText, wochenText, zeichneAlacarte, zeichneFussnote, zeichneWoche } from './menuekarte.mjs?v=b7f21cf5';

const byId = id => document.getElementById(id);
byId('drucken').addEventListener('click', () => window.print());

(async () => {
  const { plan, pdf } = await ladePlan();
  // Der Dienst hat keinen Plan, aber ein hochgeladenes PDF: das IST die Karte.
  if (!plan && pdf) { window.location.replace(pdf); return; }
  if (!plan) {
    byId('woche').innerHTML = '';
    const satz = document.createElement('p');
    satz.className = 'laden';
    satz.textContent = 'Die Karte lässt sich gerade nicht laden. Bitte kurz später erneut versuchen '
      + 'oder anrufen: +43 (0)5572 20 540.';
    byId('woche').append(satz);
    return;
  }

  document.title = `Mittagskarte ${wochenText(plan)} · Wirtschaft Dornbirn`;
  byId('wochenText').textContent = wochenText(plan);
  byId('stand').textContent = standText(plan);
  zeichneWoche(byId('woche'), plan);
  zeichneAlacarte(byId('alacarte'), plan);
  zeichneFussnote(byId('fuss'), plan);

  const text = legende(plan);
  if (text) {
    byId('legende').textContent = `allergene: ${text}`;
    byId('legende').hidden = false;
  }
  passeAnsBlattAn();
})();

/**
 * Die Karte auf so viele A4-Blaetter verteilen, wie sie braucht.
 *
 * Die gedruckte Karte des Hauses laeuft ueber zwei Seiten, und mit zwanzig
 * Gerichten tut es diese auch: auf ein Blatt gezwungen, fehlten die letzten
 * fuenf. Statt die Schrift bis zur Unlesbarkeit zu schrumpfen, wandert der
 * Rest auf ein zweites Blatt - Zeile fuer Zeile, solange das erste
 * ueberlaeuft. Das Folgeblatt traegt nur eine schmale Kopfzeile.
 *
 * Gemessen wird in Layout-Pixeln: das Blatt IST 794 x 1123, unabhaengig
 * davon, wie klein es am Bildschirm dargestellt wird.
 */
function verteileAufBlaetter() {
  const behaelter = document.querySelector('doc-page');
  const erstes = document.getElementById('blatt1');
  if (!behaelter || !erstes) return;

  const zuVoll = blatt => blatt.scrollHeight > blatt.clientHeight + 1;
  const MAX_BLAETTER = 4; // Notbremse gegen eine Endlosschleife

  let blatt = erstes;
  let nummer = 1;
  while (zuVoll(blatt) && nummer < MAX_BLAETTER) {
    const naechstes = neuesBlatt();
    behaelter.append(naechstes);
    const ziel = naechstes.querySelector('.blatt-inhalt');
    // Von hinten umschichten, bis es passt: das letzte Stueck des vollen
    // Blattes wandert nach vorn auf das neue.
    let notbremse = 0;
    while (zuVoll(blatt) && notbremse < 200) {
      notbremse += 1;
      const inhalt = blatt.querySelector('.blatt-inhalt');
      const letzte = letztesStueck(inhalt);
      if (!letzte) break;
      ziel.prepend(letzte);
    }
    blatt = naechstes;
    nummer += 1;
  }
}

/** Das letzte verschiebbare Stueck: eine Zeile, ein Absatz, eine Gruppe. */
function letztesStueck(inhalt) {
  const gruppen = [...inhalt.children].filter(k => !k.hidden);
  for (let i = gruppen.length - 1; i >= 0; i -= 1) {
    const teil = gruppen[i];
    // Innerhalb einer Gruppe zuerst die einzelnen Zeilen wandern lassen -
    // eine ganze Gruppe zu verschieben risse eine halbe Seite Loch.
    const zeilen = [...teil.querySelectorAll(':scope > .karte-zeile')];
    if (zeilen.length > 1) return zeilen[zeilen.length - 1];
    return teil;
  }
  return null;
}

function neuesBlatt() {
  const blatt = document.createElement('div');
  blatt.className = 'blatt blatt-weiter';
  const kopf = document.createElement('header');
  kopf.className = 'kopf';
  const titel = document.createElement('h1');
  titel.textContent = 'mittagskarte';
  const woche = document.createElement('small');
  woche.textContent = document.getElementById('wochenText')?.textContent || '';
  titel.append(woche);
  kopf.append(titel);
  const inhalt = document.createElement('div');
  inhalt.className = 'blatt-inhalt';
  blatt.append(kopf, inhalt);
  return blatt;
}

/**
 * Dasselbe wie bei der Faltkarte: das Blatt hat eine feste Groesse, also
 * misst sich die Karte selbst und verkleinert die Schrift, bis sie passt.
 * Gemessen wird in Layout-Pixeln (das Blatt IST 794 x 1123), damit die
 * Fensterbreite das Ergebnis nicht verfaelscht.
 */
function passeAnsBlattAn() {
  const passeZoomAn = () => {
    const platz = document.documentElement.clientWidth - 40;
    const zoom = Math.min(1, Math.max(0.42, platz / 794));
    document.querySelector('doc-page')?.style
      .setProperty('--blatt-zoom', String(Math.round(zoom * 1000) / 1000));
  };
  passeZoomAn();
  window.addEventListener('resize', passeZoomAn, { passive: true });

  const messen = () => {
    verteileAufBlaetter();
    const blaetter = document.querySelectorAll('.blatt').length;
    const hinweis = document.querySelector('.leiste p');
    if (hinweis && blaetter > 1) {
      hinweis.textContent = `Die Mittagskarte der Woche – ${blaetter} Blätter, so kommt sie auch an den Tisch.`;
    }
  };
  const start = () => setTimeout(messen, 60);
  if (document.fonts?.ready) document.fonts.ready.then(start);
  else start();
}
