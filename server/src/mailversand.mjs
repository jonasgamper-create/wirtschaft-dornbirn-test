// Den Mailversand selbst umstellen (15.11.2026).
//
// Wozu: Bis hierher verschickt der Dienst ueber das Brevo-Konto von Jonas.
// Schluessel (BREVO_KEY) und Absender (BREVO_ABSENDER) stehen als Geheimnisse
// im Cloudflare-Konto, in dem der Dienst laeuft - an die kommt das Haus nicht
// heran. Das Haus hat ein eigenes Brevo-Konto (Sarah, Anfang November). Damit
// es den Versand selbst umstellen kann, ohne Zugang zu Cloudflare und ohne den
// Schluessel jemandem zu schicken, nimmt der Dienst ihn in der Wirt-Ansicht
// entgegen (Reiter haus, "Mailversand").
//
// Die Regel, die alles traegt: Schluessel und Absender wechseln GEMEINSAM und
// erst, wenn Brevo bewiesen hat, dass es klappt. Mit dem Schluessel des Hauses
// und dem alten Absender verschickte Brevo nichts (die alte Adresse gehoert
// nicht zu diesem Konto) - mit dem alten Schluessel und den neuen Absendern
// ebenso wenig. Deshalb in drei Schritten:
//
//   1. pruefen   - Schluessel gueltig? Beide Domains beglaubigt? Von jeder
//                  der fuenf Adressen eine Testmail an eine Adresse, die das
//                  Haus angibt - von Brevo angenommen? Am laufenden Versand
//                  aendert sich dabei NICHTS.
//   2. umstellen - erst, wenn im Postfach alle Testmails angekommen sind.
//                  Dann gelten der neue Schluessel und alle neuen Absender
//                  auf einmal.
//   3. zurueck   - ein Knopf, und es gilt wieder, was in Cloudflare steht.
//
// Der Schluessel liegt danach in einer eigenen Tabelle des Dienstes, die in
// keine Sicherungsdatei wandert (siehe sicherung.mjs), und kommt in keiner
// Antwort des Dienstes je wieder heraus - nur seine letzten vier Zeichen, damit
// man zwei Schluessel auseinanderhalten kann.
//
// Diese Datei ist rein: kein Speicher, kein Dienst. Gespraechspartner (fetch)
// und Paketbauer werden hereingereicht, damit das Pruefskript alles ohne Netz
// durchspielen kann (scripts/check-mailversand.mjs).

import { brevoPaket, deuteBrevo, escapeHtml } from './mail.mjs';

export { deuteBrevo };

export const BREVO_API = 'https://api.brevo.com/v3';

/** Die beiden Domains des Hauses. Beide muessen bei Brevo beglaubigt sein. */
export const HAUS_DOMAINS = Object.freeze(['wirtschaft-dornbirn.at', 'eugen.family']);

/**
 * Die Absender aus dem Hausentscheid (docs/mailadressen-entscheidung.md,
 * Abschnitt 5). "haupt" ist der Hausabsender fuer alles ohne eigenen Zweck:
 * Tageszettel, Wochenbericht, Wochenkarte, Anfragen, Rueckfragen zur
 * Mittagskarte. scripts/check-absender.mjs haelt die Liste und das Dokument
 * gleich.
 */
export const HAUS_ABSENDER = Object.freeze({
  haupt: 'willkommen@wirtschaft-dornbirn.at',
  service: 'service@wirtschaft-dornbirn.at',
  warteliste: 'veranstaltungen@wirtschaft-dornbirn.at',
  kulturhaus: 'tickets@eugen.family',
  events: 'uri@eugen.family'
});

/** Der Name, den Brevo neben der Adresse zeigt - derselbe wie im Betrieb (brevoPaket). */
export const ABSENDER_NAME = 'Wirtschaft Dornbirn';

/**
 * Von JEDER Adresse eine Testmail - nicht nur eine je Domain. Brevo prueft
 * den Absender je Adresse: eine fehlende stuende sonst erst im Betrieb fest,
 * mit der ersten Reservierungsbestaetigung, die nicht ankommt. Und im
 * Postfach sieht das Haus bei jeder Mail, ob wirklich diese Adresse als
 * Absender dasteht (Brevo ersetzt eine unzulaessige sonst stillschweigend).
 */
