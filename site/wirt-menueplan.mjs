// Das Formular fuer den Menueplan der Woche - gegliedert wie die Mittagskarte
// des Hauses: Woche und Preise, dann "wochengerichte" (Zeitfenster, Hinweis,
// Montag bis Freitag, Vital- und Vegi-Gericht), dann "a la carte"
// (Zeitfenster, Gerichte), unten die Fussnote. Es baut sich aus dem
// gespeicherten Plan und liest sich beim Veroeffentlichen wieder aus.
// Keine Rechenregel hier - was gilt, entscheidet der Dienst
// (server/src/menueplan.mjs); das Formular sammelt nur ein.
//
// Handy zuerst: grosse Felder, je Gericht zwei Reihen.

export const WOCHENTAGE = ['montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag'];
const MAX_JE_TAG = 3;
const MAX_VITAL = 4;
const MAX_ALACARTE = 40;

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

// Zwei Nachkommastellen, Komma: so steht der Preis auch auf der Karte.
// Nimmt Zahl wie Text ("15,90" aus einem Feld) - ohne den Tausch von Komma
// zu Punkt wurde aus der Vorgabe NaN und das Feld blieb leer.
const alsPreisText = wert => {
  if (wert === null || wert === undefined || wert === '') return '';
  const zahl = Number(String(wert).replace(',', '.'));
  return Number.isFinite(zahl) ? zahl.toFixed(2).replace('.', ',') : '';
};

function feld(name, wert, label, { hinweis = '', breit = false, dezimal = false } = {}) {
  const input = el('input', { type: 'text', 'data-feld': name, value: wert ?? '', autocomplete: 'off' });
  if (hinweis) input.placeholder = hinweis;
  if (dezimal) input.inputMode = 'decimal';
  return el('label', { class: breit ? 'plan-breit' : '' }, el('span', { text: label }), input);
}

function textfeld(name, wert, label, { hinweis = '', zeilen = 3 } = {}) {
  const feldknoten = el('textarea', { 'data-feld': name, rows: String(zeilen), spellcheck: 'false' });
  feldknoten.value = wert ?? '';
  if (hinweis) feldknoten.placeholder = hinweis;
  return el('label', { class: 'plan-breit' }, el('span', { text: label }), feldknoten);
}

/**
 * Der Haken "auch zum mitnehmen". Er entscheidet allein darueber, was im
 * Takeaway bestellbar ist - die Menuekarte und die Faltkarte zeigen immer
 * alles (Entscheidung vom 04.09.: eine Speisekarte, auf der Gerichte
 * fehlen, waere am Tisch falsch).
 */
function mitnehmHaken(gericht) {
  const kasten = document.createElement('input');
  kasten.type = 'checkbox';
  kasten.dataset.feld = 'takeaway';
  kasten.checked = gericht?.takeaway !== false;
  const label = el('label', { class: 'plan-haken' }, kasten, el('span', { text: 'auch zum mitnehmen' }));
  return label;
}

/**
 * Die Werkzeuge einer Gerichtszeile: hoch, runter, weg.
 *
 * Verschoben wird nur INNERHALB der eigenen Liste - ein Montagsgericht kann
 * nicht auf den Dienstag rutschen. Die Wochentage stehen fest von montag bis
 * freitag; jeder Tag ist eine eigene Liste. Wer ein Gericht an einen anderen
 * Tag will, traegt es dort ein und loescht es hier - das ist ein Wechsel des
 * Gerichts, keine Sortierung.
 *
 * Die Pfeile sind immer klickbar und tun am Rand nichts: ein Knopf, der mal
 * da ist und mal nicht, laesst die Zeile bei jedem Verschieben springen.
 */
