# Wirtschaft Dornbirn – öffentlicher Teststand und Agenturpilot

Dieses Repository enthält die öffentliche Gästeseite, die Seite für Feste und
Catering sowie ein nicht verlinktes Gastgeber-Cockpit für die Teststeuerung.

Die Veröffentlichung erfolgt automatisch über GitHub Pages, sobald auf den
Branch `main` gepusht wird. GitHub Pages ist hier ausschließlich eine nicht
indexierte Test-/Preview-Umgebung. Für produktive, kommerzielle Buchungen wird
ein separates Vercel-Projekt mit freigegebenem Public-Build verwendet.

## Enthalten

- Hauptseite mit Mittag, Reservierung und Veranstaltungen
- Kalenderexport für Veranstaltungstermine
- Hochzeiten, Geburtstage und Catering
- direkte offizielle Wege für Tischreservierung und Tickets sowie separate Catering-Anfrage
- separates Gastgeber-Cockpit als nicht veröffentlichte interne Testquelle
- ausschließlich die dafür benötigten lokalen Assets

## Designpräsentation

Historische Entwürfe bleiben als Arbeitsmaterial im Quellbaum, werden aber nicht
in den öffentlichen Build kopiert. So enthält die Gästeseite keine Präsentations-
oder interne Steuerungsrouten.

## Gastgeber-Cockpit

`site/gastgeber.html` und `site/inventory-store.js` sind Quellmaterial für einen
lokalen Konzepttest und werden durch `scripts/build-public.mjs` nicht ausgeliefert.
Für einen echten Mehrbenutzerbetrieb sind serverseitige Authentifizierung, MFA,
Rollen, Audit-Log und eine geprüfte Datenbank erforderlich.

## Aktualisieren

Die Dateien im Ordner `site` sind die Quelle. `npm run build:public` erzeugt einen
Allowlist-Build in `dist/`; interne Gastgeber- und Entwurfsdateien fehlen dort.
Nach einem Commit auf `main` baut GitHub Actions diesen Stand und veröffentlicht
die Testseite automatisch.

## Animationen bauen

Die zusätzlichen Mikrointeraktionen verwenden die aktuelle Motion-Bibliothek
(Nachfolger des Pakets Framer Motion) und werden ohne externe Laufzeit-Abhängigkeit
direkt in die öffentliche Testseite gebündelt.

```bash
npm install
npm run build
npm run build:public
npm run check:public
npm run check:privacy
```

Der Build erzeugt `site/motion-enhancements.js`. Die fertige GitHub-Pages-Seite
funktioniert danach weiterhin als statische Website.

## Design- und Qualitätswerkzeuge

- UI/UX Pro Max liegt projektbezogen unter `.codex/skills/`.
- Das erzeugte Gestaltungsprofil liegt unter `design-system/wirtschaft-dornbirn/`.
- 21st.dev CLI ist lokal als Benutzerwerkzeug installiert; die persönliche
  Anmeldung und MCP-Freigabe bleiben bewusst außerhalb des öffentlichen Repos.

## Agentur- und Go-live-Dokumentation

- `docs/agency-operating-model.md` – Zwei-Personen-Workflow und Kundenisolation
- `docs/integrations/bookings.md` – Resmio-/Ticketist-Zielarchitektur und Migration
- `docs/privacy/data-flow-matrix.md` – Datenflüsse, AVV und TKG-2021-Prüfung
- `docs/security/production-baseline.md` – Sicherheitsbaseline
- `docs/launch-checklist.md` – Abnahmekriterien vor dem Go-live
- `docs/cost-model.md` – Planungswerte für 1, 10, 20 und 30 Kunden
- `docs/decision-record-booking-stack-2026-08.md` – aktuelle Anbieterentscheidung
- `docs/host-cockpit-architecture.md` – sichere Zielarchitektur für Kapazitäten und Gastgeberrollen
- `docs/collaboration.md` – Live-Link, Zwei-Rechner-Workflow und sichere KI-Zusammenarbeit
- `docs/production-readiness-dsgvo-seo.md` – verbindliche DSGVO-, Sicherheits- und SEO-/GEO-Freigabematrix
- `output/pdf/wirtschaft-dornbirn-buchung-ticket-entscheidung-2026-08.pdf` – Entscheidungs- und Go-live-Pitch für Wolfgang

## Aktuelle Links

- [Live-Testseite](https://jonasgamper-create.github.io/wirtschaft-dornbirn-test/)
- [GitHub-Projekt](https://github.com/jonasgamper-create/wirtschaft-dornbirn-test)

Der öffentliche Link ist nur zum Anschauen. Für gemeinsame Änderungen benötigt
die zweite Person eine Einladung zum Repository mit ihrem eigenen GitHub-Konto;
ein Link allein gibt keine Schreibrechte.
