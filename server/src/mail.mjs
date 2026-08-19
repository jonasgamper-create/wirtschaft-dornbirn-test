// Mailversand ueber Brevo - und die Kalendereintraege, die daran haengen.
//
// Warum der Versand hier liegt und nicht im Browser: der Schluessel ist ein
// Geheimnis. Steht er auf der Gaesteseite, ist er oeffentlich, und jeder kann
// ueber das Konto der Wirtschaft Mails verschicken. Der Browser sieht ihn nie.
//
// Alles hier ist reine Rechnerei bis auf `sendeMail`. Damit kann `npm run ci`
// jede Mail und jeden Termin durchspielen, ohne eine einzige zu verschicken.

const BREVO = 'https://api.brevo.com/v3/smtp/email';

/** Kalenderzeilen ueber 75 Zeichen muessen umgebrochen werden. */
const falte = zeile => {
  if (zeile.length <= 74) return zeile;
  const teile = [zeile.slice(0, 74)];
  let rest = zeile.slice(74);
  while (rest.length > 73) {
    teile.push(` ${rest.slice(0, 73)}`);
    rest = rest.slice(73);
  }
  if (rest) teile.push(` ${rest}`);
  return teile.join('\r\n');
};

const schuetze = text => String(text ?? '').replace(/[\;,]/g, treffer => `\\${treffer}`).replace(/\n/g, '\\n');
const oertlich = (tag, zeit) => `${tag.replace(/-/g, '')}T${zeit.replace(':', '')}00`;

export const escapeHtml = wert => String(wert ?? '')
  .replace(/[&<>'"]/g, zeichen => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[zeichen]));

/**
 * Die Kennung des Termins. Sie kommt vom Dienst und nicht aus dem Browser:
 * ohne dieselbe Kennung laesst sich ein Termin spaeter nicht zurueckziehen -
 * die Absage kaeme als Mail an, im Kalender des Gastes stuende der Tisch weiter.
 */
export const termin_uid = id => `${id}@wirtschaft-dornbirn.at`;

/**
 * Ein Kalendereintrag. `methode` ist REQUEST fuer die Bestaetigung und CANCEL
 * fuer die Absage; bei CANCEL muss `sequenz` groesser sein als beim letzten
 * Versand, sonst ignoriert der Kalender die Absage stillschweigend.
 */
export function baueTermin({
  uid, sequenz = 0, methode = 'REQUEST', jetzt,
  name, tag, zeit, gaeste, tisch = null, etage = null, grund = null, absender
}) {
  const [stunde, minute] = zeit.split(':').map(Number);
  const ende = `${String(Math.min(23, stunde + 2)).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const abgesagt = methode === 'CANCEL';
  const personen = `${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'}`;
  const text = abgesagt
    ? `Abgesagt: ${grund || 'Wir kochen an diesem Tag leider nicht mittags.'} Bitte melde dich${schuetze(',')} wenn wir einen neuen Termin finden sollen: +43 5572 20540`
    : `Reserviert auf ${schuetze(name)}${schuetze(',')} ${personen}${tisch ? `${schuetze(',')} Tisch ${schuetze(tisch)}` : ''}${etage ? ` (${schuetze(etage)})` : ''}. Falls es doch nicht klappt${schuetze(',')} kurz anrufen: +43 5572 20540`;

  const zeilen = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'PRODID:-//Wirtschaft Dornbirn//Tischreservierung//DE',
    `METHOD:${methode}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SEQUENCE:${Math.max(0, Math.trunc(Number(sequenz) || 0))}`,
    `DTSTAMP:${jetzt}`,
    `DTSTART:${oertlich(tag, zeit)}`,
    `DTEND:${oertlich(tag, ende)}`,
    `STATUS:${abgesagt ? 'CANCELLED' : 'CONFIRMED'}`,
    falte(`ORGANIZER;CN=Wirtschaft Dornbirn:mailto:${absender}`),
    `SUMMARY:${abgesagt ? 'Abgesagt: Tisch in der Wirtschaft Dornbirn' : 'Tisch in der Wirtschaft Dornbirn'}`,
    falte(`DESCRIPTION:${text}`),
    falte(`LOCATION:Wirtschaft Dornbirn${schuetze(',')} Bahnhofstraße 24${schuetze(',')} 6850 Dornbirn`)
  ];
  // Eine Erinnerung nur bei einem Termin, der stattfindet.
  if (!abgesagt) {
    zeilen.push(
      'BEGIN:VALARM',
      'TRIGGER:-PT1H',
      'ACTION:DISPLAY',
      'DESCRIPTION:In einer Stunde: Tisch in der Wirtschaft Dornbirn',
      'END:VALARM'
    );
  }
  zeilen.push('END:VEVENT', 'END:VCALENDAR');
  return `${zeilen.join('\r\n')}\r\n`;
}

/** Umlaute ueberleben btoa nur als Bytes. */
export function alsBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let roh = '';
  for (const byte of bytes) roh += String.fromCharCode(byte);
  return btoa(roh);
}

const rahmen = (titel, inhalt) => `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(titel)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f3efe6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#faf7f0;border:1px solid #e0d8c8;">
${inhalt}
<tr><td style="padding:22px 28px 28px;border-top:1px solid #e0d8c8;">
<p style="margin:0;font:400 11px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">Wirtschaft Dornbirn · Bahnhofstraße 24 · 6850 Dornbirn · <a href="tel:+43557220540" style="color:#8f887b;">+43 (0)5572 20 540</a></p>
</td></tr></table></body></html>`;

const kopf = (kicker, titel) => `<tr><td style="padding:28px 28px 8px;">
<p style="margin:0;font:800 10px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8c292b;">${escapeHtml(kicker)}</p>
<h1 style="margin:10px 0 0;font:400 30px/1.1 Georgia,serif;color:#11110f;">${escapeHtml(titel)}</h1></td></tr>`;

const zeile = (was, wert) => `<tr><td style="padding:2px 28px;"><p style="margin:0;font:400 15px/1.7 Helvetica,Arial,sans-serif;color:#11110f;"><span style="color:#6a655c;">${escapeHtml(was)}:</span> ${escapeHtml(wert)}</p></td></tr>`;

const knopf = (adresse, beschriftung, farbe = '#244635') => `<tr><td style="padding:18px 28px 4px;">
<a href="${escapeHtml(adresse)}" style="display:inline-block;padding:14px 26px;background:${farbe};color:#ffffff;font:800 12px/1 Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;border-radius:999px;">${escapeHtml(beschriftung)}</a></td></tr>`;

const langesDatum = tag => new Intl.DateTimeFormat('de-AT', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
}).format(new Date(`${tag}T12:00:00Z`));

