# Gastgeber-Cockpit: sicherer Produktionsaufbau

Das aktuelle `site/gastgeber.html` ist bewusst nur ein lokales Test-Cockpit. Es nutzt `localStorage`, ist `noindex` und wird vom öffentlichen Build ausgeschlossen. Damit lassen sich Kapazitäten, Tischmix und Ticketbestände demonstrieren, aber nicht mehrere Geräte oder Mitarbeitende sicher synchronisieren.

## Verbindliche Produktionsregel

Die Gastansicht darf niemals die Quelle für Verfügbarkeit sein. In Produktion gibt es genau eine Quelle der Wahrheit:

- Tischreservierungen: Resmio, Reservier.at oder eine eigene EU-API – nach AVV- und Sicherheitsprüfung.
- Tickets und Zahlungen: ein externer Hosted-Checkout wie pretix Hosted oder der bereits verwendete Anbieter, sofern aktuelle DPA-/Subprozessor- und Gebührenangaben vorliegen.
- Unsere Website zeigt nur serverseitig abgerufene Verfügbarkeitswerte und speichert keine Karten- oder Zahlungsdaten.

## Eigentümersteuerung

Der Eigentümer kann pro Mittag-/Abend-Zeitfenster und pro Event ändern:

- Datum, Startzeit und Bereich
- Sitzplatz-Obergrenze und optionalen internen Puffer
- Anzahl 2er-, 4er-, 6er- und 8er-Tische
- Eventkapazität und Ticketarten
- Status (offen, pausiert, ausverkauft, Warteliste)

Der Tischmix ist eine operative Planung. Die verbindliche Belegung kommt vom Buchungsanbieter; die Website darf einen manuell eingetragenen Wert nicht als live bestätigen.

## API und Datenmodell (Zielbild)

```text
Browser (Gast) ── GET /api/availability ──> API ──> Provider/Webhooks
Browser (Owner) ── PUT /api/services/:id ──> API ──> EU-Postgres + Auditlog
Hosted checkout ── signed webhook ────────> API ──> status/event inventory
```

Minimal erforderliche Tabellen:

- `service_windows`: Datum, Zeit, Bereich, limit, buffer, status
- `table_types`: service_window_id, seats (2/4/6/8), quantity
- `events`: Datum, Name, capacity, status
- `ticket_types`: event_id, name, capacity, sold/status
- `booking_references`: provider, provider_object_id, status, created_at – keine Kartendaten
- `audit_log`: actor, action, entity, before/after, timestamp

Die API muss serverseitig validieren, atomar zählen und Idempotency-Keys für Webhooks verwenden. Bei widersprüchlichen Daten gewinnt der Providerstatus; ein manueller Puffer darf nie zu einer falschen öffentlichen Zusage führen.

## Zugriff und Schutz

- getrennte persönliche Konten, Rollen `owner`, `manager`, `staff`
- MFA/Passkeys und kurze, widerrufbare Sessions
- `Secure`, `HttpOnly`, `SameSite`-Cookies, CSRF-Schutz und Rate-Limits
- geschützte Admin-Route, kein öffentliches statisches HTML-Cockpit
- Auditlog für Kapazitäts-, Event- und Statusänderungen
- getrennte Test-/Produktionsschlüssel und verschlüsselte Backups
- keine personenbezogenen Reservierungsdaten in Git, Prompts oder Frontend-Bundles

## Zahlungsrisiko

Wir bauen keinen eigenen Kartendatenspeicher und keine eigene Zahlungsabwicklung. Der Checkout läuft auf der Plattform des ausgewählten Anbieters; unsere Anwendung erhält nur eine Bestellreferenz und den Status. Vor dem Go-live werden PCI-Verantwortung, AVV, Subprozessoren, Löschfristen, Webhook-Signatur, Rückerstattung und Datenexport schriftlich geprüft.

## Kostenentscheidung

Für den Piloten ist ein vorhandenes Provider-Cockpit günstiger und sicherer als ein eigenes Backend. Ein eigenes Cockpit wird erst gebaut, wenn mehrere Standorte, gemeinsame Rollen, zentrale Auswertungen oder eine verbindliche Datenhoheit den zusätzlichen Entwicklungs- und Betriebsaufwand rechtfertigen.
