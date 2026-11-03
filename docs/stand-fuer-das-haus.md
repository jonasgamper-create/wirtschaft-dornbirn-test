# Stand der neuen Webseite · 3. November 2026

Für Hannah und Wolfgang. Dieses Blatt erklärt sich selbst – es braucht keine
Erklärung dazu. Jede Angabe darin ist am 3. November an der laufenden Seite,
am laufenden Dienst und an der Domain nachgeprüft, nichts ist geraten.

Es sagt dreierlei: **was fertig ist**, **was aus euren Antworten geworden
ist** und **was jetzt noch zu tun ist** – das ist kurz.

**Neu seit dem Blatt vom 27. Oktober:** Die Konten bei Brevo und GitHub sind
angelegt, die Einträge für die Mails sind bei Hetzner gesetzt – für beide
Domains, geprüft am 3. November. Eure vier Antworten sind eingebaut. Was
noch fehlt, ist ein einziger Knopfdruck in Brevo und danach eine halbe
Stunde beim Programmierer.

---

## In einem Satz

Die neue Webseite ist fertig und läuft. Sie ist nur noch **nicht unter
`wirtschaft-dornbirn.at` erreichbar** – dort liegt weiterhin die alte Seite.
Die automatischen Mails gehen noch von der Testadresse von Jonas los; die
Einträge, die das beheben, sind seit dem 2. November gesetzt – es fehlt nur
noch die Beglaubigung in Brevo, dann wird der Absender umgestellt.

---

## 1 Was fertig ist und läuft

