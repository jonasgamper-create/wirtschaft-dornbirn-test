# Damit die Mails ankommen: Absenderdomain beglaubigen

Stand 11. November 2026.

**Worum es geht.** Der Dienst verschickt Bestätigungen, Absagen, den
Tageszettel und die Wartelisten-Mails über Brevo. Absender ist heute die
private Adresse von Jonas, ein Postfach bei seinem privaten Mailanbieter. Das ist die Ursache
aller Zustellprobleme. Die Einträge in der DNS-Zone stehen inzwischen für
`wirtschaft-dornbirn.at` und `eugen.family` (Abschnitt 4); es fehlen
*Authenticate* und ein API-Schlüssel aus dem Brevo-Konto des Hauses, erst
dann wird der Absender umgestellt (Abschnitt 5).

---

## 1. Was heute wirklich passiert

Aus dem Versandprotokoll von Brevo, abgefragt am 20.09.2026:

| Tag | Was |
|---|---|
| 08.09. | zwei Mails zugestellt, zwei abgewiesen: `554 5.7.1 Spam message rejected` |
| 09.09. | zwei abgewiesen |
| 10.09. | Tageszettel abgewiesen |
| 11.09. | zugestellt |
| 14.–17.09. | Tageszettel zugestellt, am 17.09. erst nach `451 4.7.1 Try again later` |
| **18.09.** | **kein Versand** — der Tageszettel vom Freitag fehlt (siehe Abschnitt 6) |

Das ist kein Zufallsmuster, sondern das typische Bild eines Absenders ohne
Beglaubigung: mal durch, mal als Spam abgewiesen, je nach Tagesform des
Empfängers.

### Warum

Der Anbieter dieser Adresse sagt im DNS ausdrücklich, wer in seinem Namen
senden darf (sinngemäß, ohne den Anbieter zu nennen – das Repository ist
öffentlich):

```
<anbieter>         TXT  "v=spf1 include:<nur die eigenen Server> -all"
_dmarc.<anbieter>  TXT  "v=DMARC1; p=reject; …"
```

`-all` heißt: alles andere ist gefälscht. `p=reject` heißt: dann bitte
abweisen. Brevo gehört nicht zu diesem Anbieter, also verstößt jede Mail
gegen beide Regeln. Dass überhaupt etwas ankommt, liegt nur daran, dass der
Anbieter bei Post an die eigenen Kunden manchmal ein Auge zudrückt.

**Der wichtigere Teil:** Gästemails gehen meist nicht an diesen Anbieter, sondern an Gmail, GMX,
Outlook. Die halten sich an `p=reject` ohne Ausnahme. Eine
Reservierungsbestätigung oder eine Wartelisten-Mail an einen Gast mit
Gmail-Adresse hat so kaum eine Chance.

### Was es NICHT ist

Es hat **nichts** mit dem Umzug der Domain zu Cloudflare zu tun. Das hatte ich
vorher falsch dargestellt. Die Beglaubigung des Absenders ist unabhängig
davon, wo die Webseite liegt — sie braucht nur vier Einträge in der
DNS-Zone, egal bei wem die liegt.

---

## 2. Die Lösung in einem Satz

Nicht mehr von der privaten Adresse senden, sondern als `@wirtschaft-dornbirn.at`, und
diese Domain bei Brevo beglaubigen.

---

## 3. Was schon erledigt ist

Am 20.09.2026 im Brevo-Konto **von Jonas** angelegt (überholt, siehe unten):

| | |
|---|---|
| Domain | `wirtschaft-dornbirn.at` |
| Kennung bei Brevo | `6ab039cd4425575044081d0e` |
| Stand | angelegt, nicht beglaubigt |

Brevo hat dazu die vier Einträge ausgegeben, die unten stehen. Kontoeigen
ist davon nur der `brevo-code`; die DKIM- und DMARC-Einträge hängen an der
Domain und stimmen mit denen überein, die heute in der Zone stehen.

**Seit Anfang November gilt das Brevo-Konto des Hauses.** Sarah hat es
angelegt und mit Markus die Einträge beider Domains bei Hetzner gesetzt.
Der `brevo-code` in der Zone ist auf `wirtschaft-dornbirn.at` und
`eugen.family` gleich – also ein Konto, das des Hauses.

