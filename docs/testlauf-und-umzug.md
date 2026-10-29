# Testlauf und Domainumzug · die Reihenfolge

Für alle, die daran arbeiten: Haus, Programmierer, und wer die Domain
verwaltet. Stand 29. Oktober 2026.

Dieses Blatt ersetzt kein Fachwissen, aber es nimmt jede Entscheidung vorweg,
die sonst mitten im Umzug getroffen werden müsste. Es ist so gebaut, dass man
es von oben nach unten abarbeitet.

---

## Der Gedanke dahinter

Die neue Seite ist fertig. Sie unter `wirtschaft-dornbirn.at` zu stellen, ist
technisch eine Sache von Minuten – aber es ist der eine Schritt, bei dem alles
auf einmal umspringt: die Seite, die Mails, die Links in gedruckten Karten,
die Suchmaschinen. Wer das in einem Zug macht, merkt Fehler erst, wenn Gäste
sie melden.

Darum machen wir es in **vier Stufen**, und erst die letzte ist unumkehrbar:

| Stufe | Was passiert | Was Gäste merken |
| --- | --- | --- |
| 1 | Mails in Ordnung bringen | nichts – außer dass Bestätigungen wieder ankommen |
| 2 | Testseite unter `neu.wirtschaft-dornbirn.at` | nichts, die alte Seite läuft weiter |
| 3 | Abnahme auf der Testseite, eine Woche Zeit | nichts |
| 4 | Umschalten auf die echte Domain | die neue Seite ist da |

Stufe 1 und 2 sind **voneinander unabhängig** und können gleichzeitig laufen.
Keine der ersten drei Stufen berührt die laufende Seite.

---

## Stufe 1 · Die Mails in Ordnung bringen

**Warum zuerst:** Das ist der einzige Punkt, an dem heute wirklich etwas kaputt
ist. Bestätigungen an Gäste kommen von `jonas.gamper@aon.at`. Dieser Anbieter
sagt den Mailprogrammen ausdrücklich, Mails in seinem Namen von fremder Stelle
abzuweisen. Gmail, GMX und Outlook halten sich daran. Das lässt sich heute
beheben, lange vor dem Domainumzug.

**Was dafür nötig ist:** vier Einträge in der Domain bei Hetzner. Sie betreffen
**nur die Mails**. Die laufende Webseite merkt davon nichts.

| Typ | Name | Wert |
| --- | --- | --- |
| CNAME | `brevo1._domainkey` | `b1.wirtschaft-dornbirn-at.dkim.brevo.com` |
| CNAME | `brevo2._domainkey` | `b2.wirtschaft-dornbirn-at.dkim.brevo.com` |
| TXT | `@` | `brevo-code:12ab66d15bb7d93634c32a1a25ca728d` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

Dazu der bestehende SPF-Eintrag – **ändern, nicht danebenstellen.** Zwei
SPF-Einträge in einer Domain sind ungültig, und dann kommt gar nichts mehr an:

```
v=spf1 a mx include:spf.brevo.com ~all
```

**Vorsicht beim Mailserver.** In der Domain stehen heute Einträge für die
Postfächer bei Hetzner (`MX`, `mail.`). Die bleiben unverändert. Wer sie
versehentlich löscht, nimmt dem Haus die Post – das ist der einzige
gefährliche Griff in dieser Stufe. **Vorher die ganze Zone exportieren.**

### Reihenfolge, die nicht vertauscht werden darf

1. Die vier Einträge setzen, SPF ändern.
2. Warten, bis sie sichtbar sind:
   ```bash
   dig +short CNAME brevo1._domainkey.wirtschaft-dornbirn.at
   dig +short TXT wirtschaft-dornbirn.at
   ```
3. Bei Brevo *Domains → Authenticate* drücken und auf grün warten. Nachsehen
   geht auch von außen:
   ```bash
   curl -s -H "x-haus-token: <Hausschlüssel>" \
     https://wirtschaft-reservierung.jonas-gamper.workers.dev/api/mail/domain
   ```
   Erwartet: `"authenticated": true`.
4. **Erst jetzt** den Absender umstellen:
   ```bash
   cd server && printf '%s' "willkommen@wirtschaft-dornbirn.at" | npx wrangler@4 secret put BREVO_ABSENDER
   ```
5. Danach die Absender je Zweck (Hausentscheid vom 27.10., siehe
   `docs/mailadressen-entscheidung.md`): `ABSENDER_SERVICE` auf `service@`,
   `ABSENDER_WARTELISTE` auf `veranstaltungen@`.
