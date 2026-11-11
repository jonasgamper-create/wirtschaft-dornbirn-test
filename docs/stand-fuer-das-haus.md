# Stand der neuen Webseite · 11. November 2026

Für Sarah, Hannah und Wolfgang. Dieses Blatt erklärt sich selbst – es braucht
keine Erklärung dazu. Es sagt, **was seit eurer Nachricht vom 3. November
gemacht ist**, **wo ihr es ansehen könnt** und **was noch offen ist und wer
es tut**. Jede Angabe ist am 10. und 11. November an der laufenden Seite, am
Dienst, bei Ticketist und an der Domain nachgeprüft, dreimal und unabhängig
voneinander (Punkt 7). Nichts ist geraten.

---

## Kurz gesagt

- **Eure Wünsche sind umgesetzt**, soweit sie an der Webseite liegen – in der
  Testumgebung und auf der neuen Seite, beides live.
- **Hannah hatte recht mit den Ticketkategorien.** Ticketist gibt sie heraus;
  unsere Erklärung vom 3. November war falsch. Die Seite liest Kategorien,
  Preise und freie Plätze jetzt selbst bei Ticketist. Alle 37
  kommenden Abende zeigen ihre Preise, auch die 20 ab Jänner.
- **An eurer Domain und an der alten Seite wurde nichts verändert** –
  nachgeprüft, der Beleg steht in Punkt 7.
- **Offen ist vor allem der Mailabsender:** In eurem Brevo-Konto fehlen der
  Klick auf *Authenticate* und danach ein Schlüssel für den Dienst. Dann
  stellt Jonas um (Punkt 4).

---

## 1 Wo ihr alles ansehen könnt

