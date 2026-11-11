# Mailadressen, Domain und Hosting · Checkliste und Plan

Stand 11. November 2026. Für Hannah, Sarah, Wolfgang und den Programmierer.
Alles hier wurde am 11.10. direkt im Code, in der Konfiguration des Dienstes
und im laufenden Betrieb nachgeprüft, die Punkte zu Mails, Brevo und Domain
erneut am 10.11.2026 – nicht aus dem Gedächtnis geschrieben.
Die Etappen des Umzugs selbst stehen in `uebergabe-wirtschaft.md`; dieses
Blatt beantwortet drei Fragen: **Welche Adresse ist wo hinterlegt? Was
passiert automatisch, wenn jemand schreibt? Wo soll das Ganze laufen –
heute und in den nächsten Jahren?**

---

## 1. Auf einen Blick – die Ampel

| | Punkt | Stand |
|---|---|---|
| 🟢 | Adresse des Hauses auf allen Seiten (Impressum, Datenschutz, Kontakt, Anfrageformulare, Push) | `willkommen@wirtschaft-dornbirn.at` – überall gleich geschrieben, keine Tippfehler |
| 🟢 | Anfragen von Locations und Agentur landen beim Haus | gehen seit 10.11.2026 an `uri@eugen.family` (Hausentscheid vom 03.11.), seit 11.11. auch dann, wenn der Dienst einmal nicht antwortet; Antwort darauf geht direkt an den Gast. Eine erste Testanfrage durch das Haus steht noch aus |
| 🟢 | Alle automatischen Antworten an Gäste | sieben Texte im Wortlaut des Hauses, geprüft mit echten Testmails |
| 🟢 | Laufende Kosten | 0 € im Monat für Seite, Dienst, Testumgebung und Mailversand; wie bisher nur das Hetzner-Paket (Domain, Postfächer, alte Seite) und die Gebühren von Ticketist |
| 🟡 | **Absenderadresse der automatischen Mails** | heute die private Adresse von Jonas → muss `willkommen@wirtschaft-dornbirn.at` werden. Die Einträge bei Hetzner sind gesetzt (beide Domains, von außen geprüft am 10.11.2026); es fehlen *Authenticate* im Brevo-Konto des Hauses und dessen Schlüssel im Dienst (Abschnitt 4.2) |
| 🟢 | **Tageszettel, Wochenbericht, Bestellmeldungen ans Haus** | seit 27.10.2026 an `veranstaltungen@` bzw. `service@` (Hausentscheid); die gewünschte Kopie an Jonas ist vorbereitet, aber noch nicht eingeschaltet |
| 🟡 | Konten (GitHub, Cloudflare, Brevo) | gehören heute Jonas → die Konten des Hauses bei Brevo und GitHub hat Sarah Anfang November angelegt; Cloudflare fehlt noch (Etappe 1 der Übergabe) |
| 🔴 | Domain zeigt noch auf die alte WordPress-Seite | Umzug ist vorbereitet (Etappe 6), noch nicht gemacht |

Nichts davon ist ein Fehler im Code. Die zwei gelben und der rote Punkt sind
genau die Übergabe – sie lassen sich erst erledigen, wenn die Konten des
Hauses bestehen.

---

## 2. Welche Mailadresse wo hinterlegt ist

Geprüft am 11.10.2026 über alle Seiten, Skripte, Daten und die
Konfiguration des Dienstes (`server/wrangler.jsonc`, beide Umgebungen); die
Änderungen seither sind mit Datum nachgetragen.

### 2.1 Adressen des Hauses und der Partner

| Adresse | Wo sie steht | Wozu | Stand |
|---|---|---|---|
| **willkommen@wirtschaft-dornbirn.at** | Impressum, Datenschutz, Kontaktzeile auf Startseite, Termine, Reservierung, Takeaway, Locations, Agentur | Kontakt für Gäste | 🟢 richtig |
| | `lieferservice.js` | Hinweis beim alten Lieferservice | 🟢 richtig |
| | Dienst, Variable `VAPID_KONTAKT` | Kontakt für den Push-Dienst der Browser (Pflichtfeld, sieht kein Gast) | 🟢 richtig |
| **uri@eugen.family** | Partnerblock „emma & eugen“ im Fuß von Startseite, Termine, Reservierung, Takeaway, Locations, Agentur; `data/termine.json` (Veranstalter) | Kontakt des Veranstalters der Abende (Ticketist) | 🟢 richtig – bleibt so (Hausentscheid 27.10.2026) |
| | Dienst, Variable `ANFRAGE_MAIL` (Produktion und Probe) | **Empfänger** jeder Anfrage von Locations und Agentur – entschieden am 03.11., eingestellt seit 10.11.2026 (vorher `willkommen@`) | 🟢 richtig |
| | `feste-catering.js`, `agentur.js` | Ausweg, wenn der Dienst nicht erreichbar ist: das Formular öffnet eine Mail an diese Adresse – seit 11.11.2026 (vorher `willkommen@`) | 🟢 richtig |
| **kulturhaus@dornbirn.at** · +43 5572/27770 | Locations → Kulturhaus-Saal | Kontakt des Partners | 🟢 richtig |
| **dsb@dsb.gv.at** | Datenschutz | Datenschutzbehörde, gesetzlich | 🟢 richtig |
| **+43 5572 20 540** | Impressum, Kontaktzeilen, Takeaway, Reservierung | Telefon des Hauses | 🟢 richtig |
| **+43 664 230 65 87** | Partnerblock „emma & eugen“ | Telefon des Veranstalters | 🟢 wie `uri@` |
| +43 660 1234567 | Takeaway- und Reservierungsformular | nur Beispiel im leeren Telefonfeld (Platzhalter) | 🟢 kein Fehler |

