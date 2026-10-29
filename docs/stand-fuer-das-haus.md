# Stand der neuen Webseite · 27. Oktober 2026

Für Hannah und Wolfgang. Dieses Blatt erklärt sich selbst – es braucht keine
Erklärung dazu. Jede Angabe darin ist am 27. Oktober an der laufenden Seite
und am laufenden Dienst nachgeprüft, nichts ist geraten.

Es sagt dreierlei: **was fertig ist**, **was ihr noch tun müsst** und **welche
vier Fragen wir von euch brauchen**.

---

## In einem Satz

Die neue Webseite ist fertig und läuft. Sie ist nur noch **nicht unter
`wirtschaft-dornbirn.at` erreichbar** – dort liegt weiterhin die alte Seite.
Und die automatischen Mails an die Gäste gehen noch von der Testadresse von
Jonas los, weshalb sie oft im Spam landen. Beides hängt an Einträgen, die nur
ihr bei Hetzner setzen könnt.

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
| Tageszettel und Wochenbericht | `veranstaltungen@wirtschaft-dornbirn.at` |
| jede einzelne Takeaway-Bestellung | `service@wirtschaft-dornbirn.at` |
| Anfragen für Feste, Catering, Agentur | `willkommen@wirtschaft-dornbirn.at` |

**Wichtig für morgen früh:** Der Tageszettel um 08:00 kommt ab jetzt bei
`veranstaltungen@` an, nicht mehr bei Jonas. Wenn er nicht auftaucht, bitte
zuerst im Spam-Ordner nachsehen – siehe Punkt 3, das ist derselbe Grund.

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
der Domain** bei Hetzner. Nachgeprüft heute: Die Domain ist bei Brevo
angelegt, aber **noch nicht beglaubigt**.

Die Reihenfolge ist zwingend, und zwar in dieser Richtung:

1. Die vier Einträge bei Hetzner setzen, Beglaubigung abwarten.
2. **Erst dann** den Absender auf `willkommen@` umstellen.
3. Danach die Absender je Zweck einschalten (Service, Veranstaltungen).

**Umgekehrt nicht.** Wird der Absender vorher umgestellt, verschickt Brevo
**gar nichts** mehr – dann wäre es schlechter als heute. Genau deshalb stehen
die neuen Absender noch leer.

Für `tickets@eugen.family` und `uri@eugen.family` gilt dasselbe noch einmal
getrennt: `eugen.family` ist eine andere Domain und braucht eine eigene
Beglaubigung. Das kann nur Uri veranlassen.

## 4 Das Größte, was noch aussteht: die Domain umlegen

`wirtschaft-dornbirn.at` zeigt heute noch auf die alte WordPress-Seite
(nachgeprüft). Die neue Seite liegt daneben unter der Adresse
`wirtschaft-dornbirn.pages.dev`. Solange das so ist, sehen Gäste, die den
Namen eintippen, die alte Seite.

**Das machen wir nicht in einem Zug.** Dafür liegt ein eigenes Blatt bei:
*Testlauf und Domainumzug*. Kurz gefasst – vier Stufen, und erst die letzte
ist unumkehrbar:

1. **Die Mails in Ordnung bringen.** Geht sofort, unabhängig von allem
   anderen, und die laufende Seite merkt nichts davon.
2. **Die fertige Seite unter `neu.wirtschaft-dornbirn.at`** veröffentlichen.
   Ein einziger Eintrag in der Domain. Die alte Seite läuft weiter.
3. **Eine Woche abnehmen.** Jeder im Haus probiert alles aus. Auf dieser
   Testseite kann nichts kaputtgehen: sie schreibt in eine eigene, leere
   Datenbank und verschickt keine Mail. Sie erkennt das an ihrer eigenen
   Adresse, ganz von selbst, und sagt es unten am Bildschirmrand.
4. **Umschalten** – an einem ruhigen Vormittag, mit Rückweg.

**Ein Fund, den ihr kennen solltet.** Beim Schreiben dieses Ablaufs ist
aufgefallen: `gutscheine.`, `lieferservice.` und `tischreservierung.`
sind keine eigenständigen Adressen. Sie hängen an `www`. Wer `www` auf die
neue Seite stellt, ohne das vorher zu lösen, nimmt alle drei mit – dann
stehen Gutscheinverkauf, Lieferdienst und das alte Reservierungssystem
still, ohne dass sie jemand angefasst hat. Im Ablauf ist das Lösen jetzt der
allererste Schritt, mit eigenem Tag und eigener Prüfung. **Gefunden, bevor
es passiert ist** – genau dafür ist so ein Ablauf da.

