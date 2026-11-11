# Umzug auf wirtschaft-dornbirn.at – der Plan

> **Seit 01.10. gilt `uebergabe-wirtschaft.md` als Ablauf** (mit Generalprobe,
> Absicherung der Unterdomains und Rückweg). Dieses Dokument bleibt als
> technische Ergänzung.

Stand 11. November 2026. Die Seite ist fertig getestet (siehe Abschnitt 5)
und läuft unter `wirtschaft-dornbirn.pages.dev`. Dieses Dokument ist die
Reihenfolge, in der sie auf die echte Domain kommt – und was dabei mit den
Mails passiert. Es baut auf [adresse.md](adresse.md) und
[mail-absender.md](mail-absender.md) auf und ersetzt deren Umzugsabschnitte.

**Ein Satz vorweg:** Was nicht aus diesem Projekt heraus geht, sind die
Einträge für die Seite in der DNS-Zone von `wirtschaft-dornbirn.at` bei
Hetzner und, für die Mails, *Authenticate* sowie ein API-Schlüssel aus dem
Brevo-Konto des Hauses (gemeinsam als `BREVO_KEY` hinterlegt). Die
Einträge für die Mails stehen schon (Abschnitt 2b). Alles andere ist
vorbereitet und dauert zusammen unter einer Stunde.

---

## 1. Was heute wo liegt

| Baustein | Heute | Nach dem Umzug |
|---|---|---|
| Gästeseite | `wirtschaft-dornbirn.pages.dev` (Cloudflare Pages) + `jonasgamper-create.github.io/…` | `wirtschaft-dornbirn.at` und `www.` |
| Wirt-Ansicht | `…/wirt.html` mit Hausschlüssel im Link | `wirtschaft-dornbirn.at/wirt.html`, später hinter Cloudflare Access |
| Dienst (API) | `wirtschaft-reservierung.jonas-gamper.workers.dev` | unverändert (kann später `api.wirtschaft-dornbirn.at` werden) |
| Probe-Dienst | `wirtschaft-reservierung-probe.…workers.dev` | unverändert, nur über `?probe=1` oder die Testseite `probe-wirtschaft-dornbirn.pages.dev` (immer Testbetrieb) |
| Mails | Brevo-Konto von Jonas, Absender die private Adresse von Jonas (wird oft abgewiesen) | Brevo-Konto des Hauses, Absender `@wirtschaft-dornbirn.at`, beglaubigt |
| Alte Seite | liegt noch auf `wirtschaft-dornbirn.at` (Hetzner-Webspace) | abgelöst; `/event/…`-Links werden weitergeleitet |

`canonical`, `og:url`, `sitemap.xml` und die strukturierten Daten nennen
bereits `https://wirtschaft-dornbirn.at/`. Die Seite ist also für die Domain
gebaut, nicht für die Testadresse.

---

## 2. Die DNS-Einträge

Die vier Einträge für die Mails stehen schon (Abschnitt 2b, von außen
geprüft am 10.11.2026). Wer die Zone bei Hetzner für die Seite öffnet,
setzt nur noch die aus Abschnitt 2a.

### 2a. Seite auf Cloudflare Pages

Vorher im Cloudflare-Dashboard: *Pages → wirtschaft-dornbirn → Custom domains
→ Add* für `wirtschaft-dornbirn.at` **und** `www.wirtschaft-dornbirn.at`.
Cloudflare zeigt dann genau diese Ziele an (sie lauten immer so):

| Typ | Name | Wert |
|---|---|---|
| CNAME | `www` | `wirtschaft-dornbirn.pages.dev` |
| CNAME | `@` (Apex) | `wirtschaft-dornbirn.pages.dev` – **wenn Hetzner CNAME am Apex erlaubt** (Hetzner DNS kann das als „CNAME flattening“ nicht; siehe unten) |

**Apex bei Hetzner:** Hetzner DNS erlaubt keinen CNAME auf `@`. Zwei Wege:

