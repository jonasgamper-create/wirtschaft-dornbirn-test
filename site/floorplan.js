// Zeichnet den Tischplan aus der Konfiguration. Das SVG ist rein visuell und
// aria-hidden; bedienbar und vorlesbar ist immer die Liste daneben. So gibt es
// genau einen Zustandspfad statt zweier, die auseinanderlaufen koennen.

// Version muss zu den anderen Importen passen, sonst laedt der Browser zwei
// Kopien desselben Moduls.
import { ELEMENTS, buildFloorplan, chairSlots, seatNamesFor, tableBody } from './floorplan-layout.mjs?v=d7d5b511';

const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};

const STATE_LABEL = {
  free: 'frei', busy: 'belegt', blocked: 'gesperrt', picked: 'gewählt',
  late: 'überfällig – noch nicht eingecheckt'
};

// Ein Name muss in den Tisch passen. SVG-Text bricht nicht um, und eine
// Schaetzung ueber die mittlere Zeichenbreite lag bei Namen wie "Bereuter"
// daneben. Deshalb wird die tatsaechlich gerenderte Breite gemessen und so
// lange gekuerzt, bis sie passt. Das geht erst, wenn das SVG im Dokument
// haengt - darum als Nachlauf nach dem Einhaengen.
function fitLabels(scope) {
  for (const node of scope.querySelectorAll('.fp-name, .fp-seat-name')) {
    const max = Number(node.dataset.maxw);
    let text = node.dataset.full || '';
    node.textContent = text;
    if (typeof node.getComputedTextLength !== 'function' || !max) continue;
    let guard = 0;
    while (text.length > 1 && node.getComputedTextLength() > max && guard++ < 60) {
      text = text.slice(0, -1);
      node.textContent = `${text}…`;
    }
  }
}

