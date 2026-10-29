# Die neue Webseite in Betrieb nehmen

Eine Anleitung für Hannah, Wolfgang und den Programmierer.
Stand 29. Oktober 2026.

---

## Worum es geht

Die neue Webseite ist fertig. Sie läuft, sie ist geprüft, und sie wartet nur
noch darauf, unter `wirtschaft-dornbirn.at` zu stehen.

Dieser letzte Schritt ist der unangenehme. Er ist technisch klein, aber er
springt auf einmal um: die Seite, die Mails, die Links in den gedruckten
Karten, die Treffer bei Google. Wer das in einem Zug macht und etwas übersieht,
erfährt davon durch einen Gast.

Darum machen wir es anders. Wir bauen die gesamte neue Welt **daneben** auf,
unter einer eigenen Adresse, und probieren dort in Ruhe alles durch. An der
Domain wird dabei nichts geändert. Gar nichts. Die Seite, die heute läuft,
läuft weiter, als wäre nichts.

Erst wenn jeder einmal darauf geklickt hat und zufrieden ist, hängen wir die
Domain um. Das dauert dann eine halbe Stunde, und wir wissen vorher, dass es
funktioniert.

**Die Testseite gibt es schon.** Sie ist heute entstanden und liegt hier:

## https://probe-wirtschaft-dornbirn.pages.dev

Dieser Link darf an jeden weitergegeben werden, der mitschauen soll.

---

## Was die Testseite ist – und was nicht

Es ist **dieselbe Seite**. Datei für Datei dasselbe, was später unter eurem
Namen stehen wird. Es gibt keine zweite Fassung, die irgendwann anders aussieht
als das Original. Das ist Absicht: Sonst testet man am Ende etwas, das man gar
nicht in Betrieb nimmt.

Anders ist nur, womit sie spricht. Alles, was dort eingetragen wird, landet in
einer eigenen, leeren Datenbank. Es geht keine einzige Mail hinaus. Es entsteht
kein echter Tisch, keine echte Bestellung, kein Eintrag in eurer Wirt-Ansicht.

Unten am Bildschirmrand steht ein weinrotes Band mit dem Wort **Testseite**.
Es bleibt stehen, solange man dort ist, und es lässt sich nicht wegklicken.

Die Seite erkennt das **an ihrer eigenen Adresse**. Niemand muss daran denken,
einen Schalter umzulegen, und niemand kann ihn versehentlich umlegen. Als
zweite Absicherung weist der echte Dienst eine Anfrage von der Testadresse
rundheraus ab. Beides wird bei jeder Änderung an der Seite automatisch
nachgeprüft.

Nachgewiesen wurde das heute so: Auf der Testseite wurde eine Reservierung für
den 5. November angelegt. Sie steht in der Testdatenbank. In der echten
Datenbank steht sie nicht.

**Was die Testseite nicht beweist:** Weil dort keine Mail hinausgeht, sagt sie
nichts über den Mailversand. Das ist ein eigenes Thema, und es ist das
dringendere von beiden. Dazu gleich mehr.

### Was ihr dort tun sollt

Nehmt euch eine Woche. Jeder, der später damit arbeitet, soll die Seite einmal
selbst in der Hand gehabt haben, am eigenen Handy, nicht über die Schulter von
jemand anderem.

- Reserviert einen Mittagstisch. Für morgen, für nächste Woche, für einen
  Samstag (das muss abgelehnt werden).
- Bestellt Takeaway mit zwei, drei Gerichten. Stimmt die Summe? Stimmt die
  Abholzeit? Kommt eine Nummer?
- Tragt euch bei einem ausverkauften Abend auf die Warteliste ein.
- Schickt eine Anfrage über „Locations · Feste & Catering".
- Öffnet die Wirt-Ansicht und schaut, ob alles von oben dort auftaucht. Setzt
  jemanden auf „angekommen", eine Bestellung auf „abgeholt".
- Lest die Termine durch. Stimmen die Abende? Sind die Kulturhaus-Abende
  richtig gekennzeichnet?
