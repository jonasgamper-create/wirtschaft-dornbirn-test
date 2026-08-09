# Übergabe an Claude

Für eine vollständige Übergabe den kopierfertigen
[`Claude-Master-Prompt`](claude-master-prompt.md) verwenden. Er ergänzt diesen
kurzen Ablauf um Design-Review, visuelle Abnahme, Performance-Gates und die
verbindlichen Sicherheitsgrenzen.

## Empfohlener Ablauf

1. Repository lokal klonen oder über eine autorisierte GitHub-Verbindung öffnen.
2. `CLAUDE.md` vollständig lesen lassen.
3. Pro Anfrage nur ein konkretes Ziel definieren, zum Beispiel „Eventkarten im
   Abschnitt `#concept-04` 8 px weiter nach rechts“.
4. Claude zuerst den Plan und die betroffenen Dateien nennen lassen.
5. Änderung in einem Feature-Branch durchführen lassen.
6. `npm run ci` ausführen lassen.
7. Diff und Mobile-Ansicht selbst prüfen.
8. Erst danach Pull Request mergen.

Für wiederverwendbare Instagram-Stories nur
`output/social-canva/genussroute-story-template/event.json` ändern und danach
`npm run social:story` ausführen. Das Layout und die Safe-Zones bleiben im
Template unverändert.

## Was Claude nicht erhalten darf

- Resmio-/Ticketist-Logins
- Karten- oder Zahlungsdaten
- Gästelisten, Reservierungsdaten oder E-Mail-Exporte
- Vercel-/GitHub-Tokens
- nicht anonymisierte Kundendokumente

Der Live-Link ist nur eine Ansicht. Schreibrechte entstehen ausschließlich
über das persönliche GitHub-Konto mit Repository-Einladung.

## Gute Aufgabenformulierung

```text
Ziel: [eine sichtbare Änderung]
Betroffene Datei: [konkreter Pfad]
Unverändert lassen: [z. B. Eventdaten, Buchungslinks, CI-Tokens]
Akzeptanz: [z. B. Mobile 390 px, keine Überschneidung, npm run ci grün]
```

## Übergabe nach jeder Claude-Session

Claude soll immer ausgeben:

- Commit-/Branchname
- geänderte Dateien
- `npm run ci`-Ergebnis
- sichtbare Designänderung
- offene Risiken oder nicht geprüfte externe Links
