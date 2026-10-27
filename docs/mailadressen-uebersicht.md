# Mailadressen der Webseite · Wer bekommt was, und was ihr jetzt tun müsst

Stand 27. Oktober 2026. Für Hannah, Wolfgang und den Programmierer.
Dieses Blatt kommt von Jonas und erklärt alles selbst – ihr braucht nichts
dazu. Alles darin ist im Code und im laufenden Betrieb nachgeprüft, nichts
ist geraten.

**Das Entscheidungsblatt ist ausgefüllt** (Hannah, 27.10.2026). Was
entschieden wurde, steht in `docs/mailadressen-entscheidung.md` – das ist ab
jetzt die Quelle. Dieses Blatt erklärt das Drumherum.

---

## In einem Satz

Die neue Webseite schickt Gästen automatisch Mails (Bestätigungen) und euch
Mails (Bestellungen, Anfragen, Tageszettel). **Wohin die Mails an euch
gehen, ist jetzt richtig eingestellt.** Offen ist nur noch der **Absender**:
die Mails an die Gäste gehen weiterhin von der Testadresse von Jonas los und
landen darum oft im Spam. Das lässt sich erst ändern, wenn die Domain bei
Brevo beglaubigt ist – dafür müssen vier Einträge bei Hetzner gesetzt
werden.

---

## Was wer zu tun hat – die Aufgabenliste

**Hannah** (etwa eine halbe Stunde)

1. ~~Das Entscheidungsblatt ausfüllen~~ – **erledigt am 27.10.2026.**
2. **Bei Hetzner das Passwort ändern.** Es stand im ausgefüllten Blatt und
   hat damit den Weg über Download-Ordner und Chat genommen. Der Zugang
   selbst ist vorhanden (Sarah) – das war die eigentliche Frage.
3. **Drei kostenlose Konten anlegen** mit der Adresse
   `veranstaltungen@wirtschaft-dornbirn.at`: GitHub, Cloudflare, Brevo.
   Anleitung: Übergabe-Dokument, Etappe 1. Sarah als zweite Person
   eintragen.
4. **Bei Brevo die Domain `wirtschaft-dornbirn.at` anlegen.** Brevo zeigt
   dann vier Einträge an, die bei Hetzner in die Domain müssen. Das setzt
   der Programmierer; ihr braucht nur den Zugang.

Ein Postfach `web@` wird **nicht** angelegt – so entschieden. Eine
automatische Antwort in `willkommen@` ist ebenfalls **nicht** gewünscht.
Die Domain gehört dem Haus und ist bis August 2027 bezahlt; dort ist nichts
zu tun.

**Wolfgang** (fünf Minuten)

1. Mit Uri abstimmen: Darf die Terminliste („Bleibt auf dem Laufenden“)
   künftig als `uri@eugen.family` versenden, und die Warteliste der
   Kulturhaus-Abende als `tickets@eugen.family`? Dafür muss die Domain
   `eugen.family` bei Brevo eigens beglaubigt werden – das kann nur Uri
   veranlassen.

**Programmierer** (zwei bis drei Stunden, sobald die Konten des Hauses bestehen)

1. Dienst im Konto des Hauses ausrollen (Übergabe, Etappe 3).
2. ~~Die Adresse für Tageszettel und Bestellungen eintragen~~ – **erledigt**,
   Tageszettel an `veranstaltungen@`, Bestellmeldung an `service@`.
3. Die Domain `wirtschaft-dornbirn.at` bei Brevo bestätigen: vier Einträge,
   die Brevo anzeigt, bei Hetzner in die Domain eintragen (Etappe 4).
4. **Erst danach** den Absender aller Mails auf `willkommen@` stellen
   (`BREVO_ABSENDER`). Vorher würde alles im Spam landen.
5. **Dann** die vier Absender je Zweck füllen: `ABSENDER_SERVICE`,
   `ABSENDER_WARTELISTE`, `ABSENDER_KULTURHAUS`, `EVENTS_ABSENDER`. Welcher
   Wert wohin: `docs/mailadressen-entscheidung.md`, Abschnitt 5.
6. Probe: Testreservierung mit einer Gmail-Adresse → Mail muss im
   Posteingang liegen, Absender „Wirtschaft Dornbirn ‹service@…›“.
7. Testeinträge mit „TEST“ im Namen aus dem Betrieb löschen.

---

## Die Adressen, die ihr euch merken müsst

