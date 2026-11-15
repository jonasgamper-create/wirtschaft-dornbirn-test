# Mailversand selbst umstellen · Anleitung für Sarah

Stand 15. November 2026. Am besten ausdrucken oder auf einem zweiten Gerät öffnen.

**Worum es geht.** Die automatischen Mails der Webseite – Reservierungs- und
Takeaway-Bestätigungen, Warteliste, Tageszettel – gehen heute noch über das
Brevo-Konto von Jonas hinaus, mit seiner privaten Adresse als Absender.
Deshalb landen sie bei Gästen oft im Spam. Mit dieser Anleitung stellst du
den Versand auf euer eigenes Brevo-Konto um, das du Anfang November angelegt
hast. Danach kommt jede Mail von eurer eigenen Adresse, zum Beispiel
`service@wirtschaft-dornbirn.at`.

**Brauchst du Jonas dafür? Nein.** Alles hier machst du selbst: zuerst in
eurem Brevo-Konto, dann in der Wirt-Ansicht. Den Schlüssel schickst du
niemandem – auch nicht an Jonas –, du fügst ihn nur in der Wirt-Ansicht ein.

**Es kann nichts kaputtgehen.** Der Dienst stellt erst um, wenn er alles
geprüft hat und du die Testmails gesehen hast. Bis dahin läuft alles wie
bisher. Und mit einem Knopf geht es jederzeit zurück.

**Dauer:** etwa 30 Minuten, dazu vielleicht Wartezeit bei Brevo (Abschnitt 6).
**Kosten:** keine. Brevo bleibt kostenlos bis 300 Mails am Tag; ein voller Tag
im Haus braucht 40 bis 80.

---

## 1 Was du brauchst

- Die Anmeldung für euer **Brevo-Konto** – und das Postfach, an das Brevo
  seine Bestätigungscodes schickt (die Adresse des Kontos).
- Ein Gerät, auf dem die **Wirt-Ansicht** angemeldet ist (Handy, Tablet oder
  Laptop).
- Ein Postfach für die **Testmails**, in das du gleich hineinschauen kannst,
  zum Beispiel `veranstaltungen@wirtschaft-dornbirn.at`.

Brevo zeigt die Menüs je nach Konto auf Deutsch oder auf Englisch. Diese
Anleitung nennt deshalb beides: **Einstellungen** (Settings). Die Menüs
findest du in Brevo unten links unter **Einstellungen**, in manchen Konten
oben rechts im Konto-Menü.

## 2 Schritt 1 – beide Domains in Brevo beglaubigen

Brevo verschickt mit eurer Adresse nur, wenn es sicher weiß, dass die Domain
euch gehört. Die Einträge dafür hast du mit Markus bei Hetzner gesetzt. Jetzt
fehlt nur noch der Klick in Brevo. **Bei Hetzner änderst du nichts.**

1. In Brevo: **Einstellungen** (Settings) → **Absender, Domains, IPs**
   (Senders, Domains, IPs) → **Domains**.
2. Neben `wirtschaft-dornbirn.at` auf **Authentifizieren** (Authenticate)
   klicken.
3. Fragt Brevo, wie: **Domain selbst authentifizieren** (Authenticate the
   domain yourself) wählen – nicht „automatisch“. Automatisch wollte Brevo
   eure Zugangsdaten von Hetzner und würde den bestehenden DMARC-Eintrag
   ersetzen.
4. Brevo zeigt die Einträge an. Sie stehen schon bei Hetzner: nichts
   abschreiben, nichts ändern. Ganz unten auf **Diese E-Mail-Domain
   authentifizieren** (Authenticate this email domain) klicken.
5. Steht danach **Authentifiziert** (Authenticated): fertig. Kommt „Die
   Domain ist noch nicht authentifiziert“: in ein paar Stunden noch einmal
   klicken – Brevo braucht manchmal bis zu 48 Stunden.
6. Dasselbe für `eugen.family`.

**Fragt Brevo nach einer Marken-Subdomain** (branded subdomain): diesen
Schritt überspringen, ihr braucht sie nicht. Muss doch ein Name hinein, dann
`post` – **nie `mail`**. Unter `mail.` läuft euer Postfach bei Hetzner; das ist
der Hinweis von Markus.

## 3 Schritt 2 – einen Schlüssel für die Webseite erzeugen

Der Schlüssel (API-Schlüssel) erlaubt der Webseite, über euer Brevo-Konto
Mails zu verschicken. Er ist geheim wie ein Passwort.

