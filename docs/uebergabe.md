# Übergabeprotokoll · Website und Dienst der „wirtschaft“ Dornbirn

Stand 30. September 2026. Dieses Dokument regelt, wie die Website, der
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
| 1 | Quellcode, Historie, Pull Requests, Actions | GitHub `jonasgamper-create/wirtschaft-dornbirn-test` (öffentlich) | GitHub-Konto/Organisation des Kunden, per **Transfer ownership** | Übernehmer legt Konto an, Jonas überträgt |
| 2 | Dienst `wirtschaft-reservierung` (Worker + Durable Object) | Cloudflare-Konto Jonas | Cloudflare-Konto des Kunden, neu ausgerollt | Übernehmer |
| 3 | Probe-Dienst `wirtschaft-reservierung-probe` | Cloudflare-Konto Jonas | Kundenkonto, neu ausgerollt (`--env probe`) | Übernehmer |
| 4 | **Bestand**: Reservierungen, Takeaway, Wochenkarte, Tischplan, Newsletter-Abonnenten, Wartelisten, Zahlen, Mittagskarte-PDF | Datenbank des Dienstes | per Sicherung (`GET /api/sicherung` → `POST …?ersetzen=1`) in den neuen Dienst | Jonas exportiert, Übernehmer importiert |
| 5 | Gästeseite auf Cloudflare Pages `wirtschaft-dornbirn.pages.dev` | Cloudflare-Konto Jonas | Pages-Projekt im Kundenkonto (oder nur GitHub Pages bis zum Domainumzug) | Übernehmer |
| 6 | Mails (Brevo) | Brevo-Konto Jonas, Absender `jonas.gamper@aon.at` | Brevo-Konto des Kunden, Absender `willkommen@wirtschaft-dornbirn.at`, Domain beglaubigt | Übernehmer + Kunde (DNS) |
| 7 | Geheimnisse: `HAUS_TOKEN`, `BREVO_KEY`, `BREVO_ABSENDER`, `VAPID_PRIVAT` (+ öffentlicher Teil) | von Jonas erzeugt | **neu erzeugt** vom Übernehmer; Jonas' Kopien gelöscht | Übernehmer |
| 8 | `WIRT_MAIL` (Tageszettel, Wochenbericht, Bestellungen) | `jonas.gamper@aon.at` | Adresse des Wirts | Übernehmer |
| 9 | Domain `wirtschaft-dornbirn.at` | Kunde (Hetzner) | Kunde; Zone zu Cloudflare empfohlen | Kunde |
| 10 | Dokumentation | `docs/` im Repository | geht mit dem Repository | – |
| 11 | Gedruckte QR-Codes (Faltkarten) | zeigen auf `wirtschaft-dornbirn.at/…` | stimmen nach dem Domainumzug; vorher nichts drucken | Kunde |

Nicht übergeben werden: Jonas' Claude-Konto und die dort veröffentlichten
Dokumente (Freigaberunde, Offene Punkte) – sie sind als PDF im Repository
abgelegt (`docs/pdf/`), das reicht.

---

## 2. Reihenfolge der Übergabe

Jeder Schritt hat einen Verantwortlichen und ein Häkchen. Die Reihenfolge
ist so gewählt, dass zu keinem Zeitpunkt Gäste vor einer toten Seite stehen.

### Phase A – Vorbereitung (Übernehmer, ~1 Tag)

- [ ] A1 GitHub-Konto oder -Organisation des Kunden angelegt; Übernehmer ist Admin
- [ ] A2 Cloudflare-Konto des Kunden angelegt (Gratisstufe reicht); Übernehmer ist Mitglied
- [ ] A3 Brevo-Konto des Kunden angelegt; API-Schlüssel erzeugt
- [ ] A4 Übernehmer hat das Repository geklont, `npm run ci` läuft grün auf seinem Rechner
- [ ] A5 Übernehmer hat `docs/betriebshandbuch.md` gelesen und Rückfragen gestellt

### Phase B – Übertragung (gemeinsam, ~½ Tag)

