# Sicherheitsmodell der Testwebsite

## Geltungsbereich

Diese GitHub-Pages-Website ist eine öffentliche, statische Design- und Funktionsvorschau. Sie ist kein geeignetes System für Passwörter, Zahlungsdaten oder ein produktives Gastgeber-Cockpit.

## Aktueller Schutz

- Keine Analyse-, Marketing- oder Drittanbieter-Skripte in den zentralen Gastseiten.
- Keine Karten-, Bank- oder Zahlungsfelder.
- E-Mail-Anfragen werden nur lokal vorbereitet und erst im E-Mail-Programm des Gastes versendet.
- Im lokalen Gastgeber-Demo werden nur Termin, Uhrzeit, Menge, Tischwunsch und Status gespeichert – keine Namen, E-Mail-Adressen, Telefonnummern oder Freitexte.
- Importierte Demo-Daten werden begrenzt, typisiert und vor HTML-Ausgabe maskiert.
- Content-Security-Policy, restriktive Referrer-Regeln und `noindex` sind in den zentralen Testseiten gesetzt.
- Keine Geheimnisse, API-Schlüssel oder Zugangsdaten dürfen im Repository oder Frontend-Code liegen.

## Verbindliche Leitplanken für Produktion

1. **Zahlung:** ausschließlich über eine Weiterleitung auf eine vom Zahlungsdienstleister gehostete, PCI-DSS-validierte Checkout-Seite. Die Website erfasst nie Kartendaten.
2. **Gastgeber-Zugang:** das Cockpit hinter serverseitiger Anmeldung, MFA und rollenbasierten Berechtigungen betreiben. GitHub Pages bietet dafür keinen geschützten Bereich.
3. **Server:** alle Eingaben serverseitig validieren; CSRF-Schutz, Rate Limits, sichere Sessions, Audit-Logs und definierte Löschfristen einsetzen.
4. **Datenschutz:** nur erforderliche Daten verarbeiten, Zugriffe minimieren, Speicherfristen technisch durchsetzen und Auftragsverarbeitungsverträge mit allen Dienstleistern abschließen.
5. **Betrieb:** HTTPS erzwingen, Domain verifizieren, Abhängigkeiten automatisch prüfen, Secret Scanning und Branch Protection aktivieren sowie Backups und Incident-Abläufe testen.
6. **Rechtstexte:** Impressum, Datenschutzerklärung, Cookie-/Consent-Konzept und Zahlungsinformationen anhand der tatsächlich eingesetzten Dienste rechtlich final prüfen lassen.

## Meldung einer Schwachstelle

Keine sensiblen Details öffentlich als Issue veröffentlichen. Sicherheitsbeobachtungen zunächst vertraulich an `willkommen@wirtschaft-dornbirn.at` mit betroffener URL, reproduzierbaren Schritten und möglicher Auswirkung melden.

## Produktionsfreigabe

Eine Freigabe erfolgt erst, wenn Zahlungsdienstleister, Hosting, Identitätsverwaltung, E-Mail-/Buchungssystem, Datenschutztexte und Löschfristen endgültig feststehen und gemeinsam technisch sowie rechtlich geprüft wurden.
