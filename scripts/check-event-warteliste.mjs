// Goldene Testfaelle fuer die Warteliste der ausverkauften Abende.
// Genau diese Funktionen laufen im Dienst - hier ohne Netz, ohne Speicher.

import {
  HOECHSTENS_JE_WEG, antwortVomGast, ausverkauftLautPreisen, entferneEintrag, merkeMail, nimmAufEvent,
  pruefeEventWartelisteEintrag, raeumeEventWartelisteAb, setzeStatus,
  wartelisteUebersicht, wegAusTermin, wegStand, wiederBuchbar, zuVerstaendigen
} from '../server/src/event-warteliste.mjs';
import { eventWartelisteAufnahmeMail, eventWartelisteFreiMail } from '../server/src/mail.mjs';

const errors = [];
const check = (name, bedingung, detail = '') => {
  if (bedingung) return;
  errors.push(`Event-Warteliste: ${name}${detail ? ` - ${detail}` : ''}`);
};

const bekannt = new Set(['kulis-02-2026', 'kulis-03-2026', 'dinner-comedy-04-2026', 'dinner-comedy-04-only-2026', 'luis-2026']);

// ---- 1. Eingaben -----------------------------------------------------------

const gut = pruefeEventWartelisteEintrag({ name: ' Anna  Huber ', email: 'Anna@Beispiel.AT', telefon: '+43 664 / 123-45', personen: '2', wege: ['kulis-02-2026'] }, bekannt);
check('Guter Eintrag geht durch', gut.ok, JSON.stringify(gut));
check('Name wird geglaettet', gut.eintrag?.name === 'Anna Huber');
check('Mail wird kleingeschrieben', gut.eintrag?.email === 'anna@beispiel.at');
check('Telefon bleibt lesbar', gut.eintrag?.telefon === '+43 664 / 123-45');
check('Personen als Zahl', gut.eintrag?.personen === 2);
check('Telefon ist freiwillig',
  pruefeEventWartelisteEintrag({ name: 'Anna', email: 'a@b.at', personen: 1, wege: ['kulis-02-2026'] }, bekannt).eintrag.telefon === '');
check('Zu kurzer Name faellt raus',
  pruefeEventWartelisteEintrag({ name: 'A', email: 'a@b.at', wege: ['kulis-02-2026'] }, bekannt).grund === 'name');
check('Kaputte Mail faellt raus',
  pruefeEventWartelisteEintrag({ name: 'Anna', email: 'a@', wege: ['kulis-02-2026'] }, bekannt).grund === 'mail');
check('Elf Karten fallen raus',
  pruefeEventWartelisteEintrag({ name: 'Anna', email: 'a@b.at', personen: 11, wege: ['kulis-02-2026'] }, bekannt).grund === 'personen');
check('Ohne Weg geht nichts',
  pruefeEventWartelisteEintrag({ name: 'Anna', email: 'a@b.at', wege: [] }, bekannt).grund === 'weg');
check('Unbekannte Kennung faellt raus',
  pruefeEventWartelisteEintrag({ name: 'Anna', email: 'a@b.at', wege: ['erfunden-2030'] }, bekannt).grund === 'weg');
check('Eine Kennung mit Sonderzeichen faellt raus',
  pruefeEventWartelisteEintrag({ name: 'Anna', email: 'a@b.at', wege: ['<script>'] }, bekannt).grund === 'weg');
check('Mehrere Wege auf einmal, doppelte nur einmal',
  pruefeEventWartelisteEintrag({ name: 'Anna', email: 'a@b.at', wege: ['kulis-02-2026', 'luis-2026', 'kulis-02-2026'] }, bekannt).eintrag.wege.length === 2);
check('Ein einzelner weg geht auch',
  pruefeEventWartelisteEintrag({ name: 'Anna', email: 'a@b.at', weg: 'luis-2026' }, bekannt).ok);

// ---- 2. Wege aus dem Stand des Ticketdienstes ------------------------------

