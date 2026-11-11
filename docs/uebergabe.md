# Übergabeprotokoll · Website und Dienst der „wirtschaft“ Dornbirn

> Für Hannah und Wolfgang gibt es die verständliche Fassung mit dem
> Umzugsablauf: **`uebergabe-wirtschaft.md`**. Dieses Protokoll ist die
> technische Abnahme dazu.

Stand 11. November 2026. Dieses Dokument regelt, wie die Website, der
Dienst und alles, was daran hängt, von Jonas Gamper an den Kunden und dessen
Programmierer übergehen – so, dass danach **nichts mehr bei Jonas liegt**:
kein Konto, kein Schlüssel, keine Pflicht.

Es gibt keine Garantie, dass Software für immer läuft. Es gibt belegte
Prüfungen, ein Betriebshandbuch, eine Abnahme mit Nachweisen und eine
Parallelphase, in der der neue Betreuer bereits alles selbst tut. Das ist
der Stand der Technik für eine saubere Übergabe – und das ist, was dieses
Protokoll festhält.

**Übergeber:** Jonas Gamper

**Übernehmer:** Programmierer des Kunden (Name, E-Mail: ______________)

**Auftraggeber:** Wolfgang Preuß, „wirtschaft“ / Emma & Eugen

---

## 1. Was übergeben wird

| # | Gegenstand | Heute | Ziel | Wer |
|---|---|---|---|---|
| 1 | Quellcode, Historie, Pull Requests, Actions | GitHub `jonasgamper-create/wirtschaft-dornbirn-test` (öffentlich) | GitHub-Konto/Organisation des Kunden, per **Transfer ownership** | ein GitHub-Konto des Hauses hat Sarah angelegt; Jonas überträgt |
| 2 | Dienst `wirtschaft-reservierung` (Worker + Durable Object) | Cloudflare-Konto Jonas | Cloudflare-Konto des Kunden, neu ausgerollt | Übernehmer |
| 3 | Probe-Dienst `wirtschaft-reservierung-probe` | Cloudflare-Konto Jonas | Kundenkonto, neu ausgerollt (`--env probe`) | Übernehmer |
| 4 | **Bestand**: Reservierungen, Takeaway, Wochenkarte, Tischplan, Newsletter-Abonnenten, Wartelisten, Zahlen, Mittagskarte-PDF | Datenbank des Dienstes | per Sicherung (`GET /api/sicherung` → `POST …?ersetzen=1`) in den neuen Dienst | Jonas exportiert, Übernehmer importiert |
| 5 | Gästeseite auf Cloudflare Pages `wirtschaft-dornbirn.pages.dev` | Cloudflare-Konto Jonas | Pages-Projekt im Kundenkonto (oder nur GitHub Pages bis zum Domainumzug) | Übernehmer |
| 6 | Mails (Brevo) | Brevo-Konto Jonas, Absender die private Adresse von Jonas | Brevo-Konto des Hauses (von Sarah angelegt; Einträge beider Domains bei Hetzner gesetzt, Sarah mit Markus), Domains beglaubigt, Absender `willkommen@wirtschaft-dornbirn.at` | Sarah (*Authenticate*), Jonas mit dem Haus (API-Schlüssel, Absender) |
| 7 | Geheimnisse: `HAUS_TOKEN`, `BREVO_KEY`, `BREVO_ABSENDER`, `VAPID_PRIVAT` (+ öffentlicher Teil) | von Jonas erzeugt | **neu erzeugt** vom Übernehmer; Jonas' Kopien gelöscht | Übernehmer |
| 8 | `WIRT_MAIL` (Tageszettel, Wochenbericht), `TAKEAWAY_MAIL` (Bestellmeldungen) | vorher die Adresse von Jonas | **erledigt 27.10.2026**: `veranstaltungen@` bzw. `service@`. Kopie von Tageszettel und Wochenbericht an die technische Betreuung: vorbereitet (Geheimnis `WIRT_MAIL_KOPIE`), noch nicht gesetzt – heute keine Kopie | – |
| 9 | Domain `wirtschaft-dornbirn.at` | Kunde (Hetzner) | Kunde; Zone zu Cloudflare empfohlen | Kunde |
| 10 | Dokumentation | `docs/` im Repository | geht mit dem Repository | – |
| 10a | **Handbuch fürs Haus** (`docs/handbuch-haus.md`, PDF) | – | an Wolfgang und das Team, ausgedruckt | Übernehmer |
| 10b | GitHub-Workflow „Termine-Abgleich“ (täglich, Mail bei Fehler) | Mails an Jonas | geht mit dem Repository; Mails an den neuen Besitzer | – |
| 10c | Anfragen-Postfach `ANFRAGE_MAIL` | `uri@eugen.family` (entschieden 03.11., live seit 10.11.2026; vorher `willkommen@`) | bleibt; `willkommen@` bleibt Kontaktadresse der Seite. Keine automatische Antwort für `willkommen@` (vom Haus abgelehnt) | – |
| 11 | Gedruckte QR-Codes (Faltkarten) | zeigen auf `wirtschaft-dornbirn.at/…` | stimmen nach dem Domainumzug; vorher nichts drucken | Kunde |

