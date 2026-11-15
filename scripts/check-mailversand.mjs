// Pruefung: den Mailversand selbst auf das Brevo-Konto des Hauses umstellen
// (15.11.2026, server/src/mailversand.mjs, Wirt-Ansicht "haus -> Mailversand").
//
// Drei Ebenen:
//   1. die reinen Bausteine (Eingaben, Brevos Antworten, Domains);
//   2. die Pruefung mit gespieltem Brevo - jede Weggabelung einmal;
//   3. der Dienst selbst (Durable Object) mit nachgebauter Datenbank
//      (node:sqlite) und gespieltem Brevo: vorher, pruefen, umstellen, die
//      echten Mails, die Sicherung, zurueck - und die Testumgebung.
// Dazu der Quelltext: jeder Versand laeuft ueber denselben Weg, und die
// Wirt-Ansicht laesst den Schluessel nirgends liegen.
//
// Kein Netz, keine echten Schluessel, keine echten Adressen.

import { readFile, readFileSync } from 'node:fs';
import { readFile as liesDatei } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import {
  ABSENDER_NAME, HAUS_ABSENDER, HAUS_DOMAINS, TEST_ABSENDER, VERSUCHE_JE_STUNDE, absenderFuer, bewerteDomains,
  deuteBrevo, gueltigeEinrichtung, kontoKurz, liesAdresse, liesSchluessel, pruefeVersand, pruefungGilt, schluesselEnde
} from '../server/src/mailversand.mjs';
import { TABELLEN } from '../server/src/sicherung.mjs';

void readFile;
let fehler = 0;
const check = (was, ok) => { if (!ok) { fehler += 1; console.error(`  ✗ ${was}`); } };

const SCHLUESSEL_HAUS = `xkeysib-${'a'.repeat(64)}-HAUSschluessel01`;
const SCHLUESSEL_JONAS = `xkeysib-${'b'.repeat(64)}-JONASschluessel2`;
const PRIVAT = 'privat@example.org';
const SARAH = 'sarah@example.org';

// ---- 1. Bausteine ------------------------------------------------------------
check('Schluessel: Leerzeichen und Umbrueche vom Kopieren fallen weg',
  liesSchluessel(`  ${SCHLUESSEL_HAUS.slice(0, 30)}\n${SCHLUESSEL_HAUS.slice(30)}  `).schluessel === SCHLUESSEL_HAUS);
check('Schluessel: leer abgelehnt', liesSchluessel('   ').grund === 'leer');
check('Schluessel: SMTP-Schluessel erkannt', liesSchluessel(`xsmtpsib-${'c'.repeat(64)}`).grund === 'smtp_schluessel');
check('Schluessel: zu kurz abgelehnt', liesSchluessel('xkeysib-kurz').grund === 'form');
check('Schluessel: Steuerzeichen abgelehnt', liesSchluessel(`xkeysib-${'d'.repeat(40)}\u0000x`).grund === 'form');
check('Adresse: gueltig, klein geschrieben', liesAdresse(' Sarah@Example.ORG ').an === SARAH);
check('Adresse: ohne @ abgelehnt', !liesAdresse('sarah.example.org').ok);
check('Adresse: zwei Adressen abgelehnt', !liesAdresse('a@b.at, c@d.at').ok);
check('Schluesselende zeigt nur vier Zeichen', schluesselEnde(SCHLUESSEL_HAUS) === `…${SCHLUESSEL_HAUS.slice(-4)}` && !schluesselEnde(SCHLUESSEL_HAUS).includes('xkeysib'));
check('Schluesselende bei Unsinn leer', schluesselEnde('abc') === '');

check('Brevo: falscher Schluessel', deuteBrevo(401, 'unauthorized Key not found') === 'schluessel_ungueltig');
check('Brevo: IP-Sperre', deuteBrevo(401, 'unauthorized We have detected you are using an unrecognised IP address 104.28.1.1. If you performed this action make sure to add the new IP address in this link: https://app.brevo.com/security/authorised_ips') === 'ip_gesperrt');
check('Brevo: Konto nicht freigeschaltet', deuteBrevo(403, 'permission_denied Unable to send email. Your SMTP account is not yet activated. Please contact us at contact@brevo.com to get it activated.') === 'konto_nicht_freigeschaltet');
check('Brevo: fehlende Rechte', deuteBrevo(401, 'permission_denied Access denied for resource') === 'keine_berechtigung');
check('Brevo: Absender nicht gueltig', deuteBrevo(400, 'invalid_parameter Sending has been rejected because the sender you used x@y.at is not valid. Validate your sender or authenticate your domain') === 'absender_ungueltig');
check('Brevo: zu viele Anfragen', deuteBrevo(429, 'too_many_requests') === 'zu_viele');
check('Brevo: Stoerung', deuteBrevo(502, '') === 'brevo_stoerung');
check('Brevo: Konto gesperrt', deuteBrevo(403, 'unauthorized Your account has been suspended') === 'konto_gesperrt');
check('Brevo: Schluessel abgeschaltet', deuteBrevo(401, 'unauthorized API key is disabled') === 'schluessel_ungueltig');
check('Brevo: Absender ungueltig auch ohne 400', deuteBrevo(403, 'Sending has been rejected because the sender you used is not valid') === 'absender_ungueltig');
check('Brevo: unbekannter 401-Text bleibt beim Status', deuteBrevo(401, 'unauthorized something else') === 'schluessel_ungueltig' && deuteBrevo(0, 'unauthorized something else') === 'brevo_fehler');