export function renderFloorplan(root, config, options = {}) {
  const {
    mode = 'orientation', states = {}, seating = {}, selected = null,
    // Bis wann ein freier Tisch frei bleibt - die Frage an der Tuer.
    freeUntil = {},
    onSelect = null, onMove = null, onEdit = null,
    // Sitzplan: Namen an den Stuehlen statt Belegung am Tisch.
    seatMode = false, onSeatName = null, onMoveElement = null
  } = options;
  const plan = buildFloorplan(config);
  if (!plan.tables.length) {
    root.textContent = '';
    root.className = 'fp';
    root.append(Object.assign(document.createElement('p'), {
      className: 'fp-empty',
      textContent: 'Für diesen Bereich ist noch kein Tischplan hinterlegt.'
    }));
    return plan;
  }

  const stored = root.dataset.level;
  let levelId = plan.levels.some(level => level.id === stored) ? stored : plan.levels[0].id;
  let pick = selected;

  const stateOf = table => {
    if (table.id === pick) return 'picked';
    if (states[table.id]) return states[table.id];
    return seating[table.id] ? 'busy' : 'free';
  };
  const say = text => { const status = root.querySelector('[data-status]'); if (status) status.textContent = text; };

  function paint() {
    root.dataset.level = levelId;
    root.textContent = '';
    root.className = 'fp';

    if (plan.levels.length > 1) {
      const switcher = document.createElement('div');
      switcher.className = 'fp-levels';
      switcher.setAttribute('role', 'radiogroup');
      switcher.setAttribute('aria-label', 'Etage wählen');
      for (const level of plan.levels) {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', String(level.id === levelId));
        button.tabIndex = level.id === levelId ? 0 : -1;
        button.dataset.level = level.id;
        button.textContent = level.name;
        switcher.append(button);
      }
      const choose = button => {
        levelId = button.dataset.level;
        paint();
        root.querySelector('.fp-levels [aria-checked="true"]')?.focus();
      };
      switcher.addEventListener('click', event => {
        const button = event.target.closest('[data-level]');
        if (button) choose(button);
      });
      switcher.addEventListener('keydown', event => roving(event, switcher, '[data-level]', choose));
      root.append(switcher);
    }

    const level = plan.levels.find(item => item.id === levelId);
    const stage = document.createElement('div');
    stage.className = 'fp-stage';
    stage.append(drawLevel(level), buildList(level));
    root.append(stage);

    const legend = document.createElement('p');
    legend.className = 'fp-legend';
    legend.innerHTML = '<span><i></i>frei</span><span><i class="busy"></i>belegt</span>'
      + '<span><i class="late"></i>überfällig</span><span><i class="blocked"></i>gesperrt</span>';
    root.append(legend);

    const status = document.createElement('p');
    status.className = 'fp-status';
    status.setAttribute('aria-live', 'polite');
    status.dataset.status = '';
    status.textContent = `${level.name}: ${level.tables.length} Tische, ${level.tables.reduce((sum, table) => sum + table.seats, 0)} Plätze.`
      + (onMove ? ' Tische lassen sich ziehen; mit der Tastatur Umschalt und Pfeiltasten.' : '');
    root.append(status);
    fitLabels(root);
  }

  function drawLevel(level) {
    const svg = el('svg', {
      class: `fp-svg${onMove || onMoveElement ? ' fp-movable' : ''}`,
      viewBox: `0 0 ${level.cols} ${level.rows}`,
      preserveAspectRatio: 'xMinYMin meet',
      'aria-hidden': 'true',
      focusable: 'false'
    });
    // Der Raum selbst zuerst: eine sichtbare Aussenkante macht aus einer
    // Ansammlung von Tischen einen Grundriss. Ohne sie sieht man nicht, wo das
    // Lokal aufhoert.
    if (level.raum) {
      svg.append(el('rect', {
        class: 'fp-raum',
        x: 0.06, y: 0.06,
        width: Math.max(0.1, level.raum.breite - 0.12),
        height: Math.max(0.1, level.raum.tiefe - 0.12)
      }));
    }

    // Weggenommene Ecken zuerst und getrennt: sie liegen ueber der Aussenkante,
    // damit sie deren Linie ueberdecken. Erst dadurch sieht ein L-foermiger
    // Raum wie ein L aus und nicht wie ein Rechteck mit einem Kasten darin.
    for (const item of (level.elements || []).filter(entry => entry.kind === 'ausschnitt')) {
      const gruppe = el('g', { class: 'fp-element', 'data-element-id': item.id, 'data-kind': item.kind });
      gruppe.append(el('rect', {
        class: 'fp-ausschnitt',
        x: item.col, y: item.row, width: item.w, height: item.h
      }));
      svg.append(gruppe);
    }

    // Raum zuerst: Waende, Buehne, Bar und Eingaenge liegen unter den Tischen.
    for (const item of (level.elements || []).filter(entry => entry.kind !== 'ausschnitt')) {
      const group = el('g', { class: 'fp-element', 'data-element-id': item.id, 'data-kind': item.kind });
      group.append(el('rect', {
        class: 'fp-element-shape',
        x: item.col, y: item.row, width: item.w, height: item.h, rx: item.kind === 'wand' ? 0 : 0.2
      }));
      const text = (item.label || ELEMENTS[item.kind]?.label || '').trim();
      if (text) {
        const label = el('text', { class: 'fp-element-label', x: item.col + item.w / 2, y: item.row + item.h / 2 });
        label.textContent = text;
        group.append(label);
      }
      svg.append(group);
    }

    for (const table of level.tables) {
      const group = el('g', { 'data-table-id': table.id, 'data-state': stateOf(table) });

      // Stuehle zuerst, damit die Tischplatte darueber liegt.
      const names = seatNamesFor(table);
      chairSlots(table).forEach((chair, index) => {
        const seat = el('g', { class: 'fp-seat', 'data-table-id': table.id, 'data-seat': index });
        seat.append(el('rect', {
          class: `fp-chair${names[index] ? ' is-named' : ''}`,
          x: chair.x, y: chair.y, width: chair.w, height: chair.h, rx: 0.1
        }));
        if (seatMode && names[index]) {
          // Der Name steht neben dem Stuhl, nicht darin - ein Stuhl ist zu
          // klein fuer Text, der noch lesbar sein soll.
          const oben = chair.y < table.row + table.h / 2;
          const label = el('text', {
            class: 'fp-seat-name',
            x: chair.x + chair.w / 2,
            y: oben ? chair.y - 0.18 : chair.y + chair.h + 0.42
          });
          label.dataset.full = names[index];
          label.dataset.maxw = String(chair.w + 1.6);
          label.textContent = names[index];
          seat.append(label);
        }
        group.append(seat);
      });
      const body = tableBody(table);
      // Ein runder Tisch muss rund aussehen, sonst hilft die Form beim Planen
      // nichts. Ein rect mit halber Ecke ist eine Ellipse - kein zweiter
      // Elementtyp noetig.
      group.append(el('rect', {
        class: 'fp-shape',
        x: body.x, y: body.y, width: body.w, height: body.h,
        rx: table.form === 'rund' ? body.w / 2 : 0.12,
        ry: table.form === 'rund' ? body.h / 2 : 0.12
      }));

      const party = seating[table.id];
      const middle = table.col + table.w / 2;
      const number = el('text', { class: 'fp-num', x: middle, y: body.y + (party ? 0.6 : 0.95) });
      number.textContent = String(table.number);
      group.append(number);

      if (party) {
        // Belegt: Name und Belegung stehen auf der Tischplatte. Auf schmalen
        // Tischen wird die Schrift kleiner. Klasse statt Inline-Stil - die
        // Content-Security-Policy erlaubt kein style-Attribut, ein blockierter
        // Stil faellt sonst still aus.
        const narrow = table.w <= 3;
        const name = el('text', { class: `fp-name${narrow ? ' is-narrow' : ''}`, x: middle, y: body.y + 1.3 });
        name.dataset.full = party.name;
        name.dataset.maxw = String(body.w - 0.2);
        name.textContent = party.name;
        const count = el('text', { class: 'fp-seats', x: middle, y: body.y + 1.95 });
        // Das Haekchen unterscheidet "sitzt wirklich hier" von "ist angesagt".
        // Ohne dieses Zeichen sehen eingecheckte und erwartete Gaeste gleich
        // aus, sobald die Farbe fuer etwas anderes gebraucht wird.
        count.textContent = `${party.arrived ? '✓ ' : ''}${party.guests}/${table.seats}`;
        group.append(name, count);
      } else {
        const seats = el('text', { class: 'fp-seats', x: middle, y: body.y + 1.8 });
        seats.textContent = `${table.seats}P`;
        group.append(seats);
      }
      svg.append(group);
    }
    if (mode === 'select') {
      svg.addEventListener('click', event => {
        if (svg.dataset.dragged === '1') { svg.dataset.dragged = '0'; return; }
        // Im Sitzplan gilt der Klick dem Stuhl, nicht dem Tisch.
        const seat = seatMode && event.target.closest('[data-seat]');
        if (seat) {
          const table = level.tables.find(item => item.id === seat.dataset.tableId);
          if (table) editSeat(svg, table, Number(seat.dataset.seat));
          return;
        }
        const group = event.target.closest('[data-table-id]');
        if (!group) return;
        root.querySelector(`.fp-list [data-table-id="${group.dataset.tableId}"]`)?.click();
      });
      // Doppelklick schreibt den Namen direkt auf den Tisch. Der Weg ueber die
      // Tischliste bleibt daneben bestehen - er ist der mit der Tastatur.
      if (onEdit) {
        svg.addEventListener('dblclick', event => {
          const group = event.target.closest('[data-table-id]');
          const table = group && level.tables.find(item => item.id === group.dataset.tableId);
          if (table) editOnTable(svg, table);
        });
      }
      if (onMove || onMoveElement) enableDrag(svg, level);
    }
    return svg;
  }

  /** Name fuer einen einzelnen Stuhl. Feld liegt ueber der Tischplatte. */
  function editSeat(svg, table, index) {
    const body = tableBody(table);
    const names = seatNamesFor(table);
    openField(svg, {
      x: body.x, y: body.y + body.h / 2 - 0.55, width: body.w, height: 1.1,
      value: names[index] || '',
      placeholder: `Platz ${index + 1}`,
      label: `Name für Platz ${index + 1} an Tisch ${table.number}`,
      commit: value => onSeatName(table.id, index, value)
    });
  }

  // Ein echtes Eingabefeld auf dem Tisch. Kein contenteditable im SVG - das ist
  // mit Tastatur und Vorlesesoftware unzuverlaessig. Und kein absolut
  // positioniertes Overlay: dessen Inline-Stile blockiert die
  // Content-Security-Policy, das Feld saesse an der falschen Stelle. Ein
  // foreignObject wird ueber Attribute positioniert und ist damit erlaubt.
  function editOnTable(svg, table) {
    openField(svg, {
      x: tableBody(table).x,
      y: tableBody(table).y + tableBody(table).h / 2 - 0.55,
      width: tableBody(table).w,
      height: 1.1,
      value: seating[table.id]?.name || '',
      placeholder: `Tisch ${table.number}`,
      label: `Name für Tisch ${table.number}, ${table.seats} Plätze`,
      commit: value => onEdit(table.id, value)
    });
  }

  /**
   * Ein echtes Eingabefeld im Plan. Kein contenteditable im SVG - das ist mit
   * Tastatur und Vorlesesoftware unzuverlaessig. Und kein absolut
   * positioniertes Overlay: dessen Inline-Stile blockiert die
   * Content-Security-Policy. Ein foreignObject wird ueber Attribute
   * positioniert und ist damit erlaubt.
   */
  function openField(svg, { x, y, width, height, value, placeholder, label, commit }) {
    svg.querySelector('.fp-inline-host')?.remove();

    const host = el('foreignObject', { class: 'fp-inline-host', x, y, width, height });
    const input = document.createElementNS('http://www.w3.org/1999/xhtml', 'input');
    input.setAttribute('class', 'fp-inline');
    input.setAttribute('type', 'text');
    input.setAttribute('maxlength', '40');
    input.value = value;
    input.setAttribute('placeholder', placeholder);
    input.setAttribute('aria-label', label);
    host.append(input);
    svg.append(host);
    input.focus();
    input.select();

    let closed = false;
    const done = keep => {
      if (closed) return;
      closed = true;
      const next = input.value.trim();
      host.remove();
      if (keep) commit(next);
    };
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); done(true); }
      if (event.key === 'Escape') { event.preventDefault(); done(false); }
    });
    input.addEventListener('blur', () => done(true));
  }

  // Ziehen im Cockpit. Die Position rastet auf ganze Rastereinheiten ein;
  // ob sie erlaubt ist, entscheidet der Aufrufer ueber canPlace().
  function enableDrag(svg, level) {
    let drag = null;
    const toGrid = event => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return null;
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      return { x: point.x, y: point.y };
    };

    svg.addEventListener('pointerdown', event => {
      // Raumobjekte werden genauso gezogen wie Tische - nur meldet der Zug
      // am Ende an einen anderen Empfaenger.
      const room = onMoveElement && event.target.closest('[data-element-id]');
      const group = room || event.target.closest('[data-table-id]');
      if (!group || event.button !== 0) return;
      const start = toGrid(event);
      const table = room
        ? (level.elements || []).find(item => item.id === room.dataset.elementId)
        : level.tables.find(item => item.id === group.dataset.tableId);
      if (!start || !table) return;
      drag = { group, table, room: Boolean(room), startX: start.x, startY: start.y, dx: 0, dy: 0 };
      group.classList.add('is-dragging');
      try { svg.setPointerCapture(event.pointerId); } catch { /* Stift/Touch ohne Capture */ }
      event.preventDefault();
    });

    svg.addEventListener('pointermove', event => {
      if (!drag) return;
      const now = toGrid(event);
      if (!now) return;
      drag.dx = Math.round(now.x - drag.startX);
      drag.dy = Math.round(now.y - drag.startY);
      drag.group.setAttribute('transform', `translate(${drag.dx} ${drag.dy})`);
    });

    const finish = event => {
      if (!drag) return;
      const drag2 = drag;
      const { group, table, dx, dy } = drag;
      drag = null;
      group.classList.remove('is-dragging');
      group.removeAttribute('transform');
      try { svg.releasePointerCapture(event.pointerId); } catch { /* Zeiger war nie gefangen */ }
      if (!dx && !dy) return;
      svg.dataset.dragged = '1';
      if (drag2.room) onMoveElement(table.id, table.col + dx, table.row + dy);
      else onMove(table.id, table.col + dx, table.row + dy);
    };
    svg.addEventListener('pointerup', finish);
    svg.addEventListener('pointercancel', finish);
  }

  function buildList(level) {
    const list = document.createElement(mode === 'select' ? 'div' : 'ul');
    list.className = 'fp-list';
    if (mode === 'select') {
      list.setAttribute('role', 'radiogroup');
      list.setAttribute('aria-label', `Tisch wählen, ${level.name}`);
    }

    for (const table of level.tables) {
      const state = stateOf(table);
      if (mode !== 'select') {
        const item = document.createElement('li');
        item.dataset.tableId = table.id;
        item.innerHTML = `<b>${table.number}</b>`;
        item.append(document.createTextNode(`${table.seats} Plätze`));
        list.append(item);
        continue;
      }
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(state === 'picked'));
      button.tabIndex = state === 'picked' ? 0 : -1;
      button.dataset.tableId = table.id;
      const party = seating[table.id];
      // Die Liste ist die bedienbare Wahrheit - was auf der Karte nur Farbe
      // ist, muss hier als Wort dastehen, sonst ist der Zustand fuer
      // Vorlesesoftware und Tastatur nicht vorhanden.
      const zustand = party
        ? `${party.name}, ${party.guests} Personen`
          + (party.arrived ? ', eingecheckt' : state === 'late' ? ', überfällig' : ', erwartet')
          + (party.until ? ` · bis ${party.until}` : '')
        // "Frei" allein beantwortet die Frage an der Tuer nicht - sie lautet
        // immer "frei bis wann".
        : state === 'free' && freeUntil[table.id] ? `frei bis ${freeUntil[table.id]}` : STATE_LABEL[state];
      button.textContent = `Tisch ${table.number} · ${table.seats} Plätze · ${level.name} · ${zustand}`;
      list.append(button);
    }

    if (mode === 'select') {
      if (!list.querySelector('[tabindex="0"]')) {
        const first = list.querySelector('button:not([disabled])');
        if (first) first.tabIndex = 0;
      }
      list.addEventListener('click', event => {
        const button = event.target.closest('[data-table-id]');
        if (!button || button.disabled) return;
        const id = button.dataset.tableId;
        pick = pick === id ? null : id;
        const table = plan.tables.find(item => item.id === pick);

        // Der Aufrufer darf selbst neu zeichnen und den Fokus setzen (das
        // Cockpit springt ins Namensfeld der Tischliste). Nur ohne Aufrufer
        // holen wir den Fokus selbst zurueck - sonst landet er beim Body und
        // die Tastaturbedienung reisst ab.
        if (onSelect) {
          onSelect(pick, table || null);
          return;
        }
        paint();
        root.querySelector(`.fp-list [data-table-id="${id}"]`)?.focus();
        say(table ? `Tisch ${table.number} gewählt, ${table.seats} Plätze, ${table.levelName}.` : 'Kein Tisch gewählt.');
      });
      list.addEventListener('keydown', event => {
        // Umschalt und Pfeiltaste verschiebt den Tisch - die Alternative zum
        // Ziehen mit der Maus, ohne die keine Tastaturbedienung moeglich waere.
        const step = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (onMove && event.shiftKey && step) {
          const button = event.target.closest('[data-table-id]');
          const table = button && level.tables.find(item => item.id === button.dataset.tableId);
          if (!table) return;
          event.preventDefault();
          onMove(table.id, table.col + step[0], table.row + step[1], button.dataset.tableId);
          root.querySelector(`.fp-list [data-table-id="${table.id}"]`)?.focus();
          return;
        }
        roving(event, list, 'button:not([disabled])', null);
      });
    }
    return list;
  }

  paint();
  return plan;
}

// Pfeiltasten laufen in Listenreihenfolge, nicht nach Pixelposition -
// das ist fuer Tastaturnutzer vorhersagbarer.
function roving(event, container, selector, activate) {
  const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
  if (!keys.includes(event.key) || event.shiftKey) return;
  const items = [...container.querySelectorAll(selector)];
  if (!items.length) return;
  const current = items.indexOf(document.activeElement);
  const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
  let next;
  if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = items.length - 1;
  else if (current < 0) next = 0;
  else next = (current + (forward ? 1 : -1) + items.length) % items.length;
  event.preventDefault();
  items.forEach((item, index) => { item.tabIndex = index === next ? 0 : -1; });
  items[next].focus();
  activate?.(items[next]);
}

// Kein automatischer Start: Der Tischplan ist eine rein interne Ansicht fuer
// die Einteilung durch das Haus. Gaeste sehen ihn nicht und waehlen keinen
// Tisch - sie geben Tag, Uhrzeit und Personenzahl an. Deshalb liegt der
// Renderer nicht im oeffentlichen Build und wird nur von
// gastgeber-floorplan.js aufgerufen.
