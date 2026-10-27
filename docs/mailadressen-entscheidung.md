# Mailadressen: die Entscheidung des Hauses

**Ausgefüllt von Hannah Preuß am 27.10.2026** im Entscheidungsblatt
`docs/pdf/Mailadressen-Entscheidungsblatt-wirtschaft.pdf`. Dieses Dokument
hält fest, was entschieden wurde, was davon bereits eingebaut ist und was
noch blockiert ist.

Es ist ab jetzt die Quelle für jede Mailadresse im System. Weicht ein
anderes Dokument davon ab, gilt dieses hier.

---

## 1 Die Postfächer, die es gibt

Alle liegen bei **Hetzner** (Frage A2 bestätigt, was Jonas aus der
öffentlichen DNS-Abfrage abgelesen hatte).

| Postfach | Wofür | Wer liest |
| --- | --- | --- |
| `willkommen@wirtschaft-dornbirn.at` | Anfragen und Allgemeines „wirtschaft“ | Wolfgang, Hannah |
| `veranstaltungen@wirtschaft-dornbirn.at` | Marketing, Veranstaltungen, Warteliste „wirtschaft“ | Hannah |
| `service@wirtschaft-dornbirn.at` | Tischreservierungen, Take Away | Service |
| `gewinnspiel@wirtschaft-dornbirn.at` | Gewinnspiele zu Veranstaltungen | Hannah |
| `sarah.preuss@wirtschaft-dornbirn.at` | Marketing | Sarah |
| `kueche@wirtschaft-dornbirn.at` | **nicht in Verwendung** | – |
| `uri@eugen.family` | Anfragen und Allgemeines Kulturhaus Emma & Eugen | Wolfgang, Hannah |
| `tickets@eugen.family` | Warteliste Kulturhaus-Abende | Hannah |

Ein Postfach `web@wirtschaft-dornbirn.at` wird **nicht** angelegt. Es war im
Blatt vorgeschlagen, das Haus hat anders entschieden (Fragen B5 und C4).

## 2 Welche Adresse wofür

| Nr. | Zweck | Adresse |
| --- | --- | --- |
| B1 | **Absender** Reservierung und Take Away | `service@wirtschaft-dornbirn.at` |
| B1 | **Absender** Warteliste eines Abends in der „wirtschaft“ | `veranstaltungen@wirtschaft-dornbirn.at` |
| B1 | **Absender** Warteliste eines Kulturhaus-Abends | `tickets@eugen.family` |
| B2 | **Empfänger** Anfragen Feste, Catering, Agentur | `willkommen@wirtschaft-dornbirn.at` |
| B2 | **Empfänger** Anfragen Kulturhaus | `uri@eugen.family` |
| B3 | **Empfänger** Tageszettel (werktags 08:00) und Wochenbericht (Freitag 15:00) | `veranstaltungen@wirtschaft-dornbirn.at` |
| B4 | **Empfänger** jeder einzelnen Take-away-Bestellung | `service@wirtschaft-dornbirn.at` |
| B5 | Die drei Konten (GitHub, Cloudflare, Brevo) | `veranstaltungen@wirtschaft-dornbirn.at` |
| C4 | Kontakt beim Registrar | `willkommen@wirtschaft-dornbirn.at` und eine private Reserveadresse von Hannah (steht im ausgefüllten Blatt, nicht hier – siehe Abschnitt 6) |

„Absender“ heißt: diese Adresse sieht der Gast, und dort landet seine
Antwort. „Empfänger“ heißt: dorthin schickt die Webseite die Meldung.

## 3 Die übrigen Festlegungen

- **Zweite Person mit vollem Zugang zu den Konten** (B6): Sarah,
  `sarah.preuss@wirtschaft-dornbirn.at`.
- **Technische Betreuung** (B7): Jonas bleibt vorerst.
- **Veranstalter-Kontakt bei den Abenden** (B8): bleibt wie bisher. Wörtlich:
  „Bitte im Fuß die ‚wirtschaft‘ und Emma+Eugen belassen.“ Es ändert sich
  nichts.
- **Automatische Antwort im Postfach `willkommen@`** (B9): **nein**, keine.
  Damit entfällt die geplante Einstellung bei Hetzner.
- **Die Domain** (C1 bis C3): gehört dem Haus („wirtschaft“ cafe restaurant
  bar · Wolfgang Preuß e.U.), Registrar ist Hetzner, letzte Zahlung
  17.08.2026, Laufzeit ein Jahr, Bankeinzug. Nächste Verlängerung also
  **August 2027** – kein Umzug der Inhaberschaft nötig, das war die größte
  offene Sorge im Plan und ist damit vom Tisch.
- **Am wichtigsten** (D1): dass Mails zuverlässig ankommen, dass die Konten
  dem Haus gehören, und dass die Kosten niedrig bleiben.

## 4 Was damit eingebaut ist

Alles, was ohne Vorbedingung geht, steht im Dienst (`server/wrangler.jsonc`,
Produktion **und** Probe):

