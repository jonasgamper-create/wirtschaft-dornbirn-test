# Onboarding für den zweiten Mitarbeiter

Kurzanleitung zum Weitergeben. Ausführlicher Hintergrund steht in
`docs/collaboration.md`, die Ablagestruktur in `docs/final-cloud-handoff.md`.

## Was du bekommst

| Zweck | Link |
|---|---|
| Testseite ansehen | <https://jonasgamper-create.github.io/wirtschaft-dornbirn-test/> |
| Code und Aufgaben | <https://github.com/jonasgamper-create/wirtschaft-dornbirn-test> |
| Offizielle Eventquelle | <https://wirtschaft-dornbirn.at/event/> |

Die Testseite steht bewusst auf `noindex` und ist kein Produktivsystem: keine
echten Reservierungen, keine Zahlungen, keine Gästedaten.

## Einmalige Einrichtung

1. **GitHub-Konto mit MFA/Passkey** anlegen oder absichern:
   <https://github.com/settings/security> – ohne zweiten Faktor keine Einladung.
2. **Einladung annehmen.** Jonas verschickt sie an deine GitHub-Adresse; du
   bestätigst unter <https://github.com/notifications> oder per Mail-Link.
   Es werden keine Passwörter geteilt.
3. **Repository klonen** (Terminal):

```bash
git clone https://github.com/jonasgamper-create/wirtschaft-dornbirn-test.git
```

4. **Abhängigkeiten installieren** (einmalig, Node 20+):

```bash
npm ci
```

5. **Lokal ansehen:**

```bash
npx http-server site -p 8123
```

## Ablauf für jede Änderung

1. Aktuellen Stand holen und Branch anlegen:

```bash
git pull && git checkout -b feature/kurzer-name
```

2. Nur die nötigen Dateien ändern (Zuständigkeiten:
   `docs/final-cloud-handoff.md`, Abschnitt „Zuständige Dateien“).
3. Prüfen – muss grün sein:

```bash
npm run ci
```

4. Pull Request eröffnen. Die zweite Person prüft Diff, Mobile (390 px),
   Buchungswege, Datenschutz und CI. Erst dann wird gemergt.

**Niemals direkt auf `main` pushen.** `main` veröffentlicht die Testseite.

## Sicherheit und DSGVO – nicht verhandelbar

- Keine echten Gäste-, Zahlungs-, Login- oder API-Daten in Code, Screenshots,
  Issues oder KI-Prompts.
- Keine Secrets im Repository; ausschließlich GitHub Actions Secrets.
- Keine Tracker oder Marketing-Skripte ohne geprüfte Einwilligung.
- Reservierung und Tickets bleiben Weiterleitungen zu den offiziellen Anbietern.
- Eventdaten nur aus `site/data/events.json`, verifiziert gegen die offizielle
  Eventseite. Nichts erfinden – kein Status, kein Preis, keine Verfügbarkeit.
- Große Rohbilder und Videos in den geschützten Drive-Ordner, nicht ins Repo.

## Ablage außerhalb des Codes

Website = GitHub. Alles andere im Drive nach `docs/final-cloud-handoff.md`:

```text
Wirtschaft-Dornbirn-Cloud/
├── 01_Briefing-und-Freigaben/     ← schriftliche Freigaben von Wolfgang
├── 02_Originalbilder-und-Videos/
├── 03_Eventdaten-und-Texte/
├── 04_Rechtliches-DSGVO-Impressum/
├── 05_Social-Export/
├── 06_Archiv/
└── 07_Performance-Marketing/      ← Kampagnen mit Datumspräfix
```

Ordner mit Datum benennen: `2026-08-09_kampagne-herbst/`.