1. In Brevo: **Einstellungen** → **SMTP & API** → **API-Schlüssel & MCP**
   (API Keys & MCP).
2. **Einen neuen API-Schlüssel generieren** (Generate a new API key)
   klicken.
3. Brevo schickt einen 6-stelligen Code an die Adresse des Kontos: Code
   eingeben, **Bestätigen** (Verify).
4. Als Namen eintragen: `Webseite wirtschaft-dornbirn`.
5. Gültigkeit: **Kein Ablaufdatum** (No expiration). Brevo schaltet einen
   Schlüssel ab, der 90 Tage lang nicht benutzt wurde – das passiert hier
   nicht, der Tageszettel geht jeden Werktag hinaus.
6. Fragt Brevo nach dem **Zugriff** (Access): **Eingeschränkt** (Restricted)
   wählen, dann bei **Transactional email** auf **All** (Alle) und bei
   **Account** auf **Read** (Lesen). Alles andere bleibt auf **None** (Keine).
   Fragt Brevo nicht danach, ist das genauso in Ordnung.
7. Den Schalter **MCP-Server-API-Schlüssel erstellen** (Create MCP server API
   key) **nicht** einschalten. Er macht daraus einen Schlüssel für
   KI-Programme, der für die Webseite nicht taugt.
8. **Generieren** (Generate) klicken und den Schlüssel **kopieren**. Er
   beginnt mit `xkeysib-`. Brevo zeigt ihn nur dieses eine Mal.

Den Schlüssel nicht in eine Mail, einen Chat oder ein Dokument einfügen und
nicht abfotografieren. Am besten gleich mit Schritt 3 weitermachen. Geht er
verloren: einfach einen neuen erzeugen und den alten in Brevo löschen.

## 4 Schritt 3 – den Schlüssel in der Wirt-Ansicht prüfen lassen

1. Die Wirt-Ansicht öffnen, unten auf den Reiter **haus** tippen und ganz
   nach unten gehen. Dort **Mailversand – euer Brevo-Konto** aufklappen.

![Vor dem Umstellen: ganz unten im Reiter haus. Der Kasten sagt, dass die Mails noch über das Konto von Jonas gehen.](bilder/mailversand/1-vorher.jpg)

2. Bei **API-Schlüssel aus eurem Brevo-Konto** den Schlüssel einfügen.
3. Bei **Testmails an** das Postfach eintragen, in das du gleich
   hineinschaust.
4. **Prüfen und Testmails schicken** drücken. Das dauert ein paar Sekunden.
   Beim Einfügen ist der Schlüssel kurz lesbar; das Feld wird beim Drücken
   sofort geleert – danach steht er nirgends mehr auf dem Gerät, und der
   Browser bietet auch nicht an, ihn zu speichern.

Der Dienst prüft jetzt: Ist der Schlüssel gültig? Sind beide Domains
beglaubigt? Dann schickt er von jeder eurer fünf Absenderadressen eine
Testmail. **Am laufenden Versand ändert sich dabei noch nichts.**

![Nach dem Prüfen: jede Zeile ein bestandener Schritt. Darunter der Knopf zum Umstellen.](bilder/mailversand/2-geprueft.jpg)

Steht eine Zeile in Rot, ist etwas noch nicht in Ordnung. Darunter steht,
was zu tun ist; dasselbe erklärt Abschnitt 6.

## 5 Schritt 4 – Testmails ansehen und umstellen

1. Im Postfach nachsehen, bitte auch im Spam-Ordner. Es müssen **fünf
   Testmails** da sein, Betreff „Testmail 1 von 5 – Absender …“ bis
   „Testmail 5 von 5 – Absender …“.
2. Bei jeder Mail prüfen, ob als **Absender genau die Adresse aus dem
   Betreff** steht: `willkommen@`, `service@` und
   `veranstaltungen@wirtschaft-dornbirn.at`, `tickets@` und
   `uri@eugen.family`. Als Name steht bei allen „Wirtschaft Dornbirn“ – so wie
   später bei den echten Mails.
3. Stimmt alles: in der Wirt-Ansicht **Alle Testmails sind da – jetzt
   umstellen** drücken. Die Prüfung gilt zwei Stunden; danach einfach noch
   einmal prüfen lassen.

![Umgestellt: der Kasten wird grün und nennt euer Brevo-Konto und alle Absender.](bilder/mailversand/3-umgestellt.jpg)

**Fertig.** Ab jetzt gehen alle automatischen Mails über euer Brevo-Konto,
jede von ihrer eigenen Adresse:

