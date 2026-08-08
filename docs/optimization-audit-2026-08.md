# Wirtschaft Dornbirn – Optimierungs- und Messplan (08/2026)

## Ergebnis vorweg

Die sinnvollste nächste Stufe ist keine weitere Effekt-Schicht, sondern ein
sauberer Mess- und Freigabeprozess: Events zuerst, Mittag und Tisch danach,
Catering als eigener Weg. Die Testseite bleibt datensparsam und `noindex`.
Tracking wird erst nach Produktionsfreigabe, Consent-Management und Prüfung
der Anbieter aktiviert.

Diese Prüfung ist ein strukturierter Experten-Review mit 50 Szenarien (10
Bereiche × 5 Tests). Sie ist **keine** echte Studie mit 50 Personen und ersetzt
keinen Lighthouse-/Gerätetest. Reale Core Web Vitals und Conversion-Raten
werden erst nach dem Go-live mit anonymisierten Messwerten belastbar.

## 50-Szenario-Review

| Bereich | Prüfszenario | Ergebnis im Repository | Maßnahme / Nutzen |
|---|---|---|---|
| Informationsarchitektur | Event ist im ersten View auffindbar | umgesetzt | Event-CTA und Statusleiste bleiben oben; weniger Suchaufwand |
| Informationsarchitektur | Mittag ist klar vom Abend getrennt | umgesetzt | Header „Mittag“, Abschnitt „Mittagsmenüs“; keine Doppelbezeichnung |
| Informationsarchitektur | Tischreservierung führt direkt zum Anbieter | umgesetzt | Kein eigener Zahlungs- oder Gästedatenspeicher |
| Informationsarchitektur | Catering hat einen eigenen Weg | umgesetzt | eigene Seite mit Ort, Anlass, Datum und Gästezahl |
| Informationsarchitektur | Entwurfsseiten sind nicht im Produktionsfluss | umgesetzt | Rechtliches und Catering zeigen auf `index.html` |
| Mobile | Header bleibt lesbar bei schmalem Viewport | code-seitig umgesetzt | Grid und Safe-Area-Regeln; auf echten iPhones nachmessen |
| Mobile | Touch-Ziele sind ausreichend groß | code-seitig vorhanden | keine zusätzlichen Mini-Icons; Gerätetest vor Freigabe |
| Mobile | Truck verdeckt keine Hauptaktion | code-seitig umgesetzt | eigene Animationsspur, Status zusätzlich im Dock |
| Mobile | Kein horizontaler Overflow | CI-Prüfung möglich | bei 390×844 und 430×932 manuell bestätigen |
| Mobile | Reduced Motion ist respektiert | umgesetzt | statische Ansicht bei `prefers-reduced-motion` |
| Laptop | Hero und Events sind ohne Scroll-Jagd verständlich | umgesetzt | zwei klare Hauptaktionen, Eventliste direkt danach |
| Laptop | Tastaturfokus bleibt sichtbar | CSS/DOM vorhanden | vollständigen Tastaturdurchlauf vor Go-live durchführen |
| Laptop | Dialoge schließen deterministisch | umgesetzt | native Dialoge und eindeutige Close-Labels |
| Laptop | Kalender- und Ticketaktionen sind unterscheidbar | umgesetzt | getrennte Links und Buttons |
| Laptop | Breakpoints vermeiden Textüberlappung | code-seitig geprüft | Screenshot-QA bei 1280 und 1440 px ergänzen |
| Datenfrische | Quelle und `updatedAt` sind versioniert | umgesetzt | `site/data/events.json` mit offizieller Quelle |
| Datenfrische | Veraltete Quelle wird nicht als Verfügbarkeit verkauft | umgesetzt | Status und Aktualisierungszeit werden angezeigt |
| Datenfrische | Pause/Öffnung sind datengetrieben | umgesetzt | Pause und nächster Abend aus Eventdaten |
| Datenfrische | Ausverkauft/Warteliste/Abgesagt sind modellierbar | umgesetzt | Statuswerte im Eventmodell und in Links |
| Datenfrische | Fehler werden sichtbar statt erfunden | umgesetzt | offizieller Programm-Link als Fallback |
| Buchung | Tischlink ist extern und offiziell | umgesetzt | Resmio-/Wirtschaft-Link, keine Kartendaten im Code |
| Buchung | Ticketlink ist eventbezogen | umgesetzt | jede Karte besitzt einen offiziellen Ticket-Link |
| Buchung | Status wird nicht statisch behauptet | umgesetzt | Checkout bestätigt Status, Warteliste und Zahlung |
| Buchung | Kalenderexport ist als vorläufig erkennbar | umgesetzt | ICS bleibt `TENTATIVE`, solange kein Feed bestätigt |
| Buchung | Catering ist Anfrage, nicht Scheinkauf | umgesetzt | unverbindliche Anfrage mit persönlicher Bestätigung |
| Performance | Motion läuft über eine kontrollierte Schleife | umgesetzt | keine neue Animationsbibliothek nötig |
| Performance | Bilder besitzen feste Dimensionen | umgesetzt | CLS-Risiko durch Bildsprünge reduziert |
| Performance | Hero wird priorisiert geladen | umgesetzt | `preload`/`fetchpriority` auf Schlüsselbild |
| Performance | Weitere Medien werden lazy geladen | umgesetzt | lange Seite lädt nicht alles sofort |
| Performance | Kein Third-Party-Tag im Test | umgesetzt | kein GA/GTM/Ads-Script in der öffentlichen Testversion |
| Accessibility | Sprache ist `de` | umgesetzt | alle geprüften Seiten deklarieren Deutsch |
| Accessibility | Skip-Link und Dialog-Labels vorhanden | umgesetzt | Tastaturweg ist vorgesehen |
| Accessibility | Statusänderungen sind live angekündigt | umgesetzt | `aria-live` auf Statusdock und Formularmeldungen |
| Accessibility | Reduced Motion ist vorgesehen | umgesetzt | Animation kann vollständig entfallen |
| Accessibility | Kontrast/Fokus werden gerätebezogen geprüft | offen | WCAG-Review mit realem Browser und Screenreader |
| SEO | Canonical und Test-`noindex` sind konsistent | umgesetzt | Produktionsfreigabe schaltet erst gezielt um |
| SEO | Restaurant-/LocalBusiness-Daten sind vorhanden | umgesetzt | Adresse, Typ, Bild und Gebiet markiert |
| SEO | Events haben eindeutige Detailziele | umgesetzt | offizielle Event-URLs statt erfundener Seiten |
| SEO | OpenGraph/Twitter-Daten sind vorhanden | umgesetzt | Social-Previews bekommen Bild und `de_AT`-Locale |
| SEO | Sitemap/GBP/Search Console werden vor Go-live verifiziert | offen | Eigentümerzugang und echte Öffnungszeiten fehlen noch |
| GEO | Inhalte beantworten konkrete lokale Fragen | teilweise | Dornbirn, Bahnhofstraße, Mittag, Abend, Catering vorhanden |
| GEO | Fakten sind maschinenlesbar | umgesetzt | JSON-LD und semantische HTML-Struktur |
| GEO | Keine Ranking-Garantie wird versprochen | umgesetzt | Messung über Impressions, Klicks und Aktionen |
| GEO | Eventdaten werden nicht aus Snippets erfunden | umgesetzt | offizielle Quelle bleibt führend |
| GEO | GBP ist vollständig und aktuell | offen | Wolfgang muss Profil, Kategorie, Fotos und Zeiten freigeben |
| Datenschutz | Testseite speichert keine Browserdaten | umgesetzt | kein Cookie, Storage oder eigener Endpoint |
| Datenschutz | Consent-Schnittstelle ist vorbereitet | umgesetzt | `measurement-hooks.js` bleibt ohne Adapter inert |
| Datenschutz | Keine personenbezogenen Analytics-Parameter | umgesetzt | Hooks senden keine PII und keine Netzwerkdaten |
| Datenschutz | Externe Anbieter werden vor Klick klar benannt | umgesetzt | Ticket-/Reservierungshinweise in Dialogen |
| Datenschutz | Impressum und Datenschutz sind verlinkt | umgesetzt | Footer und Rechtsseiten ohne Entwurfslink |

