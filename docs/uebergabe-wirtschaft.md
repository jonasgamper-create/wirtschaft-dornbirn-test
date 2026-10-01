# Übergabe der Webseite an die „wirtschaft“

Stand 1. Oktober 2026. Für Hannah, Wolfgang und den Programmierer, der die
Seite betreut. Dieses Dokument erklärt in einfacher Sprache, wie die
„wirtschaft“ die Webseite, den Reservierungsdienst und alle Konten
übernimmt, wie die Seite auf **https://wirtschaft-dornbirn.at** umzieht –
und warum dabei nichts kaputtgehen kann.

---

## 1. Auf einen Blick

| | |
|---|---|
| **Ziel** | Die neue Seite steht unter `wirtschaft-dornbirn.at`. Alle Konten gehören der „wirtschaft“. Jonas hat danach keinen Zugang mehr. |
| **Wer übernimmt** | **Hannah** als Verantwortliche und Inhaberin der Konten; ein **Programmierer** für die technischen Schritte; **Wolfgang** entscheidet und nimmt ab |
| **Dauer** | rund zwei Wochen, davon zwei bis vier Stunden echte Arbeit; der Rest ist Warten und Beobachten |
| **Kosten** | 0 € laufend (Gratisstufen von GitHub, Cloudflare, Brevo); die Domain läuft wie bisher |
| **KI nötig?** | Nein. Ein Browser reicht. Abschnitt 7 erklärt, wie ihr ohne KI Änderungen macht |
| **Grundsatz** | **Nichts wird überschrieben, bevor das Neue geprüft ist. Jeder Schritt hat einen Rückweg.** |

**Warum ihr keine Angst haben müsst.** Die alte WordPress-Seite wird nicht
gelöscht und nicht verändert. Sie bleibt auf dem Server bei Hetzner. Beim
Umzug ändert sich nur, **wohin der Name `wirtschaft-dornbirn.at` zeigt**.
Zeigt er auf die neue Seite und etwas stimmt nicht, zeigt er mit einem
Klick wieder auf die alte. Das dauert fünf Minuten. Vorher gibt es eine
Generalprobe unter `neu.wirtschaft-dornbirn.at`, bei der die echte Domain
unberührt bleibt.

---

## 2. Was es gibt – die Bausteine

| Baustein | Was es ist | Wo es heute liegt | Wem es nach der Übergabe gehört |
|---|---|---|---|
| **Gästeseite** | Startseite, Termine & Tickets, Mittagstisch, Takeaway, Locations, Agentur, Impressum, Datenschutz | Cloudflare Pages (`wirtschaft-dornbirn.pages.dev`) | Cloudflare-Konto der „wirtschaft“, unter `wirtschaft-dornbirn.at` |
| **Reservierungsdienst** | nimmt Reservierungen, Bestellungen, Wartelisten, Anfragen an; schickt Mails; holt neue Abende | Cloudflare Worker im Konto von Jonas | Cloudflare-Konto der „wirtschaft“ |
| **Wirt-Ansicht** | das Werkzeug fürs Haus (heute · karte · warteliste · haus) | Teil der Gästeseite, geschützt durch den Hausschlüssel | mit der Gästeseite |
| **Quellcode** | alles oben, dazu die Anleitungen | GitHub, Konto von Jonas | GitHub-Konto der „wirtschaft“ |
| **Mails** | Bestätigungen, Tageszettel, Anfragen | Brevo, Konto von Jonas | Brevo-Konto der „wirtschaft“ |
| **Domain, Mailpostfächer, WordPress** | `wirtschaft-dornbirn.at`, `willkommen@…`, alte Seite, Gutscheine, Lieferservice | Hetzner, Konto der „wirtschaft“ | bleibt, wie es ist |
| **Tickets** | alle Abende | ticketist.io | bleibt, wie es ist |

---

## 3. Die Konten – wer was anlegt

