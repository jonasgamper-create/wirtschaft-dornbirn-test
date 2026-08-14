# Tischplan: Datenmodell und Bedienung

## Was der Tischplan ist und was nicht

Der Tischplan beschreibt **Etagen und Tischanzahlen**, nicht einen gezeichneten
Grundriss. Wer eine Tischanzahl ändert oder eine Etage ergänzt, ändert eine
Zahl — die Zeichnung entsteht daraus automatisch. Es muss nie jemand eine
Grafik anfassen.

**Er ist ausschließlich intern.** Gäste sehen ihn nicht und wählen keinen Tisch;
sie geben Tag, Uhrzeit und Personenzahl an, die Einteilung macht das Haus.
Deshalb liegt nichts davon im öffentlichen Build — weder der Renderer noch die
Zuweisungsregeln noch die Stammdaten.

Er sagt auch nicht, welcher Tisch gerade frei ist. Verbindlich bleibt das
offizielle Reservierungssystem.

## Dateien

Alle intern, alle vom öffentlichen Build ausgeschlossen.

| Datei | Rolle |
| --- | --- |
| `site/gastgeber-tischplan.html` | Die eigene Seite für die Einteilung |
| `site/data/floorplan.json` | Die Konfiguration: Etagen, Anzahlen, Kombinationen, Regeln |
| `site/floorplan-layout.mjs` | Rechnet Anzahlen in Positionen und Tischnummern um |
| `site/table-assignment.mjs` | Best-Fit-Zuweisung |
| `site/floorplan.js` / `.css` | Zeichnet den Plan |
| `site/gastgeber-floorplan.js` | Verbindet Seite, Speicher und Renderer |

## Konfiguration

```json
{
  "version": 2,
  "status": "beispiel",
  "numbering": { "start": 1 },
  "activeLayout": "standard",
  "layouts": [
    {
      "id": "standard",
      "name": "Standard",
      "levels": [
        {
          "id": "eg",
          "name": "Gaststube",
          "order": 1,
          "tables": [
            { "id": "eg-t01", "seats": 8, "col": 0, "row": 0 },
            { "id": "eg-t02", "seats": 4, "col": null, "row": null }
          ]
        }
      ],
      "combos": [
        { "id": "eg-combo-01", "tables": ["eg-t01", "eg-t02"], "minGuests": 7 }
      ]
    }
  ],
  "menu": [{ "id": "burger", "name": "Burger" }],
  "policy": {
    "durations": [{ "upTo": 2, "minutes": 90 }],
    "bufferMinutes": 15,
    "slotMinutes": 15,
    "maxCoversPerSlot": 10,
    "levelOrder": ["eg"]
  }
}
```

Version 1 kannte nur eine Ordnung und beschrieb Tische über Anzahlen. Beim Laden
hebt `migrate()` alte Dateien automatisch auf dieses Modell — die alten Anzahlen
werden zu einzelnen Tischen in einer Ordnung namens „Standard".

### Tischgrößen

`seats` erlaubt **1 bis 12 Plätze, auch ungerade**: ein Dreiertisch ist genauso
möglich wie ein Siebener. Sieben Gäste können also an einem einzelnen Tisch
sitzen, wenn es einen passenden gibt.

Der Fußabdruck wächst mit, aber nicht linear — ein Zehnertisch ist länger als
ein Zweiertisch, nicht fünfmal so lang:

| Personen | 2 / 3 | 4 / 5 | 6 / 7 | 8 / 9 | 10 |
| --- | --- | --- | --- | --- | --- |
| Breite in Rastereinheiten | 3 | 4 | 5 | 6 | 7 |

`combos` bleibt daneben nützlich für Tische, die im Haus tatsächlich
zusammengeschoben werden. Eine belegte Kombination sperrt automatisch alle
beteiligten Tische, weil die Belegung auf den Kennungen liegt.

### Tischordnungen

Mehrere benannte Ordnungen sind möglich — Standard, Konzert, Hochzeit. Jede hat
ihre eigenen Etagen und Tische; umgeschaltet wird in Panel 01. Eine neue Ordnung
übernimmt die Räume, aber keine Tische: sie wird von Grund auf gestellt. Wer
lieber von einer bestehenden ausgeht, nimmt „Aktuelle Ordnung kopieren".

Reservierungen hängen an Tisch-Kennungen, nicht an Ordnungen. Wechselt man die
Ordnung, stehen Reservierungen, deren Tische es dort nicht gibt, wieder offen —
und die Seite sagt namentlich, welche.

### Einzelne Tische und Stühle

Panel 05 zeigt je Etage Knöpfe „+ 2P" bis „+ 10P" zum Ergänzen und darunter
jeden Tisch einzeln mit seiner Stuhlzahl, zwei Knöpfen zum Ändern und
„Tisch weg". Stühle sind gleich Plätze: ein Stuhl mehr macht aus dem Vierer
einen Fünfer. Sitzt jemand am Tisch, lässt er sich nicht unter die Personenzahl
verkleinern.

Im Plan werden die Stühle gezeichnet — oben die größere Hälfte, unten der Rest,
ab acht Plätzen je einer an den Schmalseiten. Das macht die Tischgröße lesbar,
ohne die Zahl zu lesen.

### Positionen

