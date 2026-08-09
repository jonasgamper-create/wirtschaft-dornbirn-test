# Buchungen und Tickets

## Zielarchitektur

Die Website präsentiert Angebot, Termine und klare Handlungswege. Sie verarbeitet
keine Kartendaten und hält keine produktiven Gästekonten. Reservierung und Ticketkauf
werden an die jeweils freigegebenen Anbieter übergeben.

### Tisch

Resmio Premium ist die konservative Referenz für Reservierung, Warteliste und
Tischplan. Vor der Produktivschaltung müssen Resmio-URL, AVV, Subprozessoren,
Aufbewahrung, Export, Rollen und Löschfristen schriftlich bestätigt werden.

Reservier.at Pro ist die kostensensitive Vergleichsprobe. Der Anbieter nennt
39,90 EUR/Monat, keine Reservierungsprovision, Kapazitätssteuerung und EU-Server.
Diese Angaben sind Anbieterangaben und müssen vor Vertrag durch AVV-,
Subprozessor-, Lösch- und Ausfalltests verifiziert werden. Der bestehende Link
`https://tischreservierung.wirtschaft-dornbirn.at/` bleibt während des Piloten
als geprüfter Fallback bestehen, bis Wolfgang die Migration freigibt.

### Events

Ticketist bleibt im ersten Rollout der bestehende Ticketkanal der Wirtschaft.
Die Website verlinkt eventbezogen auf die offizielle Wirtschaft-Seite; dort
bleiben Ticketstatus, Checkout, Warteliste und Zahlungsverkehr. Vor dem Go-live
werden dafür aktuelle AVV-, Subprozessor-, Speicher-/Lösch-, Rückerstattungs- und
Gebührenangaben angefordert. pretix Hosted ist nur eine spätere Vergleichsoption:
laut Anbieter 2,5 % vom Netto-Ticketpreis, gedeckelt auf 15 EUR, plus
Zahlungsanbieter und ohne Grundgebühr. Die Website darf keine eigene
Zahlungslogik nachbauen.

## Migration in vier Schritten

1. Testevent und Testreservierungen mit Wolfgang und einer internen Testadresse.
2. Ausverkauft-, Wartelisten-, Storno-, Rückerstattungs- und Kalenderfälle prüfen.
3. Anbieterlinks in einer Preview aktivieren; Datenschutz- und Impressumstexte anpassen.
4. Erst nach schriftlicher Freigabe produktive URLs in den Kundenkonfigurationen setzen.

## Aktuelle Empfehlung

Resmio Premium (oder der nach Prüfung freigegebene bestehende Tischanbieter) plus
Ticketist als unveränderter Eventkanal ist der Pilotstack. Reservier.at und
pretix Hosted werden nur parallel verglichen; ein Wechsel erfolgt erst nach
schriftlichem Kosten-, DPA- und Ausfalltest sowie Freigabe durch Wolfgang.

## Datenfluss vor dem Livegang

| Schritt | Verantwortlicher | Produktionsdaten im Website-Code? |
| --- | --- | --- |
| Menü/Event ansehen | Website | Nein |
| Reservieren | Resmio/Reservier.at bzw. freigegebener Anbieter | Nein |
| Ticket kaufen | pretix/Ticketist bzw. freigegebener Anbieter | Nein |
| Catering-Anfrage | vom Kunden freigegebener Kommunikationskanal | Nein |
