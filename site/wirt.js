// Die einfache Wirt-Ansicht, gebaut wie die besten Service-Apps: drei Zahlen
// oben, darunter EINE chronologische Liste des Tages - Reservierungen und
// Abholungen gemischt, je Zeile ein grosser Statusknopf. Sie rechnet nichts
// selbst aus, was der Dienst besser weiss: Tische vergibt der Server, damit
// zwei Handys nie denselben letzten Tisch erwischen.

import {
  apiAdresse, bleibVerbunden, hausToken, holeKarteInfo, holeKuechenzettel, holeMenueplan, holeStand, karteAdresse,
  loescheMenueplan, rueckeWocheVor, sendeMenueplan,
  leereTag, legeEinfach, loescheKarte, schluesselAusAdresse, sendeAktion, sendePlan,
  sendeKarte, sendeLaufkunde, sendeTakeawayAktion, sendeTakeawayKarte,
  holeEigeneEvents, holeGeschlossen, holeOeffnung, legeEigenesEvent, loescheEigenesEvent, sageTagAb, sendeTischsperre, setzeOeffnung, setzeTagZu,
  holeHausPush, holePushSchluessel, meldeHausPushAb, meldeHausPushAn,
  legeZeitsperre, loescheZeitsperre, setzeAnnahme,
  setzeFertigWer, setzeToken,
  stelleTagWiederHer
} from './haus-api.js?v=9bbaa1e5';
import { liesMenueplan, zeichneMenueplan } from './wirt-menueplan.mjs?v=de7cbcf5';
import { liesAnsicht, setzeHeuteZahl, verdrahteReiter, wendeAn, zeichneEinstellungen } from './wirt-ansicht.mjs?v=6d10f80f';
import { istOffenerTag, naechsterOffenerTag } from './feiertage.mjs?v=def9b961';
import { buildFloorplan } from './floorplan-layout.mjs?v=7911e18a';
import { planMitTischen, setzeAnzahl, zaehleGroessen } from './tisch-anzahlen.mjs?v=11ecb06c';
import { durationFor, occupiesAt } from './table-assignment.mjs?v=2dead16d';

const byId = id => document.getElementById(id);
const pad = zahl => String(zahl).padStart(2, '0');
// Welchen Tag die Liste zeigt. Normal: heute. Mit ?tag=2026-09-07 in der
// Adresse einen anderen Tag - so sieht der Wirt am Freitag die
// Vorbestellungen fuer Montag, und so laesst sich die Ansicht pruefen, wenn
// die Wirtschaft zu hat. Die Uhrzeit bleibt die echte: "ueberfaellig" und
// "frei gegen" rechnen mit der Wanduhr, nicht mit dem gewaehlten Tag.
const datumPlus = (datum, tage) => {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + tage);
  return d.toISOString().slice(0, 10);
};
const heuteDatum = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
// Zugesperrte Tage kennt nur der Dienst; bis er antwortet, gelten Werktage.
let geschlossene = [];

/**
 * Der Leittag: der Tag, um den es gerade geht. Bis 15:00 ist das heute
 * (wenn heute gekocht wird), danach der naechste offene Tag - der Mittag ist
 * vorbei, und was jetzt hereinkommt, ist fuer morgen (Jonas, 06.09.). Am
 * Wochenende und an Feiertagen zeigt die App so nie ins Leere.
 */
const SPRUNG_UM = '15:00';
const leitTag = () => {
  const d = new Date();
  const heute = heuteDatum();
  const zeit = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (zeit < SPRUNG_UM && istOffenerTag(heute, geschlossene)) return heute;
  return naechsterOffenerTag(datumPlus(heute, 1), geschlossene);
};