function zeilenWerkzeuge(zeile) {
  const nachbarn = () => [...zeile.parentElement.querySelectorAll(':scope > .plan-gericht')];
  const schiebe = richtung => {
    const alle = nachbarn();
    const platz = alle.indexOf(zeile);
    const ziel = platz + richtung;
    if (ziel < 0 || ziel >= alle.length) return;
    if (richtung < 0) alle[ziel].before(zeile);
    else alle[ziel].after(zeile);
    zeile.querySelector('input')?.focus();
    // Kurz aufleuchten: sonst ist nach dem Klick nicht zu sehen, WAS sich
    // bewegt hat - besonders wenn die Zeile aus dem Blick springt.
    zeile.classList.remove('plan-bewegt');
    void zeile.offsetWidth;
    zeile.classList.add('plan-bewegt');
    zeile.scrollIntoView({ block: 'nearest' });
  };

  const knopf = (zeichen, label, tat) => {
    const k = el('button', { type: 'button', class: 'plan-pfeil', 'aria-label': label, text: zeichen });
    k.addEventListener('click', tat);
    return k;
  };
  const weg = el('button', { type: 'button', class: 'plan-weg', 'aria-label': 'Gericht entfernen', text: '×' });
  weg.addEventListener('click', () => {
    // Zwei Klicks: ein versehentlich geloeschtes Gericht ist beim naechsten
    // Veroeffentlichen von der Karte verschwunden.
    if (!weg.dataset.sicher) {
      weg.dataset.sicher = '1';
      weg.textContent = '×?';
      weg.classList.add('plan-weg-sicher');
      setTimeout(() => {
        delete weg.dataset.sicher;
        weg.textContent = '×';
        weg.classList.remove('plan-weg-sicher');
      }, 4000);
      return;
    }
    zeile.remove();
  });

  return el('span', { class: 'plan-werkzeuge' },
    knopf('↑', 'Gericht nach oben', () => schiebe(-1)),
    knopf('↓', 'Gericht nach unten', () => schiebe(1)),
    weg);
}

/**
 * Eine Zeile Tagesgericht: Gericht, Beilagen, Allergene, Preis.
 *
 * Der Preis steht bei JEDEM Gericht sichtbar und ist direkt aenderbar -
 * die Menues kosten nicht alle dasselbe. Eine neue Zeile kommt mit der
 * Vorgabe von oben; wer etwas anderes will, tippt es einfach drueber.
 */
function tagesZeile(gericht = {}, vorgabe = '') {
  const zeile = el('div', { class: 'plan-gericht' });
  zeile.append(
    feld('name', gericht.name, 'mittagsgericht', { hinweis: 'z. B. cordon bleu vom schwein', breit: true }),
    feld('beilage', gericht.beilage, 'beilagen', { hinweis: 'schnittlauchkartoffeln | salat', breit: true }),
    feld('allergene', gericht.allergene, 'allergene', { hinweis: 'a, c, g' }),
    feld('preis', alsPreisText(gericht.preis ?? vorgabe), 'preis', { hinweis: '15,90', dezimal: true }),
    zeilenWerkzeuge(zeile),
    mitnehmHaken(gericht)
  );
  return zeile;
}

function vitalZeile(gericht = {}, vorgabe = '') {
  const zeile = el('div', { class: 'plan-gericht' });
  zeile.append(
    feld('titel', gericht.titel ?? 'vital-gericht', 'art', { hinweis: 'vital-gericht / vegi-gericht' }),
    feld('name', gericht.name, 'gericht', { hinweis: 'lachsschnitte', breit: true }),
    feld('beilage', gericht.beilage, 'beilagen', { hinweis: 'mango-bulgur | chili-honigsauce | minzjoghurt', breit: true }),
    feld('allergene', gericht.allergene, 'allergene', { hinweis: 'a, c, l, m' }),
    feld('preis', alsPreisText(gericht.preis ?? vorgabe), 'preis', { hinweis: '15,90', dezimal: true }),
    zeilenWerkzeuge(zeile),
    mitnehmHaken(gericht)
  );
  return zeile;
}

function alacarteZeile(gericht = {}) {
  const zeile = el('div', { class: 'plan-gericht' });
  zeile.append(
    feld('name', gericht.name, 'gericht', { hinweis: 'burger „eugen“ (double smashed)', breit: true }),
    feld('beilage', gericht.beilage, 'dazu', { hinweis: 'brioche bun | cheddar | … – dazu pommes frites', breit: true }),
    feld('preis', alsPreisText(gericht.preis), 'preis', { hinweis: '18,90', dezimal: true }),
    feld('allergene', gericht.allergene, 'allergene', { hinweis: 'a, c, g' }),
    zeilenWerkzeuge(zeile),
    mitnehmHaken(gericht)
  );
  return zeile;
}

