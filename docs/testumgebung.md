# Die Testumgebung: dieselbe Seite, anderer Dienst

Eingerichtet am 17. September 2026. Zweck: der Kunde soll alles durchklicken
dürfen – reservieren, bestellen, absagen – ohne dass ein echter Tisch belegt
wird oder jemand Post bekommt.

## Der Link zum Herzeigen

```
https://jonasgamper-create.github.io/wirtschaft-dornbirn-test/index.html?probe=1
```

Das `?probe=1` genügt einmal. Danach bleibt der Probemodus in diesem Tab
erhalten, auch beim Weiterklicken auf Reservierung, Takeaway oder Events. Unten
steht ein weinrotes Band mit dem Satz, worin man sich gerade bewegt, und einem
Knopf „Zurück zum Echtbetrieb".

Ein **neuer Tab** fängt wieder im Echtbetrieb an. Das ist Absicht: der Merker
liegt in `sessionStorage`, nicht in `localStorage`. Ein Probemodus, der Monate
später noch im Browser des Wirts steckt und echte Bestellungen verschwinden
lässt, wäre schlimmer als gar keiner.

## Was anders ist

| | Echtbetrieb | Probe |
|---|---|---|
| Dienst | `wirtschaft-reservierung` | `wirtschaft-reservierung-probe` |
| Datenbank | die echte | eine eigene, leere |
| Mailversand | Brevo | **keiner** (kein Schlüssel hinterlegt) |
| Zeitpläne | fünf (Wochenkarte, Erinnerungen, Berichte) | **keine** |
| Brücke ins Altsystem | Takeaway-Weiterleitung | keine |

Die Seite selbst ist dieselbe Datei – es gibt keine zweite Fassung, die
auseinanderlaufen könnte. Unterschiedlich ist nur, welche Adresse aus
`site/data/haus.json` gelesen wird: `probe` statt `api`.

## Warum keine Zeitpläne

Die Cloudflare-Gratisstufe erlaubt **fünf Cron-Trigger je Konto**, und die fünf
des echten Dienstes sind vergeben. Deshalb steht in der Probe-Umgebung
ausdrücklich `"triggers": { "crons": [] }`. Ohne diese Zeile erbt sie die fünf
von oben, und der Befehl endet mit „only partially updated" – der Dienst steht
dann zwar, aber der Abgleich ist fehlgeschlagen. Genau das ist beim ersten
Versuch passiert; der echte Dienst blieb dabei unberührt.

Fürs Vorführen fehlt dadurch nichts: Wochenkarten-Versand, Tischerinnerungen
und Wochenbericht sind nichts, was man herzeigt.

## Warum keine Mails

Der Code kann das seit jeher: fehlen `BREVO_KEY` und `BREVO_ABSENDER`, wird
schlicht nichts versendet, und alles andere läuft unverändert weiter. In der
Probe sind sie deshalb bewusst nicht gesetzt. Wer im Probemodus reserviert,
sieht die Bestätigung auf der Seite – aber niemand bekommt E-Mail.

## Den Dienst neu veröffentlichen

```bash
cd server && npx wrangler@4 deploy --env probe
```

Der Hausschlüssel ist derselbe wie im Echtbetrieb, damit die bestehenden Links
zur Wirt-Ansicht auch in der Probe funktionieren:

```bash
cd server && printf '%s' "$(cat .haus-token)" | npx wrangler@4 secret put HAUS_TOKEN --env probe
```

## Den Stand der Probe auffüllen

Frisch aufgesetzt ist die Probe leer. Damit sie beim Vorführen nicht nackt
aussieht, wurden am 17.09. aus dem Echtbetrieb übernommen:

- der **Tischplan** des Hauses (`POST /api/plan`), sonst stünde dort der
  Beispielgrundriss,
- der **Menüplan** der Woche (`POST /api/menueplan`), sonst hätte das Takeaway
  keine Gerichte.

Die **Termine** holt sich der Dienst selbst beim Ticketdienst. Er tut das
schonend – höchstens sechs je Anfrage im Hintergrund –, deshalb füllt sich die
Liste über die ersten Aufrufe hinweg und steht erst nach ein paar Minuten
vollständig da.

## Was das kostet

Nichts. Zweiter Worker auf derselben Gratisstufe, GitHub Pages unverändert.

## Was es nicht ist

Kein Zugangsschutz. Wer den Link hat, kommt hinein – in die Probe wie in die
Testseite selbst. Dagegen hilft erst Cloudflare Access, und das setzt voraus,
dass die Domain bei Cloudflare liegt (siehe
[abschaltung-alte-seiten.md](abschaltung-alte-seiten.md)).
