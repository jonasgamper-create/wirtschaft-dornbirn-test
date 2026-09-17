# Projektstand: wo die Seite am 17. September 2026 steht

Diese Datei ist die allgemeine Übersicht. Sie löst die verstreuten Einzelnotizen
als Einstieg ab: was steht, was geprüft ist, was entschieden werden muss und in
welcher Reihenfolge es weitergeht. Details stehen weiterhin in den
Spezialdokumenten, auf die hier verwiesen wird.

## Was steht

| Teil | Wo | Stand |
|---|---|---|
| Gästeseite | Cloudflare Pages + GitHub Pages, 11 Seiten | live unter [wirtschaft-dornbirn.pages.dev](https://wirtschaft-dornbirn.pages.dev) |
| Reservierung & Takeaway | Cloudflare Worker + Durable Object | im Betrieb, Gratisstufe |
| Wirt-Ansicht | `/tischplan/wirt.html` | im täglichen Gebrauch, hinter Hausschlüssel |
| Termine | ticketist.io, 46 Kennungen | live gelesen, 31 Abende |
| Testumgebung | zweiter Worker, `?probe=1` | seit 17.09., siehe [testumgebung.md](testumgebung.md) |

## Was seit dem Kundendokument vom 16.09. passiert ist

Das Wording-Dokument von Sarah und Hannah ist Seite für Seite umgesetzt
(PR #207). Vier Stellen waren im Dokument widersprüchlich oder offen und wurden
mit Jonas entschieden: Gruppengröße (10 online, Hinweistext nennt 20),
Telefonnummern-Aufteilung, „mittagskarte ansehen" statt „als PDF öffnen", und
die Dialektüberschrift bleibt.

Danach ging es um Format und Technik:

- **Eventseite**: vier Kacheln am Rechner, zwei am Telefon, Raster bis an den
  Rand, ganzes Bild sichtbar, gleich breite Spalten (PR #208–#210, #219–#221).
- **Zwei echte Fehler**, die nur in Safari auftraten: eine Spalte lief über den
  Rand, weil ein Knopf nicht umbrechen durfte; und „comedy only" war blau, weil
  die Knöpfe gar keine Farbe gesetzt hatten und die des Browsers erbten.
- **Testumgebung** mit eigenem Dienst, eigener Datenbank und ohne Mailversand
  (PR #212–#218).
- **Monatszahlen** lagen im öffentlichen Build und sind jetzt draußen (PR #222).
- **Kritische Runde 17.09.** (PR #229): die beiden Wege „Termine & Tickets" und
  „Mittagstisch reservieren" stehen auf der Startseite im ersten Bild (vorher
  erster Knopf bei 1325 px am Telefon); Eventkacheln am Telefon 12 statt 10,5 px;
  Wochenkarte schreibt sich fort. Bewusst **nicht** umgesetzt (Jonas):
  vergangene Tage im Takeaway ausblenden, „2. abend"-Kennzeichen bei Serien,
  Legende am Laptop kürzen, Reservierungsformular straffen, Labels 12,5 px.

## Was geprüft ist

Stand 17.09., an der lebenden Seite gemessen:

- **421 Verweise** auf 12 Seiten. Alle internen Ziele und Sprungmarken lösen
  auf; alle **33 externen** Adressen antworten mit 200.
- **46 Ticketwege** bei ticketist.io: jeder erreichbar, jeder auf dem richtigen
  Abend, Ausverkauft-Stand deckt sich mit unserer Anzeige.
- **13 Fensterbreiten** von 320 bis 1920 px: gleich breite Spalten, kein
  Überlauf, nichts abgeschnitten, Bildkasten überall 2:1.
- Seitengewicht der Startseite: 1,05 MB über 27 Dateien.

## Was entschieden werden muss

| | Frage | Wer |
|---|---|---|
| 1 | Gutschein-Knopf zeigt auf `gutscheine.wirtschaft-dornbirn.at` – bleibt die Subdomain, oder wohin sonst? | Wolfgang |
| 2 | Gruppengröße: Hinweis nennt 20, Formular nimmt 10. Deckel nachziehen oder Text ändern? | Wolfgang |
| 3 | „Agentur" steht im Fußzeilen-Menü, im Kundendokument nicht. Drin lassen? | Sarah/Hannah |
| 4 | `www.wirtschaft-dornbirn.at` in der Fußzeile ergänzen? | Sarah/Hannah |
| 5 | Wer pflegt Termine und Mittagskarte – bei den Diensten wie bisher, oder braucht es eine eigene Oberfläche? | Sarah/Hannah |
| 6 | Bestellformular-Texte im Takeaway: im Dokument „in Absprache", noch nicht freigegeben. | Sarah/Hannah |

## Was vor dem Scharfschalten zu tun ist

In dieser Reihenfolge, weil jeder Schritt den nächsten möglich macht:

1. **Mittagskarte aktualisieren.** Der hinterlegte Plan ist vom 7. September.
   Seit 17.09. schreibt der Dienst ihn von selbst auf die laufende Woche fort
   (gleiche Gerichte, aktuelles Datum), damit Gäste kein altes Datum sehen –
   eingetragen werden muss die neue Woche trotzdem.
2. **Zwei Eventquellen zusammenlegen.** Die Startseite und die
   Kalender-Abodatei lesen eine Liste von Hand (`site/data/events.json`, Stand
   27.08., 18 Einträge); die Eventseite liest live beim Ticketdienst (31
   Abende). Dadurch fehlen auf der Startseite 13 Abende, und ein vergangener
   steht noch drin.
3. **Domainumzug** auf `wirtschaft-dornbirn.at` samt Weiterleitungen für die
   alten `/event/…`-Adressen, siehe [abschaltung-alte-seiten.md](abschaltung-alte-seiten.md).
4. **Mailabsender** auf eine Wirtschaft-Adresse umstellen – über aon.at prallen
   die Bestätigungen ab.
5. **Cloudflare Access** vor die Wirt-Ansicht (geht erst, wenn die Domain bei
   Cloudflare liegt).
6. **Strukturierte Daten prüfen**: die Startseite nennt schon heute
   `wirtschaft-dornbirn.at` als Adresse und ein Bild, das dort erst nach dem
   Umzug liegt.
7. **Testdaten löschen** (alles mit „TEST" in Reservierung und Takeaway).
8. **Alte Faltkarten** aussortieren – ihr QR zeigt auf die alte Seite.
9. **Ticketist um Lesezugriff bitten**, damit Preise und Restkarten live laufen
   statt aus der hinterlegten Datei vom 14.09.

## Offene Pull Requests

- [#201](https://github.com/jonasgamper-create/wirtschaft-dornbirn-test/pull/201) Wirt-Ansicht: Werkzeuge als zweite Ebene
- [#202](https://github.com/jonasgamper-create/wirtschaft-dornbirn-test/pull/202) Versionsskript: keine Selbstverweise umschreiben
- [#203](https://github.com/jonasgamper-create/wirtschaft-dornbirn-test/pull/203) Faltkarte: Allergene am Gericht – das ist der Punkt
  „Allergene in selber Formatierung" aus dem Kundendokument

## Wo was steht

- [adresse.md](adresse.md) – wo die Seite steht und wie sie veröffentlicht wird
- [testumgebung.md](testumgebung.md) – der Probemodus zum Herzeigen
- [abschaltung-alte-seiten.md](abschaltung-alte-seiten.md) – Abhängigkeiten der alten Seiten
- [altbestand/](altbestand/) – gesicherte Fassungen beider alter Auftritte
- [launch-checklist.md](launch-checklist.md) – Checkliste fürs Scharfschalten
- [event-data.md](event-data.md) – wie die Termine gelesen werden