- Lest Impressum und Datenschutz. Stimmt alles, was dort über das Haus steht?

Schreibt auf, was euch auffällt, auch Kleinigkeiten. Jetzt ist der Moment, in
dem Änderungen billig sind. Nach dem Umhängen sind sie es nicht mehr.

---

## Wo die Sache heute wirklich steht

Drei Dinge laufen gut, zwei sind offen. Ehrlich der Reihe nach.

**Gut:** Die Seite ist fertig und seit Wochen im echten Betrieb erprobt –
Reservierungen, Bestellungen, Wartelisten, Anfragen, die Wirt-Ansicht am Handy.
Die laufenden Kosten sind null. Nicht gestundet, nicht im ersten Jahr gratis,
sondern dauerhaft null. Und seit dem 27. Oktober steht fest, welche Mailadresse
wofür zuständig ist, weil Hannah das Entscheidungsblatt ausgefüllt hat.

**Offen, und das ist das Dringende:** Die Bestätigungen an eure Gäste gehen
noch von einer fremden Adresse los, nämlich der Testadresse von Jonas bei
aon.at. Dieser Anbieter sagt allen Mailprogrammen der Welt ausdrücklich:
*„Mails, die in meinem Namen von woanders kommen, bitte abweisen."* Gmail, GMX
und Outlook halten sich daran. Darum landen Bestätigungen heute oft im
Spam-Ordner oder kommen gar nicht an.

Das ist ärgerlich, aber es lässt sich **sofort** beheben, ganz unabhängig vom
Rest. Es braucht vier Einträge in eurer Domain, die nur die Mails betreffen.
Die laufende Webseite merkt davon nichts.

**Offen, aber ungefährlich:** `wirtschaft-dornbirn.at` zeigt noch auf die alte
Seite. Das bleibt so, bis ihr sagt, dass es umgestellt werden soll.

---

## Was ihr ab heute tun könnt, ohne die Domain anzufassen

Diese fünf Dinge gehen jetzt sofort. Keines davon berührt die laufende Seite.

**1. Auf der Testseite klicken.** Der Link steht oben. Kostet nichts, ändert
nichts, braucht niemanden.

**2. Das Hetzner-Passwort ändern.** Es stand im ausgefüllten Entscheidungsblatt
und hat damit den Weg über Download-Ordner und Chat genommen. Der Zugang selbst
ist vorhanden – das war die eigentliche Frage, und sie ist beantwortet. Aber
das Passwort gehört gewechselt.

**3. Die drei Konten anlegen.** GitHub, Cloudflare und Brevo, alle drei auf
`veranstaltungen@wirtschaft-dornbirn.at`, alle drei kostenlos. Bei jedem Konto
Sarah als zweite Person eintragen und die Wiederherstellungscodes ausdrucken.
Warum: Heute laufen diese Konten auf Jonas. Solange das so ist, gehört dem Haus
die Webseite nicht wirklich.

**4. Bei Brevo die Domain eintragen.** Brevo ist der Dienst, der die Mails
verschickt. Dort `wirtschaft-dornbirn.at` eintragen; Brevo zeigt dann vier
Einträge an, die bei Hetzner gesetzt werden müssen. Das Eintragen allein ändert
noch nichts.

**5. Mit Uri sprechen.** Zwei der Mailadressen aus eurem Entscheidungsblatt
gehören zu `eugen.family`, nicht zu eurer Domain. Für die braucht es dieselbe
Prozedur noch einmal, und veranlassen kann das nur Uri.

---

## Alle Mailadressen, einmal vollständig

So sieht es heute aus. Alles nachgeprüft, nichts angenommen.

### Eure Postfächer

Sie liegen alle bei Hetzner, zusammen mit der Domain.