| Einstellung | Wert | Wirkung |
| --- | --- | --- |
| `WIRT_MAIL` | `veranstaltungen@wirtschaft-dornbirn.at` | Tageszettel und Wochenbericht (B3) |
| `TAKEAWAY_MAIL` | `service@wirtschaft-dornbirn.at` | jede Bestellmeldung (B4) – **neu**, vorher lief sie über `WIRT_MAIL` mit |
| `ANFRAGE_MAIL` | `willkommen@wirtschaft-dornbirn.at` | Anfragen (B2), unverändert richtig |

Dazu kennt der Dienst jetzt **einen Absender je Zweck** statt einem für
alles: `ABSENDER_SERVICE`, `ABSENDER_WARTELISTE`, `ABSENDER_KULTURHAUS` und
das schon vorhandene `EVENTS_ABSENDER` für die Terminliste. Welche Mail
welchen davon nimmt, entscheidet `#absender()` in `server/src/index.js`; bei
der Warteliste zusätzlich, ob der Abend im Kulturhaus stattfindet (das steht
am Eintrag). Ist eine der vier Einstellungen leer, gilt der Hausabsender.

## 5 Was noch blockiert ist

**Die vier Absenderadressen stehen absichtlich noch leer.** Brevo verschickt
nur von Adressen, deren Domain dort beglaubigt ist. Wird eine Adresse zu
früh eingetragen, versendet der Dienst **gar nichts** mehr – schlechter als
heute. Reihenfolge:

1. Bei Brevo die Domain `wirtschaft-dornbirn.at` anlegen und die vier
   DNS-Einträge bei Hetzner setzen (`docs/mail-absender.md`). Beglaubigung
   abwarten.
2. Dann `BREVO_ABSENDER` auf `willkommen@wirtschaft-dornbirn.at` setzen –
   damit hört der heutige Spam-Effekt auf (`jonas.gamper@aon.at` verbietet
   fremden Versand, DMARC `p=reject`).
3. Dann `ABSENDER_SERVICE` = `service@wirtschaft-dornbirn.at` und
   `ABSENDER_WARTELISTE` = `veranstaltungen@wirtschaft-dornbirn.at`.
4. `ABSENDER_KULTURHAUS` = `tickets@eugen.family` und `EVENTS_ABSENDER` =
   `uri@eugen.family` brauchen eine **eigene** Beglaubigung der Domain
   `eugen.family`. Das kann nur Uri veranlassen.

Prüfen nach jedem Schritt: `GET /api/mail/pruefung?email=<eigene Adresse>`
muss `delivered` melden.

## 6 Zugangsdaten

Frage A3 wurde mit Benutzernamen **und Passwort** ausgefüllt. Beides steht
bewusst **nicht** in diesem Verzeichnis und in keinem anderen Dokument:
hier liegt Quellcode, der auf GitHub landet.

Weil das Passwort den Weg über Download-Ordner und Chat genommen hat, sollte
es bei Hetzner **geändert** werden. Der Zugang selbst ist vorhanden (Sarah),
das war die eigentliche Frage – und sie ist beantwortet.

Aus demselben Grund steht auch die **private Reserveadresse von Hannah**
(Frage C4) nicht in diesem Verzeichnis: **dieses Repository ist öffentlich.**
Sie gehört nur ins Hetzner-Kundenkonto. Die Adressen auf
`@wirtschaft-dornbirn.at` sind dagegen geschäftliche Kontaktdaten und stehen
ohnehin auf der Webseite.

## 7 Offene Punkte

1. **Anfragen fürs Kulturhaus** (B2): Auf der Webseite gibt es dafür kein
   Formular. Die beiden Anfrageformulare heißen „Locations · Feste &
   Catering“ und „Agentur“ und gehören beide zur „wirtschaft“. Wer sich
   wegen des Kulturhauses melden will, findet im Fuß der Termineseite
   `uri@eugen.family` – damit ist der Wunsch heute schon erfüllt, nur ohne
   Formular. **Frage ans Haus:** genügt das, oder soll ein eigenes
   Kulturhaus-Formular dazukommen?
2. **Der Tageszettel geht ab jetzt an `veranstaltungen@`, nicht mehr an
   Jonas.** Er war bisher auch das tägliche Lebenszeichen des Dienstes. Der
   Dienst kennt nur **eine** Empfängeradresse dafür. **Frage ans Haus:**
   soll die technische Betreuung eine Kopie bekommen? Dann braucht es eine
   Weiterleitung im Postfach oder eine zweite Adresse im Code.
3. **`eugen.family` bei Brevo** (siehe Abschnitt 5, Schritt 4): Wer spricht
   mit Uri?
4. **`kueche@wirtschaft-dornbirn.at`** ist laut A1 unbenutzt. Löschen oder
   behalten? Die Webseite verwendet es nicht.
5. **`gewinnspiel@` und `sarah.preuss@`** kommen in der Webseite nicht vor.
   Das ist in Ordnung – nur zur Bestätigung festgehalten.
