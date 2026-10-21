# Mailadressen · Wer schreibt wem, was wo hinterlegt ist, was sich ändern muss

Stand 21. Oktober 2026. Für Hannah, Wolfgang und den Programmierer – zum
Weiterleiten, ohne Erklärung dazu. Alles hier ist am 21.10. im Code, in
der Konfiguration des Dienstes und im laufenden Betrieb nachgeprüft.

Drei Fragen beantwortet dieses Blatt, in dieser Reihenfolge:

1. **Welche Adressen gibt es, und wo ist jede hinterlegt?**
2. **Was passiert in jedem Fall** – wer bekommt welche Mail, von welchem
   Absender, und wohin geht eine Antwort?
3. **Was muss sich ändern**, damit alles unter dem Namen des Hauses läuft
   und nichts mehr an Jonas hängt – mit Ort, heutigem Wert, neuem Wert.

Am Ende steht, **welche Daten wo liegen und wie lange**.

---

## 1. Die Adressen – und wo jede hinterlegt ist

| Adresse | Wozu | Wer liest | Wo sie technisch steht | Stand |
|---|---|---|---|---|
| **willkommen@wirtschaft-dornbirn.at** | Kontakt des Hauses. Empfänger aller Anfragen (Locations, Agentur). Künftig Absender aller automatischen Mails | Service / Büro, täglich | 15 Stellen in der Webseite (Impressum, Datenschutz, Kontaktzeilen auf 7 Seiten, Ausweg der zwei Anfrageformulare, Hinweis beim alten Lieferservice); Dienst: `ANFRAGE_MAIL`, `VAPID_KONTAKT` (Produktion und Probe) | 🟢 richtig und überall gleich |
| **jonas.gamper@aon.at** | Empfänger von Tageszettel, Wochenbericht und jeder Takeaway-Bestellung; Absender aller automatischen Mails | Jonas | Dienst: Variable `WIRT_MAIL` (Prod + Probe); Geheimnis `BREVO_ABSENDER` (Prod); bestätigter Absender im Brevo-Konto | 🟡 **muss weg** – Abschnitt 3 |
| **uri@eugen.family** · +43 664 230 65 87 | Kontakt des Veranstalters der Abende (Emma & Eugen, Ticketist) | Uri | Fuß von Startseite, Termine, Reservierung, Takeaway, Locations, Agentur; `data/termine.json` | 🟢 richtig – bleibt, sofern Uri einverstanden |
| **uri@eugen.family** als Absender der **Terminliste** („Bleibt auf dem Laufenden“) | Wunsch des Hauses vom 21.10. | – | Dienst: neue Variable `EVENTS_ABSENDER` (heute leer → Hausabsender) | 🟡 **braucht Bestätigung bei Brevo** – Abschnitt 3 |
| **kulturhaus@dornbirn.at** · +43 5572 27770 | Partner Kulturhaus-Saal | Kulturhaus | Locations-Seite | 🟢 |
| **dsb@dsb.gv.at** | Datenschutzbehörde (Pflichtangabe) | – | Datenschutz-Seite | 🟢 |
| **web@wirtschaft-dornbirn.at** *(gibt es noch nicht)* | Inhaber der Konten GitHub, Cloudflare, Brevo; Kontakt beim Registrar der Domain | Hannah (Weiterleitung), Wolfgang als Vertretung | nirgends – wird in Etappe 1 angelegt | 🔴 **anlegen** |
| Konto-Inhaber heute: GitHub `jonasgamper-create`, Cloudflare `jonas-gamper`, Brevo (Jonas) | Betrieb von Quellcode, Seite, Dienst, Mailversand | Jonas | bei den Anbietern | 🟡 **übertragen** – Übergabe-Etappen 1–3 |
| **+43 5572 20 540** | Telefon des Hauses | Haus | Impressum, Kontaktzeilen, Mails („Etwas vergessen? Gerne anrufen“) | 🟢 |

Wie der Gast einen Absender sieht: **„Wirtschaft Dornbirn ‹Adresse aus
BREVO_ABSENDER›“**. Heute steht dort noch aon.at – deshalb landen Mails bei
Gmail und Outlook oft im Spam oder kommen nicht an (aon.at verbietet fremden
Versand in seinem Namen, DMARC „reject“).

---

## 2. Die Szenarien – wer bekommt was, von wem, wohin geht die Antwort

Alle automatischen Mails verschickt der Dienst über Brevo. „Absender“ ist
immer die Adresse in `BREVO_ABSENDER` (heute aon.at, Ziel willkommen@);
wo etwas anderes gilt, steht es dabei. „Antwort an“ ist die Adresse, bei
der die Antwort landet, wenn der Empfänger auf „Antworten“ drückt.

