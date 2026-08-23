// Tische ueber Anzahlen: "5 Zweiertische, 8 Vierertische" - Zahl rauf, Zahl
// runter, fertig. Das ist die Sicht des Wirts auf seinen Raum; wo genau ein
// Tisch auf der Karte steht, ist eine andere Frage und bleibt in der grossen
// Einteilung.
//
// Reine Funktionen ohne DOM - dieselbe Logik laeuft im Test wie im Browser.

/**
 * Wie viele Tische welcher Groesse eine Etage hat, sortiert nach Groesse.
 * [{ seats: 2, anzahl: 5 }, { seats: 4, anzahl: 8 }]
 */
export function zaehleGroessen(level) {
  const zaehler = new Map();
  for (const table of level?.tables || []) {
    const seats = Number(table.seats) || 0;
    zaehler.set(seats, (zaehler.get(seats) || 0) + 1);
  }
  return [...zaehler.entries()]
    .map(([seats, anzahl]) => ({ seats, anzahl }))
    .sort((a, b) => a.seats - b.seats);
}

/**
 * Die Anzahl der Tische einer Groesse setzen. Beim Verkleinern fallen die
 * zuletzt angelegten zuerst - die alten, moeglicherweise auf der Karte
 * platzierten Tische bleiben so lange wie moeglich stehen. Sitzt auf einem
 * entfernten Tisch eine Reservierung, faengt das der Dienst beim
 * Veroeffentlichen auf: er setzt sie um und meldet es.
 *
 * Neue Tische bekommen Kennungen, die mit nichts Bestehendem kollidieren.
 * Zurueck kommt eine NEUE Tischliste; die Eingabe bleibt unberuehrt.
 */
export function setzeAnzahl(level, seats, anzahl) {
  const groesse = Math.trunc(Number(seats));
  const soll = Math.max(0, Math.min(60, Math.trunc(Number(anzahl))));
  if (!Number.isFinite(groesse) || groesse < 1 || groesse > 24) return null;

  const tables = [...(level?.tables || [])];
  const dieser = tables.filter(table => Number(table.seats) === groesse);

  if (dieser.length > soll) {
    // Von hinten weg: die juengsten zuerst.
    const weg = new Set(dieser.slice(soll).map(table => table.id));
    return tables.filter(table => !weg.has(table.id));
  }

  const vergeben = new Set(tables.map(table => table.id));
  let lauf = 1;
  const neu = [];
  for (let i = dieser.length; i < soll; i += 1) {
    let id;
    do { id = `${level.id}-g${groesse}-${lauf}`; lauf += 1; } while (vergeben.has(id));
    vergeben.add(id);
    neu.push({ id, seats: groesse, col: null, row: null });
  }
  return [...tables, ...neu];
}

/**
 * Einen kompletten Plan mit einer geaenderten Etagen-Tischliste bauen -
 * als tiefe Kopie, denn der alte Plan ist der Stand, auf den bei einem
 * Fehler zurueckgefallen wird.
 */
export function planMitTischen(config, layoutId, levelId, tables) {
  const kopie = JSON.parse(JSON.stringify(config));
  const layout = (kopie.layouts || []).find(eintrag => eintrag.id === layoutId);
  const level = (layout?.levels || []).find(eintrag => eintrag.id === levelId);
  if (!level) return null;
  level.tables = tables;
  return kopie;
}