const termine = {
  'kulis-02-2026': { termin: { id: 'kulis-02-2026', title: 'Gernot Kulis', date: '2026-10-07', zeit: '20:00', haus: 'wirtschaft', buchbar: false, ticketUrl: 'https://www.ticketist.io/events/kulis-02-2026' } },
  'kulis-03-2026': { termin: { id: 'kulis-03-2026', title: 'Gernot Kulis', date: '2026-10-08', zeit: '20:00', haus: 'wirtschaft', buchbar: true, ticketUrl: 'https://www.ticketist.io/events/kulis-03-2026' } },
  'dinner-comedy-04-2026': { termin: { id: 'dinner-comedy-04-2026', title: 'dinner & comedy', date: '2026-10-14', zeit: '19:00', haus: 'wirtschaft', buchbar: false, ticketUrl: 'https://www.ticketist.io/events/dinner-comedy-04-2026' } },
  'dinner-comedy-04-only-2026': { termin: { id: 'dinner-comedy-04-only-2026', title: 'dinner & comedy | comedy only', date: '2026-10-14', zeit: '21:00', haus: 'wirtschaft', buchbar: true, ticketUrl: 'https://www.ticketist.io/events/dinner-comedy-04-only-2026' } },
  'luis-2026': { termin: { id: 'luis-2026', title: 'Luis aus Südtirol', date: '2026-10-13', zeit: '20:00', haus: 'kulturhaus', buchbar: false, ticketUrl: 'https://www.ticketist.io/events/luis-2026' } }
};
const kulis = wegAusTermin(termine['kulis-02-2026'].termin, 'kulis-02-2026');
check('Titel und Datum kommen vom Dienst', kulis.titel === 'Gernot Kulis' && kulis.datum === '2026-10-07' && kulis.zeit === '20:00');
const ohne = wegAusTermin(null, 'kulis-02-2026', { titel: '<b>Gernot</b>', datum: '7.10.', haus: 'x' });
check('Ohne Stand: Angaben des Gastes nur gekuerzt, Datum leer wenn kaputt', ohne.titel === '<b>Gernot</b>' && ohne.datum === '' && ohne.haus === 'wirtschaft');

// ---- 3. Aufnehmen ----------------------------------------------------------

let n = 0;
const neu = () => ({ id: `ew-${++n}`, token: `t${n}` });
const info = Object.fromEntries(Object.keys(termine).map(k => [k, wegAusTermin(termine[k].termin, k)]));
const anna = pruefeEventWartelisteEintrag({ name: 'Anna', email: 'anna@b.at', personen: 2, wege: ['kulis-02-2026', 'dinner-comedy-04-2026'] }, bekannt).eintrag;
const bert = pruefeEventWartelisteEintrag({ name: 'Bert', email: 'bert@b.at', personen: 4, wege: ['kulis-02-2026'] }, bekannt).eintrag;
let liste = nimmAufEvent([], anna, info, '2026-09-18T10:00:00Z', neu).liste;
check('Zwei Wege ergeben zwei Eintraege', liste.length === 2);
check('Eintrag traegt Titel und Datum des Weges', liste[0].titel === 'Gernot Kulis' && liste[0].datum === '2026-10-07');
check('Eintrag startet wartend, ohne Mails', liste[0].status === 'wartet' && liste[0].mails.length === 0 && liste[0].rueckmeldung === null);
liste = nimmAufEvent(liste, bert, info, '2026-09-18T10:05:00Z', neu, 'wirt').liste;
check('Der Wirt traegt mit Quelle ein', liste[2].quelle === 'wirt');
const nochmal = nimmAufEvent(liste, anna, info, '2026-09-18T11:00:00Z', neu);
check('Dieselbe Adresse steht je Weg nur einmal', nochmal.schon.length === 2 && nochmal.angelegt.length === 0 && nochmal.ok);
check('Obergrenze haelt', (() => {
  let volle = [];
  for (let i = 0; i < HOECHSTENS_JE_WEG; i += 1) {
    volle = nimmAufEvent(volle, { name: 'X', email: `x${i}@b.at`, personen: 1, wege: ['luis-2026'] }, info, 't', neu).liste;
  }
  const r = nimmAufEvent(volle, { name: 'Y', email: 'y@b.at', personen: 1, wege: ['luis-2026'] }, info, 't', neu);
  return r.voll.length === 1 && !r.ok;
})());

