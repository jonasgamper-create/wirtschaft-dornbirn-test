(() => {
  'use strict';

  const grid = document.getElementById('eventsGrid');
  if (!grid) return;

  const FALLBACK_BILDER = ['assets/abend-01.webp', 'assets/abend-02.webp', 'assets/abend-03.webp', 'assets/abend-04.webp'];
  let vorhandeneBilder = new Set();
  let alleEvents = [];
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

  /**
   * Eine Kachel - fuer beide Haeuser dieselbe Form.
   *
   * Die Daten kommen vom Ticketdienst: Name, Untertitel, Tag und Uhrzeit,
   * Ort, Bild und ob noch gekauft werden kann. Preise kennt er nicht; wo
   * wir eigene haben (data/events.json), stehen sie darunter, sonst nicht.
   * Geraten wird nichts.
   *
   * Der Ort entscheidet ueber die Farbe: die Abende im Kulturhaus sind
   * beige, die im eigenen Haus dunkel (Jonas, 11.09.). Eine Liste, zwei
   * Haeuser, ein Blick.
   */
  function kachel(termin, index) {
    const datum = new Date(`${termin.date}T12:00:00`);
    const tag = termin.date.slice(8, 10);
    const monat = MONATE.format(datum).replace('.', '');
    const wochentag = new Intl.DateTimeFormat('de-AT', { weekday: 'long' }).format(datum);
    const fallback = FALLBACK_BILDER[index % FALLBACK_BILDER.length];
    const bild = termin.bild || fallback;
    const video = vorhandeneVideos.has(termin.id) ? `assets/events/${encodeURIComponent(termin.id)}.mp4` : '';
    const imKulturhaus = termin.haus === 'kulturhaus';

    const zeilen = (termin.tickets || []).map(t => `
      <li data-status="${escapeHtml(t.status || '')}">
        <span class="tz-name">${escapeHtml(t.name)}</span>
        <span class="tz-detail">${escapeHtml(t.beginn)} Uhr · ${escapeHtml(preis(t.preis))} · ${escapeHtml(statusWort(t.status))}</span>
      </li>`).join('');
    const ausverkauft = termin.buchbar === false
      || ((termin.tickets || []).length > 0 && (termin.tickets || []).every(t => t.status === 'ausverkauft'));

    // Zweite Zeile: wann und wo. Beim Kulturhaus gehoert der Ort dazu, im
    // eigenen Haus waere er Fuellsel - der Gast steht ja schon davor.
    const zweite = [
      wochentag,
      termin.zeit ? `${termin.zeit} Uhr` : '',
      imKulturhaus ? 'kulturhaus dornbirn' : '',
      termin.untertitel
    ].filter(Boolean).join(' · ');

    return `
    <article class="event-kachel" data-haus="${escapeHtml(termin.haus || 'wirtschaft')}" data-status="${ausverkauft ? 'sold_out' : 'buchbar'}">
      <div class="kachel-medien">
        <img src="${escapeHtml(bild)}" width="1200" height="750" loading="lazy" decoding="async"
             alt="${escapeHtml(termin.title)}" data-fallback="${fallback}">
        ${imKulturhaus ? '<span class="kachel-ort">kulturhaus</span>' : ''}
        ${video ? `<video preload="metadata" playsinline muted hidden src="${video}"></video>
        <button class="kachel-hoerprobe" type="button">Hörprobe ▶</button>` : ''}
      </div>
      <div class="kachel-inhalt">
        <div class="kachel-zeile">
          <time datetime="${escapeHtml(termin.date)}"><b>${escapeHtml(tag)}</b><span>${escapeHtml(monat)}</span></time>
          <h2>${escapeHtml(termin.title)}</h2>
        </div>
        <p class="kachel-typ">${escapeHtml(zweite)}</p>
        ${zeilen ? `<ul class="ticketzeilen">${zeilen}</ul>` : ''}
        <div class="kachel-aktionen">
          ${ausverkauft
            /* Kein Link auf einer ausverkauften Kachel: der Shop zeigt dort
               den naechsten Termin, und der Gast landete beim falschen. */
            ? '<span class="button light kachel-ausverkauft" aria-disabled="true">Ausverkauft</span>'
            : `<button class="button light" type="button" data-buchen="${escapeHtml(termin.ticketUrl)}" data-titel="${escapeHtml(termin.title)}">Tickets buchen</button>`}
          <button class="button ghost kachel-kalender" type="button" data-kalender="${escapeHtml(termin.id)}" aria-label="${escapeHtml(termin.title)} in den Kalender eintragen">+ Kalender</button>
        </div>
      </div>
    </article>`;
  }

  /**
   * Die Termine beider Haeuser: zuerst beim Dienst, der sie selbst beim
   * Ticketdienst liest und zwoelf Stunden haelt. Antwortet er nicht, gilt
   * der Stand, der bei uns liegt - lieber ein Programm von gestern als eine
   * leere Seite. Der Browser des Gastes fragt nie beim Ticketdienst an;
   * auch die Bilder liegen bei uns.
   */
  async function holeTermine() {
    const ausDatei = () => fetch('data/termine.json', { cache: 'no-store' })
      .then(a => a.json()).then(d => d?.termine || []).catch(() => []);
    const hinterlegt = await ausDatei();
    const bilder = new Map(hinterlegt.filter(t => t.bild).map(t => [t.id, t.bild]));
    try {
      const haus = await fetch('data/haus.json?t=' + Date.now(), { cache: 'no-store' }).then(a => a.json());
      const basis = String(haus?.api || '').trim().replace(/\/+$/, '');
      if (!/^https?:\/\//.test(basis)) return hinterlegt;
      const antwort = await fetch(`${basis}/api/termine`, { cache: 'no-store' }).then(a => a.json());
      const liste = antwort?.ok ? (antwort.termine || []) : [];
      if (!liste.length) return hinterlegt;
      return liste.map(termin => ({ ...termin, bild: bilder.get(termin.id) || '' }));
    } catch {
      return hinterlegt;
    }
  }

  /** Kennung beim Ticketdienst aus einem Ticketweg: .../events/<kennung>. */
  const kennungAus = adresse => (String(adresse || '').match(/\/events\/([a-z0-9-]+)/) || [])[1] || '';

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

  // Ein Termin als Kalenderdatei, mit echter Uhrzeit: der Abend beginnt zur
  // ersten Ticketzeit und endet um 23 Uhr - dieselbe Form wie die grosse
  // Datei wirtschaft-events.ics, damit beide Wege im Kalender gleich aussehen.
  function terminAlsIcs(event) {
    // Die Uhrzeit kommt jetzt vom Ticketdienst und stimmt damit auch fuer
    // die Abende im Kulturhaus. Die Ticketzeile bleibt als Rueckfall.
    const beginn = (event.zeit || event.tickets?.[0]?.beginn || '19:00').padStart(5, '0');
    const d = event.date.replaceAll('-', '');
    const stempel = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const schuetze = wert => String(wert).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'PRODID:-//Wirtschaft Dornbirn//Veranstaltungen//DE',
      'BEGIN:VEVENT',
      `UID:${event.id}@wirtschaft-dornbirn.at`,
      `DTSTAMP:${stempel}`,
      `DTSTART;TZID=Europe/Vienna:${d}T${beginn.replace(':', '')}00`,
      `DTEND;TZID=Europe/Vienna:${d}T230000`,
      `SUMMARY:${schuetze(event.title)}`,
      `DESCRIPTION:${schuetze([event.untertitel, 'Tickets: ticketist.io'].filter(Boolean).join('. '))}`,
      // Der Ort kommt vom Ticketdienst: die Abende im Kulturhaus stehen
      // sonst mit unserer Adresse im Kalender des Gastes.
      `LOCATION:${schuetze(event.adresse ? `${event.ort}, ${event.adresse}` : 'Wirtschaft Dornbirn, Bahnhofstraße 24, 6850 Dornbirn')}`,
      'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
  }
  function ladeIcsHerunter(inhalt, dateiname) {
    const url = URL.createObjectURL(new Blob([inhalt], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = dateiname; a.hidden = true;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function verdrahte() {
    grid.querySelectorAll('[data-buchen]').forEach(knopf => {
      knopf.addEventListener('click', () => oeffneBuchung(knopf.dataset.buchen, knopf.dataset.titel));
    });
    grid.querySelectorAll('[data-kalender]').forEach(knopf => {
      knopf.addEventListener('click', () => {
        const event = alleEvents.find(e => e.id === knopf.dataset.kalender);
        if (event) ladeIcsHerunter(terminAlsIcs(event), `${event.id}.ics`);
      });
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
    // Unsere eigene Liste: sie bringt die Preise mit, die der Ticketdienst
    // nicht herausgibt. Alles andere kommt von dort.
    fetch('data/events.json', { cache: 'no-store' }).then(antwort => antwort.json()).catch(() => ({ events: [] })),
    fetch('data/event-medien.json', { cache: 'no-store' }).then(antwort => antwort.json()).catch(() => ({ bilder: [], videos: [] })),
    holeTermine()
  ])
    .then(([daten, medien, termine]) => {
      vorhandeneBilder = new Set(medien?.bilder || []);
      vorhandeneVideos = new Set(medien?.videos || []);
      const heute = new Date();
      heute.setHours(0, 0, 0, 0);

      // Preise und Ticketzeilen aus der eigenen Liste, zugeordnet ueber die
      // Kennung beim Ticketdienst - dieselbe, unter der dort verkauft wird.
      const preise = new Map();
      for (const event of daten?.events || []) {
        const kennung = kennungAus(event.ticketUrl);
        if (kennung && (event.tickets || []).length) preise.set(kennung, event.tickets);
      }

      const kommende = (termine || [])
        .filter(termin => termin.date && new Date(`${termin.date}T23:59:00`) >= heute)
        .map(termin => ({ ...termin, tickets: preise.get(termin.id) || [] }))
        .sort((a, b) => a.date.localeCompare(b.date) || String(a.zeit).localeCompare(String(b.zeit)));

      if (!kommende.length) {
        grid.innerHTML = '<p class="events-laden">Gerade steht kein Termin fest – schau bald wieder vorbei oder trag dich unten ein.</p>';
        return;
      }

      alleEvents = kommende;
      grid.innerHTML = kommende.map((termin, index) => kachel(termin, index)).join('');
      const legende = document.getElementById('eventsLegende');
      if (legende) legende.hidden = !kommende.some(t => t.haus === 'kulturhaus');
      verdrahte();
    })
    .catch(() => {
      grid.innerHTML = '<p class="events-laden">Die Termine konnten gerade nicht geladen werden. '
        + 'Ruf uns an, wir sagen dir, was ansteht: <a href="tel:+43557220540">+43 (0)5572 20 540</a></p>';
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
