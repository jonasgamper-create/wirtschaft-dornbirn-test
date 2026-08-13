# Marktanalyse Ticketing und Tischreservierung, August 2026

Entscheidungsunterlage, kein Auftrag. Der Ticketteil wurde vom Betreiber
ausdrücklich zurückgestellt; dieses Dokument hält den Recherchestand fest,
damit die Entscheidung später ohne neue Recherche fallen kann.

Alle Preise Abrufdatum **12.08.2026**, von den Anbieterseiten. Rechenbasis:
Ticket 68 EUR brutto, rund 240 Tickets im Monat, rund 2.880 im Jahr, Zahlung
über Stripe Österreich (EWR-Standardkarte 1,5 % + 0,25 EUR).

## Ticketing: Kosten je 68-Euro-Ticket

| System | Grundgebühr | effektiv je Ticket | Jahr |
| --- | --- | ---: | ---: |
| Hi.Events self-hosted | 0 (Server 30–40 USD/Mon.) | ~1,27 EUR | ~3.660 + Server |
| pretix self-hosted | 0 (Server + Wartung) | ~1,27 EUR | ~3.660 + Betrieb |
| Hi.Events Cloud | 0 | ~2,15 EUR | ~6.190 |
| **pretix Hosted** | **0** | **~2,70 EUR** | **~7.750** |
| Tito | 0 | ~3,31 EUR | ~9.530 |
| Weezevent | 0 | ~3,40 EUR | ~9.790 |
| Billetto | 0 | ~3,55 EUR | ~10.220 |
| Eventbrite AT | 0 | ≥3,74 EUR | ~10.770+ |
| **Ticketist** (aktuell) | **990 EUR einmalig** | **~3,99 EUR** | **~11.490 + 990** |

**Kernbefund: Der bestehende Anbieter ist der teuerste der geprüften.** Der
Wechsel auf pretix Hosted spart im ersten Jahr grob 4.700 EUR, danach rund
3.700 EUR jährlich — bei mehr Funktion, nicht bei weniger.

Das widerspricht `docs/decision-record-booking-stack-2026-08.md`, das Ticketist
im Piloten behält. Dieser Record wird nicht überschrieben; ein Wechsel bräuchte
einen neuen Record.

## Warum pretix Hosted die Empfehlung wäre

Der einzige Anbieter, der alle Anforderungen belegt erfüllt:

- Datenresidenz Deutschland schriftlich zugesichert, ISO/IEC 27001
- **AVV selbst generierbar** im Organizer-Profil, ohne Vertriebsgespräch
- echte Warteliste mit automatischem Nachrücken und Zeitfenster
- Kontingente je Termin und Produkt, harter Ausverkauft-Deckel
- Ticket-Designer: PDF im eigenen CI
- vollständige Webhooks (`order.paid`, `order.canceled`, Refunds, Check-ins,
  Wartelisten-Ereignisse) — anbindbar an ein eigenes Cockpit
- pretixPOS für die Abendkasse: **manuell verkaufte Tickets zählen in dieselbe
  Quote**, ohne eine Zeile eigenen Code
- Stripe oder Mollie im Hintergrund, damit Apple Pay, Google Pay, SEPA und EPS
- AGPL-Self-Hosting als späterer Migrationspfad mit identischer API — die
  Integration muss nur einmal gebaut werden

**Offen:** Die 2,5 % gelten laut Anbieter vom Nettopreis. Der Steuersatz je
Veranstaltungsart (13 % nach § 10 Abs. 3 UStG für kulturelle Veranstaltungen,
sonst 20 %) ist einzelfallabhängig und gehört vor jeder Kalkulation zum
Steuerberater.

**Ausgeschlossen:** Stripe Payment Links. Ohne Kapazitätsprüfung verkauft man
bei 80 Plätzen 95 Tickets und weist 15 Gäste an der Tür ab.

## Tischreservierung

| System | Preis/Monat | Tischplan mit Etagen | Auto-Zuweisung | API | EU-Daten |
| --- | ---: | --- | --- | --- | --- |
| resOS | 0 bis 25 Buchungen, dann 23–63 | ja | – | teilweise | DK |
| Reservier.at | 39,90 | nicht belegbar | nicht belegbar | nicht belegbar | Wien |
| **Teburio Professional** | **59** | **ja, mehrere Räume** | **ja, regelbasiert** | nein | DE/FR |
| Resmio Premium + Add-on | 89,80 | ja | ja | **ja, dokumentiert** | DE |
| OpenTable | ab 149 USD + Cover-Fees | ja, bestes System | ja | ja | US-Konzern |

**Quandoo scheidet aus** — der Betrieb wird eingestellt (Neureservierungen nur
bis 30.09.2026, Abschaltung 31.12.2026). Formitable ist in Zenchef aufgegangen.

Empfehlung wäre Teburio Professional für die beste fachliche Deckung, Resmio
nur wenn die Belegung wirklich ins eigene Cockpit gespiegelt werden soll.
resOS ist zum risikofreien Ausprobieren gut, die Gratisstufe ist bei einem
Mittagstisch mit 48 Plätzen aber nach rund zwei Tagen aufgebraucht — sie darf
nicht als „kostenlos" verkauft werden.

## Rechtlicher Rahmen, wenn selbst gebaut wird