// '' heisst Leittag. Ein anderer Tag kommt aus der Adresse oder aus der
// Tagesleiste und steht danach auch in der Adresse - so ueberlebt die Wahl
// ein Neuladen, und ein Link "zeig mir Montag" laesst sich weitergeben.
let gewaehlterTag = (() => {
  const wert = new URLSearchParams(window.location.search).get('tag') || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(wert) ? wert : '';
})();
const jetzt = () => {
  const d = new Date();
  return {
    datum: gewaehlterTag || leitTag(),
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

  // Kein Schluessel: anmelden statt einer Ansicht, die sich nur nicht
  // verbinden kann. Vom Homescreen ist das der Regelfall - iOS gibt einer
  // installierten App einen eigenen Speicher, und der Link mit #k= wurde
  // in Safari geoeffnet.
  if (!hausToken()) { zeigeAnmelden(); return; }

  schreibTagZeile();
  verdrahteTagwahl();

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
  verdrahteAnsicht();
  verdrahteKarten();
  verdrahteMenueplan();
  verdrahteZettel();
  verdrahteFertigWer();
  verdrahteEigeneEvents();
  verdrahteSperren();
  verdrahteZu();
  verdrahteOeffnung();
  verdrahteBestand();
  verdrahtePush();
  verdrahteAnnahme();
  verdrahteUnterreiter();
}

// ---- Online-Reservierungen: Tag voll, Zeiten blockieren --------------------
//
// Das Reservierungsmodell seit 06.09.: keine Tischautomatik, die Grenze
// setzt der Wirt. Alles bezieht sich auf den gewaehlten Tag der Leiste.
// Der Stand kommt ueber den Draht, deshalb malt male() den Kasten mit.

function zeichneAnnahme() {
  const kasten = byId('annahmeStand');
  if (!kasten || !stand) return;
  const datum = jetzt().datum;
  const annahme = stand.annahme || { voll: [], sperren: [] };
  const voll = annahme.voll.includes(datum);
  const tagText = new Date(`${datum}T12:00:00`).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' });
  byId('annahmeVoll').textContent = voll ? 'Wieder annehmen' : 'Tag voll melden';
  byId('annahmeVoll').classList.toggle('rot', voll);
  kasten.textContent = voll
    ? `Voll gemeldet: online kommt für ${tagText} keine Reservierung mehr an. Gäste lesen „alles belegt, bitte anrufen“.`
    : `Online werden für ${tagText} Reservierungen angenommen. Was du selbst einträgst, geht immer.`;

  const liste = byId('sperrenListe');
  liste.textContent = '';
  for (const sperre of annahme.sperren.filter(sp => sp.datum === datum)) {
    const li = document.createElement('li');
    const text = document.createElement('span');
    text.textContent = `${sperre.von}–${sperre.bis} blockiert`;
    const weg = document.createElement('button');
    weg.type = 'button';
    weg.className = 'knopf leise klein';
    weg.textContent = 'aufheben';
    weg.addEventListener('click', async () => {
      weg.disabled = true;
      const antwort = await loescheZeitsperre(hausToken(), sperre);
      if (!antwort?.ok) { weg.disabled = false; sag('annahmeInfo', 'Das hat nicht geklappt – bitte noch einmal.', 'fehler'); }
    });
    li.append(text, weg);
    liste.append(li);
  }
}

function verdrahteAnnahme() {
  const knopf = byId('annahmeVoll');
  const form = byId('sperreForm');
  if (!knopf || !form) return;
  knopf.addEventListener('click', async () => {
    knopf.disabled = true;
    const datum = jetzt().datum;
    const voll = !(stand?.annahme?.voll || []).includes(datum);
    const antwort = await setzeAnnahme(hausToken(), { datum, voll });
    knopf.disabled = false;
    if (!antwort?.ok) return sag('annahmeInfo', 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    sag('annahmeInfo', voll ? 'Gemeldet – online ist der Tag zu.' : 'Online wieder offen.', 'gut');
  });
  form.addEventListener('submit', async ereignis => {
    ereignis.preventDefault();
    const von = byId('sperreVon').value;
    const bis = byId('sperreBis').value;
    if (!von || !bis || von >= bis) return sag('annahmeInfo', 'Bitte eine Zeit von–bis wählen, bis nach von.', 'fehler');
    const antwort = await legeZeitsperre(hausToken(), { datum: jetzt().datum, von, bis });
    if (!antwort?.ok) return sag('annahmeInfo', 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    form.reset();
    sag('annahmeInfo', `${von}–${bis} blockiert – online nicht mehr wählbar.`, 'gut');
  });
}

// ---- Klingeln bei neuer Bestellung -----------------------------------------
//
// Web Push fuers Haus, gebaut wie die Abholmeldung des Gastes (takeaway.js):
// der Service Worker wirt-sw.js liegt neben dieser Seite, die Anmeldung geht
// mit dem Hausschluessel an den Dienst, und die Meldung selbst holt sich der
// Worker dort - ueber Apple und Google laeuft nur ein leeres Anklopfen.
//
// iOS erlaubt Meldungen nur der App vom Homescreen. Im Safari-Tab gibt es
// dort keinen Knopf, sondern den Hinweis - ein Knopf, der nichts tut, waere
// schlimmer als keiner.

const SW_DATEI = 'wirt-sw.js?v=96460eb3';

const schluesselAlsBytes = text => {
  const roh = atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '='));
  return Uint8Array.from(roh, zeichen => zeichen.charCodeAt(0));
};

async function verdrahtePush() {
  const an = byId('pushAn');
  const aus = byId('pushAus');
  const hinweis = byId('pushHinweis');
  if (!an || !aus) return;
  const sagPush = (text, art = '') => sag('pushInfo', text, art);

  const istIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installiert = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const kann = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  if (!kann || (istIos && !installiert)) {
    an.hidden = true;
    hinweis.textContent = istIos
      ? 'Auf dem iPhone klingelt nur die App vom Homescreen: in Safari auf „Teilen“ und „Zum Home-Bildschirm“ tippen, dann dort anmelden.'
      : 'Dieser Browser kann keine Meldungen im Hintergrund zeigen.';
    return;
  }

  const zeige = angemeldet => { an.hidden = angemeldet; aus.hidden = !angemeldet; };

  // Steht dieses Geraet schon auf der Liste? Der Browser weiss es.
  try {
    const worker = await navigator.serviceWorker.getRegistration(SW_DATEI);
    const anmeldung = await worker?.pushManager.getSubscription();
    zeige(Boolean(anmeldung));
  } catch { zeige(false); }

  an.addEventListener('click', async () => {
    an.disabled = true;
    try {
      // Die Erlaubnis MUSS aus einem echten Tippen kommen.
      const erlaubnis = await Notification.requestPermission();
      if (erlaubnis !== 'granted') {
        an.disabled = false;
        return sagPush('Ohne Erlaubnis kein Klingeln – die Liste hier zeigt Neues trotzdem, solange die App offen ist.', 'warnung');
      }
      const schluessel = await holePushSchluessel();
      if (!schluessel?.schluessel) throw new Error('kein Schluessel');

      const worker = await navigator.serviceWorker.register(SW_DATEI);
      await navigator.serviceWorker.ready;
      const anmeldung = await worker.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: schluesselAlsBytes(schluessel.schluessel)
      });
      const gespeichert = await meldeHausPushAn(hausToken(), {
        endpunkt: anmeldung.endpoint,
        geraet: navigator.platform || ''
      });
      if (!gespeichert?.ok) throw new Error(gespeichert?.grund || 'abgelehnt');

      (worker.active || navigator.serviceWorker.controller)?.postMessage({
        art: 'merke',
        daten: {
          token: hausToken(),
          api: await apiAdresse(),
          seite: `${location.origin}${location.pathname}`,
          symbol: new URL('assets/icons/favicon-180.png', location.href).href
        }
      });
      zeige(true);
      sagPush(`Passt – dieses Gerät klingelt. ${gespeichert.anzahl > 1 ? `Insgesamt ${gespeichert.anzahl} Geräte.` : ''}`.trim(), 'gut');
    } catch {
      sagPush('Das hat nicht geklappt. Bitte noch einmal – oder die App vom Homescreen öffnen.', 'fehler');
    }
    an.disabled = false;
  });

  aus.addEventListener('click', async () => {
    aus.disabled = true;
    try {
      const worker = await navigator.serviceWorker.getRegistration(SW_DATEI);
      const anmeldung = await worker?.pushManager.getSubscription();
      const endpunkt = anmeldung?.endpoint || '';
      await anmeldung?.unsubscribe();
      (worker?.active || navigator.serviceWorker.controller)?.postMessage({ art: 'vergiss' });
      if (endpunkt) await meldeHausPushAb(hausToken(), endpunkt);
    } catch { /* Abmelden darf nie haengen bleiben */ }
    aus.disabled = false;
    zeige(false);
    sagPush('Erledigt – dieses Gerät klingelt nicht mehr.', 'gut');
  });

  // Wie viele Geraete im Haus klingeln - eine Zeile, die den Zustand erklaert.
  const stand = await holeHausPush(hausToken());
  if (stand?.ok && stand.anzahl > 0) {
    hinweis.textContent = `${stand.anzahl === 1 ? 'Ein Gerät' : `${stand.anzahl} Geräte`} im Haus ${stand.anzahl === 1 ? 'klingelt' : 'klingeln'} bei neuer Bestellung oder Reservierung.`;
  }
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

// ---- Welcher Tag -------------------------------------------------------------
//
// Heute und die naechsten offenen Tage als Leiste. Am Freitag sieht die
// Kueche damit die Vorbestellungen fuer Montag; an einem Samstag zeigt die
// Ansicht nicht ins Leere, sondern einen Tipp weiter den Montag.

function schreibTagZeile() {
  const datum = jetzt().datum;
  const heute = heuteDatum();
  const wann = datum === heute ? 'Heute Mittag ·' : datum === datumPlus(heute, 1) ? 'Morgen Mittag ·' : 'Mittag am';
  byId('tagZeile').textContent = `${wann} ${new Date(`${datum}T12:00:00`).toLocaleDateString('de-AT', {
    weekday: 'long', day: 'numeric', month: 'long'
  })}`;
}