// Jede Zuordnung einzeln - dieselbe Regel nimmt der Dienst fuer jede Mail.
check('Zweck: Reservierung/Takeaway -> service@', absenderFuer(HAUS_ABSENDER, 'service') === 'service@wirtschaft-dornbirn.at');
check('Zweck: Warteliste wirtschaft -> veranstaltungen@', absenderFuer(HAUS_ABSENDER, 'warteliste', 'wirtschaft') === 'veranstaltungen@wirtschaft-dornbirn.at');
check('Zweck: Warteliste Kulturhaus -> tickets@', absenderFuer(HAUS_ABSENDER, 'warteliste', 'kulturhaus') === 'tickets@eugen.family');
check('Zweck: Terminliste -> uri@', absenderFuer(HAUS_ABSENDER, 'events') === 'uri@eugen.family');
check('Zweck: alles andere -> willkommen@', absenderFuer(HAUS_ABSENDER, 'haupt') === 'willkommen@wirtschaft-dornbirn.at');
check('Testmails tragen den Namen wie im Betrieb', TEST_ABSENDER.every(t => t.name === ABSENDER_NAME) && ABSENDER_NAME === 'Wirtschaft Dornbirn');

const beide = { domains: [
  { domain_name: 'Wirtschaft-Dornbirn.at', authenticated: true, verified: true },
  { domain_name: 'eugen.family', authenticated: true, verified: true }
] };
check('Domains: beide beglaubigt', bewerteDomains(beide).every(d => d.da && d.beglaubigt));
check('Domains: eine nicht beglaubigt', bewerteDomains({ domains: [beide.domains[0], { domain_name: 'eugen.family', authenticated: false }] })[1].beglaubigt === false);
check('Domains: eine fehlt', bewerteDomains({ domains: [beide.domains[0]] })[1].da === false);
check('Domains: nur "authenticated: true" zaehlt', bewerteDomains({ domains: [{ domain_name: 'wirtschaft-dornbirn.at', authenticated: 'true' }] })[0].beglaubigt === false);
check('Domains: kaputte Antwort = keine Aussage', bewerteDomains({}) === null);
check('Konto: Firmenname vor Personenname', kontoKurz({ companyName: 'wirtschaft', firstName: 'Sarah', email: 'X@Y.AT' }).name === 'wirtschaft');
check('Konto: Adresse klein', kontoKurz({ email: 'Veranstaltungen@Wirtschaft-Dornbirn.at' }).email === 'veranstaltungen@wirtschaft-dornbirn.at');

const voll = { schluessel: SCHLUESSEL_HAUS, absender: { ...HAUS_ABSENDER } };
check('Einrichtung: vollstaendig gilt', Boolean(gueltigeEinrichtung(voll)));
check('Einrichtung: ohne Schluessel gilt nicht', !gueltigeEinrichtung({ ...voll, schluessel: '' }));
check('Einrichtung: mit fehlendem Absender gilt nicht', !gueltigeEinrichtung({ ...voll, absender: { ...HAUS_ABSENDER, events: '' } }));
{
  const alt = { ...HAUS_ABSENDER };
  delete alt.events;
  const g = gueltigeEinrichtung({ schluessel: SCHLUESSEL_HAUS, absender: alt });
  check('Einrichtung: ein spaeter dazugekommener Zweck bekommt die Vorgabe statt still wegzufallen', g?.absender?.events === HAUS_ABSENDER.events);
}
check('Pruefung gilt bis zum Ablauf', pruefungGilt({ schluessel: SCHLUESSEL_HAUS, gueltigBis: new Date(Date.now() + 60000).toISOString() }));
check('Pruefung abgelaufen', !pruefungGilt({ schluessel: SCHLUESSEL_HAUS, gueltigBis: new Date(Date.now() - 1).toISOString() }));

// Die Absender muessen die aus dem Hausentscheid sein - Wort fuer Wort.
{
  const doku = await liesDatei('docs/mailadressen-entscheidung.md', 'utf8');
  const wert = name => (doku.match(new RegExp('`' + name + '`\\s*(?:=|auf)\\s*`([^`]+)`')) || [])[1];
  check('Hausabsender wie im Entscheid (BREVO_ABSENDER)', wert('BREVO_ABSENDER') === HAUS_ABSENDER.haupt);
  check('Service wie im Entscheid', wert('ABSENDER_SERVICE') === HAUS_ABSENDER.service);
  check('Warteliste wie im Entscheid', wert('ABSENDER_WARTELISTE') === HAUS_ABSENDER.warteliste);
  check('Kulturhaus wie im Entscheid', wert('ABSENDER_KULTURHAUS') === HAUS_ABSENDER.kulturhaus);
  check('Terminliste wie im Entscheid', wert('EVENTS_ABSENDER') === HAUS_ABSENDER.events);
  check('Von jeder Hausadresse eine Testmail', Object.values(HAUS_ABSENDER).every(a => TEST_ABSENDER.some(t => t.email === a)) && TEST_ABSENDER.length === 5);
  check('Jede Domain des Hauses kommt vor', HAUS_DOMAINS.every(d => TEST_ABSENDER.some(t => t.email.endsWith(`@${d}`))));
}