`col` und `row` merken sich, wo ein Tisch steht. Tische mit `null` ordnen sich
automatisch in der ersten freien Lücke an. **Sobald ein Tisch verschoben wird,
werden alle Tische dieser Etage festgehalten** — sonst würde die Karte bei jedem
Zug unter der Hand nachrutschen. Nur später neu dazugekommene Tische suchen sich
noch selbst einen Platz.

Achtung beim Einlesen: `Number(null)` ist `0`. Ohne ausdrückliche Prüfung auf
`null` gilt jeder Tisch als fest auf Position 0,0 gesetzt und alle stapeln sich
übereinander — genau das ist beim Bauen einmal passiert.

`status` steht auf `beispiel`, solange die Zahlen nicht vom Haus bestätigt sind,
und auf `bestaetigt`, sobald die echten Tische eingetragen wurden. Das ist ein
Qualitätsmerkmal für die Daten, keine Sichtbarkeitsschaltung — sichtbar ist der
Plan ohnehin nur intern.

## Tischnummern

Zwei Zählweisen, einstellbar im Setup und mit dem Plan gespeichert:

| `numbering.mode` | Beispiel |
| --- | --- |
| `fortlaufend` | Gaststube 1–16, Saal 17–25 |
| `pro-etage` | Gaststube 1–16, **Saal wieder 1–9** |

**Bei `pro-etage` gibt es Tisch 1 mehrfach.** Deshalb steht dann überall die
Etage dabei — in Meldungen, in der Reservierungsliste, in den Auswahlfeldern:
„Tisch 4 · Gaststube". Bei einer einzigen Etage bleibt die Beschriftung kurz,
dort gibt es keine Verwechslung. Der Bildschirm am Eingang zeigt die Etage
ohnehin in einer eigenen Spalte.

Innerhalb einer Etage wird **in Leserichtung** gezählt: oben links nach unten
rechts. Das macht die Karte
selbsterklärend — Tisch 1 ist der erste, den man beim Reinkommen sieht. Der Gast
hört „Tisch 12", nicht „Tisch 12 im Obergeschoss".

**Wichtig:** Weil die Nummern der Anordnung folgen, ändern sie sich beim
Verschieben und beim Ändern von Anzahlen. Deshalb gilt: **erst die Karte fertig
anordnen, dann Tischkarten drucken.** Das Cockpit warnt, wenn sich Nummern
verschieben. Die internen Kennungen (`eg-4-01`, `og-2-03`) bleiben stabil —
deshalb verweisen `combos` und `positions` auf Kennungen, nicht auf Nummern.

Im Plan steht neben der Nummer die Personenzahl abgekürzt, also `4P` für einen
Vierertisch. Die Nummer ist die Identität, die Größe die Zusatzinfo.

## Bedienung

`site/gastgeber-tischplan.html`, erreichbar über Panel 05 im Cockpit. Die Seite
ist von oben nach unten der Arbeitsweg:

1. **Zeitpunkt** — Tag, Uhrzeit und Tischordnung wählen.
2. **Karte** — Tische ziehen oder, wenn ein Tisch in der Liste im Fokus ist, mit
   **Umschalt und Pfeiltaste** verschieben. Ein Zug auf einen besetzten Platz
   springt zurück und nennt den blockierenden Tisch. Doppelklick schreibt einen
   Namen direkt auf den Tisch.
3. **Reservierungen** — Name, Tag, Uhrzeit, Personen, optional das Essen. Passt
   die Kapazität, ist der Tisch sofort vergeben. „Alle offenen verteilen"
   arbeitet die Restlichen ab, größte Gruppe zuerst.
4. **Tischliste** — Name in die Zeile schreiben belegt, Feld leeren macht frei.
   Je Zeile eine Auswahl für offene Reservierungen, „Frei machen" und „Sperren".
5. **Räume** — Etagen anlegen, Tische mit „+ 2P" bis „+ 10P" ergänzen, je Tisch
   Stühle ändern oder ihn entfernen. Darunter Ordnungen anlegen, kopieren und
   löschen.

Zum Übernehmen in die Datei: „Tischplan exportieren" und das Ergebnis nach
`site/data/floorplan.json` legen. `status` auf `bestaetigt` stellen, sobald die
Zahlen vom Haus kommen.

## Zeitpunkt: Tag und Uhrzeit steuern alles

Panel 01 legt Tag, Uhrzeit und Tischordnung fest. Karte, Tischliste und
Reservierungsliste zeigen immer genau diesen Moment. Wer um 12:00 für 105
Minuten sitzt, erscheint auch um 12:30 noch auf der Karte und verschwindet um
13:45 von selbst — die Dauer kommt aus `policy.durations` und richtet sich nach
der Gruppengröße.

## Reservierungen

Name, Tag, Uhrzeit, Personenzahl. **Passt die Kapazität, wird der Tisch sofort
vergeben** — kleinster passender freier Tisch, geprüft gegen alle anderen
Reservierungen des Tages inklusive Pufferzeit. Passt es nicht, bleibt die
Reservierung aufgenommen, aber ohne Tisch, mit Begründung und Vorschlägen für
mögliche Zeiten.

### Essen vorbestellen