- **Empfohlen:** Die Zone zu Cloudflare umziehen (Nameserver bei der
  Registrierstelle auf die zwei Cloudflare-Nameserver stellen). Dann ist der
  Apex ein Klick, Access (Abschnitt 4) wird möglich, und Mail-Einträge werden
  1:1 mitgenommen. Cloudflare importiert die bestehende Zone automatisch;
  vorher trotzdem alle heutigen Einträge exportieren (MX, `mail.`, TXT).
- **Ohne Umzug geht es nicht** (korrigiert 01.10.): Cloudflare Pages nimmt
  die Hauptdomain ohne `www` nur an, wenn die Zone bei Cloudflare liegt;
  feste IP-Adressen für Pages gibt es nicht. Unterdomains (`www`, `neu`)
  gehen auch mit Hetzner per CNAME. Ablauf: `uebergabe-wirtschaft.md`, Etappe 6.

Bis der Kunde sich entschieden hat: **Variante 1 vorschlagen.** Die Domain
bleibt beim Registrar, nur die Nameserver ändern sich. Der Mailserver
`mail.wirtschaft-dornbirn.at` läuft weiter, weil MX und A-Einträge mitkommen.

### 2b. Mails von Brevo beglaubigen

Aus [mail-absender.md](mail-absender.md):

**Nachgeprüft am 10.11.2026 von außen:** gesetzt – für
`wirtschaft-dornbirn.at` und `eugen.family` (Sarah mit Markus), beide im
Brevo-Konto des Hauses. Der `brevo-code` unten ist der alte aus Jonas’
Konto; der gültige steht live in der Zone.
Falls Brevo zusätzlich eine Marken-Subdomain verlangt: `post`, nie `mail`
(dort läuft der Hetzner-Mailserver, Ziel des MX).

| Typ | Name | Wert |
|---|---|---|
| CNAME | `brevo1._domainkey` | `b1.wirtschaft-dornbirn-at.dkim.brevo.com` |
| CNAME | `brevo2._domainkey` | `b2.wirtschaft-dornbirn-at.dkim.brevo.com` |
| TXT | `@` | `brevo-code:12ab66d15bb7d93634c32a1a25ca728d` |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

Der bestehende SPF-Eintrag ist **geändert, nicht verdoppelt** (beide Domains):

```
v=spf1 a mx include:spf.brevo.com ~all
```

Offen für die Mails, in dieser Reihenfolge: *Authenticate* für beide Domains
im Brevo-Konto des Hauses (Sarah), dann ein API-Schlüssel aus diesem Konto
als `BREVO_KEY` im Dienst (gemeinsam, nicht per Mail oder Chat), erst dann
der Absender (Abschnitt 3, Schritte 2 und 3).

---

## 3. Danach, in dieser Reihenfolge (alles von hier aus)

1. **Warten, bis DNS sichtbar ist** (Minuten bis eine Stunde):
   ```bash
   dig +short CNAME www.wirtschaft-dornbirn.at
   dig +short CNAME brevo1._domainkey.wirtschaft-dornbirn.at
   ```
2. **Brevo beglaubigen lassen** – im Brevo-Konto **des Hauses** (Sarah)
   *Domains → Authenticate*, für beide Domains. Über den Dienst nachsehen
   (alle vier auf `status: true`) geht erst, wenn der Schlüssel des Hauses
   hinterlegt ist (Schritt 3) – bis dahin zeigt die Abfrage das Konto von
   Jonas:
   ```bash
   curl -s -H "x-haus-token: <Hausschlüssel>" https://wirtschaft-reservierung.jonas-gamper.workers.dev/api/mail/domain
   ```