// ---- 2. Die Pruefung mit gespieltem Brevo -----------------------------------
function brevo({ konto = 'ok', domains = 'beide', sende = [] } = {}) {
  const aufrufe = [];
  const antwort = (status, daten) => new Response(JSON.stringify(daten), { status, headers: { 'content-type': 'application/json' } });
  const fetchImpl = async (url, init = {}) => {
    const pfad = String(url).replace('https://api.brevo.com/v3', '');
    aufrufe.push({ pfad, schluessel: init.headers?.['api-key'], koerper: init.body ? JSON.parse(init.body) : null });
    if (konto === 'netz') throw new TypeError('fetch failed');
    if (pfad === '/account') {
      if (konto === 'ok') return antwort(200, { email: 'veranstaltungen@wirtschaft-dornbirn.at', companyName: 'wirtschaft' });
      if (konto === 'falsch') return antwort(401, { code: 'unauthorized', message: 'Key not found' });
      if (konto === 'ip') return antwort(401, { code: 'unauthorized', message: 'We have detected you are using an unrecognised IP address 104.28.1.1.' });
      if (konto === 'rechte') return antwort(401, { code: 'permission_denied', message: 'Access denied for resource' });
      if (konto === 'unklar') return antwort(401, { code: 'unauthorized', message: 'Some wording nobody has seen yet' });
      if (konto === 'gesperrt') return antwort(403, { code: 'permission_denied', message: 'Your account has been suspended' });
    }
    if (pfad === '/senders/domains') {
      if (domains === 'rechte') return antwort(401, { code: 'permission_denied', message: 'Access denied for resource' });
      if (domains === 'beide') return antwort(200, beide);
      if (domains === 'offen') return antwort(200, { domains: [beide.domains[0], { domain_name: 'eugen.family', authenticated: false }] });
      if (domains === 'fehlt') return antwort(200, { domains: [beide.domains[1]] });
    }
    if (pfad === '/smtp/email') {
      const n = aufrufe.filter(a => a.pfad === '/smtp/email').length - 1;
      const art = sende[n] || 'ok';
      if (art === 'ok') return antwort(201, { messageId: `<${n}@brevo>` });
      if (art === 'absender') return antwort(400, { code: 'invalid_parameter', message: 'Sending has been rejected because the sender you used is not valid. Validate your sender or authenticate your domain' });
      if (art === 'frei') return antwort(403, { code: 'permission_denied', message: 'Unable to send email. Your SMTP account is not yet activated.' });
      if (art === 'ip') return antwort(401, { code: 'unauthorized', message: 'unrecognised IP address' });
      if (art === 'ohneSchluessel') return antwort(401, { code: 'unauthorized', message: 'Key not found' });
    }
    return antwort(404, { code: 'not_found', message: 'no' });
  };
  return { fetchImpl, aufrufe, mails: () => aufrufe.filter(a => a.pfad === '/smtp/email') };
}

{
  const b = brevo();
  const r = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: b.fetchImpl });
  const mails = b.mails();
  check('Alles gut: bestanden', r.ok === true);
  check('Alles gut: von jeder der fuenf Adressen eine Testmail', mails.length === 5 && Object.values(HAUS_ABSENDER).every(a => mails.some(m => m.koerper.sender.email === a)));
  check('Alles gut: zuerst der Hausabsender, zuletzt die Terminliste', mails[0]?.koerper.sender.email === HAUS_ABSENDER.haupt && mails[4]?.koerper.sender.email === HAUS_ABSENDER.events);
  check('Alles gut: beide an die angegebene Adresse', mails.every(m => m.koerper.to[0].email === SARAH && m.koerper.to.length === 1));
  check('Alles gut: jeder Aufruf mit dem neuen Schluessel', b.aufrufe.every(a => a.schluessel === SCHLUESSEL_HAUS));
  check('Alles gut: Konto erkannt', r.konto?.name === 'wirtschaft');
  check('Alles gut: Testmail nennt ihren Absender und erklaert sich', /Testmail 1 von 5 – Absender willkommen@/.test(mails[0]?.koerper.subject) && /nichts geändert/.test(mails[0]?.koerper.textContent) && /alle 5 Testmails/.test(mails[0]?.koerper.textContent));
}
for (const [fall, opt, grund] of [
  ['Falscher Schluessel', { konto: 'falsch' }, 'schluessel_ungueltig'],
  ['IP-Sperre', { konto: 'ip' }, 'ip_gesperrt'],
  ['Netz weg', { konto: 'netz' }, 'netz'],
  ['Domain nicht beglaubigt', { domains: 'offen' }, 'nicht_beglaubigt'],
  ['Domain fehlt', { domains: 'fehlt' }, 'domain_fehlt']
]) {
  const b = brevo(opt);
  const r = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: b.fetchImpl });
  check(`${fall}: abgelehnt mit ${grund} (war ${r.grund})`, r.ok === false && r.grund === grund);
  check(`${fall}: keine Testmail`, b.mails().length === 0);
}
{
  const b = brevo({ konto: 'rechte', domains: 'rechte' });
  const r = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: b.fetchImpl });
  check('Eingeschraenkter Schluessel: Testmails entscheiden', r.ok === true && b.mails().length === 5);
  check('Eingeschraenkter Schluessel: Domains als unbekannt gemeldet', r.schritte.some(s => s.was === 'domains' && s.ok === null));
}
{
  // Wie Brevo einen eingeschraenkten Schluessel am Konto abweist, ist nicht
  // belegt: ein unbekannter Text bricht nicht ab - die Testmails entscheiden.
  const b = brevo({ konto: 'unklar', domains: 'rechte' });
  const r = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: b.fetchImpl });
  check('Unklare Abweisung am Konto: kein Abbruch, Testmails entscheiden', r.ok === true && b.mails().length === 5);
  const f = brevo({ konto: 'unklar', domains: 'rechte', sende: ['ohneSchluessel'] });
  const rf = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: f.fetchImpl });
  check('Unklare Abweisung, dann Schluessel unbekannt bei der Testmail: abgelehnt', rf.ok === false && rf.grund === 'schluessel_ungueltig');
  const g = brevo({ konto: 'gesperrt' });
  check('Gesperrtes Konto: abgelehnt ohne Testmail', (await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: g.fetchImpl })).grund === 'konto_gesperrt' && g.mails().length === 0);
  const h = brevo();
  const rh = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: h.fetchImpl, vorDemVersand: () => false });
  check('Grenze erreicht: keine einzige Testmail', rh.grund === 'zu_oft' && h.mails().length === 0);
}
{
  const b = brevo({ sende: ['frei'] });
  const r = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: b.fetchImpl });
  check('Konto nicht freigeschaltet: erkannt', r.grund === 'konto_nicht_freigeschaltet');
  check('Konto nicht freigeschaltet: keine zweite Testmail', b.mails().length === 1);
}
{
  const b = brevo({ sende: ['ok', 'ok', 'ok', 'absender'] });
  const r = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: b.fetchImpl });
  check('Eine Adresse lehnt ab (tickets@): nicht bestanden', r.ok === false && r.grund === 'absender_ungueltig');
  check('Eine Adresse lehnt ab: die letzte wird nicht mehr versucht', b.mails().length === 4);
  check('Eine Adresse lehnt ab: der Schritt nennt die Adresse', r.schritte.some(s => s.was === 'testmail' && s.ok === false && s.absender === HAUS_ABSENDER.kulturhaus));
}

