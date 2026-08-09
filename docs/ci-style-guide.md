# CI- und Format-Sicherung

Dieses Dokument ist die kurze Design-Checkliste für Wirtschaft Dornbirn und
für jede spätere Claude-/ChatGPT-Änderung.

## Visuelle Konstanten

| Bereich | Regel |
|---|---|
| Hintergrund | Ink für Nacht/Event, Paper/Cream für Mittag/Catering |
| Akzent | Wine für emotionale Headlines, Gold für Hinweise und Links |
| Typo | Georgia/Serif für große Aussagen, Inter/Helvetica für UI |
| Logo | Wirtschaft-Logo unverändert aus `site/assets/wirtschaft-logo.png` |
| Truck | Emma-&-Eugen-Marke als Overlay auf dem Fahrzeug, nicht als separates schwebendes Element |
| Buttons | gleiche Pill-Höhe, klare Hauptaktion, keine doppelten CTAs |
| Bewegung | sanft, scrollgebunden, mit Reduced-Motion-Fallback |
| Mobile | 390 px ohne horizontalen Overflow; Text darf nicht unter Header/Status liegen |

## Dateiablage

- `site/` enthält die veröffentlichte Quelle.
- `site/assets/` enthält nur freigegebene Originalbilder.
- `output/social-canva/` enthält editierbare Social-Entwürfe und Vorlagen.
- `docs/` enthält Entscheidungen, Datenschutz, Security und Übergaben.
- `dist/` wird ausschließlich durch `npm run build:public` erzeugt.

## Abnahme

Vor jeder Freigabe:

1. `npm run ci`
2. Desktop und 390×844 px ansehen
3. Eventlinks und Reservierungslink kontrollieren
4. Truck-Fahrt von links nach rechts prüfen
5. Reduced-Motion und Tastaturbedienung testen
6. Keine Secrets, personenbezogenen Testdaten oder Zahlungsdaten im Diff
