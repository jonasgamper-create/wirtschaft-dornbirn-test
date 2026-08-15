// Interne Tischplanung: Ordnungen, Etagen, Tische, Stuehle, Reservierungen mit
// Uhrzeit und Essenswunsch. Laeuft nur im internen Bereich - der oeffentliche
// Build schliesst jede Datei mit dem Praefix "gastgeber" aus.

// Die Versionsangaben muessen mit denen in den HTML-Dateien mitwandern: ein
// Modulimport ohne Version bleibt sonst im Browser-Cache haengen.
import { BIS_TAGESENDE, ELEMENTS, GRID, activeLayout, buildFloorplan, canPlace, clampSeats, deriveTableMix, elementKinds, migrate, nextElementId, nextTableId, seatNamesFor, seatingPlan, serviceOf, tableLabel, totalSeats } from './floorplan-layout.mjs?v=268bdada';
import { KARENZ_MINUTEN, assignTables, belegtBis, durationFor, occupiesAt, partyStatus, stamp } from './table-assignment.mjs?v=3433b591';
import { renderFloorplan } from './floorplan.js?v=d3336d80';
import { createHistory } from './plan-history.mjs?v=b86ccb46';
import { apiAdresse, bleibVerbunden, hausToken, sendeAktion, sendePlan, sendeReservierung, setzeToken } from './haus-api.js?v=29758f6f';

const SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const store = window.WirtschaftData;
const byId = id => document.getElementById(id);
const preview = byId('fpPreview');
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
if (store && preview) start();