Alle neuen Konten legt **Hannah** an, mit einer Adresse des Hauses, nicht
mit einer privaten. Vorschlag: `web@wirtschaft-dornbirn.at` als eigenes
Postfach oder Weiterleitung bei Hetzner. So hängt nichts an einer Person.

| Konto | Anlegen | Mit welcher Adresse | Was der Programmierer bekommt | Kosten |
|---|---|---|---|---|
| **GitHub** (Quellcode) | github.com → Sign up, danach eine **Organisation** „wirtschaft-dornbirn“ (Free) | web@ | Mitglied der Organisation mit Rolle *Owner* | 0 € |
| **Cloudflare** (Seite, Dienst, später DNS) | dash.cloudflare.com → Sign up | web@ | *Members → Invite*, Rolle *Administrator* | 0 € |
| **Brevo** (Mails) | brevo.com → Sign up (Free) | web@ | Zugang als Benutzer oder den API-Schlüssel | 0 € (300 Mails am Tag) |
| **Hetzner** (Domain, Postfächer, WordPress) | besteht schon | – | Zugang zur **DNS-Verwaltung** (konsoleH / DNS Console) | wie bisher |
| **ticketist.io** | besteht schon | – | nichts | wie bisher |

**Für jedes Konto, ohne Ausnahme:**

- **Zwei-Faktor-Anmeldung** einschalten (Code-App am Handy, z. B. Google
  Authenticator oder 1Password). Die Wiederherstellungscodes ausdrucken und
  im Büro ablegen.
- Passwörter in einem **Passwortmanager** des Hauses, nicht im Kopf einer
  Person.
- Mindestens **zwei Personen** mit vollem Zugang (Hannah und Wolfgang oder
  der Programmierer). Fällt einer aus, ist das Haus nicht ausgesperrt.

**Was Jonas überträgt – und wie**

| Was | Wie | Ergebnis |
|---|---|---|
| Quellcode mit Verlauf | GitHub → Repository → Settings → *Transfer ownership* an die Organisation | Repository gehört der „wirtschaft“, Verlauf und Anleitungen bleiben |
| Reservierungsdienst | lässt sich zwischen Cloudflare-Konten nicht verschieben; der Programmierer rollt ihn im neuen Konto **neu** aus | gleicher Code, neues Konto |
| Alle Daten (Reservierungen, Bestellungen, Wochenkarte, Wartelisten, Newsletter, Anfragen) | Jonas zieht eine **Sicherung** aus dem alten Dienst, der Programmierer spielt sie in den neuen ein | nichts geht verloren; die Datei wird danach gelöscht |
| Geheimnisse (Hausschlüssel, Brevo-Schlüssel, Push-Schlüssel) | werden **nicht übertragen, sondern neu erzeugt** | Jonas' alte Schlüssel sind wertlos |

---

## 4. Der Ablauf in sieben Etappen

Jede Etappe hat ein Häkchen, einen Verantwortlichen und – wo nötig – einen
Rückweg. Bis Etappe 6 sehen Gäste keinen Unterschied.

### Etappe 1 · Konten anlegen (Hannah, ½ Stunde)

- [ ] Haus-Adresse `web@wirtschaft-dornbirn.at` angelegt
- [ ] GitHub-Konto und Organisation „wirtschaft-dornbirn“; Programmierer eingeladen
- [ ] Cloudflare-Konto; Programmierer als Administrator eingeladen
- [ ] Brevo-Konto; Programmierer eingeladen
- [ ] Programmierer hat Zugang zur DNS-Verwaltung bei Hetzner
- [ ] überall Zwei-Faktor an, Wiederherstellungscodes abgelegt

### Etappe 2 · Quellcode übernehmen (Jonas + Programmierer, ½ Stunde)

- [ ] Jonas überträgt das Repository an die Organisation
- [ ] Programmierer klont es, `npm run ci` läuft grün
- [ ] Programmierer verbindet Cloudflare Pages mit dem Repository
  (Cloudflare → Workers & Pages → *Create* → *Pages* → *Connect to Git*;
  Build-Befehl `npm ci && npm run ci`, Ausgabeordner `dist`, Umgebungsvariable
  `NODE_VERSION = 22`). **Ab jetzt
  veröffentlicht jede freigegebene Änderung von selbst** – das ist die
  Voraussetzung für Abschnitt 7.
