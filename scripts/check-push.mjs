// Goldene Testfaelle fuer die Abholmeldung (Web Push).
//
// Geprueft wird das, was im Betrieb still kaputtgehen kann: der Ausweis nach
// RFC 8292 (falsch signiert heisst, der Push-Dienst lehnt wortlos ab), die
// Behandlung erloschener Anmeldungen und die Eingangspruefung.
//
// Der Worker benutzt globales `crypto` und `fetch`; Node hat beides ab 18,
// also laeuft dasselbe Modul hier wie dort.

import { pruefePushAnmeldung, schickePush } from '../server/src/push.mjs';
import { webcrypto } from 'node:crypto';

const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Push: ${name}${detail ? ` - ${detail}` : ''}`);
};

// ---- 1. Eingangspruefung ---------------------------------------------------

check('Gueltige Anmeldung geht durch',
  pruefePushAnmeldung({ endpunkt: 'https://fcm.googleapis.com/fcm/send/abc123' }).ok);
check('Feldname aus dem Browser wird auch genommen',
  pruefePushAnmeldung({ endpoint: 'https://web.push.apple.com/xyz' }).ok);
check('Kein http', pruefePushAnmeldung({ endpunkt: 'http://example.com/x' }).grund === 'endpunkt');
check('Kein Unsinn', pruefePushAnmeldung({ endpunkt: 'nichts' }).grund === 'endpunkt');
check('Leer faellt raus', pruefePushAnmeldung({}).grund === 'endpunkt');
check('Uebermaessig lange Adresse faellt raus',
  pruefePushAnmeldung({ endpunkt: `https://x.example/${'a'.repeat(900)}` }).grund === 'endpunkt');
// Die Schluessel des Browsers werden bewusst NICHT gespeichert: ohne Nutzlast
// braucht der Dienst sie nicht, und was man nicht braucht, hebt man nicht auf.
check('Nur der Endpunkt wird uebernommen',
  Object.keys(pruefePushAnmeldung({ endpunkt: 'https://a.example/b', keys: { p256dh: 'x', auth: 'y' } }).anmeldung)
    .join(',') === 'endpunkt');

// ---- 2. Der Ausweis (RFC 8292) ---------------------------------------------

const paar = await webcrypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']
);
const jwk = await webcrypto.subtle.exportKey('jwk', paar.privateKey);
const privat = JSON.stringify({ d: jwk.d, x: jwk.x, y: jwk.y });
const oeffentlich = Buffer.from(
  await webcrypto.subtle.exportKey('raw', paar.publicKey)
).toString('base64url');

let gesehen = null;
const echtesFetch = globalThis.fetch;
globalThis.fetch = async (adresse, optionen) => {
  gesehen = { adresse, optionen };
  return { ok: true, status: 201 };
};

const ergebnis = await schickePush(
  { endpunkt: 'https://fcm.googleapis.com/fcm/send/abc123' },
  { privatSchluessel: privat, oeffentlich, kontakt: 'mailto:test@example.at' }
);
check('Versand meldet Erfolg', ergebnis.ok, JSON.stringify(ergebnis));
check('Es wird POST geschickt', gesehen?.optionen?.method === 'POST');
check('Kein Koerper - die Meldung holt der Worker selbst',
  gesehen?.optionen?.body === undefined);
check('TTL ist gesetzt', Number(gesehen?.optionen?.headers?.ttl) > 0);

const kopf = String(gesehen?.optionen?.headers?.authorization || '');
check('Kopfzeile ist ein VAPID-Ausweis', kopf.startsWith('vapid t='), kopf.slice(0, 30));
check('Der oeffentliche Schluessel steht dabei', kopf.includes(`k=${oeffentlich}`));

const ausweis = kopf.slice('vapid t='.length).split(',')[0].trim();
const [kopfTeil, inhaltTeil, signaturTeil] = ausweis.split('.');
const alsText = teil => Buffer.from(teil, 'base64url').toString('utf8');
const kopfDaten = JSON.parse(alsText(kopfTeil));
const inhaltDaten = JSON.parse(alsText(inhaltTeil));

