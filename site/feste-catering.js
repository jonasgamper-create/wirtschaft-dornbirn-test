(() => {
  'use strict';
  window.__EVENT_PAGE_ERRORS__ = [];
  window.addEventListener('error', event => window.__EVENT_PAGE_ERRORS__.push(event.message || 'Unbekannter Fehler'));

  const form = document.getElementById('eventInquiryForm');
  const occasion = document.getElementById('occasion');
  const customOccasionWrap = document.getElementById('customOccasionWrap');
  const customOccasion = document.getElementById('customOccasion');
  const location = document.getElementById('location');
  const date = document.getElementById('eventDate');
  const dateExactWrap = document.getElementById('eventDateExactWrap');
  const dateFlexible = document.getElementById('eventDateFlexible');
  const dateTextWrap = document.getElementById('eventDateTextWrap');
  const dateText = document.getElementById('eventDateText');
  const guests = document.getElementById('guestCount');
  const name = document.getElementById('contactName');
  const email = document.getElementById('contactEmail');
  const consent = document.getElementById('inquiryConsent');
  const status = document.getElementById('inquiryStatus');
  const phone = document.getElementById('contactPhone');
  const style = document.getElementById('cateringStyle');
  const message = document.getElementById('eventMessage');

  const query = new URLSearchParams(window.location.search);
  const qaMode = query.get('qa') === '1';
  const requestedOccasion = query.get('occasion');
  const requestedLocation = query.get('location');
  const requestedMessage = query.get('message');
  if (requestedOccasion && [...occasion.options].some(option => option.value === requestedOccasion)) occasion.value = requestedOccasion;
  if (requestedLocation && [...location.options].some(option => option.value === requestedLocation)) location.value = requestedLocation;
  if (requestedMessage) document.getElementById('eventMessage').value = requestedMessage.slice(0, 240);

  const today = new Date();
  const todayValue = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  date.min = todayValue;
  date.value = todayValue;

  // Der flexible Wunschtermin ist optionales Markup; ohne die Felder
  // bleibt das exakte Datum einfach Pflicht.
  const flexibleDate = () => Boolean(dateFlexible && dateFlexible.checked);
  function syncDateMode() {
    if (!dateFlexible || !dateExactWrap || !dateTextWrap || !dateText) return;
    const flexible = dateFlexible.checked;
    dateExactWrap.hidden = flexible;
    dateTextWrap.hidden = !flexible;
    date.required = !flexible;
    dateText.required = flexible;
    if (!flexible) dateText.value = '';
  }
  dateFlexible?.addEventListener('change', syncDateMode);
  syncDateMode();

  function syncOccasionMode() {
    if (!customOccasionWrap || !customOccasion) return;
    const custom = occasion.value === 'Etwas anderes';
    customOccasionWrap.hidden = !custom;
    customOccasion.required = custom;
    if (!custom) customOccasion.value = '';
  }
  occasion.addEventListener('change', syncOccasionMode);
  syncOccasionMode();

  function chooseAndFocus(field, value) {
    field.value = value;
    document.getElementById('anfrage').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    window.setTimeout(() => field.focus(), 450);
  }

  document.querySelectorAll('[data-occasion]').forEach(button => button.addEventListener('click', () => chooseAndFocus(occasion, button.dataset.occasion)));
  document.querySelectorAll('[data-location]').forEach(button => button.addEventListener('click', () => chooseAndFocus(location, button.dataset.location)));

  form.addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = '';
    const required = [occasion, location, guests, name, email, flexibleDate() ? dateText : date];
    if (occasion.value === 'Etwas anderes' && customOccasion) required.push(customOccasion);
    const missing = required.find(field => !field.value.trim());
    if (missing) {
      status.textContent = 'Bitte die markierten Pflichtangaben ergänzen.';
      missing.focus();
      return;
    }
    if (!email.validity.valid) {
      status.textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      email.focus();
      return;
    }
    if (!consent.checked) {
      status.textContent = 'Bitte die Datenschutzerklärung zur Kenntnis nehmen.';
      consent.focus();
      return;
    }
    const formattedDate = flexibleDate() ? dateText.value.trim() : new Intl.DateTimeFormat('de-AT', { dateStyle: 'long' }).format(new Date(`${date.value}T12:00:00`));
    const occasionLabel = occasion.value === 'Etwas anderes' && customOccasion ? customOccasion.value.trim() : occasion.value;
    const body = [
      'Guten Tag liebes Team der Wirtschaft Dornbirn,', '',
      'ich möchte unverbindlich eine Veranstaltung anfragen:',
      `Anlass: ${occasionLabel}`, `Ort: ${location.value}`, `Wunschtermin: ${formattedDate}`, `Ungefähre Gästezahl: ${guests.value}`, `Kulinarische Richtung: ${style.value}`,
      `Name: ${name.value.trim()}`, `E-Mail: ${email.value.trim()}`, phone.value.trim() ? `Telefon: ${phone.value.trim()}` : '',
      message.value.trim() ? `Weitere Wünsche: ${message.value.trim()}` : '', '',
      'Bitte melden Sie sich für die persönliche Abstimmung bei mir.', '', 'Vielen Dank!'
    ].filter(Boolean).join('\n');
    const mailto = `mailto:willkommen@wirtschaft-dornbirn.at?subject=${encodeURIComponent(`Anfrage ${occasionLabel} · ${formattedDate}`)}&body=${encodeURIComponent(body)}`;
    window.__LAST_INQUIRY_MAILTO__ = mailto;
    status.textContent = `Die Anfrage für ${guests.value} Gäste am ${formattedDate} wurde im E-Mail-Programm vorbereitet. Bitte dort noch absenden.`;
    if (!qaMode) window.location.href = mailto;
  });
})();