Nicht übergeben werden: Jonas' Claude-Konto und die dort veröffentlichten
Dokumente (Freigaberunde, Offene Punkte) – sie sind als PDF im Repository
abgelegt (`docs/pdf/`), das reicht.

---

## 2. Reihenfolge der Übergabe

Jeder Schritt hat einen Verantwortlichen und ein Häkchen. Die Reihenfolge
ist so gewählt, dass zu keinem Zeitpunkt Gäste vor einer toten Seite stehen.

### Phase A – Vorbereitung (Übernehmer, ~1 Tag)

- [ ] A1 GitHub-Konto oder -Organisation des Kunden angelegt; Übernehmer ist Admin (Stand 11.11.: ein GitHub-Konto des Hauses hat Sarah angelegt)
- [ ] A2 Cloudflare-Konto des Kunden angelegt (Gratisstufe reicht); Übernehmer ist Mitglied
- [ ] A3 Brevo-Konto des Kunden angelegt; API-Schlüssel erzeugt (Stand 11.11.: Konto von Sarah angelegt, Einträge beider Domains gesetzt; offen *Authenticate*, dann der Schlüssel – siehe B6)
- [ ] A4 Übernehmer hat das Repository geklont, `npm run ci` läuft grün auf seinem Rechner
- [ ] A5 Übernehmer hat `docs/betriebshandbuch.md` gelesen und Rückfragen gestellt

### Phase B – Übertragung (gemeinsam, ~½ Tag)

- [ ] B1 **Repository übertragen** (GitHub → Settings → Transfer ownership). GitHub Pages danach im neuen Konto aktivieren (`pages.yml`, Quelle „GitHub Actions“). Die alte Adresse `jonasgamper-create.github.io/…` leitet GitHub für eine Weile weiter, ist aber nicht mehr die Adresse zum Teilen.
- [ ] B2 **Neue Geheimnisse** im Kundenkonto: `bash server/schluessel.sh` für den Hausschlüssel; VAPID-Paar neu; Brevo-Schlüssel aus A3. `wrangler.jsonc`: `VAPID_OEFFENTLICH` auf das neue Paar. `WIRT_MAIL` und `TAKEAWAY_MAIL` stehen schon richtig (27.10.2026), `ANFRAGE_MAIL` ebenso (`uri@eugen.family`, 10.11.2026).
- [ ] B3 **Dienst ausrollen** im Kundenkonto: `npx wrangler@4 deploy` und `--env probe`. Ausgabe: fünf `schedule:`-Zeilen beim Echtbetrieb, keine bei der Probe. Neue Adressen notieren (`wirtschaft-reservierung.<kundenkonto>.workers.dev`).
- [ ] B4 **Bestand übernehmen**: Jonas zieht `GET /api/sicherung` vom alten Dienst (Datei bleibt bei den beiden Beteiligten, wird nach Abschluss gelöscht); Übernehmer spielt sie mit `POST …?ersetzen=1` in den neuen Dienst. Antwort enthält die Zeilenzahlen je Tabelle – mit der Datei vergleichen.
- [ ] B5 **Seite umstellen**: `site/data/haus.json` auf die neuen Dienstadressen; `ALLOWED_ORIGINS`/`GAESTE_SEITE`/`DIENST_BASIS` in `wrangler.jsonc`; `npm run ci`; PR; Merge. Cloudflare-Pages-Projekt im Kundenkonto anlegen und `npm run deploy:seite` (oder das Repository im Dashboard verbinden).
- [ ] B6 **Mails**: Domains `wirtschaft-dornbirn.at` und `eugen.family` im Brevo-Konto des Hauses anlegen und die DNS-Einträge bei Hetzner setzen – **erledigt** (Sarah mit Markus; von außen geprüft am 10.11.2026, `docs/mail-absender.md`). Offen, in dieser Reihenfolge: *Authenticate* für beide Domains im Brevo-Konto des Hauses; einen API-Schlüssel aus diesem Konto als `BREVO_KEY` hinterlegen (gemeinsam, nicht per Mail oder Chat); erst dann `secret put BREVO_ABSENDER willkommen@wirtschaft-dornbirn.at` und die Absender je Zweck. Umgekehrt versendet Brevo gar nichts mehr. Prüfen: `GET /api/mail/pruefung?email=<eigene Adresse>` → `delivered` – die Abfrage zeigt erst mit dem Schlüssel des Hauses dessen Konto.
- [ ] B7 **Wirt-Ansicht neu verteilen**: neuer Link mit `#k=<neuer Hausschlüssel>` an Wolfgang und das Team; alte Links sind damit wertlos.

