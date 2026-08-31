# Wirtschaft Dornbirn · Arbeitsregeln

Statisches HTML, kein Build. Nie ein Framework einziehen.

## Farben – nur diese sechs
Ink `#11110f` · Paper `#f3efe6` · Cream `#ead9bc` · Wine `#8c292b` ·
Green `#244635` · Gold `#c59b5d`. Keine Verläufe, keine Schatten, keine Icon-Sets.

## Schrift
Georgia nur für große Headlines, Montserrat für alles andere.
Eine Größe je Textsorte über die Token `--t-*`. Keine erfundenen Zwischengrößen.

## Inhalt – verbindlich
- Abends **nur Events**, Tickets über den offiziellen Anbieter.
- **Tischreservierung nur für den Mittag** (11:30–13:30).
- Emma & Eugen = Großeltern des Besitzers und Marke des Foodtrucks.
- Keine erfundenen Preise, Termine, Verfügbarkeiten, Bewertungen.
  Beispieldaten stehen in `data/`.

## Aufbau
Eine Hauptaktion je Abschnitt. Alle Abschnitte auf einer linken Rasterkante.
Nebenwege als Textlink, nicht als zweiter Knopf.

## Handy zuerst
Schrift ≥ 12 px, Tippziel ≥ 44 px, Eingabefelder ≥ 16 px (sonst iOS-Zoom).
Kein waagrechter Überlauf. Bei Änderungen in 390 px Breite nachmessen.

## Auf Fotos
Kleine Beschriftungen in Paper, nicht Gold (Gold 3,2:1 gegen die hellen
Bildstellen, Paper 7,1:1).

## Datenquellen
Wochenkarte: `data/takeaway-karte.json` – speist Startseite, Bestellseite und
Druckansicht. Termine: `data/events.json` – bei Änderung `wirtschaft-events.ics`
mit erzeugen. Hausstatus (Sommerpause): `data/haus.json`.
