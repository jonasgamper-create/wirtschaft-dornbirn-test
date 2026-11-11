# Mailadressen der Webseite · Wer bekommt was, und was ihr jetzt tun müsst

Stand 11. November 2026. Für Hannah, Sarah, Wolfgang und den Programmierer.
Dieses Blatt kommt von Jonas und erklärt alles selbst – ihr braucht nichts
dazu. Alles darin ist im Code und im laufenden Betrieb nachgeprüft, nichts
ist geraten.

**Das Entscheidungsblatt ist ausgefüllt** (Hannah, 27.10.2026), die offenen
Fragen dazu hat Hannah am 03.11.2026 beantwortet. Was entschieden wurde,
steht in `docs/mailadressen-entscheidung.md` – das ist ab jetzt die Quelle.
Dieses Blatt erklärt das Drumherum.

---

## In einem Satz

Die neue Webseite schickt Gästen automatisch Mails (Bestätigungen) und euch
Mails (Bestellungen, Anfragen, Tageszettel). **Wohin die Mails an euch
gehen, ist jetzt richtig eingestellt.** Offen ist nur noch der **Absender**:
die Mails an die Gäste gehen weiterhin von der privaten Adresse von Jonas los und
landen darum oft im Spam. Die vier Einträge dafür sind bei Hetzner gesetzt,
für beide Domains. Es fehlen noch zwei Schritte im Brevo-Konto des Hauses:
die Beglaubigung (*Authenticate*) und ein Schlüssel für den Dienst. Erst
danach wird der Absender umgestellt.

---

## Was wer zu tun hat – die Aufgabenliste

**Hannah und Sarah** (etwa eine halbe Stunde)

1. ~~Das Entscheidungsblatt ausfüllen~~ – **erledigt am 27.10.2026.**
2. **Bei Hetzner das Passwort ändern.** Es stand im ausgefüllten Blatt und
   hat damit den Weg über Download-Ordner und Chat genommen. Der Zugang
   selbst ist vorhanden (Sarah) – das war die eigentliche Frage.
3. Konten bei Brevo und GitHub anlegen – **erledigt** (Sarah, Anfang
   November). Offen ist noch das kostenlose Konto bei **Cloudflare**, mit
   der Adresse `veranstaltungen@wirtschaft-dornbirn.at`. Anleitung:
   Übergabe-Dokument, Etappe 1. Sarah als zweite Person eintragen.
4. Bei Brevo die Domains anlegen und die Einträge bei Hetzner setzen –
   **erledigt** für `wirtschaft-dornbirn.at` und `eugen.family` (Sarah mit
   Markus, Anfang November; von außen geprüft am 10.11.2026).
5. **Im Brevo-Konto des Hauses beglaubigen:** bei beiden Domains auf
   *Authenticate* drücken, bis beide als beglaubigt angezeigt werden (Sarah).
6. **Danach im selben Konto einen API-Schlüssel erzeugen** und ihn gemeinsam
   mit Jonas im Dienst hinterlegen – nicht per Mail oder Chat schicken.
   Grund: Der Dienst verschickt heute noch über das Brevo-Konto von Jonas,
   und dort sind eure Domains nicht beglaubigt. Ein eigener Benutzer für
   Jonas im Brevo-Konto kostete laut Brevo 9 € im Monat, der Schlüssel
   kostet nichts.
7. **Einmal selbst eine Testanfrage schicken** über die neue Seite
   https://wirtschaft-dornbirn.pages.dev (Seite „Locations“; nicht über die
   Testseite, dort geht keine Mail hinaus) und nachsehen, ob sie bei
   `uri@eugen.family` ankommt. Seit der Umstellung am
   10.11. kam dort noch keine echte Anfrage an.

Ein Postfach `web@` wird **nicht** angelegt – so entschieden. Eine
automatische Antwort in `willkommen@` ist ebenfalls **nicht** gewünscht.
Die Domain gehört dem Haus und ist bis August 2027 bezahlt; dort ist nichts
zu tun.

**Wolfgang**: nichts mehr.