- [ ] Die neue Seite läuft unter `<projekt>.pages.dev` im Konto der „wirtschaft“

### Etappe 3 · Dienst und Daten übernehmen (Programmierer, 1 Stunde)

Der alte Dienst bei Jonas läuft weiter, bis Etappe 6 vorbei ist. Gäste
merken nichts.

- [ ] Neue Geheimnisse erzeugt (`bash server/schluessel.sh`, Push-Schlüsselpaar, Brevo-Schlüssel)
- [ ] Alle Adressen in einem Zug umgestellt – erst Vorschau, dann mit `--schreiben` (Befehl unten)
- [ ] Dienst ausgerollt (`npx wrangler@4 deploy`, dann `--env probe`); **fünf Zeilen `schedule:`** in der Ausgabe
- [ ] Sicherung vom alten Dienst eingespielt; Zeilenzahlen verglichen
- [ ] `npm run check:umzug` gegen die neue `pages.dev`-Adresse: grün
- [ ] Wirt-Ansicht mit neuem Schlüssel auf allen Geräten im Haus

Der Befehl zum Umstellen:

```bash
npm run umstellen -- --dienst https://wirtschaft-reservierung.<konto>.workers.dev \
  --probe https://wirtschaft-reservierung-probe.<konto>.workers.dev \
  --wirt-mail <adresse von wolfgang> --anfrage-mail willkommen@wirtschaft-dornbirn.at
# sieht gut aus? dann dasselbe mit --schreiben, danach npm run ci
```

**Rückweg:** Solange Etappe 6 nicht erfolgt ist, nutzen Gäste den alten
Dienst. Die neue Umgebung kann man jederzeit verwerfen und neu aufsetzen.

### Etappe 4 · Mails richtig absenden (Programmierer + Hannah, ½ Stunde, dann warten)

Heute kommen die Mails von einer privaten aon.at-Adresse und landen bei
Gmail oder Outlook oft im Spam. Danach kommen sie von
`willkommen@wirtschaft-dornbirn.at` und werden als echt erkannt.

- [ ] In Brevo: *Senders, Domains & Dedicated IPs → Domains → Add a domain* → `wirtschaft-dornbirn.at`
- [ ] Die **vier Einträge, die Brevo anzeigt**, bei Hetzner eintragen (zwei
  `brevo…._domainkey`-CNAME, ein `brevo-code`-TXT, ein `_dmarc`-TXT). Die
  Werte gehören zum Brevo-Konto der „wirtschaft“ – die alten in
  `mail-absender.md` gelten nicht mehr.
- [ ] Den SPF-Eintrag **ändern, nicht verdoppeln**: `v=spf1 a mx include:spf.brevo.com ~all`
- [ ] In Brevo „Authenticate“; erst danach im Dienst `BREVO_ABSENDER = willkommen@wirtschaft-dornbirn.at`
- [ ] Probemail an eine eigene Gmail-Adresse: kommt im Posteingang an

**Was das berührt:** nur neue Einträge und eine Ergänzung der SPF-Zeile.
Postfächer, WordPress und Webseite bleiben unverändert.

### Etappe 5 · Generalprobe unter neu.wirtschaft-dornbirn.at (Programmierer, ½ Stunde; Hannah und Wolfgang schauen)

Die neue Seite läuft unter einer echten Adresse eurer Domain – die alte
Seite unter `wirtschaft-dornbirn.at` bleibt dabei genau so, wie sie ist.

