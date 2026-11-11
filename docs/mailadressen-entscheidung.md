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
| `willkommen@wirtschaft-dornbirn.at` | Anfragen und Allgemeines „wirtschaft“ (die Formular-Anfragen gehen seit 10.11.2026 an `uri@eugen.family`, siehe B2) | Wolfgang, Hannah |
| `veranstaltungen@wirtschaft-dornbirn.at` | Marketing, Veranstaltungen, Warteliste „wirtschaft“ | Hannah |
| `service@wirtschaft-dornbirn.at` | Tischreservierungen, Take Away | Service |
| `gewinnspiel@wirtschaft-dornbirn.at` | Gewinnspiele zu Veranstaltungen | Hannah |
| `sarah.preuss@wirtschaft-dornbirn.at` | Marketing | Sarah |
| `kueche@wirtschaft-dornbirn.at` | nicht in Verwendung, **bleibt** (Antwort 03.11.2026) | – |
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
| B2 | **Empfänger** Anfragen Feste, Catering, Agentur | `willkommen@wirtschaft-dornbirn.at` – **geändert auf `uri@eugen.family`** (entschieden 03.11., eingestellt seit 10.11.2026; siehe Abschnitt 7) |
| B2 | **Empfänger** Anfragen Kulturhaus | `uri@eugen.family` (über das Formular Locations, dort ist das Kulturhaus als Ort wählbar) |
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

- `WIRT_MAIL` = `veranstaltungen@wirtschaft-dornbirn.at`: Tageszettel und
  Wochenbericht (B3).
- `TAKEAWAY_MAIL` = `service@wirtschaft-dornbirn.at`: jede Bestellmeldung
  (B4) – **neu**, vorher lief sie über `WIRT_MAIL` mit.
- `ANFRAGE_MAIL` = `uri@eugen.family`: Anfragen (B2) an Emma & Eugen, weil
  die „wirtschaft“ nur bis Sommer 2028 läuft – entschieden 03.11., eingestellt
  seit 10.11.2026. Seit 11.11. zeigen auch der Notweg der Formulare (Mail, wenn
  der Dienst nicht antwortet) und die Vorgabe im Dienst dorthin;
  `scripts/check-absender.mjs` hält alle drei gleich.
- `WIRT_MAIL_KOPIE` (Geheimnis) = Adresse von Jonas: Kopie von Tageszettel und
  Wochenbericht an die technische Betreuung (Antwort 03.11.2026).
  **Vorbereitet, noch nicht gesetzt** – ohne das Geheimnis gibt es keine
  Kopie. Kein Eintrag in `wrangler.jsonc`, weil privat.

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

1. ~~Bei Brevo die Domains anlegen und die DNS-Einträge bei Hetzner
   setzen~~ – **erledigt** für `wirtschaft-dornbirn.at` und `eugen.family`
   (Sarah mit Markus, im Brevo-Konto des Hauses; von außen geprüft am
   10.11.2026). Offen: *Authenticate* für beide Domains im Brevo-Konto des
   Hauses.
2. Einen **API-Schlüssel aus dem Brevo-Konto des Hauses** als Geheimnis
   `BREVO_KEY` im Dienst hinterlegen (gemeinsam, nicht per Mail oder Chat).
   Grund: Der Dienst sendet heute noch über das Brevo-Konto von Jonas, und
   dort sind die Domains des Hauses nicht beglaubigt. Ein zweiter Benutzer
   im Brevo-Konto kostet laut Brevo 9 € im Monat – der Schlüssel nichts.
3. Dann `BREVO_ABSENDER` auf `willkommen@wirtschaft-dornbirn.at` setzen –
   damit hört der heutige Spam-Effekt auf (die private Adresse von Jonas
   liegt bei einem Anbieter, der fremden Versand verbietet, DMARC
   `p=reject`).
4. Dann `ABSENDER_SERVICE` = `service@wirtschaft-dornbirn.at`,
   `ABSENDER_WARTELISTE` = `veranstaltungen@wirtschaft-dornbirn.at`,
   `ABSENDER_KULTURHAUS` = `tickets@eugen.family` und `EVENTS_ABSENDER` =
   `uri@eugen.family`. Für `eugen.family` ist nichts mehr mit Uri zu
   klären: die Einträge stehen wie bei `wirtschaft-dornbirn.at`.