export const TEST_ABSENDER = Object.freeze([
  HAUS_ABSENDER.haupt, HAUS_ABSENDER.service, HAUS_ABSENDER.warteliste, HAUS_ABSENDER.kulturhaus, HAUS_ABSENDER.events
].map(email => ({ email, name: ABSENDER_NAME })));

/** So lange reicht eine bestandene Pruefung zum Umstellen. */
export const PRUEFUNG_GILT_MS = 2 * 60 * 60 * 1000;

/** Hoechstens so viele Pruefungen mit Testmails je Stunde - jede verschickt fuenf Mails. */
export const PRUEFUNGEN_JE_STUNDE = 6;

/**
 * Hoechstens so viele Anfragen bei Brevo je Stunde. Ein falsch kopierter
 * Schluessel verschickt nichts und zaehlt deshalb nicht gegen die sechs
 * Pruefungen mit Testmails - nur gegen diese Grenze.
 */
export const VERSUCHE_JE_STUNDE = 30;

/**
 * Welcher Absender des Hauses fuer welchen Zweck. Dieselbe Regel nutzt der
 * Dienst fuer jede Mail (#absender, #hausAbsender, Terminliste) - hier rein,
 * damit das Pruefskript jede Zuordnung einzeln pruefen kann.
 *
 * @param zweck 'service' | 'warteliste' | 'events' | 'haupt'
 * @param haus  bei 'warteliste': 'kulturhaus' oder 'wirtschaft'
 */
export function absenderFuer(eigen, zweck, haus = 'wirtschaft') {
  if (zweck === 'warteliste') return haus === 'kulturhaus' ? eigen.kulturhaus : eigen.warteliste;
  if (zweck === 'service') return eigen.service;
  if (zweck === 'events') return eigen.events;
  return eigen.haupt;
}

/**
 * Was das Haus eingefuegt hat. Leerzeichen und Zeilenumbrueche kommen beim
 * Kopieren gern mit und gehoeren nie zu einem Schluessel. Ein SMTP-Schluessel
 * (xsmtpsib-) sieht aehnlich aus, taugt fuer die Schnittstelle aber nicht -
 * der haeufigste Griff daneben, deshalb mit eigenem Grund.
 */
export function liesSchluessel(roh) {
  const text = String(roh ?? '').replace(/\s+/g, '');
  if (!text) return { ok: false, grund: 'leer' };
  if (/^xsmtpsib-/i.test(text)) return { ok: false, grund: 'smtp_schluessel' };
  if (text.length < 20 || text.length > 300 || !/^[\x21-\x7e]+$/.test(text)) return { ok: false, grund: 'form' };
  return { ok: true, schluessel: text };
}

/** Die Adresse, an die die Testmails gehen. */
export function liesAdresse(roh) {
  const an = String(roh ?? '').trim().toLowerCase();
  if (an.length > 200 || !/^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/.test(an)) return { ok: false, grund: 'an' };
  return { ok: true, an };
}

/** Die letzten vier Zeichen - genug, um zwei Schluessel zu unterscheiden. */
export const schluesselEnde = schluessel => {
  const text = String(schluessel || '');
  return text.length >= 8 ? `…${text.slice(-4)}` : '';
};

/** Ein Aufruf bei Brevo. Wirft nie; ein Netzfehler ist ein Grund wie jeder andere. */
export async function brevoRuf(schluessel, pfad, { methode = 'GET', koerper = null, fetchImpl = fetch } = {}) {
  const kopf = { 'api-key': String(schluessel || ''), accept: 'application/json' };
  if (koerper) kopf['content-type'] = 'application/json';
  try {
    const antwort = await fetchImpl(`${BREVO_API}${pfad}`, {
      method: methode,
      headers: kopf,
      body: koerper ? JSON.stringify(koerper) : undefined
    });
    const text = await antwort.text().catch(() => '');
    let daten = null;
    try { daten = text ? JSON.parse(text) : null; } catch { daten = null; }
    if (antwort.ok) return { ok: true, status: antwort.status, daten };
    const meldung = `${daten?.code || ''} ${daten?.message || (daten ? '' : text)}`;
    // eindeutig: Brevos Text allein nennt den Grund - nicht nur der Statuscode.
    return { ok: false, status: antwort.status, daten: null, grund: deuteBrevo(antwort.status, meldung),
      eindeutig: deuteBrevo(0, meldung) !== 'brevo_fehler' };
  } catch {
    return { ok: false, status: 0, daten: null, grund: 'netz' };
  }
}