/** Die Bestaetigung. Der Tisch steht - der Link ist nur fuer den Fall der Faelle. */
export function bestaetigung({ name, tag, zeit, gaeste, tisch, etage, absageLink }) {
  const personen = `${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'}`;
  const html = rahmen('Reservierung bestätigt', [
    kopf('Reserviert', 'Dein Tisch steht.'),
    `<tr><td style="padding:12px 28px 4px;"><p style="margin:0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#4a453d;">Wir haben deinen Tisch fest eingeteilt. Den Termin für den Kalender findest du im Anhang.</p></td></tr>`,
    zeile('Name', name),
    zeile('Wann', `${langesDatum(tag)}, ${zeit} Uhr`),
    zeile('Für', personen),
    tisch ? zeile('Platz', `Tisch ${tisch}${etage ? ` · ${etage}` : ''}`) : '',
    knopf(absageLink, 'Leider absagen', '#8c292b'),
    `<tr><td style="padding:10px 28px 22px;"><p style="margin:0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">Der Link gilt nur für diese Reservierung. Ein Anruf tut es genauso.</p></td></tr>`
  ].join(''));
  return {
    betreff: `Tisch reserviert: ${langesDatum(tag)}, ${zeit} Uhr`,
    html,
    text: `Dein Tisch steht.\n\n${name}\n${langesDatum(tag)}, ${zeit} Uhr\n${personen}\n`
      + `${tisch ? `Tisch ${tisch}${etage ? ` (${etage})` : ''}\n` : ''}\nLeider absagen: ${absageLink}\nOder anrufen: +43 5572 20540\n`
  };
}

/** Die Absage. Sie muss ohne Rueckfrage verstaendlich sein. */
export function absage({ name, tag, zeit, gaeste, grund, vomHaus }) {
  const html = rahmen('Reservierung abgesagt', [
    kopf('Abgesagt', vomHaus ? 'Wir müssen absagen.' : 'Deine Absage ist da.'),
    `<tr><td style="padding:12px 28px 4px;"><p style="margin:0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#4a453d;">${escapeHtml(
      vomHaus
        ? (grund || 'Wir kochen an diesem Tag leider nicht mittags.')
        : 'Wir haben deinen Tisch wieder freigegeben. Danke, dass du Bescheid gegeben hast.'
    )}</p></td></tr>`,
    zeile('Name', name),
    zeile('Betrifft', `${langesDatum(tag)}, ${zeit} Uhr`),
    zeile('Für', `${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'}`),
    `<tr><td style="padding:16px 28px 22px;"><p style="margin:0;font:400 14px/1.6 Helvetica,Arial,sans-serif;color:#4a453d;">${escapeHtml(
      vomHaus
        ? 'Der Termin in deinem Kalender wird mit dieser Mail zurückgezogen. Für einen neuen Termin: einfach anrufen, wir finden etwas.'
        : 'Der Termin in deinem Kalender wird mit dieser Mail zurückgezogen.'
    )}</p></td></tr>`
  ].join(''));
  return {
    betreff: vomHaus
      ? `Leider abgesagt: ${langesDatum(tag)}, ${zeit} Uhr`
      : `Absage bestätigt: ${langesDatum(tag)}, ${zeit} Uhr`,
    html,
    text: `${vomHaus ? (grund || 'Wir kochen an diesem Tag leider nicht mittags.') : 'Wir haben deinen Tisch wieder freigegeben.'}\n\n`
      + `${name}\n${langesDatum(tag)}, ${zeit} Uhr\n\nRückfragen: +43 5572 20540\n`
  };
}

