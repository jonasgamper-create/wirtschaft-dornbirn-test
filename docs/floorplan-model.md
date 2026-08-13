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
  "status": "beispiel",
  "numbering": { "start": 1 },
  "levels": [
    {
      "id": "eg",
      "name": "Gaststube",
      "order": 1,
      "counts": { "2": 6, "3": 2, "4": 5, "6": 2, "8": 1 },
      "positions": { "eg-8-01": { "col": 0, "row": 4 } }
    }
  ],
  "combos": [
    { "id": "eg-combo-01", "tables": ["eg-2-01", "eg-2-02"], "minGuests": 3 }
  ],
  "policy": {
    "durations": [{ "upTo": 2, "minutes": 90 }],
    "bufferMinutes": 15,
    "slotMinutes": 15,
    "maxCoversPerSlot": 10,
    "levelOrder": ["eg"]
  }
}
```

### Tischgrößen

`counts` ist nach Personenzahl geschlüsselt und erlaubt **2 bis 10, auch
ungerade**: ein Dreiertisch ist genauso möglich wie ein Siebener. Sieben Gäste
können also an einem einzelnen Tisch sitzen, wenn es einen passenden gibt.

Der Fußabdruck wächst mit, aber nicht linear — ein Zehnertisch ist länger als
ein Zweiertisch, nicht fünfmal so lang:

| Personen | 2 / 3 | 4 / 5 | 6 / 7 | 8 / 9 | 10 |
| --- | --- | --- | --- | --- | --- |
| Breite in Rastereinheiten | 3 | 4 | 5 | 6 | 7 |

`combos` bleibt daneben nützlich für Tische, die im Haus tatsächlich
zusammengeschoben werden. Eine belegte Kombination sperrt automatisch alle
beteiligten Tische, weil die Belegung auf den Kennungen liegt.

### Positionen

`positions` merkt sich, wo ein Tisch steht. Tische ohne Eintrag ordnen sich
automatisch in der ersten freien Lücke an. **Sobald im Cockpit ein Tisch
verschoben wird, werden alle Tische dieser Etage festgehalten** — sonst würde
die Karte bei jedem Zug unter der Hand nachrutschen. Nur später neu
dazugekommene Tische suchen sich noch selbst einen Platz.

`status` steht auf `beispiel`, solange die Zahlen nicht vom Haus bestätigt sind,
und auf `bestaetigt`, sobald die echten Tische eingetragen wurden. Das ist ein
Qualitätsmerkmal für die Daten, keine Sichtbarkeitsschaltung — sichtbar ist der
Plan ohnehin nur intern.

## Tischnummern

Fortlaufend über alle Etagen in der Reihenfolge aus `order`, innerhalb einer
Etage **in Leserichtung**: oben links nach unten rechts. Das macht die Karte
selbsterklärend — Tisch 1 ist der erste, den man beim Reinkommen sieht. Der Gast
hört „Tisch 12", nicht „Tisch 12 im Obergeschoss".

**Wichtig:** Weil die Nummern der Anordnung folgen, ändern sie sich beim
Verschieben und beim Ändern von Anzahlen. Deshalb gilt: **erst die Karte fertig
anordnen, dann Tischkarten drucken.** Das Cockpit warnt, wenn sich Nummern
verschieben. Die internen Kennungen (`eg-4-01`, `og-2-03`) bleiben stabil —
deshalb verweisen `combos` und `positions` auf Kennungen, nicht auf Nummern.

Im Plan steht neben der Nummer die Personenzahl abgekürzt, also `4P` für einen
Vierertisch. Die Nummer ist die Identität, die Größe die Zusatzinfo.

## Bedienung im Cockpit

`site/gastgeber-tischplan.html`, erreichbar über Panel 05 im Cockpit:

1. **Anzahl ändern** — je Etage steht ein Feld pro Tischgröße von 2P bis 10P.
   Zahl eintippen, der Plan zeichnet sich sofort neu. Der Tischmix in Panel 02
   wird daraus berechnet und ist dort nur noch Anzeige.
2. **Etage ergänzen** — Name eingeben, dann die Größen setzen. Maximal vier
   Etagen.
3. **Tische anordnen** — im Plan mit der Maus ziehen; die Position rastet auf
   das Raster ein. Mit der Tastatur: Tisch in der Liste fokussieren, dann
   **Umschalt und Pfeiltaste**. Ein Zug ins Freie wird übernommen, ein Zug auf
   einen besetzten Platz springt zurück und nennt den blockierenden Tisch.
4. **Tisch sperren** — Tisch im Plan oder in der Liste anklicken. Gesperrte
   Tische werden bei der Zuweisung übersprungen.
5. **Zuweisung testen** — Personenzahl und Uhrzeit eingeben. Die Probe zeigt,
   welchen Tisch die Regeln vergeben würden und woher der Sitzplatzdeckel kommt.
6. **Exportieren** — die JSON-Datei herunterladen und nach
   `site/data/floorplan.json` übernehmen.

## Belegung: wer sitzt an welchem Tisch

Panel 03 hat zwei Wege zum selben Ziel.

**Oben, automatisch.** Gruppen mit Name und Personenzahl aufnehmen, dann „Alle
offenen Gruppen verteilen". Die Verteilung geht von der größten Gruppe abwärts —
sie hat die wenigsten Möglichkeiten — und sucht jeweils den kleinsten passenden
freien Tisch. Was nicht unterkommt, wird namentlich gemeldet statt still
übergangen.

Das ist bewusst kein Zufall: zufällige Verteilung verschenkt große Tische an
kleine Gruppen und lässt später niemanden mehr Platz finden.

**Unten, einzeln.** Tisch in der Karte oder der Liste anklicken, dann Name und
Personenzahl eintragen. Der Klick auf einen Tisch löst nichts aus, er wählt nur
aus — belegen, frei machen und sperren sind eigene Schritte. Abgewiesen wird,
wer nicht passt: mehr Personen als Plätze, oder ein gesperrter Tisch.

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
