// Der Weg zur aktuellen Mittagskarte auf der Startseite. Das
// Wochenkarten-Abo, das hier frueher auch wohnte, ist am 01.09.2026 auf
// Wunsch gegangen - mitsamt seinem Formular-Code, damit es nicht still
// zurueckkommt. Die Anmeldung nach einer Reservierung und der
// Dienst-Endpunkt bleiben davon unberuehrt.

import { holeKarteInfo, holeTakeawayKarte, karteAdresse } from './haus-api.js?v=9bbaa1e5';

// ---- Die Mittagskarte als PDF, frisch vom Haus -----------------------------
//
// Der Knopf haengt am Dienst, nicht am Repo: laedt Wolfgang auf der
// Reservierungsseite eine neue Karte hoch, zeigt dieser Knopf ab dem Moment
// darauf. Antwortet der Dienst nicht, bleibt der Eintrag aus
// data/lunch-menu.json der Rueckfall (app.js) - und ohne beides bleibt der
// Knopf aus. Ein Knopf, der auf eine alte Datei zeigt, ist schlimmer als keiner.
async function zeigeKartenKnopf() {
  const knopf = document.querySelector('[data-lunch-card]');
  if (!knopf) return;
  const info = await holeKarteInfo();
  if (!info?.ok || info.vorhanden === false) return;
  const adresse = await karteAdresse();
  if (!adresse) return;
  knopf.href = adresse;
  knopf.hidden = false;
  if (info.stand) knopf.title = `Stand: ${info.stand}`;
}
zeigeKartenKnopf();

// Die Gerichte der Woche standen hier frueher live auf der Startseite.
// Sie sind am 31.08.2026 gegangen: die Startseite fuehrt zur Karte, statt
// sie abzuschreiben. Der Renderer ist mitgegangen - ohne ihn kann die
// Uebersicht nicht still zurueckkommen, sobald irgendwo wieder ein
// Container mit data-lunch-menu auftaucht.

// ---- Das Gericht des naechsten Kochtags, eine Zeile ------------------------
//
// Das staerkste Kaufargument des Mittags ist das Gericht mit seinem Preis
// (Wunsch vom 09.09.). EINE Zeile - kein Abschreiben der Karte, die
// Entscheidung vom 31.08. bleibt: wer die Woche will, geht zur Karte.
//
// WELCHER Tag gilt, entscheidet der Dienst, nicht die Browseruhr: er kennt
// Bestellschluss, Feiertage und zugesperrte Tage. Die erste Fassung rechnete
// selbst und stand um 13:57 Uhr mit "Heute: Lasagne - zum Mitnehmen
// bestellen" da, waehrend die Bestellseite laengst auf morgen umgestellt
// hatte: ein Weg, der sein Versprechen nicht halten kann, ist schlimmer als
// keiner. Jetzt nennen beide denselben Tag, weil sie dieselbe Quelle fragen.
async function zeigeTagesgericht() {
  const kasten = document.getElementById('lunchHeute');
  if (!kasten) return;

  const antwort = await holeTakeawayKarte().catch(() => null);
  if (!antwort?.ok || !Array.isArray(antwort.gruppen) || !antwort.gruppen.length) return;
  const gericht = antwort.gruppen[0]?.gerichte?.[0];
  if (!gericht?.name) return;

  // "mittagsgericht:" ist hier Rauschen - die Zeile steht im Mittag-Kapitel.
  const name = String(gericht.name).replace(/^mittagsgericht:\s*/i, '');
  const preis = Number(gericht.preis);
  const preisText = Number.isFinite(preis) && preis > 0
    ? ` \u00b7 \u20ac ${preis.toFixed(2).replace('.', ',')}`
    : '';

  document.getElementById('lunchHeuteText').textContent = `${tagesWort(antwort.bestelltag)}: ${name}${preisText}`;
  const weg = kasten.querySelector('a');
  // Nach Bestellschluss ist es eine Vorbestellung - dann heisst der Weg auch so.
  if (weg) weg.textContent = antwort.vorbestellung ? 'Vorbestellen \u2192' : 'Zum Mitnehmen bestellen \u2192';
  kasten.hidden = false;
}

/** Heute, Morgen - oder der Wochentag. Ohne Datum bleibt es beim Neutralen. */
function tagesWort(datum) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(datum || ''))) return 'Als N\u00e4chstes';
  const zweistellig = zahl => String(zahl).padStart(2, '0');
  const alsWert = d => `${d.getFullYear()}-${zweistellig(d.getMonth() + 1)}-${zweistellig(d.getDate())}`;
  const heute = new Date();
  if (datum === alsWert(heute)) return 'Heute';
  const morgen = new Date(heute);
  morgen.setDate(heute.getDate() + 1);
  if (datum === alsWert(morgen)) return 'Morgen';
  const tag = new Date(`${datum}T12:00:00`);
  return tag.toLocaleDateString('de-AT', { weekday: 'long' });
}
zeigeTagesgericht();
