# Mailadressen, Domain und Hosting · Checkliste und Plan

Stand 11. Oktober 2026. Für Hannah, Wolfgang und den Programmierer. Alles
hier wurde am 11.10. direkt im Code, in der Konfiguration des Dienstes und
im laufenden Betrieb nachgeprüft – nicht aus dem Gedächtnis geschrieben.
Die Etappen des Umzugs selbst stehen in `uebergabe-wirtschaft.md`; dieses
Blatt beantwortet drei Fragen: **Welche Adresse ist wo hinterlegt? Was
passiert automatisch, wenn jemand schreibt? Wo soll das Ganze laufen –
heute und in den nächsten Jahren?**

---

## 1. Auf einen Blick – die Ampel

| | Punkt | Stand |
|---|---|---|
| 🟢 | Adresse des Hauses auf allen Seiten (Impressum, Datenschutz, Kontakt, Anfrageformulare, Push) | `willkommen@wirtschaft-dornbirn.at` – 15 Stellen, alle gleich, keine Tippfehler |
| 🟢 | Anfragen von Locations und Agentur landen beim Haus | gehen an `willkommen@`; Antwort darauf geht direkt an den Gast |
| 🟢 | Alle automatischen Antworten an Gäste | sieben Texte im Wortlaut des Hauses, geprüft mit echten Testmails |
| 🟢 | Laufende Kosten | 0 € im Monat; nur die Domain wie bisher |
| 🟡 | **Absenderadresse der automatischen Mails** | heute `jonas.gamper@aon.at` → muss `willkommen@wirtschaft-dornbirn.at` werden (Abschnitt 4, braucht vier DNS-Einträge) |
| 🟡 | **Tageszettel, Wochenbericht, Bestellmeldungen ans Haus** | gehen heute an Jonas → auf eine Hausadresse umstellen (Abschnitt 2) |
| 🟡 | Konten (GitHub, Cloudflare, Brevo) | gehören heute Jonas → Hannah legt sie mit `web@` neu an (Etappe 1 der Übergabe) |
| 🔴 | Domain zeigt noch auf die alte WordPress-Seite | Umzug ist vorbereitet (Etappe 6), noch nicht gemacht |

Nichts davon ist ein Fehler im Code. Die drei gelben und der rote Punkt sind
genau die Übergabe – sie lassen sich erst erledigen, wenn die Konten des
Hauses bestehen.

---

## 2. Welche Mailadresse wo hinterlegt ist

Geprüft am 11.10.2026 über alle Seiten, Skripte, Daten und die
Konfiguration des Dienstes (`server/wrangler.jsonc`, beide Umgebungen).

### 2.1 Adressen des Hauses und der Partner

| Adresse | Wo sie steht | Wozu | Stand |
|---|---|---|---|
| **willkommen@wirtschaft-dornbirn.at** | Impressum, Datenschutz, Kontaktzeile auf Startseite, Termine, Reservierung, Takeaway, Locations, Agentur | Kontakt für Gäste | 🟢 richtig |
| | `feste-catering.js`, `agentur.js` | Ausweg, wenn der Dienst nicht erreichbar ist: das Formular öffnet eine Mail an diese Adresse | 🟢 richtig |
| | `lieferservice.js` | Hinweis beim alten Lieferservice | 🟢 richtig |
| | Dienst, Variable `ANFRAGE_MAIL` (Produktion und Probe) | **Empfänger** jeder Anfrage von Locations und Agentur | 🟢 richtig |
| | Dienst, Variable `VAPID_KONTAKT` | Kontakt für den Push-Dienst der Browser (Pflichtfeld, sieht kein Gast) | 🟢 richtig |
| **uri@eugen.family** | Partnerblock „emma & eugen“ im Fuß von Startseite, Termine, Reservierung, Takeaway, Locations, Agentur; `data/termine.json` (Veranstalter) | Kontakt des Veranstalters der Abende (Ticketist) | 🟢 richtig – mit Uri abstimmen, ob es so bleibt |
| **kulturhaus@dornbirn.at** · +43 5572/27770 | Locations → Kulturhaus-Saal | Kontakt des Partners | 🟢 richtig |
| **dsb@dsb.gv.at** | Datenschutz | Datenschutzbehörde, gesetzlich | 🟢 richtig |
| **+43 5572 20 540** | Impressum, Kontaktzeilen, Takeaway, Reservierung | Telefon des Hauses | 🟢 richtig |
| **+43 664 230 65 87** | Partnerblock „emma & eugen“ | Telefon des Veranstalters | 🟢 wie `uri@` |
| +43 660 1234567 | Takeaway- und Reservierungsformular | nur Beispiel im leeren Telefonfeld (Platzhalter) | 🟢 kein Fehler |

