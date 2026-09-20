# Damit die Mails ankommen: Absenderdomain beglaubigen

Stand 20. September 2026.

**Worum es geht.** Der Dienst verschickt Bestätigungen, Absagen, den
Tageszettel und die Wartelisten-Mails über Brevo. Absender ist heute
`jonas.gamper@aon.at`. Das ist die Ursache aller Zustellprobleme, und es ist
in einer halben Stunde behoben — aber nur von jemandem, der an die DNS-Zone
von `wirtschaft-dornbirn.at` kommt.

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

`aon.at` sagt im DNS ausdrücklich, wer in seinem Namen senden darf:

```
aon.at         TXT  "v=spf1 include:aspf.a1.net -all"
_dmarc.aon.at  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc-reports@a1.net"
```

`-all` heißt: alles andere ist gefälscht. `p=reject` heißt: dann bitte
abweisen. Brevo gehört nicht zu A1, also verstößt jede Mail gegen beide
Regeln. Dass überhaupt etwas ankommt, liegt nur daran, dass A1 bei Post an
die eigenen Kunden manchmal ein Auge zudrückt.

**Der wichtigere Teil:** Gästemails gehen nicht an A1, sondern an Gmail, GMX,
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

Nicht mehr als `@aon.at` senden, sondern als `@wirtschaft-dornbirn.at`, und
diese Domain bei Brevo beglaubigen.

---

## 3. Was schon erledigt ist

Am 20.09.2026 im Brevo-Konto angelegt:

| | |
|---|---|
| Domain | `wirtschaft-dornbirn.at` |
| Kennung bei Brevo | `6ab039cd4425575044081d0e` |
| Stand | angelegt, **noch nicht beglaubigt** — die DNS-Einträge fehlen |

Brevo hat dazu die vier Einträge ausgegeben, die unten stehen. Sie sind
kontoeigen: kein anderes Brevo-Konto hat dieselben.

Abfragen lässt sich der Stand jederzeit über den Dienst:

```bash
curl -s -H "x-haus-token: <Hausschlüssel>" \
  https://wirtschaft-reservierung.jonas-gamper.workers.dev/api/mail/domain
```

---

## 4. Die vier DNS-Einträge

Sie gehören in die Zone von `wirtschaft-dornbirn.at`. Die liegt bei **Hetzner**
(Nameserver `oxygen.ns.hetzner.com`, `helium.ns.hetzner.de`,
`hydrogen.ns.hetzner.com`).

| Nr. | Typ | Name | Wert |
|---|---|---|---|
| 1 | CNAME | `brevo1._domainkey` | `b1.wirtschaft-dornbirn-at.dkim.brevo.com` |
| 2 | CNAME | `brevo2._domainkey` | `b2.wirtschaft-dornbirn-at.dkim.brevo.com` |
| 3 | TXT | `@` (die Domain selbst) | `brevo-code:12ab66d15bb7d93634c32a1a25ca728d` |
| 4 | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com` |

**Zu Nummer 4:** Es gibt dort schon einen Eintrag, nämlich `v=DMARC1; p=none;`.
Der neue ersetzt ihn und ändert an der Strenge nichts (`p=none` bleibt) — er
fügt nur die Adresse hinzu, an die Berichte gehen. Wer das nicht will, lässt
Nummer 4 weg; die Beglaubigung geht auch ohne.

### Empfohlen, nicht zwingend: SPF ergänzen

Heute steht dort:

```
wirtschaft-dornbirn.at  TXT  "v=spf1 a mx ~all"
```

Besser wäre:

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
   verwaltet). Dauer: fünf Minuten.
2. **Warten**, bis sie sichtbar sind. Meist Minuten, laut Hetzner bis zu einer
   Stunde. Gegenprobe:
   ```bash
   dig +short CNAME brevo1._domainkey.wirtschaft-dornbirn.at
   dig +short TXT wirtschaft-dornbirn.at
   ```
3. **Brevo prüfen lassen** — im Konto unter *Senders, Domains & Dedicated IPs*
   → *Domains* → *Authenticate*. Oder über den Dienst nachsehen, ob alle vier
   auf `status: true` stehen.
4. **Absender umstellen.** Erst danach, keinesfalls vorher:
   ```bash
   cd server
   printf '%s' "willkommen@wirtschaft-dornbirn.at" | npx wrangler@4 secret put BREVO_ABSENDER
   ```
   Die Adresse ist ein Vorschlag — sie steht schon als Kontaktadresse in der
   Push-Einrichtung. `reservierung@` oder `hallo@` gingen genauso; sie muss
   nicht als Postfach existieren, aber es ist besser, wenn Antworten
   irgendwo ankommen.
5. **Probe.** Eine Reservierung über die Seite anlegen und nachsehen, ob die
   Bestätigung als `delivered` verbucht wird:
   ```bash
   curl -s -H "x-haus-token: <Hausschlüssel>" \
     "https://wirtschaft-reservierung.jonas-gamper.workers.dev/api/mail/pruefung?email=<Adresse>"
   ```

Schritt 1 ist der einzige, der nicht aus diesem Projekt heraus geht. Alles
andere kann der Dienst selbst.

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
| Domain bei Brevo anlegen | erledigt |
| DNS-Einträge setzen | **wer Zugang zur Zone hat** — laut `docs/adresse.md` gehört die Domain dem Kunden |
| Beglaubigung prüfen | der Dienst, auf Zuruf |
| Absender umstellen | der Dienst, nach der Beglaubigung |
| Probe fahren | der Dienst |

Wenn der Zugang zur Zone nicht zu bekommen ist, gibt es genau eine
Ausweichmöglichkeit: eine eigene Domain, die das Haus selbst hält, und von
dort senden. Das kostet ein paar Euro im Jahr und dieselben vier Einträge —
nur eben in einer Zone, in die man hineinkommt.
