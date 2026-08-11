/* Naechste Seite vorwaermen, sobald der Zeiger ueber einen internen Link geht. */
(() => {
    const seen = new Set();
    const warm = href => {
      if (!href || seen.has(href) || !/^[\w./-]+\.html/.test(href)) return;
      seen.add(href);
      const l = document.createElement('link');
      l.rel = 'prefetch'; l.href = href; l.as = 'document';
      document.head.appendChild(l);
    };
    const onIntent = e => {
      const a = e.target.closest && e.target.closest('a[href$=".html"]');
      if (a) warm(a.getAttribute('href'));
    };
    addEventListener('pointerover', onIntent, { passive: true });
    addEventListener('touchstart', onIntent, { passive: true });
  })();