### 2.2 Adressen, die noch an Jonas hängen

| Adresse / Konto | Wo | Wozu | Ziel |
|---|---|---|---|
| die Adresse von Jonas (bis 27.10.) | Dienst, Variable `WIRT_MAIL` (Produktion und Probe) | Empfänger von Tageszettel (werktags 08:00) und Wochenbericht (Freitag 15:00) | **erledigt 27.10.2026**: `veranstaltungen@wirtschaft-dornbirn.at` |
| – | Dienst, Variable `TAKEAWAY_MAIL` (**neu**) | Empfänger jeder einzelnen Takeaway-Bestellung | **erledigt 27.10.2026**: `service@wirtschaft-dornbirn.at` |
| die Adresse von Jonas | Dienst, Geheimnis `WIRT_MAIL_KOPIE` (**neu**) | Kopie von Tageszettel und Wochenbericht, solange Jonas die technische Betreuung macht (Wunsch des Hauses vom 03.11.2026) | **vorbereitet, noch nicht gesetzt** – Jonas setzt es selbst; bis dahin gibt es keine Kopie |
| **die private Adresse von Jonas** | Dienst, Geheimnis `BREVO_ABSENDER` | **Absender** aller automatischen Mails. Ihr Anbieter verbietet fremden Versand (DMARC „reject“) – darum landen Mails heute bei Gmail und Outlook oft im Spam oder gar nicht | → `willkommen@wirtschaft-dornbirn.at`, sobald beide Domains im Brevo-Konto des Hauses beglaubigt sind und dessen Schlüssel im Dienst liegt – **Etappe 4** |
| Konto Cloudflare `jonas-gamper` | Dienst läuft unter `…jonas-gamper.workers.dev`, Seite unter `wirtschaft-dornbirn.pages.dev` | Betrieb | → Konto des Hauses mit `veranstaltungen@` (fehlt noch) – **Etappen 1 und 3** |
| Konto GitHub `jonasgamper-create` | Quellcode, tägliche Prüfung 07:30 (Fehlermail an den Besitzer des Repositories) | Betrieb | → Organisation „wirtschaft-dornbirn“ – **Etappe 2**; ein GitHub-Konto des Hauses hat Sarah Anfang November angelegt |
| Konto Brevo | Mailversand, Schlüssel `BREVO_KEY` | Betrieb | → Konto des Hauses, **angelegt** (Sarah, Anfang November), beide Domains eingetragen; nach *Authenticate* dessen Schlüssel als `BREVO_KEY` hinterlegen – **Etappe 4** |

`npm run check:uebergabe` zeigt diese Punkte als Ampel; am 10.11.2026 waren
6 von 8 offen (erledigt: Tageszettel und Bestellmeldung ans Haus), wie
erwartet vor der Übergabe.

### 2.3 Das Entscheidungsblatt – ausgefüllt

Hannah hat das **Entscheidungsblatt**
(`docs/pdf/Mailadressen-Entscheidungsblatt-wirtschaft.pdf`, erzeugt mit
`npm run formular:mail`) am 27.10.2026 ausgefüllt und die offenen Fragen
dazu am 03.11.2026 beantwortet. Daraus hat der Programmierer die Adressen
für `WIRT_MAIL`, `TAKEAWAY_MAIL` und `ANFRAGE_MAIL` übernommen; der
Brevo-Absender folgt in Etappe 4. Was entschieden wurde, steht in
`docs/mailadressen-entscheidung.md` – nichts wird geraten.

### 2.4 Welche Postfächer das Haus braucht – nicht mehr

| Postfach | Wozu | Wer liest |
|---|---|---|
| **willkommen@wirtschaft-dornbirn.at** | besteht. Gästekontakt auf der Seite; Hausabsender und damit Antwortadresse der automatischen Mails ohne eigenen Absender je Zweck, sobald der Absender umgestellt ist. Die Anfragen von Locations/Agentur gehen seit 10.11.2026 an `uri@eugen.family` (Postfach von Emma & Eugen) | täglich: Service / Büro |
| **veranstaltungen@wirtschaft-dornbirn.at** | besteht. Inhaber aller Konten (GitHub, Cloudflare, Brevo), Rechnungen, Warnmails der Anbieter – und Empfänger des Tageszettels (Hausentscheid 27.10.2026) | Hannah; Sarah als Vertretung |
| **service@wirtschaft-dornbirn.at** | besteht. Tischreservierungen und Take Away; Empfänger jeder Bestellmeldung | Service |