1. Mit Uri abstimmen, ob die Terminliste („Bleibt auf dem Laufenden“) als
   `uri@eugen.family` und die Warteliste der Kulturhaus-Abende als
   `tickets@eugen.family` versenden darf – **erledigt, ohne Uri**: Die
   Einträge für `eugen.family` sind gesetzt wie bei `wirtschaft-dornbirn.at`,
   im selben Brevo-Konto des Hauses. Mit Uri ist nichts mehr zu klären.

**Programmierer** (zwei bis drei Stunden, sobald die Konten des Hauses bestehen)

1. Dienst im Konto des Hauses ausrollen (Übergabe, Etappe 3).
2. ~~Die Adresse für Tageszettel und Bestellungen eintragen~~ – **erledigt**,
   Tageszettel an `veranstaltungen@`, Bestellmeldung an `service@`.
   Anfragen gehen seit 10.11.2026 an `uri@eugen.family`. Die Kopie von
   Tageszettel und Wochenbericht an Jonas ist vorbereitet (Geheimnis
   `WIRT_MAIL_KOPIE`), aber noch nicht eingeschaltet – Jonas setzt sie
   selbst; bis dahin gibt es keine Kopie.
3. Die Einträge bei Hetzner sind gesetzt (Sarah mit Markus, beide Domains).
   Nach *Authenticate* den Schlüssel aus dem Brevo-Konto des Hauses als
   Geheimnis `BREVO_KEY` hinterlegen – gemeinsam mit Sarah (Aufgabe 6 oben).
4. **Erst danach** den Absender aller Mails auf `willkommen@` stellen
   (`BREVO_ABSENDER`). Vorher verschickt Brevo gar nichts mehr.
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
| **willkommen@wirtschaft-dornbirn.at** | **Die Adresse für Gäste.** Steht auf der Webseite. Wird der Hausabsender der automatischen Mails, die keinen eigenen Absender je Zweck haben (Programmierer-Aufgabe 5) – antwortet ein Gast auf so eine Mail, landet es hier. Die Anfragen gehen seit 10.11.2026 an `uri@eugen.family` (siehe unten). | ja – liest der Service / das Büro täglich |
| **veranstaltungen@wirtschaft-dornbirn.at** | **Die Adresse für die Technik** (so entschieden am 27.10.). Inhaberin der drei Konten (GitHub, Cloudflare, Brevo). Hierhin kommen Rechnungen (0 €), Warnungen und „Passwort zurücksetzen“ – und der Tageszettel. Kein Gast sieht sie. | **ja, gibt es schon** (liest Hannah) |
| **buero@wirtschaft-dornbirn.at** *(entfällt)* | War als Adresse für den Mittag gedacht – nicht nötig: Tageszettel und Wochenbericht gehen an `veranstaltungen@`, jede Takeaway-Bestellung an `service@` (entschieden am 27.10.). | nein – nicht nötig |
| **uri@eugen.family** | **Die Adresse von Emma & Eugen.** Bekommt seit 10.11.2026 alle Anfragen aus „Locations · Feste & Catering“ und „Agentur“ – „Antworten“ geht an den Gast. Steht als Veranstalter der Abende im Fuß der Seite. Soll künftig die Terminliste versenden. | ja – lesen Wolfgang und Hannah |
| die private Adresse von Jonas | **Die Adresse, die als Absender weg muss.** Als Empfänger ist sie seit 27.10.2026 ersetzt (die gewünschte Kopie des Tageszettels an Jonas ist vorbereitet, aber noch nicht eingeschaltet). Sie steht nur noch als **Absender** aller Mails – weil Jonas die Seite gebaut und getestet hat. | ja – wird ersetzt, sobald die Domains im Brevo-Konto des Hauses beglaubigt sind und dessen Schlüssel im Dienst liegt |

**Warum eine fremde Adresse als Absender schadet:** Der Anbieter der privaten
Adresse von Jonas erlaubt nicht, dass andere (hier: Brevo für die Webseite)
in seinem Namen Mails schicken. Gmail und Outlook sehen das und sortieren
die Bestätigungen in den Spam oder werfen sie weg. Darum muss der Absender
eine Adresse eurer eigenen Domain sein – und die Domain muss Brevo
„erlaubt“ werden. Die vier Einträge dafür sind gesetzt; es fehlen noch
*Authenticate* und der Schlüssel aus dem Brevo-Konto des Hauses (Aufgaben 5
und 6 von Hannah und Sarah). Das ist der wichtigste technische Punkt auf
diesem Blatt.