async function verdrahteTagwahl() {
  const leiste = byId('tagWahl');
  if (!leiste) return;
  const antwort = await holeGeschlossen().catch(() => null);
  geschlossene = Array.isArray(antwort?.tage) ? antwort.tage : [];

  // Fuenf offene Tage ab dem Leittag - eine Arbeitswoche, Montag bis
  // Freitag. Bis 15:00 steht der heutige Tag vorne, danach der naechste.
  const male_leiste = () => {
    const start = leitTag();
    const tage = [{ datum: start }];
    let cursor = start;
    while (tage.length < 5) {
      const naechster = naechsterOffenerTag(datumPlus(cursor, 1), geschlossene);
      if (!naechster || naechster === cursor) break;
      tage.push({ datum: naechster });
      cursor = naechster;
    }
    // Ein Tag aus der Adresse, der nicht in der Leiste steht, bekommt einen
    // eigenen Knopf - sonst zeigte die Liste einen Tag, den keine Leiste nennt.
    if (gewaehlterTag && !tage.some(t => t.datum === gewaehlterTag)) tage.push({ datum: gewaehlterTag });

    leiste.textContent = '';
    const gezeigt = jetzt().datum;
    for (const tag of tage) {
      const knopf = document.createElement('button');
      knopf.type = 'button';
      knopf.className = 'tag-chip';
      knopf.dataset.datum = tag.datum;
      // Ein Knopf, eine Zeile: "mo 07.09." - fuenf davon nebeneinander,
      // klein genug fuer 390 px (Jonas, 06.09.: alle Tage in einer Zeile,
      // nichts gestapelt).
      knopf.textContent = kurzTag(tag.datum).replace('.', '');
      if (tag.datum === heuteDatum()) knopf.dataset.heute = '';
      if (!istOffenerTag(tag.datum, geschlossene)) knopf.dataset.zu = '';
      knopf.setAttribute('aria-pressed', String(tag.datum === gezeigt));
      leiste.append(knopf);
    }
  };
  male_leiste();
  schreibTagZeile();
  male();
  // Um 15:00 springt die Leiste von selbst auf den naechsten Tag - auch
  // wenn die App seit dem Morgen offen ist.
  let letzterLeittag = leitTag();
  setInterval(() => {
    if (leitTag() === letzterLeittag) return;
    letzterLeittag = leitTag();
    if (!gewaehlterTag) { male_leiste(); schreibTagZeile(); male(); }
  }, 60 * 1000);

  leiste.addEventListener('click', ereignis => {
    const knopf = ereignis.target.closest('.tag-chip');
    if (!knopf) return;
    gewaehlterTag = knopf.dataset.datum === leitTag() ? '' : knopf.dataset.datum;
    for (const k of leiste.querySelectorAll('.tag-chip')) {
      k.setAttribute('aria-pressed', String(k.dataset.datum === jetzt().datum));
    }
    const adresse = new URL(window.location.href);
    if (gewaehlterTag) adresse.searchParams.set('tag', gewaehlterTag);
    else adresse.searchParams.delete('tag');
    window.history.replaceState(null, '', adresse);
    schreibTagZeile();
    male();
  });
}

const kurzTag = datum => new Date(`${datum}T12:00:00`).toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit' })
  .toLowerCase().replace(/\.,/, '');

// ---- Wischen zum Abhaken ----------------------------------------------------
//
// Eine Zeile nach rechts wischen loest ihren Hauptknopf aus - dasselbe wie
// Tippen, nur schneller, wenn die Haende nass sind. Der Knopf bleibt: Wischen
// sieht man nicht, den Knopf schon. Erledigtes und Zeilen ohne Knopf wischen
// nicht. Ein Wischen darf nicht als Tippen enden und das Blatt aufmachen -
// deshalb der Merker am Element, den der Klick danach abfaengt.

const WISCH_SCHWELLE = 96;

function verdrahteWischen(liste) {
  let start = null;
  liste.addEventListener('pointerdown', ereignis => {
    if (ereignis.pointerType === 'mouse' && ereignis.button !== 0) return;
    const li = ereignis.target.closest('li');
    if (!li || li.dataset.erledigt !== undefined || ereignis.target.closest('button')) return;
    if (!li.querySelector('.knopf:not(.leise)')) return;
    start = { li, x: ereignis.clientX, y: ereignis.clientY, dx: 0, laeuft: false, id: ereignis.pointerId };
  }, { passive: true });

  liste.addEventListener('pointermove', ereignis => {
    if (!start || ereignis.pointerId !== start.id) return;
    const dx = ereignis.clientX - start.x;
    const dy = ereignis.clientY - start.y;
    // Erst entscheiden, ob es ein Wischen ist: mehr seitwaerts als hoch.
    if (!start.laeuft) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) { start = null; return; }
      start.laeuft = true;
      start.li.dataset.wischt = '';
    }
    start.dx = Math.max(0, dx);
    start.li.style.setProperty('--wisch', `${start.dx}px`);
    start.li.style.setProperty('--wisch-anteil', String(Math.min(1, start.dx / WISCH_SCHWELLE)));
  }, { passive: true });

  const ende = ereignis => {
    if (!start || (ereignis && ereignis.pointerId !== start.id)) return;
    const { li, dx, laeuft } = start;
    start = null;
    if (!laeuft) return;
    delete li.dataset.wischt;
    li.style.removeProperty('--wisch');
    li.style.removeProperty('--wisch-anteil');
    if (dx >= WISCH_SCHWELLE) {
      li.dataset.erledigtWisch = '';
      li.querySelector('.knopf:not(.leise)')?.click();
    }
    // ERST klicken, DANN den Merker setzen: der Abfaenger unten laeuft in
    // der Capture-Phase und haette sonst auch diesen eigenen Klick
    // geschluckt - das Wischen sah fertig aus und tat nichts. Der Klick,
    // den der Finger beim Loslassen erzeugt, kommt erst danach.
    li.dataset.gewischt = '';
    setTimeout(() => { delete li.dataset.gewischt; }, 350);
  };
  liste.addEventListener('pointerup', ende);
  liste.addEventListener('pointercancel', ende);
  liste.addEventListener('click', ereignis => {
    const li = ereignis.target.closest('li');
    if (li?.dataset.gewischt !== undefined) { ereignis.stopPropagation(); ereignis.preventDefault(); }
  }, true);
}

// ---- Unterreiter: links Reservierungen, rechts Takeaway --------------------
//
// Beides bleibt in EINER Liste im DOM; der Unterreiter blendet nur aus. So
// bleibt die Sortierung nach Zeit, und die Zahl am Reiter unten zaehlt
// weiter alles. Die Wahl haelt, bis man wechselt - beim Aufsperren links.

let unterreiter = 'reservierung';

function zeichneUnterreiter(eintraege, erledigte, nu) {
  const zaehl = art => eintraege.filter(li => li.dataset.art === art).length;
  const setz = (id, n) => { const el = byId(id); if (!el) return; el.textContent = n ? String(n) : ''; el.hidden = !n; };
  setz('zahlReservierungen', zaehl('reservierung'));
  setz('zahlTakeaway', zaehl('takeaway'));
  for (const knopf of document.querySelectorAll('.unter-knopf')) {
    knopf.setAttribute('aria-selected', String(knopf.dataset.art === unterreiter));
  }
  for (const li of document.querySelectorAll('#heuteListe li, #archivListe li')) {
    if (li.classList.contains('leer')) { li.remove(); continue; }
    li.hidden = li.dataset.art !== unterreiter;
  }
  const sichtbar = eintraege.filter(li => li.dataset.art === unterreiter).length;
  if (!sichtbar) {
    const leer = document.createElement('li');
    leer.className = 'leer';
    // "Heute" nur, wenn die Liste wirklich heute zeigt - am Sonntagabend
    // steht Montag vorne, und da ist "heute" schlicht falsch.
    const wann = nu.datum === heuteDatum() ? 'Heute' : 'An diesem Tag';
    const was = unterreiter === 'takeaway' ? 'Bestellungen' : 'Reservierungen';
    const erledigt = erledigte.filter(li => li.dataset.art === unterreiter).length;
    leer.textContent = erledigt
      ? 'Alles erledigt – der Rest liegt unten im Archiv des Tages.'
      : `${wann} keine ${was}. Neue erscheinen hier von selbst.`;
    byId('heuteListe').append(leer);
  }
  const archiv = byId('archiv');
  if (archiv) archiv.hidden = !erledigte.some(li => li.dataset.art === unterreiter);
}