### 2.1 Mittagstisch

| Auslöser | Gast bekommt | Absender → Antwort an | Haus bekommt | Gespeichert |
|---|---|---|---|---|
| Gast reserviert online | sofort „Tisch reserviert: ‹tag, datum, zeit›“ – vielen dank für die reservierung! mit name, telefon, e-mail, reservierungszeit, personenanzahl; Absage-Link; Kalendereintrag (.ics) | Absender → Absender (willkommen@) | **Push** aufs Handy; Eintrag in der Wirt-Ansicht (heute); im **Tageszettel** um 08:00 | Reservierung 30 Tage nach dem Termin, dann gelöscht |
| Gast hat nur Telefon angegeben | SMS statt Mail (nur wenn SMS-Versand eingeschaltet; heute aus) | – | wie oben | wie oben |
| Gast sagt über den Link ab | „Absage bestätigt: ‹datum›“ | Absender → Absender | Push; Reservierung in der Wirt-Ansicht als abgesagt; Tisch frei → Mittags-Warteliste wird geprüft | – |
| Haus sagt einen Mittag ab (haus → Zusperren → „Mittag absagen“) | „Leider abgesagt: ‹datum›“ mit Grund | Absender → Absender | Liste der Gäste ohne Mail zum Anrufen | – |
| Tag voll, Gast trägt sich auf die Mittags-Warteliste ein | keine Mail beim Eintragen | – | Eintrag in der Wirt-Ansicht (warteliste → Mittagstisch) | bis zum Tag |
| Ein passender Tisch wird frei | „Frei geworden: ‹datum› mittags“ an den Ersten, für den der Platz passt | Absender → Absender | Push | – |
| Gast hakt „merkt euch meine Angaben“ an | – | – | – | Profil 730 Tage, nur als Hash (keine Klartext-Adresse); Unverträglichkeiten nur mit eigener Einwilligung |

### 2.2 Takeaway

| Auslöser | Gast bekommt | Absender → Antwort an | Haus bekommt | Gespeichert |
|---|---|---|---|---|
| Bestellung online | sofort „Danke für deine Bestellung – Nr. ‹51–60›, ‹tag›, ca. ‹zeit› Uhr“ – vielen dank für die bestellung! mit speisen, bestellnummer, name, telefon, e-mail, abholzeit, bezahlart, gesamtpreis, abholort | Absender → Absender | **Mail** „Takeaway Nr. ‹nr›: ‹name›, ‹zeit› Uhr – ‹speisen›“ an **`WIRT_MAIL`**; Push; Bestellung in der Wirt-Ansicht (heute → takeaway) | 30 Tage nach dem Abholtag |
| Bestellung nur mit Telefon | keine Mail; die Nummer steht auf der Seite | – | wie oben | wie oben |
| Küche tippt „fertig“ | Push aufs Handy des Gastes, falls er es beim Bestellen erlaubt hat (Frage auf der Seite seit 21.10. entfernt; Status-Link bleibt) | – | – | – |
| Küche verschiebt die Zeit | Statusseite zeigt „Es dauert etwas länger“ | – | – | – |

### 2.3 Abende und Tickets

| Auslöser | Gast bekommt | Absender → Antwort an | Haus bekommt | Gespeichert |
|---|---|---|---|---|
| Gast kauft Tickets | **Mail von Ticketist**, nicht von uns | Ticketist / Veranstalter (Emma & Eugen) | nichts; die Abende holt der Dienst um 06:00 und 12:00 von den Eventseiten | bei Ticketist |
| Abend ausverkauft, Gast trägt sich auf die Warteliste ein | sofort „Warteliste: ‹abend›“ – vielen dank für deinen eintrag … nicht garantiert, mit veranstaltung, datum (klein), name, telefon, e-mail, ticketkategorie, anzahl; Austragen-Link | Absender → Absender | Push; Eintrag in der Wirt-Ansicht (warteliste → Abende) | bis zum Abend; ohne Datum 60 Tage |
| Karten sind wieder da, Haus tippt „alle verständigen“ | „Wieder Karten: ‹abend› · ‹datum›“ mit Link zum Ticketdienst | Absender → Absender | – | – |
| Gast trägt sich aus | Bestätigung auf der Seite | – | Eintrag weg | – |

### 2.4 Anfragen (Locations: Feste, Catering · Agentur)

