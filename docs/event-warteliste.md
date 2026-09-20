# Die Wartelisten: ausverkaufte Abende und voller Mittagstisch

Eingerichtet am 20. September 2026.

**Zweck.** Wer für einen ausverkauften Abend Karten will oder an einem vollen
Tag einen Tisch braucht, soll nicht ins Leere klicken. Und das Haus soll
wissen, wer wann wofür angefragt hat, und die Wartenden mit einem Knopf
verständigen können, sobald wieder etwas frei ist.

Der Reiter **warteliste** in der Wirt-App hat zwei Abschnitte:

| Abschnitt | Wofür | Wer trägt ein |
|---|---|---|
| **Abende** | ausverkaufte Abende beim Ticketdienst | Gast auf der Eventseite, oder der Wirt am Telefon |
| **Mittagstisch** | Tage, an denen der Mittag voll gemeldet ist | Gast auf der Reservierungsseite |

Sie funktionieren nach demselben Muster — Reihenfolge der Eintragung,
Verständigung per Mail, Zeitstempel für alles —, haben aber verschiedene
Quellen und verschiedene Automatiken. Die Abschnitte 2 bis 10 beschreiben
die **Abende**; der Mittagstisch steht in [Abschnitt 11](#11-der-mittagstisch).

---

## Inhalt

1. [Die Systematik in fünf Sätzen](#1-die-systematik-in-fünf-sätzen)
2. [Aus Sicht des Gastes](#2-aus-sicht-des-gastes)
3. [Aus Sicht des Wirts](#3-aus-sicht-des-wirts)
4. [Die Abgrenzung: welcher Weg betroffen ist und welcher nicht](#4-die-abgrenzung-welcher-weg-betroffen-ist-und-welcher-nicht)
5. [Woher jede Angabe kommt](#5-woher-jede-angabe-kommt)
6. [Was „ausverkauft“ heißt: drei Quellen, eine Regel](#6-was-ausverkauft-heißt-drei-quellen-eine-regel)
7. [Zurückgekommene Karten](#7-zurückgekommene-karten)
8. [Ein neuer Abend: was von selbst geht, was ein Handgriff ist](#8-ein-neuer-abend-was-von-selbst-geht-was-ein-handgriff-ist)
9. [Was garantiert ist — und was nicht](#9-was-garantiert-ist--und-was-nicht)
10. [Welche Zugänge noch etwas bringen würden](#10-welche-zugänge-noch-etwas-bringen-würden)
11. [Der Mittagstisch](#11-der-mittagstisch)
12. [Wann aktualisiert wird](#12-wann-aktualisiert-wird)
13. [Datenschutz](#13-datenschutz)
14. [Prüfprotokoll](#14-prüfprotokoll)
15. [Technische Übersicht](#15-technische-übersicht)
16. [Was noch dazukommen könnte](#16-was-noch-dazukommen-könnte)

---

## 1. Die Systematik in fünf Sätzen

Die Warteliste hängt am **Weg beim Ticketdienst**, nicht am Abend: „dinner &
comedy“ um 19 Uhr und „comedy only“ um 21 Uhr sind bei ticketist.io zwei
Veranstaltungen mit eigener Kennung, und ein Gast wartet auf genau eine davon.
Eine Warteliste gibt es **von selbst**, sobald ein Weg ausverkauft ist —
niemand legt sie an, niemand schaltet sie ab. Reihenfolge ist Ehrlichkeit: die
Liste steht so, wie sie entstanden ist, und verständigt wird in dieser
Reihenfolge. Die Mail **reserviert nichts**, sie öffnet die Tür zum
Ticketdienst; wer zuerst kauft, hat die Karten. Nach dem Abend löscht sich
jeder Eintrag von selbst, mitsamt Adresse und Telefonnummer.

---

## 2. Aus Sicht des Gastes

Auf der Eventseite steht neben dem grauen „ausverkauft“ ein Knopf
**„auf die warteliste“**. Auf der Startseite führt „Ausverkauft · Warteliste“
direkt dorthin und öffnet den Kasten für genau diesen Abend.

Der Kasten hat drei Teile:

1. **Wofür genau?** Alle ausverkauften Wege dieses Abends *und* desselben
   Programms an anderen Tagen, je ein Haken. Vorgehakt ist, was auf der
   Kachel stand. Luis spielt dreimal — wer Dienstag oder Mittwoch nähme, hakt
   beides an und steht auf beiden Listen.
2. **Was es noch gibt.** Ist am selben Abend oder an einem anderen Tag vom
   selben Programm noch etwas zu haben, steht das darüber, mit „tickets
   buchen“. Wer heute Karten will, soll nicht warten müssen, wenn morgen
   welche da sind. Gezeigt werden der ganze eigene Abend plus höchstens die
   drei nächsten anderen Tage.
3. **Die Angaben.** Name, E-Mail, Telefon (freiwillig), Kartenzahl (1–10).

Danach:

- **Bestätigungsmail** mit dem Link zum Austragen.
- Sobald Karten da sind: die Mail **„Es gibt wieder Karten“** mit dem
  Ticketlink und zwei Antwortknöpfen — *Ich habe gebucht* / *Brauche keine
  mehr*. Beides ein Klick, kein Formular; die Antwort landet beim Wirt.
- Wer sich für einen Abend einträgt, für den es **gerade wieder Karten gibt**,
  bekommt keine Warteliste, sondern die Buchung geöffnet: „Gute Nachricht,
  für diesen Abend gibt es gerade wieder Karten.“

---

## 3. Aus Sicht des Wirts

Vierter Reiter **„warteliste“** in der Wirt-App.

**Je Weg eine aufklappbare Gruppe** mit Datum, Uhrzeit, Titel und einer
Standzeile:

| Standzeile | heißt |
|---|---|
| `ausverkauft · 2 warten · 4 karten` | nichts zu holen, zwei Personen warten auf zusammen vier Karten |
| `wieder karten da · 1 wartet · 2 karten` | der Ticketdienst verkauft wieder — jetzt verständigen |
| `3 karten zurück · 2 warten · 4 karten` | drei Karten sind storniert worden (die Gruppe wird gold) |
| `ausverkauft · noch niemand` | Warteliste steht bereit, bisher hat sich niemand eingetragen |
| `stand unbekannt` | der Abend ist dem Dienst gerade nicht bekannt |

**Je Wartendem eine Zeile:** Name und Kartenzahl, wann eingetragen (und ob vom
Haus am Telefon), Mail und Telefon, dann der **Verlauf** — jede Mail mit
Zeitpunkt und ob sie hinausging — und die **Rückmeldung** mit Zeit und
Herkunft (per Mail-Link oder vom Haus).

**Knöpfe je Zeile:** verständigen · hat gebucht · kein bedarf · notiz ·
entfernen. Für eine Gruppe: *alle N verständigen*, mit einem freiwilligen Satz
für die Mail („bitte bis Freitag buchen“) und einer Rückfrage vor dem Versand.

**Zwei Knöpfe oben:**

- **Jetzt nachsehen** — fragt sofort beim Ticketdienst nach, für die Abende,
  um die es geht (höchstens zwölf; gemessen 2,7 Sekunden für neun). Von selbst
  sieht der Dienst alle zwölf Stunden nach.
- **+ eintragen** — der Gast ruft an, der Wirt trägt ihn ein. Abende aus dem
  Dienst, ausverkaufte zuerst. Keine Bestätigungsmail — die hatte er am
  Telefon; stattdessen liefert die Antwort die drei Antwortlinks des Gastes
  zum Weitergeben.

**Die Zahl am Reiter** zählt nur Wartende, für die es etwas zu tun gibt.
Solange ein Abend ausverkauft ist, schweigt sie. Wird ein Abend mit Wartenden
wieder buchbar, **klingelt** die App zusätzlich (Push, wie bei einer neuen
Bestellung).

Ganz unten: **Neuen Abend aufnehmen** (siehe [Abschnitt 8](#8-ein-neuer-abend-was-von-selbst-geht-was-ein-handgriff-ist)).

---

## 4. Die Abgrenzung: welcher Weg betroffen ist und welcher nicht

Das ist die Regel, an der alles hängt. Ein Abend kann bis zu zwei Wege haben
(„dinner & comedy“ 19 Uhr, „comedy only“ 21 Uhr). Jeder Weg hat beim
Ticketdienst seine eigene Kennung, seine eigenen Kategorien, seinen eigenen
Stand.

| Lage am Abend | Kachel auf der Eventseite | Dialog „Wofür genau?“ | Beim Wirt |
|---|---|---|---|
| beide Wege buchbar | zwei Ticketknöpfe, **kein** Wartelisten-Knopf | – | nichts |
| ein Weg weg, einer buchbar | grauer Stempel am weggegangenen, Ticketknopf am anderen, dazu „auf die warteliste“ | genau **ein** Haken; darüber „Am selben Abend gibt es noch Karten: comedy only · 21:00 — tickets buchen“ | eine Gruppe, nur für den ausverkauften Weg |
| beide Wege weg | zwei graue Stempel, „auf die warteliste“ | zwei Haken | zwei Gruppen |
| dasselbe Programm an anderen Tagen | wie oben | Haken für die ausverkauften Tage; Hinweis mit Ticketknopf für die buchbaren | je Tag und Weg eine Gruppe |

**Der buchbare Weg wird nie angefasst.** Sein Ticketknopf bleibt, er taucht im
Dialog nur als Alternative mit „tickets buchen“ auf, und niemand kann sich für
ihn auf eine Warteliste setzen: die Seite bietet keinen Haken dafür, und der
Dienst lehnt eine Eintragung eines Gastes für einen buchbaren Weg ab und
schickt ihn zur Buchung. Der Wirt darf es trotzdem — am Telefon weiß er mehr
als jede Momentaufnahme.

---

## 5. Woher jede Angabe kommt

| Angabe | Quelle | Wie aktuell |
|---|---|---|
| Titel, Untertitel, Tag, Uhrzeit, Ort, Haus, Beschreibung, Bild | Ticketdienst, Seite des Abends | alle 12 Stunden, oder auf Knopfdruck |
| Nummer des Abends beim Dienst (`eventId`) | ebenda | ebenda |
| Verkauf offen / geschlossen | ebenda (`canTicketsBePurchased` und der Satz „Diese Veranstaltung ist ausverkauft“) | ebenda |
| **Verkaufte Karten** (`ticketCount`) | öffentliche Schnittstelle `ticketist.io/api/events/<nummer>` | ebenda |
| Preise je Kategorie, freie Karten je Kategorie | `site/data/ticketist-preise.json` — von Hand aus dem Verwaltungsbereich gelesen | Momentaufnahme (zuletzt 14.09.2026) |
| Welche Abende es gibt | `KENNUNGEN` in `server/src/ticketist.mjs` **plus** die selbst aufgenommenen im Dienst | fest bzw. sofort |
| Name, Mail, Telefon, Kartenzahl der Wartenden | der Gast selbst (oder der Wirt am Telefon) | sofort |
| Mailverlauf, Rückmeldungen | der Dienst | sofort |

Die Gästeseite fragt **nie** direkt beim Ticketdienst an. Sie liest den
eigenen Dienst; fällt der aus, gilt die hinterlegte Datei
`site/data/termine.json`. Auch die Bilder liegen bei uns.

---

## 6. Was „ausverkauft“ heißt: drei Quellen, eine Regel

Entschieden wird an genau einer Stelle im Code (`wegStand` in
`server/src/event-warteliste.mjs`), in dieser Reihenfolge:

1. **Karten sind zurückgekommen** — die Zahl der verkauften Karten liegt unter
   ihrem bisherigen Höchststand. Das sticht alles andere: es ist die einzige
   Quelle, die live ist und aus der Wirklichkeit kommt.
2. **Der Schalter des Ticketdienstes** — Verkauf geschlossen, oder der Satz
   „Diese Veranstaltung ist ausverkauft“ in der Beschreibung.
3. **Die hinterlegte Kartenliste** — alle Kategorien dieses Weges auf 0 frei.

Warum drei und nicht eine: der Schalter allein genügt nicht. Gernot Kulis am
07.10. stand am 20.09. auf „Verkauf offen“, obwohl seit dem 14.09. null freie
Karten eingetragen sind. Die Kartenliste allein genügt auch nicht: sie ist
eine Momentaufnahme und weiß von Stornierungen nichts. Zusammen decken sie
sich gegenseitig ab.

Dieselbe Regel gilt auf der Eventseite und im Dienst. Die Gruppen beim Wirt
sind deshalb exakt dieselben Wege, die auf der Seite einen Wartelisten-Knopf
tragen.

---

## 7. Zurückgekommene Karten

Der Ticketdienst gibt öffentlich heraus, **wie viele Karten verkauft sind**.
Gemessen am 20.09.2026:

| Abend | verkauft | frei laut Kartenliste | Platzangebot |
|---|---|---|---|
| Gernot Kulis 07.10. | 774 | 0 | 774 |
| Gernot Kulis 08.10. | 676 | 93 | 769 |
| rock4 22.10. „dinner & konzert“ | 214 | 0 | 214 |
| rock4 22.10. „konzert only“ | 20 | 0 | 20 |
| christof spörk 15.10. | 35 | 156 | 191 |

Verkauft plus frei ergibt das Platzangebot — die Zahl ist also die
**verkauften** Karten. Der Dienst merkt sich bei jedem Nachlesen den
Höchststand. Fällt die Zahl darunter, hat jemand storniert:

- Die Gruppe wird **gold** und zeigt „3 karten zurück“.
- Die App **klingelt** („Wieder Karten: Gernot Kulis — 3 Karten zurück, 2
  Personen warten“).
- Wird nachgekauft, steigt die Zahl wieder auf den Höchststand, und der Abend
  gilt wieder als ausverkauft. Das korrigiert sich von selbst.

Das ist der einzige öffentlich verfügbare Hinweis auf Rückläufer. Ohne ihn
müsste man warten, bis jemand im Haus den Verkauf wieder aufmacht.

---

## 8. Ein neuer Abend: was von selbst geht, was ein Handgriff ist

**Der eine Handgriff: den Link einfügen.**
Wirt-App → Reiter *warteliste* → *Neuen Abend aufnehmen* → Link vom
Ticketdienst einfügen (`ticketist.io/events/…`) → *Aufnehmen*.

Der Dienst liest den Abend sofort. Ab diesem Moment gilt **alles andere
automatisch**:

| Was | passiert |
|---|---|
| Eventseite | Kachel mit Titel, Untertitel, Tag, Uhrzeit, Haus, Bild |
| Startseite | Zeile im Programm |
| Kalenderdatei (.ics) | Eintrag |
| Ticketknopf | führt auf die richtige Seite |
| Warteliste | entsteht, sobald der Abend ausverkauft ist |
| Verkaufte Karten | werden ab sofort mitgezählt, Rückläufer werden erkannt |
| Zweiter Weg („comedy only“) | wird als eigener Abend aufgenommen und automatisch mit dem ersten zusammengelegt |

Kein Programmieren, keine Veröffentlichung, kein Warten. Geprüft am 20.09.:
Link eingefügt → der Abend stand sofort im Programm (47 statt 46 Kennungen)
→ die Warteliste nahm Eintragungen dafür an → entfernt → sofort wieder weg
und die Warteliste lehnte ab.

**Was der Abend ohne weiteres Zutun nicht hat:** Preise. Die stehen nicht
öffentlich beim Ticketdienst, sondern in `site/data/ticketist-preise.json`.
Ohne Eintrag zeigt die Kachel schlicht keine Preiszeilen — geraten wird
nichts. Sold-out erkennt der Dienst trotzdem, über Schalter und Rückläufer.

**Empfehlung fürs Haus:** Wenn ein Abend ausverkauft ist, im Ticketdienst
entweder den Verkauf schließen **oder** in die Beschreibung den Satz
„Diese Veranstaltung ist ausverkauft“ schreiben. Beides erkennt unser Dienst
von selbst, innerhalb von zwölf Stunden oder sofort auf Knopfdruck. Das ist
der zuverlässigste Weg und kostet nichts.

---

## 9. Was garantiert ist — und was nicht

**Garantiert:**

- Ein Abend, der auf der Eventseite steht, hat eine funktionierende
  Warteliste, sobald er ausverkauft ist. Seite und Dienst rechnen mit
  derselben Regel aus derselben Quelle — es gibt keinen zweiten Datenstand,
  der auseinanderlaufen könnte.
- Ein neuer Abend braucht genau einen Handgriff (Link einfügen) und ist danach
  überall vollständig: Seite, Startseite, Kalender, Warteliste, Kartenzählung.
- Ein buchbarer Weg bekommt nie eine Warteliste, ein ausverkaufter immer.
- Ein Aussetzer beim Ticketdienst kostet keinen Abend mehr. Der Abgleich
  versucht es zweimal, behält sonst den bisherigen Eintrag und bricht ab,
  statt eine gute Datei durch eine halbe zu ersetzen. **Das war ein echter
  Fehler:** am 20.09. verschwand der Abend vom 22.09. nach einem einzigen
  misslungenen Abruf still aus der Datei.
- Wartelisten-Einträge verschwinden nach dem Abend von selbst, mitsamt
  Adresse und Telefonnummer.

**Nicht garantiert, mit Grund:**

- **Ein Abend, dessen Kennung niemand eingefügt hat, existiert für uns nicht.**
  Das betrifft nicht nur die Warteliste, sondern die ganze Seite — er fehlt
  dann auch im Programm. Es gibt beim Ticketdienst keine öffentliche Liste
  aller Abende eines Veranstalters (geprüft am 20.09.: `/api/events/<nummer>`
  ist öffentlich, Sammlungen und Veranstalterseiten sind es nicht).
- **Sofortige Erkennung von „ausverkauft“ bei einem brandneuen Abend**, wenn
  der Verkauf offen bleibt und in der Beschreibung nichts steht und keine
  Kartenliste hinterlegt ist. Dann sieht der Dienst erst dann etwas, wenn
  Karten zurückkommen oder jemand im Haus den Schalter umlegt. Deshalb die
  Empfehlung oben.
- **Freie Karten je Kategorie in Echtzeit.** Öffentlich gibt es nur die
  verkauften Karten, nicht das Platzangebot je Kategorie. Das Platzangebot
  lernt der Dienst erst, wenn ein Weg einmal ausverkauft war.
- **Zustellung der Mails.** Solange der Absender nicht auf einer Domain liegt,
  die bei Brevo beglaubigt ist, weist aon.at jede Mail ab. Das ist ein
  bekanntes, offenes Thema und hängt am Domain-Zugang.

---

## 10. Welche Zugänge noch etwas bringen würden

| Zugang | Was er löst | Ohne ihn |
|---|---|---|
| **Veranstalter-Zugang / API-Schlüssel bei ticketist.io** | Abende und freie Karten je Kategorie automatisch und in Echtzeit lesen. Damit fiele der letzte Handgriff weg — neue Abende kämen von selbst, ausverkauft wäre sofort und je Kategorie erkennbar | ein eingefügter Link je neuem Abend; sold-out über drei Quellen |
| **Domain bei Cloudflare + beglaubigter Absender** | Die Wartelisten-Mails kommen tatsächlich an. Das betrifft alle Mails des Hauses, nicht nur diese | Mails werden versucht und der Fehlversuch steht ehrlich in der Zeile |
| Zugang zum Verwaltungsbereich von ticketist (nur lesend) | die Kartenliste `ticketist-preise.json` frisch halten | Momentaufnahme vom 14.09., ergänzt durch Schalter und Rückläufer |

Der erste ist der einzige, der die Struktur verändert. Die anderen beiden
verbessern, was schon läuft. **Wenn du bei ticketist.io nach einem
Veranstalter-Zugang mit API-Schlüssel fragst, lohnt sich das** — alles andere
ist dann nur noch Anschluss.

Nicht gebaut, bewusst: das Abklappern der Nummern bei `/api/events/<nummer>`,
um neue Abende zu finden. Es läge technisch nahe, liest aber die Daten anderer
Veranstalter mit, und der Dienst hat beim Ausprobieren am 20.09. nach rund
zwanzig Abfragen dichtgemacht. Ein eingefügter Link ist ehrlicher und
verlässlicher.

---

## 11. Der Mittagstisch

Der zweite Abschnitt im selben Reiter. Er betrifft **Reservierungen**, nicht
Tickets, und hat mit den Abenden nichts zu tun — außer der Form.

### Wie ein Eintrag entsteht

Meldet der Wirt einen Tag als voll (oder ist keine Zeit mehr frei), zeigt die
Reservierungsseite statt der Zeiten die Warteliste: Name, E-Mail,
Personenzahl. Mehr wird nicht gefragt. Dieselbe Adresse steht je Tag nur
einmal auf der Liste, höchstens 30 Einträge je Tag.

### Was von selbst passiert

Sagt ein Gast online ab, oder wird eine Reservierung im Haus storniert,
verständigt der Dienst **von selbst** den ältesten Eintrag, der von der
Personenzahl her passt. Eine Sechsergruppe zu rufen, weil ein Zweiertisch
frei wurde, wäre eine Einladung zur Enttäuschung — deshalb die Prüfung.
Die Mail reserviert nichts; gebucht wird über den normalen Weg mit denselben
Grenzen. So kann die Warteliste nie an der Kapazitätsprüfung vorbei buchen.

### Was der Wirt seit 21.09.2026 sieht und tun kann

Bis dahin war diese Liste **unsichtbar**. Der Gast trug sich ein, der Dienst
verständigte bei einer Absage automatisch — und im Haus sah das niemand. Wer
nicht drankam, blieb es stillschweigend; die einzige Spur war eine Zahl im
Tageszettel.

Jetzt steht je Tag eine Gruppe da, mit allen Wartenden in der Reihenfolge
ihrer Eintragung: Name, Personenzahl, wann eingetragen, E-Mail, und der
Mailverlauf mit Zeitpunkt und Zustellung. Zwei Knöpfe je Zeile:

- **ein tisch ist frei** — schickt dieselbe Mail, die auch die Automatik
  schickt. Gedacht für den Fall, den nur der Wirt kennt: ein Tisch wird frei,
  ohne dass online jemand abgesagt hat. Mit Rückfrage vor dem Versand.
- **entfernen** — nimmt den Eintrag samt Adresse von der Liste.

Bei einem bereits verständigten Eintrag steht stattdessen **zurück auf
wartend** — etwa wenn die Mail nicht ankam.

### Unterschiede zu den Abenden

| | Abende | Mittagstisch |
|---|---|---|
| Wovon hängt es ab | Weg beim Ticketdienst | Tag |
| Wer verständigt | der Wirt (ein Knopf) | der Dienst von selbst bei einer Absage, zusätzlich der Wirt |
| Warum nicht automatisch bzw. doch | eine einzige Rückläuferkarte würde fünfzig Mails auslösen | eine Absage gibt genau einen Platz frei, und die Personenzahl wird geprüft |
| Rückmeldung des Gastes | zwei Links in der Mail | keine — er bucht einfach, und das sieht der Wirt in der Tagesliste |
| Zahl am Reiter | ja, wenn es Karten gibt | nein — es gibt nichts zu entscheiden, solange niemand absagt |
| Aufbewahrung | bis zum Abend | bis zum Tag selbst |

---

## 12. Wann aktualisiert wird

Die Abende kommen vom Ticketdienst. Wie oft nachgesehen wird, entscheidet
über die Frage „stimmt das, was ich hier sehe?“.

| Wann | Was | Wie viele Abende |
|---|---|---|
| **06:00 im Haus, täglich** | Termine und Wartelisten-Stand auffrischen | die ausverkauften und die mit Wartenden, höchstens zwölf |
| **12:00 im Haus, täglich** | dasselbe | dasselbe |
| laufend, alle 12 Stunden | jeder Abend, sobald sein Stand veraltet ist | im Hintergrund, sechs je Aufruf |
| **Knopf „Jetzt nachsehen“** | sofort | dieselben zwölf; gemessen 2,7 Sekunden für neun |
| beim Aufnehmen eines Abends | sofort dieser eine | einer |

Der Mittagstisch braucht keinen Takt: seine Einträge entstehen im eigenen
Dienst und stehen sofort über den Live-Draht in der App.

### Warum kein sechster Zeitplan

Die Cloudflare-Gratisstufe erlaubt **fünf Cron-Trigger je Konto**, und die
fünf sind vergeben. Ein sechster hätte den Abgleich stillschweigend scheitern
lassen („only partially updated“) — genau das ist am 05.09.2026 schon einmal
passiert. Mehr Stunden **in einem bestehenden Eintrag** kosten dagegen keinen
weiteren Trigger. Deshalb trägt der vierte Eintrag jetzt drei Aufgaben:

```
"0 4,5,6,7,10,11 * * *"
  04:00 / 05:00 UTC  ->  06:00 im Haus  ->  auffrischen
  06:00 / 07:00 UTC  ->  08:00 im Haus  ->  Tageszettel (nur Mo-Fr, im Code geprüft)
  10:00 / 11:00 UTC  ->  12:00 im Haus  ->  auffrischen
```

Je Paar feuert nur eine Stunde wirklich — die andere gehört zur Sommer- bzw.
Winterzeit; welche zählt, entscheidet die Hausuhr im Code. Täglich statt
Montag bis Freitag, weil Abende auch am Wochenende stattfinden.

Zwei Vorkehrungen:

- Ein **Merker** verhindert einen zweiten Lauf zur selben Minute. Nötig, weil
  sich an Werktagen um 12:00 zwei Zeitpläne überschneiden (das
  Erinnerungsfenster läuft dort alle Viertelstunde) und weil Cloudflare einen
  Lauf wiederholen darf, der nicht durchkam.
- Um 12:00 läuft das **Erinnerungsfenster weiter**. Ein früher Ausstieg hätte
  die Tischerinnerungen dieser Viertelstunde verschluckt.

---

## 13. Datenschutz

- Erhoben werden Name, E-Mail, Kartenzahl und — freiwillig — die
  Telefonnummer, für genau die angehakten Abende.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Anbahnung).
- Jede Bestätigungsmail trägt einen Link zum Austragen; ein Klick löscht den
  Eintrag samt Kontaktdaten.
- Nach dem Abend löscht sich jeder Eintrag automatisch.
- Die Antwort-Geheimnisse der Gäste stehen ausschließlich in deren Mails. Sie
  sind weder in der Übersicht des Hauses noch im Live-Stand enthalten; nur
  beim Eintrag am Telefon gibt der Dienst sie einmalig an den Wirt zurück,
  damit er sie weitergeben kann.
- Der Text steht auf der Seite unter
  [Datenschutz → Warteliste für ausverkaufte Abende](../site/datenschutz-sicherheit.html).

Für den **Mittagstisch** gilt dasselbe in kleiner: Name, E-Mail und
Personenzahl für genau einen Tag, Löschung nach diesem Tag, keine weitere
Verwendung. Der eigene Abschnitt steht ebenfalls in den
Datenschutzhinweisen.

---

## 14. Prüfprotokoll

Alles gegen den Probe-Dienst (`?probe=1`), am 20.09.2026, in der eingebauten
Browserprüfung und über die Schnittstelle.

### Abgleich aller Kacheln

Alle 31 Kacheln der Eventseite automatisch geprüft: 7 mit mindestens einem
ausverkauften Weg tragen den Knopf, 24 ohne tragen ihn nicht. Bei jeder der 7
zeigt der Dialog genau die ausverkauften Wege als Haken und genau die
buchbaren als Alternative:

| Kachel | Haken | noch buchbar |
|---|---|---|
| Gernot Kulis 07.10. | kulis-02-2026 | Kulis 08.10. |
| Luis aus Südtirol 13.10. | luis-2026 | Luis 14.10., 25.11. |
| dinner & comedy 14.10. | dinner-comedy-04-2026 (+ 11.11. anhakbar) | comedy only 14.10., weitere Abende |
| rock4 22.10. | rock4-2026, rock4-2026-only | – |
| 50 Jahre Ulli Troy 25.10. | ullitroy-menue-2026 | Brunch 26.10. |
| dinner & comedy 11.11. | dinner-comedy-05-2026 (+ 14.10.) | comedy only 11.11., weitere |
| Fabio Landert 17.11. | landert-2026 | – |

Die Gruppen beim Wirt sind exakt dieselben acht Wege.

### Gastseite

- Eintrag mit Name, Mail, Telefon, 2 Karten → steht beim Wirt mit Zeit,
  Kontakt und Quelle „Gast“.
- Kaputte Mailadresse → Fehlertext, nichts gesendet.
- Zwei Haken (14.10. + 11.11.) in einem Zug → zwei Einträge, Bestätigung nennt
  beide.
- Dieselbe Adresse nochmal, anders geschrieben → „stehst schon auf der Liste“,
  kein Doppel.
- Unbekannte Kennung → abgelehnt.
- Abend gerade wieder buchbar → keine Warteliste, sondern die Buchung öffnet
  sich mit „Gute Nachricht …“.
- Ein ausverkaufter und ein buchbarer Weg angehakt → nur der ausverkaufte wird
  aufgenommen, ohne Fehlermeldung.
- Startseite „Ausverkauft · Warteliste“ → Eventseite öffnet den Kasten für
  genau diesen Abend, auch im Probemodus.
- Handyformat 390 px: Dialog, Kachelknöpfe, vier Reiter ohne Umbruch.

### Wirtseite

- Ohne Hausschlüssel 401, mit Schlüssel die Übersicht. Geheimnisse der Gäste
  stehen weder im Live-Stand noch in der Übersicht.
- „verständigen“ und „alle verständigen“ → in der Probe ohne Mailschlüssel
  zeigt die Zeile „Mail So., 20.09 16:17 nicht zugestellt (kein Versand
  eingerichtet)“ und der Stand bleibt „wartet“. Im Echtbetrieb wird daraus
  „Mail …“ und „verständigt“.
- „hat gebucht“ mit Notiz → grün, Rückmeldung „vom Haus“ mit Zeit.
- Eintrag am Telefon → Quelle „vom Haus“, keine Bestätigungsmail, die drei
  Antwortlinks kommen zurück.
- Antwortlink „gebucht“ → Dankesseite, beim Wirt „Rückmeldung per Mail-Link“.
  „austragen“ → Eintrag samt Adresse weg, derselbe Link danach 404. Falsches
  Geheimnis → 404.
- „Jetzt nachsehen“ → 9 Abende in 2,7 Sekunden neu gelesen, verkaufte Karten
  standen danach in jeder Gruppe (774, 676, 809, 224, 214, 20, 429, 221, 825).
- Live: eine Eintragung auf der Gastseite erscheint ohne Neuladen beim Wirt.

### Neuen Abend aufnehmen

- Link mit Anhang (`?utm_source=…`) → Kennung richtig erkannt.
- `javascript:`-Link, Pfadtricks, leer, überlang → abgelehnt.
- Erfundene Kennung → „kennt der Ticketdienst nicht“.
- Bereits bekannter Abend → „kennt der Dienst schon“, kein Doppel.
- Ohne Hausschlüssel → 401.
- Abend aus dem Grundstock entfernen → abgelehnt („fest“).
- Echter Abend aufgenommen → sofort im Programm, Warteliste nimmt ihn an;
  entfernt → sofort weg, Warteliste lehnt ab.

### Ausfallsicherheit des Abgleichs

- Ein Abend, der beim ersten Versuch nicht las, wird ein zweites Mal versucht.
- Was dann noch fehlt, bleibt mit dem bisherigen Eintrag stehen.
- Mehr als fünf Ausfälle → der Lauf bricht ab, die gute Datei bleibt.
- Alle 46 Kennungen und 31 Abende nach der Änderung fehlerfrei gelesen.

### Mittagstisch

- Tag voll gemeldet, drei Gäste über die öffentliche Schnittstelle
  eingetragen (2, 6 und 2 Personen) → beim Wirt eine Gruppe „Mo., 21.09,
  2 warten · 8 personen“ nach Entfernen eines Eintrags.
- „ein tisch ist frei“ → in der Probe ohne Mailversand steht in der Zeile
  „Mail So., 20.09 21:13 nicht zugestellt (kein Versand eingerichtet)“, der
  Stand bleibt „wartet“. Genau so soll es sein: ein misslungener Versand ist
  keine Verständigung.
- Unbekannter Eintrag → abgelehnt. Ohne Hausschlüssel → 401.
- „entfernen“ → Eintrag samt Adresse weg.
- Beide Abschnitte stehen im Reiter untereinander und lassen sich einzeln
  über die Übersicht aus- und einblenden.

### Zeitplan

- Fünf Cron-Einträge, also innerhalb der Grenze der Gratisstufe.
- Gegenprobe der Hausuhr für alle sechs Stunden des vierten Eintrags, für
  Sommer- und Winterzeit: 06:00, 08:00 und 12:00 im Haus werden getroffen.
- Der Merker verhindert den Doppellauf um 12:00; die Tischerinnerungen
  laufen dort weiter.

### Was in der Probe nicht prüfbar ist

- **Zustellung echter Mails** (kein Brevo-Schlüssel in der Probe).
- **Das Klingeln bei „wieder Karten“** — dafür müsste beim Ticketdienst
  tatsächlich jemand stornieren. Die Regel dahinter ist durch Testfälle
  abgedeckt, die genau die gespeicherte Form verwenden; dass die Zahlen aus
  dem Ticketdienst in der Übersicht ankommen, ist live belegt.
- **Die Läufe um 06:00 und 12:00** — die Probe hat bewusst keine Zeitpläne
  (die fünf des Kontos gehören dem Echtbetrieb). Der Weg dahinter ist
  derselbe, den der Knopf „Jetzt nachsehen“ nimmt, und der ist belegt.

---

## 15. Technische Übersicht

**Logik ohne Netz** (in Node prüfbar):

| Datei | Inhalt |
|---|---|
| `server/src/event-warteliste.mjs` | Abende: Eingabenprüfung, Aufnahme, `wegStand` (die Ausverkauft-Regel), Übersicht, Rückläufer-Erkennung, Aufräumen |
| `server/src/warteliste.mjs` | Mittagstisch: Eingabenprüfung, Aufnahme, wer als Nächstes dran ist, Übersicht fürs Haus, Aufräumen |
| `server/src/ticketist.mjs` | Lesen beim Ticketdienst, `holeVerkauft`, `kennungAusLink`, Zusammenlegen zweier Wege |
| `scripts/check-event-warteliste.mjs` | goldene Testfälle, Teil von `npm run ci` |
| `scripts/check-termine.mjs` | Testfälle fürs Lesen, für `kennungAusLink` und die Nummern |

**Schnittstellen des Dienstes:**

| Weg | Wer darf | Wozu |
|---|---|---|
| `POST /api/event-warteliste` | jeder | Gast trägt sich ein |
| `GET /api/event-warteliste` | Haus | Übersicht |
| `POST /api/event-warteliste/intern` | Haus | Eintrag am Telefon |
| `POST /api/event-warteliste/aktion` | Haus | verständigen, Stand, Notiz, entfernen |
| `POST /api/event-warteliste/auffrischen` | Haus | jetzt beim Ticketdienst nachsehen |
| `GET /warteliste/antwort?t=…&a=…` | Gast mit seinem Geheimnis | gebucht / kein Bedarf / austragen |
| `POST /api/termine/kennung` | Haus | Abend aufnehmen |
| `POST /api/termine/kennung/entfernen` | Haus | Abend hergeben |
| `POST /api/warteliste` | jeder | Gast trägt sich für einen Mittag ein |
| `POST /api/warteliste/aktion` | Haus | Mittagstisch: verständigen, Stand, entfernen |

**Speicher** (Durable Object, Tabelle `einstellungen`):

| Schlüssel | Inhalt |
|---|---|
| `eventWarteliste` | die Einträge; höchstens 200 je Weg, 8 Wege je Eintragung |
| `eigeneKennungen` | die selbst aufgenommenen Abende, höchstens 80 |
| `termine` | je Kennung `{ geholtAm, termin, verkauft, verkauftMax }` |
| `warteliste` | die Mittags-Einträge; höchstens 30 je Tag |
| `wartelisteTakt` | Merker gegen Doppelläufe um 06:00 und 12:00 |

**Wege zur Oberfläche:** Die Gruppen kommen über den Live-Draht als
`stand.eventWarteliste` und `stand.mittagWarteliste` — die Wirt-App rechnet
nichts, sie zeigt.

**Mails:** `eventWartelisteAufnahmeMail` und `eventWartelisteFreiMail` in
`server/src/mail.mjs`.

---

## 16. Was noch dazukommen könnte

- **Automatischer Versand an die ersten N**, wenn der Wirt binnen einer Stunde
  nicht selbst geklickt hat. Bewusst noch nicht gebaut: erst sehen, wie oft
  der Fall vorkommt und wie viele Karten dabei üblich sind.
- **Erinnerung nach drei Tagen ohne Rückmeldung**, danach automatisch auf
  „kein Bedarf“. Bewusst noch nicht: das Ende des Abends räumt ohnehin auf.
- **Kartenliste halbautomatisch** — ein Feld in der Wirt-App, in das die
  freien Karten je Kategorie eingetragen werden, statt der Datei im
  Projekt. Lohnt sich, sobald klar ist, wie oft das gebraucht wird.
- **Veranstalter-Zugang bei ticketist** (siehe
  [Abschnitt 10](#10-welche-zugänge-noch-etwas-bringen-würden)) — der einzige
  Schritt, der den letzten Handgriff abschafft.
