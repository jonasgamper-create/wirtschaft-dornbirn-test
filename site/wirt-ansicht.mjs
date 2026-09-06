// Der Aufbau der Wirt-Ansicht: drei Reiter unten, und je Reiter die
// Abschnitte, die dorthin gehoeren.
//
// Warum Reiter und nicht mehr eine lange Liste mit Haken: die Ansicht war
// eine einzige Bahn zum Scrollen, und damit alles auffindbar blieb, war
// fast alles ausgeblendet. Der Wirt sah dadurch Funktionen nicht mehr, die
// es gab. Drei Reiter loesen beides - jeder Abschnitt hat einen festen Ort,
// und die Liste bleibt kurz, ohne etwas wegzunehmen.
//
// Die Aufteilung folgt der Arbeit, nicht der Technik:
//   heute - was jetzt passiert: Bestellungen und Reservierungen, abhakbar.
//   karte - die Woche: Menueplan eintragen, veroeffentlichen, drucken.
//   haus  - alles Selteneres: Tische, Zeiten, Termine, Einstellungen.
//
// Die Haken bleiben. Sie sind jetzt aber die Ausnahme (etwas dauerhaft
// wegraeumen), nicht die Voraussetzung dafuer, dass die Seite bedienbar ist.
//
// Gespeichert wird im Browser dieses Geraets, nicht im Dienst - jeder
// Bildschirm im Haus darf anders aussehen (am Tresen das Menue, in der
// Kueche der Zettel).
//
// Zwei Regeln, die den Rest erklaeren:
//  1. Ein Abschnitt, der nicht in der Liste steht, wird trotzdem gezeigt.
//     So taucht ein spaeter hinzugefuegter Kasten auf, statt still zu fehlen.
//  2. Die Einstellungen selbst lassen sich nicht ausblenden - sonst gaebe es
//     keinen Weg zurueck.

// Version im Schluessel: aendert sich der Standard, verfaellt die alte
// Einstellung auf jedem Geraet, und alle sehen dieselbe neue Ansicht.
// -4: die Reiter. Vorher war fast alles ausgeblendet, weil alles
// untereinander stand; jetzt hat jeder Abschnitt seinen Reiter und darf
// sichtbar sein.
// -5: Jonas (05.09.): auf der ersten Seite nur Takeaway und Reservierungen.
// Zahlen und Laufkundschaft sind dort nicht interessant - sie liegen jetzt
// unter "haus" und sind aus, bis jemand sie per Haken holt.
// -6: der Kasten "Klingeln" kommt dazu und steht unter "haus" ganz oben.
// -7: Tischzuweisung im Blatt standardmaessig aus (Jonas, 06.09.: keine
// Tischzuweisung in der App - wer reserviert hat und wie viele, das zaehlt).
const SCHLUESSEL = 'wirtschaft-wirt-ansicht-7';

/** Die drei Reiter, in der Reihenfolge der Leiste unten. */
export const REITER = [
  { id: 'heute', titel: 'heute' },
  { id: 'karte', titel: 'karte' },
  { id: 'haus', titel: 'haus' }
];

const REITER_IDS = new Set(REITER.map(r => r.id));

/**
 * Alle Abschnitte: wohin sie gehoeren (`reiter`) und ob sie am Anfang
 * sichtbar sind (`an`).
 *
 * Ausgeblendet sind nur noch die beiden Uebergangswege: PDF-Karte und
 * Textliste. Sie sind seit dem Menueplan ueberholt - wer sie noch braucht,
 * holt sie mit einem Haken zurueck.
 */
export const BLOECKE = [
  // heute - der Reiter, der beim Aufsperren offen ist. Nur EINE Liste:
  // Takeaway und Reservierungen, je Zeile ein Knopf zum Abhaken.
  { id: 'heute', titel: 'Bestellungen & Reservierungen des Tages', an: true, reiter: 'heute' },

  // karte - die Woche.
  { id: 'planKasten', titel: 'Menüplan der Woche', an: true, reiter: 'karte' },
  { id: 'karteKasten', titel: 'Mittagskarte als PDF (Übergang)', an: false, reiter: 'karte' },
  { id: 'textKasten', titel: 'Gerichte als Textliste (Übergang)', an: false, reiter: 'karte' },

  // haus - alles, was man selten braucht und dann sofort finden muss.
  // Zahlen und Laufkundschaft: fuer den Alltag nicht interessant (Jonas,
  // 05.09.), deshalb aus - wer sie will, setzt den Haken.
  { id: 'pushKasten', titel: 'Klingeln bei neuer Bestellung', an: true, reiter: 'haus' },
  { id: 'zahlen', titel: 'Zahlen des Tages', an: false, reiter: 'haus' },
  { id: 'laufkunde', titel: 'Laufkundschaft eintragen', an: false, reiter: 'haus' },
  { id: 'zettelKasten', titel: 'Küchenzettel', an: true, reiter: 'haus' },
  { id: 'eventKasten', titel: 'Eigene Termine', an: true, reiter: 'haus' },
  { id: 'oeffnungKasten', titel: 'Öffnungszeiten', an: true, reiter: 'haus' },
  { id: 'zuKasten', titel: 'Zusperren – wenn ein Mittag ausfällt', an: true, reiter: 'haus' },
  { id: 'bestandKasten', titel: 'Tische & Stühle – was das Haus hat', an: true, reiter: 'haus' },
  { id: 'sperreKasten', titel: 'Tische sperren', an: true, reiter: 'haus' },
  { id: 'tischzuweisung', titel: 'Tischzuweisung im Gästeblatt', an: false, reiter: 'haus', ohneBlock: true },
  { id: 'fertigKasten', titel: 'Wer meldet, dass das Essen fertig ist', an: true, reiter: 'haus' }
];