function verdrahteUnterreiter() {
  const leiste = byId('unterReiter');
  if (!leiste) return;
  leiste.addEventListener('click', ereignis => {
    const knopf = ereignis.target.closest('.unter-knopf');
    if (!knopf || knopf.dataset.art === unterreiter) return;
    unterreiter = knopf.dataset.art;
    male();
  });
}

// ---- Auslastung: Plaetze gegen Reservierungen ------------------------------
//
// Keine Tischzuweisung, nur die Summe: wie viele Plaetze hat das Haus laut
// Standardplan, wie viele Personen haben fuer den gewaehlten Tag
// reserviert. Das ist die Grundlage fuer "Tag voll melden" - eine Zahl,
// kein Grundriss.

function zeichneAuslastung(plan, heute, nu) {
  const text = byId('auslastungText');
  if (!text) return;
  const gesperrt = new Set(stand.blockedTables || []);
  const tische = (plan?.tables || []).filter(t => !gesperrt.has(t.id));
  const plaetze = tische.reduce((summe, t) => summe + (Number(t.seats) || 0), 0);
  const personen = heute
    .filter(party => party.status !== 'storniert' && !party.left)
    .reduce((summe, party) => summe + (Number(party.guests) || 0), 0);
  const anteil = plaetze ? Math.min(100, Math.round(personen / plaetze * 100)) : 0;
  byId('auslastungTag').textContent = `${nu.datum === heuteDatum() ? 'Heute' : new Date(`${nu.datum}T12:00:00`).toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })} · Reservierungen gegen die Plätze im Haus`;
  text.textContent = `${personen} ${personen === 1 ? 'Person' : 'Personen'} reserviert · ${plaetze} Plätze · ${anteil} %`;
  const balken = byId('auslastungBalken');
  if (balken) { balken.style.width = `${anteil}%`; balken.dataset.stufe = anteil >= 90 ? 'voll' : anteil >= 70 ? 'eng' : ''; }
  // Die Tische nach Groesse: "2× 8er, 6× 4er" - Standard, nichts zugewiesen.
  const nachGroesse = new Map();
  for (const t of tische) { const n = Number(t.seats) || 0; nachGroesse.set(n, (nachGroesse.get(n) || 0) + 1); }
  const teile = [...nachGroesse.entries()].sort((a, b) => b[0] - a[0]).map(([seats, n]) => `${n}× ${seats}er`);
  byId('auslastungTische').textContent = tische.length
    ? `${tische.length} Tische laut Standardplan: ${teile.join(', ')}. Ändern unter „Tische & Stühle“.`
    : 'Noch keine Tische eingetragen – unter „Tische & Stühle“ anlegen.';
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
  verdrahteWischen(byId('heuteListe'));
}

/**
 * Eine Zeile der Tagesliste. Links die Zeit, in der Mitte wer und was,
 * rechts genau ein Knopf - der naechste sinnvolle Schritt und sonst nichts.
 */
function zeile({ zeit, titel, info, knopfText, aktion, id, erledigt = false, leiseKnopf = false, ton = '', notiz = null, partyId = null, gast = null, zweiterKnopf = null, art = 'reservierung' }) {
  const li = document.createElement('li');
  li.dataset.art = art;
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
  maleSperren();
  maleBestand();
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
    // Keine Tischnummer in der Liste (Jonas, 06.09.): wer reserviert hat
    // und wie viele - das zaehlt. Den Tisch hat der Wirt im Kopf; wer ihn
    // doch eintragen will, findet ihn im Blatt der Reservierung.
    const [stunde, minute] = zeitVon.split(':').map(Number);
    const bis = stunde * 60 + minute + dauer(party);
    const bisText = `${pad(Math.floor(bis / 60) % 24)}:${pad(bis % 60)}`;
    const personen = `${party.guests} P.`;

    if (party.left) {
      erledigte.push(zeile({
        zeit: zeitVon, id: party.id, partyId: party.id, notiz: party.notiz, gast: party.gast,
        titel: `${party.name} · ${personen}`,
        info: `fertig um ${party.left}`,
        knopfText: 'Zurück', aktion: 'zurueck', erledigt: true, leiseKnopf: true
      }));
    } else if (party.arrived) {
      eintraege.push(zeile({
        zeit: zeitVon, id: party.id, partyId: party.id, notiz: party.notiz, gast: party.gast,
        titel: `${party.name} · ${personen}`,
        info: `im Haus seit ${party.arrived} · bis gegen ${bisText}`,
        knopfText: 'Fertig', aktion: 'abgang', ton: 'da'
      }));
    } else {
      // Ueberfaellig gibt es nur am heutigen Tag: eine Reservierung fuer
      // Montag ist am Freitagabend nicht "ueberfaellig", nur weil die
      // Wanduhr schon nach zwoelf steht.
      const ueberfaellig = nu.datum === heuteDatum() && zeitVon < nu.zeit && !party.arrived;
      eintraege.push(zeile({
        zeit: zeitVon, id: party.id, partyId: party.id, notiz: party.notiz, gast: party.gast,
        titel: `${party.name} · ${personen}`,
        info: ueberfaellig ? 'überfällig' : 'erwartet',
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
        knopfText: 'Doch nicht', aktion: 'doch-nicht', erledigt: true, leiseKnopf: true, art: 'takeaway'
      }));
    } else {
      // Der Stand steht immer in der Zeile, egal wer fertigmeldet. Ob das
      // Essen schon am Tresen liegt, ist die Frage, die der Wirt beantworten
      // koennen muss, wenn der Gast vor ihm steht.
      const istFertig = bestellung.status === 'fertig';
      const lage = istFertig
        ? `● fertig${bestellung.fertigSeit ? ` seit ${bestellung.fertigSeit}` : ''}`
        : '○ in der Küche';
      eintraege.push(zeile({
        zeit: bestellung.abholzeit, id: bestellung.id,
        titel: `Takeaway Nr. ${bestellung.nummer} · ${bestellung.name}`,
        info: `${lage} · ${essen} · ${summe} · zahlt bei Abholung`,
        // Fertigmelden nur, wenn der Wirt dafuer zustaendig ist - und nur
        // solange es noch nicht gemeldet ist.
        zweiterKnopf: wirtDarfFertig() && !istFertig ? { text: 'Essen fertig', aktion: 'fertig' } : null,
        knopfText: 'Abgeholt', aktion: 'abgeholt', ton: 'takeaway', art: 'takeaway'
      }));
    }
  }
  const nachZeit = (a, b) => a.querySelector('.zeit').textContent.localeCompare(b.querySelector('.zeit').textContent);
  eintraege.sort(nachZeit);
  erledigte.sort(nachZeit);

  const liste = byId('heuteListe');
  liste.textContent = '';
  for (const eintrag of eintraege) liste.append(eintrag);

  zeichneUnterreiter(eintraege, erledigte, nu);
  zeichneAnnahme();
  zeichneAuslastung(plan, heute, nu);
  // Wie viel noch offen ist - auch sichtbar, wenn gerade die Karte offen ist.
  setzeHeuteZahl(eintraege.length);
  // Und am App-Symbol auf dem Homescreen: beim Entsperren sieht man die
  // Zahl, ohne die App aufzumachen. Nur die installierte App darf das;
  // im Browser-Tab tut der Aufruf still nichts.
  if ('setAppBadge' in navigator) {
    (eintraege.length ? navigator.setAppBadge(eintraege.length) : navigator.clearAppBadge()).catch(() => {});
  }

  const archiv = byId('archiv');
  // Nur das Archiv des offenen Unterreiters - sonst stuende "Erledigt (2)"
  // ueber einer Seite, auf der nichts erledigt ist.
  archiv.hidden = !erledigte.some(li => li.dataset.art === unterreiter);
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