// ---- 3. Der Dienst selbst ----------------------------------------------------
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'cloudflare:workers') {
      return { url: 'data:text/javascript,export class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }', shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('file:') && url.endsWith('.json')) {
      return { format: 'module', source: `export default ${readFileSync(fileURLToPath(url), 'utf8')};`, shortCircuit: true };
    }
    // Der Dienst ist ein ES-Modul; ohne diese Angabe raet Node erst und warnt.
    if (url.startsWith('file:') && url.endsWith('.js')) {
      return { format: 'module', source: readFileSync(fileURLToPath(url), 'utf8'), shortCircuit: true };
    }
    return next(url, context);
  }
});
const { Haus } = await import('../server/src/index.js');

function baueHaus(env) {
  const db = new DatabaseSync(':memory:');
  const sql = {
    exec(abfrage, ...werte) {
      const anweisung = db.prepare(abfrage);
      const lesend = /^\s*(SELECT|PRAGMA|WITH)\b/i.test(abfrage) || /\bRETURNING\b/i.test(abfrage);
      const zeilen = lesend ? anweisung.all(...werte) : (anweisung.run(...werte), []);
      return { toArray: () => zeilen, one: () => zeilen[0], [Symbol.iterator]: () => zeilen[Symbol.iterator]() };
    }
  };
  const offen = [];
  const ctx = {
    storage: { sql, setAlarm: async () => {}, getAlarm: async () => null, deleteAlarm: async () => {} },
    blockConcurrencyWhile: fn => fn(),
    waitUntil: versprechen => { offen.push(Promise.resolve(versprechen).catch(() => {})); },
    getWebSockets: () => [],
    acceptWebSocket: () => {}
  };
  return { haus: new Haus(ctx, env), db, fertig: async () => { while (offen.length) await Promise.all(offen.splice(0)); } };
}

const basisEnv = {
  HAUS_TOKEN: 'test', OFFEN: 'nein', WIRT_MAIL: 'veranstaltungen@wirtschaft-dornbirn.at',
  TAKEAWAY_MAIL: 'service@wirtschaft-dornbirn.at', ANFRAGE_MAIL: 'uri@eugen.family',
  ABSENDER_SERVICE: '', ABSENDER_WARTELISTE: '', ABSENDER_KULTURHAUS: '', EVENTS_ABSENDER: '',
  GAESTE_SEITE: 'https://wirtschaft-dornbirn.pages.dev', DIENST_BASIS: 'https://dienst.example.org'
};
const echtEnv = { ...basisEnv, BREVO_KEY: SCHLUESSEL_JONAS, BREVO_ABSENDER: PRIVAT, MAILVERSAND_EINRICHTEN: 'ja' };

let spiel = brevo();
globalThis.fetch = (...args) => spiel.fetchImpl(...args);
const letzteMail = () => spiel.mails().at(-1);

// Eine Reservierung in der Zukunft, direkt in die Datenbank gelegt.
const inZehnTagen = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
const legeReservierung = (db, id, mehr = {}) => db.prepare('INSERT INTO reservierungen (id, tag, daten) VALUES (?, ?, ?)').run(id, inZehnTagen,
  JSON.stringify({ id, date: inZehnTagen, time: '12:00', guests: 2, name: 'Gast Test', status: 'bestaetigt', token: `tok-${id}`,
    uid: `${id}@wirtschaft-dornbirn.at`, sequenz: 0, kontakt: { email: `${id}@example.org` }, ...mehr }));