function mehrKnopf(text, liste, neueZeile, max) {
  const knopf = el('button', { type: 'button', class: 'knopf leise klein', text });
  knopf.addEventListener('click', () => {
    if (liste.children.length >= max) return;
    liste.append(neueZeile());
    liste.lastElementChild.querySelector('input')?.focus();
  });
  return knopf;
}

/** Der naechste Montag als Vorgabe - heute, wenn heute Montag ist. */
function naechsterMontag() {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7));
  const pad = zahl => String(zahl).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Baut das Formular in `wurzel` - aus dem Plan, oder leer. */
export function zeichneMenueplan(wurzel, plan = null) {
  wurzel.textContent = '';

  // 1. Woche und Preise
  const kopf = el('div', { class: 'plan-kopf' });
  const montag = el('input', { type: 'date', 'data-feld': 'montag', value: plan?.montag || naechsterMontag() });
  kopf.append(
    el('label', {}, el('span', { text: 'montag der woche' }), montag),
    feld('preis-mittag', alsPreisText(plan?.preise?.mittag ?? ''), 'vorgabe mittagsgerichte', { hinweis: '15,90 – gilt für neue zeilen', dezimal: true }),
    feld('preis-vital', alsPreisText(plan?.preise?.vital ?? ''), 'vorgabe vital & vegi', { hinweis: 'leer = wie mittag', dezimal: true })
  );
  wurzel.append(kopf);

  // 2. wochengerichte - wie auf der Karte: Zeitfenster, Hinweis, dann die Tage
  const woche = el('fieldset', { class: 'plan-woche' }, el('legend', { text: 'wochengerichte' }));
  const wocheKopf = el('div', { class: 'plan-kopf plan-kopf-2' });
  wocheKopf.append(
    feld('fenster', plan?.fenster ?? '11:30 bis 13:00 uhr', 'zeitfenster', { hinweis: '11:30 bis 13:00 uhr' }),
    feld('hinweis', plan?.hinweis ?? 'diese gerichte ändern sich wöchentlich.', 'hinweis unter dem titel', { hinweis: 'diese gerichte ändern sich wöchentlich.' })
  );
  woche.append(wocheKopf);
  // Welcher Tag heute ist - aber nur, wenn der Plan die laufende Woche
  // beschreibt. In einer Woche, die erst kommt, waere "heute" eine
  // Behauptung ueber den falschen Montag.
  const montagWert = montag.value;
  const heuteIndex = (() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(montagWert)) return -1;
    const start = new Date(`${montagWert}T12:00:00`);
    const jetzt = new Date(); jetzt.setHours(12, 0, 0, 0);
    const tage = Math.round((jetzt - start) / 86400000);
    return tage >= 0 && tage <= 4 ? tage : -1;
  })();

  const vorgabeMittag = () => wurzel.querySelector('[data-feld="preis-mittag"]')?.value || '';
  const vorgabeVital = () => wurzel.querySelector('[data-feld="preis-vital"]')?.value || vorgabeMittag();

  WOCHENTAGE.forEach((tag, i) => {
    const block = el('div', { class: 'plan-tag', 'data-tag': String(i) },
      el('h3', {}, tag, ...(i === heuteIndex ? [' ', el('span', { class: 'plan-heute', text: 'heute' })] : [])));
    if (i === heuteIndex) block.classList.add('plan-tag-heute');
    const liste = el('div', { class: 'plan-liste' });
    const gerichte = plan?.tage?.[i]?.gerichte?.length ? plan.tage[i].gerichte : [{}];
    gerichte.forEach(g => liste.append(tagesZeile(g, vorgabeMittag())));
    block.append(liste, mehrKnopf('+ gericht zur wahl („oder“)', liste, () => tagesZeile({}, vorgabeMittag()), MAX_JE_TAG));
    woche.append(block);
  });
  const vital = el('div', { class: 'plan-tag plan-vital' }, el('h3', { text: 'vital & vegi' }));
  const vitalListe = el('div', { class: 'plan-liste' });
  const vitalGerichte = plan?.vital?.length ? plan.vital : [{ titel: 'vital-gericht' }, { titel: 'vegi-gericht' }];
  vitalGerichte.forEach(g => vitalListe.append(vitalZeile(g, vorgabeVital())));
  vital.append(vitalListe, mehrKnopf('+ vital- oder vegi-gericht', vitalListe, () => vitalZeile({ titel: 'vital-gericht' }, vorgabeVital()), MAX_VITAL));
  woche.append(vital);
  wurzel.append(woche);

  // 3. a la carte - eingeklappt: sie bleibt von Woche zu Woche stehen, und
  // offen macht sie den Kasten so lang, dass alles darunter aus dem Blick
  // faellt. Ein Klick oeffnet sie.
  const alacarte = el('details', { class: 'plan-alacarte plan-zu' },
    el('summary', { text: `à la carte (${plan?.alacarte?.length || 0} gerichte)` }),
    el('p', { class: 'hinweis', text: 'Bleibt von Woche zu Woche stehen – nur ändern, wenn sich die Karte ändert.' }));
  const alacarteKopf = el('div', { class: 'plan-kopf plan-kopf-1' });
  alacarteKopf.append(feld('alacarteFenster', plan?.alacarteFenster ?? '11:30 bis 13:00 uhr', 'zeitfenster', { hinweis: '11:30 bis 13:00 uhr' }));
  alacarte.append(alacarteKopf);
  const alacarteListe = el('div', { class: 'plan-liste' });
  (plan?.alacarte?.length ? plan.alacarte : [{}]).forEach(g => alacarteListe.append(alacarteZeile(g)));
  alacarte.append(alacarteListe, mehrKnopf('+ gericht', alacarteListe, () => alacarteZeile(), MAX_ALACARTE));
  wurzel.append(alacarte);

  // 4. Fussnote - ebenfalls eingeklappt, sie wird fast nie geaendert.
  const fuss = el('details', { class: 'plan-fuss plan-zu' }, el('summary', { text: 'fußnote unten auf der karte' }));
  fuss.append(textfeld('fussnote', plan?.fussnote ?? '', 'text', {
    hinweis: 'takeaway: bestellen auf wirtschaft-dornbirn.at oder telefonisch … trotz sorgfältiger zubereitung …'
  }));
  wurzel.append(fuss);
}

