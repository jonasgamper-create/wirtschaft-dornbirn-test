# Sicherheitsbaseline für Produktionskunden

## Zugriff

- Private Repositories und getrennte Vercel-Projekte pro Kunde.
- Persönliche Konten, MFA/Passkeys, minimale Rollen und jährliche Berechtigungsprüfung.
- Geschützter `main`-Branch, verpflichtender Review und keine Secrets im Git-Verlauf.
- Gastgeber-Cockpit ausschließlich hinter serverseitiger Authentifizierung,
  Rollen, CSRF-Schutz, Rate Limits, Audit-Log und sicherem Session-Handling.

## Deployment

- Pull-Request-Preview auf Vercel; Produktion nur über freigegebenen Merge.
- Test- und Produktionsschlüssel getrennt; Secrets ausschließlich in Vercel/Secret Manager.
- Frankfurt (`fra1`) für konfigurierbare Compute-Funktionen prüfen. Das globale
  CDN und Anbieter-Subprozessoren sind trotzdem in der Datenschutzprüfung zu dokumentieren.
- GitHub Pages ist nur Preview/Test, nicht Produktionshosting für kommerzielle Transaktionen.

## Betrieb

- Dependabot, Secret Scanning, Push Protection, Dependency-Review und regelmäßige Updates.
- Verschlüsselte Backups, getestete Wiederherstellung und dokumentierter Rollback.
- Monitoring ohne unnötige personenbezogene Daten.
- Incident-Prozess inklusive Bewertung und Meldung einer Datenschutzverletzung.

## KI-Regel

Keine realen Gästedaten, Zahlungsdaten, Passwörter oder Schlüssel in Prompts.
KI-Output wird vor Veröffentlichung fachlich, rechtlich, sprachlich und technisch geprüft.

