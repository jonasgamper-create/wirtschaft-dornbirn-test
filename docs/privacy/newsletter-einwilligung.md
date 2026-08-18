# Newsletter „Mittagskarte": Einwilligung, Speicher, Löschung

Stand 18.08.2026. Dieses Dokument beschreibt die Verarbeitung der
Newsletter-Einwilligung. Sie ist **getrennt** von der Tischreservierung
dokumentiert, weil es zwei verschiedene Verarbeitungen mit zwei verschiedenen
Rechtsgrundlagen sind. Für die Reservierung gilt Abschnitt 8.

Verantwortlicher: „wirtschaft" cafe restaurant bar Wolfgang Preuß e.U.,
Bahnhofstraße 24, 6850 Dornbirn, +43 (0)5572 20 540,
willkommen@wirtschaft-dornbirn.at

## 1. Zweck und Rechtsgrundlage

| | |
| --- | --- |
| Zweck | Versand der Mittagskarte per E-Mail |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. a DSGVO – Einwilligung |
| Nebenbestimmung | § 174 TKG 2021 (elektronische Post zu Direktwerbung) |
| Betroffene | Gäste, die sich selbst eintragen |
| Freiwilligkeit | vollständig. Die Anmeldung ist **keine** Bedingung für eine Reservierung (Kopplungsverbot, Art. 7 Abs. 4 DSGVO) |

## 2. Getrennte Speicherung

Die Einwilligung liegt in einer **eigenen Tabelle** `newsletter` im
Reservierungsdienst, nicht im Datensatz der Reservierung
(`server/src/index.js`, `server/src/newsletter.mjs`).

Der Grund ist rechtlich, nicht technisch: Wer beides in einem Datensatz führt,
kann eine Einwilligung nicht widerrufen, ohne die Vertragsdaten anzufassen, und
kann bei einer Auskunft nach Art. 15 DSGVO nicht sauber trennen, was zu welchem
Zweck gespeichert ist. Getrennt heißt: getrennt auskunftsfähig, getrennt
löschbar.

Auch der Weg ist getrennt: Die Anmeldung geht als eigener Aufruf an
`POST /api/newsletter` und nicht als Feld der Reservierung. Schlägt sie fehl,
bleibt die Reservierung unberührt – und umgekehrt.

## 3. Gespeicherte Felder

| Feld | Inhalt | Wozu |
| --- | --- | --- |
| `email` | die Adresse | Versand |
| `status` | `offen` oder `bestaetigt` | ohne Bestätigung kein Versand |
| `quelle` | `reservierung` oder `seite` | Nachweis, wo eingetragen wurde |
| `wortlaut` | der Einwilligungstext im Volltext | Nachweis nach Art. 7 Abs. 1 DSGVO |
| `wortlautVersion` | Datum der Textfassung | Nachweis bei späteren Änderungen |
| `angefragtAm` | Zeitpunkt der Eintragung | Nachweis und Verfallsfrist |
| `bestaetigtAm` | Zeitpunkt des Bestätigungsklicks | Nachweis der Einwilligung |
| `token` | Zufallswert für Bestätigungs- und Abmeldelink | Zuordnung ohne Login |

Nicht gespeichert: Name, IP-Adresse, Öffnungs- oder Klickverhalten,
Geräteangaben, Zuordnung zu einer Reservierung.

Der aktuelle Wortlaut steht als Konstante `WORTLAUT` in
`server/src/newsletter.mjs` und lautet:

> Ich möchte die Mittagskarte der Wirtschaft Dornbirn per E-Mail erhalten.
> Die Einwilligung kann ich jederzeit über den Abmeldelink in jeder Mail
> widerrufen.

## 4. Double-Opt-In

1. Der Gast trägt seine Adresse ein. Status `offen`. **Das ist noch keine
   Einwilligung.**
2. Er bekommt eine Mail mit genau einer Frage und einem Link. Diese Mail
   enthält keine Werbung.
3. Der Link führt auf eine Seite mit einem Knopf. Erst das Abschicken setzt
   `status: bestaetigt` und `bestaetigtAm`.

Der Knopf ist kein Umweg: Mailprogramme und Virenscanner rufen Links
automatisch im Hintergrund auf. Würde der bloße Aufruf die Einwilligung setzen,
wäre sie eine Einwilligung, die niemand gegeben hat. Aus demselben Grund liegt
auch die Absage einer Reservierung hinter einem Knopf und nicht hinter dem
Linkaufruf.

