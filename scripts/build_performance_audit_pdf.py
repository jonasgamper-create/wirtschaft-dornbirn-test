#!/usr/bin/env python3
"""Create the evidence-based performance, SEO/GEO and conversion audit for Arnold."""

from __future__ import annotations

from pathlib import Path
from textwrap import wrap as textwrap

from PIL import Image
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "site" / "assets"
OUT = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-performance-audit-geo-ads-arnold-2026-08.pdf"
W, H = landscape(A4)

PAPER = HexColor("#EEE8DC")
INK = HexColor("#17130F")
WINE = HexColor("#7E242B")
GOLD = HexColor("#D9B76B")
GREEN = HexColor("#1D5039")
MUTED = HexColor("#6F655B")
SOFT = HexColor("#F8F3EA")
LINE = HexColor("#17130F38")


def cover_image(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float) -> None:
    with Image.open(path) as image:
        iw, ih = image.size
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    clip = c.beginPath()
    clip.rect(x, y, w, h)
    c.saveState()
    c.clipPath(clip, stroke=0, fill=0)
    c.drawImage(ImageReader(str(path)), x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, mask="auto")
    c.restoreState()


def box(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill, radius: float = 12, stroke=None) -> None:
    c.saveState()
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, radius, fill=1, stroke=0)
    c.restoreState()


def wrap_lines(value: str, font: str, size: float, width: float) -> list[str]:
    words = value.split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if not line or stringWidth(candidate, font, size) <= width:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def para(c: canvas.Canvas, value: str, x: float, y: float, width: float, size: float = 10, leading: float | None = None, font: str = "Helvetica", color=INK, max_lines: int | None = None) -> float:
    leading = leading or size * 1.38
    lines = wrap_lines(value, font, size, width)
    if max_lines:
        lines = lines[:max_lines]
    c.setFillColor(color)
    c.setFont(font, size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def title(c: canvas.Canvas, value: str, x: float = 50, y: float = H - 90, width: float = 690, color=INK, size: float = 38) -> float:
    c.setFillColor(color)
    c.setFont("Times-Roman", size)
    for line in wrap_lines(value, "Times-Roman", size, width):
        c.drawString(x, y, line)
        y -= size * 1.02
    return y


def eyebrow(c: canvas.Canvas, value: str, x: float = 50, y: float = H - 34, color=WINE) -> None:
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8.3)
    c.drawString(x, y, value.upper())


def footer(c: canvas.Canvas, page: int, dark: bool = False) -> None:
    c.setFillColor(Color(1, 1, 1, .52) if dark else Color(.09, .07, .05, .48))
    c.setFont("Helvetica", 7.2)
    c.drawString(50, 22, "Wirtschaft Dornbirn · Audit und Umsetzungsplan für Arnold · 07.08.2026")
    c.drawRightString(W - 50, 22, f"{page:02d}")


def page_start(c: canvas.Canvas, page: int, label: str, dark: bool = False) -> None:
    c.setFillColor(INK if dark else PAPER)
    c.rect(0, 0, W, H, fill=1, stroke=0)
    eyebrow(c, label, color=GOLD if dark else WINE)
    footer(c, page, dark)


def bullet(c: canvas.Canvas, value: str, x: float, y: float, width: float, dark: bool = False, size: float = 10) -> float:
    c.setFillColor(GOLD)
    c.circle(x + 4, y + 3, 2.7, fill=1, stroke=0)
    return para(c, value, x + 16, y + 7, width - 16, size=size, leading=size * 1.35, color=white if dark else INK) - 5