### Phase C – Parallelphase (2–4 Wochen)

- [ ] C1 Jeder Deploy und jede Änderung durch den Übernehmer; Jonas hat nur noch Lesezugriff (GitHub „Read“), keine Cloudflare-, keine Brevo-Rechte mehr
- [ ] C2 Mindestens ein Wochenwechsel der Karte, ein Tageszettel, ein Wochenbericht, eine echte Reservierung mit Bestätigungsmail, eine Takeaway-Bestellung, ein Wartelisten-Fall – alles im neuen Konto, alles vom Übernehmer bestätigt
- [ ] C3 Erste eigene Sicherung durch den Übernehmer (`GET /api/sicherung`), abgelegt an einem Ort des Kunden

### Phase D – Abschluss

- [ ] D1 Abnahme (Abschnitt 3) vollständig abgehakt
- [ ] D2 Jonas' Lesezugriff auf das Repository entfernt
- [ ] D3 Alter Dienst, alte Probe und altes Pages-Projekt in Jonas' Cloudflare-Konto **gelöscht**; Brevo-Domain in Jonas' Konto entfernt
- [ ] D4 Jonas' lokale Kopien gelöscht: `server/.haus-token`, alle Sicherungsdateien, Klon des Repositorys
- [ ] D5 Unterschriften (Abschnitt 8)

---

## 3. Abnahme – was der Übernehmer selbst prüft

Jede Zeile wird **im Kundenkonto** und **vom Übernehmer** geprüft, nicht von
Jonas. Nachweis = Datum und Kürzel in der letzten Spalte.

| # | Prüfung | So geht es | Erwartet | Nachweis |
|---|---|---|---|---|
| 1 | Dienst erreichbar | `curl https://<dienst>/api/gesundheit` | `{"ok":true,…}` | |
| 2 | Fünf Zeitpläne | Deploy-Ausgabe | 5 × `schedule:` | |
| 3 | Bestand vollständig | Zeilenzahlen aus `POST /api/sicherung` = Zeilen in der Datei | identisch | |
| 4 | Seite auf Cloudflare Pages und GitHub Pages | Startseite, Events (31 Kacheln), Reservierung, Takeaway laden ohne Konsolenfehler | ja | |
| 5 | Reservierung end-to-end | Reservierung anlegen → Bestätigungsmail kommt → in Wirt-Ansicht sichtbar → Absage über Mail-Link | alle vier | |
| 6 | Takeaway end-to-end | Bestellung → Nummer → in Wirt-Ansicht → „abgeholt“ | ja | |
| 7 | Mails beglaubigt | `GET /api/mail/domain` | vier Einträge `status: true` | |
| 8 | Tageszettel und Wochenbericht | 08:00 werktags bzw. Freitag 15:00 an `WIRT_MAIL` | kommen an | |
| 9 | Wochenkarte | in Wirt-Ansicht eintragen → Takeaway und Mittagskarte zeigen sie | ja | |
| 10 | Termine | neuen Ticketist-Link in der Wirt-Ansicht einfügen → Kachel erscheint | ja | |
| 11 | Event-Warteliste | ausverkauften Weg wählen → Eintrag → im Reiter „warteliste“ | ja | |
| 12 | Probemodus | `?probe=1` → Reservierung landet nur im Probe-Dienst | ja | |
| 13 | Hausschlüssel rotiert | alter Link öffnet die Wirt-Ansicht **nicht** mehr | 401 | |
| 14 | Keine Jonas-Adresse mehr | `grep -rn "jonas" server/wrangler.jsonc site/data` | leer | |
| 15 | Sicherung durch den Übernehmer | `GET /api/sicherung` → Datei, Zeilenzahlen plausibel | ja | |
| 16 | Anfrage end-to-end | Locations-Formular absenden → Mail kommt an `uri@eugen.family`, „Antworten“ geht an den Gast → Gast bekommt Bestätigung → steht in Wirt-Ansicht → haus → Anfragen | alle vier | |
| 17 | Hinweis auf der Startseite | Wirt-Ansicht → haus → Hinweis setzen → Startseite zeigt ihn statt „Dornbirn · Vorarlberg“ → entfernen | ja | |
| 18 | Termine-Abgleich | GitHub → Actions → Termine-Abgleich → „Run workflow“ | grün | |
| 19 | Neuer Abend kommt von selbst | Abend auf der eigenen Eventseite verlinken → Wirt-Ansicht „Jetzt nachsehen“ → Kachel auf der Seite | ja | |