| Adresse | Wofür | Wer liest |
| --- | --- | --- |
| `willkommen@` | Anfragen und Allgemeines | Wolfgang, Hannah |
| `veranstaltungen@` | Marketing, Veranstaltungen, Warteliste | Hannah |
| `service@` | Tischreservierungen, Take Away | Service |
| `gewinnspiel@` | Gewinnspiele | Hannah |
| `sarah.preuss@` | Marketing | Sarah |
| `kueche@` | wird nicht benutzt | – |
| `uri@eugen.family` | Kulturhaus, Allgemeines | Wolfgang, Hannah |
| `tickets@eugen.family` | Kulturhaus, Warteliste | Hannah |

### Was die Webseite damit macht

Es gibt zwei Richtungen, und die werden gerne verwechselt. **Empfänger** heißt:
Dorthin schickt die Webseite euch eine Nachricht. **Absender** heißt: Das sieht
der Gast, und dorthin geht seine Antwort, wenn er auf „Antworten" drückt.

Die Empfänger sind seit dem 27. Oktober eingestellt und laufen:

| Wenn das passiert | geht eine Mail an |
| --- | --- |
| Jemand bestellt Takeaway | `service@` |
| Jemand schickt eine Anfrage für Feste, Catering oder Agentur | `willkommen@` |
| Werktags um 8 Uhr: der Tageszettel | `veranstaltungen@` |
| Freitag um 15 Uhr: der Wochenbericht | `veranstaltungen@` |

Bei der Anfrage ist eine Kleinigkeit eingebaut, die im Alltag viel wert ist:
Ihr könnt in eurem Postfach einfach auf „Antworten" drücken, und die Antwort
geht direkt an den Gast, nicht an die Webseite.

Die Absender sind **noch nicht** umgestellt. So soll es werden:

| Welche Mail an den Gast | soll kommen von |
| --- | --- |
| Reservierung bestätigt, abgesagt | `service@` |
| Takeaway bestellt | `service@` |
| Warteliste für einen Abend in der „wirtschaft" | `veranstaltungen@` |
| Warteliste für einen Abend im Kulturhaus | `tickets@eugen.family` |
| „Bleibt auf dem Laufenden", Terminliste | `uri@eugen.family` |
| alles Übrige | `willkommen@` |

Heute steht bei allen sechs noch die Testadresse von Jonas. Das ist der Punkt,
den wir als Erstes angehen.

### Was sonst noch wo steht

Auf der Webseite selbst steht `willkommen@` fünfzehnmal als Kontakt, und
`uri@eugen.family` sechsmal im Fuß der Termineseite – so, wie es bleiben soll
(Frage 11 im Entscheidungsblatt). Im Impressum steht zusätzlich die
Beschwerdestelle für Datenschutz und die Adresse des Kulturhauses. Das sind
keine Adressen der Webseite, sondern Pflichtangaben.

Nicht verwendet werden `gewinnspiel@`, `sarah.preuss@` und `kueche@`. Die
Webseite kennt sie nicht.

---

## Welche Server im Spiel sind

Vier Stellen, mehr nicht. Es hilft zu wissen, welche davon wem gehört.

**Hetzner** – gehört euch. Dort liegt eure Domain, dort liegen eure Postfächer,
und dort liegt die alte Webseite auf einem Webspace mit der Adresse
78.47.8.180. Die Domain ist bis **August 2027** bezahlt und läuft auf
„wirtschaft" cafe restaurant bar · Wolfgang Preuß e.U. Das ist sauber, und es
war die größte offene Frage.

**Cloudflare** – gehört heute Jonas, soll dem Haus gehören. Dort läuft die neue
Seite und der kleine Dienst dahinter, der Reservierungen und Bestellungen
verwaltet. Kostenlos in dem Umfang, den wir brauchen.

**Brevo** – gehört heute Jonas, soll dem Haus gehören. Verschickt die Mails.
Kostenlos bis 300 Mails am Tag; wir liegen weit darunter.

**Ticketist** – gehört euch, bleibt unberührt. Die Webseite liest dort
automatisch die Abende und ihre Verfügbarkeit.

