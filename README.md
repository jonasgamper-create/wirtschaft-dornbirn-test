# Wirtschaft Dornbirn – öffentliche Testumgebung

Dieses Repository enthält die öffentliche Gästeseite, die Seite für Feste und
Catering sowie ein nicht verlinktes Gastgeber-Cockpit für die Teststeuerung.

Die Veröffentlichung erfolgt automatisch über GitHub Pages, sobald auf den
Branch `main` gepusht wird. Die Testfassung ist mit `noindex, nofollow` und einer
vollständigen `robots.txt`-Sperre versehen.

## Enthalten

- Hauptseite mit Mittag, Reservierung und Veranstaltungen
- Kalenderexport für Veranstaltungstermine
- Hochzeiten, Geburtstage und Catering
- aktive, vorbefüllte E-Mail-Anfragen für Tisch, Tickets und Catering
- separates Gastgeber-Cockpit mit Puffer, Kapazitäten, Filtern und Datenexport
- ausschließlich die dafür benötigten lokalen Assets

## Gastgeber-Cockpit

`site/gastgeber.html` ist von der Gastansicht aus nicht verlinkt und wird durch
`noindex` sowie die `robots.txt` von Suchmaschinen ausgeschlossen. In der
Testumgebung liegen seine Daten ausschließlich im lokalen Browser-Speicher.
Export und Import ermöglichen den Wechsel zwischen Browsern. Für einen echten
Mehrbenutzerbetrieb ist später eine geschützte Datenbank mit Anmeldung nötig.

## Aktualisieren

Die Dateien im Ordner `site` werden aus dem lokalen Konzeptprojekt übernommen.
Nach einer Aktualisierung genügt ein neuer Commit auf `main`; GitHub Pages
veröffentlicht die Testseite anschließend automatisch.

## Animationen bauen

Die zusätzlichen Mikrointeraktionen verwenden die aktuelle Motion-Bibliothek
(Nachfolger des Pakets Framer Motion) und werden ohne externe Laufzeit-Abhängigkeit
direkt in die öffentliche Testseite gebündelt.

```bash
npm install
npm run build
```

Der Build erzeugt `site/motion-enhancements.js`. Die fertige GitHub-Pages-Seite
funktioniert danach weiterhin als statische Website.

## Design- und Qualitätswerkzeuge

- UI/UX Pro Max liegt projektbezogen unter `.codex/skills/`.
- Das erzeugte Gestaltungsprofil liegt unter `design-system/wirtschaft-dornbirn/`.
- 21st.dev CLI ist lokal als Benutzerwerkzeug installiert; die persönliche
  Anmeldung und MCP-Freigabe bleiben bewusst außerhalb des öffentlichen Repos.