3. **Schlüssel des Hauses, dann Absender** – erst jetzt. Zuerst den
   API-Schlüssel aus dem Brevo-Konto des Hauses als `BREVO_KEY` hinterlegen
   (gemeinsam, nicht per Mail oder Chat: `npx wrangler@4 secret put
   BREVO_KEY` im Ordner `server`), dann den Absender:
   ```bash
   cd server && printf '%s' "willkommen@wirtschaft-dornbirn.at" | npx wrangler@4 secret put BREVO_ABSENDER
   ```
   `willkommen@` steht schon überall auf der Seite als Kontaktadresse. Das
   Postfach sollte existieren, damit Antworten der Gäste ankommen (Hetzner
   Mail oder Weiterleitung auf das bestehende Postfach). Danach die Absender
   je Zweck (`ABSENDER_SERVICE`, `ABSENDER_WARTELISTE`,
   `ABSENDER_KULTURHAUS`, `EVENTS_ABSENDER`; Werte in
   `mailadressen-entscheidung.md`).
4. **Dienst auf die Domain einstellen** (`server/wrangler.jsonc`, beide
   Umgebungen): `GAESTE_SEITE` = `https://wirtschaft-dornbirn.at` (daraus
   entstehen die Links in Mails, Kalendereinträgen und Push).
   `ALLOWED_ORIGINS` in der Produktion = `https://wirtschaft-dornbirn.at,https://www.wirtschaft-dornbirn.at`
   (Testadressen raus); in der Probe bleibt
   `https://probe-wirtschaft-dornbirn.pages.dev` erlaubt, sonst steht die
   Testseite still.
   Dann `npx wrangler@4 deploy` und `--env probe`, wie in
   [testumgebung.md](testumgebung.md) beschrieben (Schedules zählen!).
5. **CSP der Seiten** – `connect-src` nennt heute die `workers.dev`-Adresse
   des Dienstes; die bleibt gültig. Nur wenn der Dienst später
   `api.wirtschaft-dornbirn.at` bekommt, kommt die Adresse dazu
   (`npm run sync:versions` hält die Hashes aktuell).
6. **QR-Codes** (`site/data/qr-ziele.json`, `site/assets/qr/*.svg`) zeigen auf
   `wirtschaft-dornbirn.at/…` – nach dem Umzug stimmen sie; vorher nichts
   ändern.
7. **Weiterleitungen** für die alten `/event/<name>`-Adressen der gedruckten
   Karten – Regeln stehen in [abschaltung-alte-seiten.md](abschaltung-alte-seiten.md);
   auf Cloudflare Pages als `_redirects` in `dist/` (Build-Skript ergänzen).
8. **Probe mit echter Mail**: eine Reservierung auf der Seite anlegen,
   dann `GET /api/mail/pruefung?email=<Adresse>` – erwartet `delivered`.
   Anschließend eine Wartelisten-Mail aus der Wirt-Ansicht an eine eigene
   Adresse.
9. **Alte Seite abschalten** (Hetzner-Webspace) und GitHub Pages
   deaktivieren, damit es nur noch einen Stand gibt. Bis dahin
   `npm run deploy:seite` nach jedem Merge nicht vergessen – oder Pages mit
   dem Repository verbinden ([adresse.md](adresse.md)). Das Hetzner-Paket
   fällt damit nicht ganz weg: die Postfächer bleiben, `gutscheine.` und
   `lieferservice.` laufen dort weiter – höchstens ein kleineres Paket.

---

## 4. Wirt-Ansicht absichern (nach dem Umzug)

Heute schützt der Hausschlüssel im Link. Sobald die Zone bei Cloudflare
liegt: **Cloudflare Access** (Zero Trust, gratis bis 50 Personen) auf
`wirtschaft-dornbirn.at/wirt.html`, `/kueche.html`, `/uebersicht.html`,
`/einrichten.html`, `/zahlen.html`: Anmeldung per Mail-Code für Wolfgang und
das Team, kein Link mehr, der weitergegeben werden kann. Der Hausschlüssel
bleibt als zweite Schranke im Dienst (`HAUS_TOKEN`), wird aber nach dem
Access-Start rotiert.

---

## 5. Was am 22.09. geprüft wurde (Probe-Dienst, Daten bleiben drin)

