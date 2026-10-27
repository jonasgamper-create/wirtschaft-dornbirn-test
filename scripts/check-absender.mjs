// Absender-Pruefung (27.10.2026): jede Gaestemail muss den Absender nehmen,
// den das Haus im Entscheidungsblatt genannt hat - nicht mehr pauschal
// BREVO_ABSENDER.
//
// Hausentscheid (docs/mailadressen-entscheidung.md, Frage 4):
//   Reservierung, Absage, Takeaway, Mittags-Warteliste -> Service
//   Warteliste eines Abends in der "wirtschaft"        -> Veranstaltungen
//   Warteliste eines Kulturhaus-Abends                 -> Emma & Eugen
//
// Geprueft wird am Quelltext, nicht am laufenden Dienst: die Wahl steht in
// einer privaten Methode, und ein Fehler darin faellt sonst erst auf, wenn
// ein Gast die Mail vom falschen Absender bekommt.

import { readFile } from 'node:fs/promises';

const quelle = await readFile('server/src/index.js', 'utf8');
const wrangler = await readFile('server/wrangler.jsonc', 'utf8');
const fehler = [];
const pruefe = (was, ok) => { if (!ok) fehler.push(was); };

/** Der Rumpf einer Methode - bis zur naechsten auf gleicher Einrueckung. */
function rumpf(name) {
  const start = quelle.indexOf(`async ${name}(`) >= 0 ? quelle.indexOf(`async ${name}(`) : quelle.indexOf(`${name}(`);
  if (start < 0) return '';
  const rest = quelle.slice(start);
  const ende = rest.indexOf('\n  }\n');
  return ende < 0 ? rest : rest.slice(0, ende);
}

// 1. Der Helfer selbst.
pruefe('Helfer #absender(zweck, haus) fehlt', /#absender\(zweck, haus = 'wirtschaft'\)/.test(quelle));
pruefe('#absender faellt nicht auf BREVO_ABSENDER zurueck',
  /#absender\([\s\S]{0,600}?this\.env\?\.BREVO_ABSENDER/.test(quelle));
pruefe('#absender unterscheidet das Kulturhaus nicht',
  /ABSENDER_KULTURHAUS[\s\S]{0,120}ABSENDER_WARTELISTE/.test(quelle));

// 2. Jede Gaestemail am richtigen Zweck.
for (const name of ['#bestellMails', '#schickeBestaetigung', '#schickeAbsage',
  '#wartelisteAnstossen', '#mittagVerstaendigen']) {
  const text = rumpf(name);
  pruefe(`${name}: Methode nicht gefunden`, Boolean(text));
  pruefe(`${name} nimmt nicht den Service-Absender`, /#absender\('service'\)/.test(text));
  pruefe(`${name} liest noch direkt BREVO_ABSENDER`, !/const absender = String\(this\.env\?\.BREVO_ABSENDER/.test(text));
}

const frei = rumpf('#eventWartelisteVerstaendigen');
pruefe('#eventWartelisteVerstaendigen nimmt nicht den Wartelisten-Absender des Abends',
  /#absender\('warteliste', eintrag\.haus\)/.test(frei));
pruefe('Aufnahmebestaetigung der Event-Warteliste prueft das Haus nicht',
  /nurKulturhaus[\s\S]{0,200}#absender\('warteliste', nurKulturhaus \? 'kulturhaus' : 'wirtschaft'\)/.test(quelle));

// 3. Die Takeaway-Meldung ans Haus geht an die eigene Adresse.
pruefe('Bestellmeldung nimmt TAKEAWAY_MAIL nicht vor WIRT_MAIL',
  /TAKEAWAY_MAIL \|\| this\.env\?\.WIRT_MAIL/.test(quelle));

// 4. Die Einstellungen - in BEIDEN Umgebungen, und die Absender leer,
//    solange die Domain bei Brevo nicht beglaubigt ist.
for (const name of ['WIRT_MAIL', 'TAKEAWAY_MAIL', 'ANFRAGE_MAIL',
  'ABSENDER_SERVICE', 'ABSENDER_WARTELISTE', 'ABSENDER_KULTURHAUS', 'EVENTS_ABSENDER']) {
  const treffer = [...wrangler.matchAll(new RegExp(`"${name}": "([^"]*)"`, 'g'))];
  pruefe(`${name} steht nicht in beiden Umgebungen (gefunden: ${treffer.length})`, treffer.length === 2);
}
pruefe('Tageszettel geht nicht an die Veranstaltungs-Adresse',
  (wrangler.match(/"WIRT_MAIL": "([^"]*)"/) || [])[1] === 'veranstaltungen@wirtschaft-dornbirn.at');
pruefe('Bestellmeldung geht nicht an den Service',
  (wrangler.match(/"TAKEAWAY_MAIL": "([^"]*)"/) || [])[1] === 'service@wirtschaft-dornbirn.at');
for (const name of ['ABSENDER_SERVICE', 'ABSENDER_WARTELISTE', 'ABSENDER_KULTURHAUS', 'EVENTS_ABSENDER']) {
  for (const [, wert] of wrangler.matchAll(new RegExp(`"${name}": "([^"]*)"`, 'g'))) {
    // Leer ist richtig, solange nicht beglaubigt. Steht etwas da, muss es
    // eine Mailadresse sein - ein Tippfehler legt den Versand still.
    pruefe(`${name} ist keine Mailadresse: ${wert}`, wert === '' || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(wert));
  }
}

if (fehler.length) {
  console.error('Absender-Prüfung FEHLGESCHLAGEN:');
  for (const f of fehler) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log('Absender-Prüfung OK: Absender je Zweck, Kulturhaus-Unterscheidung, '
  + 'Bestelladresse und beide Umgebungen geprüft (Hausentscheid 27.10.2026).');