Mehr braucht es nicht. Kein Google Workspace, kein Microsoft 365 – die
Postfächer bei Hetzner sind im bestehenden Paket enthalten.

---

## 3. Wenn eine Anfrage kommt – was automatisch passiert

Alle automatischen Mails kommen vom Dienst über Brevo. Der Gast sieht als
Absender **„Wirtschaft Dornbirn“** mit der Adresse aus `BREVO_ABSENDER`
(heute noch die private Adresse von Jonas, Ziel `willkommen@`). Die Texte
stehen in `server/src/mail.mjs`; drei davon (Takeaway, Reservierung,
Warteliste) im genauen Wortlaut, den das Haus am 06.10. vorgegeben hat.

| Anlass | Der Gast bekommt sofort | Antwortet der Gast auf die Mail, landet das bei | Das Haus bekommt |
|---|---|---|---|
| **Tisch reserviert** (Mittagstisch) | „Tisch reserviert: ‹Tag, Zeit›“ – vielen dank für die reservierung! mit Name, Telefon, E-Mail, Reservierungszeit, Personenanzahl, Absage-Link, Kalendereintrag | Absenderadresse (künftig je Zweck: Reservierung und Takeaway `service@`, Warteliste eines Abends `veranstaltungen@` bzw. `tickets@eugen.family`, sonst `willkommen@`) | Push aufs Handy; Reservierung in der Wirt-Ansicht (Reiter heute); im Tageszettel um 08:00 an `WIRT_MAIL` |
| **Takeaway bestellt** | „Danke für deine Bestellung – Nr. …“ – vielen dank für die bestellung! mit Speisen, Bestellnummer, Name, Telefon, E-Mail, Abholzeit, Bezahlart, Gesamtpreis, Abholort, Status-Link | wie oben | Push; **Mail** „Takeaway Nr. …: Name, Zeit – Speisen“ an `TAKEAWAY_MAIL` (`service@`); Bestellung in der Wirt-Ansicht |
| **Warteliste für einen Abend** | „Warteliste: ‹Abend›“ – vielen dank für deinen eintrag … ausverkauft … nicht garantiert, mit Veranstaltung, Datum, Name, Telefon, E-Mail, Ticketkategorie, Anzahl, Austragen-Link | wie oben | Push; Eintrag in der Wirt-Ansicht (Reiter warteliste). Kommen Karten zurück: Haus tippt „alle verständigen“ → Gast bekommt „Wieder Karten: ‹Abend›“ |
| **Warteliste Mittagstisch** (Tag voll) | Eintrag ohne Mail | – | Wird ein Tisch frei, bekommt der Erste, für den der Platz passt, „Frei geworden: ‹Tag› mittags“ |
| **Anfrage Locations** (Feste, Catering) oder **Agentur** | „Danke für eure Anfrage – „wirtschaft“ Dornbirn“ mit allen Angaben | **`uri@eugen.family`** (Antwortadresse bewusst gesetzt) | Push; **Mail** „Anfrage Feste/Agentur: ‹Betreff›“ an **`ANFRAGE_MAIL` = `uri@eugen.family`** (seit 10.11.2026; vorher `willkommen@`) – **Antwortadresse ist der Gast**: auf diese Mail einfach „Antworten“ drücken, und die Antwort geht an den Gast. Zusätzlich in der Wirt-Ansicht → haus → Anfragen; „erledigt“ tippen; nach 90 Tagen gelöscht |
| **Newsletter** | „Bitte bestätige deine Anmeldung“ (Double-Opt-in); danach montags 07:15 „Die Wochenkarte der Wirtschaft ist da“ | wie oben | nichts |
| **Mittag abgesagt** (haus → Zusperren → „Mittag absagen“) | Absage mit Grund; wer nur Telefon hat, steht in einer Anrufliste | wie oben | – |
| **Tickets gekauft** | **kommt von Ticketist**, nicht von uns | Ticketist / Veranstalter | nichts – die Abende holt der Dienst um 06:00 und 12:00 von den Eventseiten |
| **Mail direkt an willkommen@** (ohne Webseite) | **keine automatische Antwort** – so entschieden | – | liest das Haus |

**Für die direkte Mail an willkommen@:** Ein Autoresponder im Postfach war
vorgeschlagen; das Haus hat ihn abgelehnt (Entscheidungsblatt, Frage B9).
Bei Hetzner wird dafür also nichts eingestellt.

**Was das Haus selbst bekommt – Übersicht**