| Adresse | Was sie ist | Gibt es sie schon? |
|---|---|---|
| **willkommen@wirtschaft-dornbirn.at** | **Die Adresse für Gäste.** Steht auf der Webseite. Bekommt alle Anfragen. Wird der Absender aller automatischen Mails – antwortet ein Gast auf eine Bestätigung, landet es hier. | ja – liest der Service / das Büro täglich |
| **veranstaltungen@wirtschaft-dornbirn.at** | **Die Adresse für die Technik** (so entschieden am 27.10.). Inhaberin der drei Konten (GitHub, Cloudflare, Brevo). Hierhin kommen Rechnungen (0 €), Warnungen und „Passwort zurücksetzen“ – und der Tageszettel. Kein Gast sieht sie. | **ja, gibt es schon** (liest Hannah) |
| **buero@wirtschaft-dornbirn.at** *(optional)* | **Die Adresse für den Mittag.** Tageszettel um 08:00, Wochenbericht, jede Takeaway-Bestellung. Nur nötig, wenn das nicht in `willkommen@` liegen soll. | nein – Wolfgang entscheidet (Frage 6) |
| **uri@eugen.family** | **Die Adresse von Emma & Eugen.** Steht als Veranstalter der Abende im Fuß der Seite. Soll künftig die Terminliste versenden. | ja – gehört Uri |
| jonas.gamper@aon.at | **Die Adresse, die weg muss.** Als Empfänger ist sie seit 27.10.2026 ersetzt. Sie steht nur noch als **Absender** aller Mails – weil Jonas die Seite gebaut und getestet hat. | ja – wird ersetzt, sobald die Domain bei Brevo beglaubigt ist |

**Warum eine fremde Adresse als Absender schadet:** aon.at erlaubt nicht, dass
andere (hier: Brevo für die Webseite) in seinem Namen Mails schicken. Gmail
und Outlook sehen das und sortieren die Bestätigungen in den Spam oder
werfen sie weg. Darum muss der Absender eine Adresse eurer eigenen Domain
sein – und die Domain muss Brevo „erlaubt“ werden (vier Einträge, Aufgabe
3 des Programmierers). Das ist der wichtigste technische Punkt auf diesem Blatt.

---

## Warum hier dauernd „Hetzner“ steht

Eure Domain `wirtschaft-dornbirn.at` gibt es bereits – sie muss nicht neu
angemeldet werden. Jonas hat öffentlich nachgesehen (so wie man im
Telefonbuch nachschlägt, ohne Zugangsdaten), wie sie eingerichtet ist:
Die Verwaltung der Domain, der Mailserver für `willkommen@` und die alte
WordPress-Seite liegen alle bei der Firma **Hetzner** (ein großer deutscher
Anbieter). Wer die alte Seite gebaut hat, hat das damals dort eingerichtet.
Darum müssen neue Postfächer, die automatische Antwort und die vier
Brevo-Einträge **bei Hetzner** gemacht werden – und darum ist die Frage
„wer kann sich dort anmelden?“ so wichtig. Wenn euch Hetzner nichts sagt,
ist das in Ordnung: Es heißt nur, dass die Zugangsdaten noch gefunden
werden müssen.

---

## Was passiert, wenn … – alle Fälle in einfachen Worten

Für jeden Fall: wer eine Mail bekommt, **von welcher Adresse** sie kommt, und
wo bei euch etwas ankommt. „Absender“ heißt: heute noch Jonas, nach
Aufgabe 4 des Programmierers `willkommen@`. Antwortet jemand auf eine
automatische Mail, landet die Antwort beim Absender.

### … ein Gast mittags einen Tisch reserviert

- **Der Gast** bekommt sofort eine Mail: *„Tisch reserviert: montag, 27. oktober 2026, 12:30 Uhr“* – mit seinen Angaben, einem Link zum Absagen und einem Kalendereintrag. Absender: willkommen@ (Ziel).
- **Ihr** bekommt: ein Klingeln am Handy (Wirt-Ansicht) und die Reservierung im Reiter *heute*. Keine extra Mail – sie steht im **Tageszettel um 08:00**.
- Hat der Gast nur eine Telefonnummer angegeben: keine Mail, die Reservierung gilt trotzdem.

### … ein Gast über den Link absagt oder ihr einen Mittag absagt

- **Der Gast** bekommt *„Absage bestätigt“* bzw. *„Leider abgesagt“* mit eurem Grund.
- **Ihr** seht es in der Wirt-Ansicht; wer nur Telefon hat, steht in einer Liste zum Anrufen.
- Wird dadurch ein Tisch frei, bekommt der Erste auf der Mittags-Warteliste *„Frei geworden: … mittags“*.

