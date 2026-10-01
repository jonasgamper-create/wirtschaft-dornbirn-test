// Anfragen aus den Formularen von Locations und Agentur (01.10.).
//
// Gespeichert wird nur, was das Formular schickt, 90 Tage lang - dann raeumt
// der Dienst auf. Die Datenschutzerklaerung nennt Anfragen bereits
// (Art. 6 Abs. 1 lit. b DSGVO, vorvertragliche Kommunikation).

const MAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
export const ANFRAGE_TAGE = 90;
export const ANFRAGEN_PRO_STUNDE = 30;

const putz = (wert, laenge) => String(wert ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, laenge);

export function pruefeAnfrageFormular(roh) {
  // Fangfeld: Menschen sehen es nicht, Skripte fuellen es aus.
  if (String(roh?.website ?? '').trim()) return { ok: false, grund: 'spam' };
  const art = ['feste', 'agentur'].includes(roh?.art) ? roh.art : '';
  if (!art) return { ok: false, grund: 'art' };
  const name = putz(roh?.name, 80);
  if (name.length < 2) return { ok: false, grund: 'name' };
  const email = putz(roh?.email, 120).toLowerCase();
  if (!MAIL.test(email)) return { ok: false, grund: 'mail' };
  if (roh?.einwilligung !== true) return { ok: false, grund: 'einwilligung' };
  const telefon = putz(roh?.telefon, 40);
  const betreff = putz(roh?.betreff, 140);
  if (betreff.length < 3) return { ok: false, grund: 'betreff' };
  const zeilen = (Array.isArray(roh?.zeilen) ? roh.zeilen : []).slice(0, 20)
    .map(z => putz(z, 600)).filter(Boolean);
  if (!zeilen.length) return { ok: false, grund: 'leer' };
  return { ok: true, anfrage: { art, name, email, telefon, betreff, zeilen } };
}

/** Alte Anfragen raeumen und die Liste klein halten. */
export function raeumeAnfragenAuf(liste, jetzt = Date.now()) {
  const grenze = jetzt - ANFRAGE_TAGE * 24 * 60 * 60 * 1000;
  return (Array.isArray(liste) ? liste : []).filter(a => Date.parse(a?.zeit) >= grenze).slice(-150);
}

/** Der Hinweis auf der Startseite: kurz, ohne Markup, mit optionalem Ende. */
export function pruefeHinweis(roh) {
  const text = putz(roh?.text, 90);
  const bis = String(roh?.bis ?? '').trim();
  if (bis && !/^\d{4}-\d{2}-\d{2}$/.test(bis)) return { ok: false, grund: 'bis' };
  return { ok: true, hinweis: text ? { text, bis: bis || null } : null };
}

export const hinweisAktiv = (hinweis, heute) => Boolean(hinweis?.text) && (!hinweis.bis || hinweis.bis >= heute);