| Wann | Was | An |
|---|---|---|
| sofort | Takeaway-Bestellung | `TAKEAWAY_MAIL` (`service@`) |
| sofort | Anfrage Locations/Agentur (Antwortadresse = Gast) | `ANFRAGE_MAIL` (`uri@eugen.family`) |
| werktags 08:00 | Tageszettel: Reservierungen, Vorbestellungen, Hinweis „KARTE FEHLT“ | `WIRT_MAIL` (`veranstaltungen@`) |
| Freitag 15:00 | Wochenbericht: Gäste, Portionen | `WIRT_MAIL` (`veranstaltungen@`) |
| täglich 07:30 | nur bei Fehler: Prüfmail von GitHub | Besitzer des Repositories (künftig `veranstaltungen@`) |
| sofort | Push aufs Handy: Bestellung, Reservierung, Anfrage, „wieder Karten“, neuer Abend | jedes Gerät mit „Klingeln“ |

Die gewünschte Kopie von Tageszettel und Wochenbericht an Jonas ist
vorbereitet (Geheimnis `WIRT_MAIL_KOPIE`), aber noch nicht eingeschaltet –
bis dahin geht beides nur an `veranstaltungen@`.

Geprüft am 06.–08.10.: Reservierungsbestätigung und Tageszettel kamen
pünktlich an; zwei Fehler, die vorher Mails unterdrückt hatten, sind
behoben (Übergabeprotokoll). Den Tageszettel an `veranstaltungen@` meldet
Brevo am 4., 5., 6., 9. und 10.11.2026 als zugestellt.

---

## 4. Domain – was anzumelden ist und was nicht

**Es muss nichts Neues registriert werden.** `wirtschaft-dornbirn.at`
besteht, liegt bei Hetzner (Nameserver `hydrogen/oxygen/helium.ns.hetzner`)
und läuft weiter wie bisher. Was fehlt, sind Einträge *in* der Domain.

### 4.1 Einmal prüfen (Hannah, 15 Minuten)

- [x] **Wer ist Inhaber der Domain?** Bestätigt im Entscheidungsblatt
      (27.10.2026): „wirtschaft“ cafe restaurant bar Wolfgang Preuß e.U.,
      Registrar ist Hetzner – kein Inhaberwechsel nötig. Das war der
      wichtigste Punkt dieses Blattes: wem die Domain gehört, dem gehört
      die Adresse der Webseite.
- [x] **Kontaktadresse beim Registrar**: entschieden am 27.10.2026 auf
      `willkommen@wirtschaft-dornbirn.at` und eine private Reserveadresse von
      Hannah (sie steht im ausgefüllten Entscheidungsblatt, nicht in diesem
      öffentlichen Verzeichnis).
      Ursprünglich vorgeschlagen war `web@wirtschaft-dornbirn.at`
      stellen – dorthin kommen Verlängerungsrechnungen und Warnungen.
      Niemals eine Adresse der eigenen Domain *allein*: ist die Domain weg,
      ist das Postfach weg. Als zweite Adresse eine private von Hannah
      hinterlegen.
- [x] **Verlängerung**: Laufzeit ein Jahr, Bankeinzug, bezahlt bis August
      2027 (Entscheidungsblatt). Die Domain ist Teil des Hetzner-Pakets.
- [x] **Zugang zur DNS-Verwaltung** bei Hetzner (DNS Console) – Sarah hat
      ihn und hat damit Anfang November mit Markus die Einträge für Brevo
      gesetzt (Etappe 4). Für die Etappen 5 und 6 braucht ihn der
      Programmierer noch einmal.

### 4.2 Einträge, die dazukommen (Programmierer, mit Sarah)

| Wann | Eintrag | Wozu |
|---|---|---|
| Etappe 4 – **erledigt** | **vier Einträge von Brevo** (Bestätigungscode, zwei DKIM, DMARC) aus dem Brevo-Konto des Hauses – gesetzt für `wirtschaft-dornbirn.at` und `eugen.family` (Sarah mit Markus, Anfang November; von außen geprüft am 10.11.2026) | Danach darf Brevo als `willkommen@wirtschaft-dornbirn.at` senden; Gmail und Outlook nehmen die Mails an – sobald die Schritte unter dieser Tabelle erledigt sind |
| Etappe 4 – **erledigt** | SPF ergänzt: aus `v=spf1 a mx ~all` wurde `v=spf1 a mx include:spf.brevo.com ~all` (beide Domains, geprüft am 10.11.2026) | Gleiches Ziel |
| Etappe 5 | `neu` · CNAME · `<projekt>.pages.dev` | die **echte** neue Seite unter `neu.wirtschaft-dornbirn.at` (keine Probe: wer dort bucht, hat gebucht), bevor die Hauptadresse umzieht; noch nicht eingerichtet |
| Etappe 6 | Alle Unteradressen, die heute am Platzhalter `*` hängen (gutscheine, lieferservice, webmail, autodiscover, ftp, shop, test), **einzeln** als A-Eintrag auf `78.47.8.180` anlegen | Sie funktionieren nach dem Umzug weiter |
| Etappe 6 | Zone zu Cloudflare: alle Einträge aus dem Anhang der Übergabe übernehmen, dann beim Registrar die **Nameserver** auf die zwei von Cloudflare stellen. **Die Domain bleibt bei Hetzner registriert** – nur die Verwaltung der Einträge zieht um | Apex `wirtschaft-dornbirn.at` auf die neue Seite |
| 2027 | DMARC von `p=none` auf `p=quarantine` | Schutz vor Fälschungen im Namen des Hauses, sobald drei Monate lang nur Brevo und Hetzner senden |