6. Prüfen mit einer echten Adresse:
   ```bash
   curl -s "https://wirtschaft-reservierung.jonas-gamper.workers.dev/api/mail/pruefung?email=<eigene Adresse>"
   ```
   Erwartet: `delivered`. Dazu eine echte Reservierung auf der Seite anlegen
   und nachsehen, ob die Bestätigung im **Posteingang** liegt, nicht im Spam.

**Umgekehrt geht es schief.** Wird Schritt 4 vor Schritt 3 gemacht, verschickt
Brevo gar nichts mehr. Das ist schlechter als heute, und es fällt erst auf,
wenn ein Gast sich beschwert.

`tickets@eugen.family` und `uri@eugen.family` brauchen dasselbe noch einmal
für die Domain `eugen.family`. Das kann nur Uri veranlassen.

---

## Stufe 2 · Die Testseite unter einem echten Namen

**Das Ziel:** Die fertige Seite läuft unter `neu.wirtschaft-dornbirn.at` –
echter Name, echtes HTTPS, echte Wege. Die alte Seite unter
`wirtschaft-dornbirn.at` läuft unverändert weiter. Niemand merkt etwas, außer
wer die Testadresse kennt.

**Ein einziger Eintrag:**

| Typ | Name | Wert |
| --- | --- | --- |
| CNAME | `neu` | `wirtschaft-dornbirn.pages.dev` |

Vorher im Cloudflare-Dashboard: *Pages → wirtschaft-dornbirn → Custom domains
→ Add* für `neu.wirtschaft-dornbirn.at`. Cloudflare stellt das Zertifikat
selbst aus; es dauert Minuten.

**Warum eine Unterdomain und keine zweite Domain:** Eine fremde Domain würde
nichts beweisen, was uns interessiert. Die Mailbeglaubigung aus Stufe 1 hängt
an `wirtschaft-dornbirn.at` und gilt für Unterdomains mit. Und sie kostet
nichts.

**Warum nicht gleich die Hauptdomain:** Weil der Weg zurück dann Stunden
dauert statt Sekunden. Eine Unterdomain kann man löschen, und es ist, als wäre
sie nie da gewesen.

### Was auf der Testseite anders ist – und warum

Die Testseite ist **dieselbe Seite**, Datei für Datei. Es gibt keine zweite
Fassung, die auseinanderlaufen könnte. Unterschiedlich ist nur, womit sie
spricht:

| | Echte Seite | Testseite `neu.` |
| --- | --- | --- |
| Dienst | der echte | ein zweiter, eigener |
| Datenbank | die echte | eine eigene, leere |
| Mailversand | Brevo | **keiner** |
| Zeitpläne (Tageszettel, Berichte) | fünf | keine |
| Band am unteren Rand | keines | **„Testseite"**, immer sichtbar |

Das schaltet die Seite **von selbst** um, am Namen der Adresse. Niemand muss
daran denken, und niemand kann es versehentlich abstellen: Auf der Testseite
gibt es bewusst keinen Knopf „zurück zum Echtbetrieb". Als zweite Schranke
nimmt der echte Dienst eine Anfrage von der Testadresse gar nicht erst an.
Beides wird bei jedem Prüflauf mitgeprüft (`npm run check:testseite`).

**Was das heißt:** Auf der Testseite darf jeder alles ausprobieren.
Reservieren, bestellen, absagen, auf die Warteliste gehen. Es entsteht kein
echter Tisch, keine echte Bestellung, keine Mail an irgendwen.

**Und was es nicht heißt:** Weil kein Mailversand läuft, beweist die Testseite
**nichts über die Mails**. Das ist Stufe 1, und die läuft getrennt.

---

## Stufe 3 · Die Abnahme

Eine Woche Zeit lassen. Jeder im Haus, der später damit arbeitet, soll die
Testseite benutzt haben – am eigenen Handy, nicht über die Schulter.

**Von außen prüfen (Programmierer, zehn Minuten):**

```bash
SEITE=https://neu.wirtschaft-dornbirn.at npm run check:umzug
```

Das geht jede alte Adresse der WordPress-Seite durch, jede Hauptseite, jedes
QR-Ziel und fragt den Dienst, ob er diese Herkunft annimmt. Alles muss ✓ sein.

**Von Hand prüfen (Haus, je zehn Minuten):**

- [ ] Am **eigenen Handy** die Startseite öffnen. Liest es sich? Sitzt alles?
- [ ] Einen **Mittagstisch reservieren**. Kommt die Bestätigungsseite?
- [ ] **Takeaway bestellen** mit zwei Gerichten. Stimmt die Summe, stimmt die
      Abholzeit, kommt eine Nummer?
- [ ] Bei einem ausverkauften Abend auf die **Warteliste** gehen.
- [ ] Eine **Anfrage** über „Locations · Feste & Catering" schicken.
- [ ] Die **Wirt-Ansicht** öffnen (Testlink mit Hausschlüssel). Stehen die
      Einträge von oben da? Ankunft, Abgang, abgeholt – geht alles?
