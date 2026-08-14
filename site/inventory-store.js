(() => {
  'use strict';

  const STORAGE_KEY = 'wirtschaft-dornbirn-host-control-v1';
  let memoryState = null;

  const localDate = (offset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  };

  const makeDefaults = () => ({
    version: 1,
    settings: {
      bufferEnabled: true,
      bufferPercent: 20,
      lunchDefaultCapacity: 48,
      dinnerDefaultCapacity: 72
    },
    services: [
      { id: `${localDate(0)}-1130`, date: localDate(0), time: '11:30', kind: 'Mittag', capacity: 48, reserved: 31, tables: { 2: 8, 4: 6, 6: 2, 8: 1 } },
      { id: `${localDate(0)}-1200`, date: localDate(0), time: '12:00', kind: 'Mittag', capacity: 48, reserved: 38, tables: { 2: 8, 4: 6, 6: 2, 8: 1 } },
      { id: `${localDate(0)}-1230`, date: localDate(0), time: '12:30', kind: 'Mittag', capacity: 48, reserved: 24, tables: { 2: 8, 4: 6, 6: 2, 8: 1 } },
      { id: `${localDate(0)}-1800`, date: localDate(0), time: '18:00', kind: 'Abend', capacity: 72, reserved: 39, tables: { 2: 10, 4: 8, 6: 3, 8: 2 } },
      { id: `${localDate(0)}-1930`, date: localDate(0), time: '19:30', kind: 'Abend', capacity: 72, reserved: 52, tables: { 2: 10, 4: 8, 6: 3, 8: 2 } },
      { id: `${localDate(1)}-1200`, date: localDate(1), time: '12:00', kind: 'Mittag', capacity: 48, reserved: 18, tables: { 2: 8, 4: 6, 6: 2, 8: 1 } },
      { id: `${localDate(1)}-1930`, date: localDate(1), time: '19:30', kind: 'Abend', capacity: 72, reserved: 45, tables: { 2: 10, 4: 8, 6: 3, 8: 2 } }
    ],
    events: [
      { id: 'event-2026-09-03', date: '2026-09-03', name: 'Genussroute 6850', format: 'Dinner & Genuss', capacity: 120, sold: 76, ticketTypes: [{ name: 'Show only', sold: 26 }, { name: 'Dinner + Show', sold: 38 }, { name: 'Genussloge', sold: 12 }] },
      { id: 'event-2026-09-22', date: '2026-09-22', name: 'Helden reisen, Gäste speisen!', format: 'Dinner & Bühne', capacity: 96, sold: 64, ticketTypes: [{ name: 'Show only', sold: 18 }, { name: 'Dinner + Show', sold: 37 }, { name: 'Genussloge', sold: 9 }] },
      { id: 'event-2026-09-23', date: '2026-09-23', name: 'Helden reisen · Zusatzabend', format: 'Dinner & Bühne', capacity: 96, sold: 41, ticketTypes: [{ name: 'Show only', sold: 13 }, { name: 'Dinner + Show', sold: 23 }, { name: 'Genussloge', sold: 5 }] },
      { id: 'event-2026-10-14', date: '2026-10-14', name: 'Dinner & Comedy', format: 'Comedy', capacity: 110, sold: 82, ticketTypes: [{ name: 'Show only', sold: 36 }, { name: 'Dinner + Show', sold: 39 }, { name: 'Genussloge', sold: 7 }] },
      { id: 'event-2026-10-15', date: '2026-10-15', name: 'Christof Spörk', format: 'Kabarett', capacity: 110, sold: 57, ticketTypes: [{ name: 'Show only', sold: 25 }, { name: 'Dinner + Show', sold: 27 }, { name: 'Genussloge', sold: 5 }] }
    ],
    reservations: [],
    ticketOrders: [],
    // Wird beim ersten Laden aus site/data/floorplan.json uebernommen.
    floorplan: null,
    blockedTables: [],
    parties: [],
    updatedAt: new Date().toISOString()
  });

  const clone = value => JSON.parse(JSON.stringify(value));

  const safeText = (value, maxLength = 120) => String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLength);
  const safeNumber = (value, min, max, fallback = min) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  const safeDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : localDate(0);
  const safeTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value)) ? String(value) : '12:00';
  const safeIso = value => Number.isNaN(Date.parse(value)) ? new Date().toISOString() : new Date(value).toISOString();

  const safeId = (value, fallback) => (/^[a-z][a-z0-9-]{1,23}$/.test(String(value)) ? String(value) : fallback);

  // Der Tischplan enthaelt ausschliesslich Stammdaten. Alles, was nach Belegung
  // oder Person aussieht, faellt beim Einlesen weg statt gespeichert zu werden.
  function sanitizeLevel(level, index) {
    const id = safeId(level?.id, `etage-${index + 1}`);
    const seen = new Set();
    const tables = (Array.isArray(level?.tables) ? level.tables : []).slice(0, 300).map((table, spot) => {
      let tableId = safeText(table?.id, 24) || `${id}-t${String(spot + 1).padStart(2, '0')}`;
      while (seen.has(tableId)) tableId = `${tableId}x`.slice(0, 24);
      seen.add(tableId);
      // Achtung: Number(null) ist 0. Ohne die ausdrueckliche Pruefung auf
      // null gilt jeder Tisch als fest auf Position 0,0 gesetzt und alle
      // stapeln sich uebereinander.
      const coord = (value, max) => {
        if (value === null || value === undefined || value === '') return null;
        const number = Number(value);
        return Number.isInteger(number) && number >= 0 && number <= max ? number : null;
      };
      const seats = safeNumber(table?.seats, 1, 12, 2);
      return {
        id: tableId,
        seats,
        col: coord(table?.col, 200),
        row: coord(table?.row, 400),
        // Stuhlnamen fuer den Sitzplan. Genau wie beim Reservierungsnamen ist
        // das ein personenbezogenes Feld - mehr steht hier nicht.
        seatNames: Array.from({ length: seats }, (_, seat) =>
          safeText(Array.isArray(table?.seatNames) ? table.seatNames[seat] : '', 28))
      };
    });

    const kinds = new Set(['eingang', 'ausgang', 'bar', 'buehne', 'terrasse', 'wand']);
    const elements = (Array.isArray(level?.elements) ? level.elements : []).slice(0, 60)
      .filter(item => kinds.has(item?.kind))
      .map((item, spot) => ({
        id: safeText(item?.id, 24) || `${id}-e${String(spot + 1).padStart(2, '0')}`,
        kind: item.kind,
        label: safeText(item?.label, 24),
        col: safeNumber(item?.col, 0, 200, 0),
        row: safeNumber(item?.row, 0, 400, 0),
        w: safeNumber(item?.w, 1, 24, 4),
        h: safeNumber(item?.h, 1, 24, 1)
      }));

    return {
      id,
      name: safeText(level?.name, 40) || `Etage ${index + 1}`,
      order: safeNumber(level?.order, 1, 4, index + 1),
      tables,
      elements
    };
  }

  function sanitizeLayout(layout, index) {
    const id = safeId(layout?.id, `ordnung-${index + 1}`);
    const levels = (Array.isArray(layout?.levels) ? layout.levels : []).slice(0, 4).map(sanitizeLevel);
    const known = new Set(levels.flatMap(level => level.tables.map(table => table.id)));
    return {
      id,
      name: safeText(layout?.name, 40) || `Ordnung ${index + 1}`,
      levels,
      combos: (Array.isArray(layout?.combos) ? layout.combos : []).slice(0, 40).map((combo, spot) => ({
        id: safeText(combo?.id, 40) || `combo-${spot + 1}`,
        tables: (Array.isArray(combo?.tables) ? combo.tables : []).slice(0, 4)
          .map(entry => safeText(entry, 24)).filter(entry => known.has(entry)),
        minGuests: safeNumber(combo?.minGuests, 1, 24, 1)
      })).filter(combo => combo.tables.length >= 2)
    };
  }

  function sanitizeFloorplan(input) {
    if (!input || typeof input !== 'object') return null;
    const layouts = (Array.isArray(input.layouts) ? input.layouts : []).slice(0, 12).map(sanitizeLayout);
    if (!layouts.length) return null;
    const ids = new Set(layouts.map(layout => layout.id));
    const known = new Set(layouts.flatMap(layout => layout.levels.map(level => level.id)));
    const policy = input.policy && typeof input.policy === 'object' ? input.policy : {};
    return {
      version: 2,
      status: ['beispiel', 'bestaetigt'].includes(input.status) ? input.status : 'beispiel',
      numbering: { start: safeNumber(input.numbering?.start, 1, 999, 1) },
      // Steht im PDF-Kopf, damit ein ausgedruckter Plan zuordenbar ist.
      eventName: safeText(input.eventName, 60),
      activeLayout: ids.has(input.activeLayout) ? input.activeLayout : layouts[0].id,
      layouts,
      menu: (Array.isArray(input.menu) ? input.menu : []).slice(0, 12).map((dish, index) => ({
        id: safeId(dish?.id, `gericht-${index + 1}`),
        name: safeText(dish?.name, 40) || `Gericht ${index + 1}`
      })),
      policy: {
        durations: (Array.isArray(policy.durations) ? policy.durations : []).slice(0, 8).map(step => ({
          upTo: safeNumber(step?.upTo, 1, 24, 2),
          minutes: safeNumber(step?.minutes, 30, 300, 90)
        })),
        bufferMinutes: safeNumber(policy.bufferMinutes, 0, 60, 15),
        slotMinutes: safeNumber(policy.slotMinutes, 5, 60, 15),
        maxCoversPerSlot: safeNumber(policy.maxCoversPerSlot, 1, 500, 10),
        levelOrder: (Array.isArray(policy.levelOrder) ? policy.levelOrder : [])
          .map(id => safeText(id, 24)).filter(id => known.has(id))
      }
    };
  }

  function sanitizeState(input) {
    const defaults = makeDefaults();
    const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    const settings = source.settings && typeof source.settings === 'object' ? source.settings : {};
    const servicesSource = Array.isArray(source.services) ? source.services : defaults.services;
    const eventsSource = Array.isArray(source.events) ? source.events : defaults.events;

    return {
      version: 1,
      settings: {
        bufferEnabled: typeof settings.bufferEnabled === 'boolean' ? settings.bufferEnabled : defaults.settings.bufferEnabled,
        bufferPercent: safeNumber(settings.bufferPercent, 0, 90, defaults.settings.bufferPercent),
        lunchDefaultCapacity: safeNumber(settings.lunchDefaultCapacity, 0, 5000, defaults.settings.lunchDefaultCapacity),
        dinnerDefaultCapacity: safeNumber(settings.dinnerDefaultCapacity, 0, 5000, defaults.settings.dinnerDefaultCapacity)
      },
      services: servicesSource.slice(0, 250).map((item, index) => {
        const date = safeDate(item && item.date);
        const time = safeTime(item && item.time);
        const capacity = safeNumber(item && item.capacity, 0, 5000, 0);
        const tables = item && item.tables && typeof item.tables === 'object' ? item.tables : {};
        return {
          id: safeText(item && item.id, 80) || `${date}-${time.replace(':', '')}-${index}`,
          date,
          time,
          kind: safeText(item && item.kind, 24) || 'Mittag',
          capacity,
          reserved: safeNumber(item && item.reserved, 0, capacity, 0),
          // Tischgroessen 2 bis 10 Personen, auch ungerade.
          tables: Object.fromEntries(Array.from({ length: 9 }, (_, index) => index + 2)
            .map(seats => [seats, safeNumber(tables[seats], 0, 500, 0)])
            .filter(([, count]) => count > 0))
        };
      }),
      events: eventsSource.slice(0, 150).map((item, index) => {
        const capacity = safeNumber(item && item.capacity, 0, 50000, 0);
        const ticketTypes = Array.isArray(item && item.ticketTypes) ? item.ticketTypes : [];
        return {
          id: safeText(item && item.id, 80) || `event-${index}`,
          date: safeDate(item && item.date),
          name: safeText(item && item.name, 140) || 'Event',
          format: safeText(item && item.format, 80),
          capacity,
          sold: safeNumber(item && item.sold, 0, capacity, 0),
          ticketTypes: ticketTypes.slice(0, 20).map(type => ({
            name: safeText(type && type.name, 80) || 'Ticket',
            sold: safeNumber(type && type.sold, 0, capacity, 0)
          }))
        };
      }),
      // Keine E-Mail-Adressen, Telefonnummern oder Nachrichten im Browser
      // speichern. Ausnahme ist der Name in `parties` - eine Tischbelegung
      // ohne Namen waere unbrauchbar. Siehe Kommentar dort.
      reservations: (Array.isArray(source.reservations) ? source.reservations : []).slice(0, 40).map(item => ({
        id: safeText(item && item.id, 80),
        createdAt: safeIso(item && item.createdAt),
        status: safeText(item && item.status, 24) || 'Anfrage',
        date: safeDate(item && item.date),
        time: safeTime(item && item.time),
        guests: safeNumber(item && item.guests, 1, 500, 1),
        table: safeText(item && item.table, 80)
      })),
      ticketOrders: (Array.isArray(source.ticketOrders) ? source.ticketOrders : []).slice(0, 40).map(item => ({
        id: safeText(item && item.id, 80),
        createdAt: safeIso(item && item.createdAt),
        status: safeText(item && item.status, 24) || 'Anfrage',
        eventId: safeText(item && item.eventId, 80),
        event: safeText(item && item.event, 140),
        ticket: safeText(item && item.ticket, 80),
        quantity: safeNumber(item && item.quantity, 1, 500, 1),
        total: safeNumber(item && item.total, 0, 1000000, 0)
      })),
      floorplan: sanitizeFloorplan(source.floorplan),
      blockedTables: (Array.isArray(source.blockedTables) ? source.blockedTables : [])
        .slice(0, 200).map(id => safeText(id, 24)).filter(Boolean),
      // Tischbelegung fuer die interne Einteilung. Der Name ist bewusst das
      // einzige personenbezogene Feld im Speicher - mehr braucht ein
      // Sitzplan nicht, und mehr darf hier auch nicht liegen. Kein Kontakt,
      // keine Notiz, keine Historie. Die Belegung ist tagesaktuell gedacht
      // und wird ueber "Belegung leeren" wieder entfernt.
      parties: (Array.isArray(source.parties) ? source.parties : []).slice(0, 300).map((item, index) => {
        const guests = safeNumber(item?.guests, 1, 24, 1);
        // Essenswuensche sind freiwillig und rein zur Kalkulation. Es duerfen
        // nie mehr Portionen als Gaeste sein.
        const dishes = {};
        for (const [key, value] of Object.entries(item?.dishes || {})) {
          const id = safeText(key, 24);
          const count = safeNumber(value, 0, guests, 0);
          if (id && count > 0) dishes[id] = count;
        }
        return {
          id: safeText(item?.id, 24) || `p-${index + 1}`,
          name: safeText(item?.name, 40),
          guests,
          date: safeDate(item?.date),
          time: safeTime(item?.time),
          tableIds: (Array.isArray(item?.tableIds) ? item.tableIds : []).slice(0, 4).map(id => safeText(id, 24)).filter(Boolean),
          dishes,
          source: ['manuell', 'mail'].includes(item?.source) ? item.source : 'manuell'
        };
      }).filter(item => item.name),
      updatedAt: safeIso(source.updatedAt)
    };
  }

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = sanitizeState(JSON.parse(saved));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return clone(state);
      }
    } catch (_) {
      // The in-memory fallback keeps the prototype functional in locked-down previews.
    }
    if (!memoryState) memoryState = makeDefaults();
    return clone(memoryState);
  }

  function save(next) {
    const state = sanitizeState(next);
    state.updatedAt = new Date().toISOString();
    memoryState = state;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
    window.dispatchEvent(new CustomEvent('wirtschaft:datachange', { detail: clone(state) }));
    return clone(state);
  }

  function reset() {
    const state = makeDefaults();
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    return save(state);
  }

  function effectiveLimit(capacity, settings) {
    if (!settings.bufferEnabled) return Number(capacity);
    return Math.max(0, Math.floor(Number(capacity) * (1 - Number(settings.bufferPercent) / 100)));
  }

  function serviceAvailability(service, settings) {
    const limit = effectiveLimit(service.capacity, settings);
    return { limit, available: Math.max(0, limit - Number(service.reserved || 0)) };
  }

  function tableSeats(tables) {
    return Object.entries(tables || {}).reduce((sum, [size, count]) => sum + Number(size) * Number(count || 0), 0);
  }

  function updateSettings(patch) {
    const state = load();
    state.settings = { ...state.settings, ...patch };
    return save(state);
  }

  function updateFloorplan(patch) {
    const current = load();
    const next = { ...(current.floorplan || {}), ...patch };
    current.floorplan = next;
    return save(current);
  }

  function setBlockedTables(ids) {
    const current = load();
    current.blockedTables = Array.isArray(ids) ? ids : [];
    return save(current);
  }

  function setParties(list) {
    const current = load();
    current.parties = Array.isArray(list) ? list : [];
    return save(current);
  }

  /** Setzt Tischplan, Belegung und Sperren in einem Zug - fuer Rueckgaengig. */
  function restorePlan(snapshot) {
    const current = load();
    return save({
      ...current,
      floorplan: snapshot?.floorplan ?? current.floorplan,
      parties: Array.isArray(snapshot?.parties) ? snapshot.parties : current.parties,
      blockedTables: Array.isArray(snapshot?.blockedTables) ? snapshot.blockedTables : current.blockedTables
    });
  }

  /** Der Teil des Zustands, den Rueckgaengig umfasst. */
  function planSnapshot() {
    const current = load();
    return { floorplan: current.floorplan, parties: current.parties, blockedTables: current.blockedTables };
  }

  function updateService(id, patch) {
    const state = load();
    const service = state.services.find(item => item.id === id);
    if (!service) return state;
    Object.assign(service, patch);
    service.capacity = Math.max(0, Number(service.capacity || 0));
    service.reserved = Math.max(0, Math.min(service.capacity, Number(service.reserved || 0)));
    return save(state);
  }

  function updateEvent(id, patch) {
    const state = load();
    const event = state.events.find(item => item.id === id);
    if (!event) return state;
    Object.assign(event, patch);
    event.capacity = Math.max(0, Number(event.capacity || 0));
    event.sold = Math.max(0, Math.min(event.capacity, Number(event.sold || 0)));
    return save(state);
  }

  function recordReservation(payload) {
    const state = load();
    const timeKey = payload.time.replace(':', '');
    const id = `${payload.date}-${timeKey}`;
    let service = state.services.find(item => item.id === id);
    if (!service) {
      const lunch = Number(payload.time.slice(0, 2)) < 15;
      service = {
        id,
        date: payload.date,
        time: payload.time,
        kind: lunch ? 'Mittag' : 'Abend',
        capacity: lunch ? state.settings.lunchDefaultCapacity : state.settings.dinnerDefaultCapacity,
        reserved: 0,
        tables: lunch ? { 2: 8, 4: 6, 6: 2, 8: 1 } : { 2: 10, 4: 8, 6: 3, 8: 2 }
      };
      state.services.push(service);
    }
    const guests = Math.max(1, Number(payload.guests || 1));
    const availability = serviceAvailability(service, state.settings);
    if (guests > availability.available) return { ok: false, reason: 'unavailable', available: availability.available };
    service.reserved += guests;
    state.reservations.unshift({ id: `R-${Date.now()}`, createdAt: new Date().toISOString(), status: 'Bestätigt', date: payload.date, time: payload.time, guests, table: payload.table });
    state.reservations = state.reservations.slice(0, 40);
    save(state);
    return { ok: true, available: availability.available - guests };
  }

  function recordTicketPurchase(payload) {
    const state = load();
    const event = state.events.find(item => item.id === payload.eventId) || state.events[0];
    const quantity = Math.max(1, Number(payload.quantity || 1));
    const available = Math.max(0, event.capacity - event.sold);
    if (quantity > available) return { ok: false, reason: 'unavailable', available };
    event.sold += quantity;
    const type = event.ticketTypes.find(item => item.name === payload.ticket);
    if (type) type.sold += quantity;
    state.ticketOrders.unshift({ id: `T-${Date.now()}`, createdAt: new Date().toISOString(), status: 'Bestätigt', eventId: event.id, event: event.name, ticket: payload.ticket, quantity, total: payload.total });
    state.ticketOrders = state.ticketOrders.slice(0, 40);
    save(state);
    return { ok: true, available: available - quantity };
  }

  function recordReservationInquiry(payload) {
    const state = load();
    state.reservations.unshift({ id: `R-${Date.now()}`, createdAt: new Date().toISOString(), status: 'Anfrage', date: payload.date, time: payload.time, guests: Math.max(1, Number(payload.guests || 1)), table: payload.table });
    state.reservations = state.reservations.slice(0, 40);
    save(state);
    return { ok: true };
  }

  function recordTicketInquiry(payload) {
    const state = load();
    const event = state.events.find(item => item.id === payload.eventId) || state.events[0];
    state.ticketOrders.unshift({ id: `T-${Date.now()}`, createdAt: new Date().toISOString(), status: 'Anfrage', eventId: event.id, event: event.name, ticket: payload.ticket, quantity: Math.max(1, Number(payload.quantity || 1)), total: payload.total });
    state.ticketOrders = state.ticketOrders.slice(0, 40);
    save(state);
    return { ok: true };
  }

  function recordTicketWaitlist(payload) {
    const state = load();
    const event = state.events.find(item => item.id === payload.eventId) || state.events[0];
    state.ticketOrders.unshift({ id: `W-${Date.now()}`, createdAt: new Date().toISOString(), status: 'Warteliste', eventId: event?.id || payload.eventId, event: event?.name || payload.eventId, ticket: payload.ticket, quantity: Math.max(1, Number(payload.quantity || 1)), total: 0 });
    state.ticketOrders = state.ticketOrders.slice(0, 40);
    save(state);
    return { ok: true };
  }

  window.WirtschaftData = {
    STORAGE_KEY,
    load,
    save,
    reset,
    effectiveLimit,
    serviceAvailability,
    tableSeats,
    updateSettings,
    updateFloorplan,
    setBlockedTables,
    setParties,
    restorePlan,
    planSnapshot,
    updateService,
    updateEvent,
    recordReservation,
    recordTicketPurchase,
    recordReservationInquiry,
    recordTicketInquiry,
    recordTicketWaitlist
  };
})();