- [ ] Cloudflare Pages → Projekt → *Custom domains* → `neu.wirtschaft-dornbirn.at` hinzufügen (**zuerst** hier, dann DNS)
- [ ] Bei Hetzner **einen** neuen Eintrag: `neu` · CNAME · `<projekt>.pages.dev`
- [ ] `SEITE=https://neu.wirtschaft-dornbirn.at npm run check:umzug` → grün
- [ ] Hannah und Wolfgang klicken alles durch, am Handy und am Laptop:
  Startseite, Termine, eine Reservierung, eine Takeaway-Bestellung, eine
  Anfrage, Wirt-Ansicht. Testeinträge danach in der Wirt-Ansicht entfernen.
- [ ] Freigabe durch Wolfgang

**Rückweg:** den Eintrag `neu` wieder löschen. Sonst ändert sich nichts.

### Etappe 6 · Umzug der Domain (Programmierer, mit Vorlauf)

Das ist der Schritt, vor dem ihr Respekt habt – deshalb in drei Teilen,
von denen nur der letzte sichtbar ist.

**Teil A – unsichtbar absichern (spätestens zwei Tage vorher)**

Heute zeigen fast alle Unterdomains (Gutscheine, Lieferservice, Webmail,
Autodiscover, Shop …) über einen **Platzhalter-Eintrag** auf `www`. Würde
`www` umziehen, zögen sie unbemerkt mit und wären kaputt. Deshalb zuerst:

- [ ] Den Platzhalter `*` von „CNAME `www`“ auf **„A `78.47.8.180`“** ändern
- [ ] Ebenso jede einzeln eingetragene Unterdomain (Liste im Anhang)
- [ ] Gutscheine, Lieferservice und Webmail öffnen: funktionieren wie vorher
- [ ] Bei Hetzner eine **Sicherung der WordPress-Seite** anlegen (Backup in der Hetzner-Verwaltung)

Das ändert für Besucher nichts – alles zeigt weiter auf denselben Server.

**Teil B – die DNS-Verwaltung zu Cloudflare (unsichtbar, dann 1–2 Tage warten)**

Die Hauptadresse ohne `www` kann nur auf die neue Seite zeigen, wenn
Cloudflare die DNS-Verwaltung übernimmt (Vorgabe von Cloudflare). Der
Vorteil: das spätere Umschalten und Zurückschalten ist dann ein Klick.

- [ ] Cloudflare → *Add a site* → `wirtschaft-dornbirn.at` (Free). Cloudflare liest alle bestehenden Einträge ein.
- [ ] **Jeden Eintrag mit dem Anhang vergleichen.** Alles, was zu Mail und altem Server gehört, auf *DNS only* (graue Wolke) stellen.
- [ ] Beim Registrar der Domain (dort, wo die Domain bezahlt wird – meist Hetzner, siehe Rechnung) die **Nameserver** auf die zwei von Cloudflare ändern.
- [ ] 1–2 Tage beobachten: Mails kommen an, alte Seite, Gutscheine, Lieferservice gehen. Für Gäste ist nichts zu sehen.

**Rückweg:** beim Registrar die drei Hetzner-Nameserver zurücktragen.

**Teil C – Umschalten (an einem ruhigen Vormittag, nicht vor einem Event)**

- [ ] `npm run umstellen -- --seite https://wirtschaft-dornbirn.at --schreiben`, `npm run ci`, PR, freigeben; Dienst neu ausrollen (fünf `schedule:`)
- [ ] Cloudflare Pages → *Custom domains* → `wirtschaft-dornbirn.at` und `www.wirtschaft-dornbirn.at` hinzufügen. Cloudflare setzt die beiden Einträge selbst.
- [ ] `SEITE=https://wirtschaft-dornbirn.at npm run check:umzug` → grün
- [ ] Hannah: Startseite, eine Reservierung, die Wirt-Ansicht
- [ ] `npm run check:uebergabe` → alles erledigt
- [ ] QR-Codes neu erzeugt (passiert beim `npm run ci`) – **erst jetzt** neue Faltkarten drucken

