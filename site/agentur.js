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

  form.addEventListener('submit', async event => {
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
    // Zuerst an den eigenen Dienst (automatische Bestaetigung an den Gast);
    // nur ohne Antwort oeffnet sich das Mailprogramm.
    const knopf = form.querySelector('button[type="submit"]');
    if (knopf) knopf.disabled = true;
    status.textContent = 'Einen Moment, die Anfrage wird gesendet …';
    const antwort = qaMode ? { ok: false } : await (window.wirtschaftAnfrage?.({
      art: 'agentur', betreff: `${anlass.value} · ${feld('agDatum').value.trim()}`,
      name: feld('agName').value.trim(), email: feld('agMail').value.trim(), telefon: feld('agTel').value.trim(),
      zeilen: zeilen.map(z => z.trim()).filter(z => z && !/^(Name|E-Mail|Telefon):/.test(z)), einwilligung: true,
      website: form.querySelector('[name="website"]')?.value || ''
    }) || { ok: false });
    if (knopf) knopf.disabled = false;
    if (antwort?.ok) {
      const an = feld('agMail').value.trim();
      form.reset();
      status.textContent = `Danke! Eure Anfrage ist bei uns angekommen. Ihr bekommt gleich eine Bestätigung an ${an} – wir melden uns persönlich.`;
      return;
    }
    status.textContent = 'Das Mailprogramm öffnet sich mit der fertigen Anfrage – einfach absenden.';
    if (!qaMode) window.location.href = mailto;
  });
})();
