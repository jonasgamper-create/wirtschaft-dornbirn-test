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
  const progress = document.getElementById('scrollProgress');
  const conceptRail = document.querySelector('.concept-rail');
  const railLinks = [...document.querySelectorAll('.concept-rail a')];
  const scenes = [...document.querySelectorAll('.concept-scene')];
  const reveals = [...document.querySelectorAll('.reveal')];
  const zoomSections = [...document.querySelectorAll('[data-zoom]')];
  const mobileSelect = document.getElementById('mobileConceptSelect');
  const motionToggle = document.getElementById('motionToggle');
  const themeStatusLabel = document.getElementById('themeStatusLabel');
  const themeStatusMood = document.getElementById('themeStatusMood');
  const toast = document.getElementById('toast');
  const reducedPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)');
  const inventory = window.WirtschaftData || null;
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

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  scenes.forEach(scene => {
    if (scene.querySelector('.motion-ribbon')) return;
    const ribbon = document.createElement('span');
    ribbon.className = 'motion-ribbon';
    ribbon.setAttribute('aria-hidden', 'true');
    ribbon.innerHTML = '<i></i><i></i>';
    scene.append(ribbon);
  });

  function refreshChapterBounds() {
    const firstScene = scenes[0];
    const lastScene = scenes[scenes.length - 1];
    chapterBounds = {
      firstTop: firstScene?.offsetTop || 0,
      lastBottom: lastScene ? lastScene.offsetTop + lastScene.offsetHeight : 0
    };
  }
  refreshChapterBounds();

  if (body.classList.contains('final-site')) {
    const cinematicOverlay = document.createElement('div');
    cinematicOverlay.className = 'cinematic-overlay';
    cinematicOverlay.setAttribute('aria-hidden', 'true');
    cinematicOverlay.innerHTML = '<span class="cinematic-grain"></span><span class="cinematic-vignette"></span><span class="cinematic-glow"></span>';
    body.append(cinematicOverlay);

    const staggerGroups = document.querySelectorAll('.prologue-copy, .scene-copy, .decision-copy');
    staggerGroups.forEach(group => {
      [...group.children].forEach((child, index) => {
        child.classList.add('luxury-reveal');
        child.style.setProperty('--reveal-order', Math.min(index, 6));
      });
    });

    document.querySelectorAll('.lunch-card, .day-signal, .next-event, .decision-grid button').forEach(card => {
      card.classList.add('depth-card');
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

  function openEmailRequest(subject, lines) {
    const bodyText = lines.filter(Boolean).join('\n');
    const mailto = `mailto:willkommen@wirtschaft-dornbirn.at?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
    window.__LAST_MAILTO__ = mailto;
    if (!qaMode && !studyMode) window.location.href = mailto;
    return mailto;
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
        if (eventSelect) eventSelect.value = opener.dataset.event;
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

  Object.values(dialogs).forEach(dialog => {
    dialog?.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog?.addEventListener('close', () => lastTrigger?.focus());
  });
  document.querySelectorAll('.dialog-close').forEach(button => {
    button.addEventListener('click', () => button.closest('dialog')?.close());
  });

  function updateScrollEffects(visualScrollY = smoothedScrollY) {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const globalProgress = Math.max(0, Math.min(1, visualScrollY / max));
    progress.style.transform = `scaleX(${globalProgress})`;
    root.style.setProperty('--global-scroll', globalProgress.toFixed(5));
    root.style.setProperty('--ticket-lift', `${Math.sin(globalProgress * Math.PI * 5) * 14}px`);
    root.style.setProperty('--ticket-turn', `${-5 + globalProgress * 12}deg`);
    root.style.setProperty('--plate-lift', `${Math.cos(globalProgress * Math.PI * 4) * 11}px`);
    root.style.setProperty('--plate-spin', `${globalProgress * 620}deg`);
    root.style.setProperty('--celebration-lift', `${Math.sin(globalProgress * Math.PI * 6) * 8}px`);
    root.style.setProperty('--celebration-turn', `${globalProgress * 760}deg`);
    body.classList.toggle('page-scrolled', visualScrollY > 36);
    const beforeChapters = scenes.length && visualScrollY < chapterBounds.firstTop - window.innerHeight * .58;
    const afterChapters = scenes.length && visualScrollY > chapterBounds.lastBottom - window.innerHeight * .12;
    body.classList.toggle('artifacts-hidden', Boolean(beforeChapters || afterChapters));

    if (!body.classList.contains('motion-off') && !reducedPreference.matches) {
      zoomSections.forEach(section => {
        const top = section.offsetTop - visualScrollY;
        const height = section.offsetHeight;
        const bottom = top + height;
        if (bottom <= 0 || top >= window.innerHeight) return;
        const travel = Math.max(1, height + window.innerHeight);
        const progressInSection = Math.max(0, Math.min(1, (window.innerHeight - top) / travel));
        const direction = section.dataset.zoom === 'out' ? -1 : 1;
        const zoom = 1.055 + direction * (progressInSection - .5) * .07;
        section.style.setProperty('--scene-progress', progressInSection.toFixed(4));
        section.style.setProperty('--scene-zoom', zoom.toFixed(4));
        section.style.setProperty('--zoom', zoom.toFixed(4));
        section.style.setProperty('--family-shift', `${(progressInSection - .5) * -34}px`);
      });
      scenes.forEach(scene => {
        const top = scene.offsetTop - visualScrollY;
        const height = scene.offsetHeight;
        const bottom = top + height;
        if (bottom > 0 && top < window.innerHeight) {
          const travel = Math.max(1, height + window.innerHeight);
          const local = Math.max(0, Math.min(1, (window.innerHeight - top) / travel));
          const centerDistance = Math.abs(top + height / 2 - window.innerHeight / 2);
          const sceneFocus = Math.max(0, Math.min(1, 1 - centerDistance / (window.innerHeight * .92)));
          scene.style.setProperty('--scene-local', local.toFixed(4));
          scene.style.setProperty('--scene-focus', sceneFocus.toFixed(4));
          scene.style.setProperty('--number-shift', `${(local - .5) * -46}px`);
          scene.style.setProperty('--ribbon-shift', `${(local - .5) * 110}px`);
          scene.style.setProperty('--ribbon-turn', `${-9 + local * 18}deg`);
          scene.style.setProperty('--camera-pan', `${(local - .5) * -96}px`);
          scene.style.setProperty('--film-shift', `${(local - .5) * -34}vw`);
          scene.style.setProperty('--lens-scale', (1.02 + local * .12).toFixed(4));
          scene.style.setProperty('--aperture-scale', (1.1 - local * .08).toFixed(4));
          scene.style.setProperty('--credits-shift', `${(local - .5) * -84}px`);
          scene.style.setProperty('--orbit-turn', `${-18 + local * 36}deg`);
          scene.style.setProperty('--instrument-shift', `${(local - .5) * -92}px`);
          scene.style.setProperty('--instrument-zoom', (1.16 - local * .18).toFixed(4));
          if (scene.classList.contains('chapter-stage')) {
            const focusPulse = Math.max(0, 1 - Math.abs(local - .54) * 3.2);
            scene.style.setProperty('--video-progress', local.toFixed(4));
            scene.style.setProperty('--video-pan', `${((local - .5) * -14).toFixed(2)}%`);
            scene.style.setProperty('--video-rise', `${((local - .5) * -58).toFixed(1)}px`);
            scene.style.setProperty('--video-glare', `${(local * 132 - 34).toFixed(1)}%`);
            scene.style.setProperty('--video-focus', focusPulse.toFixed(4));
          }
          const normalized = (top + height / 2 - window.innerHeight / 2) / window.innerHeight;
          scene.querySelectorAll('.parallax-media').forEach(media => {
            media.style.setProperty('--parallax', `${normalized * -26}px`);
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

  document.querySelectorAll('.concept-scene').forEach(scene => {
    scene.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch') return;
      const rect = scene.getBoundingClientRect();
      scene.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      scene.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }, { passive: true });
  });

  if (body.classList.contains('final-site') && matchMedia('(hover:hover) and (pointer:fine)').matches) {
    document.querySelectorAll('.button, .primary-action, .icon-button, .text-action').forEach(target => {
      target.classList.add('magnetic-action');
      target.addEventListener('pointermove', event => {
        if (body.classList.contains('motion-off')) return;
        const rect = target.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * .11;
        const y = (event.clientY - rect.top - rect.height / 2) * .16;
        target.style.setProperty('--magnet-x', `${x.toFixed(2)}px`);
        target.style.setProperty('--magnet-y', `${y.toFixed(2)}px`);
      }, { passive: true });
      target.addEventListener('pointerleave', () => {
        target.style.setProperty('--magnet-x', '0px');
        target.style.setProperty('--magnet-y', '0px');
      }, { passive: true });
    });

    document.querySelectorAll('.depth-card').forEach(card => {
      card.addEventListener('pointermove', event => {
        if (body.classList.contains('motion-off')) return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - .5;
        const y = (event.clientY - rect.top) / rect.height - .5;
        card.style.setProperty('--card-rx', `${(-y * 2.2).toFixed(2)}deg`);
        card.style.setProperty('--card-ry', `${(x * 2.8).toFixed(2)}deg`);
        card.style.setProperty('--card-light-x', `${((x + .5) * 100).toFixed(1)}%`);
        card.style.setProperty('--card-light-y', `${((y + .5) * 100).toFixed(1)}%`);
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--card-rx', '0deg');
        card.style.setProperty('--card-ry', '0deg');
      }, { passive: true });
    });

    window.addEventListener('pointermove', event => {
      root.style.setProperty('--cursor-x', `${event.clientX}px`);
      root.style.setProperty('--cursor-y', `${event.clientY}px`);
    }, { passive: true });
  }

  function setMotionOff(off) {
    body.classList.toggle('motion-off', off);
    motionToggle.setAttribute('aria-pressed', String(off));
    motionToggle.textContent = off ? 'Motion aus' : 'Motion an';
    if (off) syncVisualScroll();
    else requestMotionFrame();
  }
  setMotionOff(reducedPreference.matches);
  motionToggle.addEventListener('click', () => setMotionOff(!body.classList.contains('motion-off')));
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
    const state = inventory?.load();
    const id = `${bookingDate.value}-${selectedTime.replace(':', '')}`;
    const service = state?.services.find(item => item.id === id);
    const lunch = Number(selectedTime.slice(0, 2)) < 15;
    const available = service && state ? inventory.serviceAvailability(service, state.settings).available : state ? inventory.effectiveLimit(lunch ? state.settings.lunchDefaultCapacity : state.settings.dinnerDefaultCapacity, state.settings) : 20;
    guestAvailabilityMessage.textContent = Number(selectedGuests) <= available ? 'Der gewählte Termin ist für eure Anfrage verfügbar.' : 'Für diese Gruppengröße bitte kurz persönlich anrufen.';
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

  document.getElementById('reservationForm')?.addEventListener('submit', event => {
    event.preventDefault();
    if (!bookingDate.value || !selectedTime || !selectedGuests || !selectedTable) {
      reservationMessage.textContent = 'Bitte Datum, Zeit, Personenzahl und Tisch auswählen.';
      return;
    }
    const reservationName = document.getElementById('reservationName');
    const reservationEmail = document.getElementById('reservationEmail');
    const reservationPhone = document.getElementById('reservationPhone');
    if (!reservationName.value.trim() || !reservationEmail.value.trim() || !reservationEmail.validity.valid) {
      reservationMessage.textContent = 'Bitte Name und eine gültige E-Mail-Adresse ergänzen.';
      (!reservationName.value.trim() ? reservationName : reservationEmail).focus();
      return;
    }
    const payload = { date: bookingDate.value, time: selectedTime, guests: Number(selectedGuests), table: selectedTable, name: reservationName.value.trim(), email: reservationEmail.value.trim(), phone: reservationPhone.value.trim() };
    if (!qaMode && !studyMode && inventory?.recordReservationInquiry) inventory.recordReservationInquiry(payload);
    openEmailRequest(`Reservierungsanfrage · ${bookingDate.value} · ${selectedTime} Uhr`, [
      'Guten Tag liebes Team der Wirtschaft Dornbirn,', '',
      'ich möchte unverbindlich einen Tisch anfragen:',
      `Datum: ${bookingDate.value}`, `Uhrzeit: ${selectedTime} Uhr`, `Personen: ${selectedGuests}`, `Tischwunsch: ${selectedTable}`,
      `Name: ${payload.name}`, `E-Mail: ${payload.email}`, payload.phone ? `Telefon: ${payload.phone}` : '', '',
      'Bitte bestätigen Sie mir, ob der gewünschte Termin verfügbar ist.', '', 'Vielen Dank!'
    ]);
    reservationMessage.textContent = 'Die Reservierungsanfrage wurde im E-Mail-Programm vorbereitet. Bitte dort noch absenden.';
    reportStudy('reservation_complete', { concept: body.dataset.concept || requestedConcept || '01', guests: selectedGuests, time: selectedTime, table: selectedTable });
    showToast('Reservierungsanfrage ist versandbereit.');
  });

  const calendarEvents = [
    { id: 'event-2026-09-03', date: '2026-09-03', title: 'Genussroute 6850', type: 'Dornbirner Genussabend' },
    { id: 'event-2026-09-22', date: '2026-09-22', title: 'Helden reisen, Gäste speisen!', type: 'Dinner & Bühne' },
    { id: 'event-2026-09-23', date: '2026-09-23', title: 'Helden reisen, Gäste speisen! – Zusatzabend', type: 'Dinner & Bühne' },
    { id: 'event-2026-10-14', date: '2026-10-14', title: 'Dinner & Comedy', type: 'Genuss trifft Humor' },
    { id: 'event-2026-10-15', date: '2026-10-15', title: 'Christof Spörk', type: 'Kabarett in der Wirtschaft' }
  ];

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

  const ticketButtons = [...document.querySelectorAll('.ticket-list button')];
  const quantityOutput = document.getElementById('ticketQuantity');
  const ticketTotal = document.getElementById('ticketTotal');
  const ticketMessage = document.getElementById('ticketMessage');
  const ticketEvent = document.getElementById('ticketEvent');
  document.getElementById('selectedEventCalendar')?.addEventListener('click', () => {
    const event = calendarEvents.find(item => item.id === ticketEvent?.value);
    if (event) exportCalendar([event], `${event.id}.ics`);
  });
  let selectedTicket = ticketButtons[0]?.dataset.ticket || 'Show only';
  let selectedPrice = Number(ticketButtons[0]?.dataset.price || 39);
  let ticketQuantity = 2;

  function renderTicketTotal() {
    quantityOutput.textContent = ticketQuantity;
    ticketTotal.textContent = `${selectedPrice * ticketQuantity} €`;
  }

  ticketButtons.forEach(button => button.addEventListener('click', () => {
    ticketButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-checked', String(selected));
    });
    selectedTicket = button.dataset.ticket;
    selectedPrice = Number(button.dataset.price);
    renderTicketTotal();
  }));

  document.getElementById('ticketMinus')?.addEventListener('click', () => {
    ticketQuantity = Math.max(1, ticketQuantity - 1);
    renderTicketTotal();
  });
  document.getElementById('ticketPlus')?.addEventListener('click', () => {
    ticketQuantity = Math.min(10, ticketQuantity + 1);
    renderTicketTotal();
  });
  document.getElementById('ticketForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const ticketName = document.getElementById('ticketName');
    const ticketEmail = document.getElementById('ticketEmail');
    if (!ticketName.value.trim() || !ticketEmail.value.trim() || !ticketEmail.validity.valid) {
      ticketMessage.textContent = 'Bitte Name und eine gültige E-Mail-Adresse ergänzen.';
      (!ticketName.value.trim() ? ticketName : ticketEmail).focus();
      return;
    }
    const chosenEvent = calendarEvents.find(item => item.id === ticketEvent?.value);
    const payload = { eventId: ticketEvent?.value, ticket: selectedTicket, quantity: ticketQuantity, total: selectedPrice * ticketQuantity, name: ticketName.value.trim(), email: ticketEmail.value.trim() };
    if (!qaMode && !studyMode && inventory?.recordTicketInquiry) inventory.recordTicketInquiry(payload);
    openEmailRequest(`Ticketanfrage · ${chosenEvent?.title || 'Veranstaltung'}`, [
      'Guten Tag liebes Team der Wirtschaft Dornbirn,', '',
      'ich möchte unverbindlich Tickets anfragen:',
      `Veranstaltung: ${chosenEvent?.title || ticketEvent?.value}`, `Datum: ${chosenEvent?.date || ''}`, `Ticketart: ${selectedTicket}`, `Anzahl: ${ticketQuantity}`, `Voraussichtlicher Gesamtpreis: ${selectedPrice * ticketQuantity} €`,
      `Name: ${payload.name}`, `E-Mail: ${payload.email}`, '',
      'Bitte bestätigen Sie Verfügbarkeit und Preis.', '', 'Vielen Dank!'
    ]);
    ticketMessage.textContent = 'Die Ticketanfrage wurde im E-Mail-Programm vorbereitet. Bitte dort noch absenden.';
    reportStudy('ticket_complete', { concept: body.dataset.concept || requestedConcept || '01', ticket: selectedTicket, quantity: ticketQuantity, total: selectedPrice * ticketQuantity });
    showToast('Ticketanfrage ist versandbereit.');
  });

  renderTicketTotal();
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
  reportStudy('page_ready', { concept: initialScene?.dataset.concept || requestedConcept || '01', viewport: { width: window.innerWidth, height: window.innerHeight } });
})();