Abfragen lässt sich der Stand über den Dienst – aber nur für das Konto,
dessen Schlüssel im Dienst steht. Bis der Schlüssel des Hauses hinterlegt
ist (Abschnitt 5), zeigt die Abfrage das Konto von Jonas, nicht das des
Hauses. Maßgeblich für *Authenticate* ist die Anzeige im Brevo-Konto des
Hauses.

```bash
curl -s -H "x-haus-token: <Hausschlüssel>" \
  https://wirtschaft-reservierung.jonas-gamper.workers.dev/api/mail/domain
```

---

## 4. Die vier DNS-Einträge

Sie gehören in die Zone von `wirtschaft-dornbirn.at`. Die liegt bei **Hetzner**
(Nameserver `oxygen.ns.hetzner.com`, `helium.ns.hetzner.de`,
`hydrogen.ns.hetzner.com`).

**Nachgeprüft am 10.11.2026 von außen:** gesetzt – für
`wirtschaft-dornbirn.at` und `eugen.family` (Sarah mit Markus), beide im
Brevo-Konto des Hauses: DKIM `brevo1`/`brevo2._domainkey`, `brevo-code`,
SPF und `_dmarc` wie unten. MX `10 mail.<domain>` und der A-Eintrag von
`mail.` sind unberührt. Der `brevo-code` unten ist der alte aus Jonas’
Konto; der gültige steht live in der Zone.
Falls Brevo zusätzlich eine Marken-Subdomain verlangt: `post`, nie `mail`
(dort läuft der Hetzner-Mailserver, Ziel des MX). Für die Beglaubigung
genügen die gesetzten Einträge.

| Nr. | Typ | Name | Wert |
|---|---|---|---|
| 1 | CNAME | `brevo1._domainkey` | `b1.wirtschaft-dornbirn-at.dkim.brevo.com` |
| 2 | CNAME | `brevo2._domainkey` | `b2.wirtschaft-dornbirn-at.dkim.brevo.com` |
| 3 | TXT | `@` (die Domain selbst) | `brevo-code:12ab66d15bb7d93634c32a1a25ca728d` |
| 4 | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

**Zu Nummer 4:** Vorher stand dort `v=DMARC1; p=none;`. Der neue Eintrag hat
ihn ersetzt und ändert an der Strenge nichts (`p=none` bleibt) — er fügt nur
die Adresse hinzu, an die Berichte gehen.

### SPF ergänzt

Vorher stand dort:

```
wirtschaft-dornbirn.at  TXT  "v=spf1 a mx ~all"
```

Gesetzt ist jetzt (nachgeprüft am 10.11.2026, auf beiden Domains gleich):

```
wirtschaft-dornbirn.at  TXT  "v=spf1 a mx include:spf.brevo.com ~all"
```

Das `a mx` bleibt unangetastet, der hauseigene Mailserver
(`mail.wirtschaft-dornbirn.at`) sendet unverändert weiter. Es kommt nur Brevo
dazu. **Wichtig:** Es darf immer nur **ein** SPF-Eintrag existieren — den
bestehenden ändern, keinen zweiten anlegen.

---

## 5. Die Schritte, in dieser Reihenfolge

1. **Die vier Einträge setzen** (Hetzner DNS-Konsole, oder wer immer die Zone
   verwaltet) – **erledigt** für beide Domains (Sarah mit Markus).
2. **Warten**, bis sie sichtbar sind – **erledigt**, sie sind sichtbar
   (nachgeprüft am 10.11.2026). Gegenprobe:
   ```bash
   dig +short CNAME brevo1._domainkey.wirtschaft-dornbirn.at
   dig +short TXT wirtschaft-dornbirn.at
   ```
3. **Brevo prüfen lassen** — im Brevo-Konto **des Hauses** (Sarah) unter
   *Senders, Domains & Dedicated IPs* → *Domains* → *Authenticate*, für beide
   Domains. **Noch offen.** Über den Dienst lässt sich das erst nach Schritt 4
   nachsehen (alle vier auf `status: true`); bis dahin zeigt er das Konto
   von Jonas.
