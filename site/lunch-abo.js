// Wochenkarte abonnieren, direkt auf der Startseite. Laeuft ueber denselben
// Dienst wie die Anmeldung auf der Reservierungsseite: erst die
// Bestaetigungsmail, dann die Einwilligung - nie umgekehrt.
//
// Ohne eingetragenen Dienst faellt das Formular auf den alten Mailweg
// zurueck, statt still ins Leere zu schicken.

import { apiAdresse, meldeMittagskarte } from './haus-api.js?v=ae22f464';

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