## Was ich aktiv verbessert habe

1. Rechtliche und Catering-Navigation zeigt nicht mehr auf eine alte
   Entwurfsseite, sondern auf die finale Startseite.
2. `measurement-hooks.js` markiert die sechs relevanten Aktionen:
   `view_events`, `reservation_click`, `menu_open`, `ticket_click`,
   `calendar_export` und `catering_submit`. Ohne geprüften CMP-Adapter findet
   keine Speicherung, kein Cookie und kein Netzwerkaufruf statt.
3. `check:optimization` verhindert künftig Entwurfslinks, fehlende Hooks und
   versehentlich aktivierte Drittanbieter-Messung im öffentlichen Build.
4. `npm run ci` prüft zusätzlich Copy, Eventdaten, Public-Build, Privacy und
   Optimierungsvertrag in einem Lauf.

## Sauberer A/B-Test statt 50 Varianten gleichzeitig

50 parallele Varianten wären für eine kleine lokale Gastronomie statistisch
und organisatorisch unzuverlässig. Der bessere Ablauf ist ein sequenzieller
Test mit genau einer Änderung pro Hypothese:

1. **Baseline (2–4 Wochen):** keine Variante, nur freigegebene Aktionen und
   technische Fehler zählen.
2. **Test A – Event-CTA:** „Tickets sichern“ gegen „Nächsten Abend ansehen“.
3. **Test B – Eventkarte:** Bildgewicht gegen Datum-/Titelgewicht.
4. **Test C – Mittag:** „Mittagsmenü ansehen“ gegen „Tisch zum Mittag reservieren“.
5. **Test D – Catering:** Anlassauswahl gegen Ortsauswahl zuerst.

