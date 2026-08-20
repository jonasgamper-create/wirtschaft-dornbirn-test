// SMS an den Gast: "dein Essen ist fertig".
//
// Warum SMS und nicht iMessage: Apple bietet keine Schnittstelle, um
// Nachrichten von aussen zu verschicken. "Apple Messages for Business" gibt
// es, funktioniert aber andersherum - der Gast schreibt zuerst, und es
// braucht einen zugelassenen Dienstleister. Fuer ein "ist fertig" von uns
// aus ist das nicht nutzbar.
//
// SMS erreicht dagegen jedes Telefon, ohne App und ohne dass der Gast etwas
// erlauben muss. Bei jemandem, der einmal im Monat abholt, scheitert alles
// andere an genau dieser Huerde.
//
// Die Nummer ist beim Takeaway ohnehin Pflichtfeld - es wird also nichts
// Neues erhoben. Nur der Zweck kommt dazu, und der steht in der
// Datenschutzerklaerung.

const BREVO_SMS = 'https://api.brevo.com/v3/transactionalSMS/sms';

/** Hoechstlaenge einer SMS, bevor sie geteilt und doppelt berechnet wird. */
export const SMS_ZEICHEN = 160;

/**
 * Die Nummer in die internationale Form bringen. Brevo nimmt sie ohne Plus
 * und ohne Zwischenraeume; eine oesterreichische 0 vorne wird zu 43.
 *
 * Gibt null zurueck, wenn daraus keine brauchbare Nummer wird - lieber keine
 * SMS als eine an irgendwen.
 */
export function nummerFuerSms(roh, land = '43') {
  // Die eingeklammerte Null zuerst weg. "+43 (0)660 123" heisst: waehle
  // international +43 660, im Inland 0660. Wer sie mitzaehlt, erzeugt
  // 430660... - eine Nummer, die es nicht gibt, und die SMS geht ins Leere.
  // Genau diese Schreibweise steht im Impressum des Hauses.
  const geputzt = String(roh ?? '').replace(/\(\s*0\s*\)/g, '');
  const ziffern = geputzt.replace(/[^\d+]/g, '');
  if (!ziffern) return null;
  let wert = ziffern.startsWith('+') ? ziffern.slice(1) : ziffern;
  // Fuehrende Doppelnull ist dieselbe Schreibweise wie das Plus.
  if (wert.startsWith('00')) wert = wert.slice(2);
  // Eine einzelne fuehrende Null ist die nationale Form: 0660... -> 43660...
  else if (wert.startsWith('0')) wert = land + wert.slice(1);
  // Keine Landesvorwahl erkennbar: nicht raten.
  else if (!/^(4[1-9]|[1-9]\d)/.test(wert)) return null;
  // Und auch ohne Klammern bleibt eine Null hinter der Landesvorwahl eine
  // Inlandsvorwahl - in Oesterreich beginnt keine Nummer damit.
  if (wert.startsWith(`${land}0`)) wert = land + wert.slice(land.length + 1);
  return /^\d{8,15}$/.test(wert) ? wert : null;
}

/**
 * Der Text. Drei Regeln stecken darin:
 *
 * Erstens nennt er kein Gericht. Sonst muesste die Nachricht jedes Mal
 * mitwandern, wenn die Karte wechselt - und die wechselt woechentlich.
 * Nummer und "ist fertig" sind alles, was der Gast braucht.
 *
 * Zweitens bleibt er unter 160 Zeichen, auch mit langem Vornamen. Darueber
 * wird die SMS geteilt und zweimal berechnet.
 *
 * Drittens - und das ist die unauffaelligste Falle - benutzt er nur Zeichen
 * aus dem GSM-7-Satz. Ein einziger typografischer Gedankenstrich, wie er im
 * ganzen uebrigen Projekt steht, kippt die Nachricht auf UCS-2: dann sind
 * nur noch 70 Zeichen je Teil erlaubt, und aus einer SMS werden zwei.
 * Deshalb hier ein schlichter Bindestrich und ein gerader Apostroph.
 */