const reiterVon = id => BLOECKE.find(b => b.id === id)?.reiter || 'haus';

const vorgabe = () => ({
  reihenfolge: BLOECKE.map(b => b.id),
  aus: BLOECKE.filter(b => !b.an).map(b => b.id)
});

/** Die gespeicherte Einstellung, oder die Vorgabe. Nie ein Fehler. */
export function liesAnsicht() {
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) || 'null');
    if (!roh) return vorgabe();
    const bekannt = new Set(BLOECKE.map(b => b.id));
    // Nur bekannte Kennungen, und was in der Einstellung fehlt, kommt hinten
    // dazu: ein neuer Kasten verschwindet sonst still bei jedem, der die
    // Ansicht schon einmal gespeichert hat.
    const reihenfolge = [...new Set((roh.reihenfolge || []).filter(id => bekannt.has(id)))];
    for (const b of BLOECKE) if (!reihenfolge.includes(b.id)) reihenfolge.push(b.id);
    return { reihenfolge, aus: (roh.aus || []).filter(id => bekannt.has(id)) };
  } catch {
    return vorgabe();
  }
}

function schreibAnsicht(ansicht) {
  try { localStorage.setItem(SCHLUESSEL, JSON.stringify(ansicht)); } catch { /* privater Modus */ }
}

export const istAn = (ansicht, id) => !ansicht.aus.includes(id);

// Welcher Reiter gerade offen ist. Bewusst nicht gespeichert: die Ansicht
// wird aufgemacht, um zu sehen, was ansteht - sie startet immer bei "heute".
let offenerReiter = 'heute';

export const offener = () => offenerReiter;

/**
 * Setzt Reihenfolge und Sichtbarkeit um.
 *
 * Sichtbar ist ein Abschnitt, wenn sein Haken gesetzt ist UND sein Reiter
 * offen ist. Das laeuft ueber `hidden`, nicht ueber eine CSS-Regel: die
 * Abschnitte haben verschiedene Darstellungsarten (die Zahlen sind ein
 * Raster, die Werkzeuge Bloecke), und eine CSS-Regel muesste sie beim
 * Einblenden alle auf denselben Wert zwingen.
 */
export function wendeAn(ansicht) {
  const behaelter = document.getElementById('wirtBloecke');
  if (behaelter) {
    for (const id of ansicht.reihenfolge) {
      const block = behaelter.querySelector(`[data-block="${id}"]`);
      if (!block) continue;
      block.dataset.reiter = reiterVon(id);
      behaelter.append(block); // in der gespeicherten Reihenfolge ans Ende
    }
    // Die Einstellungen stehen immer zuletzt - sie sind der Weg zurueck.
    const einstellungen = behaelter.querySelector('[data-block="einstellungen"]');
    if (einstellungen) {
      einstellungen.dataset.reiter = 'haus';
      behaelter.append(einstellungen);
    }
  }

  // Alles mit einem Reiter - auch die losen Teile ausserhalb des Behaelters
  // (Fusszeile, "Tag leeren"), die im HTML ihren Reiter mitbringen.
  for (const el of document.querySelectorAll('[data-reiter]')) {
    const kennung = el.dataset.block;
    const erlaubt = !kennung || kennung === 'einstellungen' || istAn(ansicht, kennung);
    el.hidden = !erlaubt || el.dataset.reiter !== offenerReiter;
  }

  // Die Tischzuweisung ist kein eigener Kasten, sondern ein Teil des
  // Gaesteblatts. Sie haengt am selben Schalter.
  document.body.classList.toggle('ohne-tischzuweisung', !istAn(ansicht, 'tischzuweisung'));
}

/** Reiter wechseln: umschalten, neu anwenden, nach oben. */
export function zeigeReiter(id, ansicht = liesAnsicht()) {
  if (!REITER_IDS.has(id)) return;
  offenerReiter = id;
  document.body.dataset.reiter = id;
  for (const knopf of document.querySelectorAll('.reiter-knopf')) {
    knopf.setAttribute('aria-selected', String(knopf.dataset.ziel === id));
  }
  wendeAn(ansicht);
  window.scrollTo({ top: 0 });
}

