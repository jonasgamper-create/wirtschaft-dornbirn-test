// Die Faltkarte fuer den Tisch: Vorderseite mit Logo und Woche, innen der
// Wochenplan und A la carte, hinten zwei QR-Codes. Gesetzt aus demselben
// Menueplan wie Takeaway und Mittagskarte - eine Quelle, drei Blaetter.
//
// Die QR-Texte kommen aus data/qr-ziele.json, die Codes selbst liegen als
// fertige SVG-Dateien im Repo (scripts/build-qr.mjs) - gedruckt heisst
// dauerhaft, deshalb haengt hier nichts an einer Bibliothek im Browser.

import { alsPreis, ladePlan, legende, wochenText, zeichneAlacarte, zeichneTage, zeichneVital } from './menuekarte.mjs?v=54febf2a';

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
  const { plan } = await ladePlan();
  if (!plan) {
    byId('tage').textContent = 'Die Karte lässt sich gerade nicht laden – bitte den Menüplan in der Wirt-Ansicht veröffentlichen.';
    return;
  }
  const woche = wochenText(plan);
  document.title = `Faltkarte ${woche} · Wirtschaft Dornbirn`;
  document.querySelectorAll('[data-woche]').forEach(el => { el.textContent = woche; });
  byId('preisMittag').textContent = alsPreis(plan.preise.mittag);
  zeichneTage(byId('tage'), plan);
  if (plan.vital.length) {
    byId('preisVital').textContent = alsPreis(plan.preise.vital);
    zeichneVital(byId('vitalListe'), plan);
    byId('vital').hidden = false;
  }
  zeichneAlacarte(byId('alacarte'), plan);
  const text = legende(plan);
  if (text) {
    byId('legende').textContent = `allergene: ${text}`;
    byId('legende').hidden = false;
  }
})();
