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
/**
 * Die naechsten Abende im Haus, unter der Bestaetigung.
 *
 * Eine Reservierungsbestaetigung ist eine Transaktionsmail. Ein Hinweis auf
 * eigene Veranstaltungen ist darin Direktwerbung an einen Bestandskunden -
 * nach § 174 Abs 4 TKG 2021 zulaessig, aber nur, wenn der Empfaenger sie
 * jederzeit und kostenlos ablehnen kann. Deshalb steht die Widerspruchszeile
 * hier nicht als Hoeflichkeit, sondern als Bedingung: ohne sie darf der Block
 * nicht mit.
 *
 * Bewusst knapp: drei Termine, keine Preise, kein Bild. Wer mehr will, klickt.
 */
function eventBlock(events, widerspruchLink) {
  const naechste = (Array.isArray(events) ? events : []).slice(0, 3);
  if (!naechste.length || !widerspruchLink) return '';
  const zeilen = naechste.map(event => `<tr><td style="padding:3px 0;">
    <a href="${escapeHtml(event.url)}" style="color:#11110f;text-decoration:none;font:400 14px/1.5 Helvetica,Arial,sans-serif;">
      <span style="color:#6a655c;">${escapeHtml(event.datum)}</span> &nbsp;${escapeHtml(event.titel)}</a></td></tr>`).join('');
  return `<tr><td style="padding:20px 28px 6px;border-top:1px solid #e6e0d4;">
      <p style="margin:0 0 8px;font:700 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8f887b;">Nächste Abende im Haus</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${zeilen}</table>
      <p style="margin:12px 0 0;font:400 11px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">Diese Hinweise kannst du jederzeit abbestellen: <a href="${escapeHtml(widerspruchLink)}" style="color:#8f887b;">keine Terminhinweise mehr</a>. Deine Reservierung bleibt davon unberührt.</p>
    </td></tr>`;
}