### 2.2 Adressen, die noch an Jonas hängen

| Adresse / Konto | Wo | Wozu | Ziel |
|---|---|---|---|
| **jonas.gamper@aon.at** | Dienst, Variable `WIRT_MAIL` (Produktion und Probe) | Empfänger von Tageszettel (werktags 08:00), Wochenbericht (Freitag 15:00) und jeder Takeaway-Bestellung | → `willkommen@wirtschaft-dornbirn.at` oder ein eigenes Postfach `buero@` – **Etappe 3** |
| **jonas.gamper@aon.at** | Dienst, Geheimnis `BREVO_ABSENDER` | **Absender** aller automatischen Mails. aon.at verbietet fremden Versand (DMARC „reject“) – darum landen Mails heute bei Gmail und Outlook oft im Spam oder gar nicht | → `willkommen@wirtschaft-dornbirn.at`, sobald die Domain bei Brevo bestätigt ist – **Etappe 4** |
| Konto Cloudflare `jonas-gamper` | Dienst läuft unter `…jonas-gamper.workers.dev`, Seite unter `wirtschaft-dornbirn.pages.dev` | Betrieb | → Konto des Hauses mit `web@` – **Etappen 1 und 3** |
| Konto GitHub `jonasgamper-create` | Quellcode, tägliche Prüfung 07:30 (Fehlermail an den Besitzer des Repositories) | Betrieb | → Organisation „wirtschaft-dornbirn“ – **Etappe 2** |
| Konto Brevo | Mailversand, Schlüssel `BREVO_KEY` | Betrieb | → Konto des Hauses – **Etappe 1 und 4** |

`npm run check:uebergabe` zeigt diese Punkte als Ampel; heute 7 von 7
offen, wie erwartet vor der Übergabe.

### 2.3 Welche Postfächer das Haus braucht – nicht mehr

| Postfach | Wozu | Wer liest |
|---|---|---|
| **willkommen@wirtschaft-dornbirn.at** | besteht. Gästekontakt, Anfragen von Locations/Agentur, Antwortadresse aller automatischen Mails | täglich: Service / Büro |
| **web@wirtschaft-dornbirn.at** | neu anlegen (Postfach oder Weiterleitung an Hannah). Inhaber aller Konten (GitHub, Cloudflare, Brevo), Rechnungen, Warnmails der Anbieter | Hannah; Wolfgang als Vertretung |
| *(optional)* **buero@** | wenn Tageszettel und Bestellmeldungen nicht in `willkommen@` liegen sollen | Küche / Büro |

Mehr braucht es nicht. Kein Google Workspace, kein Microsoft 365 – die
Postfächer bei Hetzner sind im bestehenden Paket enthalten.

---

## 3. Wenn eine Anfrage kommt – was automatisch passiert

Alle automatischen Mails kommen vom Dienst über Brevo. Der Gast sieht als
Absender **„Wirtschaft Dornbirn“** mit der Adresse aus `BREVO_ABSENDER`
(heute noch aon.at, Ziel `willkommen@`). Die Texte stehen in
`server/src/mail.mjs`; drei davon (Takeaway, Reservierung, Warteliste) im
genauen Wortlaut, den das Haus am 06.10. vorgegeben hat.

