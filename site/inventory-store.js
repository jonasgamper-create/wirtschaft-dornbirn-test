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
      { id: `${localDate(0)}-1130`, date: localDate(0), time: '11:30', kind: 'Mittag', capacity: 48, reserved: 31 },
      { id: `${localDate(0)}-1200`, date: localDate(0), time: '12:00', kind: 'Mittag', capacity: 48, reserved: 38 },
      { id: `${localDate(0)}-1230`, date: localDate(0), time: '12:30', kind: 'Mittag', capacity: 48, reserved: 24 },
      { id: `${localDate(0)}-1800`, date: localDate(0), time: '18:00', kind: 'Abend', capacity: 72, reserved: 39 },
      { id: `${localDate(0)}-1930`, date: localDate(0), time: '19:30', kind: 'Abend', capacity: 72, reserved: 52 },
      { id: `${localDate(1)}-1200`, date: localDate(1), time: '12:00', kind: 'Mittag', capacity: 48, reserved: 18 },
      { id: `${localDate(1)}-1930`, date: localDate(1), time: '19:30', kind: 'Abend', capacity: 72, reserved: 45 }
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
        return {
          id: safeText(item && item.id, 80) || `${date}-${time.replace(':', '')}-${index}`,
          date,
          time,
          kind: safeText(item && item.kind, 24) || 'Mittag',
          capacity,
          reserved: safeNumber(item && item.reserved, 0, capacity, 0)
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
      // Keine Namen, E-Mail-Adressen, Telefonnummern oder Nachrichten im Browser speichern.
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

  function updateSettings(patch) {
    const state = load();
    state.settings = { ...state.settings, ...patch };
    return save(state);
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
        reserved: 0
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

  window.WirtschaftData = {
    STORAGE_KEY,
    load,
    save,
    reset,
    effectiveLimit,
    serviceAvailability,
    updateSettings,
    updateService,
    updateEvent,
    recordReservation,
    recordTicketPurchase,
    recordReservationInquiry,
    recordTicketInquiry
  };
})();
