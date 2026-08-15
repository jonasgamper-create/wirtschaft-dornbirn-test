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
  AUFBEWAHRUNG_TAGE, machId, planTaugt, pruefeAnfrage, raeumeAuf, verteile, wendeAktionAn
} from './haus-logik.mjs';
import standardPlan from '../../site/data/floorplan.json';

const HAUS = 'wirtschaft-dornbirn';
/** Notbremse gegen Fluten. Ein Haus dieser Groesse bucht das nie aus. */
const ONLINE_PRO_STUNDE = 40;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extra }
  });

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
    'access-control-allow-methods': 'GET,POST,OPTIONS',
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
    this.ctx.acceptWebSocket(server);
    server.send(JSON.stringify({ art: 'start', stand: this.#stand() }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws) {
    // Der Bildschirm fragt nur nach dem aktuellen Stand; er schickt nie Daten.
    ws.send(JSON.stringify({ art: 'stand', stand: this.#stand() }));
  }

  webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch { /* schon zu */ }
  }

  #stand() {
    return {
      floorplan: this.#plan(),
      parties: this.#alle(),
      blockedTables: this.#lies('blocked', []),
      standardEtage: this.#lies('standardEtage', null),
      stand: this.#lies('version', 0)
    };
  }

  #meldeAenderung() {
    const version = (Number(this.#lies('version', 0)) || 0) + 1;
    this.#schreib('version', version);
    const paket = JSON.stringify({ art: 'aenderung', stand: this.#stand() });
    for (const socket of this.ctx.getWebSockets()) {
      try { socket.send(paket); } catch { /* gleich weg, kein Grund zum Abbruch */ }
    }
  }

  // ---- Oeffentlich: eine Onlinebuchung -------------------------------------

  async buche(roh, heute) {
    const gecheckt = pruefeAnfrage(roh, { heute });
    if (!gecheckt.ok) return { ok: false, grund: gecheckt.grund };

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

    const { result, floorplan } = verteile(anfrage, {
      config: this.#plan(),
      parties,
      blocked: this.#lies('blocked', []),
      standardEtage: this.#lies('standardEtage', null),
      deckel: this.#lies('deckel', null)
    });

    const nummer = (Number(this.#lies('zaehler', 0)) || 0) + 1;
    this.#schreib('zaehler', nummer);
    const party = {
      id: machId(Date.parse(`${anfrage.date}T${anfrage.time}:00Z`), nummer),
      ...anfrage,
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
        ok: true, angenommen: true, tisch: null, grund: result.reason,
        alternativen: (result.alternatives || []).map(entry => entry.startsAt.slice(11)),
        reservierung: party
      };
    }
    const tisch = floorplan.tables.find(table => table.id === result.tableIds[0]);
    return {
      ok: true, angenommen: true,
      tisch: result.numbers.join(' + '),
      etage: tisch?.levelName || null,
      reservierung: party
    };
  }

  // ---- Nur fuer das Haus ---------------------------------------------------

  async stand() { return this.#stand(); }

  async setzePlan(config, standardEtage, blocked, deckel) {
    // Einen unbrauchbaren Plan anzunehmen waere schlimmer als ihn abzulehnen:
    // der Dienst wuerde ab dann jede Onlinebuchung ins Leere zuweisen.
    if (!planTaugt(config)) return { ok: false, grund: 'plan' };
    this.#schreib('floorplan', config);
    if (standardEtage !== undefined) this.#schreib('standardEtage', standardEtage);
    if (Array.isArray(blocked)) this.#schreib('blocked', blocked);
    if (deckel !== undefined) this.#schreib('deckel', deckel);
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
    // Nur weiterlaufen lassen, solange ueberhaupt Daten da sind.
    if (behalten.length) await this.ctx.storage.setAlarm(Date.now() + 24 * 60 * 60 * 1000);
  }
}

// ---- Der Worker davor ------------------------------------------------------

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
    const darf = () => gleich(request.headers.get('x-haus-token'), env.HAUS_TOKEN);
    const heute = new Date().toISOString().slice(0, 10);

    try {
      // Live-Draht fuer den Gaestebildschirm und die Seite im Haus.
      if (url.pathname === '/api/live') {
        if (request.headers.get('Upgrade') !== 'websocket') return json({ ok: false }, 426, kopf);
        // Der Token steht in der Adresse, weil ein WebSocket keine eigenen
        // Kopfzeilen mitschicken kann.
        if (!gleich(url.searchParams.get('token'), env.HAUS_TOKEN)) return json({ ok: false }, 401, kopf);
        return haus.fetch(request);
      }

      if (url.pathname === '/api/reservierung' && request.method === 'POST') {
        const roh = await request.json().catch(() => ({}));
        const ergebnis = await haus.buche(roh, heute);
        return json(ergebnis, ergebnis.ok ? 200 : 400, kopf);
      }

      if (url.pathname === '/api/stand' && request.method === 'GET') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        return json({ ok: true, stand: await haus.stand() }, 200, kopf);
      }

      if (url.pathname === '/api/plan' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        const ergebnis = await haus.setzePlan(body.floorplan, body.standardEtage, body.blockedTables, body.deckel);
        return json(ergebnis, ergebnis.ok ? 200 : 400, kopf);
      }

      if (url.pathname === '/api/aktion' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.aktion(body), 200, kopf);
      }

      if (url.pathname === '/api/reservierung/intern' && request.method === 'POST') {
        if (!darf()) return json({ ok: false, grund: 'token' }, 401, kopf);
        const body = await request.json().catch(() => ({}));
        return json(await haus.lege(body.reservierung), 200, kopf);
      }

      if (url.pathname === '/api/gesundheit') return json({ ok: true, dienst: 'wirtschaft-dornbirn' }, 200, kopf);

      return json({ ok: false, grund: 'unbekannt' }, 404, kopf);
    } catch (fehler) {
      // Nie die interne Meldung nach aussen geben.
      console.error('Fehler', fehler?.stack || fehler);
      return json({ ok: false, grund: 'fehler' }, 500, kopf);
    }
  }
};
