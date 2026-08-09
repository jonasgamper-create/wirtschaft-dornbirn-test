# Claude-Master-Prompt · Wirtschaft Dornbirn

Diesen Prompt nach dem Öffnen des geklonten Repositories in Claude als erste
Nachricht einfügen. Der Prompt ersetzt keine GitHub-Berechtigung: Claude muss
das private Repository sichtbar erhalten und mit einem eigenen Branch arbeiten
dürfen.

```text
Du arbeitest im privaten Repository „wirtschaft-dornbirn-test“ für die
Wirtschaft Dornbirn, Bahnhofstraße 24, 6850 Dornbirn, Vorarlberg.

DEIN ZIEL
Optimiere die bestehende Website professionell, ruhig und conversion-stark.
Die Seite soll nach echter redaktioneller Webarbeit aussehen, nicht nach einer
KI-generierten Vorlage. Der wichtigste Besucherfluss ist:

1. nächstes Abend-Event und Tickets
2. Mittagsmenü
3. Tisch für Mittag oder Abend reservieren
4. Catering, Foodtruck und Livebühne anfragen

Arbeite immer vom vorhandenen CI und den echten Inhalten aus. Erfinde keine
Events, Preise, Verfügbarkeiten, Bewertungen, Besucherzahlen oder Aussagen über
die Großeltern. Emma und Eugen sind die Großeltern des Besitzers und die
familiäre Herkunft der Marke, nicht die früheren Betreiber der Wirtschaft.

ZUERST LESEN
Lies vollständig:

- CLAUDE.md
- SECURITY.md
- docs/final-cloud-handoff.md
- docs/ci-style-guide.md
- docs/production-readiness-dsgvo-seo.md
- docs/launch-checklist.md
- docs/event-data.md
- design-system/wirtschaft-dornbirn/MASTER.md

DANACH INSPEKTION
Prüfe vor jeder Änderung:

- git status --short
- die betroffenen Quell-Dateien
- site/data/events.json und dessen updatedAt/sourceUrl
- bestehende Buchungs- und Ticketlinks
- mobile Regeln in site/styles.css
- die aktuelle Truck-Logik in site/truck-motion.js und src/motion-enhancements.js

ORDNER UND ZUSTÄNDIGKEITEN

- site/index.html: öffentliche Gästeseite und Informationsstruktur
- site/styles.css: CI, Layout, responsive Regeln und Komponenten
- site/app.js: Dialoge, Kalender, Eventdarstellung und Buchungsübergaben
- site/truck-motion.js: scrollgebundene Truck-Fahrt
- src/motion-enhancements.js: gebündelte Mikrointeraktionen
- site/data/events.json: einzige Quelle für Eventstatus, Sommerpause und Termine
- site/assets/: freigegebene Bilder, Logos und Truck-Assets
- site/feste-catering.html/.js: Catering- und Festanfrage
- site/impressum.html und site/datenschutz-sicherheit.html: Rechtstexte
- scripts/: Build-, Story- und Prüfskripte
- design-system/: gespeicherte Design- und CI-Regeln
- docs/: Architektur, Security, Datenschutz, Hosting und Übergaben
- output/social-canva/: Event-Posts, Stories und Story-Template
- output/pdf/: Präsentationen und Analysen
- dist/: automatisch erzeugter Public-Build; niemals manuell bearbeiten

Interne Dateien wie site/entwurf-*, site/entwuerfe.html, site/gastgeber* und
site/inventory-store.js sind nicht öffentlich. Sie dürfen nicht in die
Gästeseite verlinkt und nicht in den Public-Build kopiert werden.

VERBINDLICHE CI

- Ink: #11110f
- Paper: #f3efe6
- Cream: #ead9bc
- Wine: #8c292b
- Gold: #c59b5d
- Green: #244635
- große Aussagen: ruhige Serifenschrift
- Navigation, Labels und CTAs: klare Grotesk-Schrift
- Wirtschaft-Logo ausschließlich aus site/assets/wirtschaft-logo.png
- Emma-&-Eugen-Logo auf dem Truck als integriertes Overlay

Keine generischen Icon-Sets, keine externen Fonts, keine dekorativen
Wasserzeichen, keine Entwurfsnummern, keine doppelte Logo-Darstellung und keine
unnötigen Pillen, Schatten oder Effekte einführen. Jede visuelle Änderung muss
Abstand, Hierarchie und Lesbarkeit verbessern.

MOTION-REGELN

- native Scrollposition ist die einzige Quelle für Scrollbewegung
- keine zweite Smooth-Scroll- oder Wheel-Engine hinzufügen
- Truck fährt nachvollziehbar von links nach rechts
- Musiknoten bewegen sich synchron mit dem Fahrzeug
- Bewegung darf niemals Text oder CTAs überdecken
- prefers-reduced-motion muss eine ruhige statische Variante liefern
- auf mobilen Geräten Priorität auf flüssigem Scrollen und kurzer JS-Ausführung
- will-change nur gezielt und nicht auf ganzen Seiten verwenden

BUCHUNG UND DATENSCHUTZ

- Die Website verarbeitet keine Karten-, Zahlungs- oder Gästedaten.
- Tischreservierung bleibt eine Weiterleitung zum offiziellen Reservierungssystem.
- Tickets bleiben eventbezogene Links zur offiziellen Ticketseite.
- Verfügbarkeit darf nur aus geprüften Eventdaten kommen; niemals schätzen.
- Bei veralteten oder nicht erreichbaren Eventdaten muss die Seite den Status
  kenntlich machen und auf die offizielle Quelle verlinken.
- Keine eigene Payment-Logik, kein öffentliches Gastgeber-Cockpit und kein
  Speichern von Reservierungen im Browser.
- Keine Tracker oder Marketing-Skripte ohne rechtlich geprüfte Einwilligung.
- Keine echten Kundendaten, Zugangsdaten oder API-Schlüssel in Code oder Prompt.

STORY-SYSTEM

Die wiederverwendbare Story liegt unter
output/social-canva/genussroute-story-template/.

- Inhalt ändern: event.json
- Bild ändern: freigegebenes Bild nach site/assets/ legen und background setzen
- Story rendern: npm run social:story
- officialUrl steuert den CTA
- die MP4 kann keinen klickbaren Link enthalten; auf Instagram zusätzlich den
  Link-Sticker setzen
- story-template.html ist die feste Form und darf nicht bei jeder Story neu
  gestaltet werden

PRIORISIERTE OPTIMIERUNG

Bearbeite Verbesserungen in dieser Reihenfolge:

P0 – Funktion:
- keine überlappenden Texte, abgeschnittenen Buttons oder horizontalen Overflows
- Events, Ticketlinks, Reservierung, Menü, Kalender und Catering funktionieren
- Header bleibt auf Mobile lesbar; Logo erscheint nur einmal
- Truck ist früh genug sichtbar und fährt vollständig durch

P1 – UX und Mobile:
- Desktop und 390×844 px prüfen
- Touch-Ziele mindestens 44 px, klare Fokuszustände, Tastaturbedienung
- Reduced Motion und langsame Geräte testen
- lange Eventtitel und unterschiedliche CTA-Texte testen
- Layout Shifts durch feste Bilddimensionen vermeiden

P2 – Performance:
- Hero-Bild priorisieren, weitere Bilder lazy laden
- WebP/AVIF nur bei vorhandenem, geprüftem Asset verwenden
- keine unnötigen Bibliotheken oder Plugins installieren
- Core Web Vitals, LCP, CLS und INP messen, wenn ein geeignetes Tool verfügbar ist

P3 – SEO/GEO und Conversion:
- eindeutige Eventdaten, Datum, Ort und offizielle URL
- Restaurant-, LocalBusiness-, Event- und Menu-Schema nur mit echten Daten
- Canonical, Sitemap, OpenGraph und lokale Dornbirn-/Vorarlberg-Bezüge prüfen
- CTAs transparent formulieren: „Tickets sichern“, „Tisch reservieren“,
  „Mittagsmenü ansehen“, „Catering anfragen“
- keine Fake-Knappheit, erfundenen Countdown-Timer oder Dark Patterns

CLAUDE-DESIGN-MODUS

Wenn du in Claude Design oder einer visuellen Vorschau arbeitest, behandle die
Ansicht als Design-Review und nicht als Freibrief für einen kompletten Rewrite:

1. Erstelle zuerst eine Bestandsaufnahme von Header, Hero, Eventbereich,
   Mittag, Reservierung, Catering, Footer und mobilen Zuständen.
2. Bewerte jede Zone nach Hierarchie, Abstand, Lesbarkeit, CTA-Klarheit,
   CI-Treue, Motion und Accessibility.
3. Nenne maximal drei priorisierte Probleme und eine empfohlene Lösung je
   Problem. Keine erfundenen A/B-Testzahlen oder angeblichen Nutzerstudien.
4. Ändere danach nur eine zusammenhängende Verbesserung pro Branch.
5. Wenn eine visuelle Vorschau möglich ist, prüfe mindestens 1440×900 px und
   390×844 px. Erstelle Vorher-/Nachher-Screenshots oder beschreibe exakt,
   welche sichtbare Differenz geprüft wurde.
6. Prüfe zusätzlich einen langen Eventtitel, einen langen CTA, Sommerpause,
   ausverkauft, Warteliste und veraltete Eventdaten.
7. Wenn die Design-Ansicht und der echte Quellcode voneinander abweichen,
   gilt der Quellcode als Quelle; synchronisiere die Änderung sauber in den
   zuständigen Dateien.

DESIGN-ENTSCHEIDUNGEN, DIE NICHT VERLOREN GEHEN DÜRFEN

- Events stehen vor Mittag und Storytelling.
- Der Status bleibt als schmale, verständliche Information sichtbar.
- Die Hauptaktionen sind direkt verständlich und nicht doppelt vorhanden.
- Das Wirtschaft-Logo erscheint im Website-Header nur einmal.
- Der Truck ist ein gezielter Bewegungsakzent, kein dauerhaftes Dekor.
- Die Website bleibt ruhig, hochwertig und lokal für Dornbirn/Vorarlberg.
- Keine generischen Dashboard-Karten, übergroßen KI-Headlines oder künstlichen
  Cursor-/Glow-Effekte einführen.

KEINE SCHEINSICHERHEIT

Behaupte niemals, dass „50 Personen getestet“, ein A/B-Test gewonnen oder ein
Ranking garantiert wurde, wenn dafür keine realen, dokumentierten Daten
vorliegen. Formuliere stattdessen Hypothesen, Messgrößen und einen manuellen
Testplan. Externe Buchungen, Zahlungen und Veröffentlichungen werden nicht
selbstständig ausgeführt.

ARBEITSABLAUF FÜR JEDE ÄNDERUNG

1. Formuliere zuerst Ziel, Nutzerproblem, betroffene Dateien und Risiko.
2. Zeige einen kurzen Plan; ändere nur die erforderlichen Dateien.
3. Arbeite in einem Branch mit Präfix codex/ oder claude/.
4. Nutze apply_patch beziehungsweise nachvollziehbare kleine Diffs.
5. Führe npm run ci aus.
6. Prüfe zusätzlich Desktop, Mobile 390×844, Tastatur und Reduced Motion.
7. Prüfe externe Links mit HTTP-Status, aber führe keine echten Zahlungen oder
   Reservierungen ohne ausdrückliche Freigabe aus.
8. Beschreibe die sichtbare Änderung und alle offenen Risiken.
9. Erstelle keinen direkten Push auf main und merge keinen Pull Request selbst.

ABNAHME VOR EINEM MERGE

- npm run ci ist grün
- keine KI-/Entwurfsmarker oder doppelten Logos im Public-Build
- keine Secrets, personenbezogenen Daten oder Zahlungslogik im Diff
- kein horizontaler Overflow
- Events und Buchungswege sind sichtbar und korrekt verlinkt
- mobile und Desktop-Abstände stimmen
- Reduced Motion und Tastaturbedienung funktionieren
- Eventdatenquelle und Aktualisierungszeitpunkt sind plausibel
- Story-Template bleibt editierbar, ohne seine Form zu verlieren

ANTWORTFORMAT NACH DEINER ARBEIT

Gib immer aus:

- Ziel und kurze Begründung
- geänderte Dateien
- sichtbare Auswirkungen auf Desktop und Mobile
- npm run ci-Ergebnis
- Link-/Datenquellen, die geprüft wurden
- offene Risiken oder bewusst nicht ausgeführte Aktionen
- Branchname und Commit; niemals behaupten, dass etwas live ist, wenn es nicht
  tatsächlich veröffentlicht wurde

Beginne jetzt ausschließlich mit der Bestandsaufnahme und einem kleinen Plan.
Warte danach auf die konkrete Optimierungsaufgabe.
```

## Übergabe nach dem Einfügen

Claude braucht zusätzlich eine autorisierte Repository-Verbindung oder ein
lokal geöffnetes Repository. Ein Text-Prompt allein gewährt keinen Zugriff auf
GitHub oder Cloud-Dateien. Die sicherste Reihenfolge bleibt: Repository öffnen,
Prompt einfügen, Branch erstellen, eine kleine Änderung durchführen,
`npm run ci` ausführen und erst danach weitere Optimierungen beauftragen.
