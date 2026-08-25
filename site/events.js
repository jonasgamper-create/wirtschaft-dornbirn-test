(() => {
  'use strict';

  const grid = document.getElementById('eventsGrid');
  if (!grid) return;

  const FALLBACK_BILDER = ['assets/abend-01.webp', 'assets/abend-02.webp', 'assets/abend-03.webp', 'assets/abend-04.webp'];
  let vorhandeneBilder = new Set();
  let vorhandeneVideos = new Set();
  const MONATE = new Intl.DateTimeFormat('de-AT', { month: 'short' });

  const escapeHtml = wert => String(wert).replace(/[&<>"']/g, zeichen => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[zeichen]
  ));

  const preis = wert => `€ ${String(wert).replace('.', ',')}`;

  const statusWort = status => ({
    buchbar: 'buchbar',
    ausverkauft: 'ausverkauft',
    warteliste: 'warteliste'
  })[status] || status;

  function kachel(event, index) {
    const datum = new Date(`${event.date}T12:00:00`);
    const tag = event.date.slice(8, 10);
    const monat = MONATE.format(datum).replace('.', '');
    const wochentag = new Intl.DateTimeFormat('de-AT', { weekday: 'long' }).format(datum);
    const fallback = FALLBACK_BILDER[index % FALLBACK_BILDER.length];
    const bild = vorhandeneBilder.has(event.id) ? `assets/events/${encodeURIComponent(event.id)}.webp` : fallback;
    const video = vorhandeneVideos.has(event.id) ? `assets/events/${encodeURIComponent(event.id)}.mp4` : '';
    const zeilen = (event.tickets || []).map(t => `
      <li data-status="${escapeHtml(t.status || '')}">
        <span class="tz-name">${escapeHtml(t.name)}</span>
        <span class="tz-detail">${escapeHtml(t.beginn)} Uhr · ${escapeHtml(preis(t.preis))} · ${escapeHtml(statusWort(t.status))}</span>
      </li>`).join('');
    const ausverkauft = (event.tickets || []).length > 0 && (event.tickets || []).every(t => t.status === 'ausverkauft');
    return `
    <article class="event-kachel" data-status="${ausverkauft ? 'sold_out' : escapeHtml(event.status)}">
      <div class="kachel-medien">
        <img src="${bild}" width="1200" height="750" loading="lazy" decoding="async"
             alt="${escapeHtml(event.title)}" data-fallback="${fallback}">
        ${video ? `<video preload="metadata" playsinline muted hidden src="${video}"></video>
        <button class="kachel-hoerprobe" type="button">Hörprobe ▶</button>` : ''}
      </div>
      <div class="kachel-inhalt">
        <div class="kachel-zeile">
          <time datetime="${escapeHtml(event.date)}"><b>${escapeHtml(tag)}</b><span>${escapeHtml(monat)}</span></time>
          <h2>${escapeHtml(event.title)}</h2>
        </div>
        <p class="kachel-typ">${escapeHtml(wochentag)} · ${escapeHtml(event.type)}</p>
        <ul class="ticketzeilen">${zeilen}</ul>
        <div class="kachel-aktionen">
          ${event.ticketUrl && !ausverkauft
            ? `<button class="button light" type="button" data-buchen="${escapeHtml(event.ticketUrl)}" data-titel="${escapeHtml(event.title)}">Tickets buchen</button>`
            : `<a class="button light" href="${escapeHtml(event.ticketUrl || event.officialUrl)}" target="_blank" rel="noopener noreferrer">${ausverkauft ? 'Ausverkauft · Details ↗' : 'Tickets ↗'}</a>`}
        </div>
      </div>
    </article>`;
  }

  // Buchung im Haus: der Klick oeffnet Ticketist als Overlay. Der Gast
  // bleibt auf unserer Seite; Buchung und Zahlung laufen beim Anbieter.
  const dialog = document.getElementById('ticketDialog');
  const frame = document.getElementById('ticketDialogFrame');
  const dialogTitel = document.getElementById('ticketDialogTitel');
  const dialogExtern = document.getElementById('ticketDialogExtern');
  function oeffneBuchung(url, titel) {
    if (!dialog || !frame) { window.open(url, '_blank', 'noopener'); return; }
    dialogTitel.textContent = titel;
    dialogExtern.href = url;
    frame.src = url;
    dialog.showModal();
  }
  if (dialog) {
    document.getElementById('ticketDialogZu').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { frame.src = 'about:blank'; });
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  }

  function verdrahte() {
    grid.querySelectorAll('[data-buchen]').forEach(knopf => {
      knopf.addEventListener('click', () => oeffneBuchung(knopf.dataset.buchen, knopf.dataset.titel));
    });
    // Bilder: fehlt das Eventbild, springt ein Abendfoto ein.
    grid.querySelectorAll('.kachel-medien img').forEach(img => {
      img.addEventListener('error', () => {
        if (img.src.endsWith(img.dataset.fallback)) return;
        img.src = img.dataset.fallback;
      }, { once: true });
    });
    // Hoerprobe: der Knopf erscheint nur, wenn das Video wirklich daliegt.
    grid.querySelectorAll('.kachel-medien').forEach(medien => {
      const video = medien.querySelector('video');
      const knopf = medien.querySelector('.kachel-hoerprobe');
      if (!video || !knopf) return;
      knopf.addEventListener('click', () => {
        if (video.hidden) {
          video.hidden = false;
          video.controls = true;
          video.muted = false;
          video.play().catch(() => {});
          knopf.textContent = 'Hörprobe schließen ×';
        } else {
          video.pause();
          video.hidden = true;
          knopf.textContent = 'Hörprobe ▶';
        }
      });
    });
  }

  Promise.all([
    fetch('data/events.json', { cache: 'no-store' }).then(antwort => antwort.json()),
    fetch('data/event-medien.json', { cache: 'no-store' }).then(antwort => antwort.json()).catch(() => ({ bilder: [], videos: [] }))
  ])
    .then(([daten, medien]) => {
      vorhandeneBilder = new Set(medien?.bilder || []);
      vorhandeneVideos = new Set(medien?.videos || []);
      const heute = new Date();
      heute.setHours(0, 0, 0, 0);
      const kommende = (daten?.events || [])
        .filter(event => event.status !== 'cancelled' && new Date(`${event.date}T23:59:00`) >= heute)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (!kommende.length) {
        grid.innerHTML = '<p class="events-laden">Gerade steht kein Termin fest – schau bald wieder vorbei oder trag dich unten ein.</p>';
        return;
      }
      grid.innerHTML = kommende.map((event, index) => kachel(event, index)).join('');
      verdrahte();
    })
    .catch(() => {
      grid.innerHTML = '<p class="events-laden">Die Termine konnten nicht geladen werden. Das offizielle Programm hilft weiter: <a href="https://wirtschaft-dornbirn.at/event/" target="_blank" rel="noopener noreferrer">wirtschaft-dornbirn.at/event ↗</a></p>';
    });

  // Termin-Abo: derselbe Weg wie auf der Startseite frueher - eigene Liste,
  // gueltig erst mit dem Klick in der Bestaetigungsmail.
  const form = document.getElementById('ticketNews');
  if (!form) return;
  const note = document.getElementById('ticketNewsNote');
  const knopf = form.querySelector('button');

  const dienst = (() => {
    let versprochen = null;
    return () => {
      versprochen ||= fetch('data/haus.json?t=' + Date.now(), { cache: 'no-store' })
        .then(antwort => antwort.json())
        .then(daten => {
          const adresse = String(daten?.api || '').trim().replace(/\/+$/, '');
          return /^https?:\/\//.test(adresse) ? adresse : '';
        })
        .catch(() => '');
      return versprochen;
    };
  })();

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const mail = form.email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
      note.textContent = 'Bitte eine gültige E-Mail-Adresse eingeben.';
      return;
    }
    const basis = await dienst();
    if (!basis) {
      note.textContent = 'Die Anmeldung ist gerade nicht möglich. Versuch es später noch einmal.';
      return;
    }
    knopf.disabled = true;
    note.textContent = 'Einen Moment …';
    try {
      const antwort = await fetch(basis + '/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: mail, quelle: 'events', liste: 'events', einwilligung: true })
      });
      const daten = await antwort.json().catch(() => ({}));
      if (daten?.schon) {
        note.textContent = 'Diese Adresse ist schon angemeldet – alles gut.';
      } else if (daten?.ok) {
        note.textContent = 'Fast geschafft: Wir haben dir eine Bestätigungsmail geschickt. Erst mit dem Klick darin bist du angemeldet.';
        form.email.value = '';
      } else {
        note.textContent = 'Das hat nicht geklappt. Versuch es später noch einmal.';
      }
    } catch {
      note.textContent = 'Das hat nicht geklappt. Versuch es später noch einmal.';
    }
    knopf.disabled = false;
  });
})();
