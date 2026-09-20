# Warteliste für ausverkaufte Abende

Eingerichtet am 20. September 2026. Zweck: Wer für einen ausverkauften Abend
Karten will, soll nicht ins Leere klicken – und der Wirt soll wissen, wer
wann wofür angefragt hat, und die Leute mit einem Knopf verständigen können,
sobald es wieder Karten gibt.

## Die Systematik in einem Absatz

Die Warteliste hängt am **Weg beim Ticketdienst**, nicht am Abend. „dinner &
comedy“ um 19 Uhr und „comedy only“ um 21 Uhr sind bei ticketist.io zwei
Veranstaltungen mit eigener Kennung – und der Gast wartet auf genau eine davon.
Eine Warteliste gibt es **von selbst**, sobald der Ticketdienst einen Weg als
ausverkauft meldet; niemand legt sie an, niemand schaltet sie ab. Reihenfolge
ist Ehrlichkeit: Die Liste steht so, wie sie entstanden ist, und der Wirt
verständigt in dieser Reihenfolge. Die Mail **reserviert nichts** – sie öffnet
die Tür zum Ticketdienst, wer zuerst kauft, hat die Karten. Nach dem Abend
löscht sich jeder Eintrag von selbst, mitsamt Adresse und Telefonnummer.

## Aus Sicht des Gastes

Auf der Eventseite steht neben dem grauen „ausverkauft“ ein Knopf
**„auf die warteliste“**. Er öffnet einen Kasten wie die Ticketbuchung:

1. **Wofür genau?** Alle ausverkauften Wege dieses Abends *und* desselben
   Programms an anderen Tagen, je ein Haken. Vorgehakt ist, was auf der
   Kachel stand. Luis spielt dreimal – wer Dienstag oder Mittwoch nehmen
   würde, hakt beides an und steht auf beiden Listen.
2. **Gibt es noch etwas?** Ist am selben Abend oder an einem anderen Tag
   vom selben Programm noch etwas zu haben, steht das gleich darüber, mit
   „tickets buchen“. Wer heute Karten will, soll nicht warten müssen, wenn
   morgen welche da sind.
3. Name, E-Mail, Telefon (freiwillig), Kartenzahl. Absenden.

Der Gast bekommt eine **Bestätigungsmail** mit dem Link zum Austragen. Sobald
Karten da sind, die Mail **„Es gibt wieder Karten“** mit dem Ticketlink und
zwei Antwortknöpfen: *Ich habe gebucht* / *Brauche keine mehr*. Beides ist ein
Klick, kein Formular; die Antwort landet beim Wirt in der Zeile.

## Aus Sicht des Wirts

Vierter Reiter **„warteliste“** in der Wirt-App. Je Weg eine aufklappbare
Gruppe: Datum, Uhrzeit, Titel, Stand (ausverkauft / wieder Karten da), wie
viele warten und wie viele Karten das sind. Ausverkaufte Abende ohne Wartende
stehen zugeklappt da – damit man sieht, dass die Liste existiert.

Je Wartendem eine Zeile: Name und Kartenzahl, **wann eingetragen** (und ob vom
Haus am Telefon), Mail und Telefon, dann der **Verlauf**: jede Mail mit
Zeitpunkt und ob sie hinausging, und die **Rückmeldung** (per Mail-Link oder
vom Haus, mit Zeit). Knöpfe: *verständigen*, *hat gebucht*, *kein bedarf*,
*notiz*, *entfernen*. Für eine Gruppe: *alle N verständigen*.

Wird ein Abend mit Wartenden beim Ticketdienst wieder buchbar, wird die
Gruppe gold, am Reiter erscheint die Zahl der Wartenden, und die App
**klingelt** (Push, wie bei einer neuen Bestellung). Die Zahl am Reiter zählt
nur Wartende, für die es etwas zu tun gibt – solange ein Abend ausverkauft
ist, schweigt sie.

**+ eintragen**: Der Gast ruft an, der Wirt trägt ihn ein. Die Abende kommen
vom Dienst, ausverkaufte zuerst. Wer vom Haus eingetragen wird, bekommt keine
Bestätigungsmail – die hatte er am Telefon.

## Warum so und nicht anders

- **Der Wirt schickt, nicht der Automat.** Der Ticketdienst meldet „wieder
  buchbar“ auch bei einer einzigen Rückläuferkarte. Fünfzig Leute wegen einer
  Karte zu verständigen wäre eine Enttäuschungsmaschine. Deshalb: Klingeln
  und Vorschlag, aber der Knopf bleibt beim Wirt. Er kann die ersten drei
  nehmen oder alle.
- **Keine Reservierung.** Die Karten liegen beim Ticketdienst; ein zweites
  Kontingent in unserem Dienst wäre eine zweite Wahrheit. Die Mail sagt
  ehrlich: wer zuerst kauft, hat sie.
- **Rückmeldung per Link, nicht per Antwortmail.** Eine Antwortmail müsste
  jemand lesen und eintragen. Zwei Links in der Mail erledigen das in einem
  Klick und landen ohne Umweg in der Zeile beim Wirt.
