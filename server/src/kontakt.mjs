// Wie der Gast erreichbar ist. Getrennt von der Anfragepruefung, weil es eine
// eigene Entscheidung ist: eine Reservierung ohne Kontakt laesst sich nicht
// absagen, und genau dafuer ist der Kontakt da - nicht fuer Werbung.

import { istMail } from './newsletter.mjs';

// Oesterreichische und internationale Schreibweisen, Leerzeichen, Schraegstrich
// und Klammern erlaubt. Genug Ziffern, dass ein Tippfehler auffaellt.
const TELEFON = /^\+?[\d\s()/.-]{7,25}$/;

export const istTelefon = wert => {
  const roh = String(wert ?? '').trim();
  if (!TELEFON.test(roh)) return false;
  return (roh.match(/\d/g) || []).length >= 7;
};

/**
 * Mindestens eine Erreichbarkeit. Beides ist erlaubt, keines nicht: sagt
 * Wolfgang den Mittag ab, muss jeder Gast davon erfahren - wer weder Mail
 * noch Nummer hinterlassen hat, steht sonst vor verschlossener Tuer.
 */
export function pruefeKontakt(roh) {
  const email = String(roh?.email ?? '').trim().toLowerCase().slice(0, 120);
  const telefon = String(roh?.telefon ?? '').trim().slice(0, 25);

  if (email && !istMail(email)) return { ok: false, grund: 'mail' };
  if (telefon && !istTelefon(telefon)) return { ok: false, grund: 'telefon' };
  if (!email && !telefon) return { ok: false, grund: 'kontakt' };

  return { ok: true, kontakt: { email: email || null, telefon: telefon || null } };
}
