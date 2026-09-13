# Prüfung: Was passiert, wenn die alten Seiten gelöscht werden

Stand 13. September 2026, geprüft am Zweig `kulturhaus-eventseite` (PR #204).

Die Frage war: **Bleibt nach dem Löschen von wirtschaft-dornbirn.at und
eugen.family irgendwo eine Fehlermeldung stehen?** Geprüft wurde jede Datei
im Projekt, nicht nur die Seiten – also auch Daten, Dienst, Mails, Skripte
und der veröffentlichte Ordner.

## Ergebnis in einem Satz

Nach dem Zusammenführen von PR #204 gibt es **keinen Weg mehr**, auf dem ein
Gast von unserer Seite auf eine der beiden alten Seiten geschickt wird – mit
einer Ausnahme, über die du entscheidest (Gutscheine, siehe unten).

## Was geprüft wurde und was dabei herauskam

### 1. Links, die ein Gast anklicken kann

Im veröffentlichten Ordner (`dist/`) stehen noch **sieben** Links auf
`gutscheine.wirtschaft-dornbirn.at` – der Gutscheinshop. Das ist eine eigene
Adresse unter derselben Domain, nicht die alte Webseite. Alles andere ist
weg: der Kopfknopf der Eventseite, zwei Knöpfe auf der Startseite, die
Verweise aller 18 Termine, die Betreiberlinks in den Fußzeilen.

**Entscheidung nötig:** Wird der Gutscheinshop weiter betrieben? Wenn ja,
bleibt alles, wie es ist. Wenn nein, nehme ich die sieben Links heraus.

### 2. Bilder und Schriften von außen

Keine. Alle Bilder liegen bei uns, auch die Pressefotos der Abende
(`assets/events/ticketist/`, zehn Dateien, 476 KB). Schriften liegen
ebenfalls im Projekt.

### 3. Was die Seite im Betrieb nachlädt

Die Gästeseiten rufen zur Laufzeit genau zwei fremde Adressen auf:

| Adresse | wofür | fällt sie mit den alten Seiten? |
|---|---|---|
| `wirtschaft-reservierung.jonas-gamper.workers.dev` | unser eigener Dienst | nein |
| `www.ticketist.io` | Ticketkauf im Fenster | nein |

Der Dienst selbst ruft auf: `api.brevo.com` (Mails) und
`www.ticketist.io` (Termine). **eugen.family kommt im Dienst nicht mehr
vor** – der frühere Weg über die Programmseite ist entfernt.

### 4. Der gedruckte QR-Code auf der Faltkarte

Das war der einzige echte Fund. Der linke QR-Code zeigte auf
`wirtschaft-dornbirn.at/event/` – gedruckt heißt dauerhaft, und diese Seite
wird gelöscht. Er zeigt jetzt auf unsere eigene Terminseite; der Code wurde
neu erzeugt.

Wichtig: **Karten, die vor dem 13.09. gedruckt wurden, tragen den alten
Code.** Alte Bestände gehören aussortiert, bevor die alte Seite abgeschaltet
wird.

### 5. Adressen, die wie die alte Seite aussehen, aber unsere sind

An 18 Stellen steht `https://wirtschaft-dornbirn.at` in `canonical`,
`og:url`, im Schema und in der Sitemap. Das ist die **künftige Adresse
dieser Seite**, kein Verweis auf das Alte. Sobald die Domain auf die neue
Seite zeigt, stimmen sie; bis dahin betreffen sie nur die Vorschaubilder
beim Teilen in Messengern.

### 6. E-Mail-Adressen

`willkommen@wirtschaft-dornbirn.at` und die Anfrageadressen hängen an der
**Domain**, nicht an der alten Webseite. Solange die Domain beim Haus
bleibt – und das ist der Plan, die neue Seite läuft darunter – funktionieren
sie weiter. Würde die Domain aufgegeben, fielen auch die Postfächer aus.

### 7. Das alte Reservierungssystem

`server/src/altsystem.mjs` kann Buchungen an
`tischreservierung.wirtschaft-dornbirn.at` weiterreichen. Der Schalter dafür
(`ALT_RESERVIERUNG`) steht auf leer, der Weg ist also **aus**. Reservierungen
laufen im eigenen Haus. Der Code bleibt vorerst als Rückfallebene liegen.

### 8. Entwürfe und Werkzeuge

`cinematic-event-calendar.js` trug 18 Links auf alte Eventseiten. Die Datei
gehört zu einem internen Entwurf und wird ab jetzt nicht mehr mit
veröffentlicht. Dasselbe gilt für die Entwurfsseiten selbst – sie waren
schon vorher draußen.

In den PDF- und Social-Skripten (`scripts/`) stehen noch alte Adressen. Das
sind Werkzeuge für uns, keine Seiten für Gäste.

## Dauerhaft abgesichert

`npm run ci` prüft ab jetzt bei jedem Durchlauf, dass keine Seite im
Hauptteil auf `wirtschaft-dornbirn.at` oder `eugen.family` verlinkt
(`scripts/check-interactions.mjs`). Ein Rückfall fällt beim nächsten
Testlauf auf, nicht erst beim Gast.

## Was vor dem Abschalten noch zu tun ist

1. **Gutscheinshop klären** – bleibt er, bleibt der Link.
2. **Alte Faltkarten aussortieren** – der alte QR-Code zeigt ins Leere.
3. **Fünf Kennungen nachtragen** – Einarsson 2027, Genussroute 6850,
   Sing mit!, Ulli Troy (zwei Abende). Beim Ticketdienst antworten sie unter
   der bisherigen Kennung nicht; ohne sie fehlen fünf Abende im Programm.
4. **Weiterleitungen einrichten**, sobald die Domain umzieht: `/event/…`,
   `/das-konzept/`, `/comedynacht/` und die drei Subdomains sollten auf die
   passenden neuen Seiten zeigen, damit alte Links und Suchergebnisse nicht
   ins Leere laufen.
5. **Preise vom Ticketdienst** – sie stehen heute in unserer eigenen Liste.
   Wenn der Dienst sie herausgibt, kommen auch sie aus einer Quelle.