// ---- 4. Uebersicht fuer den Wirt -------------------------------------------

const heute = '2026-09-18';
const uebersicht = wartelisteUebersicht(liste, termine, heute);
check('Ausverkaufte Abende ohne Wartende stehen trotzdem da',
  uebersicht.some(g => g.weg === 'luis-2026' && g.eintraege.length === 0), uebersicht.map(g => g.weg).join(','));
check('Buchbare Abende ohne Wartende stehen nicht da', !uebersicht.some(g => g.weg === 'kulis-03-2026'));
check('Vergangene Abende stehen nicht da',
  !wartelisteUebersicht([], { alt: { termin: { id: 'alt', title: 'Alt', date: '2026-09-01', buchbar: false } } }, heute).length);
check('Sortiert nach Datum', uebersicht.map(g => g.datum).join(',') === uebersicht.map(g => g.datum).sort().join(','));
const kulisGruppe = uebersicht.find(g => g.weg === 'kulis-02-2026');
check('Zwei warten auf Kulis, sechs Karten', kulisGruppe.wartend === 2 && kulisGruppe.personen === 6);
check('Der Aelteste steht oben', kulisGruppe.eintraege[0].email === 'anna@b.at');
check('Solange ausverkauft, nichts zu tun', zuVerstaendigen(uebersicht) === 0);

// Die Preisliste als zweite Quelle: 0 frei in allen Kategorien heisst
// ausverkauft, auch wenn der Schalter des Dienstes auf offen steht.
const lautPreisen = ausverkauftLautPreisen({
  'kulis-03-2026': [{ name: 'Kat 1', preis: 41, frei: 0 }, { name: 'Kat 2', preis: 37, frei: 0 }],
  'luis-2026': [{ name: 'Kat 1', preis: 40, frei: 3 }],
  'leer': []
});
check('Preisliste: nur volle Nullen zaehlen', lautPreisen.has('kulis-03-2026') && !lautPreisen.has('luis-2026') && !lautPreisen.has('leer'));
const mitPreisen = wartelisteUebersicht(liste, termine, heute, lautPreisen);
check('Laut Preisliste ausverkauft: steht in der Uebersicht, obwohl der Dienst "offen" sagt',
  mitPreisen.some(g => g.weg === 'kulis-03-2026' && g.buchbar === false));

// ---- 5. Wieder buchbar, verstaendigen, Rueckmeldung -----------------------

const frisch = { ...termine, 'kulis-02-2026': { termin: { ...termine['kulis-02-2026'].termin, buchbar: true } } };
const wieder = wiederBuchbar(termine, frisch, liste);
check('Der Wechsel auf buchbar wird erkannt', wieder.length === 1 && wieder[0].weg === 'kulis-02-2026', JSON.stringify(wieder));
check('Ohne Wartende keine Meldung', wiederBuchbar(termine, frisch, []).length === 0);
check('Ohne Wechsel keine Meldung', wiederBuchbar(frisch, frisch, liste).length === 0);
check('Jetzt gibt es etwas zu tun', zuVerstaendigen(wartelisteUebersicht(liste, frisch, heute)) === 2);

// ---- 5b. Der Stand eines Weges: drei Quellen, eine Regel ------------------

const zu = { termin: { id: 'x', date: '2026-10-07', title: 'X', buchbar: false } };
const offen = { termin: { id: 'x', date: '2026-10-07', title: 'X', buchbar: true } };
check('Unbekannter Abend: Stand unbekannt', wegStand(undefined, 'x').buchbar === null);
check('Schalter zu heisst ausverkauft', wegStand(zu, 'x').buchbar === false);
check('Schalter offen heisst buchbar', wegStand(offen, 'x').buchbar === true);
check('Kartenliste auf 0 sticht den offenen Schalter',
  wegStand(offen, 'x', new Set(['x'])).buchbar === false);