async function start() {
  if (!store.load().floorplan) {
    // In der Einzeldatei liegt die Ausgangskonfiguration schon im Dokument.
    // Nur die Fassung im site-Ordner holt sie per fetch.
    if (window.WIRTSCHAFT_FLOORPLAN) {
      store.updateFloorplan(migrate(window.WIRTSCHAFT_FLOORPLAN));
    } else {
      try {
        store.updateFloorplan(migrate(await (await fetch('data/floorplan.json', { cache: 'no-store' })).json()));
      } catch {
        warn('Der Tischplan konnte nicht geladen werden. Bitte die Seite über einen lokalen Server öffnen, nicht als Datei.');
        return;
      }
    }
  }

  const slug = name => (name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 20) || 'ordnung');

  const current = () => store.load().floorplan;
  const layout = () => activeLayout(current());
  const parties = () => store.load().parties || [];
  const blocked = () => store.load().blockedTables || [];
  const menu = () => current().menu || [];
  const policy = () => current().policy || {};

  // Der gewaehlte Zeitpunkt steuert alles: Karte, Tischliste, Reservierungen.
  // `live` heisst: die Uhrzeit laeuft mit. Ohne das steht eine morgens von Hand
  // eingestellte Uhrzeit den ganzen Mittag still - nichts wird je ueberfaellig,
  // und jedes Einchecken bekommt den falschen Zeitstempel.
  const uhrzeitJetzt = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };
  const moment = { date: today(), time: uhrzeitJetzt(), live: true };
  let picked = null;
  let marked = null;
  // Filter und Suche der Tischliste. Bewusst nur im Arbeitsspeicher: ein
  // gespeicherter Filter, den man vergessen hat, versteckt am naechsten Tag
  // Tische und man sucht den Fehler woanders.
  const tableFilter = { mode: 'alle', text: '' };
  // Der naechste Eintrag ist ein Laufkunde und gilt sofort als eingecheckt.
  let laufkunde = false;

  // Jede Aenderung merkt sich, damit Rueckgaengig und Wiederholen jeden
  // einzelnen Schritt treffen - nicht nur den letzten Speichervorgang.
  const history = createHistory(
    () => JSON.stringify(store.planSnapshot()),
    text => { store.restorePlan(JSON.parse(text)); }
  );
  const putParties = list => { const out = store.setParties(list); history.remember(); return out; };
  const putBlocked = list => { const out = store.setBlockedTables(list); history.remember(); return out; };
  const putFloorplan = patch => { const out = store.updateFloorplan(patch); history.remember(); return out; };

  /**
   * Beschriftung eines Tisches fuer Meldungen und Listen. Zaehlt jede Etage
   * neu, gehoert die Etage dazu - "Tisch 1" allein waere mehrdeutig.
   */
  const tisch = (idOrTable, plan = buildFloorplan(current())) => {
    const table = typeof idOrTable === 'string'
      ? plan.tables.find(entry => entry.id === idOrTable)
      : idOrTable;
    return table ? tableLabel(table, plan) : '?';
  };
  const tischListe = (ids, plan = buildFloorplan(current())) =>
    ids.map(id => tisch(id, plan)).join(' + ');

  const say = (id, text) => { byId(id).textContent = text; };
  const seatResult = text => say('fpSeatResult', text);
  function warn(text) {
    const box = byId('fpWarn');
    box.hidden = !text;
    box.textContent = text || '';
  }

  const service = () => serviceOf(layout());
  const schichten = () => (service().mode === 'schichten' ? seatingPlan(service()) : []);
  /** Die Schicht, in der eine Uhrzeit liegt - oder nichts. */
  const schichtFor = time => schichten().find(entry => entry.time === time) || null;

  /**
   * Im Schichtbetrieb bestimmt der Abstand zur naechsten Schicht die Dauer.
   * Nur im freien Betrieb haengt sie an der Gruppengroesse.
   */
  const minutesFor = (guests, time) => {
    // Ohne Richtzeit endet die Belegung nicht von selbst: der Tisch bleibt
    // besetzt, bis jemand "Fertig" drueckt. Im Schichtbetrieb waere das ein
    // Widerspruch - dort ist die feste Zeit ja der Zweck -, deshalb gilt es
    // nur im durchgehenden Betrieb.
    const rules = service();
    if (rules.mode !== 'schichten' && rules.richtzeit === false) return BIS_TAGESENDE;
    const schicht = time ? schichtFor(time) : null;
    if (schicht) return schicht.minutes;
    if (rules.mode === 'schichten' && schichten().length) return schichten()[0].minutes;
    return durationFor(guests, policy());
  };
  const startsAt = party => `${party.date}T${party.time}`;
  const dayParties = () => parties().filter(party => party.date === moment.date);
  const dauerVon = party => minutesFor(party.guests, party.time);
  const jetztMarke = () => `${moment.date}T${moment.time}`;

  /** Uhrzeit als HH:MM aus einer Minutenmarke. */
  const alsUhrzeit = marke => {
    if (marke === null || marke === undefined) return null;
    const date = new Date(marke * 60000);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  };

  /**
   * Bis wann eine Reservierung den Tisch belegt, als Uhrzeit - oder null, wenn
   * es kein berechnetes Ende gibt. Ohne Richtzeit waere die Rechnung
   * "Beginn plus ein Tag" und stuende als Uhrzeit von gestern da.
   */
  const endeVon = party => {
    // Immer ueber belegtBis rechnen, damit Anzeige und Belegung dasselbe sagen:
    // die Funktion nimmt den frueheren der beiden Zeitpunkte.
    if (dauerVon(party) >= BIS_TAGESENDE && !party.left) return null;
    return alsUhrzeit(belegtBis(party, dauerVon(party)));
  };
  /** "bis 13:45" oder "offen" - nie eine erfundene Uhrzeit. */
  const endeText = party => (endeVon(party) ? `bis ${endeVon(party)}` : 'offen');

  /**
   * Zustand einer Reservierung im gewaehlten Moment: kommt, wartet,
   * ueberfaellig, da, weg, vorbei. Die Karte faerbt danach.
   */
  const statusVon = party => partyStatus(party, { at: jetztMarke(), minutes: dauerVon(party) });

  /** Reservierungen, die zum gewaehlten Zeitpunkt tatsaechlich sitzen. */
  function seatedNow() {
    return dayParties().filter(party => occupiesAt(party, { at: jetztMarke(), minutes: dauerVon(party) }));
  }

  function seatingMap() {
    const map = {};
    for (const party of seatedNow()) {
      const eintrag = {
        name: party.name,
        guests: party.guests,
        arrived: Boolean(party.arrived),
        until: endeVon(party)
      };
      for (const id of party.tableIds) map[id] = eintrag;
    }
    return map;
  }

  /**
   * Bis wann ein gerade freier Tisch frei bleibt: bis zur naechsten
   * Reservierung an diesem Tisch. Ohne diese Angabe ist "frei" an der Tuer
   * wertlos - die Frage lautet immer "frei bis wann".
   */
  function freeUntilMap() {
    const jetzt = stamp(jetztMarke());
    const belegt = new Set(seatedNow().flatMap(party => party.tableIds));
    const map = {};
    if (jetzt === null) return map;
    for (const party of dayParties()) {
      if (!party.tableIds.length || party.left) continue;
      const von = stamp(startsAt(party));
      if (von === null || von <= jetzt) continue;
      for (const id of party.tableIds) {
        if (belegt.has(id)) continue;
        if (!map[id] || von < stamp(`${moment.date}T${map[id]}`)) map[id] = party.time;
      }
    }
    return map;
  }

  /**
   * Belegung fuer die Zuweisung. Die Dauer endet vorzeitig, wenn abgerechnet
   * wurde - sonst blockiert eine Gruppe, die um 13:00 zahlt, den Tisch
   * rechnerisch bis 13:45 und der naechste Gast wird grundlos abgewiesen.
   */
  const occupancyOf = list => list
    .filter(party => party.tableIds.length)
    .map(party => ({
      tableIds: party.tableIds,
      startsAt: startsAt(party),
      minutes: Math.max(1, belegtBis(party, dauerVon(party)) - stamp(startsAt(party))),
      guests: party.guests
    }));

  // ---- Speichern und Aufraeumen --------------------------------------------

  const numbering = config => buildFloorplan(config).tables.map(table => `${table.id}:${table.number}`).join(',');

  function save(next, { quiet = false } = {}) {
    const before = numbering(current());
    putFloorplan(next);
    const plan = buildFloorplan(current());

    const notes = [];
    if (!quiet && before !== numbering(current())) {
      notes.push('Achtung: Tischnummern haben sich verschoben. Aushänge und Notizen im Haus prüfen.');
    }
    if (plan.orphans.length) {
      notes.push(`${plan.orphans.length} Kombination(en) verweisen auf Tische, die es nicht mehr gibt.`);
    }
    notes.push(...reconcile(plan));
    warn(notes.join(' '));
    syncServiceMix(plan);
    paint();
    return plan;
  }

  /**
   * Nach jeder Aenderung: Verweise auf Tische aufloesen, die es nicht mehr
   * gibt. Ohne das haengt eine Reservierung an einem geloeschten Tisch, taucht
   * in keiner Liste mehr auf und ist praktisch verloren - das faellt erst auf,
   * wenn die Gaeste vor einem stehen.
   */
  function reconcile(plan) {
    const alive = new Set(plan.tables.map(table => table.id));
    const notes = [];
    const was = parties();
    const list = was.map(party => ({ ...party, tableIds: party.tableIds.filter(id => alive.has(id)) }));
    const freed = list.filter((party, index) => party.tableIds.length !== was[index].tableIds.length);
    if (freed.length) {
      putParties(list);
      const open = freed.filter(party => !party.tableIds.length).map(party => party.name);
      notes.push(open.length
        ? `${open.join(', ')} ${open.length === 1 ? 'hat' : 'haben'} keinen Tisch mehr und ${open.length === 1 ? 'steht' : 'stehen'} wieder offen.`
        : 'Eine Reservierung wurde auf die verbliebenen Tische gekürzt.');
    }
    const kept = blocked().filter(id => alive.has(id));
    if (kept.length !== blocked().length) putBlocked(kept);
    if (marked && !list.some(party => party.id === marked)) marked = null;
    if (picked && !alive.has(picked)) picked = null;
    return notes;
  }

  /**
   * Schreibt Tischmix, Kapazitaet und Belegung der Zeitfenster aus dem
   * Tischplan und den echten Reservierungen. Ohne das behauptet Panel 02 im
   * Cockpit "aus dem Tischplan berechnet" und zeigt in Wahrheit Vorgabewerte.
   */
  function syncServiceMix(plan) {
    const mix = deriveTableMix(plan);
    const state = store.load();
    for (const service of state.services) {
      service.tables = { ...mix };
      service.capacity = totalSeats(plan);
      service.reserved = sitzendeGaeste(service.date, service.time, state);
    }
    store.save(state);
  }

  /** Wie viele Gaeste zu diesem Zeitpunkt tatsaechlich an Tischen sitzen. */
  function sitzendeGaeste(date, time, state = store.load()) {
    // Muss dieselbe Regel benutzen wie Karte und Zuweisung. Rechnete der
    // Zaehler nur nach der Uhr, gaebe "Fertig" den Tisch auf der Karte frei,
    // ohne dass die freien Plaetze steigen - zwei Wahrheiten auf einer Seite.
    return (state.parties || [])
      .filter(party => party.date === date && party.tableIds.length)
      .filter(party => occupiesAt(party, { at: `${date}T${time}`, minutes: minutesFor(party.guests, party.time) }))
      .reduce((sum, party) => sum + party.guests, 0);
  }

  /**
   * Freie Plaetze zu einem Zeitpunkt. Der Puffer ist die bewusste Entscheidung,
   * das Haus nicht bis auf den letzten Platz zu verkaufen - ohne ihn steht der
   * Service beim ersten Sonderfall an.
   */
  function freiePlaetze(date, time, plan = buildFloorplan(current())) {
    const state = store.load();
    const settings = state.settings || {};
    const gesamt = totalSeats(plan);
    const limit = settings.bufferEnabled
      ? Math.max(0, Math.floor(gesamt * (1 - (Number(settings.bufferPercent) || 0) / 100)))
      : gesamt;
    const sitzen = sitzendeGaeste(date, time, state);
    return { gesamt, limit, sitzen, frei: Math.max(0, limit - sitzen) };
  }

  // ---- Zeitpunkt und Ordnung -----------------------------------------------

  /**
   * Die Servicezeile oben. Sie beantwortet die vier Fragen, die im Mittag
   * wirklich gestellt werden: welcher Moment gilt, wie viele Plaetze sind noch
   * frei, wartet jemand ueberfaellig, und wer kommt als naechstes.
   */
  function paintBar() {
    const live = byId('fpLive');
    live.setAttribute('aria-pressed', String(moment.live));
    byId('fpLiveText').textContent = moment.live ? `Jetzt ${moment.time}` : 'Angehalten';
    live.title = moment.live
      ? 'Die Uhr läuft mit. Klicken hält den Plan an.'
      : 'Der Plan steht auf einer festen Uhrzeit. Klicken lässt ihn wieder mitlaufen.';

    // Im Schichtbetrieb ist die feste Zeit der Zweck - dort waere ein Schalter
    // fuer "keine Zeit" ein Widerspruch, also steht er nicht zur Wahl.
    const rules = service();
    const schichtbetrieb = rules.mode === 'schichten';
    byId('fpRichtzeit').checked = schichtbetrieb || rules.richtzeit !== false;
    byId('fpRichtzeit').disabled = schichtbetrieb;
    byId('fpRichtzeitLabel').classList.toggle('is-off', !schichtbetrieb && rules.richtzeit === false);
    byId('fpRichtzeitInfo').textContent = schichtbetrieb
      ? 'Schichten'
      : rules.richtzeit === false ? 'aus – bis „Fertig“' : `${durationFor(2, policy())}–${durationFor(20, policy())} Min`;

    const plan = buildFloorplan(current());
    const platz = freiePlaetze(moment.date, moment.time, plan);
    const spaet = seatedNow().filter(party => statusVon(party) === 'ueberfaellig');
    const offen = dayParties().filter(party => !party.tableIds.length);
    const naechste = dayParties()
      .filter(party => stamp(startsAt(party)) > stamp(jetztMarke()))
      .sort((a, b) => a.time.localeCompare(b.time))[0];

    const box = byId('fpBarStats');
    box.textContent = '';
    const zahl = (wert, wofuer, klasse = '') => {
      const span = document.createElement('span');
      span.className = `fp-stat${klasse}`;
      const b = document.createElement('b');
      b.textContent = String(wert);
      span.append(b, document.createTextNode(wofuer));
      box.append(span);
    };
    zahl(platz.frei, 'Plätze frei');
    zahl(platz.sitzen, 'Gäste sitzen');
    if (spaet.length) zahl(spaet.length, spaet.length === 1 ? 'überfällig' : 'überfällig', ' is-late');
    if (offen.length) zahl(offen.length, 'ohne Tisch', ' is-open');
    if (naechste) {
      const span = document.createElement('span');
      span.className = 'fp-stat is-next';
      span.textContent = `nächste ${naechste.time} ${naechste.name}`;
      box.append(span);
    }

    // Das Abzeichen am Reiter zeigt Aerger auch dann, wenn man woanders steht.
    const badge = byId('fpBadgeService');
    badge.hidden = !spaet.length;
    badge.textContent = String(spaet.length);
    badge.setAttribute('aria-label', `${spaet.length} überfällig`);
  }

  function paintMoment() {
    byId('fpDate').value = moment.date;
    byId('fpTime').value = moment.time;
    const select = byId('fpLayout');
    select.textContent = '';
    for (const entry of current().layouts) {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = entry.name;
      option.selected = entry.id === current().activeLayout;
      select.append(option);
    }
    const plan = buildFloorplan(current());
    const sitting = seatedNow();
    const gaeste = sitting.reduce((sum, party) => sum + party.guests, 0);
    const offen = dayParties().filter(party => !party.tableIds.length).length;
    const platz = freiePlaetze(moment.date, moment.time, plan);
    say('fpMomentInfo', `${plan.layoutName}: ${plan.tables.length} Tische, ${totalSeats(plan)} Plätze`
      + (platz.limit < platz.gesamt ? ` (${platz.limit} freigegeben, Rest als Puffer)` : '') + '. '
      + `Um ${moment.time} sitzen ${gaeste} Gäste an ${sitting.reduce((sum, party) => sum + party.tableIds.length, 0)} Tischen. `
      + `${offen} Reservierung(en) ohne Tisch, noch ${platz.frei} Plätze frei.`);
  }

  byId('fpMomentForm').addEventListener('submit', event => {
    event.preventDefault();
    moment.date = byId('fpDate').value || today();
    moment.time = byId('fpTime').value || uhrzeitJetzt();
    // Von Hand gewaehlt heisst: die Uhr steht. Sonst wuerde der naechste Takt
    // die Eingabe sofort wieder ueberschreiben.
    moment.live = moment.date === today() && moment.time === uhrzeitJetzt();
    paint();
  });

  // Tischordnung wirkt sofort - ein zusaetzliches "Anzeigen" waere ein Schritt,
  // den niemand erwartet.
  byId('fpLayout').addEventListener('change', () => {
    const config = current();
    config.activeLayout = byId('fpLayout').value;
    picked = null;
    save(config, { quiet: true });
  });

  /** Zurueck in den mitlaufenden Betrieb. */
  function liveAn(an) {
    moment.live = an;
    if (an) { moment.date = today(); moment.time = uhrzeitJetzt(); }
    paint();
  }
  byId('fpLive').addEventListener('click', () => liveAn(!moment.live));

  // Richtzeit an oder aus. Gehoert zur Tischordnung, damit ein Haus je Ordnung
  // anders arbeiten kann - Mittagsbetrieb getaktet, Hochzeit offen.
  byId('fpRichtzeit').addEventListener('change', event => {
    const config = current();
    const entry = config.layouts.find(item => item.id === config.activeLayout);
    if (!entry) return;
    entry.service = { ...serviceOf(entry), richtzeit: event.target.checked };
    save(config, { quiet: true });
    seatResult(event.target.checked
      ? 'Richtzeit an: Tische werden nach der berechneten Sitzdauer wieder frei.'
      : 'Richtzeit aus: Tische bleiben belegt, bis jemand „Fertig“ drückt. Nicht vergessen – sonst blockieren sie bis Betriebsschluss.');
  });

  /**
   * Darf der Takt jetzt neu zeichnen? Nur die Felder aussetzen, die `paint()`
   * tatsaechlich ueberschreibt oder neu aufbaut. Pauschal jede Eingabe zu
   * schonen waere falsch: nach jeder Reservierung steht der Fokus im
   * Namensfeld - die Uhr bliebe dann fuer immer stehen, ohne dass es auffaellt.
   */
  const SCHREIBT_PAINT = ['fpDate', 'fpTime', 'fpEventName', 'fpNumbering', 'fpLayout',
    'fpMode', 'fpSeatings', 'fpEndsAt', 'fpBuffer', 'fpResTime', 'fpResDate'];
  function taktErlaubt() {
    const aktiv = document.activeElement;
    if (!aktiv || aktiv === document.body) return true;
    if (SCHREIBT_PAINT.includes(aktiv.id)) return false;
    // Diese Listen baut paint() neu auf; mitten im Tippen waere das ein Verlust.
    return !aktiv.closest('#fpParties, #fpTableList, #fpLevels, #fpElements');
  }

  /** Auf die aktuelle Uhrzeit nachziehen, wenn noetig. */
  function taktJetzt() {
    if (!moment.live || !taktErlaubt()) return;
    const jetzt = uhrzeitJetzt();
    if (jetzt === moment.time && moment.date === today()) return;
    moment.date = today();
    moment.time = jetzt;
    paint();
  }

  // Der Takt. Eine halbe Minute ist fein genug fuer die Karenz von 15 Minuten
  // und grob genug, um niemanden bei der Arbeit zu stoeren.
  setInterval(taktJetzt, 30000);

  // Browser drosseln oder frieren Zeitgeber in verdeckten Tabs ein. Liegt der
  // Tischplan hinter dem Eingangsbildschirm, waere er beim Zurueckwechseln
  // veraltet - deshalb beim Sichtbarwerden sofort nachziehen.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') taktJetzt();
  });
  window.addEventListener('focus', taktJetzt);

  // ---- Karte ---------------------------------------------------------------

  const layoutLevelOf = (config, tableId) =>
    activeLayout(config)?.levels.find(level => level.tables.some(table => table.id === tableId));

  /**
   * Tische, an denen jemand ueberfaellig ist. Gesperrt schlaegt ueberfaellig:
   * ein gesperrter Tisch ist ein Zustand des Hauses, kein Gastverhalten.
   */
  function tableStates() {
    const states = {};
    for (const party of seatedNow()) {
      if (statusVon(party) !== 'ueberfaellig') continue;
      for (const id of party.tableIds) states[id] = 'late';
    }
    for (const id of blocked()) states[id] = 'blocked';
    return states;
  }

  /**
   * Die Reservierung, die ein Klick auf diesen Tisch meint. Das ist die
   * sitzende - und wenn keine sitzt, die naechste innerhalb einer
   * Dreiviertelstunde. Sonst koennte man einen Gast, der zehn Minuten zu frueh
   * vor einem steht, nicht einchecken.
   */
  function partyAtTable(tableId) {
    const sitzt = seatedNow().find(party => party.tableIds.includes(tableId));
    if (sitzt) return sitzt;
    const jetzt = stamp(jetztMarke());
    if (jetzt === null) return null;
    return dayParties()
      .filter(party => party.tableIds.includes(tableId) && !party.left)
      .filter(party => {
        const von = stamp(startsAt(party));
        return von !== null && von > jetzt && von - jetzt <= 45;
      })
      .sort((a, b) => a.time.localeCompare(b.time))[0] || null;
  }

  function paintPlan() {
    renderFloorplan(preview, current(), {
      mode: 'select',
      states: tableStates(),
      seating: seatingMap(),
      freeUntil: freeUntilMap(),
      selected: picked,
      onSelect: id => {
        if (id && marked) return seatMarked(id);
        // Ein Klick auf einen Tisch mit Gast checkt ein - das ist im Betrieb
        // der haeufigste Griff und muss ohne Umweg gehen.
        const party = id && partyAtTable(id);
        if (party) return toggleArrival(party.id, id);
        picked = id;
        paintPlan();
        paintSeating();
        if (!id) return;
        const field = byId('fpTableList').querySelector(`[data-table-id="${id}"][data-field="name"]`);
        if (field && !field.disabled) { field.focus(); field.select(); }
      },
      onEdit: (id, value) => setTableName(id, value),
      // Raumobjekte werden wie Tische gezogen, nur ohne Kollisionspruefung -
      // eine Wand darf an einem Tisch stehen.
      onMoveElement: (id, col, row) => {
        const config = current();
        const level = elementLevel(config, id);
        const item = level?.elements.find(entry => entry.id === id);
        if (!item) return;
        item.col = Math.max(0, Math.min(GRID.cols - item.w, col));
        item.row = Math.max(0, row);
        save(config, { quiet: true });
        const status = preview.querySelector('[data-status]');
        if (status) status.textContent = `${item.label || ELEMENTS[item.kind]?.label || 'Wand'} verschoben.`;
      },
      onMove: (id, col, row) => {
        const plan = buildFloorplan(current());
        const verdict = canPlace(plan, id, col, row, GRID);
        if (!verdict.ok) {
          paintPlan();
          const reasons = {
            outside: 'Dort ist kein Platz mehr im Raster.',
            occupied: `Dort steht schon Tisch ${verdict.blockedBy}.`,
            unknown: 'Diesen Tisch gibt es nicht mehr.'
          };
          const status = preview.querySelector('[data-status]');
          if (status) status.textContent = reasons[verdict.reason];
          return;
        }
        const config = current();
        const level = layoutLevelOf(config, id);
        if (!level) return;
        // Sobald von Hand angeordnet wird, halten wir alle Tische der Etage
        // fest. Sonst rutschen automatisch platzierte Tische bei jedem Zug
        // nach - eine Karte, die sich unter der Hand bewegt, ist unbrauchbar.
        const here = plan.levels.find(item => item.id === level.id);
        for (const table of level.tables) {
          const spot = here.tables.find(entry => entry.id === table.id);
          if (spot) { table.col = spot.col; table.row = spot.row; }
        }
        const moved = level.tables.find(table => table.id === id);
        if (moved) { moved.col = col; moved.row = row; }
        const updated = save(config, { quiet: true });
        const status = preview.querySelector('[data-status]');
        const number = updated.tables.find(table => table.id === id)?.number;
        if (status) status.textContent = `Tisch ${number ?? ''} verschoben. Die Nummern folgen der Leserichtung im Raum.`;
      }
    });
  }

  // ---- Reservierungen ------------------------------------------------------

  function paintDishes() {
    const box = byId('fpDishes');
    [...box.querySelectorAll('label')].forEach(node => node.remove());
    for (const dish of menu()) {
      const label = document.createElement('label');
      label.append(dish.name);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '24';
      input.value = '0';
      input.dataset.dish = dish.id;
      input.setAttribute('aria-label', `Anzahl ${dish.name}`);
      label.append(input);
      box.append(label);
    }
  }

  function dishesFromForm() {
    const dishes = {};
    let total = 0;
    for (const input of byId('fpDishes').querySelectorAll('[data-dish]')) {
      const count = Math.max(0, Math.trunc(Number(input.value) || 0));
      if (count > 0) { dishes[input.dataset.dish] = count; total += count; }
    }
    return { dishes, total };
  }

  const resetDishes = () => byId('fpDishes').querySelectorAll('[data-dish]').forEach(input => { input.value = '0'; });

  const dishLabel = dishes => Object.entries(dishes || {})
    .map(([id, count]) => `${count}× ${menu().find(dish => dish.id === id)?.name || id}`).join(', ');

  /** Legt eine Reservierung an und setzt sie sofort, wenn ein Tisch frei ist. */
  function addReservation({ name, date, time, guests, dishes, source = 'manuell' }, { silent = false } = {}) {
    const plan = buildFloorplan(current());
    const party = {
      id: `r-${Date.now().toString(36)}-${parties().length}`,
      name, date, time, guests, dishes, source, tableIds: []
    };
    const feste = minutesFor(guests, time);
    const platz = freiePlaetze(date, time, plan);
    const result = assignTables({
      floorplan: plan,
      occupancy: occupancyOf(parties().filter(entry => entry.date === date)),
      blocked: blocked(),
      guests,
      available: platz.frei,
      startsAt: `${date}T${time}`,
      // Im Schichtbetrieb kommen alle gleichzeitig - Pacing waere sinnlos und
      // wuerde jede zweite Reservierung grundlos ablehnen.
      policy: service().mode === 'schichten'
        ? { ...policy(), maxCoversPerSlot: Number.MAX_SAFE_INTEGER }
        : policy(),
      minutes: feste
    });
    if (result.ok) party.tableIds = result.tableIds;
    // Ein Laufkunde steht bereits im Haus. Ohne die Ankunft waere er in dem
    // Moment eingetragen, in dem er ueberfaellig wird - das waere absurd.
    if (laufkunde && result.ok) party.arrived = time;
    laufkunde = false;
    putParties([...parties(), party]);
    // Auch im Haus angelegte Reservierungen gehoeren in den Dienst - sonst
    // vergibt eine Onlinebuchung denselben Tisch ein zweites Mal.
    meldeNeu(party);

    moment.date = date;
    moment.time = time;
    paint();
    if (silent) return party;

    const wunsch = dishLabel(dishes);
    if (result.ok) {
      const schicht = schichtFor(time);
      say('fpResResult', `${name}, ${guests} Personen am ${date} um ${time}: Tisch ${tischListe(result.tableIds)}`
        + (result.seatGap ? ` (${result.seatGap} Platz übrig).` : ' – passgenau.')
        + (schicht?.naechste
          // Der Gast muss wissen, dass der Tisch wieder gebraucht wird.
          ? ` Tisch wird um ${schicht.naechste} erneut vergeben – dem Gast sagen, dass ${schicht.minutes} Minuten zur Verfügung stehen.`
          : '')
        + (wunsch ? ` Essen vorbestellt: ${wunsch}.` : ''));
      return party;
    }
    const gruende = {
      pacing: 'zu viele Gäste im selben Viertelstundenfenster',
      no_fit: 'kein passender Tisch frei',
      capacity: `Sitzplatzdeckel erreicht – von ${platz.limit} freigegebenen Plätzen sitzen um ${time} schon ${platz.sitzen}`,
      invalid: 'Eingabe unvollständig'
    };
    const alternativen = (result.alternatives || [])
      .map(entry => `${entry.startsAt.slice(11)} (Tisch ${tischListe(entry.tableIds)})`).join(', ');
    say('fpResResult', `${name} ist aufgenommen, aber noch ohne Tisch – ${gruende[result.reason]}.`
      + (alternativen ? ` Möglich wäre: ${alternativen}.` : ''));
    return party;
  }

  byId('fpResForm').addEventListener('submit', event => {
    event.preventDefault();
    const name = byId('fpResName').value.trim();
    if (!name) return;
    const guests = Math.max(1, Math.min(24, Number(byId('fpResGuests').value) || 1));
    const { dishes, total } = dishesFromForm();
    if (total > guests) {
      return say('fpResResult', `${total} Portionen für ${guests} Personen – bitte korrigieren.`);
    }
    addReservation({
      name,
      date: byId('fpResDate').value || today(),
      time: byId('fpResTime').value || '12:00',
      guests,
      dishes
    });
    byId('fpResName').value = '';
    resetDishes();
    byId('fpResName').focus();
  });

  /**
   * Laufkunde: Tag und Uhrzeit sind "jetzt", auf die Viertelstunde abgerundet,
   * damit die Zeit zu den Schichten passt. Danach fehlen nur noch Name und
   * Personenzahl statt vier Feldern.
   */
  byId('fpWalkIn').addEventListener('click', () => {
    const now = new Date();
    const viertel = Math.floor(now.getMinutes() / 15) * 15;
    const pad = n => String(n).padStart(2, '0');
    byId('fpResDate').value = today();
    byId('fpResTime').value = `${pad(now.getHours())}:${pad(viertel)}`;
    laufkunde = true;
    say('fpResResult', `Laufkunde um ${pad(now.getHours())}:${pad(viertel)}: nur noch Name und Personenzahl eintragen, dann Reservieren. Der Gast gilt sofort als eingecheckt.`);
    byId('fpResName').focus();
  });

  // Aus einem Mailtext lesen. Kein Postfachzugriff - das braucht einen Server.
  function parseMail(text) {
    const clean = text.replace(/\s+/g, ' ');
    const guests = Number((/(\d{1,2})\s*(?:personen|pers\.?|gäste|gaeste|leute)/i.exec(clean) || [])[1]) || null;
    const dmy = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(clean);
    const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(clean);

    // Das Datum zuerst herausnehmen, sonst liest der Zeit-Ausdruck "24.08"
    // als 24:08. Erst danach nach der Uhrzeit suchen.
    const ohneDatum = clean.replace(dmy?.[0] || ' ', ' ').replace(iso?.[0] || ' ', ' ');
    const clock = /\b([0-2]?\d)[:.]([0-5]\d)\b/.exec(ohneDatum);
    const uhrOnly = (/\b([0-2]?\d)\s*uhr\b/i.exec(ohneDatum) || [])[1];
    // Das Schluesselwort darf gross oder klein stehen; der Name selbst muss
    // gross anfangen, sonst faengt der Ausdruck das naechstbeste Verb ein.
    const name = (/[Nn]ame[ns]?:?\s+([A-ZÄÖÜ][\wÄÖÜäöüß-]+(?:\s[A-ZÄÖÜ][\wÄÖÜäöüß-]+)?)/.exec(text) || [])[1]
      || (/[Ff]amilie\s+([A-ZÄÖÜ][\wÄÖÜäöüß-]+)/.exec(text) || [])[1]
      || (/\b(?:[Hh]err?n?|[Ff]rau)\s+([A-ZÄÖÜ][\wÄÖÜäöüß-]+)/.exec(text) || [])[1]
      || null;

    let date = today();
    if (iso) date = `${iso[1]}-${iso[2]}-${iso[3]}`;
    else if (dmy) {
      const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
      date = `${year}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;
    }
    const hour = clock ? clock[1] : uhrOnly;
    const minute = clock ? clock[2] : '00';
    return {
      name: name ? name.trim() : null,
      date,
      time: hour ? `${String(hour).padStart(2, '0')}:${minute}` : '12:00',
      guests
    };
  }

  byId('fpMailImport').addEventListener('click', () => {
    const text = byId('fpMailText').value;
    if (!text.trim()) return say('fpResResult', 'Bitte zuerst den Mailtext einfügen.');
    const parsed = parseMail(text);
    if (!parsed.name || !parsed.guests) {
      return say('fpResResult', 'Aus dem Text ließen sich Name und Personenzahl nicht sicher lesen. Bitte oben von Hand eintragen.');
    }
    addReservation({ ...parsed, dishes: {}, source: 'mail' });
    byId('fpMailText').value = '';
  });

  function paintSeating() {
    const plan = buildFloorplan(current());
    const numberOf = new Map(plan.tables.map(table => [table.id, table.number]));
    const list = byId('fpParties');
    list.textContent = '';

    const day = dayParties().sort((a, b) => a.time.localeCompare(b.time) || a.name.localeCompare(b.name));
    if (!day.length) {
      const note = document.createElement('li');
      note.className = 'fp-empty-list';
      note.textContent = 'Für diesen Tag ist noch nichts reserviert.';
      list.append(note);
    }
    for (const party of day) {
      const item = document.createElement('li');
      if (party.id === marked) item.className = 'is-marked';

      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'pick';
      pick.dataset.markParty = party.id;
      pick.setAttribute('aria-pressed', String(party.id === marked));

      const when = document.createElement('span');
      when.className = 'when';
      when.textContent = party.time;
      const name = document.createElement('b');
      name.textContent = party.name;
      const size = document.createElement('span');
      size.className = 'seat';
      size.textContent = `${party.guests}P`;
      pick.append(when, name, size);

      if (Object.keys(party.dishes || {}).length) {
        const dishes = document.createElement('span');
        dishes.className = 'dishes';
        dishes.textContent = dishLabel(party.dishes);
        pick.append(dishes);
      }

      const where = document.createElement('span');
      if (party.tableIds.length) {
        where.className = 'at';
        where.textContent = `Tisch ${tischListe(party.tableIds, plan)}`;
      } else {
        where.className = 'open';
        where.textContent = party.id === marked ? 'Tisch anklicken' : 'noch offen';
      }
      pick.append(where);

      // Zustand im Klartext neben der Zeile: ueberfaellig faellt hier genauso
      // auf wie auf der Karte, auch fuer Vorlesesoftware.
      const zustand = statusVon(party);
      if (party.tableIds.length && zustand !== 'kommt') {
        const chip = document.createElement('span');
        chip.className = 'fp-until'
          + (zustand === 'ueberfaellig' ? ' is-late' : zustand === 'da' ? ' is-here' : '');
        chip.textContent = {
          da: `✓ da · ${endeText(party)}`,
          wartet: `erwartet · ${endeText(party)}`,
          ueberfaellig: `überfällig seit ${alsUhrzeit(stamp(startsAt(party)) + KARENZ_MINUTEN)}`,
          weg: `gegangen ${party.left}`,
          vorbei: 'vorbei'
        }[zustand];
        pick.append(chip);
      }
      item.append(pick);

      // Einchecken direkt in der Zeile - der Weg mit der Tastatur. Auf der
      // Karte geht dasselbe mit einem Klick auf den Tisch.
      if (party.tableIds.length && zustand !== 'kommt' && zustand !== 'vorbei') {
        const arrive = document.createElement('button');
        arrive.type = 'button';
        arrive.dataset.arriveParty = party.id;
        arrive.textContent = party.arrived ? 'Doch nicht da' : 'Eingecheckt';
        item.append(arrive);

        const leave = document.createElement('button');
        leave.type = 'button';
        leave.dataset.leaveParty = party.id;
        leave.textContent = party.left ? 'Sitzt doch' : 'Fertig';
        item.append(leave);
      }

      if (party.tableIds.length) {
        // Umsetzen quer durch alle Etagen - der haeufigste Griff, wenn
        // spontan ein Raum gebraucht wird.
        const move = document.createElement('select');
        move.dataset.moveParty = party.id;
        move.setAttribute('aria-label', `${party.name} an einen anderen Tisch setzen`);
        const keep = document.createElement('option');
        keep.value = '';
        keep.textContent = 'Tisch wechseln …';
        move.append(keep);
        for (const level of plan.levels) {
          const group = document.createElement('optgroup');
          group.label = level.name;
          for (const table of level.tables) {
            if (party.tableIds.includes(table.id)) continue;
            const option = document.createElement('option');
            option.value = table.id;
            const belegt = collidesAt(party, [table.id], parties());
            option.textContent = `Tisch ${tisch(table)} · ${table.seats}P`
              + (belegt ? ` · belegt (${belegt.name})` : '');
            option.disabled = Boolean(belegt) || party.guests > table.seats || blocked().includes(table.id);
            group.append(option);
          }
          if (group.children.length) move.append(group);
        }
        item.append(move);
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.dataset.removeParty = party.id;
      remove.textContent = 'Entfernen';
      item.append(remove);
      list.append(item);
    }

    // Kuechenuebersicht: was ist fuer diesen Tag vorbestellt?
    const sums = {};
    let mitWunsch = 0;
    for (const party of day) {
      const own = Object.entries(party.dishes || {});
      if (own.length) mitWunsch += 1;
      for (const [id, count] of own) sums[id] = (sums[id] || 0) + count;
    }
    const gaeste = day.reduce((sum, party) => sum + party.guests, 0);
    say('fpKitchen', Object.keys(sums).length
      ? `Küche für ${moment.date}: ${dishLabel(sums)} – vorbestellt von ${mitWunsch} von ${day.length} Reservierungen, insgesamt ${gaeste} Gäste.`
      : `Küche für ${moment.date}: noch nichts vorbestellt, ${gaeste} Gäste erwartet.`);

    paintTableList(plan);
  }

  byId('fpParties').addEventListener('change', event => {
    const move = event.target.closest('[data-move-party]');
    if (!move || !move.value) return;
    marked = move.dataset.moveParty;
    seatMarked(move.value);
  });

  byId('fpParties').addEventListener('click', event => {
    const mark = event.target.closest('[data-mark-party]');
    if (mark) {
      const party = parties().find(entry => entry.id === mark.dataset.markParty);
      marked = marked === mark.dataset.markParty ? null : mark.dataset.markParty;
      // Zur Reservierungszeit springen, sonst zeigt die Karte einen anderen
      // Moment als den, fuer den gerade eingeteilt wird.
      if (marked && party) moment.time = party.time;
      paint();
      seatResult(!marked ? 'Markierung aufgehoben.'
        : party?.tableIds.length
          ? `${party.name} sitzt bereits – jetzt den neuen Tisch anklicken.`
          : `${party?.name} (${party?.guests}P, ${party?.time}) ist markiert – jetzt einen freien Tisch anklicken.`);
      return;
    }
    const arrive = event.target.closest('[data-arrive-party]');
    if (arrive) return toggleArrival(arrive.dataset.arriveParty);
    const leave = event.target.closest('[data-leave-party]');
    if (leave) return checkOut(leave.dataset.leaveParty);

    const button = event.target.closest('[data-remove-party]');
    if (!button) return;
    const gone = parties().find(party => party.id === button.dataset.removeParty);
    if (marked === button.dataset.removeParty) marked = null;
    putParties(parties().filter(party => party.id !== button.dataset.removeParty));
    melde({ art: 'entfernen', id: button.dataset.removeParty });
    seatResult(gone ? `${gone.name} entfernt.` : 'Reservierung entfernt.');
    paint();
  });

  // ---- Ankunft und Abgang ---------------------------------------------------

  /**
   * Einchecken und wieder zuruecknehmen. Die Ankunftszeit ist der gewaehlte
   * Moment, nicht die Systemuhr - sonst stimmt sie nicht mehr, wenn abends der
   * Mittag nachgetragen wird.
   */
  function toggleArrival(partyId, tableId = null) {
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const party = list.find(entry => entry.id === partyId);
    if (!party) return;
    const wo = tableId ? ` an Tisch ${tisch(tableId)}` : '';
    if (party.arrived) {
      party.arrived = null;
      party.left = null;
      putParties(list);
      melde({ art: 'ankunft', id: party.id, zeit: null });
      paint();
      return seatResult(`${party.name} ist wieder als erwartet markiert${wo}. Nochmal klicken checkt ein.`);
    }
    party.arrived = moment.time;
    party.left = null;
    putParties(list);
    melde({ art: 'ankunft', id: party.id, zeit: party.arrived });
    paint();
    seatResult(`${party.name} ist eingecheckt: ${party.guests} Personen${wo}, ${moment.time}. `
      + (endeVon(party) ? `Der Tisch ist bis ${endeVon(party)} belegt.` : 'Der Tisch bleibt belegt, bis „Fertig“ gedrückt wird.'));
  }

  /** Abgerechnet und gegangen - der Tisch ist ab sofort wieder frei. */
  function checkOut(partyId) {
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const party = list.find(entry => entry.id === partyId);
    if (!party) return;
    if (party.left) {
      party.left = null;
      putParties(list);
      melde({ art: 'abgang', id: party.id, zeit: null });
      paint();
      return seatResult(`${party.name} sitzt wieder – der Abgang wurde zurückgenommen.`);
    }
    party.left = moment.time;
    if (!party.arrived) party.arrived = party.time;
    putParties(list);
    melde({ art: 'abgang', id: party.id, zeit: party.left });
    paint();
    seatResult(`${party.name} ist gegangen (${moment.time}). Tisch ${tischListe(party.tableIds)} ist wieder frei.`);
  }

  /** Zeitliche Kollision auf denselben Tischen, inklusive Pufferzeit. */
  function collidesAt(party, tableIds, list) {
    const buffer = Number(policy().bufferMinutes) || 0;
    const from = stamp(startsAt(party)) - buffer;
    const to = stamp(startsAt(party)) + minutesFor(party.guests, party.time) + buffer;
    return list.find(other => {
      if (other.id === party.id || other.date !== party.date) return false;
      if (!other.tableIds.some(id => tableIds.includes(id))) return false;
      const start = stamp(startsAt(other));
      return start < to && from < start + minutesFor(other.guests, other.time);
    });
  }

  function seatMarked(tableId) {
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === tableId);
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const party = list.find(entry => entry.id === marked);
    if (!table || !party) { marked = null; return; }

    if (blocked().includes(tableId)) return seatResult(`Tisch ${tisch(table)} ist gesperrt. Erst entsperren.`);
    if (party.guests > table.seats) {
      return seatResult(`${party.name} sind ${party.guests} Personen – Tisch ${tisch(table)} hat nur ${table.seats} Plätze.`);
    }
    const clash = collidesAt(party, [tableId], list);
    if (clash) return seatResult(`Tisch ${tisch(table)} ist um ${party.time} schon von ${clash.name} belegt.`);

    party.tableIds = [tableId];
    marked = null;
    putParties(list);
    melde({ art: 'tisch', id: party.id, tableIds: party.tableIds });
    seatResult(`${party.name} sitzt an Tisch ${tisch(table)} (${party.guests} von ${table.seats} Plätzen, ${party.time}).`);
    paint();

    const nextOpen = dayParties().find(entry => !entry.tableIds.length);
    const button = nextOpen && byId('fpParties').querySelector(`[data-mark-party="${nextOpen.id}"]`);
    if (button) button.focus();
    else byId('fpTableList').querySelector(`[data-table-id="${tableId}"][data-field="name"]`)?.focus();
  }

  function paintFloorMove() {
    const plan = buildFloorplan(current());
    for (const [id, vorgabe] of [['fpMoveFrom', 0], ['fpMoveTo', 1]]) {
      const select = byId(id);
      const gewaehlt = select.value;
      select.textContent = '';
      plan.levels.forEach((level, index) => {
        const option = document.createElement('option');
        option.value = level.id;
        option.textContent = level.name;
        option.selected = gewaehlt ? level.id === gewaehlt : index === Math.min(vorgabe, plan.levels.length - 1);
        select.append(option);
      });
    }
    byId('fpMoveFloorForm').hidden = plan.levels.length < 2;
  }

  byId('fpMoveFloorForm').addEventListener('submit', event => {
    event.preventDefault();
    const von = byId('fpMoveFrom').value;
    const nach = byId('fpMoveTo').value;
    if (von === nach) return seatResult('Bitte zwei verschiedene Etagen wählen.');

    const plan = buildFloorplan(current());
    const ziel = plan.levels.find(level => level.id === nach);
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    // Nur wer an diesem Tag auf der Ausgangsetage sitzt.
    const betroffen = list.filter(party => party.date === moment.date && party.tableIds.length
      && party.tableIds.every(id => plan.tables.find(table => table.id === id)?.levelId === von))
      .sort((a, b) => b.guests - a.guests);
    if (!betroffen.length) return seatResult(`Auf dieser Etage sitzt am ${moment.date} niemand.`);

    // Erst alle abraeumen, dann neu setzen - sonst blockieren sie sich selbst.
    for (const party of betroffen) party.tableIds = [];

    const umgesetzt = [];
    const offen = [];
    for (const party of betroffen) {
      const frei = ziel.tables
        .filter(table => !blocked().includes(table.id))
        .filter(table => party.guests <= table.seats)
        .filter(table => !collidesAt(party, [table.id], list))
        // Kleinster passender Tisch, wie bei der automatischen Verteilung.
        .sort((a, b) => (a.seats - party.guests) - (b.seats - party.guests) || a.number - b.number);
      if (!frei.length) { offen.push(party); continue; }
      party.tableIds = [frei[0].id];
      umgesetzt.push(`${party.name} an Tisch ${tableLabel(frei[0], plan)}`);
    }
    putParties(list);
    paint();
    seatResult(`${umgesetzt.length} umgesetzt nach ${ziel.name}: ${umgesetzt.join(', ') || '–'}.`
      + (offen.length ? ` Kein Platz für: ${offen.map(party => `${party.name} (${party.guests}P)`).join(', ')} – steht wieder offen.` : ''));
  });

  byId('fpAutoSeat').addEventListener('click', () => {
    const plan = buildFloorplan(current());
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const open = list.filter(party => party.date === moment.date && !party.tableIds.length)
      .sort((a, b) => b.guests - a.guests);
    if (!open.length) return seatResult('Für diesen Tag ist keine Reservierung offen.');

    const seated = [];
    const failed = [];
    for (const party of open) {
      const result = assignTables({
        floorplan: plan,
        occupancy: occupancyOf(list.filter(entry => entry.date === party.date)),
        blocked: blocked(),
        guests: party.guests,
        startsAt: startsAt(party),
        policy: policy(),
        withAlternatives: false
      });
      if (!result.ok) { failed.push({ party, reason: result.reason }); continue; }
      party.tableIds = result.tableIds;
      seated.push({ name: party.name, tableIds: result.tableIds, time: party.time });
    }
    putParties(list);
    paint();

    const gruende = { pacing: 'Zeitfenster voll', no_fit: 'kein passender Tisch', capacity: 'Deckel erreicht', invalid: 'Eingabe' };
    seatResult(`${seated.length} verteilt: ${seated.map(entry => `${entry.name} ${entry.time} an Tisch ${tischListe(entry.tableIds)}`).join(', ') || '–'}.`
      + (failed.length ? ` Ohne Tisch: ${failed.map(entry => `${entry.party.name} (${entry.party.guests}P, ${gruende[entry.reason]})`).join(', ')}.` : ''));
  });

  byId('fpClearSeating').addEventListener('click', () => {
    if (!dayParties().length) return seatResult('Für diesen Tag ist nichts eingetragen.');
    if (!confirm(`Alle Reservierungen vom ${moment.date} mit Namen entfernen?`)) return;
    putParties(parties().filter(party => party.date !== moment.date));
    marked = null;
    paint();
    seatResult(`Reservierungen vom ${moment.date} gelöscht. Für diesen Tag sind keine Namen mehr gespeichert.`);
  });

  // ---- Tischliste ----------------------------------------------------------

  function paintTableList(plan) {
    const box = byId('fpTableList');
    const active = document.activeElement;
    const keep = active?.dataset?.tableId && box.contains(active)
      ? { id: active.dataset.tableId, field: active.dataset.field, start: active.selectionStart }
      : null;
    box.textContent = '';

    const sitting = seatedNow();
    const open = dayParties().filter(party => !party.tableIds.length);
    const freiBis = freeUntilMap();
    const suche = tableFilter.text.trim().toLowerCase();

    // Filter und Suche entscheiden, welche Zeilen ueberhaupt entstehen. Bei 25
    // und mehr Tischen ist die vollstaendige Liste im Betrieb nicht lesbar.
    const sichtbar = plan.tables.filter(table => {
      const party = sitting.find(entry => entry.tableIds.includes(table.id));
      const isBlocked = blocked().includes(table.id);
      if (tableFilter.mode === 'frei' && (party || isBlocked)) return false;
      if (tableFilter.mode === 'belegt' && !party) return false;
      if (tableFilter.mode === 'ueberfaellig' && (!party || statusVon(party) !== 'ueberfaellig')) return false;
      if (!suche) return true;
      return String(table.number).includes(suche)
        || tableLabel(table, plan).toLowerCase().includes(suche)
        || table.levelName.toLowerCase().includes(suche)
        || (party?.name || '').toLowerCase().includes(suche);
    });

    say('fpFilterInfo', sichtbar.length === plan.tables.length
      ? `Alle ${plan.tables.length} Tische.`
      : `${sichtbar.length} von ${plan.tables.length} Tischen angezeigt.`);

    for (const table of sichtbar) {
      const party = sitting.find(entry => entry.tableIds.includes(table.id));
      const isBlocked = blocked().includes(table.id);

      const zustand = party ? statusVon(party) : null;
      const row = document.createElement('div');
      row.className = 'fp-table-row'
        + (party ? ' is-busy' : '') + (zustand === 'ueberfaellig' ? ' is-late' : '')
        + (isBlocked ? ' is-blocked' : '') + (table.id === picked ? ' is-picked' : '');

      const no = document.createElement('span');
      no.className = 'no';
      no.textContent = String(table.number);
      const meta = document.createElement('small');
      meta.textContent = `${table.seats}P · ${table.levelName}`;
      no.append(meta);
      row.append(no);

      const name = document.createElement('input');
      name.type = 'text';
      name.maxLength = 40;
      name.value = party?.name || '';
      // "Frei" allein hilft an der Tuer nicht - die Frage ist, wie lange.
      name.placeholder = isBlocked ? 'gesperrt' : freiBis[table.id] ? `frei bis ${freiBis[table.id]}` : 'frei';
      name.disabled = isBlocked;
      name.dataset.tableId = table.id;
      name.dataset.field = 'name';
      name.setAttribute('aria-label', `Name für Tisch ${tisch(table)} um ${moment.time}`);
      row.append(name);

      const actions = document.createElement('div');
      actions.className = 'fp-row-actions';

      if (party) {
        const chip = document.createElement('span');
        chip.className = 'fp-until'
          + (zustand === 'ueberfaellig' ? ' is-late' : party.arrived ? ' is-here' : '');
        chip.textContent = zustand === 'ueberfaellig'
          ? 'überfällig'
          : `${party.arrived ? '✓ ' : ''}${endeText(party)}`;
        actions.append(chip);

        const arrive = document.createElement('button');
        arrive.type = 'button';
        arrive.dataset.tableId = table.id;
        arrive.dataset.action = 'arrive';
        arrive.textContent = party.arrived ? 'Doch nicht da' : 'Eingecheckt';
        actions.append(arrive);
      }

      const guests = document.createElement('input');
      guests.type = 'number';
      guests.min = '1';
      guests.max = String(table.seats);
      guests.value = party ? String(party.guests) : '';
      guests.placeholder = `${table.seats}`;
      guests.disabled = !party;
      guests.dataset.tableId = table.id;
      guests.dataset.field = 'guests';
      guests.setAttribute('aria-label', `Personen an Tisch ${tisch(table)}, höchstens ${table.seats}`);
      actions.append(guests);

      if (!party && !isBlocked && open.length) {
        const choose = document.createElement('select');
        choose.dataset.tableId = table.id;
        choose.dataset.field = 'assign';
        choose.setAttribute('aria-label', `Offene Reservierung an Tisch ${tisch(table)} setzen`);
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = 'Reservierung wählen …';
        choose.append(empty);
        for (const entry of open) {
          const option = document.createElement('option');
          option.value = entry.id;
          option.textContent = `${entry.time} ${entry.name} (${entry.guests}P)`;
          option.disabled = entry.guests > table.seats;
          choose.append(option);
        }
        actions.append(choose);
      }

      const free = document.createElement('button');
      free.type = 'button';
      free.dataset.tableId = table.id;
      free.dataset.action = 'free';
      free.textContent = 'Frei machen';
      free.disabled = !party;
      actions.append(free);

      const block = document.createElement('button');
      block.type = 'button';
      block.dataset.tableId = table.id;
      block.dataset.action = 'block';
      block.textContent = isBlocked ? 'Entsperren' : 'Sperren';
      block.disabled = Boolean(party);
      actions.append(block);
      row.append(actions);
      box.append(row);
    }

    if (keep) {
      const back = box.querySelector(`[data-table-id="${keep.id}"][data-field="${keep.field}"]`);
      if (back && !back.disabled) {
        back.focus();
        if (back.type === 'text' && keep.start != null) back.setSelectionRange(keep.start, keep.start);
      }
    }
  }

  /** Name auf einen Tisch schreiben. Leerer Name macht ihn frei. */
  function setTableName(tableId, rawName) {
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === tableId);
    if (!table) return;
    const name = rawName.trim();
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const sitting = seatedNow().find(entry => entry.tableIds.includes(tableId));
    const existing = sitting && list.find(party => party.id === sitting.id);

    if (!name) {
      if (!existing) return;
      existing.tableIds = existing.tableIds.filter(id => id !== tableId);
      putParties(list);
      seatResult(`Tisch ${tisch(table)} ist wieder frei – ${existing.name} steht offen.`);
      paint();
      return;
    }
    if (existing) {
      existing.name = name;
      putParties(list);
      seatResult(`Tisch ${tisch(table)}: ${name}.`);
      paint();
      return;
    }
    if (blocked().includes(tableId)) return seatResult(`Tisch ${tisch(table)} ist gesperrt. Erst entsperren.`);

    const offen = list.find(party => party.date === moment.date && !party.tableIds.length && party.name === name);
    if (offen) {
      const clash = collidesAt(offen, [tableId], list);
      if (clash) return seatResult(`Tisch ${tisch(table)} ist um ${offen.time} schon von ${clash.name} belegt.`);
      offen.tableIds = [tableId];
      putParties(list);
      seatResult(`${name} sitzt an Tisch ${tisch(table)} (${offen.guests} von ${table.seats} Plätzen).`);
      paint();
      return;
    }

    // Neu angelegt und direkt an diesen Tisch gesetzt.
    const fresh = addReservation(
      { name, date: moment.date, time: moment.time, guests: Math.min(2, table.seats), dishes: {} },
      { silent: true }
    );
    putParties(parties().map(party => (party.id === fresh.id ? { ...party, tableIds: [tableId] } : party)));
    seatResult(`${name} sitzt an Tisch ${tisch(table)} um ${moment.time}. Personenzahl in der Zeile anpassen.`);
    paint();
  }

  byId('fpTableList').addEventListener('change', event => {
    const field = event.target.closest('[data-field]');
    if (!field) return;
    if (field.dataset.field === 'name') return setTableName(field.dataset.tableId, field.value);
    if (field.dataset.field === 'assign') {
      if (!field.value) return;
      marked = field.value;
      return seatMarked(field.dataset.tableId);
    }
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === field.dataset.tableId);
    const list = parties().map(party => ({ ...party, tableIds: [...party.tableIds] }));
    const sitting = seatedNow().find(entry => entry.tableIds.includes(field.dataset.tableId));
    const party = sitting && list.find(entry => entry.id === sitting.id);
    if (!table || !party) return;
    const wanted = Math.max(1, Math.round(Number(field.value) || 1));
    const seats = party.tableIds.reduce((sum, id) => sum + (plan.tables.find(item => item.id === id)?.seats || 0), 0);
    party.guests = Math.min(wanted, seats);
    putParties(list);
    seatResult(wanted > seats
      ? `Tisch ${tisch(table)} hat nur ${seats} Plätze – auf ${seats} begrenzt.`
      : `Tisch ${tisch(table)}: ${party.name}, ${party.guests} Personen.`);
    paint();
  });

  // ---- Reservierungsdienst -------------------------------------------------
  //
  // Der Dienst ist eine Ergaenzung, keine Voraussetzung. Faellt er aus, laeuft
  // die Planung im Haus unveraendert weiter - nur Onlinebuchungen kommen dann
  // nicht an. Ein Werkzeug, das im Mittag am Netz haengt, waere schlechter als
  // das bisherige.

  const dienst = { an: false, verbunden: false, zuletzt: 0 };

  function dienstInfo(text) { say('fpDienstInfo', text); }

  /** Sagt dem Dienst Bescheid - und schweigt, wenn er nicht eingerichtet ist. */
  async function melde(befehl) {
    if (!dienst.an || !hausToken()) return;
    const antwort = await sendeAktion(hausToken(), befehl);
    if (antwort?.grund === 'token') dienstInfo('Der Hausschlüssel stimmt nicht mehr. Bitte neu eintragen.');
  }

  async function meldeNeu(party) {
    if (!dienst.an || !hausToken()) return;
    await sendeReservierung(hausToken(), party);
  }

  /**
   * Uebernimmt den Stand des Dienstes. Der Dienst ist die Wahrheit fuer
   * Reservierungen: nur er sieht die Onlinebuchungen aller Gaeste. Alles
   * andere - Tischplan, Sperren - bleibt hier.
   */
  function uebernimm(stand) {
    if (!Array.isArray(stand?.parties)) return;
    const state = store.load();
    const vorher = JSON.stringify(state.parties || []);
    const nachher = JSON.stringify(stand.parties);
    if (vorher === nachher) return;
    const neueOnline = stand.parties.filter(party => party.quelle === 'online'
      && !(state.parties || []).some(alt => alt.id === party.id));
    store.setParties(stand.parties);
    paint();
    if (neueOnline.length) {
      const namen = neueOnline.map(party => `${party.name} (${party.guests}P, ${party.time})`).join(', ');
      seatResult(`Neue Onlinebuchung: ${namen}.`);
      dienstInfo(`Zuletzt eingegangen: ${namen}.`);
    }
  }

  async function starteDienst() {
    const adresse = await apiAdresse();
    if (!adresse) {
      dienstInfo('Kein Dienst eingetragen. Onlinebuchungen sind aus; alles läuft nur in diesem Browser. '
        + 'Zum Einschalten die Adresse in site/data/haus.json eintragen.');
      byId('fpDienstForm').hidden = true;
      return;
    }
    dienst.an = true;
    byId('fpToken').value = hausToken();
    if (!hausToken()) {
      return dienstInfo('Dienst gefunden. Bitte einmal den Hausschlüssel eintragen, dann kommen Onlinebuchungen hier an.');
    }
    bleibVerbunden(hausToken(), uebernimm, zustand => {
      dienst.verbunden = zustand === 'verbunden';
      dienstInfo(dienst.verbunden
        ? `Verbunden mit ${adresse}. Onlinebuchungen erscheinen sofort.`
        : 'Verbindung zum Dienst unterbrochen. Die Planung läuft weiter, Onlinebuchungen kommen gerade nicht an.');
    });
  }

  function paintStandardEtage() {
    const select = byId('fpStandardEtage');
    const gewaehlt = select.value;
    const plan = buildFloorplan(current());
    select.textContent = '';
    for (const level of plan.levels) {
      const option = document.createElement('option');
      option.value = level.id;
      option.textContent = level.name;
      option.selected = level.id === gewaehlt;
      select.append(option);
    }
  }

  byId('fpDienstForm').addEventListener('submit', async event => {
    event.preventDefault();
    setzeToken(byId('fpToken').value.trim());
    if (!hausToken()) return dienstInfo('Ohne Hausschlüssel kann der Dienst nicht angesprochen werden.');
    dienstInfo('Wird veröffentlicht …');
    const platz = freiePlaetze(moment.date, moment.time);
    const antwort = await sendePlan(hausToken(), {
      floorplan: current(),
      standardEtage: byId('fpStandardEtage').value || null,
      blockedTables: blocked(),
      deckel: platz.limit
    });
    if (antwort?.grund === 'token') return dienstInfo('Der Hausschlüssel stimmt nicht. Bitte prüfen.');
    if (!antwort?.ok) return dienstInfo('Der Dienst war nicht erreichbar. Später nochmal versuchen.');
    dienstInfo(`Veröffentlicht: ${buildFloorplan(current()).tables.length} Tische, Standard-Etage `
      + `${byId('fpStandardEtage').selectedOptions[0]?.textContent || '–'}. Onlinebuchungen werden ab jetzt so eingeteilt.`);
    starteDienst();
  });

  // ---- Reiter ---------------------------------------------------------------

  const TAB_KEY = 'wirtschaft-tischplan-reiter';
  const tabs = () => [...byId('fpTabs').querySelectorAll('[role="tab"]')];

  function zeigeReiter(name, { fokus = false } = {}) {
    for (const tab of tabs()) {
      const aktiv = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(aktiv));
      tab.tabIndex = aktiv ? 0 : -1;
      byId(tab.getAttribute('aria-controls')).hidden = !aktiv;
      if (aktiv && fokus) tab.focus();
    }
    try { localStorage.setItem(TAB_KEY, name); } catch { /* privater Modus */ }
  }

  byId('fpTabs').addEventListener('click', event => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) zeigeReiter(tab.dataset.tab);
  });

  // Pfeiltasten wandern durch die Reiter - das erwartete Verhalten einer
  // Reiterleiste und der einzige Weg ohne Maus.
  byId('fpTabs').addEventListener('keydown', event => {
    const schritt = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    const liste = tabs();
    const hier = liste.findIndex(tab => tab.getAttribute('aria-selected') === 'true');
    let ziel = null;
    if (schritt) ziel = (hier + schritt + liste.length) % liste.length;
    else if (event.key === 'Home') ziel = 0;
    else if (event.key === 'End') ziel = liste.length - 1;
    if (ziel === null) return;
    event.preventDefault();
    zeigeReiter(liste[ziel].dataset.tab, { fokus: true });
  });

  // ---- Schnellwahl der Personenzahl ----------------------------------------

  for (const anzahl of [2, 3, 4, 6, 8]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.quick = String(anzahl);
    button.textContent = `${anzahl}P`;
    button.setAttribute('aria-label', `${anzahl} Personen`);
    byId('fpQuick').append(button);
  }
  byId('fpQuick').addEventListener('click', event => {
    const button = event.target.closest('[data-quick]');
    if (!button) return;
    byId('fpResGuests').value = button.dataset.quick;
    for (const other of byId('fpQuick').querySelectorAll('[data-quick]')) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    byId('fpResName').focus();
  });

  byId('fpFilter').addEventListener('click', event => {
    const button = event.target.closest('[data-filter]');
    if (!button) return;
    tableFilter.mode = button.dataset.filter;
    for (const other of byId('fpFilter').querySelectorAll('[data-filter]')) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    paintSeating();
  });

  byId('fpSearch').addEventListener('input', event => {
    tableFilter.text = event.target.value;
    paintSeating();
    // Der Fokus muss im Suchfeld bleiben - paintSeating zeichnet die Liste neu.
    byId('fpSearch').focus();
  });

  byId('fpTableList').addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.tableId;
    const plan = buildFloorplan(current());
    const table = plan.tables.find(item => item.id === id);
    if (button.dataset.action === 'arrive') {
      const party = partyAtTable(id);
      return party ? toggleArrival(party.id, id) : undefined;
    }
    if (button.dataset.action === 'free') return setTableName(id, '');
    if (seatedNow().some(party => party.tableIds.includes(id))) {
      return seatResult(`Tisch ${tisch(table)} ist belegt. Erst frei machen, dann sperren.`);
    }
    const set = new Set(blocked());
    const wasBlocked = set.has(id);
    if (wasBlocked) set.delete(id); else set.add(id);
    putBlocked([...set]);
    seatResult(`Tisch ${tisch(table)} ist jetzt ${wasBlocked ? 'wieder frei' : 'gesperrt'}.`);
    paint();
  });

  // ---- Raeume, Tische, Stuehle ---------------------------------------------

  function paintLevels() {
    const box = byId('fpLevels');
    box.textContent = '';
    const plan = buildFloorplan(current());
    for (const level of [...layout().levels].sort((a, b) => a.order - b.order)) {
      const wrap = document.createElement('div');
      wrap.className = 'fp-level-block';

      const head = document.createElement('div');
      head.className = 'fp-level-row';
      const nameLabel = document.createElement('label');
      nameLabel.className = 'fp-level-name';
      nameLabel.append('Etage');
      const nameInput = document.createElement('input');
      Object.assign(nameInput, { type: 'text', maxLength: 40, value: level.name });
      nameInput.dataset.level = level.id;
      nameInput.dataset.field = 'name';
      nameLabel.append(nameInput);
      head.append(nameLabel);

      // Mengen statt Einzelklicks. Ein Haus mit 25 Tischen einzeln anzulegen
      // waren 25 Griffe; hier traegt man "8 Zweier, 6 Vierer" ein und fertig.
      const eigene = plan.tables.filter(entry => entry.levelId === level.id);
      const add = document.createElement('div');
      add.className = 'fp-sizes fp-counts';
      for (const seats of SIZES) {
        const label = document.createElement('label');
        label.append(`${seats}er`);
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.max = '60';
        input.value = String(eigene.filter(entry => entry.seats === seats).length);
        input.dataset.countLevel = level.id;
        input.dataset.seats = String(seats);
        input.setAttribute('aria-label', `Anzahl Tische mit ${seats} Plätzen in ${level.name}`);
        label.append(input);
        add.append(label);
      }
      head.append(add);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'quiet';
      remove.dataset.removeLevel = level.id;
      remove.textContent = 'Etage entfernen';
      head.append(remove);
      wrap.append(head);

      const tables = document.createElement('div');
      tables.className = 'fp-chairs-list';
      for (const table of plan.tables.filter(entry => entry.levelId === level.id)) {
        const chip = document.createElement('div');
        chip.className = 'fp-chair-chip';
        const label = document.createElement('b');
        label.textContent = `Tisch ${tisch(table)}`;
        const seats = document.createElement('span');
        seats.textContent = `${table.seats} Stühle`;
        const minus = document.createElement('button');
        minus.type = 'button';
        minus.dataset.chair = table.id;
        minus.dataset.step = '-1';
        minus.textContent = '−';
        minus.setAttribute('aria-label', `Stuhl an Tisch ${tisch(table)} entfernen`);
        minus.disabled = table.seats <= 1;
        const plus = document.createElement('button');
        plus.type = 'button';
        plus.dataset.chair = table.id;
        plus.dataset.step = '1';
        plus.textContent = '+';
        plus.setAttribute('aria-label', `Stuhl an Tisch ${tisch(table)} ergänzen`);
        plus.disabled = table.seats >= GRID.maxSeats;
        const drop = document.createElement('button');
        drop.type = 'button';
        drop.dataset.removeTable = table.id;
        drop.textContent = 'Tisch weg';
        chip.append(label, seats, minus, plus, drop);
        tables.append(chip);
      }
      wrap.append(tables);
      box.append(wrap);
    }
  }

  byId('fpLevels').addEventListener('change', event => {
    const input = event.target.closest('[data-level][data-field="name"]');
    if (!input) return;
    const config = current();
    const level = activeLayout(config).levels.find(item => item.id === input.dataset.level);
    if (!level) return;
    level.name = input.value.trim() || level.name;
    save(config, { quiet: true });
  });

  /**
   * Setzt die Anzahl der Tische einer Groesse auf einer Etage. Zu wenige werden
   * ergaenzt, zu viele entfernt - aber nur solche, an denen an keinem Tag eine
   * Reservierung haengt. Einen belegten Tisch stillschweigend zu loeschen waere
   * der teuerste Fehler, den dieses Feld machen koennte.
   */
  function setzeAnzahl(levelId, seats, wunsch) {
    const config = current();
    const level = activeLayout(config).levels.find(item => item.id === levelId);
    if (!level) return;
    const ziel = Math.max(0, Math.min(60, Math.trunc(Number(wunsch) || 0)));
    const gleiche = level.tables.filter(table => table.seats === seats);

    if (ziel > gleiche.length) {
      for (let i = gleiche.length; i < ziel; i += 1) {
        level.tables.push({ id: nextTableId(level), seats, col: null, row: null });
      }
      save(config);
      return warn(`${level.name}: jetzt ${ziel} Tische mit ${seats} Plätzen.`);
    }
    if (ziel === gleiche.length) return warn('');

    const belegt = new Set(parties().flatMap(party => party.tableIds));
    // Von hinten wegnehmen: die zuletzt angelegten Tische zuerst.
    const frei = [...gleiche].reverse().filter(table => !belegt.has(table.id));
    const wieViele = gleiche.length - ziel;
    const weg = new Set(frei.slice(0, wieViele).map(table => table.id));
    level.tables = level.tables.filter(table => !weg.has(table.id));
    save(config);

    const fehlen = wieViele - weg.size;
    warn(fehlen > 0
      ? `${weg.size} von ${wieViele} Tischen mit ${seats} Plätzen entfernt. ${fehlen} bleiben – dort hängt noch eine Reservierung. Erst die Reservierung entfernen.`
      : `${level.name}: jetzt ${ziel} Tische mit ${seats} Plätzen.`);
  }

  byId('fpLevels').addEventListener('change', event => {
    const feld = event.target.closest('[data-count-level]');
    if (!feld) return;
    setzeAnzahl(feld.dataset.countLevel, Number(feld.dataset.seats), feld.value);
  });

  byId('fpLevels').addEventListener('click', event => {
    const config = current();
    const active = activeLayout(config);

    const chair = event.target.closest('[data-chair]');
    if (chair) {
      for (const level of active.levels) {
        const table = level.tables.find(item => item.id === chair.dataset.chair);
        if (!table) continue;
        const next = clampSeats(table.seats + Number(chair.dataset.step));
        const sitting = seatedNow().find(entry => entry.tableIds.includes(table.id));
        if (sitting && sitting.guests > next) {
          return warn(`An diesem Tisch sitzen ${sitting.guests} Personen (${sitting.name}) – so weit lässt er sich nicht verkleinern.`);
        }
        table.seats = next;
        save(config, { quiet: true });
        return;
      }
      return;
    }

    const drop = event.target.closest('[data-remove-table]');
    if (drop) {
      if (!confirm('Diesen Tisch aus der Ordnung entfernen?')) return;
      for (const level of active.levels) {
        level.tables = level.tables.filter(table => table.id !== drop.dataset.removeTable);
      }
      active.combos = active.combos.filter(combo => !combo.tables.includes(drop.dataset.removeTable));
      save(config);
      return;
    }

    const removeLevel = event.target.closest('[data-remove-level]');
    if (removeLevel) {
      if (active.levels.length <= 1) return warn('Es muss mindestens eine Etage bleiben.');
      if (!confirm('Diese Etage mit allen Tischen entfernen?')) return;
      const id = removeLevel.dataset.removeLevel;
      active.levels = active.levels.filter(level => level.id !== id);
      active.combos = active.combos.filter(combo => !combo.tables.some(entry => entry.startsWith(`${id}-`)));
      config.policy.levelOrder = config.policy.levelOrder.filter(entry => entry !== id);
      save(config);
    }
  });

  byId('fpAddLevel').addEventListener('submit', event => {
    event.preventDefault();
    const config = current();
    const active = activeLayout(config);
    if (active.levels.length >= 4) return warn('Mehr als vier Etagen sind nicht vorgesehen.');
    const name = byId('fpNewName').value.trim();
    if (!name) return;
    let id = slug(name);
    while (active.levels.some(level => level.id === id)) id = `${id}-2`.slice(0, 20);
    active.levels.push({
      id,
      name,
      order: Math.max(0, ...active.levels.map(level => level.order)) + 1,
      tables: [{ id: `${id}-t01`, seats: 4, col: null, row: null }]
    });
    if (!config.policy.levelOrder.includes(id)) config.policy.levelOrder.push(id);
    byId('fpNewName').value = '';
    save(config);
  });

  // ---- Tischordnungen ------------------------------------------------------

  byId('fpLayoutForm').addEventListener('submit', event => {
    event.preventDefault();
    const config = current();
    const name = byId('fpLayoutName').value.trim();
    if (!name) return;
    if (config.layouts.length >= 12) return warn('Mehr als zwölf Ordnungen sind nicht vorgesehen.');
    let id = slug(name);
    while (config.layouts.some(entry => entry.id === id)) id = `${id}-2`.slice(0, 20);
    // Neue Ordnung uebernimmt die Raeume, aber keine Tische - sie wird von
    // Grund auf gestellt. Zum Uebernehmen gibt es den Kopieren-Knopf.
    config.layouts.push({
      id,
      name,
      levels: activeLayout(config).levels.map(level => ({ id: level.id, name: level.name, order: level.order, tables: [] })),
      combos: []
    });
    config.activeLayout = id;
    byId('fpLayoutName').value = '';
    picked = null;
    save(config, { quiet: true });
    warn(`Ordnung "${name}" angelegt – die Räume sind da, die Tische stellst du neu.`);
  });

  byId('fpLayoutCopy').addEventListener('click', () => {
    const config = current();
    const source = activeLayout(config);
    if (config.layouts.length >= 12) return warn('Mehr als zwölf Ordnungen sind nicht vorgesehen.');
    let id = `${source.id}-kopie`.slice(0, 20);
    while (config.layouts.some(entry => entry.id === id)) id = `${id}2`.slice(0, 20);
    config.layouts.push(JSON.parse(JSON.stringify({ ...source, id, name: `${source.name} (Kopie)` })));
    config.activeLayout = id;
    save(config, { quiet: true });
    warn(`"${source.name}" kopiert.`);
  });

  byId('fpLayoutDelete').addEventListener('click', () => {
    const config = current();
    if (config.layouts.length <= 1) return warn('Es muss mindestens eine Ordnung bleiben.');
    const gone = activeLayout(config);
    if (!confirm(`Ordnung "${gone.name}" mit allen Tischen löschen?`)) return;
    config.layouts = config.layouts.filter(entry => entry.id !== gone.id);
    config.activeLayout = config.layouts[0].id;
    picked = null;
    save(config, { quiet: true });
    warn(`"${gone.name}" gelöscht.`);
  });

  byId('fpExport').addEventListener('click', () => {
    const payload = { ...current(), updatedAt: new Date().toISOString() };
    const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'floorplan.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });


  // ---- Rueckgaengig und wieder vor ----------------------------------------

  function paintHistory() {
    const { step, total } = history.position();
    byId('fpUndo').disabled = !history.canUndo();
    byId('fpRedo').disabled = !history.canRedo();
    byId('fpUndo').title = `Ein Schritt zurück (Schritt ${step} von ${total})`;
  }

  byId('fpUndo').addEventListener('click', () => {
    if (!history.undo()) return warn('Weiter zurück geht es nicht.');
    warn('');
    paint();
    seatResult('Ein Schritt zurück.');
  });

  byId('fpRedo').addEventListener('click', () => {
    if (!history.redo()) return warn('Es gibt nichts zum Wiederholen.');
    warn('');
    paint();
    seatResult('Ein Schritt vor.');
  });

  // Cmd/Strg + Z und Cmd/Strg + Umschalt + Z - aber nicht waehrend getippt wird.
  document.addEventListener('keydown', event => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    event.preventDefault();
    byId(event.shiftKey ? 'fpRedo' : 'fpUndo').click();
  });

  // ---- Raumobjekte ---------------------------------------------------------

  function paintElements() {
    const add = byId('fpAddElement');
    add.textContent = '';
    for (const kind of elementKinds()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.addElement = kind;
      button.textContent = `+ ${ELEMENTS[kind].label || 'Wand'}`;
      add.append(button);
    }

    const box = byId('fpElements');
    box.textContent = '';
    const plan = buildFloorplan(current());
    for (const level of plan.levels) {
      for (const item of level.elements || []) {
        const chip = document.createElement('div');
        chip.className = 'fp-chair-chip';
        const label = document.createElement('b');
        label.textContent = item.label || ELEMENTS[item.kind]?.label || 'Wand';
        const where = document.createElement('span');
        where.textContent = `${level.name} · ${item.w}×${item.h}`;
        chip.append(label, where);
        for (const [step, zeichen, titel] of [['-1', '−', 'kürzer'], ['1', '+', 'länger']]) {
          const button = document.createElement('button');
          button.type = 'button';
          button.dataset.sizeElement = item.id;
          button.dataset.step = step;
          button.textContent = zeichen;
          button.setAttribute('aria-label', `${label.textContent} ${titel}`);
          chip.append(button);
        }
        const turn = document.createElement('button');
        turn.type = 'button';
        turn.dataset.turnElement = item.id;
        turn.textContent = '⟲';
        turn.setAttribute('aria-label', `${label.textContent} drehen`);
        const drop = document.createElement('button');
        drop.type = 'button';
        drop.dataset.removeElement = item.id;
        drop.textContent = 'weg';
        chip.append(turn, drop);
        box.append(chip);
      }
    }
  }

  const elementLevel = (config, id) =>
    activeLayout(config).levels.find(level => (level.elements || []).some(item => item.id === id));

  byId('fpAddElement').addEventListener('click', event => {
    const button = event.target.closest('[data-add-element]');
    if (!button) return;
    const config = current();
    const level = activeLayout(config).levels.find(item => item.id === (picked ? picked.split('-')[0] : null))
      || activeLayout(config).levels[0];
    const kind = button.dataset.addElement;
    level.elements = level.elements || [];
    // Unterhalb des bisherigen Plans absetzen, sonst liegen alle neuen Objekte
    // auf 0,0 uebereinander und man sieht nur das oberste.
    const unten = buildFloorplan(current()).levels.find(item => item.id === level.id)?.rows || 0;
    level.elements.push({
      id: nextElementId(level), kind, label: ELEMENTS[kind].label,
      col: 0, row: unten + 1, w: ELEMENTS[kind].w, h: ELEMENTS[kind].h
    });
    save(config, { quiet: true });
    warn(`${ELEMENTS[kind].label || 'Wand'} in ${level.name} ergänzt – auf der Karte an die richtige Stelle ziehen.`);
  });

  byId('fpElements').addEventListener('click', event => {
    const config = current();

    const size = event.target.closest('[data-size-element]');
    if (size) {
      const id = size.dataset.sizeElement;
      const level = elementLevel(config, id);
      const item = level?.elements.find(entry => entry.id === id);
      if (!item) return;
      const step = Number(size.dataset.step);
      if (item.w >= item.h) item.w = Math.max(1, Math.min(GRID.cols, item.w + step));
      else item.h = Math.max(1, Math.min(24, item.h + step));
      save(config, { quiet: true });
      return;
    }

    const turn = event.target.closest('[data-turn-element]');
    if (turn) {
      const level = elementLevel(config, turn.dataset.turnElement);
      const item = level?.elements.find(entry => entry.id === turn.dataset.turnElement);
      if (!item) return;
      [item.w, item.h] = [item.h, item.w];
      save(config, { quiet: true });
      return;
    }

    const drop = event.target.closest('[data-remove-element]');
    if (drop) {
      const level = elementLevel(config, drop.dataset.removeElement);
      if (!level) return;
      level.elements = level.elements.filter(item => item.id !== drop.dataset.removeElement);
      save(config, { quiet: true });
    }
  });

  // ---- Tagesuebersicht -----------------------------------------------------

  /** Je Tag: wie viele Gaeste, wie viele Plaetze, wie viel davon belegt. */
  function statistics() {
    const plan = buildFloorplan(current());
    const seats = totalSeats(plan);
    const byDay = new Map();
    for (const party of parties()) {
      const day = byDay.get(party.date) || { date: party.date, reservierungen: 0, gaeste: 0, portionen: 0 };
      day.reservierungen += 1;
      day.gaeste += party.guests;
      day.portionen += Object.values(party.dishes || {}).reduce((sum, count) => sum + count, 0);
      byDay.set(party.date, day);
    }
    if (!byDay.has(moment.date)) {
      byDay.set(moment.date, { date: moment.date, reservierungen: 0, gaeste: 0, portionen: 0 });
    }
    return [...byDay.values()]
      .map(day => ({ ...day, plaetze: seats, frei: Math.max(0, seats - day.gaeste), auslastung: seats ? day.gaeste / seats : 0 }))
      // Heute zuerst, danach absteigend - der laufende Tag ist der wichtigste.
      .sort((a, b) => (a.date === moment.date ? -1 : b.date === moment.date ? 1 : b.date.localeCompare(a.date)));
  }

  function paintStats() {
    const body = byId('fpStats').querySelector('tbody');
    body.textContent = '';
    for (const day of statistics()) {
      const row = document.createElement('tr');
      if (day.date === moment.date) row.className = 'is-today';
      const zellen = [
        day.date === moment.date ? `${day.date} · heute gewählt` : day.date,
        day.reservierungen, day.gaeste, day.plaetze, day.gaeste, day.frei,
        `${Math.round(day.auslastung * 100)} %`,
        day.portionen
      ];
      for (const wert of zellen) {
        const cell = document.createElement('td');
        cell.textContent = String(wert);
        row.append(cell);
      }
      body.append(row);
    }
  }

  byId('fpCsv').addEventListener('click', () => {
    const kopf = ['Tag', 'Reservierungen', 'Gäste', 'Plätze gesamt', 'Belegt', 'Frei', 'Auslastung', 'Vorbestellte Portionen'];
    const zeilen = statistics().map(day => [
      day.date, day.reservierungen, day.gaeste, day.plaetze, day.gaeste, day.frei,
      // Deutsches Zahlenformat, sonst liest Excel 0.42 als Datum.
      String(Math.round(day.auslastung * 1000) / 10).replace('.', ',') + ' %',
      day.portionen
    ]);
    const csv = [kopf, ...zeilen]
      .map(zeile => zeile.map(feld => `"${String(feld).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');
    // BOM, damit Excel die Umlaute richtig liest.
    lade(`\uFEFF${csv}`, 'text/csv;charset=utf-8', `wirtschaft-tagesuebersicht-${moment.date}.csv`);
    seatResult('Tabelle gespeichert. In Excel per Doppelklick zu öffnen.');
  });

  function lade(inhalt, typ, name) {
    const blob = new Blob([inhalt], { type: typ });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  byId('fpPrint').addEventListener('click', () => {
    document.title = [current().eventName, buildFloorplan(current()).levels.find(level => level.id === preview.dataset.level)?.name,
      'Wirtschaft Dornbirn', moment.date].filter(Boolean).join(' · ');
    window.print();
  });

  byId('fpKunde').addEventListener('click', () => {
    const plan = buildFloorplan(current());
    const leer = plan.levels.every(level => !(level.elements || []).length);
    lade(`${JSON.stringify(current(), null, 2)}\n`, 'application/json', 'floorplan.json');
    warn(`Raum gespeichert: ${plan.tables.length} Tische, ${totalSeats(plan)} Plätze`
      + (leer ? ' – aber noch ohne Bühne, Bar oder Eingang. Der Kunde findet sich damit schwer zurecht.' : '.')
      + ' Die Datei nach site/data/floorplan.json legen und "npm run build:tischplan" ausführen –'
      + ' daraus entsteht wirtschaft-kundenplan.html zum Verschicken.');
  });

  byId('fpNumbering').addEventListener('change', () => {
    const config = current();
    config.numbering = { ...(config.numbering || {}), mode: byId('fpNumbering').value };
    save(config, { quiet: true });
    const plan = buildFloorplan(current());
    warn(plan.numberingMode === 'pro-etage'
      ? 'Jede Etage zählt jetzt neu bei 1. Weil es Tisch 1 dadurch mehrfach gibt, steht überall die Etage dabei.'
      : 'Die Tischnummern laufen jetzt durch alle Etagen durch.');
  });

  byId('fpEventName').addEventListener('change', () => {
    const config = current();
    config.eventName = byId('fpEventName').value.trim();
    save(config, { quiet: true });
  });


  // ---- Betriebsart ---------------------------------------------------------

  function paintService() {
    const rules = service();
    const plan = buildFloorplan(current());
    byId('fpMode').value = rules.mode;
    byId('fpSeatings').value = rules.seatings.join(', ');
    byId('fpEndsAt').value = rules.endsAt;
    byId('fpBuffer').value = String(rules.bufferMinutes);
    const schicht = rules.mode === 'schichten';
    for (const id of ['fpSeatings', 'fpEndsAt']) byId(id).disabled = !schicht;

    if (!schicht) {
      say('fpServiceInfo', 'Durchgehender Betrieb: die Dauer richtet sich nach der Gruppengröße '
        + `(${(policy().durations || []).map(step => `bis ${step.upTo}P ${step.minutes} Min`).join(', ')}). `
        + `Höchstens ${policy().maxCoversPerSlot} Gäste je Viertelstunde.`);
      return;
    }

    const liste = seatingPlan(rules);
    const plaetze = totalSeats(plan);
    const knapp = liste.filter(entry => entry.minutes < 45);
    say('fpServiceInfo',
      `${liste.length} Schichten: ${liste.map(entry => `${entry.time} → ${entry.minutes} Min`).join(', ')}, `
      + `danach ${rules.bufferMinutes} Min zum Abräumen. `
      + `${plaetze} Plätze × ${liste.length} Schichten = bis zu ${plaetze * liste.length} Gäste am Tag. `
      + 'Pacing ist ausgesetzt – im Schichtbetrieb kommen alle gleichzeitig.'
      + (knapp.length
        ? ` Achtung: ${knapp.map(entry => entry.time).join(', ')} lässt den Gästen unter 45 Minuten.`
        : ''));
  }

  byId('fpMode').addEventListener('change', () => {
    const config = current();
    activeLayout(config).service = { ...serviceOf(activeLayout(config)), mode: byId('fpMode').value };
    save(config, { quiet: true });
  });

  byId('fpServiceForm').addEventListener('submit', event => {
    event.preventDefault();
    const config = current();
    const alt = serviceOf(activeLayout(config));
    const zeiten = byId('fpSeatings').value.split(/[,;\s]+/).map(entry => entry.trim())
      .filter(entry => /^([01]?\d|2[0-3]):[0-5]\d$/.test(entry));
    if (byId('fpMode').value === 'schichten' && !zeiten.length) {
      return say('fpServiceInfo', 'Bitte mindestens eine Schichtzeit angeben, z. B. 11:30, 12:45.');
    }
    activeLayout(config).service = {
      mode: byId('fpMode').value,
      seatings: zeiten.length ? zeiten : alt.seatings,
      endsAt: byId('fpEndsAt').value || alt.endsAt,
      bufferMinutes: Math.max(0, Math.min(60, Number(byId('fpBuffer').value) || 0))
    };
    save(config, { quiet: true });
    seatResult('Betriebsart übernommen. Bestehende Reservierungen behalten ihre Uhrzeit.');
  });

  /** Im Schichtbetrieb gibt es nur die Schichtzeiten zur Auswahl. */
  function paintReservationTime() {
    const liste = schichten();
    const alt = byId('fpResTime');
    const brauchtSelect = liste.length > 0;
    if (brauchtSelect === (alt.tagName === 'SELECT')) {
      if (brauchtSelect) {
        const gewaehlt = alt.value;
        alt.textContent = '';
        for (const entry of liste) {
          const option = document.createElement('option');
          option.value = entry.time;
          option.textContent = `${entry.time} (${entry.minutes} Min)`;
          option.selected = entry.time === gewaehlt;
          alt.append(option);
        }
      }
      return;
    }
    const neu = document.createElement(brauchtSelect ? 'select' : 'input');
    neu.id = 'fpResTime';
    if (brauchtSelect) {
      for (const entry of liste) {
        const option = document.createElement('option');
        option.value = entry.time;
        option.textContent = `${entry.time} (${entry.minutes} Min)`;
        neu.append(option);
      }
    } else {
      neu.type = 'time';
      neu.step = '900';
      neu.value = moment.time;
      neu.required = true;
    }
    neu.setAttribute('aria-label', 'Uhrzeit der Reservierung');
    alt.replaceWith(neu);
  }

  // ---- Sicherung -----------------------------------------------------------

  const SICHERUNG = 'wirtschaft-letzte-sicherung';

  /**
   * Alles liegt im Browser-Speicher. Ein Klick auf "Websitedaten loeschen", ein
   * neuer Rechner oder ein privates Fenster - und die Einteilung ist weg. Der
   * Export allein hilft nicht, weil ihn im Betrieb niemand taeglich drueckt.
   * Deshalb erinnert die Seite, sobald es sieben Tage her ist.
   */
  function pruefeSicherung() {
    let letzte = null;
    try { letzte = localStorage.getItem(SICHERUNG); } catch { /* privater Modus */ }
    const box = byId('fpBackup');
    if (!box) return;
    const tage = letzte ? Math.floor((Date.now() - Number(letzte)) / 86400000) : null;
    const daten = parties().length || buildFloorplan(current()).tables.length;
    box.hidden = !daten || (tage !== null && tage < 7);
    box.textContent = letzte
      ? `Letzte Sicherung vor ${tage} Tagen. Die Einteilung liegt nur in diesem Browser – bitte sichern.`
      : 'Noch nie gesichert. Die Einteilung liegt nur in diesem Browser und ist weg, wenn er geleert wird.';
  }

  function sichern() {
    const state = store.load();
    const paket = {
      gesichertAm: new Date().toISOString(),
      floorplan: state.floorplan,
      parties: state.parties,
      blockedTables: state.blockedTables
    };
    lade(`${JSON.stringify(paket, null, 2)}\n`, 'application/json',
      `wirtschaft-sicherung-${today()}.json`);
    try { localStorage.setItem(SICHERUNG, String(Date.now())); } catch { /* privater Modus */ }
    pruefeSicherung();
    seatResult('Sicherung gespeichert. Die Datei an einem zweiten Ort ablegen, nicht nur auf diesem Rechner.');
  }

  byId('fpBackupNow').addEventListener('click', sichern);

  byId('fpRestore').addEventListener('change', async event => {
    const datei = event.target.files?.[0];
    if (!datei) return;
    try {
      const paket = JSON.parse(await datei.text());
      if (!paket.floorplan) throw new Error('kein Tischplan in der Datei');
      if (!confirm('Die aktuelle Einteilung wird durch die Sicherung ersetzt. Fortfahren?')) return;
      store.restorePlan({
        floorplan: paket.floorplan,
        parties: Array.isArray(paket.parties) ? paket.parties : [],
        blockedTables: Array.isArray(paket.blockedTables) ? paket.blockedTables : []
      });
      history.remember();
      paint();
      seatResult(`Sicherung vom ${String(paket.gesichertAm || '').slice(0, 10)} eingespielt.`);
    } catch (fehler) {
      seatResult(`Die Datei ließ sich nicht lesen: ${fehler.message}`);
    }
    event.target.value = '';
  });

  // ---- Start ---------------------------------------------------------------

  function paint() {
    paintBar();
    paintMoment();
    paintPlan();
    paintSeating();
    paintLevels();
    paintElements();
    paintService();
    paintReservationTime();
    paintFloorMove();
    paintStats();
    paintStandardEtage();
    paintHistory();
    pruefeSicherung();
    // Auch nach einer Reservierung, nicht nur nach Planaenderungen - sonst
    // steht im Cockpit weiter die alte Belegung.
    syncServiceMix(buildFloorplan(current()));
    byId('fpEventName').value = current().eventName || '';
    byId('fpNumbering').value = buildFloorplan(current()).numberingMode;
  }

  byId('fpResDate').value = moment.date;
  byId('fpResTime').value = moment.time;
  // Immer im Service starten. Ein gemerkter Reiter ist bequem, aber der Mittag
  // faengt nie in der Einrichtung an.
  let starte = 'service';
  try {
    const gemerkt = localStorage.getItem(TAB_KEY);
    if (gemerkt && tabs().some(tab => tab.dataset.tab === gemerkt)) starte = gemerkt;
  } catch { /* privater Modus */ }
  zeigeReiter(starte);
  paintDishes();
  starteDienst();
  syncServiceMix(buildFloorplan(current()));
  paint();
}