Zehn Testkunden (`TEST Anna Huber` … `TEST Jakob Winder`) haben über die
API des Probe-Dienstes den kompletten Weg gemacht – **119 Schritte, alle mit
dem erwarteten Ergebnis**:

- **Reservierungen**: 31 Buchungen über zwei Wochen (23.09.–02.10.), alle
  Zeiten 11:30–13:30, 2–8 Personen, mit Wünschen; Doppelklick erkannt;
  Samstag, Vergangenheit, ohne Kontakt abgewiesen. **Neu seit heute:**
  20:00 Uhr wird abgewiesen (`uhrzeit`) – vorher angenommen.
- **Voll**: In beiden Diensten ist die Tischautomatik aus; jede
  Onlineanfrage wird „von Hand“ angenommen (16 × 8 Personen um 12:00 gingen
  durch). Voll entsteht nur, wenn der Wirt den Tag voll meldet oder eine
  Zeit sperrt – beides geprüft: 01.10. voll → Gast bekommt `voll`, trägt
  sich auf die Mittags-Warteliste ein; 30.09. 12:00–12:45 gesperrt →
  12:15 `voll`, 13:00 geht. Siehe Abschnitt 6.
- **Takeaway**: 11 Bestellungen (heute und vorbestellt bis 29.09.),
  Status-Abfrage per Schlüssel, Wirt setzt „abgeholt“; Samstag, leerer Korb,
  14:30 Uhr abgewiesen. **Neu seit heute:** 12 Portionen → `zu_viel`
  (vorher still auf 10 gekürzt).
- **Event-Warteliste**: 13 Einträge auf 8 ausverkaufte Wege (Kulis, Luis,
  dinner & comedy ×2, rock4 beide Wege, Ulli Troy, Landert), Mehrfachwahl,
  Doppelter erkannt (`schon`), buchbarer Weg abgelehnt (`buchbar`), Mail an
  einen Eintrag (Probe: „nicht eingerichtet“), Notiz, „hat gebucht“,
  „Jetzt nachsehen“ liest 8 Abende beim Ticketdienst.
- **Wirt**: Ankunft/Abgang, Laufkunde, Tagesabsage 25.09. (4 abgesagt, ein
  Gast ohne Mail zum Anrufen gelistet), Küchenzettel, Monatszahlen.
- **Newsletter**: Mittagskarte und Termine getrennt, ohne Einwilligung
  abgelehnt; das Takeaway-Häkchen ist seit PR #239 angeschlossen.
- **Oberfläche**: Startseite füllt bei 1440×900 und 1280×720 genau einen
  Bildschirm (Knöpfe bei 828 bzw. 666 px), am iPhone rastet jedes Kapitel
  an der Oberkante ein (PR #238). Wirt-Ansicht am Laptop: Tag, Karte,
  Warteliste, Haus – alle Reiter mit den Testdaten.

Zum Nachsehen: `…/wirt.html?probe=1` mit dem Hausschlüssel, Tage 23.09.
bis 02.10.; Reiter „warteliste“.

---

## 6. Eine Entscheidung, die vor dem Scharfschalten fällt

**Tischautomatik aus = keine Obergrenze online.** Heute nimmt der Dienst
jede Onlinereservierung an, solange der Wirt den Tag nicht voll meldet. Das
ist gewollt („Wolfgang teilt selbst ein“) und funktioniert, verlangt aber,
dass jemand die Wirt-Ansicht im Blick hat: die Anzeige „Auslastung“ im Reiter
Haus zeigt die Plätze (99 laut Stand), und beim Erreichen meldet der Wirt den
Tag mit einem Knopf voll. Wer lieber automatisch bremsen will, schaltet die
Automatik in `einrichten.html` ein – dann rechnet der Dienst mit Tischen und
dem Deckel je Zeitfenster (`maxCoversPerSlot` = 10 im Plan). Empfehlung: die
ersten zwei Wochen von Hand, dann entscheiden.