**Rückweg (5 Minuten):** in Cloudflare die beiden Custom Domains entfernen
und die Einträge `@` und `www` wieder auf „A `78.47.8.180`“ setzen. Die alte
WordPress-Seite ist sofort wieder da, denn sie wurde nie angefasst.

### Etappe 7 · Abschluss (zwei bis vier Wochen später)

- [ ] Parallelphase ohne Störung: eine Wochenkarte, Tageszettel, Wochenbericht, echte Reservierungen, eine Anfrage, ein Wartelistenfall
- [ ] Wirt-Ansicht mit Anmeldung per Mail-Code absichern (Cloudflare Access, jetzt möglich, weil die DNS bei Cloudflare liegt)
- [ ] Jonas' Zugänge entfernt; alter Dienst und alte Seite in Jonas' Konto gelöscht; seine Sicherungsdateien gelöscht
- [ ] Unterschriften im Übergabeprotokoll (`uebergabe.md`)

---

## 5. Was mit der alten Seite passiert

- **WordPress bleibt auf dem Server bei Hetzner**, unverändert, nur nicht
  mehr unter `wirtschaft-dornbirn.at`. Wer sie irgendwann nicht mehr
  braucht, kündigt das Paket – nicht vorher.
- **Gutscheine** (`gutscheine.wirtschaft-dornbirn.at`) und **Lieferservice**
  (`lieferservice.wirtschaft-dornbirn.at`) laufen weiter auf dem alten
  Server. Der Dienst gibt Takeaway-Bestellungen heute noch an den
  Lieferservice weiter; das bleibt so, bis ihr das anders entscheidet.
- **Alte Links** auf Plakaten, Google oder gedruckten Karten führen auf die
  passende neue Seite. Alle 45 Adressen der alten Seite sind geprüft
  (`npm run check:umzug`).
- **Eine Entscheidung braucht es: woher kommen neue Abende?** Heute findet
  der Dienst neue Abende auf euren WordPress-Eventseiten. Nach dem Umzug
  gibt es diese Seiten unter der Domain nicht mehr. Drei Wege:
  1. **Link einfügen** (sofort möglich, 10 Sekunden je Abend): Wirt-Ansicht
     → warteliste → „Neuen Abend aufnehmen“ → Ticketist-Link einfügen.
  2. **Ticketist fragen**, ob es eine Liste aller Abende des Veranstalters
     als Schnittstelle gibt – dann wieder ganz automatisch. Empfohlen.
  3. Die WordPress-Eventseiten unter einer Unterdomain weiterpflegen – nur,
     wenn ihr WordPress ohnehin weiter nutzt.
  Der Programmierer stellt die Quelle in `server/src/ticketist.mjs`
  (`QUELLSEITEN`) entsprechend um; `npm run check:uebergabe` erinnert daran.

---

## 6. Die Testumgebung

| Was | Adresse | Wofür |
|---|---|---|
| **Probemodus** | jede Seite mit `?probe=1`, z. B. `…/?probe=1` | Reservieren, Bestellen, Anfragen ausprobieren, ohne dass etwas Echtes passiert: eigener Testdienst, keine Mails |
| **Wirt-Ansicht im Probemodus** | `…/tischplan/wirt.html?probe=1` | sehen, was die Tests ausgelöst haben |
| **Generalprobe** | `neu.wirtschaft-dornbirn.at` (ab Etappe 5) | die neue Seite unter eurer Domain, bevor die Hauptadresse umzieht |
| **Umzugsprüfung** | `npm run check:umzug` | prüft jede alte Adresse, alle Hauptseiten, QR-Codes und den Dienst |

Ein neuer Browser-Tab ist immer Echtbetrieb. Der Probemodus gilt nur in
dem Tab, in dem `?probe=1` geöffnet wurde.

---

## 7. Änderungen an der Webseite – ohne KI

Es gibt drei Wege, von leicht nach schwer. Für die ersten beiden braucht
ihr keinen Programmierer und keine KI.

### Weg 1 · Wirt-Ansicht – täglich, für alle im Haus