/**
 * Die Bestaetigungsmail fuer den Newsletter. Sie ist kein Newsletter: sie
 * enthaelt keine Werbung, nur die Frage, ob die Anmeldung von dieser Adresse
 * kam. Ohne Klick passiert nichts und der Eintrag verfaellt.
 */
export function newsletterFrage({ jaLink, wortlaut }) {
  const html = rahmen('Anmeldung bestätigen', [
    kopf('Noch ein Schritt', 'Hast du dich angemeldet?'),
    `<tr><td style="padding:12px 28px 4px;"><p style="margin:0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#4a453d;">Jemand hat diese Adresse für unsere Mittagskarte eingetragen. Warst du das, bestätige es kurz. Wenn nicht, ignorier diese Mail – dann löschen wir den Eintrag von selbst.</p></td></tr>`,
    knopf(jaLink, 'Ja, ich möchte die Mittagskarte'),
    `<tr><td style="padding:14px 28px 22px;"><p style="margin:0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">${escapeHtml(wortlaut)}</p></td></tr>`
  ].join(''));
  return {
    betreff: 'Bitte bestätige deine Anmeldung',
    html,
    text: `Jemand hat diese Adresse für die Mittagskarte der Wirtschaft Dornbirn eingetragen.\n\n`
      + `Bestätigen: ${jaLink}\n\nWar es nicht, ignorier diese Mail. Der Eintrag verfällt von selbst.\n`
  };
}

/**
 * Die Wochenkarte am Montagmorgen. Kurz und ohne Anhang: ein Knopf zur
 * aktuellen Karte, ein Abmeldelink - mehr braucht diese Mail nicht.
 */
export function wochenkarte({ karteLink, abmeldeLink }) {
  const html = rahmen('Die Wochenkarte ist da', [
    kopf('Mittag · Mo–Fr 11:30–13:30', 'Das kochen wir diese Woche'),
    `<tr><td style="padding:12px 28px 4px;"><p style="margin:0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#4a453d;">Die neue Mittagskarte ist online. Reservieren oder Takeaway bestellen geht direkt über die Website – und wie immer auch am Telefon: +43 5572 20540.</p></td></tr>`,
    knopf(karteLink, 'Wochenkarte ansehen'),
    `<tr><td style="padding:14px 28px 22px;"><p style="margin:0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">Du bekommst diese Mail, weil du die Mittagskarte abonniert hast. <a href="${escapeHtml(abmeldeLink)}" style="color:#8f887b;">Mit einem Klick abmelden</a>.</p></td></tr>`
  ].join(''));
  return {
    betreff: 'Die Wochenkarte der Wirtschaft ist da',
    html,
    text: 'Die neue Mittagskarte der Wirtschaft Dornbirn ist online.\n\n'
      + `Karte ansehen: ${karteLink}\n\nAbmelden: ${abmeldeLink}\n`
  };
}

/** Das Paket, das an Brevo geht. Getrennt gebaut, damit es pruefbar bleibt. */
export function brevoPaket({ absender, absenderName, an, anName, betreff, html, text, anhang = null }) {
  const paket = {
    sender: { email: absender, name: absenderName || 'Wirtschaft Dornbirn' },
    to: [anName ? { email: an, name: anName } : { email: an }],
    subject: betreff,
    htmlContent: html,
    textContent: text
  };
  if (anhang) paket.attachment = [{ name: anhang.name, content: alsBase64(anhang.inhalt) }];
  return paket;
}

/**
 * Der einzige Punkt, der wirklich hinausgeht. Ohne Schluessel wird nichts
 * versendet und nichts geworfen: die Reservierung selbst darf nie daran
 * scheitern, dass der Mailversand nicht eingerichtet oder gerade gestoert ist.
 */
export async function sendeMail(env, paket) {
  const schluessel = String(env?.BREVO_KEY || '');
  const absender = String(env?.BREVO_ABSENDER || '');
  if (!schluessel || !absender) return { ok: false, grund: 'nicht_eingerichtet' };
  try {
    const antwort = await fetch(BREVO, {
      method: 'POST',
      headers: { 'api-key': schluessel, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(paket)
    });
    if (!antwort.ok) {
      // Brevos Fehlercode und -meldung nennen die Ursache ("sender not
      // valid", "invalid parameter") - ohne sie ist ein 400 stumm. Die
      // Meldung enthaelt keine Gaestedaten; zur Sicherheit gekuerzt.
      const fehler = await antwort.text().catch(() => '');
      console.error('Brevo abgelehnt', antwort.status, String(fehler).slice(0, 300));
      return { ok: false, grund: 'abgelehnt' };
    }
    return { ok: true };
  } catch {
    return { ok: false, grund: 'netz' };
  }
}