| Adresse | Was es ist | Was passiert, wenn ihr dort etwas tut |
| --- | --- | --- |
| [probe-wirtschaft-dornbirn.pages.dev](https://probe-wirtschaft-dornbirn.pages.dev) | die **Testumgebung** | nichts Echtes: eigene, getrennte Daten, keine Mail an Gäste, kein Klingeln am Handy. Unten steht ein weinrotes Band „Testseite“. Hier dürft ihr alles ausprobieren. |
| [wirtschaft-dornbirn.pages.dev](https://wirtschaft-dornbirn.pages.dev) | die **neue Seite** auf einer kostenlosen Adresse, mit dem echten Dienst | Reservierungen, Bestellungen und Anfragen sind **echt** und kommen im Haus an. Zum Ansehen ja, zum Ausprobieren bitte die Testumgebung. |
| `wirtschaft-dornbirn.at` | die **alte Seite** (WordPress bei Hetzner) | unverändert, wie bisher |

Beide neuen Adressen kosten nichts und brauchen keinen Eintrag in eurer
Domain. Gäste, die `wirtschaft-dornbirn.at` eintippen, sehen weiterhin die
alte Seite – das bleibt so, bis ihr den Umzug freigebt (Punkt 5).

## 2 Eure Nachrichten vom 3. November – und was daraus geworden ist

### Sarah: Konten und Einträge

Sarah hat die Konten bei **Brevo** und **GitHub** angelegt und mit Markus
die Einträge für die Mails bei Hetzner gesetzt – für **beide** Domains,
`wirtschaft-dornbirn.at` und `eugen.family`. **Nachgeprüft am 10. November
von außen:** Alle Einträge sind da und richtig – die zwei Schlüssel
(DKIM), der Brevo-Code, die Liste der erlaubten Absender (SPF) und die Regel
für gefälschte Mails (DMARC). Die Einträge für
eure Postfächer (`MX`, `mail.`) sind unberührt, Post ans Haus kommt
weiterhin an.

**Markus’ Hinweis zur Marken-Subdomain:** Er hat recht, und es ist so
eingehalten. Unter `mail.` läuft euer Postfach-Server bei Hetzner. Dieser
Name darf deshalb nie auf Brevo umgeleitet werden, sonst käme außerhalb von
Brevo keine Post mehr an. Es wurde **kein** Eintrag namens `mail` angelegt
oder geändert. Für die Beglaubigung genügen die gesetzten Einträge. Fragt
Brevo beim Beglaubigen trotzdem nach einer eigenen Unteradresse, heißt sie
`post` (also `post.wirtschaft-dornbirn.at` und `post.eugen.family`), nie
`mail`.

### Hannah, Antwort 1: Anfragen an Emma & Eugen

Eure Antwort: kein eigenes Kulturhaus-Formular – im Formular
„Locations · Feste & Catering“ ist das Kulturhaus als Wunschort wählbar.
Und weil ihr die „wirtschaft“ nur bis Sommer 2028 habt, sollen Anfragen aus
beiden Formularen (Locations und Agentur) an `uri@eugen.family` gehen.

**Umgesetzt und live:** Beide Formulare schicken seit 10. November an
`uri@eugen.family`. Seit 11. November zeigt auch der Notweg dorthin: Ist der
Dienst einmal nicht erreichbar, öffnet das Formular eine fertige Mail an
`uri@eugen.family` (bisher an `willkommen@`). Antwortet ihr auf eine
Anfrage, geht die Antwort direkt an den Gast.

**Dabei gefunden und behoben:** Auf der Locations-Seite haben zwei der drei
Knöpfe „anfragen“ (In der Wirtschaft, Wunschort) den Ort im Formular nicht
vorausgewählt – der Gast musste ihn selbst noch einmal wählen. Jetzt setzt
jeder Knopf seinen Ort; nur der Kulturhaus-Knopf hatte schon funktioniert.

**Zwei Fragen an Hannah dazu** (Punkt 6):

1. Über beiden Formularen steht „Lieber direkt?“ mit der Telefonnummer und
   `willkommen@wirtschaft-dornbirn.at`. Soll dort künftig `uri@eugen.family`
   stehen, oder bleibt die Wirtschaft als direkter Kontakt?
2. Nach außen treten die Anfragen noch als „wirtschaft“ auf: die
   Bestätigungsmail an den Gast („Danke für eure Anfrage – „wirtschaft“
   Dornbirn“) und die Datenschutzseite („an die Wirtschaft weitergeleitet“).
   Gehört Emma & Eugen zur selben Firma wie die Wirtschaft (Wolfgang Preuß
   e.U.)? Dann passen wir nur die Worte an; sonst braucht die
   Datenschutzseite einen Satz mehr.

### Hannah, Antwort 2: Kopie des Tageszettels an Jonas

**Vorbereitet, noch nicht eingeschaltet.** Der Dienst kann Tageszettel und
Wochenbericht mit Kopie an Jonas schicken. Aktiv wird die Kopie, sobald
Jonas seine Adresse im Dienst hinterlegt hat – das macht er selbst, sie
steht absichtlich nicht im Bauplan der Seite (der ist öffentlich). Bis
dahin geht der Tageszettel wie bisher nur an `veranstaltungen@`. Dort ist
er zugestellt worden am 4., 5., 6., 9. und 10. November.

### Hannah, Antwort 3: Die Ticketkategorien

**Ihr hattet recht – unsere Erklärung vom 3. November war falsch.** Wir
hatten geschrieben, Ticketist gebe Kategorien und Preise nicht heraus. Das
stimmt nicht: Ticketist gibt Kategorien, Preise und freie Plätze öffentlich
heraus, nur an einer anderen Stelle als die übrigen Angaben zum Abend.
Nachgeprüft am 10. November an allen Abenden und allen Ticketwegen.

**Umgesetzt, live seit 11. November:** Die Seite holt sie jetzt selbst bei
Ticketist – zusammen mit Name, Datum, Uhrzeit und Verkaufsstand. Damit:

- haben **alle 37 kommenden Abende ihre Preise**, auch die 20 ab
  Jänner 2027, und zwar auf der Startseite wie auf der Eventseite;
- stimmen Preise und „ausverkauft“ immer mit Ticketist überein. Ändert ihr
  in Ticketist einen Preis oder gebt Plätze frei, zeigt die Seite es von
  selbst – so schnell wie alle übrigen Angaben zum Abend: der Dienst liest
  jeden Abend spätestens alle zwölf Stunden neu bei Ticketist;
- steht „ausverkauft“ je Kategorie richtig da. Beispiele, Stand 11. November:
  the monroes am 10.12. ist in beiden Kategorien ausverkauft; bei Luis aus
  Südtirol am 25.11. gibt es nur noch in Kategorie 2 Karten; bei naturally 7
  am 2.2. ist „konzert only“ ausverkauft, das Dinner nicht;
- führt die Warteliste in der Wirt-Ansicht jetzt alle Abende, die wirklich
  ausverkauft sind.

**Ihr müsst nichts schicken, und Markus muss nichts suchen.** Antwortet
Ticketist einmal nicht, zeigt die Seite den zuletzt gelesenen Stand.

### Hannah, Antwort 4: Das Postfach `kueche@`

Bleibt, wie ihr es wollt. Die Webseite verwendet es nicht; es ist nichts zu
tun.

## 3 Was sonst noch besser geworden ist

- **Die Startseite sagt dasselbe wie die Eventseite.** Eine Warteliste
  bietet sie nur an, wenn ein ganzer Ticketweg ausverkauft ist – nicht schon,
  wenn eine einzelne Kategorie weg ist (bei Luis am 25.11. versprach sie
  vorher eine Warteliste, die es nicht gibt). Der Knopf „Restkarten“ führt
  zum Weg, der noch Karten hat: bei dinner & comedy am 11.11., 15.12. und
  16.12. zu „comedy only“, nicht mehr zum ausverkauften Dinner.
- **Zweite Ticketwege** wie „comedy only“ stehen auf der Startseite mit
  ihrem eigenen Namen und ihrer eigenen Uhrzeit (meist 21:00) – vorher
  stand dort die Uhrzeit des Dinners.
- **Der Kalender nennt den richtigen Ort.** Wer einen Abend im Kulturhaus in
  seinen Kalender übernimmt, bekommt jetzt „Kulturhaus Dornbirn, Rathausplatz
  1“ – bisher stand bei jedem Abend die Bahnhofstraße.
- **Die Ersatzliste der Seite ist vollständig.** Fällt der Dienst einmal
  aus, zeigt die Seite eine hinterlegte Liste. Ihr fehlten drei kommende
  Abende (dinner & comedy am 17.12., Heidelbeerhugo am 21.4., Geschwister
  Pfister am 23.4.); jetzt stehen alle kommenden Abende drin, alle mit
  Preisen.
- **Keine falschen „Karten zurück“-Meldungen.** Die Warteliste meldet
  zurückgekommene Karten nur noch, wenn laut Ticketist auch wirklich etwas
  frei ist.

## 4 Der Mailabsender – was noch fehlt, und warum in dieser Reihenfolge

**Heute** kommen die automatischen Mails (Bestätigungen, Tageszettel) noch
von der privaten Adresse von Jonas und laufen über **sein** Brevo-Konto. Der
Anbieter dieser Adresse sagt den Mailprogrammen der Welt: *„Mails in meinem
Namen, die nicht von mir kommen, bitte abweisen.“* Darum landen
Bestätigungen oft im Spam.

**Die Lösung** ist, von eurer eigenen Domain zu versenden, über **euer**
Brevo-Konto – das, das Sarah angelegt hat. Nur dort sind eure Domains
eingetragen. Dazu braucht es drei Schritte, in genau dieser Reihenfolge:

1. **Sarah: In Brevo beide Domains beglaubigen.** *Senders, Domains &
   Dedicated IPs → Domains*, bei `wirtschaft-dornbirn.at` und bei
   `eugen.family` jeweils *Authenticate*. Die Einträge sind gesetzt, es
   fehlt nur dieser Knopf. Fragt Brevo nach einer Unteradresse: `post`.
2. **Sarah und Jonas gemeinsam, etwa zehn Minuten:** In eurem Brevo-Konto
   einen **API-Schlüssel** erzeugen (*SMTP & API → API Keys → Generate a new
   API key*). Jonas trägt ihn direkt im Dienst ein, am besten bei geteiltem
   Bildschirm. Der Schlüssel geht **nicht** per Mail oder Chat: wer ihn hat,
   kann in eurem Namen Mails verschicken. Warum ein Schlüssel und kein
   Benutzerzugang für Jonas: ein zweiter Benutzer kostet bei Brevo 9 € im
   Monat, der Schlüssel nichts.
3. **Jonas:** Absender auf `willkommen@` umstellen, dann die Absender je
   Zweck einschalten (Service, Veranstaltungen, Emma & Eugen), dann eine
   Probe-Reservierung an eine Gmail-Adresse – die Bestätigung muss im
   **Posteingang** liegen.

**Umgekehrt nicht.** Würde der Absender vor Schritt 1 und 2 umgestellt,
verschickte Brevo **gar nichts** mehr – schlechter als heute. Deshalb
stehen die neuen Absender noch leer.

## 5 Später: die Domain umlegen

`wirtschaft-dornbirn.at` zeigt weiterhin auf die alte WordPress-Seite. Das
Umlegen ist ein eigener Schritt mit eigenem Blatt (*Die neue Webseite in
Betrieb nehmen*) und wird erst gemacht, wenn ihr die Seite abgenommen habt.
Kurz: erst die Mails in Ordnung bringen (Punkt 4), dann eine Woche lang in
der Testumgebung alles ausprobieren, dann an einem ruhigen Vormittag
umschalten, mit Rückweg.

**Wichtig dabei, wie im letzten Blatt beschrieben:** In eurer Domain steht
ein Platzhalter, der jeden Namen zum alten Webserver schickt. Nur deshalb
funktionieren `gutscheine.`, `lieferservice.` und `tischreservierung.`. Er
wird beim Umzug in einem eigenen Schritt zuerst gesichert, damit
Gutscheinverkauf, Lieferdienst und altes Reservierungssystem nicht
stillstehen.

## 6 Was jetzt zu tun ist – wer, was

**Sarah**

1. In Brevo bei beiden Domains *Authenticate* drücken (Punkt 4, Schritt 1).
2. Mit Jonas einen kurzen Termin für den Schlüssel ausmachen (Schritt 2).
3. Noch offen aus dem letzten Blatt: das Konto bei **Cloudflare** (dort
   läuft die Seite), mit `veranstaltungen@`, eine zweite Person mit vollem
   Zugang, Wiederherstellungscodes ausdrucken. Kostet nichts.

**Hannah**

1. Die zwei Fragen aus Punkt 2 beantworten („Lieber direkt?“ und der
   Auftritt der Anfragen als Emma & Eugen).
2. Einmal selbst eine Testanfrage über
   [wirtschaft-dornbirn.pages.dev/feste-catering](https://wirtschaft-dornbirn.pages.dev/feste-catering)
   schicken und nachsehen, ob sie in `uri@eugen.family` ankommt – bitte auch
   im Spam-Ordner, solange der Absender noch nicht umgestellt ist. Seit der
   Umstellung kam noch keine echte Anfrage, deshalb ist dieser eine Test
   noch offen.
3. Aus dem letzten Blatt: kurz bestätigen, dass das Passwort bei Hetzner
   geändert ist.

**Wolfgang:** nichts.

**Jonas**

1. Seine Adresse für die Kopie des Tageszettels im Dienst hinterlegen
   (Antwort 2).
2. Nach Sarahs Schritten 1 und 2: den Absender umstellen und prüfen
   (Punkt 4, Schritt 3).
3. Den Umzug der Domain erst, wenn ihr die Seite abgenommen habt (Punkt 5).

## 7 Dreimal nachgeprüft am 10. und 11. November

1. **Automatisch.** Das Projekt hat 31 eigene Prüfungen; alle laufen
   fehlerfrei durch. Neu dazugekommen sind Prüfungen für das Lesen der
   Kategorien, für die Warteliste, für die Anfrage-Adresse und für die
   Ortsknöpfe. Zur Probe wurde jede Korrektur absichtlich wieder
   zurückgedreht – jedes Mal hat eine Prüfung angeschlagen.
2. **Unabhängig gegengelesen.** Drei Prüfer haben die Änderungen getrennt
   nach Dienst, Seite und Daten durchgesehen; danach hat je ein weiterer
   versucht, jeden Fund zu widerlegen. 13 Funde blieben übrig, keiner davon
   schwer. Alle sind behoben, zwei Nachprüfer haben das bestätigt; die vier
   Kleinigkeiten, die sie dabei noch fanden, sind ebenfalls behoben.
3. **Live nachgemessen.** In der Testumgebung wurde jeder der 65 Ticketwege
   der 37 kommenden Abende einzeln mit Ticketist verglichen – Name und Preis
   stimmen bei allen. Startseite, Eventseite und Formulare wurden am Handy
   (390 Pixel breit) durchgeklickt; eine als TEST markierte Anfrage kam am
   Testdienst an. Am 11. November, nach dem Ausrollen, dasselbe noch einmal am
   echten Dienst: Alle 65 Ticketwege haben ihre Kategorien, Name und Preis
   stimmen bei allen mit Ticketist überein. Die neue Seite liefert genau den
   geprüften Stand aus und wurde ebenfalls am Handy angesehen.

**Der Beleg, dass Domain und alte Seite unberührt sind.** Jede Domain hat
eine Versionsnummer, die bei jeder Änderung an ihr steigt. Sie stand vor der
Arbeit bei 2026103107 (`wirtschaft-dornbirn.at`) und 2026103106
(`eugen.family`) – und steht nach der Arbeit genau dort. Alle 116
Einzelabfragen (Seite, Mailserver, Mail-Einträge, Unteradressen) liefern
dasselbe wie vorher, und `wirtschaft-dornbirn.at`, `gutscheine.`,
`lieferservice.` und `tischreservierung.` antworten wie vorher von der alten
Seite.

## 8 Wo welche Adresse steht – zum Nachschlagen

| Adresse | Wofür sie im System steht | Stand |
| --- | --- | --- |
| **willkommen@** | Kontaktadresse auf der Seite (Fuß, Impressum, „Lieber direkt?“); künftig Hausabsender aller automatischen Mails | richtig |
| **veranstaltungen@** | Tageszettel, Wochenbericht; Inhaberin der Konten; künftig Absender der Warteliste | richtig |
| **service@** | Empfänger jeder Takeaway-Bestellung; künftig Absender von Reservierung und Takeaway | richtig |
| **uri@eugen.family** | Empfänger aller Anfragen (Locations, Agentur), auch im Notweg; Kontakt im Fuß; künftig Absender der Terminliste | eingestellt seit 10.11. |
| **tickets@eugen.family** | künftig Absender der Warteliste für Kulturhaus-Abende | wartet auf Brevo (Punkt 4) |
| **kueche@** | bleibt bestehen, von der Seite nicht verwendet | richtig |
| **Adresse von Jonas** | heute noch **Absender** aller automatischen Mails; künftig nur Kopie von Tageszettel und Wochenbericht | Absender wechselt nach Punkt 4; Kopie noch nicht eingeschaltet |

## 9 Begriffe, kurz erklärt

| Begriff | Was es ist |
| --- | --- |
| **Domain** | Der Name der Seite, hier `wirtschaft-dornbirn.at`. Wem er gehört, dem gehört die Adresse der Seite und aller Postfächer. Euch. |
| **Hetzner** | Die Firma, bei der eure Domain, eure Postfächer und die alte Seite liegen. |
| **Eintrag in der Domain** | Eine Zeile in der Verwaltung der Domain. Sie sagt dem Internet, wo die Seite liegt und wer in eurem Namen Mails verschicken darf. |
| **Testumgebung** | Eine vollständige Kopie der neuen Seite mit eigenem, getrenntem Dienst. Was dort passiert, kommt nirgends an – zum gefahrlosen Ausprobieren. |
| **Dienst** | Das Programm hinter der Seite, das Reservierungen, Bestellungen, Anfragen und die Warteliste annimmt und die Mails auslöst. Es läuft bei Cloudflare. |
| **Ticketkategorie** | Eine Kartenart eines Abends bei Ticketist, z. B. „dinner & comedy (sitzplatz)“ oder „comedy only (stehplatz)“, mit eigenem Preis und eigener Zahl freier Plätze. |
| **Brevo** | Der Dienst, der die automatischen Mails verschickt. Kostenlos bis 300 Mails am Tag; ein voller Tag braucht 40 bis 80. |
| **Authenticate** | Der Knopf in Brevo, mit dem Brevo prüft, ob die Einträge in eurer Domain stimmen. Erst danach darf Brevo mit eurer Adresse versenden. |
| **API-Schlüssel** | Eine lange Zeichenfolge aus eurem Brevo-Konto. Mit ihr darf der Dienst über euer Konto Mails verschicken – geheim zu halten wie ein Passwort. |
| **Cloudflare** | Die Firma, bei der die neue Seite und der Dienst laufen. Kostenlos in dem Umfang, den wir brauchen. |
| **GitHub** | Dort liegt der Bauplan der Seite. Jede Änderung ist nachvollziehbar und lässt sich zurücknehmen. Er ist öffentlich – deshalb stehen dort keine privaten Adressen und keine Schlüssel. |
| **Hausschlüssel** | Der geheime Teil im Link zur Wirt-Ansicht. Ohne ihn kommt niemand an Reservierungen oder Bestellungen. |

## 10 Was es kostet

| Posten | Heute | Nach dem Umzug |
| --- | --- | --- |
| Neue Seite, Dienst und Testumgebung (Cloudflare) | 0 € | 0 € |
| Mailversand (Brevo, kostenlos bis 300 Mails am Tag) | 0 € | 0 € |
| Bauplan (GitHub) | 0 € | 0 € |
| Domain (Hetzner) | wie bisher, bezahlt bis August 2027 | unverändert |
| Postfächer und alte Seite (Hetzner-Paket) | wie bisher | die Postfächer bleiben; die alte Seite kann nach dem Umzug weg, aber `gutscheine.` und `lieferservice.` laufen noch dort – das Paket wird also höchstens kleiner, es fällt nicht ganz weg |
| Ticketist | wie bisher | unverändert |

**Was später etwas kosten könnte** (Preise laut den Anbietern, abgefragt
am 10. November):

- **Brevo:** Erst wenn an einem Tag mehr als 300 Mails hinausgehen – etwa mit
  einem großen Newsletter. Dann das kleinste Bezahl-Paket, 7 € im Monat für
  5.000 Mails. Ein zweiter Benutzer im Konto kostet 9 € im Monat – mit dem
  Schlüssel aus Punkt 4 ist er nicht nötig.
- **Cloudflare:** 5 US-Dollar im Monat erst ab 100.000 Aufrufen am Tag oder
  einem sechsten Zeitplan. Heute nutzen wir unter 5 % davon.

Die Beträge des Hetzner-Pakets und die Gebühren von Ticketist stehen nicht
im Projekt; sie ändern sich durch die neue Seite nicht.