Hinweis ganz oben auf der Startseite („Am 24. Dezember geschlossen“),
Wochenkarte, Öffnungszeiten, Zusperren, Tag voll, eigene Termine. Alles
wirkt sofort. Ausführlich im **Handbuch fürs Haus** (`handbuch-haus.md`).

### Weg 2 · Einen Text auf der Seite ändern – im Browser, für Hannah

Für kleine Textänderungen, die nicht in der Wirt-Ansicht gehen (ein Satz
auf der Startseite, eine Überschrift bei Locations). Voraussetzung:
Etappe 2 ist erledigt.

1. github.com → Organisation → Repository → Ordner `site`.
2. Die Seite öffnen: `index.html` (Startseite), `events.html` (Termine),
   `tischreservierung.html`, `takeaway.html`, `feste-catering.html`
   (Locations), `agentur.html`, `impressum.html`.
3. Oben rechts den **Stift** („Edit this file“). Mit `Strg+F` / `Cmd+F` den
   alten Satz suchen. **Nur den Text zwischen den spitzen Klammern ändern**
   – nichts mit `<`, `>`, `class=` oder `"` anfassen.
4. „Commit changes …“ → **„Create a new branch and start a pull request“**
   wählen (nie direkt in `main`) → kurz beschreiben, was geändert wurde →
   „Propose changes“ → „Create pull request“.
5. Warten, bis unten **„All checks have passed“** (grün) steht. Das ist die
   automatische Prüfung: sie findet kaputte Seiten, bevor Gäste sie sehen.
6. „Merge pull request“ → „Confirm“. Nach zwei bis drei Minuten steht die
   Änderung auf der Seite.
7. **Rückgängig machen:** im zusammengeführten Pull Request auf „Revert“.

Wird die Prüfung rot: nicht zusammenführen, den Programmierer fragen.

### Weg 3 · Programmierer – alles andere

Neue Seiten, Bilder, Aufbau, Preise der Abende, Fehler. Jeder
Webentwickler kann das übernehmen; er braucht keine besonderen Werkzeuge
und keine KI. Alles, was er wissen muss, steht im Repository:

- `docs/betriebshandbuch.md` – wie alles zusammenhängt, wie man ausrollt
- `docs/uebergabe.md` – Übergabeprotokoll mit Abnahme und allen Fallen
- `npm run ci` vor jeder Änderung; Pull Request; grün; zusammenführen

Am besten beauftragt ihr ihn per Mail: Seite, Stelle (Screenshot), was
stattdessen dort stehen soll – ein Wunsch je Punkt.

---

## 8. Die Prüfwerkzeuge (für den Programmierer)

| Befehl | Was er prüft | Wann |
|---|---|---|
| `npm run ci` | baut alles und führt rund dreißig Prüfungen aus | vor jeder Änderung; läuft auch bei jedem Pull Request auf GitHub |
| `npm run check:umzug` (`SEITE=…`) | Hauptseiten, alle alten Adressen, QR-Ziele, Dienst nimmt die Seite an | Etappe 3, 5, 6 und nach jeder Domainänderung |
| `npm run check:live` | stehen alle Abende der Eventseiten auf der Webseite? | läuft täglich 07:30 auf GitHub, Mail bei Fehler |
| `npm run check:uebergabe` | was hängt noch an Jonas oder an Testadressen? | vor und nach jeder Etappe |
| `npm run umstellen` | stellt alle Adressen in einem Zug um (Vorschau ohne `--schreiben`) | Etappe 3 und 6 |

---

## 9. Notfallkarte – zum Ausdrucken