### … ein Gast Takeaway bestellt

- **Der Gast** bekommt sofort *„Danke für deine Bestellung – Nr. 53, …“* mit Speisen, Abholzeit, Bezahlart, Gesamtpreis, Abholort.
- **Ihr** bekommt eine **Mail** *„Takeaway Nr. 53: Name, 12:30 Uhr – Speisen“* – an `service@` (`TAKEAWAY_MAIL`). Dazu Klingeln und die Bestellung im Reiter *heute → takeaway*.
- Die Nummern laufen 51 bis 60, dann wieder 51. Ab der elften Bestellung eines Tages gibt es eine Nummer also zweimal – am Tresen Name **und** Nummer rufen.

### … ein Abend ausverkauft ist und sich ein Gast auf die Warteliste setzt

- **Der Gast** bekommt *„Warteliste: ‹Abend›“* – mit dem Hinweis, dass nichts garantiert ist, und einem Link zum Austragen.
- **Ihr** seht ihn im Reiter *warteliste → Abende*. Kommen Karten zurück, tippt ihr *„alle verständigen“* – dann bekommt jeder *„Wieder Karten: ‹Abend›“* mit dem Link zum Ticketdienst.
- **Tickets selbst** verkauft Ticketist; die Mail dazu kommt von Ticketist, nie von uns.

### … jemand über die Seite „Locations“ oder „Agentur“ eine Anfrage schickt

- **Der Gast** bekommt sofort *„Danke für eure Anfrage“* mit allen Angaben. Antwortet er darauf, landet es in `willkommen@`.
- **Ihr** bekommt eine **Mail** *„Anfrage Feste: ‹Betreff›“* an **`willkommen@`**. Das Besondere: Drückt ihr auf **„Antworten“, geht die Antwort direkt an den Gast** – ihr müsst seine Adresse nicht abtippen. Dazu Klingeln und die Anfrage im Reiter *haus → Anfragen* (dort „erledigt“ tippen).
- Ist der Dienst einmal nicht erreichbar, öffnet das Formular stattdessen eine normale Mail an `willkommen@`.

### … sich jemand für die Mittagskarte per Mail anmeldet

- **Der Gast** bekommt *„Bitte bestätige deine Anmeldung“* mit dem Knopf *„Ja, ich möchte die Mittagskarte“*. Erst nach dem Klick ist er dabei (Double-Opt-in, Pflicht nach DSGVO).
- Danach bekommt er **jeden Montag um 07:15** *„Die Wochenkarte der Wirtschaft ist da“* mit einem Link zur Karte. In jeder Mail steht ein Abmeldelink.
- **Ihr** seht nur die Anzahl in der Wirt-Ansicht.

### … sich jemand unter „Bleibt auf dem Laufenden“ für die Termine anmeldet

- **Der Gast** bekommt *„Bitte bestätige deine Anmeldung“* mit dem Knopf *„Ja, ich möchte die Termine“*. Die Seite nach dem Klick sagt jetzt richtig „Termine“ (bis 21.10. stand dort fälschlich „Mittagskarte“ – behoben).
- Absender dieser Mails: heute wie alle anderen; **künftig `uri@eugen.family`**, sobald Uri die Adresse bei Brevo bestätigt hat.
- **Wichtig zu wissen:** Bei neuen Terminen geht heute **noch keine** automatische Mail an diese Liste. Die Adressen werden gesammelt; ein Rundschreiben müsste Emma & Eugen aus Brevo verschicken – oder der Programmierer baut den automatischen Versand, wenn ihr das wollt.

### … etwas nur an euch geht

| Wann | Was | Wohin |
|---|---|---|
| werktags 08:00 | **Tageszettel**: wer kommt, was vorbestellt ist, Warnung „KARTE FEHLT“ | `veranstaltungen@` (`WIRT_MAIL`) |
| Freitag 15:00 | **Wochenbericht**: Gäste, Portionen | Mittags-Adresse |
| sofort | jede Takeaway-Bestellung | Mittags-Adresse |
| sofort | jede Anfrage | `willkommen@` |
| sofort | Klingeln am Handy: Bestellung, Reservierung, Anfrage, „wieder Karten“, neuer Abend | jedes Gerät, auf dem „Klingeln“ eingeschaltet ist |
| nur bei Fehler | *„termine-abgleich failed“* von GitHub | Technik-Adresse (`veranstaltungen@`; heute Jonas) |
| selten | Warnungen von Cloudflare oder Brevo (Limit, Sicherheit) | Technik-Adresse |