Die neue Seite liegt heute unter
[wirtschaft-dornbirn.pages.dev](https://wirtschaft-dornbirn.pages.dev).
Alle acht Seiten antworten, keine Fehlermeldung in der Konsole.

| Was Gäste tun können | Stand |
| --- | --- |
| Mittagstisch reservieren, mit Bestätigung und Kalendereintrag | läuft |
| Takeaway bestellen, mit Nummer, Abholzeit und Status-Link | läuft |
| Termine ansehen, Tickets kaufen, auf die Warteliste gehen | läuft, 39 kommende Abende |
| Anfragen für Feste, Catering und Agentur stellen | läuft |
| Mittagskarte lesen, mit Allergenen und Preisen | läuft, Woche ab 26.10. steht |
| Zur Mittagskarte oder zu Terminen per Mail angemeldet bleiben | läuft |

Dazu für euch: die **Wirt-Ansicht** am Handy (Reservierungen, Bestellungen,
Anfragen, Warteliste), der **Tageszettel** werktags um 08:00, der
**Wochenbericht** am Freitag und das **Klingeln** aufs Handy bei jeder neuen
Bestellung. Alle fünf Zeitpläne des Dienstes sind aktiv, geprüft beim
Ausrollen heute Abend.

Die Wirt-Ansicht ist **zugesperrt**: ohne den Hausschlüssel im Link kommt
niemand hinein (geprüft: ohne Schlüssel wird abgewiesen, mit Schlüssel geht
es). Der Schlüssel wurde heute erneuert – Geräte, die ihn noch nicht haben,
brauchen den neuen Link einmal von Jonas.

## 2 Was aus eurem Entscheidungsblatt eingebaut ist

Hannah hat das Blatt am 27.10. ausgefüllt. Alles, was ohne Vorbedingung geht,
ist eingebaut und ausgerollt:

| Was | Wohin es jetzt geht |
| --- | --- |
| Tageszettel und Wochenbericht | `veranstaltungen@wirtschaft-dornbirn.at`, Kopie an Jonas (eure Antwort vom 3.11.) |
| jede einzelne Takeaway-Bestellung | `service@wirtschaft-dornbirn.at` |
| Anfragen für Locations (Feste & Catering) und Agentur | `uri@eugen.family` (eure Antwort vom 3.11., siehe Punkt 6) |

Der Tageszettel um 08:00 kommt bei `veranstaltungen@` an. Wenn er nicht
auftaucht, bitte zuerst im Spam-Ordner nachsehen – siehe Punkt 3, das ist
derselbe Grund, und er verschwindet mit der Umstellung des Absenders.

Außerdem kann die Seite jetzt **je Zweck einen eigenen Absender** verwenden,
so wie ihr es aufgeschrieben habt: Reservierung und Takeaway vom Service, die
Warteliste eines Abends in der „wirtschaft“ von den Veranstaltungen, die
eines Kulturhaus-Abends von Emma & Eugen. Eingeschaltet ist das noch nicht,
und zwar mit Absicht – Punkt 3 erklärt, warum.

Ebenfalls übernommen: Es wird **kein Postfach `web@`** angelegt, die drei
Konten laufen auf `veranstaltungen@`, zweite Person mit vollem Zugang ist
**Sarah**, im Fuß bleiben „wirtschaft“ und Emma & Eugen stehen, und
`willkommen@` bekommt **keine** automatische Antwort.

Eine gute Nachricht aus Abschnitt C: Die Domain gehört dem Haus
(„wirtschaft“ cafe restaurant bar · Wolfgang Preuß e.U.), liegt bei Hetzner
und ist bis **August 2027** bezahlt. Damit ist die größte Sorge aus dem
früheren Plan vom Tisch – ein Inhaberwechsel hätte Wochen gedauert.

## 3 Das eine, was noch nicht geht: der Absender

Wenn ein Gast heute reserviert, kommt die Bestätigung von
`jonas.gamper@aon.at`. Diese Adresse gehört zu einem fremden Anbieter, und
dieser Anbieter sagt den Mailprogrammen der Welt ausdrücklich: *„Mails in
meinem Namen, die nicht von mir kommen, bitte abweisen.“* Gmail, GMX und
Outlook halten sich daran. Darum landen Bestätigungen oft im Spam oder kommen
gar nicht an.

Die Lösung ist, von einer Adresse **eurer eigenen Domain** zu versenden. Dazu
muss der Mailversand (Brevo) beweisen dürfen, dass er für
`wirtschaft-dornbirn.at` senden darf. Das geschieht über **vier Einträge in
der Domain** bei Hetzner.

**Stand 3. November, von außen nachgeprüft:** Die Einträge sind gesetzt –
und zwar für **beide** Domains, `wirtschaft-dornbirn.at` und `eugen.family`
(Hannah und Markus, 2. November). Alle vier stimmen, der bestehende
SPF-Eintrag wurde richtig geändert statt verdoppelt, und die Einträge für
eure Postfächer (`MX`, `mail.`) sind unberührt – Post ans Haus kommt
weiterhin an. Damit ist auch der Punkt „Uri muss `eugen.family` beglaubigen
lassen“ aus dem letzten Blatt erledigt.

Die Reihenfolge bleibt zwingend, und zwar in dieser Richtung:

1. ~~Die vier Einträge bei Hetzner setzen~~ – **erledigt.**
2. In Brevo auf *Authenticate* drücken und warten, bis beide Domains grün
   sind. Das kann nur, wer im Brevo-Konto angemeldet ist: Hannah (oder sie
   gibt dem Programmierer Zugang).
3. **Erst dann** stellt der Programmierer den Absender auf `willkommen@` um
   und schaltet danach die Absender je Zweck ein (Service, Veranstaltungen,
   Emma & Eugen).

**Umgekehrt nicht.** Wird der Absender vor der Beglaubigung umgestellt,
verschickt Brevo **gar nichts** mehr – dann wäre es schlechter als heute.
Genau deshalb stehen die neuen Absender noch leer.

**Zu Markus’ Hinweis mit der Marken-Subdomain:** Er hat recht. Brevo schlägt
beim Einrichten eine Unteradresse wie `mail.wirtschaft-dornbirn.at` vor, von
der aus technisch versendet wird. Die darf **nicht** `mail` heißen: unter
diesem Namen läuft bereits euer Postfach-Server bei Hetzner, und ein Name
kann nicht beides zugleich sein – ihr könntet dann außerhalb von Brevo
keine Post mehr empfangen oder senden. Deshalb ist die Vorgabe: **ein Name,
den es noch nicht gibt**, bei uns `post` – also `post.wirtschaft-dornbirn.at`
und `post.eugen.family`. Für die Beglaubigung selbst ist dieser Schritt
nicht nötig; die vier Einträge genügen. Wenn Brevo ihn trotzdem verlangt,
setzt ihn der Programmierer mit diesem Namen. Es wird in keinem Fall ein
Eintrag namens `mail` angelegt oder geändert.

## 4 Das Größte, was noch aussteht: die Domain umlegen

`wirtschaft-dornbirn.at` zeigt heute noch auf die alte WordPress-Seite
(nachgeprüft). Die neue Seite liegt daneben unter der Adresse
`wirtschaft-dornbirn.pages.dev`. Solange das so ist, sehen Gäste, die den
Namen eintippen, die alte Seite.

**Das machen wir nicht in einem Zug.** Dafür liegt ein eigenes Blatt bei:
*Die neue Webseite in Betrieb nehmen*. Dort steht der ganze Weg Schritt für
Schritt. Kurz gefasst, und erst der letzte Schritt ist unumkehrbar:

1. **Die Mails in Ordnung bringen.** Geht sofort, unabhängig von allem
   anderen, und die laufende Seite merkt nichts davon.
2. **Die fertige Seite unter einer eigenen Testadresse** ansehen. Die gibt es
   schon: `probe-wirtschaft-dornbirn.pages.dev`. Sie kostet nichts, und an
   eurer Domain wurde dafür **nichts** geändert.
3. **Eine Woche abnehmen.** Jeder im Haus probiert alles aus. Auf dieser
   Testseite kann nichts kaputtgehen: sie schreibt in eine eigene, leere
   Datenbank und verschickt keine Mail. Sie erkennt das an ihrer eigenen
   Adresse, ganz von selbst, und sagt es unten am Bildschirmrand.
4. **Umschalten** – an einem ruhigen Vormittag, mit Rückweg.

**Ein Fund, den ihr kennen solltet.** In eurer Domain steht ein Platzhalter:
ein Eintrag, der jeden erdenklichen Namen zum alten Webserver schickt, auch
Namen, die nie jemand angelegt hat. `gutscheine.`, `lieferservice.` und
`tischreservierung.` funktionieren nur deshalb. Wer `www` auf die neue Seite
stellt, ohne das vorher zu regeln, nimmt alle drei mit – dann stehen
Gutscheinverkauf, Lieferdienst und das alte Reservierungssystem still, ohne
dass sie jemand angefasst hat. Im Ablauf hat das jetzt einen eigenen Schritt
an einem eigenen Tag, mit eigener Prüfung. **Gefunden, bevor es passiert
ist** – genau dafür macht man so einen Ablauf.

## 5 Was ihr jetzt tun müsst

**Hannah** (zehn Minuten)

1. ~~Bei Hetzner das Passwort ändern~~ – bitte kurz bestätigen, dass es
   geschehen ist.
2. ~~Konten anlegen~~ – **Brevo und GitHub stehen** (3. November). Fehlt
   noch **Cloudflare** (dort läuft die Seite), ebenfalls mit
   `veranstaltungen@`, Sarah als zweite Person, Wiederherstellungscodes
   ausdrucken. 0 Euro.
3. **In Brevo beide Domains beglaubigen lassen:** *Senders, Domains &
   Dedicated IPs → Domains*, bei `wirtschaft-dornbirn.at` und bei
   `eugen.family` auf *Authenticate*. Die Einträge sind gesetzt, es fehlt
   nur dieser Knopf. Wenn Brevo dabei nach einer Unteradresse fragt: `post`,
   nicht `mail` (Punkt 3).
4. **Jonas Zugang zum Brevo-Konto geben** (als Benutzer, nicht das
   Passwort), damit er den Absender umstellen und den Schlüssel für den
   Dienst holen kann.
5. **Die Ticketkategorien der 20 Frühjahrsabende** einmal schicken – siehe
   Punkt 6, Antwort 3. Eine Liste oder Bildschirmfotos aus Ticketist genügen.

**Wolfgang**: nichts mehr. Das Gespräch mit Uri ist durch die gesetzten
Einträge für `eugen.family` gegenstandslos.

**Der Programmierer** (eine halbe Stunde, sobald Brevo grün ist)

Absender auf `willkommen@` umstellen, dann die Absender je Zweck einschalten,
dann eine Probe-Reservierung mit einer privaten Gmail-Adresse: die
Bestätigung muss im **Posteingang** liegen. Dazu die Kopie des Tageszettels
hinterlegen und die Ticketkategorien eintragen, sobald sie da sind. Der
Umzug der Domain bleibt ein eigener Schritt, mit eigener Abnahme
(Punkt 4).

## 6 Eure vier Antworten – und was daraus geworden ist

1. **Anfragen fürs Kulturhaus.** Eure Antwort: kein eigenes Formular, das
   Kulturhaus lässt sich im Formular „Locations · Feste & Catering“ als
   Wunschort wählen. Und weil ihr die „wirtschaft“ nur bis Sommer 2028
   habt, sollen Anfragen aus beiden Formularen (Locations und Agentur)
   lieber gleich an `uri@eugen.family` gehen statt an `willkommen@`.
   **Eingebaut:** Beide Formulare gehen jetzt an `uri@eugen.family`. Der
   Gast sieht davon nichts; „Antworten“ auf eine Anfrage geht weiterhin
   direkt an ihn. Zurück auf `willkommen@` ist eine Zeile – sagt Bescheid,
   falls ihr es doch anders wollt.
2. **Der Tageszettel.** Eure Antwort: eine Kopie an Jonas, solange er den
   technischen Support macht. **Eingebaut:** Tageszettel und Wochenbericht
   gehen an `veranstaltungen@` mit Kopie an Jonas. Seine Adresse steht nicht
   im Bauplan der Seite (der ist öffentlich), sondern als Geheimnis im
   Dienst – fällt der Support weg, nimmt man das Geheimnis heraus, fertig.
3. **Die Ticketkategorien.** Eure Antwort: In Ticketist sind bei allen
   Abenden, auch den Frühjahrsterminen, die Kategorien festgelegt; das
   Problem müsse bei der Übertragung liegen, Markus solle nachsehen.
   **Nachgeprüft, und das ist die Erklärung:** Es gibt keine Übertragung der
   Kategorien, die kaputt sein könnte. Die Seite holt sich von Ticketist
   Name, Untertitel, Tag, Uhrzeit, Ort, Bild und ob noch verkauft wird –
   das gibt Ticketist öffentlich heraus. **Die Kategorien und Preise gibt
   Ticketist nicht heraus**, sie werden erst im Kassenfenster geladen, wenn
   ein Gast kauft. Darum stehen sie in einer eigenen Liste im Bauplan der
   Seite und wurden bisher von Hand aus Ticketist abgeschrieben – bei den
   Abenden bis Dezember ist das geschehen, bei den **20 Abenden ab Januar
   2027** noch nicht (geprüft am 3. November, die Liste steht unten). Was es
   braucht: einmal die Kategorien mit Preisen dieser 20 Abende – als Liste
   oder als Bildschirmfotos aus Ticketist. Der Programmierer trägt sie ein,
   das dauert eine Stunde. Markus muss dafür nichts suchen; Jonas spricht
   es mit ihm trotzdem kurz ab, falls Ticketist doch eine Schnittstelle
   dafür hat, die wir nicht kennen – dann fiele das Abschreiben künftig weg.
4. **Das Postfach `kueche@`** bleibt, wie ihr es wollt. Die Webseite
   verwendet es nicht; es muss nichts getan werden.

**Die 20 Abende ohne Kategorien** (Stand 3. November): Faschingsball 9.1.,
helden reisen 12.1. und 13.1., naturally 7 2.2., love and theft 4.2.,
tobias gnacke 18.2., dinner & comedy 24.2., philipp lingg’s musikzimmer
3.3., notenlos 10.3., dinner & comedy 17.3., gabriel castañeda 7.4., gansch
& breinschmid 8.4., dinner & comedy 14.4., maxjoseph 15.4., Italian Tribute
Night 16.4., schick sisters 21.4., arn & arn 22.4., kernölamazonen 23.4.,
helden reisen 18.5. und 19.5.

## 7 Was sich von selbst erledigt – kein Handlungsbedarf

- **Testeinträge.** Im Bestand liegen noch sechs Probe-Reservierungen und
  zwei Probe-Bestellungen, alle deutlich mit „TEST“ im Namen. Sie
  verschwinden von selbst: Reservierungen werden 30 Tage nach ihrem Datum
  gelöscht. Die vom 28./29. September sind damit Ende Oktober weg, die vom
  9. Oktober Anfang November.
- **Die alte Mittagskarten-Datei**, die noch keine Allergene enthielt, ist
  nicht mehr erreichbar. Die Mittagskarte auf der Seite führt Allergene und
  Preise je Gericht.
- **Die Mailliste.** Ein bestätigter Eintrag (Hannah), keine offenen. Das ist
  richtig so – geworben wurde dafür noch nicht.

## 8 Wo welche Adresse steht – zum Nachschlagen

| Adresse | Wofür sie im System steht | Stand |
| --- | --- | --- |
| `willkommen@` | Kontaktadresse auf der Seite; künftig Hausabsender aller automatischen Mails | richtig |
| `veranstaltungen@` | Tageszettel, Wochenbericht; Inhaberin der Konten; künftig Absender der Warteliste | richtig |
| `service@` | Empfänger jeder Takeaway-Bestellung; künftig Absender von Reservierung und Takeaway | richtig |
| `uri@eugen.family` | Empfänger aller Anfragen (Locations, Agentur); Kontakt im Fuß; künftig Absender der Terminliste | seit 3.11. |
| `tickets@eugen.family` | künftig Absender der Warteliste für Kulturhaus-Abende | Einträge gesetzt, wartet auf Brevo |
| `kueche@` | bleibt bestehen, von der Seite nicht verwendet | richtig |
| Adresse von Jonas | heute noch **Absender** aller automatischen Mails; künftig nur Kopie von Tageszettel und Wochenbericht | Absender muss weg, siehe Punkt 3 |

## 9 Begriffe, kurz erklärt

| Begriff | Was es ist |
| --- | --- |
| **Domain** | Der Name der Seite, hier `wirtschaft-dornbirn.at`. Wem er gehört, dem gehört die Adresse der Seite und aller Postfächer. Euch. |
| **Hetzner** | Die Firma, bei der eure Domain und eure Postfächer liegen. Abgelesen aus der öffentlichen Auskunft zur Domain, von Hannah im Blatt bestätigt. |
| **Eintrag in der Domain** | Eine Zeile in der Verwaltung der Domain. Sie sagt dem Internet, wo die Seite liegt und wer in eurem Namen Mails verschicken darf. |
| **Brevo** | Der Dienst, der die automatischen Mails verschickt. Kostenlos bis 300 Mails am Tag; wir liegen weit darunter. |
| **Cloudflare** | Die Firma, bei der die neue Seite und der Reservierungsdienst laufen. Kostenlos in dem Umfang, den wir brauchen. |
| **GitHub** | Dort liegt der Bauplan der Seite. Jede Änderung ist nachvollziehbar und lässt sich zurücknehmen. |
| **Spam-Abweisung** | Die Regel eines Mailanbieters, Mails abzuweisen, die fremd in seinem Namen verschickt werden. Genau das trifft uns heute. |
| **Hausschlüssel** | Der geheime Teil im Link zur Wirt-Ansicht. Ohne ihn kommt niemand an Reservierungen oder Bestellungen. |

## 10 Laufende Kosten

| Posten | Heute | Nach dem Umzug |
| --- | --- | --- |
| Seite, Dienst, Mailversand | 0 € | 0 € |
| Domain | wie bisher, bis August 2027 bezahlt | unverändert |
| Postfächer bei Hetzner | wie bisher | unverändert |

Es kommt nichts dazu. Die alte WordPress-Seite kann nach dem Umzug
abgeschaltet werden – was dort heute bezahlt wird, fällt dann weg.