| Anlass | Der Gast bekommt sofort | Antwortet der Gast auf die Mail, landet das bei | Das Haus bekommt |
|---|---|---|---|
| **Tisch reserviert** (Mittagstisch) | „Tisch reserviert: ‹Tag, Zeit›“ – vielen dank für die reservierung! mit Name, Telefon, E-Mail, Reservierungszeit, Personenanzahl, Absage-Link, Kalendereintrag | Absenderadresse (künftig `willkommen@`) | Push aufs Handy; Reservierung in der Wirt-Ansicht (Reiter heute); im Tageszettel um 08:00 an `WIRT_MAIL` |
| **Takeaway bestellt** | „Danke für deine Bestellung – Nr. …“ – vielen dank für die bestellung! mit Speisen, Bestellnummer, Name, Telefon, E-Mail, Abholzeit, Bezahlart, Gesamtpreis, Abholort, Status-Link | wie oben | Push; **Mail** „Takeaway Nr. …: Name, Zeit – Speisen“ an `WIRT_MAIL`; Bestellung in der Wirt-Ansicht |
| **Warteliste für einen Abend** | „Warteliste: ‹Abend›“ – vielen dank für deinen eintrag … ausverkauft … nicht garantiert, mit Veranstaltung, Datum, Name, Telefon, E-Mail, Ticketkategorie, Anzahl, Austragen-Link | wie oben | Push; Eintrag in der Wirt-Ansicht (Reiter warteliste). Kommen Karten zurück: Haus tippt „alle verständigen“ → Gast bekommt „Wieder Karten: ‹Abend›“ |
| **Warteliste Mittagstisch** (Tag voll) | Eintrag ohne Mail | – | Wird ein Tisch frei, bekommt der Erste, für den der Platz passt, „Frei geworden: ‹Tag› mittags“ |
| **Anfrage Locations** (Feste, Catering) oder **Agentur** | „Danke für eure Anfrage – „wirtschaft“ Dornbirn“ mit allen Angaben | **`willkommen@`** (Antwortadresse bewusst gesetzt) | Push; **Mail** „Anfrage Feste/Agentur: ‹Betreff›“ an **`ANFRAGE_MAIL` = `willkommen@`** – **Antwortadresse ist der Gast**: auf diese Mail einfach „Antworten“ drücken, und die Antwort geht an den Gast. Zusätzlich in der Wirt-Ansicht → haus → Anfragen; „erledigt“ tippen; nach 90 Tagen gelöscht |
| **Newsletter** | „Bitte bestätige deine Anmeldung“ (Double-Opt-in); danach montags 07:15 „Die Wochenkarte der Wirtschaft ist da“ | wie oben | nichts |
| **Mittag abgesagt** (haus → Zusperren → „Mittag absagen“) | Absage mit Grund; wer nur Telefon hat, steht in einer Anrufliste | wie oben | – |
| **Tickets gekauft** | **kommt von Ticketist**, nicht von uns | Ticketist / Veranstalter | nichts – die Abende holt der Dienst um 06:00 und 12:00 von den Eventseiten |
| **Mail direkt an willkommen@** (ohne Webseite) | **keine automatische Antwort** – das kann nur das Postfach selbst | – | liest das Haus |

**Für die direkte Mail an willkommen@:** bei Hetzner im Postfach einen
Autoresponder einstellen (Text und Weg im Handbuch fürs Haus, Abschnitt 4).
Empfehlung: **nur eine Eingangsbestätigung** ohne Versprechen einer
Antwortzeit, damit nichts falsch wird, wenn das Postfach am Montag nicht
gelesen wird.

**Was das Haus selbst bekommt – Übersicht**

| Wann | Was | An |
|---|---|---|
| sofort | Takeaway-Bestellung | `WIRT_MAIL` |
| sofort | Anfrage Locations/Agentur (Antwortadresse = Gast) | `ANFRAGE_MAIL` |
| werktags 08:00 | Tageszettel: Reservierungen, Vorbestellungen, Hinweis „KARTE FEHLT“ | `WIRT_MAIL` |
| Freitag 15:00 | Wochenbericht: Gäste, Portionen | `WIRT_MAIL` |
| täglich 07:30 | nur bei Fehler: Prüfmail von GitHub | Besitzer des Repositories (künftig `web@`) |
| sofort | Push aufs Handy: Bestellung, Reservierung, Anfrage, „wieder Karten“, neuer Abend | jedes Gerät mit „Klingeln“ |

Geprüft am 06.–08.10.: Reservierungsbestätigung und Tageszettel kamen
pünktlich an; zwei Fehler, die vorher Mails unterdrückt hatten, sind
behoben (Übergabeprotokoll).

---

## 4. Domain – was anzumelden ist und was nicht

**Es muss nichts Neues registriert werden.** `wirtschaft-dornbirn.at`
besteht, liegt bei Hetzner (Nameserver `hydrogen/oxygen/helium.ns.hetzner`)
und läuft weiter wie bisher. Was fehlt, sind Einträge *in* der Domain.

### 4.1 Einmal prüfen (Hannah, 15 Minuten)

- [ ] **Wer ist Inhaber der Domain?** Auf der Rechnung des Registrars (meist
      Hetzner) nachsehen. Richtig: „wirtschaft“ cafe restaurant bar Wolfgang
      Preuß e.U. – **nicht** eine frühere Agentur, nicht eine Privatperson.
      Stimmt es nicht: beim Registrar einen Inhaberwechsel beantragen (bei
      .at-Domains über den Registrar, Formular der nic.at). Das ist der
      wichtigste Punkt dieses Blattes: wem die Domain gehört, dem gehört
      die Adresse der Webseite.
- [ ] **Kontaktadresse beim Registrar** auf `web@wirtschaft-dornbirn.at`
      stellen – dorthin kommen Verlängerungsrechnungen und Warnungen.
      Niemals eine Adresse der eigenen Domain *allein*: ist die Domain weg,
      ist das Postfach weg. Als zweite Adresse eine private von Hannah
      hinterlegen.