Dazu kommen die drei Adressen, die heute auf dem alten Hetzner-Webspace liegen
und mit der neuen Seite nichts zu tun haben: `gutscheine.`, `lieferservice.`
und `tischreservierung.`. Die sind der Grund für den nächsten Abschnitt.

---

## Ein Fund, der beinahe teuer geworden wäre

Beim Vorbereiten dieser Anleitung ist etwas aufgefallen, das vorher niemand auf
dem Schirm hatte.

In eurer Domain steht ein sogenannter **Platzhalter**. Das ist ein einziger
Eintrag, der sinngemäß sagt: *„Alles, wonach jemand fragt, schick zum alten
Webserver."* Nachweisen kann man das, indem man einen Namen ausprobiert, den es
gar nicht gibt. `kaffeekanne.wirtschaft-dornbirn.at` zum Beispiel. Auch der
landet beim alten Server.

Das ist im Alltag bequem und heute kein Problem. Beim Umzug ist es eine Falle.
Denn `gutscheine.`, `lieferservice.` und `tischreservierung.` sind **keine
eigenen Einträge**. Sie funktionieren nur, weil der Platzhalter sie auffängt.

Würde man nun `www` auf die neue Seite stellen, ohne das vorher zu regeln,
folgt der Platzhalter mit – und alles, was heute über ihn läuft, ist auf einen
Schlag weg: der Gutscheinverkauf, der Lieferdienst, das alte
Reservierungssystem. Ohne dass sie jemand angefasst hätte. Die neue Seite
verlinkt den Lieferdienst sogar selbst, der Ausfall fiele also sofort Gästen
auf.

**Die Lösung ist einfach**, sie muss nur vorher passieren: Für jede Adresse,
die weiter gebraucht wird, legt man einen **eigenen** Eintrag an. Ein eigener
Eintrag sticht den Platzhalter.

| Typ | Name | Wert |
| --- | --- | --- |
| A | `gutscheine` | `78.47.8.180` |
| A | `lieferservice` | `78.47.8.180` |
| A | `tischreservierung` | `78.47.8.180` |

Dieser Schritt ändert für Gäste nichts, lässt sich jederzeit zurücknehmen und
gehört an einen eigenen Tag, lange vor dem Umzug. Danach prüft der
Programmierer mit einem Befehl, ob es gewirkt hat.

Der Platzhalter selbst bleibt vorerst stehen. Beim Umzug wird er mit
entschieden.

**Eine Frage dazu an euch:** Werden diese drei Adressen überhaupt noch
gebraucht? Der Lieferdienst wird von der neuen Seite verlinkt, also vermutlich
ja. Bei den Gutscheinen und beim alten Reservierungssystem wissen wir es nicht.
Fällt eine davon weg, wird es einfacher.

---

## Der Ablauf, Schritt für Schritt

Von hier an der Reihe nach. Schritt 1 bis 5 können sofort losgehen und berühren
die laufende Seite nicht. Schritt 6 bis 8 sind die Vorbereitung. Erst Schritt 9
ändert etwas, das Gäste sehen.

### Schritt 1 · Die Testseite ausprobieren

*Wer: alle im Haus. Dauer: eine Woche nebenbei.*

Link ist oben. Was zu tun ist, steht oben. Aufschreiben, was auffällt.

### Schritt 2 · Die drei Konten anlegen

*Wer: Hannah. Dauer: eine halbe Stunde.*

GitHub, Cloudflare, Brevo – alle auf `veranstaltungen@`, alle mit Sarah als
zweiter Person, alle mit ausgedruckten Wiederherstellungscodes. Die genauen
Klickwege stehen im Übergabedokument.

Warum zuerst: Alles Weitere wird in diesen Konten eingerichtet. Solange sie
Jonas gehören, hängt das Haus an einer Person.

### Schritt 3 · Die Mails in Ordnung bringen

*Wer: Hannah öffnet die Domainverwaltung, der Programmierer setzt die
Einträge. Dauer: eine Stunde, plus Wartezeit.*

