(() => {
  'use strict';

  const form = document.getElementById('agenturForm');
  if (!form) return;

  const anlass = document.getElementById('agAnlass');
  const richtung = document.getElementById('agRichtung');
  const status = document.getElementById('agStatus');
  const qaMode = new URLSearchParams(window.location.search).get('qa') === '1';

  // Die Kartenknoepfe oben waehlen die Richtung vor und springen zum Formular -
  // derselbe Handgriff wie bei den Festen.
  document.querySelectorAll('[data-richtung]').forEach(button => {
    button.addEventListener('click', () => {
      if ([...richtung.options].some(option => option.value === button.dataset.richtung || option.text === button.dataset.richtung)) {
        richtung.value = button.dataset.richtung;
      }
      document.getElementById('anfrage').scrollIntoView({ behavior: 'smooth' });
      anlass.focus({ preventScroll: true });
    });
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const feld = id => document.getElementById(id);
    const pflicht = [anlass, feld('agDatum'), feld('agName'), feld('agMail')];
    const fehlt = pflicht.find(el => !el.value.trim());
    if (fehlt || !feld('agConsent').checked) {
      status.textContent = fehlt
        ? 'Bitte Anlass, Datum, Name und E-Mail ausfüllen – mehr braucht es nicht.'
        : 'Bitte der Verwendung der Angaben zustimmen, sonst dürfen wir nicht antworten.';
      (fehlt || feld('agConsent')).focus();
      return;
    }
    const zeilen = [
      `Anlass: ${anlass.value}`,
      `Richtung: ${richtung.value}`,
      `Datum: ${feld('agDatum').value.trim()}`,
      feld('agOrt').value.trim() ? `Ort: ${feld('agOrt').value.trim()}` : '',
      feld('agGaeste').value ? `Gästezahl: ${feld('agGaeste').value}` : '',
      `Name: ${feld('agName').value.trim()}`,
      `E-Mail: ${feld('agMail').value.trim()}`,
      feld('agTel').value.trim() ? `Telefon: ${feld('agTel').value.trim()}` : '',
      feld('agNachricht').value.trim() ? `\n${feld('agNachricht').value.trim()}` : ''
    ].filter(Boolean);
    const mailto = `mailto:willkommen@wirtschaft-dornbirn.at?subject=${encodeURIComponent(`Künstler-Anfrage · ${anlass.value} · ${feld('agDatum').value.trim()}`)}&body=${encodeURIComponent(zeilen.join('\n'))}`;
    window.__LAST_INQUIRY_MAILTO__ = mailto;
    status.textContent = 'Das Mailprogramm öffnet sich mit der fertigen Anfrage – einfach absenden.';
    if (!qaMode) window.location.href = mailto;
  });
})();
