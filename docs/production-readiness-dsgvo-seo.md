# Produktionsfreigabe: DSGVO, Sicherheit und Auffindbarkeit

Dieses Dokument trennt technische Maßnahmen von Punkten, die der Betreiber und
eine österreichische Rechtsberatung freigeben müssen. Eine Website kann die
DSGVO nicht allein durch Code garantieren; entscheidend sind auch Anbieter,
Verträge, Zwecke, Speicherfristen und der tatsächliche Betrieb.

## Aktueller Stand des Teststands

- GitHub Pages ist nur ein öffentlicher Preview-Stand.
- Alle ausgelieferten Seiten stehen auf `noindex,nofollow,noarchive`.
- Es werden keine eigenen Analyse-, Werbe- oder Social-Media-Skripte geladen.
- Die Website erfasst keine Kartendaten und hat keinen eigenen Zahlungs-Endpunkt.
- Tisch- und Ticketlinks führen erst nach bewusstem Klick zu den offiziellen
  Anbietern.
- Eventdaten werden aus `site/data/events.json` gelesen und im CI geprüft.
- Veraltete oder nicht verfügbare Eventdaten dürfen keine Verfügbarkeit erfinden.

Diese Eigenschaften bleiben so, bis Inhalt, Anbieter und Recht für die
Produktionsdomain bestätigt sind.

## Vor dem Go-live zwingend klären

### Verantwortlicher und Rechtstexte

- Wolfgang beziehungsweise die Betreiberin/der Betreiber bestätigt Name,
  ladungsfähige Adresse, Firmenbuch-/UID-Daten, Medieninhaber und Kontakt.
- Impressum und Datenschutzerklärung werden auf den tatsächlichen Hosting-,
  Buchungs-, Ticket-, E-Mail- und Analyse-Stack angepasst.
- Für jeden Dienst werden AVV/DPA, Subprozessoren, Drittlandtransfers,
  Löschfristen und Betroffenenprozesse dokumentiert.
- Cookie-/Storage-Inventar und Einwilligungslogik werden nur für tatsächlich
  eingesetzte, nicht technisch notwendige Dienste aktiviert.

### Buchung und Zahlung

- Die Website verarbeitet selbst keine Karten- oder Bankdaten.
- Tickets und Zahlungen bleiben auf der offiziellen, geprüften Checkout-Seite
  des Anbieters.
- Tischreservierungen bleiben beim freigegebenen Reservierungssystem.
- Status wie „ausverkauft“ oder „Warteliste“ wird nur aus einer bestätigten
  Quelle übernommen; bei einem Feed-Fehler wird stattdessen auf die offizielle
  Seite verwiesen.
- Testkäufe, Storno, Rückerstattung, Warteliste und E-Mail-Bestätigung werden
  mit Wolfgang vor der Freigabe durchgespielt.

### Sicherheit und Betrieb

- private Organisation, persönliche Konten, MFA/Passkeys und geschützter
  `main`-Branch
- getrennte Test-/Produktionsschlüssel; keine Secrets im Repository
- Abhängigkeitsprüfung, Secret Scanning, Backups und Wiederherstellungstest
- serverseitige Authentifizierung für jedes Gastgeber-Cockpit; GitHub Pages ist
  dafür nicht geeignet
- dokumentierter Incident- und Widerrufsprozess
- Eigentümer kann Inhalte, Domains, Buchungsdaten und Backups exportieren

## SEO-/GEO-Freigabe

Ein gutes Ranking lässt sich nicht versprechen. Um die Voraussetzungen zu
schaffen, werden vor der Indexierung geprüft:

- eigene Produktionsdomain mit `index,follow`, Canonical, Sitemap und Robots
- verifiziertes Google Business Profile mit identischer Adresse, Telefon,
  Öffnungszeiten und Kategorie
- Search Console und Bing Webmaster Tools beim Betreiber, nicht bei einer
  Einzelperson
- eindeutige Eventseiten mit Datum, Ort, Titel, Preis und offizieller
  Ticket-URL; strukturierte Daten werden nur für sichtbare Inhalte ausgegeben
- lokale Inhalte für Dornbirn und Vorarlberg, echte Fotos mit Nutzungsrechten,
  aussagekräftige Alt-Texte und Open-Graph-Daten
- Core Web Vitals, Tastaturbedienung, Kontrast, `prefers-reduced-motion` und
  mobile Darstellung geprüft
- Messung erst nach freigegebener Consent-/Datenschutzlösung; kein heimliches
  Tracking

Google beschreibt lokale Sichtbarkeit im Kern über **Relevanz, Entfernung und
Bekanntheit**. Strukturierte Daten helfen Suchmaschinen beim Verstehen, ersetzen
aber keine korrekten Geschäftsdaten, echte Inhalte oder gute Nutzererfahrung.

## Messplan nach dem Go-live

Monatlich werden nur freigegebene Kennzahlen ausgewertet:

1. lokale Impressionen und Klicks für „Events Dornbirn“, „Live-Musik Dornbirn",
   „Mittagessen Dornbirn“ und verwandte Suchintentionen;
2. Aufrufe von Event-, Menü- und Reservierungsseiten;
3. Klicks zu Ticket- und Reservierungsanbietern;
4. bestätigte Buchungen, soweit der jeweilige Anbieter einen zulässigen Export
   oder eine freigegebene Messung ermöglicht;
5. technische Werte wie LCP, INP, CLS und Fehlerquote.

Keine erfundenen Conversion-Zahlen, keine Fake-Knappheit und keine verdeckten
Werbekosten. Google-Ads-Budget wird separat vom Betreuungsentgelt freigegeben.

## Freigabematrix

| Bereich | Verantwortlich | Nachweis vor Produktion |
|---|---|---|
| Inhalte, Preise, Termine | Wolfgang | schriftliche Freigabe |
| Impressum/Datenschutz | Betreiber + Rechtsprüfung | freigegebene Version |
| Buchung/Ticket | Betreiber + Anbieter | Testkauf, Storno, Warteliste |
| Hosting/Domain | Projektverantwortliche | Zugriff, Backup, Rollback |
| SEO/GEO | Agentur + Betreiber | GBP, Search Console, Sitemap |
| Sicherheit | Projektverantwortliche | CI, Secret Scan, MFA, Restore-Test |

## Produktionsschalter

Die Testdomain wird erst dann ersetzt, wenn alle Nachweise vorliegen. Erst dann
wird der Build mit `PUBLIC_ENV=production` erstellt, wodurch die Robots-Meta-
Angabe auf `index,follow` wechselt und die Produktions-Sitemap ausgegeben
wird. Ohne diese Freigabe bleibt `noindex` absichtlich aktiv.