Bleibt die Bestätigung aus, wird der Eintrag **nach 30 Tagen automatisch
gelöscht** (`OFFEN_TAGE`, ausgeführt vom täglichen Alarm des Dienstes). Ohne
Klick bleibt nichts liegen.

## 5. Widerruf und Löschung

Jede Mail enthält einen Abmeldelink. Der Widerruf löscht den Eintrag
vollständig; er wird nicht auf „inaktiv" gesetzt.

Zurück bleibt ausschließlich ein **SHA-256-Fingerabdruck** der Adresse in der
Tabelle `sperrliste`, mit Zeitpunkt. Er verhindert, dass dieselbe Adresse durch
einen späteren Import oder eine fremde Eintragung wieder angeschrieben wird.
Aus dem Fingerabdruck lässt sich die Adresse nicht zurückrechnen; er ist
Schutz, kein Vorrat. Wer auch diesen Eintrag gelöscht haben möchte, kann das
formlos verlangen – dann entfällt allerdings der Schutz vor Wiedereintragung.

Der Widerruf wirkt nur für die Zukunft und lässt die Rechtmäßigkeit des
bisherigen Versands unberührt (Art. 7 Abs. 3 DSGVO).

## 6. Empfänger und Ort der Verarbeitung

| Empfänger | Rolle | Ort | Was er sieht |
| --- | --- | --- | --- |
| Cloudflare Germany GmbH | Auftragsverarbeiter (Speicher) | EU (Durable Object mit Rechtsraum `eu`) | die gespeicherten Felder |
| Brevo (Sendinblue GmbH / SAS) | Auftragsverarbeiter (Versand) | EU | Adresse, Betreff, Inhalt der Mail |

**Vor der Produktivschaltung schriftlich abzulegen** – die Latte ist dieselbe
wie bei Resmio und Ticketist in `docs/integrations/bookings.md`:

- Auftragsverarbeitungsvertrag mit Brevo nach Art. 28 DSGVO
- Liste der Subprozessoren und etwaiger Drittlandtransfers
- Speicherort und Löschfristen bei Brevo (Kontaktlisten, Logs, Bounces)
- technische und organisatorische Maßnahmen
- Prozess für Auskunft, Berichtigung, Löschung, Datenübertragbarkeit

Solange das nicht vorliegt, bleibt der Versand aus. Ohne die Secrets
`BREVO_KEY` und `BREVO_ABSENDER` versendet der Dienst nichts und verhält sich
wie bisher.

## 7. Der Schlüssel

Der Brevo-API-Schlüssel ist ein Geheimnis des Betreibers. Er wird ausschließlich
als Worker-Secret gesetzt:

```bash
npx wrangler secret put BREVO_KEY
```

Er steht nie im Repository, nie in `dist/`, nie in einer Konfigurationsdatei und
nie in einem Prompt. Der Browser des Gastes sieht ihn nie – der Versand läuft
allein im Worker. Die Gästeseite bindet kein Brevo-Skript ein; `connect-src`
bleibt bei `self` plus dem eigenen Dienst.

## 8. Zur Abgrenzung: Reservierungsdaten

Nicht Gegenstand dieses Dokuments, hier nur zur Trennung:

| | |
| --- | --- |
| Zweck | Tischreservierung für den Mittag |
| Rechtsgrundlage | Art. 6 Abs. 1 lit. b DSGVO |
| Daten | Name, Datum, Uhrzeit, Personenzahl sowie **eine** Erreichbarkeit: E-Mail oder Telefon |
| Warum die Erreichbarkeit | Bestätigung und – der eigentliche Grund – Absage, wenn das Haus kurzfristig nicht kocht |
| Aufbewahrung | 30 Tage nach dem Reservierungsdatum, automatisch gelöscht |
| Werbung | keine. Aus diesen Daten wird nichts an den Newsletter übergeben |

Die Erreichbarkeit ist Pflicht, weil eine Absage sonst niemanden erreicht. Sie
ist es nicht, um eine Adresse zu gewinnen: Eine Telefonnummer genügt, und dann
ist keine Mailadresse gespeichert.