def table(c: canvas.Canvas, headers: list[str], rows: list[list[str]], x: float, y: float, widths: list[float], row_h: float = 34, dark: bool = False, font_size: float = 8.4) -> float:
    header_fill = WINE if not dark else HexColor("#3B1D1F")
    text_color = white if dark else INK
    box(c, x, y - row_h, sum(widths), row_h, header_fill, 7)
    cursor = x
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", font_size)
    for header, width in zip(headers, widths):
        c.drawString(cursor + 9, y - 20, header)
        cursor += width
    current = y - row_h
    for index, row in enumerate(rows):
        current -= row_h
        fill = Color(1, 1, 1, .05) if dark and index % 2 == 0 else (SOFT if not dark and index % 2 == 0 else (INK if dark else PAPER))
        box(c, x, current, sum(widths), row_h, fill, 0)
        cursor = x
        for value, width in zip(row, widths):
            para(c, str(value), cursor + 9, current + row_h - 15, width - 18, size=font_size, leading=font_size * 1.2, color=text_color if dark else INK, max_lines=2)
            cursor += width
        c.setStrokeColor(Color(1, 1, 1, .12) if dark else LINE)
        c.line(x, current, x + sum(widths), current)
    return current


def source(c: canvas.Canvas, label: str, url: str, x: float, y: float, width: float) -> float:
    y = para(c, label, x, y, width, size=8.3, leading=11, color=INK)
    c.linkURL(url, (x, y - 10, x + width, y + 4), relative=0)
    return y - 9


