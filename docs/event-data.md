# Eventdaten und Status

Stand 11. November 2026.

`site/data/events.json` wird nicht mehr von Hand gepflegt, sondern erzeugt.
`npm run sync:termine` liest alle Abende beim Ticketdienst (ticketist.io) –
samt Ticketkategorien, Preisen und freien Plätzen – und schreibt
`site/data/termine.json` und `site/data/ticketist-preise.json`.
`npm run sync:events-quelle` (Teil von `npm run ci`) baut daraus
`events.json`. Live liest der Dienst dieselben Angaben selbst
(`/api/termine`); die Dateien sind der Rückfall, wenn der Dienst schweigt, und
die Grundlage für Suchmaschinen und die Kalenderdatei.

## Pflichtfelder (geprüft von `npm run check:event-data`)

- `version`, `updatedAt` (Zeitpunkt des Abgleichs mit dem Ticketdienst),
  `maxAgeHours`
- `sourceUrl`: muss auf den Ticketdienst zeigen (`https://www.ticketist.io/`)
- `pause`: `start`, `end`, `reopen` als ISO-Datum
- `events[]`: `id`, `title`, `date`, `status` und `tickets[]` (Name, Preis,
  Status je Kategorie) oder ein Ticketlink; dazu `ticketUrl` und bei Bedarf
  `kaufUrl`, `wartelisteKennung`, `haus`
- `officialUrl` gibt es nicht mehr: Die Seite verweist nicht auf die alte
  Wirtschaft-Seite.

## Statuswerte

Je Abend: `scheduled`, `teilweise` (ein ganzer Ticketweg ist ausverkauft, ein
anderer nicht), `sold_out`, `vorverkauf`, `waitlist`, `cancelled`, `paused`.
Je Ticketart: `buchbar`, `ausverkauft`, `unbekannt`. Der Status des Abends
muss zu seinen Ticketarten passen, sonst schlägt die Prüfung an. Geraten wird
nichts: Ohne Kategorien zeigt die Seite keine Preise und führt zum
Ticketdienst.

## Freigabe

Änderungen kommen als Pull Request; vor dem Merge muss `npm run ci` grün sein
(siehe `CLAUDE.md`).