| Auslöser | Gast bekommt | Absender → Antwort an | Haus bekommt | Gespeichert |
|---|---|---|---|---|
| Formular abgeschickt | sofort „Danke für eure Anfrage – „wirtschaft“ Dornbirn“ mit allen Angaben | Absender → **willkommen@** (`ANFRAGE_MAIL`, bewusst gesetzt) | **Mail** „Anfrage Feste/Agentur: ‹betreff›“ an **`ANFRAGE_MAIL` = willkommen@** – **Antwort an = der Gast**: auf „Antworten“ drücken, und die Antwort geht an ihn. Dazu Push und Wirt-Ansicht (haus → Anfragen, „erledigt“) | 90 Tage, dann gelöscht |
| Dienst nicht erreichbar | das Formular öffnet stattdessen eine Mail an willkommen@ im Mailprogramm des Gastes | Gast selbst → Gast | normale Mail | im Postfach |

### 2.5 Newsletter – zwei getrennte Listen

| Auslöser | Gast bekommt | Absender → Antwort an | Haus bekommt | Gespeichert |
|---|---|---|---|---|
| Anmeldung **Mittagskarte** (Reservierungsseite) | „Bitte bestätige deine Anmeldung“ mit Knopf „Ja, ich möchte die Mittagskarte“; nach dem Klick die Seite „Du bekommst die Mittagskarte ab jetzt per E-Mail“ | Absender → Absender | Zahl in der Wirt-Ansicht | unbestätigt 30 Tage; bestätigt bis zur Abmeldung; nach Abmeldung nur ein Hash in der Sperrliste |
| Montag 07:15 | „Die Wochenkarte der Wirtschaft ist da“ mit Link zur Karte | Absender → Absender | – | – |
| Anmeldung **Termine** („Bleibt auf dem Laufenden“, Terminseite) | „Bitte bestätige deine Anmeldung“ mit Knopf „Ja, ich möchte die Termine“; nach dem Klick die Seite „Du erfährst ab jetzt per E-Mail, wenn neue Termine feststehen“ *(bis 21.10. stand hier fälschlich „Mittagskarte“ – behoben)* | **`EVENTS_ABSENDER`** – heute leer, dann wie Absender; Ziel uri@eugen.family | Zahl in der Wirt-Ansicht | wie oben, eigene Liste und eigener Einwilligungstext |
| Neue Termine stehen fest | *noch kein automatischer Versand* – die Liste wird gesammelt; ein Rundschreiben verschickt der Programmierer bzw. Emma & Eugen aus Brevo | – | – | – |

### 2.6 Was nur das Haus bekommt

| Wann | Was | An | Absender |
|---|---|---|---|
| werktags 08:00 | **Tageszettel**: Reservierungen (Personen), Vorbestellungen, Warnung „KARTE FEHLT“ | `WIRT_MAIL` | Absender |
| Freitag 15:00 | **Wochenbericht**: Gäste, Portionen Takeaway | `WIRT_MAIL` | Absender |
| sofort | jede Takeaway-Bestellung (2.2) | `WIRT_MAIL` | Absender |
| sofort | jede Anfrage (2.4) | `ANFRAGE_MAIL` | Absender, Antwort an = Gast |
| sofort | **Push** aufs Handy: Bestellung, Reservierung, Anfrage, „wieder Karten“, neuer Abend | jedes Gerät mit „Klingeln“ | – (kein Mailweg) |
| täglich 07:30 | **nur bei Fehler**: „termine-abgleich failed“ | Besitzer des GitHub-Repositories (heute Jonas, später web@) | GitHub |
| bei Störung | Warnungen von Cloudflare und Brevo (Limit erreicht, Rechnung, Sicherheit) | Konto-Inhaber (heute Jonas, später web@) | Anbieter |

### 2.7 Was **nicht** über die Webseite läuft

- **Mail direkt an willkommen@** (Gast schreibt selbst): kommt im Postfach bei
  Hetzner an. Eine automatische Antwort kann nur das Postfach selbst
  (Autoresponder, Vorschlagstext im Handbuch fürs Haus, Abschnitt 4).
- **Antwort eines Gastes auf eine automatische Mail**: landet beim Absender –
  heute bei Jonas, künftig in willkommen@. Auch deshalb ist Abschnitt 3 dringend.
- **Tickets**: Ticketist schreibt dem Käufer; die Webseite nie.

---

## 3. Was sich ändern muss – Ort, heute, neu, wer