4. **Den Schlüssel des Hauses hinterlegen.** Im Brevo-Konto des Hauses unter
   *SMTP & API* einen API-Schlüssel erzeugen; Jonas hinterlegt ihn gemeinsam
   mit dem Haus als Geheimnis `BREVO_KEY` – nicht per Mail oder Chat:
   ```bash
   cd server
   npx wrangler@4 secret put BREVO_KEY
   ```
   Grund: Der Dienst sendet heute über das Brevo-Konto von Jonas, und dort
   sind die Domains des Hauses nicht beglaubigt. Ein zweiter Benutzer im
   Brevo-Konto kostet laut Brevo-Preisliste 9 € im Monat – deshalb ein
   Schlüssel statt eines Benutzerzugangs.
5. **Absender umstellen.** Erst danach, keinesfalls vorher:
   ```bash
   cd server
   printf '%s' "willkommen@wirtschaft-dornbirn.at" | npx wrangler@4 secret put BREVO_ABSENDER
   ```
   Die Adresse ist entschieden: `willkommen@` wird der Hausabsender, dazu
   kommen die Absender je Zweck (`ABSENDER_SERVICE`, `ABSENDER_WARTELISTE`,
   `ABSENDER_KULTURHAUS`, `EVENTS_ABSENDER` in `server/wrangler.jsonc`;
   Werte in `mailadressen-entscheidung.md`). Umgekehrt – Absender vor
   Beglaubigung und Schlüssel – verschickt Brevo gar nichts mehr.
6. **Probe.** Eine Reservierung über die Seite anlegen und nachsehen, ob die
   Bestätigung als `delivered` verbucht wird:
   ```bash
   curl -s -H "x-haus-token: <Hausschlüssel>" \
     "https://wirtschaft-reservierung.jonas-gamper.workers.dev/api/mail/pruefung?email=<Adresse>"
   ```

Die Schritte 1 und 2 sind erledigt. Schritt 3 geht nur im Brevo-Konto des
Hauses, Schritt 4 nur gemeinsam mit dem Haus; den Rest kann der Dienst
selbst.

---

## 6. Nebenbefund: der Tageszettel vom 18.09. fehlt

Beim Durchsehen des Versandprotokolls ist aufgefallen: seit dem 17.09. um
08:03 hat der Dienst **keine einzige Mail** mehr verschickt. Der Tageszettel
vom Freitag, 18.09., fehlt, ebenso der Wochenbericht vom selben Tag.

Die wahrscheinliche Ursache: Am 17.09. wurde der Probe-Dienst eingerichtet.
Die Gratisstufe erlaubt fünf Cron-Trigger **je Konto**, und der erste Versuch
endete mit „only partially updated“. Offenbar hat das die Zeitpläne des
echten Dienstes mitgerissen.

Seit dem Deploy vom 20.09. sind alle fünf wieder angelegt und bestätigt:

```
schedule: 15 5 * * 1
schedule: 15 6 * * 1
schedule: */15 8-12 * * 1-5
schedule: 0 4,5,6,7,10,11 * * *
schedule: 0 13,14,18,19 * * 5
```

**Lehre:** Nach jedem Deploy die Ausgabe auf „partially“ prüfen — und auf die
Liste der `schedule:`-Zeilen. Fehlt eine, laufen Tageszettel, Erinnerungen
oder Berichte still nicht mehr. Der erste Tageszettel, der wieder kommen
muss, ist der von Montag, 21.09., um 08:00.

---

## 7. Wer was tun kann

| Schritt | Wer |
|---|---|
| Domain bei Brevo anlegen | erledigt – beide Domains, im Brevo-Konto des Hauses (von Sarah angelegt) |
| DNS-Einträge setzen | erledigt – Sarah mit Markus, bei Hetzner |
| *Authenticate* | Sarah, im Brevo-Konto des Hauses |
| API-Schlüssel des Hauses als `BREVO_KEY` | Jonas, gemeinsam mit dem Haus |
| Absender umstellen | der Dienst, nach Beglaubigung und Schlüssel |
| Probe fahren | der Dienst |

Der Zugang zur Zone ist da; eine Ausweichdomain braucht es nicht.