### … ein Gast einfach selbst an willkommen@ schreibt

Das läuft **nicht** über die Webseite – die Mail kommt ganz normal im
Postfach an. Eine automatische Antwort kann nur das Postfach selbst
(Hannahs Aufgabe 5). Vorschlag: eine kurze Eingangsbestätigung mit den drei
Online-Wegen (Reservieren, Takeaway, Tickets), ohne eine Antwortzeit zu
versprechen.

---

## Die Änderungen im Einzelnen – für den Programmierer (und zum Mitlesen)

Was heute wo steht, was neu hinein soll, und wer es macht. Die neuen Werte
kommen aus dem Entscheidungsblatt; wo es noch nicht ausgefüllt ist, steht
unsere Empfehlung.

| # | Stelle | Heute | Neu | Wer |
|---|---|---|---|---|
| 1 | ~~Postfach `web@` bei Hetzner~~ | – | **entfällt**: es wird `veranstaltungen@` genommen (27.10.) | – |
| 2 | Inhaber der Konten GitHub, Cloudflare, Brevo | Jonas | `veranstaltungen@`, Zwei-Faktor, Sarah als zweite Person | Hannah; Jonas überträgt |
| 3 | `WIRT_MAIL` in `server/wrangler.jsonc` (Produktion **und** Probe) | ~~jonas.gamper@aon.at~~ | **erledigt**: `veranstaltungen@` (Tageszettel, Wochenbericht) | – |
| 4 | `ANFRAGE_MAIL` ebenda | `willkommen@` | bleibt | – |
| 4b | `TAKEAWAY_MAIL` ebenda (**neu**) | – | **erledigt**: `service@` (jede Bestellmeldung) | – |
| 5 | Domain bei Brevo bestätigen: *Senders & Domains → Domain hinzufügen*, die vier Einträge bei Hetzner (DNS) anlegen, ggf. SPF um `include:spf.brevo.com` ergänzen | Domain angelegt, Einträge fehlen | bestätigt | Programmierer + Hannah (Hetzner-Zugang) |
| 6 | `BREVO_ABSENDER` (Geheimnis des Dienstes, `wrangler secret put`) | jonas.gamper@aon.at | `willkommen@wirtschaft-dornbirn.at` – **erst nach #5** | Programmierer |
| 7 | `EVENTS_ABSENDER` in `server/wrangler.jsonc` | leer (= Hausabsender) | `uri@eugen.family` – erst nach Uris Bestätigung bei Brevo | Programmierer |
| 7b | `ABSENDER_SERVICE`, `ABSENDER_WARTELISTE`, `ABSENDER_KULTURHAUS` (**neu**) | leer (= Hausabsender) | `service@`, `veranstaltungen@`, `tickets@eugen.family` – erst nach #5 bzw. Uris Bestätigung | Programmierer |
| 8 | `BREVO_KEY` (Geheimnis) | Schlüssel aus Jonas' Konto | neuer Schlüssel aus dem Konto des Hauses | Programmierer |
| 9 | Fehlermail von GitHub | an Jonas | an `veranstaltungen@` (ergibt sich mit #2) | – |
| 10 | Kontaktadresse beim Registrar der Domain (Hetzner-Kundenkonto) | unbekannt | `willkommen@` + die private Reserveadresse von Hannah (entschieden am 27.10.; die Adresse selbst steht im Entscheidungsblatt, nicht hier) | Hannah |
| 11 | Automatische Antwort im Postfach `willkommen@` | keine | Vorschlagstext (Frage 12) | Hannah |
| 12 | Veranstalter-Kontakt `uri@` im Fuß der Seite und in `termine.json` | uri@eugen.family | bleibt (Frage 11) | – |
| 13 | Testeinträge „TEST“ im Betrieb | vorhanden | gelöscht | Programmierer |

**So prüft ihr, dass es geklappt hat** (nach #5 und #6): Testreservierung
mit einer Gmail-Adresse → die Bestätigung liegt im Posteingang (nicht Spam)
und zeigt „Wirtschaft Dornbirn ‹willkommen@…›“ als Absender. Auf die Mail
antworten → die Antwort kommt in `willkommen@` an. Eine Anfrage über
„Locations“ schicken → beim „Antworten“ auf die Mail ans Haus steht der
Gast als Empfänger drin.

---

## Welche Daten wo liegen – und wie lange

Alles liegt in **einem** Speicher des Dienstes bei Cloudflare, nach Zweck
getrennt. Keine Excel-Liste, keine Datei auf einem fremden Server; nur der
Mailversand läuft über Brevo.

| Daten | Wie lange | Wer sieht sie |
|---|---|---|
| Reservierungen (Name, Termin, Personen, Kontakt) | bis 30 Tage nach dem Termin, dann gelöscht | ihr, in der Wirt-Ansicht |
| Takeaway-Bestellungen | bis 30 Tage nach dem Abholtag | ihr; der Gast seine eigene über den Status-Link |
| Wartelisten | Mittag: bis zum Tag · Abende: bis zum Abend (ohne Datum 60 Tage) | ihr |
| Anfragen Locations/Agentur | 90 Tage | ihr; Kopie als Mail in `willkommen@` |
| Newsletter-Adressen (zwei getrennte Listen) | unbestätigt 30 Tage; bestätigt bis zur Abmeldung | nur der Dienst; ihr seht die Anzahl |
| Abgemeldete | dauerhaft, aber nur als unlesbarer Fingerabdruck – damit niemand still wieder eingetragen wird | niemand im Klartext |
| „Merkt euch meine Angaben“ (Gastprofil) | 730 Tage, nur als Fingerabdruck; Unverträglichkeiten nur mit eigener Einwilligung | der Gast beim nächsten Reservieren |
| Klingeln (Push) | bis zur Abmeldung | – |
| Wochenkarte, Öffnungszeiten, Hinweise, Tische | bis ihr sie ändert | Karte: alle · Rest: ihr |
| Versandprotokoll (wer wann welche Mail bekam, ohne Inhalt) | bei Brevo, einige Tage bis Wochen | Brevo-Konto |

Rechtlich: Reservierung, Bestellung und Anfrage sind Vertragserfüllung;
Newsletter, Gastprofil und Klingeln sind Einwilligungen, jede einzeln
widerrufbar, der Wortlaut wird mitgespeichert. Die Datenschutzseite der
Webseite sagt dasselbe für Gäste.

---

## Wörterbuch

| Wort | Bedeutung |
|---|---|
| **Domain** | eure Adresse im Internet: wirtschaft-dornbirn.at. Gehört dem, der auf der Rechnung steht. Alle Mailadressen @wirtschaft-dornbirn.at hängen an ihr. |
| **Registrar** | die Firma, bei der die Domain jährlich bezahlt wird – vermutlich Hetzner. |
| **Hetzner** | der Anbieter, bei dem Domain, Postfächer und die alte Webseite liegen. Hat eine Verwaltungsoberfläche mit Zugangsdaten. |
| **Postfach / Weiterleitung** | ein Postfach hat eigene Mails; eine Weiterleitung reicht alles an eine andere Adresse weiter. |
| **Brevo** | der Dienst, der die automatischen Mails verschickt. Kostenlos bis 300 Mails am Tag. |
| **Absender** | die Adresse, die der Gast als „Von“ sieht und auf die er antwortet. |
| **Der Dienst** | das Programm hinter der Webseite (Reservierungen, Bestellungen, Wartelisten). Bedient über die **Wirt-Ansicht** am Handy. |
| **Wirt-Ansicht** | `…/tischplan/wirt.html` – eure tägliche Oberfläche mit den Reitern heute · karte · warteliste · haus. |
| `WIRT_MAIL`, `TAKEAWAY_MAIL`, `ANFRAGE_MAIL`, `BREVO_ABSENDER`, `ABSENDER_SERVICE`, `ABSENDER_WARTELISTE`, `ABSENDER_KULTURHAUS`, `EVENTS_ABSENDER` | die Einstellungen im Dienst, in denen Mailadressen stehen. Nur der Programmierer ändert sie. |
| **Double-Opt-in** | Anmeldung erst nach Klick in einer Bestätigungsmail – Pflicht für Newsletter. |
| **DNS-Einträge** | kleine Zeilen in der Verwaltung der Domain, mit denen man z. B. Brevo erlaubt, in eurem Namen zu senden. |

---

## Zum Ausdrucken

- **Gäste schreiben an und antworten auf:** `willkommen@` *(sobald Programmierer-Aufgabe 4 erledigt ist – bis dahin noch Jonas)*
- **Anfragen kommen an:** `willkommen@` – „Antworten“ geht an den Gast
- **Tageszettel, Wochenbericht, Bestellungen:** `willkommen@` oder `buero@` – Wolfgang entscheidet
- **Technik, Rechnungen, Passwörter:** `veranstaltungen@` – gibt es schon
- **Terminliste sendet als:** `uri@eugen.family` – sobald Uri bestätigt hat
- **Tickets:** Ticketist, nie wir
