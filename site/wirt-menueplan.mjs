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
const alsPreisText = wert => (wert === null || wert === undefined || wert === '' || !Number.isFinite(Number(wert)))
  ? '' : Number(wert).toFixed(2).replace('.', ',');

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

function wegKnopf(zeile) {
  const knopf = el('button', { type: 'button', class: 'plan-weg', 'aria-label': 'Gericht entfernen', text: '×' });
  knopf.addEventListener('click', () => zeile.remove());
  return knopf;
}

/** Eine Zeile Tagesgericht: Gericht, Beilagen, Allergene, eigener Preis. */
function tagesZeile(gericht = {}) {
  const zeile = el('div', { class: 'plan-gericht' });
  zeile.append(
    feld('name', gericht.name, 'mittagsgericht', { hinweis: 'z. B. cordon bleu vom schwein', breit: true }),
    feld('beilage', gericht.beilage, 'beilagen', { hinweis: 'schnittlauchkartoffeln | salat', breit: true }),
    feld('allergene', gericht.allergene, 'allergene', { hinweis: 'a, c, g' }),
    feld('preis', alsPreisText(gericht.preis), 'eigener preis', { hinweis: 'leer = gruppenpreis', dezimal: true }),
    wegKnopf(zeile)
  );
  return zeile;
}

function vitalZeile(gericht = {}) {
  const zeile = el('div', { class: 'plan-gericht' });
  zeile.append(
    feld('titel', gericht.titel ?? 'vital-gericht', 'art', { hinweis: 'vital-gericht / vegi-gericht' }),
    feld('name', gericht.name, 'gericht', { hinweis: 'lachsschnitte', breit: true }),
    feld('beilage', gericht.beilage, 'beilagen', { hinweis: 'mango-bulgur | chili-honigsauce | minzjoghurt', breit: true }),
    feld('allergene', gericht.allergene, 'allergene', { hinweis: 'a, c, l, m' }),
    wegKnopf(zeile)
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
    wegKnopf(zeile)
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
    feld('preis-mittag', alsPreisText(plan?.preise?.mittag ?? ''), 'preis mittagsgerichte', { hinweis: '15,90', dezimal: true }),
    feld('preis-vital', alsPreisText(plan?.preise?.vital ?? ''), 'preis vital & vegi', { hinweis: 'leer = wie mittag', dezimal: true })
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
  WOCHENTAGE.forEach((tag, i) => {
    const block = el('div', { class: 'plan-tag', 'data-tag': String(i) }, el('h3', { text: tag }));
    const liste = el('div', { class: 'plan-liste' });
    const gerichte = plan?.tage?.[i]?.gerichte?.length ? plan.tage[i].gerichte : [{}];
    gerichte.forEach(g => liste.append(tagesZeile(g)));
    block.append(liste, mehrKnopf('+ gericht zur wahl („oder“)', liste, () => tagesZeile(), MAX_JE_TAG));
    woche.append(block);
  });
  const vital = el('div', { class: 'plan-tag plan-vital' }, el('h3', { text: 'vital & vegi' }));
  const vitalListe = el('div', { class: 'plan-liste' });
  const vitalGerichte = plan?.vital?.length ? plan.vital : [{ titel: 'vital-gericht' }, { titel: 'vegi-gericht' }];
  vitalGerichte.forEach(g => vitalListe.append(vitalZeile(g)));
  vital.append(vitalListe, mehrKnopf('+ vital- oder vegi-gericht', vitalListe, () => vitalZeile({ titel: 'vital-gericht' }), MAX_VITAL));
  woche.append(vital);
  wurzel.append(woche);

  // 3. a la carte
  const alacarte = el('fieldset', { class: 'plan-alacarte' },
    el('legend', { text: 'à la carte' }),
    el('p', { class: 'hinweis', text: 'Bleibt von Woche zu Woche stehen – nur ändern, wenn sich die Karte ändert.' }));
  const alacarteKopf = el('div', { class: 'plan-kopf plan-kopf-1' });
  alacarteKopf.append(feld('alacarteFenster', plan?.alacarteFenster ?? '11:30 bis 13:00 uhr', 'zeitfenster', { hinweis: '11:30 bis 13:00 uhr' }));
  alacarte.append(alacarteKopf);
  const alacarteListe = el('div', { class: 'plan-liste' });
  (plan?.alacarte?.length ? plan.alacarte : [{}]).forEach(g => alacarteListe.append(alacarteZeile(g)));
  alacarte.append(alacarteListe, mehrKnopf('+ gericht', alacarteListe, () => alacarteZeile(), MAX_ALACARTE));
  wurzel.append(alacarte);

  // 4. Fussnote
  const fuss = el('fieldset', { class: 'plan-fuss' }, el('legend', { text: 'fußnote unten auf der karte' }));
  fuss.append(textfeld('fussnote', plan?.fussnote ?? '', 'text', {
    hinweis: 'takeaway: bestellen auf wirtschaft-dornbirn.at oder telefonisch … trotz sorgfältiger zubereitung …'
  }));
  wurzel.append(fuss);
}

const wert = (zeile, name) => zeile.querySelector(`[data-feld="${name}"]`)?.value ?? '';

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
        .map(z => ({ name: wert(z, 'name'), beilage: wert(z, 'beilage'), allergene: wert(z, 'allergene'), preis: wert(z, 'preis') }))
        .filter(g => g.name.trim())
    })),
    vital: zeilen(wurzel.querySelector('.plan-vital'))
      .map(z => ({ titel: wert(z, 'titel'), name: wert(z, 'name'), beilage: wert(z, 'beilage'), allergene: wert(z, 'allergene') }))
      .filter(g => g.name.trim()),
    alacarteFenster: wert(wurzel, 'alacarteFenster'),
    alacarte: zeilen(wurzel.querySelector('.plan-alacarte'))
      .map(z => ({ name: wert(z, 'name'), beilage: wert(z, 'beilage'), preis: wert(z, 'preis'), allergene: wert(z, 'allergene') }))
      .filter(g => g.name.trim()),
    fussnote: wert(wurzel, 'fussnote')
  };
}