const veranstalterIn = mail => {
  const anhang = mail?.koerper?.attachment?.[0]?.content || '';
  return (Buffer.from(anhang, 'base64').toString('utf8').match(/ORGANIZER;CN=[^:]*:mailto:([^\r\n]+)/) || [])[1] || '';
};

{
  const { haus, db, fertig } = baueHaus(echtEnv);
  let stand = haus.mailversandStand();
  check('Dienst vorher: nicht umgestellt, bisheriger Versand da', stand.erlaubt && !stand.aktiv && stand.bisher && !stand.pruefung);

  await haus.tageszettel();
  check('Vorher: Tageszettel mit Jonas-Schluessel und alter Adresse',
    letzteMail()?.schluessel === SCHLUESSEL_JONAS && letzteMail()?.koerper.sender.email === PRIVAT);

  spiel = brevo();
  const p = await haus.mailversandPruefen({ schluessel: ` ${SCHLUESSEL_HAUS}\n`, an: SARAH });
  check('Pruefen: bestanden, fuenf Testmails mit dem Hausschluessel', p.ok && spiel.mails().length === 5 && spiel.mails().every(m => m.schluessel === SCHLUESSEL_HAUS));
  check('Pruefen: Antwort ohne den Schluessel', !JSON.stringify(p).includes(SCHLUESSEL_HAUS) && p.schluessel === schluesselEnde(SCHLUESSEL_HAUS));
  stand = haus.mailversandStand();
  check('Nach dem Pruefen: noch NICHT umgestellt', !stand.aktiv && Boolean(stand.pruefung) && stand.pruefung.an === SARAH);
  check('Stand ohne den Schluessel', !JSON.stringify(stand).includes(SCHLUESSEL_HAUS));

  spiel = brevo();
  await haus.tageszettel();
  check('Nach dem Pruefen: Tageszettel noch mit Jonas-Schluessel', letzteMail()?.schluessel === SCHLUESSEL_JONAS);

  check('Umstellen ohne die Kennung der Pruefung: abgelehnt', haus.mailversandUmstellen({}).grund === 'pruefung_veraltet');
  check('Umstellen mit fremder Kennung: abgelehnt', haus.mailversandUmstellen({ id: 'fremd' }).grund === 'pruefung_veraltet' && !haus.mailversandStand().aktiv);
  check('Stand nennt die Kennung und das Schluesselende der Pruefung', stand.pruefung.id === p.id && stand.pruefung.schluessel === schluesselEnde(SCHLUESSEL_HAUS));
  // Eine Reservierung von vor dem Umstellen: ihre Bestaetigung kam von der alten Adresse.
  legeReservierung(db, 'alt');
  const u = haus.mailversandUmstellen({ id: p.id });
  check('Umstellen: geklappt', u.ok && u.aktiv && u.umgestellt);
  check('Umstellen: offene Reservierung behaelt ihren Kalender-Veranstalter',
    JSON.parse(db.prepare('SELECT daten FROM reservierungen WHERE id = ?').get('alt').daten).organisator === PRIVAT);
  check('Umstellen: Antwort ohne den Schluessel', !JSON.stringify(u).includes(SCHLUESSEL_HAUS) && u.schluessel === schluesselEnde(SCHLUESSEL_HAUS));
  check('Umstellen: Absender aus dem Hausentscheid', JSON.stringify(u.absender) === JSON.stringify(HAUS_ABSENDER));
  check('Umstellen: Pruefung verbraucht', u.pruefung === null);

  spiel = brevo();
  await haus.tageszettel();
  check('Danach: Tageszettel mit Hausschluessel von willkommen@',
    letzteMail()?.schluessel === SCHLUESSEL_HAUS && letzteMail()?.koerper.sender.email === HAUS_ABSENDER.haupt
    && letzteMail()?.koerper.to[0].email === 'veranstaltungen@wirtschaft-dornbirn.at');

  spiel = brevo();
  const anfrage = await haus.anfrageAnnehmen({ art: 'feste', name: 'Anna Huber', email: 'anna@example.org', telefon: '',
    betreff: 'Hochzeit', zeilen: ['Anlass: Hochzeit'], einwilligung: true, website: '' });
  await fertig();
  const anHaus = spiel.mails().find(m => m.koerper.to[0].email === 'uri@eugen.family');
  const anGast = spiel.mails().find(m => m.koerper.to[0].email === 'anna@example.org');
  check('Danach: Anfrage angenommen', anfrage?.ok === true);
  check('Danach: Anfrage ans Haus von willkommen@ mit Hausschluessel, Antworten an den Gast',
    anHaus?.schluessel === SCHLUESSEL_HAUS && anHaus?.koerper.sender.email === HAUS_ABSENDER.haupt && anHaus?.koerper.replyTo?.email === 'anna@example.org');
  check('Danach: Bestaetigung an den Gast, Antworten an Emma & Eugen',
    anGast?.schluessel === SCHLUESSEL_HAUS && anGast?.koerper.replyTo?.email === 'uri@eugen.family');

  // Absage nach dem Umstellen: Mail vom neuen Absender, im Kalender der alte Veranstalter.
  spiel = brevo();
  await haus.gastAbsage('tok-alt');
  await fertig();
  const absage = spiel.mails().find(m => m.koerper.to[0].email === 'alt@example.org');
  check('Absage nach dem Umstellen: von service@ mit Hausschluessel', absage?.koerper.sender.email === HAUS_ABSENDER.service && absage?.schluessel === SCHLUESSEL_HAUS);
  check('Absage nach dem Umstellen: Kalender-Veranstalter wie in der Bestaetigung', veranstalterIn(absage) === PRIVAT);
  legeReservierung(db, 'neu');
  spiel = brevo();
  await haus.gastAbsage('tok-neu');
  await fertig();
  check('Neue Reservierung: Veranstalter ist der neue Absender', veranstalterIn(spiel.mails().find(m => m.koerper.to[0].email === 'neu@example.org')) === HAUS_ABSENDER.service);

  // Die Pruef-Endpunkte fragen Brevo im Dienst - mit dem Hausschluessel, ohne ihn herauszugeben.
  spiel = brevo();
  const domainsLesen = await haus.mailBrevo('/senders/domains');
  check('Pruef-Endpunkte fragen mit dem Hausschluessel', domainsLesen.ok && domainsLesen.quelle === 'haus' && spiel.aufrufe.at(-1)?.schluessel === SCHLUESSEL_HAUS);
  check('Pruef-Endpunkte geben den Schluessel nicht heraus', !JSON.stringify(domainsLesen).includes(SCHLUESSEL_HAUS));
  check('Pruef-Endpunkte: nur die erlaubten Pfade', (await haus.mailBrevo('/account')).grund === 'pfad'
    && (await haus.mailBrevo('/smtp/email', { methode: 'POST', koerper: {} })).grund === 'pfad');

  const sicherung = JSON.stringify(await haus.sicherung());
  check('Sicherung enthaelt den Schluessel NICHT', !sicherung.includes(SCHLUESSEL_HAUS) && !sicherung.includes('xkeysib-'));
  check('Tabelle geheimnisse nicht in der Sicherung', !Object.keys(TABELLEN).includes('geheimnisse'));
  check('Schluessel liegt in geheimnisse', db.prepare('SELECT wert FROM geheimnisse WHERE name = ?').get('mailversand')?.wert.includes(SCHLUESSEL_HAUS));
  check('Schluessel liegt NICHT in einstellungen', !JSON.stringify(db.prepare('SELECT * FROM einstellungen').all()).includes(SCHLUESSEL_HAUS));

  // Versandfehler: die Art wird gemerkt, nie der Text.
  spiel = brevo({ sende: ['ip'] });
  const laut = console.error;
  console.error = () => {};
  try { await haus.tageszettel(); } finally { console.error = laut; }
  stand = haus.mailversandStand();
  check('Versandfehler: Art gemerkt (IP-Sperre)', stand.zuletzt?.fehler?.art === 'ip_gesperrt');
  check('Versandfehler: kein Brevo-Text gespeichert', !JSON.stringify(db.prepare('SELECT * FROM einstellungen').all()).includes('unrecognised'));
  spiel = brevo();
  await haus.tageszettel();
  const nachher = haus.mailversandStand().zuletzt;
  check('Danach wieder Erfolg gemerkt - neuer als der Fehler', Boolean(nachher?.ok) && Date.parse(nachher.ok) >= Date.parse(nachher.fehler.zeit));

  const z = haus.mailversandZurueck();
  check('Zurueck: es gilt wieder Cloudflare', z.ok && !z.aktiv && z.zurueck);
  check('Zurueck: Schluessel geloescht', !db.prepare('SELECT wert FROM geheimnisse WHERE name = ?').get('mailversand'));
  spiel = brevo();
  await haus.tageszettel();
  check('Zurueck: Tageszettel wieder mit Jonas-Schluessel', letzteMail()?.schluessel === SCHLUESSEL_JONAS && letzteMail()?.koerper.sender.email === PRIVAT);
}

