/*
 * Privacy-first measurement hooks.
 *
 * This file deliberately contains no vendor tag, cookie, storage access or
 * network call. It only exposes stable event names for a future, consented
 * adapter. Until a CMP sets __ANALYTICS_CONSENT__ to true and an approved
 * __MEASUREMENT_ADAPTER__ is installed, the page remains measurement-free.
 */
(() => {
  const supportedEvents = ['view_events', 'reservation_click', 'menu_open', 'ticket_click', 'calendar_export', 'catering_submit'];
  const mark = (selector, name) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (!element.dataset.analyticsEvent) element.dataset.analyticsEvent = name;
    });
  };

  mark('.header-events, [data-open="events"]', 'view_events');
  mark('.primary-action, [data-open="reservation"], a[href*="tischreservierung"]', 'reservation_click');
  mark('[data-open="menu"]', 'menu_open');
  mark('.event-ticket-link, #officialTicketLink', 'ticket_click');
  mark('[data-calendar-event], #allEventsCalendar, .calendar-all', 'calendar_export');
  mark('a[href="feste-catering.html"], a[href*="feste-catering.html"]', 'catering_view');

  const emit = (element, name) => {
    if (!supportedEvents.includes(name)) return;
    const detail = {
      name,
      eventId: element?.dataset?.calendarEvent || element?.dataset?.eventId || undefined,
      path: window.location.pathname
    };

    // Local-only hook for QA and a future adapter. No storage or network call.
    window.dispatchEvent(new CustomEvent('wirtschaft:measurement', { detail }));

    if (window.__ANALYTICS_CONSENT__ !== true) return;
    const adapter = window.__MEASUREMENT_ADAPTER__;
    if (adapter && typeof adapter.track === 'function') adapter.track(detail);
  };

  document.addEventListener('click', (event) => {
    const element = event.target.closest?.('[data-analytics-event]');
    if (element) emit(element, element.dataset.analyticsEvent);
  }, { passive: true });

  document.querySelectorAll('form[data-measurement-submit]').forEach((form) => {
    form.addEventListener('submit', () => emit(form, form.dataset.measurementSubmit));
  });
})();
