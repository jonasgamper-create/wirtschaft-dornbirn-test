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
- **Startseite**: Die statischen „Ausverkauft ↗“-Links dort zeigen weiter auf
  den Ticketdienst. Der Weg zur Warteliste führt über die Eventseite; ob der
  Startseiten-Link dorthin zeigen soll, ist eine Entscheidung von Jonas.

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