**Noch offen in Etappe 4, in dieser Reihenfolge:**

1. *Authenticate* für beide Domains im Brevo-Konto des Hauses (Sarah).
2. Ein API-Schlüssel aus diesem Konto, den Jonas gemeinsam mit Sarah als
   Geheimnis `BREVO_KEY` im Dienst hinterlegt – nicht per Mail oder Chat.
   Grund: Der Dienst sendet heute über das Brevo-Konto von Jonas, und dort
   sind die Domains des Hauses nicht beglaubigt. Ein zweiter Benutzer im
   Brevo-Konto kostete laut Brevo 9 € im Monat, der Schlüssel nichts.
3. Erst dann `BREVO_ABSENDER` = `willkommen@wirtschaft-dornbirn.at` und die
   Absender je Zweck (`docs/mailadressen-entscheidung.md`, Abschnitt 5).
   Umgekehrt verschickt Brevo gar nichts mehr.

Bis Schritt 2 erledigt ist, zeigen `/api/mail/domain` und
`/api/mail/pruefung` das Brevo-Konto von Jonas, nicht das des Hauses.
Maßgeblich für *Authenticate* ist die Anzeige im Brevo-Konto des Hauses.

**Was nicht nötig ist:** zusätzliche Domains (`.com`, `.de`), ein zweiter
Mailanbieter, SSL-Zertifikate kaufen (Cloudflare und GitHub stellen sie
kostenlos aus), ein Umzug der Domain zu einem anderen Registrar.

---

## 5. Wo das Ganze laufen soll – Top 3

Die Seite ist statisch (HTML, CSS, JavaScript, ein JSON mit Terminen). Der
Reservierungsdienst ist ein kleines Programm mit eigener Datenbank, das auf
Cloudflare Workers geschrieben ist. Mails versendet Brevo. Das bestimmt die
Auswahl: wer die drei Teile **gratis und ohne Server, den jemand warten
muss** betreibt, gewinnt.

### 5.1 Webseite und Dienst

| Rang | Lösung | Kosten | Warum | Nachteil |
|---|---|---|---|---|
| **1 · Empfehlung** | **Cloudflare Pages + Workers**, DNS bei Cloudflare (so ist es heute gebaut) | **0 €/Monat**. Gratisstufe: 100 000 Aufrufe des Dienstes pro Tag, 500 Veröffentlichungen im Monat, Datenbank des Dienstes inklusive – das Haus braucht davon unter 5 % | Seite, Dienst, Zertifikat, DNS und Schutz vor Angriffen in **einem** Konto; Veröffentlichung in zwei Minuten; läuft seit Monaten so; alle Anleitungen und Prüfskripte passen | Die Zone muss zu Cloudflare (Etappe 6). Der Dienst ist Cloudflare-spezifisch – ein Wechsel kostete einen Programmierer etwa zwei Tage |
| 2 | **GitHub Pages** für die Seite + **Cloudflare Workers** für den Dienst, **DNS bleibt bei Hetzner** | 0 €/Monat | Läuft heute schon parallel als Ausweichweg; die Hauptadresse geht über vier A-Einträge bei Hetzner, **ohne** Nameserver-Wechsel | Zwei Anbieter, zwei Stellen für Zertifikat und Ausfallsuche; `github.io`-Adressen ändern sich bei der Übergabe des Repositories; keine Weiterleitungen (`_redirects`) für die 45 alten WordPress-Adressen – die müssten anders gelöst werden |
| 3 | **Hetzner Webspace** (dort liegt heute WordPress) für die Seite + Cloudflare Workers für den Dienst | 0 € zusätzlich (Paket besteht) | Ein Anbieter für Domain, Mail und Seite; vertraut | Veröffentlichen per SFTP von Hand oder mit zusätzlicher Automatik; keine Vorschau je Pull Request; Dienst trotzdem bei Cloudflare, also **kein** echter Ein-Anbieter-Vorteil. Nur sinnvoll, wenn Cloudflare irgendwann wegfällt |

**Nicht empfohlen:** Baukästen (Wix, Jimdo, Squarespace: 15–40 €/Monat,
Seite müsste neu gebaut werden, Reservierung und Takeaway gingen verloren),
ein eigener Server (ab 5 €/Monat plus jemand, der Updates einspielt),
Vercel/Netlify (gleichwertig, aber ein dritter Anbieter neben Cloudflare).

