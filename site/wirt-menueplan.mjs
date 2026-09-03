// Das Formular fuer den Menueplan der Woche: fuenf Tage, Vitalgerichte,
// A la carte. Es baut sich aus dem gespeicherten Plan und liest sich beim
// Veroeffentlichen wieder aus. Keine Rechenregel hier - was gilt, entscheidet
// der Dienst (server/src/menueplan.mjs); das Formular sammelt nur ein.
//
// Handy zuerst: grosse Felder untereinander, am Rechner in einer Reihe.

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

function wegKnopf(zeile) {
  const knopf = el('button', { type: 'button', class: 'plan-weg', 'aria-label': 'Gericht entfernen', text: '×' });
  knopf.addEventListener('click', () => zeile.remove());
  return knopf;
}

/** Eine Zeile Tagesgericht: Gericht, Beilagen, Allergene, eigener Preis. */
function tagesZeile(gericht = {}) {
  const zeile = el('div', { class: 'plan-gericht' });
  zeile.append(
    feld('name', gericht.name, 'gericht', { hinweis: 'z. B. cordon bleu vom schwein', breit: true }),
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
    feld('titel', gericht.titel ?? 'vital', 'art', { hinweis: 'vital / vegetarisch' }),
    feld('name', gericht.name, 'gericht', { hinweis: 'lachsschnitte | mango-bulgur', breit: true }),
    feld('beilage', gericht.beilage, 'beilagen', { hinweis: 'chili-honigsauce | minzjoghurt', breit: true }),
    feld('allergene', gericht.allergene, 'allergene', { hinweis: 'a, c, l, m' }),
    wegKnopf(zeile)
  );
  return zeile;
}

function alacarteZeile(gericht = {}) {
  const zeile = el('div', { class: 'plan-gericht' });
  zeile.append(
    feld('name', gericht.name, 'gericht', { hinweis: 'burger „eugen“', breit: true }),
    feld('beilage', gericht.beilage, 'dazu', { hinweis: 'brioche bun | cheddar | pommes', breit: true }),
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

  const kopf = el('div', { class: 'plan-kopf' });
  const montag = el('input', { type: 'date', 'data-feld': 'montag', value: plan?.montag || naechsterMontag() });
  kopf.append(
    el('label', {}, el('span', { text: 'montag der woche' }), montag),
    feld('preis-mittag', alsPreisText(plan?.preise?.mittag ?? ''), 'preis mittagsgerichte', { hinweis: '15,90', dezimal: true }),
    feld('preis-vital', alsPreisText(plan?.preise?.vital ?? ''), 'preis vitalgerichte', { hinweis: 'leer = wie mittag', dezimal: true })
  );
  wurzel.append(kopf);

  WOCHENTAGE.forEach((tag, i) => {
    const block = el('fieldset', { class: 'plan-tag', 'data-tag': String(i) }, el('legend', { text: tag }));
    const liste = el('div', { class: 'plan-liste' });
    const gerichte = plan?.tage?.[i]?.gerichte?.length ? plan.tage[i].gerichte : [{}];
    gerichte.forEach(g => liste.append(tagesZeile(g)));
    block.append(liste, mehrKnopf('+ gericht zur wahl („oder“)', liste, () => tagesZeile(), MAX_JE_TAG));
    wurzel.append(block);
  });

  const vital = el('fieldset', { class: 'plan-vital' }, el('legend', { text: 'vitalgerichte' }));
  const vitalListe = el('div', { class: 'plan-liste' });
  const vitalGerichte = plan?.vital?.length ? plan.vital : [{ titel: 'vital' }, { titel: 'vegetarisch' }];
  vitalGerichte.forEach(g => vitalListe.append(vitalZeile(g)));
  vital.append(vitalListe, mehrKnopf('+ vitalgericht', vitalListe, () => vitalZeile({ titel: 'vital' }), MAX_VITAL));
  wurzel.append(vital);

  const alacarte = el('fieldset', { class: 'plan-alacarte' },
    el('legend', { text: 'à la carte' }),
    el('p', { class: 'hinweis', text: 'Bleibt von Woche zu Woche stehen – nur ändern, wenn sich die Karte ändert.' }));
  const alacarteListe = el('div', { class: 'plan-liste' });
  (plan?.alacarte?.length ? plan.alacarte : [{}]).forEach(g => alacarteListe.append(alacarteZeile(g)));
  alacarte.append(alacarteListe, mehrKnopf('+ gericht', alacarteListe, () => alacarteZeile(), MAX_ALACARTE));
  wurzel.append(alacarte);
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
    tage: WOCHENTAGE.map((_, i) => ({
      gerichte: zeilen(wurzel.querySelector(`.plan-tag[data-tag="${i}"]`))
        .map(z => ({ name: wert(z, 'name'), beilage: wert(z, 'beilage'), allergene: wert(z, 'allergene'), preis: wert(z, 'preis') }))
        .filter(g => g.name.trim())
    })),
    vital: zeilen(wurzel.querySelector('.plan-vital'))
      .map(z => ({ titel: wert(z, 'titel'), name: wert(z, 'name'), beilage: wert(z, 'beilage'), allergene: wert(z, 'allergene') }))
      .filter(g => g.name.trim()),
    alacarte: zeilen(wurzel.querySelector('.plan-alacarte'))
      .map(z => ({ name: wert(z, 'name'), beilage: wert(z, 'beilage'), preis: wert(z, 'preis'), allergene: wert(z, 'allergene') }))
      .filter(g => g.name.trim())
  };
}