---

## Warum hier dauernd „Hetzner“ steht

Eure Domain `wirtschaft-dornbirn.at` gibt es bereits – sie muss nicht neu
angemeldet werden. Jonas hat öffentlich nachgesehen (so wie man im
Telefonbuch nachschlägt, ohne Zugangsdaten), wie sie eingerichtet ist:
Die Verwaltung der Domain, der Mailserver für `willkommen@` und die alte
WordPress-Seite liegen alle bei der Firma **Hetzner** (ein großer deutscher
Anbieter). Wer die alte Seite gebaut hat, hat das damals dort eingerichtet.
Darum werden neue Postfächer und Einträge wie die vier für Brevo **bei
Hetzner** gemacht – und darum war die Frage „wer kann sich dort anmelden?“
so wichtig. Sie ist beantwortet: Sarah hat den Zugang, und die vier
Brevo-Einträge hat sie mit Markus Anfang November gesetzt.

---

## Was passiert, wenn … – alle Fälle in einfachen Worten

Für jeden Fall: wer eine Mail bekommt, **von welcher Adresse** sie kommt, und
wo bei euch etwas ankommt. „Absender“ heißt: heute noch Jonas, nach
Aufgabe 4 des Programmierers `willkommen@`, nach Aufgabe 5 je Zweck der
eigene Absender (etwa `service@` für Reservierungen). Antwortet jemand auf
eine automatische Mail, landet die Antwort beim Absender – nur die
Bestätigung einer Anfrage antwortet an `uri@eugen.family`.

### … ein Gast mittags einen Tisch reserviert

- **Der Gast** bekommt sofort eine Mail: *„Tisch reserviert: montag, 27. oktober 2026, 12:30 Uhr“* – mit seinen Angaben, einem Link zum Absagen und einem Kalendereintrag. Absender: künftig `service@` (Ziel).
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

- **Der Gast** bekommt sofort *„Danke für eure Anfrage“* mit allen Angaben. Antwortet er darauf, landet es bei `uri@eugen.family`.
- **Ihr** bekommt eine **Mail** *„Anfrage Feste: ‹Betreff›“* an **`uri@eugen.family`** (so entschieden am 03.11., eingestellt seit 10.11.2026). Das Besondere: Drückt ihr auf **„Antworten“, geht die Antwort direkt an den Gast** – ihr müsst seine Adresse nicht abtippen. Dazu Klingeln und die Anfrage im Reiter *haus → Anfragen* (dort „erledigt“ tippen).
- Ist der Dienst einmal nicht erreichbar, öffnet das Formular stattdessen eine normale Mail an `uri@eugen.family` (seit 11.11.2026).
- `willkommen@` bleibt die Kontaktadresse auf der Seite, auch in der Zeile „Lieber direkt?“ über den Formularen. Ob dort künftig `uri@eugen.family` stehen soll, ist noch eine offene Frage an Hannah.

### … sich jemand für die Mittagskarte per Mail anmeldet

- **Der Gast** bekommt *„Bitte bestätige deine Anmeldung“* mit dem Knopf *„Ja, ich möchte die Mittagskarte“*. Erst nach dem Klick ist er dabei (Double-Opt-in, Pflicht nach DSGVO).
- Danach bekommt er **jeden Montag um 07:15** *„Die Wochenkarte der Wirtschaft ist da“* mit einem Link zur Karte. In jeder Mail steht ein Abmeldelink.
- **Ihr** seht nur die Anzahl in der Wirt-Ansicht.

### … sich jemand unter „Bleibt auf dem Laufenden“ für die Termine anmeldet

