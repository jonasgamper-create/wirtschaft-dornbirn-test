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

  function load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (_) {
      // The in-memory fallback keeps the prototype functional in locked-down previews.
    }
    if (!memoryState) memoryState = makeDefaults();
    return clone(memoryState);
  }

  function save(next) {
    const state = clone(next);
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
    state.reservations.unshift({ id: `R-${Date.now()}`, createdAt: new Date().toISOString(), ...payload, guests });
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
    state.ticketOrders.unshift({ id: `T-${Date.now()}`, createdAt: new Date().toISOString(), eventId: event.id, event: event.name, ...payload, quantity });
    state.ticketOrders = state.ticketOrders.slice(0, 40);
    save(state);
    return { ok: true, available: available - quantity };
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
    recordTicketPurchase
  };
})();
