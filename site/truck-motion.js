(() => {
  'use strict';

  const root = document.documentElement;
  const hero = document.querySelector('.final-prologue');
  const truck = document.querySelector('[data-hero-arrival]');
  const cateringSection = document.querySelector('#foodtruck');
  const cateringTruck = document.querySelector('[data-catering-truck]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;

  if (!hero || !truck) return;

  const clamp = value => Math.max(0, Math.min(1, value));
  const smooth = value => {
    const n = clamp(value);
    return n * n * (3 - 2 * n);
  };

  function render() {
    frame = 0;
    const travel = Math.max(1, hero.offsetHeight * .9);
    const progress = clamp(window.scrollY / travel);
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
      return;
    }

    const open = 0;
    // A single monotone rail: the truck is already visible at the first frame
    // and keeps moving left-to-right throughout the hero scroll range.
    const pass = smooth(progress / .82);
    const x = -6 + pass * 136;
    const opacity = 1 - smooth((progress - .84) / .12);
    const y = Math.sin(progress * Math.PI) * -3;
    const tilt = -1.8 + pass * 2.2 + Math.sin(progress * Math.PI * 3) * .35;
    const wheelRotate = progress * 1080;
    const noteFlight = smooth((progress - .08) / .45);
    const noteOpacity = smooth((progress - .04) / .08) * (1 - smooth((progress - .72) / .16));
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
    const rect = cateringSection.getBoundingClientRect();
    const sectionTop = rect.top + window.scrollY;
    const travel = Math.max(1, cateringSection.offsetHeight * .7);
    const progress = clamp((window.scrollY - sectionTop) / travel);
    const x = -52 + smooth(progress / .9) * 190;
    const opacity = smooth(progress / .08) * (1 - smooth((progress - .84) / .14));
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

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reduced.addEventListener?.('change', schedule);
  window.addEventListener('wirtschaft:motionchange', schedule);
  render();
})();