export function fertigText({ name, haus = 'Wirtschaft Dornbirn' }) {
  const wer = String(name || '').trim().split(' ')[0].slice(0, 20);
  const anrede = wer ? `Passt, ${wer}!` : 'Passt!';
  // Ohne Bestellnummer: der Gast weiss, was er bestellt hat, und am Tresen
  // wird er mit Namen begruesst. Die Nummer steht in der Bestaetigung, wo sie
  // als Beleg zaehlt - hier waere sie nur eine Zahl mehr in einem Satz, der
  // freundlich sein soll.
  return `${anrede} Dein Essen ist fertig - wir halten's warm, bis du da bist. ${haus}`;
}

/**
 * "Wir haben deine Bestellung." Geht sofort nach dem Absenden raus.
 *
 * Beim Takeaway ist die Telefonnummer die einzige Erreichbarkeit - eine
 * Mailadresse wird gar nicht erhoben. Ohne diese SMS haette der Gast nur
 * die Bildschirmseite als Beleg, und die ist weg, sobald er sie schliesst.
 */
export function bestellungText({ nummer, zeit, wann = 'heute', haus = 'Wirtschaft Dornbirn' }) {
  return `Danke fuer deine Bestellung! Nr. ${nummer}, abholbereit ${wann} ca. ${zeit} Uhr. ${haus}`;
}

/**
 * "Dein Tisch steht." Nur wenn keine Mailadresse angegeben wurde - sonst
 * traegt die Bestaetigungsmail dieselbe Auskunft und die SMS waere ein
 * zweites Mal dasselbe, auf Kosten des Hauses.
 */
export function reservierungText({ datum, zeit, personen, haus = 'Wirtschaft Dornbirn' }) {
  const wer = `${personen} ${personen === 1 ? 'Person' : 'Personen'}`;
  return `Tisch reserviert: ${datum}, ${zeit} Uhr, ${wer}. Absagen? Ruf uns an: +43 5572 20540. ${haus}`;
}

/**
 * Die Erinnerung am Tag des Besuchs. Sie ist der Grund, warum diese Bausteine
 * ueberhaupt gebaut wurden: ein vergessener Tisch bleibt leer, und das faellt
 * erst auf, wenn der Mittag vorbei ist.
 */
export function erinnerungText({ zeit, personen, haus = 'Wirtschaft Dornbirn' }) {
  const wer = `${personen} ${personen === 1 ? 'Person' : 'Personen'}`;
  return `Heute um ${zeit} Uhr steht dein Tisch fuer ${wer} bereit. Passt es nicht? Kurz anrufen: +43 5572 20540. ${haus}`;
}

/**
 * Zeichen, die eine SMS in einem Teil halten. Alles ausserhalb erzwingt
 * UCS-2 und damit den doppelten Preis.
 */
const GSM7 = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?'
  + '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
);

/** Bleibt der Text in einem SMS-Teil? Fuer die Pruefung, nicht fuer den Betrieb. */
export const passtInEineSms = text =>
  [...String(text)].every(zeichen => GSM7.has(zeichen)) && String(text).length <= SMS_ZEICHEN;

/**
 * Absenden. Ohne Schluessel oder Absendername passiert schlicht nichts - der
 * Wirt hat dann kein SMS-Konto eingerichtet, und das darf den Betrieb nicht
 * aufhalten. Ein "fertig" muss auch ohne SMS funktionieren.
 */
export async function sendeSms(env, { an, text }) {
  const schluessel = String(env?.BREVO_KEY || '');
  // Der Absendername steht in der SMS als Kennung. Brevo verlangt ihn.
  const absender = String(env?.BREVO_SMS_ABSENDER || '').slice(0, 11);
  if (!schluessel || !absender) return { ok: false, grund: 'nicht_eingerichtet' };
  if (!an || !text) return { ok: false, grund: 'unvollstaendig' };
  try {
    const antwort = await fetch(BREVO_SMS, {
      method: 'POST',
      headers: { 'api-key': schluessel, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: absender,
        recipient: an,
        content: text,
        // Transaktional, nicht Werbung: das entscheidet bei Brevo ueber
        // Zustellweg und Abrechnung - und es ist hier die Wahrheit.
        type: 'transactional'
      })
    });
    if (!antwort.ok) {
      const fehler = await antwort.text().catch(() => '');
      console.error('Brevo-SMS abgelehnt', antwort.status, String(fehler).slice(0, 300));
      return { ok: false, grund: 'abgelehnt' };
    }
    return { ok: true };
  } catch {
    return { ok: false, grund: 'netz' };
  }
}