Jeder Test braucht eine vorab definierte Primärmetrik, eine Laufzeit, eine
Abbruchregel und dieselbe Quelle. Keine Fake-Knappheit, keine versteckten
Kosten, kein Test auf Basis einzelner Tage mit Wetter- oder Eventeffekt.

## Messplan für Produktion

### Consent und Datenschutz

- Test: `noindex`, keine Google-Tags, keine Ads.
- Produktion: CMP und dokumentierte Einwilligung vor nicht notwendigen Tags.
- Google Consent Mode v2 mit standardmäßig verweigerten Speicher-/Werbesignalen;
  Umsetzung erst nach Rechts- und Anbieterprüfung.
- Keine Namen, E-Mail-Adressen, Ticketnummern oder Freitexte in Analytics.
- Enhanced Conversions nur nach Freigabe des Verantwortlichen und mit einem
  geprüften, serverseitig kontrollierten Setup.

### Ereignisse und KPIs

| Ereignis | Zweck | Primärmetrik |
|---|---|---|
| `view_events` | Programm wird geöffnet | Event-Detail-Aufrufe |
| `ticket_click` | offizieller Checkout wird geöffnet | Ticketklicks pro Event |
| `reservation_click` | offizielles Reservierungssystem | Reservierungsklicks |
| `menu_open` | Tagesmenü wird angesehen | Menüöffnungen → Mittagstisch |
| `calendar_export` | Termin wird gespeichert | Kalenderexporte |
| `catering_submit` | Catering-Anfrage wird vorbereitet | gültige Anfragen |

Technische Qualitätsziele sind LCP, INP und CLS nach einem echten Geräte- und
Netzwerktest. Google beschreibt für AI-Suchergebnisse keine Sonder-SEO; die
normalen technischen und inhaltlichen Grundlagen bleiben maßgeblich.

## Google, SEO und GEO – der wirtschaftliche Hebel

1. Google Business Profile vollständig halten: Kategorie, Adresse,
   Öffnungszeiten, Telefon, Fotos, Beiträge und Antworten auf Bewertungen.
2. Für jeden wichtigen Abend eine offizielle Detailseite mit Datum, Ort,
   Zeitzone, Preis und Ticketziel pflegen.
3. `Restaurant`/`LocalBusiness` und passende `Event`-Daten nur mit Fakten
   aus der offiziellen Quelle auszeichnen.
4. Search Console, Sitemap und Bing Webmaster Tools auf die Produktionsdomain
   verifizieren.
5. Inhalte auf reale Suchfragen in Dornbirn/Vorarlberg ausrichten: Mittagstisch,
   Dinner, Live-Musik, Comedy, Catering, Kulturhaus und Foodtruck.
6. Google Ads erst nach sauberem Consent- und Conversion-Setup mit separatem
   Kundenbudget schalten. Ads ersetzen keine lokale Relevanz oder gute Inhalte.

## Canva, Claude und ChatGPT

- **Canva:** Social-Kacheln, Story-Formate und Druckmaterialien; nicht als
  Quelle für Produktions-HTML/CSS verwenden.
- **Claude/ChatGPT:** Text- und Codeänderungen ausschließlich über Branch,
  Pull Request, Preview und Review. Keine echten Gästedaten oder Secrets in
  Prompts.
- **GitHub bleibt die Quelle:** Jede freigegebene Designentscheidung wird als
  Issue/PR dokumentiert; keine parallelen „magischen“ Live-Edits.

## Offene Freigaben vor Go-live

- aktuelle Öffnungszeiten, Preise, Eventdaten und Verfügbarkeit durch Wolfgang
- Rechtefreigaben für Fotos, Emma-&-Eugen-Motive und Musik
- ausgewählter Reservierungs-/Ticketanbieter inklusive AVV und Löschfristen
- CMP, Consent-Texte und Messkonzept
- Google Business Profile, Search Console und Domainzugang
- echter Mobile-/Laptop-Test auf mindestens iPhone Safari und aktuellem Desktop

## Quellen (Primärquellen)

- Google Search: AI Features und Website: <https://developers.google.com/search/docs/appearance/ai-features>
- Google Search: LocalBusiness structured data: <https://developers.google.com/search/docs/appearance/structured-data/local-business>
- Google Search: Event structured data: <https://developers.google.com/search/docs/appearance/structured-data/event>
- Google Business Profile: lokales Ranking: <https://support.google.com/business/answer/7091?hl=de>
- Google Consent Mode v2: <https://developers.google.com/tag-platform/security/guides/consent>
- Web Vitals: <https://web.dev/articles/vitals>
- WCAG 2.2: <https://www.w3.org/TR/WCAG22/>

