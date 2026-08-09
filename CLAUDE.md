# Claude-Arbeitsregeln · Wirtschaft Dornbirn

Dieses Repository ist eine statische, DSGVO-bewusste Testseite. Änderungen
werden immer als kleiner Pull Request geliefert. Niemals direkt auf `main`
schreiben und niemals echte Gäste-, Zahlungs-, Login- oder API-Daten einfügen.

## Quelle und Build

- Gästeseite: `site/index.html`
- CI und Layout: `site/styles.css`
- Truck- und Eventbewegung: `site/truck-motion.js`
- gebündelte Motion-Quelle: `src/motion-enhancements.js`
- Eventdaten: `site/data/events.json`
- Originalassets: `site/assets/`
- öffentlicher Allowlist-Build: `dist/` (wird erzeugt, nicht manuell pflegen)

Nach jeder Änderung ausführen:

```bash
npm run ci
```

Für die Instagram-Story:

```bash
npm run social:story
```

Dabei wird nur aus `output/social-canva/genussroute-story-template/event.json`
gelesen. Es erfolgt keine Veröffentlichung.

## Verbindliche Wirtschaft-CI

Die bestehenden Tokens in `site/styles.css` sind die Quelle:

- Ink `#11110f`
- Paper `#f3efe6`
- Cream `#ead9bc`
- Wine `#8c292b`
- Gold `#c59b5d`
- Green `#244635`

Typografie bleibt ruhig und editorial: Serifenschrift für große Headlines,
Grotesk für Navigation, Labels und Aktionen. Keine neuen Farbverläufe,
Schatten, Pillen oder Icon-Sets einführen, wenn sie nicht im bestehenden CI
begründet sind. Abstände und Buttonhöhen aus den vorhandenen Komponenten
wiederverwenden. Keine Entwürfe, Kapitelnummern oder Prototyp-Links in die
Gästeseite zurückbringen.

## Motion-Regeln

- Native Scrollposition bleibt die einzige Quelle für Scrollbewegung.
- Animationscode in einer bestehenden `requestAnimationFrame`-Schleife ergänzen;
  keinen zweiten Smooth-Scroll- oder Wheel-Engine einbauen.
- Truck bleibt eine klare Links-nach-rechts-Fahrt; Logo und Musiknoten müssen
  synchron mit dem Fahrzeug transformiert werden.
- `prefers-reduced-motion` immer respektieren.
- Auf Mobile keine dekorative Bewegung über Text oder CTA legen.

## Claude-Prompt für eine Änderung

```text
Arbeite im Repository wirtschaft-dornbirn-test. Ändere ausschließlich die
genannten Dateien. Halte die Wirtschaft-Dornbirn-CI aus CLAUDE.md ein. Keine
neuen Tracker, Zahlungslogik, externen Fonts oder Plugins. Beschreibe zuerst
kurz die geplante Änderung, implementiere sie dann in einem Branch und führe
anschließend npm run ci aus. Gib geänderte Dateien, Testergebnis und offene
Risiken aus. Erzeuge keinen direkten Push auf main.
```

## Review vor dem Merge

Die zweite Person prüft den Diff auf CI, Abstände, Mobile (390 px),
Reduced-Motion, Tastaturbedienung, externe Buchungslinks und Datenschutz.
Erst wenn `npm run ci` grün ist, wird der Pull Request gemergt.
