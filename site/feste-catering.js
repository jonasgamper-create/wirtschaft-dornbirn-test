(() => {
  'use strict';
  window.__EVENT_PAGE_ERRORS__ = [];
  window.addEventListener('error', event => window.__EVENT_PAGE_ERRORS__.push(event.message || 'Unbekannter Fehler'));

  const form = document.getElementById('eventInquiryForm');
  const occasion = document.getElementById('occasion');
  const location = document.getElementById('location');
  const date = document.getElementById('eventDate');
  const guests = document.getElementById('guestCount');
  const name = document.getElementById('contactName');
  const email = document.getElementById('contactEmail');
  const consent = document.getElementById('inquiryConsent');
  const status = document.getElementById('inquiryStatus');

  const query = new URLSearchParams(window.location.search);
  const requestedOccasion = query.get('occasion');
  const requestedLocation = query.get('location');
  const requestedMessage = query.get('message');
  if (requestedOccasion && [...occasion.options].some(option => option.value === requestedOccasion)) occasion.value = requestedOccasion;
  if (requestedLocation && [...location.options].some(option => option.value === requestedLocation)) location.value = requestedLocation;
  if (requestedMessage) document.getElementById('eventMessage').value = requestedMessage.slice(0, 240);

  const today = new Date();
  date.min = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];

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
    const required = [occasion, location, date, guests, name, email];
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
      status.textContent = 'Bitte den Kontakt-Hinweis bestätigen.';
      consent.focus();
      return;
    }
    const formattedDate = new Intl.DateTimeFormat('de-AT', { dateStyle: 'long' }).format(new Date(`${date.value}T12:00:00`));
    status.textContent = `Anfrage ist vollständig: ${occasion.value}, ${location.value}, ${guests.value} Gäste am ${formattedDate}. In dieser Demo wurde noch nichts versendet.`;
  });
})();