/** Wem das Brevo-Konto gehoert - so, wie Brevo es nennt. */
export function kontoKurz(daten) {
  if (!daten || typeof daten !== 'object') return null;
  const person = [daten.firstName, daten.lastName].filter(Boolean).join(' ');
  const name = String(daten.companyName || person || '').trim().slice(0, 80);
  const email = String(daten.email || '').trim().toLowerCase().slice(0, 120);
  return name || email ? { name, email } : null;
}

/** Stehen beide Domains im Konto, und sind sie beglaubigt? */
export function bewerteDomains(daten) {
  const liste = Array.isArray(daten?.domains) ? daten.domains : null;
  if (!liste) return null;
  return HAUS_DOMAINS.map(name => {
    const eintrag = liste.find(d => String(d?.domain_name || '').trim().toLowerCase() === name);
    return { name, da: Boolean(eintrag), beglaubigt: eintrag?.authenticated === true };
  });
}

/** Die Testmail. Sie erklaert sich selbst - falls sie jemand anderer liest. */
export function testMail({ absender, nummer, gesamt, konto }) {
  // Betreff nennt den Absender: so lassen sich fuenf Mails im Postfach abhaken.
  const wessen = konto?.name ? `„${konto.name}“` : 'eures Hauses';
  const absaetze = [
    `Diese Testmail kommt von ${absender}. Steht oben als Absender genau diese Adresse? Dann ist sie in Ordnung.`,
    `Der Dienst der Webseite hat sie über das Brevo-Konto ${wessen} verschickt, um zu prüfen, ob der Versand klappt. Am laufenden Versand hat sich dabei noch nichts geändert.`,
    `Sind alle ${gesamt} Testmails angekommen, drückt in der Wirt-Ansicht unter „haus → Mailversand“ auf „jetzt umstellen“. Diese Mail braucht keine Antwort.`
  ];
  return {
    betreff: `Testmail ${nummer} von ${gesamt} – Absender ${absender}`,
    text: `${absaetze.join('\n\n')}\n`,
    html: `<!doctype html><html lang="de"><body style="margin:0;padding:24px;background:#f3efe6;">`
      + absaetze.map(a => `<p style="margin:0 0 14px;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#11110f;">${escapeHtml(a)}</p>`).join('')
      + '</body></html>'
  };
}

/**
 * Die Pruefung. Sie aendert nichts am laufenden Versand - sie schickt nur die
 * Testmails und sagt, ob und woran es scheitert.
 *
 * Fehlen dem Schluessel die Rechte, das Konto oder die Domains zu lesen (ein
 * eingeschraenkter Schluessel), entscheiden die Testmails allein: nimmt Brevo
 * sie von allen Adressen an, ist der Versand bewiesen - und das Haus sieht im
 * Postfach, ob jede mit ihrem richtigen Absender ankam.
 *
 * @returns {{ ok: boolean, grund?: string, schritte: object[], konto: object|null, domains: object[]|null }}
 */
