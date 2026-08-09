# Wöchentliche Mittagsmenü-Mail

Der Versand ist bewusst zweistufig: Die Website erzeugt nur den fertigen
Mailinhalt, versendet aber selbst nichts und speichert keine Adressen. Der
eigentliche Versand läuft über einen Newsletter-Dienst mit Auftragsverarbeitungs-
vertrag. So bleibt die statische Seite frei von personenbezogenen Daten.

## Wochenablauf (ca. 5 Minuten)

1. `site/data/lunch-menu.json` aktualisieren: `weekLabel`, `courses`, optional
   `note`. Preise und Gänge müssen mit der Gästeseite übereinstimmen.
2. `site/index.html` im Block `.lunch-menu` an dieselben Werte anpassen.
3. Erzeugen und prüfen:

```bash
npm run lunch:mail && npm run ci
```

`npm run lunch:mail` schreibt `output/lunch-mail/mittagsmenu-mail.html` und
`mittagsmenu-mail.txt`. `check:lunch-menu` in der CI stellt sicher, dass Website
und Menüdatei nicht auseinanderlaufen.

4. HTML- und Text-Version in den Newsletter-Dienst einfügen und an die Liste
   „Mittagsmenü“ senden.

## Automatisierung

Der Generator ist ein reines Node-Skript ohne Netzwerkzugriff und kann in einer
GitHub Action montags früh laufen (`schedule`-Trigger), die das Ergebnis als
Artefakt bereitstellt. Der Versand bleibt bewusst ein bestätigter Schritt durch
eine Person – ein automatischer Versand ohne Sichtprüfung würde falsche Menüs
oder Preise unwiderruflich verschicken.

## DSGVO-Leitplanken

- **Double Opt-in ist Pflicht.** Anmeldung über den Mailto-Link auf der
  Gästeseite oder das Formular des Newsletter-Dienstes; die Bestätigung erfolgt
  immer durch eine zweite E-Mail mit protokolliertem Zeitstempel.
- **Keine Adressen im Repository.** Die Verteilerliste liegt ausschließlich beim
  Newsletter-Dienst, nie in Git, nie in `output/`.
- **Abmeldung in jeder Mail** – im Template als Antwortmöglichkeit angelegt; der
  Newsletter-Dienst ergänzt zusätzlich seinen eigenen Abmeldelink.
- **Auftragsverarbeitungsvertrag** mit dem gewählten Dienst abschließen, Server-
  standort und Subprozessoren dokumentieren (siehe
  `docs/production-readiness-dsgvo-seo.md`).
- **Keine Öffnungs-/Klick-Tracker ohne Einwilligung**; im Zweifel deaktivieren.
- Kein Tracking-Pixel und keine externen Bilder im Template – alle Stile sind
  inline, damit die Mail ohne Nachladen funktioniert.
