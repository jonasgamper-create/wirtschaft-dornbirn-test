# Übersicht: Brevo, Zusage und Storno, Tischkontingent

Stand 18.08.2026. Diese Übersicht beschreibt, was heute schon steht, was Brevo
dazu bringen würde, und welche Entscheidungen vorher zu treffen sind. Sie ist
eine Entscheidungsgrundlage, kein Umsetzungsauftrag. Es ist noch nichts gebaut,
kein Konto angelegt und kein Schlüssel hinterlegt.

## 1. Was heute steht

| Baustein | Zustand |
| --- | --- |
| Reservierung | `site/tischreservierung-buchung.js` → Worker `POST /api/reservierung` |
| Gespeicherte Gastdaten | **nur der Name**, ausdrücklich keine Mailadresse, keine Telefonnummer |
| Bestätigung an den Gast | Kalendereintrag (.ics) im Browser erzeugt, `METHOD:PUBLISH`, UID zufällig im Browser |
| Zustand | Durable Object, Rechtsraum EU, Aufbewahrung 30 Tage (`AUFBEWAHRUNG_TAGE`) |
| Kontingent | Tische je Etage mit Sitzzahl, Tagesdeckel, gesperrte Tische, Automatik an/aus |
| Gastgeber | `site/gastgeber.html` mit `/api/plan`, `/api/aktion`, `/api/stand` |
| Ausgehende Mail | **keine** – es gibt heute keinen Mailversand im Projekt |

Der Punkt, der alles Weitere bestimmt: Die Seite verspricht dem Gast heute
wörtlich, dass ausser dem Namen nichts gespeichert wird. Jede Mail an den Gast
setzt eine Mailadresse voraus. Das ist kein technisches, sondern ein
Versprechens-Thema und gehört vor die Umsetzung.

## 2. Wo Brevo sitzt

Brevo ist ausschliesslich Transaktionsversender, aufgerufen vom Worker, nie vom
Browser des Gastes.

```
Gast → Gästeseite → Worker (Durable Object, EU)
                       │
                       ├── Brevo API  → Mail an den Gast (mit .ics im Anhang)
                       └── Brevo API  → Mail an Wolfgang (Tagesübersicht, Storno-Beleg)
```

Daraus folgt hart:

- Der API-Schlüssel ist ein Worker-Secret (`wrangler secret put BREVO_KEY`).
  Nie im Repo, nie in `dist/`, nie in einem Prompt.
- Die Gästeseite bindet **kein** Brevo-Skript ein. `connect-src` in der CSP
  bleibt unverändert bei `self` plus dem eigenen Dienst.
- Brevo sieht Mailadresse, Name, Datum, Uhrzeit, Personenzahl. Das ist eine
  Auftragsverarbeitung: AVV, Subprozessoren, Serverstandort und Löschfristen
  müssen vor Produktivschaltung schriftlich vorliegen – gleiche Latte wie bei
  Resmio und Ticketist in `docs/integrations/bookings.md`.
- Kosten und Kontingente sind Anbieterangaben und vor Vertrag zu prüfen; für den
  erwarteten Mittagsbetrieb liegt das Volumen im untersten Tarifbereich.

## 3. Zusage durch den Gast

Ziel: Die Reservierung gilt erst als fix, wenn der Gast sie bestätigt hat.

### Empfohlener Weg: zwei Links in der Mail

Die Mail enthält zwei Knöpfe, die auf den eigenen Worker zeigen:

```
GET /api/zusage/<token>   → Status: bestätigt
GET /api/absage/<token>   → Tisch wird frei, Status: storniert
```

Der Token ist zufällig, gilt nur für diese eine Reservierung, läuft mit ihr ab
und enthält selbst keine Gastdaten. Kein Login, kein Konto, ein Klick.

### Warum nicht die Kalender-Zusage selbst

Technisch möglich wäre `METHOD:REQUEST` mit `ORGANIZER` und
`ATTENDEE;RSVP=TRUE`. Die Antwort des Gastes käme dann als Mail an ein Postfach
zurück, das jemand auslesen müsste. Das Verhalten ist zwischen Apple Kalender,
Gmail und Outlook unterschiedlich, mobil oft gar nicht sichtbar, und eine nicht
angekommene Zusage sähe aus wie eine Absage. Deshalb: Kalendereintrag bleibt der
Beleg, die Zusage läuft über die Links.

### Statusmodell

`angefragt → bestätigt → storniert` sowie `abgelaufen`, wenn bis zu einer
gesetzten Frist (Vorschlag: Vortag 18 Uhr, sonst 60 Minuten vor der Zeit) keine
Zusage kommt. Ob eine abgelaufene Reservierung den Tisch automatisch freigibt,
entscheidet Wolfgang – technisch ist beides gleich teuer.

