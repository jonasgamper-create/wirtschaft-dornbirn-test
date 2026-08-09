# Agentur-Betriebsmodell

Dieses Repository ist der Pilot für ein wiederverwendbares Agentursystem. Es ist
kein Produktionsspeicher für Gästedaten.

## Konten und Verantwortlichkeiten

- Eine private GitHub-Organisation mit zwei persönlichen Konten; keine geteilten Logins.
- MFA oder Passkeys für GitHub, Vercel, Domain, Buchungssystem und E-Mail.
- Das Kundenkonto bleibt beim Kunden. Die Agentur kann als Administrator oder
  Dienstleister eingeladen werden.
- Jeder Kunde erhält ein eigenes privates Repository, Vercel-Projekt, Domain-,
  Buchungs- und Analytics-Setup.

## Pull-Request-Ablauf

1. Branch `codex/<kurze-aenderung>` oder `<name>/<kurze-aenderung>`, niemals direkt in `main`.
2. Pull Request mit Ziel, betroffenen Seiten, Datenschutz-/Security-Auswirkung und Testnotiz.
3. Vercel-Preview prüfen: Desktop, Mobile, Tastatur, Reduced Motion, Formulare und Links.
4. Zweite Person gibt frei; erst danach Merge nach `main`.
5. Produktionsdeployment und Rollback werden im Release-Eintrag dokumentiert.

ZIP-Dateien sind nur für Snapshots oder Kundenübergaben gedacht. Die laufende
Zusammenarbeit erfolgt über GitHub, Issues/Projects und Preview-URLs.

## Gemeinsamer Kern, getrennte Daten

Typografie-, Farb-, Motion-, Accessibility- und SEO-Bausteine dürfen geteilt
werden. Kundenspezifische Inhalte, Domains, Umgebungsvariablen, Buchungsdaten,
Rechtsdokumente und Backups bleiben getrennt.

## KI-Arbeit

Prompts, Entscheidungen und freigegebene Textbausteine werden anonymisiert unter
`docs/ai/` dokumentiert. Niemals echte Gästedaten, Zahlungsdaten, Passwörter,
API-Schlüssel oder private Reservierungslisten in einen Prompt geben.

