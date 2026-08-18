# Kritischer Durchgang und A/B-Plan: Reservierungsstrecke

Stand 18.08.2026. Blickwinkel: Conversion, Webdesign, Gastro-Betrieb.
Fünf Versuche, jeder mit Hypothese und Verdikt. Vier sind umgesetzt, einer ist
bewusst abgelehnt – ein Test, der nur Varianten produziert, aber keine
Entscheidung, wäre Beschäftigungstherapie.

## Vorab: Was ehrliches A/B-Testen hier bedeutet

Die Seite ist bewusst trackerfrei – kein Analytics, kein Cookie, nichts im
Browser-Speicher. Ein klassisches A/B-Werkzeug fällt damit aus, und das ist
richtig so. Wenn später wirklich gemessen werden soll: Der Worker kann je
Variante eine nackte Zählung führen (Variante A: n Buchungen, B: m), ohne
irgendeinen Personenbezug. Bis dahin gilt: Entscheidungen nach gesicherter
Konversionspraxis treffen und die Begründung festhalten – das steht unten.

## Versuch 1 · Reihenfolge der Felder

**Befund:** Das Formular fragte zuerst Name und Erreichbarkeit, dann Tag,
Uhrzeit, Personen. Das ist die falsche Investitionsreihenfolge: Der Gast soll
erst die billigen, unverbindlichen Angaben machen (wann, wie viele) und die
persönlichen erst, wenn die Entscheidung innerlich gefallen ist. Wer als
Erstes nach dem Namen gefragt wird, ist noch nicht so weit.

**Hypothese:** Logistik zuerst senkt Abbrüche im oberen Formulardrittel.
**Verdikt: umgesetzt.** Reihenfolge jetzt Tag → Uhrzeit → Personen → Name →
Erreichbarkeit → Knopf. Das ist zugleich die Lesereihenfolge der Überschrift
(„Für welchen Tag möchtest du reservieren?") – die Frage der Seite und das
erste Feld sagen jetzt dasselbe.

## Versuch 2 · Vertrauenszeile am Knopf

**Befund:** Unter dem Knopf stand ein Absatz über Erreichbarkeit und
Absagefälle – Verwaltungsprosa an der Stelle mit der höchsten Aufmerksamkeit.
Der eigentliche USP der Strecke kam nicht vor: Die Zusage kommt **sofort**,
mit Tischnummer, ohne Anruf, ohne Konto. Kein Reservierungssystem der
Konkurrenz sagt das an dieser Stelle.

**Hypothese:** Eine Nutzenzeile statt Verwaltungsprosa hebt die Abschlussrate.
**Verdikt: umgesetzt.** Jetzt: „Sofort fix: Du bekommst die Zusage direkt
hier – ohne Anruf, ohne Konto. Absagen geht jederzeit über den Link in der
Bestätigung." Die Datenerklärung steht weiter dort, wo die Felder sind.

## Versuch 3 · Erreichbarkeit als Entweder-oder-Wahl

**Idee:** Statt zwei sichtbarer Felder (E-Mail, Telefon) eine Chip-Wahl
(„Wie erreichen wir dich? [E-Mail] [Telefon]"), die nur ein Feld einblendet.
Das Formular wirkte kürzer.

**Verdikt: abgelehnt.** Zwei kurze, sichtbare Felder mit der Zeile „eines
genügt" sind ehrlicher und schneller als ein Umschalter: Die Wahl kostet einen
zusätzlichen Tipp, versteckt die Alternative, und wer beides dalassen will
(nicht wenige Stammgäste), müsste umschalten. Verstecken ist keine Kürzung.
Das Feld bleibt, wie es ist.

## Versuch 4 · Mittagskarten-Anmeldung: vor oder nach dem Abschluss

**Befund:** Das Häkchen zur Mittagskarte stand mitten im Formular – ein
fremdes Anliegen zwischen Gast und Tisch, genau dort, wo jede zusätzliche
Zeile Abbruch kostet. Und psychologisch falsch herum: Vor dem Abschluss ist
ein Newsletter eine Zumutung, nach dem Erfolg eine Zugabe.

**Hypothese:** Nach der Zusage angeboten, wird öfter angekreuzt und seltener
abgebrochen.
**Verdikt: umgesetzt.** Das Häkchen sitzt jetzt in der Bestätigungsbox und
erscheint nur, wenn eine Mailadresse angegeben wurde. Das Ankreuzen löst die
Anfrage aus; die Einwilligung entsteht unverändert erst mit dem Klick in der
Double-Opt-In-Mail. Rechtlich ändert sich nichts, nur der Moment ist besser.

## Versuch 5 · Tage anbieten, die es gar nicht gibt

**Befund:** Der gastro-kritischste Punkt. Die Statuszeile sagt „Am Wochenende
kein Mittagstisch", das Datumsfeld nahm trotzdem jeden Samstag an – und der
Dienst hätte ihn **bestätigt**, samt Tischnummer und Kalendereintrag. Ein Gast
steht dann am Samstag vor verschlossener Tür. Das ist kein Conversion-Thema,
das ist ein Betriebsrisiko.

**Verdikt: umgesetzt, doppelt.** Die Seite fängt das Wochenende beim Wählen ab
(mit Hinweis auf die Abend-Events – die Absage verkauft gleich den zweiten
Weg), und der Dienst lehnt Wochenend-Anfragen jetzt selbst ab
(`grund: wochenende`): Die Seite ist nicht die Grenze, der Dienst ist es.
Interne Einträge des Hauses laufen nicht durch diese Prüfung – Feste am
Wochenende bleiben möglich. Heute-als-Minimum und Sommerpausen-Sperre
(`pause.reopen`) waren bereits vorhanden.

## Was gut ist und so bleibt

- Belegte Zeiten ausgrauen statt verstecken – ehrlich und üblich.
- Die Bestätigungsbox als vollständiger Beleg samt Kalenderdatei.
- Telefonnummer als Ausweg an jeder Sackgasse (voll, >10 Personen, Netzfehler).
- Kein Konto, kein Login, keine Zahlungsdaten – der kürzeste Weg der Branche.

## Offen (bewusst nicht jetzt)

- Variantenzählung im Worker, wenn echtes A/B gewünscht ist.
- Tageskontingent je Datum (steht in `docs/integrations/brevo-mail-und-kontingent.md`).
- Der Event-Funnel der Startseite ist Conversion-Priorität 1 und ein eigener
  Durchgang – hier ging es um die Tischstrecke.
