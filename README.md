# Wirtschaft Dornbirn – öffentliche Testumgebung

Dieses Repository enthält ausschließlich die öffentliche Gästeseite und die
Seite für Feste und Catering. Gastgeber-Cockpit, Testberichte, Studienseiten und
interne Kapazitätsdaten sind nicht Bestandteil dieses Deployment-Pakets.

Die Veröffentlichung erfolgt automatisch über GitHub Pages, sobald auf den
Branch `main` gepusht wird. Die Testfassung ist mit `noindex, nofollow` und einer
vollständigen `robots.txt`-Sperre versehen.

## Enthalten

- Hauptseite mit Mittag, Reservierung und Veranstaltungen
- Kalenderexport für Veranstaltungstermine
- Hochzeiten, Geburtstage und Catering
- ausschließlich die dafür benötigten lokalen Assets

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