// Der Fall, der die Warteliste erst nuetzlich macht: alles verkauft, dann
// storniert jemand. Der Schalter des Dienstes merkt das nicht.
check('Zurueckgekommene Karten stechen alles',
  wegStand({ ...zu, verkauft: 770, verkauftMax: 774 }, 'x').buchbar === true);
check('Und sie werden gezaehlt',
  wegStand({ ...zu, verkauft: 770, verkauftMax: 774 }, 'x').zurueck === 4);
check('Wieder ausverkauft, wenn nachgekauft wurde',
  wegStand({ ...zu, verkauft: 774, verkauftMax: 774 }, 'x').buchbar === false);
check('Ohne Zahlen bleibt es bei Schalter und Liste',
  wegStand({ ...zu, verkauft: null, verkauftMax: null }, 'x').zurueck === 0);

// Dieselbe Regel meldet auch den Rueckkauf-Fall an den Wirt.
const voll = { 'kulis-02-2026': { ...termine['kulis-02-2026'], verkauft: 774, verkauftMax: 774 } };
const retour = { 'kulis-02-2026': { ...termine['kulis-02-2026'], verkauft: 771, verkauftMax: 774 } };
const gemeldet = wiederBuchbar(voll, retour, liste);
check('Stornierte Karten melden sich beim Wirt',
  gemeldet.length === 1 && gemeldet[0].weg === 'kulis-02-2026' && gemeldet[0].zurueck === 3, JSON.stringify(gemeldet));
check('Dieselben drei Karten melden sich nicht zweimal', wiederBuchbar(retour, retour, liste).length === 0);
check('Kommt eine vierte zurueck, ist das neu',
  wiederBuchbar(retour, { 'kulis-02-2026': { ...retour['kulis-02-2026'], verkauft: 770 } }, liste)[0].zurueck === 1);
check('Die Uebersicht zeigt die zurueckgekommenen Karten',
  wartelisteUebersicht(liste, retour, heute).find(g => g.weg === 'kulis-02-2026')?.zurueck === 3);

liste = merkeMail(liste, 'ew-1', { ok: true }, '2026-09-19T09:00:00Z');
check('Mail merkt sich Zeit und Erfolg',
  liste[0].mails.length === 1 && liste[0].mails[0].um === '2026-09-19T09:00:00Z' && liste[0].mails[0].ok === true);
check('Nach der Mail: informiert', liste[0].status === 'informiert');
liste = merkeMail(liste, 'ew-3', { ok: false, grund: 'nicht_eingerichtet' }, '2026-09-19T09:01:00Z');
check('Misslungener Versand bleibt wartend, aber sichtbar',
  liste[2].status === 'wartet' && liste[2].mails[0].ok === false && liste[2].mails[0].grund === 'nicht_eingerichtet');

const antwort = antwortVomGast(liste, 't1', 'gebucht', '2026-09-19T10:00:00Z');
check('Der Gast antwortet mit seinem Geheimnis', antwort.ok && antwort.eintrag.id === 'ew-1');
liste = antwort.liste;
check('Rueckmeldung steht mit Zeit und Herkunft',
  liste[0].status === 'gebucht' && liste[0].rueckmeldung?.art === 'gebucht' && liste[0].rueckmeldung?.von === 'gast' && liste[0].rueckmeldung?.um === '2026-09-19T10:00:00Z');