export async function pruefeVersand({ schluessel, an, fetchImpl = fetch, vorDemVersand = null }) {
  const schritte = [];
  const ende = (grund, extra = {}) => ({ ok: false, grund, schritte, konto: extra.konto ?? null, domains: extra.domains ?? null });
  // Konto und Domains lesen darf ein eingeschraenkter Schluessel womoeglich
  // nicht - wie Brevo das genau sagt, ist nicht belegt. Deshalb bricht hier nur
  // ab, was sicher ist: Schluessel unbekannt (laut Text), IP-Sperre, Konto
  // nicht freigeschaltet oder gesperrt, Stoerung. Alles andere entscheiden die
  // Testmails.
  const endgueltig = r => ['ip_gesperrt', 'konto_nicht_freigeschaltet', 'konto_gesperrt', 'netz', 'brevo_stoerung', 'zu_viele'].includes(r.grund)
    || (r.grund === 'schluessel_ungueltig' && r.eindeutig);

  const konto = await brevoRuf(schluessel, '/account', { fetchImpl });
  if (!konto.ok && endgueltig(konto)) {
    schritte.push({ was: 'schluessel', ok: false, grund: konto.grund });
    return ende(konto.grund);
  }
  const kontoInfo = konto.ok ? kontoKurz(konto.daten) : null;
  schritte.push({ was: 'schluessel', ok: true, konto: kontoInfo });

  const domainAntwort = await brevoRuf(schluessel, '/senders/domains', { fetchImpl });
  let domains = null;
  if (domainAntwort.ok) {
    domains = bewerteDomains(domainAntwort.daten);
    if (!domains) {
      schritte.push({ was: 'domains', ok: false, grund: 'brevo_fehler' });
      return ende('brevo_fehler', { konto: kontoInfo });
    }
    for (const d of domains) {
      schritte.push({ was: 'domain', name: d.name, ok: d.beglaubigt, grund: d.beglaubigt ? null : (d.da ? 'nicht_beglaubigt' : 'domain_fehlt') });
    }
    const offen = domains.find(d => !d.beglaubigt);
    if (offen) return ende(offen.da ? 'nicht_beglaubigt' : 'domain_fehlt', { konto: kontoInfo, domains });
  } else if (endgueltig(domainAntwort)) {
    schritte.push({ was: 'domains', ok: false, grund: domainAntwort.grund });
    return ende(domainAntwort.grund, { konto: kontoInfo });
  } else {
    schritte.push({ was: 'domains', ok: null, grund: 'keine_berechtigung' });
  }

  // Erst jetzt gehen Mails hinaus - und nur, wenn die Grenze es erlaubt.
  if (vorDemVersand && !(await vorDemVersand())) return ende('zu_oft', { konto: kontoInfo, domains });

  for (const [i, absender] of TEST_ABSENDER.entries()) {
    const inhalt = testMail({ absender: absender.email, nummer: i + 1, gesamt: TEST_ABSENDER.length, konto: kontoInfo });
    const paket = brevoPaket({ absender: absender.email, absenderName: absender.name, an, betreff: inhalt.betreff, html: inhalt.html, text: inhalt.text });
    const versand = await brevoRuf(schluessel, '/smtp/email', { methode: 'POST', koerper: paket, fetchImpl });
    schritte.push({ was: 'testmail', absender: absender.email, ok: versand.ok, grund: versand.ok ? null : versand.grund });
    if (!versand.ok) return ende(versand.grund, { konto: kontoInfo, domains });
  }
  return { ok: true, schritte, konto: kontoInfo, domains };
}

/**
 * Die gespeicherte Einrichtung lesen - streng: nur was vollstaendig ist,
 * gilt. Eine halbe Einrichtung (Schluessel ohne Absender) wuerde den Versand
 * stilllegen, deshalb lieber gar keine.
 */
export function gueltigeEinrichtung(wert) {
  if (!wert || typeof wert !== 'object') return null;
  const schluessel = liesSchluessel(wert.schluessel);
  if (!schluessel.ok) return null;
  // Kommt spaeter ein Zweck dazu, gilt fuer ihn die Vorgabe aus dem
  // Hausentscheid - sonst fiele eine gespeicherte Einrichtung still weg und
  // der Versand liefe wieder ueber das alte Konto.
  const gespeichert = wert.absender && typeof wert.absender === 'object' ? wert.absender : {};
  const absender = { ...HAUS_ABSENDER, ...gespeichert };
  for (const zweck of Object.keys(HAUS_ABSENDER)) {
    if (!liesAdresse(absender[zweck]).ok) return null;
  }
  return { ...wert, schluessel: schluessel.schluessel, absender };
}

/** Eine bestandene Pruefung, die noch zum Umstellen reicht? */
export function pruefungGilt(wert, jetzt = Date.now()) {
  if (!wert || typeof wert !== 'object' || !liesSchluessel(wert.schluessel).ok) return false;
  const gilt = Date.parse(wert.gueltigBis || '');
  return Number.isFinite(gilt) && gilt > jetzt;
}