| Was passiert | Was tun |
|---|---|
| **Die Seite ist nach dem Umschalten weg oder falsch** | Rückweg Etappe 6 Teil C: Custom Domains entfernen, `@` und `www` auf A `78.47.8.180`. Alte Seite ist in Minuten zurück |
| **Gutscheine, Lieferservice oder Webmail gehen nicht** | Der Platzhalter `*` oder die Unterdomain zeigt nicht mehr auf `78.47.8.180` – zurückstellen |
| **Mails ans Haus kommen nicht an** | MX-Eintrag und `mail.wirtschaft-dornbirn.at` müssen auf den alten Server zeigen und *DNS only* sein |
| **Gäste bekommen keine Bestätigung** | Spam-Ordner; Brevo-Domain beglaubigt? Die Reservierung gilt trotzdem und steht in der Wirt-Ansicht |
| **Online-Reservierung geht nicht** | Gäste telefonisch annehmen, in der Wirt-Ansicht „+ reservierung eintragen“; Programmierer: `curl <dienst>/api/gesundheit` |
| **Wirt-Ansicht fragt nach dem Schlüssel** | neuen Link mit Schlüssel vom Programmierer |
| **Jemand hat den Link mit Schlüssel weitergegeben** | Programmierer erzeugt einen neuen Schlüssel |

---

## 10. Kleine Erklärung der Begriffe

| Begriff | Bedeutung |
|---|---|
| **Domain** | der Name `wirtschaft-dornbirn.at` |
| **DNS** | das Telefonbuch des Internets: sagt, welcher Server hinter einem Namen steht |
| **A-Eintrag** | „dieser Name zeigt auf diese Server-Nummer“ (z. B. `78.47.8.180`) |
| **CNAME** | „dieser Name zeigt auf einen anderen Namen“ |
| **Platzhalter `*`** | gilt für jede Unterdomain, die nicht eigens eingetragen ist |
| **TTL** | wie lange sich Geräte eine Antwort merken; bei Cloudflare ist das Umschalten in Minuten sichtbar |
| **Nameserver** | wer die DNS-Verwaltung macht (heute Hetzner, künftig Cloudflare) |
| **Repository** | der Ordner mit dem ganzen Code und seinem Verlauf, auf GitHub |
| **Pull Request** | ein Änderungsvorschlag, der erst nach der automatischen Prüfung übernommen wird |
| **Dienst** | das Programm hinter der Seite, das Reservierungen annimmt und Mails schickt |
| **Brevo** | der Mailversender für Bestätigungen und Newsletter |

---

## Anhang · Die DNS-Einträge heute (gelesen am 01.10.2026)

Bei Hetzner (Nameserver `hydrogen.ns.hetzner.com`, `oxygen.ns.hetzner.com`,
`helium.ns.hetzner.de`), TTL meist 86400 Sekunden (ein Tag):

| Name | Typ | Wert | nach Etappe 6 |
|---|---|---|---|
| `wirtschaft-dornbirn.at` | A | `78.47.8.180` (WordPress) | Cloudflare Pages (setzt Cloudflare selbst) |
| `www` | A | `78.47.8.180` | Cloudflare Pages (setzt Cloudflare selbst) |
| `mail` | A | `78.47.8.180` | **unverändert**, DNS only |
| `*` (Platzhalter) | CNAME | `www` | **A `78.47.8.180`** (Teil A), DNS only |
| `gutscheine`, `lieferservice`, `webmail`, `autodiscover`, `ftp`, `shop`, `test` … | CNAME (über den Platzhalter) | `www` | **A `78.47.8.180`**, DNS only |
| `@` | MX | `10 mail.wirtschaft-dornbirn.at` | **unverändert** |
| `@` | TXT | `v=spf1 a mx ~all` | `v=spf1 a mx include:spf.brevo.com ~all` |
| `_dmarc` | TXT | `v=DMARC1; p=none;` | Wert aus Brevo |
| `brevo1._domainkey`, `brevo2._domainkey` | CNAME | – | neu, Werte aus Brevo |
| `@` | TXT | – | neu: `brevo-code:…` aus Brevo |
| `neu` | CNAME | – | ab Etappe 5: `<projekt>.pages.dev` |

Vor Etappe 6 diese Tabelle mit der Hetzner-Verwaltung vergleichen – dort
kann es Einträge geben, die von außen nicht sichtbar sind.