/** Die Leiste unten verdrahten. */
export function verdrahteReiter(hollAnsicht = liesAnsicht) {
  const leiste = document.getElementById('reiterLeiste');
  if (!leiste) return;
  leiste.addEventListener('click', ereignis => {
    const knopf = ereignis.target.closest('.reiter-knopf');
    if (knopf) zeigeReiter(knopf.dataset.ziel, hollAnsicht());
  });
  zeigeReiter(offenerReiter, hollAnsicht());
}

/**
 * Die Zahl am Reiter "heute": wie viel noch offen ist.
 *
 * Sie ist der Grund, warum man die App ueberhaupt aufmacht - und sie muss
 * auch dann stimmen, wenn gerade die Karte offen ist.
 */
export function setzeHeuteZahl(anzahl) {
  const zeichen = document.getElementById('heuteZahl');
  if (!zeichen) return;
  zeichen.textContent = anzahl > 0 ? String(anzahl) : '';
  zeichen.hidden = !(anzahl > 0);
}

const el = (tag, attribute = {}, ...kinder) => {
  const knoten = document.createElement(tag);
  for (const [name, wert] of Object.entries(attribute)) {
    if (name === 'text') knoten.textContent = wert;
    else if (name === 'class') knoten.className = wert;
    else knoten.setAttribute(name, wert);
  }
  knoten.append(...kinder);
  return knoten;
};

/**
 * Der Einstellungskasten: je Abschnitt ein Haken und zwei Pfeile.
 *
 * Warum Pfeile und kein Ziehen: am Telefon ist Ziehen in einer langen
 * Liste, die selbst scrollt, kaum treffsicher - und die Ansicht wird oft
 * genau dort eingerichtet. Zwei Knoepfe treffen immer.
 *
 * Die Abschnitte stehen nach Reiter gruppiert - ohne die Ueberschrift
 * waere nicht zu sehen, warum ein Haken einen Kasten sichtbar macht, den
 * man auf dem offenen Reiter trotzdem nicht findet.
 */
export function zeichneEinstellungen(wurzel, beiAenderung) {
  let ansicht = liesAnsicht();

  const male = () => {
    wurzel.textContent = '';

    for (const reiter of REITER) {
      const drin = ansicht.reihenfolge.filter(id => reiterVon(id) === reiter.id);
      if (!drin.length) continue;
      wurzel.append(el('p', { class: 'ansicht-reiter', text: reiter.titel }));
      const liste = el('ul', { class: 'ansicht-liste' });

      for (const id of drin) {
        const block = BLOECKE.find(b => b.id === id);
        if (!block) continue;
        const platz = ansicht.reihenfolge.indexOf(id);
        const zeile = el('li', { class: 'ansicht-zeile' });

        const haken = el('input', { type: 'checkbox', id: `ansicht-${id}` });
        haken.checked = istAn(ansicht, id);
        haken.addEventListener('change', () => {
          ansicht = {
            ...ansicht,
            aus: haken.checked ? ansicht.aus.filter(x => x !== id) : [...ansicht.aus, id]
          };
          speichern();
        });

        const hoch = el('button', { type: 'button', class: 'ansicht-pfeil', 'aria-label': `${block.titel} nach oben`, text: '↑' });
        const runter = el('button', { type: 'button', class: 'ansicht-pfeil', 'aria-label': `${block.titel} nach unten`, text: '↓' });
        // Verschoben wird nur innerhalb des eigenen Reiters: ein Kasten, der
        // vor dem ersten Kasten eines anderen Reiters landet, waere an
        // seinem Platz unsichtbar - die Pfeile taeten dann scheinbar nichts.
        const nachbar = richtung => {
          const eigene = drin.indexOf(id);
          const ziel = drin[eigene + richtung];
          return ziel === undefined ? -1 : ansicht.reihenfolge.indexOf(ziel);
        };
        hoch.disabled = nachbar(-1) < 0;
        runter.disabled = nachbar(1) < 0;
        const tausche = ziel => {
          if (ziel < 0) return;
          const neu = [...ansicht.reihenfolge];
          [neu[platz], neu[ziel]] = [neu[ziel], neu[platz]];
          ansicht = { ...ansicht, reihenfolge: neu };
          speichern();
        };
        hoch.addEventListener('click', () => tausche(nachbar(-1)));
        runter.addEventListener('click', () => tausche(nachbar(1)));

        zeile.append(
          el('label', { class: 'ansicht-name', for: `ansicht-${id}` }, haken, el('span', { text: block.titel })),
          el('span', { class: 'ansicht-pfeile' }, hoch, runter)
        );
        liste.append(zeile);
      }
      wurzel.append(liste);
    }

    const zurueck = el('button', { type: 'button', class: 'knopf leise klein', text: 'Auf Standard zurücksetzen' });
    zurueck.addEventListener('click', () => { ansicht = vorgabe(); speichern(); });
    wurzel.append(zurueck);
  };

  function speichern() {
    schreibAnsicht(ansicht);
    wendeAn(ansicht);
    male();
    beiAenderung?.(ansicht);
  }

  male();
  return () => ansicht;
}