| Mail | Absender |
| --- | --- |
| Reservierung, Absage, Takeaway, Warteliste Mittagstisch | `service@wirtschaft-dornbirn.at` |
| Warteliste eines Abends in der „wirtschaft“ | `veranstaltungen@wirtschaft-dornbirn.at` |
| Warteliste eines Abends im Kulturhaus | `tickets@eugen.family` |
| Terminliste („Bleibt auf dem Laufenden“) | `uri@eugen.family` |
| alles andere: Tageszettel, Wochenbericht, Mittagskarte, Anfragen | `willkommen@wirtschaft-dornbirn.at` |

Antwortet ein Gast auf eine Mail, landet seine Antwort beim jeweiligen
Absender. Nur die Antwort auf die Bestätigung einer Anfrage (Locations,
Agentur) geht an `uri@eugen.family`.

**Zum Schluss, einmal: die IP-Sperre in Brevo ausschalten.** Brevo sperrt
nach 30 Tagen von selbst alle Aufrufe von unbekannten Internetadressen. Die
Webseite läuft bei Cloudflare, und dort wechseln diese Adressen – die Sperre
würde den Versand eines Tages still anhalten.

1. In Brevo: **Einstellungen** → **Sicherheit** (Security) → **Autorisierte
   IPs** (Authorized IPs).
2. Unter **Blockieren nicht autorisierter IP-Adressen** (Blocking
   unauthorized IP addresses) die Zeile **API-Schlüssel** (API keys)
   ansehen.
3. Steht dort **Deaktiviert** (Deactivated): nichts tun. Steht dort
   **Aktiviert** (Activated): **Deaktivieren für API** (Deactivate for API)
   und dann **Blockierung deaktivieren** (Deactivate blocking) klicken.
4. Schickt Brevo später eine Mail, dass eine IP-Adresse gesperrt wurde: in
   der Mail **die automatische IP-Sperre deaktivieren** wählen.

Das ist unbedenklich: Der Schlüssel liegt nur im Dienst der Webseite und
kommt dort nie wieder heraus.

## 6 Wenn etwas nicht klappt

Die Wirt-Ansicht sagt in Rot, woran es liegt. Am laufenden Versand hat sich
dann nichts geändert.

![Beispiel: Brevo hat den Versand im Konto noch nicht freigeschaltet. Die rote Zeile sagt, wo es hängt, darunter steht, was zu tun ist.](bilder/mailversand/4-fehler.jpg)

| Was die Wirt-Ansicht meldet | Was du tust |
| --- | --- |
| Versand im Konto noch nicht freigeschaltet | Bei neuen Konten schaltet Brevo den Versand über die Webseite erst auf Anfrage frei. Die Vorlage unten an den Brevo-Support schicken. Die Antwort kommt meist in ein bis zwei Werktagen, danach noch einmal prüfen. |
| … ist noch nicht beglaubigt | Schritt 1 für diese Domain, bis zu 48 Stunden warten, dann noch einmal prüfen. |
| … steht nicht in eurem Brevo-Konto | In Brevo unter Domains die Domain hinzufügen (Add a domain) und Schritt 1 machen. Die Einträge bei Hetzner stehen schon. |
| Brevo kennt den Schlüssel nicht | Den Schlüssel ganz neu kopieren – oder einen neuen erzeugen (Schritt 2). |
| Das ist ein SMTP-Schlüssel | Es braucht einen API-Schlüssel aus „API-Schlüssel & MCP“, keinen SMTP-Schlüssel (Schritt 2). |
| Dem Schlüssel fehlen Rechte | Beim Schlüssel „Transactional email“ auf „All“ stellen oder einen neuen erzeugen (Schritt 2, Punkt 6). |
| Absender nicht angenommen | In Brevo nachsehen, ob die Domain beglaubigt ist. Ist sie es, die Adresse unter **Absender, Domains, IPs** → **Absender** (Senders) → **Absender hinzufügen** (Add a sender) anlegen. |
| IP-Sperre bei Brevo | Die IP-Sperre ausschalten (Ende von Abschnitt 5), dann noch einmal prüfen. |
| Zu viele Versuche | Eine Stunde warten – jede Prüfung verschickt fünf Mails. |
| Konto bei Brevo gesperrt oder in Prüfung | In Brevo nachsehen; meist erklärt eine Mail von Brevo, warum. Sonst den Brevo-Support fragen. |
| Inzwischen wurde neu geprüft | Jemand hat (vielleicht auf einem anderen Gerät) noch einmal geprüft. Die neuen Testmails ansehen und dann umstellen. |
| Eine Testmail fehlt oder hat einen falschen Absender | Nicht umstellen, sondern **Abbrechen** drücken – das löscht die Prüfung samt Schlüssel im Dienst. Den Spam-Ordner ansehen und in zehn Minuten noch einmal prüfen. |

