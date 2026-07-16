(() => {
  'use strict';
  const data = window.WirtschaftData;
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const formatDate = value => new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const toast = message => { const node = byId('hostToast'); node.textContent = message; node.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove('show'), 2600); };

  function state() { return data.load(); }
  function available(service, current) { return data.serviceAvailability(service, current.settings); }

  function render() {
    const current = state();
    const filter = byId('kindFilter').value;
    const sort = byId('serviceSort').value;
    byId('lastUpdated').textContent = `Zuletzt lokal aktualisiert: ${new Intl.DateTimeFormat('de-AT', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(current.updatedAt))}`;
    byId('bufferEnabled').checked = current.settings.bufferEnabled;
    byId('bufferPercent').value = current.settings.bufferPercent;
    byId('lunchCapacity').value = current.settings.lunchDefaultCapacity;
    byId('dinnerCapacity').value = current.settings.dinnerDefaultCapacity;

    const todayServices = current.services.filter(item => item.date === today);
    byId('metricToday').textContent = todayServices.reduce((sum, item) => sum + available(item, current).available, 0);
    byId('metricReservations').textContent = current.reservations.filter(item => item.status === 'Anfrage').length;
    byId('metricTickets').textContent = current.ticketOrders.filter(item => item.status === 'Anfrage').length;
    byId('metricEventFree').textContent = current.events.reduce((sum, item) => sum + Math.max(0, item.capacity - item.sold), 0);

    let services = current.services.filter(item => filter === 'all' || item.kind === filter);
    services.sort((a, b) => {
      if (sort === 'free-asc') return available(a, current).available - available(b, current).available;
      if (sort === 'free-desc') return available(b, current).available - available(a, current).available;
      return `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`);
    });
    byId('servicesBody').innerHTML = services.map(item => {
      const count = available(item, current);
      return `<tr><td>${formatDate(item.date)}</td><td>${escapeHtml(item.time)}</td><td>${escapeHtml(item.kind)}</td><td><input data-service="${escapeHtml(item.id)}" data-field="capacity" type="number" min="0" value="${item.capacity}" aria-label="Kapazität ${escapeHtml(item.date)} ${escapeHtml(item.time)}"></td><td><input data-service="${escapeHtml(item.id)}" data-field="reserved" type="number" min="0" value="${item.reserved}" aria-label="Belegt ${escapeHtml(item.date)} ${escapeHtml(item.time)}"></td><td>${count.limit}</td><td class="free${count.available < 8 ? ' low' : ''}">${count.available}</td></tr>`;
    }).join('') || '<tr><td colspan="7">Keine Zeitfenster für diesen Filter.</td></tr>';

    byId('eventsAdmin').innerHTML = current.events.map(item => `<article class="event-card"><time class="event-date" datetime="${escapeHtml(item.date)}">${formatDate(item.date)}</time><div><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.format)} · ${item.ticketTypes.map(type => `${escapeHtml(type.name)}: ${type.sold}`).join(' · ')}</p></div><div class="event-inputs"><label>Kapazität<input data-event="${escapeHtml(item.id)}" data-field="capacity" type="number" min="0" value="${item.capacity}"></label><label>Verkauft<input data-event="${escapeHtml(item.id)}" data-field="sold" type="number" min="0" value="${item.sold}"></label><label>Noch frei<output>${Math.max(0, item.capacity - item.sold)}</output></label></div></article>`).join('');

    const reservationHtml = current.reservations.map(item => `<article class="inquiry-item"><strong>Tischanfrage · ${item.guests} Personen</strong><span>${escapeHtml(item.date)} · ${escapeHtml(item.time)}</span><small>${escapeHtml(item.table || 'kein Tischwunsch')} · keine Kontaktdaten lokal gespeichert</small></article>`).join('');
    const ticketHtml = current.ticketOrders.map(item => `<article class="inquiry-item"><strong>Ticketanfrage · ${item.quantity} Tickets</strong><span>${escapeHtml(item.event || item.eventId)}</span><small>${escapeHtml(item.ticket || 'Ticketart offen')} · ${item.total || 0} € · keine Kontaktdaten lokal gespeichert</small></article>`).join('');
    byId('reservationInquiries').innerHTML = reservationHtml || '<p class="empty">Noch keine Tischanfragen in diesem Browser.</p>';
    byId('ticketInquiries').innerHTML = ticketHtml || '<p class="empty">Noch keine Ticketanfragen in diesem Browser.</p>';
  }

  ['bufferEnabled', 'bufferPercent', 'lunchCapacity', 'dinnerCapacity'].forEach(id => byId(id).addEventListener('change', () => {
    data.updateSettings({ bufferEnabled: byId('bufferEnabled').checked, bufferPercent: Number(byId('bufferPercent').value), lunchDefaultCapacity: Number(byId('lunchCapacity').value), dinnerDefaultCapacity: Number(byId('dinnerCapacity').value) });
    render(); toast('Einstellungen gespeichert.');
  }));
  ['kindFilter', 'serviceSort'].forEach(id => byId(id).addEventListener('change', render));
  byId('servicesBody').addEventListener('change', event => { const input = event.target.closest('[data-service]'); if (!input) return; data.updateService(input.dataset.service, { [input.dataset.field]: Number(input.value) }); render(); toast('Zeitfenster aktualisiert.'); });
  byId('eventsAdmin').addEventListener('change', event => { const input = event.target.closest('[data-event]'); if (!input) return; data.updateEvent(input.dataset.event, { [input.dataset.field]: Number(input.value) }); render(); toast('Eventbestand aktualisiert.'); });
  byId('addServiceForm').addEventListener('submit', event => {
    event.preventDefault(); const current = state(); const date = byId('newDate').value; const time = byId('newTime').value; const id = `${date}-${time.replace(':', '')}`;
    if (current.services.some(item => item.id === id)) return toast('Dieses Zeitfenster existiert bereits.');
    current.services.push({ id, date, time, kind: byId('newKind').value, capacity: Number(byId('newCapacity').value), reserved: 0 }); data.save(current); render(); toast('Zeitfenster ergänzt.');
  });
  byId('newDate').min = today; byId('newDate').value = today; byId('newTime').value = '12:00';
  byId('exportData').addEventListener('click', () => { const blob = new Blob([JSON.stringify(state(), null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `wirtschaft-gastgeber-${today}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Datenexport erstellt.'); });
  byId('importData').addEventListener('change', async event => { try { const imported = JSON.parse(await event.target.files[0].text()); if (!imported.settings || !Array.isArray(imported.services) || !Array.isArray(imported.events)) throw new Error('format'); data.save(imported); render(); toast('Daten erfolgreich importiert.'); } catch (_) { toast('Diese Datei hat nicht das erwartete Format.'); } event.target.value = ''; });
  byId('clearInquiries').addEventListener('click', () => { const current = state(); current.reservations = []; current.ticketOrders = []; data.save(current); render(); toast('Lokale Anfragen geleert.'); });
  byId('resetData').addEventListener('click', () => { if (confirm('Lokale Änderungen wirklich auf die Testdaten zurücksetzen?')) { data.reset(); render(); toast('Testdaten zurückgesetzt.'); } });
  window.addEventListener('wirtschaft:datachange', render);
  render();
})();