Reihenfolge ist die Reihenfolge der Übergabe-Etappen (`uebergabe-wirtschaft.md`).
Die Werte für „neu“ kommen aus dem **Entscheidungsblatt** – wo es noch
nicht ausgefüllt ist, steht die Empfehlung.

| # | Was | Wo genau | Heute | Neu | Wer | Wann |
|---|---|---|---|---|---|---|
| 1 | Postfach / Weiterleitung **web@** anlegen | Hetzner, Postfächer der Domain | gibt es nicht | web@ → Hannah | Hannah | Etappe 1 |
| 2 | Inhaber-Adresse der Konten **GitHub, Cloudflare, Brevo** | Konten neu anlegen, Jonas überträgt bzw. rollt neu aus | Jonas | web@ (Zwei-Faktor, zweite Person) | Hannah, dann Programmierer | Etappen 1–3 |
| 3 | **`WIRT_MAIL`** – Tageszettel, Wochenbericht, Takeaway-Bestellungen | `server/wrangler.jsonc`, Produktion **und** Probe, dann `wrangler deploy` | jonas.gamper@aon.at | willkommen@ oder buero@ (Entscheidungsblatt Frage 6) | Programmierer | Etappe 3 |
| 4 | **`ANFRAGE_MAIL`** – Anfragen Locations/Agentur | `server/wrangler.jsonc`, beide Umgebungen | willkommen@ | bleibt (Frage 5) | – | – |
| 5 | **Domain bei Brevo bestätigen** | Brevo → Senders & Domains → Domain hinzufügen; die vier angezeigten Einträge bei Hetzner (DNS) anlegen; ggf. SPF um `include:spf.brevo.com` ergänzen | wirtschaft-dornbirn.at bei Brevo angelegt, **Einträge fehlen** | bestätigt | Programmierer + Hannah (DNS-Zugang) | Etappe 4 |
| 6 | **`BREVO_ABSENDER`** – Absender aller automatischen Mails | Geheimnis des Dienstes: `wrangler secret put BREVO_ABSENDER` (Produktion); Probe sendet nicht | jonas.gamper@aon.at | willkommen@wirtschaft-dornbirn.at (Frage 4) | Programmierer | Etappe 4, **erst nach #5** |
| 7 | **`EVENTS_ABSENDER`** – Absender der Terminliste | `server/wrangler.jsonc` (Variable, beide Umgebungen) | leer (= Hausabsender) | uri@eugen.family | Programmierer – **erst, wenn Uri die Adresse bei Brevo bestätigt hat** (Brevo schickt ihm eine Mail mit Link; oder die Domain eugen.family wird wie #5 bestätigt) | nach Etappe 4 |
| 8 | **`BREVO_KEY`** – Schlüssel zum Brevo-Konto | Geheimnis des Dienstes | Schlüssel aus Jonas' Konto | neuer Schlüssel aus dem Konto des Hauses | Programmierer | Etappe 4 |
| 9 | **GitHub-Fehlermail** (termine-abgleich) | geht an den Besitzer des Repositories | Jonas | web@ bzw. Programmierer (Frage 10) | ergibt sich mit #2 | Etappe 2 |
| 10 | **Kontakt beim Registrar** der Domain | Hetzner-Kundenkonto (Rechnungs- und Warnadresse) | unbekannt – Rechnung prüfen | web@ + eine private Reserve (Frage 16) | Hannah | jetzt |
| 11 | **Autoresponder** auf willkommen@ | Hetzner, Postfach-Einstellungen | keiner | Vorschlagstext (Frage 12) | Hannah, Programmierer hilft | jetzt |
| 12 | Veranstalter-Kontakt uri@ im Fuß und in `termine.json` | `site/*.html`, `site/data/termine.json` | uri@eugen.family | bleibt (Frage 11) | – | – |
| 13 | Testeinträge mit „TEST“ (Reservierungen, Bestellungen, Wartelisten) | Produktion, über die Wirt-Ansicht | vorhanden | gelöscht | Programmierer | vor dem Start |

**Prüfen, dass es funktioniert – nach #5 und #6:** eine Testreservierung mit
einer **Gmail-Adresse** – die Bestätigung muss im Posteingang liegen, nicht
im Spam, und als Absender „Wirtschaft Dornbirn ‹willkommen@…›“ zeigen. Dann
auf die Mail antworten – die Antwort muss in willkommen@ ankommen. Dann eine
Anfrage über Locations – die Mail ans Haus muss beim „Antworten“ den Gast
als Empfänger vorschlagen. `npm run check:uebergabe` zeigt #2, #3 und die
Adressen als Ampel.

---

## 4. Wie die Daten hinterlegt sind

Alles liegt in **einem** Speicher des Dienstes bei Cloudflare, getrennt nach
Zweck. (Ein fester EU-Standort ist heute nicht festgelegt – das kann der
Programmierer beim Neuausrollen im Konto des Hauses setzen.) Keine Datei auf einem Server, kein
Excel, kein Drittanbieter außer Brevo für den Versand.

| Daten | Wo | Was genau | Wie lange | Wer sieht sie |
|---|---|---|---|---|
| Reservierungen | Tabelle `reservierungen` | Name, Termin, Personen, Telefon und/oder E-Mail, Wünsche, Absage-Token | **30 Tage nach dem Termin**, dann gelöscht | Wirt-Ansicht (Hausschlüssel) |
| Takeaway-Bestellungen | Tabelle `takeaway` | Nummer, Name, Telefon, E-Mail (freiwillig), Speisen, Abholzeit, Status | 30 Tage nach dem Abholtag | Wirt-Ansicht; der Gast seine eigene über den Status-Link |
| Wartelisten (Mittag, Abende) | Einstellungen des Dienstes | Name, Kontakt, Wunsch, Anzahl | Mittag: bis zum Tag; Abende: bis zum Abend, ohne Datum 60 Tage | Wirt-Ansicht |
| Anfragen Locations/Agentur | Einstellungen des Dienstes | Angaben aus dem Formular, Status | **90 Tage** | Wirt-Ansicht; Kopie als Mail in willkommen@ |
| Newsletter (zwei Listen) | Tabelle `newsletter` | E-Mail, Liste, Einwilligungstext mit Version, Zeitpunkt, Token | unbestätigt 30 Tage; bestätigt bis zur Abmeldung | Zahlen in der Wirt-Ansicht; Adressen nur im Dienst |
| Abgemeldete | Tabelle `sperrliste` | nur ein Hash der Adresse (nicht rückrechenbar), damit niemand still wieder eingetragen wird | dauerhaft | niemand im Klartext |
| Gastprofile („merkt euch meine Angaben“) | Tabelle `gastprofile` | Hash der Adresse/Nummer, gemerkte Angaben; Unverträglichkeiten nur mit eigener Einwilligung | 730 Tage ab letztem Besuch | beim nächsten Reservieren des Gastes |
| Push-Anmeldungen (Haus und Gäste) | Einstellungen des Dienstes | Browser-Adresse des Geräts, kein Name | bis zur Abmeldung oder bis der Browser sie verwirft | – |
| Wochenkarte, Öffnungszeiten, Hinweise, Tische | Einstellungen, Tabelle `mittagskarte` | was das Haus in der Wirt-Ansicht einträgt | bis zur Änderung | alle (Karte), Haus (Rest) |
| Termine der Abende | Einstellungen + `site/data/termine.json` | Titel, Datum, Ticketlink, Status | laufend | alle |
| Mails | **Brevo** (Versandprotokoll: Empfänger, Betreff, Zustellstatus) | kein Inhalt dauerhaft | Brevo-Protokoll (Tage bis Wochen, laut Brevo-Einstellung) | Brevo-Konto |
| Sicherung | Datei, die der Programmierer zieht (`sicherung`) | alles oben, verschlüsselt übertragen | wird nach dem Einspielen gelöscht | Programmierer |

**Rechtsgrundlagen, kurz:** Reservierung, Bestellung, Anfrage = Vertrag
(Art. 6 Abs. 1 lit. b DSGVO). Newsletter, Gastprofil, Push = Einwilligung
(lit. a), jede getrennt widerrufbar; der Wortlaut wird mitgespeichert.
Unverträglichkeiten = Art. 9, eigene ausdrückliche Einwilligung. Die
Datenschutzseite der Webseite sagt dasselbe in Gästesprache.

---

## 5. Kurzfassung für den Kühlschrank

- **Gäste schreiben an / antworten auf:** willkommen@wirtschaft-dornbirn.at
  (heute noch: Jonas – bis Etappe 4 erledigt ist)
- **Anfragen kommen an:** willkommen@ – „Antworten“ geht an den Gast
- **Tageszettel, Wochenbericht, Bestellungen kommen an:** `WIRT_MAIL` – heute
  Jonas, neu nach Entscheidungsblatt (willkommen@ oder buero@)
- **Terminliste (Emma & Eugen) sendet als:** uri@eugen.family – sobald bei
  Brevo bestätigt
- **Rechnungen, Warnungen, Passwörter der Konten:** web@ – anlegen
- **Tickets:** Ticketist, nie wir