- **Der Gast** bekommt *„Bitte bestätige deine Anmeldung“* mit dem Knopf *„Ja, ich möchte die Termine“*. Die Seite nach dem Klick sagt jetzt richtig „Termine“ (bis 21.10. stand dort fälschlich „Mittagskarte“ – behoben).
- Absender dieser Mails: heute wie alle anderen; **künftig `uri@eugen.family`**, sobald die Domains im Brevo-Konto des Hauses beglaubigt sind und der Absender umgestellt ist – mit Uri ist dafür nichts mehr zu klären.
- **Wichtig zu wissen:** Bei neuen Terminen geht heute **noch keine** automatische Mail an diese Liste. Die Adressen werden gesammelt; ein Rundschreiben müsste Emma & Eugen aus Brevo verschicken – oder der Programmierer baut den automatischen Versand, wenn ihr das wollt.

### … etwas nur an euch geht

| Wann | Was | Wohin |
|---|---|---|
| werktags 08:00 | **Tageszettel**: wer kommt, was vorbestellt ist, Warnung „KARTE FEHLT“ | `veranstaltungen@` (`WIRT_MAIL`); die Kopie an Jonas ist vorbereitet, aber noch nicht eingeschaltet |
| Freitag 15:00 | **Wochenbericht**: Gäste, Portionen | `veranstaltungen@` (`WIRT_MAIL`) |
| sofort | jede Takeaway-Bestellung | `service@` (`TAKEAWAY_MAIL`) |
| sofort | jede Anfrage | `uri@eugen.family` (`ANFRAGE_MAIL`) |
| sofort | Klingeln am Handy: Bestellung, Reservierung, Anfrage, „wieder Karten“, neuer Abend | jedes Gerät, auf dem „Klingeln“ eingeschaltet ist |
| nur bei Fehler | *„termine-abgleich failed“* von GitHub | Technik-Adresse (`veranstaltungen@`; heute Jonas) |
| selten | Warnungen von Cloudflare oder Brevo (Limit, Sicherheit) | Technik-Adresse |

### … ein Gast einfach selbst an willkommen@ schreibt

Das läuft **nicht** über die Webseite – die Mail kommt ganz normal im
Postfach an. Eine automatische Antwort gibt es dafür nicht: Das Haus hat
sie abgelehnt (keine automatische Antwort im Postfach `willkommen@`).

---

## Die Änderungen im Einzelnen – für den Programmierer (und zum Mitlesen)

Was heute wo steht, was neu hinein soll, und wer es macht. Die neuen Werte
kommen aus dem Entscheidungsblatt; wo es noch nicht ausgefüllt ist, steht
unsere Empfehlung.