**Vorlage für den Brevo-Support.** Du erreichst ihn in Brevo über das
Hilfe-Menü (Fragezeichen) → Support. Dort ein Ticket mit diesem Text anlegen:

> Betreff: Freischaltung des Transaktionsversands über die API
>
> Guten Tag, bitte schalten Sie für unser Konto den Versand von
> Transaktions-E-Mails über die API frei. Unsere Webseite (künftig
> www.wirtschaft-dornbirn.at, derzeit wirtschaft-dornbirn.pages.dev)
> verschickt Bestätigungen für Tischreservierungen, Takeaway-Bestellungen
> und Wartelisten sowie einen täglichen Bericht an uns selbst – etwa 40 bis
> 80 Mails am Tag, keine Werbung. Absender sind willkommen@, service@ und
> veranstaltungen@wirtschaft-dornbirn.at sowie tickets@ und uri@eugen.family;
> beide Domains sind in unserem Konto authentifiziert. Vielen Dank!

## 7 Zurück, Schlüssel wechseln, Sicherheit

**Zurück zum bisherigen Versand.** Kommen nach dem Umstellen Bestätigungen
nicht an, in der Wirt-Ansicht unter **Mailversand** auf **Zurück zum
bisherigen Versand** drücken. Dann gilt sofort wieder der alte Weg, und der
Schlüssel eures Kontos wird aus dem Dienst gelöscht. Später einfach noch
einmal prüfen und umstellen. Gibt es keinen alten Weg mehr (etwa nach dem
Umzug in euer eigenes Cloudflare-Konto), warnt die Wirt-Ansicht vorher: Dann
ginge danach gar keine Mail mehr hinaus.

**Läuft es?** Unter **Mailversand** steht, wann zuletzt erfolgreich
verschickt wurde – und wenn etwas schiefging, was zuletzt nicht geklappt hat.

**Einen Schlüssel wechseln** (zum Beispiel, wenn er in falsche Hände geraten
sein könnte): in Brevo einen neuen erzeugen, in der Wirt-Ansicht unter
**Mailversand** einfügen und **Neuen Schlüssel prüfen**, Testmails ansehen,
umstellen. Danach den alten Schlüssel in Brevo löschen (bei ihm auf die drei
Punkte → API-Schlüssel löschen).

**Sicherheit, kurz:**

- Der Schlüssel geht von Brevo direkt in die Wirt-Ansicht – nie per Mail,
  Chat oder Foto.
- Der Dienst gibt ihn nie wieder heraus. In der Wirt-Ansicht stehen nur seine
  letzten vier Zeichen.
- Ehrlich dazu: Solange der Dienst im Cloudflare-Konto von Jonas läuft,
  könnte, wer dieses Konto verwaltet, technisch an seine Daten – also auch an
  den Schlüssel. Das gilt heute schon für alle Reservierungen. Mit eurem
  eigenen Cloudflare-Konto (offen, siehe Statusblatt) liegt alles bei euch.
- Er steht in keiner Sicherungsdatei. Zieht der Dienst später in euer eigenes
  Cloudflare-Konto um, trägst du ihn dort auf dieselbe Weise noch einmal ein.
- In der Testumgebung lässt sich nichts umstellen, und von dort geht nie eine
  Mail hinaus.

## 8 Auf einen Blick

1. Brevo → Einstellungen → Absender, Domains, IPs → Domains: beide Domains
   **Authentifizieren**, „selbst authentifizieren“, unten „Diese
   E-Mail-Domain authentifizieren“.
2. Brevo → Einstellungen → SMTP & API → API-Schlüssel & MCP: neuen Schlüssel
   generieren (kein Ablaufdatum, Transactional email: All, kein MCP),
   kopieren.
3. Wirt-Ansicht → haus → Mailversand: Schlüssel einfügen, Postfach angeben,
   **Prüfen und Testmails schicken**.
4. Fünf Testmails ansehen, jede mit dem richtigen Absender → **jetzt
   umstellen**.
5. Brevo → Einstellungen → Sicherheit → Autorisierte IPs: bei API-Schlüssel
   die Sperre ausschalten, falls sie an ist.