### 5.2 Mailversand (automatische Mails)

| Rang | Lösung | Kosten | Warum | Grenze |
|---|---|---|---|---|
| **1 · Empfehlung** | **Brevo Free** (so gebaut) | 0 € | 300 Mails am Tag; das Haus braucht an einem vollen Tag etwa 40–80 (Bestätigungen, Bestellmeldungen, Tageszettel) | Bei mehr als 300/Tag stoppt Brevo bis Mitternacht. Die Gratisstufe kann laut Preisliste einen kleinen Brevo-Hinweis in Mails setzen – beim Anmelden prüfen |
| 2 | Brevo Starter | 7 €/Monat für 5 000 Mails im Monat (Brevo-Preisliste, abgefragt am 10.11.2026) | gleiche Technik, kein Tageslimit; **nur umschalten**, kein Code | – |
| 3 | Resend oder Postmark | 0 € bis 3 000/Monat bzw. ca. 15 $/Monat | sehr gute Zustellung | Programmierer muss `mail.mjs` anpassen (ein halber Tag) |

### 5.3 Postfächer

Bleiben bei **Hetzner** – im Paket enthalten, 0 € zusätzlich. Ein Wechsel
zu Google Workspace oder Microsoft 365 (ab ca. 6–7 € je Postfach und Monat)
bringt nichts, was das Haus braucht.

### 5.4 Gesamtbudget je Jahr

| Posten | Betrag |
|---|---|
| Cloudflare (Seite, Dienst, Testumgebung), GitHub, Brevo (Mailversand) | 0 €, heute und nach dem Umzug |
| Hetzner-Paket (Domain, bezahlt bis August 2027; Postfächer; alte Seite) | wie bisher. Nach dem Umzug fällt es **nicht ganz weg**: die Postfächer bleiben, `gutscheine.` und `lieferservice.` laufen dort weiter. Nach Etappe 7 kann Hannah prüfen, ob eine kleinere Stufe reicht – **Postfächer und Domain dürfen dabei nicht wegfallen** |
| Ticketist | Gebühren wie bisher |
| Später, nur bei Bedarf | Brevo Starter 7 €/Monat (erst über 300 Mails am Tag); Cloudflare Workers Paid 5 USD/Monat (erst ab 100 000 Aufrufen am Tag oder einem sechsten Zeitplan – heute unter 5 % genutzt) |
| Programmierer | 2–6 Stunden im Jahr für Pflege (Abschnitt 6); dazu, was das Haus an Änderungen wünscht |

---

## 6. Plan für die nächsten Jahre

### Jetzt – Oktober bis November 2026

- [ ] Etappe 1: Konten des Hauses auf `veranstaltungen@`, mit
      Zwei-Faktor-Anmeldung, zwei Personen bei GitHub und Cloudflare (bei
      Brevo kein zweiter Benutzer, 9 € im Monat) – Brevo und GitHub
      hat Sarah Anfang November angelegt, Cloudflare fehlt noch
- [ ] Etappen 2–4: Programmierer übernimmt Code, Dienst, Daten (`WIRT_MAIL`
      steht seit 27.10. auf der Hausadresse); nach *Authenticate* den
      Schlüssel des Hauses als `BREVO_KEY` hinterlegen, dann den
      Brevo-Absender auf `willkommen@` (Abschnitt 4.2)
- [x] Hannah: Domain-Prüfung aus Abschnitt 4.1 (Entscheidungsblatt,
      27.10.2026); ein Autoresponder im Postfach entfällt – so entschieden
- [ ] Generalprobe auf der Testseite https://probe-wirtschaft-dornbirn.pages.dev
      (immer Testbetrieb: eigene Daten, keine Mails) – Hannah und Wolfgang
      gehen alles durch (Reservieren, Takeaway, Warteliste, Anfrage)
- [ ] Etappe 5: die echte neue Seite unter `neu.wirtschaft-dornbirn.at`
      einrichten – keine Probe mehr, wer dort bucht, hat gebucht
- [ ] Programmierer entfernt die Testeinträge („TEST“) in der Produktion
- [ ] Etappe 6: Umzug der Domain an einem ruhigen Tag (Montag früh, nicht
      vor einem Abend mit Vorverkauf)
- [ ] Etappe 7 nach zwei bis vier Wochen: alte Adressen, QR-Codes, Google-
      Eintrag, Instagram-Link geprüft; Jonas' Zugänge entfernt

### Jedes Quartal (Hannah, 20 Minuten)

- [ ] Wirt-Ansicht → haus: Hinweis, Öffnungszeiten, Anfragen – nichts Altes?
- [ ] Stichprobe: eine Testreservierung mit eigener Mail; kommt die
      Bestätigung, auch bei Gmail? (danach in der Wirt-Ansicht löschen)
- [ ] Programmierer: Sicherung der Daten des Dienstes ziehen (ein Befehl,
      Betriebshandbuch) und im Büro ablegen