| # | Stelle | Heute | Neu | Wer |
|---|---|---|---|---|
| 1 | ~~Postfach `web@` bei Hetzner~~ | – | **entfällt**: es wird `veranstaltungen@` genommen (27.10.) | – |
| 2 | Inhaber der Konten GitHub, Cloudflare, Brevo | Jonas; die Konten des Hauses bei Brevo und GitHub sind **angelegt** (Sarah, Anfang November), Cloudflare noch nicht | `veranstaltungen@`, Zwei-Faktor; bei GitHub und Cloudflare Sarah als zweite Person (bei Brevo kein zweiter Benutzer, er kostet 9 € im Monat) | Sarah bzw. Hannah; Jonas überträgt |
| 3 | `WIRT_MAIL` in `server/wrangler.jsonc` (Produktion **und** Probe) | die Adresse von Jonas | **erledigt**: `veranstaltungen@` (Tageszettel, Wochenbericht) | – |
| 4 | `ANFRAGE_MAIL` ebenda | `willkommen@` | **erledigt**: `uri@eugen.family` (entschieden 03.11., eingestellt seit 10.11.2026; auch der Notweg der Formulare seit 11.11.) | – |
| 4b | `TAKEAWAY_MAIL` ebenda (**neu**) | – | **erledigt**: `service@` (jede Bestellmeldung) | – |
| 4c | `WIRT_MAIL_KOPIE` (Geheimnis, **neu**) | – | Kopie von Tageszettel und Wochenbericht an die Adresse von Jonas (Antwort vom 03.11.) – **vorbereitet, noch nicht gesetzt**; bis dahin keine Kopie | Jonas |
| 5 | Domains bei Brevo bestätigen: *Senders & Domains → Domain hinzufügen*, die vier Einträge bei Hetzner (DNS) anlegen, SPF um `include:spf.brevo.com` ergänzen, dann *Authenticate* | beide Domains angelegt, Einträge und SPF **gesetzt** (Sarah mit Markus; von außen geprüft am 10.11.2026), *Authenticate* fehlt | bestätigt | Sarah (Brevo-Konto des Hauses) |
| 6 | `BREVO_ABSENDER` (Geheimnis des Dienstes, `wrangler secret put`) | die Adresse von Jonas | `willkommen@wirtschaft-dornbirn.at` – **erst nach #5 und #8** | Programmierer |
| 7 | `EVENTS_ABSENDER` in `server/wrangler.jsonc` | leer (= Hausabsender) | `uri@eugen.family` – erst nach #5 und #8 (mit Uri ist nichts mehr zu klären) | Programmierer |
| 7b | `ABSENDER_SERVICE`, `ABSENDER_WARTELISTE`, `ABSENDER_KULTURHAUS` (**neu**) | leer (= Hausabsender) | `service@`, `veranstaltungen@`, `tickets@eugen.family` – erst nach #5 und #8 | Programmierer |
| 8 | `BREVO_KEY` (Geheimnis) | Schlüssel aus Jonas' Konto | neuer Schlüssel aus dem Brevo-Konto des Hauses – nach #5, **vor #6**; gemeinsam hinterlegt, nicht per Mail oder Chat (ein zweiter Benutzer kostete laut Brevo 9 € im Monat) | Programmierer mit Sarah |
| 9 | Fehlermail von GitHub | an Jonas | an `veranstaltungen@` (ergibt sich mit #2) | – |
| 10 | Kontaktadresse beim Registrar der Domain (Hetzner-Kundenkonto) | unbekannt | `willkommen@` + die private Reserveadresse von Hannah (entschieden am 27.10.; die Adresse selbst steht im Entscheidungsblatt, nicht hier) | Hannah |
| 11 | Automatische Antwort im Postfach `willkommen@` | keine | **entfällt**: keine automatische Antwort (so entschieden) | – |
| 12 | Veranstalter-Kontakt `uri@` im Fuß der Seite und in `termine.json` | uri@eugen.family | bleibt (Frage 11) | – |
| 13 | Testeinträge „TEST“ im Betrieb | vorhanden | gelöscht | Programmierer |

**So prüft ihr, dass es geklappt hat** (nach #5, #8 und #6): Testreservierung
mit einer Gmail-Adresse → die Bestätigung liegt im Posteingang (nicht Spam)
und zeigt „Wirtschaft Dornbirn ‹willkommen@…›“ als Absender. Auf die Mail
antworten → die Antwort kommt in `willkommen@` an. Eine Anfrage über
„Locations“ schicken → sie kommt bei `uri@eugen.family` an, und beim
„Antworten“ auf diese Mail steht der Gast als Empfänger drin.

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
| Anfragen Locations/Agentur | 90 Tage | ihr; Kopie als Mail bei `uri@eugen.family` |
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
| **Registrar** | die Firma, bei der die Domain jährlich bezahlt wird – bei euch Hetzner (bestätigt im Entscheidungsblatt). |
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

- **Gäste schreiben an:** `willkommen@` · **Antworten auf automatische Mails** gehen an deren Absender: `willkommen@` oder je Zweck `service@`, `veranstaltungen@`, `tickets@eugen.family` *(sobald die Programmierer-Aufgaben 4 und 5 erledigt sind – bis dahin noch Jonas)*
- **Anfragen kommen an:** `uri@eugen.family` (seit 10.11.2026) – „Antworten“ geht an den Gast
- **Tageszettel und Wochenbericht:** `veranstaltungen@` · **jede Takeaway-Bestellung:** `service@`
- **Technik, Rechnungen, Passwörter:** `veranstaltungen@` – gibt es schon
- **Terminliste sendet als:** `uri@eugen.family` – sobald der Absender umgestellt ist
- **Tickets:** Ticketist, nie wir