- [ ] **Termine** durchsehen: stimmen die Abende, stimmen die Ticketknöpfe,
      sind die Kulturhaus-Abende richtig gekennzeichnet?
- [ ] Die **Mittagskarte** lesen: Gerichte, Preise, Allergene.
- [ ] Am Ende: **Impressum und Datenschutz** einmal durchlesen. Stimmt alles,
      was dort über das Haus steht?

**Was gefunden wird, wird jetzt geändert, nicht nach dem Umschalten.** Dafür
ist diese Stufe da. Jede Änderung ist nach dem nächsten Veröffentlichen sofort
auf der Testseite zu sehen.

**Erst wenn jeder Haken sitzt, geht es weiter.** Es gibt keinen Termindruck:
Die alte Seite läuft, solange das dauert.

---

## Stufe 4 · Umschalten

Das ist der Schritt, der etwas ändert. Er gehört **nicht** auf einen Freitag
und nicht auf einen Tag mit Veranstaltung. Gut ist ein Vormittag Anfang der
Woche, an dem der Programmierer ein paar Stunden erreichbar ist.

### Eine Entscheidung vorweg: wohin die Domain zeigt

Cloudflare kann die Hauptdomain ohne `www` **nur** bedienen, wenn die
Verwaltung der Domain bei Cloudflare liegt. Das ist keine Schikane, das ist
eine technische Grenze des Internets: an der Wurzel einer Domain ist der
Verweis auf einen fremden Namen nicht vorgesehen, und Hetzner kann den Trick
nicht, mit dem andere Anbieter das umgehen.

Daraus folgen zwei Wege:

**Weg A – Verwaltung zu Cloudflare umziehen (empfohlen).** Die Domain bleibt,
wo sie ist, und gehört weiter dem Haus. Nur die zwei Nameserver ändern sich.
Cloudflare liest die bestehenden Einträge vorher ein, die Postfächer laufen
unverändert weiter. Danach ist `wirtschaft-dornbirn.at` ein Klick, und die
Absicherung der Wirt-Ansicht per Anmeldung wird möglich.
Dauer: ein Tag, bis es überall durch ist.

**Weg B – bei Hetzner bleiben.** Dann ist die Seite nur unter
`www.wirtschaft-dornbirn.at` erreichbar, und wer den Namen ohne `www`
eintippt, muss von Hetzner weitergeleitet werden. Das geht, ist aber eine
Dauerbaustelle und schließt die Anmeldung für die Wirt-Ansicht aus.

**Empfehlung: Weg A.** Weg B nur, wenn jemand im Haus ausdrücklich nicht
will, dass die Nameserver wechseln.

### Der Ablauf am Umschalttag

1. **Vorher sichern:** die komplette Zone bei Hetzner exportieren und die
   Datei an zwei Stellen ablegen. Das ist der Rückweg.
2. **Die drei Unterdomains losbinden – der gefährlichste Punkt am ganzen
   Umzug.** Heute sind `gutscheine.`, `lieferservice.` und
   `tischreservierung.` keine eigenständigen Einträge: sie **zeigen auf
   `www`**, und `www` zeigt auf den alten Webserver (78.47.8.180).

   In dem Moment, in dem `www` auf die neue Seite gestellt wird, folgen alle
   drei mit – und liefern nichts mehr. **Gutscheinverkauf, Lieferdienst und
   das alte Reservierungssystem stehen still, ohne dass jemand sie angefasst
   hat.** Die Seite selbst zeigt auf den Lieferdienst (die Takeaway-Brücke),
   der Fehler fiele also sofort Gästen auf.

   Darum **vor** allem anderen, als eigener Schritt an einem eigenen Tag:
   jede der drei Unterdomains von `www` lösen und direkt auf die Adresse des
   alten Servers stellen.

   | Typ | Name | Wert |
   | --- | --- | --- |
   | A | `gutscheine` | `78.47.8.180` |
   | A | `lieferservice` | `78.47.8.180` |
   | A | `tischreservierung` | `78.47.8.180` |

   Danach prüfen, dass alle drei weiter antworten – **bevor** `www` angefasst
   wird:
   ```bash
   npm run check:unterdomains
   ```
   Erst wenn das grün ist, geht es mit Schritt 3 weiter. Dieser eine Schritt
   ändert für Gäste nichts und lässt sich jederzeit zurücknehmen.
3. **Weg A:** Domain bei Cloudflare anlegen, eingelesene Einträge Zeile für
   Zeile mit dem Export vergleichen, dann die Nameserver umstellen.
4. **Seite anhängen:** *Pages → Custom domains* für `wirtschaft-dornbirn.at`
   und `www.wirtschaft-dornbirn.at`.
