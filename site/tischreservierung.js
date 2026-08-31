(() => {
  'use strict';

  // Personenzahl als Schrittwahl mit Tippfeld: die Knoepfe fuer den Daumen,
  // das Feld fuer die Zwoelfergruppe - zwoelfmal Plus ist kein Bedienweg.
  document.querySelectorAll('[data-stepper]').forEach(box => {
    const min = Number(box.dataset.min);
    const max = Number(box.dataset.max);
    const field = box.querySelector('input');
    const einheit = box.querySelector('[data-einheit]');
    let value = Number(box.dataset.value);
    const paint = () => {
      field.value = String(value);
      if (einheit) einheit.textContent = value === 1 ? 'Person' : 'Personen';
      box.querySelector('[data-step="-1"]').disabled = value <= min;
      box.querySelector('[data-step="1"]').disabled = value >= max;
    };
    box.addEventListener('click', event => {
      const step = event.target.closest('[data-step]');
      if (!step) return;
      value = Math.min(max, Math.max(min, value + Number(step.dataset.step)));
      paint();
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    // Getippt: waehrend der Eingabe nichts ueberschreiben, erst beim Verlassen
    // in die Grenzen holen. Wer "15" tippt, darf nicht nach der "1" gestoppt
    // werden.
    field.addEventListener('input', () => {
      const getippt = Math.trunc(Number(field.value));
      if (Number.isFinite(getippt) && getippt >= min && getippt <= max) {
        value = getippt;
        if (einheit) einheit.textContent = value === 1 ? 'Person' : 'Personen';
        box.querySelector('[data-step="-1"]').disabled = value <= min;
        box.querySelector('[data-step="1"]').disabled = value >= max;
      }
    });
    field.addEventListener('blur', () => {
      const getippt = Math.trunc(Number(field.value));
      value = Number.isFinite(getippt) && getippt >= min
        ? Math.min(max, getippt)
        : value;
      paint();
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    paint();
  });

  // Uhrzeit als Tippfelder statt Zeitrad.
  const timeField = document.getElementById('time');
  document.getElementById('timeSlots')?.addEventListener('click', event => {
    const button = event.target.closest('[data-time]');
    if (!button) return;
    button.parentElement.querySelectorAll('[data-time]').forEach(other => other.setAttribute('aria-checked', String(other === button)));
    timeField.value = button.dataset.time;
    timeField.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const form = document.getElementById('bookingForm');
  const submit = document.getElementById('submitBooking');
  const alertBox = document.getElementById('formAlert');
  const day = document.getElementById('day');
  const iso = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (day) day.min = iso(new Date());

  // Ein Griff aufs Feld oeffnet den Kalender - nicht nur das kleine Symbol
  // rechts. Am Handy ist dieses Symbol ein Ziel von wenigen Millimetern; wer
  // danebentippt, steht vor einem Feld, in das er von Hand ein Datum tippen
  // soll. showPicker() gibt es nicht ueberall und wirft ausserhalb einer
  // echten Geste - dann bleibt es beim gewohnten Verhalten.
  if (day && typeof day.showPicker === 'function') {
    const oeffne = event => {
      // Der Klick aufs eigene Symbol oeffnet den Kalender schon selbst; ein
      // zweiter Aufruf wuerde ihn im selben Moment wieder zuklappen.
      if (event.type === 'click' && event.offsetX > day.clientWidth - 40) return;
      try { day.showPicker(); } catch { /* keine Geste oder nicht unterstuetzt */ }
    };
    day.addEventListener('click', oeffne);
    // Auch bei Tastaturbedienung: wer mit Tab hierher springt, bekommt
    // denselben Kalender statt einer stillen Eingabezeile.
    day.addEventListener('focus', () => {
      try { day.showPicker(); } catch { /* Fokus ohne Geste - dann eben nicht */ }
    });
  }

  const nameOf = { day: 'Tag', time: 'Uhrzeit' };

  function markField(field, show) {
    const label = field.closest('label');
    if (!label) return;
    label.classList.toggle('invalid', show);
    let message = label.querySelector('.field-error');
    if (show) {
      if (!message) {
        message = document.createElement('p');
        message.className = 'field-error';
        label.appendChild(message);
      }
      message.textContent = `${nameOf[field.name] || 'Angabe'} fehlt noch.`;
    } else if (message) {
      message.remove();
    }
  }

  timeField?.addEventListener('input', () => markField(timeField, false));

  // Hinweise erst nach dem Verlassen eines Felds, nicht beim Tippen.
  form?.querySelectorAll('input').forEach(field => {
    field.addEventListener('blur', () => { if (field.required) markField(field, !field.checkValidity()); });
    field.addEventListener('input', () => { if (field.checkValidity()) markField(field, false); });
  });

  // Der Knopf bleibt bedienbar: fehlt etwas, sagt er was und springt hin.
  submit?.addEventListener('click', event => {
    const missing = [...form.querySelectorAll('input')]
      .filter(field => field.required && (field.type === 'hidden' ? !field.value : !field.checkValidity()));
    if (!missing.length) { alertBox.hidden = true; return; }
    event.preventDefault();
    missing.forEach(field => markField(field, true));
    const names = missing.map(field => nameOf[field.name] || field.name);
    alertBox.hidden = false;
    alertBox.textContent = names.length === 1 ? `Es fehlt noch: ${names[0]}.` : `Es fehlen noch: ${names.join(', ')}.`;
    const first = missing[0];
    const target = first.type === 'hidden' ? first.closest('label').querySelector('button') : first;
    target.focus({ preventScroll: true });
    const box = target.getBoundingClientRect();
    scrollTo({ top: scrollY + box.top - window.innerHeight * 0.35, behavior: 'smooth' });
  });

  // Mittagskarte und Status aus derselben Quelle wie die Startseite.
  const lunchWeb = document.querySelector('[data-lunch-web]');
  const lunchPdf = document.querySelector('[data-lunch-pdf]');
  const statusName = document.querySelector('[data-status-name]');
  const statusDetail = document.querySelector('[data-status-detail]');
  const dayName = date => new Intl.DateTimeFormat('de-AT', { weekday: 'long' }).format(new Date(`${date}T12:00:00`));
  const dateLong = date => new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`));

  fetch('data/lunch-menu.json', { cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
    .then(data => {
      if (lunchPdf && data.card?.file) lunchPdf.href = data.card.file;
      lunchPdf?.toggleAttribute('hidden', !data.card?.file);

      const pause = data.pause || {};
      const paused = data.status === 'pause';
      if (paused && pause.reopen && day) day.min = pause.reopen;

      if (statusName && statusDetail) {
        const [openAt, closeAt] = data.serviceHours || ['11:30', '13:30'];
        const toMinutes = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const weekday = now.getDay() >= 1 && now.getDay() <= 5;
        let name = 'Geöffnet';
        let detail = `Mittag · ${openAt}–${closeAt}`;
        if (paused) {
          name = pause.label || 'Sommerpause';
          detail = pause.reopen ? `Ab ${dateLong(pause.reopen)} wieder geöffnet` : 'Zurzeit geschlossen';
        } else if (!weekday) {
          name = 'Am Wochenende';
          detail = 'Kein Mittagstisch · abends nur Events';
        } else if (minutes < toMinutes(openAt)) {
          name = 'Heute geöffnet';
          detail = `Küche ab ${openAt} Uhr`;
        } else if (minutes <= toMinutes(closeAt)) {
          name = 'Jetzt geöffnet';
          detail = `Küche bis ${closeAt} Uhr`;
        } else {
          name = 'Für heute vorbei';
          detail = `Morgen wieder ab ${openAt} Uhr`;
        }
        statusName.textContent = name;
        statusDetail.textContent = detail;
      }

    })
    .catch(() => {});

  // Die Wochenkarte: dieselbe Datei, die Startseite, Bestellseite und
  // Druckansicht zeigen. Ohne Preise - die stehen dort, wo bestellt wird.
  if (lunchWeb) {
    fetch('data/takeaway-karte.json', { cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then(data => {
        const gruppe = (Array.isArray(data.gruppen) ? data.gruppen : [])
          .find(g => (g.gerichte || []).length);
        lunchWeb.innerHTML = '';
        if (!gruppe) {
          const note = document.createElement('p');
          note.className = 'menu-card-note';
          note.textContent = 'Die Karte für diese Woche ist noch nicht eingetragen. Ruf uns kurz an, dann sagen wir dir, was es gibt.';
          lunchWeb.appendChild(note);
          return;
        }
        const kopf = document.createElement('b');
        kopf.className = 'menu-card-gruppe';
        kopf.textContent = gruppe.titel + (gruppe.fenster ? ' · ' + gruppe.fenster : '');
        lunchWeb.appendChild(kopf);
        gruppe.gerichte.forEach(gericht => {
          const row = document.createElement('div');
          row.className = 'menu-day';
          const name = document.createElement('span');
          name.textContent = gericht.name;
          row.appendChild(name);
          if (gericht.beilage) {
            const bei = document.createElement('small');
            bei.textContent = gericht.beilage;
            row.appendChild(bei);
          }
          lunchWeb.appendChild(row);
        });
      })
      .catch(() => {});
  }
})();