- **Löschen nach dem Abend.** Eine Warteliste ist kein Verteiler. Wer über
  Termine informiert werden will, hat dafür den Termin-Newsletter mit
  Doppel-Opt-in.

## Was noch dazukommen könnte

- **Automatischer Versand an die ersten N** bei „wieder buchbar“, mit
  Verzögerung, falls der Wirt binnen einer Stunde nicht selbst geklickt hat.
  Bewusst noch nicht gebaut: erst sehen, wie oft der Fall vorkommt.
- **Erinnerung nach drei Tagen ohne Rückmeldung** – dieselbe Mail nochmal,
  dann Eintrag auf „kein Bedarf“. Bewusst noch nicht: das Ende des Abends
  räumt ohnehin auf.
- **Startseite**: erledigt am 20.09. – „Ausverkauft · Warteliste“ führt auf
  die Eventseite, die den Kasten für genau diesen Weg öffnet
  (`events.html?warteliste=<kennung>`). Bei „Restkarten“ (ein Weg weg, der
  andere buchbar) bleibt der Knopf auf dem Ticketdienst; im Startseiten-Dialog
  steht zusätzlich „Auf die Warteliste“.

## Die Abgrenzung: welcher Weg betroffen ist und welcher nicht

Das ist die Regel, an der alles hängt. Ein Abend kann bis zu zwei Wege haben
(„dinner & comedy“ 19 Uhr, „comedy only“ 21 Uhr). Jeder Weg hat beim
Ticketdienst seine eigene Kennung, seine eigenen Kategorien, seinen eigenen
Stand. Deshalb gilt:

| Lage am Abend | Kachel auf der Eventseite | Dialog „Wofür genau?“ | Was beim Wirt steht |
|---|---|---|---|
| beide Wege buchbar | zwei Ticketknöpfe, **kein** Wartelisten-Knopf | – | nichts |
| ein Weg ausverkauft, einer buchbar (rock4 22.10. vor dem 20.09., dinner & comedy 14.10.) | grauer Stempel am ausverkauften Weg, Ticketknopf am anderen, dazu „auf die warteliste“ | genau **ein** Haken: der ausverkaufte Weg. Darüber: „Am selben Abend gibt es noch Karten: comedy only · 21:00 – tickets buchen“ | eine Gruppe nur für den ausverkauften Weg |
| beide Wege ausverkauft (rock4 22.10. seit dem 20.09.) | zwei graue Stempel, „auf die warteliste“ | zwei Haken | zwei Gruppen |
| dasselbe Programm an anderen Tagen (Luis 13.10. weg, 14.10. und 25.11. buchbar) | wie oben | Haken für die ausverkauften Tage; Hinweis mit Ticketknopf für die buchbaren, höchstens die nächsten drei | je Tag eine Gruppe |

Der buchbare Weg wird **nie** angefasst: sein Ticketknopf bleibt, er taucht
im Dialog nur als Alternative mit „tickets buchen“ auf, und niemand kann sich
für ihn auf eine Warteliste setzen – der Dienst lehnt eine Kennung, die nicht
existiert, ab, und für eine buchbare Kennung zeigt die Seite keinen Haken.

**Was „ausverkauft“ heißt.** Zwei Quellen, dieselbe Regel auf der Seite und
im Dienst:

1. Der Ticketdienst meldet den Verkauf als geschlossen oder schreibt „Diese
   Veranstaltung ist ausverkauft“ in die Beschreibung (live, alle 12 Stunden
   gelesen).
2. **Oder** die hinterlegte Preisliste (`site/data/ticketist-preise.json`,
   gelesen im Verwaltungsbereich) kennt für alle Kategorien des Weges 0 freie
   Karten.

Der Schalter des Ticketdienstes allein reicht nicht: Kulis 07.10. stand am
20.09. live auf „Verkauf offen“, obwohl seit dem 14.09. 0 frei eingetragen
sind. Umgekehrt ist die Preisliste eine Momentaufnahme – kommen Karten
zurück, weiß das nur der Verwaltungsbereich. Deshalb entscheidet der Wirt,
wann verständigt wird, und die Zahl am Reiter zeigt nur die Fälle, in denen
der Ticketdienst selbst wieder aufgemacht hat.

**Behobener Fehler am 20.09.:** Der Abgleich der Termine hängte die
Preisliste nur an den ersten Weg. „konzert only“ bei rock4 (22.10.) war laut
Liste weg, stand aber als buchbar auf der Seite. Jetzt bekommt jeder Weg
seine eigene Preisliste (`scripts/sync-termine.mjs`).

## Prüfprotokoll vom 20.09.2026

Alles gegen den Probe-Dienst (`?probe=1`), in der eingebauten Browserprüfung
und über die Schnittstelle.

**Alle 31 Kacheln der Eventseite, automatisch abgeglichen:**
7 Kacheln mit mindestens einem ausverkauften Weg tragen den Knopf, 24 ohne
tragen ihn nicht. Bei jeder der 7 zeigt der Dialog genau die ausverkauften
Wege als Haken und genau die buchbaren als Alternative:

