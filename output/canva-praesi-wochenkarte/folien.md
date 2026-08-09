# Präsentation: Die Wochenkarte als E-Mail-Abo

Vorlage zum Aufbau in Canva. Eine Folie pro Abschnitt, Texte sind
kopierfertig. CI: Ink `#11110F`, Paper `#F3EFE6`, Wein `#8C292B`,
Gold `#C59B5D`, Grün `#244635`. Headlines Serif (Georgia), Rest Inter.

---

## Folie 1 · Titel
**Hintergrund:** Ink · **Logo:** wirtschaft-logo.png (einmal, oben links)

> ## Die Wochenkarte kommt zu den Gästen.
> Jeden Montag, 7:15 Uhr. Ein Abo, das Mittagsgäste bringt.

---

## Folie 2 · Warum das funktioniert
**Hintergrund:** Paper

> ### Der Gast entscheidet um 9 Uhr, wo er um 12 isst.
> - 80 % besuchen eine Restaurant-Website wegen der Speisekarte
> - Wer die Karte am Morgen im Postfach hat, muss nicht mehr suchen
> - Montag 7:15 Uhr: vor der ersten Essensentscheidung der Woche

*(Quelle Folienfuß: Owner.com-Erhebung 2024, 1.300 Gäste)*

---

## Folie 3 · So einfach ist der Ablauf
**Hintergrund:** Paper · Drei Spalten mit Nummern in Wein

> **01 · Eintragen**
> Küche trägt die Gerichte der Woche in eine Datei ein (5 Minuten)
>
> **02 · Erzeugen**
> Ein Befehl baut die fertige Mail – Website und Mail immer identisch
>
> **03 · Senden**
> Newsletter-Dienst verschickt Montag 7:15 Uhr automatisch

---

## Folie 4 · Was der Gast bekommt
**Hintergrund:** Ink · **Bild:** Screenshot der Mail (output/lunch-mail/mittagskarte-mail.html im Browser öffnen und abfotografieren)

> ### Eine Mail. Die ganze Woche.
> Gerichte mit Preisen, Reservierungsknopf, fertig.
> Keine Werbung, kein Tracking, Abmeldung mit einem Klick.

---

## Folie 5 · DSGVO – sauber gelöst
**Hintergrund:** Grün, Text Paper

> ### Rechtlich auf festem Boden.
> - Anmeldung nur mit Double-Opt-in (Bestätigungsmail)
> - Adressen liegen beim Newsletter-Dienst mit AV-Vertrag, nie auf der Website
> - Abmeldelink in jeder Mail
> - Keine Öffnungs-Tracker ohne Einwilligung

---

## Folie 6 · Was es kostet
**Hintergrund:** Paper

> ### Aufwand: 5 Minuten pro Woche.
> - Werkzeug ist gebaut und getestet (`npm run lunch:mail`)
> - Newsletter-Dienst: kostenlose Stufen reichen für den Start
>   (z. B. Brevo bis 300 Mails/Tag – Konditionen bei Einrichtung prüfen)
> - Einmalig: Dienst wählen, AV-Vertrag abschließen, Absender verifizieren

---

## Folie 7 · Nächste Schritte
**Hintergrund:** Ink · Gold für die Nummern

> 1. Newsletter-Dienst festlegen (Empfehlung: EU-Anbieter mit AV-Vertrag)
> 2. Anmeldeformular des Dienstes auf der Website verlinken
> 3. Erste echte Wochenkarte nach der Sommerpause eintragen (ab 24.08.)
> 4. Versand Montag 7:15 Uhr als Automatisierung im Dienst hinterlegen
>
> **Kontakt:** willkommen@wirtschaft-dornbirn.at
