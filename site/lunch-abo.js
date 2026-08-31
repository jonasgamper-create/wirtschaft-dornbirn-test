// Wochenkarte abonnieren, direkt auf der Startseite. Laeuft ueber denselben
// Dienst wie die Anmeldung auf der Reservierungsseite: erst die
// Bestaetigungsmail, dann die Einwilligung - nie umgekehrt.
//
// Ohne eingetragenen Dienst faellt das Formular auf den alten Mailweg
// zurueck, statt still ins Leere zu schicken.

import { apiAdresse, holeKarteInfo, karteAdresse, meldeMittagskarte } from './haus-api.js?v=7abef86d';

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

const form = document.getElementById('lunchAbo');
const status = document.getElementById('lunchAboStatus');

form?.addEventListener('submit', async event => {
  event.preventDefault();
  const feld = document.getElementById('lunchAboMail');
  const email = feld.value.trim();
  if (!email || !feld.checkValidity()) {
    status.textContent = 'Bitte eine gültige E-Mail-Adresse eintragen.';
    return;
  }
  if (!(await apiAdresse())) {
    // Kein Dienst: der bisherige Weg ueber das Mailprogramm.
    window.location.href = 'mailto:willkommen@wirtschaft-dornbirn.at?subject=Wochenkarte%20abonnieren';
    return;
  }
  const knopf = form.querySelector('button[type="submit"]');
  knopf.disabled = true;
  status.textContent = 'Einen Moment …';
  const antwort = await meldeMittagskarte(email, 'startseite');
  knopf.disabled = false;
  if (antwort?.ok) {
    form.querySelector('.lunch-abo-feld').hidden = true;
    knopf.hidden = true;
    status.textContent = antwort.schon
      ? 'Diese Adresse ist schon angemeldet – alles gut.'
      : 'Fast geschafft: Schau in dein Postfach und bestätige die Anmeldung kurz.';
    return;
  }
  status.textContent = 'Das hat gerade nicht geklappt. Versuch es später noch einmal oder ruf uns an.';
});
