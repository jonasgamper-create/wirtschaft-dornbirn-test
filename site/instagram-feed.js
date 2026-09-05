/**
 * Der Instagram-Streifen: immer der aktuelle Stand, ohne Zutun.
 *
 * Warum nicht direkt von instagram.com: eine Webseite darf fremde Seiten nicht
 * auslesen, und Instagram gibt Beitraege nur ueber seine Graph API heraus - mit
 * einem Zugangsschluessel, der niemals im Browser liegen darf. Das Holen
 * gehoert also in den Dienst des Hauses; dort laeuft es morgens um 6:00.
 *
 * Diese Datei liest in dieser Reihenfolge:
 *   1. der Dienst (/api/instagram) - der frischeste Stand,
 *   2. data/instagram.json - der hinterlegte Stand,
 *   3. was im Markup steht - damit nie eine Luecke klafft.
 *
 * Der Streifen im Markup bleibt also stehen und wird nur ersetzt, wenn wirklich
 * etwas Neues da ist. Ein leerer Streifen ist schlimmer als ein Beitrag von
 * gestern.
 */
import { apiAdresse } from './haus-api.js?v=0b5227a8';

(() => {
  'use strict';
  const band = document.querySelector('#instagram .insta-band');
  const notiz = document.querySelector('#instagram .insta-note');
  if (!band) return;

  const gueltig = eintrag => eintrag && typeof eintrag.bild === 'string' && eintrag.bild
    && typeof eintrag.link === 'string' && /^https:\/\/(www\.)?instagram\.com\//.test(eintrag.link);

  /** Liegt ein Bild bei uns, fliesst beim Ansehen nichts an Instagram. */
  const eigenerServer = bild => !/^https?:\/\//i.test(bild)
    || bild.startsWith(location.origin);

  async function hole(adresse) {
    try {
      const antwort = await fetch(adresse, { cache: 'no-store' });
      if (!antwort.ok) return null;
      const daten = await antwort.json();
      const beitraege = (Array.isArray(daten?.beitraege) ? daten.beitraege : []).filter(gueltig);
      return beitraege.length ? { beitraege, stand: daten.updatedAt || '' } : null;
    } catch {
      return null;
    }
  }

  function zeichne({ beitraege, stand }) {
    band.textContent = '';
    for (const beitrag of beitraege.slice(0, 6)) {
      const weg = document.createElement('a');
      weg.href = beitrag.link;
      weg.target = '_blank';
      weg.rel = 'noopener noreferrer';
      const bild = document.createElement('img');
      bild.src = beitrag.bild;
      bild.width = 600;
      bild.height = 600;
      bild.loading = 'lazy';
      bild.decoding = 'async';
      bild.alt = beitrag.alt || '';
      // Ein fehlendes Bild reisst sonst ein weisses Loch in den Streifen.
      bild.addEventListener('error', () => weg.remove(), { once: true });
      weg.append(bild);
      band.append(weg);
    }

    // Der Hinweis muss zur Wirklichkeit passen: kommen die Bilder von
    // Instagram, darf dort nicht stehen, dass nichts an Instagram fliesst.
    if (notiz) {
      const alleBeiUns = beitraege.every(beitrag => eigenerServer(beitrag.bild));
      const standText = stand
        ? ` stand: ${new Date(stand).toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })}.`
        : '';
      notiz.textContent = alleBeiUns
        ? `die bilder liegen auf unserem server – beim ansehen fließt nichts an instagram. der klick führt zum jeweiligen beitrag.${standText}`
        : `die bilder werden von instagram geladen – dabei erfährt instagram, dass du hier bist. der klick führt zum jeweiligen beitrag.${standText}`;
    }
  }

  (async () => {
    const basis = await apiAdresse();
    const vomDienst = basis ? await hole(`${basis}/api/instagram`) : null;
    if (vomDienst) return zeichne(vomDienst);
    const ausDatei = await hole('data/instagram.json');
    if (ausDatei) zeichne(ausDatei);
    // Sonst bleibt der Streifen aus dem Markup stehen - unveraendert.
  })();
})();
