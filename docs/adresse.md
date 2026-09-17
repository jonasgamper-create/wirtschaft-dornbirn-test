# Die Adresse der Seite

Stand 17. September 2026. Die Seite hat seit heute eine eigene Adresse, die
nichts kostet und sich herzeigen lässt.

## Wo die Seite steht

| Adresse | Was sie ist | Kosten |
|---|---|---|
| **wirtschaft-dornbirn.pages.dev** | die Adresse zum Herzeigen | keine |
| jonasgamper-create.github.io/wirtschaft-dornbirn-test/ | dieselbe Seite, alter Weg | keine |
| wirtschaft-dornbirn.at | die echte Domain, noch die alte Seite | läuft bereits |

Beide Adressen zeigen denselben Stand. Die alte bleibt vorerst erreichbar,
damit geteilte Links nicht ins Leere laufen – auch die QR-Codes auf den
gedruckten Karten zeigen noch dorthin.

## Warum Cloudflare Pages

Es war der einzige Weg zu einer ordentlichen Adresse, der **heute** und **ohne
fremde Mitwirkung** ging. Ein `test.wirtschaft-dornbirn.at` wäre schöner,
braucht aber einen DNS-Eintrag bei der bestehenden Domain – und die gehört dem
Kunden. Cloudflare Pages liegt im selben Konto wie der Reservierungsdienst,
kostet auf der Gratisstufe nichts und liefert HTTPS von selbst.

Nebeneffekt: die Seite liegt jetzt im Wurzelverzeichnis. Aus
`…github.io/wirtschaft-dornbirn-test/events.html` wird
`wirtschaft-dornbirn.pages.dev/events`.

## Veröffentlichen

GitHub Pages baut bei jedem Zusammenführen auf `main` von selbst. Die neue
Adresse **nicht** – sie braucht einen Befehl:

```bash
npm run deploy:seite
```

Das baut `dist/` neu und lädt es hoch. Wer das vergisst, hat zwei Stände: das
ist die einzige Falle an dieser Lösung.

Dauerhaft lösen lässt sich das auf zwei Arten, beide einmalig:

1. **Cloudflare mit dem Repository verbinden** (Dashboard → Pages → Projekt →
   Git). Danach baut Cloudflare bei jedem Zusammenführen selbst. Braucht eine
   Anmeldung bei GitHub im Cloudflare-Dashboard, geht nicht von hier aus.
2. **Einen API-Schlüssel hinterlegen** (`CLOUDFLARE_API_TOKEN` als Secret im
   Repository) und den Veröffentlichungsschritt in die bestehende
   GitHub-Action aufnehmen.

## Was beim Umzug auf die echte Domain zu tun ist

1. DNS: `wirtschaft-dornbirn.at` und `www` auf Cloudflare Pages zeigen lassen
   (oder auf GitHub Pages – dann entfällt Cloudflare Pages wieder).
2. `ALLOWED_ORIGINS` im Dienst auf die neue Adresse setzen, die alten
   Testadressen entfernen (`server/wrangler.jsonc`, beide Umgebungen).
3. `GAESTE_SEITE` ebenfalls – daraus entstehen die Links in den Mails.
4. QR-Codes neu erzeugen: `site/data/qr-ziele.json` und die beiden SVG unter
   `site/assets/qr/` tragen die alte Adresse.
5. Weiterleitungen für die alten `/event/…`-Adressen, siehe
   [abschaltung-alte-seiten.md](abschaltung-alte-seiten.md).
6. Strukturierte Daten auf der Startseite prüfen: sie nennen
   `wirtschaft-dornbirn.at` samt einem Bild, das dort erst nach dem Umzug
   liegt.
