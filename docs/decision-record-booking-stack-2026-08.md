# Entscheidungsrecord: Buchungsstack August 2026

## Entscheidung

Für den Wirtschaft-Piloten bleibt Ticketist als bestehender Event- und
Zahlungskanal unverändert bestehen. Die neue Website verlinkt je Event auf die
offizielle Wirtschaft-Seite; Ticketist bleibt dort Quelle für Kontingent,
Warteliste, Checkout, Refund und Einlass.

Für Tische werden Resmio Premium und Reservier.at Pro geprüft. Ein Wechsel des
Ticketanbieters zu pretix Hosted ist eine spätere Option und wird nur nach
schriftlichem Kosten-, AVV-, Support- und Migrationstest entschieden.

## Begründung

- Verfügbarkeit bleibt in genau einer autoritativen Anbieterquelle.
- Hosted Checkout verhindert Kartenfelder und Zahlungsgeheimnisse im Website-Code.
- Der bestehende Ticketist-Flow bleibt für Gäste und Gastgeber zunächst stabil;
  ein unnötiger Anbieterwechsel erhöht das Betriebsrisiko.
- pretix Hosted hat laut Anbieter keine Grundgebühr und bleibt als
  Vergleichsoption interessant, ist aber kein automatischer Migrationsauftrag.
- Resmio ist die konservativere Referenz für Tischplan und Warteliste.
- Reservier.at kann die Fixkosten senken, ist aber vor Vertrag stärker zu verifizieren.

## Nicht entschieden

- konkreter Anbieter-Account und Produktions-URL
- AVV/Subprozessoren und Löschfristen
- Zahlungsanbieter innerhalb des Ticket-Checkouts
- endgültige Preise, Steuersätze und Refundregeln

## Sicherheitsgrenze

Die Agentur baut weder eine eigene Zahlungsplattform noch eine lokale
Kapazitätsdatenbank für Gäste. Keine Kartendaten, API-Schlüssel, Webhook-
Signaturen oder echten Gästedaten in GitHub, Codex-Prompts oder statischen Assets.