- [ ] B1 **Repository übertragen** (GitHub → Settings → Transfer ownership). GitHub Pages danach im neuen Konto aktivieren (`pages.yml`, Quelle „GitHub Actions“). Die alte Adresse `jonasgamper-create.github.io/…` leitet GitHub für eine Weile weiter, ist aber nicht mehr die Adresse zum Teilen.
- [ ] B2 **Neue Geheimnisse** im Kundenkonto: `bash server/schluessel.sh` für den Hausschlüssel; VAPID-Paar neu; Brevo-Schlüssel aus A3. `wrangler.jsonc`: `VAPID_OEFFENTLICH` auf das neue Paar, `WIRT_MAIL` auf den Wirt.
- [ ] B3 **Dienst ausrollen** im Kundenkonto: `npx wrangler@4 deploy` und `--env probe`. Ausgabe: fünf `schedule:`-Zeilen beim Echtbetrieb, keine bei der Probe. Neue Adressen notieren (`wirtschaft-reservierung.<kundenkonto>.workers.dev`).
- [ ] B4 **Bestand übernehmen**: Jonas zieht `GET /api/sicherung` vom alten Dienst (Datei bleibt bei den beiden Beteiligten, wird nach Abschluss gelöscht); Übernehmer spielt sie mit `POST …?ersetzen=1` in den neuen Dienst. Antwort enthält die Zeilenzahlen je Tabelle – mit der Datei vergleichen.
- [ ] B5 **Seite umstellen**: `site/data/haus.json` auf die neuen Dienstadressen; `ALLOWED_ORIGINS`/`GAESTE_SEITE`/`DIENST_BASIS` in `wrangler.jsonc`; `npm run ci`; PR; Merge. Cloudflare-Pages-Projekt im Kundenkonto anlegen und `npm run deploy:seite` (oder das Repository im Dashboard verbinden).
- [ ] B6 **Mails**: Domain `wirtschaft-dornbirn.at` im Kunden-Brevo anlegen, die vier DNS-Einträge bei Hetzner setzen (`docs/mail-absender.md`), Beglaubigung abwarten, dann `secret put BREVO_ABSENDER willkommen@wirtschaft-dornbirn.at`. Prüfen: `GET /api/mail/pruefung?email=<eigene Adresse>` → `delivered`.
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
- [ ] D5 Unterschriften (Abschnitt 5)

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

**Was nicht nachgewiesen ist** – und der Übernehmer in Phase C selbst
prüft: echtes iOS-Safari auf einem iPhone (nur Simulator/Chromium),
Bestätigungsmails an Gäste mit Gmail/GMX (scheitern heute am aon.at-Absender),
ein kompletter Wochenwechsel im Haus (der gespeicherte Plan ist seit
07.09. nicht mehr erneuert worden – das Haus benutzt das Werkzeug noch nicht).

---

## 5. Bekannte offene Punkte, die der Übernehmer erbt

1. Gutschein-Knopf zeigt auf `gutscheine.wirtschaft-dornbirn.at` (alte Seite) – Entscheidung des Kunden.
2. Domainumzug samt Weiterleitungen der alten `/event/…`-Adressen – `umzug-domain-plan.md`.
3. Cloudflare Access vor der Wirt-Ansicht – erst mit der Zone bei Cloudflare.
4. Ticketist-Preise als Datei (Stand 14.09.) – Lesezugang bei Ticketist anfragen.
5. Tischautomatik aus = keine Online-Obergrenze – vor dem Start bewusst entscheiden.
6. TEST-Einträge im Echtbetrieb (15 Reservierungen, 11 Bestellungen, Stand 30.09.) – vor dem Start entfernen.
7. Probemodus ohne sichtbares Band (seit 22.09.) – Verwechslungsgefahr bewusst in Kauf genommen.
8. Cloudflare Pages veröffentlicht nicht automatisch – Repository im Dashboard verbinden.

---

## 6. Abschluss

Mit den Unterschriften bestätigen die Beteiligten: Phase A–D sind abgehakt,
die Abnahme (Abschnitt 3) ist vollständig, Jonas Gamper hat keinen Zugang,
keinen Schlüssel und keine Kopie von Gästedaten mehr. Ab diesem Datum liegt
der Betrieb beim Kunden und seinem Programmierer.

| | Name | Datum | Unterschrift |
|---|---|---|---|
| Übergeber | Jonas Gamper | | |
| Übernehmer | | | |
| Auftraggeber | Wolfgang Preuß | | |
