// Reservierungsdienst der Wirtschaft Dornbirn.
//
// Ein Durable Object haelt den Zustand des Hauses: Tischplan, Reservierungen,
// gesperrte Tische. Das ist genau die eine Stelle, die eine statische Seite
// nicht haben kann - ohne sie hat jeder Browser seinen eigenen Zaehler und zwei
// Gaeste bekommen denselben letzten Tisch.
//
// Warum ein einzelnes Objekt und nicht viele: das Haus ist die
// Koordinationseinheit. Zwei Buchungen fuer denselben Abend muessen sich
// gegenseitig sehen, sonst ist die Zuweisung wertlos. Ein Objekt pro Haus ist
// hier kein Engpass - es geht um wenige Anfragen je Minute, nicht um Millionen.

import { DurableObject } from 'cloudflare:workers';
import { holeAltFrei, bucheAlt, holeAltKarte } from './altsystem.mjs';
import {
  AUFBEWAHRUNG_TAGE, ampelFuer, betroffenePartys, brauchtErinnerung, freieZeiten, machId, planTaugt, pruefeAnfrage, raeumeAuf, tischBekannt, verteile, wendeAktionAn
} from './haus-logik.mjs';
import standardPlan from '../../site/data/floorplan.json';
import eventDaten from '../../site/data/events.json';
import { shift } from '../../site/table-assignment.mjs';
import { pruefeKontakt } from './kontakt.mjs';
import { pruefePushAnmeldung, schickePush } from './push.mjs';
import { fuerDieGaesteseite, ordneEigeneEvents, pruefeEigenesEvent } from './eigene-events.mjs';
import { feiertageImJahr, istFeiertag } from '../../site/feiertage.mjs';
import {
  fuerDenWirt, pruefeWunsch, raeumeAufProfile, schluesselFuer, widerrufe, zaehleBesuch
} from './gast.mjs';
import {
  bestaetige, empfaenger, machEintrag, pruefeAnmeldung, raeumeAufOffene, sperrschluessel
} from './newsletter.mjs';
import {
  absage as absageMail, baueTermin, bestaetigung as bestaetigungsMail, brevoPaket,
  escapeHtml, newsletterFrage, sendeMail, tageszettelMail, termin_uid,
  wartelisteFreiMail, wochenberichtMail, wochenkarte as wochenkarteMail
} from './mail.mjs';
import {
  markiereInformiert, naechsterWartender, nimmAuf, pruefeWartelisteEintrag, raeumeWartelisteAb
} from './warteliste.mjs';
import { inTeile, karteKopf, pruefeKarte, zusammen } from './karte.mjs';
import {
  bestellungText, erinnerungText, fertigText, nummerFuerSms, reservierungText, sendeSms
} from './sms.mjs';
import {
  ALLERGENE, BESTELLSCHLUSS, LETZTE_ABHOLUNG, PORTIONEN_PRO_SLOT, WARTEZEIT_TEXT,
  bestelltag, freieSlots, kuechenzettel, parseKarte, pruefeBestellung, pruefeWunschtag,
  statistik, VORAUS_TAGE
} from './takeaway.mjs';

const HAUS = 'wirtschaft-dornbirn';

/**
 * Die naechsten Abende nach einem Datum - fuer den Hinweis in der
 * Bestaetigung. Abgesagte und pausierte bleiben draussen: ein Termin, den es
 * nicht gibt, ist in einer Mail schlimmer als kein Termin.
 */
function naechsteEvents(abDatum, wieViele = 3) {
  return (eventDaten?.events || [])
    .filter(event => event.date >= abDatum && !['cancelled', 'paused'].includes(event.status))
    .slice(0, wieViele)
    .map(event => ({
      datum: new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit' })
        .format(new Date(`${event.date}T12:00:00Z`)),
      titel: event.title,
      url: event.officialUrl
    }));
}
/**
 * Notbremse gegen Fluten - keine Kapazitaetsgrenze.
 *
 * Sie stand auf 40 je Stunde. Im Lasttest mit hundert Gaesten wurden damit
 * 60 abgewiesen, mit "gerade kommen sehr viele Anfragen" - obwohl das Haus
 * noch halb leer war. Das ist der falsche Ort fuer eine Grenze: was wirklich
 * begrenzt, sind Tische, Kuechenlimit und Sitzplatzdeckel, und die pruefen
 * sich selbst. Hier geht es nur darum, dass niemand den Speicher vollschreibt.
 *
 * Zweihundert je Stunde erreicht kein echter Mittag; ein Skript schon.
 */
const ONLINE_PRO_STUNDE = 200;

/**
 * Was den Dienst verlaesst, enthaelt kein Geheimnis. Der Token ist der
 * Schluessel zur Absage: er steht in genau einer Mail und sonst nirgends.
 */
const ohneGeheimnis = ({ token, ...rest }) => rest;

/** Zeitstempel in der Form, die der Kalender verlangt. */
const jetztFuerKalender = () =>
  new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra }
  });

/**
 * Eine kleine Seite fuer die Links aus den Mails. Bewusst ohne Skript und
 * ohne fremde Schrift - sie muss in jedem Mailbrowser aufgehen.
 *
 * Und bewusst mit Knopf: Mailprogramme und Virenscanner rufen Links im
 * Hintergrund auf. Wuerde der Aufruf allein schon absagen oder eine
 * Einwilligung setzen, waeren beides Zufallsergebnisse - eine stornierte
 * Reservierung, die niemand storniert hat, und eine Einwilligung, die niemand
 * gegeben hat. Erst der abgeschickte Knopf zaehlt.
 */
function seite(titel, text, knopf = null, status = 200) {
  const inhalt = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(titel)} · Wirtschaft Dornbirn</title>