def build() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("Wirtschaft Dornbirn - Performance-, GEO- und Conversion-Audit")
    c.setAuthor("Wirtschaft Dornbirn · technische und strategische Analyse")
    c.setSubject("Kritischer Website-Audit, heuristische A/B-Matrix, SEO/GEO, Google Ads und Go-live")

    # 01 Cover
    cover_image(c, ASSETS / "restaurant.webp", 0, 0, W, H)
    c.setFillColor(Color(0, 0, 0, .68))
    c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(Color(.49, .14, .17, .78))
    c.rect(W * .66, 0, W * .34, H, fill=1, stroke=0)
    box(c, 50, H - 70, 173, 43, Color(1, 1, 1, .92), 10)
    c.drawImage(ImageReader(str(ASSETS / "wirtschaft-logo.png")), 62, H - 59, 148, 34, mask="auto")
    eyebrow(c, "Für Arnold · Entscheidungs- und Umsetzungsunterlage", 50, H - 136, GOLD)
    title(c, "Die Website muss nicht lauter werden. Sie muss schneller zur richtigen Entscheidung führen.", 50, H - 188, 545, white, 42)
    para(c, "Kritischer Audit des aktuellen Wirtschaft-Dornbirn-Projekts: Bedienbarkeit, Scrollen, echte Eventdaten, Buchungswege, Performance, GEO und Google Ads.", 52, 153, 490, 14.2, 20, "Times-Roman", Color(1, 1, 1, .8))
    box(c, 50, 58, 380, 48, Color(1, 1, 1, .1), 24, stroke=Color(1, 1, 1, .3))
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(74, 77, "AUDIT · HEURISTISCHE A/B-MATRIX · GO-LIVE-PLAN")
    footer(c, 1, True)
    c.showPage()

    # 02 Verdict
    page_start(c, 2, "01 · Das Urteil")
    title(c, "Die Richtung stimmt. Der größte Hebel liegt jetzt in Datenklarheit und Messbarkeit.")
    para(c, "Der aktuelle Stand ist als öffentliche Testumgebung bewusst datensparsam. Er lädt, scrollt und verknüpft Reservierung und Tickets. Für einen echten Marketingbetrieb fehlen aber noch drei harte Voraussetzungen: autoritative Eventdaten, eine saubere Consent- und Conversion-Messung sowie eigenständige Eventseiten.", 50, H - 160, 700, 12, 17, "Helvetica", MUTED)
    cards = [
        ("PASS", GREEN, "Buchungsgrenze", "Die Website verarbeitet selbst keine Kartendaten. Reservierung und Ticketzahlung bleiben beim offiziellen Anbieter."),
        ("PASS", GREEN, "Motion-Grundlage", "Truck, Radrotation und Musiknoten laufen über eine gemeinsame requestAnimationFrame-Schleife mit Reduced-Motion-Fallback."),
        ("P0", WINE, "Event-Wahrheit", "HTML, JSON und externe Eventseite müssen dieselbe Quelle haben. Ein CI-Gate für die JSON-Datei ist jetzt ergänzt."),
        ("P0", WINE, "Messbarkeit", "Ohne reale Consent-, Search-Console- und Buchungsdaten ist kein echter Uplift beweisbar. Heuristische A/B-Varianten sind nur Hypothesen."),
    ]
    for i, (label, color, head, copy) in enumerate(cards):
        x = 50 + (i % 2) * 350
        y = 315 - (i // 2) * 132
        box(c, x, y, 320, 103, SOFT, 15)
        c.setFillColor(color); c.setFont("Helvetica-Bold", 8.5); c.drawString(x + 18, y + 77, label)
        c.setFillColor(INK); c.setFont("Times-Roman", 22); c.drawString(x + 18, y + 52, head)
        para(c, copy, x + 18, y + 31, 278, 9.2, 12.5, "Helvetica", MUTED, 2)
    box(c, 50, 79, 688, 52, INK, 14)
    para(c, "Empfehlung: Nicht noch ein Animations-Plugin hinzufügen. Erst den Daten- und Messfundament sauber machen, dann gezielt testen.", 70, 109, 650, 11.5, 15, "Times-Roman", white)
    c.showPage()

    # 03 current audit
    page_start(c, 3, "02 · Ist-Analyse")
    title(c, "Was heute technisch nachweisbar ist")
    rows = [
        ["Build", "npm run ci erfolgreich", "PASS", "Build, Public-Allowlist, Privacy-Gate und Eventdaten-Gate"],
        ["Deployment", "GitHub Pages", "PASS", "Workflow auf main erfolgreich; öffentliche Ressourcen HTTP 200"],
        ["Animation", "native rAF + Motion-Bundle", "PASS / OPT", "Truck logisch; Motion-Bundle mit 66.6 KB ist größter JS-Block"],
        ["Events", "JSON + HTML-Fallback", "P0", "Einträge werden hydriert, aber statischer Spiegel bleibt fehleranfällig"],
        ["SEO", "Testseite noindex", "P0", "Für Test korrekt; vor Livegang Produktionsflag und echte Eventseiten nötig"],
        ["Tracking", "kein öffentliches Tracking", "PASS", "Datensparsam, aber noch keine consent-basierte Messung"],
    ]
    table(c, ["Bereich", "Befund", "Status", "Kritische Bedeutung"], rows, 50, 422, [110, 170, 90, 318], 39, False, 8.2)
    para(c, "Messgrenze: Im Repository liegen keine echten Search-Console-, Google-Ads-, Resmio-, Ticketist- oder Buchungsdaten. Daher sind Aussagen über Ranking, Conversion-Rate oder virale Social-Formate ohne Erfindung nicht möglich.", 50, 73, 688, 10.5, 14, "Helvetica-Bold", WINE)
    c.showPage()

    # 04 UX and scroll
    page_start(c, 4, "03 · UX und Scrollen", dark=True)
    title(c, "Scrollen darf Atmosphäre geben. Die Buchung darf nie warten.", color=white)
    para(c, "Die obere Truck-Animation ist als monotone Links-nach-rechts-Strecke ausgelegt. Das verhindert Rücksprünge und macht die Bewegung prüfbar. Kritisch bleiben lange Scrollstrecken, viele simultane Effekte und die Tatsache, dass wichtige Inhalte erst nach Scrollen sichtbar werden.", 50, H - 155, 700, 11.5, 16, "Helvetica", Color(1, 1, 1, .72))
    tests = [
        ["01", "Erster Eindruck", "Hero + nächster Abend in 5 Sekunden", "Bestehen", "Event-CTA direkt im Hero halten"],
        ["02", "Truck 0-25%", "startet links und fährt sichtbar", "Bestehen", "keine zweite Scroll-Story ergänzen"],
        ["03", "Truck 50%", "Text bleibt lesbar, keine Überdeckung", "Prüfen", "Overlay-Bereich mit Mobile-Screenshot abnehmen"],
        ["04", "Truck 75%", "Musiknoten verschwinden weich", "Bestehen", "Reduced Motion statisch offen zeigen"],
        ["05", "Events", "ohne Story sofort erreichbar", "Bestehen", "Events im DOM und per Deep-Link"],
        ["06", "Mittag", "Menü vor Reservierung sichtbar", "Bestehen", "Tageskarte mit Zeit und Preis freigeben"],
        ["07", "Dialog", "ESC, Fokus und Zurück funktionieren", "Prüfen", "Tastaturtest in jedem Browser"],
        ["08", "Mobile", "kein horizontaler Overflow", "Bestehen", "390 x 844 als Pflichtviewport"],
        ["09", "Low Motion", "keine essenzielle Info nur animiert", "Bestehen", "WCAG 2.2 2.3.3 beachten"],
        ["10", "Exit", "Footer mit Kontakt und Recht", "Bestehen", "keine Entwurfslinks im Public-Build"],
    ]
    table(c, ["#", "Test", "Erwartung", "Status", "Entscheidung"], tests, 50, 395, [34, 105, 200, 80, 269], 31, True, 7.7)
    c.showPage()

    # 05 data and booking
    page_start(c, 5, "04 · Buchung und Eventdaten")
    title(c, "Die Website darf nie Verfügbarkeit erfinden.")
    para(c, "Der aktuelle Schutz ist richtig: Die Website enthält keine Kartendaten und öffnet für den verbindlichen Schritt den offiziellen Anbieter. Der nächste Reifegrad ist eine einzige autoritative Eventquelle, aus der Status, Ticketlink, Kalender und strukturierte Daten erzeugt werden.", 50, H - 155, 700, 11.5, 16, "Helvetica", MUTED)
    rows = [
        ["Quelle", "wirtschaft-dornbirn.at/event/", "Master für Titel, Datum und Link"],
        ["Status", "scheduled / sold_out / waitlist / cancelled / paused", "Keine freie Zahl ohne Anbieter-Feed"],
        ["Cache", "updatedAt + maxAgeHours", "Stale-Banner und offizieller Fallback"],
        ["Reservierung", "externer Anbieter", "Keine eigene Sitzplatz- oder Zahlungsdatenbank"],
        ["Kalender", "TENTATIVE .ics", "Erst nach bestätigter Quelle CONFIRMED"],
    ]
    table(c, ["Baustein", "Vorgabe", "Warum"], rows, 50, 405, [145, 245, 298], 42, False, 8.4)
    box(c, 50, 126, 688, 64, GREEN, 15)
    para(c, "P0-Entscheidung: Wer den Eventfeed pflegt, ist redaktionell verantwortlich. Das Gastgeber-Cockpit darf nur nach Authentifizierung und Rollenprüfung an diese Quelle schreiben.", 70, 164, 650, 11, 15, "Helvetica-Bold", white)
    para(c, "Jetzt implementiert: `check-event-data.mjs` blockiert ungültige JSON-Daten bereits im CI.", 50, 92, 688, 10, 13, "Helvetica-Bold", GREEN)
    c.showPage()

    # 06 heuristic AB
    page_start(c, 6, "05 · Heuristische A/B-Matrix")
    title(c, "Zehn Varianten - zehn Hypothesen, kein erfundener Gewinner")
    para(c, "Diese Matrix ist eine fachliche Vorauswahl für echte Tests. Sie ist kein statistischer A/B-Test: Dafür braucht es ausreichend Sessions, Consent, gleiches Traffic-Mix, ein Conversionziel und einen vorab definierten Testzeitraum.", 50, H - 155, 700, 10.8, 15, "Helvetica", MUTED)
    rows = [
        ["A1", "Hero: Event zuerst", "Ticketklicks", "Nächster Abend prominent"],
        ["A2", "Hero: Mittag zuerst", "Mittagsreservierungen", "Tagesgeschäft priorisieren"],
        ["A3", "CTA: Tickets sichern", "Event-CTR", "konkreter als Programm"],
        ["A4", "CTA: Tisch reservieren", "Reservierungs-CTR", "friktionsärmer für Stammgäste"],
        ["A5", "Truck animiert", "Scrolltiefe", "Markenerinnerung ohne Buchungsblockade"],
        ["A6", "Truck statisch", "INP / Conversion", "Kontrollvariante für Performance"],
        ["A7", "Eventliste 3 Einträge", "Event-CTR", "weniger kognitive Last"],
        ["A8", "Eventliste 6 Einträge", "Discovery", "mehr Programmabdeckung"],
        ["A9", "Social Proof real", "Ticketklicks", "nur mit freigegebenen Zahlen"],
        ["A10", "Ohne Social Proof", "Vertrauen", "ehrliche Kontrollgruppe"],
    ]
    table(c, ["Variante", "Änderung", "Primärmetrik", "Hypothese"], rows, 50, 421, [65, 185, 130, 308], 29, False, 7.8)
    box(c, 50, 42, 688, 42, INK, 12)
    para(c, "Testregel: genau eine Änderung pro Test, keine Fake-Knappheit, keine versteckten Kosten, kein Test mit personenbezogenen Daten ohne Rechtsgrundlage.", 68, 68, 650, 9.4, 12.5, "Helvetica-Bold", white)
    c.showPage()

    # 07 performance
    page_start(c, 7, "06 · Performance")
    title(c, "Performance-Ziel: schnell im ersten View, ruhig im Rest.")
    metrics = [
        ("LCP", "<= 2.5 s", "Hero-Bild priorisiert laden; keine Video-Autoplay-Datei im ersten View."),
        ("INP", "< 200 ms", "Scroll-Work in rAF bündeln; keine DOM-Neuberechnung pro Event."),
        ("CLS", "< 0.1", "Bilddimensionen sind bereits gesetzt; keine nachträglichen Layoutsprünge."),
    ]
    for i, (metric_name, target, copy) in enumerate(metrics):
        x = 50 + i * 230
        box(c, x, 320, 210, 120, SOFT, 15)
        c.setFillColor(WINE if i == 0 else GREEN); c.setFont("Helvetica-Bold", 9); c.drawString(x + 18, 414, metric_name)
        c.setFillColor(INK); c.setFont("Times-Roman", 27); c.drawString(x + 18, 374, target)
        para(c, copy, x + 18, 350, 174, 8.8, 11.5, "Helvetica", MUTED, 3)
    perf_rows = [
        ["Bild", "WebP vorhanden, Dimensionen im HTML", "AVIF nur nach echter Browser-/CDN-Prüfung"],
        ["JS", "Motion-Bundle ca. 66.6 KB minifiziert", "Native CSS/IO für einfache Effekte als nächste Optimierung"],
        ["CSS", "ein Stylesheet plus Motion-Styles", "Critical CSS nicht blind extrahieren; visuell testen"],
        ["Monitoring", "CI-Checks vorhanden", "Lighthouse CI + Search Console nach Go-live"],
    ]
    table(c, ["Bereich", "Ist", "Nächster Schritt"], perf_rows, 50, 274, [110, 270, 308], 34, False, 8.2)
    para(c, "Die oben genannten Zielwerte sind Google-Empfehlungen und keine aktuelle Messung dieses Projekts. Ein Lighthouse-/CrUX-Lauf mit realer Domain ist Pflicht vor dem Go-live.", 50, 80, 688, 9.6, 13, "Helvetica-Bold", WINE)
    c.showPage()

    # 08 SEO/GEO
    page_start(c, 8, "07 · SEO und GEO")
    title(c, "GEO ist kein Plugin. Es ist saubere, zitierfähige Information.")
    para(c, "Für lokale und generative Suchsysteme zählt vor allem, dass Adresse, Öffnungszeiten, Angebote, Events und Antworten konsistent, maschinenlesbar und aktuell sind. Eine Platzierung in KI-Antworten kann nicht garantiert werden.", 50, H - 155, 700, 11.2, 16, "Helvetica", MUTED)
    geo_rows = [
        ["LocalBusiness", "Restaurant, Adresse, Telefon, Öffnungszeiten", "Search Console + Rich Results Test"],
        ["Event", "pro Event eigene indexierbare URL, Ort, Datum, Ticketlink", "keine Sammelseite als einzige Eventseite"],
        ["Menu", "Tagesmenü als lesbarer Inhalt, Preis und Zeitraum", "keine PDF-only Speisekarte"],
        ["GEO", "FAQ, Vorarlberg-Bezug, klare Entitäten", "keine Keyword-Stuffing-Texte"],
        ["Social", "OpenGraph, echte Alt-Texte, freigegebene Fotos", "keine fremden Motive ohne Rechte"],
    ]
    table(c, ["Signal", "Umsetzung", "Prüfung"], geo_rows, 50, 410, [130, 350, 208], 42, False, 8.4)
    box(c, 50, 118, 688, 66, WINE, 15)
    para(c, "P0 vor Indexierung: Die Testumgebung bleibt noindex. Erst wenn Wolfgang Inhalte, Impressum, Datenschutz, Eventdaten und Buchungsziele freigibt, wird der Produktionsbuild auf index,follow gestellt.", 70, 160, 650, 10.8, 14.5, "Helvetica-Bold", white)
    c.showPage()

    # 09 Ads and consent
    page_start(c, 9, "08 · Google Ads und Consent")
    title(c, "Erst Zustimmung und Messplan. Dann Budget.")
    para(c, "Für Österreich und den EWR müssen Google-Tags, Analytics und Ads-Messung an eine belastbare Einwilligungslogik gekoppelt werden. Google beschreibt Consent Mode mit analytics_storage, ad_storage, ad_user_data und ad_personalization. Das ist technische Anleitung, keine Rechtsfreigabe.", 50, H - 155, 700, 11.1, 16, "Helvetica", MUTED)
    rows = [
        ["01", "Consent default", "denied", "vor jedem nicht notwendigen Tag"],
        ["02", "CMP", "dokumentierte Wahl", "Ablehnen genauso leicht wie Akzeptieren"],
        ["03", "Conversion", "Ticketklick, Reservierung, Telefon", "erst nach Definition und Rechtsprüfung"],
        ["04", "Enhanced conversions", "nur mit consented first-party data", "Hashing allein ersetzt keine Einwilligung"],
        ["05", "Offline", "Import bestätigter Buchungen", "nur aus Anbieter-/CRM-Prozess"],
    ]
    table(c, ["Schritt", "Thema", "Soll", "Kontrolle"], rows, 50, 410, [55, 150, 205, 278], 42, False, 8.2)
    box(c, 50, 125, 688, 60, GREEN, 15)
    para(c, "Empfehlung: In Version 1 keine Ads-Tags auf der Testseite. Nach Go-live: CMP + Consent Mode + Search Console + ein monatliches KPI-Board. Kein Remarketing, bevor die Einwilligung und Datenflüsse dokumentiert sind.", 70, 160, 650, 10.5, 14.5, "Helvetica-Bold", white)
    c.showPage()

    # 10 local growth/social
    page_start(c, 10, "09 · Local Growth")
    title(c, "Der lokale Hebel ist nicht Viralität. Es ist Wiedererkennbarkeit.")
    para(c, "Seriös messbar sind lokale Impressionen, Suchbegriffe, Kartenaktionen, Telefonklicks, Reservierungen und Ticketklicks. Aussagen wie viral, viele Weiterleitungen oder garantiert Platz 1 sind ohne native Accountdaten nicht belastbar.", 50, H - 155, 700, 11.2, 16, "Helvetica", MUTED)
    content = [
        ("Mittag", "Tagesmenü, Tempo, regionale Zutaten, 11:30-13:30", "Google Business Profile + Stories"),
        ("Abend", "Dinner, Musik, Comedy, Atmosphäre", "Eventseite + Reel mit Datum"),
        ("Events", "Künstler, Ort, Datum, Ticketlink, echte Bilder", "Google Event-Markup + Social"),
        ("Menschen", "Wolfgang und Team, Emma und Eugen als Herkunft", "authentische Kurzformate"),
        ("Catering", "Foodtruck, Kulturhaus, Wunschort", "separate Landingpage + Anfrage"),
    ]
    table(c, ["Säule", "Inhalt", "Messbarer Einsatz"], content, 50, 409, [115, 335, 238], 44, False, 8.5)
    box(c, 50, 132, 688, 53, SOFT, 14, stroke=LINE)
    para(c, "Empfohlene Taktung: 1 Event-Post pro Termin, 1 Lunch-Post pro Woche, 1 Team-/Ort-Story pro Woche, 1 Catering-Case pro Monat. Nur mit realem Material und Rechtefreigabe.", 70, 163, 650, 10.4, 14, "Helvetica-Bold", INK)
    c.showPage()

    # 11 connectors
    page_start(c, 11, "10 · Konnektoren und Tools")
    title(c, "Wenige stabile Verbindungen schlagen viele Plugins.")
    tools = [
        ["GitHub Actions", "Build, Eventdaten-Gate, Public-Allowlist", "jetzt sinnvoll", "kein Kundendatenzugriff"],
        ["Google Search Console", "Indexierung, Queries, CWV, Events", "Go-live Pflicht", "Owner-Zugriff sauber teilen"],
        ["Google Business Profile", "Maps, Öffnungszeiten, Fotos, Reviews", "sofort", "Wolfgang als Eigentümer"],
        ["CMP + Consent Mode", "Messung nach Zustimmung", "erst nach Rechtsprüfung", "DPA/Subprozessoren prüfen"],
        ["Resmio/Ticketanbieter", "Reservierung und Zahlung", "offizieller Checkout", "Website speichert keine Karte"],
        ["Sentry", "Fehler-Monitoring", "optional", "nur mit EU-Setup und DPA"],
        ["Lighthouse CI", "Performance-Budget", "sehr sinnvoll", "keine personenbezogenen Daten"],
    ]
    table(c, ["Tool", "Aufgabe", "Empfehlung", "Guardrail"], tools, 50, 420, [125, 275, 145, 143], 38, False, 7.9)
    box(c, 50, 92, 688, 50, INK, 13)
    para(c, "Kein zusätzlicher Motion-Connector nötig. Das Risiko eines weiteren Animations-Frameworks wäre größer als der Nutzen: mehr Bundle, mehr Zustände, mehr Fehlerstellen.", 70, 120, 650, 10.2, 14, "Helvetica-Bold", white)
    c.showPage()

    # 12 security
    page_start(c, 12, "11 · Security und DSGVO")
    title(c, "Sicher wird die Seite durch Datenminimierung und klare Grenzen.")
    security = [
        ("Public", "keine Secrets, keine Gästelisten, keine Kartendaten"),
        ("Private", "Gastgeber-Cockpit nur authentifiziert, rollenbasiert und serverseitig"),
        ("Vendor", "AVV, Subprozessoren, Löschfristen und Drittlandtransfer dokumentieren"),
        ("Access", "zwei persönliche Konten, MFA/Passkeys, geschützter main-Branch"),
        ("Incident", "Kontakt, Bewertung, Meldung und Wiederherstellung testen"),
        ("Content", "Bildrechte, Namen, Preise und Termine vor jeder Veröffentlichung freigeben"),
    ]
    for i, (head, copy) in enumerate(security):
        x = 50 + (i % 2) * 350
        y = 353 - (i // 2) * 91
        box(c, x, y, 320, 67, SOFT, 13)
        c.setFillColor(GREEN if i % 2 else WINE); c.setFont("Helvetica-Bold", 8.5); c.drawString(x + 17, y + 47, head.upper())
        para(c, copy, x + 17, y + 28, 280, 9.3, 12, "Helvetica", MUTED, 2)
    box(c, 50, 84, 688, 54, WINE, 14)
    para(c, "Wichtig: DSGVO-Konformität ist keine Eigenschaft des Designs. Sie hängt von Hosting, Buchungsanbieter, Consent, Verträgen, Datenflüssen und den freigegebenen Rechtstexten ab.", 70, 117, 650, 10.5, 14, "Helvetica-Bold", white)
    c.showPage()

    # 13 roadmap
    page_start(c, 13, "12 · Rollout")
    title(c, "30 Tage bis zur belastbaren Entscheidung")
    roadmap = [
        ("Woche 1", "Wahrheit", "Wolfgang bestätigt CI, Öffnungszeiten, Events, Preise, Anbieter und Bildrechte."),
        ("Woche 2", "Stabilität", "Eventfeed, Daten-Gate, Mobile-QA, Lighthouse-Baseline, Tastatur und Reduced Motion."),
        ("Woche 3", "Messbarkeit", "Search Console, Business Profile, Consent-Konzept und KPI-Definition ohne Live-Tags auf Test."),
        ("Woche 4", "Go-live", "Produktionsdomain, index,follow, Eventseiten, Buchungstest, Datenschutzfreigabe, Rollback."),
    ]
    for i, (week, head, copy) in enumerate(roadmap):
        y = 363 - i * 78
        c.setFillColor(GOLD); c.circle(76, y + 5, 13, fill=1, stroke=0)
        c.setFillColor(INK); c.setFont("Helvetica-Bold", 8); c.drawCentredString(76, y + 2, str(i + 1))
        c.setFillColor(WINE); c.setFont("Helvetica-Bold", 8.5); c.drawString(108, y + 18, week.upper())
        c.setFillColor(INK); c.setFont("Times-Roman", 23); c.drawString(108, y - 5, head)
        para(c, copy, 260, y + 8, 450, 10, 13, "Helvetica", MUTED, 2)
        if i < 3:
            c.setStrokeColor(LINE); c.line(76, y - 14, 76, y - 55)
    box(c, 50, 86, 688, 50, GREEN, 13)
    para(c, "Go-live-Entscheidung erst, wenn alle P0-Gates grün sind. Ein schöner Entwurf allein ist kein produktiver Buchungsbetrieb.", 70, 117, 650, 10.3, 14, "Helvetica-Bold", white)
    c.showPage()

    # 14 sources and definitions
    page_start(c, 14, "13 · Quellen und Begriffe")
    title(c, "Quellen, Messbegriffe und Grenzen")
    para(c, "Die folgenden offiziellen Dokumentationen bilden die technischen Empfehlungen dieses Audits. Social-Media-Performance wurde nicht als virale Behauptung übernommen: Native Reichweiten-, Weiterleitungs- und Kommentarwerte sind nur im jeweiligen Eigentümerkonto verifizierbar.", 50, H - 155, 700, 10.8, 15, "Helvetica", MUTED)
    y = 393
    urls = [
        ("Google Core Web Vitals", "https://developers.google.com/search/docs/appearance/core-web-vitals"),
        ("Google LocalBusiness Structured Data", "https://developers.google.com/search/docs/appearance/structured-data/local-business"),
        ("Google Event Structured Data", "https://developers.google.com/search/docs/appearance/structured-data/event"),
        ("Google Business Profile - local ranking", "https://support.google.com/business/answer/7091?hl=en-en"),
        ("Google Ads - Enhanced Conversions", "https://support.google.com/google-ads/answer/14795081?hl=en"),
        ("Google Consent Mode reference", "https://support.google.com/analytics/answer/13802165"),
        ("Google AI search optimization guide", "https://developers.google.com/search/docs/fundamentals/ai-optimization-guide"),
        ("W3C WCAG 2.2", "https://www.w3.org/TR/WCAG22/"),
    ]
    for label, url in urls:
        y = source(c, f"{label}: {url}", url, 50, y, 688)
    box(c, 50, 86, 688, 54, INK, 14)
    para(c, "Definition: A/B-Test = reale, randomisierte Ausspielung mit ausreichender Stichprobe. Heuristische Analyse = fachliche Hypothese. Dieser Bericht enthält zehn Hypothesen, aber keine erfundenen Testergebnisse.", 70, 118, 650, 10.2, 14, "Helvetica-Bold", white)
    c.showPage()

    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