{
  // Jeder neue Versuch macht eine fruehere Pruefung ungueltig; Abbrechen und Ablauf raeumen sie weg.
  const { haus, db } = baueHaus(echtEnv);
  const probe = () => db.prepare('SELECT wert FROM geheimnisse WHERE name = ?').get('mailversandProbe');
  spiel = brevo();
  const erste = await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH });
  check('Erste Pruefung bestanden', erste.ok && Boolean(erste.id));
  spiel = brevo({ konto: 'falsch' });
  check('Zweite Pruefung scheitert', !(await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH })).ok);
  check('Dann wird nicht umgestellt', haus.mailversandUmstellen({ id: erste.id }).grund === 'keine_pruefung' && !haus.mailversandStand().aktiv);
  spiel = brevo();
  const dritte = await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH });
  check('Auch ein Tippfehler macht die bestandene Pruefung ungueltig', (await haus.mailversandPruefen({ schluessel: 'xkeysib-kurz', an: SARAH })).grund === 'form' && !probe());
  check('… und umgestellt wird sie dann nicht', haus.mailversandUmstellen({ id: dritte.id }).grund === 'keine_pruefung');
  spiel = brevo();
  const a1 = await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH });
  spiel = brevo();
  const a2 = await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: 'zweites-geraet@example.org' });
  check('Zwei Geraete pruefen: die aeltere Kennung stellt nicht um', haus.mailversandUmstellen({ id: a1.id }).grund === 'pruefung_veraltet' && !haus.mailversandStand().aktiv);
  const ab = haus.mailversandAbbrechen();
  check('Abbrechen raeumt die Pruefung samt Schluessel weg', ab.ok && ab.pruefung === null && !probe());
  check('Nach dem Abbrechen stellt auch die neueste Kennung nicht mehr um', haus.mailversandUmstellen({ id: a2.id }).grund === 'keine_pruefung');
  spiel = brevo();
  await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH });
  const zeile = JSON.parse(probe().wert);
  zeile.gueltigBis = new Date(Date.now() - 1000).toISOString();
  db.prepare('UPDATE geheimnisse SET wert = ? WHERE name = ?').run(JSON.stringify(zeile), 'mailversandProbe');
  check('Abgelaufene Pruefung: der Stand raeumt sie samt Schluessel weg', haus.mailversandStand().pruefung === null && !probe());
  check('Abgelaufene Pruefung: nicht umgestellt', haus.mailversandUmstellen({ id: zeile.id }).grund === 'keine_pruefung' && !haus.mailversandStand().aktiv);
}

