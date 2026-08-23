// Wochenkarte abonnieren, direkt auf der Startseite. Laeuft ueber denselben
// Dienst wie die Anmeldung auf der Reservierungsseite: erst die
// Bestaetigungsmail, dann die Einwilligung - nie umgekehrt.
//
// Ohne eingetragenen Dienst faellt das Formular auf den alten Mailweg
// zurueck, statt still ins Leere zu schicken.

import { apiAdresse, holeTakeawayKarte, meldeMittagskarte } from './haus-api.js?v=aad7ea75';

// ---- Die Gerichte der Woche, live vom Haus ---------------------------------
//
// Eine Quelle fuer alles: was der Wirt als Karte veroeffentlicht, steht hier
// auf der Startseite und ist zugleich im Takeaway bestellbar. Die statische
// Karte aus dem Repo bleibt der Rueckfall, wenn der Dienst nicht antwortet.

const alsPreis = wert => `€ ${Number(wert).toFixed(2).replace('.', ',')}`;

async function zeigeLiveGerichte() {
  const kasten = document.querySelector('[data-lunch-menu]');
  if (!kasten) return;
  const antwort = await holeTakeawayKarte();
  if (!antwort?.ok || !Array.isArray(antwort.gerichte) || !antwort.gerichte.length) return;

  const male = () => {
    if (kasten.dataset.live === '1') return;
    kasten.dataset.live = '1';
    kasten.textContent = '';
    const artikel = document.createElement('article');
    artikel.className = 'lunch-day is-today';
    const titel = document.createElement('h3');
    titel.textContent = 'Diese Woche';
    artikel.append(titel);
    for (const gericht of antwort.gerichte) {
      const zeileEl = document.createElement('p');
      zeileEl.className = 'lunch-dish';
      const name = document.createElement('span');
      name.textContent = gericht.allergene?.length
        ? `${gericht.name} (${gericht.allergene.join(', ')})`
        : gericht.name;
      const preis = document.createElement('b');
      preis.textContent = alsPreis(gericht.preis);
      zeileEl.append(name, preis);
      artikel.append(zeileEl);
    }
    kasten.append(artikel);
  };
  // Die statische Karte malt zeitversetzt aus lunch-menu.json - deshalb
  // einmal jetzt und noch zweimal danach, bis die Live-Fassung stehen bleibt.
  male();
  setTimeout(() => { delete kasten.dataset.live; male(); }, 1500);
  setTimeout(() => { delete kasten.dataset.live; male(); }, 4000);
}
zeigeLiveGerichte();

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
