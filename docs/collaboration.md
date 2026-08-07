# Zusammenarbeit auf zwei Rechnern

## Was ihr jetzt teilen könnt

- **Live-Testseite:** <https://jonasgamper-create.github.io/wirtschaft-dornbirn-test/>
- **GitHub-Projekt:** <https://github.com/jonasgamper-create/wirtschaft-dornbirn-test>

Die Live-Seite ist ein öffentlicher, nicht indexierter Teststand. Sie eignet
sich zum Anschauen und für Review-Kommentare, aber nicht für echte Zahlungen,
Gästedaten oder produktive Reservierungen.

## Empfohlener Arbeitsmodus

1. Das Repository in eine **private GitHub-Organisation** verschieben.
2. Beide Personen verwenden ein eigenes GitHub-Konto; es gibt keinen geteilten
   Login.
3. Beide Konten erhalten nur die benötigte Repository-Rolle und aktivieren
   MFA oder Passkeys.
4. Änderungen entstehen in einem Feature-Branch, zum Beispiel
   `feature/event-landingpage`.
5. Der Branch wird als Pull Request eingereicht. Die zweite Person prüft Inhalt,
   Mobile-Ansicht, Links, Datenschutz und `npm run ci`.
6. Die Freigabe wird gemergt. GitHub Pages aktualisiert danach automatisch die
   Testseite.
7. Für Produktion wird später ein getrenntes Vercel-Projekt mit eigener Domain
   und eigener Freigabe verwendet. Der Teststand bleibt `noindex`.

GitHub ist die einzige Quelle für den Code. ZIP-Dateien sind nur für Snapshots
oder eine Kundenübergabe gedacht. Bilder und Videos gehören in einen geschützten
Drive-Ordner; Passwörter, Zahlungsdaten, Gästelisten und API-Schlüssel gehören
weder in GitHub noch in KI-Chats.

## Claude oder ChatGPT sicher einsetzen

Ein öffentlicher Website-Link gewährt keine Bearbeitungsrechte. Damit Claude
oder ChatGPT Änderungen machen kann, braucht das jeweilige Werkzeug eine eigene,
vom Nutzer autorisierte GitHub-Verbindung **und** das eigene GitHub-Konto muss
Zugriff auf das Repository haben. Es werden keine Zugangsdaten aneinander
weitergegeben.

Der sichere Ablauf ist:

1. Die Person meldet sich mit ihrem eigenen KI-Konto an.
2. Sie verbindet nur das freigegebene Repository beziehungsweise den lokalen
   Klon.
3. Sie beschreibt eine kleine, überprüfbare Änderung und nennt die betroffenen
   Dateien.
4. Das Werkzeug erstellt einen Branch oder einen Pull Request; `main` bleibt
   geschützt.
5. Die andere Person prüft den Diff und die Preview, bevor gemergt wird.

Prompts, Entscheidungen und offene Risiken werden zusätzlich in
`docs/ai/` beziehungsweise GitHub Issues dokumentiert. KI-Output ist ein
Vorschlag und keine rechtliche, redaktionelle oder sicherheitstechnische
Freigabe.

## Rechte und Schutz

- `main` schützen: Pull Request, mindestens eine zweite Prüfung, erfolgreiche
  CI und kein direkter Push.
- Secrets ausschließlich in GitHub Actions Secrets oder Vercel Environment
  Variables speichern.
- Keine personenbezogenen Produktionsdaten in Test-Fixtures, Screenshots oder
  Prompts verwenden.
- Nach jeder Änderung prüfen: `npm run ci`, öffentliche Build-Allowlist,
  Datenschutz-Check und mobile Darstellung.
- Bei Verlust eines Kontos sofort Zugriff widerrufen und Tokens rotieren.

## Was der Kollege erhält

Für eine reine Präsentation genügt der Live-Link. Für gemeinsame Arbeit erhält
er zusätzlich eine Repository-Einladung über seine eigene GitHub-Adresse und
die passende Rolle. Die Einladung wird vom Repository-Eigentümer in GitHub
versendet; sie wird nicht über Chat, ZIP oder unverschlüsselte E-Mail mit
Passwörtern ersetzt.
