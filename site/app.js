(() => {
  'use strict';

  window.__APP_ERRORS__ = [];
  window.addEventListener('error', event => {
    window.__APP_ERRORS__.push({
      type: 'error',
      message: event.message || 'Unbekannter JavaScript-Fehler',
      source: event.filename || '',
      line: event.lineno || 0
    });
  });
  window.addEventListener('unhandledrejection', event => {
    window.__APP_ERRORS__.push({
      type: 'unhandledrejection',
      message: String(event.reason?.message || event.reason || 'Unbehandeltes Promise')
    });
  });

  const root = document.documentElement;
  const body = document.body;
  const conceptRail = document.querySelector('.concept-rail');
  const railLinks = [...document.querySelectorAll('.concept-rail a')];
  // The final guest flow intentionally keeps the heritage/host chapters out
  // of the main scroll. Do not let hidden scenes participate in observers or
  // rewrite the URL to a chapter the visitor cannot see.
  const scenes = [...document.querySelectorAll('.concept-scene')]
    .filter(scene => !scene.matches('#concept-01, #concept-05'))
    .sort((a, b) => a.offsetTop - b.offsetTop);
  const reveals = [...document.querySelectorAll('.reveal')];
  const zoomSections = [...document.querySelectorAll('[data-zoom]')];
  const mobileSelect = document.getElementById('mobileConceptSelect');
  const motionToggle = document.getElementById('motionToggle');
  const themeStatusLabel = document.getElementById('themeStatusLabel');
  const themeStatusMood = document.getElementById('themeStatusMood');
  const toast = document.getElementById('toast');
  const serviceStatus = document.querySelector('[data-service-status]');
  const arrivalStatus = document.querySelector('[data-arrival-status]');
  const arrivalDetail = document.querySelector('[data-arrival-detail]');
  const arrivalEvent = document.querySelector('[data-arrival-event]');
  const nextEventLabel = document.querySelector('.hero-event-pulse strong');
  const reducedPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)');
  const query = new URLSearchParams(window.location.search);
  const studyMode = query.get('study') === '1';
  const qaMode = query.get('qa') === '1';
  const requestedConcept = query.get('concept');
  const requestedDialog = query.get('open');
  let animationFrame = 0;
  let targetScrollY = window.scrollY;
  let smoothedScrollY = targetScrollY;
  let lastMotionTime = 0;
  let activeSceneFrame = 0;
  let activeSceneId = '';
  let observerLockUntil = 0;
  let lastTrigger = null;
  let chapterBounds = { firstTop: 0, lastBottom: 0 };
  const visibleScenes = new Map();
  let themeTransitionTimer = 0;

  const fallbackEventData = {
    version: 2,
    updatedAt: '2026-08-27T10:00:00+02:00',
    maxAgeHours: 48,
    sourceUrl: 'https://wirtschaft-dornbirn.at/event/',
    pause: { label: 'Sommerpause', start: '2026-07-24', end: '2026-08-23', reopen: '2026-08-24' },
    events: [
      // [events:auto-start] wird von scripts/sync-events.mjs aus data/events.json erzeugt - hier nichts von Hand aendern.
      { id: "event-2026-09-03", date: "2026-09-03", title: "Genussroute 6850", type: "Dornbirner Genussabend", status: "sold_out", officialUrl: "https://wirtschaft-dornbirn.at/event/genussroute-2026/", tickets: [{ name: "Sitzplatz", preis: 88, beginn: "18:00", status: "ausverkauft" }] },
      { id: "event-2026-09-22", date: "2026-09-22", title: "Helden reisen, Gäste speisen!", type: "Dinner & Bühne", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/comedynacht-05-2026/", tickets: [{ name: "Dinner & Comedy (Sitzplatz)", preis: 88, beginn: "18:45", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/comedynacht-05-2026-1" },
      { id: "event-2026-09-23", date: "2026-09-23", title: "Helden reisen, Gäste speisen! – Zusatzabend", type: "Dinner & Bühne", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/comedynacht-06-2026/", tickets: [{ name: "Dinner & Comedy (Sitzplatz)", preis: 88, beginn: "18:45", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/comedynacht-06-2026-1" },
      { id: "event-2026-10-14", date: "2026-10-14", title: "Dinner & Comedy", type: "Genuss trifft Humor", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/dinner-comedy-04-2026/", tickets: [{ name: "Dinner & Comedy (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Comedy only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/dinner-comedy-04-2026" },
      { id: "event-2026-10-15", date: "2026-10-15", title: "Christof Spörk", type: "Kabarett in der Wirtschaft", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/spoerk-2026/", tickets: [{ name: "Dinner & Comedy (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Comedy only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/spoerk-2026" },
      { id: "event-2026-10-21", date: "2026-10-21", title: "Maria Neuschmid & Stefan Vögel", type: "Kabarett in der Wirtschaft", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/neuschmid-voegel-02-2026/", tickets: [{ name: "Dinner & Comedy (Sitzplatz)", preis: 78, beginn: "19:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/neuschmid-voegel-02-2026" },
      { id: "event-2026-10-22", date: "2026-10-22", title: "Rock4 – A Cappella", type: "The Music of Queen · A cappella", status: "teilweise", officialUrl: "https://wirtschaft-dornbirn.at/event/rock4-2026/", tickets: [{ name: "Dinner & Konzert (Sitzplatz)", preis: 68, beginn: "19:00", status: "ausverkauft" }, { name: "Konzert only (Stehplatz)", preis: 38, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/rock4-2026-only" },
      { id: "event-2026-10-27", date: "2026-10-27", title: "Mathias Kellner", type: "Lieder & Kabarett", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/kellner-2026/", tickets: [{ name: "Dinner & Konzert (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Konzert only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/kellner-2026" },
      { id: "event-2026-11-11", date: "2026-11-11", title: "Dinner & Comedy", type: "Genuss trifft Humor", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/dinner-comedy-05-2026/", tickets: [{ name: "Dinner & Comedy (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Comedy only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/dinner-comedy-05-2026" },
      { id: "event-2026-11-18", date: "2026-11-18", title: "Philipp Lingg's Musikzimmer", type: "Das musikalische Blind Date", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/philippsmusikzimmer-02-2026/", tickets: [{ name: "Dinner & Konzert (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Konzert only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/philippsmusikzimmer-02-2026" },
      { id: "event-2026-11-19", date: "2026-11-19", title: "Hanskaspas Enkel & George Nussbaumer", type: "Dinner & Konzert", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/hanskaspasenkel-2026/", tickets: [{ name: "Dinner & Konzert (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Konzert only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/hanskaspasenkel-2026" },
      { id: "event-2026-11-24", date: "2026-11-24", title: "Notenlos", type: "Dinner & Konzert", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/notenlos-2026/", tickets: [{ name: "Dinner & Konzert (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Konzert only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/notenlos-2026" },
      { id: "event-2026-11-26", date: "2026-11-26", title: "Krauthobel Anplakt", type: "Dinner & Konzert", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/krauthobel-2026/", tickets: [{ name: "Dinner & Konzert (Sitzplatz)", preis: 78, beginn: "19:00", status: "buchbar" }, { name: "Konzert only (Stehplatz)", preis: 38, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/krauthobel-2026" },
      { id: "event-2026-12-03", date: "2026-12-03", title: "Rebel Tell", type: "Dinner & Konzert", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/rebeltell-2026/", tickets: [{ name: "Dinner & Konzert (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Konzert only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/rebeltell-2026" },
      { id: "event-2026-12-10", date: "2026-12-10", title: "The Monroes", type: "Dinner & Konzert", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/themonroes-2026/", tickets: [{ name: "Dinner & Konzert (Sitzplatz)", preis: 78, beginn: "19:00", status: "buchbar" }, { name: "Konzert only (Stehplatz)", preis: 38, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/themonroes-2026" },
      { id: "event-2026-12-15", date: "2026-12-15", title: "Dinner & Comedy", type: "Genuss trifft Humor", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/dinner-comedy-06-2026/", tickets: [{ name: "Dinner & Comedy (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Comedy only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/dinner-comedy-06-2026" },
      { id: "event-2026-12-16", date: "2026-12-16", title: "Dinner & Comedy", type: "Genuss trifft Humor", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/dinner-comedy-07-2026/", tickets: [{ name: "Dinner & Comedy (Sitzplatz)", preis: 68, beginn: "19:00", status: "buchbar" }, { name: "Comedy only (Stehplatz)", preis: 28, beginn: "21:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/dinner-comedy-07-2026" },
      { id: "event-2027-05-20", date: "2027-05-20", title: "Genussroute 6850", type: "5 Gastronomen · 6 Live-Bands", status: "scheduled", officialUrl: "https://wirtschaft-dornbirn.at/event/genussroute-2026/", tickets: [{ name: "Sitzplatz", preis: 88, beginn: "18:00", status: "buchbar" }], ticketUrl: "https://www.ticketist.io/events/genussroute" },
  // [events:auto-ende]
    ]
  };
  let eventData = fallbackEventData;
  let calendarEvents = eventData.events.map(item => ({ ...item }));
  const statusLabel = document.querySelector('[data-status-label]');
  const statusDetail = document.querySelector('[data-status-detail]');
  const statusNext = document.querySelector('[data-status-next]');
  const statusUpdated = document.querySelector('[data-status-updated]');
  const reserveCta = document.querySelector('[data-reserve-cta]');

  const formatEventDate = date => new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`)).replace('.', '');
  const isFreshEventData = data => {
    const stamp = Date.parse(data?.updatedAt || '');
    const maxAge = Number(data?.maxAgeHours || 48);
    return Number.isFinite(stamp) && Date.now() - stamp <= maxAge * 60 * 60 * 1000;
  };
  // "Restkarten" statt "Warteliste", wenn nur eine Kategorie weg ist: es gibt
  // an dem Abend noch etwas zu holen, und genau das soll der Knopf sagen.
  const eventStatusLabel = status => ({ scheduled: 'Tickets', teilweise: 'Restkarten', sold_out: 'Ausverkauft', waitlist: 'Warteliste', cancelled: 'Abgesagt', paused: 'Pausiert' }[status] || 'Details');

  function syncServiceStatus() {
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const pause = eventData.pause || fallbackEventData.pause;
    const pauseStart = pause.start || '';
    const pauseUntil = pause.end || '';
    const paused = todayIso >= pauseStart && todayIso <= pauseUntil;
    const nextLabel = paused ? pause.label || 'Sommerpause' : 'Geöffnet';
    const reopen = pause.reopen ? formatEventDate(pause.reopen) : 'bald';
    const nextDetail = paused ? `Ab ${reopen} wieder geöffnet` : 'Mittagstisch · Abendevents';
    const label = statusLabel || serviceStatus?.querySelector('strong');
    const detail = statusDetail || serviceStatus?.querySelector('em');
    if (label) label.textContent = nextLabel;
    if (detail) detail.textContent = nextDetail;
    serviceStatus?.classList.toggle('is-paused', paused);
    // Die Pause steht nicht mehr als eigener Balken, sondern als Zustand
    // an genau der Aktion, die sie betrifft.
    if (reserveCta) {
      const reopenLong = pause.reopen
        ? new Intl.DateTimeFormat('de-AT', { day: 'numeric', month: 'long' }).format(new Date(`${pause.reopen}T12:00:00`))
        : '';
      reserveCta.textContent = paused && reopenLong
        ? `ab ${reopenLong.toLowerCase()} reservieren`
        : 'Mittagstisch reservieren';
      reserveCta.dataset.paused = String(paused);
    }
    const nextEvent = calendarEvents.find(item => item.date >= todayIso && !['cancelled', 'paused'].includes(item.status));
    if (statusNext) statusNext.textContent = nextEvent ? formatEventDate(nextEvent.date) : 'bald';
    if (statusUpdated) {
      const fresh = isFreshEventData(eventData);
      statusUpdated.hidden = fresh;
      statusUpdated.textContent = `Stand: ${new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(eventData.updatedAt))}`;
      serviceStatus?.classList.toggle('is-stale', !fresh);
    }
    if (arrivalStatus) arrivalStatus.textContent = nextLabel;
    if (arrivalDetail) arrivalDetail.textContent = nextDetail;
    if (arrivalEvent && nextEventLabel) arrivalEvent.textContent = `Nächster Abend · ${nextEventLabel.textContent}`;
  }

  syncServiceStatus();

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // Geometrie einmal messen statt in jedem Bild. Vorher wurden offsetTop und
  // offsetHeight gelesen, nachdem im selben Frame bereits Styles geschrieben
  // waren - der Browser musste das Layout mitten im Frame neu berechnen.
  let layout = { vh: 0, zoom: [], scenes: [] };
  function refreshLayout() {
    layout.vh = window.innerHeight;
    layout.zoom = zoomSections.map(el => ({
      el, top: el.offsetTop, height: el.offsetHeight,
      dir: el.dataset.zoom === 'out' ? -1 : 1
    }));
    layout.scenes = scenes.map(el => ({
      el, top: el.offsetTop, height: el.offsetHeight,
      stage: el.classList.contains('chapter-stage'),
      media: [...el.querySelectorAll('.parallax-media')]
    }));
  }

  function refreshChapterBounds() {
    const firstScene = scenes[0];
    const lastScene = scenes[scenes.length - 1];
    chapterBounds = {
      firstTop: firstScene?.offsetTop || 0,
      lastBottom: lastScene ? lastScene.offsetTop + lastScene.offsetHeight : 0
    };
  }
  refreshChapterBounds();
  refreshLayout();

  if (body.classList.contains('final-site')) {
    const staggerGroups = document.querySelectorAll('.prologue-copy, .scene-copy, .decision-copy');
    staggerGroups.forEach(group => {
      [...group.children].forEach((child, index) => {
        child.classList.add('luxury-reveal');
        child.style.setProperty('--reveal-order', Math.min(index, 6));
      });
    });

    requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('deluxe-ready')));
  }

  function reportStudy(event, detail = {}) {
    if (!studyMode || window.parent === window) return;
    const targetOrigin = window.location.origin === 'null' ? '*' : window.location.origin;
    window.parent.postMessage({
      source: 'wirtschaft-study',
      event,
      detail,
      timestamp: new Date().toISOString()
    }, targetOrigin);
  }

  const dialogs = {
    reservation: document.getElementById('reservationDialog'),
    tickets: document.getElementById('ticketDialog'),
    events: document.getElementById('eventsDialog'),
    menu: document.getElementById('menuDialog'),
    story: document.getElementById('storyDialog'),
    privacy: document.getElementById('privacyDialog')
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function closeOpenDialogs() {
    Object.values(dialogs).forEach(dialog => {
      if (dialog?.open) dialog.close();
    });
  }

  function openDialog(name, trigger) {
    const dialog = dialogs[name];
    if (!dialog) return;
    const triggerInsideDialog = trigger?.closest?.('dialog');
    if (!triggerInsideDialog) lastTrigger = trigger || document.activeElement;
    closeOpenDialogs();
    dialog.showModal();
    reportStudy('dialog_open', { name, concept: body.dataset.concept || requestedConcept || '01' });
    const focusTarget = dialog.querySelector('input, [role="radio"], button:not(.dialog-close)');
    window.setTimeout(() => focusTarget?.focus(), 0);
  }

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-open]');
    if (opener) {
      event.preventDefault();
      if (opener.dataset.event) {
        const eventSelect = document.getElementById('ticketEvent');
        if (eventSelect) {
          eventSelect.value = opener.dataset.event;
          eventSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      openDialog(opener.dataset.open, opener);
      return;
    }
    const party = event.target.closest('[data-guests]');
    if (party) {
      selectGuestCount(party.dataset.guests);
      openDialog('reservation', party);
    }
  });

  document.querySelectorAll('[data-lunch-guests]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-lunch-guests]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
  }));

  Object.values(dialogs).forEach(dialog => {
    dialog?.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog?.addEventListener('close', () => lastTrigger?.focus());
  });
  document.querySelectorAll('.dialog-close').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog')?.close());
  });

  // Klassen nur schreiben, wenn sie sich aendern. classList.toggle schreibt
  // sonst in jedem Bild dasselbe Attribut, und jeder Schreibzugriff kostet
  // eine Stilneuberechnung des ganzen Dokuments.
  let warGescrollt = null;
  let warVersteckt = null;

  function updateScrollEffects(visualScrollY = smoothedScrollY) {
    const vh = layout.vh || window.innerHeight;
    const gescrollt = visualScrollY > 36;
    if (gescrollt !== warGescrollt) {
      body.classList.toggle('page-scrolled', gescrollt);
      warGescrollt = gescrollt;
    }
    const beforeChapters = scenes.length && visualScrollY < chapterBounds.firstTop - vh * .58;
    const afterChapters = scenes.length && visualScrollY > chapterBounds.lastBottom - vh * .12;
    const versteckt = Boolean(beforeChapters || afterChapters);
    if (versteckt !== warVersteckt) {
      body.classList.toggle('artifacts-hidden', versteckt);
      warVersteckt = versteckt;
    }

    if (!body.classList.contains('motion-off') && !reducedPreference.matches) {
      layout.zoom.forEach(({ el: section, top: offset, height, dir: direction }) => {
        const top = offset - visualScrollY;
        const bottom = top + height;
        if (bottom <= 0 || top >= vh) return;
        const travel = Math.max(1, height + vh);
        const progressInSection = Math.max(0, Math.min(1, (vh - top) / travel));
        section.style.setProperty('--scene-progress', progressInSection.toFixed(4));
        // Auf Beruehr-Geraeten bleibt der Zoom stehen: das staendige
        // Neuzeichnen der grossen Bildflaechen war der Grund, warum schnelles
        // Scrollen am Telefon nicht rund lief. Die Einblendungen laufen
        // weiter (sie haengen an --scene-progress), nur die Bilder atmen
        // nicht mehr pro Bildschirmzeile.
        if (!coarsePointer.matches) {
          const zoom = 1.02 + direction * (progressInSection - .5) * .018;
          section.style.setProperty('--scene-zoom', zoom.toFixed(4));
          section.style.setProperty('--zoom', zoom.toFixed(4));
        }
      });
      layout.scenes.forEach(({ el: scene, top: offset, height, stage, media: parallax }) => {
        const top = offset - visualScrollY;
        const bottom = top + height;
        if (bottom > 0 && top < vh) {
          const travel = Math.max(1, height + vh);
          const local = Math.max(0, Math.min(1, (vh - top) / travel));
          const centerDistance = Math.abs(top + height / 2 - vh / 2);
          const sceneFocus = Math.max(0, Math.min(1, 1 - centerDistance / (vh * .92)));
          scene.style.setProperty('--scene-focus', sceneFocus.toFixed(4));
          scene.style.setProperty('--number-shift', `${(local - .5) * -14}px`);
          if (stage) {
            const focusPulse = Math.max(0, 1 - Math.abs(local - .54) * 3.2);
            scene.style.setProperty('--video-progress', local.toFixed(4));
            scene.style.setProperty('--video-pan', `${((local - .5) * -14).toFixed(2)}%`);
            scene.style.setProperty('--video-rise', `${((local - .5) * -58).toFixed(1)}px`);
            scene.style.setProperty('--video-glare', `${(local * 132 - 34).toFixed(1)}%`);
            scene.style.setProperty('--video-focus', focusPulse.toFixed(4));
          }
          const normalized = (top + height / 2 - vh / 2) / vh;
          if (coarsePointer.matches) return;
          parallax.forEach(media => {
            media.style.setProperty('--parallax', `${normalized * -8}px`);
          });
        }
      });
    }
  }

  function renderMotionFrame(timestamp) {
    targetScrollY = window.scrollY;
    const motionDisabled = body.classList.contains('motion-off') || reducedPreference.matches;
    const elapsed = Math.min(64, Math.max(8, timestamp - (lastMotionTime || timestamp - 16)));
    const responseTime = coarsePointer.matches ? 46 : 64;
    const smoothing = motionDisabled ? 1 : 1 - Math.exp(-elapsed / responseTime);
    smoothedScrollY += (targetScrollY - smoothedScrollY) * smoothing;
    if (Math.abs(targetScrollY - smoothedScrollY) < .08) smoothedScrollY = targetScrollY;
    updateScrollEffects(smoothedScrollY);
    lastMotionTime = timestamp;
    if (!motionDisabled && smoothedScrollY !== targetScrollY) {
      animationFrame = requestAnimationFrame(renderMotionFrame);
    } else {
      animationFrame = 0;
      lastMotionTime = 0;
    }
  }

  function requestMotionFrame() {
    if (document.hidden) return;
    targetScrollY = window.scrollY;
    if (!animationFrame) animationFrame = requestAnimationFrame(renderMotionFrame);
  }

  function syncVisualScroll() {
    targetScrollY = window.scrollY;
    smoothedScrollY = targetScrollY;
    updateScrollEffects(smoothedScrollY);
  }

  window.addEventListener('scroll', requestMotionFrame, { passive: true });
  window.addEventListener('resize', () => {
    refreshChapterBounds();
    refreshLayout();
    requestMotionFrame();
  }, { passive: true });
  window.addEventListener('load', requestMotionFrame, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncVisualScroll();
  });
  syncVisualScroll();

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -7% 0px' });
  reveals.forEach(element => revealObserver.observe(element));

  function setActiveScene(scene, { syncUrl = false } = {}) {
    const id = scene.id;
    const changed = activeSceneId !== id;
    activeSceneId = id;
    let activeLink = null;
    railLinks.forEach(link => {
      const active = link.dataset.target === id;
      if (active) {
        link.setAttribute('aria-current', 'true');
        activeLink = link;
      }
      else link.removeAttribute('aria-current');
    });
    if (conceptRail && activeLink) {
      const targetTop = activeLink.offsetTop - (conceptRail.clientHeight - activeLink.offsetHeight) / 2;
      conceptRail.scrollTo({ top: Math.max(0, targetTop), behavior: body.classList.contains('motion-off') ? 'auto' : 'smooth' });
    }
    if (mobileSelect) mobileSelect.value = id;
    body.dataset.concept = scene.dataset.concept;
    applyTheme(scene);
    const concept = scene.dataset.concept;
    const finalSite = body.classList.contains('final-site');
    const ticketConcepts = finalSite ? ['04', '05'] : ['04', '07', '09', '12', '14', '15', '19', '23', '25'];
    const plateConcepts = finalSite ? ['02', '03', '05'] : ['03', '05', '06', '08', '10', '13', '18', '22', '24', '25'];
    body.classList.toggle('artifact-ticket-focus', ticketConcepts.includes(concept));
    body.classList.toggle('artifact-plate-focus', plateConcepts.includes(concept));
    body.dataset.motionFocus = ticketConcepts.includes(concept) && plateConcepts.includes(concept) ? 'both' : ticketConcepts.includes(concept) ? 'ticket' : plateConcepts.includes(concept) ? 'plate' : 'ambient';
    if (syncUrl && !qaMode && !studyMode && location.hash !== `#${id}`) {
      history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
    }
    if (changed) reportStudy('concept_visible', { concept: scene.dataset.concept });
  }

  function applyTheme(section) {
    if (!section?.dataset.theme) return;
    const nextTheme = section.dataset.theme;
    const nextLabel = section.dataset.themeLabel || 'Wirtschaft Dornbirn';
    const nextMood = section.dataset.themeMood || 'Essen · Trinken · Livekultur';
    const changed = body.dataset.theme !== nextTheme;
    body.dataset.theme = nextTheme;
    if (themeStatusLabel) themeStatusLabel.textContent = nextLabel;
    if (themeStatusMood) themeStatusMood.textContent = nextMood;
    if (!changed) return;
    body.classList.add('theme-changing');
    window.clearTimeout(themeTransitionTimer);
    themeTransitionTimer = window.setTimeout(() => body.classList.remove('theme-changing'), 520);
    window.dispatchEvent(new CustomEvent('wirtschaft:themechange', {
      detail: { theme: nextTheme, label: nextLabel, mood: nextMood }
    }));
  }

  const sceneObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleScenes.set(entry.target, entry.intersectionRatio);
      else visibleScenes.delete(entry.target);
    });
    if (performance.now() < observerLockUntil || activeSceneFrame) return;
    activeSceneFrame = requestAnimationFrame(() => {
      if (performance.now() < observerLockUntil) {
        activeSceneFrame = 0;
        return;
      }
      const candidates = [...visibleScenes.keys()];
      if (candidates.length) {
        const viewportCenter = window.innerHeight / 2;
        candidates.sort((a, b) => {
          const aRect = a.getBoundingClientRect();
          const bRect = b.getBoundingClientRect();
          return Math.abs(aRect.top + aRect.height / 2 - viewportCenter) - Math.abs(bRect.top + bRect.height / 2 - viewportCenter);
        });
        setActiveScene(candidates[0], { syncUrl: true });
      }
      activeSceneFrame = 0;
    });
  }, { threshold: [0.2, 0.4, 0.6, 0.8], rootMargin: '-12% 0px -12% 0px' });
  scenes.forEach(scene => sceneObserver.observe(scene));
  railLinks[0]?.setAttribute('aria-current', 'true');

  const outerThemeSections = [...document.querySelectorAll('#start[data-theme], #feiern[data-theme], .final-decision[data-theme]')];
  const outerThemeObserver = new IntersectionObserver(entries => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (visible[0]) applyTheme(visible[0].target);
  }, { threshold: [0.35, 0.55, 0.75], rootMargin: '-18% 0px -18% 0px' });
  outerThemeSections.forEach(section => outerThemeObserver.observe(section));

  function jumpTo(target, { syncUrl = true } = {}) {
    if (!target) return;
    observerLockUntil = performance.now() + 650;
    root.classList.add('instant-scroll');
    const previousRootBehavior = root.style.scrollBehavior;
    const previousBodyBehavior = body.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    body.style.scrollBehavior = 'auto';
    window.scrollTo(0, target.offsetTop);
    void window.scrollY;
    if (target.classList.contains('concept-scene')) setActiveScene(target, { syncUrl });
    syncVisualScroll();
    requestAnimationFrame(() => {
      root.style.scrollBehavior = previousRootBehavior;
      body.style.scrollBehavior = previousBodyBehavior;
      root.classList.remove('instant-scroll');
      requestAnimationFrame(() => {
        if (target.classList.contains('concept-scene')) setActiveScene(target, { syncUrl });
      });
    });
  }

  railLinks.forEach(link => link.addEventListener('click', event => {
    const target = document.getElementById(link.dataset.target);
    if (!target) return;
    event.preventDefault();
    jumpTo(target);
  }));

  mobileSelect?.addEventListener('change', () => {
    jumpTo(document.getElementById(mobileSelect.value));
  });

  function setMotionOff(off) {
    body.classList.toggle('motion-off', off);
    if (motionToggle) {
      motionToggle.setAttribute('aria-pressed', String(off));
      motionToggle.textContent = off ? 'Motion aus' : 'Motion an';
    }
    if (off) syncVisualScroll();
    else requestMotionFrame();
    window.dispatchEvent(new CustomEvent('wirtschaft:motionchange', { detail: { off } }));
  }
  setMotionOff(reducedPreference.matches);
  motionToggle?.addEventListener('click', () => setMotionOff(!body.classList.contains('motion-off')));
  reducedPreference.addEventListener?.('change', event => setMotionOff(event.matches));

  const bookingDate = document.getElementById('bookingDate');
  const timeChoices = document.getElementById('timeChoices');
  const guestChoices = document.getElementById('guestChoices');
  const tableChoices = document.getElementById('tableChoices');
  const reservationMessage = document.getElementById('reservationMessage');
  const guestAvailabilityMessage = document.getElementById('guestAvailabilityMessage');
  let selectedTime = '';
  let selectedGuests = '';
  let selectedTable = '';

  if (bookingDate) {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    bookingDate.min = localDate;
    bookingDate.value = localDate;
  }

  function selectChoice(container, button) {
    container.querySelectorAll('button').forEach(item => {
      item.classList.toggle('selected', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    });
  }

  function updateAvailability() {
    if (!guestAvailabilityMessage) return;
    if (!bookingDate?.value || !selectedTime || !selectedGuests) {
      guestAvailabilityMessage.textContent = 'Datum, Zeit und Personenzahl auswählen.';
      return;
    }
    guestAvailabilityMessage.textContent = 'Die Verfügbarkeit wird persönlich bestätigt. Für eine sofortige Online-Reservierung bitte das Buchungssystem öffnen.';
  }

  timeChoices?.addEventListener('click', event => {
    const button = event.target.closest('button[data-value]');
    if (!button) return;
    selectedTime = button.dataset.value;
    selectChoice(timeChoices, button);
    updateAvailability();
  });

  function renderTables(guests) {
    const options = {
      '2': [['Fenster · T03', 'T03'], ['Bühne · T06', 'T06'], ['Ruhig · T08', 'T08']],
      '4': [['Fenster · T10', 'T10'], ['Mitte · T12', 'T12'], ['Bühne · T14', 'T14']],
      '6': [['Langer Tisch · T16', 'T16'], ['Mitte · T17', 'T17']],
      '10': [['Großer Tisch · T19', 'T19'], ['Kombi · T02 + T03', 'T02+T03']]
    }[guests] || [];
    selectedTable = '';
    tableChoices.innerHTML = options.map(([label, value]) => `<button type="button" data-table="${value}" aria-pressed="false">${label}</button>`).join('');
  }

  function selectGuestCount(value) {
    const button = guestChoices?.querySelector(`[data-value="${value}"]`);
    if (!button) return;
    selectedGuests = value;
    selectChoice(guestChoices, button);
    renderTables(value);
    updateAvailability();
  }

  guestChoices?.addEventListener('click', event => {
    const button = event.target.closest('button[data-value]');
    if (button) selectGuestCount(button.dataset.value);
  });

  tableChoices?.addEventListener('click', event => {
    const button = event.target.closest('button[data-table]');
    if (!button) return;
    selectedTable = button.dataset.table;
    selectChoice(tableChoices, button);
  });

  bookingDate?.addEventListener('change', updateAvailability);

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));





  // Mittag-Aufklappmenue: ein Ziel in der Leiste, zwei Wege dahinter.
  // Klick oeffnet (auch am Handy), Maus darf am Desktop schweben,
  // Escape und ein Klick daneben schliessen.
  const navDrop = document.querySelector('.nav-drop');
  if (navDrop) {
    const knopf = navDrop.querySelector('button');
    const menue = navDrop.querySelector('.nav-drop-menu');
    // Wo die Seite stand, als das Menue aufging: iOS Safari bewegt beim
    // Tippen seine eigenen Leisten und feuert dabei Scroll-Ereignisse um
    // wenige Pixel - das Menue ging auf und im selben Moment wieder zu,
    // der Weg zur Reservierung war am iPhone schlicht nicht erreichbar.
    // Geschlossen wird deshalb erst, wenn wirklich GESCROLLT wurde.
    let offenBei = 0;
    const setze = offen => {
      knopf.setAttribute('aria-expanded', String(offen));
      menue.hidden = !offen;
      if (offen) offenBei = window.scrollY;
    };
    knopf.addEventListener('click', () => setze(menue.hidden));
    menue.querySelectorAll('button, a').forEach(el => el.addEventListener('click', () => setze(false)));
    // Wegfahren schliesst - aber nur, wenn es vorher per Klick geoeffnet wurde.
    let verlassen = 0;
    navDrop.addEventListener('mouseleave', () => {
      clearTimeout(verlassen);
      verlassen = setTimeout(() => setze(false), 260);
    });
    navDrop.addEventListener('mouseenter', () => clearTimeout(verlassen));
    // Beim Scrollen ebenfalls schliessen: wer weitergeht, braucht es nicht
    // mehr. Aber erst ab einer echten Strecke, siehe oben.
    addEventListener('scroll', () => {
      if (!menue.hidden && Math.abs(window.scrollY - offenBei) > 40) setze(false);
    }, { passive: true });
    document.addEventListener('click', e => { if (!navDrop.contains(e.target)) setze(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setze(false); });
  }

  // Hoerprobe: die Kachel zeigt sich nur, wenn die Datei wirklich daliegt.
  // Wolfgang legt spaeter assets/hoerprobe.mp4 ab - mehr braucht es nicht.
  const hoerprobe = document.getElementById('hoerprobe');
  if (hoerprobe) {
    const video = hoerprobe.querySelector('video');
    video.addEventListener('loadedmetadata', () => { hoerprobe.hidden = false; });
    video.addEventListener('error', () => { hoerprobe.hidden = true; });
  }

  // Der kleine Neu-Hinweis im Kopf: immer das naechste, das wirklich ansteht.
  // Er pflegt sich selbst aus den Eventdaten - ein veralteter Hinweis waere
  // schlimmer als keiner.
  // Welche Termine ein eigenes Bild haben - dieselbe Quelle wie die
  // Eventuebersicht. Einmal geholt, danach aus dem Versprechen gelesen.
  const eventBilder = fetch('data/event-medien.json', { cache: 'no-store' })
    .then(antwort => antwort.json())
    .then(medien => new Set(medien?.bilder || []))
    .catch(() => new Set());

  function syncBarNews() {
    const chip = document.getElementById('barNews');
    const text = document.getElementById('barNewsText');
    if (!chip || !text) return;
    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    // Der Hinweis wirbt - also nur fuer Termine, die man noch bekommen kann.
    // Ein ausverkaufter Abend als "Neu" fuehrt Gaeste in eine Sackgasse; der
    // 03.09. haengt sonst bis zum Termin oben rechts, obwohl es nichts mehr
    // zu holen gibt.
    const kommend = calendarEvents.find(item => item.status !== 'cancelled' && item.status !== 'sold_out' && new Date(`${item.date}T12:00:00`) >= heute);
    if (!kommend) return;
    text.textContent = `${kommend.title} · ${formatEventDate(kommend.date)}`;
    // Das Bild des Termins, klein. Fehlt es, springt ein Abendfoto ein -
    // dieselbe Regel wie in der Eventuebersicht, damit der Hinweis nie mit
    // einem leeren Rahmen dasteht.
    const thumb = document.getElementById('barNewsThumb');
    if (thumb) {
      // Erst fragen, dann laden: liegt fuer den Termin kein Bild vor, kommt
      // direkt das Abendfoto. Ein onerror-Rueckfall wuerde bei jedem Laden
      // eine fehlschlagende Anfrage feuern - so wie es hier vorher war.
      eventBilder.then(vorhanden => {
        thumb.src = vorhanden.has(kommend.id)
          ? `assets/events/${encodeURIComponent(kommend.id)}.webp`
          : 'assets/abend-01.webp';
        thumb.hidden = false;
      });
    }
    chip.hidden = false;
  }

  // Der Terminhinweis scrollt mit und nimmt dabei an Praesenz zu: oben liegt
  // er leise in der Leiste, auf dem Weg zum Terminabschnitt wird er heller.
  // Ein Wert (--glanz, 0 bis 1) traegt die Stufe; die Farben stehen im CSS.
  function begleiteBarNews() {
    const chip = document.getElementById('barNews');
    const ziel = document.getElementById('concept-04');
    if (!chip) return;
    // position:fixed haengt am naechsten transformierten Vorfahren - die
    // Kopfleiste bewegt sich beim Scrollen, der Hinweis wanderte deshalb mit
    // ihr aus dem Bild. Am Koerper haengt er am Fenster und bleibt stehen.
    // Die Tastaturreihenfolge bleibt dort, wo der Hinweis optisch sitzt:
    // gleich hinter der Kopfleiste, nicht hinter dem Fuss.
    if (chip.parentElement !== document.body) {
      const leiste = document.querySelector('.experience-bar');
      if (leiste && leiste.parentElement === document.body) leiste.after(chip);
      else document.body.append(chip);
    }
    // Die gesetzte Leistenhoehe (--bar-h) beschreibt die Leiste nicht mehr,
    // sobald die Navigation umbricht - dann ist sie fast doppelt so hoch und
    // der Hinweis lag dahinter. Deshalb wird die echte Hoehe gemessen.
    const wurzel = document.documentElement;
    const leiste = document.querySelector('.experience-bar');
    const setzeHoehe = () => {
      if (!leiste) return;
      chip.style.setProperty('--leiste-h', `${Math.round(leiste.getBoundingClientRect().height)}px`);
    };
    setzeHoehe();
    if (typeof ResizeObserver === 'function' && leiste) new ResizeObserver(setzeHoehe).observe(leiste);
    let frame = 0;
    const strecke = () => {
      if (!ziel) return Math.max(1, window.innerHeight);
      const oben = ziel.getBoundingClientRect().top + (document.scrollingElement?.scrollTop ?? window.scrollY);
      return Math.max(1, oben - window.innerHeight * 0.25);
    };
    const male = () => {
      frame = 0;
      const y = document.scrollingElement?.scrollTop ?? window.scrollY;
      const stufe = Math.max(0, Math.min(1, y / strecke()));
      chip.style.setProperty('--glanz', stufe.toFixed(3));
      setzeHoehe();
      // Hat der Wagen die Seite rechts verlassen, ist der Hinweis erzaehlt:
      // dann verblasst er. Scrollt man zurueck, kommt er wieder.
      // Weg, sobald der Wagen aus dem Kopfbild gefahren ist. Die Fahrt wird
      // hier NEU gerechnet, nicht aus --truck-opacity gelesen: dieses Property
      // schreibt truck-motion.js in einer eigenen rAF-Schleife, und wessen
      // Schleife zuerst laeuft, ist nicht bestimmt - der Hinweis haette sonst
      // dauerhaft den Wert des vorigen Frames gezeigt (Zustand invertiert).
      // Gleiche Formel wie dort: progress = scrollTop / (Kopfhoehe * 1.45),
      // die Ausblendung des Wagens endet bei progress 0.76.
      const kopf = document.querySelector('.final-prologue');
      const strecke2 = Math.max(1, (kopf ? kopf.offsetHeight : window.innerHeight) * 1.45);
      // 1cm = 96/2.54 ≈ 37.8px, hier 4cm ≈ 151.2px.
      const VORZEITIG = 151.2;
      chip.toggleAttribute('data-faded', (y + VORZEITIG) / strecke2 >= 0.76);
    };
    window.addEventListener('scroll', () => {
      if (!frame) frame = requestAnimationFrame(male);
    }, { passive: true });
    window.addEventListener('resize', male, { passive: true });
    male();
  }
  begleiteBarNews();

  function renderEventLists() {
    const spotlight = document.getElementById('eventSpotlight');
    const timeline = document.getElementById('eventTimeline');
    const events = calendarEvents;
    const renderTicketLink = item => {
      // Ein Termin des Hauses ohne eigenen Link bekommt keinen Ticketknopf:
      // der wuerde auf das offizielle Programm zeigen, wo er nicht steht.
      if (item.quelle === 'haus' && !item.officialUrl) return '';
      const beschriftung = item.quelle === 'haus' ? 'Details' : eventStatusLabel(item.status);
      return `<a class="event-ticket-link event-status-${escapeHtml(item.status)}" href="${escapeHtml(item.ticketUrl || item.officialUrl || eventData.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(beschriftung)} ↗</a>`;
    };
    const renderCalendarLink = item => item.status === 'cancelled' ? '' : `<button type="button" data-calendar-event="${escapeHtml(item.id)}">Zum Kalender <span>+</span></button>`;
    const renderSpotlight = item => `<article data-event-status="${escapeHtml(item.status)}"><time datetime="${escapeHtml(item.date)}"><b>${escapeHtml(item.date.slice(8, 10))}</b><span>${escapeHtml(new Intl.DateTimeFormat('de-AT', { month: 'short' }).format(new Date(`${item.date}T12:00:00`)).replace('.', '').toUpperCase())}</span></time><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.type)}</small></div>${renderTicketLink(item)}</article>`;
    const renderTimeline = item => `<article data-event-status="${escapeHtml(item.status)}"><time datetime="${escapeHtml(item.date)}"><b>${escapeHtml(item.date.slice(8, 10))}</b><span>${escapeHtml(new Intl.DateTimeFormat('de-AT', { month: 'short' }).format(new Date(`${item.date}T12:00:00`)).replace('.', '').toUpperCase())}</span></time><div><p>${escapeHtml(item.title)}</p><small>${escapeHtml(item.type)}</small></div><div class="event-actions">${renderTicketLink(item)}${renderCalendarLink(item)}</div></article>`;
    if (spotlight) spotlight.querySelectorAll('article').forEach(article => article.remove());
    if (spotlight) {
      const link = spotlight.querySelector(':scope > a');
      const heute = new Date();
      heute.setHours(0, 0, 0, 0);
      events
        .filter(item => item.status !== 'cancelled' && new Date(`${item.date}T23:59:00`) >= heute)
        .slice(0, 3)
        .forEach(item => link?.insertAdjacentHTML('beforebegin', renderSpotlight(item)));
    }
    if (timeline) timeline.innerHTML = events.map(renderTimeline).join('');
    const select = document.getElementById('ticketEvent');
    if (select) {
      select.innerHTML = events.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(formatEventDate(item.date))} · ${escapeHtml(item.title)}</option>`).join('');
    }
    document.querySelectorAll('[data-calendar-event]').forEach(button => button.addEventListener('click', () => {
      const event = calendarEvents.find(item => item.id === button.dataset.calendarEvent);
      if (event) exportCalendar([event], `${event.id}.ics`);
    }));
  }

  const officialTicketLink = document.getElementById('officialTicketLink');
  function syncOfficialTicketLink() {
    const chosenEvent = calendarEvents.find(item => item.id === ticketEvent?.value);
    if (!officialTicketLink) return;
    officialTicketLink.href = chosenEvent?.officialUrl || 'https://wirtschaft-dornbirn.at/event/';
  }

  function escapeCalendarValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function compactCalendarDate(date) {
    return date.replaceAll('-', '');
  }

  function followingCalendarDate(date) {
    const [year, month, day] = date.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return `${next.getUTCFullYear()}${String(next.getUTCMonth() + 1).padStart(2, '0')}${String(next.getUTCDate()).padStart(2, '0')}`;
  }

  function exportCalendar(events, filename) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'PRODID:-//Wirtschaft Dornbirn//Veranstaltungen//DE'];
    events.forEach(item => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:${item.id}@wirtschaft-dornbirn.at`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${compactCalendarDate(item.date)}`,
        `DTEND;VALUE=DATE:${followingCalendarDate(item.date)}`,
        `SUMMARY:${escapeCalendarValue(item.title)}`,
        `DESCRIPTION:${escapeCalendarValue(`${item.type}. Uhrzeit und Details bitte vorab bei der Wirtschaft Dornbirn bestätigen.`)}`,
        `LOCATION:${escapeCalendarValue('Wirtschaft Dornbirn, Bahnhofstraße 24, 6850 Dornbirn')}`,
        'STATUS:TENTATIVE',
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    const content = `${lines.join('\r\n')}\r\n`;
    window.__LAST_CALENDAR_EXPORT__ = { filename, count: events.length, ids: events.map(item => item.id), content };
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(events.length === 1 ? 'Kalenderdatei für den Termin erstellt.' : 'Kalenderdatei mit allen Terminen erstellt.');
  }

  document.querySelectorAll('[data-calendar-event]').forEach(button => button.addEventListener('click', () => {
    const event = calendarEvents.find(item => item.id === button.dataset.calendarEvent);
    if (event) exportCalendar([event], `${event.id}.ics`);
  }));
  document.getElementById('allEventsCalendar')?.addEventListener('click', () => exportCalendar(calendarEvents, 'wirtschaft-dornbirn-events-2026.ics'));

  const ticketEvent = document.getElementById('ticketEvent');
  ticketEvent?.addEventListener('change', syncOfficialTicketLink);
  syncOfficialTicketLink();
  renderEventLists();
  syncOfficialTicketLink();
  document.getElementById('selectedEventCalendar')?.addEventListener('click', () => {
    const event = calendarEvents.find(item => item.id === ticketEvent?.value);
    if (event) exportCalendar([event], `${event.id}.ics`);
  });
  const ticketDetail = document.querySelector('[data-ticket-detail]');
  function renderTicketDetail() {
    if (!ticketDetail) return;
    const event = calendarEvents.find(item => item.id === ticketEvent?.value);
    if (!event) { ticketDetail.innerHTML = ''; return; }
    const statusNote = {
      teilweise: 'Eine Kategorie ist ausverkauft – für sie führt der Veranstalter eine Warteliste. Die übrigen sind buchbar.',
      waitlist: 'Für diesen Abend führt der Veranstalter eine Warteliste.',
      sold_out: 'Dieser Abend ist ausverkauft. Der Veranstalter führt eine Warteliste.',
      cancelled: 'Dieser Termin wurde abgesagt.'
    }[event.status] || '';
    // Je Ticketart, so wie es der Veranstalter auch fuehrt. Ein pauschales
    // "Warteliste" ueber den ganzen Abend haelt Gaeste von Karten ab, die es
    // noch gibt - das stand hier vorher und war schlicht falsch.
    const tickets = Array.isArray(event.tickets) ? event.tickets : [];
    const ticketZeilen = tickets.map(ticket => {
      const weg = ticket.status === 'ausverkauft';
      const preis = `${String(ticket.preis).replace('.', ',')} €`;
      return `<li class="ticket-art${weg ? ' is-weg' : ''}">
        <span>${escapeHtml(ticket.name)}</span>
        <b>${escapeHtml(preis)}</b>
        <small>${weg ? 'ausverkauft · Warteliste' : `buchbar${ticket.beginn ? ` · ab ${escapeHtml(ticket.beginn)}` : ''}`}</small>
      </li>`;
    }).join('');
    ticketDetail.innerHTML = `<p class="ticket-detail-date">${escapeHtml(formatEventDate(event.date))} · ${escapeHtml(event.type)}</p>
      <p class="ticket-detail-title">${escapeHtml(event.title)}</p>
      ${statusNote ? `<p class="ticket-detail-status">${escapeHtml(statusNote)}</p>` : ''}
      ${ticketZeilen ? `<ul class="ticket-arten">${ticketZeilen}</ul>` : ''}
      <p class="ticket-detail-note">Buchung, Warteliste und Einlasszeiten laufen über die offizielle Eventseite.</p>`;
  }
  ticketEvent?.addEventListener('change', renderTicketDetail);
  renderTicketDetail();
  document.querySelectorAll('a[href="#impressum"]').forEach(link => {
    link.addEventListener('click', () => reportStudy('imprint_click', { concept: body.dataset.concept || requestedConcept || '01' }));
  });
  const requestedId = /^\d{2}$/.test(requestedConcept || '') ? `concept-${requestedConcept}` : '';
  const hashId = /^#concept-\d{2}$/.test(location.hash) ? location.hash.slice(1) : '';
  const initialScene = document.getElementById(requestedId || hashId);
  if (initialScene) {
    setActiveScene(initialScene);
    requestAnimationFrame(() => jumpTo(initialScene, { syncUrl: false }));
  } else if (location.hash === '#feiern') {
    observerLockUntil = performance.now() + 1000;
    requestAnimationFrame(() => jumpTo(document.getElementById('feiern'), { syncUrl: false }));
  }
  window.addEventListener('hashchange', () => {
    if (/^#concept-\d{2}$/.test(location.hash) || location.hash === '#feiern') {
      jumpTo(document.getElementById(location.hash.slice(1)), { syncUrl: false });
    }
  });
  if (window.scrollY < (scenes[0]?.offsetTop || 0) * .45) applyTheme(document.getElementById('start'));
  if (requestedDialog && Object.hasOwn(dialogs, requestedDialog)) {
    window.setTimeout(() => openDialog(requestedDialog, null), 220);
  }
  // Die eigenen Termine des Hauses, vom Wirt in seiner Ansicht angesetzt.
  // Sie kommen vom Dienst und werden nach Datum zwischen die offiziellen
  // Abende einsortiert. Scheitert der Abruf, fehlt nur diese Ergaenzung -
  // die Seite selbst bleibt, wie sie ist.
  let hausEvents = [];
  const mischeHausEvents = () => {
    const eigene = hausEvents.filter(event => !calendarEvents.some(alt => alt.id === event.id));
    if (!eigene.length) return;
    calendarEvents = [...calendarEvents.filter(event => event.quelle !== 'haus'), ...hausEvents]
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    renderEventLists();
  };
  // Das Kalender-Abo zeigt auf DIESE Herkunft - fest auf die echte Domain
  // verdrahtet war es ein totes Abo, solange die Datei dort nicht liegt.
  // webcal:// ist http(s) mit anderem Schema; die Adresse entsteht deshalb
  // zur Laufzeit aus der eigenen.
  const abo = document.getElementById('calendarSubscribe');
  if (abo) {
    abo.href = `webcal://${location.host}${location.pathname.replace(/[^/]*$/, '')}wirtschaft-events.ics`;
  }

  fetch('data/haus.json', { cache: 'no-store' })
    .then(antwort => antwort.json())
    .then(daten => {
      const basis = String(daten?.api || '').trim().replace(/\/+$/, '');
      if (!/^https?:\/\//.test(basis)) return;
      // Das Mittagsfenster kommt vom Dienst: stellt der Wirt es um, steht es
      // hier ohne neuen Seitenaufbau richtig. Ohne Dienst bleibt der Text
      // aus dem HTML stehen - der stimmt als Vorgabe.
      fetch(`${basis}/api/oeffnung`, { cache: 'no-store' })
        .then(antwort => antwort.json())
        .then(zeiten => {
          if (!zeiten?.ok || !zeiten.von || !zeiten.bis) return;
          const anzeige = document.querySelector('[data-opening-hours] time');
          if (!anzeige) return;
          anzeige.textContent = `Mo–Fr ${zeiten.von}–${zeiten.bis}`;
          anzeige.setAttribute('datetime', `Mo-Fr ${zeiten.von}-${zeiten.bis}`);
        })
        .catch(() => { /* Anzeige behaelt die Vorgabe */ });
      return fetch(`${basis}/api/events`, { cache: 'no-store' })
        .then(antwort => antwort.json())
        .then(eigene => {
          if (!Array.isArray(eigene?.events) || !eigene.events.length) return;
          hausEvents = eigene.events;
          mischeHausEvents();
        });
    })
    .catch(() => { /* ohne Dienst einfach ohne Haus-Termine */ });

  fetch('data/events.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Eventdaten konnten nicht geladen werden (${response.status})`);
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data?.events) || !data?.pause || !data?.updatedAt) throw new Error('Eventdaten haben ein ungültiges Format');
      eventData = data;
      calendarEvents = data.events.map(item => ({ ...item }));
      renderEventLists();
      mischeHausEvents();
      syncOfficialTicketLink();
      syncServiceStatus();
      syncBarNews();
      window.dispatchEvent(new CustomEvent('wirtschaft:eventdata', { detail: { fresh: isFreshEventData(data), count: calendarEvents.length } }));
    })
    .catch(error => {
      // Kein Entwickler-Vermerk in der Oberflaeche: die hinterlegten Termine
      // stimmen, nur die Aktualisierung ist ausgeblieben.
      window.__APP_ERRORS__.push({ type: 'event-data', message: error.message });
    });
  const voucherLabels = {
    dinner: 'Dinner & Konzert/Comedy (68 Euro)',
    konzert: 'Konzert/Comedy only (28 Euro)',
    wert: 'Wertgutschein'
  };
  const voucherBoxes = [...document.querySelectorAll('[data-voucher]')];
  // Der Bestellknopf ist am 27.08. entfernt worden - der Abschnitt zeigt die
  // Gutscheine, den Weg zur Bestellung besprechen wir persoenlich. Die
  // Mengenwaehler bleiben bedienbar, deshalb muss alles hier ohne den Knopf
  // auskommen: ohne diese Pruefung stiege die Funktion aus und die Waehler
  // waeren tot.
  const voucherRequest = document.getElementById('voucherRequest');
  function syncVoucherMail() {
    if (!voucherRequest) return;
    const picked = voucherBoxes
      .filter(box => Number(box.dataset.value) > 0)
      .map(box => `${box.dataset.value} × ${voucherLabels[box.dataset.voucher]}`);
    const body = ['Guten Tag,', '', picked.length
      ? 'ich möchte folgende Gutscheine bestellen:'
      : 'ich möchte einen Gutschein bestellen.', ...picked, '',
      'Name:', 'Adresse:', '', 'Danke und freundliche Grüße'].join('\n');
    voucherRequest.href = 'mailto:willkommen@wirtschaft-dornbirn.at?subject='
      + encodeURIComponent('Gutschein bestellen') + '&body=' + encodeURIComponent(body);
  }
  voucherBoxes.forEach(box => {
    const min = Number(box.dataset.min), max = Number(box.dataset.max);
    const out = box.querySelector('output');
    const paint = () => {
      out.textContent = box.dataset.value;
      box.querySelector('[data-step="-1"]').disabled = Number(box.dataset.value) <= min;
      box.querySelector('[data-step="1"]').disabled = Number(box.dataset.value) >= max;
      syncVoucherMail();
    };
    box.addEventListener('click', e => {
      const step = e.target.closest('[data-step]');
      if (!step) return;
      box.dataset.value = String(Math.min(max, Math.max(min, Number(box.dataset.value) + Number(step.dataset.step))));
      paint();
      box.classList.add('bumped');
      window.setTimeout(() => box.classList.remove('bumped'), 180);
    });
    paint();
  });

  const lunchCardLink = document.querySelector('[data-lunch-card]');

  /* Die Startseite zeigt die Gerichte nicht mehr. Sie fuehrt zur Karte,
     statt sie abzuschreiben - Entscheidung vom 31.08.2026, und die
     Gerichteliste, die hier frueher gerendert wurde, ist mit ihr
     gegangen. Bleibt der Renderer stehen, kommt die Uebersicht beim
     naechsten Container mit data-lunch-menu still zurueck. */
  function renderLunchMenu(data) {
    // Nur eine echte Datei macht den Weg sichtbar. Frueher stand hier
    // 'mittagskarte.html' als Rueckfall - antwortete der Dienst nicht
    // rechtzeitig, oeffnete der Gast statt der Karte eine Seite, die die
    // Karte noch einmal abtippt. Wer auf "Karte als PDF" drueckt, will die
    // Karte, keine zweite Fassung davon. Ohne Datei bleibt der Weg aus:
    // gar kein Weg ist ehrlicher als ein Weg, der woandershin fuehrt.
    if (lunchCardLink && data.card?.file) {
      lunchCardLink.href = data.card.file;
      lunchCardLink.removeAttribute('hidden');
    }
  }

  fetch('data/takeaway-karte.json', { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Mittagskarte konnte nicht geladen werden (${response.status})`);
      return response.json();
    })
    .then(renderLunchMenu)
    .catch(error => {
      window.__APP_ERRORS__.push({ type: 'lunch-menu', message: error.message });
    });

  reportStudy('page_ready', { concept: initialScene?.dataset.concept || requestedConcept || '01', viewport: { width: window.innerWidth, height: window.innerHeight } });
})();