### Jedes Jahr (Hannah + Programmierer, 2–4 Stunden)

- [ ] Rechnung der Domain bezahlt, Kontaktadresse stimmt, Verlängerung an
- [ ] Alle Konten: Wer hat Zugang? Ausgeschiedene Personen entfernen,
      Wiederherstellungscodes noch im Büro?
- [ ] Impressum, Datenschutz, Preise der Abende, Öffnungszeiten der Küche
      lesen – stimmt alles noch?
- [ ] Programmierer: Abhängigkeiten und Node-Version aktualisieren,
      `npm run ci`, Pull Request, zusammenführen; Gratisstufen der Anbieter
      prüfen (sie ändern sich alle paar Jahre) und Mailmenge bei Brevo
- [ ] Einmalig 2027: DMARC auf `quarantine`; Hetzner-Paket verkleinern,
      wenn WordPress nicht mehr gebraucht wird (Postfächer behalten, und
      `gutscheine.` und `lieferservice.` laufen dort weiter!)

### Entscheidungen, die bewusst offen bleiben

| Thema | Stand | Wann ansehen |
|---|---|---|
| **Automatische Tischbremse** (Dienst sagt „voll“, bevor das Haus es meldet) | aus; das Haus meldet Tage selbst voll | wenn mittags regelmäßig überbucht wird |
| **Eigenes Ticketing** statt Ticketist | Analyse liegt vor, zurückgestellt | wenn die Gebühren von Ticketist oder die Warteliste stören |
| **Newsletter stärker nutzen** (Abende, nicht nur Wochenkarte) | Technik steht | wenn jemand im Haus die Texte schreibt |
| **Zweite Stufe bei Brevo** | nicht nötig | wenn mehr als 300 Mails an einem Tag anfallen oder der Brevo-Hinweis stört |

### Wann handeln – die Warnzeichen

- Mail von Brevo „Tageslimit erreicht“ → Starter-Stufe buchen (7 €/Monat;
  im Brevo-Konto des Hauses, Sarah oder Hannah, 5 Minuten, kein Code)
- Mail von GitHub „termine-abgleich failed“ → Programmierer; meist hat sich
  die Eventseite oder Ticketist geändert
- Gäste melden „keine Bestätigung“ → Spam-Ordner fragen; dann Brevo-Absender
  prüfen (Abschnitt 2.2)
- Domain-Rechnung offen → sofort zahlen; eine abgelaufene .at-Domain nimmt
  Webseite **und** alle Postfächer mit

---

## 7. Änderungen an der Webseite – wie am besten vorgehen

Drei Wege, von leicht nach schwer; ausführlich in `uebergabe-wirtschaft.md`,
Abschnitt 7, und im Handbuch fürs Haus.

| Was ändern | Wer | Wie | Dauer |
|---|---|---|---|
| Hinweis oben auf der Startseite, Wochenkarte, Öffnungszeiten, Zusperren, Tag voll, eigene Termine, Tische | **alle im Haus** | Wirt-Ansicht am Handy; wirkt sofort | 1 Minute |
| Ticketkategorien und Preise der Abende | **wer Ticketist bedient** (heute Hannah) | nur in Ticketist ändern – die Seite liest sie seit 11.11.2026 von selbst; niemand muss etwas schicken | spätestens 12 Stunden bis zur Seite |
| Ein Satz, eine Überschrift, eine Telefonnummer auf einer Seite | **Hannah** | GitHub im Browser: Datei in `site/` öffnen → Stift → Text zwischen den spitzen Klammern ändern → „Create a new branch and start a pull request“ → warten bis grün → „Merge“. Nie direkt in `main`. Rückgängig: „Revert“ | 10 Minuten + 3 Minuten bis live |
| Neue Seite, Bilder, Aufbau, Formulare, Fehler, neue Mailtexte | **Programmierer** | Auftrag per Mail an ihn: Seite, Stelle (Screenshot), was stattdessen stehen soll – **ein Wunsch je Punkt**. Er arbeitet im Repository, prüft mit `npm run ci`, Pull Request, grün, zusammenführen, ausrollen | je nach Wunsch; Kleinigkeiten unter einer Stunde |

**Fünf Regeln, die alles einfach halten**

1. **Nie direkt auf `main`** – immer über einen Pull Request. Die automatische
   Prüfung (über 30 Kontrollen: kaputte Links, Dialoge, Buchungslinks,
   Kalender, Datenschutz) läuft bei jedem Pull Request und hält Fehler
   von der Seite fern. Rot = nicht zusammenführen.
2. **Eine Änderung je Pull Request.** So lässt sich jede einzeln rückgängig
   machen (Knopf „Revert“) – ohne Programmierer.
3. **Texte der automatischen Mails** ändert nur der Programmierer in
   `server/src/mail.mjs`; sie werden danach in der Probe-Umgebung mit einer
   echten Testmail geprüft, bevor sie in Produktion gehen.
