// Die einfache Wirt-Ansicht, gebaut wie die besten Service-Apps: drei Zahlen
// oben, darunter EINE chronologische Liste des Tages - Reservierungen und
// Abholungen gemischt, je Zeile ein grosser Statusknopf. Sie rechnet nichts
// selbst aus, was der Dienst besser weiss: Tische vergibt der Server, damit
// zwei Handys nie denselben letzten Tisch erwischen.

import {
  apiAdresse, bleibVerbunden, hausToken, holeKarteInfo, holeKuechenzettel, holeStand, karteAdresse,
  leereTag, legeEinfach, loescheKarte, schluesselAusAdresse, sendeAktion,
  sendeKarte, sendeLaufkunde, sendeTakeawayAktion, sendeTakeawayKarte,
  setzeFertigWer, setzeSms,
  stelleTagWiederHer
} from './haus-api.js?v=64b16db1';
import { buildFloorplan } from './floorplan-layout.mjs?v=8cd1fbb4';
import { durationFor, occupiesAt } from './table-assignment.mjs?v=ec7c8e39';

const byId = id => document.getElementById(id);
const pad = zahl => String(zahl).padStart(2, '0');
const jetzt = () => {
  const d = new Date();
  return {
    datum: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    zeit: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
};

let stand = null;
let korbSeit = null;

start();

async function start() {
  schluesselAusAdresse();
  if (!(await apiAdresse())) {
    byId('verbindungText').textContent = 'Kein Dienst eingetragen';
    byId('zahlErwartet').textContent = '–';
    return;
  }

  byId('tagZeile').textContent = `Heute Mittag · ${new Date().toLocaleDateString('de-AT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })}`;

  // Erst der letzte bekannte Stand, dann der offene Draht. So steht sofort
  // etwas da, auch wenn der Draht eine Sekunde braucht.
  const erster = await holeStand(hausToken());
  if (erster?.stand) { stand = erster.stand; male(); }

  bleibVerbunden(hausToken() || 'offen', neuerStand => {
    stand = neuerStand;
    male();
  }, zustand => {
    byId('verbindung').dataset.zustand = zustand;
    byId('verbindungText').textContent = zustand === 'verbunden' ? 'Live verbunden' : 'Getrennt – verbinde neu …';
  });

  // Die Uhr laeuft weiter, auch wenn nichts passiert: nach der Essenszeit
  // wird ein Tisch von selbst frei, und die Zahlen muessen mitgehen.
  setInterval(male, 60 * 1000);

  verdrahteHeuteListe();
  verdrahteBlatt();
  verdrahteNeueReservierung();
  verdrahteLaufkundschaft();
  verdrahteTagLeeren();
  verdrahteKarten();
  verdrahteZettel();
  verdrahteSms();
  verdrahteFertigWer();
}

/**
 * Meldet der Wirt fertig? Die Einstellung kommt vom Dienst - dieselbe Quelle
 * wie in der Kueche, damit der Knopf nie an zwei Stellen gleichzeitig steht
 * oder an keiner. Kein Wert heisst Kueche, so war es vor dem Schalter.
 */
const wirtDarfFertig = () => {
  const wer = stand?.fertigWer || 'kueche';
  return wer === 'wirt' || wer === 'beide';
};

/**
 * Der Schalter fuer die Zustaendigkeit. Drei Knoepfe statt eines Haekchens,
 * weil es drei Faelle sind und keiner davon "an oder aus" heisst.
 */
function verdrahteFertigWer() {
  const wahl = document.querySelector('.fertig-wahl');
  if (!wahl) return;

  // Nicht "male" nennen: so heisst schon die Funktion, die die ganze
  // Tagesliste zeichnet - und die wird hier gebraucht.
  const zeichne = () => {
    if (wahl.dataset.aendert) return;
    const wer = stand?.fertigWer || 'kueche';
    for (const knopf of wahl.querySelectorAll('[data-wer]')) {
      knopf.setAttribute('aria-pressed', String(knopf.dataset.wer === wer));
    }
  };
  zeichne();
  setInterval(zeichne, 4000);

  wahl.addEventListener('click', async event => {
    const knopf = event.target.closest('[data-wer]');
    if (!knopf) return;
    const gewuenscht = knopf.dataset.wer;
    wahl.dataset.aendert = '1';
    sag('fertigInfo', 'Einen Moment …');
    const antwort = await setzeFertigWer(hausToken(), gewuenscht);
    delete wahl.dataset.aendert;
    if (!antwort?.ok) {
      zeichne();
      return sag('fertigInfo', 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    }
    // Der Draht bringt den neuen Stand, aber der Knopf soll sofort umspringen -
    // und die Tagesliste braucht ihn auch, damit "Essen fertig" erscheint.
    if (stand) stand.fertigWer = gewuenscht;
    zeichne();
    male();
    sag('fertigInfo', {
      kueche: 'Die Küche meldet fertig. Am Tresen siehst du den Stand, aber ohne Knopf.',
      wirt: 'Du meldest fertig. Der Küchenbildschirm zeigt nur noch an, was läuft.',
      beide: 'Küche und Tresen dürfen fertigmelden – wer zuerst drückt, zählt.'
    }[gewuenscht], 'gut');
  });
}

/**
 * Der Schalter fuer die Fertig-SMS. Er zeigt immer den Stand des Dienstes,
 * nicht den letzten Klick: schaltet ein zweites Geraet um, muss man das hier
 * sehen. Und ohne eingerichteten Absender sagt er, woran es liegt, statt
 * stumm zurueckzuspringen.
 */
function verdrahteSms() {
  const schalter = byId('smsAn');
  if (!schalter) return;

  const male = () => {
    if (schalter.dataset.aendert) return;
    schalter.checked = stand?.smsAn === true;
    byId('smsLabel').textContent = schalter.checked
      ? 'SMS ist an – der Gast wird benachrichtigt'
      : 'SMS ist aus';
  };
  male();
  setInterval(male, 4000);

  schalter.addEventListener('change', async () => {
    schalter.dataset.aendert = '1';
    const gewuenscht = schalter.checked;
    sag('smsInfo', 'Einen Moment …');
    const antwort = await setzeSms(hausToken(), gewuenscht);
    delete schalter.dataset.aendert;
    if (!antwort?.ok) {
      schalter.checked = !gewuenscht;
      male();
      return sag('smsInfo', antwort?.grund === 'nicht_eingerichtet'
        ? 'Für SMS fehlt noch das Brevo-Konto (Schlüssel und Absendername). Solange bleibt sie aus.'
        : 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    }
    male();
    sag('smsInfo', antwort.an
      ? 'SMS läuft. Ab jetzt bekommt der Gast bei „Fertig“ eine Nachricht.'
      : 'SMS ist aus. „Fertig“ meldet nur intern.', 'gut');
  });
}

/**
 * Der Kuechenzettel. Er beantwortet die Frage vor dem Einkauf: wie viel
 * kochen wir heute? Erst beim Aufklappen geholt - im Mittagslaerm braucht
 * niemand eine Zahl, nach der er nicht gefragt hat.
 */
function verdrahteZettel() {
  const kasten = byId('zettelKasten');
  if (!kasten) return;

  async function male() {
    if (!kasten.open) return;
    const antwort = await holeKuechenzettel(hausToken(), jetzt().datum);
    const liste = byId('zettelListe');
    liste.textContent = '';
    if (!antwort?.ok) {
      byId('zettelKopf').textContent = 'Die Zahlen sind gerade nicht erreichbar.';
      byId('zettelFuss').textContent = '';
      return;
    }
    if (!antwort.zeilen.length) {
      byId('zettelKopf').textContent = 'Noch keine Gerichte veröffentlicht – trag oben die Karte ein.';
      byId('zettelFuss').textContent = '';
      return;
    }
    byId('zettelKopf').textContent = `${antwort.erwarteteGaeste} Gäste erwartet, `
      + `${antwort.bestelltGesamt} Portion(en) schon als Takeaway bestellt.`;
    for (const zeile of antwort.zeilen) {
      const eintrag = document.createElement('li');
      const name = document.createElement('b');
      name.textContent = zeile.name;
      const zahl = document.createElement('span');
      zahl.className = 'zettel-zahl';
      zahl.textContent = `${zeile.empfohlen}`;
      const dazu = document.createElement('small');
      // Was Tatsache ist, steht getrennt von dem, was gerechnet wurde.
      dazu.textContent = zeile.bestellt
        ? `davon ${zeile.bestellt} fix bestellt · ${zeile.anteil} % Anteil bisher`
        : `${zeile.anteil} % Anteil bisher`;
      eintrag.append(zahl, name, dazu);
      liste.append(eintrag);
    }
    byId('zettelFuss').textContent = antwort.ausErfahrung
      ? `Verteilung aus ${antwort.grundlage} bisher bestellten Portionen. Ein Richtwert, keine Bestellung.`
      : 'Noch keine Erfahrungswerte – bis dahin gleichmäßig verteilt. Je mehr Takeaway läuft, desto genauer wird der Zettel.';
  }

  kasten.addEventListener('toggle', male);
  // Offen gelassen heisst mitlaufen: kommt eine Bestellung herein, stimmt
  // die Zahl sonst schon nach zehn Minuten nicht mehr.
  setInterval(male, 2 * 60 * 1000);
}

// ---- Neue Buchungen hoerbar machen -----------------------------------------
//
// Im Mittagslaerm geht Stilles unter: eine neu eingegangene Online-Buchung
// klingt kurz und leuchtet in der Liste, bis ihre Zeile angetippt wird.
// Der Ton braucht eine erste Beruehrung der Seite - Browserregel, keine Wahl.

const gesehen = new Set();
const neue = new Set();
let erstesMal = true;
let tonKontext = null;

document.addEventListener('pointerdown', () => {
  if (!tonKontext && window.AudioContext) tonKontext = new AudioContext();
  tonKontext?.resume?.();
}, { once: true });

function klingle() {
  if (!tonKontext || tonKontext.state !== 'running') return;
  const oszillator = tonKontext.createOscillator();
  const laut = tonKontext.createGain();
  oszillator.frequency.value = 880;
  laut.gain.setValueAtTime(0.0001, tonKontext.currentTime);
  laut.gain.exponentialRampToValueAtTime(0.12, tonKontext.currentTime + 0.02);
  laut.gain.exponentialRampToValueAtTime(0.0001, tonKontext.currentTime + 0.35);
  oszillator.connect(laut).connect(tonKontext.destination);
  oszillator.start();
  oszillator.stop(tonKontext.currentTime + 0.4);
}

/** Merkt sich, was schon da war - alles Neue leuchtet und klingt. */
function merkeNeue(heute, takeaway) {
  const alle = [...heute.map(p => p.id), ...takeaway.map(b => b.id)];
  if (erstesMal) {
    alle.forEach(id => gesehen.add(id));
    erstesMal = false;
    return;
  }
  let frisch = 0;
  for (const id of alle) {
    if (gesehen.has(id)) continue;
    gesehen.add(id);
    neue.add(id);
    frisch += 1;
  }
  if (frisch) klingle();
}

function sag(wo, text, art = '') {
  const ziel = byId(wo);
  ziel.textContent = text;
  if (art) ziel.dataset.art = art; else delete ziel.dataset.art;
}

// ---- Der Tag als eine Liste ------------------------------------------------

function verdrahteHeuteListe() {
  // Dieselben Griffe in Tagesliste und Archiv - "Zurueck" und "Doch nicht"
  // holen Erledigtes wieder nach oben.
  const behandle = async event => {
    const knopf = event.target.closest('[data-aktion]');
    if (!knopf) return;
    knopf.disabled = true;
    const { aktion, id } = knopf.dataset;
    const nu = jetzt();
    if (aktion === 'ankunft') await sendeAktion(hausToken(), { art: 'ankunft', id, zeit: nu.zeit });
    if (aktion === 'abgang') await sendeAktion(hausToken(), { art: 'abgang', id, zeit: nu.zeit });
    if (aktion === 'zurueck') await sendeAktion(hausToken(), { art: 'abgang', id, zeit: null });
    if (aktion === 'fertig') await sendeTakeawayAktion(hausToken(), { art: 'fertig', id, zeit: nu.zeit, rolle: 'haus' });
    if (aktion === 'abgeholt') await sendeTakeawayAktion(hausToken(), { art: 'abgeholt', id, zeit: nu.zeit });
    if (aktion === 'doch-nicht') await sendeTakeawayAktion(hausToken(), { art: 'offen', id });
    // Die Antwort kommt ueber den Draht zurueck und malt die Liste neu.
  };
  byId('heuteListe').addEventListener('click', behandle);
  byId('archivListe').addEventListener('click', behandle);
}

/**
 * Eine Zeile der Tagesliste. Links die Zeit, in der Mitte wer und was,
 * rechts genau ein Knopf - der naechste sinnvolle Schritt und sonst nichts.
 */
function zeile({ zeit, titel, info, knopfText, aktion, id, erledigt = false, leiseKnopf = false, ton = '', notiz = null, partyId = null, gast = null, zweiterKnopf = null }) {
  const li = document.createElement('li');
  if (erledigt) li.dataset.erledigt = '';
  if (ton) li.dataset.ton = ton;
  // Reservierungszeilen oeffnen das Aktionsblatt; neu Eingegangenes leuchtet,
  // bis es einmal angetippt wurde.
  if (partyId) li.dataset.party = partyId;
  if (neue.has(id)) li.dataset.neu = '';
  const zeitEl = document.createElement('span');
  zeitEl.className = 'zeit';
  zeitEl.textContent = zeit;
  const wer = document.createElement('div');
  wer.className = 'wer';
  const b = document.createElement('b');
  b.textContent = titel;
  const s = document.createElement('span');
  s.textContent = info;
  wer.append(b, s);
  if (notiz) {
    const wunsch = document.createElement('span');
    wunsch.className = 'wunsch';
    wunsch.textContent = `♡ ${notiz}`;
    wer.append(wunsch);
  }
  // Stammgast: nur bei mehr als einem Besuch - beim ersten waere "1. Besuch"
  // keine Auskunft, sondern Fuellsel. Die Unvertraeglichkeit steht daneben,
  // weil sie in der Kueche zaehlt, nicht in der Statistik.
  if (gast && (gast.besuche > 1 || gast.unvertraeglichkeit)) {
    const kennung = document.createElement('span');
    kennung.className = 'stammgast';
    const teile = [];
    if (gast.besuche > 1) teile.push(`${gast.besuche}. Besuch`);
    if (gast.unvertraeglichkeit) teile.push(gast.unvertraeglichkeit);
    kennung.textContent = `★ ${teile.join(' · ')}`;
    wer.append(kennung);
  }
  li.append(zeitEl, wer);
  // Ein zweiter Knopf ist die Ausnahme, nicht die Regel: er steht nur beim
  // Takeaway, wenn der Wirt fertigmeldet. Dann sind es wirklich zwei Schritte -
  // erst ist das Essen fertig, dann holt es jemand ab.
  if (zweiterKnopf) {
    const vor = document.createElement('button');
    vor.type = 'button';
    vor.className = 'knopf leise';
    vor.dataset.aktion = zweiterKnopf.aktion;
    vor.dataset.id = id;
    vor.textContent = zweiterKnopf.text;
    li.append(vor);
  }
  if (knopfText) {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = leiseKnopf ? 'knopf leise' : 'knopf';
    knopf.dataset.aktion = aktion;
    knopf.dataset.id = id;
    knopf.textContent = knopfText;
    li.append(knopf);
  }
  return li;
}

/** Alles neu malen: die eine Wahrheit ist der Stand des Dienstes. */
function male() {
  if (!stand?.floorplan) return;
  const plan = buildFloorplan(stand.floorplan);
  const policy = stand.floorplan.policy || {};
  const nu = jetzt();
  const at = `${nu.datum}T${nu.zeit}`;
  const dauer = party => durationFor(party.guests, policy);

  const heute = (stand.parties || []).filter(party => party.date === nu.datum);
  const takeaway = (stand.takeaway || []).filter(bestellung => bestellung.date === nu.datum);
  merkeNeue(heute, takeaway);

  // Wer sitzt gerade, was ist belegt.
  const belegt = new Set();
  let imHaus = 0;
  for (const party of heute) {
    if (!party.tableIds?.length) continue;
    if (!occupiesAt(party, { at, minutes: dauer(party) })) continue;
    imHaus += party.guests;
    for (const id of party.tableIds) belegt.add(id);
  }
  const gesperrt = new Set(stand.blockedTables || []);
  const offen = plan.tables.filter(table => !gesperrt.has(table.id));
  const freie = offen.filter(table => !belegt.has(table.id));

  // Die drei Zahlen.
  const erwartete = heute.filter(party => !party.arrived && !party.left);
  byId('zahlErwartet').textContent = String(erwartete.length);
  byId('subErwartet').textContent = erwartete.length
    ? `${erwartete.reduce((sum, party) => sum + party.guests, 0)} Personen`
    : 'nichts offen';
  byId('zahlImHaus').textContent = String(imHaus);
  byId('subImHaus').textContent = imHaus ? 'sitzen an Tischen' : 'noch leer';
  byId('zahlFrei').textContent = `${freie.length}`;
  const offeneAbholungen = takeaway.filter(bestellung => bestellung.status === 'offen').length;
  byId('subFrei').textContent = `von ${offen.length} Tischen`
    + (offeneAbholungen ? ` · ${offeneAbholungen} Abholung${offeneAbholungen === 1 ? '' : 'en'} offen` : '');

  // Rueckgaengig-Balken beim Leeren-Knopf. Nach zwei Minuten verschwindet er
  // von selbst - das Wiederherstellen beim Dienst geht still noch laenger.
  const korb = stand.papierkorb;
  if (korb && !korbSeit) {
    korbSeit = Date.now();
    setTimeout(male, 2 * 60 * 1000 + 500);
  }
  if (!korb) korbSeit = null;
  const korbZeigen = Boolean(korb) && Date.now() - korbSeit < 2 * 60 * 1000;
  byId('korbBalken').hidden = !korbZeigen;
  if (korbZeigen) {
    byId('korbText').textContent = `Tag geleert – ${korb.anzahl} ${korb.anzahl === 1 ? 'Eintrag' : 'Einträge'} im Papierkorb.`;
  }

  // Die Tagesliste: Reservierungen und Abholungen gemischt, nach Zeit.
  // Erledigtes wandert ins eingeklappte Archiv - anschaubar, aber aus dem Weg.
  const eintraege = [];
  const erledigte = [];
  for (const party of heute) {
    const zeitVon = party.time;
    const tische = party.tableIds?.length
      ? `Tisch ${party.tableIds.map(id => plan.tables.find(t => t.id === id)?.number ?? '?').join(' + ')}`
      : 'noch ohne Tisch';
    const [stunde, minute] = zeitVon.split(':').map(Number);
    const bis = stunde * 60 + minute + dauer(party);
    const bisText = `${pad(Math.floor(bis / 60) % 24)}:${pad(bis % 60)}`;
    const personen = `${party.guests} P.`;

    if (party.left) {
      erledigte.push(zeile({
        zeit: zeitVon, id: party.id, partyId: party.id, notiz: party.notiz, gast: party.gast,
        titel: `${party.name} · ${personen}`,
        info: `fertig um ${party.left} · ${tische}`,
        knopfText: 'Zurück', aktion: 'zurueck', erledigt: true, leiseKnopf: true
      }));
    } else if (party.arrived) {
      eintraege.push(zeile({
        zeit: zeitVon, id: party.id, partyId: party.id, notiz: party.notiz, gast: party.gast,
        titel: `${party.name} · ${personen}`,
        info: `im Haus seit ${party.arrived} · ${tische} · frei gegen ${bisText}`,
        knopfText: 'Fertig', aktion: 'abgang', ton: 'da'
      }));
    } else {
      const ueberfaellig = zeitVon < nu.zeit && !party.arrived;
      eintraege.push(zeile({
        zeit: zeitVon, id: party.id, partyId: party.id, notiz: party.notiz, gast: party.gast,
        titel: `${party.name} · ${personen}`,
        info: `${ueberfaellig ? 'überfällig' : 'erwartet'} · ${tische}`,
        knopfText: 'Da', aktion: 'ankunft', ton: ueberfaellig ? 'spaet' : ''
      }));
    }
  }
  for (const bestellung of takeaway) {
    const essen = (bestellung.posten || []).map(eintrag => `${eintrag.menge}× ${eintrag.name}`).join(', ');
    const summe = `€ ${Number(bestellung.summe).toFixed(2).replace('.', ',')}`;
    if (bestellung.status === 'abgeholt') {
      erledigte.push(zeile({
        zeit: bestellung.abholzeit, id: bestellung.id,
        titel: `Takeaway Nr. ${bestellung.nummer} · ${bestellung.name}`,
        info: `${essen} · ${summe}${bestellung.abgeholtUm ? ` · abgeholt ${bestellung.abgeholtUm}` : ''}`,
        knopfText: 'Doch nicht', aktion: 'doch-nicht', erledigt: true, leiseKnopf: true
      }));
    } else {
      // Der Stand steht immer in der Zeile, egal wer fertigmeldet. Ob das
      // Essen schon am Tresen liegt, ist die Frage, die der Wirt beantworten
      // koennen muss, wenn der Gast vor ihm steht.
      const istFertig = bestellung.status === 'fertig';
      const lage = istFertig
        ? `● fertig${bestellung.fertigUm ? ` seit ${bestellung.fertigUm}` : ''}`
        : '○ in der Küche';
      eintraege.push(zeile({
        zeit: bestellung.abholzeit, id: bestellung.id,
        titel: `Takeaway Nr. ${bestellung.nummer} · ${bestellung.name}`,
        info: `${lage} · ${essen} · ${summe} · zahlt bei Abholung`,
        // Fertigmelden nur, wenn der Wirt dafuer zustaendig ist - und nur
        // solange es noch nicht gemeldet ist.
        zweiterKnopf: wirtDarfFertig() && !istFertig ? { text: 'Essen fertig', aktion: 'fertig' } : null,
        knopfText: 'Abgeholt', aktion: 'abgeholt', ton: 'takeaway'
      }));
    }
  }
  const nachZeit = (a, b) => a.querySelector('.zeit').textContent.localeCompare(b.querySelector('.zeit').textContent);
  eintraege.sort(nachZeit);
  erledigte.sort(nachZeit);

  const liste = byId('heuteListe');
  liste.textContent = '';
  for (const eintrag of eintraege) liste.append(eintrag);
  if (!eintraege.length) {
    const leer = document.createElement('li');
    leer.className = 'leer';
    leer.textContent = erledigte.length
      ? 'Alles erledigt – der Rest liegt unten im Archiv des Tages.'
      : 'Heute steht noch nichts an. Reservierungen und Bestellungen erscheinen hier von selbst.';
    liste.append(leer);
  }

  const archiv = byId('archiv');
  archiv.hidden = !erledigte.length;
  byId('archivTitel').textContent = `Erledigt heute (${erledigte.length})`;
  const archivListe = byId('archivListe');
  archivListe.textContent = '';
  for (const eintrag of erledigte) archivListe.append(eintrag);
}

// ---- Das Aktionsblatt: Zeile antippen, Blatt geht auf ----------------------
//
// Tisch aendern zeigt nur passende freie Tische zur Zeit der Reservierung -
// die Automatik schlaegt vor, der Wirt hat das letzte Wort. Dazu Personenzahl
// und Notiz, jeweils ein Feld, ein Knopf.

let blattId = null;

const minutenVon = zeit => {
  const [stunde, minute] = String(zeit || '0:0').split(':').map(Number);
  return stunde * 60 + minute;
};

function verdrahteBlatt() {
  const blatt = byId('blatt');

  const oeffne = event => {
    if (event.target.closest('[data-aktion]')) return;
    const li = event.target.closest('li[data-party]');
    if (!li) return;
    neue.delete(li.dataset.party);
    delete li.dataset.neu;
    blattId = li.dataset.party;
    sag('blattErgebnis', '');
    fuelleBlatt();
    blatt.showModal();
  };
  byId('heuteListe').addEventListener('click', oeffne);
  byId('archivListe').addEventListener('click', oeffne);

  byId('blattZu').addEventListener('click', () => blatt.close());
  blatt.addEventListener('click', event => { if (event.target === blatt) blatt.close(); });

  // Nach jeder Aktion kommt der frische Stand direkt zurueck - Blatt und
  // Liste malen sofort neu, ohne auf den Draht zu warten.
  async function tuUndZeige(befehl, meldung) {
    sag('blattErgebnis', 'Einen Moment …');
    const antwort = await sendeAktion(hausToken(), befehl);
    if (!antwort?.ok) {
      return sag('blattErgebnis', 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    }
    if (antwort.stand) { stand = antwort.stand; male(); }
    fuelleBlatt();
    sag('blattErgebnis', meldung, 'gut');
  }

  byId('blattTische').addEventListener('click', event => {
    const knopf = event.target.closest('[data-tisch-ids]');
    if (!knopf) return;
    if (knopf.dataset.tischIds === 'ohne') {
      return tuUndZeige({ art: 'tisch', id: blattId, tableIds: [] }, 'Tisch freigegeben – die Gruppe steht ohne Tisch.');
    }
    tuUndZeige({ art: 'tisch', id: blattId, tableIds: knopf.dataset.tischIds.split(',') },
      `Umgesetzt auf Tisch ${knopf.dataset.nummer}.`);
  });

  byId('blattPersonenForm').addEventListener('submit', event => {
    event.preventDefault();
    const anzahl = Math.trunc(Number(byId('blattPersonen').value));
    if (!Number.isFinite(anzahl) || anzahl < 1 || anzahl > 24) {
      return sag('blattErgebnis', 'Bitte 1 bis 24 Personen eintragen.', 'fehler');
    }
    tuUndZeige({ art: 'personen', id: blattId, guests: anzahl }, `Personenzahl auf ${anzahl} geändert.`);
  });

  byId('blattNotizForm').addEventListener('submit', event => {
    event.preventDefault();
    const text = byId('blattNotiz').value.trim();
    tuUndZeige({ art: 'notiz', id: blattId, text }, text ? 'Notiz gespeichert.' : 'Notiz entfernt.');
  });
}

function fuelleBlatt() {
  const party = (stand?.parties || []).find(eintrag => eintrag.id === blattId);
  if (!party) { byId('blatt').close(); return; }
  const plan = buildFloorplan(stand.floorplan);
  const policy = stand.floorplan.policy || {};
  const dauer = wer => durationFor(wer.guests, policy);

  byId('blattName').textContent = `${party.name} · ${party.guests} P. · ${party.time} Uhr`;
  const aktuelle = party.tableIds?.length
    ? `Tisch ${party.tableIds.map(id => plan.tables.find(t => t.id === id)?.number ?? '?').join(' + ')}`
    : 'noch ohne Tisch';
  byId('blattInfo').textContent = aktuelle
    + (party.kontakt?.telefon ? ` · ${party.kontakt.telefon}` : '')
    + (party.quelle === 'online' ? ' · online gebucht' : '');
  const notizZeile = byId('blattNotizZeile');
  notizZeile.hidden = !party.notiz;
  notizZeile.textContent = party.notiz ? `Wunsch des Gastes: ${party.notiz}` : '';
  byId('blattPersonen').value = String(party.guests);
  byId('blattNotiz').value = party.notiz || '';

  // Freie Tische im Zeitfenster dieser Reservierung. Zwei Fenster stossen
  // sich, wenn keines vor dem anderen endet.
  const start = minutenVon(party.time);
  const ende = start + dauer(party);
  const belegt = new Set();
  for (const andere of stand.parties || []) {
    if (andere.id === party.id || andere.date !== party.date || !andere.tableIds?.length) continue;
    const andererStart = minutenVon(andere.time);
    let andereEnde = andererStart + dauer(andere);
    if (andere.left) andereEnde = Math.min(andereEnde, minutenVon(andere.left));
    if (andererStart < ende && start < andereEnde) {
      for (const id of andere.tableIds) belegt.add(id);
    }
  }
  const gesperrt = new Set(stand.blockedTables || []);
  const aktuelleIds = new Set(party.tableIds || []);
  const passtFrei = id => !gesperrt.has(id) && !belegt.has(id) && !aktuelleIds.has(id);

  // Einzeltische und zusammengeschobene Tische in einer Liste, die beste
  // Groesse zuerst - grosse Gruppen bekommen so denselben Ein-Tipp-Weg.
  const nummerVon = id => plan.tables.find(entry => entry.id === id)?.number ?? '?';
  const einzelne = plan.tables
    .filter(tisch => passtFrei(tisch.id) && tisch.seats >= party.guests)
    .map(tisch => ({
      ids: [tisch.id],
      nummer: String(tisch.number),
      seats: tisch.seats,
      text: `Tisch ${tisch.number} · ${tisch.seats} Pl.${plan.levels.length > 1 ? ` · ${tisch.levelName}` : ''}`
    }));
  const kombis = (plan.combos || [])
    .filter(kombi => kombi.seats >= party.guests
      && party.guests >= (kombi.minGuests || 1)
      && kombi.tableIds.every(passtFrei))
    .map(kombi => ({
      ids: kombi.tableIds,
      nummer: kombi.tableIds.map(nummerVon).join(' + '),
      seats: kombi.seats,
      text: `Tisch ${kombi.tableIds.map(nummerVon).join(' + ')} · ${kombi.seats} Pl.`
    }));
  const kandidaten = [...einzelne, ...kombis]
    .sort((a, b) => (a.seats - party.guests) - (b.seats - party.guests) || a.ids.length - b.ids.length)
    .slice(0, 12);

  const kasten = byId('blattTische');
  kasten.textContent = '';
  for (const kandidat of kandidaten) {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.dataset.tischIds = kandidat.ids.join(',');
    knopf.dataset.nummer = kandidat.nummer;
    knopf.textContent = kandidat.text;
    kasten.append(knopf);
  }
  if (party.tableIds?.length) {
    const ohne = document.createElement('button');
    ohne.type = 'button';
    ohne.className = 'leise';
    ohne.dataset.tischIds = 'ohne';
    ohne.textContent = 'Ohne Tisch';
    kasten.append(ohne);
  }
  if (!kandidaten.length) {
    const hinweis = document.createElement('p');
    hinweis.className = 'blatt-leer';
    hinweis.textContent = 'Zur gewünschten Zeit ist nichts Passendes frei – auch nicht zusammengeschoben. Früher oder später am Mittag ist eher Platz.';
    kasten.prepend(hinweis);
  }
}

// ---- Telefonische Reservierung ---------------------------------------------

function verdrahteNeueReservierung() {
  const form = byId('neuForm');
  byId('neuZeigen').addEventListener('click', () => {
    form.hidden = !form.hidden;
    if (!form.hidden) {
      // Heute vorbelegen - wer fuer einen anderen Tag reserviert, stellt um.
      const nu = jetzt();
      const tag = byId('neuTag');
      tag.value = tag.value || nu.datum;
      tag.min = nu.datum;
      // Naechste Viertelstunde vorschlagen - meistens ist es "gleich".
      const d = new Date();
      const minuten = Math.min(13 * 60 + 30, Math.max(11 * 60 + 30, Math.ceil((d.getHours() * 60 + d.getMinutes() + 15) / 15) * 15));
      byId('neuZeit').value = `${pad(Math.floor(minuten / 60))}:${pad(minuten % 60)}`;
      byId('neuName').focus();
    }
  });
  byId('neuWeg').addEventListener('click', () => { form.hidden = true; });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = byId('neuName').value.trim();
    const date = byId('neuTag').value;
    const time = byId('neuZeit').value;
    const guests = Number(byId('neuPersonen').value);
    if (name.length < 2 || !date || !time || !guests) {
      return sag('neuErgebnis', 'Name, Tag, Uhrzeit und Personenzahl eintragen – mehr braucht es nicht.', 'fehler');
    }
    sag('neuErgebnis', 'Einen Moment …');
    const antwort = await legeEinfach(hausToken(), {
      name, date, time, guests,
      telefon: byId('neuTelefon').value.trim() || null
    });
    if (!antwort?.ok) {
      return sag('neuErgebnis', 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    }
    form.hidden = true;
    byId('neuName').value = '';
    byId('neuTelefon').value = '';
    byId('neuPersonen').value = '2';
    byId('neuTag').value = '';
    // Ein anderer Tag taucht nicht in der heutigen Liste auf - das muss die
    // Meldung sagen, sonst sieht das Eintragen wie verschluckt aus.
    const heute = jetzt().datum;
    const wann = date === heute ? `um ${time}` : `am ${new Date(`${date}T12:00:00`).toLocaleDateString('de-AT', {
      weekday: 'long', day: 'numeric', month: 'long'
    })} um ${time}`;
    const wohin = antwort.tisch ? `Tisch ${antwort.tisch}` : 'noch ohne Tisch, in der großen Einteilung zuteilen';
    sag('neuErgebnis', `Eingetragen: ${name}, ${guests} P. ${wann} – ${wohin}.`
      + (date === heute ? '' : ' Erscheint am Tag selbst in der Liste.'), 'gut');
  });
}

// ---- Laufkundschaft --------------------------------------------------------

function verdrahteLaufkundschaft() {
  byId('laufErgebnis').textContent = '';

  async function setze(personen, sperre) {
    if (sperre) sperre.disabled = true;
    sag('laufErgebnis', 'Einen Moment …');
    const antwort = await sendeLaufkunde(hausToken(), personen);
    if (sperre) sperre.disabled = false;
    if (antwort?.ok) {
      sag('laufErgebnis', `${personen} ${personen === 1 ? 'Person' : 'Personen'} an Tisch ${antwort.tisch}`
        + `${antwort.etage ? ` (${antwort.etage})` : ''} – belegt bis ${antwort.bis} Uhr.`, 'gut');
      return;
    }
    sag('laufErgebnis', antwort?.grund === 'voll'
      ? 'Gerade ist kein passender Tisch frei. Oben nachsehen, wer bald fertig ist.'
      : 'Das hat nicht geklappt – bitte noch einmal drücken.', 'fehler');
  }

  document.querySelector('.lauf-knoepfe').addEventListener('click', event => {
    const knopf = event.target.closest('[data-personen]');
    if (knopf) setze(Number(knopf.dataset.personen), knopf);
  });

  // Die grosse Gesellschaft: bis 20 eintippen, derselbe Weg dahinter.
  byId('laufMehr').addEventListener('submit', event => {
    event.preventDefault();
    const feld = byId('laufZahl');
    const personen = Math.trunc(Number(feld.value));
    if (!Number.isFinite(personen) || personen < 1 || personen > 20) {
      return sag('laufErgebnis', 'Bitte eine Zahl von 1 bis 20 eintragen.', 'fehler');
    }
    feld.value = '';
    setze(personen, event.submitter);
  });
}

// ---- Tag leeren mit Rueckgaengig -------------------------------------------

function verdrahteTagLeeren() {
  byId('tagLeeren').addEventListener('click', async () => {
    const knopf = byId('tagLeeren');
    knopf.disabled = true;
    const antwort = await leereTag(hausToken());
    knopf.disabled = false;
    if (!antwort?.ok) return sag('laufErgebnis', 'Leeren hat nicht geklappt – bitte noch einmal.', 'fehler');
    if (!antwort.geleert) return sag('laufErgebnis', 'Heute war nichts zu leeren.', '');
    // Der Balken kommt ueber den Draht (Stand enthaelt den Papierkorb).
  });
  byId('korbZurueck').addEventListener('click', async () => {
    const knopf = byId('korbZurueck');
    knopf.disabled = true;
    const antwort = await stelleTagWiederHer(hausToken());
    knopf.disabled = false;
    if (!antwort?.ok) {
      byId('korbText').textContent = antwort?.grund === 'abgelaufen'
        ? 'Die 15 Minuten sind vorbei – der Tag bleibt geleert.'
        : 'Da war nichts wiederherzustellen.';
      return;
    }
    byId('korbBalken').hidden = true;
  });
}

// ---- Mittagskarte und Takeaway-Karte ---------------------------------------

function verdrahteKarten() {
  zeigeKarte();
  byId('karteDatei').addEventListener('change', async event => {
    const datei = event.target.files?.[0];
    event.target.value = '';
    if (!datei) return;
    sag('karteInfo', 'Lade hoch …');
    const antwort = await sendeKarte(hausToken(), datei);
    sag('karteInfo', antwort?.ok
      ? 'Die neue Karte ist da und steht ab sofort auf der Webseite.'
      : 'Hochladen hat nicht geklappt. Ist es ein PDF?', antwort?.ok ? 'gut' : 'fehler');
    zeigeKarte();
  });
  byId('karteWeg').addEventListener('click', async () => {
    sag('karteInfo', 'Entferne …');
    const antwort = await loescheKarte(hausToken());
    sag('karteInfo', antwort?.ok ? 'Karte entfernt.' : 'Entfernen hat nicht geklappt.', antwort?.ok ? 'gut' : 'fehler');
    zeigeKarte();
  });

  // Takeaway-Karte: vorbefuellt vom Dienst, nie ueberschrieben beim Tippen.
  const feld = byId('taKarteText');
  feld.addEventListener('input', () => { feld.dataset.beruehrt = '1'; });
  const fuelleVor = () => {
    if (!feld.dataset.beruehrt && typeof stand?.takeawayKarteText === 'string') {
      feld.value = stand.takeawayKarteText;
    }
  };
  fuelleVor();
  setInterval(fuelleVor, 5000);
  byId('taKarteSetzen').addEventListener('click', async () => {
    sag('taKarteInfo', 'Wird veröffentlicht …');
    const antwort = await sendeTakeawayKarte(hausToken(), feld.value);
    if (!antwort?.ok) return sag('taKarteInfo', 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    sag('taKarteInfo', antwort.gerichte.length
      ? `Veröffentlicht: ${antwort.gerichte.length} Gericht(e) sind jetzt bestellbar.`
      : 'Karte geleert – die Seite nimmt keine Bestellungen mehr an.', 'gut');
  });
}

async function zeigeKarte() {
  const info = await holeKarteInfo();
  const da = Boolean(info?.ok && info.da);
  byId('karteAnsehen').hidden = !da;
  byId('karteWeg').hidden = !da;
  if (!da) { byId('karteStand').textContent = 'Noch keine Karte hochgeladen.'; return; }
  byId('karteAnsehen').href = await karteAdresse();
  const von = new Date(info.stand);
  byId('karteStand').textContent = Number.isNaN(von.getTime())
    ? 'Eine Karte ist hinterlegt.'
    : `Aktuelle Karte vom ${von.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}.`;
}