const wert = (zeile, name) => zeile.querySelector(`[data-feld="${name}"]`)?.value ?? '';
const haken = zeile => zeile.querySelector('[data-feld="takeaway"]')?.checked !== false;

/** Liest das Formular als rohen Plan - geprueft wird beim Dienst. */
export function liesMenueplan(wurzel) {
  const zeilen = block => [...block.querySelectorAll('.plan-gericht')];
  return {
    montag: wurzel.querySelector('[data-feld="montag"]')?.value || '',
    preise: {
      mittag: wurzel.querySelector('[data-feld="preis-mittag"]')?.value || '',
      vital: wurzel.querySelector('[data-feld="preis-vital"]')?.value || ''
    },
    fenster: wert(wurzel, 'fenster'),
    hinweis: wert(wurzel, 'hinweis'),
    tage: WOCHENTAGE.map((_, i) => ({
      gerichte: zeilen(wurzel.querySelector(`.plan-tag[data-tag="${i}"]`))
        .map(z => ({ name: wert(z, 'name'), beilage: wert(z, 'beilage'), allergene: wert(z, 'allergene'), preis: wert(z, 'preis'), takeaway: haken(z) }))
        .filter(g => g.name.trim())
    })),
    vital: zeilen(wurzel.querySelector('.plan-vital'))
      .map(z => ({ titel: wert(z, 'titel'), name: wert(z, 'name'), beilage: wert(z, 'beilage'), allergene: wert(z, 'allergene'), preis: wert(z, 'preis'), takeaway: haken(z) }))
      .filter(g => g.name.trim()),
    alacarteFenster: wert(wurzel, 'alacarteFenster'),
    alacarte: zeilen(wurzel.querySelector('.plan-alacarte'))
      .map(z => ({ name: wert(z, 'name'), beilage: wert(z, 'beilage'), preis: wert(z, 'preis'), allergene: wert(z, 'allergene'), takeaway: haken(z) }))
      .filter(g => g.name.trim()),
    fussnote: wert(wurzel, 'fussnote')
  };
}
