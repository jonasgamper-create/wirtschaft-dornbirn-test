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
// Wirt-Ansicht laesst den Schluessel nirgends liegen. Und die Anleitung fuer
// Sarah (docs/mailversand-selbst-umstellen.md): jeder Knopf, jede Meldung,
// die Rechte des Schluessels und die Bilder passen zur Wirt-Ansicht.
//
// Kein Netz, keine echten Schluessel, keine echten Adressen.

import { existsSync, readFile, readFileSync } from 'node:fs';
import { readFile as liesDatei } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import {
  ABSENDER_NAME, HAUS_ABSENDER, HAUS_DOMAINS, PRUEFUNG_GILT_MS, TEST_ABSENDER, VERSUCHE_JE_STUNDE, absenderFuer, beglaubigeDomain, bewerteDomains,
  deuteBrevo, dnsLuecken, gueltigeEinrichtung, istEndgueltig, kontoKurz, liesAdresse, liesSchluessel, pruefeVersand, pruefungGilt, schluesselEnde
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
check('Brevo: Konto in Pruefung (account_under_validation) ist kein Rechteproblem', deuteBrevo(403, 'account_under_validation Your account is under validation') === 'konto_gesperrt');
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
// Brevos Antwort auf GET /senders/domains/{domain} (developers.brevo.com, 15.11.2026).
const dnsHalb = { domain: 'eugen.family', verified: false, authenticated: false, dns_records: {
  brevo_code: { type: 'TXT', value: 'brevo-code:x', host_name: '@', status: false },
  dkim_record: { type: 'TXT', value: 'k=rsa;p=x', host_name: 'mail._domainkey', status: true },
  dmarc_record: { type: 'TXT', value: 'v=DMARC1; p=none', host_name: '_dmarc', status: false }
} };
check('Luecken: Brevo-Code und DMARC fehlen, DKIM steht', JSON.stringify(dnsLuecken(dnsHalb)) === JSON.stringify(['Brevo-Code', 'DMARC']));
check('Luecken: zwei DKIM-Eintraege werden einer', JSON.stringify(dnsLuecken({ dns_records: { dkim1Record: { status: false }, dkim2Record: { status: false } } })) === JSON.stringify(['DKIM']));
check('Luecken: nur ausdruecklich falsch zaehlt', dnsLuecken({ dns_records: { brevo_code: { status: 'false' }, dkim_record: {} } }).length === 0);
check('Luecken: unbekannter Eintrag mit gesaeubertem Namen', JSON.stringify(dnsLuecken({ dns_records: { 'neu<b>Ding': { status: false } } })) === JSON.stringify(['neubDing']));
check('Luecken: kaputte Antwort = keine', dnsLuecken(null).length === 0 && dnsLuecken({ dns_records: 'x' }).length === 0);
check('Endgueltig: IP-Sperre, Netz, Konto', ['ip_gesperrt', 'netz', 'konto_nicht_freigeschaltet', 'konto_gesperrt', 'brevo_stoerung', 'zu_viele'].every(grund => istEndgueltig({ grund })));
check('Endgueltig: Schluessel unbekannt nur laut Text', istEndgueltig({ grund: 'schluessel_ungueltig', eindeutig: true }) && !istEndgueltig({ grund: 'schluessel_ungueltig', eindeutig: false }));
check('Nicht endgueltig: fehlende Rechte, Absender, Unklares', !['keine_berechtigung', 'absender_ungueltig', 'brevo_fehler'].some(grund => istEndgueltig({ grund })));
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
function brevo({ konto = 'ok', domains = 'beide', beglaubige = 'ok', sende = [] } = {}) {
  const aufrufe = [];
  const antwort = (status, daten) => new Response(JSON.stringify(daten), { status, headers: { 'content-type': 'application/json' } });
  const beglaubigt = new Set();
  const fetchImpl = async (url, init = {}) => {
    const pfad = String(url).replace('https://api.brevo.com/v3', '');
    const methode = init.method || 'GET';
    aufrufe.push({ pfad, methode, schluessel: init.headers?.['api-key'], koerper: init.body ? JSON.parse(init.body) : null });
    if (konto === 'netz') throw new TypeError('fetch failed');
    if (pfad === '/account') {
      if (konto === 'ok') return antwort(200, { email: 'veranstaltungen@wirtschaft-dornbirn.at', companyName: 'wirtschaft' });
      if (konto === 'falsch') return antwort(401, { code: 'unauthorized', message: 'Key not found' });
      if (konto === 'ip') return antwort(401, { code: 'unauthorized', message: 'We have detected you are using an unrecognised IP address 104.28.1.1.' });
      if (konto === 'rechte') return antwort(401, { code: 'permission_denied', message: 'Access denied for resource' });
      if (konto === 'unklar') return antwort(401, { code: 'unauthorized', message: 'Some wording nobody has seen yet' });
      if (konto === 'gesperrt') return antwort(403, { code: 'permission_denied', message: 'Your account has been suspended' });
    }
    if (pfad === '/senders/domains' && methode === 'GET') {
      if (domains === 'rechte') return antwort(401, { code: 'permission_denied', message: 'Access denied for resource "account"' });
      if (domains === 'beide') return antwort(200, beide);
      if (domains === 'offen') return antwort(200, { domains: [beide.domains[0], { domain_name: 'eugen.family', authenticated: false }] });
      if (domains === 'keine') return antwort(200, { domains: beide.domains.map(d => ({ ...d, authenticated: false, verified: false })) });
      if (domains === 'fehlt') return antwort(200, { domains: [beide.domains[1]] });
      // wirtschaft-dornbirn.at fehlt, dafuer eine fremde Domain - die nie beglaubigt werden darf.
      if (domains === 'fremd') return antwort(200, { domains: [{ domain_name: 'example.org', authenticated: false }, { domain_name: 'eugen.family', authenticated: false }] });
    }
    // Beglaubigen (PUT .../authenticate) und nachfragen (GET .../{domain}).
    const domainPfad = pfad.match(/^\/senders\/domains\/([^/]+)(\/authenticate)?$/);
    if (domainPfad) {
      const name = decodeURIComponent(domainPfad[1]);
      if (domainPfad[2] && methode === 'PUT') {
        if (beglaubige === 'ok' || beglaubige === 'stumm') { beglaubigt.add(name); return antwort(200, { domain_name: name, message: 'Domain has been authenticated successfully.' }); }
        if (beglaubige === 'halb') return antwort(200, { domain_name: name, message: 'Domain authentication started.' });
        if (beglaubige === 'rechte') return antwort(401, { code: 'permission_denied', message: 'Access denied for resource "account". The API key does not include the required permission.' });
        if (beglaubige === 'rechte401') return antwort(401, { code: 'unauthorized', message: 'Unauthorized' });
        if (beglaubige === 'gesperrt') return antwort(403, { code: 'account_under_validation', message: 'Your account is under validation.' });
        if (beglaubige === 'ip') return antwort(401, { code: 'unauthorized', message: 'We have detected you are using an unrecognised IP address 104.28.1.1.' });
        if (beglaubige === 'stoerung') return antwort(503, { code: 'service_unavailable', message: '' });
        if (beglaubige === 'netz') throw new TypeError('fetch failed');
        if (beglaubige === 'unklar' || beglaubige === 'schon') return antwort(400, { code: 'bad_request', message: 'Something nobody has seen yet' });
        return antwort(400, { code: 'DNS records not properly configured', message: 'Domain could not be authenticated' });
      }
      if (!domainPfad[2] && methode === 'GET') {
        if (beglaubige === 'dns' || beglaubige === 'halb') return antwort(200, { ...dnsHalb, domain: name });
        if (beglaubige === 'schon') return antwort(200, { domain: name, verified: true, authenticated: true, dns_records: {} });
        if (beglaubige === 'unklar') return antwort(200, { domain: name, verified: true, authenticated: false, dns_records: {
          brevo_code: { status: true }, dkim_record: { status: true }, dmarc_record: { status: true } } });
        if (beglaubige === 'nachfrage') return antwort(429, { code: 'too_many_requests', message: '' });
        if (beglaubige === 'ok') return antwort(200, { domain: name, verified: beglaubigt.has(name), authenticated: beglaubigt.has(name), dns_records: {} });
        return antwort(404, { code: 'document_not_found', message: 'Domain does not exist' });
      }
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
  return {
    fetchImpl, aufrufe, mails: () => aufrufe.filter(a => a.pfad === '/smtp/email'),
    beglaubigungen: () => aufrufe.filter(a => a.methode === 'PUT' && a.pfad.endsWith('/authenticate')).map(a => a.pfad),
    // Nichts anderes als lesen, beglaubigen, Testmails: nie eine Domain anlegen oder loeschen.
    nurErlaubtes: () => aufrufe.every(a => (a.methode === 'GET') || (a.methode === 'PUT' && a.pfad.endsWith('/authenticate')) || (a.methode === 'POST' && a.pfad === '/smtp/email'))
  };
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
  ['Domain fehlt', { domains: 'fehlt' }, 'domain_fehlt'],
  ['Beglaubigen: Brevo findet die Eintraege nicht', { domains: 'offen', beglaubige: 'dns' }, 'dns_unvollstaendig'],
  ['Beglaubigen: Schluessel ohne Recht', { domains: 'offen', beglaubige: 'rechte' }, 'darf_nicht_beglaubigen'],
  ['Beglaubigen: 401 ohne Worte = fehlendes Recht (der Schluessel durfte eben noch lesen)', { domains: 'offen', beglaubige: 'rechte401' }, 'darf_nicht_beglaubigen'],
  ['Beglaubigen: Konto in Pruefung', { domains: 'offen', beglaubige: 'gesperrt' }, 'konto_gesperrt'],
  ['Beglaubigen: IP-Sperre', { domains: 'offen', beglaubige: 'ip' }, 'ip_gesperrt'],
  ['Beglaubigen: Stoerung bei Brevo', { domains: 'offen', beglaubige: 'stoerung' }, 'brevo_stoerung'],
  ['Beglaubigen: Netz weg', { domains: 'offen', beglaubige: 'netz' }, 'netz'],
  ['Beglaubigen: Bremse bei der Nachfrage', { domains: 'offen', beglaubige: 'nachfrage' }, 'zu_viele'],
  ['Beglaubigen: "geklappt", aber Brevo fuehrt sie nicht als beglaubigt', { domains: 'offen', beglaubige: 'halb' }, 'dns_unvollstaendig'],
  ['Beglaubigen: unklare Ablehnung, alle Eintraege in Ordnung', { domains: 'offen', beglaubige: 'unklar' }, 'nicht_beglaubigt']
]) {
  const b = brevo(opt);
  const r = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: b.fetchImpl });
  check(`${fall}: abgelehnt mit ${grund} (war ${r.grund})`, r.ok === false && r.grund === grund);
  check(`${fall}: keine Testmail`, b.mails().length === 0);
  check(`${fall}: nur lesen und beglaubigen`, b.nurErlaubtes());
}
{
  // Der Normalfall fuer Sarah: Einträge bei Hetzner stehen, der Klick fehlt - der Dienst beglaubigt.
  const b = brevo({ domains: 'offen' });
  const r = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: b.fetchImpl });
  const schritt = name => r.schritte.find(s => s.was === 'domain' && s.name === name);
  check('Beglaubigen: bestanden', r.ok === true && b.mails().length === 5);
  check('Beglaubigen: genau die offene Domain, genau einmal, mit PUT', JSON.stringify(b.beglaubigungen()) === JSON.stringify(['/senders/domains/eugen.family/authenticate']));
  check('Beglaubigen: mit dem neuen Schluessel', b.aufrufe.filter(a => a.methode === 'PUT').every(a => a.schluessel === SCHLUESSEL_HAUS));
  check('Beglaubigen: Schritt sagt "eben erledigt"', schritt('eugen.family')?.ok === true && schritt('eugen.family')?.eben === true);
  check('Beglaubigen: die schon beglaubigte Domain bleibt unberuehrt', schritt('wirtschaft-dornbirn.at')?.ok === true && !schritt('wirtschaft-dornbirn.at')?.eben);
  check('Beglaubigen: erst beglaubigen, dann die Testmails', b.aufrufe.findIndex(a => a.methode === 'PUT') < b.aufrufe.findIndex(a => a.pfad === '/smtp/email'));
  check('Beglaubigen: nichts angelegt oder geloescht', b.nurErlaubtes());
  const k = brevo({ domains: 'keine' });
  const rk = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: k.fetchImpl });
  check('Beide offen: beide beglaubigt, dann fuenf Testmails', rk.ok && k.beglaubigungen().length === 2 && k.mails().length === 5
    && HAUS_DOMAINS.every(d => k.beglaubigungen().includes(`/senders/domains/${d}/authenticate`)));
  const s = brevo();
  await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: s.fetchImpl });
  check('Beide schon beglaubigt: kein einziges Beglaubigen', s.beglaubigungen().length === 0);
  const f = brevo({ domains: 'fremd' });
  const rf = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: f.fetchImpl });
  check('Fremde Domain im Konto: nie gefragt, nie beglaubigt; die eigene schon',
    JSON.stringify(f.beglaubigungen()) === JSON.stringify(['/senders/domains/eugen.family/authenticate']) && !f.aufrufe.some(a => a.pfad.includes('example.org')));
  check('Domain fehlt: der Dienst legt sie nicht an', rf.grund === 'domain_fehlt' && !f.aufrufe.some(a => a.methode === 'POST' && a.pfad.startsWith('/senders')));
  const fr = brevo({ domains: 'fremd', beglaubige: 'rechte' });
  check('Zwei Gruende: was am Schluessel liegt, kommt zuerst', (await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: fr.fetchImpl })).grund === 'darf_nicht_beglaubigen');
  for (const art of ['stoerung', 'nachfrage', 'gesperrt']) {
    const z = brevo({ domains: 'keine', beglaubige: art });
    await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: z.fetchImpl });
    check(`Endgueltiger Fehler beim Beglaubigen (${art}): kein zweiter Versuch, keine Testmail`, z.beglaubigungen().length === 1 && z.mails().length === 0);
  }
  const st = brevo({ domains: 'offen', beglaubige: 'stumm' });
  const rst = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: st.fetchImpl });
  check('Brevo sagt "geklappt" und laesst sich nicht nachfragen: gilt, die Testmails entscheiden', rst.ok && st.mails().length === 5);
  const ok = brevo({ domains: 'offen' });
  await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: ok.fetchImpl });
  check('Nach dem Beglaubigen fragt der Dienst nach, ob Brevo sie wirklich fuehrt', ok.aufrufe.some(a => a.methode === 'GET' && a.pfad === '/senders/domains/eugen.family'));
  const d = brevo({ domains: 'offen', beglaubige: 'dns' });
  const rd = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: d.fetchImpl });
  const sd = rd.schritte.find(x => x.was === 'domain' && x.name === 'eugen.family');
  check('Eintraege fehlen: die Wirt-Ansicht bekommt sie beim Namen', JSON.stringify(sd?.fehlt) === JSON.stringify(['Brevo-Code', 'DMARC']) && sd?.ok === false);
  check('Eintraege fehlen: Brevo wurde nach dem Grund gefragt', d.aufrufe.some(a => a.methode === 'GET' && a.pfad === '/senders/domains/eugen.family'));
  const sch = brevo({ domains: 'offen', beglaubige: 'schon' });
  const rs = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: sch.fetchImpl });
  check('Inzwischen schon beglaubigt (Brevo lehnt den Klick ab): bestanden', rs.ok && sch.mails().length === 5);
  let gefragt = 0;
  const fremd = await beglaubigeDomain(SCHLUESSEL_HAUS, 'example.org', { fetchImpl: async () => { gefragt += 1; return new Response('{}', { status: 200 }); } });
  check('Fremde Domain: nie beglaubigt, Brevo nicht einmal gefragt', fremd.beglaubigt === false && gefragt === 0);
  const ip = brevo({ domains: 'keine', beglaubige: 'ip' });
  const rip = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: ip.fetchImpl });
  check('IP-Sperre beim Beglaubigen: sofort Schluss, kein zweiter Versuch bei der anderen Domain', rip.grund === 'ip_gesperrt' && ip.beglaubigungen().length === 1 && ip.mails().length === 0);
}
{
  const b = brevo({ konto: 'rechte', domains: 'rechte' });
  const r = await pruefeVersand({ schluessel: SCHLUESSEL_HAUS, an: SARAH, fetchImpl: b.fetchImpl });
  check('Eingeschraenkter Schluessel: Testmails entscheiden', r.ok === true && b.mails().length === 5);
  check('Eingeschraenkter Schluessel: Domains als unbekannt gemeldet', r.schritte.some(s => s.was === 'domains' && s.ok === null));
  check('Eingeschraenkter Schluessel: dann auch kein Beglaubigungsversuch', b.beglaubigungen().length === 0);
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
  // Im Dienst: die Domains des Hauses sind noch nicht beglaubigt (Sarahs Klick fehlt).
  // Die Pruefung beglaubigt sie mit dem Hausschluessel - umgestellt ist danach nichts.
  const { haus } = baueHaus(echtEnv);
  spiel = brevo({ domains: 'keine' });
  const p = await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH });
  check('Dienst: Pruefen beglaubigt beide Domains und besteht', p.ok && spiel.beglaubigungen().length === 2 && spiel.mails().length === 5);
  check('Dienst: beglaubigt mit dem Hausschluessel, nie mit dem von Jonas', spiel.aufrufe.filter(a => a.methode === 'PUT').every(a => a.schluessel === SCHLUESSEL_HAUS));
  check('Dienst: Antwort meldet beide als eben beglaubigt', p.schritte.filter(s => s.was === 'domain' && s.eben === true).length === 2);
  check('Dienst: nach dem Beglaubigen noch NICHT umgestellt', !haus.mailversandStand().aktiv && Boolean(haus.mailversandStand().pruefung));
  check('Dienst: Antwort ohne den Schluessel', !JSON.stringify(p).includes(SCHLUESSEL_HAUS));
  spiel = brevo({ domains: 'offen', beglaubige: 'rechte' });
  const ohneRecht = await haus.mailversandPruefen({ schluessel: SCHLUESSEL_HAUS, an: SARAH });
  check('Dienst: Schluessel ohne Recht - Grund genannt, keine Testmail, keine Pruefung gemerkt',
    ohneRecht.grund === 'darf_nicht_beglaubigen' && spiel.mails().length === 0 && !haus.mailversandStand().pruefung);
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
  check('Wirt-Ansicht erklaert jeden Grund beim Beglaubigen', ['darf_nicht_beglaubigen', 'dns_unvollstaendig', 'nicht_beglaubigt', 'domain_fehlt']
    .every(g => (mailTeil.match(new RegExp(`\\b${g}: '`, 'g')) || []).length === 2));
  check('Wirt-Ansicht sagt, wenn der Dienst eben beglaubigt hat', /s\.eben \? `\$\{s\.name\} ist jetzt beglaubigt/.test(mailTeil));
  check('Wirt-Ansicht nennt fehlende Eintraege beim Namen', /fehlt: \$\{s\.fehlt\.join\(', '\)\}/.test(mailTeil));
  check('Kein Fehlertext schickt Sarah zu Jonas', !/Jonas Bescheid|Jonas fragen|an Jonas wenden/.test(mailTeil));
  check('Kastentext sagt, dass der Dienst die Domains beglaubigt', /beglaubigt\s+eure beiden Domains bei Brevo/.test(seite));
}

// ---- 5. Die Anleitung passt zur Wirt-Ansicht --------------------------------
{
  const anleitung = await liesDatei('docs/mailversand-selbst-umstellen.md', 'utf8');
  const wirt = await liesDatei('site/wirt.js', 'utf8');
  const seite = await liesDatei('site/wirt.html', 'utf8');
  const flach = s => s.replace(/\s+/g, ' ');
  const ui = flach(wirt + seite);
  // Jeder Knopf und jedes Feld, das die Anleitung nennt, heisst in der Wirt-Ansicht genau so.
  for (const text of ['Mailversand – euer Brevo-Konto', 'API-Schlüssel aus eurem Brevo-Konto', 'Testmails an', 'Prüfen und Testmails schicken',
    'Alle Testmails sind da – jetzt umstellen', 'Abbrechen', 'Zurück zum bisherigen Versand', 'Neuen Schlüssel prüfen']) {
    check(`Anleitung und Wirt-Ansicht nennen „${text}“ gleich`, flach(anleitung).includes(text) && ui.includes(text));
  }
  // Die Rechte des Schluessels: senden (Transactional email: All) und beglaubigen (Account: Read/write).
  check('Anleitung nennt die Rechte des Schluessels', /\| \*\*Transactional email\*\* \| \*\*All\*\* \|/.test(anleitung)
    && /\| \*\*Account\*\* \| \*\*Read\/write\*\* \|/.test(anleitung));
  // Die Links in Brevo sind belegt (Brevo-Doku und -Hilfe, 15.11.2026) - nicht verstuemmeln.
  check('Anleitung verlinkt die Schluesselseite und die IP-Sperre in Brevo',
    anleitung.includes('(https://app.brevo.com/settings/keys/api)') && anleitung.includes('(https://app.brevo.com/security/authorised_ips)'));
  // Abschnitt einer Ueberschrift bis zur naechsten.
  const abschnitt = titel => { const a = anleitung.indexOf(titel); if (a < 0) return ''; const b = anleitung.indexOf('\n## ', a + titel.length); return anleitung.slice(a, b < 0 ? undefined : b); };
  // Sarah klickt in Brevo nicht mehr "Authentifizieren" - das erledigt der Dienst.
  const blick = abschnitt('## So läuft es ab');
  check('So läuft es ab: kein Klick auf Authentifizieren, die Webseite beglaubigt',
    blick.length > 200 && !/Authentifizieren|Authenticate/.test(blick) && /beglaubigt die Webseite eure Domains bei Brevo selbst/.test(flach(blick)));
  check('Anleitung sagt beim Pruefen, dass die Webseite selbst beglaubigt', /Die Webseite beglaubigt dabei eure beiden Domains selbst bei Brevo/.test(flach(anleitung)));
  // Jede Meldung der Wirt-Ansicht hat eine Zeile in "Wenn etwas rot ist" - und heisst dort gleich.
  const von = anleitung.indexOf('## Wenn etwas rot ist');
  const tabelle = von < 0 ? '' : anleitung.slice(von, anleitung.indexOf('**Vorlage für den Brevo-Support.**', von));
  const meldungen = {
    konto_nicht_freigeschaltet: 'Versand im Konto noch nicht freigeschaltet', darf_nicht_beglaubigen: 'Der Schlüssel darf die Domain nicht beglaubigen',
    dns_unvollstaendig: 'Brevo findet noch nicht alle Einträge', nicht_beglaubigt: 'ist noch nicht beglaubigt',
    domain_fehlt: 'steht nicht in eurem Brevo-Konto', schluessel_ungueltig: 'Brevo kennt den Schlüssel nicht',
    smtp_schluessel: 'Das ist ein SMTP-Schlüssel', keine_berechtigung: 'Dem Schlüssel fehlen Rechte', absender_ungueltig: 'Absender nicht angenommen',
    ip_gesperrt: 'IP-Sperre bei Brevo', zu_oft: 'Zu viele Versuche', konto_gesperrt: 'Konto bei Brevo gesperrt oder in Prüfung',
    brevo_fehler: 'Brevo hat die Anfrage abgelehnt', pruefung_veraltet: 'Inzwischen wurde neu geprüft',
    brevo_stoerung: 'Störung bei Brevo', zu_viele: 'Brevo bremst gerade', netz: 'nicht erreichbar'
  };
  // Erste Spalte jeder Zeile der Tabelle - dort muss die Meldung so stehen, wie die Wirt-Ansicht sie zeigt.
  const ersteSpalten = tabelle.split('\n').filter(z => z.startsWith('| ') && !z.startsWith('| ---')).map(z => z.split(' | ')[0].slice(2));
  check('Tabelle "Wenn etwas nicht klappt" gefunden', tabelle.length > 1000);
  for (const [grund, zeile] of Object.entries(meldungen)) {
    check(`Anleitung erklaert „${zeile}“`, ersteSpalten.some(spalte => spalte.includes(zeile)));
    check(`Wirt-Ansicht meldet „${zeile}“ (${grund})`, ui.toLowerCase().includes(zeile.toLowerCase()) && new RegExp(`\\b${grund}: '`).test(wirt));
  }
  // Die Bilder der Anleitung liegen im Repository.
  const bilder = [...anleitung.matchAll(/^!\[[^\]]*\]\(([^)]+)\)\s*$/gm)].map(m => m[1]);
  check('Anleitung hat ihre vier Bilder', bilder.length === 4 && bilder.every(b => existsSync(`docs/${b}`)));
  // Jede Handlung in Schritt 1 bis 4 hat ein Kaestchen zum Abhaken (Jonas, 16.11.2026).
  const schritte = [1, 2, 3, 4].map(n => abschnitt(`## Schritt ${n} `));
  const punkte = schritte.flatMap(s => s.split('\n').filter(z => /^\d+\.\s/.test(z)));
  check('Jede Handlung in Schritt 1 bis 4 hat ein Kaestchen',
    schritte.every(s => s.length > 200) && punkte.length >= 20 && punkte.every(z => /^\d+\. \[ \] /.test(z)));
  // Brevo-Hilfe vom 16.11.2026: Der MCP-Schalter steht erst neben dem fertigen
  // Schluessel, und der Bestaetigungscode geht an die Anmeldeadresse des Kontos.
  check('Schritt 1: erst Generate, dann der MCP-Schalter',
    schritte[0].indexOf('**Generate**') > 0 && schritte[0].indexOf('Create MCP server API key') > schritte[0].indexOf('**Generate**'));
  check('Bevor du anfängst: wohin Brevos Bestaetigungscode kommt', /Bestätigungscode/.test(abschnitt('## Bevor du anfängst')));
  // Gruppe 17.11.2026: Sarah stand am Laptop vor „Dieses Gerät anmelden“ ohne
  // Hausschluessel, und in Brevo vor „Nicht authentifiziert“. Beides steht jetzt
  // vorn - gekoppelt an Anmeldekasten, Reiterleiste und das Beglaubigen im Dienst.
  const vorher = flach(abschnitt('## Bevor du anfängst'));
  const reiter = [...seite.matchAll(/class="reiter-knopf" type="button" data-ziel="(\w+)"/g)].map(m => m[1]).join(' · ');
  check('Bevor du anfängst: Wirt-Ansicht angemeldet (Reiter wie in der App), sonst Link mit Hausschluessel – nicht der Brevo-Schluessel',
    reiter === 'heute · karte · warteliste · haus' && vorher.includes(`Reiter ${reiter}.`)
    && /<h2 id="anmeldeTitel">Dieses Gerät anmelden<\/h2>/.test(seite) && vorher.includes('„Dieses Gerät anmelden“')
    && /Link mit dem \*\*Hausschlüssel\*\*/.test(vorher) && vorher.includes('In dieses Feld gehört nicht der Brevo-Schlüssel, und das alte Wort „Wirtschaft“ gilt seit August nicht mehr.'));
  // Brevo schlaegt fuers Branding die Unteradresse „mail“ vor. Unter mail. laeuft
  // bei beiden Domains der Mailserver bei Hetzner (Ziel des MX, Markus) - wer das
  // Branding durchklickt, legt den Posteingang lahm. Steht in Schritt 1 und bei Fertig.
  check('Anleitung: „Nicht gebrandet“ bleibt, nie etwas mit „mail“ einrichten (Schritt 1 und Fertig)',
    /\*\*„Nicht gebrandet“ bleibt so, auch später\.\*\* Dort nie etwas einrichten, vor allem nichts mit „mail“/.test(flach(schritte[0]))
    && /„Nicht gebrandet“ bleibt – das ist richtig so/.test(flach(abschnitt('## Fertig'))));
  const mailversandQuelle = await liesDatei('server/src/mailversand.mjs', 'utf8');
  check('Schritt 1: „Nicht authentifiziert“ in Brevo ist richtig so, die Webseite beglaubigt in Schritt 2',
    /\$\{pfad\}\/authenticate`, \{ methode: 'PUT'/.test(mailversandQuelle)
    && /\*\*Zeigt Brevo bei euren Domains „Nicht authentifiziert“\?\*\* Das ist richtig so\. Dort nichts anklicken/.test(flach(schritte[0])));
  // Was die Anleitung ueber Wirt-Ansicht und Dienst sagt, stimmt mit dem Code
  // ueberein (Durchsicht vom 16.11.2026) - aendert sich der Code, schlaegt das hier an.
  const ansichtQuelle = await liesDatei('site/wirt-ansicht.mjs', 'utf8');
  const bloecke = ansichtQuelle.slice(ansichtQuelle.indexOf('BLOECKE = ['), ansichtQuelle.indexOf('];', ansichtQuelle.indexOf('BLOECKE = [')));
  const blockIds = [...bloecke.matchAll(/\{ id: '(\w+)'/g)].map(m => m[1]);
  check('Anleitung: Mailversand steht fast am Ende des Reiters haus', blockIds.at(-1) === 'mailKasten'
    && /Fast am Ende steht \*\*Mailversand – euer Brevo-Konto\*\*/.test(flach(anleitung)));
  check('Anleitung: das Feld "Testmails an" ist leer und zeigt nur ein graues Beispiel',
    /id="mailAn"[^>]*placeholder="z\. B\. /.test(seite) && /Das graue „z\. B\. …“ im Feld ist nur ein Beispiel/.test(flach(anleitung)));
  check('Anleitung: im Postfach heissen alle Testmails wie der Absendername', flach(anleitung).includes(`„${ABSENDER_NAME}“`));
  check('Anleitung: eine Pruefung gilt so lange, wie der Dienst sie gelten laesst',
    PRUEFUNG_GILT_MS === 2 * 60 * 60 * 1000 && /Prüfung gilt zwei Stunden/.test(flach(anleitung)));
  check('Anleitung: "Zurueck" loescht den Schluessel, danach geht es bei Schritt 1 weiter',
    /aus dem Dienst gelöscht/.test(wirt) && /Schlüssel wird aus der Webseite gelöscht\. Später Schritt 1 bis 3/.test(flach(abschnitt('## Zurück zum alten Versand'))));
}

if (fehler) {
  console.error(`Mailversand-Prüfung FEHLGESCHLAGEN: ${fehler} Punkt(e).`);
  process.exit(1);
}
console.log('Mailversand-Prüfung OK: Eingaben, Brevos Antworten, alle Wege der Prüfung samt Beglaubigen der Domains, der Dienst vorher/geprüft/umgestellt/zurück, Sicherung ohne Schlüssel, Testumgebung ohne Mails, Quelltext, Wirt-Ansicht und Anleitung geprüft.');