Das ist der Schritt, der echten Schaden behebt. Vier Einträge, die nur die
Mails betreffen:

| Typ | Name | Wert |
| --- | --- | --- |
| CNAME | `brevo1._domainkey` | `b1.wirtschaft-dornbirn-at.dkim.brevo.com` |
| CNAME | `brevo2._domainkey` | `b2.wirtschaft-dornbirn-at.dkim.brevo.com` |
| TXT | `@` | `brevo-code:12ab66d15bb7d93634c32a1a25ca728d` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

Dazu der bestehende Eintrag, der heute `v=spf1 a mx ~all` lautet. Der wird
**geändert**, nicht ergänzt, auf:

```
v=spf1 a mx include:spf.brevo.com ~all
```

Zwei solche Einträge nebeneinander sind ungültig. Dann kommt gar nichts mehr
an – schlimmer als heute.

**Vorsicht an einer Stelle:** In derselben Liste stehen die Einträge für eure
Postfächer (`MX` und `mail.`). Die bleiben, wie sie sind. Wer sie aus Versehen
löscht, nimmt dem Haus die Post. Deshalb vorher die ganze Liste exportieren und
die Datei an zwei Orten ablegen.

### Schritt 4 · Warten und beglaubigen lassen

*Wer: der Programmierer. Dauer: Minuten bis Stunden.*

Wenn die Einträge sichtbar sind, in Brevo auf *Authenticate* drücken und warten,
bis alles grün ist. Nachsehen geht auch von außen; der Befehl steht in den
technischen Unterlagen.

Warum das nicht übersprungen werden darf: Brevo verschickt nur von Adressen,
deren Domain es beglaubigt hat.

### Schritt 5 · Den Absender umstellen

*Wer: der Programmierer. Dauer: zehn Minuten.*

Erst jetzt, keinen Schritt früher. Zuerst die Hauptadresse auf `willkommen@`,
dann die Absender je Zweck aus der Tabelle weiter oben.

Danach eine echte Probe: eine Reservierung auf der laufenden Seite anlegen, mit
einer privaten Gmail-Adresse. Die Bestätigung muss im **Posteingang** liegen,
nicht im Spam. Damit ist das Mailproblem erledigt, und zwar lange bevor die
Domain umgehängt wird.

Für `tickets@eugen.family` und `uri@eugen.family` läuft dasselbe noch einmal,
sobald Uri seine Domain bei Brevo eingetragen hat.

### Schritt 6 · Die drei Adressen absichern

*Wer: der Programmierer. Dauer: eine halbe Stunde. Eigener Tag.*

Die drei eigenen Einträge aus dem Abschnitt über den Platzhalter anlegen, dann
prüfen, ob alle drei weiter antworten. Erst wenn das sauber ist, geht es
weiter.

### Schritt 7 · Die Abnahme

*Wer: alle. Dauer: ein gemeinsamer Vormittag.*

Die Liste aus Schritt 1 durchgehen und abhaken. Der Programmierer lässt
zusätzlich eine Prüfung laufen, die jede alte Adresse der WordPress-Seite
durchgeht und nachsieht, ob sie auf der neuen Seite an einer sinnvollen Stelle
landet.

Was hier gefunden wird, wird jetzt geändert. Es gibt keinen Termindruck: Die
alte Seite läuft.

### Schritt 8 · Entscheiden, wohin die Domain zeigt

*Wer: das Haus, beraten vom Programmierer.*

Hier ist eine Entscheidung fällig, und sie lässt sich nicht umgehen.

Damit `wirtschaft-dornbirn.at` **ohne** „www" auf die neue Seite zeigen kann,
muss die Verwaltung der Domain bei Cloudflare liegen. Das ist keine Schikane
und auch kein Verkaufstrick, sondern eine alte technische Grenze: Ganz vorne
an einer Domain ist ein Verweis auf einen fremden Namen nicht vorgesehen.
Manche Anbieter haben einen Trick dafür, Hetzner hat ihn nicht.

