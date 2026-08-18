# Datenschutz- und Datenflussmatrix

## Aktueller Teststand

- Öffentliche Gästeseite: statische Dateien, keine Analyse- oder Marketing-Skripte.
- Keine `localStorage`-/`sessionStorage`-Ablage für Reservierungs- oder Ticketdaten.
- Formulare erzeugen eine E-Mail im Mailprogramm des Gastes; eine Übermittlung
  findet erst nach dessen aktivem Versand statt.
- Der öffentliche Build enthält weder Gastgeber-Cockpit noch Inventarsteuerung.
- GitHub Pages bleibt Test-/Preview-Hosting. Es ist nicht der Produktionsort für
  kommerzielle Buchungen oder Zahlungen.

## Vor dem Livegang ausfüllen

| Verarbeitung | Zweck | Anbieter | Rechtsgrundlage | Aufbewahrung | Freigabe |
| --- | --- | --- | --- | --- | --- |
| Tischreservierung | Reservierung/Warteliste | Resmio | Vertrag/Anfrage | mit Anbieter klären | Wolfgang |
| Direkte Mittagsreservierung | Reservierung, Bestätigung, Absage | Cloudflare (EU), Brevo (Mailversand) | Art. 6 Abs. 1 lit. b | 30 Tage nach Termin, automatisch | Wolfgang |
| Newsletter Mittagskarte | Versand der Mittagskarte | Cloudflare (EU), Brevo (Mailversand) | Art. 6 Abs. 1 lit. a, § 174 TKG | bis Widerruf; ohne Bestätigung 30 Tage | Wolfgang |
| Ticketkauf | Ticket, Zahlung, Rückerstattung | Ticketist/Payment | Vertrag | mit Anbieter klären | Wolfgang |
| Catering-Anfrage | Angebot und Rückmeldung | Kundenkanal | Anfrage/Vertrag | festlegen | Wolfgang |
| Reichweitenmessung | Statistik/Marketing | nur nach Freigabe | Einwilligung oder geprüfte Alternative | festlegen | Kunde + Beratung |

Für jeden Dienst sind AVV, Subprozessoren, internationale Transfers, technische
und organisatorische Maßnahmen, Löschung und Betroffenenprozess abzulegen.

Die Newsletter-Einwilligung ist getrennt dokumentiert:
[newsletter-einwilligung.md](newsletter-einwilligung.md). Sie liegt bewusst in
einem eigenen Speicher, damit Widerruf und Auskunft die Reservierungsdaten
nicht berühren.

Die österreichische Datenschutzbehörde weist darauf hin, dass TKG 2021 §165(3)
nicht nur Cookies, sondern auch sonstige technische Speicherung oder Zugriffe
erfasst. Nicht notwendige Speicherungen dürfen daher erst nach wirksamer
Einwilligung erfolgen.