// ---- Welche Abschnitte, in welcher Reihenfolge -------------------------------
//
// Die gespeicherte Ansicht gilt SOFORT, noch bevor der Dienst antwortet:
// sonst blitzen ausgeblendete Kaesten beim Laden kurz auf.

function verdrahteAnsicht() {
  wendeAn(liesAnsicht());
  // Die Leiste zuletzt: sie ruft wendeAn selbst noch einmal auf und setzt
  // dabei den offenen Reiter.
  verdrahteReiter(liesAnsicht);
  const form = byId('ansichtForm');
  if (form) zeichneEinstellungen(form);
}

// ---- Anmelden ---------------------------------------------------------------
//
// Der Schluessel steht im Link des Hauses hinter #k= und wird beim ersten
// Aufruf gespeichert. Auf dem Homescreen greift das nicht: iOS fuehrt fuer
// eine installierte App einen eigenen Speicher. Also einmal einfuegen.

function zeigeAnmelden() {
  document.body.classList.add('ohne-schluessel');
  const kasten = byId('anmeldeKasten');
  const form = byId('anmeldeForm');
  const ergebnis = byId('anmeldeErgebnis');
  if (!kasten || !form) return;
  kasten.hidden = false;
  byId('verbindung').hidden = true;

  form.addEventListener('submit', async ereignis => {
    ereignis.preventDefault();
    const wert = byId('anmeldeFeld').value.trim();
    if (wert.length < 8) { ergebnis.textContent = 'Der Schlüssel ist zu kurz.'; return; }
    ergebnis.textContent = 'Prüfe …';
    // Erst fragen, dann speichern: ein falscher Schluessel im Speicher
    // wuerde die App bei jedem Start stumm scheitern lassen.
    const antwort = await holeStand(wert);
    if (!antwort?.stand) {
      ergebnis.textContent = 'Der Schlüssel passt nicht. Bitte aus dem Link des Hauses kopieren.';
      return;
    }
    setzeToken(wert);
    window.location.reload();
  });
}

// ---- Menueplan der Woche ----------------------------------------------------
//
// Einmal eintragen, dreimal da: Takeaway auf der Webseite, Mittagskarte zum
// Ansehen und Speichern, Faltkarte fuer den Tisch. Der Dienst prueft und
// nennt, was fehlt - das Formular hier rechnet nichts selbst.

const PLAN_GRUENDE = {
  montag: 'Bitte den Montag der Woche eintragen.',
  kein_montag: 'Das Datum ist kein Montag – bitte den Montag der Woche wählen.',
  preis: 'Bitte den Preis der Mittagsgerichte eintragen, zum Beispiel 15,90.',
  leer: 'Bitte mindestens ein Tagesgericht eintragen.',
  token: 'Dieses Gerät ist nicht angemeldet.',
  aus: 'Kein Dienst eingetragen.',
  netz: 'Keine Verbindung – bitte gleich noch einmal.'
};

async function verdrahteMenueplan() {
  const form = byId('planForm');
  if (!form) return;
  // Die Karten-Seiten liegen neben der Wirt-Ansicht - oder eine Ebene
  // hoeher, wenn sie als Einzeldatei unter /tischplan/ laeuft.
  const wurzel = /\/tischplan\//.test(location.pathname) ? '../' : '';
  byId('planAnsehen').href = `${wurzel}mittagskarte.html`;
  // Die Vorschau laedt erst beim Aufklappen und nach jedem Veroeffentlichen
  // neu - sie zeigt immer die Karte, die die Gaeste sehen, nie den Entwurf.
  const vorschau = byId('planVorschau');
  const vorschauKasten = byId('planVorschauKasten');
  const ladeVorschau = () => {
    if (!vorschau || !vorschauKasten?.open) return;
    vorschau.src = `${wurzel}mittagskarte.html?vorschau=${Date.now()}`;
  };
  vorschauKasten?.addEventListener('toggle', ladeVorschau);

  // Vorbefuellen: der Plan vom Dienst. Gibt es keinen, die hinterlegte
  // Ersatzwoche - so steht A la carte schon da und muss nicht abgetippt werden.
  const antwortPlan = await holeMenueplan();
  let plan = antwortPlan?.plan || null;
  const veroeffentlicht = Boolean(plan);
  byId('planWeg').hidden = !plan;

  // Freitagabend legt der Dienst den Entwurf fuer die kommende Woche bereit.
  // Er hat Vorrang im Formular: das ist die Woche, an der jetzt gearbeitet
  // wird. Auf der Webseite steht solange weiter die bestaetigte Karte.
  const entwurf = antwortPlan?.entwurf || null;
  if (entwurf) {
    zeichneMenueplan(form, entwurf);
    zeigePlanStand(plan, entwurf);
    verdrahteFormular();
    return;
  }

  if (!plan) {
    plan = await fetch(`${wurzel}data/menueplan.json`, { cache: 'no-store' })
      .then(antwort => (antwort.ok ? antwort.json() : null)).catch(() => null);
    sag('planInfo', 'Noch kein Plan veröffentlicht – vorbefüllt mit der hinterlegten Woche. Datum und Gerichte anpassen, dann veröffentlichen.');
  }
  zeichneMenueplan(form, plan);
  zeigePlanStand(veroeffentlicht ? plan : null, null);
  verdrahteFormular();
}