**Weg A, empfohlen: die Verwaltung zu Cloudflare umziehen.** Die Domain bleibt,
wo sie ist, und gehört weiter euch. Es ändern sich nur die zwei Rechner, die
die Liste der Einträge ausliefern. Cloudflare liest die bestehende Liste vorher
ein, die Postfächer laufen unverändert weiter. Danach ist der Rest ein Klick,
und die Wirt-Ansicht lässt sich später mit einer richtigen Anmeldung sichern
statt mit einem Link, den man weitergeben kann.

**Weg B: bei Hetzner bleiben.** Dann ist die Seite nur unter
`www.wirtschaft-dornbirn.at` erreichbar, und wer den Namen ohne „www" eintippt,
muss umgeleitet werden. Das geht, bleibt aber eine Dauerbaustelle und schließt
die richtige Anmeldung für die Wirt-Ansicht aus.

Wir empfehlen Weg A, und zwar deutlich.

### Schritt 9 · Umhängen

*Wer: der Programmierer, mit jemandem vom Haus erreichbar. Dauer: ein halber
Vormittag. Kein Freitag, kein Veranstaltungstag.*

Das ist der Schritt, der etwas ändert. Vorher noch einmal die ganze Liste der
Einträge exportieren – das ist der Rückweg.

Dann die Domain bei Cloudflare anlegen, die eingelesenen Einträge Zeile für
Zeile mit dem Export vergleichen, die Nameserver umstellen, die Seite anhängen,
den Dienst auf die neue Adresse einstellen und beide Umgebungen neu ausrollen.
Danach die Weiterleitungen für die alten Adressen aus den gedruckten Karten
prüfen.

Zum Schluss eine echte Reservierung mit einer privaten Adresse. Kommt die
Bestätigung im Posteingang an, ist es geschafft.

**Eine Kleinigkeit, die der Programmierer wissen muss:** Nach jedem Ausrollen
die Zeitpläne zählen. Es müssen fünf sein. Sind es weniger, ist der Abgleich an
einer Kontogrenze gescheitert, und Tageszettel und Wochenbericht bleiben still
aus. Das ist genau so schon einmal passiert.

### Schritt 10 · Zwei Wochen nichts tun

Die alte Seite bleibt stehen. Solange sie steht, ist der Rückweg kurz: Man
stellt den Verweis zurück, und die alte Seite ist wieder da.

Erst nach zwei ruhigen Wochen wird sie abgeschaltet und der Webspace gekündigt.
Was dort in der Zwischenzeit bezahlt wird, ist der Preis für den Rückweg. Er
ist ihn wert.

---

## Was wir von euch brauchen

Ohne diese Dinge geht es nicht weiter.

1. **Zugang zur Domainverwaltung bei Hetzner.** Für die Schritte 3, 6 und 9.
   Wer sich dort anmelden kann, steht in eurem Entscheidungsblatt.
2. **Die drei Konten**, angelegt auf `veranstaltungen@`, mit Sarah als zweiter
   Person. Schritt 2.
3. **Antwort von Uri**, ob `eugen.family` bei Brevo eingetragen wird.
4. **Auskunft zu den drei alten Adressen**: Werden `gutscheine.`,
   `lieferservice.` und `tischreservierung.` noch gebraucht?
5. **Ein Termin für Schritt 9.** Kein Freitag, kein Veranstaltungstag.
6. **Rückmeldung von der Testseite.** Was fehlt, was stört, was ist falsch.

## Was ihr entscheiden müsst

| | Frage | Unsere Empfehlung |
| --- | --- | --- |
| 1 | Weg A oder Weg B? | **Weg A.** Weg B bleibt eine Dauerbaustelle. |
| 2 | Wann wird umgehängt? | Nach einer ruhigen Woche auf der Testseite. |
| 3 | Wirt-Ansicht später mit richtiger Anmeldung sichern? | Ja, sobald Weg A steht. Heute schützt nur ein Link. |
| 4 | Bleibt die Tischeinteilung von Hand? | Die ersten zwei Wochen ja, dann neu entscheiden. |
| 5 | Wann wird die alte Seite abgeschaltet? | Zwei ruhige Wochen nach Schritt 9. |

