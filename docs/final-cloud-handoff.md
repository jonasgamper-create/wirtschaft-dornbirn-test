# Finale Cloud-Übergabe · Wirtschaft Dornbirn

Stand: 9. August 2026 · Repository: `wirtschaft-dornbirn-test`

Dieses Dokument ist die verbindliche Ablage- und Übergabeübersicht. GitHub ist
die einzige Quelle für den Code. Ein ZIP-Export ist nur ein Snapshot, nicht der
Arbeitsstand.

## 1. Was in die Cloud gehört

Das komplette GitHub-Repository wird geklont, nicht nur der Ordner `site`:

```text
wirtschaft-dornbirn-test/
├── site/                         # Website-Quelle und Originalassets
│   ├── index.html                # öffentliche Gästeseite
│   ├── feste-catering.html       # Catering- und Festanfrage
│   ├── datenschutz-sicherheit.html
│   ├── impressum.html
│   ├── data/events.json          # verbindliche Eventdatenquelle
│   └── assets/                   # Logo, Fotos, Truck, Food-Assets
├── src/                          # Motion-Quellen
├── scripts/                      # Build, Story und Prüfungen
├── design-system/                # gespeicherte CI- und Layoutregeln
├── docs/                         # Datenschutz, Hosting, Kosten, Übergaben
├── output/social-canva/          # Posts, Stories und editierbares Story-Template
├── output/pdf/                   # Präsentationen und Analysen
├── CLAUDE.md                     # Regeln für Claude/Codex-Änderungen
├── SECURITY.md                   # Sicherheitsgrenzen und Go-live-Leitplanken
└── package.json                  # reproduzierbare Befehle
```

Nicht synchronisieren oder manuell bearbeiten:

- `node_modules/`, `tmp/` und `.env*`
- `dist/` als Arbeitsquelle; dieser Ordner wird reproduzierbar erzeugt
- echte Gästedaten, Zahlungsdaten, Zugangsdaten oder Provider-Schlüssel

## 2. Cloud-Ablage für Inhalte

Große Rohbilder und Videos gehören in einen geschützten Drive-Ordner, nicht in
Prompts oder öffentliche Links:

```text
Wirtschaft-Dornbirn-Cloud/
├── 01_Briefing-und-Freigaben/
├── 02_Originalbilder-und-Videos/
├── 03_Eventdaten-und-Texte/
├── 04_Rechtliches-DSGVO-Impressum/
├── 05_Social-Export/
└── 06_Archiv/
```

Freigegebene Website-Bilder werden anschließend nach `site/assets/` kopiert.
Die Story wird ausschließlich über
`output/social-canva/genussroute-story-template/event.json` aktualisiert.

## 3. Zusammenarbeit auf zwei Rechnern

1. Beide Personen verwenden persönliche GitHub-Konten mit MFA/Passkeys.
2. Das Repository bleibt privat; der Live-Link ist nur eine Ansicht.
3. Jede Änderung läuft über einen Branch und einen Pull Request.
4. Vor dem Merge muss `npm run ci` grün sein und die zweite Person Mobile,
   Desktop, Buchungswege und CI prüfen.
5. `main` veröffentlicht die statische Testseite über GitHub Pages.

Claude erhält das Repository und liest zuerst `CLAUDE.md`. Gute Aufgaben nennen
genau Ziel, betroffene Datei und Abnahmekriterien. Keine geteilten Logins und
keine API-Schlüssel im Chat.

## 4. Was öffentlich ausgeliefert wird

`npm run build:public` erzeugt einen Allowlist-Build in `dist/`. Interne
Entwürfe und das Gastgeber-Konzept (`entwurf-*`, `entwuerfe.html`,
`gastgeber*`, `inventory-store.js`) werden bewusst nicht kopiert. Die zentrale
Gästeseite enthält keine KI-Wasserzeichen, keine Entwurfsnavigation und keine
Kartenzahlungsfelder. Die CI-Prüfung sucht zusätzlich nach solchen Resten.

Die Testseite bleibt `noindex,nofollow`. Für ein echtes Go-live müssen
Rechtstexte, Eventdaten, Buchungsanbieter, Consent und die Produktionsdomain
final freigegeben werden; erst dann wird ein Produktions-Build mit
`PUBLIC_ENV=production npm run build:public` erzeugt.

## 5. Wiederkehrende Befehle

```bash
npm ci
npm run ci                 # Build, Eventdaten, Copy, Privacy, Interaktionen
npm run social:story       # Story aus event.json neu rendern
npm run build:public       # Public-Allowlist nach dist/ erzeugen
```

Für eine neue Story werden nur `event.json` und ein Bild in `site/assets/`
geändert. `officialUrl` steuert den CTA; in Instagram muss zusätzlich der
Link-Sticker gesetzt werden, da eine MP4 selbst keine klickbaren Links enthält.

## 6. Finale Abnahme

- Logo nur einmal im Website-Header
- keine sichtbaren KI-/Entwurfsmarkierungen im Public-Build
- Events, Tickets, Mittag und Tischreservierung erreichbar
- Catering-Anfrage separat und klar abgegrenzt
- Story-CTA und „Nach oben wischen“ vorhanden
- Reduced Motion, Mobile und Desktop berücksichtigt
- zehn CI-Durchläufe und Interaktionsprüfung erfolgreich
- keine Geheimnisse oder Zahlungsdaten im Frontend

## Zuständige Dateien für spätere Änderungen

| Aufgabe | Datei |
|---|---|
| Website-Text/Struktur | `site/index.html` |
| Layout und CI | `site/styles.css` |
| Truck-/Scrollbewegung | `site/truck-motion.js`, `src/motion-enhancements.js` |
| Events und Sommerpause | `site/data/events.json` |
| Tisch-/Ticketpfade | `site/index.html`, `site/app.js` |
| Catering | `site/feste-catering.html`, `site/feste-catering.js` |
| Story-Inhalt | `output/social-canva/genussroute-story-template/event.json` |
| Story-Format | `output/social-canva/genussroute-story-template/story-template.html` |
