// Die Faltkarte fuer den Tisch: Vorderseite mit Logo und Woche, innen links
// die Wochengerichte und rechts A la carte - gegliedert wie die Mittagskarte
// des Hauses -, hinten zwei QR-Codes. Gesetzt aus demselben Menueplan wie
// Takeaway und Mittagskarte - eine Quelle, drei Blaetter.
//
// Die QR-Texte kommen aus data/qr-ziele.json, die Codes selbst liegen als
// fertige SVG-Dateien im Repo (scripts/build-qr.mjs) - gedruckt heisst
// dauerhaft, deshalb haengt hier nichts an einer Bibliothek im Browser.

import { ladePlan, legende, wochenText, zeichneAlacarte, zeichneFussnote, zeichneWoche } from './menuekarte.mjs?v=60544c4f';

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
  document.title = `Faltkarte ${woche} · Wirtschaft Dornbirn`;
  document.querySelectorAll('[data-woche]').forEach(el => { el.textContent = woche; });
  zeichneWoche(byId('woche'), plan);
  zeichneAlacarte(byId('alacarte'), plan);
  zeichneFussnote(byId('fuss'), plan);
  const text = legende(plan);
  if (text) {
    byId('legende').textContent = `allergene: ${text}`;
    byId('legende').hidden = false;
  }
})();