/** Die Knoepfe des Menueplan-Kastens. Einmal verdrahtet, nicht je Neuzeichnen. */
function verdrahteFormular() {
  const form = byId('planForm');
  if (form.dataset.verdrahtet) return;
  form.dataset.verdrahtet = '1';

  // Ungespeichertes darf nicht still verloren gehen: sobald der Wirt etwas
  // aendert, faehrt unten eine Leiste mit dem Veroeffentlichen-Knopf mit.
  // Ohne sie tippt man die Woche ein, scrollt weiter - und die Karte auf der
  // Webseite steht unveraendert da, ohne dass es irgendwo auffaellt.
  const merkeAenderung = () => {
    if (document.body.classList.contains('plan-offen')) return;
    document.body.classList.add('plan-offen');
  };
  form.addEventListener('input', merkeAenderung);
  form.addEventListener('change', merkeAenderung);
  form.addEventListener('click', event => {
    if (event.target.closest('.plan-pfeil, .plan-weg, .knopf.klein')) merkeAenderung();
  });
  byId('planLeisteSetzen')?.addEventListener('click', () => byId('planSetzen').click());

  // Die Woche von Hand vorruecken - denselben Weg geht der Dienst
  // Freitagabend von selbst. Der Knopf hilft, wenn der Wirt frueher
  // anfangen will oder ein Freitag einmal ausgefallen ist.
  byId('planWoche')?.addEventListener('click', async () => {
    sag('planInfo', 'Woche wird vorgerückt …');
    const antwort = await rueckeWocheVor(hausToken());
    if (!antwort?.ok) return sag('planInfo', 'Das hat nicht geklappt.', 'fehler');
    if (antwort.grund === 'schon_aktuell') return sag('planInfo', 'Der Plan steht schon auf der laufenden Woche.', 'gut');
    if (antwort.grund === 'kein_plan') return sag('planInfo', 'Es gibt noch keinen Plan, den man vorrücken könnte.', 'fehler');
    if (antwort.grund === 'entwurf_liegt_schon') return sag('planInfo', 'Ein Entwurf für die kommende Woche liegt schon bereit.', 'gut');
    sag('planInfo', 'Entwurf für die kommende Woche liegt bereit – bitte prüfen und veröffentlichen.', 'gut');
    verdrahteMenueplan.neuLaden?.();
    location.reload();
  });

  byId('planSetzen').addEventListener('click', async () => {
    sag('planInfo', 'Wird veröffentlicht …');
    const antwort = await sendeMenueplan(hausToken(), liesMenueplan(form));
    if (!antwort?.ok) {
      return sag('planInfo', PLAN_GRUENDE[antwort?.grund] || 'Das hat nicht geklappt – bitte noch einmal.', 'fehler');
    }
    zeichneMenueplan(form, antwort.plan);
    document.body.classList.remove('plan-offen');
    byId('planWeg').hidden = false;
    byId('planWeg').textContent = 'Plan entfernen';
    zeigePlanStand(antwort.plan, null);
    ladeVorschau();
    const tagesgerichte = antwort.plan.tage.reduce((summe, tag) => summe + tag.gerichte.length, 0);
    sag('planInfo', `Veröffentlicht: ${tagesgerichte} Tagesgericht(e), ${antwort.plan.vital.length} vital, `
      + `${antwort.plan.alacarte.length} à la carte – Takeaway, Mittagskarte und Faltkarte sind auf dem neuen Stand.`, 'gut');
    zeigeKarte();
  });

  // Entfernen in zwei Klicks: der erste fragt, der zweite tut es. Ein
  // versehentlich geleerter Plan hiesse eine leere Takeaway-Karte.
  const weg = byId('planWeg');
  weg.addEventListener('click', async () => {
    if (!weg.dataset.sicher) {
      weg.dataset.sicher = '1';
      weg.textContent = 'Wirklich entfernen?';
      setTimeout(() => { delete weg.dataset.sicher; weg.textContent = 'Plan entfernen'; }, 6000);
      return;
    }
    delete weg.dataset.sicher;
    weg.textContent = 'Plan entfernen';
    const antwort = await loescheMenueplan(hausToken());
    sag('planInfo', antwort?.ok
      ? 'Plan entfernt – Takeaway und Mittagskarte fallen auf PDF und Textliste zurück.'
      : 'Entfernen hat nicht geklappt.', antwort?.ok ? 'gut' : 'fehler');
    if (antwort?.ok) weg.hidden = true;
    zeigeKarte();
  });
}

/**
 * Der Stand oben im Kasten: fuer welche Woche der Plan gilt und wie viele
 * Gerichte davon zum Mitnehmen freigegeben sind. Eine Zeile, die beim
 * Hinschauen die Frage beantwortet "steht die Woche schon?".
 */
function zeigePlanStand(plan, entwurf) {
  const zeile = byId('planStand');
  if (!zeile) return;
  const kurz = datum => new Date(`${datum}T12:00:00`).toLocaleDateString('de-AT', { day: 'numeric', month: 'long' });
  if (entwurf) {
    const bis = new Date(`${entwurf.montag}T12:00:00`);
    bis.setDate(bis.getDate() + 4);
    const bisText = bis.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' });
    zeile.textContent = `Entwurf für ${kurz(entwurf.montag)} – ${bisText}: die Gerichte der Vorwoche stehen als Vorlage da. `
      + `Anpassen und veröffentlichen – bis dahin steht auf der Webseite `
      + (plan ? `die Woche ab ${kurz(plan.montag)}.` : 'noch nichts.');
    zeile.dataset.art = 'entwurf';
    return;
  }
  if (!plan) {
    zeile.textContent = 'Noch nicht veröffentlicht – auf der Webseite steht die vorige Karte.';
    zeile.dataset.art = 'offen';
    return;
  }
  const tage = plan.tage.flatMap(tag => tag.gerichte);
  const alle = [...tage, ...plan.vital, ...plan.alacarte];
  const mit = alle.filter(gericht => gericht.takeaway !== false).length;
  // Die Preisspanne der Menues auf einen Blick: "alle 15,90" beruhigt,
  // "14,90 bis 17,90" sagt, dass es sich zu pruefen lohnt.
  const menuePreise = [...tage, ...plan.vital].map(g => g.preis).filter(p => typeof p === 'number');
  const euro = p => p.toFixed(2).replace('.', ',');
  const spanne = menuePreise.length
    ? (Math.min(...menuePreise) === Math.max(...menuePreise)
      ? ` · Menüs alle € ${euro(menuePreise[0])}`
      : ` · Menüs € ${euro(Math.min(...menuePreise))} bis ${euro(Math.max(...menuePreise))}`)
    : '';
  const bis = new Date(`${plan.montag}T12:00:00`);
  bis.setDate(bis.getDate() + 4);
  zeile.textContent = `Veröffentlicht für ${kurz(plan.montag)} – `
    + `${bis.toLocaleDateString('de-AT', { day: 'numeric', month: 'long' })} · `
    + `${alle.length} Gerichte, davon ${mit} zum Mitnehmen${spanne}.`;
  zeile.dataset.art = 'gut';
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
  byId('karteAnsehen').href = await karteAdresse(info);
  const von = new Date(info.stand);
  byId('karteStand').textContent = Number.isNaN(von.getTime())
    ? 'Eine Karte ist hinterlegt.'
    : `Aktuelle Karte vom ${von.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long' })}.`;
}


// ---- Eigene Termine --------------------------------------------------------
//
// Der Wirt setzt an, die Startseite zeigt. Die Liste hier ist dieselbe, die
// der Gast sieht - nach Datum sortiert, Vergangenes weg. Loeschen ist ein
// Klick, denn ein falscher Termin auf der Gaesteseite ist schlimmer als ein
// fehlender.

async function maleEigeneEvents() {
  const liste = byId('eventListe');
  if (!liste) return;
  const antwort = await holeEigeneEvents();
  liste.textContent = '';
  const events = antwort?.events || [];
  if (!events.length) {
    const leer = document.createElement('li');
    leer.className = 'leer';
    leer.textContent = 'Noch nichts angesetzt.';
    liste.append(leer);
    return;
  }
  for (const event of events) {
    const li = document.createElement('li');
    const wann = document.createElement('span');
    wann.className = 'event-wann';
    const datum = new Date(`${event.date}T12:00:00`);
    wann.textContent = datum.toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: 'short' })
      + (event.beginn ? ` · ${event.beginn}` : '');
    const was = document.createElement('span');
    was.className = 'event-was';
    was.textContent = event.title + (event.type && event.type !== 'Termin im Haus' ? ` – ${event.type}` : '');
    const weg = document.createElement('button');
    weg.type = 'button';
    weg.className = 'knopf leise';
    weg.textContent = 'Entfernen';
    weg.addEventListener('click', async () => {
      weg.disabled = true;
      const geloescht = await loescheEigenesEvent(hausToken(), event.id);
      if (!geloescht?.ok) { weg.disabled = false; return sag('eventInfo', 'Löschen hat nicht geklappt.', 'fehler'); }
      sag('eventInfo', `„${event.title}“ ist entfernt.`);
      maleEigeneEvents();
    });
    li.append(wann, was, weg);
    liste.append(li);
  }
}

