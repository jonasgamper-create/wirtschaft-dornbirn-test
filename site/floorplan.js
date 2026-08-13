// Zeichnet den Tischplan aus der Konfiguration. Das SVG ist rein visuell und
// aria-hidden; bedienbar und vorlesbar ist immer die Liste daneben. So gibt es
// genau einen Zustandspfad statt zweier, die auseinanderlaufen koennen.

// Version muss zu den anderen Importen passen, sonst laedt der Browser zwei
// Kopien desselben Moduls.
import { buildFloorplan } from './floorplan-layout.mjs?v=4';

const SVG_NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};

const STATE_LABEL = { free: 'frei', busy: 'belegt', blocked: 'gesperrt', picked: 'gewählt' };

// Ein Name muss in den Tisch passen. SVG-Text bricht nicht um, und eine
// Schaetzung ueber die mittlere Zeichenbreite lag bei Namen wie "Bereuter"
// daneben. Deshalb wird die tatsaechlich gerenderte Breite gemessen und so
// lange gekuerzt, bis sie passt. Das geht erst, wenn das SVG im Dokument
// haengt - darum als Nachlauf nach dem Einhaengen.
function fitLabels(scope) {
  for (const node of scope.querySelectorAll('.fp-name')) {
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
  const { mode = 'orientation', states = {}, seating = {}, selected = null, onSelect = null, onMove = null } = options;
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
    legend.innerHTML = '<span><i></i>frei</span><span><i class="busy"></i>belegt</span><span><i class="blocked"></i>gesperrt</span>';
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
      class: `fp-svg${onMove ? ' fp-movable' : ''}`,
      viewBox: `0 0 ${level.cols} ${level.rows}`,
      preserveAspectRatio: 'xMinYMin meet',
      'aria-hidden': 'true',
      focusable: 'false'
    });
    for (const table of level.tables) {
      const group = el('g', { 'data-table-id': table.id, 'data-state': stateOf(table) });
      group.append(el('rect', {
        class: 'fp-shape',
        x: table.col + 0.15,
        y: table.row + 0.15,
        width: table.w - 0.3,
        height: table.h - 0.3,
        rx: 0.12
      }));
      const party = seating[table.id];
      const middle = table.col + table.w / 2;
      const number = el('text', { class: 'fp-num', x: middle, y: table.row + (party ? 0.95 : 1.15) });
      number.textContent = String(table.number);
      group.append(number);

      if (party) {
        // Belegt: Name und Belegung stehen im Tisch. Auf schmalen Tischen
        // wird die Schrift kleiner, sonst laeuft sie ueber den Rand.
        const size = table.w <= 3 ? 0.5 : 0.62;
        const name = el('text', { class: 'fp-name', x: middle, y: table.row + 1.7, style: `font-size:${size}px` });
        name.dataset.full = party.name;
        name.dataset.maxw = String(table.w - 0.5);
        name.textContent = party.name;
        const count = el('text', { class: 'fp-seats', x: middle, y: table.row + 2.3 });
        count.textContent = `${party.guests}/${table.seats}`;
        group.append(name, count);
      } else {
        const seats = el('text', { class: 'fp-seats', x: middle, y: table.row + 2.1 });
        seats.textContent = `${table.seats}P`;
        group.append(seats);
      }
      svg.append(group);
    }
    if (mode === 'select') {
      svg.addEventListener('click', event => {
        if (svg.dataset.dragged === '1') { svg.dataset.dragged = '0'; return; }
        const group = event.target.closest('[data-table-id]');
        if (!group) return;
        root.querySelector(`.fp-list [data-table-id="${group.dataset.tableId}"]`)?.click();
      });
      if (onMove) enableDrag(svg, level);
    }
    return svg;
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
      const group = event.target.closest('[data-table-id]');
      if (!group || event.button !== 0) return;
      const start = toGrid(event);
      const table = level.tables.find(item => item.id === group.dataset.tableId);
      if (!start || !table) return;
      drag = { group, table, startX: start.x, startY: start.y, dx: 0, dy: 0 };
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
      const { group, table, dx, dy } = drag;
      drag = null;
      group.classList.remove('is-dragging');
      group.removeAttribute('transform');
      try { svg.releasePointerCapture(event.pointerId); } catch { /* Zeiger war nie gefangen */ }
      if (!dx && !dy) return;
      svg.dataset.dragged = '1';
      onMove(table.id, table.col + dx, table.row + dy);
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
      button.textContent = `Tisch ${table.number} · ${table.seats} Plätze · ${level.name} · `
        + (party ? `${party.name}, ${party.guests} Personen` : STATE_LABEL[state]);
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

        // Der Aufrufer darf selbst neu zeichnen (das Cockpit tut das). Danach
        // holen wir den Fokus zurueck an denselben Tisch - sonst landet er
        // beim Body und die Tastaturbedienung reisst ab.
        if (onSelect) onSelect(pick, table || null); else paint();
        root.querySelector(`.fp-list [data-table-id="${id}"]`)?.focus();
        if (!onSelect) {
          say(table ? `Tisch ${table.number} gewählt, ${table.seats} Plätze, ${table.levelName}.` : 'Kein Tisch gewählt.');
        }
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