4. **Nichts Neues einbauen, das Daten sammelt** – keine Tracker, keine
   Plugins, keine Zahlungslogik, keine fremden Schriften. Das hält Datenschutz
   und Ladezeit sauber und ist in `CLAUDE.md` und `docs/` festgeschrieben.
5. **Produktion nie zum Testen** – dafür gibt es die Testseite
   https://probe-wirtschaft-dornbirn.pages.dev (immer Testbetrieb, eigene
   Daten, keine Mails; Übergabe Abschnitt 6). Auf der echten Seite schaltet
   `?probe=1` nur den einen Tab auf den Testdienst. Die Kopie auf GitHub
   Pages ist keine Testseite – sie spricht mit dem echten Dienst. Takeaway
   in Produktion nur mit echter Bestellung.

**Mit oder ohne KI:** Beide Wege sind unabhängig von einem KI-Abo. Will der
Programmierer eine KI einsetzen, gibt es einen fertigen Arbeitsauftrag in
`docs/claude-master-prompt.md` – mit denselben Regeln wie oben.

---

## 8. Die Checkliste zum Abhaken

**Hannah**

- [x] ~~Postfach `web@wirtschaft-dornbirn.at`~~ – entfällt, es wird `veranstaltungen@` genommen (27.10.2026)
- [x] Domain-Prüfung (Inhaber, Kontaktadresse, Verlängerung) – Abschnitt 4.1, mit dem Entscheidungsblatt (27.10.2026)
- [ ] Konten GitHub, Cloudflare, Brevo mit `veranstaltungen@` und Zwei-Faktor; bei GitHub und Cloudflare zwei Personen (Hannah, Sarah) – Brevo und GitHub hat Sarah angelegt, Cloudflare fehlt noch
- [ ] Programmierer einladen (GitHub Owner, Cloudflare Administrator, Hetzner DNS). Bei Brevo **kein** zweiter Benutzer (kostet laut Brevo 9 € im Monat), stattdessen der Schlüssel – siehe Sarah
- [x] Autoresponder im Postfach `willkommen@` – entfällt, so entschieden (keine automatische Antwort)
- [ ] Einmal selbst eine Testanfrage über „Locations“ auf der neuen Seite https://wirtschaft-dornbirn.pages.dev schicken (nicht auf der Testseite, dort geht keine Mail hinaus): kommt sie bei `uri@eugen.family` an? Seit der Umstellung am 10.11. kam dort noch keine echte Anfrage an
- [ ] Generalprobe auf der Testseite https://probe-wirtschaft-dornbirn.pages.dev mit Wolfgang durchspielen
- [ ] Nach dem Umzug: Google-Unternehmensprofil, Instagram, Speisekarten-QR prüfen

**Sarah** (Brevo-Konto des Hauses)

- [x] Konten bei Brevo und GitHub angelegt; mit Markus die Einträge beider Domains bei Hetzner gesetzt (Anfang November, von außen geprüft am 10.11.2026)
- [ ] *Authenticate* für `wirtschaft-dornbirn.at` und `eugen.family`, bis beide als beglaubigt angezeigt werden
- [ ] Danach einen API-Schlüssel erzeugen und ihn gemeinsam mit Jonas im Dienst hinterlegen – nicht per Mail oder Chat

**Programmierer**

- [ ] Repository übernehmen, `npm run ci` grün
- [ ] Dienst im Konto des Hauses ausrollen, Daten einspielen, Geheimnisse neu
- [x] `WIRT_MAIL` → `veranstaltungen@`, `TAKEAWAY_MAIL` → `service@` (27.10.2026); `ANFRAGE_MAIL` → `uri@eugen.family` (eingestellt seit 10.11.2026, der Notweg der Formulare seit 11.11.)
- [ ] Kopie von Tageszettel und Wochenbericht an Jonas: Geheimnis `WIRT_MAIL_KOPIE` – vorbereitet, noch nicht gesetzt (setzt Jonas selbst); bis dahin keine Kopie
- [ ] Brevo: Einträge gesetzt (Sarah mit Markus); nach *Authenticate* den Schlüssel des Hauses als `BREVO_KEY` hinterlegen (gemeinsam mit Sarah), **erst dann** `BREVO_ABSENDER` → `willkommen@` und die Absender je Zweck;
      Testmail an eine Gmail-Adresse: kommt im Posteingang an, nicht im Spam
- [ ] Testeinträge „TEST“ aus der Produktion entfernen
- [ ] Unteradressen sichern, Zone zu Cloudflare, Nameserver umstellen
- [ ] `npm run check:umzug`, `npm run check:uebergabe` – alles grün
- [ ] Jonas' Zugänge überall entfernen

**Wolfgang**

- [x] Entscheidung, welche Adresse Tageszettel und Bestellungen bekommt –
      entschieden am 27.10.2026: Tageszettel an `veranstaltungen@`,
      Bestellungen an `service@`
- [ ] Generalprobe anschauen und freigeben
- [ ] Tag für den Umzug festlegen