## 4. Storno durch Wolfgang

Fall: Am Morgen steht fest, dass heute mittags nicht gekocht wird.

1. Ein Knopf im Gastgeber-Cockpit: „Mittag heute absagen", mit kurzem
   Freitextgrund und Rückfrage vor dem Auslösen.
2. Worker: neuer Befehl über `/api/aktion` (dort liegen die Hausaktionen
   bereits), setzt alle Reservierungen des Tages auf `storniert`.
3. Je Reservierung mit Mailadresse: eine Brevo-Mail mit klarem Betreff, Grund,
   Telefonnummer und Ersatzangebot.
4. Anhang: dieselbe Termin-UID, `SEQUENCE` um eins erhöht, `METHOD:CANCEL`,
   `STATUS:CANCELLED`. Damit verschwindet der Eintrag im Kalender des Gastes
   von selbst.
5. Reservierungen ohne Mailadresse landen in einer Anrufliste – sie sind der
   Grund, warum die Mailadresse zwar freiwillig, aber empfohlen sein sollte.

Dafür ist eine Änderung am heutigen Stand nötig: **die Termin-UID muss vom
Worker vergeben und gespeichert werden.** Heute würfelt sie der Browser, und
ohne dieselbe UID lässt sich ein Termin später nicht zurückziehen. Das ist die
einzige Änderung an bestehendem Code, die nicht warten kann.

## 5. Tischkontingent statt Grundriss

Für den Gast gibt es weiterhin keine Tischansicht. Er wählt Tag, Zeit und
Personenzahl; belegte Zeiten sind ausgegraut. Das ist bereits so gebaut.

Dahinter arbeitet das Haus mit Anzahlen je Etage und Grösse:

```
Gaststube:  4 × Zweier · 2 × Dreier · 3 × Vierer
Saal:       2 × Zweier · 4 × Vierer · 1 × Sechser
```

Das Datenmodell trägt das schon: Etagen mit Tischen, jeder Tisch mit Sitzzahl,
im Cockpit als Anzahl je Grösse ergänzbar und abziehbar. Der gezeichnete
Grundriss ist reine Gastgeberansicht und für den Kontingentbetrieb nicht nötig;
Positionen dürfen leer bleiben. Ebenfalls vorhanden: Tagesdeckel, einzelne
gesperrte Tische, Automatik aus für Tage, die Wolfgang von Hand einteilt.

Was fehlt, wenn das Kontingent wirklich täglich variieren soll: heute gilt eine
Konfiguration für alle Tage. Ein **Tageskontingent**, das den Standard für ein
Datum überschreibt („heute Saal zu, nur Gaststube"), wäre der zweite Baustein.
Ohne ihn bleibt als Werkzeug für den einzelnen Tag nur Deckel, Sperre und
Automatik-aus.

## 6. Zu bauende Teile

| Teil | Ort | Umfang |
| --- | --- | --- |
| UID serverseitig vergeben und speichern | `server/src/index.js` | klein |
| Mailfeld, freiwillig, mit klarem Zwecktext | `site/tischreservierung.html` | klein |
| Brevo-Versand mit .ics-Anhang | neuer Worker-Baustein | mittel |
| Zusage- und Absagelinks mit Token | Worker | mittel |
| Status im Cockpit sichtbar | `site/gastgeber.js` | klein |
| Tagesstorno mit Grund | Cockpit + `/api/aktion` | mittel |
| Tageskontingent je Datum | Cockpit + Zuweisung | mittel bis gross |
| Prüfung `check:mail` in `npm run ci` | `scripts/` | klein |

## 7. Zu entscheiden

1. Mailadresse: freiwillig oder Pflicht? Empfehlung freiwillig, mit dem Satz,
   wofür sie gebraucht wird – sonst fällt das heutige Datenschutzversprechen.
2. Gilt eine Reservierung ohne Zusage weiter, oder verfällt sie?
3. Frist für die Zusage.
4. Absenderadresse und Antwortadresse, plus SPF-, DKIM- und DMARC-Einträge in
   der Domain – ohne sie landet die Bestätigung im Spam.
5. Brevo-AVV, Subprozessoren, Serverstandort, Löschfrist.
6. Soll das Kontingent tagesweise variieren? Davon hängt Punkt 7 der Bauliste ab.

## 8. Ausdrücklich nicht Teil davon

Newsletter, Werbestrecken, Öffnungs- und Klicktracking, Zahlungen,
Gästekonten, Kartendaten, ein zweiter Kalender neben dem Kalender des Gastes.
Die Mittagskarten-Mail (`npm run lunch:mail`) bleibt ein getrennter Vorgang und
wird nicht automatisch versendet.
