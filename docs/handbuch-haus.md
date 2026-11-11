# Handbuch fürs Haus · Was ihr selbst an der Webseite ändert

Stand 11. November 2026. Für Wolfgang, Hannah und alle im Haus. Ohne Technik:
alles hier geht in der **Wirt-Ansicht** am Handy, Tablet oder Laptop. Für
alles, was hier nicht steht (Texte, Bilder, Aufbau der Seite), gibt es den
Programmierer – wie ihr ihn beauftragt, steht in Abschnitt 6.

---

## 1. Die Wirt-Ansicht öffnen

- Adresse: `…/tischplan/wirt.html` (heute `https://wirtschaft-dornbirn.pages.dev/tischplan/wirt.html`,
  nach dem Umzug `https://wirtschaft-dornbirn.at/tischplan/wirt.html`).
- Beim **ersten Mal** braucht jedes Gerät den Link mit dem Hausschlüssel
  (`…/wirt.html#k=…`). Den bekommt ihr vom Programmierer. Danach merkt sich
  das Gerät den Schlüssel; ab dann reicht die Adresse ohne Anhang.
- Den Link mit Schlüssel **nicht weiterleiten** – wer ihn hat, ist drin.
- Am Handy: im Browser „Zum Home-Bildschirm“ – dann ist die Wirt-Ansicht
  eine App mit eigenem Symbol.

Unten sind vier Reiter: **heute · karte · warteliste · haus**.

---

## 2. Was ihr selbst ändert – und wo

| Was | Wo | Wirkt |
|---|---|---|
| **Hinweis ganz oben auf der Startseite** („Am 24. Dezember geschlossen“) | haus → Hinweis auf der Startseite | sofort; mit „bis“-Datum verschwindet er danach von selbst |
| **Wochenkarte** (Mittagsgerichte, Vital, à la carte, Preise) | karte → Menüplan der Woche | sofort auf Takeaway, Reservierung und Mittagskarte zum Drucken |
| **Öffnungszeiten mittags** | haus → Öffnungszeiten | sofort auf der Seite und für Reservierungen |
| **Einen Mittag zusperren** (Urlaub, Betriebsausflug) | haus → Zusperren | keine neuen Reservierungen und Bestellungen für den Tag |
| **Tag voll melden / Zeiten sperren** | heute → unten „Online-Reservierungen“ | Gäste sehen „belegt“ und die Warteliste |
| **Einen ganzen Mittag absagen** (alle Gäste verständigen) | haus → Zusperren → „Mittag absagen und Gäste verständigen“ | Gäste mit Mail bekommen eine Absage; wer nur Telefon hat, steht in einer Liste zum Anrufen |
| **Eigene Termine** (z. B. Tag der offenen Tür) | haus → Eigene Termine | auf Startseite und Kalender |
| **Klingeln bei neuer Bestellung** | haus → Klingeln | dieses Gerät meldet sich bei Bestellung, Reservierung, Anfrage, neuem Abend |
| **Tische und Stühle** | haus → Tische & Stühle, Tische sperren | für die Auslastung |

**Was ihr nicht mehr tun müsst:** neue Abende eintragen. Seit 30.09. holt
der Dienst jeden Abend, den ihr auf euren Eventseiten (wirtschaft-dornbirn.at/event,
eugen.family/event) auf Ticketist verlinkt, um 06:00 und 12:00 von selbst auf
die Webseite. Wer nicht warten will: warteliste → „Jetzt nachsehen“.

Genauso die **Ticketkategorien und Preise** der Abende: Seit 11.11.2026 liest
die Seite sie selbst bei Ticketist, eine Änderung steht spätestens nach zwölf
Stunden auf der Webseite. Ihr ändert sie nur in Ticketist – schicken müsst
ihr niemandem etwas. Antwortet Ticketist einmal nicht, nimmt die Seite eine
hinterlegte Liste als Rückfall.

---

## 3. Der Alltag

**Mittags (Reiter heute)**
- Oben die Tage. Darunter **reservierungen** und **takeaway** des Tages.
- Bei jeder Reservierung „da“ tippen, wenn die Gäste kommen; später „fertig“.
  Zeile nach rechts wischen geht auch.
- Bei Takeaway: „abgeholt“, wenn die Bestellung weg ist.
- „+ reservierung eintragen“ für telefonische Reservierungen.

**Wartelisten (Reiter warteliste)**
- **Abende:** wer auf einen ausverkauften Abend wartet. Kommen Karten zurück,
  klingelt es und die Gruppe wird gold. „alle verständigen“ schickt die Mail.
  Ganz oben steht der **Abgleich**: grün = alle Abende eurer Eventseiten sind
  auf der Webseite; rot = einer fehlt, mit Name.
- **Mittagstisch:** wer auf einen Tisch wartet. Sagt jemand ab, verständigt der
  Dienst von selbst den Ersten, für den der Platz passt.

**Anfragen (Reiter haus → Anfragen)**
- Was Gäste über **Locations** (Feste, Catering) und **Agentur** schicken.
- Jede Anfrage kommt zusätzlich per Mail an **uri@eugen.family** (so
  entschieden am 3.11., eingestellt seit 10.11.2026).
  **Auf diese Mail einfach antworten** – die Antwort geht direkt an den Gast.
- Der Gast hat schon eine automatische Bestätigung bekommen. Antwortet er
  darauf, landet das ebenfalls bei uri@eugen.family.
