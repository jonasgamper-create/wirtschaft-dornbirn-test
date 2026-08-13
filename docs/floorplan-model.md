# Tischplan: Datenmodell und Bedienung

## Was der Tischplan ist und was nicht

Der Tischplan beschreibt **Etagen und Tischanzahlen**, nicht einen gezeichneten
Grundriss. Wer die Anzahl der Zweier- oder Vierertische ändert oder eine Etage
ergänzt, ändert eine Zahl — die Zeichnung entsteht daraus automatisch. Es muss
nie jemand eine Grafik anfassen.

Er ist ein **Planungswerkzeug für das Haus** und auf der Gästeseite reine
Orientierung. Er sagt nicht, welcher Tisch gerade frei ist. Verbindlich bleibt
das offizielle Reservierungssystem.

## Dateien

| Datei | Rolle |
| --- | --- |
| `site/data/floorplan.json` | Die Konfiguration: Etagen, Anzahlen, Kombinationen, Regeln |
| `site/floorplan-layout.mjs` | Rechnet Anzahlen in Positionen und Tischnummern um |
| `site/table-assignment.mjs` | Best-Fit-Zuweisung. Nur intern, nie im öffentlichen Build |
| `site/floorplan.js` / `.css` | Zeichnet den Plan |
| `site/gastgeber-floorplan.js` | Panel 05 im Cockpit |

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

`status` steht auf `beispiel`, solange die Zahlen nicht vom Haus bestätigt sind.
**Die Gästeseite zeigt dann bewusst keinen Plan**, sondern den Hinweis, dass die
Aufteilung noch abgestimmt wird. Erfundene Grundrisse sind keine Option. Erst
mit `status: "bestaetigt"` erscheint der Plan öffentlich.

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

`site/gastgeber.html`, Panel „05 · Tischplan":

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
5. **Zuweisung testen** — Personenzahl und Uhrzeit eingeben. Das Cockpit zeigt,
   welchen Tisch die Regeln vergeben würden und woher der Sitzplatzdeckel kommt.
6. **Exportieren** — die JSON-Datei herunterladen und nach
   `site/data/floorplan.json` übernehmen.

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
Cockpit liegt im lokalen Browserspeicher und ist nicht Teil der öffentlichen
Seite. Siehe `SECURITY.md` und `docs/host-cockpit-architecture.md`.
