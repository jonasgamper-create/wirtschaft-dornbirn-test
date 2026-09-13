# Altbestand: die beiden bestehenden Seiten

Gesichert am 13. September 2026, bevor die neue Seite sie ablöst. Hier liegt,
wie beide Auftritte gebaut waren – damit später niemand raten muss, was es
gab und wo es herkam.

Die neue Seite verlinkt **nicht** mehr auf diese Adressen. Sie holt ihre
Termine ausschließlich vom Ticketdienst (ticketist.io) und steht damit für
sich allein.

## wirtschaft-dornbirn.at

| | |
|---|---|
| System | WordPress mit WPBakery Page Builder (`js_composer`) |
| Design | eigenes Theme `wirtschaft-dornbirn`, nicht aus einem Baukasten |
| Erweiterungen | complianz-gdpr (Cookie-Banner), seo |
| Aufbau | Startseite „neues“, dazu `das-konzept`, `comedynacht`, je Abend eine Seite unter `/event/<kennung>/` |
| Ausgelagert | `tischreservierung.` (Fremdsystem), `lieferservice.`, `gutscheine.` als eigene Subdomains |
| Tickets | jede Eventseite führte weiter zu ticketist.io |

Gesichert: Startseite, Konzept, Comedynacht, Datenschutz, Impressum, Kontakt,
eine Eventseite (Spörk 2026) und ein Bildschirmfoto der Startseite.

## eugen.family

| | |
|---|---|
| System | WordPress 5.7.2, eigener Aufbau (`/build/app.*.js`, Symfony-artige Struktur) |
| Aufbau | Startseite, `kulturhaus` (das Programm), `info`, `impressionen`, `feedback`, `impressum`, `agb` |
| Programmliste | fertige Kacheln im Quelltext: `box-item` mit Kopf (Datum, Künstler, Programm), Hintergrundbild und `onclick` auf `/event/<kennung>/` |
| Eventseite | trug den Ticketshop direkt in der Seite – dieselbe Software wie ticketist.io, nur im eigenen Kleid |
| Kennungen | identisch mit denen bei ticketist.io (`kulis-02-2026`, `luis-2026`, …) |

Gesichert: Startseite, Kulturhaus-Programm, Info, Impressionen, Feedback,
Impressum, AGB, eine Eventseite (Kulis) und ein Bildschirmfoto des Programms.

## Was davon in die neue Seite übergeht

- **Die Termine.** Beide Häuser verkaufen über denselben Ticketdienst. Die
  neue Seite liest dort – Name, Untertitel, Datum mit Uhrzeit, Ort,
  Beschreibung, Bild und die Ticketkategorien mit Preis und Stand. Damit
  braucht sie keine der beiden alten Seiten mehr.
- **Die Kennungen.** Sie sind der Faden zwischen alt und neu: dieselbe
  Kennung führte bei eugen.family auf die Eventseite und führt bei
  ticketist.io auf den Shop.
- **Die Inhalte** der Unterseiten (Konzept, Impressum, Datenschutz) stehen
  in eigenen Worten auf der neuen Seite; die alten Fassungen liegen hier als
  Beleg, was dort gestanden hat.

## Was bewusst nicht übergeht

- Das Cookie-Banner (die neue Seite setzt keine Cookies, die eines
  bräuchten).
- Der Seitenbaukasten und sein Theme: die neue Seite ist handgeschrieben,
  ohne WordPress.
- Die drei Subdomains für Reservierung, Lieferservice und Gutscheine –
  Reservierung und Bestellung laufen jetzt im eigenen Haus.
