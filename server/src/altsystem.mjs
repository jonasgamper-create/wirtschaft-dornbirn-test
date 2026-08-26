// Bruecke zum Altsystem: die neue Oberflaeche, die alte Wahrheit.
//
// Entscheidung vom 26.08.: Reservierungen sollen dort landen, wo der Betrieb
// sie heute liest - auf tischreservierung.wirtschaft-dornbirn.at. Die neue
// Seite zeigt ihre eigene Oberflaeche, aber Tage, Zeiten und die Buchung
// selbst kommen von dort. Dieses Modul holt das Formular der alten Seite,
// liest die angebotenen Tage und Zeiten heraus und reicht eine Buchung als
// ganz normalen Formular-Post dorthin weiter - mit derselben Sitzung, die
// die alte Seite beim Abruf vergeben hat.
//
// Eingeschaltet wird das ueber ALT_RESERVIERUNG in wrangler.jsonc. Ohne den
// Eintrag verhaelt sich der Dienst wie bisher - ein Schalter, kein Umbau.

const ZEIT = /^\d{2}:\d{2}$/;

function kekse(antwort) {
  // Set-Cookie einsammeln: "name=wert" reicht fuer den Rueckweg.
  const rohe = antwort.headers.getSetCookie?.() || [];
  return rohe.map(zeile => zeile.split(';')[0]).filter(Boolean).join('; ');
}

async function holeFormular(basis) {
  const antwort = await fetch(basis + '/', {
    headers: { 'user-agent': 'wirtschaft-dienst', accept: 'text/html' }
  });
  if (!antwort.ok) throw new Error(`altsystem antwortet ${antwort.status}`);
  return { html: await antwort.text(), sitzung: kekse(antwort) };
}

export function liesReservierungsFormular(html) {
  const tage = [...html.matchAll(/reservation_form_day_\d"[^>]*value="(\d{4}-\d{2}-\d{2})"/g)]
    .map(m => m[1]);
  // Nur echte Uhrzeiten aus der Zeitauswahl - die Personenliste hat auch
  // <option>-Werte, aber keine mit Doppelpunkt.
  const zeiten = [...html.matchAll(/<option value="(\d{2}:\d{2})"/g)].map(m => m[1]);
  const personen = [...html.matchAll(/reservation_form_persons[\s\S]{0,600}?<\/select>/g)]
    .flatMap(m => [...m[0].matchAll(/value="(\d+)"/g)].map(x => Number(x[1])));
  return {
    tage: [...new Set(tage)],
    zeiten: [...new Set(zeiten)].filter(z => ZEIT.test(z)),
    maxPersonen: personen.length ? Math.max(...personen) : 10
  };
}

export async function holeAltFrei(env, datum) {
  const basis = String(env.ALT_RESERVIERUNG || '').replace(/\/+$/, '');
  const { html } = await holeFormular(basis);
  const formular = liesReservierungsFormular(html);
  const buchbar = formular.tage.includes(datum);
  return {
    ok: true,
    automatik: true,
    quelle: 'alt',
    tage: formular.tage,
    maxPersonen: formular.maxPersonen,
    // Das Altsystem prueft selbst keine Auslastung im Formular - jede
    // angebotene Zeit gilt als anfragbar. An Tagen, die es nicht anbietet,
    // gibt es ehrlicherweise keine Zeiten.
    zeiten: buchbar ? formular.zeiten.map(zeit => ({ zeit, status: 'frei', frei: true })) : []
  };
}

export async function bucheAlt(env, roh) {
  const basis = String(env.ALT_RESERVIERUNG || '').replace(/\/+$/, '');
  const name = String(roh?.name || '').trim();
  const datum = String(roh?.date || '').trim();
  const zeit = String(roh?.time || '').trim();
  const gaeste = Number(roh?.guests) || 0;
  const email = String(roh?.kontakt?.email || '').trim();
  const telefon = String(roh?.kontakt?.telefon || '').trim();

  if (name.length < 2) return { ok: false, grund: 'name' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) return { ok: false, grund: 'datum' };
  if (!ZEIT.test(zeit)) return { ok: false, grund: 'uhrzeit' };
  if (gaeste < 1) return { ok: false, grund: 'personen' };
  if (!email && !telefon) return { ok: false, grund: 'kontakt' };

  // Frisches Formular: bestaetigt Tag und Zeit und liefert die Sitzung,
  // unter der der Post laufen muss.
  const { html, sitzung } = await holeFormular(basis);
  const formular = liesReservierungsFormular(html);
  if (!formular.tage.includes(datum)) return { ok: false, grund: 'datum' };
  if (!formular.zeiten.includes(zeit)) return { ok: false, grund: 'uhrzeit' };

  const [vorname, ...rest] = name.split(/\s+/);
  const nachname = rest.join(' ') || vorname;
  const felder = new URLSearchParams({
    'reservation_form[firstname]': vorname,
    'reservation_form[lastname]': nachname,
    'reservation_form[email]': email,
    'reservation_form[phone]': telefon,
    'reservation_form[persons]': String(Math.min(gaeste, formular.maxPersonen)),
    'reservation_form[children]': '0',
    'reservation_form[reservationDate]': datum,
    'reservation_form[reservationTime]': zeit,
    'reservation_form[policy]': '1'
  });

  const antwort = await fetch(basis + '/reservation/process', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-requested-with': 'XMLHttpRequest',
      'user-agent': 'wirtschaft-dienst',
      cookie: sitzung,
      referer: basis + '/'
    },
    body: felder.toString()
  });

  const text = await antwort.text();
  let daten = null;
  try { daten = JSON.parse(text); } catch { /* HTML-Antwort ist auch moeglich */ }
  const fehlerwort = /fehler|error|invalid|ung(ü|u)ltig/i.test(text) && !/success|erfolg/i.test(text);
  const gelungen = antwort.ok && (daten?.success === true || daten?.ok === true || (!daten && !fehlerwort) || (daten && !daten.error && daten.success !== false));

  return {
    ok: Boolean(gelungen),
    grund: gelungen ? undefined : 'altsystem',
    quelle: 'alt',
    // Fuer den gemeinsamen Testlauf: was das Altsystem wirklich gesagt hat.
    alt: { status: antwort.status, auszug: text.slice(0, 300) }
  };
}

export function liesTakeawayKarte(html) {
  // Deren Markup ist klar: je Gericht ein order-item mit <div class="name">
  // und einem Bestellknopf, der die Kennung und den Preis traegt.
  const gerichte = [];
  const bloecke = html.split('class="order-item');
  for (const block of bloecke.slice(1)) {
    const id = block.match(/data-dish-id="(\d+)"/)?.[1];
    if (!id) continue;
    const nameRoh = block.match(/class="name">\s*<b>([\s\S]*?)<\/b>/)?.[1] || '';
    const name = nameRoh
      .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&auml;/g, 'ä')
      .replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü').replace(/&szlig;/g, 'ß')
      .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const preis = block.match(/class="price">&euro;\s*([\d,.]+)</)?.[1] || null;
    if (name) gerichte.push({ id, titel: name, preis: preis ? `€ ${preis}` : null });
  }
  const dopplerFrei = new Map(gerichte.map(g => [g.id, g]));
  return [...dopplerFrei.values()];
}

export async function holeAltKarte(env) {
  const basis = String(env.ALT_TAKEAWAY || '').replace(/\/+$/, '');
  const { html } = await holeFormular(basis);
  return { ok: true, quelle: 'alt', gerichte: liesTakeawayKarte(html) };
}