function verdrahteEigeneEvents() {
  const form = byId('eventForm');
  if (!form) return;
  maleEigeneEvents();
  form.addEventListener('submit', async ereignis => {
    ereignis.preventDefault();
    const event = {
      titel: byId('eventTitel').value.trim(),
      datum: byId('eventDatum').value,
      zeit: byId('eventZeit').value,
      untertitel: byId('eventUntertitel').value.trim(),
      link: byId('eventLink').value.trim()
    };
    sag('eventInfo', 'Einen Moment …');
    const antwort = await legeEigenesEvent(hausToken(), event);
    if (!antwort?.ok) {
      const gruende = {
        titel: 'Der Titel braucht mindestens drei Zeichen.',
        datum: 'Bitte ein Datum wählen.',
        vergangen: 'Das Datum liegt in der Vergangenheit.',
        zeit: 'Die Uhrzeit sieht nicht richtig aus.',
        link: 'Der Link muss mit https:// beginnen.',
        token: 'Kein Zugang - bitte den Einrichtungslink neu öffnen.'
      };
      return sag('eventInfo', gruende[antwort?.grund] || 'Das hat nicht geklappt.', 'fehler');
    }
    sag('eventInfo', `„${antwort.event.titel}“ steht ab sofort auf der Startseite.`, 'gut');
    form.reset();
    maleEigeneEvents();
  });
}


// ---- Tische sperren --------------------------------------------------------
//
// Der eine Handgriff des Alltags: Tisch 4 ist kaputt, Tisch 4 ist wieder da.
// Die Liste malt sich aus dem Stand - dieselbe Quelle wie ueberall, also
// stimmt sie auch, wenn ein zweites Geraet sperrt.

function maleSperren() {
  const kasten = byId('sperreListe');
  if (!kasten || !stand?.floorplan) return;
  const plan = buildFloorplan(stand.floorplan);
  const zu = new Set(stand.blockedTables || []);
  kasten.textContent = '';
  for (const table of plan.tables) {
    const knopf = document.createElement('button');
    knopf.type = 'button';
    knopf.className = zu.has(table.id) ? 'sperre zu' : 'sperre';
    knopf.dataset.tisch = table.id;
    knopf.setAttribute('aria-pressed', String(zu.has(table.id)));
    const nummer = document.createElement('b');
    nummer.textContent = String(table.number ?? table.id);
    const meta = document.createElement('span');
    meta.textContent = `${table.seats}P · ${table.levelName || ''}`;
    knopf.append(nummer, meta);
    kasten.append(knopf);
  }
}

function verdrahteSperren() {
  const kasten = byId('sperreListe');
  if (!kasten) return;
  kasten.addEventListener('click', async ereignis => {
    const knopf = ereignis.target.closest('[data-tisch]');
    if (!knopf) return;
    knopf.disabled = true;
    const sperren = knopf.getAttribute('aria-pressed') !== 'true';
    const antwort = await sendeTischsperre(hausToken(), knopf.dataset.tisch, sperren);
    knopf.disabled = false;
    if (!antwort?.ok) return sag('sperreInfo', 'Das hat nicht geklappt - bitte noch einmal.', 'fehler');
    // Wer umgesetzt wurde, steht hier - und wer keinen Platz fand, erst recht.
    const bewegt = antwort.umgesetzt || [];
    const ohne = bewegt.filter(eintrag => !eintrag.tische);
    if (ohne.length) {
      sag('sperreInfo', `Gesperrt. ${ohne.map(e => `${e.name} (${e.time})`).join(', ')} `
        + 'hat keinen freien Tisch mehr - bitte von Hand einteilen.', 'fehler');
    } else if (bewegt.length) {
      sag('sperreInfo', `Gesperrt. Umgesetzt: ${bewegt.map(e => `${e.name} (${e.time})`).join(', ')}.`);
    } else {
      sag('sperreInfo', sperren ? 'Tisch ist gesperrt.' : 'Tisch ist wieder frei.');
    }
    // Der neue Stand kommt ueber den Draht; die Liste malt dann von selbst.
  });
}


// ---- Tische & Stuehle ueber Anzahlen ---------------------------------------
//
// "Fuenf Zweiertische, acht Vierertische" - die Sicht, in der ein Wirt seinen
// Raum beschreibt. Jeder Klick veroeffentlicht sofort einen neuen Plan; die
// Umsetzung entwurzelter Reservierungen macht der Dienst und meldet sie.

/** Waehrend ein Klick unterwegs ist, nimmt der Kasten keinen zweiten an. */
let bestandLaeuft = false;

function aktiveOrdnung() {
  const config = stand?.floorplan;
  const layouts = config?.layouts || [];
  return layouts.find(layout => layout.id === config?.activeLayout) || layouts[0] || null;
}

function maleBestand() {
  const kasten = byId('bestandListe');
  if (!kasten) return;
  const layout = aktiveOrdnung();
  if (!layout) return;
  kasten.textContent = '';
  for (const level of [...layout.levels].sort((a, b) => (a.order || 0) - (b.order || 0))) {
    const block = document.createElement('div');
    block.className = 'bestand-etage';
    const titel = document.createElement('h4');
    titel.textContent = level.name;
    block.append(titel);
    const groessen = zaehleGroessen(level);
    if (!groessen.length) {
      const leer = document.createElement('p');
      leer.className = 'bestand-leer';
      leer.textContent = 'Noch keine Tische – unten eine Größe ergänzen.';
      block.append(leer);
    }
    for (const { seats, anzahl } of groessen) {
      const zeile = document.createElement('div');
      zeile.className = 'bestand-zeile';
      const name = document.createElement('span');
      name.textContent = `${seats}er-Tische`;
      const weniger = document.createElement('button');
      weniger.type = 'button';
      weniger.textContent = '−';
      weniger.setAttribute('aria-label', `Einen ${seats}er-Tisch in ${level.name} weniger`);
      weniger.dataset.level = level.id;
      weniger.dataset.seats = String(seats);
      weniger.dataset.soll = String(anzahl - 1);
      const zahl = document.createElement('b');
      zahl.textContent = String(anzahl);
      const mehr = document.createElement('button');
      mehr.type = 'button';
      mehr.textContent = '+';
      mehr.setAttribute('aria-label', `Ein ${seats}er-Tisch in ${level.name} mehr`);
      mehr.dataset.level = level.id;
      mehr.dataset.seats = String(seats);
      mehr.dataset.soll = String(anzahl + 1);
      zeile.append(name, weniger, zahl, mehr);
      block.append(zeile);
    }
    kasten.append(block);
  }
}

async function stelleBestand(levelId, seats, soll) {
  if (bestandLaeuft) return;
  const layout = aktiveOrdnung();
  const level = layout?.levels.find(eintrag => eintrag.id === levelId);
  if (!level) return;
  const tables = setzeAnzahl(level, seats, soll);
  if (!tables) return;
  const neu = planMitTischen(stand.floorplan, layout.id, levelId, tables);
  if (!neu) return;
  bestandLaeuft = true;
  sag('bestandInfo', 'Einen Moment …');
  const antwort = await sendePlan(hausToken(), { floorplan: neu });
  bestandLaeuft = false;
  if (!antwort?.ok) return sag('bestandInfo', 'Das hat nicht geklappt - bitte noch einmal.', 'fehler');
  if (antwort.stand) { stand = antwort.stand; male(); }
  const bewegt = antwort.umgesetzt || [];
  const ohne = bewegt.filter(eintrag => !eintrag.tische);
  if (ohne.length) {
    sag('bestandInfo', `Übernommen. ${ohne.map(e => `${e.name} (${e.time})`).join(', ')} `
      + 'hat keinen freien Tisch mehr - bitte von Hand einteilen.', 'fehler');
  } else if (bewegt.length) {
    sag('bestandInfo', `Übernommen. Umgesetzt: ${bewegt.map(e => `${e.name} (${e.time})`).join(', ')}.`);
  } else {
    sag('bestandInfo', 'Übernommen - gilt sofort, auch für die Ampel auf der Gästeseite.');
  }
}

