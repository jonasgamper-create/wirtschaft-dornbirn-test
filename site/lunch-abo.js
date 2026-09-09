// Der Weg zur aktuellen Mittagskarte auf der Startseite. Das
// Wochenkarten-Abo, das hier frueher auch wohnte, ist am 01.09.2026 auf
// Wunsch gegangen - mitsamt seinem Formular-Code, damit es nicht still
// zurueckkommt. Die Anmeldung nach einer Reservierung und der
// Dienst-Endpunkt bleiben davon unberuehrt.

import { holeKarteInfo, holeMenueplan, karteAdresse } from './haus-api.js?v=9bbaa1e5';

// ---- Die Mittagskarte als PDF, frisch vom Haus -----------------------------
//
// Der Knopf haengt am Dienst, nicht am Repo: laedt Wolfgang auf der
// Reservierungsseite eine neue Karte hoch, zeigt dieser Knopf ab dem Moment
// darauf. Antwortet der Dienst nicht, bleibt der Eintrag aus
// data/lunch-menu.json der Rueckfall (app.js) - und ohne beides bleibt der
// Knopf aus. Ein Knopf, der auf eine alte Datei zeigt, ist schlimmer als keiner.
async function zeigeKartenKnopf() {
  const knopf = document.querySelector('[data-lunch-card]');
  if (!knopf) return;
  const info = await holeKarteInfo();
  if (!info?.ok || info.vorhanden === false) return;
  const adresse = await karteAdresse();
  if (!adresse) return;
  knopf.href = adresse;
  knopf.hidden = false;
  if (info.stand) knopf.title = `Stand: ${info.stand}`;
}
zeigeKartenKnopf();

// Die Gerichte der Woche standen hier frueher live auf der Startseite.
// Sie sind am 31.08.2026 gegangen: die Startseite fuehrt zur Karte, statt
// sie abzuschreiben. Der Renderer ist mitgegangen - ohne ihn kann die
// Uebersicht nicht still zurueckkommen, sobald irgendwo wieder ein
// Container mit data-lunch-menu auftaucht.

// ---- Das heutige Wochengericht, eine Zeile ---------------------------------
//
// Das staerkste Kaufargument des Mittags ist das heutige Gericht mit seinem
// Preis (Wunsch vom 09.09.). EINE Zeile aus dem Menueplan - kein Abschreiben
// der Karte, die Entscheidung vom 31.08. bleibt: wer die Woche will, geht
// zur Karte. Die Zeile erscheint nur an Werktagen der veroeffentlichten
// Planwoche; sonst bleibt sie weg, statt ein altes Gericht zu behaupten.
async function zeigeTagesgericht() {
  const kasten = document.getElementById('lunchHeute');
  if (!kasten) return;
  const heute = new Date();
  const wochentag = heute.getDay();
  if (wochentag < 1 || wochentag > 5) return;

  const antwort = await holeMenueplan().catch(() => null);
  const plan = antwort?.ok ? antwort.plan : null;
  if (!plan?.montag || !Array.isArray(plan.tage)) return;

  const zweistellig = zahl => String(zahl).padStart(2, '0');
  const montag = new Date(heute);
  montag.setDate(heute.getDate() - (wochentag - 1));
  const montagWert = `${montag.getFullYear()}-${zweistellig(montag.getMonth() + 1)}-${zweistellig(montag.getDate())}`;
  if (plan.montag !== montagWert) return;

  const gericht = plan.tage[wochentag - 1]?.gerichte?.[0];
  if (!gericht?.name) return;
  const name = String(gericht.name).replace(/^mittagsgericht:\s*/i, '');
  const preis = Number(gericht.preis ?? plan.preise?.mittag);
  const preisText = Number.isFinite(preis) && preis > 0
    ? ` · € ${preis.toFixed(2).replace('.', ',')}`
    : '';
  document.getElementById('lunchHeuteText').textContent = `Heute: ${name}${preisText}`;
  kasten.hidden = false;
}
zeigeTagesgericht();
