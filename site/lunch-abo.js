// Der Weg zur aktuellen Mittagskarte auf der Startseite. Das
// Wochenkarten-Abo, das hier frueher auch wohnte, ist am 01.09.2026 auf
// Wunsch gegangen - mitsamt seinem Formular-Code, damit es nicht still
// zurueckkommt. Die Anmeldung nach einer Reservierung und der
// Dienst-Endpunkt bleiben davon unberuehrt.

import { holeKarteInfo, karteAdresse } from './haus-api.js?v=309a63fc';

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