| Kachel | Haken | noch buchbar (Hinweis) |
|---|---|---|
| Gernot Kulis 07.10. | kulis-02-2026 | Kulis 08.10. |
| Luis aus Südtirol 13.10. | luis-2026 | Luis 14.10., 25.11. |
| dinner & comedy 14.10. | dinner-comedy-04-2026 (+ 11.11. anhakbar) | comedy only 14.10. am selben Abend, dann weitere Abende |
| rock4 22.10. | rock4-2026, rock4-2026-only | – |
| 50 Jahre Ulli Troy 25.10. | ullitroy-menue-2026 | Brunch 26.10. |
| dinner & comedy 11.11. | dinner-comedy-05-2026 (+ 14.10.) | comedy only 11.11., dann weitere |
| Fabio Landert 17.11. | landert-2026 | – |

Die Gruppen beim Wirt sind exakt dieselben acht Wege (7 Kacheln, rock4 mit
zwei Wegen) – Seite und Dienst rechnen mit derselben Regel.

**Gastseite, durchgeklickt:**
- Eintrag mit Name, Mail, Telefon, 2 Karten für Kulis → steht beim Wirt mit
  Zeit, Kontakt und Quelle „Gast“.
- Kaputte Mailadresse → Fehlertext, nichts gesendet.
- Zwei Haken (14.10. + 11.11.) in einem Zug → zwei Einträge, Bestätigung nennt
  beide.
- Dieselbe Adresse nochmal (Groß-/Kleinschreibung anders) → „stehst schon auf
  der Liste“, kein Doppel.
- Unbekannte Kennung → abgelehnt (`grund: weg`).
- Startseite „Ausverkauft · Warteliste“ → Eventseite öffnet den Kasten für
  genau diesen Abend (auch im Probemodus).
- Handyformat 390 px: Dialog, Kachelknöpfe, vier Reiter ohne Umbruch.

**Wirtseite, durchgeklickt und per Schnittstelle:**
- Ohne Hausschlüssel 401, mit Schlüssel die Übersicht; Geheimnisse der Gäste
  stehen weder im Live-Stand noch in der Übersicht.
- „verständigen“ und „alle verständigen“ → in der Probe ohne Mailschlüssel:
  Zeile zeigt „Mail So., 20.09 16:17 nicht zugestellt (kein Versand
  eingerichtet)“, Stand bleibt „wartet“. Im Echtbetrieb wird dieselbe Zeile
  zu „Mail … “ und der Stand zu „verständigt“.
- „hat gebucht“ mit Notiz → grün, Rückmeldung „vom Haus“ mit Zeit.
- Eintrag am Telefon („+ eintragen“) → Quelle „vom Haus“, keine
  Bestätigungsmail; die Antwort liefert die drei Links des Gastes.
- Antwortlink „gebucht“ → Dankesseite, beim Wirt „Rückmeldung per Mail-Link:
  hat gebucht“. Antwortlink „austragen“ → Eintrag samt Adresse weg; derselbe
  Link danach 404. Falsches Geheimnis → 404.
- Reiter wechselt live: eine Eintragung auf der Gastseite erscheint ohne
  Neuladen beim Wirt (Draht).

**Was in der Probe nicht prüfbar ist:** die Zustellung echter Mails (kein
Brevo-Schlüssel) und der Push „Wieder Karten“ (bräuchte einen Abend, den der
Ticketdienst wieder aufmacht). Beides läuft über Bausteine, die im
Echtbetrieb seit Wochen arbeiten (Reservierungsmails, Bestell-Push); die
Logik dahinter ist im Check abgedeckt.

## Technik

- Logik ohne Netz: `server/src/event-warteliste.mjs`, geprüft von
  `scripts/check-event-warteliste.mjs` (Teil von `npm run ci`).
- Mails: `eventWartelisteAufnahmeMail`, `eventWartelisteFreiMail` in
  `server/src/mail.mjs`.
- Dienst: `POST /api/event-warteliste` (Gast), `GET /api/event-warteliste`,
  `POST /api/event-warteliste/intern`, `POST /api/event-warteliste/aktion`
  (Haus, mit Schlüssel), `GET /warteliste/antwort?t=…&a=gebucht|kein_bedarf|austragen`
  (Gast, mit dem Geheimnis aus seiner Mail).
- Die Gruppen kommen über den Live-Draht als `stand.eventWarteliste` – die
  Wirt-App rechnet nichts, sie zeigt. Die Geheimnisse der Gäste sind darin
  nicht enthalten.
- Speicher: ein Schlüssel `eventWarteliste` in der Durable-Object-Tabelle
  `einstellungen`; Obergrenze 200 je Weg, 8 Wege je Eintragung.
- Der Push „Wieder Karten“ entsteht beim Nachlesen der Termine
  (`termine()`), wenn ein Weg mit Wartenden von ausverkauft auf buchbar
  wechselt.