---

## 4. Belege zum Stand der Übergabe (was heute nachgewiesen ist)

| Datum | Was | Ergebnis |
|---|---|---|
| 17.09. | Alle Verweise der Gästeseite | 421 Verweise auf 12 Seiten, alle internen Ziele und Sprungmarken lösen auf; 33 externe Adressen antworten |
| 17.09. | Alle Ticketwege | 46 Wege bei ticketist.io: erreichbar, richtiger Abend, Ausverkauft-Stand deckt sich |
| 17.09. | Bildschirmbreiten | 13 Breiten von 320 bis 1920 px: gleich breite Spalten, kein Überlauf, nichts abgeschnitten |
| 20.–21.09. | Mailweg | Wartelisten-Mails über den Echtdienst von Brevo als `delivered` verbucht; Antwortlinks bis zur Dankesseite geprüft |
| 22.09. | Testlauf zehn Kunden (Probe) | 119 Schritte über die API: Reservierungen, Voll/Zeitsperre/Warteliste, Takeaway, Event-Warteliste, Wirt-Aktionen, Newsletter – alle mit dem erwarteten Ergebnis (`umzug-domain-plan.md`, §5) |
| 22.09. | Oberflächen-Sweep | alle Seiten live ohne Konsolenfehler, 42 externe Links, Gaststrecken über die Oberfläche (Probe) |
| 30.09. | Sicherung | Export/Import auf der Probe: 55 Reservierungen, 20 Einstellungen, 5 Abonnenten, 14 Takeaway, 51 Zahlen – nach der Rundreise identisch bis auf den Änderungszähler. Erste echte Sicherung gezogen (22 / 35 / 1 / 20 / 90 / 0 / 1 Zeilen) |
| 30.09. | Echtdienst | ausgerollt, fünf Zeitpläne bestätigt, `api/gesundheit` beider Dienste und beider Seitenadressen 200 |
| 01.10. | Programm 2027 | 28 neue Ticketwege von den eigenen Eventseiten automatisch gefunden, auf Seite und Startseite; Abgleich im Dienst 56/56, `check:live` grün, Gegentest gegen die Probe rot mit allen fehlenden Wegen; GitHub-Workflow grün |
| 01.10. | Anfragen und Hinweis | im Testdienst: Anfrage über Locations und Agentur gespeichert und in der Wirt-Ansicht, Fangfeld verwirft Spam, Hinweis nur mit Hausschlüssel (401 ohne), auf der Startseite sichtbar. Mailversand im Echtbetrieb nicht mit echter Adresse getestet – Abnahme Nr. 16 |
| 10.11. | Ticketkategorien | Ticketist gibt Kategorien, Preise und freie Karten öffentlich heraus (`/api/ticket-categories?eventId=<nummer>`); alle kommenden Abende haben Preise, auch die 20 ab Jänner 2027. Der Dienst liest sie seit 11.11.2026 selbst |
| 10.11. | Brevo-Einträge | beide Domains von außen geprüft: DKIM, `brevo-code` (auf beiden gleich = ein Konto, das des Hauses), SPF, DMARC. Offen: *Authenticate* und der Schlüssel des Hauses |
| 4.–10.11. | Tageszettel | an `veranstaltungen@` zugestellt am 4., 5., 6., 9. und 10.11. (Brevo meldet `delivered`) |

**Was nicht nachgewiesen ist** – und der Übernehmer in Phase C selbst
prüft: echtes iOS-Safari auf einem iPhone (nur Simulator/Chromium),
Bestätigungsmails an Gäste mit Gmail/GMX (scheitern heute am privaten Absender),
eine echte Anfrage an `uri@eugen.family` (seit der Umstellung kam keine;
eine Testanfrage durch das Haus steht aus),
ein kompletter Wochenwechsel im Haus (der gespeicherte Plan ist seit
07.09. nicht mehr erneuert worden – das Haus benutzt das Werkzeug noch nicht).

