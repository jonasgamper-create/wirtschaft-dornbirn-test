# Eventdaten und Status

`site/data/events.json` ist der versionierte Datenstand für Vorschau und Public
Build. Die offizielle Veranstaltungsseite bleibt die führende Quelle. Änderungen
werden nur nach Prüfung der offiziellen Termine, Ticketlinks und Statuswerte
übernommen.

## Pflichtfelder

- `updatedAt`: ISO-8601-Zeitpunkt der letzten Prüfung
- `maxAgeHours`: maximale erlaubte Aktualität
- `sourceUrl`: offizielle Quelle
- `pause`: `label`, `start`, `end`, `reopen`
- `events[]`: `id`, `title`, `date`, `type`, `status`, `officialUrl`

## Statuswerte

`scheduled`, `sold_out`, `waitlist`, `cancelled` und `paused` sind die einzigen
zulässigen Werte. Bei veralteten Daten zeigt die Website keinen erfundenen
Verfügbarkeitsstand, sondern einen Fallback-Hinweis und den Link zur offiziellen
Quelle.

Vor dem Produktions-Release prüft Wolfgang jeden Termin und jeden Ticketlink in
einer Vercel-Preview. Erst danach wird der Datensatz in `main` übernommen.
