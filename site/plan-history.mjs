// Schritt-fuer-Schritt zurueck und wieder vor. Bewusst simpel: nach jeder
// Aenderung wird der ganze Zustand als Text abgelegt. Bei der Groessenordnung
// hier (ein Tischplan, ein Tag Reservierungen) ist das billiger als eine
// Befehlsliste - und es kann nichts auseinanderlaufen, weil es keinen
// zweiten Weg zurueck gibt.

export function createHistory(read, write, limit = 60) {
  let stack = [read()];
  let index = 0;

  return {
    /** Nach jeder Aenderung aufrufen. Gleiche Zustaende landen nicht doppelt. */
    remember() {
      const now = read();
      if (now === stack[index]) return;
      stack = stack.slice(0, index + 1);
      stack.push(now);
      if (stack.length > limit) stack.shift();
      index = stack.length - 1;
    },
    undo() {
      if (index <= 0) return false;
      index -= 1;
      write(stack[index]);
      return true;
    },
    redo() {
      if (index >= stack.length - 1) return false;
      index += 1;
      write(stack[index]);
      return true;
    },
    canUndo: () => index > 0,
    canRedo: () => index < stack.length - 1,
    /** Fuer die Beschriftung: der wievielte Schritt von wie vielen. */
    position: () => ({ step: index, total: stack.length - 1 })
  };
}
