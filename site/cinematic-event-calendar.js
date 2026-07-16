(() => {
  'use strict';

  const events = [
    { id: 'genussroute-2026', start: '2026-09-03T18:00:00', end: '2026-09-04T01:00:00', title: 'Genussroute 6850', category: 'Genuss & Livemusik', note: '5 Gastgeber · 6 Livebands · 6 Speisegänge', url: 'https://wirtschaft-dornbirn.at/event/genussroute-2026/' },
    { id: 'comedynacht-05-2026', start: '2026-09-22T18:45:00', end: '2026-09-22T23:00:00', title: 'Helden reisen, Gäste speisen!', category: 'Dinner & Comedy', note: '4 Künstler · 4 Haltestellen', url: 'https://wirtschaft-dornbirn.at/event/comedynacht-05-2026/' },
    { id: 'comedynacht-06-2026', start: '2026-09-23T18:45:00', end: '2026-09-23T23:00:00', title: 'Helden reisen, Gäste speisen!', category: 'Dinner & Comedy', note: 'Zusatzabend · 4 Künstler', url: 'https://wirtschaft-dornbirn.at/event/comedynacht-06-2026/' },
    { id: 'dinner-comedy-04-2026', start: '2026-10-14T19:00:00', end: '2026-10-14T23:00:00', title: 'Dinner & Comedy', category: 'Comedy', note: 'Dinner: Warteliste · Comedy-Tickets verfügbar', url: 'https://wirtschaft-dornbirn.at/event/dinner-comedy-04-2026/' },
    { id: 'spoerk-2026', start: '2026-10-15T19:00:00', end: '2026-10-15T23:00:00', title: 'Christof Spörk', category: 'Dinner & Konzert', note: 'Programm: Maximo Lieder', url: 'https://wirtschaft-dornbirn.at/event/spoerk-2026/' },
    { id: 'neuschmid-voegel-02-2026', start: '2026-10-21T19:00:00', end: '2026-10-21T23:00:00', title: 'Maria Neuschmid & Stefan Vögel', category: 'Dinner & Kabarett', note: 'Schaffa, schaffa, Hüsle baua 3', url: 'https://wirtschaft-dornbirn.at/event/neuschmid-voegel-02-2026/' },
    { id: 'rock4-2026', start: '2026-10-22T19:00:00', end: '2026-10-22T23:00:00', title: 'Rock4 – A Cappella', category: 'Dinner & Konzert', note: 'Dinner: Warteliste · Konzert-Tickets verfügbar', url: 'https://wirtschaft-dornbirn.at/event/rock4-2026/' },
    { id: 'kellner-2026', start: '2026-10-27T19:00:00', end: '2026-10-27T23:00:00', title: 'Mathias Kellner', category: 'Dinner & Konzert', note: 'Bayrischer Liedermacher & Kabarettist', url: 'https://wirtschaft-dornbirn.at/event/kellner-2026/' },
    { id: 'dinner-comedy-05-2026', start: '2026-11-11T19:00:00', end: '2026-11-11T23:00:00', title: 'Dinner & Comedy', category: 'Comedy', note: '3 Comedians · ein Abend · eine Bühne', url: 'https://wirtschaft-dornbirn.at/event/dinner-comedy-05-2026/' },
    { id: 'philippsmusikzimmer-02-2026', start: '2026-11-18T19:00:00', end: '2026-11-18T23:00:00', title: "Philipp Lingg’s Musikzimmer", category: 'Dinner & Konzert', note: 'Das musikalische Blind Date', url: 'https://wirtschaft-dornbirn.at/event/philippsmusikzimmer-02-2026/' },
    { id: 'hanskaspasenkel-2026', start: '2026-11-19T19:00:00', end: '2026-11-19T23:00:00', title: 'Hanskaspas Enkel & George Nussbaumer', category: 'Dinner & Konzert', note: 'Eine Reise ins Glück', url: 'https://wirtschaft-dornbirn.at/event/hanskaspasenkel-2026/' },
    { id: 'notenlos-2026', start: '2026-11-24T19:00:00', end: '2026-11-24T23:00:00', title: 'Notenlos', category: 'Dinner & Konzert', note: 'Das Wunschkonzert der Extraklasse', url: 'https://wirtschaft-dornbirn.at/event/notenlos-2026/' },
    { id: 'krauthobel-2026', start: '2026-11-26T19:00:00', end: '2026-11-26T23:00:00', title: 'Krauthobel Anplakt', category: 'Dinner & Konzert', note: 'Akustik-Konzert in besonderer Atmosphäre', url: 'https://wirtschaft-dornbirn.at/event/krauthobel-2026/' },
    { id: 'rebeltell-2026', start: '2026-12-03T19:00:00', end: '2026-12-03T23:00:00', title: 'Rebel Tell', category: 'Dinner & Konzert', note: 'Rock’n’Roll trifft Schlager', url: 'https://wirtschaft-dornbirn.at/event/rebeltell-2026/' },
    { id: 'themonroes-2026', start: '2026-12-10T19:00:00', end: '2026-12-10T23:00:00', title: 'The Monroes', category: 'Dinner & Konzert', note: 'Rock’n’Roll live', url: 'https://wirtschaft-dornbirn.at/event/themonroes-2026/' },
    { id: 'dinner-comedy-06-2026', start: '2026-12-15T19:00:00', end: '2026-12-15T23:00:00', title: 'Dinner & Comedy', category: 'Comedy', note: '3 Comedians · ein Abend · eine Bühne', url: 'https://wirtschaft-dornbirn.at/event/dinner-comedy-06-2026/' },
    { id: 'dinner-comedy-07-2026', start: '2026-12-16T19:00:00', end: '2026-12-16T23:00:00', title: 'Dinner & Comedy', category: 'Comedy', note: 'Zusatzabend · 3 Comedians', url: 'https://wirtschaft-dornbirn.at/event/dinner-comedy-07-2026/' }
  ];

  const grid = document.getElementById('eventCalendarGrid');
  const feedback = document.getElementById('calendarFeedback');
  if (!grid) return;

  const monthNames = new Intl.DateTimeFormat('de-AT', { month: 'long' });
  const dayNames = new Intl.DateTimeFormat('de-AT', { weekday: 'short' });
  const pad = value => String(value).padStart(2, '0');
  const localDate = value => new Date(value);
  const monthKey = value => value.slice(0, 7);
  const create = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  function renderCard(item) {
    const start = localDate(item.start);
    const card = create('article', 'event-calendar-card');
    card.dataset.eventCategory = item.category.toLowerCase();
    card.dataset.eventId = item.id;
    const date = create('time', 'event-calendar-date');
    date.dateTime = item.start;
    date.append(
      create('b', '', pad(start.getDate())),
      create('span', '', monthNames.format(start).slice(0, 3)),
      create('small', '', `${dayNames.format(start)} · ${pad(start.getHours())}:${pad(start.getMinutes())}`)
    );

    const copy = create('div', 'event-calendar-copy');
    copy.append(create('span', '', item.category), create('h3', '', item.title), create('p', '', item.note));

    const actions = create('div', 'event-calendar-actions');
    const calendar = create('button', 'event-calendar-button', 'Kalender ＋');
    calendar.type = 'button';
    calendar.addEventListener('click', () => downloadCalendar([item], `${item.id}.ics`));
    const tickets = create('a', 'event-ticket-link', 'Ticket sichern ↗︎');
    tickets.href = item.url;
    tickets.target = '_blank';
    tickets.rel = 'noopener noreferrer';
    tickets.setAttribute('aria-label', `Tickets und Informationen für ${item.title}`);
    actions.append(calendar, tickets);
    card.append(date, copy, actions);
    return card;
  }

  const grouped = events.reduce((months, item) => {
    const key = monthKey(item.start);
    if (!months.has(key)) months.set(key, []);
    months.get(key).push(item);
    return months;
  }, new Map());
  grouped.forEach((items, key) => {
    const start = localDate(`${key}-01T12:00:00`);
    const section = create('section', 'event-month');
    section.dataset.eventMonth = key;
    const heading = create('h3', 'event-month-heading', monthNames.format(start));
    heading.append(create('span', '', `${items.length} ${items.length === 1 ? 'Termin' : 'Termine'}`));
    const list = create('div', 'event-month-list');
    items.forEach(item => list.append(renderCard(item)));
    section.append(heading, list);
    grid.append(section);
  });

  const count = document.getElementById('visibleEventCount');
  const filterButtons = Array.from(document.querySelectorAll('[data-event-filter]'));
  const matchesFilter = (category, filter) => {
    if (filter === 'all') return true;
    if (filter === 'concert') return category.includes('konzert');
    if (filter === 'comedy') return category.includes('comedy') || category.includes('kabarett');
    if (filter === 'genuss') return category.includes('genuss');
    return true;
  };

  function applyFilter(filter) {
    let visible = 0;
    grid.querySelectorAll('.event-calendar-card').forEach(card => {
      const show = matchesFilter(card.dataset.eventCategory || '', filter);
      card.hidden = !show;
      if (show) visible += 1;
    });
    grid.querySelectorAll('.event-month').forEach(section => {
      const visibleCards = Array.from(section.querySelectorAll('.event-calendar-card')).filter(card => !card.hidden);
      section.hidden = visibleCards.length === 0;
      const label = section.querySelector('.event-month-heading span');
      if (label) label.textContent = `${visibleCards.length} ${visibleCards.length === 1 ? 'Termin' : 'Termine'}`;
    });
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.eventFilter === filter)));
    if (count) count.textContent = `${visible} ${visible === 1 ? 'Veranstaltung' : 'Veranstaltungen'}`;
    if (feedback) feedback.textContent = filter === 'all' ? 'Alle Termine werden angezeigt.' : `${visible} passende Termine werden angezeigt.`;
  }

  filterButtons.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.eventFilter || 'all')));

  function escapeIcs(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function icsDate(value) {
    return value.replace(/[-:]/g, '').replace('T', 'T').slice(0, 15);
  }

  function buildCalendar(items) {
    const timezone = [
      'BEGIN:VTIMEZONE', 'TZID:Europe/Vienna', 'X-LIC-LOCATION:Europe/Vienna',
      'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
      'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD', 'END:VTIMEZONE'
    ];
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const entries = items.flatMap(item => [
      'BEGIN:VEVENT',
      `UID:${item.id}@wirtschaft-dornbirn.at`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=Europe/Vienna:${icsDate(item.start)}`,
      `DTEND;TZID=Europe/Vienna:${icsDate(item.end)}`,
      `SUMMARY:${escapeIcs(item.title)} – Wirtschaft Dornbirn`,
      `DESCRIPTION:${escapeIcs(`${item.category}. ${item.note}. Tickets & Infos: ${item.url}`)}`,
      'LOCATION:Wirtschaft Dornbirn\, Bahnhofstraße 24\, 6850 Dornbirn',
      `URL:${item.url}`,
      'END:VEVENT'
    ]);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Wirtschaft Dornbirn//Herbstprogramm 2026//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...timezone, ...entries, 'END:VCALENDAR', ''].join('\r\n');
  }

  function downloadCalendar(items, filename) {
    const blob = new Blob([buildCalendar(items)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    if (feedback) feedback.textContent = items.length > 1 ? 'Alle 17 Termine wurden als Kalenderdatei vorbereitet.' : `${items[0].title} wurde als Kalenderdatei vorbereitet.`;
  }

  document.querySelectorAll('.js-calendar-all').forEach(button => button.addEventListener('click', () => downloadCalendar(events, 'wirtschaft-dornbirn-herbstprogramm-2026.ics')));
})();