check('Signaturverfahren ist ES256', kopfDaten.alg === 'ES256' && kopfDaten.typ === 'JWT');
// aud ist die HERKUNFT des Push-Dienstes, nicht der ganze Endpunkt. Steht dort
// der volle Pfad, weist Google den Ausweis ab - und zwar ohne Erklaerung.
check('aud ist die Herkunft, nicht der ganze Endpunkt',
  inhaltDaten.aud === 'https://fcm.googleapis.com', inhaltDaten.aud);
check('sub ist die Kontaktadresse', inhaltDaten.sub === 'mailto:test@example.at');
check('Der Ausweis laeuft ab', Number(inhaltDaten.exp) > Math.floor(Date.now() / 1000));
check('Er gilt hoechstens einen Tag',
  Number(inhaltDaten.exp) < Math.floor(Date.now() / 1000) + 24 * 3600);

// Die Signatur muss mit dem oeffentlichen Schluessel aufgehen. Faellt das um,
// lehnt jeder Push-Dienst wortlos ab - das ist der Fehler, den man sonst erst
// im Betrieb bemerkt, wenn niemand eine Meldung bekommt.
const stimmt = await webcrypto.subtle.verify(
  { name: 'ECDSA', hash: 'SHA-256' },
  paar.publicKey,
  Buffer.from(signaturTeil, 'base64url'),
  Buffer.from(`${kopfTeil}.${inhaltTeil}`, 'utf8')
);
check('Die Signatur geht mit dem oeffentlichen Schluessel auf', stimmt);

// Ein zweiter Push-Dienst muss einen eigenen Ausweis bekommen.
await schickePush({ endpunkt: 'https://web.push.apple.com/xyz' },
  { privatSchluessel: privat, oeffentlich, kontakt: 'mailto:test@example.at' });
const zweiter = JSON.parse(alsText(
  String(gesehen.optionen.headers.authorization).slice('vapid t='.length).split(',')[0].split('.')[1]
));
check('Jeder Push-Dienst bekommt seinen eigenen Ausweis',
  zweiter.aud === 'https://web.push.apple.com', zweiter.aud);

// ---- 3. Erloschene und abgelehnte Anmeldungen ------------------------------

for (const status of [404, 410]) {
  globalThis.fetch = async () => ({ ok: false, status });
  const weg = await schickePush({ endpunkt: 'https://fcm.googleapis.com/fcm/send/x' },
    { privatSchluessel: privat, oeffentlich });
  check(`Status ${status} heisst: Anmeldung loeschen`,
    weg.entfernen === true && weg.grund === 'weg', JSON.stringify(weg));
}

globalThis.fetch = async () => ({ ok: false, status: 429 });
const gebremst = await schickePush({ endpunkt: 'https://fcm.googleapis.com/fcm/send/x' },
  { privatSchluessel: privat, oeffentlich });
check('Eine Bremse loescht die Anmeldung NICHT',
  gebremst.ok === false && !gebremst.entfernen, JSON.stringify(gebremst));

globalThis.fetch = async () => { throw new Error('kein Netz'); };
const ohneNetz = await schickePush({ endpunkt: 'https://fcm.googleapis.com/fcm/send/x' },
  { privatSchluessel: privat, oeffentlich });
check('Ein Netzfehler wirft nicht, sondern meldet',
  ohneNetz.ok === false && ohneNetz.grund === 'netz');

globalThis.fetch = echtesFetch;

// ---- 4. Ohne Einrichtung passiert nichts -----------------------------------

const ohneSchluessel = await schickePush({ endpunkt: 'https://fcm.googleapis.com/fcm/send/x' }, {});
check('Ohne Schluessel wird nichts verschickt',
  ohneSchluessel.ok === false && ohneSchluessel.grund === 'nicht_eingerichtet');
const kaputt = await schickePush({ endpunkt: 'https://fcm.googleapis.com/fcm/send/x' },
  { privatSchluessel: 'kein JSON', oeffentlich });
check('Ein unbrauchbarer Schluessel wirft nicht',
  kaputt.ok === false && kaputt.grund === 'schluessel');

// ---- Ergebnis --------------------------------------------------------------

if (errors.length) {
  console.error(`\nPush-Prüfung fehlgeschlagen (${errors.length}):`);
  for (const zeile of errors) console.error(`  - ${zeile}`);
  process.exit(1);
}
console.log('Push-Prüfung OK: Eingaben, VAPID-Ausweis samt Signatur, '
  + 'erloschene Anmeldungen und fehlende Einrichtung geprüft.');