---

## 5. Bekannte offene Punkte, die der Übernehmer erbt

1. Gutschein-Knopf zeigt auf `gutscheine.wirtschaft-dornbirn.at` (alte Seite) – Entscheidung des Kunden.
2. Domainumzug samt Weiterleitungen der alten `/event/…`-Adressen – `umzug-domain-plan.md`.
3. Cloudflare Access vor der Wirt-Ansicht – erst mit der Zone bei Cloudflare.
4. Ticketist-Preise als Datei – **erledigt 11.11.2026**: Ticketist gibt Kategorien, Preise und freie Karten öffentlich heraus, der Dienst liest sie selbst; `ticketist-preise.json` ist nur der Rückfall (erzeugt von `npm run sync:termine`). Kein Zugang bei Ticketist nötig.
5. Tischautomatik aus = keine Online-Obergrenze – vor dem Start bewusst entscheiden.
6. TEST-Einträge im Echtbetrieb (15 Reservierungen, 11 Bestellungen, Stand 30.09.) – vor dem Start entfernen.
7. Probemodus ohne sichtbares Band (seit 22.09.) – Verwechslungsgefahr bewusst in Kauf genommen. Zum Herzeigen dient die Testseite `https://probe-wirtschaft-dornbirn.pages.dev`: immer Testbetrieb, mit Band „Testseite“.
8. Cloudflare Pages veröffentlicht nicht automatisch – Repository im Dashboard verbinden.

---

## 6. Domain und Mails – Schritt für Schritt

Die vollständige Fassung mit allen Einträgen steht in `umzug-domain-plan.md`
und `mail-absender.md`. Hier die Reihenfolge an einem Stück, so wie sie am
Umzugstag abläuft.

**Vorher (Kunde):** Zugang zur DNS-Verwaltung von `wirtschaft-dornbirn.at`
bei Hetzner; Entscheidung, ob die Zone zu Cloudflare umzieht (empfohlen –
nur dann sind Hauptdomain und Cloudflare Access ohne Umweg möglich).

**Brevo im Kundenkonto einrichten** (Stand 11.11.2026: Konto, Domains und
Einträge erledigt – Sarah mit Markus; offen *Authenticate* und der Schlüssel)
1. Konto auf brevo.com anlegen (Gratisstufe) – **erledigt** (Sarah). Unter
   *SMTP & API* einen **API-Schlüssel** erzeugen – er wird genau einmal
   angezeigt. Der Schlüssel ist **noch offen**; in den Dienst kommt er erst
   nach *Authenticate* (Schritt 6).
2. *Senders, Domains & Dedicated IPs → Domains → Add a domain*:
   `wirtschaft-dornbirn.at` und `eugen.family` – **erledigt**. Brevo zeigt je
   Domain vier Einträge (zwei DKIM-CNAME, einen `brevo-code`-TXT, einen
   DMARC-TXT). **Kontoeigen ist nur der `brevo-code`** – der in
   `mail-absender.md` gehört zu Jonas' Konto; gültig ist der, der live in der
   Zone steht. DKIM und DMARC dort stimmen mit der Zone überein.
3. Absender `willkommen@wirtschaft-dornbirn.at` anlegen.

**DNS (Hetzner oder Cloudflare), in einem Rutsch**
4. Die vier Brevo-Einträge setzen. Den bestehenden SPF-Eintrag **ändern,
   nicht verdoppeln**: `v=spf1 a mx include:spf.brevo.com ~all` –
   **erledigt** für beide Domains (von außen geprüft am 10.11.2026).
5. Für die Seite: Custom Domain im Cloudflare-Pages-Projekt anlegen, die
   angezeigten Ziele eintragen (`umzug-domain-plan.md` §2a).
6. Warten, bis die Einträge sichtbar sind (`dig +short …`), dann in Brevo
   „Authenticate“ – im Brevo-Konto des Hauses, für beide Domains (Sarah).
   `GET /api/mail/domain` zeigt bis zum Schlüssel des Hauses das Konto von
   Jonas, nicht das des Hauses.

**Dienst umstellen**
7. `secret put BREVO_KEY` (aus Schritt 1, gemeinsam hinterlegt, nicht per
   Mail oder Chat) und **erst jetzt**
   `secret put BREVO_ABSENDER willkommen@wirtschaft-dornbirn.at`, danach die
   Absender je Zweck (`ABSENDER_SERVICE`, `ABSENDER_WARTELISTE`,
   `ABSENDER_KULTURHAUS`, `EVENTS_ABSENDER`).
