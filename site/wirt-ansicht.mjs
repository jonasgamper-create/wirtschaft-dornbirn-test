// Welche Abschnitte der Wirt-Ansicht sichtbar sind und in welcher Reihenfolge
// sie stehen. Der Wirt stellt das selbst ein; gespeichert wird im Browser
// dieses Geraets, nicht im Dienst - jeder Bildschirm im Haus darf anders
// aussehen (am Tresen das Menue, in der Kueche der Zettel).
//
// Zwei Regeln, die den Rest erklaeren:
//  1. Ein Abschnitt, der nicht in der Liste steht, wird trotzdem gezeigt.
//     So taucht ein spaeter hinzugefuegter Kasten auf, statt still zu fehlen.
//  2. Die Einstellungen selbst lassen sich nicht ausblenden - sonst gaebe es
//     keinen Weg zurueck.

const SCHLUESSEL = 'wirtschaft-wirt-ansicht';

/**
 * Alle Abschnitte in ihrer Grundreihenfolge. `an` ist der Startzustand:
 * das Menue eintragen steht im Vordergrund, daneben der Tag mit allen
 * Reservierungen und Abholungen. Tisch- und Gastzuweisung liegen bewusst
 * aus (Wunsch vom 04.09.) - sie sind Werkzeug, nicht Alltag.
 */
export const BLOECKE = [
  // Die Zahlen zuerst: sie laufen ueber beide Spalten und sind die Kopfzeile
  // des Tages. Stuenden sie mittendrin, risse das Raster dort auseinander.
  { id: 'zahlen', titel: 'Zahlen des Tages', an: true },
  { id: 'planKasten', titel: 'Menüplan der Woche', an: true },
  { id: 'heute', titel: 'Der Tag – wer reserviert hat und wer abholt', an: true },
  { id: 'laufkunde', titel: 'Laufkundschaft eintragen', an: true },
  { id: 'zettelKasten', titel: 'Küchenzettel', an: true },
  { id: 'eventKasten', titel: 'Eigene Termine', an: false },
  { id: 'oeffnungKasten', titel: 'Öffnungszeiten', an: false },
  { id: 'zuKasten', titel: 'Zusperren – wenn ein Mittag ausfällt', an: false },
  { id: 'bestandKasten', titel: 'Tische & Stühle – was das Haus hat', an: false },
  { id: 'sperreKasten', titel: 'Tische sperren', an: false },
  { id: 'tischzuweisung', titel: 'Tischzuweisung im Gästeblatt', an: false, ohneBlock: true },
  { id: 'fertigKasten', titel: 'Wer meldet, dass das Essen fertig ist', an: false },
  { id: 'karteKasten', titel: 'Mittagskarte als PDF (Übergang)', an: false },
  { id: 'textKasten', titel: 'Gerichte als Textliste (Übergang)', an: false }
];

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

/** Wendet Reihenfolge und Sichtbarkeit auf die Seite an. */
export function wendeAn(ansicht) {
  const behaelter = document.getElementById('wirtBloecke');
  if (!behaelter) return;
  for (const id of ansicht.reihenfolge) {
    const block = behaelter.querySelector(`[data-block="${id}"]`);
    if (!block) continue;
    block.hidden = !istAn(ansicht, id);
    behaelter.append(block); // in der gespeicherten Reihenfolge ans Ende
  }
  // Der Einstellungskasten steht immer zuletzt - er ist der Weg zurueck.
  const einstellungen = behaelter.querySelector('[data-block="einstellungen"]');
  if (einstellungen) behaelter.append(einstellungen);
  // Die Tischzuweisung ist kein eigener Kasten, sondern ein Teil des
  // Gaesteblatts. Sie haengt am selben Schalter.
  document.body.classList.toggle('ohne-tischzuweisung', !istAn(ansicht, 'tischzuweisung'));
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
 */
export function zeichneEinstellungen(wurzel, beiAenderung) {
  let ansicht = liesAnsicht();

  const male = () => {
    wurzel.textContent = '';
    const liste = el('ul', { class: 'ansicht-liste' });
    ansicht.reihenfolge.forEach((id, platz) => {
      const block = BLOECKE.find(b => b.id === id);
      if (!block) return;
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
      hoch.disabled = platz === 0;
      runter.disabled = platz === ansicht.reihenfolge.length - 1;
      const tausche = ziel => {
        const neu = [...ansicht.reihenfolge];
        [neu[platz], neu[ziel]] = [neu[ziel], neu[platz]];
        ansicht = { ...ansicht, reihenfolge: neu };
        speichern();
      };
      hoch.addEventListener('click', () => tausche(platz - 1));
      runter.addEventListener('click', () => tausche(platz + 1));

      zeile.append(
        el('label', { class: 'ansicht-name', for: `ansicht-${id}` }, haken, el('span', { text: block.titel })),
        el('span', { class: 'ansicht-pfeile' }, hoch, runter)
      );
      liste.append(zeile);
    });
    wurzel.append(liste);

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