{
  // Die Grenzen: Eingabefehler kosten nichts, ein falscher Schluessel nur einen Versuch,
  // Testmails gibt es hoechstens sechsmal je Stunde.
  const { haus } = baueHaus(echtEnv);
  for (let i = 0; i < 10; i += 1) await haus.mailversandPruefen({ schluessel: '', an: SARAH });
  for (let i = 0; i < 8; i += 1) { spiel = brevo({ konto: 'falsch' }); await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH }); }
  let alleGut = true;
  for (let i = 0; i < 6; i += 1) { spiel = brevo(); alleGut = alleGut && (await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH })).ok; }
  check('Eingabefehler und falsche Schluessel kosten keine der sechs Pruefungen', alleGut);
  spiel = brevo();
  const siebte = await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH });
  check('Siebte Pruefung mit Testmails in der Stunde: abgelehnt, ohne eine Mail', siebte.grund === 'zu_oft' && spiel.mails().length === 0);
  // Bisher 8 + 6 + 1 = 15 Anfragen bei Brevo; bis zur Grenze fehlen noch so viele:
  for (let i = 15; i < VERSUCHE_JE_STUNDE; i += 1) { spiel = brevo({ konto: 'falsch' }); await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH }); }
  spiel = brevo({ konto: 'falsch' });
  const zuViele = await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH });
  check('Mehr als dreissig Anfragen bei Brevo in der Stunde: abgelehnt, ohne Brevo zu fragen', zuViele.grund === 'zu_oft' && spiel.aufrufe.length === 0);
}

{
  // Die Testumgebung: nie Mails, auch nicht mit eingetragenem Schluessel.
  const probeEnv = { ...basisEnv, MAILVERSAND_EINRICHTEN: 'nein' };
  const { haus, db } = baueHaus(probeEnv);
  spiel = brevo();
  const p = await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH });
  check('Probe: Pruefen abgelehnt', p.grund === 'testumgebung' && spiel.aufrufe.length === 0);
  check('Probe: Umstellen abgelehnt', haus.mailversandUmstellen({ id: 'x' }).grund === 'testumgebung');
  db.prepare('INSERT INTO geheimnisse (name, wert) VALUES (?, ?)').run('mailversand', JSON.stringify({ schluessel: SCHLUESSEL_HAUS, absender: { ...HAUS_ABSENDER }, seit: new Date().toISOString() }));
  const t = await haus.tageszettel();
  check('Probe: eine eingeschmuggelte Einrichtung verschickt trotzdem nichts', t.ok === false && spiel.mails().length === 0);
  const s = haus.mailversandStand();
  check('Probe: Stand sagt "nicht erlaubt"', s.erlaubt === false && s.aktiv === false);
  const ohne = baueHaus({ ...basisEnv });
  check('Ohne Schalter gilt "nein"', ohne.haus.mailversandStand().erlaubt === false);
  // Selbst wenn jemand der Probe die Geheimnisse aus Cloudflare gibt: sie verschickt nichts.
  const mitGeheimnissen = baueHaus({ ...probeEnv, BREVO_KEY: SCHLUESSEL_JONAS, BREVO_ABSENDER: PRIVAT });
  spiel = brevo();
  const t2 = await mitGeheimnissen.haus.tageszettel();
  check('Probe mit Geheimnissen: trotzdem keine Mail', t2.ok === false && spiel.aufrufe.length === 0);
}