5. **Dienst auf die Domain einstellen** (`server/wrangler.jsonc`, beide
   Umgebungen), dann beide ausrollen:
   ```bash
   node scripts/umstellen.mjs --seite https://wirtschaft-dornbirn.at --schreiben
   npm run ci && cd server && npx wrangler@4 deploy && npx wrangler@4 deploy --env probe
   ```
   **Nach jedem Ausrollen die Zeitpläne zählen: es müssen fünf sein.** Sind es
   weniger, ist der Abgleich am Kontolimit gescheitert, und Tageszettel und
   Berichte bleiben still aus.
6. **Alte Adressen weiterleiten.** Die gedruckten Karten tragen Links der
   alten Seite. Die Regeln liegen fertig in `dist/_redirects`.
7. **Prüfen:**
   ```bash
   SEITE=https://wirtschaft-dornbirn.at npm run check:umzug
   npm run check:uebergabe
   ```
8. **Eine echte Reservierung** mit einer privaten Adresse anlegen. Kommt die
   Bestätigung im Posteingang an, ist der Umzug gelungen.
9. **Die Testseite stehen lassen.** `neu.` bleibt, bis alle zufrieden sind.
   Sie kostet nichts und ist ab jetzt der Ort, an dem Änderungen zuerst
   angesehen werden.

### Der Rückweg

Solange die alte Seite nicht abgeschaltet ist, ist der Rückweg kurz: Den
Verweis auf Cloudflare wieder auf den alten Webspace stellen. Innerhalb der
Zeit, die in den Einträgen hinterlegt ist, ist die alte Seite zurück.

**Darum wird die alte Seite erst nach zwei ruhigen Wochen abgeschaltet.** Was
dort an Platz bezahlt wird, läuft diese zwei Wochen noch mit. Das ist der
Preis des Rückwegs, und er ist ihn wert.

---

## Was die Arbeiter vom Haus brauchen

Ohne diese vier Dinge geht keine der Stufen los:

| Nr. | Was | Von wem | Wofür |
| --- | --- | --- | --- |
| 1 | Zugang zur Verwaltung der Domain bei Hetzner | Hannah | Stufen 1, 2 und 4 |
| 2 | Die drei Konten (GitHub, Cloudflare, Brevo) auf `veranstaltungen@`, mit Sarah als zweiter Person | Hannah | alles |
| 3 | Antwort von Uri zu `eugen.family` | Wolfgang | nur die Mails aus dem Kulturhaus |
| 4 | Ein Termin für Stufe 4, kein Freitag, kein Veranstaltungstag | Haus | Stufe 4 |
| 5 | Die Bestätigung, dass `gutscheine.`, `lieferservice.` und `tischreservierung.` weiter gebraucht werden | Haus | Stufe 4, Schritt 2 |

## Entscheidungen, die das Haus treffen muss

| Nr. | Frage | Empfehlung |
| --- | --- | --- |
| 1 | Weg A oder Weg B – zieht die Verwaltung der Domain zu Cloudflare? | **Weg A.** Weg B ist eine Dauerbaustelle. |
| 2 | Wann wird umgeschaltet? | Nach einer ruhigen Woche auf der Testseite. |
| 3 | Wird die Wirt-Ansicht später per Anmeldung gesichert statt per Link? | Ja, sobald Weg A steht. Sicherer und bequemer. |
| 4 | Bleibt die Tischeinteilung von Hand, oder soll die Automatik bremsen? | Die ersten zwei Wochen von Hand, dann entscheiden. |
| 5 | Wann wird die alte Seite abgeschaltet? | Zwei ruhige Wochen nach dem Umschalten. |

## Begriffe

| Begriff | Was es ist |
| --- | --- |
| **Zone / DNS** | Die Liste der Einträge einer Domain. Sie sagt dem Internet, wo die Seite liegt, wo die Post hingeht und wer in ihrem Namen Mails schicken darf. |
| **Nameserver** | Die zwei Rechner, die diese Liste ausliefern. Sie zu wechseln heißt nicht, die Domain zu verkaufen – sie gehört weiter dem Haus. |
| **Apex** | Der Name ohne alles davor, also `wirtschaft-dornbirn.at`. Technisch der heikelste Punkt, siehe Weg A und B. |
| **CNAME** | Ein Eintrag, der sagt: „dieser Name zeigt auf jenen Namen". |
| **Beglaubigung (Brevo)** | Der Nachweis, dass der Mailversand wirklich für diese Domain senden darf. Ohne ihn landen Mails im Spam. |
| **Probe-Dienst** | Dasselbe Programm ein zweites Mal, mit eigener, leerer Datenbank und ohne Mailversand. Die Testseite spricht mit ihm. |