- [ ] **Automatische Verlängerung** eingeschaltet, Zahlungsmittel gültig.
      Eine .at-Domain kostet je nach Registrar rund 15–30 € im Jahr.
- [ ] **Zugang zur DNS-Verwaltung** bei Hetzner (DNS Console) – Hannah hat
      ihn, der Programmierer bekommt ihn für die Etappen 4 bis 6.

### 4.2 Einträge, die dazukommen (Programmierer, mit Hannah)

| Wann | Eintrag | Wozu |
|---|---|---|
| Etappe 4 | **vier Einträge von Brevo** (Bestätigungscode, zwei DKIM, DMARC) – Brevo zeigt sie nach „Domain hinzufügen“ an; sie sind kontospezifisch, deshalb **erst im Konto des Hauses** anlegen | Danach darf Brevo als `willkommen@wirtschaft-dornbirn.at` senden; Gmail und Outlook nehmen die Mails an |
| Etappe 4 | SPF ergänzen, wenn Brevo es verlangt: aus `v=spf1 a mx ~all` wird `v=spf1 a mx include:spf.brevo.com ~all` | Gleiches Ziel |
| Etappe 5 | `neu` · CNAME · `<projekt>.pages.dev` | Generalprobe unter `neu.wirtschaft-dornbirn.at`, bevor die Hauptadresse umzieht |
| Etappe 6 | Alle Unteradressen, die heute am Platzhalter `*` hängen (gutscheine, lieferservice, webmail, autodiscover, ftp, shop, test), **einzeln** als A-Eintrag auf `78.47.8.180` anlegen | Sie funktionieren nach dem Umzug weiter |
| Etappe 6 | Zone zu Cloudflare: alle Einträge aus dem Anhang der Übergabe übernehmen, dann beim Registrar die **Nameserver** auf die zwei von Cloudflare stellen. **Die Domain bleibt bei Hetzner registriert** – nur die Verwaltung der Einträge zieht um | Apex `wirtschaft-dornbirn.at` auf die neue Seite |
| 2027 | DMARC von `p=none` auf `p=quarantine` | Schutz vor Fälschungen im Namen des Hauses, sobald drei Monate lang nur Brevo und Hetzner senden |

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
| **1 · Empfehlung** | **Brevo Free** (so gebaut) | 0 € | 300 Mails am Tag; das Haus braucht an einem vollen Tag etwa 40–80 (Bestätigungen, Bestellmeldungen, Tageszettel) | Bei mehr als 300/Tag stoppt Brevo bis Mitternacht. Die Gratisstufe kann laut Preisliste einen kleinen Brevo-Hinweis in Mails setzen – beim Anmelden prüfen; die nächste Stufe (ab ca. 9 €/Monat) entfernt ihn |
| 2 | Brevo Starter | ab ca. 9 €/Monat | gleiche Technik, kein Tageslimit, kein Hinweis; **nur umschalten**, kein Code | – |
| 3 | Resend oder Postmark | 0 € bis 3 000/Monat bzw. ca. 15 $/Monat | sehr gute Zustellung | Programmierer muss `mail.mjs` anpassen (ein halber Tag) |

### 5.3 Postfächer (willkommen@, web@)

Bleiben bei **Hetzner** – im Paket enthalten, 0 € zusätzlich. Ein Wechsel
zu Google Workspace oder Microsoft 365 (ab ca. 6–7 € je Postfach und Monat)
bringt nichts, was das Haus braucht.

### 5.4 Gesamtbudget je Jahr

| Posten | Betrag |
|---|---|
| Cloudflare, GitHub, Brevo | 0 € |
| Domain `.at` | 15–30 € |
| Hetzner-Paket (Mail, Domain, alte Seite) | wie bisher; nach Etappe 7 kann Hannah prüfen, ob eine kleinere Stufe reicht – **Postfächer und Domain dürfen dabei nicht wegfallen** |
| Programmierer | 2–6 Stunden im Jahr für Pflege (Abschnitt 6); dazu, was das Haus an Änderungen wünscht |

---

## 6. Plan für die nächsten Jahre

### Jetzt – Oktober bis November 2026

- [ ] Etappe 1: Hannah legt `web@` und die drei Konten an, mit
      Zwei-Faktor-Anmeldung und zwei Personen je Konto
- [ ] Etappen 2–4: Programmierer übernimmt Code, Dienst, Daten; stellt
      `WIRT_MAIL` auf die Hausadresse und den Brevo-Absender auf `willkommen@`