function verdrahteBestand() {
  const kasten = byId('bestandListe');
  if (!kasten) return;
  kasten.addEventListener('click', ereignis => {
    const knopf = ereignis.target.closest('button[data-level]');
    if (!knopf) return;
    stelleBestand(knopf.dataset.level, Number(knopf.dataset.seats), Number(knopf.dataset.soll));
  });

  // Neue Groesse: einmal ergaenzen legt den ersten Tisch an, danach zaehlt
  // man mit plus und minus weiter.
  const auswahl = byId('bestandGroesse');
  for (let seats = 1; seats <= 12; seats += 1) {
    const option = document.createElement('option');
    option.value = String(seats);
    option.textContent = `${seats} Plätze`;
    if (seats === 2) option.selected = true;
    auswahl.append(option);
  }
  byId('bestandNeu').addEventListener('submit', ereignis => {
    ereignis.preventDefault();
    const layout = aktiveOrdnung();
    if (!layout) return;
    // In die erste Etage; verschieben und feiner ordnen geht in der grossen
    // Einteilung. Fuer "wir haben jetzt auch Sechsertische" reicht das.
    const level = [...layout.levels].sort((a, b) => (a.order || 0) - (b.order || 0))[0];
    const seats = Number(auswahl.value);
    const schon = zaehleGroessen(level).find(eintrag => eintrag.seats === seats)?.anzahl || 0;
    stelleBestand(level.id, seats, schon + 1);
  });
}


// ---- Zusperren und Mittag absagen ------------------------------------------
//
// Zwei Entscheidungen, bewusst getrennt: Zusperren stoppt NEUE Buchungen.
// Absagen verstaendigt die BESTEHENDEN Gaeste (und sperrt den Tag mit, das
// macht der Dienst). Wer nur zusperrt, hat noch niemanden abgesagt - das
// steht dann als Hinweis dabei.

async function maleZu() {
  const liste = byId('zuListe');
  if (!liste) return;
  const antwort = await holeGeschlossen();
  liste.textContent = '';
  const tage = antwort?.tage || [];
  if (!tage.length) {
    const leer = document.createElement('li');
    leer.className = 'leer';
    leer.textContent = 'Kein Tag gesperrt.';
    liste.append(leer);
    return;
  }
  for (const tag of tage) {
    const li = document.createElement('li');
    const wann = document.createElement('span');
    wann.textContent = new Date(`${tag}T12:00:00`).toLocaleDateString('de-AT', {
      weekday: 'long', day: '2-digit', month: 'long'
    });
    const auf = document.createElement('button');
    auf.type = 'button';
    auf.className = 'knopf leise';
    auf.textContent = 'Wieder öffnen';
    auf.addEventListener('click', async () => {
      auf.disabled = true;
      const ergebnis = await setzeTagZu(hausToken(), tag, false);
      if (!ergebnis?.ok) { auf.disabled = false; return sag('zuInfo', 'Das hat nicht geklappt.', 'fehler'); }
      sag('zuInfo', 'Der Tag ist wieder offen.', 'gut');
      maleZu();
    });
    li.append(wann, auf);
    liste.append(li);
  }
}

// Die Oeffnungszeiten-Karte: zwei Zeiten, ein Speichern. Der Dienst haelt
// die Leitplanken (Raster, Rahmen, Mindestdauer) - hier wird nur gemeldet,
// was er dazu sagt.
async function verdrahteOeffnung() {
  const form = byId('oeffnungForm');
  if (!form) return;
  const stand = await holeOeffnung();
  if (stand?.ok) {
    byId('oeffnungVon').value = stand.von;
    byId('oeffnungBis').value = stand.bis;
  }
  form.addEventListener('submit', async ereignis => {
    ereignis.preventDefault();
    const antwort = await setzeOeffnung(hausToken(), byId('oeffnungVon').value, byId('oeffnungBis').value);
    if (!antwort?.ok) {
      const gruende = {
        raster: 'Bitte volle Viertelstunden wählen (z. B. 11:15).',
        rahmen: 'Das Fenster muss zwischen 10:00 und 16:00 liegen.',
        'zu-kurz': 'Mindestens eine Stunde – sonst wäre der Mittag keiner.',
        format: 'Bitte beide Zeiten angeben.'
      };
      return sag('oeffnungInfo', gruende[antwort?.grund] || 'Das hat nicht geklappt.', 'fehler');
    }
    sag('oeffnungInfo', `Gespeichert: Mo–Fr ${antwort.von}–${antwort.bis}. Steht ab sofort so auf der Webseite.`, 'gut');
  });
}

function verdrahteZu() {
  const form = byId('zuForm');
  if (!form) return;
  maleZu();
  const nu = new Date();
  const zweistellig = zahl => String(zahl).padStart(2, '0');
  const heute = `${nu.getFullYear()}-${zweistellig(nu.getMonth() + 1)}-${zweistellig(nu.getDate())}`;
  byId('zuDatum').value = heute;
  byId('zuDatum').min = heute;

  form.addEventListener('submit', async ereignis => {
    ereignis.preventDefault();
    const datum = byId('zuDatum').value;
    if (!datum) return sag('zuInfo', 'Bitte einen Tag wählen.', 'fehler');
    const antwort = await setzeTagZu(hausToken(), datum, true);
    if (!antwort?.ok) return sag('zuInfo', 'Das hat nicht geklappt.', 'fehler');
    sag('zuInfo', antwort.reservierungen
      ? `Zugesperrt. Achtung: ${antwort.reservierungen} Reservierung(en) bestehen noch – mit dem roten Knopf absagen.`
      : 'Zugesperrt. Es lagen keine Reservierungen auf dem Tag.',
    antwort.reservierungen ? 'fehler' : 'gut');
    maleZu();
  });

  byId('zuAbsagen').addEventListener('click', async () => {
    const datum = byId('zuDatum').value;
    if (!datum) return sag('zuInfo', 'Bitte oben den Tag wählen.', 'fehler');
    const knopf = byId('zuAbsagen');
    knopf.disabled = true;
    const antwort = await sageTagAb(hausToken(), datum, 'Heute bleibt unser Mittag ausnahmsweise geschlossen.');
    knopf.disabled = false;
    if (!antwort?.ok) return sag('zuInfo', 'Das hat nicht geklappt.', 'fehler');
    const anrufen = antwort.anrufen || [];
    sag('zuInfo', `Abgesagt und zugesperrt – ${antwort.abgesagt || 0} Reservierung(en). `
      + (anrufen.length
        ? `Bitte anrufen: ${anrufen.map(eintrag => `${eintrag.name} (${eintrag.telefon || 'ohne Nummer'}, ${eintrag.zeit})`).join(', ')}.`
        : 'Alle Gäste mit Mailadresse sind verständigt.'), anrufen.length ? 'fehler' : 'gut');
    maleZu();
  });
}
