# Reservierungsdienst

Der kleine Server hinter der Onlinebuchung. Er macht genau das, was eine
statische Seite nicht kann: **einen gemeinsamen Zustand halten**. Ohne ihn hat
jeder Browser seinen eigenen Zähler, und zwei Gäste bekommen denselben letzten
Tisch.

## Was er tut

- nimmt Reservierungen von der Gästeseite entgegen
- weist **denselben** Algorithmus wie das Haus an — `site/table-assignment.mjs`
  und `site/floorplan-layout.mjs` laufen unverändert im Server. Eine zweite
  Rechenregel wäre die sicherste Art, zwei verschiedene Wahrheiten zu bekommen.
- bevorzugt die im Haus hinterlegte **Standard-Etage**
- schiebt jede Änderung über einen offenen Draht an den Eingangsbildschirm und
  an die Planung — kein Abfragen im Sekundentakt
- löscht Reservierungen automatisch 30 Tage nach dem Termin

## Was er nicht tut

- keine Kontaktdaten: nur Name, Datum, Uhrzeit, Personenzahl
- keine Zahlungen, keine Konten, keine Cookies, kein Tracking
- keine Mails und keine SMS (das wäre der nächste Schritt, siehe unten)

## Veröffentlichen

Braucht ein Cloudflare-Konto. Kostenlos für diese Größenordnung.

```bash
cd server
npx wrangler login
```

Ein Geheimnis setzen — das ist der Hausschlüssel, den die interne Seite später
einmal abfragt. Etwas Langes, nicht "wirtschaft123":

```bash
npx wrangler secret put HAUS_TOKEN
```

Veröffentlichen:

```bash
npx wrangler deploy
```

Wrangler nennt am Ende die Adresse, etwa
`https://wirtschaft-reservierung.<konto>.workers.dev`.

## Einschalten

Die Adresse in `site/data/haus.json` eintragen:

```json
{ "api": "https://wirtschaft-reservierung.<konto>.workers.dev", "status": "an" }
```

Dann im Projektverzeichnis:

```bash
npm run ci
```

Das trägt die Adresse automatisch in die Content-Security-Policy der internen
Seiten ein. Ohne diesen Schritt blockiert der Browser jede Verbindung zum
Dienst — und die Seite sieht dabei völlig normal aus.

Zuletzt im Tischplan unter **Einrichten → Reservierungsdienst** den
Hausschlüssel eintragen und auf *Übernehmen und veröffentlichen* drücken. Damit
kennt der Dienst den echten Tischplan; vorher rechnet er mit dem Beispiel.

## Ausschalten

`"api": ""` in `site/data/haus.json`, dann `npm run ci`. Alles verhält sich
wieder wie vorher: Die Gästeseite leitet auf den offiziellen Anbieter weiter,
der Tischplan arbeitet nur im Browser. **Der Tischplan ist nie vom Dienst
abhängig** — fällt er aus, läuft der Mittag weiter, nur Onlinebuchungen kommen
nicht an.

## Örtlich testen

```bash
cd server
npx wrangler dev --port 8787 --local --var HAUS_TOKEN:testgeheim
```

Dazu in `site/data/haus.json` `"api": "http://localhost:8787"` eintragen und
`node scripts/sync-csp.mjs` laufen lassen.

## Kosten

Cloudflare Workers und Durable Objects sind für ein Haus dieser Größe im
kostenlosen Rahmen: es geht um einige hundert Anfragen am Tag, nicht um
Millionen. Der Draht zum Bildschirm nutzt Hibernation — die Verbindung bleibt
offen, ohne dass der ganze Mittag abgerechnet wird.

## Datenschutz

Der Zustand liegt in der EU (`jurisdiction('eu')`). Cloudflare hält
Protokolldaten laut eigener Dokumentation außerhalb dieser Grenze; das ist im
Auftragsverarbeitungsvertrag zu berücksichtigen. Gespeichert wird nur, was für
die Tischeinteilung nötig ist, und automatisch nach 30 Tagen gelöscht.

## Was als Nächstes sinnvoll wäre

1. **Erinnerung am Vortag** — der größte Hebel gegen Nichterscheinen. Braucht
   zusätzlich eine Kontaktangabe und einen Mail- oder SMS-Dienst; beides ist
   eine bewusste Entscheidung, weil es die Datenhaltung erweitert.
2. **Gästehistorie** — wer war da, wer kam nicht, Notizen wie „Fensterplatz".
   Der Check-in liefert die Daten bereits.
3. **Eigener Domainname** statt `workers.dev`, damit die Adresse zum Haus passt.