8. `wrangler.jsonc`: `ALLOWED_ORIGINS`, `GAESTE_SEITE`, `WIRT_MAIL`;
   `QUELLSEITEN` in `ticketist.mjs` prüfen (die alte `/event/`-Seite fällt
   weg); `npm run ci`; PR; Deploy (fünf `schedule:` zählen).
9. Probe: eine Reservierung, eine Anfrage, eine Takeaway-Bestellung an eine
   eigene Gmail-Adresse – jeweils `GET /api/mail/pruefung?email=…` →
   `delivered`.

## 7. Fallen und Tricks – alles, was schon einmal schiefging

| Falle | Was passiert | Was hilft |
|---|---|---|
| Probe-Deploy ohne `"crons": []` | löscht die fünf Zeitpläne des Echtbetriebs (17.09.: drei Tage keine Mails) | nach **jedem** Deploy die `schedule:`-Zeilen zählen |
| `HAUS_TOKEN` der Probe | ein Deploy der Probe kann das Geheimnis verlieren | danach `secret put HAUS_TOKEN --env probe` erneut |
| `deploy.sh` ohne Terminal | hängt bei `secret put` | Befehle einzeln, Schlüssel per `printf … \|` |
| Cloudflare Pages | veröffentlicht nicht von selbst | `npm run deploy:seite` nach jedem Merge, oder Repository im Dashboard verbinden |
| `npm run ci` rot, trotzdem gemergt | Befehlsketten mit `;` laufen weiter | erst Ergebnis prüfen, dann committen (01.10. passiert) |
| Alter Stand im Browser | CSS/JS ohne neuen `?v=`-Hash | `npm run ci` (schreibt `sync:versions`) |
| Brevo-Absender zu früh umgestellt | Brevo verschickt **gar nichts** mehr | erst *Authenticate* im Konto des Hauses, dann dessen Schlüssel als `BREVO_KEY`, dann `BREVO_ABSENDER` |
| Absender ist die private Adresse von Jonas | ihr Anbieter hat DMARC `p=reject` – Gmail/Outlook weisen ab | Absender auf die eigene, beglaubigte Domain |
| Testadressen `@example.at` | Brevo verbucht sie als unzustellbar | harmlos, Statistik nicht verwechseln |
| Neue Abende auf Blätterseiten | der Merker hielt `/page/2/` für erledigt (01.10.) | Listen werden jedes Mal gelesen – bei neuer Quelle daran denken |
| Abende ohne Preise | fehlten bis 01.10. auf der Startseite | seit 11.11.2026 liest der Dienst Kategorien und Preise selbst bei Ticketist; `ticketist-preise.json` ist der Rückfall und entsteht mit `npm run sync:termine`, nie von Hand |
| Ticketist-Schalter „nicht kaufbar“ | heißt nicht ausverkauft (Vorverkauf, Rückläufer) | Regel in `event-warteliste.md` |
| Probemodus ohne Band | man sieht einem Tab nicht an, ob er im Testdienst ist | neuer Tab = Echtbetrieb; `window.WIRTSCHAFT_PROBE`. Zum Herzeigen die Testseite `probe-wirtschaft-dornbirn.pages.dev` (immer Testbetrieb, Band „Testseite“) |
| Lokale Tests über `127.0.0.1` | Dienst kennt die Herkunft nicht (CORS) – Felder bleiben leer | `localhost` benutzen oder die Live-Seite mit `?probe=1` |
| Abruf-Limit des Dienstes | ~50 Abrufe je Durchgang (Gratisstufe) | Suche liest Listen, holt höchstens 6 neue Abende sofort |
| Hetzner und Hauptdomain | kein CNAME auf `@` | Zone zu Cloudflare oder A-Einträge |

## 8. Abschluss

Mit den Unterschriften bestätigen die Beteiligten: Phase A–D sind abgehakt,
die Abnahme (Abschnitt 3) ist vollständig, Jonas Gamper hat keinen Zugang,
keinen Schlüssel und keine Kopie von Gästedaten mehr. Ab diesem Datum liegt
der Betrieb beim Kunden und seinem Programmierer.

| | Name | Datum | Unterschrift |
|---|---|---|---|
| Übergeber | Jonas Gamper | | |
| Übernehmer | | | |
| Auftraggeber | Wolfgang Preuß | | |
