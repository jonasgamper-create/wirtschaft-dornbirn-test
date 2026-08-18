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
import {
  AUFBEWAHRUNG_TAGE, ampelFuer, freieZeiten, machId, planTaugt, pruefeAnfrage, raeumeAuf, verteile, wendeAktionAn
} from './haus-logik.mjs';
import standardPlan from '../../site/data/floorplan.json';
import { shift } from '../../site/table-assignment.mjs';
import { pruefeKontakt } from './kontakt.mjs';
import {
  bestaetige, machEintrag, pruefeAnmeldung, raeumeAufOffene, sperrschluessel
} from './newsletter.mjs';
import {
  absage as absageMail, baueTermin, bestaetigung as bestaetigungsMail, brevoPaket,
  escapeHtml, newsletterFrage, sendeMail, termin_uid
} from './mail.mjs';
import { inTeile, karteKopf, pruefeKarte, zusammen } from './karte.mjs';

const HAUS = 'wirtschaft-dornbirn';
/** Notbremse gegen Fluten. Ein Haus dieser Groesse bucht das nie aus. */
const ONLINE_PRO_STUNDE = 40;

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
    });
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
    const rolle = new URL(request.url).searchParams.get('rolle') === 'schirm' ? 'schirm' : 'haus';
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
    const fuerRolle = party => (rolle === 'schirm' ? (({ kontakt, ...rest }) => rest)(party) : party);
    return {
      floorplan: this.#plan(),
      // Ohne Token: er ist der Schluessel zur Absage und geht nur an den Gast
      // in seiner eigenen Mail. Im Haus wird er nie gebraucht.
      parties: this.#alle().map(({ token, ...party }) => fuerRolle(party)),
      blockedTables: this.#lies('blocked', []),
      standardEtage: this.#lies('standardEtage', null),
      // Automatik aus heisst: Anfragen kommen an, aber das Haus teilt ein.
      automatik: this.#lies('automatik', true) !== false,
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

    const nummer = (Number(this.#lies('zaehler', 0)) || 0) + 1;
    this.#schreib('zaehler', nummer);
    const id = machId(Date.parse(`${anfrage.date}T${anfrage.time}:00Z`), nummer);
    const party = {
      id,
      ...anfrage,
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

    // Die Bestaetigung geht raus, nachdem die Antwort beim Gast ist. Ein
    // langsamer oder gestoerter Mailversand darf die Reservierung nicht
    // aufhalten und schon gar nicht scheitern lassen.
    this.ctx.waitUntil(this.#schickeBestaetigung(party, {
      tisch: result.numbers.join(' + '),
      etage: tisch?.levelName || null,
      basis
    }));

    return {
      ok: true, angenommen: true,
      tisch: result.numbers.join(' + '),
      etage: tisch?.levelName || null,
      reservierung: ohneGeheimnis(party)
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
    const inhalt = bestaetigungsMail({
      name: party.name,
      tag: party.date,
      zeit: party.time,
      gaeste: party.guests,
      tisch,
      etage,
      absageLink: `${basis}/absage?t=${party.token}`
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
    return { ok: true, reservierung: ohneGeheimnis(storniert) };
  }

  /**
   * Wolfgang sagt einen ganzen Mittag ab. Jeder Gast mit Mailadresse bekommt
   * die Absage samt zurueckgezogenem Termin; wer nur eine Nummer hinterlassen
   * hat, steht in der Anrufliste. Diese Liste ist der ehrliche Teil: sie
   * verschwindet nicht, nur weil der Rest automatisch ging.
   */
  async tagAbsage(tag, grund) {
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
    const { email, quelle } = gecheckt.anmeldung;

    // Wer widerrufen hat, wird nicht wieder angeschrieben - auch nicht, wenn
    // jemand anderes die Adresse eintraegt.
    if (await this.#gesperrt(email)) return { ok: true, gesperrt: true };

    const vorhanden = this.#newsletterEiner('email', email);
    if (vorhanden?.status === 'bestaetigt') return { ok: true, schon: true };

    const eintrag = vorhanden
      ? { ...vorhanden, angefragtAm: new Date().toISOString() }
      : machEintrag({ email, quelle, token: this.#token(), jetzt: new Date().toISOString() });
    this.#newsletterSichere(eintrag);

    this.ctx.waitUntil((async () => {
      const absender = String(this.env?.BREVO_ABSENDER || '');
      if (!absender) return;
      const inhalt = newsletterFrage({
        jaLink: `${basis}/newsletter/ja?t=${eintrag.token}`,
        wortlaut: eintrag.wortlaut
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
      offen: alle.filter(eintrag => eintrag.status !== 'bestaetigt').length
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
    return { ok: true, da: Boolean(info), ...(info || {}) };
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

  async setzePlan(config, standardEtage, blocked, deckel, automatik) {
    // Einen unbrauchbaren Plan anzunehmen waere schlimmer als ihn abzulehnen:
    // der Dienst wuerde ab dann jede Onlinebuchung ins Leere zuweisen.
    if (!planTaugt(config)) return { ok: false, grund: 'plan' };
    this.#schreib('floorplan', config);
    if (standardEtage !== undefined) this.#schreib('standardEtage', standardEtage);
    if (Array.isArray(blocked)) this.#schreib('blocked', blocked);
    if (deckel !== undefined) this.#schreib('deckel', deckel);
    if (automatik !== undefined) this.#schreib('automatik', automatik !== false);
    this.#meldeAenderung();
    return { ok: true, stand: this.#stand() };
  }

  async aktion(befehl) {
    const ergebnis = wendeAktionAn(this.#alle(), befehl);
    if (!ergebnis.ok) return { ok: false, grund: ergebnis.grund };
    this.#ersetzeAlle(ergebnis.parties);
    this.#meldeAenderung();
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
    if (behalten.length || offeneAnmeldungen) {
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
  return { datum: `${wert('year')}-${wert('month')}-${wert('day')}`, zeit: `${wert('hour')}:${wert('minute')}` };
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

      if (url.pathname === '/api/plan' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        const ergebnis = await haus.setzePlan(
          body.floorplan, body.standardEtage, body.blockedTables, body.deckel, body.automatik
        );
        return json(ergebnis, ergebnis.ok ? 200 : 400, kopf);
      }

      // Laufkundschaft: der Wirt drueckt eine Personenzahl, der Dienst setzt
      // die Gruppe auf den kleinsten passenden freien Tisch - jetzt, nicht
      // zu einer Slotzeit. Nur fuers Haus.
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