- **PCI-DSS:** Reiner Redirect auf eine anbieter-gehostete Zahlungsseite ist
  SAQ A mit rund 30 Anforderungen. Eingebettete Zahlungsfelder auf eigener
  Domain — auch Stripe Elements — sind fachlich umstritten und können SAQ A-EP
  mit rund 139 Anforderungen auslösen. **Vor dem Bauen schriftlich mit dem
  Acquirer klären.** Eigene Kartenverarbeitung wäre SAQ D mit über 250.
- Seit 31.03.2025 verpflichtend: PCI-DSS 6.4.3 (Skript-Inventar auf der
  Zahlungsseite) und 11.6.1 (Tamper-Detection). Praktisch heißt das: **kein
  Fremd-JavaScript auf der Checkout-Seite** — das löst gleichzeitig die
  TKG-§-165-Frage.
- **DSGVO:** Verzeichnis nach Art. 30 ist praktisch immer Pflicht. AVV mit dem
  Hoster zwingend; die Rolle des Zahlungsdienstleisters (Auftragsverarbeiter
  oder eigenständig Verantwortlicher) ist umstritten und gehört zum
  Datenschutzjuristen. Meldefrist 72 Stunden nach Art. 33 ist ohne brauchbare
  Audit-Logs faktisch nicht einhaltbar.
- **Widerrufsrecht:** Bei terminfixen Veranstaltungen besteht keines
  (§ 18 Abs. 1 Z 10 FAGG, bestätigt durch EuGH C-96/21). **Gutscheine ohne
  Termin sind dagegen widerrufbar** — die Seite hat bereits einen
  Gutschein-Bereich, also braucht es zwei getrennte Rechtsflüsse.
- **Zeitkritisch — VerbRÄG 2026:** erweiterte Informationspflichten ab
  27.09.2026, Widerrufsbutton nach § 13a FAGG ab 01.10.2026 für Verträge ab
  diesem Datum. Ob er bei rücktrittsfreien Tickets vorzuhalten ist, ist
  ungeklärt; die Fläche im UI vorsichtshalber einplanen.
- **§ 8 FAGG:** Der Bestellbutton muss wörtlich „zahlungspflichtig bestellen"
  heißen.
- **Registrierkasse:** Online-Kartenzahlung ist kein Barumsatz und damit
  befreit. Eine Abendkasse mit Bargeld **oder Karte vor Ort** ist es sehr wohl —
  ab 15.000 EUR Jahresumsatz netto und 7.500 EUR Barumsatz netto besteht
  Registrierkassenpflicht.

## Ehrliche Gesamteinschätzung

Ein selbst gebautes Ticketsystem mit eigener Zahlungsabwicklung ist für einen
Betrieb dieser Größe der **teuerste und riskanteste** Weg, nicht der günstigste:
laufender Betrieb grob 420–900 EUR im Jahr, Erstentwicklung 150–250 Stunden,
Wartung 4–8 Stunden im Monat, Rechtsberatung einmalig 1.500–3.000 EUR — plus
dauerhafte Haftung in vier Regimen.

Der sinnvolle Schnitt ist der, den dieses Repository bereits umsetzt: **Karte,
Apple Pay und Kapazitätsdeckel beim Anbieter; Tischplan, Zuweisungslogik,
Auswertung und Gestaltung im eigenen Haus.** Der Wunsch „ohne Kosten" wird
nicht durch Eigenbau erfüllt, sondern durch den Anbieterwechsel beim Ticketing —
und genau dort liegt auch das mit Abstand größte Geld.

## Quellen

pretix ([Preise](https://pretix.eu/about/de/pricing),
[Datenschutz](https://pretix.eu/about/en/privacy),
[Webhooks](https://docs.pretix.eu/dev/api/resources/webhooks.html)) ·
[Ticketist](https://www.ticketist.io/preise/) ·
[Stripe Österreich](https://stripe.com/at/pricing) ·
[Mollie](https://www.mollie.com/en/pricing) ·
[Eventbrite AT](https://www.eventbrite.de/help/de/articles/755615/) ·
[Tito](https://ti.to/pricing) · [Weezevent](https://weezevent.com/de/weezticket/preise-optionen/) ·
[Teburio](https://teburio.de/preise/) · [Resmio](https://www.resmio.com/en/price/) ·
[Reservier.at](https://reservier.at/de/preise) · [resOS](https://resos.com/free-restaurant-reservation-system) ·
[OpenTable Flow Controls](https://support.opentable.com/s/article/flow-controls) ·
[PCI SSC zu SAQ A](https://blog.pcisecuritystandards.org/important-updates-announced-for-merchants-validating-to-self-assessment-questionnaire-a) ·
[§ 18 FAGG](https://www.jusline.at/gesetz/fagg/paragraf/18) ·
[WKO Widerrufsbutton ab 2026](https://www.wko.at/internetrecht/e-commerce-widerrufsbutton-webshop) ·
[WKO Registrierkasse](https://www.wko.at/steuern/registrierkassen-belegerteilungspflicht) ·
[§ 10 UStG](https://www.jusline.at/gesetz/ustg/paragraf/10)

Nicht belegbar und daher offen: Ticket Tailor (Preisseite liefert 403),
Hi.Events-Preise (nur aus Suchergebnissen), Eventbrite-Zahlungsgebühr für
Österreich, AVV-Volltexte sämtlicher Reservierungsanbieter.