Freiwillig und pro Reservierung: Burger, Schnitzel, Käsknöpfle (die Liste steht
in `menu` und ist erweiterbar). Es dürfen nie mehr Portionen als Gäste sein.
Auch eine einzelne Portion bei vier Personen ist erlaubt — der Rest entscheidet
vor Ort. Unter der Liste steht die Küchenübersicht des Tages: wie viel von was,
von wie vielen Reservierungen, bei wie vielen Gästen insgesamt.

### Aus einer E-Mail übernehmen

Mailtext einfügen, „Aus Text übernehmen". Erkannt werden Name, Datum, Uhrzeit
und Personenzahl aus den üblichen Formulierungen („auf den Namen Huber",
„Familie Schwarzmann", „für Herrn Ritter", „24.08.2026", „12:30", „12 Uhr",
„für 5 Personen"). Wird etwas nicht sicher gelesen, sagt die Seite das und
verlangt die Eingabe von Hand statt zu raten.

**Was das nicht ist:** ein Postfach, das sich selbst ausliest. Dafür bräuchte es
einen Server, der Mails abruft und verarbeitet — eine statische Seite kann das
nicht, und der Text auf der Seite sagt das auch so.

## Belegung: wer sitzt an welchem Tisch

Panel 03 hat zwei Wege zum selben Ziel.

**Oben, automatisch.** Gruppen mit Name und Personenzahl aufnehmen, dann „Alle
offenen Gruppen verteilen". Die Verteilung geht von der größten Gruppe abwärts —
sie hat die wenigsten Möglichkeiten — und sucht jeweils den kleinsten passenden
freien Tisch. Was nicht unterkommt, wird namentlich gemeldet statt still
übergangen.

Das ist bewusst kein Zufall: zufällige Verteilung verschenkt große Tische an
kleine Gruppen und lässt später niemanden mehr Platz finden.

**Zwei Klicks, der kürzeste Weg.** Gruppe oben anklicken — sie ist markiert —
dann den Tisch auf der Karte anklicken. Fertig. Eine schon sitzende Gruppe zu
markieren heißt umsetzen: der nächste Tischklick verschiebt sie. Nochmal auf die
Gruppe klicken hebt die Markierung auf.

**Umgekehrt, vom Tisch aus.** Jede freie Zeile in der Tischliste hat eine
Auswahl „Gruppe wählen …" mit allen offenen Gruppen. Gruppen, die nicht an den
Tisch passen, stehen dort ausgegraut statt zu fehlen — so sieht man, dass es sie
gibt und warum sie nicht gehen.

**Unten, die Tischliste.** Eine Zeile je Tisch mit Nummer, Größe, Etage, Name
und Personenzahl. Den Namen direkt in die Zeile schreiben belegt den Tisch, das
Feld leeren macht ihn wieder frei. Die Personenzahl wird still auf die
Tischgröße begrenzt und sagt das auch. Für den Rest gibt es zwei Knöpfe je
Zeile: „Frei machen" und „Sperren".

**Direkt auf der Karte.** Ein Doppelklick auf einen Tisch öffnet ein
Eingabefeld genau über ihm — Name tippen, Enter. Escape verwirft. Ein einfacher
Klick springt stattdessen in die passende Zeile der Tischliste, sodass Karte und
Liste derselbe Arbeitsweg sind und nicht zwei getrennte.

Mit der Tastatur: in der Tischliste neben der Karte mit den Pfeiltasten zum
Tisch, Enter — der Fokus landet direkt im Namensfeld der Zeile. Das
Eingabefeld auf der Karte ist ein echtes `input`, kein `contenteditable` im
SVG; letzteres ist mit Tastatur und Vorlesesoftware unzuverlässig.

Im Plan steht auf einem belegten Tisch der Name und darunter die Belegung als
`7/8` — sieben Gäste auf einem Achtertisch. Bei schmalen Tischen wird der Name
gekürzt; die Liste daneben zeigt ihn immer vollständig.

Die Belegung ist eine Momentaufnahme ohne Zeitverlauf. Deshalb löst sie kein
Pacing aus: sie blockiert ihre Tische, zählt aber nicht als Zustrom im
Viertelstundenfenster. Die Probe in Panel 04 rechnet mit der tatsächlichen
Belegung und schlägt keine besetzten Tische mehr vor.

### Namen und Datenschutz

Der Name ist das **einzige personenbezogene Feld** im Speicher — mehr braucht
ein Sitzplan nicht, und mehr darf hier auch nicht liegen: kein Kontakt, keine
Notiz, keine Historie. Die Belegung ist tagesaktuell gedacht und wird über
„Belegung leeren" wieder entfernt.

Das ist eine bewusste Ausnahme von der sonstigen Regel in
`site/inventory-store.js`, keine Nachlässigkeit. Sie gilt nur, solange das
Werkzeug lokal im Browser des Hauses läuft. **Für den echten Betrieb mit
mehreren Geräten braucht es eine geschützte Datenbank mit Anmeldung, eine
festgelegte Löschfrist und einen Eintrag im Verarbeitungsverzeichnis** — siehe
`SECURITY.md` und `docs/privacy/data-flow-matrix.md`.

## Einchecken: was die Karte wirklich zeigt

Bis hierher galt ein Tisch allein nach der Uhr als belegt: reserviert um 12:00
für vier Personen, also rechnerisch besetzt bis 13:45. Das ist an drei Stellen
falsch. Die Gruppe kommt zwanzig Minuten zu spät — der Tisch steht leer, gilt
aber als voll, und der Laufkunde an der Tür wird abgewiesen. Die Gruppe geht um
13:00 — der Tisch bleibt 45 Minuten künstlich gesperrt. Und der Bildschirm am
Eingang nennt Leute beim Namen, die noch gar nicht im Haus sind.

Deshalb hat jede Reservierung jetzt zwei zusätzliche Angaben: **Ankunft** und
**Abgang**. Beide sind Uhrzeiten, beide dürfen leer sein.

**Einchecken geht mit einem Klick auf den Tisch.** Steht jemand an der Tür,
klickt man seinen Tisch auf der Karte an — fertig. Nochmal klicken nimmt es
zurück. Denselben Weg gibt es mit der Tastatur über den Knopf „Eingecheckt" in
der Reservierungszeile und in der Tischzeile. Als Ankunftszeit wird der oben
eingestellte Moment eingetragen, nicht die Systemuhr — so stimmt sie auch, wenn
der Mittag abends nachgetragen wird.

Daraus ergeben sich sechs Zustände. Die reine Logik dafür steht in
`site/table-assignment.mjs` (`partyStatus`, `occupiesAt`, `belegtBis`) und ist
ohne Browser testbar; `npm run check:assignment` prüft jeden Fall einzeln.

| Zustand | Wann | Auf der Karte |
| --- | --- | --- |
| kommt | Reservierung liegt noch vor uns | Tisch ist frei |
| wartet | Zeit läuft, noch nicht da, innerhalb der Karenz | Creme wie belegt |
| überfällig | Zeit plus Karenz vorbei, niemand eingecheckt | **Gold, auffällig** |
| da | eingecheckt | Creme mit Häkchen ✓ |
| weg | abgerechnet und gegangen | Tisch ist sofort wieder frei |
| vorbei | Zeitfenster abgelaufen | Tisch ist frei |

Die **Karenz** beträgt fünfzehn Minuten (`KARENZ_MINUTEN`). So lange gilt ein
Gast als erwartet, danach als überfällig. Das ist die übliche Kulanz im Haus;
danach muss der Service entscheiden, ob der Tisch weitergegeben wird.

Gold ist der auffällige Ton des bestehenden CI — kein neuer Farbwert. Ink auf
Gold hat ein Kontrastverhältnis von 7,5:1, die Beschriftung bleibt also lesbar.
Weil Farbe allein nicht genügt, steht derselbe Zustand als Wort in der
bedienbaren Liste, im Chip neben der Reservierung und in der Legende.

**Fertig** trägt den Abgang ein. Der Tisch ist ab diesem Moment wieder frei —
und zwar auch für die automatische Zuweisung, nicht nur in der Anzeige. Geprüft:
eine zweite Zehnergruppe um 13:00 wird abgewiesen, solange die erste
rechnerisch bis 15:00 sitzt; nach „Fertig" um 12:45 bekommt sie den Tisch.

Ein Abgang vor dem Beginn wird ignoriert, ein Abgang nach der regulären Zeit
verlängert nicht — beides sind Bedienfehler und dürfen die Belegung nicht auf
eine negative oder überlange Dauer ziehen.

## Bis wann frei, bis wann belegt

„Frei" allein beantwortet die Frage an der Tür nicht — sie lautet immer „frei
bis wann". Deshalb steht bei jedem freien Tisch, bis wann er frei bleibt: als
Platzhalter im Namensfeld der Tischliste („frei bis 12:15") und in der
bedienbaren Liste unter der Karte. Bei belegten Tischen steht umgekehrt, bis
wann sie belegt sind.

## Laufkunden

Ein Gast, der ohne Reservierung hereinkommt, kostete vier Felder: Name, Tag,
Uhrzeit, Personen — obwohl Tag und Uhrzeit „jetzt" sind. Der Knopf **„Gast steht
da"** setzt Tag und Uhrzeit auf den aktuellen Moment, abgerundet auf die
Viertelstunde, damit die Zeit zu den Schichten passt, und springt ins Namensfeld.
Es fehlen dann nur noch Name und Personenzahl.

Der so angelegte Gast gilt sofort als eingecheckt — er steht ja da. Ohne das
wäre er in dem Moment eingetragen, in dem er überfällig wird.

## Filter und Suche in der Tischliste

Bei 25 und mehr Tischen ist die vollständige Liste im Betrieb nicht mehr lesbar.
Über der Tischliste stehen vier Filter — Alle, Frei, Belegt, Überfällig — und
ein Suchfeld für Tischnummer, Etage oder Gastname. Der Filter wird bewusst
**nicht** gespeichert: ein vergessener Filter versteckt am nächsten Tag Tische,
und man sucht den Fehler an der falschen Stelle.

## Zuweisungsregeln, in dieser Reihenfolge

1. **Sitzplatzdeckel vor Geometrie.** Ist das Zeitfenster laut Panel 02 voll,
   wird abgelehnt — auch wenn ein Tisch frei steht. Ein Bedienfehler im
   Tischmix kann so nie zu einer Zusage über dem Limit führen.
2. **Dauer nach Gruppengröße** aus `policy.durations`, plus `bufferMinutes`
   auf beiden Seiten zum Abräumen und Eindecken.
3. **Kandidaten**: Einzeltische und vorab definierte Kombinationen. Es wird nie
   zur Laufzeit kombiniert — nur das Haus weiß, welche Tische zusammenpassen.
4. **Größenfilter**: mindestens die Hälfte der Plätze. Eine Einzelperson
   blockiert damit keinen Vierertisch, aber sieben Gäste dürfen notfalls an den
   Zehner. Welcher Tisch am Ende gewinnt, entscheidet ohnehin Regel 7.
5. **Überlappung** inklusive Puffer. Eine belegte Kombination sperrt beide
   Mitglieder automatisch.
6. **Gesperrte Tische** fallen raus.
7. **Sortierung**: wenigste Tische, dann kleinste Sitzplatzverschwendung, dann
   Etagenreihenfolge (Gaststube vor Saal, damit die zweite Etage bei schwacher
   Auslastung zu bleiben kann), dann Tischnummer.
8. **Pacing**: `maxCoversPerSlot` begrenzt, wie viele Gäste je Viertelstunde
   ankommen. Bei Ablehnung werden die nächsten drei Zeitfenster als Alternative
   vorgeschlagen — ein Nein ohne Alternative wäre ein verlorener Gast.

Geprüft wird das von `scripts/check-table-assignment.mjs` in `npm run ci`.

## Der Moment läuft mit: Jetzt-Betrieb

Die Uhrzeit war ein Handfeld. Wer morgens 11:00 einstellte und dann bediente,
dessen Tafel stand den ganzen Mittag auf 11:00: nichts wurde je überfällig, und
jedes Einchecken bekam 11:00 als Ankunftszeit. Das war der schwerste Fehler in
der Handhabung — er fällt nicht auf, weil die Seite plausibel aussieht.

Oben in der Servicezeile steht deshalb der Schalter **Jetzt**. Ist er grün,
läuft die Uhr mit und der Plan zeigt immer den aktuellen Moment; der Takt
kommt alle 30 Sekunden. Eine Uhrzeit von Hand einzustellen hält den Plan an —
der Schalter wird grau und liest „Angehalten" — ein Klick lässt ihn wieder
mitlaufen.

Der Takt zeichnet nicht neu, wenn er dabei eine Eingabe zerstören würde. Er
setzt aber **nicht** pauschal bei jedem Fokus aus: nach jeder Reservierung
steht der Cursor im Namensfeld, und eine Uhr, die deshalb für immer stehen
bleibt, wäre genau der stille Fehler, den dieser Abschnitt beseitigen soll.
Ausgesetzt wird nur bei Feldern, die `paint()` selbst überschreibt
(`SCHREIBT_PAINT`), und in den Listen, die es neu aufbaut.

## Servicezeile

Sie klebt oben und beantwortet die vier Fragen des Mittags: welcher Moment
gilt, wie viele Plätze sind frei, wartet jemand überfällig, wer kommt als
nächstes. Überfällige werden zusätzlich als Abzeichen am Reiter *Service*
gezeigt — so sieht man den Ärger auch, wenn man gerade in der Tischliste steht.

## Reiter statt einer langen Seite

Fünf Reiter statt sechs nummerierter Abschnitte untereinander:

| Reiter | Wofür | Wie oft |
| --- | --- | --- |
| Service | Karte und Reservierungen, nebeneinander | ständig |
| Tische | Liste mit Filter und Suche | wenn es voll ist |
| Einrichten | Ordnung, Betriebsart, Etagen, Raumbild, Sicherung | einmal |
| Auswertung | Tagesübersicht und CSV | abends |
| Ablauf | Die Sequenz, die Farben, die drei Grenzen | zum Nachlesen |

Der zuletzt benutzte Reiter wird gemerkt. Pfeiltasten wandern durch die
Reiterleiste, `Home` und `End` springen an die Enden — das erwartete Verhalten
und der einzige Weg ohne Maus.

## Aufbau der Seite

Die Seite war 22.243 Pixel lang — rund 25 Bildschirme. Karte und
Reservierungsliste lagen 3.300 Pixel auseinander, obwohl man im Service
ständig zwischen ihnen wechselt, und Einrichtung (Panel 01 und 05) machte mit
6.787 Pixeln fast ein Drittel der Seite aus, obwohl man sie einmal anfasst.

Drei Änderungen, gemessen statt geschätzt:

- Betriebsart, Sicherung, Etagen, Raumbild und die Sammelaktionen liegen in
  zusammenklappbaren Bereichen und sind zu, bis man sie braucht.
- Karte und Reservierungen stehen ab 1200 Pixel Fensterbreite nebeneinander.
  Darin stapelt die Karte ihre eigene Zweiteilung, sonst würde der Plan zu
  schmal.
- Der Zeitpunkt oben bleibt immer sichtbar — er steuert alles.

Mit den Reitern kommt der zweite Sprung: **2.197 Pixel bei 1440×900**, also 2,4
statt ursprünglich 25 Bildschirme. Am Handy (390 px) 3.990 Pixel; dort scrollt
die Servicezeile mit und nur die Reiterleiste bleibt oben stehen — zwei klebende
Leisten übereinander wären die halbe Anzeige.

Kein waagrechter Überlauf, alle Bedienelemente mindestens 44 Pixel hoch. Dabei
fiel ein alter Mangel auf: das Auswahlfeld „Tisch wechseln …" war am Handy nur
18 Pixel hoch und mit dem Finger nicht zu treffen; es bekommt jetzt eine eigene
Zeile in voller Breite.

Für den Ausdruck werden zugeklappte Bereiche und Auswahlfelder ausgeblendet.
Vorher standen „Tisch wechseln …"-Dropdowns auf dem Serviceblatt.

## Barrierefreiheit

Das SVG ist `aria-hidden` und rein visuell. Bedienbar und vorlesbar ist die
Liste daneben: echte Buttons in einer `radiogroup`, Pfeiltasten bewegen den
Fokus, Enter oder Leertaste löst aus. Das Trennen von Bewegen und Auslösen ist
Absicht — beim Sperren eines Tisches wäre ein Versehen teuer. Umschalt und
Pfeiltaste verschiebt den Tisch und ist die Tastaturalternative zum Ziehen mit
der Maus; ohne sie wäre das Anordnen nur mit Maus möglich.

## Grenzen

Der Plan zählt **nichts herunter**, wenn ein Gast online bucht. Dafür braucht es
einen Server mit gemeinsamem Zustand; auf GitHub Pages hätte jeder Browser
seinen eigenen Zähler und zwei Gäste bekämen denselben letzten Tisch. Das
Cockpit und Tischplan liegen im lokalen Browserspeicher und sind nicht Teil der
öffentlichen Seite. Für mehrere Geräte und Mitarbeitende braucht es eine
geschützte Datenbank mit Anmeldung — siehe `SECURITY.md` und
`docs/host-cockpit-architecture.md`.

## Einzeldatei für unterwegs

Die Fassung in `site/` braucht einen lokalen Server: Sie importiert Module und
holt die Konfiguration per `fetch` — beides scheitert an `file://`.

Für den Alltag gibt es deshalb eine Einzeldatei:

```bash
npm run build:tischplan
```

Ergebnis: `output/tischplan/wirtschaft-tischplan.html`, rund 130 KB. Alles steckt
im Dokument — Stile, Programmcode, Ausgangskonfiguration und das Logo als
eingebettetes Bild. Kein einziger Netzwerkzugriff, kein Server, kein Internet.
Die Datei lässt sich per Doppelklick öffnen, auch aus einem geteilten Ordner
oder von einem Stick. Jeder Lauf überschreibt sie vollständig.

Die Inhaltsrichtlinie bleibt scharf: Stil und Skript sind über ihren
SHA-256-Hash freigegeben, nicht über `unsafe-inline`, und `connect-src` steht
auf `none` — die Datei kann gar nichts nach außen senden.

**Was das bedeutet:** Die Einteilung liegt im Browser desjenigen, der die Datei
öffnet. Auf einem zweiten Rechner ist sie nicht da, und zwei Leute sehen nicht
dasselbe. Für gemeinsames Arbeiten braucht es den Server aus `SECURITY.md`.

### Warum kein öffentlicher Link

Ein GitHub-Pages-Link wäre technisch möglich, aber **öffentlich und ohne
Anmeldung**. Gästedaten würden dabei zwar nicht mitgeliefert — sie entstehen
erst im Browser —, aber die interne Ansicht wäre für jeden erreichbar, der die
Adresse kennt. Deshalb bleibt der Tischplan aus dem öffentlichen Build heraus;
die Einzeldatei ist der Weg, ihn trotzdem überall dabeizuhaben.

## Raum aufzeichnen

Bühne, Bar, Eingang, Ausgang, Terrasse und Wände liegen als `elements` in der
Etage. Sie werden wie Tische gezogen, lassen sich verlängern und drehen, und
**sperren nichts** — sie zeigen dem Kunden, wo er ist. Nur die automatische
Platzierung neuer Tische weicht ihnen aus, damit der erste Tisch nicht mitten
auf der Bühne landet.

Eine Wand ist ein flaches Rechteck. Das ist absichtlich derselbe Baustein wie
alles andere: ziehen, verlängern, drehen — kein zweiter Bedienweg für Striche.

## Rückgängig und wieder vor

Oben auf der Seite, in beiden Ansichten. Jede Änderung ist ein eigener Schritt:
ein verschobener Tisch, ein Name, eine Anzahl. Auch über die Tastatur mit
Cmd/Strg + Z und Cmd/Strg + Umschalt + Z — außer während in ein Feld getippt
wird, dort gilt das Rückgängig des Browsers.

Der Verlauf hält 60 Schritte und liegt in `site/plan-history.mjs`. Er legt nach
jeder Änderung den ganzen Zustand als Text ab. Das ist gröber als eine
Befehlsliste, aber bei dieser Größenordnung billiger — und es kann nichts
auseinanderlaufen, weil es keinen zweiten Weg zurück gibt.

## Tagesübersicht und Excel

Panel 06 zeigt je Tag: Reservierungen, Gäste, Plätze gesamt, belegt, frei,
Auslastung und vorbestellte Portionen. **Der gewählte Tag steht immer oben** und
ist hervorgehoben, auch wenn für ihn noch nichts eingetragen ist.

„Als Tabelle für Excel speichern" schreibt eine CSV mit Semikolon, deutschem
Zahlenformat und BOM — Excel öffnet sie per Doppelklick richtig, inklusive
Umlaute. Eine echte `.xlsx` bräuchte eine zusätzliche Programmbibliothek; die
CSV kommt ohne aus und lässt sich in Excel jederzeit als xlsx speichern.

## Kundenplan für geschlossene Veranstaltungen

Der Weg, wie ihn auch andere ohne eigenen Server gehen:

1. **Wolfgang bereitet vor.** Tische und Stühle so anlegen, wie sie wirklich da
   sind, und den Raum aufzeichnen — Bühne, Bar, Ein- und Ausgang, Terrasse,
   Wände. Ohne Raum findet sich der Kunde schwer zurecht; der Knopf „Kundenplan"
   sagt es, wenn noch keiner da ist.
2. **Datei erzeugen.** „Kundenplan" legt die Raumdatei ab. Diese nach
   `site/data/floorplan.json` kopieren und `npm run build:tischplan` ausführen.
   Daraus entsteht `output/tischplan/wirtschaft-kundenplan.html`.
3. **Verschicken.** Eine Datei, rund 77 KB, ohne Internet lauffähig.
4. **Der Kunde plant.** Tische ziehen, auf einen Stuhl klicken und den Namen
   eintragen — oder alles in der Namensliste tippen. Rückgängig oben, alles
   zurücksetzen unten.
5. **Zurück.** „Als PDF" für den Ausdruck mit Anlass und Saalname im Kopf,
   „Speichern & zurückschicken" legt eine Datei ab, die der Kunde per Mail
   zurücksendet.

**Was das nicht ist:** ein Link, unter dem der Kunde plant und Wolfgang live
zusieht. Dafür bräuchte es einen Server, der speichert. Die Eingaben des Kunden
bleiben auf seinem Gerät, bis er sie schickt — das steht auch so auf der Seite.

## Veröffentlichte Adressen

Auf ausdrücklichen Wunsch liegen die beiden gebauten Einzeldateien unter einem
eigenen, **nicht verlinkten** Pfad im öffentlichen Build:

| Adresse | Zweck |
| --- | --- |
| `…/tischplan/` | interne Planung |
| `…/tischplan/kunde.html` | Sitzplan zum Verschicken an einen Kunden |

Damit lässt sich dem Kunden ein Link statt einer Datei schicken.

**Was das heißt, unverblümt:** Beide Seiten sind **öffentlich erreichbar, ohne
Anmeldung**. Wer die Adresse kennt oder rät, sieht das Werkzeug. Sie sind
`noindex,nofollow`, stehen nicht in der Sitemap, sind nirgends verlinkt, und
`robots.txt` schließt `/tischplan/` aus — Suchmaschinen finden sie also nicht.

**Was dabei nicht passiert:** Es werden keine Daten mitgeliefert. Belegung,
Namen und Reservierungen entstehen erst im Browser dessen, der die Seite öffnet,
und bleiben dort. Zwei Leute sehen nie dieselben Daten. `check:public` prüft bei
jedem Bau, dass die ausgelieferten Dateien leer sind — kein `parties`, keine
`seatNames`, keine Sperren.

**Wer echten Zugriffsschutz will**, braucht die Anmeldung aus `SECURITY.md`.
Solange das Werkzeug niemandem schadet, der es leer vorfindet, ist der
unverlinkte Pfad ein vertretbarer Kompromiss — aber es ist einer, kein Schutz.

## Gäste zwischen Etagen verschieben

Zwei Wege, beide in Panel 03:

- **Einzeln:** In der Zeile einer sitzenden Reservierung steht „Tisch wechseln",
  nach Etagen gruppiert. Belegte und zu kleine Tische stehen ausgegraut drin,
  damit sichtbar bleibt, warum sie nicht gehen.
- **Alle auf einmal:** „Etage räumen" setzt alle Gäste einer Etage auf die
  andere um — der Griff für ein spontanes Event. Erst werden alle abgeräumt,
  dann neu gesetzt, sonst blockieren sie sich selbst. Größte Gruppe zuerst,
  kleinster passender Tisch. Wer nicht unterkommt, steht wieder offen und wird
  namentlich genannt.

Beides ist ein Schritt im Verlauf und lässt sich rückgängig machen.

## Betriebsart: durchgehend oder Schichten

Je Tischordnung, einstellbar im Setup. Damit ist das Pulldown eines statt zweier:
die Ordnung trägt den Raum **und** die Regeln.

**Durchgehend** ist der rollende Betrieb wie bisher: Die Dauer richtet sich nach
der Gruppengröße (90/105/150/180 Minuten), Pacing begrenzt den Zustrom.

**Schichten** ist der Doppelbetrieb: feste Anfangszeiten, alle gleich lang,
danach ist der Tisch wieder frei. Bei `11:30, 12:45`, Ende `13:45` und 15
Minuten Abräumen ergibt das zwei Schichten zu je 60 Minuten.

### Warum beides zusammen nicht geht

Bei festen Schichten bestimmt **der Abstand zur nächsten Schicht** die Dauer,
nicht die Gruppengröße. Ein Vierertisch mit den üblichen 105 Minuten würde ab
11:30 bis 13:00 blockieren — die zweite Schicht um 12:45 wäre unmöglich. Deshalb
ist es eine eigene Betriebsart und kein Schalter obendrauf.

### Was der Schichtbetrieb sonst noch ändert

- **Pacing wird ausgesetzt.** Es begrenzt den Zustrom je Viertelstunde — im
  Schichtbetrieb kommen aber alle gleichzeitig, das ist der Sinn. Ohne diese
  Ausnahme würde jede zweite Reservierung grundlos abgelehnt.
- **Die Uhrzeit wird zur Auswahl.** Kein freies Zeitfeld mehr, sondern die
  Schichtzeiten mit ihrer Dauer. Eine Reservierung um 12:10 gibt es nicht.
- **Die Kapazität verdoppelt sich.** Das Setup rechnet es vor:
  „96 Plätze × 2 Schichten = bis zu 192 Gäste am Tag."
- **Der Gast muss es wissen.** Die Bestätigung sagt es dem Haus mit:
  „Tisch wird um 12:45 erneut vergeben – dem Gast sagen, dass 60 Minuten zur
  Verfügung stehen."

### Wo die Grenze liegt

Unter 45 Minuten je Schicht warnt das Setup. Drei Schichten in zweieinhalb
Stunden ergeben rechnerisch 50/35/45 Minuten — das ist für einen Mittagstisch zu
knapp, und die Warnung sagt es. Zwei Schichten zu 60 Minuten sind das
realistische Maximum für 11:30 bis 13:45.

## Gästebildschirm am Eingang

`site/screen.html` zeigt groß und ruhig, wer gerade wo sitzt: Name, Etage,
Tischnummer, daneben der Saalplan mit den belegten Tischen. Im Wirtschaft-CI —
Paper, Ink, Green, Georgia für Namen, Inter für den Rest — und aus drei Metern
lesbar.

### Wie „live" funktioniert

Der Bildschirm liest **denselben Browser-Speicher** wie die interne Planung. Das
heißt konkret:

**Auf demselben Gerät ist er sofort live.** Ein Rechner treibt den Bildschirm,
darauf zwei Fenster: die Planung und der Schirm. Trägt Wolfgang etwas ein, feuert
das `storage`-Ereignis und der Schirm zeichnet neu — ohne Verzögerung, ohne
Netz. Daneben läuft ein Takt von 15 Sekunden für die Uhr und den
Schichtwechsel.

**Auf einem anderen Gerät ist er es nicht.** Ein Fernseher im anderen Netz sieht
Wolfgangs Eingaben nicht — dazwischen liegt kein Server, der sie überträgt. Das
ist dieselbe Grenze wie überall in diesem Werkzeug.

### Namen am Eingang

Ein Bildschirm im Eingang zeigt Gästenamen jedem, der hereinkommt. Deshalb gibt
es unten rechts einen Schalter mit drei Stufen:

| Stufe | Anzeige |
| --- | --- |
| vollständig | `Familie Huber` |
| abgekürzt | `Familie H.` |
| aus | `Reserviert` |

Die Einstellung bleibt auf dem Gerät gespeichert. Voreingestellt ist
„vollständig", weil der Gast seinen Tisch finden soll — aber die Entscheidung
gehört dem Haus, nicht der Software.

## Sicherung

Alles liegt im Browser-Speicher. Ein Klick auf „Websitedaten löschen", ein neuer
Rechner oder ein privates Fenster — und die Einteilung ist weg. Deshalb:

- **„Sicherung speichern"** legt Tischplan, Reservierungen und Sperren in einer
  Datei ab. Diese gehört an einen zweiten Ort, nicht auf denselben Rechner.
- **„Sicherung einspielen"** liest sie zurück und fragt vorher nach.
- Sind sieben Tage seit der letzten Sicherung vergangen, erinnert die Seite von
  selbst. Ein Export-Knopf allein reicht nicht — den drückt im Betrieb niemand.

## Sitzplatzdeckel

Die Regel „Deckel schlägt Geometrie" lebt wieder: Sind die freigegebenen Plätze
zu einem Zeitpunkt aufgebraucht, wird abgelehnt, auch wenn noch ein Tisch frei
steht. Freigegeben sind alle Sitzplätze abzüglich des Puffers aus dem Cockpit —
die bewusste Entscheidung, das Haus nicht bis auf den letzten Platz zu füllen.

In der Praxis greift der Deckel selten: Bei einem realen Tischmix gehen die
**Tische** meist vor den Plätzen aus, weil jede Gruppe Sitze verschenkt. Er ist
die zweite Sicherung, nicht die erste.

## Versionsangaben

`npm run sync:versions` setzt alle `?v=`-Angaben aus dem Inhalt der Datei, auf
die sie zeigen, und läuft als Teil von `npm run ci`. Vorher waren es 43
handgepflegte Zahlen; ich habe mich in einer einzigen Sitzung zweimal vertan,
und beide Male sah es wie ein Logikfehler aus, war aber nur ein Browser-Cache.
Der Lauf wiederholt sich bis zum Fixpunkt, weil eine Änderung an einem Modul
auch den Inhalt seiner Importeure ändert.