// ---- 4. Quelltext ------------------------------------------------------------
{
  const dienst = await liesDatei('server/src/index.js', 'utf8');
  const wrangler = await liesDatei('server/wrangler.jsonc', 'utf8');
  const wirt = await liesDatei('site/wirt.js', 'utf8');
  const seite = await liesDatei('site/wirt.html', 'utf8');
  const ansicht = await liesDatei('site/wirt-ansicht.mjs', 'utf8');
  check('Jeder Versand laeuft ueber #sende', !/sendeMail\(this\.env/.test(dienst) && (dienst.match(/sendeMail\(/g) || []).length === 1);
  check('#sende nimmt die gerade gueltige Umgebung', /async #sende\(paket\) \{[\s\S]{0,400}?const ergebnis = await sendeMail\(this\.#mailEnv\(\), paket\)/.test(dienst));
  check('#sende verschickt in der Testumgebung nie', /async #sende\(paket\) \{[\s\S]{0,300}?MAILVERSAND_EINRICHTEN[^\n]*=== 'nein'\) return \{ ok: false, grund: 'testumgebung' \}/.test(dienst));
  // Erlaubt: #absender, #hausAbsender, Terminliste (je als Rueckfall), der
  // Stand ("bisher") und der Veranstalter offener Reservierungen beim Umstellen.
  check('Kein direkter Griff mehr auf BREVO_ABSENDER ausser in den Weichen',
    (dienst.match(/this\.env\?\.BREVO_ABSENDER/g) || []).length === 5);
  const posten = (wrangler.match(/"MAILVERSAND_EINRICHTEN": "([^"]*)"/g) || []).map(z => z.match(/"([^"]*)"$/)[1]);
  check('Schalter: echt "ja", Probe "nein"', posten.length === 2 && posten[0] === 'ja' && posten[1] === 'nein');
  check('Schalter in der Probe steht im probe-Abschnitt',
    wrangler.indexOf('"MAILVERSAND_EINRICHTEN": "nein"') > wrangler.indexOf('"probe": {'));
  check('Pruefen/Umstellen/Abbrechen/Zurueck nur mit echtem Hausschluessel (nicht mit OFFEN)',
    /startsWith\('\/api\/mail\/versand\/'\) && request\.method === 'POST'\) \{\s*if \(!echterSchluessel\(\)\)/.test(dienst)
    && /const echterSchluessel = \(\) => gleich\(request\.headers\.get\('x-haus-token'\), env\.HAUS_TOKEN\);/.test(dienst));
  check('Wirt-Ansicht leert das Schluesselfeld vor dem Senden',
    /feld\.value = '';[\s\S]{0,400}pruefeMailversand\(hausToken\(\), schluessel, an\)/.test(wirt));
  const mailTeil = wirt.slice(wirt.indexOf('// ---- Mailversand selbst umstellen'), wirt.indexOf('// ---- Anfragen aus Locations'));
  check('Wirt-Ansicht legt den Schluessel nirgends ab', mailTeil.length > 500 && !/localStorage|sessionStorage|console\.log/.test(mailTeil));
  check('Schluesselfeld ist kein Passwortfeld (der Browser soll ihn nicht speichern wollen)',
    /<input type="text" id="mailSchluessel" autocomplete="off"[^>]*data-lpignore="true"/.test(seite) && !/type="password" id="mailSchluessel"/.test(seite));
  check('Formular ist versteckt, bis der Dienst es freigibt', /<form class="event-form" id="mailForm" autocomplete="off" hidden>/.test(seite));
  check('Knoepfe werden vor dem Laden verdrahtet', mailTeil.indexOf("form.addEventListener('submit'") > 0
    && mailTeil.indexOf("form.addEventListener('submit'") < mailTeil.lastIndexOf('await lade();'));
  check('Abbrechen fragt den Dienst', /mailAbbrechen'\)\.addEventListener\('click', async \(\) => \{[\s\S]{0,400}brecheMailversandAb\(/.test(mailTeil));
  check('Umstellen schickt die Kennung der Pruefung mit', /stelleMailversandUm\(hausToken\(\), mailPruefung\)/.test(mailTeil));
  check('Zurueck warnt, wenn danach gar nichts mehr verschickt wird', /mailStandZuletzt && !mailStandZuletzt\.bisher/.test(mailTeil));
  check('Kein Weg gibt den Schluessel ueber den Dienst heraus', !/mailAktiv/.test(dienst) && !/'api-key': env\.BREVO_KEY/.test(dienst));
  for (const pfad of ['/api/mail/domain', '/api/mail/pruefung', '/api/mail/versand']) {
    const stelle = dienst.indexOf(`url.pathname === '${pfad}'`);
    check(`${pfad} verlangt den echten Hausschluessel`, stelle > 0 && /if \(!echterSchluessel\(\)\)/.test(dienst.slice(stelle, stelle + 300)));
  }
  check('#absender nimmt die gemeinsame Regel', /#absender\(zweck, haus = 'wirtschaft'\) \{[\s\S]{0,500}absenderFuer\(eigen, zweck === 'warteliste' \? 'warteliste' : 'service', haus\)/.test(dienst));
  check('Terminliste nimmt die gemeinsame Regel', /absenderFuer\(eigen, eintrag\.liste === 'events' \? 'events' : 'haupt'\)/.test(dienst));
  check('Bestaetigung und Absage tragen den gemerkten Veranstalter', (dienst.match(/absender: organisator\n/g) || []).length === 2);
  for (const [id, typ] of [['mailPruefen', 'submit'], ['mailUmstellen', 'button'], ['mailAbbrechen', 'button'], ['mailZurueck', 'button']]) {
    check(`Knopf ${id} hat type="${typ}"`, new RegExp(`type="${typ}" id="${id}"`).test(seite));
  }
  check('Block steht im Reiter haus', /id: 'mailKasten'[^}]*reiter: 'haus'/.test(ansicht) && /data-block="mailKasten"/.test(seite));
}

if (fehler) {
  console.error(`Mailversand-Prüfung FEHLGESCHLAGEN: ${fehler} Punkt(e).`);
  process.exit(1);
}
console.log('Mailversand-Prüfung OK: Eingaben, Brevos Antworten, alle Wege der Prüfung, der Dienst vorher/geprüft/umgestellt/zurück, Sicherung ohne Schlüssel, Testumgebung ohne Mails, Quelltext und Wirt-Ansicht geprüft.');
