(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.final-prologue');
  const truck = document.querySelector('[data-hero-arrival]');
  const cateringSection = document.querySelector('#foodtruck');
  const cateringTruck = document.querySelector('[data-catering-truck]');
  const eventSection = document.querySelector('#concept-04');
  const eventReels = document.querySelector('.event-mini-reels');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  if (!hero || !truck) return;

  // Geometrie einmal messen. Vorher las jede Bildberechnung
  // getBoundingClientRect, offsetHeight und scrollHeight - jeweils nachdem
  // im selben Frame schon Styles geschrieben waren.
  let geo = { heroTravel: 1, laneStart: 0, laneEnd: 1, truckVw: 26, vh: 0 };
  function measure() {
    geo.vh = window.innerHeight;
    geo.heroTravel = Math.max(1, hero.offsetHeight * 1.45);
    if (cateringSection && cateringTruck) {
      const rect = cateringSection.getBoundingClientRect();
      const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
      const sectionTop = rect.top + scrollTop;
      const laneTop = sectionTop + cateringSection.offsetHeight * .12;
      geo.laneStart = laneTop - geo.vh;
      geo.laneEnd = Math.max(geo.laneStart + 1, document.documentElement.scrollHeight - geo.vh);
      geo.truckVw = cateringTruck.offsetWidth / Math.max(1, window.innerWidth) * 100;
    }
  }

  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const n = clamp(value);
    return n * n * (3 - 2 * n);
  };

  function render() {
    frame = 0;
    const travel = geo.heroTravel;
    const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
    const progress = clamp(scrollTop / travel);
    root.style.setProperty('--truck-progress', progress.toFixed(3));
    if (reduced.matches || document.body.classList.contains('motion-off')) {
      root.style.setProperty('--truck-progress', '0');
      root.style.setProperty('--truck-copy-opacity', '1');
      root.style.setProperty('--truck-copy-y', '0px');
      root.style.setProperty('--truck-x', '18vw');
      root.style.setProperty('--truck-y', '0px');
      root.style.setProperty('--truck-tilt', '0deg');
      root.style.setProperty('--wheel-rotate', '0deg');
      root.style.setProperty('--note-flight', '0');
      root.style.setProperty('--note-opacity', '0');
      root.style.setProperty('--truck-open', '0');
      root.style.setProperty('--truck-opacity', '1');
      truck.dataset.truckState = 'moving';
      renderCatering(true);
      renderEventReels(true);
      return;
    }

    const open = 0;
    // A single monotone rail: the truck is already visible at the first frame
    // and keeps moving left-to-right throughout the hero scroll range.
    const pass = smooth(progress / .82);
    const x = -6 + pass * 136;
    const opacity = 1 - smooth((progress - .66) / .1);
    const y = Math.sin(progress * Math.PI) * -3;
    const tilt = -1.8 + pass * 2.2 + Math.sin(progress * Math.PI * 3) * .35;
    const wheelRotate = progress * 1080;
    const noteFlight = smooth((progress - .08) / .45);
    const noteOpacity = smooth((progress - .04) / .08) * (1 - smooth((progress - .56) / .14));
    const copyOpacity = 1 - smooth((progress - .08) / .18);
    const copyY = -smooth(progress / .3) * 34;
    root.style.setProperty('--truck-x', `${x.toFixed(2)}vw`);
    root.style.setProperty('--truck-y', `${y.toFixed(2)}px`);
    root.style.setProperty('--truck-tilt', `${tilt.toFixed(2)}deg`);
    root.style.setProperty('--wheel-rotate', `${wheelRotate.toFixed(1)}deg`);
    root.style.setProperty('--note-flight', noteFlight.toFixed(3));
    root.style.setProperty('--note-opacity', noteOpacity.toFixed(3));
    root.style.setProperty('--truck-open', open.toFixed(3));
    root.style.setProperty('--truck-opacity', opacity.toFixed(3));
    root.style.setProperty('--truck-copy-opacity', copyOpacity.toFixed(3));
    root.style.setProperty('--truck-copy-y', `${copyY.toFixed(2)}px`);
    truck.dataset.truckState = open > .45 ? 'open' : progress > .05 ? 'moving' : 'waiting';
    renderCatering(false);
    renderEventReels(false);
  }

  function renderCatering(staticView = false) {
    if (!cateringSection || !cateringTruck) return;
    if (staticView) {
      root.style.setProperty('--catering-truck-x', '8vw');
      root.style.setProperty('--catering-truck-open', '0');
      root.style.setProperty('--catering-truck-opacity', '0.7');
      root.style.setProperty('--catering-truck-tilt', '0deg');
      root.style.setProperty('--catering-truck-y', '0px');
      root.style.setProperty('--catering-wheel-rotate', '0deg');
      root.style.setProperty('--catering-note-flight', '0');
      root.style.setProperty('--catering-note-opacity', '0');
      return;
    }
    // Alle Masse stammen aus measure(); pro Bild wird nur die Scrollposition
    // gelesen. Die Fahrt beginnt, sobald die Spur ins Bild kommt, und endet
    // am Seitenende, wo der Wagen sichtbar stehen bleibt.
    const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
    const start = geo.laneStart;
    const end = geo.laneEnd;
    const progress = clamp((scrollTop - start) / (end - start));
    const truckVw = geo.truckVw;
    const xStart = -truckVw - 6;
    const xEnd = Math.max(6, 100 - truckVw - 4);
    const x = xStart + smooth(progress) * (xEnd - xStart);
    const opacity = smooth((progress - .01) / .05);
    const open = 0;
    const tilt = Math.sin(progress * Math.PI * 5) * 1.1;
    const y = Math.sin(progress * Math.PI * 4) * -4;
    const noteFlight = smooth((progress - .06) / .42);
    const noteOpacity = smooth((progress - .03) / .07) * (1 - smooth((progress - .72) / .2));
    root.style.setProperty('--catering-truck-x', `${x.toFixed(2)}vw`);
    root.style.setProperty('--catering-truck-open', open.toFixed(3));
    root.style.setProperty('--catering-truck-opacity', opacity.toFixed(3));
    root.style.setProperty('--catering-truck-tilt', `${tilt.toFixed(2)}deg`);
    root.style.setProperty('--catering-truck-y', `${y.toFixed(2)}px`);
    root.style.setProperty('--catering-wheel-rotate', `${(progress * 1080).toFixed(1)}deg`);
    root.style.setProperty('--catering-note-flight', noteFlight.toFixed(3));
    root.style.setProperty('--catering-note-opacity', noteOpacity.toFixed(3));
  }

  function renderEventReels(staticView = false) {
    if (!eventSection || !eventReels) return;
    if (staticView) {
      root.style.setProperty('--event-reel-opacity', '0');
      root.style.setProperty('--event-reel-shift', '0px');
      root.style.setProperty('--event-reel-rise', '0px');
      root.style.setProperty('--event-reel-tilt', '0deg');
      return;
    }
    const rect = eventSection.getBoundingClientRect();
    const scrollTop = document.scrollingElement?.scrollTop ?? window.scrollY;
    const sectionTop = rect.top + scrollTop;
    const travel = Math.max(1, eventSection.offsetHeight + window.innerHeight * .35);
    const progress = clamp((scrollTop - sectionTop + window.innerHeight * .3) / travel);
    const reveal = smooth(progress / .28) * (1 - smooth((progress - .72) / .28));
    const shift = (progress - .25) * 42;
    const rise = (1 - smooth(progress / .55)) * 24;
    const tilt = Math.sin(progress * Math.PI * 2) * 1.6;
    root.style.setProperty('--event-reel-opacity', reveal.toFixed(3));
    root.style.setProperty('--event-reel-shift', `${shift.toFixed(2)}px`);
    root.style.setProperty('--event-reel-rise', `${rise.toFixed(2)}px`);
    root.style.setProperty('--event-reel-tilt', `${tilt.toFixed(2)}deg`);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  const remeasure = () => { measure(); schedule(); };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', remeasure, { passive: true });
  window.addEventListener('load', remeasure);
  document.querySelectorAll('img').forEach(img => {
    if (!img.complete) img.addEventListener('load', remeasure, { once: true });
  });
  reduced.addEventListener?.('change', schedule);
  window.addEventListener('wirtschaft:motionchange', schedule);
  measure();
  render();
})();

  
  (() => {
    // Das Termin-Abo. Frueher stand hier nur ein Dankestext und die Adresse
    // ging nirgendwohin - ein Formular, das Vertrauen kassiert und nichts
    // haelt. Jetzt laeuft es ueber denselben Weg wie die Wochenkarte: eigene
    // Liste, eigener Einwilligungswortlaut, gueltig erst mit dem Klick in
    // der Bestaetigungsmail.
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
        // Ohne Dienst gibt es kein Abo - dann sagt die Seite das, statt eine
        // Adresse anzunehmen, die nirgends ankommt.
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

  (() => {
    // Sprungmarken: EIN Zustaendiger. Der Lauf faengt den Klick in der
    // Capture-Phase ab, damit keine aeltere Nav-Logik dagegenarbeitet, und
    // misst das Ziel bis zum Stillstand nach — Reveals aendern sonst die Hoehen.
    const root = document.documentElement;
    const bar = document.querySelector('.experience-bar');
    const GAP = 24;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const scroller = () => document.scrollingElement || root;
    const maxY = () => Math.max(0, scroller().scrollHeight - window.innerHeight);
    const barH = () => (bar ? Math.round(bar.getBoundingClientRect().height) : 0);

    // Jeder Abschnitt ist eine eigene Buehne: das Ziel ist seine Oberkante,
    // damit weder der vorige noch der naechste Abschnitt hereinragt. Ist ein
    // Abschnitt hoeher als das Fenster, wird er dennoch oben angelegt.
    const sectionOf = el => el.closest('section') || el;

    const targetY = el => {
      if (el.id === 'start' || el.id === 'main') return 0;
      const sec = sectionOf(el);
      const top = sec.getBoundingClientRect().top + scroller().scrollTop;
      const height = sec.getBoundingClientRect().height;
      // Kuerzere Abschnitte mittig setzen, damit nichts angeschnitten wirkt.
      const slack = window.innerHeight - height;
      const y = slack > 0 ? top - slack / 2 : top;
      return Math.max(0, Math.min(maxY(), Math.round(y)));
    };

    const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    let run = 0;

    function settle(el, tries) {
      const want = targetY(el);
      if (Math.abs(want - scroller().scrollTop) > 1) window.scrollTo(0, want);
      if (tries > 0) requestAnimationFrame(() => settle(el, tries - 1));
      else root.classList.remove('instant-scroll');
    }

    function goTo(el) {
      // Reveals sofort abschliessen: danach verschieben sich keine Hoehen mehr.
      document.querySelectorAll('.reveal:not(.is-in), .luxury-reveal:not(.is-in)')
        .forEach(n => n.classList.add('is-in', 'is-visible'));
      root.classList.add('instant-scroll');
      const id = ++run;
      const from = scroller().scrollTop;
      if (reduce.matches) return settle(el, 6);
      const dur = Math.min(820, Math.max(340, Math.abs(targetY(el) - from) * 0.48));
      const t0 = performance.now();
      const step = now => {
        if (id !== run) { root.classList.remove('instant-scroll'); return; }
        const p = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, Math.round(from + (targetY(el) - from) * ease(p)));
        if (p < 1) requestAnimationFrame(step);
        else settle(el, 24);
      };
      requestAnimationFrame(step);
    }

    ['wheel', 'touchstart', 'keydown'].forEach(t =>
      window.addEventListener(t, () => { run++; }, { passive: true }));

    document.addEventListener('click', e => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href').slice(1);
      const el = id && document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      goTo(el);
      history.replaceState(null, '', '#' + id);
    }, true);

    if (location.hash.length > 1) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) requestAnimationFrame(() => setTimeout(() => {
        root.classList.add('instant-scroll');
        goTo(el);
      }, 90));
    }
  })();