Dazu vier kleinere Fragen, die beim Durchgehen des Entscheidungsblatts offen
geblieben sind:

- Für Anfragen ans Kulturhaus gibt es auf der Webseite kein Formular. Im Fuß
  der Termineseite steht `uri@eugen.family`. Reicht das?
- Der Tageszettel geht jetzt nur an `veranstaltungen@`. Soll der Programmierer
  eine Kopie bekommen, damit er merkt, wenn etwas hängt?
- Von 37 kommenden Abenden haben 20 keine hinterlegten Ticketkategorien, fast
  alles ab Januar. Die Abende werden normal angezeigt und verlinken zum
  Ticketdienst; nur die Zeile mit Kategorie und Preis fehlt. Nachliefern?
- `kueche@` wird nicht benutzt. Löschen oder behalten?

---

## Zum Nachschlagen: Begriffe

**Domain** – der Name der Seite, `wirtschaft-dornbirn.at`. Wem er gehört, dem
gehört die Adresse der Webseite und aller Postfächer. Er gehört euch.

**Die Liste der Einträge (DNS)** – eine Art Telefonbuch der Domain. Dort steht,
wo die Webseite liegt, wo die Post hingeht und wer in eurem Namen Mails
verschicken darf.

**Nameserver** – die zwei Rechner, die dieses Telefonbuch ausliefern. Sie zu
wechseln heißt nicht, die Domain abzugeben.

**Platzhalter** – ein Eintrag, der alles auffängt, wonach sonst niemand fragt.
Siehe den eigenen Abschnitt weiter oben.

**Beglaubigung** – der Nachweis, dass Brevo wirklich für eure Domain Mails
verschicken darf. Ohne ihn landen Mails im Spam.

**Absender und Empfänger** – Absender sieht der Gast, dorthin geht seine
Antwort. Empfänger seid ihr, dorthin schickt die Webseite ihre Meldungen.

**Testseite** – die neue Seite unter eigener Adresse, mit eigener leerer
Datenbank und ohne Mailversand. Dort kann nichts kaputtgehen.

**Wirt-Ansicht** – eure Oberfläche am Handy für Reservierungen, Bestellungen
und Anfragen. Heute durch einen geheimen Teil im Link geschützt.

---

## Anhang für den Programmierer

Alles Folgende setzt voraus, dass das Verzeichnis ausgecheckt und
`npm install` gelaufen ist. Jeder Befehl wird aus dem Hauptverzeichnis
aufgerufen, außer es steht anders dabei.

### Die Testseite neu veröffentlichen

```bash
npm run deploy:probeseite
```

Baut die Seite, lässt alle Prüfungen laufen und veröffentlicht sie unter
`probe-wirtschaft-dornbirn.pages.dev`. Der Befehl nennt am Ende die feste
Adresse. Die Adresse mit der Kennung davor, die `wrangler` ausgibt, gehört nur
zu dieser einen Veröffentlichung und wird nicht weitergegeben – der Dienst
nimmt sie als Herkunft nicht an.

Die echte Seite veröffentlicht `npm run deploy:seite`. Die beiden Befehle
unterscheiden sich nur im Ziel.

### Prüfen, ob die Testseite wirklich die Testseite ist

```bash
npm run check:testseite
```

Schickt zwölf Adressen durch `site/probe.js` – echte Namen, Vorschauadressen
von Cloudflare, Testnamen und `?probe=1` – und sieht nach, was dabei
herauskommt. Läuft bei jedem `npm run ci` mit.

Die Erkennung sitzt in `site/probe.js`: Jeder Namensteil wird gegen
`neu|test|probe|staging` geprüft. Die zweite Schranke steht in
`server/wrangler.jsonc`: Testnamen stehen nur in `ALLOWED_ORIGINS` der Probe,
nicht in der Produktion.