export function bestaetigung({ name, tag, zeit, gaeste, tisch, etage, absageLink, events = [], widerspruchLink = '' }) {
  const personen = `${gaeste} ${gaeste === 1 ? 'Person' : 'Personen'}`;
  const html = rahmen('Reservierung bestätigt', [
    kopf('Reserviert', 'Dein Tisch steht.'),
    `<tr><td style="padding:12px 28px 4px;"><p style="margin:0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#4a453d;">Wir haben deinen Tisch fest eingeteilt. Den Termin für den Kalender findest du im Anhang.</p></td></tr>`,
    zeile('Name', name),
    zeile('Wann', `${langesDatum(tag)}, ${zeit} Uhr`),
    zeile('Für', personen),
    tisch ? zeile('Platz', `Tisch ${tisch}${etage ? ` · ${etage}` : ''}`) : '',
    knopf(absageLink, 'Leider absagen', '#8c292b'),
    `<tr><td style="padding:10px 28px 8px;"><p style="margin:0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">Der Link gilt nur für diese Reservierung. Ein Anruf tut es genauso.</p></td></tr>`,
    eventBlock(events, widerspruchLink)
  ].join(''));
  const naechste = (Array.isArray(events) ? events : []).slice(0, 3);
  const terminText = naechste.length && widerspruchLink
    ? `\nNächste Abende im Haus:\n${naechste.map(e => `${e.datum}  ${e.titel}\n${e.url}`).join('\n')}\n`
      + `\nKeine Terminhinweise mehr: ${widerspruchLink}\n`
    : '';
  return {
    betreff: `Tisch reserviert: ${langesDatum(tag)}, ${zeit} Uhr`,
    html,
    text: `Dein Tisch steht.\n\n${name}\n${langesDatum(tag)}, ${zeit} Uhr\n${personen}\n`
      + `${tisch ? `Tisch ${tisch}${etage ? ` (${etage})` : ''}\n` : ''}\nLeider absagen: ${absageLink}\nOder anrufen: +43 5572 20540\n`
      + terminText
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
export function newsletterFrage({ jaLink, wortlaut, liste = 'mittagskarte' }) {
  // Die Frage muss sagen, WOFUER bestaetigt wird - eine Bestaetigung fuer
  // "irgendwas" waere keine informierte Einwilligung.
  const wofuer = liste === 'events'
    ? { ding: 'unsere Veranstaltungstermine', knopf: 'Ja, ich möchte die Termine',
      zeile: 'die Veranstaltungstermine der Wirtschaft Dornbirn' }
    : { ding: 'unsere Mittagskarte', knopf: 'Ja, ich möchte die Mittagskarte',
      zeile: 'die Mittagskarte der Wirtschaft Dornbirn' };
  const html = rahmen('Anmeldung bestätigen', [
    kopf('Noch ein Schritt', 'Hast du dich angemeldet?'),
    `<tr><td style="padding:12px 28px 4px;"><p style="margin:0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#4a453d;">Jemand hat diese Adresse für ${wofuer.ding} eingetragen. Warst du das, bestätige es kurz. Wenn nicht, ignorier diese Mail – dann löschen wir den Eintrag von selbst.</p></td></tr>`,
    knopf(jaLink, wofuer.knopf),
    `<tr><td style="padding:14px 28px 22px;"><p style="margin:0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">${escapeHtml(wortlaut)}</p></td></tr>`
  ].join(''));
  return {
    betreff: 'Bitte bestätige deine Anmeldung',
    html,
    text: `Jemand hat diese Adresse für ${wofuer.zeile} eingetragen.\n\n`
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

/**
 * Es ist etwas frei geworden: die Meldung an den Ersten auf der Warteliste.
 * Sie reserviert nichts - sie oeffnet die Tuer. Gebucht wird ueber den
 * normalen Weg mit denselben Grenzen; wer zoegert, dem kommt der Naechste
 * zuvor, und genau das steht ehrlich drin.
 */
export function wartelisteFreiMail({ name, tag, personen, buchungsLink }) {
  const html = rahmen('Ein Tisch ist frei geworden', [
    kopf('Warteliste', 'Es ist etwas frei geworden!'),
    `<tr><td style="padding:12px 28px 4px;"><p style="margin:0;font:400 15px/1.6 Helvetica,Arial,sans-serif;color:#4a453d;">${escapeHtml(name)}, du stehst für ${escapeHtml(langesDatum(tag))} auf unserer Warteliste – und gerade ist Platz für ${personen} ${personen === 1 ? 'Person' : 'Personen'} frei geworden.</p></td></tr>`,
    knopf(buchungsLink, 'Jetzt reservieren'),
    `<tr><td style="padding:12px 28px 18px;"><p style="margin:0;font:400 13px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">Der Platz ist nicht reserviert – wer zuerst bucht, hat ihn. Klappt es nicht mehr, bleibt dein Eintrag auf der Liste.</p></td></tr>`
  ].join(''));
  return {
    betreff: `Frei geworden: ${langesDatum(tag)} mittags`,
    html,
    text: `${name}, für ${langesDatum(tag)} ist mittags Platz für ${personen} Personen frei geworden.\n\n`
      + `Jetzt reservieren: ${buchungsLink}\n\nDer Platz ist nicht reserviert – wer zuerst bucht, hat ihn.\n`
  };
}

/**
 * Der Tageszettel: eine Mail an den Wirt, werktags am Morgen. Der Tag auf
 * einen Blick, bevor die Tuer aufsperrt - und zugleich das Lebenszeichen des
 * Dienstes: bleibt diese Mail aus, klemmt etwas.
 */
export function tageszettelMail({ tag, reservierungen, personen, vorbestellungen, portionen, karteDa, warteliste, geschlossen }) {
  const zeilen = [
    kopf('Tageszettel', langesDatum(tag)),
    zeile('Reservierungen', `${reservierungen} (${personen} Personen)`),
    zeile('Takeaway-Vorbestellungen', `${vorbestellungen} (${portionen} Portionen)`),
    zeile('Mittagskarte', karteDa ? 'liegt bereit' : 'FEHLT – bitte hochladen'),
  ];
  if (warteliste > 0) zeilen.push(zeile('Warteliste heute', String(warteliste)));
  if (geschlossen) zeilen.push(zeile('Achtung', 'Dieser Tag ist als GESCHLOSSEN markiert'));
  zeilen.push(`<tr><td style="padding:14px 28px 18px;"><p style="margin:0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">Diese Mail kommt werktags um 8 Uhr, solange der Dienst läuft. Bleibt sie aus, bitte nachsehen.</p></td></tr>`);
  return {
    betreff: `Tageszettel ${langesDatum(tag)}: ${reservierungen} Reservierungen, ${vorbestellungen} Vorbestellungen${karteDa ? '' : ' – KARTE FEHLT'}`,
    html: rahmen('Tageszettel', zeilen.join('')),
    text: `Tageszettel ${langesDatum(tag)}\n\nReservierungen: ${reservierungen} (${personen} Personen)\n`
      + `Takeaway-Vorbestellungen: ${vorbestellungen} (${portionen} Portionen)\n`
      + `Mittagskarte: ${karteDa ? 'liegt bereit' : 'FEHLT'}\n`
      + (warteliste > 0 ? `Warteliste: ${warteliste}\n` : '')
      + (geschlossen ? 'ACHTUNG: Tag ist als geschlossen markiert\n' : '')
  };
}

/**
 * Der Wochenbericht am Freitagnachmittag: was die Woche gebracht hat, aus
 * Zahlen, die ohnehin da sind. Die Grundlage fuer Einkauf und Personalplan -
 * das, wofuer die teuren Werkzeuge ihre Premium-Stufe verlangen.
 */
export function wochenberichtMail({ von, bis, tage, gaeste, reservierungen, nichtDa, bestellungen, portionen, umsatz, bestseller }) {
  const zeilen = [
    kopf('Wochenbericht', `${langesDatum(von)} – ${langesDatum(bis)}`),
    zeile('Reservierungen', `${reservierungen} (${gaeste} Gäste)`),
    zeile('Nicht erschienen', String(nichtDa)),
    zeile('Takeaway-Bestellungen', `${bestellungen} (${portionen} Portionen, € ${umsatz.toFixed(2).replace('.', ',')})`),
  ];
  for (const eintragTag of tage) {
    zeilen.push(zeile(eintragTag.name, `${eintragTag.gaeste} Gäste · ${eintragTag.portionen} Portionen Takeaway`));
  }
  if (bestseller.length) {
    zeilen.push(`<tr><td style="padding:14px 28px 2px;"><p style="margin:0;font:800 11px/1.4 Helvetica,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#8c292b;">Bestseller</p></td></tr>`);
    for (const gericht of bestseller) zeilen.push(zeile(gericht.name, `${gericht.portionen} Portionen`));
  }
  return {
    betreff: `Wochenbericht: ${gaeste} Gäste, ${portionen} Portionen Takeaway`,
    html: rahmen('Wochenbericht', zeilen.join('')),
    text: `Wochenbericht ${von} bis ${bis}\n\nReservierungen: ${reservierungen} (${gaeste} Gäste)\n`
      + `Nicht erschienen: ${nichtDa}\nTakeaway: ${bestellungen} Bestellungen, ${portionen} Portionen, € ${umsatz.toFixed(2)}\n`
      + tage.map(t => `${t.name}: ${t.gaeste} Gäste, ${t.portionen} Portionen`).join('\n')
      + (bestseller.length ? `\n\nBestseller:\n${bestseller.map(b => `${b.name}: ${b.portionen}`).join('\n')}` : '')
  };
}

// ---- Takeaway: drei Mails ---------------------------------------------------
//
// Bestellt jemand online, bekommt er sofort den Beleg; das Haus bekommt die
// Bestellung zusaetzlich zur Wirt-Ansicht als Mail; und ist das Essen
// fertig, sagt eine dritte Mail Bescheid. SMS war dafuer vorgesehen und ist
// aus - die Mail ist der Weg, der ohne Guthaben laeuft.

const preis = wert => `€ ${Number(wert).toFixed(2).replace('.', ',')}`;
const postenZeilen = posten => (posten || []).map(p => `${p.menge}× ${p.name}`);

/** An den Gast: "Wir haben deine Bestellung." */
export function bestellBestaetigung({ nummer, name, tag, zeit, posten, summe, vorbestellung, statusLink }) {
  const wann = `${langesDatum(tag)}, ca. ${zeit} Uhr`;
  const essen = postenZeilen(posten);
  const html = rahmen('Bestellung angenommen', [
    kopf(`Nr. ${nummer}`, 'Deine Bestellung ist in der Küche.'),
    zeile('Name', name),
    zeile('Abholen', wann),
    zeile('Essen', essen.join('<br>')),
    zeile('Summe', `${preis(summe)} – bezahlt wird beim Abholen`),
    zeile('Wo', 'Bahnhofstraße 24, 6850 Dornbirn'),
    statusLink ? knopf(statusLink, 'Wann ist es fertig?', '#244635') : '',
    `<tr><td style="padding:10px 28px 8px;"><p style="margin:0;font:400 12px/1.6 Helvetica,Arial,sans-serif;color:#8f887b;">`
      + `Fragen oder etwas vergessen? +43 5572 20 540.</p></td></tr>`
  ].join(''));
  return {
    betreff: `Bestellung Nr. ${nummer} – ${vorbestellung ? langesDatum(tag) : 'heute'}, ca. ${zeit} Uhr`,
    html,
    text: `Deine Bestellung ist in der Küche.\n\nNr. ${nummer}\n${name}\nAbholen: ${wann}\n\n${essen.join('\n')}\n`
      + `Summe: ${preis(summe)} – bezahlt wird beim Abholen\n\nBahnhofstraße 24, 6850 Dornbirn\n`
      + `${statusLink ? `Wann ist es fertig: ${statusLink}\n` : ''}Fragen: +43 5572 20 540`
  };
}

/** Ans Haus: die Bestellung, wie sie in der Wirt-Ansicht steht. */
export function neueBestellungMail({ nummer, name, telefon, tag, zeit, posten, summe, vorbestellung, eng, wirtLink }) {
  const essen = postenZeilen(posten);
  const html = rahmen('Neue Takeaway-Bestellung', [
    kopf(`Nr. ${nummer}`, `${name} · ${vorbestellung ? langesDatum(tag) : 'heute'}, ${zeit} Uhr${eng ? ' · Slot eng' : ''}`),
    zeile('Essen', essen.join('<br>')),
    zeile('Summe', preis(summe)),
    zeile('Telefon', telefon),
    wirtLink ? knopf(wirtLink, 'Zur Wirt-Ansicht', '#244635') : ''
  ].join(''));
  return {
    betreff: `Takeaway Nr. ${nummer}: ${name}, ${zeit} Uhr – ${essen.join(', ')}`,
    html,
    text: `Neue Takeaway-Bestellung\n\nNr. ${nummer} · ${name}\n${vorbestellung ? langesDatum(tag) : 'heute'}, ${zeit} Uhr${eng ? ' (Slot eng)' : ''}\n\n`
      + `${essen.join('\n')}\nSumme: ${preis(summe)}\nTelefon: ${telefon}\n${wirtLink ? `\n${wirtLink}` : ''}`
  };
}

/** An den Gast: "Es ist fertig." */
export function bestellFertigMail({ nummer, name, zeit }) {
  const html = rahmen('Dein Essen ist fertig', [
    kopf(`Nr. ${nummer}`, 'Liegt am Tresen bereit.'),
    zeile('Name', name),
    zeile('Wo', 'Bahnhofstraße 24, 6850 Dornbirn'),
    zeile('Wann', `ab jetzt${zeit ? ` – fertig um ${zeit} Uhr` : ''}`)
  ].join(''));
  return {
    betreff: `Nr. ${nummer} ist fertig – komm vorbei`,
    html,
    text: `Dein Essen ist fertig und liegt am Tresen bereit.\n\nNr. ${nummer} · ${name}\nBahnhofstraße 24, 6850 Dornbirn`
  };
}