check('Falsches Geheimnis: nichts', antwortVomGast(liste, 'falsch', 'gebucht', 'x').ok === false);
check('Unsinnige Antwort: nichts', antwortVomGast(liste, 't2', 'weg', 'x').ok === false);
check('Austragen loescht den Eintrag', antwortVomGast(liste, 't2', 'austragen', 'x').liste.length === liste.length - 1);
liste = setzeStatus(liste, 'ew-3', 'kein_bedarf', { von: 'wirt', jetzt: 'j', notiz: 'hat angerufen' });
check('Der Wirt setzt den Stand samt Notiz', liste[2].status === 'kein_bedarf' && liste[2].notiz === 'hat angerufen' && liste[2].rueckmeldung?.von === 'wirt');
liste = setzeStatus(liste, 'ew-3', 'wartet', { von: 'wirt', jetzt: 'j' });
check('Zurueck auf wartend loescht die Rueckmeldung', liste[2].status === 'wartet' && liste[2].rueckmeldung === null);
check('Unbekannter Stand aendert nichts', setzeStatus(liste, 'ew-3', 'kaputt') === liste);
check('Entfernen', entferneEintrag(liste, 'ew-3').length === liste.length - 1);
check('Gebuchte zaehlen nicht mehr als wartend',
  wartelisteUebersicht(liste, frisch, heute).find(g => g.weg === 'kulis-02-2026').wartend === 1);

// ---- 6. Aufraeumen ---------------------------------------------------------

check('Nach dem Abend verschwindet der Eintrag', raeumeEventWartelisteAb(liste, '2026-10-08').every(e => e.datum !== '2026-10-07'));
check('Am Abend selbst bleibt er', raeumeEventWartelisteAb(liste, '2026-10-07').some(e => e.datum === '2026-10-07'));
check('Ohne Datum: nach 60 Tagen weg',
  raeumeEventWartelisteAb([{ datum: '', eingetragen: '2026-01-01T00:00:00Z' }], '2026-09-18').length === 0
  && raeumeEventWartelisteAb([{ datum: '', eingetragen: '2026-09-01T00:00:00Z' }], '2026-09-18').length === 1);

// ---- 7. Mails --------------------------------------------------------------

const aufnahme = eventWartelisteAufnahmeMail({ name: 'Anna', wege: [{ titel: 'Gernot Kulis', datum: '2026-10-07', zeit: '20:00' }], austragLinks: ['https://d/warteliste/antwort?t=t1&a=austragen'] });
check('Aufnahmemail nennt Abend und Austragen', aufnahme.text.includes('Gernot Kulis') && aufnahme.text.includes('a=austragen') && aufnahme.html.includes('austragen'));
const frei = eventWartelisteFreiMail({ name: 'Anna', titel: 'Gernot Kulis', datum: '2026-10-07', zeit: '20:00', personen: 2, ticketUrl: 'https://www.ticketist.io/events/kulis-02-2026', gebuchtLink: 'https://d/g', keinBedarfLink: 'https://d/k' });
check('Freimail traegt Ticketlink und beide Antworten',
  frei.html.includes('https://www.ticketist.io/events/kulis-02-2026') && frei.html.includes('https://d/g') && frei.html.includes('https://d/k') && frei.text.includes('https://d/k'));
check('Freimail reserviert nichts', /nicht reserviert/.test(frei.text));
check('Betreff nennt Abend und Tag', frei.betreff.includes('Gernot Kulis') && frei.betreff.includes('7. Oktober 2026'));
check('Namen werden im HTML entschaerft',
  eventWartelisteFreiMail({ name: '<b>x</b>', titel: 't', datum: '2026-10-07', zeit: '', personen: 1, ticketUrl: '', gebuchtLink: 'g', keinBedarfLink: 'k' }).html.includes('&lt;b&gt;x&lt;/b&gt;'));

// ---- Ergebnis --------------------------------------------------------------

if (errors.length) {
  console.error(`\nEvent-Warteliste-Prüfung fehlgeschlagen (${errors.length}):`);
  for (const zeile of errors) console.error(`  - ${zeile}`);
  process.exit(1);
}
console.log('Event-Warteliste-Prüfung OK: Eingaben, Wege, Aufnahme, Übersicht, Verständigung, Rückmeldung, Aufräumen und Mails geprüft.');
