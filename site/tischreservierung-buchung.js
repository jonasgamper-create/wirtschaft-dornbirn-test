// Direkte Tischreservierung ueber den eigenen Dienst.
//
// Ist kein Dienst eingetragen, passiert hier nichts: die Seite bleibt genau
// wie bisher und leitet auf den offiziellen Anbieter weiter. Erst wenn der
// Dienst laeuft, wird aus dem Formular eine echte Buchung.

import { apiAdresse, buche, holeFrei } from './haus-api.js?v=1b0bb579';

const byId = id => document.getElementById(id);
start();

async function start() {
  const knopf = byId('bookDirect');
  const weiter = byId('submitBooking');
  if (!knopf || !weiter) return;
  if (!(await apiAdresse())) return;

  // Ab hier nehmen wir die Reservierung selbst an.
  const nameFeld = byId('guestNameField');
  const name = byId('guestName');
  const ergebnis = byId('bookingResult');
  const hinweis = byId('submitHint');
  nameFeld.hidden = false;
  name.required = true;
  weiter.hidden = true;
  knopf.hidden = false;
  hinweis.textContent = 'Wir teilen den Tisch direkt ein und melden dir sofort, ob es passt. '
    + 'Ausser dem Namen speichern wir nichts – keine Mailadresse, keine Telefonnummer.';

  const sag = (text, art = 'info') => {
    ergebnis.hidden = false;
    ergebnis.textContent = text;
    ergebnis.dataset.art = art;
  };

  // ---- Zeigen, was frei ist ------------------------------------------------
  //
  // Alle Zeiten stehen lassen und die belegten ausgrauen - das ist die
  // uebliche Loesung und die ehrlichste: der Gast sieht auf einen Blick, was
  // geht, statt auf gut Glueck zu waehlen und dann eine Absage zu bekommen.

  const zeitKnoepfe = () => [...document.querySelectorAll('#timeSlots [data-time]')];
  const personenZahl = () =>
    Number(document.querySelector('[name="adults"]')?.value || 0)
    + Number(document.querySelector('[name="children"]')?.value || 0);

  let laeuft = 0;
  async function zeigeVerfuegbarkeit() {
    const tag = byId('day')?.value;
    const personen = personenZahl();
    if (!tag || personen < 1) return;

    // Nur die letzte Anfrage zaehlt: wer schnell klickt, loest mehrere aus,
    // und eine alte Antwort duerfte die neue nicht ueberschreiben.
    const meine = ++laeuft;
    for (const knopf of zeitKnoepfe()) knopf.dataset.pruefe = '1';
    const antwort = await holeFrei(tag, personen);
    if (meine !== laeuft) return;
    for (const knopf of zeitKnoepfe()) delete knopf.dataset.pruefe;

    if (!antwort?.ok || !Array.isArray(antwort.zeiten)) {
      // Ohne Auskunft nichts sperren: lieber anfragen lassen als abweisen.
      for (const knopf of zeitKnoepfe()) {
        knopf.disabled = false;
        knopf.removeAttribute('data-voll');
        knopf.title = '';
      }
      byId('slotInfo').textContent = antwort?.automatik === false
        ? 'Wir teilen jede Reservierung von Hand ein und melden uns kurz zurück.'
        : '';
      return;
    }

    const nachZeit = new Map(antwort.zeiten.map(entry => [entry.zeit, entry]));
    let freie = 0;
    for (const knopf of zeitKnoepfe()) {
      const eintrag = nachZeit.get(knopf.dataset.time);
      const voll = eintrag ? !eintrag.frei : false;
      knopf.disabled = voll;
      knopf.title = voll ? 'Um diese Zeit ist für diese Personenzahl nichts mehr frei' : '';
      if (voll) knopf.setAttribute('data-voll', '');
      else { knopf.removeAttribute('data-voll'); freie += 1; }
      // Eine bereits gewaehlte, nun volle Zeit wieder abwaehlen.
      if (voll && knopf.getAttribute('aria-checked') === 'true') {
        knopf.setAttribute('aria-checked', 'false');
        byId('time').value = '';
      }
    }
    byId('slotInfo').textContent = freie === 0
      ? `Für ${personen} ${personen === 1 ? 'Person' : 'Personen'} ist an diesem Tag mittags leider alles belegt. Ruf uns an, wir schauen was geht: +43 (0)5572 20 540`
      : `Grau hinterlegte Zeiten sind für ${personen} ${personen === 1 ? 'Person' : 'Personen'} schon belegt.`;
  }

  byId('day')?.addEventListener('change', zeigeVerfuegbarkeit);
  document.querySelector('#bookingForm')?.addEventListener('click', event => {
    // Personenzahl geaendert: die Verfuegbarkeit haengt daran.
    if (event.target.closest('[data-step]')) setTimeout(zeigeVerfuegbarkeit, 0);
  });
  if (byId('day')?.value) zeigeVerfuegbarkeit();

  knopf.addEventListener('click', async () => {
    const tag = byId('day')?.value;
    const zeit = byId('time')?.value;
    const erwachsene = Number(document.querySelector('[name="adults"]')?.value || 0);
    const kinder = Number(document.querySelector('[name="children"]')?.value || 0);
    const gaeste = erwachsene + kinder;
    const wer = name.value.trim();

    // Vor dem Netz pruefen, was man ohne Netz pruefen kann.
    if (!wer || wer.length < 2) return sag('Bitte den Namen eintragen, auf den der Tisch laufen soll.', 'fehler');
    if (!tag) return sag('Bitte einen Tag wählen.', 'fehler');
    if (!zeit) return sag('Bitte eine Uhrzeit wählen.', 'fehler');
    if (gaeste < 1) return sag('Bitte die Personenzahl angeben.', 'fehler');

    knopf.disabled = true;
    sag('Einen Moment, wir schauen nach einem Tisch …');
    const antwort = await buche({ name: wer, date: tag, time: zeit, guests: gaeste });
    knopf.disabled = false;

    if (!antwort?.ok) {
      const gruende = {
        name: 'Der Name ist zu kurz.',
        datum: 'Das Datum passt nicht.',
        uhrzeit: 'Die Uhrzeit passt nicht.',
        personen: 'Die Personenzahl passt nicht.',
        vergangen: 'Dieser Tag liegt in der Vergangenheit.',
        zu_weit: 'So weit im Voraus nehmen wir online noch keine Reservierung an.',
        zu_viele: 'Gerade kommen sehr viele Anfragen. Bitte ruf uns kurz an.',
        netz: 'Die Verbindung hat nicht geklappt. Bitte ruf uns kurz an: +43 (0)5572 20 540.',
        aus: 'Bitte ruf uns kurz an: +43 (0)5572 20 540.'
      };
      return sag(gruende[antwort?.grund] || 'Das hat nicht geklappt. Bitte ruf uns kurz an: +43 (0)5572 20 540.', 'fehler');
    }
    if (antwort.doppelt) {
      return sag(`Diese Reservierung haben wir schon – auf den Namen ${antwort.reservierung.name} um ${antwort.reservierung.time}. Bis dann!`, 'gut');
    }
    if (antwort.tisch) {
      zeigeVerfuegbarkeit();
      return sag(`Passt: ${wer}, ${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'} am ${tag} um ${zeit}. `
        + `Tisch ${antwort.tisch}${antwort.etage ? ` im Bereich ${antwort.etage}` : ''}. `
        + 'Wir sehen uns – ein Anruf ist nicht mehr nötig.', 'gut');
    }
    if (antwort.automatik === false) {
      zeigeVerfuegbarkeit();
      return sag(`Danke, ${wer}. Deine Anfrage für ${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'} am ${tag} `
        + `um ${zeit} ist da. Wir teilen den Tisch von Hand ein und melden uns kurz zurück.`, 'gut');
    }
    // Angenommen, aber kein Tisch: ehrlich sagen, dass sich jemand meldet.
    const alternativen = (antwort.alternativen || []).join(', ');
    return sag('Wir haben deine Anfrage aufgenommen, aber um diese Zeit ist es sehr voll. '
      + (alternativen ? `Freier wäre es um ${alternativen}. ` : '')
      + 'Bitte ruf uns kurz an, damit wir es sicher hinbekommen: +43 (0)5572 20 540.', 'warnung');
  });
}