## 5 Was ihr jetzt tun müsst

**Hannah** (etwa eine halbe Stunde)

1. **Bei Hetzner das Passwort ändern.** Es stand im ausgefüllten
   Entscheidungsblatt und hat damit den Weg über Download-Ordner und Chat
   genommen. Der Zugang selbst ist vorhanden – das war die eigentliche Frage,
   und sie ist beantwortet.
2. **Drei kostenlose Konten anlegen**, alle mit
   `veranstaltungen@wirtschaft-dornbirn.at`: GitHub (dort liegt der
   Bauplan der Seite), Cloudflare (dort läuft die Seite) und Brevo
   (verschickt die Mails). Bei jedem Konto Sarah als zweite Person eintragen
   und die Wiederherstellungscodes ausdrucken. Alle drei kosten 0 Euro.
3. **Bei Brevo die Domain `wirtschaft-dornbirn.at` eintragen.** Brevo zeigt
   danach vier Einträge an. Die setzt der Programmierer bei Hetzner; ihr
   braucht nur den Zugang bereitzuhalten.

**Wolfgang** (fünf Minuten)

1. **Mit Uri sprechen:** Darf die Terminliste künftig als
   `uri@eugen.family` versenden und die Warteliste der Kulturhaus-Abende als
   `tickets@eugen.family`? Dann muss Uri die Domain `eugen.family` bei Brevo
   eintragen und beglaubigen lassen. Ohne diesen Schritt bleibt es beim
   gemeinsamen Absender der „wirtschaft“.

**Der Programmierer** (zwei bis drei Stunden, sobald die Konten stehen)

Zwei Blätter liegen bei: *Testlauf und Domainumzug* ist die Reihenfolge,
`docs/uebergabe-wirtschaft.md` die Übergabe im Einzelnen. Kurz: die drei
Unterdomains lösen, Seite und Dienst ins Konto des Hauses umziehen, die vier
Einträge bei Hetzner setzen, dann der Absender, dann die Absender je Zweck –
und dazwischen die Testseite.

## 6 Vier Fragen, die wir von euch brauchen

1. **Anfragen fürs Kulturhaus.** Im Blatt steht, sie sollen an
   `uri@eugen.family` gehen. Auf der Webseite gibt es dafür aber kein
   Formular – die beiden Formulare heißen „Locations · Feste & Catering“ und
   „Agentur“ und gehören beide zur „wirtschaft“. Im Fuß der Termineseite
   steht `uri@eugen.family` bereits. **Genügt das, oder soll ein eigenes
   Kulturhaus-Formular dazukommen?**
2. **Der Tageszettel.** Er geht ab jetzt nur an `veranstaltungen@`. Bisher
   war er auch das tägliche Lebenszeichen für Jonas: kommt er, läuft der
   Dienst. Es gibt nur **eine** Empfängeradresse. **Soll die technische
   Betreuung eine Kopie bekommen?** Das geht am einfachsten mit einer
   Weiterleitung im Postfach.
3. **Die Ticketkategorien.** Von 39 kommenden Abenden haben **20 noch keine
   hinterlegten Kategorien und Preise** – betroffen ist fast alles ab Januar
   2027, vom Faschingsball bis zu den Frühjahrsabenden. Die Seite zeigt diese
   Abende normal an und verlinkt zum Ticketdienst; nur im Auswahlfenster
   fehlt die Zeile „welche Kategorie zu welchem Preis“. **Bekommen wir die
   Kategorien, oder soll es so bleiben?**
4. **Das Postfach `kueche@`** ist laut eurem Blatt nicht in Verwendung. Die
   Webseite benutzt es auch nicht. **Löschen oder behalten?**

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
| `willkommen@` | Empfänger aller Anfragen; Antwort darauf geht direkt an den Gast | richtig |
| `veranstaltungen@` | Tageszettel, Wochenbericht; künftig Inhaberin der drei Konten und Absender der Warteliste | richtig |
| `service@` | Empfänger jeder Takeaway-Bestellung; künftig Absender von Reservierung und Takeaway | richtig |
| `tickets@eugen.family` | künftig Absender der Warteliste für Kulturhaus-Abende | wartet auf Uri |
| `uri@eugen.family` | Kulturhaus-Kontakt im Fuß; künftig Absender der Terminliste | wartet auf Uri |
| `jonas.gamper@aon.at` | heute noch **Absender** aller automatischen Mails | muss weg, siehe Punkt 3 |

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
