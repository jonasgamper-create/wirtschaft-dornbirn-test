# Genussroute · Story-Template

Eine wiederverwendbare 9:16-Story im CI der Wirtschaft Dornbirn. Die HTML-Vorlage zeigt eine ruhige Eventkarte mit einem kleinen Emma-&-Eugen-Wagen, der von links nach rechts durch das Bild fährt. Die vorhandene MP4-Demo ist nur ein Vorschau-Entwurf; vor einer Veröffentlichung müssen Datum, Ticketstatus und Link gegen die offizielle Eventseite geprüft werden.

## Neue Story in drei Schritten

1. Nur `event.json` kopieren und die Texte, Fakten, CTA, URL und das Hintergrundbild anpassen.
2. `npm run social:story` ausführen. Das erzeugt eine neue `story-preview.mp4` (1080 × 1920, 6 Sekunden), `story-cover.svg` und eine editierbare `story-template.html`.
3. MP4 in Instagram Edits/Instagram öffnen und den Link-Sticker selbst setzen. Es wird nichts automatisch veröffentlicht.

Die drei sicheren Textbereiche bleiben frei von der iPhone-Statusleiste, dem Profilbild und den Story-Stickern. Keine künstliche Verknappung oder erfundene Verfügbarkeiten verwenden.

## CI-Regeln

- Wirtschaft-Schwarz, warmes Papier und Gold als Akzent
- kleine Grotesk-Labels, große ruhige Serifenschrift
- echte Eventbilder aus `site/assets/`
- maximal ein Haupt-CTA und eine klare Informationsebene
- Wagen-Animation nur als kurzer Bewegungsakzent, nicht als Dauerflimmern
