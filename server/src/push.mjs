// Web Push: die Meldung auf den Sperrbildschirm, die nichts kostet.
//
// Warum ueberhaupt: Eine SMS kostet pro Stueck Geld, eine Mail erreicht in
// einem Zwanzig-Minuten-Fenster niemanden zuverlaessig. Web Push geht direkt
// an den Push-Dienst des Browsers - Google, Apple, Mozilla - und der verlangt
// nichts dafuer. Kein Anbieter dazwischen, kein Guthaben, keine Grundgebuehr.
//
// Warum ohne Inhalt: Dieser Dienst schickt eine leere Meldung. Was drinsteht,
// holt sich der Service Worker anschliessend selbst beim Dienst. Das ist
// erstens einfacher - die Nutzlastverschluesselung nach RFC 8291 ist eine
// heikle Kette aus ECDH, HKDF und AES-GCM, die man still falsch macht - und
// zweitens sparsamer: ueber die Server von Google und Apple laeuft dann nur
// "da war etwas", nicht "Nr. 4, Kaesknoepfle, Anna". Was niemanden angeht,
// wird auch nicht verschickt.
//
// Was bleibt, ist der Ausweis nach RFC 8292 (VAPID): ein kurzlebiges,
// signiertes Ticket, mit dem sich der Dienst beim Push-Server als der
// Absender ausweist, der die Anmeldung bekommen hat.

/** Wie lange ein Ausweis gilt. Kurz genug, um nicht zu wandern. */
const AUSWEIS_STUNDEN = 6;

/** Wie lange der Push-Dienst die Meldung aufhebt, wenn das Geraet aus ist. */
const HALTBAR_SEKUNDEN = 20 * 60;

const alsBase64Url = puffer => btoa(String.fromCharCode(...new Uint8Array(puffer)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const textAlsBase64Url = text => alsBase64Url(new TextEncoder().encode(text));

/**
 * Den privaten Schluessel einlesen. Er steht als Geheimnis im Worker, im
 * JWK-Format ohne Beiwerk: {"d":"...","x":"...","y":"..."}.
 */
async function ladeSchluessel(geheimnis) {
  const teile = JSON.parse(geheimnis);
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: teile.d, x: teile.x, y: teile.y, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

/**
 * Der VAPID-Ausweis fuer genau einen Push-Dienst.
 *
 * `aud` ist die Herkunft des Endpunkts, nicht der Endpunkt selbst - ein
 * Ausweis fuer Googles Push-Dienst gilt nicht bei Apple. `sub` muss eine
 * Adresse sein, unter der der Push-Dienst den Absender erreichen kann, wenn
 * etwas schiefgeht.
 */
async function baueAusweis(endpunkt, schluessel, kontakt) {
  const herkunft = new URL(endpunkt).origin;
  const kopf = textAlsBase64Url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const inhalt = textAlsBase64Url(JSON.stringify({
    aud: herkunft,
    exp: Math.floor(Date.now() / 1000) + AUSWEIS_STUNDEN * 3600,
    sub: kontakt
  }));
  const zuSignieren = new TextEncoder().encode(`${kopf}.${inhalt}`);
  // WebCrypto liefert die Signatur bereits als r||s - genau das, was JWS
  // fuer ES256 erwartet. Die DER-Umwandlung, die andere Umgebungen brauchen,
  // entfaellt hier.
  const signatur = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, schluessel, zuSignieren
  );
  return `${kopf}.${inhalt}.${alsBase64Url(signatur)}`;
}

/**
 * Eine leere Meldung an eine Anmeldung schicken.
 *
 * Rueckgabe sagt, was der Push-Dienst geantwortet hat. 404 und 410 heissen:
 * diese Anmeldung gibt es nicht mehr - der Gast hat die Seite vom
 * Home-Bildschirm geworfen oder die Erlaubnis entzogen. Solche Anmeldungen
 * gehoeren geloescht, sonst sammelt der Dienst Karteileichen.
 */
export async function schickePush(anmeldung, { privatSchluessel, oeffentlich, kontakt }) {
  const endpunkt = String(anmeldung?.endpunkt || '');
  if (!/^https:\/\//.test(endpunkt)) return { ok: false, grund: 'endpunkt' };
  if (!privatSchluessel || !oeffentlich) return { ok: false, grund: 'nicht_eingerichtet' };

  let ausweis;
  try {
    const schluessel = await ladeSchluessel(privatSchluessel);
    ausweis = await baueAusweis(endpunkt, schluessel, kontakt || 'mailto:willkommen@wirtschaft-dornbirn.at');
  } catch {
    return { ok: false, grund: 'schluessel' };
  }

  let antwort;
  try {
    antwort = await fetch(endpunkt, {
      method: 'POST',
      headers: {
        // Ohne Inhalt: keine Verschluesselung, keine Content-Encoding-Zeile.
        // Content-Length: 0 verlangen manche Push-Dienste ausdruecklich.
        'content-length': '0',
        ttl: String(HALTBAR_SEKUNDEN),
        urgency: 'high',
        authorization: `vapid t=${ausweis}, k=${oeffentlich}`
      }
    });
  } catch {
    return { ok: false, grund: 'netz' };
  }

  if (antwort.status === 404 || antwort.status === 410) {
    return { ok: false, grund: 'weg', entfernen: true, status: antwort.status };
  }
  if (!antwort.ok) return { ok: false, grund: 'abgelehnt', status: antwort.status };
  return { ok: true, status: antwort.status };
}

/**
 * Prueft, ob eine Anmeldung aus dem Browser brauchbar aussieht, bevor sie
 * gespeichert wird. Der Endpunkt ist das Einzige, was der Dienst wirklich
 * braucht - die Schluessel des Browsers waeren nur fuer Nutzlasten noetig,
 * und die schicken wir bewusst nicht.
 */
export function pruefePushAnmeldung(roh) {
  const endpunkt = String(roh?.endpunkt || roh?.endpoint || '').trim();
  if (!/^https:\/\/[^\s]+$/.test(endpunkt)) return { ok: false, grund: 'endpunkt' };
  // Eine Grenze, damit niemand den Speicher mit einer langen Adresse fuellt.
  if (endpunkt.length > 800) return { ok: false, grund: 'endpunkt' };
  return { ok: true, anmeldung: { endpunkt } };
}