- [ ] Hannah: Domain-Prüfung aus Abschnitt 4.1; Autoresponder im Postfach
- [ ] Etappe 5: Generalprobe unter `neu.wirtschaft-dornbirn.at`, Hannah und
      Wolfgang gehen alles durch (Reservieren, Takeaway, Warteliste, Anfrage)
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
      wenn WordPress nicht mehr gebraucht wird (Postfächer behalten!)

### Entscheidungen, die bewusst offen bleiben

| Thema | Stand | Wann ansehen |
|---|---|---|
| **Automatische Tischbremse** (Dienst sagt „voll“, bevor das Haus es meldet) | aus; das Haus meldet Tage selbst voll | wenn mittags regelmäßig überbucht wird |
| **Eigenes Ticketing** statt Ticketist | Analyse liegt vor, zurückgestellt | wenn die Gebühren von Ticketist oder die Warteliste stören |
| **Newsletter stärker nutzen** (Abende, nicht nur Wochenkarte) | Technik steht | wenn jemand im Haus die Texte schreibt |
| **Zweite Stufe bei Brevo** | nicht nötig | wenn mehr als 300 Mails an einem Tag anfallen oder der Brevo-Hinweis stört |

### Wann handeln – die Warnzeichen

- Mail von Brevo „Tageslimit erreicht“ → Starter-Stufe buchen (Hannah,
  5 Minuten, kein Code)
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
| Ein Satz, eine Überschrift, eine Telefonnummer auf einer Seite | **Hannah** | GitHub im Browser: Datei in `site/` öffnen → Stift → Text zwischen den spitzen Klammern ändern → „Create a new branch and start a pull request“ → warten bis grün → „Merge“. Nie direkt in `main`. Rückgängig: „Revert“ | 10 Minuten + 3 Minuten bis live |
| Neue Seite, Bilder, Aufbau, Preise der Abende, Formulare, Fehler, neue Mailtexte | **Programmierer** | Auftrag per Mail an ihn: Seite, Stelle (Screenshot), was stattdessen stehen soll – **ein Wunsch je Punkt**. Er arbeitet im Repository, prüft mit `npm run ci`, Pull Request, grün, zusammenführen, ausrollen | je nach Wunsch; Kleinigkeiten unter einer Stunde |

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
5. **Produktion nie zum Testen** – dafür gibt es die Probe
   (`?probe=1`, Übergabe Abschnitt 6). Takeaway in Produktion nur mit echter
   Bestellung.

**Mit oder ohne KI:** Beide Wege sind unabhängig von einem KI-Abo. Will der
Programmierer eine KI einsetzen, gibt es einen fertigen Arbeitsauftrag in
`docs/claude-master-prompt.md` – mit denselben Regeln wie oben.

---

## 8. Die Checkliste zum Abhaken

**Hannah**

- [ ] Postfach oder Weiterleitung `web@wirtschaft-dornbirn.at` bei Hetzner
- [ ] Domain-Prüfung (Inhaber, Kontaktadresse, Verlängerung) – Abschnitt 4.1
- [ ] Konten GitHub, Cloudflare, Brevo mit `web@`, Zwei-Faktor, zwei Personen
- [ ] Programmierer einladen (GitHub Owner, Cloudflare Administrator, Brevo Benutzer, Hetzner DNS)
- [ ] Autoresponder im Postfach `willkommen@` einstellen
- [ ] Generalprobe unter `neu.` mit Wolfgang durchspielen
- [ ] Nach dem Umzug: Google-Unternehmensprofil, Instagram, Speisekarten-QR prüfen

**Programmierer**

- [ ] Repository übernehmen, `npm run ci` grün
- [ ] Dienst im Konto des Hauses ausrollen, Daten einspielen, Geheimnisse neu
- [ ] `WIRT_MAIL` → Hausadresse; `ANFRAGE_MAIL` bleibt `willkommen@`
- [ ] Brevo: Domain bestätigen (vier Einträge), `BREVO_ABSENDER` → `willkommen@`;
      Testmail an eine Gmail-Adresse: kommt im Posteingang an, nicht im Spam
- [ ] Testeinträge „TEST“ aus der Produktion entfernen
- [ ] Unteradressen sichern, Zone zu Cloudflare, Nameserver umstellen
- [ ] `npm run check:umzug`, `npm run check:uebergabe` – alles grün
- [ ] Jonas' Zugänge überall entfernen

**Wolfgang**

- [ ] Entscheidung, welche Adresse Tageszettel und Bestellungen bekommt
      (`willkommen@` oder `buero@`)
- [ ] Generalprobe anschauen und freigeben
- [ ] Tag für den Umzug festlegen
