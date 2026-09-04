// Die Mittagskarte zum Ansehen und als PDF speichern - gesetzt aus dem
// Menueplan, den der Wirt eintraegt. Dieselbe Quelle wie Takeaway und
// Faltkarte; ein anderer Stand ist hier nicht moeglich.

import { ladePlan, legende, standText, wochenText, zeichneAlacarte, zeichneFussnote, zeichneWoche } from './menuekarte.mjs?v=60544c4f';

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
})();