### Den Platzhalter und die drei Adressen prüfen

```bash
npm run check:unterdomains
```

Sagt, ob der Platzhalter noch alles auffängt und ob `gutscheine.`,
`lieferservice.` und `tischreservierung.` schon eigene Einträge haben. Vor
Schritt 6 ausführen, danach noch einmal.

### Die Mails prüfen

```bash
# Ist die Domain bei Brevo beglaubigt?
curl -s -H "x-haus-token: <Hausschlüssel>" \
  https://wirtschaft-reservierung.jonas-gamper.workers.dev/api/mail/domain

# Kommt eine Mail an einer echten Adresse an?
curl -s "https://wirtschaft-reservierung.jonas-gamper.workers.dev/api/mail/pruefung?email=<Adresse>"
```

Erwartet wird `"authenticated": true` beziehungsweise `delivered`.

### Den Absender umstellen – erst nach der Beglaubigung

```bash
cd server
printf '%s' "willkommen@wirtschaft-dornbirn.at" | npx wrangler@4 secret put BREVO_ABSENDER
```

Danach die Absender je Zweck in `server/wrangler.jsonc` eintragen
(`ABSENDER_SERVICE`, `ABSENDER_WARTELISTE`, später `ABSENDER_KULTURHAUS` und
`EVENTS_ABSENDER`) und beide Umgebungen ausrollen. Welcher Wert wohin gehört,
steht in `docs/mailadressen-entscheidung.md`.

### Auf die Domain umstellen

```bash
node scripts/umstellen.mjs --seite https://wirtschaft-dornbirn.at --schreiben
npm run ci
cd server && npx wrangler@4 deploy && npx wrangler@4 deploy --env probe
```

**Nach jedem Ausrollen die `schedule:`-Zeilen zählen. Es müssen fünf sein.**
Sind es weniger, ist der Abgleich an der Grenze von fünf Zeitplänen je Konto
gescheitert; der Dienst läuft dann, aber Tageszettel und Wochenbericht bleiben
still aus. Das ist am 5. September genau so passiert und tagelang niemandem
aufgefallen.

### Abnahme von außen

```bash
# gegen die Testseite
SEITE=https://probe-wirtschaft-dornbirn.pages.dev npm run check:umzug

# nach dem Umhängen
SEITE=https://wirtschaft-dornbirn.at npm run check:umzug
npm run check:uebergabe
```

Die erste Prüfung geht jede alte Adresse der WordPress-Seite durch, dazu die
Hauptseiten und die QR-Ziele, und fragt den Dienst, ob er diese Herkunft
annimmt. Die zweite sagt, was noch an Jonas hängt.

### Wo was steht

| Datei | Inhalt |
| --- | --- |
| `server/wrangler.jsonc` | alle Einstellungen des Dienstes, beide Umgebungen |
| `site/probe.js` | entscheidet, ob eine Seite Testseite ist |
| `site/data/haus.json` | die zwei Dienstadressen |
| `docs/mailadressen-entscheidung.md` | welche Adresse wofür, Hausentscheid |
| `docs/uebergabe-wirtschaft.md` | Konten, Übergabe, Etappen |
| `docs/betriebshandbuch.md` | Betrieb im Einzelnen, alle Einstellungen |

### Was nie passieren darf

- Den Absender umstellen, bevor Brevo die Domain beglaubigt hat. Dann
  verschickt der Dienst gar nichts mehr.
- `www` umhängen, bevor die drei Adressen eigene Einträge haben. Dann sind
  Gutscheine, Lieferdienst und das alte Reservierungssystem weg.
- Einen zweiten SPF-Eintrag anlegen statt den bestehenden zu ändern. Zwei sind
  ungültig.
- Die alte Seite am Umhängetag abschalten. Damit ist der Rückweg weg.
- Takeaway im Echtbetrieb testen. `ALT_TAKEAWAY` leitet an den echten
  Lieferdienst weiter, daraus entsteht eine echte Bestellung.