Prüfen nach jedem Schritt: `GET /api/mail/pruefung?email=<eigene Adresse>`
(mit dem Hausschlüssel im Kopf `x-haus-token`) muss `delivered` melden. Achtung: Bis Schritt 2 erledigt ist, zeigen
`/api/mail/pruefung` und `/api/mail/domain` das Brevo-Konto von **Jonas**,
nicht das des Hauses. Maßgeblich für *Authenticate* ist die Anzeige im
Brevo-Konto des Hauses.

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

## 7 Offene Punkte – beantwortet am 03.11.2026

Hannah hat die vier Fragen aus dem Statusblatt vom 27.10. am 03.11.2026
beantwortet. Stand danach:

1. **Anfragen fürs Kulturhaus** (B2): kein eigenes Formular – im Formular
   „Locations · Feste & Catering“ ist das Kulturhaus als Wunschort wählbar.
   Weil das Haus die „wirtschaft“ nur bis Sommer 2028 hat, gehen Anfragen
   aus **beiden** Formularen (Locations und Agentur) an `uri@eugen.family`
   statt an `willkommen@`. Umgesetzt als `ANFRAGE_MAIL` in beiden
   Umgebungen, live seit 10.11.2026, der Notweg der Formulare seit 11.11.; `replyTo`
   bleibt der Gast. Offen beim Haus: die Zeile „Lieber direkt?“ über den
   Formularen (nennt weiter `willkommen@`) und der Auftritt der
   Bestätigungsmail und der Datenschutzseite („wirtschaft“). Rückweg: eine
   Zeile.
2. **Tageszettel**: Kopie an Jonas, solange er den technischen Support
   macht. Vorbereitet als `cc` an das Geheimnis `WIRT_MAIL_KOPIE`
   (Tageszettel und Wochenbericht) – **noch nicht gesetzt**, also noch
   keine Kopie. Setzen: `npx wrangler secret put WIRT_MAIL_KOPIE` im Ordner
   `server`. Fällt der Support weg: `npx wrangler secret delete
   WIRT_MAIL_KOPIE`.
3. **`eugen.family` bei Brevo**: erledigt, ohne Uri. Sarah hat das
   Brevo-Konto des Hauses angelegt und mit Markus die Einträge beider
   Domains bei Hetzner gesetzt (von außen geprüft am 10.11.2026: DKIM,
   Brevo-Code, DMARC, SPF, beide Domains im selben Brevo-Konto). Es fehlen
   *Authenticate* in Brevo und danach der API-Schlüssel aus diesem Konto
   (Abschnitt 5).
4. **`kueche@wirtschaft-dornbirn.at`** bleibt bestehen. Keine Änderung.
5. **`gewinnspiel@` und `sarah.preuss@`** kommen in der Webseite nicht vor.
   Das ist in Ordnung – nur zur Bestätigung festgehalten.

Dazu aus derselben Antwort, nicht Teil der vier Fragen:

- **Ticketkategorien**: Hannah hat sie in Ticketist bei allen Abenden
  hinterlegt – und ihr Hinweis stimmte. Ticketist gibt Kategorien, Preise
  und freie Plätze öffentlich heraus (`/api/ticket-categories?eventId=<nummer>`);
  am 03.11. waren nur `window.event` und `/api/events/<id>` geprüft worden,
  die Aussage „gibt Ticketist nicht heraus“ war falsch. Seit 11.11.2026
  liest der Dienst die Kategorien mit den Eventdaten,
  `site/data/ticketist-preise.json` ist nur noch der Rückfall und wird von
  `npm run sync:termine` erzeugt. Alle kommenden Abende haben ihre Preise,
  auch die 20 ab Jänner 2027. Hannah schickt nichts, mit Markus ist nichts
  zu klären.
- **Marken-Subdomain bei Brevo** (Hinweis von Markus): Brevo schlägt eine
  Sende-Subdomain vor; `mail.` ist bei beiden Domains der Hetzner-Mailserver
  (A-Eintrag, Ziel des MX) und darf kein CNAME werden. Festgelegt: `post.`
  (`post.wirtschaft-dornbirn.at`, `post.eugen.family`), nur falls Brevo den
  Schritt verlangt – für die Beglaubigung sind die vier Einträge genug.