<style>
  body{margin:0;padding:48px 20px;background:#f3efe6;color:#11110f;font:400 17px/1.6 Helvetica,Arial,sans-serif;}
  main{max-width:34rem;margin:0 auto;background:#faf7f0;border:1px solid #e0d8c8;padding:32px 28px;}
  p.kicker{margin:0;font:800 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8c292b;}
  h1{margin:10px 0 14px;font:400 32px/1.1 Georgia,serif;}
  p{margin:0 0 14px;}
  button{margin-top:8px;padding:14px 26px;border:0;border-radius:999px;background:#244635;color:#fff;
    font:800 12px/1 Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;}
  small{display:block;margin-top:22px;color:#8f887b;font-size:13px;}
</style></head>
<body><main>
<p class="kicker">Wirtschaft Dornbirn</p>
<h1>${escapeHtml(titel)}</h1>
<p>${escapeHtml(text)}</p>
${knopf ? `<form method="post" action="${escapeHtml(knopf.ziel)}"><input type="hidden" name="t" value="${escapeHtml(knopf.token)}"><button type="submit">${escapeHtml(knopf.text)}</button></form>` : ''}
<small>Bahnhofstraße 24 · 6850 Dornbirn · +43 (0)5572 20 540</small>
</main></body></html>`;
  return new Response(inhalt, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'referrer-policy': 'no-referrer',
      'cache-control': 'no-store',
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'"
    }
  });
}

/** Das Token aus einem abgeschickten Formular. */
async function tokenAusKoerper(request) {
  try {
    const daten = await request.formData();
    return String(daten.get('t') || '');
  } catch {
    return '';
  }
}

/**
 * Nur die eigenen Seiten duerfen den Dienst im Browser ansprechen. ALLOWED_ORIGINS
 * ist eine Kommaliste in der Konfiguration; fehlt sie, bleibt es bei nichts -
 * eine offene Voreinstellung waere die falsche Richtung.
 */
function cors(request, env) {
  const origin = request.headers.get('Origin') || '';
  const erlaubt = String(env.ALLOWED_ORIGINS || '').split(',').map(entry => entry.trim()).filter(Boolean);
  if (!origin || !erlaubt.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers': 'content-type,x-haus-token',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-max-age': '86400',
    vary: 'Origin'
  };
}

/**
 * Vergleich ohne fruehen Ausstieg, damit die Laufzeit nichts verraet.
 *
 * Wichtig: ein leerer erwarteter Wert darf niemals passen. Fehlt das Geheimnis
 * - falsch benannt, nicht gesetzt, bei einer Umbenennung verloren -, waere
 * "leer gegen leer" sonst wahr und der interne Bereich stuende jedem offen.
 * Genau das ist hier live passiert. Im Zweifel zusperren, nicht aufsperren.
 */
function gleich(a, b) {
  const gegeben = String(a ?? '');
  const erwartet = String(b ?? '');
  if (erwartet.length < 8) return false;
  if (gegeben.length !== erwartet.length) return false;
  let diff = 0;
  for (let i = 0; i < gegeben.length; i += 1) diff |= gegeben.charCodeAt(i) ^ erwartet.charCodeAt(i);
  return diff === 0;
}

export class Haus extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    // Nur das Anlegen der Tabellen blockiert - nie eine Anfrage.
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS reservierungen (
          id TEXT PRIMARY KEY,
          tag TEXT NOT NULL,
          daten TEXT NOT NULL
        )
      `);
      this.ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS res_tag ON reservierungen (tag)');
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS einstellungen (
          schluessel TEXT PRIMARY KEY,
          wert TEXT NOT NULL
        )
      `);
      // Der Newsletter steht bewusst in einer eigenen Tabelle. Zwei Zwecke,
      // zwei Rechtsgrundlagen, zwei Loeschwege: wer widerruft, verliert seine
      // Adresse hier - und nichts an seiner Reservierung. Siehe
      // docs/privacy/newsletter-einwilligung.md.
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS newsletter (
          email TEXT PRIMARY KEY,
          token TEXT NOT NULL,
          daten TEXT NOT NULL
        )
      `);
      this.ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS nl_token ON newsletter (token)');
      // Takeaway-Bestellungen: eigener Speicher, gleiche Aufbewahrung wie
      // Reservierungen. Das Protokoll je Gericht rechnet daraus - deshalb
      // bleiben auch abgeholte Bestellungen die 30 Tage liegen.
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS takeaway (
          id TEXT PRIMARY KEY,
          tag TEXT NOT NULL,
          daten TEXT NOT NULL
        )
      `);
      this.ctx.storage.sql.exec('CREATE INDEX IF NOT EXISTS ta_tag ON takeaway (tag)');
      // Fingerabdruecke widerrufener Adressen. Keine Adresse, keine Namen -
      // nur die Sperre, damit ein spaeterer Import niemanden zurueckholt.
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS sperrliste (
          fingerabdruck TEXT PRIMARY KEY,
          seit TEXT NOT NULL
        )
      `);
      // Die Mittagskarte als PDF, in Stuecken - eine Zeile darf hoechstens
      // zwei Megabyte tragen. Reihenfolge ueber nr.
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS mittagskarte (
          nr INTEGER PRIMARY KEY,
          teil BLOB NOT NULL
        )
      `);
      // Wer keine Terminhinweise mehr in der Bestaetigung will. Nur ein
      // Fingerabdruck der Adresse, keine Adresse - die Sperre muss wirken,
      // ohne dass dafuer jemand gespeichert bleibt.
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS terminstopp (
          fingerabdruck TEXT PRIMARY KEY,
          seit TEXT NOT NULL
        )
      `);
      // Gastprofile. Eigene Tabelle, eigener Zweck, eigene Loeschung: sie
      // ueberleben die Reservierung und stehen auf einer Einwilligung, nicht
      // auf dem Vertrag. Der Schluessel ist ein Hash - hier steht keine
      // Adresse und keine Nummer.
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS gastprofile (
          schluessel TEXT PRIMARY KEY,
          daten TEXT NOT NULL
        )
      `);
    });
  }

  /**
   * "Dein Essen ist fertig" an den Gast. Still: schlaegt sie fehl, bleibt die
   * Bestellung trotzdem fertig - der Gast steht dann eben ohne Nachricht da,
   * so wie bisher immer. Eine misslungene SMS darf den Tresen nicht aufhalten.
   */
  async #meldeFertig(bestellung) {
    return this.#schickeSms(bestellung.telefon,
      fertigText({ name: bestellung.name }));
  }

  /**
   * Eine SMS verschicken, wenn der Wirt sie eingeschaltet hat. Ein Ort fuer
   * die Pruefungen: sonst vergisst man sie an der dritten Stelle.
   */
  async #schickeSms(telefon, text) {
    if (this.#lies('smsAn', false) !== true) return { ok: false, grund: 'aus' };
    const an = nummerFuerSms(telefon);
    if (!an) return { ok: false, grund: 'nummer' };
    return sendeSms(this.env, { an, text });
  }

  /**
   * Die Erinnerungen eines Laufs. Rueckgabe ist die Zahl der verschickten
   * Nachrichten - der Zeitplan laeuft alle Viertelstunde, und ohne diese
   * Zahl bliebe im Protokoll offen, ob er etwas getan hat.
   */
  async erinnere(datum, zeit) {
    if (this.#lies('smsAn', false) !== true) return { ok: true, gesendet: 0, grund: 'aus' };
    const faellig = brauchtErinnerung(this.#alle(), { datum, zeit });
    let gesendet = 0;
    for (const party of faellig) {
      const ergebnis = await this.#schickeSms(party.kontakt.telefon,
        erinnerungText({ zeit: party.time, personen: party.guests }));
      // Auch ein Fehlschlag wird vermerkt: sonst versucht es der naechste
      // Lauf wieder, und der uebernaechste, bei einer kaputten Nummer endlos.
      party.erinnertUm = new Date().toISOString();
      this.#sichere(party);
      if (ergebnis.ok) gesendet += 1;
    }
    if (faellig.length) this.#meldeAenderung();
    return { ok: true, gesendet, faellig: faellig.length };
  }

  /**
   * Was der Bildschirm im Eingang von den Abholungen zeigen darf: die
   * fertigen von heute, mit Nummer und Vorname. Mehr braucht niemand, um sich
   * wiederzuerkennen - und mehr hat auf einem Schirm, auf den jeder schaut,
   * nichts verloren.
   */
  #fertigeFuerSchirm() {
    const heute = jetztImHaus().datum;
    return this.#takeawayAlle()
      .filter(bestellung => bestellung.date === heute && bestellung.status === 'fertig')
      .map(bestellung => ({
        id: bestellung.id,
        nummer: bestellung.nummer,
        vorname: String(bestellung.name || '').trim().split(' ')[0].slice(0, 20),
        // Die angezeigte Zeit, nicht der SMS-Merker - siehe takeawayAktion.
        fertigUm: bestellung.fertigSeit || bestellung.fertigUm || null
      }))
      .sort((a, b) => a.nummer - b.nummer);
  }

  /**
   * Der Stand einer einzelnen Bestellung, fuer die Seite des Gastes. Der
   * Schluessel ist der Ausweis: ohne ihn keine Auskunft, und mit ihm nur
   * ueber diese eine Bestellung.
   */
  async takeawayStatus(token) {
    const bestellung = this.#takeawayAlle().find(eintrag => eintrag.token && eintrag.token === token);
    if (!bestellung) return { ok: false, grund: 'unbekannt' };
    return {
      ok: true,
      nummer: bestellung.nummer,
      status: bestellung.status,
      abholzeit: bestellung.abholzeit,
      date: bestellung.date,
      vorbestellung: bestellung.vorbestellung === true,
      // Wurde die Zeit verschoben, steht hier die urspruengliche - sonst
      // wundert sich der Gast, warum die Zeit eine andere ist als vorhin.
      verschobenVon: bestellung.verschobenVon || null,
      posten: (bestellung.posten || []).map(({ name, menge }) => ({ name, menge })),
      summe: bestellung.summe,
      // Damit die Seite den Knopf richtig zeigt, auch wenn der Gast auf einem
      // anderen Geraet zurueckkommt. Der Endpunkt selbst geht nie hinaus.
      pushAn: Boolean(bestellung.push?.endpunkt)
    };
  }

  // ---- Terminhinweise: Widerspruch -----------------------------------------

  async #willKeineTermine(kontakt) {
    const abdruck = await schluesselFuer(kontakt);
    if (!abdruck) return true;
    return this.ctx.storage.sql
      .exec('SELECT 1 FROM terminstopp WHERE fingerabdruck = ?', abdruck).toArray().length > 0;
  }

  /** Der Widerspruch aus der Mail. Der Token identifiziert die Reservierung. */
  async keineTermine(token) {
    const party = this.#alle().find(eintrag => eintrag.token && eintrag.token === token);
    if (!party) return { ok: false };
    const abdruck = await schluesselFuer(party.kontakt);
    if (!abdruck) return { ok: false };
    const schon = await this.#willKeineTermine(party.kontakt);
    this.ctx.storage.sql.exec(
      'INSERT INTO terminstopp (fingerabdruck, seit) VALUES (?, ?) ON CONFLICT(fingerabdruck) DO NOTHING',
      abdruck, new Date().toISOString()
    );
    return { ok: true, schon };
  }

  // ---- Gastprofile ---------------------------------------------------------

  #gastAlle() {
    return this.ctx.storage.sql.exec('SELECT schluessel, daten FROM gastprofile').toArray()
      .map(row => ({ schluessel: row.schluessel, ...JSON.parse(row.daten) }));
  }

  #gastLies(schluessel) {
    const treffer = this.ctx.storage.sql
      .exec('SELECT daten FROM gastprofile WHERE schluessel = ?', schluessel).toArray();
    return treffer.length ? JSON.parse(treffer[0].daten) : null;
  }

  #gastSichere(schluessel, profil) {
    this.ctx.storage.sql.exec(
      'INSERT INTO gastprofile (schluessel, daten) VALUES (?, ?) '
      + 'ON CONFLICT(schluessel) DO UPDATE SET daten = excluded.daten',
      schluessel, JSON.stringify(profil)
    );
  }

  #gastLoesche(schluessel) {
    this.ctx.storage.sql.exec('DELETE FROM gastprofile WHERE schluessel = ?', schluessel);
  }

  // ---- Takeaway-Speicher ---------------------------------------------------

  #takeawayAlle() {
    return this.ctx.storage.sql.exec('SELECT daten FROM takeaway').toArray()
      .map(row => JSON.parse(row.daten));
  }

  #takeawaySichere(bestellung) {
    this.ctx.storage.sql.exec(
      'INSERT INTO takeaway (id, tag, daten) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET tag = excluded.tag, daten = excluded.daten',
      bestellung.id, bestellung.date, JSON.stringify(bestellung)
    );
  }

  // ---- Speicher ------------------------------------------------------------

  #lies(schluessel, vorgabe = null) {
    const row = this.ctx.storage.sql
      .exec('SELECT wert FROM einstellungen WHERE schluessel = ?', schluessel).toArray()[0];
    if (!row) return vorgabe;
    try { return JSON.parse(row.wert); } catch { return vorgabe; }
  }

  #schreib(schluessel, wert) {
    // JSON.stringify(undefined) liefert kein Textstueck, sondern undefined -
    // und die Spalte verbietet Leerwerte. Ein fehlendes Feld haette den ganzen
    // Aufruf mit 500 gesprengt statt sauber abzulehnen. Deshalb wird undefined
    // als null gespeichert.
    const text = JSON.stringify(wert === undefined ? null : wert);
    this.ctx.storage.sql.exec(
      'INSERT INTO einstellungen (schluessel, wert) VALUES (?, ?) ON CONFLICT(schluessel) DO UPDATE SET wert = excluded.wert',
      schluessel, text
    );
  }

  #alle() {
    return this.ctx.storage.sql.exec('SELECT daten FROM reservierungen').toArray()
      .map(row => JSON.parse(row.daten));
  }

  #amTag(tag) {
    return this.ctx.storage.sql.exec('SELECT daten FROM reservierungen WHERE tag = ?', tag).toArray()
      .map(row => JSON.parse(row.daten));
  }

  #sichere(party) {
    this.ctx.storage.sql.exec(
      'INSERT INTO reservierungen (id, tag, daten) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET tag = excluded.tag, daten = excluded.daten',
      party.id, party.date, JSON.stringify(party)
    );
  }

  #ersetzeAlle(liste) {
    this.ctx.storage.sql.exec('DELETE FROM reservierungen');
    for (const party of liste) this.#sichere(party);
  }

  #plan() {
    return this.#lies('floorplan') || standardPlan;
  }

  /** Ein Token fuer genau einen Link. Zufaellig, nicht ableitbar, ohne Inhalt. */
  #token() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  #reservierungMitToken(token) {
    return this.#alle().find(party => party.token && party.token === token) || null;
  }

  // ---- Newsletter: eigener Speicher, eigener Loeschweg ---------------------

  #newsletterAlle() {
    return this.ctx.storage.sql.exec('SELECT daten FROM newsletter').toArray()
      .map(row => JSON.parse(row.daten));
  }

  #newsletterEiner(spalte, wert) {
    const row = this.ctx.storage.sql
      .exec(`SELECT daten FROM newsletter WHERE ${spalte} = ?`, wert).toArray()[0];
    return row ? JSON.parse(row.daten) : null;
  }

  #newsletterSichere(eintrag) {
    this.ctx.storage.sql.exec(
      'INSERT INTO newsletter (email, token, daten) VALUES (?, ?, ?) '
      + 'ON CONFLICT(email) DO UPDATE SET token = excluded.token, daten = excluded.daten',
      eintrag.email, eintrag.token, JSON.stringify(eintrag)
    );
  }

  #newsletterLoesche(email) {
    this.ctx.storage.sql.exec('DELETE FROM newsletter WHERE email = ?', email);
  }

  async #gesperrt(email) {
    const abdruck = await sperrschluessel(email);
    return this.ctx.storage.sql
      .exec('SELECT fingerabdruck FROM sperrliste WHERE fingerabdruck = ?', abdruck).toArray().length > 0;
  }

  // ---- Live: der Bildschirm haengt am Draht --------------------------------

  /**
   * Hibernation statt offener Verbindung im Speicher: der Bildschirm bleibt
   * angeschlossen, auch wenn das Objekt schlaeft. Sonst zahlt man den ganzen
   * Mittag fuer eine Verbindung, ueber die alle zehn Minuten etwas geht.
   */
  // Sonst wird hier alles ueber RPC bedient. Ein WebSocket ueberlebt den
  // RPC-Weg aber nicht - die Antwort kommt ohne Status 101 an. Deshalb genau
  // fuer den Draht ein fetch-Handler, so wie es die Cloudflare-Beispiele tun.
  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('nur fuer den Live-Draht', { status: 400 });
    }
    const paar = new WebSocketPair();
    const [client, server] = Object.values(paar);
    // Der Bildschirm im Eingang bekommt weniger zu sehen als das Cockpit. Das
    // Etikett bleibt am Draht haengen, auch wenn das Objekt zwischendurch
    // schlaeft - sonst waere die Rolle nach dem ersten Schlaf vergessen.
    const gewuenscht = new URL(request.url).searchParams.get('rolle');
    const rolle = ['schirm', 'kueche'].includes(gewuenscht) ? gewuenscht : 'haus';
    this.ctx.acceptWebSocket(server, [rolle]);
    server.send(JSON.stringify({ art: 'start', stand: this.#stand(rolle) }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws) {
    // Der Bildschirm fragt nur nach dem aktuellen Stand; er schickt nie Daten.
    ws.send(JSON.stringify({ art: 'stand', stand: this.#stand(this.#rolleVon(ws)) }));
  }

  #rolleVon(ws) {
    return this.ctx.getTags(ws).includes('schirm') ? 'schirm' : 'haus';
  }

  webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch { /* schon zu */ }
  }

  /**
   * Der Stand des Hauses. `rolle` entscheidet, wie viel davon hinausgeht: der
   * Bildschirm im Eingang zeigt Namen und Tische und braucht keine
   * Kontaktdaten - also bekommt er sie auch nicht. Datensparsamkeit ist an
   * einem Geraet, auf das jeder Gast schaut, keine Formalie.
   */
  #stand(rolle = 'haus') {
    // Die Kueche braucht die Bestellungen und sonst nichts. Keine
    // Reservierungen, keine Gaestekontakte, kein Tischplan - wer am Herd
    // steht, hat mit den Telefonnummern der Mittagsgaeste nichts zu tun.
    // Die Telefonnummer der Bestellung bleibt draussen: die SMS verschickt
    // der Dienst, dafuer muss sie niemand sehen.
    if (rolle === 'kueche') {
      return {
        rolle: 'kueche',
        takeaway: this.#takeawayAlle().map(({ telefon, push, ...rest }) => rest),
        takeawayKarte: this.#lies('takeawayKarte', []),
        smsAn: this.#lies('smsAn', false) === true,
        // Wer fertigmeldet, muss auf beiden Bildschirmen dasselbe sein - sonst
        // steht der Knopf zweimal da oder gar nicht. Die Kueche bekommt die
        // Einstellung deshalb mit, auch wenn sie sie nicht aendern darf.
        fertigWer: this.#fertigWer(),
        stand: this.#lies('version', 0)
      };
    }
    // Der Bildschirm am Eingang bekommt weder Kontaktdaten noch das Profil:
    // dort schaut jeder Gast hin, und "4. Besuch, glutenfrei" neben einem
    // Namen waere genau die Art Aushang, die niemand ueber sich will.
    const fuerRolle = party => {
      if (rolle === 'schirm') {
        const { kontakt, gastSchluessel, ...rest } = party;
        return rest;
      }
      const { gastSchluessel, ...rest } = party;
      const profil = gastSchluessel ? fuerDenWirt(this.#gastLies(gastSchluessel)) : null;
      return profil ? { ...rest, gast: profil } : rest;
    };
    return {
      floorplan: this.#plan(),
      // Ohne Token: er ist der Schluessel zur Absage und geht nur an den Gast
      // in seiner eigenen Mail. Im Haus wird er nie gebraucht.
      parties: this.#alle().map(({ token, ...party }) => fuerRolle(party)),
      // Takeaway nur fuer die Wirt-Ansichten. Der Bildschirm am Eingang zeigt
      // Tische - wer sein Essen abholt, steht am Tresen, nicht auf dem Schirm.
      // Der Wirt sieht alle Bestellungen. Der Bildschirm im Eingang zeigt nur
      // die fertigen, und von denen nur Nummer und Vorname - kein Nachname,
      // keine Gerichte, keine Nummer, kein Schluessel. Wer dort abholt, soll
      // sich wiedererkennen, ohne dass der ganze Raum seine Bestellung liest.
      // Die Push-Anmeldung ist eine Geraetekennung des Gastes und hat auf
      // keinem Bildschirm im Haus etwas verloren - auch nicht beim Wirt. Der
      // Dienst braucht sie, niemand sonst.
      takeaway: rolle === 'haus'
        ? this.#takeawayAlle().map(({ push, ...rest }) => rest)
        : (rolle === 'schirm' ? this.#fertigeFuerSchirm() : []),
      takeawayKarte: this.#lies('takeawayKarte', []),
      takeawayKarteText: rolle === 'haus' ? this.#lies('takeawayKarteText', '') : '',
      blockedTables: this.#lies('blocked', []),
      standardEtage: this.#lies('standardEtage', null),
      // Automatik aus heisst: Anfragen kommen an, aber das Haus teilt ein.
      automatik: this.#lies('automatik', true) !== false,
      // Ob der Gast seine Tischnummer erfaehrt. Standard: nein - sie ist intern.
      tischAnzeigen: this.#lies('tischAnzeigen', false) === true,
      // Schickt der Dienst eine SMS, wenn das Essen fertig ist? Standard:
      // nein - sie kostet Geld, das schaltet der Wirt selbst ein.
      smsAn: this.#lies('smsAn', false) === true,
      // Wer meldet "Essen fertig": die Kueche, der Wirt oder beide. Standard
      // ist die Kueche, weil dort jemand am Bildschirm steht. Der Stand selbst
      // ist immer auf beiden Seiten sichtbar - die Einstellung entscheidet nur,
      // wo der Knopf erscheint. Wer nicht zustaendig ist, soll trotzdem sehen,
      // ob das Essen schon fertig ist; im Unklaren zu lassen waere schlimmer
      // als ein Knopf zu viel.
      fertigWer: this.#fertigWer(),
      // Liegt ein geleerter Tag im Papierkorb, kann die Ansicht Rueckgaengig
      // anbieten - nur die Eckdaten, nie der Inhalt.
      papierkorb: (() => {
        const korb = this.#lies('papierkorb', null);
        if (!korb || Date.now() - Date.parse(korb.zeit) > 15 * 60 * 1000) return null;
        return { tag: korb.tag, zeit: korb.zeit, anzahl: (korb.parties || []).length + (korb.takeawayIds || []).length };
      })(),
      stand: this.#lies('version', 0)
    };
  }

  #meldeAenderung() {
    const version = (Number(this.#lies('version', 0)) || 0) + 1;
    this.#schreib('version', version);
    const pakete = {
      haus: JSON.stringify({ art: 'aenderung', stand: this.#stand('haus') }),
      schirm: JSON.stringify({ art: 'aenderung', stand: this.#stand('schirm') })
    };
    for (const socket of this.ctx.getWebSockets()) {
      try { socket.send(pakete[this.#rolleVon(socket)]); } catch { /* gleich weg, kein Grund zum Abbruch */ }
    }
  }

  // ---- Oeffentlich: eine Onlinebuchung -------------------------------------

  async buche(roh, heute, basis = '') {
    const gecheckt = pruefeAnfrage(roh, { heute });
    if (!gecheckt.ok) return { ok: false, grund: gecheckt.grund };
    // Feiertage und zugesperrte Tage: die Seite zeigt es vorher an, aber die
    // Seite ist nicht die Grenze - der Dienst ist es.
    if (this.#tagIstZu(gecheckt.anfrage?.date || roh?.date)) return { ok: false, grund: 'geschlossen' };

    // Eine Erreichbarkeit ist Pflicht. Nicht fuer Werbung, sondern damit eine
    // Absage ankommt: sagt das Haus den Mittag ab, muss jeder Gast das
    // erfahren - Mail oder Telefon, eines genuegt.
    const kontaktCheck = pruefeKontakt(roh?.kontakt || {});
    if (!kontaktCheck.ok) return { ok: false, grund: kontaktCheck.grund };

    // Notbremse: Zaehler je angefangener Stunde, ohne irgendeine Kennung des
    // Absenders zu speichern. Eine IP zu hinterlegen waere mehr Datenhaltung,
    // als der Zweck rechtfertigt.
    const fenster = heute + String(new Date().getUTCHours());
    const zaehler = this.#lies('fenster', { fenster: '', anzahl: 0 });
    const anzahl = zaehler.fenster === fenster ? zaehler.anzahl : 0;
    if (anzahl >= ONLINE_PRO_STUNDE) return { ok: false, grund: 'zu_viele' };

    const { anfrage } = gecheckt;
    const parties = this.#alle();

    // Dieselbe Person, derselbe Tag, dieselbe Zeit: das ist ein Doppelklick,
    // keine zweite Gruppe.
    const doppelt = parties.find(party => party.date === anfrage.date && party.time === anfrage.time
      && party.name.toLowerCase() === anfrage.name.toLowerCase());
    if (doppelt) return { ok: true, doppelt: true, reservierung: doppelt };

    // Ist die Automatik aus, wird die Anfrage angenommen, aber nicht gesetzt -
    // Wolfgang teilt selbst ein. Der Gast erfaehrt das auch so.
    const automatik = this.#lies('automatik', true) !== false;
    const { result, floorplan } = automatik
      ? verteile(anfrage, {
        config: this.#plan(),
        parties,
        blocked: this.#lies('blocked', []),
        standardEtage: this.#lies('standardEtage', null),
        deckel: this.#lies('deckel', null)
      })
      : { result: { ok: false, reason: 'von_hand' }, floorplan: null };

    // Die Weiche, die vorher fehlte: "kein Ergebnis" hat zwei voellig
    // verschiedene Bedeutungen. Ist die Automatik AUS, ist das gewollt -
    // Wolfgang teilt von Hand ein, die Anfrage wird angenommen. Ist die
    // Automatik AN, heisst kein Ergebnis: es ist wirklich voll (Taktgrenze
    // oder kein Tisch). Dann muss die Antwort NEIN sein - eine gespeicherte
    // Zusage ohne Tisch waere ein Versprechen, das die Kueche nicht halten
    // kann. Genau dieser Fall rutschte bisher als "angenommen" durch; die
    // Gaesteseite verdeckte es, weil sie volle Zeiten ausgraut - aber die
    // Seite ist nicht die Grenze, der Dienst ist es.
    if (automatik && !result.ok) {
      return {
        ok: false,
        grund: 'voll',
        alternativen: (result.alternatives || []).map(entry => entry.startsAt.slice(11))
      };
    }

    const nummer = (Number(this.#lies('zaehler', 0)) || 0) + 1;
    this.#schreib('zaehler', nummer);
    const id = machId(Date.parse(`${anfrage.date}T${anfrage.time}:00Z`), nummer);
    const party = {
      id,
      ...anfrage,
      // Der Wunsch des Gastes - Fensterplatz, Kinderstuhl, glutenfrei. Er
      // steht beim Wirt an der Zeile; die Seite fragt ihn freiwillig ab.
      notiz: String(roh?.wunsch ?? '').replace(/\s+/g, ' ').trim().slice(0, 140) || null,
      kontakt: kontaktCheck.kontakt,
      // Kennung und Zaehler des Kalendereintrags kommen vom Dienst. Nur so
      // laesst sich derselbe Termin spaeter zurueckziehen.
      uid: termin_uid(id),
      sequenz: 0,
      token: this.#token(),
      status: 'offen',
      tableIds: result.ok ? result.tableIds : [],
      dishes: {},
      arrived: null,
      left: null,
      source: 'online',
      quelle: 'online',
      eingegangen: new Date().toISOString()
    };
    // Das Gastprofil - nur wenn der Gast ausdruecklich zugestimmt hat. Es
    // haengt am Kontakt, nicht an der Reservierung: die verfaellt nach
    // dreissig Tagen, das Profil ueberlebt sie.
    const wunsch = pruefeWunsch(roh?.profil);
    if (wunsch.merken) {
      const schluessel = await schluesselFuer(kontaktCheck.kontakt);
      if (schluessel) {
        this.#gastSichere(schluessel, zaehleBesuch(this.#gastLies(schluessel), {
          jetzt: new Date().toISOString(), datum: anfrage.date, wunsch
        }));
        // Der Schluessel kommt an die Reservierung, damit der Wirt das Profil
        // sehen kann, ohne dass der Stand den Hash erst rechnen muss - er
        // wird bei jeder Aenderung neu gebaut, auch mitten im Mittag.
        party.gastSchluessel = schluessel;
      }
    }

    this.#sichere(party);
    this.#schreib('fenster', { fenster, anzahl: anzahl + 1 });
    // Ein Alarm raeumt spaeter auf - Speicherbegrenzung ist kein Nachgedanke.
    await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
    this.#meldeAenderung();

    if (!result.ok) {
      return {
        ok: true, angenommen: true, tisch: null, grund: result.reason, automatik,
        alternativen: (result.alternatives || []).map(entry => entry.startsAt.slice(11)),
        reservierung: ohneGeheimnis(party)
      };
    }
    const tisch = floorplan.tables.find(table => table.id === result.tableIds[0]);

    // Die Tischnummer ist eine interne Groesse: der Gast braucht die Zusage,
    // nicht die Nummer. Nur wenn das Haus sie ausdruecklich zeigt, geht sie
    // in Antwort und Mail - intern ist der Tisch immer zugewiesen.
    const zeigeTisch = this.#lies('tischAnzeigen', false) === true;
    const tischText = zeigeTisch ? result.numbers.join(' + ') : null;
    const etageText = zeigeTisch ? (tisch?.levelName || null) : null;

    // Die Bestaetigung geht raus, nachdem die Antwort beim Gast ist. Ein
    // langsamer oder gestoerter Mailversand darf die Reservierung nicht
    // aufhalten und schon gar nicht scheitern lassen.
    this.ctx.waitUntil(this.#schickeBestaetigung(party, {
      tisch: tischText,
      etage: etageText,
      basis
    }));

    // Eine SMS nur, wenn keine Mailadresse da ist. Sonst traegt die
    // Bestaetigungsmail dieselbe Auskunft, und die SMS waere ein zweites Mal
    // dasselbe - auf Kosten des Hauses. Wer nur eine Nummer hinterlaesst,
    // bekam bisher gar nichts und musste auf einen Anruf warten.
    if (!party.kontakt?.email && party.kontakt?.telefon) {
      this.ctx.waitUntil(this.#schickeSms(party.kontakt.telefon, reservierungText({
        datum: new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit' })
          .format(new Date(`${party.date}T12:00:00Z`)),
        zeit: party.time,
        personen: party.guests
      })));
    }

    return {
      ok: true, angenommen: true, fix: true,
      tisch: tischText,
      etage: etageText,
      reservierung: ohneGeheimnis(zeigeTisch ? party : { ...party, tableIds: [] })
    };
  }

  // ---- Mail: Bestaetigung und Absage --------------------------------------

  async #schickeBestaetigung(party, { tisch, etage, basis }) {
    if (!party.kontakt?.email) return { ok: false, grund: 'keine_mail' };
    const absender = String(this.env?.BREVO_ABSENDER || '');
    if (!absender) return { ok: false, grund: 'nicht_eingerichtet' };

    const termin = baueTermin({
      uid: party.uid,
      sequenz: party.sequenz,
      methode: 'REQUEST',
      jetzt: jetztFuerKalender(),
      name: party.name,
      tag: party.date,
      zeit: party.time,
      gaeste: party.guests,
      tisch,
      etage,
      absender
    });
    // Terminhinweise nur, wenn ihnen nicht widersprochen wurde. Der Block
    // faellt sonst ersatzlos weg - die Bestaetigung selbst bleibt gleich.
    const stumm = await this.#willKeineTermine(party.kontakt);
    const inhalt = bestaetigungsMail({
      name: party.name,
      tag: party.date,
      zeit: party.time,
      gaeste: party.guests,
      tisch,
      etage,
      absageLink: `${basis}/absage?t=${party.token}`,
      events: stumm ? [] : naechsteEvents(party.date),
      widerspruchLink: stumm ? '' : `${basis}/termine/aus?t=${party.token}`
    });
    return sendeMail(this.env, brevoPaket({
      absender,
      an: party.kontakt.email,
      anName: party.name,
      betreff: inhalt.betreff,
      html: inhalt.html,
      text: inhalt.text,
      anhang: { name: `wirtschaft-dornbirn-${party.date}.ics`, inhalt: termin }
    }));
  }

  /**
   * Die Absage. Sie zieht denselben Termin zurueck, den die Bestaetigung
   * gelegt hat: gleiche Kennung, hoehere Nummer, METHOD:CANCEL. Damit
   * verschwindet der Eintrag im Kalender des Gastes von selbst.
   */
  async #schickeAbsage(party, { grund, vomHaus }) {
    if (!party.kontakt?.email) return { ok: false, grund: 'keine_mail' };
    const absender = String(this.env?.BREVO_ABSENDER || '');
    if (!absender) return { ok: false, grund: 'nicht_eingerichtet' };

    const termin = baueTermin({
      uid: party.uid,
      sequenz: party.sequenz,
      methode: 'CANCEL',
      jetzt: jetztFuerKalender(),
      name: party.name,
      tag: party.date,
      zeit: party.time,
      gaeste: party.guests,
      grund,
      absender
    });
    const inhalt = absageMail({
      name: party.name, tag: party.date, zeit: party.time, gaeste: party.guests, grund, vomHaus
    });
    return sendeMail(this.env, brevoPaket({
      absender,
      an: party.kontakt.email,
      anName: party.name,
      betreff: inhalt.betreff,
      html: inhalt.html,
      text: inhalt.text,
      anhang: { name: `wirtschaft-dornbirn-${party.date}-absage.ics`, inhalt: termin }
    }));
  }

  #storniere(party, grund) {
    return {
      ...party,
      status: 'storniert',
      storniertAm: new Date().toISOString(),
      stornoGrund: grund || null,
      // Der Tisch ist ab sofort wieder frei - das ist der eigentliche Zweck.
      tableIds: [],
      sequenz: (Number(party.sequenz) || 0) + 1
    };
  }

  /** Der Gast sagt selbst ab, ueber den Link in seiner Bestaetigung. */
  async gastAbsage(token) {
    const party = this.#reservierungMitToken(String(token || ''));
    if (!party) return { ok: false, grund: 'unbekannt' };
    if (party.status === 'storniert') return { ok: true, schon: true, reservierung: ohneGeheimnis(party) };

    const storniert = this.#storniere(party, null);
    this.#sichere(storniert);
    this.#meldeAenderung();
    this.ctx.waitUntil(this.#schickeAbsage(storniert, { grund: null, vomHaus: false }));
    // Der freigewordene Platz gehoert als Erstes der Warteliste.
    this.ctx.waitUntil(this.#wartelisteAnstossen(storniert.date, storniert.guests));
    return { ok: true, reservierung: ohneGeheimnis(storniert) };
  }

  // ---- Warteliste ----------------------------------------------------------

  /** Der Gast traegt sich ein, wenn der Mittag voll ist. */
  async wartelisteEintragen(roh) {
    const geprueft = pruefeWartelisteEintrag(roh);
    if (!geprueft.ok) return geprueft;
    const heute = jetztImHaus().datum;
    if (geprueft.eintrag.datum < heute) return { ok: false, grund: 'datum' };
    if (this.#tagIstZu(geprueft.eintrag.datum)) return { ok: false, grund: 'geschlossen' };
    const liste = raeumeWartelisteAb(this.#lies('warteliste', []), heute);
    const ergebnis = nimmAuf(liste, geprueft.eintrag, new Date().toISOString());
    if (!ergebnis.ok) return ergebnis;
    this.#schreib('warteliste', ergebnis.liste);
    return { ok: true, schon: ergebnis.schon === true };
  }

  /**
   * Es ist etwas frei geworden: den Ersten verstaendigen, der passt.
   * Die Mail reserviert nichts - sie oeffnet die Tuer zum normalen Weg mit
   * denselben Grenzen. Fehlt die Basisadresse oder der Absender, passiert
   * still nichts; die Liste bleibt und der naechste Storno stoesst neu an.
   */
  async #wartelisteAnstossen(datum, freiePersonen) {
    const heute = jetztImHaus().datum;
    const liste = raeumeWartelisteAb(this.#lies('warteliste', []), heute);
    const dran = naechsterWartender(liste, datum, freiePersonen);
    if (!dran) { this.#schreib('warteliste', liste); return; }
    const absender = String(this.env?.BREVO_ABSENDER || '');
    const seite = String(this.env?.GAESTE_SEITE || '');
    if (!absender || !seite) return;
    this.#schreib('warteliste', markiereInformiert(liste, dran, new Date().toISOString()));
    const inhalt = wartelisteFreiMail({
      name: dran.name, tag: datum, personen: dran.personen,
      buchungsLink: `${seite}/tischreservierung.html?tag=${datum}`
    });
    this.ctx.waitUntil(sendeMail(this.env, brevoPaket({
      absender, an: dran.email, betreff: inhalt.betreff, html: inhalt.html, text: inhalt.text
    })));
  }

  /** Nur fuers Haus: wie viele heute und kommend warten. Ohne Adressen. */
  wartelisteZahl(datum) {
    return this.#lies('warteliste', []).filter(eintrag =>
      eintrag.datum === datum && eintrag.status === 'wartet').length;
  }

  // ---- Geschlossene Tage ---------------------------------------------------

  /**
   * Welche Tage der Wirt zugesperrt hat - nur Zukunft (heute einschliesslich),
   * sortiert. Vergangenes faellt beim Lesen weg; eine Liste alter Sperren
   * schaut niemand mehr an.
   */
  /**
   * Alles, was fuer die Kueche "zu" heisst: vom Wirt gesperrte Tage plus die
   * Feiertage des laufenden und des naechsten Jahres - Ende Dezember zeigt
   * die Vorbestellung sonst auf den Neujahrstag.
   */
  #zuMenge() {
    const jahr = Number(jetztImHaus().datum.slice(0, 4));
    const zu = new Set(this.#geschlossen());
    for (const tag of feiertageImJahr(jahr)) zu.add(tag);
    for (const tag of feiertageImJahr(jahr + 1)) zu.add(tag);
    return zu;
  }

  #geschlossen() {
    const heute = jetztImHaus().datum;
    return [...new Set(this.#lies('geschlosseneTage', []))]
      .filter(tag => tag >= heute)
      .sort();
  }

  /** Ist an diesem Tag zu - vom Wirt gesperrt oder gesetzlicher Feiertag? */
  #tagIstZu(datum) {
    return istFeiertag(datum) || this.#geschlossen().includes(String(datum));
  }

  async geschlosseneTage() {
    return { ok: true, tage: this.#geschlossen() };
  }

  /** Einen Tag zusperren oder wieder oeffnen. Sperren stoppt NEUE Buchungen -
   *  bestehende sagt erst die Tagesabsage ab; das sind zwei Entscheidungen. */
  async setzeTagZu(datum, zu) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum || ''))) return { ok: false, grund: 'datum' };
    const liste = new Set(this.#geschlossen());
    if (zu) liste.add(String(datum)); else liste.delete(String(datum));
    this.#schreib('geschlosseneTage', [...liste].sort());
    this.#meldeAenderung();
    const betroffen = zu
      ? this.#amTag(String(datum)).filter(party => party.status !== 'storniert').length
      : 0;
    return { ok: true, tage: [...liste].sort(), reservierungen: betroffen };
  }

  /**
   * Das Mittagsfenster, wie es auf der Gaesteseite steht. Leitplanken statt
   * Freitext: Viertelstunden-Raster, zwischen 10:00 und 16:00, mindestens
   * eine Stunde - ein Vertipper wie 01:30 soll nie den Mittag "sperren".
   */
  async oeffnung() {
    const roh = this.#lies('oeffnungszeiten', null);
    return { ok: true, von: roh?.von || '11:30', bis: roh?.bis || '13:30' };
  }

  async setzeOeffnung(von, bis) {
    const zuMinuten = wert => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(wert || ''))
      ? Number(String(wert).slice(0, 2)) * 60 + Number(String(wert).slice(3, 5))
      : null;
    const start = zuMinuten(von);
    const ende = zuMinuten(bis);
    if (start === null || ende === null) return { ok: false, grund: 'format' };
    if (start % 15 || ende % 15) return { ok: false, grund: 'raster' };
    if (start < 600 || ende > 960) return { ok: false, grund: 'rahmen' };
    if (ende - start < 60) return { ok: false, grund: 'zu-kurz' };
    this.#schreib('oeffnungszeiten', { von: String(von), bis: String(bis) });
    this.#meldeAenderung();
    return { ok: true, von: String(von), bis: String(bis) };
  }

  /**
   * Wolfgang sagt einen ganzen Mittag ab. Jeder Gast mit Mailadresse bekommt
   * die Absage samt zurueckgezogenem Termin; wer nur eine Nummer hinterlassen
   * hat, steht in der Anrufliste. Diese Liste ist der ehrliche Teil: sie
   * verschwindet nicht, nur weil der Rest automatisch ging.
   */
  async tagAbsage(tag, grund) {
    // Absagen und offen lassen widerspricht sich: wer den Mittag absagt,
    // sperrt ihn. Sonst bucht die naechste Person eine Minute spaeter neu.
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(tag || ''))) {
      const liste = new Set(this.#geschlossen());
      liste.add(String(tag));
      this.#schreib('geschlosseneTage', [...liste].sort());
    }
    const betroffen = this.#amTag(String(tag || '')).filter(party => party.status !== 'storniert');
    const anrufen = [];
    for (const party of betroffen) {
      const storniert = this.#storniere(party, grund);
      this.#sichere(storniert);
      if (storniert.kontakt?.email) {
        this.ctx.waitUntil(this.#schickeAbsage(storniert, { grund, vomHaus: true }));
      } else {
        anrufen.push({
          name: storniert.name, zeit: storniert.time, telefon: storniert.kontakt?.telefon || null
        });
      }
    }
    if (betroffen.length) this.#meldeAenderung();
    return { ok: true, abgesagt: betroffen.length, anrufen, stand: this.#stand() };
  }

  // ---- Newsletter ----------------------------------------------------------

  async newsletterAnmeldung(roh, basis) {
    const gecheckt = pruefeAnmeldung(roh);
    if (!gecheckt.ok) return { ok: false, grund: gecheckt.grund };
    const { email, quelle, liste } = gecheckt.anmeldung;

    // Wer widerrufen hat, wird nicht wieder angeschrieben - auch nicht, wenn
    // jemand anderes die Adresse eintraegt.
    if (await this.#gesperrt(email)) return { ok: true, gesperrt: true };

    // Pro Liste nachsehen, nicht pro Adresse: wer die Mittagskarte hat, darf
    // sich trotzdem fuer die Termine eintragen - das sind zwei Einwilligungen.
    const vorhanden = this.#newsletterAlle().find(eintrag =>
      eintrag.email === email && (eintrag.liste || 'mittagskarte') === liste);
    if (vorhanden?.status === 'bestaetigt') return { ok: true, schon: true };

    const eintrag = vorhanden
      ? { ...vorhanden, angefragtAm: new Date().toISOString() }
      : machEintrag({ email, quelle, liste, token: this.#token(), jetzt: new Date().toISOString() });
    this.#newsletterSichere(eintrag);

    this.ctx.waitUntil((async () => {
      const absender = String(this.env?.BREVO_ABSENDER || '');
      if (!absender) return;
      const inhalt = newsletterFrage({
        jaLink: `${basis}/newsletter/ja?t=${eintrag.token}`,
        wortlaut: eintrag.wortlaut,
        liste: eintrag.liste || 'mittagskarte'
      });
      await sendeMail(this.env, brevoPaket({
        absender, an: eintrag.email, betreff: inhalt.betreff, html: inhalt.html, text: inhalt.text
      }));
    })());
    return { ok: true, gefragt: true };
  }

  /** Der Klick in der Bestaetigungsmail. Erst hier entsteht die Einwilligung. */
  async newsletterJa(token) {
    const eintrag = this.#newsletterEiner('token', String(token || ''));
    if (!eintrag) return { ok: false, grund: 'unbekannt' };
    const ergebnis = bestaetige(eintrag, new Date().toISOString());
    if (!ergebnis.ok) return ergebnis;
    this.#newsletterSichere(ergebnis.eintrag);
    return { ok: true, schon: ergebnis.schon === true };
  }

  /** Der Widerruf. Loescht den Eintrag; zurueck bleibt nur die Sperre. */
  async newsletterWeg(token) {
    const eintrag = this.#newsletterEiner('token', String(token || ''));
    if (!eintrag) return { ok: false, grund: 'unbekannt' };
    const abdruck = await sperrschluessel(eintrag.email);
    this.#newsletterLoesche(eintrag.email);
    this.ctx.storage.sql.exec(
      'INSERT INTO sperrliste (fingerabdruck, seit) VALUES (?, ?) ON CONFLICT(fingerabdruck) DO NOTHING',
      abdruck, new Date().toISOString()
    );
    return { ok: true };
  }

  /** Nur fuer das Haus: wie viele bestaetigte Adressen es gibt. Ohne Adressen. */
  async newsletterZahlen() {
    const alle = this.#newsletterAlle();
    return {
      ok: true,
      bestaetigt: alle.filter(eintrag => eintrag.status === 'bestaetigt').length,
      offen: alle.filter(eintrag => eintrag.status !== 'bestaetigt').length,
      events: alle.filter(eintrag => eintrag.status === 'bestaetigt' && eintrag.liste === 'events').length
    };
  }

  // ---- Mittagskarte --------------------------------------------------------
  //
  // Der Ablauf: Wolfgang laedt hoch, der Dienst prueft und speichert, die
  // Gaesteseite zeigt. Der Moment des Uploads ist der Moment der
  // Veroeffentlichung - dazwischen liegt nichts.

  async karteSetzen(bytes) {
    const geprueft = pruefeKarte(bytes);
    if (!geprueft.ok) return { ok: false, grund: geprueft.grund };
    // Erst alles rein, dann der Eintrag mit dem Stand: der Stand ist das
    // Signal "fertig". Eine halb geschriebene Karte haette keinen Stand.
    this.ctx.storage.sql.exec('DELETE FROM mittagskarte');
    inTeile(bytes).forEach((teil, nr) => {
      this.ctx.storage.sql.exec('INSERT INTO mittagskarte (nr, teil) VALUES (?, ?)', nr, teil);
    });
    const info = { stand: new Date().toISOString(), groesse: geprueft.groesse };
    this.#schreib('karteStand', info);
    return { ok: true, ...info };
  }

  async karteWeg() {
    this.ctx.storage.sql.exec('DELETE FROM mittagskarte');
    this.#schreib('karteStand', null);
    return { ok: true };
  }

  /** Oeffentlich: gibt es eine Karte, und von wann ist sie? Keine Inhalte. */
  async karteInfo() {
    const info = this.#lies('karteStand', null);
    // "Da" heisst: die Datei ist auch wirklich abrufbar. Der Stand allein ist
    // nur ein Merker. Lag er da, waehrend die Stuecke fehlten - ein halber
    // Upload, ein Umzug des Speichers -, zeigte die Gaesteseite einen Link
    // zur Mittagskarte, der 404 liefert. Genau dieser Fall stand live an:
    // "da: true, 67 KB" und daneben ein PDF-Link ins Leere. Ein Zaehler
    // kostet nichts und macht die Auskunft wahr.
    const zeilen = info
      ? this.ctx.storage.sql.exec('SELECT COUNT(*) AS anzahl FROM mittagskarte').toArray()
      : [];
    const da = Boolean(info) && Number(zeilen[0]?.anzahl || 0) > 0;
    return { ok: true, da, ...(da ? info : {}) };
  }

  /** Die Datei selbst, zusammengesetzt. null, wenn keine da ist. */
  async karte() {
    if (!this.#lies('karteStand', null)) return null;
    const teile = this.ctx.storage.sql
      .exec('SELECT teil FROM mittagskarte ORDER BY nr').toArray()
      .map(row => row.teil);
    if (!teile.length) return null;
    return zusammen(teile).buffer;
  }

  // ---- Nur fuer das Haus ---------------------------------------------------

  async stand() { return this.#stand(); }

  /** Freie Zeiten fuer die Gaesteseite. Ohne Namen, ohne Belegungsdetails. */
  async frei(datum, personen) {
    const automatik = this.#lies('automatik', true) !== false;
    if (!automatik) {
      // Ohne Automatik kann niemand ehrlich sagen, was frei ist - das
      // entscheidet das Haus. Dann ist jede Zeit anfragbar.
      return { ok: true, automatik, zeiten: null };
    }
    return {
      ok: true,
      automatik,
      zeiten: freieZeiten({
        config: this.#plan(),
        parties: this.#alle(),
        blocked: this.#lies('blocked', []),
        standardEtage: this.#lies('standardEtage', null),
        deckel: this.#lies('deckel', null),
        guests: personen,
        date: datum
      })
    };
  }

  /**
   * Laufkundschaft: Gaeste stehen an der Tuer, der Wirt drueckt eine Zahl.
   * Der Dienst waehlt den kleinsten passenden freien Tisch und setzt die
   * Gruppe sofort als angekommen - eine Buchung ohne Namen, ohne Kontakt,
   * ohne Mail. Pacing gilt hier nicht: wer schon da ist, wird nicht von
   * einer Rechenregel weggeschickt. Zwei Geraete koennen nicht denselben
   * Tisch vergeben, weil alle Anfragen hier nacheinander laufen.
   */
  async laufkunde(personen, datum, zeit) {
    const guests = Math.trunc(Number(personen));
    if (!Number.isFinite(guests) || guests < 1 || guests > 24) return { ok: false, grund: 'personen' };

    const parties = this.#alle();
    const { result, floorplan, minuten } = verteile(
      { name: 'Laufkundschaft', date: datum, time: zeit, guests },
      {
        config: this.#plan(),
        parties,
        blocked: this.#lies('blocked', []),
        standardEtage: this.#lies('standardEtage', null),
        deckel: this.#lies('deckel', null),
        ohnePacing: true
      }
    );
    if (!result.ok) return { ok: false, grund: 'voll' };

    const nummer = (Number(this.#lies('zaehler', 0)) || 0) + 1;
    this.#schreib('zaehler', nummer);
    const lfd = parties.filter(party => party.date === datum && party.quelle === 'laufkunde').length + 1;
    const party = {
      id: machId(Date.parse(`${datum}T${zeit}:00Z`), nummer),
      name: `Laufkundschaft ${lfd}`,
      date: datum,
      time: zeit,
      guests,
      kontakt: null,
      status: 'offen',
      tableIds: result.tableIds,
      dishes: {},
      arrived: zeit,
      left: null,
      source: 'laufkunde',
      quelle: 'laufkunde',
      eingegangen: new Date().toISOString()
    };
    this.#sichere(party);
    await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
    this.#meldeAenderung();

    const tisch = floorplan.tables.find(table => table.id === result.tableIds[0]);
    return {
      ok: true,
      id: party.id,
      tisch: result.numbers.join(' + '),
      etage: tisch?.levelName || null,
      bis: shift(`${datum}T${zeit}`, minuten)?.slice(11) || null,
      reservierung: party
    };
  }

  /**
   * Eine telefonische Reservierung aus der Wirt-Ansicht: vier Angaben, Tisch
   * kommt automatisch. Ohne Pacing - der Wirt hat schon zugesagt, als er den
   * Hoerer aufgelegt hat.
   */
  async legeEinfach({ name, date, time, guests, telefon }) {
    const wer = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (wer.length < 2) return { ok: false, grund: 'name' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return { ok: false, grund: 'datum' };
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time || ''))) return { ok: false, grund: 'uhrzeit' };
    const anzahl = Math.trunc(Number(guests));
    if (!Number.isFinite(anzahl) || anzahl < 1 || anzahl > 24) return { ok: false, grund: 'personen' };

    const parties = this.#alle();
    const { result, floorplan } = verteile({ name: wer, date, time, guests: anzahl }, {
      config: this.#plan(),
      parties,
      blocked: this.#lies('blocked', []),
      standardEtage: this.#lies('standardEtage', null),
      deckel: this.#lies('deckel', null),
      ohnePacing: true
    });

    const nummer = (Number(this.#lies('zaehler', 0)) || 0) + 1;
    this.#schreib('zaehler', nummer);
    const party = {
      id: machId(Date.parse(`${date}T${time}:00Z`), nummer),
      name: wer,
      date,
      time,
      guests: anzahl,
      kontakt: telefon ? { email: null, telefon: String(telefon).trim().slice(0, 25) } : null,
      status: 'offen',
      // Auch ohne freien Tisch wird angenommen - der Wirt hat zugesagt und
      // teilt notfalls von Hand ein. Die Liste zeigt "ohne Tisch" ehrlich an.
      tableIds: result.ok ? result.tableIds : [],
      dishes: {},
      arrived: null,
      left: null,
      source: 'haus',
      quelle: 'haus',
      eingegangen: new Date().toISOString()
    };
    this.#sichere(party);
    await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
    this.#meldeAenderung();
    const tisch = result.ok ? floorplan.tables.find(table => table.id === result.tableIds[0]) : null;
    return {
      ok: true,
      tisch: result.ok ? result.numbers.join(' + ') : null,
      etage: tisch?.levelName || null,
      reservierung: ohneGeheimnis(party)
    };
  }

  /**
   * Der Tagesabschluss auf einen Griff: heutige Reservierungen raus, offene
   * Abholungen abgehakt. Kein "bist du sicher?" - sondern Rueckgaengig: der
   * geraeumte Stand liegt eine Viertelstunde im Papierkorb. Kuenftige Tage
   * bleiben unberuehrt.
   */
  async leereTag(datum) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum || ''))) return { ok: false, grund: 'datum' };
    const parties = this.#amTag(datum);
    const offene = this.#takeawayAlle().filter(bestellung =>
      bestellung.date === datum && bestellung.status === 'offen');
    if (!parties.length && !offene.length) return { ok: true, geleert: 0 };

    this.#schreib('papierkorb', {
      tag: datum,
      zeit: new Date().toISOString(),
      parties,
      takeawayIds: offene.map(bestellung => bestellung.id)
    });
    this.ctx.storage.sql.exec('DELETE FROM reservierungen WHERE tag = ?', datum);
    // Offene Abholungen werden abgehakt, nicht geloescht - das Protokoll je
    // Gericht soll den Tag behalten.
    for (const bestellung of offene) {
      bestellung.status = 'abgeholt';
      bestellung.abgeholtUm = null;
      this.#takeawaySichere(bestellung);
    }
    this.#meldeAenderung();
    return { ok: true, geleert: parties.length + offene.length };
  }

  async stelleTagWiederHer() {
    const korb = this.#lies('papierkorb', null);
    if (!korb) return { ok: false, grund: 'leer' };
    // Nach einer Viertelstunde ist der Abschluss gewollt - dann kein Zurueck.
    if (Date.now() - Date.parse(korb.zeit) > 15 * 60 * 1000) {
      this.#schreib('papierkorb', null);
      return { ok: false, grund: 'abgelaufen' };
    }
    for (const party of korb.parties || []) this.#sichere(party);
    const zurueck = new Set(korb.takeawayIds || []);
    for (const bestellung of this.#takeawayAlle()) {
      if (!zurueck.has(bestellung.id)) continue;
      bestellung.status = 'offen';
      bestellung.abgeholtUm = null;
      this.#takeawaySichere(bestellung);
    }
    this.#schreib('papierkorb', null);
    this.#meldeAenderung();
    return { ok: true, zurueck: (korb.parties || []).length + zurueck.size };
  }

  /**
   * Montag frueh: die Wochenkarte an alle bestaetigten Abonnenten - aber nur,
   * wenn seit dem letzten Versand eine neue Karte hochgeladen wurde. Dieselbe
   * Karte zweimal zu schicken waere die schnellste Abmeldung der Welt.
   */
  /**
   * Der Tageszettel an den Wirt, werktags am Morgen: der Tag auf einen
   * Blick, bevor die Tuer aufsperrt - und das Lebenszeichen des Dienstes.
   */
  async tageszettel() {
    const an = String(this.env?.WIRT_MAIL || '');
    const absender = String(this.env?.BREVO_ABSENDER || '');
    if (!an || !absender) return { ok: false, grund: 'nicht_eingerichtet' };
    const heute = jetztImHaus().datum;
    const parties = this.#amTag(heute).filter(party => party.status !== 'storniert');
    const vorbestellungen = this.#takeawayAlle().filter(bestellung =>
      bestellung.date === heute && bestellung.status === 'offen');
    const inhalt = tageszettelMail({
      tag: heute,
      reservierungen: parties.length,
      personen: parties.reduce((summe, party) => summe + (Number(party.guests) || 0), 0),
      vorbestellungen: vorbestellungen.length,
      portionen: vorbestellungen.reduce((summe, bestellung) =>
        summe + (bestellung.posten || []).reduce((n, posten) => n + posten.menge, 0), 0),
      karteDa: Boolean(this.#lies('karteStand', null)),
      warteliste: this.wartelisteZahl(heute),
      geschlossen: this.#geschlossen().includes(heute)
    });
    const ergebnis = await sendeMail(this.env, brevoPaket({
      absender, an, betreff: inhalt.betreff, html: inhalt.html, text: inhalt.text
    }));
    return { ok: ergebnis.ok === true };
  }

  /**
   * Der Wochenbericht am Freitagnachmittag: die Woche in Zahlen, die ohnehin
   * da sind. Montag bis Freitag der laufenden Woche.
   */
  async wochenbericht() {
    const an = String(this.env?.WIRT_MAIL || '');
    const absender = String(this.env?.BREVO_ABSENDER || '');
    if (!an || !absender) return { ok: false, grund: 'nicht_eingerichtet' };
    const heute = new Date(`${jetztImHaus().datum}T12:00:00Z`);
    // Zurueck zum Montag dieser Woche.
    const montag = new Date(heute);
    montag.setUTCDate(montag.getUTCDate() - ((montag.getUTCDay() + 6) % 7));
    const tage = [];
    const tagesnamen = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
    let gaeste = 0, reservierungen = 0, nichtDa = 0, bestellungen = 0, portionen = 0, umsatz = 0;
    const alleBestellungen = this.#takeawayAlle();
    const jeGericht = new Map();
    let von = '', bis = '';
    for (let i = 0; i < 5; i += 1) {
      const tag = new Date(montag);
      tag.setUTCDate(tag.getUTCDate() + i);
      const iso = tag.toISOString().slice(0, 10);
      if (i === 0) von = iso;
      bis = iso;
      const parties = this.#amTag(iso).filter(party => party.status !== 'storniert');
      const heutigeBestellungen = alleBestellungen.filter(bestellung => bestellung.date === iso);
      const heutigePortionen = heutigeBestellungen.reduce((summe, bestellung) =>
        summe + (bestellung.posten || []).reduce((n, posten) => n + posten.menge, 0), 0);
      const tagGaeste = parties.reduce((summe, party) => summe + (Number(party.guests) || 0), 0);
      tage.push({ name: tagesnamen[i], gaeste: tagGaeste, portionen: heutigePortionen });
      gaeste += tagGaeste;
      reservierungen += parties.length;
      nichtDa += parties.filter(party => party.nichtDa).length;
      bestellungen += heutigeBestellungen.length;
      portionen += heutigePortionen;
      for (const bestellung of heutigeBestellungen) {
        for (const posten of bestellung.posten || []) {
          const stand = jeGericht.get(posten.name) || { name: posten.name, portionen: 0 };
          stand.portionen += posten.menge;
          jeGericht.set(posten.name, stand);
          umsatz += posten.preis * posten.menge;
        }
      }
    }
    const bestseller = [...jeGericht.values()].sort((a, b) => b.portionen - a.portionen).slice(0, 5);
    const inhalt = wochenberichtMail({
      von, bis, tage, gaeste, reservierungen, nichtDa, bestellungen, portionen,
      umsatz: Math.round(umsatz * 100) / 100, bestseller
    });
    const ergebnis = await sendeMail(this.env, brevoPaket({
      absender, an, betreff: inhalt.betreff, html: inhalt.html, text: inhalt.text
    }));
    return { ok: ergebnis.ok === true };
  }

  async wochenkarteVersand(basis) {
    const karte = this.#lies('karteStand', null);
    if (!karte) return { ok: true, versendet: 0, grund: 'keine_karte' };
    const marke = String(karte.stand || JSON.stringify(karte));
    if (this.#lies('wochenkarteMarke', null) === marke) {
      return { ok: true, versendet: 0, grund: 'unveraendert' };
    }
    const alle = empfaenger(this.#newsletterAlle(), 'mittagskarte');
    let versendet = 0;
    for (const eintrag of alle) {
      const inhalt = wochenkarteMail({
        karteLink: `${basis}/mittagskarte.pdf`,
        abmeldeLink: `${basis}/newsletter/weg?t=${eintrag.token}`
      });
      const ergebnis = await sendeMail(this.env, brevoPaket({
        absender: String(this.env?.BREVO_ABSENDER || ''),
        an: eintrag.email,
        betreff: inhalt.betreff,
        html: inhalt.html,
        text: inhalt.text
      }));
      if (ergebnis.ok) versendet += 1;
    }
    // Die Marke wird auch ohne Abonnenten gesetzt: die Karte gilt als
    // verschickt, sonst ginge sie beim ersten Abonnenten Wochen spaeter raus.
    this.#schreib('wochenkarteMarke', marke);
    return { ok: true, versendet, abonnenten: alle.length };
  }

  // ---- Takeaway ------------------------------------------------------------

  /** Die bestellbare Karte. Oeffentlich: Name, Preis und Allergene. */
  async takeawayKarte(heute = null, jetzt = null, wunsch = '') {
    // Welche Abholzeiten noch Luft haben. Ohne diese Angabe waehlt der Gast
    // eine volle Zeit und erfaehrt es erst beim Abschicken - dieselbe Huerde,
    // die bei den Uhrzeiten der Reservierung laengst wegfaellt.
    //
    // Nennt der Gast einen Wunschtag, gilt der - aber die Antwort sagt auch,
    // wenn er nicht geht, und warum. Die Seite kennt weder Feiertage noch die
    // Sperren des Wirts; sie fragt hier nach, statt selbst zu raten.
    const zu = this.#zuMenge();
    let tag = heute ? bestelltag({ heute, jetzt, zu }) : null;
    let wunschGrund = null;
    if (heute && wunsch) {
      const erlaubt = pruefeWunschtag(wunsch, { heute, jetzt, zu });
      if (erlaubt.ok) tag = { datum: wunsch, vorbestellung: wunsch !== heute };
      else wunschGrund = erlaubt.grund;
    }
    return {
      ok: true,
      // Was der Wunschtag beantwortet hat: null heisst "geht".
      wunschGrund,
      // Die Grenzen fuer das Datumsfeld - eine Quelle, nicht zwei.
      frueheste: tag?.datum ?? null,
      spaeteste: heute ? this.#spaetesterTag(heute) : null,
      gerichte: this.#lies('takeawayKarte', []),
      slots: tag
        ? freieSlots({
          bestellungen: this.#takeawayAlle(), datum: tag.datum,
          vorbestellung: tag.vorbestellung, jetzt
        })
        : null,
      vorbestellung: tag?.vorbestellung ?? null,
      // Fuer welchen Tag gerade bestellt wird. Die Seite nennt ihn beim Namen,
      // statt selbst zu rechnen - sie kennt weder Feiertage noch Sperren.
      bestelltag: tag?.datum ?? null,
      proSlot: PORTIONEN_PRO_SLOT,
      // Die Klarnamen zu den Allergen-Codes - eine Quelle fuer alle Seiten.
      allergenNamen: ALLERGENE,
      schluss: BESTELLSCHLUSS,
      letzteAbholung: LETZTE_ABHOLUNG,
      wartezeit: WARTEZEIT_TEXT
    };
  }

  /** Wie weit voraus bestellt werden darf - als Datum fuer das Eingabefeld. */
  #spaetesterTag(heute) {
    const grenze = new Date(`${heute}T12:00:00Z`);
    grenze.setUTCDate(grenze.getUTCDate() + VORAUS_TAGE);
    return grenze.toISOString().slice(0, 10);
  }

  /**
   * Der Wirt setzt die Karte: die Zeilen aus dem Mittagskarten-PDF, pro Zeile
   * links das Gericht, rechts der Preis. Geparst wird hier - eine zweite
   * Rechenregel im Browser waere der sicherste Weg zu zwei Wahrheiten.
   */
  async setzeTakeawayKarte(text) {
    const gerichte = parseKarte(text);
    this.#schreib('takeawayKarte', gerichte);
    this.#schreib('takeawayKarteText', String(text || '').slice(0, 4000));
    this.#meldeAenderung();
    return { ok: true, gerichte, text: this.#lies('takeawayKarteText', '') };
  }

  /** Eine Bestellung von der Gaesteseite. */
  async bestelleTakeaway(roh, heute, jetzt) {
    // Dieselbe Notbremse wie bei Reservierungen: ein Haus dieser Groesse
    // verkauft das nie ehrlich aus.
    const fenster = `${heute}T${String(jetzt).slice(0, 2)}`;
    const zaehler = this.#lies('taFenster', { fenster: '', anzahl: 0 });
    const anzahl = zaehler.fenster === fenster ? zaehler.anzahl : 0;
    if (anzahl >= ONLINE_PRO_STUNDE) return { ok: false, grund: 'zu_viele' };

    const gecheckt = pruefeBestellung(roh, {
      gerichte: this.#lies('takeawayKarte', []), heute, jetzt, zu: this.#zuMenge(),
      // Die schon angenommenen Bestellungen sind die eigentliche Grenze: die
      // Kueche schafft nur so viel je Viertelstunde.
      bestehende: this.#takeawayAlle()
    });
    if (!gecheckt.ok) return { ok: false, grund: gecheckt.grund, frei: gecheckt.frei || null };

    // Doppelklick: gleicher Name, gleiche Nummer, gleiche Summe am selben Tag
    // ist keine zweite Bestellung.
    const heutige = this.#takeawayAlle().filter(bestellung => bestellung.date === heute);
    const doppelt = heutige.find(bestellung => bestellung.status === 'offen'
      && bestellung.name.toLowerCase() === gecheckt.bestellung.name.toLowerCase()
      && bestellung.telefon === gecheckt.bestellung.telefon
      && bestellung.summe === gecheckt.bestellung.summe);
    if (doppelt) return { ok: true, doppelt: true, nummer: doppelt.nummer, abholzeit: doppelt.abholzeit, summe: doppelt.summe };

    const laufend = (Number(this.#lies('taZaehler', 0)) || 0) + 1;
    this.#schreib('taZaehler', laufend);

    // Die Nummer des Tages kam bisher aus der Laenge der heutigen Liste. Das
    // stimmt nur, solange nie etwas verschwindet. Entfernt der Wirt eine
    // Bestellung oder macht er einen Tagesabschluss rueckgaengig, schrumpft
    // die Liste - und der naechste Gast bekommt eine Nummer, die schon jemand
    // hat. Am Tresen stehen dann zwei Leute auf denselben Ruf.
    //
    // Deshalb ein eigener Tageszaehler: er steigt nur, egal was aus der Liste
    // verschwindet, und faengt mit einem neuen Datum wieder bei eins an.
    //
    // Der Zaehler startet nicht bei null, sondern bei der hoechsten Nummer,
    // die der Tag schon traegt. Sonst gaebe es an genau einem Tag noch einmal
    // eine doppelte Nummer: an dem, an dem dieser Zaehler eingefuehrt wurde -
    // die Liste war voll, der Zaehler leer. Dieselbe Zeile repariert den Tag
    // auch dann, wenn der gespeicherte Wert je verloren geht.
    //
    // Und: gezaehlt wird je ABHOLTAG, nicht je Bestelltag. Die Nummer wird am
    // Tresen des Abholtags gerufen - zwei Vorbestellungen fuer Montag, am
    // Samstag und am Sonntag aufgegeben, bekaemen sonst beide die Eins. Die
    // Generalprobe hat genau diesen Fall gefunden.
    const abholtag = gecheckt.bestellung.date;
    const zaehlerJeTag = this.#lies('taNummern', {});
    const inDerListe = this.#takeawayAlle()
      .filter(eintrag => eintrag.date === abholtag)
      .reduce((groesste, b) => Math.max(groesste, Number(b.nummer) || 0), 0);
    const tagesnummer = Math.max(Number(zaehlerJeTag[abholtag]) || 0, inDerListe) + 1;
    zaehlerJeTag[abholtag] = tagesnummer;
    // Vergangene Tage fallen aus dem Zaehler, sonst waechst er ewig.
    for (const alterTag of Object.keys(zaehlerJeTag)) {
      if (alterTag < heute) delete zaehlerJeTag[alterTag];
    }
    this.#schreib('taNummern', zaehlerJeTag);

    const bestellung = {
      id: `t-${Date.now().toString(36)}-${String(laufend).padStart(4, '0')}`,
      // Die Nummer des Tages - sie wird am Tresen gerufen und steht auf dem
      // Bildschirm im Eingang.
      nummer: tagesnummer,
      // Der Schluessel zur eigenen Statusseite. Er steht in genau einer
      // Adresse und sonst nirgends - ohne ihn koennte jeder mit einer
      // geratenen Nummer fremde Bestellungen mitlesen.
      token: this.#token(),
      ...gecheckt.bestellung,
      status: 'offen',
      eingegangen: new Date().toISOString()
    };
    this.#takeawaySichere(bestellung);
    this.#schreib('taFenster', { fenster, anzahl: anzahl + 1 });
    await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
    this.#meldeAenderung();
    // "Wir haben deine Bestellung." Beim Takeaway ist die Nummer die einzige
    // Erreichbarkeit - ohne diese SMS haette der Gast nur die Bildschirmseite
    // als Beleg, und die ist weg, sobald er sie schliesst.
    this.ctx.waitUntil(this.#schickeSms(bestellung.telefon, bestellungText({
      nummer: bestellung.nummer,
      zeit: bestellung.abholzeit,
      wann: bestellung.vorbestellung ? 'am naechsten Werktag' : 'heute'
    })));

    return {
      ok: true, nummer: bestellung.nummer, abholzeit: bestellung.abholzeit,
      // Das ECHTE Abholdatum. Ohne es rechnete die Seite selbst nach - und
      // zwar ohne Feiertage und ohne gesperrte Tage. Faellt der Montag auf
      // einen Feiertag, sagte sie "morgen", waehrend der Dienst laengst auf
      // Dienstag gelegt hatte. Nur eine Stelle darf diese Rechnung machen.
      date: bestellung.date, vorbestellung: bestellung.vorbestellung === true,
      summe: bestellung.summe, eng: bestellung.eng === true,
      // Der Schluessel geht genau einmal hinaus: an den Gast, der gerade
      // bestellt hat. Mit ihm sieht er seinen Stand, sonst niemand.
      schluessel: bestellung.token
    };
  }

  /**
   * Der Gast meldet sich fuer Push an. Sein Bestellschluessel ist der Ausweis -
   * derselbe, mit dem er ohnehin seinen Stand abfragt. Die Anmeldung haengt
   * damit an genau einer Bestellung und verschwindet mit ihr: keine Liste von
   * Geraeten, die den Tag ueberdauert, kein Verteiler.
   */
  async pushAnmelden(token, roh) {
    const bestellung = this.#takeawayAlle().find(eintrag => eintrag.token === token);
    if (!bestellung) return { ok: false, grund: 'unbekannt' };
    const geprueft = pruefePushAnmeldung(roh);
    if (!geprueft.ok) return geprueft;
    bestellung.push = geprueft.anmeldung;
    this.#takeawaySichere(bestellung);
    return { ok: true };
  }

  /** Und wieder abmelden. Muss so einfach sein wie das Anmelden. */
  async pushAbmelden(token) {
    const bestellung = this.#takeawayAlle().find(eintrag => eintrag.token === token);
    if (!bestellung) return { ok: false, grund: 'unbekannt' };
    delete bestellung.push;
    this.#takeawaySichere(bestellung);
    return { ok: true };
  }

  /**
   * Anklopfen beim Geraet des Gastes. Ohne Inhalt - was drinsteht, holt sich
   * der Service Worker selbst; siehe push.mjs.
   *
   * Faellt die Anmeldung weg (der Gast hat die Erlaubnis entzogen oder die
   * Seite vom Home-Bildschirm geworfen), wird sie hier geloescht. Sonst
   * klopft der Dienst bis zum Ende der Aufbewahrung an eine Tuer, die es
   * nicht mehr gibt.
   */
  async #meldePush(bestellung) {
    if (!bestellung?.push?.endpunkt) return 'keine';
    const ergebnis = await schickePush(bestellung.push, {
      privatSchluessel: this.env?.VAPID_PRIVAT,
      oeffentlich: this.env?.VAPID_OEFFENTLICH,
      kontakt: this.env?.VAPID_KONTAKT
    });
    if (ergebnis.entfernen) {
      delete bestellung.push;
      this.#takeawaySichere(bestellung);
      return 'weg';
    }
    return ergebnis.ok ? 'gesendet' : (ergebnis.grund || 'fehler');
  }

  // ---- Eigene Termine des Hauses -------------------------------------------

  /** Oeffentlich: die eigenen Termine in der Form der Gaesteseite. */
  async eigeneEvents() {
    const heute = jetztImHaus().datum;
    const liste = ordneEigeneEvents(this.#lies('wirtEvents', []), heute);
    return { ok: true, events: liste.map(fuerDieGaesteseite) };
  }

  /** Der Wirt legt einen Termin an. Die Liste haelt sich selbst sortiert. */
  async eigenesEventAnlegen(roh) {
    const geprueft = pruefeEigenesEvent(roh);
    if (!geprueft.ok) return geprueft;
    const heute = jetztImHaus().datum;
    // Gestern anlegen ergibt einen Termin, der beim naechsten Schreiben
    // wortlos verschwindet - besser gleich ehrlich ablehnen.
    if (geprueft.event.datum < heute) return { ok: false, grund: 'vergangen' };
    const event = { id: `we-${Date.now().toString(36)}-${Math.trunc(Math.random() * 1e6).toString(36)}`, ...geprueft.event };
    const liste = ordneEigeneEvents([...this.#lies('wirtEvents', []), event], heute);
    this.#schreib('wirtEvents', liste);
    this.#meldeAenderung();
    return { ok: true, event, anzahl: liste.length };
  }

  async eigenesEventEntfernen(id) {
    const vorher = this.#lies('wirtEvents', []);
    const nachher = vorher.filter(event => event.id !== String(id || ''));
    if (nachher.length === vorher.length) return { ok: false, grund: 'unbekannt' };
    this.#schreib('wirtEvents', ordneEigeneEvents(nachher, jetztImHaus().datum));
    this.#meldeAenderung();
    return { ok: true };
  }

  /** Abgeholt, zurueckgenommen oder entfernt - die drei Griffe des Wirts. */
  async takeawayAktion(befehl) {
    const bestellung = this.#takeawayAlle().find(eintrag => eintrag.id === befehl?.id);
    if (!bestellung) return { ok: false, grund: 'unbekannt' };
    if (befehl.art === 'fertig') {
      // Zustaendigkeit im Haus: meldet die Kueche fertig, kommt vom Wirt kein
      // "fertig" durch - und umgekehrt. Faengt den offen stehenden Bildschirm
      // ab, der den alten Knopf noch zeigt. Siehe #fertigWer.
      if (!this.#darfFertig(befehl.rolle === 'kueche' ? 'kueche' : 'haus')) {
        return { ok: false, grund: 'nicht_zustaendig', fertigWer: this.#fertigWer() };
      }
      // Zweimal "fertig" darf keine zweite SMS ausloesen - im Betrieb wird
      // ein Knopf schneller doppelt gedrueckt, als einem lieb ist.
      const schonGemeldet = bestellung.status === 'fertig' || bestellung.fertigUm;
      bestellung.status = 'fertig';
      bestellung.fertigUm = bestellung.fertigUm || befehl.zeit || null;
      // fertigUm ist der Merker fuer die SMS und bleibt deshalb beim
      // Zuruecknehmen stehen. Als Uhrzeit taugt es danach nicht mehr: wer
      // zuruecknimmt und spaeter erneut fertigmeldet, saehe sonst die alte
      // Zeit von vorhin. Was angezeigt wird, steht deshalb hier.
      bestellung.fertigSeit = befehl.zeit || bestellung.fertigSeit || null;
      this.#takeawaySichere(bestellung);
      this.#meldeAenderung();
      if (schonGemeldet) return { ok: true, sms: 'schon' };
      // Die SMS haelt den Betrieb nicht auf: sie geht hinterher raus, und
      // scheitert sie, bleibt die Bestellung trotzdem fertig.
      // Push und SMS sind zwei Wege zum selben Gast, keine Alternativen:
      // Push kostet nichts und erreicht, wer sich angemeldet hat; die SMS
      // erreicht den Rest, kostet aber. Wer beides hat, bekommt beides -
      // doppelt Bescheid ist besser als gar nicht.
      const gedrueckt = await this.#meldePush(bestellung);
      const meldung = await this.#meldeFertig(bestellung);
      return { ok: true, sms: meldung.grund || 'gesendet', push: gedrueckt };
    }
    if (befehl.art === 'spaeter') {
      // Die nuetzlichste Nachricht ueberhaupt: die Abholzeit kennt der Gast
      // schon, aber nicht, dass sie nicht haelt. Die urspruengliche Zeit
      // bleibt vermerkt - sonst wundert er sich, warum dort etwas anderes
      // steht als vorhin.
      const minuten = Math.max(5, Math.min(60, Math.trunc(Number(befehl.minuten) || 10)));
      const [stunde, minute] = String(bestellung.abholzeit).split(':').map(Number);
      if (!Number.isFinite(stunde) || !Number.isFinite(minute)) return { ok: false, grund: 'zeit' };
      const gesamt = stunde * 60 + minute + minuten;
      if (gesamt >= 24 * 60) return { ok: false, grund: 'zeit' };
      bestellung.verschobenVon = bestellung.verschobenVon || bestellung.abholzeit;
      bestellung.abholzeit = `${String(Math.floor(gesamt / 60)).padStart(2, '0')}:${String(gesamt % 60).padStart(2, '0')}`;
      this.#takeawaySichere(bestellung);
      this.#meldeAenderung();
      // Genau hier bricht die Zusage, die der Gast bekommen hat. Wenn ihn je
      // etwas erreichen soll, dann jetzt - auch wenn er nicht auf der Seite ist.
      const geschoben = await this.#meldePush(bestellung);
      return { ok: true, abholzeit: bestellung.abholzeit, push: geschoben };
    }
    if (befehl.art === 'abgeholt') {
      bestellung.status = 'abgeholt';
      bestellung.abgeholtUm = befehl.zeit || null;
      this.#takeawaySichere(bestellung);
    } else if (befehl.art === 'offen') {
      bestellung.status = 'offen';
      bestellung.abgeholtUm = null;
      // fertigUm bleibt stehen: die SMS ist raus, sie laesst sich nicht
      // zuruecknehmen. Wer zurueckstellt, soll deshalb keine zweite ausloesen.
      this.#takeawaySichere(bestellung);
    } else if (befehl.art === 'entfernen') {
      this.ctx.storage.sql.exec('DELETE FROM takeaway WHERE id = ?', befehl.id);
    } else {
      return { ok: false, grund: 'unbekannt' };
    }
    this.#meldeAenderung();
    return { ok: true };
  }

  /** Das Protokoll: was lief in den letzten 30 Tagen. */
  /**
   * Der Kuechenzettel eines Tages. Intern: er nennt zwar keine Gastnamen,
   * verraet aber die Auslastung des Hauses - das geht niemanden ausser dem
   * Wirt etwas an.
   */
  async kuechenzettel(datum) {
    return {
      ok: true,
      ...kuechenzettel({
        gerichte: this.#lies('takeawayKarte', []),
        bestellungen: this.#takeawayAlle(),
        parties: this.#alle(),
        date: datum
      })
    };
  }

  /**
   * Auskunft und Widerruf zum eigenen Profil. `widerruf` ist entweder
   * 'alles' - dann faellt das Profil weg - oder 'gesundheit', dann bleibt die
   * Besuchszahl und nur die Unvertraeglichkeit geht.
   *
   * Antwortet absichtlich gleich, ob es ein Profil gab oder nicht: sonst
   * liesse sich mit fremden Adressen abfragen, wer hier schon einmal gegessen
   * hat.
   */
  async gastAuskunft(kontakt, widerruf) {
    const schluessel = await schluesselFuer(kontakt);
    if (!schluessel) return { ok: true, profil: null };
    const profil = this.#gastLies(schluessel);
    if (!profil) return { ok: true, profil: null };

    if (widerruf === 'alles') {
      this.#gastLoesche(schluessel);
      return { ok: true, profil: null, widerrufen: 'alles' };
    }
    if (widerruf === 'gesundheit') {
      const naechstes = widerrufe(profil, 'gesundheit');
      this.#gastSichere(schluessel, naechstes);
      return { ok: true, profil: fuerDenWirt(naechstes), widerrufen: 'gesundheit' };
    }
    return { ok: true, profil: fuerDenWirt(profil) };
  }

  /**
   * SMS an- oder abschalten. Ohne eingerichteten Absender bleibt sie aus -
   * ein Schalter, der nichts bewirkt, waere schlimmer als kein Schalter.
   */
  async setzeSms(an) {
    const eingerichtet = Boolean(this.env?.BREVO_KEY && this.env?.BREVO_SMS_ABSENDER);
    if (an && !eingerichtet) return { ok: false, grund: 'nicht_eingerichtet' };
    this.#schreib('smsAn', an === true);
    this.#meldeAenderung();
    return { ok: true, an: an === true };
  }

  /**
   * Wer meldet "Essen fertig": 'kueche', 'wirt' oder 'beide'.
   *
   * Ein unbekannter Wert faellt auf die Kueche zurueck.
   *
   * Das ist eine Absprache im Haus, keine Sperre: Kueche und Wirt benutzen
   * denselben Hausschluessel, der Dienst kann sie also nicht auseinander
   * halten. Die Rolle im Befehl ist eine Angabe des Bildschirms, kein Ausweis.
   * Geprueft wird sie trotzdem - sie faengt den Fall ab, der im Betrieb
   * wirklich vorkommt: ein Bildschirm, der noch offen steht und den alten
   * Knopf zeigt, nachdem der Wirt die Zustaendigkeit umgestellt hat.
   */
  #fertigWer() {
    const wert = this.#lies('fertigWer', 'kueche');
    return ['kueche', 'wirt', 'beide'].includes(wert) ? wert : 'kueche';
  }

  /** Darf diese Rolle gerade fertigmelden? */
  #darfFertig(rolle) {
    const wer = this.#fertigWer();
    if (wer === 'beide') return true;
    // Der Bildschirm am Eingang meldet nie etwas - er zeigt nur an.
    if (rolle === 'schirm') return false;
    return wer === 'kueche' ? rolle === 'kueche' : rolle !== 'kueche';
  }

  async setzeFertigWer(wert) {
    if (!['kueche', 'wirt', 'beide'].includes(wert)) return { ok: false, grund: 'wert' };
    this.#schreib('fertigWer', wert);
    // Beide Bildschirme muessen es sofort erfahren - sonst steht der Knopf
    // beim einen noch da, waehrend der andere ihn schon hat.
    this.#meldeAenderung();
    return { ok: true, fertigWer: wert };
  }

  async takeawayProtokoll() {
    return { ok: true, ...statistik(this.#takeawayAlle()) };
  }

  /** Die Ampel fuer die Gaesteseite. Nur Zahlen und eine Stufe, keine Namen. */
  async ampel(datum, jetzt) {
    const automatik = this.#lies('automatik', true) !== false;
    if (!automatik) {
      // Ohne Automatik weiss nur das Haus, was frei ist - dann lieber keine
      // Ampel als eine, die raet.
      return { ok: true, automatik, stufe: null };
    }
    return {
      ok: true,
      automatik,
      ...ampelFuer({
        config: this.#plan(),
        parties: this.#alle(),
        blocked: this.#lies('blocked', []),
        standardEtage: this.#lies('standardEtage', null),
        deckel: this.#lies('deckel', null),
        date: datum,
        jetzt
      })
    };
  }

  async setzePlan(config, standardEtage, blocked, deckel, automatik, tischAnzeigen) {
    // Einen unbrauchbaren Plan anzunehmen waere schlimmer als ihn abzulehnen:
    // der Dienst wuerde ab dann jede Onlinebuchung ins Leere zuweisen.
    if (!planTaugt(config)) return { ok: false, grund: 'plan' };
    this.#schreib('floorplan', config);
    if (standardEtage !== undefined) this.#schreib('standardEtage', standardEtage);
    if (Array.isArray(blocked)) this.#schreib('blocked', blocked);
    // Die Tischnummer ist eine interne Groesse. Standardmaessig bekommt der
    // Gast nur "dein Platz ist fix" - so machen es auch die grossen
    // Reservierungssysteme. Wer die Nummer nennen will, schaltet sie zu.
    if (tischAnzeigen !== undefined) this.#schreib('tischAnzeigen', tischAnzeigen === true);
    if (deckel !== undefined) this.#schreib('deckel', deckel);
    if (automatik !== undefined) this.#schreib('automatik', automatik !== false);
    // Ein neuer Plan kann bestehende Reservierungen entwurzeln: Tisch weg,
    // Tisch kleiner, Tisch gesperrt. Die werden hier sofort neu gesetzt und
    // gemeldet - sonst merkt es der Wirt erst, wenn der Gast vor einem Tisch
    // steht, den es nicht mehr gibt.
    const umgesetzt = this.#setzeBetroffeneUm();
    this.#meldeAenderung();
    return { ok: true, stand: this.#stand(), umgesetzt };
  }

  /**
   * Reservierungen, die der aktuelle Plan nicht mehr traegt, neu zuteilen.
   * Ohne Pacing: die Gaeste sind laengst zugesagt - eine Auslastungsbremse
   * darf aus einer Planaenderung keine heimatlosen Reservierungen machen.
   * Wer trotzdem keinen Platz findet, steht mit leerer Tischliste in der
   * Wirt-Ansicht und in der Rueckmeldung - von Hand einteilen.
   */
  #setzeBetroffeneUm() {
    const config = this.#plan();
    const blocked = this.#lies('blocked', []);
    const heute = jetztImHaus().datum;
    const alle = this.#alle();
    const betroffene = betroffenePartys(alle, { config, blocked, heute });
    const meldungen = [];
    for (const party of betroffene) {
      const andere = alle.filter(eintrag => eintrag.id !== party.id);
      const { result } = verteile(
        { date: party.date, time: party.time, guests: party.guests },
        {
          config,
          parties: andere,
          blocked,
          standardEtage: this.#lies('standardEtage', null),
          deckel: null,
          ohnePacing: true
        }
      );
      party.tableIds = result.ok ? result.tableIds : [];
      this.#sichere(party);
      meldungen.push({
        name: party.name, date: party.date, time: party.time,
        tische: result.ok ? result.tableIds : null
      });
    }
    return meldungen;
  }

  /**
   * Ein Tisch faellt aus oder kommt zurueck - der eine Handgriff des Alltags.
   * Er aendert nur die Sperrliste, nie den Plan selbst; Reservierungen auf
   * einem gesperrten Tisch werden sofort umgesetzt.
   */
  async setzeTischsperre(tischId, gesperrt) {
    const id = String(tischId || '');
    if (!id) return { ok: false, grund: 'tisch' };
    if (!tischBekannt(this.#plan(), id)) return { ok: false, grund: 'unbekannt' };
    const liste = new Set(this.#lies('blocked', []));
    if (gesperrt) liste.add(id); else liste.delete(id);
    this.#schreib('blocked', [...liste]);
    const umgesetzt = gesperrt ? this.#setzeBetroffeneUm() : [];
    this.#meldeAenderung();
    return { ok: true, gesperrt: [...liste], umgesetzt };
  }

  async aktion(befehl) {
    // Wer da war, bevor er verschwindet: "entfernen" gibt Platz frei, und
    // der gehoert der Warteliste - aber nur, wenn wirklich etwas wegfiel.
    const vorher = befehl?.art === 'entfernen'
      ? this.#alle().find(party => party.id === befehl.id)
      : null;
    const ergebnis = wendeAktionAn(this.#alle(), befehl);
    if (!ergebnis.ok) return { ok: false, grund: ergebnis.grund };
    this.#ersetzeAlle(ergebnis.parties);
    this.#meldeAenderung();
    if (vorher && vorher.status !== 'storniert') {
      this.ctx.waitUntil(this.#wartelisteAnstossen(vorher.date, vorher.guests));
    }
    return { ok: true, stand: this.#stand() };
  }

  /** Eine im Haus angelegte Reservierung uebernehmen. */
  async lege(party) {
    if (!party?.id || !party?.date) return { ok: false, grund: 'unvollstaendig' };
    this.#sichere(party);
    this.#meldeAenderung();
    return { ok: true, stand: this.#stand() };
  }

  async alarm() {
    const heute = new Date().toISOString().slice(0, 10);
    const behalten = raeumeAuf(this.#alle(), heute, AUFBEWAHRUNG_TAGE);
    this.#ersetzeAlle(behalten);

    // Takeaway-Bestellungen altern wie Reservierungen: nach 30 Tagen weg.
    const taGrenze = new Date(`${heute}T00:00:00Z`);
    taGrenze.setUTCDate(taGrenze.getUTCDate() - AUFBEWAHRUNG_TAGE);
    this.ctx.storage.sql.exec('DELETE FROM takeaway WHERE tag < ?', taGrenze.toISOString().slice(0, 10));

    // Gastprofile ohne Besuch verfallen. Eine Einwilligung ist kein
    // Dauerauftrag: wer zwei Jahre nicht da war, steht auch nicht mehr im
    // Speicher - ohne dass jemand daran denken muss.
    const profile = this.#gastAlle();
    const bleibenProfile = new Set(raeumeAufProfile(profile, new Date().toISOString())
      .map(profil => profil.schluessel));
    for (const profil of profile) {
      if (!bleibenProfile.has(profil.schluessel)) this.#gastLoesche(profil.schluessel);
    }

    // Eine Anmeldung ohne Bestaetigung ist keine Einwilligung. Sie faellt
    // nach der Frist weg, ohne dass jemand daran denken muss.
    const eintraege = this.#newsletterAlle();
    const bleiben = new Set(raeumeAufOffene(eintraege, new Date().toISOString()).map(e => e.email));
    for (const eintrag of eintraege) {
      if (!bleiben.has(eintrag.email)) this.#newsletterLoesche(eintrag.email);
    }
    // Nur weiterlaufen lassen, solange ueberhaupt Daten da sind. Offene
    // Anmeldungen zaehlen dazu - sonst bliebe eine unbestaetigte Adresse
    // liegen, weil an dem Tag niemand reserviert hat.
    const offeneAnmeldungen = this.#newsletterAlle().some(eintrag => eintrag.status !== 'bestaetigt');
    const takeawayDa = this.#takeawayAlle().length > 0;
    if (behalten.length || offeneAnmeldungen || takeawayDa) {
      await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
    }
  }
}

// ---- Der Worker davor ------------------------------------------------------

/**
 * Datum und Uhrzeit im Haus, nicht auf dem Server. Der Worker rechnet in UTC;
 * fuer die Ampel zaehlt aber, wie spaet es in Dornbirn ist - sonst meldet sie
 * im Sommer eine Stunde lang "vorbei", obwohl noch gekocht wird.
 */
function jetztImHaus() {
  const teile = new Intl.DateTimeFormat('de-AT', {
    timeZone: 'Europe/Vienna', hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  }).formatToParts(new Date());
  const wert = art => teile.find(teil => teil.type === art)?.value || '00';
  const datum = `${wert('year')}-${wert('month')}-${wert('day')}`;
  return {
    datum,
    zeit: `${wert('hour')}:${wert('minute')}`,
    // 0 = Sonntag ... 6 = Samstag, aus dem HAUSDATUM gerechnet - nicht aus
    // der UTC-Uhr, die um Mitternacht einen anderen Tag haben kann.
    wochentag: new Date(`${datum}T12:00:00Z`).getUTCDay()
  };
}

function stub(env) {
  // Der Zustand bleibt in der EU. Das ist eine Einstellung zum Speicherort,
  // keine Zusicherung ueber Protokolldaten - die liegen laut Cloudflare
  // ausserhalb der Rechtsraum-Grenze.
  //
  // Die oertliche Laufzeit (workerd) kennt keine Rechtsraeume und wirft. Ohne
  // diesen Auffang laeuft nichts mehr lokal, und der Fehler saehe aus wie ein
  // Fehler im Dienst.
  try {
    const raum = env.HAUS.jurisdiction('eu');
    return raum.get(raum.idFromName(HAUS));
  } catch {
    return env.HAUS.get(env.HAUS.idFromName(HAUS));
  }
}

export default {
  /**
   * Montag 7:15 im Haus: die Wochenkarte an die Abonnenten. Zwei UTC-Plaene
   * decken Sommer- und Winterzeit ab; die Ortszeit entscheidet, welcher der
   * beiden der echte ist - der andere Lauf endet hier sofort.
   */
  async scheduled(event, env, ctx) {
    const uhr = jetztImHaus();

    // Die Wochenkarte, montags um 07:15.
    if (uhr.zeit === '07:15') {
      const basis = String(env.DIENST_BASIS || '').replace(/\/+$/, '');
      if (basis) ctx.waitUntil(stub(env).wochenkarteVersand(basis));
      return;
    }

    // Der Tageszettel, werktags um 08:00. Der Zeitplan feuert zur Sicherheit
    // in beiden moeglichen UTC-Stunden (Sommer- und Winterzeit) - welche die
    // richtige ist, entscheidet die Hausuhr.
    if (uhr.zeit === '08:00' && uhr.wochentag >= 1 && uhr.wochentag <= 5) {
      ctx.waitUntil(stub(env).tageszettel());
      return;
    }

    // Der Wochenbericht, freitags um 15:00 - nach dem Mittag, vor dem Einkauf.
    if (uhr.zeit === '15:00' && uhr.wochentag === 5) {
      ctx.waitUntil(stub(env).wochenbericht());
      return;
    }

    // Erinnerungen an die Tische von heute. Der Zeitplan laeuft im Fenster
    // vor dem Mittag alle Viertelstunde; welche Reservierung faellig ist,
    // entscheidet der Dienst selbst - nicht die Uhr des Zeitplans. So macht
    // ein ausgefallener oder verspaeteter Lauf nichts kaputt.
    ctx.waitUntil(stub(env).erinnere(uhr.datum, uhr.zeit));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    const kopf = cors(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: kopf });

    const haus = stub(env);

    // Offener Betrieb. Bewusst gesetzt und bewusst sichtbar: die Oberflaeche
    // zeigt einen Hinweis, solange er gilt. In dieser Etappe zaehlt allein,
    // dass die Bedienung ohne Huerde funktioniert; die Absicherung ist der
    // naechste Schritt und braucht dann nur diese eine Zeile in wrangler.jsonc.
    //
    // Was das heisst, ohne Beschoenigung: wer die Adresse kennt, sieht die
    // Reservierungen mit Namen und kann die Einteilung aendern.
    const offen = String(env.OFFEN || '').toLowerCase() === 'ja';
    const darf = () => offen || gleich(request.headers.get('x-haus-token'), env.HAUS_TOKEN);
    const heute = new Date().toISOString().slice(0, 10);

    try {
      // Live-Draht fuer den Gaestebildschirm und die Seite im Haus.
      if (url.pathname === '/api/live') {
        if (request.headers.get('Upgrade') !== 'websocket') return json({ ok: false }, 426, kopf);
        // Der Token steht in der Adresse, weil ein WebSocket keine eigenen
        // Kopfzeilen mitschicken kann.
        if (!offen && !gleich(url.searchParams.get('token'), env.HAUS_TOKEN)) {
          return json({ ok: false }, 401, kopf);
        }
        return haus.fetch(request);
      }

      if (url.pathname === '/api/reservierung' && request.method === 'POST') {
        const roh = await request.json().catch(() => ({}));
        if (env.ALT_RESERVIERUNG) {
          // Die Buchung landet dort, wo der Betrieb sie liest. Der eigene
          // Dienst bucht in diesem Modus nicht mit - eine Wahrheit genuegt.
          try {
            const ergebnis = await bucheAlt(env, roh);
            return json(ergebnis, ergebnis.ok ? 200 : 400, kopf);
          } catch (fehler) {
            return json({ ok: false, grund: 'altsystem', detail: String(fehler.message || fehler) }, 502, kopf);
          }
        }
        const ergebnis = await haus.buche(roh, heute, url.origin);
        return json(ergebnis, ergebnis.ok ? 200 : 400, kopf);
      }

      // ---- Links aus den Mails ----------------------------------------
      //
      // Sie liegen bewusst nicht unter /api: der Gast sieht sie in der
      // Adresszeile, und dort soll etwas Lesbares stehen.

      if (url.pathname === '/absage') {
        const token = request.method === 'POST'
          ? await tokenAusKoerper(request)
          : url.searchParams.get('t') || '';
        if (request.method === 'GET') {
          return seite('Reservierung absagen',
            'Möchtest du deine Reservierung wirklich absagen? Wir geben den Tisch dann weiter.',
            { ziel: '/absage', token, text: 'Ja, absagen' });
        }
        if (request.method !== 'POST') return json({ ok: false }, 405, kopf);
        const ergebnis = await haus.gastAbsage(token);
        if (!ergebnis.ok) {
          return seite('Das ging nicht',
            'Diese Reservierung kennen wir nicht mehr. Vielleicht ist sie schon abgesagt oder der Tag ist vorbei. '
            + 'Ruf uns kurz an, dann klären wir es: +43 (0)5572 20 540.', null, 404);
        }
        return seite('Abgesagt',
          ergebnis.schon
            ? 'Diese Reservierung war schon abgesagt. Es ist alles in Ordnung.'
            : 'Danke für die Nachricht. Dein Tisch ist wieder frei, und der Termin verschwindet aus deinem Kalender.');
      }

      // Keine Terminhinweise mehr. Derselbe Weg wie die Absage: erst fragen,
      // dann handeln - Mailprogramme rufen Links im Hintergrund auf, und ein
      // Widerspruch, den niemand erklaert hat, waere ein Zufallsergebnis.
      if (url.pathname === '/termine/aus') {
        const token = request.method === 'POST'
          ? await tokenAusKoerper(request)
          : url.searchParams.get('t') || '';
        if (request.method === 'GET') {
          return seite('Keine Terminhinweise mehr',
            'Sollen wir dir unter deinen Reservierungsbestätigungen keine Veranstaltungshinweise mehr schicken? '
            + 'Deine Reservierungen und die Bestätigungen selbst bleiben davon unberührt.',
            { ziel: '/termine/aus', token, text: 'Ja, keine Hinweise mehr' });
        }
        if (request.method !== 'POST') return json({ ok: false }, 405, kopf);
        const ergebnis = await haus.keineTermine(token);
        if (!ergebnis.ok) {
          return seite('Das ging nicht',
            'Diesen Link kennen wir nicht mehr. Ruf uns kurz an, dann tragen wir es von Hand ein: '
            + '+43 (0)5572 20 540.', null, 404);
        }
        return seite('Eingetragen',
          ergebnis.schon
            ? 'Du bekommst schon bisher keine Terminhinweise. Es bleibt dabei.'
            : 'Erledigt. In deinen künftigen Bestätigungen stehen keine Veranstaltungshinweise mehr.');
      }

      if (url.pathname === '/newsletter/ja') {
        const token = request.method === 'POST'
          ? await tokenAusKoerper(request)
          : url.searchParams.get('t') || '';
        if (request.method === 'GET') {
          return seite('Anmeldung bestätigen',
            'Bestätige hier, dass du die Mittagskarte per E-Mail bekommen möchtest. '
            + 'Abmelden kannst du dich jederzeit mit einem Klick in jeder Mail.',
            { ziel: '/newsletter/ja', token, text: 'Ja, bitte schicken' });
        }
        if (request.method !== 'POST') return json({ ok: false }, 405, kopf);
        const ergebnis = await haus.newsletterJa(token);
        if (!ergebnis.ok) {
          return seite('Das ging nicht',
            'Dieser Link ist abgelaufen oder wurde schon benutzt. Trag dich einfach neu ein.', null, 404);
        }
        return seite('Danke, das war es schon',
          'Du bekommst die Mittagskarte ab jetzt per E-Mail. In jeder Mail steht ein Abmeldelink.');
      }

      if (url.pathname === '/newsletter/weg') {
        const token = request.method === 'POST'
          ? await tokenAusKoerper(request)
          : url.searchParams.get('t') || '';
        if (request.method === 'GET') {
          return seite('Abmelden',
            'Möchtest du die Mittagskarte nicht mehr bekommen? Wir löschen deine Adresse dann vollständig.',
            { ziel: '/newsletter/weg', token, text: 'Ja, abmelden' });
        }
        if (request.method !== 'POST') return json({ ok: false }, 405, kopf);
        const ergebnis = await haus.newsletterWeg(token);
        if (!ergebnis.ok) {
          return seite('Das ging nicht',
            'Diese Adresse haben wir nicht mehr. Dann bekommst du auch keine Mail mehr von uns.', null, 404);
        }
        return seite('Abgemeldet',
          'Deine Adresse ist gelöscht. Wir schreiben dir nicht mehr.');
      }

      // ---- Die Mittagskarte als PDF -----------------------------------

      // Oeffentlich: die Karte selbst. Mit nosniff und ohne Zwischenspeicher -
      // siehe karte.mjs, warum beides nicht verhandelbar ist.
      if (url.pathname === '/mittagskarte.pdf' && request.method === 'GET') {
        const datei = await haus.karte();
        if (!datei) return json({ ok: false, grund: 'keine_karte' }, 404, kopf);
        return new Response(datei, { status: 200, headers: { ...karteKopf(), ...kopf } });
      }

      if (url.pathname === '/api/mittagskarte') {
        if (request.method === 'GET') return json(await haus.karteInfo(), 200, kopf);
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        if (request.method === 'DELETE') return json(await haus.karteWeg(), 200, kopf);
        if (request.method === 'POST') {
          // Die Grenze zuerst am Tor pruefen: einen zu grossen Koerper gar
          // nicht erst einlesen, wenn die Laenge ihn schon verraet.
          const laenge = Number(request.headers.get('content-length') || 0);
          if (laenge > 8 * 1024 * 1024) return json({ ok: false, grund: 'zu_gross' }, 413, kopf);
          const bytes = await request.arrayBuffer();
          const ergebnis = await haus.karteSetzen(bytes);
          return json(ergebnis, ergebnis.ok ? 200 : 400, kopf);
        }
        return json({ ok: false }, 405, kopf);
      }

      // Anmeldung zur Mittagskarte. Eigener Weg, eigener Zweck: sie ist nie
      // Voraussetzung fuer eine Reservierung.
      if (url.pathname === '/api/newsletter' && request.method === 'POST') {
        const roh = await request.json().catch(() => ({}));
        const ergebnis = await haus.newsletterAnmeldung(roh, url.origin);
        return json(ergebnis, ergebnis.ok ? 200 : 400, kopf);
      }

      if (url.pathname === '/api/newsletter/zahlen' && request.method === 'GET') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        return json(await haus.newsletterZahlen(), 200, kopf);
      }

      if (url.pathname === '/api/stand' && request.method === 'GET') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        return json({ ok: true, stand: await haus.stand() }, 200, kopf);
      }

      if (url.pathname === '/api/tisch/sperre' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.setzeTischsperre(body?.id, body?.gesperrt === true), 200, kopf);
      }

      if (url.pathname === '/api/plan' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        const ergebnis = await haus.setzePlan(
          body.floorplan, body.standardEtage, body.blockedTables, body.deckel, body.automatik,
          body.tischAnzeigen
        );
        return json(ergebnis, ergebnis.ok ? 200 : 400, kopf);
      }

      // Laufkundschaft: der Wirt drueckt eine Personenzahl, der Dienst setzt
      // die Gruppe auf den kleinsten passenden freien Tisch - jetzt, nicht
      // zu einer Slotzeit. Nur fuers Haus.
      // Telefonische Reservierung aus der Wirt-Ansicht: vier Angaben genuegen.
      if (url.pathname === '/api/reservierung/einfach' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.legeEinfach(body), 200, kopf);
      }

      // Tagesabschluss und sein Rueckgaengig.
      if (url.pathname === '/api/tag/leeren' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.leereTag(body.datum || jetztImHaus().datum), 200, kopf);
      }
      if (url.pathname === '/api/tag/wiederherstellen' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        return json(await haus.stelleTagWiederHer(), 200, kopf);
      }

      if (url.pathname === '/api/laufkunde' && request.method === 'POST') {
        if (!darf()) return json({ ok: false }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        const hausUhr = jetztImHaus();
        return json(await haus.laufkunde(body.personen, hausUhr.datum, hausUhr.zeit), 200, kopf);
      }

      if (url.pathname === '/api/aktion' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        // Der ganze Mittag faellt aus. Eigener Weg, weil hier Mails
        // hinausgehen - das ist keine Umsortierung im Haus.
        if (body?.art === 'tagesabsage') {
          const ergebnis = await haus.tagAbsage(body.tag, String(body.grund || '').slice(0, 200));
          return json(ergebnis, 200, kopf);
        }
        return json(await haus.aktion(body), 200, kopf);
      }

      if (url.pathname === '/api/reservierung/intern' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.lege(body.reservierung), 200, kopf);
      }

      // ---- Takeaway --------------------------------------------------------

      // Oeffentlich: die bestellbare Karte - Name und Preis, sonst nichts.
      if (url.pathname === '/api/takeaway/karte' && request.method === 'GET') {
        const uhr = jetztImHaus();
        return json(await haus.takeawayKarte(uhr.datum, uhr.zeit, String(url.searchParams.get('datum') || '').slice(0, 10)), 200, kopf);
      }
      // Der Wirt setzt die Karte: die Zeilen aus dem Mittagskarten-PDF.
      if (url.pathname === '/api/takeaway/karte' && request.method === 'POST') {
        if (!darf()) return json({ ok: false }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.setzeTakeawayKarte(String(body.text || '')), 200, kopf);
      }
      // Oeffentlich: eine Bestellung. Die Uhr des Hauses entscheidet ueber
      // Bestellschluss und Abholzeit, nie die des Gastes.
      if (url.pathname === '/api/takeaway/bestellung' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const uhr = jetztImHaus();
        return json(await haus.bestelleTakeaway(body, uhr.datum, uhr.zeit), 200, kopf);
      }
      if (url.pathname === '/api/takeaway/aktion' && request.method === 'POST') {
        if (!darf()) return json({ ok: false }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.takeawayAktion(body), 200, kopf);
      }
      if (url.pathname === '/api/takeaway/protokoll' && request.method === 'GET') {
        if (!darf()) return json({ ok: false }, 401, kopf);
        return json(await haus.takeawayProtokoll(), 200, kopf);
      }
      // Wer im Haus fertigmeldet. Umgestellt wird das in der Wirt-Ansicht -
      // die Kueche bekommt die Einstellung nur mit.
      if (url.pathname === '/api/takeaway/fertig-wer' && request.method === 'POST') {
        if (!darf()) return json({ ok: false }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.setzeFertigWer(String(body?.wer || '')), 200, kopf);
      }

      // Tageszettel und Wochenbericht von Hand ausloesen - fuer den Test und
      // fuer den Wirt, der den Zettel jetzt sehen will statt morgen um acht.
      if (url.pathname === '/api/tageszettel' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        return json(await haus.tageszettel(), 200, kopf);
      }
      if (url.pathname === '/api/wochenbericht' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        return json(await haus.wochenbericht(), 200, kopf);
      }

      // Warteliste: der Gast traegt sich ein, wenn der Mittag voll ist.
      if (url.pathname === '/api/warteliste' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        return json(await haus.wartelisteEintragen(body), 200, kopf);
      }

      // Geschlossene Tage: lesen darf jeder (die Gaesteseite graut sie aus),
      // setzen nur das Haus.
      if (url.pathname === '/api/geschlossen' && request.method === 'GET') {
        return json(await haus.geschlosseneTage(), 200, kopf);
      }
      if (url.pathname === '/api/tag/zu' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.setzeTagZu(body?.datum, body?.zu === true), 200, kopf);
      }

      // Oeffnungszeiten: lesen darf jeder (die Gaesteseite zeigt sie an),
      // setzen nur das Haus. Sie steuern die Anzeige - die Buchung selbst
      // laeuft ueber die verlinkte Reservierungsseite.
      if (url.pathname === '/api/oeffnung' && request.method === 'GET') {
        return json(await haus.oeffnung(), 200, kopf);
      }
      if (url.pathname === '/api/oeffnung' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        const ergebnis = await haus.setzeOeffnung(body?.von, body?.bis);
        return json(ergebnis, ergebnis.ok ? 200 : 400, kopf);
      }

      // Eigene Termine: lesen darf jeder (sie stehen ohnehin auf der
      // Gaesteseite), schreiben nur das Haus.
      if (url.pathname === '/api/events' && request.method === 'GET') {
        return json(await haus.eigeneEvents(), 200, kopf);
      }
      if (url.pathname === '/api/events' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.eigenesEventAnlegen(body), 200, kopf);
      }
      if (url.pathname === '/api/events/entfernen' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.eigenesEventEntfernen(body?.id), 200, kopf);
      }

      // Der oeffentliche Teil des VAPID-Schluessels. Er gehoert in jede Seite,
      // die sich anmelden will - er ist der Absenderausweis, kein Geheimnis.
      if (url.pathname === '/api/push/schluessel' && request.method === 'GET') {
        return json({
          ok: true,
          schluessel: env.VAPID_OEFFENTLICH || '',
          moeglich: Boolean(env.VAPID_OEFFENTLICH && env.VAPID_PRIVAT)
        }, 200, kopf);
      }
      // An- und Abmelden. Kein Hausschluessel: der Bestellschluessel des Gastes
      // ist der Ausweis, genau wie bei seiner Statusabfrage. Er kann damit
      // ausschliesslich sein eigenes Geraet eintragen.
      if (url.pathname === '/api/push/anmelden' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const token = String(body?.t || '');
        if (token.length < 8) return json({ ok: false, grund: 'unbekannt' }, 404, kopf);
        return json(await haus.pushAnmelden(token, body?.anmeldung), 200, kopf);
      }
      if (url.pathname === '/api/push/abmelden' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const token = String(body?.t || '');
        if (token.length < 8) return json({ ok: false, grund: 'unbekannt' }, 404, kopf);
        return json(await haus.pushAbmelden(token), 200, kopf);
      }

      // Oeffentlich mit Schluessel: der Stand der eigenen Bestellung. Kein
      // Token des Hauses - der Schluessel der Bestellung ist der Ausweis, und
      // er gibt nur ueber diese eine Bestellung Auskunft.
      if (url.pathname === '/api/takeaway/status' && request.method === 'GET') {
        const token = String(url.searchParams.get('t') || '');
        if (token.length < 8) return json({ ok: false, grund: 'unbekannt' }, 404, kopf);
        const stand = await haus.takeawayStatus(token);
        return json(stand, stand.ok ? 200 : 404, kopf);
      }

      // Intern: SMS an- oder abschalten. Sie kostet Geld, also gehoert der
      // Schalter dem Wirt und keiner Konfigurationsdatei.
      if (url.pathname === '/api/sms' && request.method === 'POST') {
        if (!darf()) return json({ ok: false }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.setzeSms(body?.an === true), 200, kopf);
      }

      // Intern: der Kuechenzettel. Wie viel wird heute ungefaehr gebraucht.
      if (url.pathname === '/api/kuechenzettel' && request.method === 'GET') {
        if (!darf()) return json({ ok: false }, 401, kopf);
        const datum = url.searchParams.get('datum') || jetztImHaus().datum;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return json({ ok: false, grund: 'datum' }, 400, kopf);
        return json(await haus.kuechenzettel(datum), 200, kopf);
      }

      // Oeffentlich: das eigene Gastprofil einsehen und widerrufen.
      //
      // Ohne diesen Weg waere die Einwilligung wertlos - ein Widerruf muss so
      // einfach sein wie die Zustimmung (Art. 7 Abs. 3 DSGVO). Kein Token:
      // wer seine eigene Adresse nennt, bekommt Auskunft ueber genau diese
      // eine Adresse. Mehr als "so oft warst du da" steht ohnehin nicht drin.
      if (url.pathname === '/api/gast' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const geprueft = pruefeKontakt(body?.kontakt);
        if (!geprueft.ok) return json({ ok: false, grund: geprueft.grund }, 400, kopf);
        return json(await haus.gastAuskunft(geprueft.kontakt, body?.widerruf || null), 200, kopf);
      }

      // Oeffentlich: die Ampel - wie voll ist der Mittag heute. Nur Zahlen
      // und eine Stufe; sie steht sichtbar auf der Gaesteseite.
      if (url.pathname === '/api/ampel' && request.method === 'GET') {
        const hausUhr = jetztImHaus();
        const datum = url.searchParams.get('datum') || hausUhr.datum;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return json({ ok: false, grund: 'datum' }, 400, kopf);
        // Am Wochenende gibt es keinen Mittag - dann gibt es auch keine Ampel.
        const wochentag = new Date(`${datum}T12:00:00Z`).getUTCDay();
        if (wochentag === 0 || wochentag === 6) return json({ ok: true, automatik: true, stufe: null }, 200, kopf);
        // Fuer heute zaehlen nur die Zeiten, die noch vor uns liegen; ein
        // vergangener Tag ist vorbei, ein kuenftiger noch ganz offen.
        const jetzt = datum === hausUhr.datum ? hausUhr.zeit : (datum < hausUhr.datum ? '23:59' : null);
        return json(await haus.ampel(datum, jetzt), 200, kopf);
      }

      // Oeffentlich: was ist wann noch frei. Enthaelt keine Namen - diese
      // Antwort geht an die Gaesteseite.
      if (url.pathname === '/api/frei' && request.method === 'GET') {
        const datum = url.searchParams.get('datum') || heute;
        const personen = Math.max(1, Math.min(24, Number(url.searchParams.get('personen')) || 2));
        const geprueft = pruefeAnfrage({ name: 'xx', date: datum, time: '12:00', guests: personen }, { heute });
        if (!geprueft.ok) return json({ ok: false, grund: geprueft.grund }, 400, kopf);
        // Brueckenbetrieb: ist das Altsystem konfiguriert, zaehlen dessen
        // Tage und Zeiten - die Oberflaeche merkt keinen Unterschied.
        if (env.ALT_RESERVIERUNG) {
          try { return json(await holeAltFrei(env, datum), 200, kopf); }
          catch (fehler) { return json({ ok: false, grund: 'altsystem', detail: String(fehler.message || fehler) }, 502, kopf); }
        }
        return json(await haus.frei(datum, personen), 200, kopf);
      }

      // Hier fragt die Oberflaeche, ob sie ueberhaupt nach einem Schluessel
      // fragen muss - und ob sie den Hinweis auf den offenen Betrieb zeigt.
      if (url.pathname === '/api/gesundheit') {
        return json({ ok: true, dienst: 'wirtschaft-dornbirn', offen }, 200, kopf);
      }

      return json({ ok: false, grund: 'unbekannt' }, 404, kopf);
    } catch (fehler) {
      // Nie die interne Meldung nach aussen geben.
      console.error('Fehler', fehler?.stack || fehler);
      return json({ ok: false, grund: 'fehler' }, 500, kopf);
    }
  }
};
