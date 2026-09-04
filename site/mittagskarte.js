// Die Mittagskarte - EIN A4-Blatt, gefaltet, vier Seiten (Wunsch vom 04.09.).
// Dieselbe Seite fuer Gaeste zum Ansehen und fuer den Tisch zum Drucken: Vorderseite mit Logo und Woche, innen links
// die Wochengerichte und rechts A la carte - gegliedert wie die Mittagskarte
// des Hauses -, hinten zwei QR-Codes. Gesetzt aus demselben Menueplan wie
// Takeaway und Mittagskarte - eine Quelle, drei Blaetter.
//
// Die QR-Texte kommen aus data/qr-ziele.json, die Codes selbst liegen als
// fertige SVG-Dateien im Repo (scripts/build-qr.mjs) - gedruckt heisst
// dauerhaft, deshalb haengt hier nichts an einer Bibliothek im Browser.

import { ladePlan, legende, wochenText, zeichneAlacarte, zeichneFussnote, zeichneWoche } from './menuekarte.mjs?v=b7f21cf5';

const byId = id => document.getElementById(id);
byId('drucken').addEventListener('click', () => window.print());

fetch('data/qr-ziele.json', { cache: 'no-store' })
  .then(antwort => antwort.json())
  .then(ziele => {
    if (ziele?.events?.text) byId('qrEventsText').textContent = ziele.events.text;
    if (ziele?.takeaway?.text) byId('qrTakeawayText').textContent = ziele.takeaway.text;
  })
  .catch(() => { /* die Texte im HTML stimmen als Vorgabe */ });

(async () => {
  const { plan, quelle } = await ladePlan('', { pdfErlaubt: false });
  if (plan && quelle === 'datei') {
    // Noch kein Plan veroeffentlicht: die Vorschau zeigt die hinterlegte
    // Woche, damit man das Blatt sieht - gedruckt werden sollte sie so nicht.
    const hinweis = document.getElementById('leisteHinweis');
    if (hinweis) hinweis.textContent = 'Noch kein Menüplan veröffentlicht – das ist die hinterlegte Beispielwoche. Erst in der Wirt-Ansicht veröffentlichen, dann drucken.';
  }
  if (!plan) {
    byId('woche').textContent = 'Die Karte lässt sich gerade nicht laden – bitte den Menüplan in der Wirt-Ansicht veröffentlichen.';
    return;
  }
  const woche = wochenText(plan);
  document.title = `Mittagskarte ${woche} · Wirtschaft Dornbirn`;
  document.querySelectorAll('[data-woche]').forEach(el => { el.textContent = woche; });
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
 * Die Faltkarte hat eine feste Groesse - was nicht draufpasst, wird beim
 * Drucken abgeschnitten. Mit der Karte vom 04.09. blieben rechts noch fuenf
 * Pixel Luft; eine Zeile mehr, und das letzte Gericht waere lautlos
 * verschwunden.
 *
 * Deshalb misst die Seite sich selbst und verkleinert die Schrift in kleinen
 * Schritten, bis beide Haelften passen - hoechstens bis 80 Prozent, darunter
 * waere die Karte am Tisch nicht mehr lesbar. Reicht auch das nicht, sagt
 * die Leiste es, statt still abzuschneiden.
 */
function passeAnsBlattAn() {
  const haelften = [...document.querySelectorAll('#innen .haelfte')];
  const innen = document.getElementById('innen');

  /**
   * Gemessen wird in Layout-Pixeln: die Seite IST im Layout ein A4-Blatt
   * (1123 x 794), auch wenn sie am Bildschirm verkleinert dargestellt wird.
   * clientHeight und scrollHeight liefern beide diese Layout-Werte -
   * getBoundingClientRect dagegen die verkleinerte Darstellung, was die
   * Messung von der Fensterbreite abhaengig gemacht haette.
   */
  const zuVoll = () => haelften.some(h => h.scrollHeight > h.clientHeight + 1);
  let stufe = 1;
  const messen = () => {
    // Bis 72 Prozent darf die Schrift schrumpfen. Das ist auf A5 immer noch
    // gut lesbar (7 statt 10 pt fuer die Gerichtsnamen) und faengt eine
    // laengere Woche ab, ohne dass jemand etwas tun muss.
    // In Punkt rechnen, nicht in em: "0.72em" bezieht sich auf den ELTERN-
    // wert (16 px vom Koerper), nicht auf die 9,5 pt der Seite - aus einer
    // gewollten Verkleinerung auf 72 Prozent waeren so 91 Prozent geworden.
    const AUSGANG = 9.5;
    while (zuVoll() && stufe > 0.72) {
      stufe = Math.round((stufe - 0.02) * 100) / 100;
      innen.style.fontSize = `${(AUSGANG * stufe).toFixed(2)}pt`;
    }
    const hinweis = document.getElementById('leisteHinweis');
    if (zuVoll() && hinweis) {
      hinweis.textContent = 'Achtung: Die Karte ist zu lang für ein Blatt. Bitte in der Wirt-Ansicht ein paar Gerichte '
        + 'entfernen – sonst fehlt beim Drucken das Ende.';
      hinweis.dataset.art = 'warnung';
    }
  };
  /**
   * Das Blatt so verkleinern, dass es ins Fenster passt - nie vergroessern.
   * zoom und nicht transform: zoom aendert auch den Platzbedarf, sonst
   * bliebe unter der Karte eine Luecke in Originalgroesse stehen.
   */
  const passeZoomAn = () => {
    // Die Fensterbreite, nicht der Elternknoten: der ist der Schacht von
    // doc-page und richtet sich nach seinem Kind - er waere also immer
    // genau so breit wie das Blatt und ergaebe nie eine Verkleinerung.
    // 80 px Abzug, nicht 24: doc-page legt links und rechts einen eigenen
    // Rand um das Blatt, der beim Zoom mitwaechst - mit knapperem Abzug
    // ragte die Seite noch 51 px aus dem Fenster.
    const platz = document.documentElement.clientWidth - 80;
    // Nicht kleiner als 45 Prozent: am Telefon waere das Blatt sonst auf
    // 29 Prozent geschrumpft (322 px breit) und niemand koennte pruefen,
    // was er da druckt. Unterhalb dieser Grenze darf die Seite lieber
    // seitlich scrollen - dafuer traegt der Behaelter overflow-x.
    const zoom = Math.min(1, Math.max(0.45, platz / 1123));
    document.querySelector('doc-page')?.style
      .setProperty('--blatt-zoom', String(Math.round(zoom * 1000) / 1000));
  };
  passeZoomAn();
  window.addEventListener('resize', passeZoomAn, { passive: true });

  // Kein requestAnimationFrame: liegt die Seite im Hintergrund (Vorschau,
  // zweiter Tab), laeuft die Bildschleife nicht - die Karte bliebe dann
  // ungemessen und liefe beim Drucken ueber. Schriften abwarten, dann messen.
  const start = () => setTimeout(messen, 60);
  if (document.fonts?.ready) document.fonts.ready.then(start);
  else start();
}