- Ist der Dienst einmal nicht erreichbar, öffnet das Formular beim Gast
  stattdessen eine Mail an uri@eugen.family.
- willkommen@wirtschaft-dornbirn.at bleibt die Kontaktadresse auf der Seite.
- „erledigt“ tippen, wenn beantwortet. Nach 90 Tagen löscht der Dienst sie.

---

## 4. Was automatisch passiert (ohne dass jemand etwas tut)

| Wann | Was | An wen |
|---|---|---|
| sofort | **Bestätigung** einer Reservierung, mit Absage-Link und Kalendereintrag | Gast |
| sofort | **Bestätigung** einer Takeaway-Bestellung, später „fertig“ | Gast |
| sofort | **Bestätigung** einer Anfrage (Locations, Agentur) mit seinen Angaben | Gast |
| sofort | **Bestätigung** des Wartelisten-Eintrags (Abende) | Gast |
| sofort | **Frage** „Willst du den Newsletter wirklich?“ (Double-Opt-in) | Gast |
| wenn ein Tisch frei wird | Mail an den Ersten auf der Mittags-Warteliste | Gast |
| sofort | Push aufs Handy: neue Bestellung, Reservierung, Anfrage, „wieder Karten“, neuer Abend | Haus |
| werktags 08:00 | **Tageszettel** (wer kommt, was bestellt ist) | Haus (`WIRT_MAIL`) |
| Freitag 15:00 | **Wochenbericht** | Haus |
| Freitag 20:00 | Entwurf der nächsten Wochenkarte | Haus (in der Wirt-Ansicht) |
| Montag 07:15 | **Wochenkarte** an die Abonnenten | Gäste mit Newsletter |
| 06:00 und 12:00 | neue Abende von den Eventseiten holen, Abgleich, Wartelisten prüfen | – |
| täglich 07:30 | Abgleich von außen (GitHub); bei einem Fehler Mail an den Programmierer | Programmierer |

**Mails, die Gäste direkt an willkommen@ schreiben,** gehen nicht durch die
Webseite und bekommen keine automatische Antwort – so habt ihr es
entschieden (keine automatische Antwort im Postfach). Sie kommen ganz normal
im Postfach an, und ihr beantwortet sie wie bisher selbst.

---

## 5. Jede Woche – fünf Minuten

1. **Bis Sonntag die Wochenkarte** der kommenden Woche eintragen (karte →
   Menüplan). Freitagabend liegt ein Entwurf bereit, der die alte Woche
   fortschreibt – Gerichte ändern, „veröffentlichen“, fertig.
2. Anfragen durchsehen (haus → Anfragen), Offenes beantworten.
3. Den Hinweis auf der Startseite prüfen – steht dort noch etwas Altes?

---

## 6. Was der Programmierer macht – und wie ihr ihn beauftragt

Alles, was nicht in Abschnitt 2 steht, ändert der Programmierer im Code:
Texte auf den Seiten, Bilder, Aufbau, neue Seiten, Weiterleitungen, Fehler.
Preise und Kategorien der Abende gehören nicht mehr dazu – die kommen von
selbst aus Ticketist (Abschnitt 2).

So beauftragt ihr ihn am saubersten:

- Eine Mail mit **Seite**, **Stelle** (Screenshot), **was stattdessen** dort
  stehen soll. Ein Wunsch je Punkt. So wurde auch das Änderungsblatt vom
  22.09. umgesetzt – das hat gut funktioniert.
- Der Programmierer macht daraus einen Pull Request im Repository, prüft ihn
  (`npm run ci`), schaltet ihn frei und spielt ihn aus. Die Änderung ist
  danach auf der Seite.
- Dringend (Seite kaputt, Reservierungen gehen nicht): anrufen.

---

## 7. Häufige Fragen

**Ein neuer Abend ist auf Ticketist, aber nicht auf der Seite?** Ist er auf
eurer Eventseite verlinkt? Dann warteliste → „Jetzt nachsehen“. Die
Abgleich-Zeile sagt, ob alles da ist. Das Pressefoto kommt mit dem nächsten
Abgleich durch den Programmierer, bis dahin steht ein Ersatzbild.

**Ein Gast sagt, er habe keine Bestätigung bekommen.** Spam-Ordner. Solange
die Mails noch vom alten Absender kommen (siehe Übergabe, Brevo), landen sie
bei Gmail und Outlook oft dort oder gar nicht. Die Reservierung gilt trotzdem
– sie steht in der Wirt-Ansicht.

**Wir sind voll, die Seite nimmt aber weiter an.** Reiter heute →
„Tag voll melden“. Online wird jede Reservierung angenommen, bis ihr den Tag
voll meldet (bewusste Entscheidung; die automatische Tischbremse kann der
Programmierer einschalten).

**Das Handy klingelt nicht.** haus → Klingeln → „auf diesem Gerät klingeln“
erneut tippen und Mitteilungen erlauben. Am iPhone geht das nur, wenn die
Wirt-Ansicht als App auf dem Home-Bildschirm liegt.

**Jemand hat den Link mit Schlüssel weitergegeben.** Programmierer anrufen:
er erzeugt einen neuen Schlüssel, alle Geräte bekommen einen neuen Link.

**Testeinträge mit „TEST“ im Namen?** Das sind Probeeinträge vom Testen. Vor
dem echten Start entfernt sie der Programmierer.
