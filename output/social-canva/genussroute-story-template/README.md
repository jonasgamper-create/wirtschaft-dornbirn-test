# Genussroute · Story-Template

Eine wiederverwendbare 9:16-Story im CI der Wirtschaft Dornbirn, ausgerichtet an der dunklen Emma-&-Eugen-Referenz: ruhiges Anthrazit, Goldakzent, zentriertes Logo, klare Grotesk-Schrift und ein einziger rechteckiger CTA. Die HTML-Vorlage zeigt den Wagen als kurzen Bewegungsakzent von links nach rechts. Die MP4-Demo ist nur eine Vorschau; vor einer Veröffentlichung müssen Datum, Ticketstatus und Link gegen die offizielle Eventseite geprüft werden.

## Neue Story in drei Schritten

1. Nur `event.json` kopieren und die Felder `title`, `date`, `time`, `location`, `kicker`, `facts`, `lead`, `cta`, `officialUrl` und `background` anpassen. Für einen Zeilenumbruch im Lead das Zeichen `|` verwenden, zum Beispiel `Fünf Orte.|Ein Abend.`. Das Hintergrundbild muss in `site/assets/` liegen.
2. `npm run social:story` ausführen. Das erzeugt eine neue `story-preview.mp4` (1080 × 1920, 6 Sekunden), `story-cover.svg` und eine editierbare `story-template.html`.
3. MP4 in Instagram Edits/Instagram öffnen und den Link-Sticker selbst setzen. Es wird nichts automatisch veröffentlicht.

Die drei sicheren Textbereiche bleiben frei von der iPhone-Statusleiste, dem Profilbild und den Story-Stickern. Keine künstliche Verknappung oder erfundene Verfügbarkeiten verwenden.

## CI-Regeln

- Wirtschaft-Schwarz/Anthrazit und Gold als Akzent, mit viel ruhigem Raum
- kleine Grotesk-Labels und eine klare, leichte Display-Zeile
- echte Eventbilder aus `site/assets/`, automatisch als dezente Bildkarte eingesetzt
- maximal ein Haupt-CTA und eine klare Informationsebene
- Wagen-Animation nur als kurzer Bewegungsakzent, nicht als Dauerflimmern
- Safe-Zonen für Statusleiste und Instagram-Sticker bleiben frei

## Späteres Aktualisieren

Die Form bleibt in `story-template.html` und im Generator fest. Für eine neue Story wird nur `event.json` geändert und anschließend `npm run social:story` ausgeführt. Es wird nichts automatisch auf Instagram veröffentlicht.
