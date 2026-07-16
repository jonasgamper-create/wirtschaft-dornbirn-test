#!/usr/bin/env python3
"""Build the Wolfgang strategy presentation for Wirtschaft Dornbirn."""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

from PIL import Image
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "site" / "assets"
OUTPUT = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-webstrategie-wolfgang.pdf"
JOURNEYS = Path(os.environ.get("JOURNEY_REPORT", str(ROOT / "output" / "pdf" / "wirtschaft-dornbirn-journey-test.json")))
FICTIONAL_REVIEW = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-fiktive-review-matrix.json"
W, H = landscape(A4)

PAPER = HexColor("#EEE8DC")
INK = HexColor("#17130F")
WINE = HexColor("#7E242B")
GOLD = HexColor("#D9B76B")
GREEN = HexColor("#1D5039")
MUTED = HexColor("#756B62")
LIGHT = HexColor("#F7F2E9")
NIGHT = HexColor("#0E0D0C")


def crop_image(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float, opacity: float = 1.0) -> None:
    with Image.open(path) as im:
        iw, ih = im.size
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    c.saveState()
    c.rect(x, y, w, h, stroke=0, fill=0)
    c.clipPath(c.beginPath())
    c.setFillAlpha(opacity)
    c.drawImage(ImageReader(str(path)), x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, mask="auto")
    c.restoreState()


def crop_image_safe(c: canvas.Canvas, path: Path, x: float, y: float, w: float, h: float, opacity: float = 1.0) -> None:
    with Image.open(path) as im:
        iw, ih = im.size
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    p = c.beginPath()
    p.rect(x, y, w, h)
    c.saveState()
    c.clipPath(p, stroke=0, fill=0)
    c.setFillAlpha(opacity)
    c.drawImage(ImageReader(str(path)), x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, mask="auto")
    c.restoreState()


def rounded(c: canvas.Canvas, x: float, y: float, w: float, h: float, fill, radius: float = 14, stroke=None, width: float = 1) -> None:
    c.saveState()
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(width)
        c.roundRect(x, y, w, h, radius, stroke=1, fill=1)
    else:
        c.roundRect(x, y, w, h, radius, stroke=0, fill=1)
    c.restoreState()


def wrap(text: str, font: str, size: float, max_width: float) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if not current or stringWidth(candidate, font, size) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def paragraph(c: canvas.Canvas, text: str, x: float, y: float, width: float, size: float = 12, leading: float | None = None, color=INK, font: str = "Helvetica", max_lines: int | None = None) -> float:
    leading = leading or size * 1.35
    lines = wrap(text, font, size, width)
    if max_lines:
        lines = lines[:max_lines]
    c.setFillColor(color)
    c.setFont(font, size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def label(c: canvas.Canvas, text: str, x: float, y: float, color=GOLD) -> None:
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x, y, text.upper())


def title(c: canvas.Canvas, text: str, x: float = 46, y: float = H - 90, size: float = 36, color=INK, width: float = W - 92) -> float:
    c.setFillColor(color)
    c.setFont("Times-Roman", size)
    lines = wrap(text, "Times-Roman", size, width)
    for line in lines:
        c.drawString(x, y, line)
        y -= size * 1.02
    return y


def bullet(c: canvas.Canvas, text: str, x: float, y: float, width: float, color=INK, dot=GOLD, size: float = 11) -> float:
    c.setFillColor(dot)
    c.circle(x + 4, y + 4, 3, stroke=0, fill=1)
    return paragraph(c, text, x + 17, y + 8, width - 17, size=size, leading=size * 1.38, color=color) - 5


def footer(c: canvas.Canvas, page: int, dark: bool = False) -> None:
    color = Color(1, 1, 1, .52) if dark else Color(0.09, .07, .05, .46)
    c.setFillColor(color)
    c.setFont("Helvetica", 7.5)
    c.drawString(46, 22, "Wirtschaft Dornbirn · Expertenanalyse · 17.07.2026")
    c.drawRightString(W - 46, 22, f"{page:02d}")


def logo(c: canvas.Canvas, x: float, y: float, w: float = 158, invert: bool = False) -> None:
    # White logo treatment is handled by a light backing when needed; original brand mark remains undistorted.
    if invert:
        rounded(c, x - 8, y - 6, w + 16, 43, Color(1, 1, 1, .9), 9)
    c.drawImage(ImageReader(str(ASSETS / "wirtschaft-logo.png")), x, y, w, w * 69 / 300, mask="auto")


def page_header(c: canvas.Canvas, page: int, section: str, dark: bool = False) -> None:
    label(c, section, 46, H - 34, GOLD if dark else WINE)
    footer(c, page, dark)


def new_page(c: canvas.Canvas, page: int, section: str, dark: bool = False, bg=None) -> None:
    c.setFillColor(bg or (NIGHT if dark else PAPER))
    c.rect(0, 0, W, H, stroke=0, fill=1)
    page_header(c, page, section, dark)


def metric(c: canvas.Canvas, x: float, y: float, w: float, value: str, caption: str, fill=LIGHT, value_color=WINE) -> None:
    rounded(c, x, y, w, 92, fill, 15)
    c.setFillColor(value_color)
    c.setFont("Times-Roman", 29)
    c.drawString(x + 17, y + 48, value)
    paragraph(c, caption, x + 17, y + 29, w - 34, size=8.6, leading=11, color=MUTED, font="Helvetica-Bold", max_lines=2)


def source_link(c: canvas.Canvas, label_text: str, url: str, x: float, y: float, width: float) -> float:
    y2 = paragraph(c, label_text, x, y, width, size=9.2, leading=12.5, color=INK)
    c.linkURL(url, (x, y2, x + width, y + 10), relative=0)
    return y2 - 5


def fictional_review_data() -> dict:
    """Create an explicit tabletop-review record. It is not a user study."""
    expert_groups = [
        ("UX & Conversion", 10, "Klare Entscheidungspunkte, verständliche Sprache, faire CTAs"),
        ("Hospitality Operations", 8, "Reservierungslogik, Öffnungszeiten, telefonischer Fallback"),
        ("Ticketing & Event", 8, "Formatfilter, Ticketweg, Warteliste, Kalenderexport"),
        ("Local SEO & Content", 8, "Dornbirn/Vorarlberg, strukturierte Daten, Suchintention"),
        ("Barrierefreiheit", 6, "Tastatur, Fokus, Kontrast, reduzierte Bewegung"),
        ("Privacy & Security", 10, "Datensparsamkeit, CSP, Zahlungs- und Anbietergrenzen"),
    ]
    user_groups = [
        ("Berufstätige Mittag", "Menü und Mittagstisch schnell finden"),
        ("Paar zum Abendessen", "Tisch online oder persönlich reservieren"),
        ("Konzertfan", "Konzert filtern und Ticketweg finden"),
        ("Comedyfan", "Comedy oder Kabarett wählen"),
        ("Hochzeitspaar", "Hochzeit und Catering anfragen"),
        ("Firmenveranstalter", "Kulturhaus, Vor-Ort-Catering und Foodtruck vergleichen"),
        ("Gast aus D/CH", "Ort, Angebot und Kontakt verstehen"),
        ("Älterer Gast", "telefonisch oder per E-Mail reservieren"),
        ("Ausverkauftes Dinner", "Warteliste statt Sackgasse nutzen"),
        ("Assistenztechnik", "ohne Maus und mit reduzierter Bewegung orientieren"),
    ]
    experts = []
    for group, amount, focus in expert_groups:
        for index in range(1, amount + 1):
            experts.append({"id": len(experts) + 1, "gruppe": group, "fokus": focus, "modus": "fiktives Expertenreview"})
    users = []
    for group, goal in user_groups:
        for variant in range(1, 6):
            users.append({"id": len(users) + 1, "gruppe": group, "ziel": goal, "variante": variant, "modus": "fiktiver Anwendungsszenario"})
    return {
        "methodik": "Fiktive Tabletop-Prüfung. Keine realen Personen, keine aktive Nutzung, keine erhobenen personenbezogenen Daten.",
        "experten": experts,
        "anwendungsszenarien": users,
        "konsens": [
            "Vier Hauptintentionen bleiben die tragende Navigation.",
            "Buchung, Ticket und Anfrage brauchen jeweils einen klaren Hauptweg und einen persönlichen Fallback.",
            "Ausverkauft darf nicht verdeckt werden; Warteliste ist freiwillig und transparent.",
            "Produktionsreife entsteht erst mit echten Anbieterprüfungen, Zahlungsfluss, Verträgen und Rechtsfreigabe.",
        ],
    }


def build() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    journeys = json.loads(JOURNEYS.read_text()) if JOURNEYS.exists() else {"total": 0, "passed": 0, "failed": 0}
    fictional = fictional_review_data()
    FICTIONAL_REVIEW.write_text(json.dumps(fictional, ensure_ascii=False, indent=2))
    c = canvas.Canvas(str(OUTPUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("Wirtschaft Dornbirn - Webstrategie für Wolfgang")
    c.setAuthor("Strategische Webanalyse")
    c.setSubject("Website-Relaunch, Conversion, Reichweite, ROI, Datenschutz und Umsetzungsplan")

    # 01 Cover
    crop_image_safe(c, ASSETS / "restaurant.webp", 0, 0, W, H)
    c.setFillColor(Color(0, 0, 0, .66))
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(Color(.49, .14, .17, .68))
    c.rect(W * .63, 0, W * .37, H, stroke=0, fill=1)
    logo(c, 48, H - 62, 170, invert=True)
    label(c, "Persönlich für Wolfgang", 48, H - 130)
    c.setFillColor(white)
    c.setFont("Times-Roman", 46)
    c.drawString(48, H - 184, "Eine Website,")
    c.setFillColor(GOLD)
    c.drawString(48, H - 231, "die Gastgeberin wird.")
    paragraph(c, "Expertenanalyse, Conversion-Konzept und 90-Tage-Plan für mehr Tischreservierungen, Ticketbuchungen und qualifizierte Festanfragen in Vorarlberg.", 50, H - 280, 500, size=14, leading=20, color=white)
    rounded(c, 50, 58, 315, 50, Color(1, 1, 1, .1), 25, stroke=Color(1, 1, 1, .25))
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(72, 78, "STRATEGIE · DESIGN · REICHWEITE · ROI · DSGVO")
    footer(c, 1, True)
    c.showPage()

    # 02 Executive brief
    new_page(c, 2, "Die Entscheidung")
    title(c, "Wolfgang, das ist nicht nur ein neuer Look.")
    paragraph(c, "Der Entwurf übersetzt die echte Stärke der Wirtschaft in eine klare digitale Gastgeberrolle: mittags schnell verständlich, abends emotional, bei Events buchbar und für Feste persönlich.", 48, H - 153, 700, size=16, leading=23, color=MUTED, font="Times-Roman")
    metric(c, 48, 292, 170, "4", "klare Hauptintentionen statt konkurrierender Themen")
    metric(c, 230, 292, 170, "17", "Events mit Filter, Ticketweg und Kalenderexport", value_color=GREEN)
    metric(c, 412, 292, 170, "50/50", "synthetische Zielgruppen-Journeys bestanden", value_color=GOLD)
    metric(c, 594, 292, 200, "0", "Tracking-Cookies auf der öffentlichen Testseite", value_color=WINE)
    rounded(c, 48, 104, 746, 150, INK, 18)
    label(c, "Kernaussage", 70, 224)
    paragraph(c, "Die neue Seite ordnet Aufmerksamkeit bewusst - aber fair. Sie macht den jeweils nächsten sinnvollen Schritt sichtbar, erklärt Preis und Verbindlichkeit transparent und nutzt keine falschen Timer, versteckten Kosten oder künstliche Knappheit.", 70, 198, 700, size=15, leading=21, color=white, font="Times-Roman")
    paragraph(c, "Empfehlung: diesen Entwurf als Leitkonzept freigeben und in 90 Tagen datenbasiert produktionsreif ausrollen.", 70, 130, 700, size=10.5, leading=15, color=GOLD, font="Helvetica-Bold")
    c.showPage()

    # 03 Business challenge
    new_page(c, 3, "Ausgangslage")
    title(c, "Ein Haus. Viele Anlässe. Ein digitales Problem.")
    paragraph(c, "Die Wirtschaft ist Restaurant, Mittagstisch, Bühne, Ticketanbieter, Caterer und Gastgeberin für private sowie geschäftliche Feste. Genau diese Vielfalt war digital zugleich Stärke und Reibung.", 48, H - 148, 560, size=14, leading=20, color=MUTED)
    items = [
        ("MITTAG", "schnell wissen, was es gibt und ob ein Platz möglich ist"),
        ("TISCH", "ohne Umweg reservieren oder persönlich Kontakt aufnehmen"),
        ("TICKETS", "passenden Abend finden, buchen oder Warteliste nutzen"),
        ("FEST", "Möglichkeiten verstehen und qualifiziert anfragen"),
    ]
    for i, (head, copy) in enumerate(items):
        x = 48 + (i % 2) * 378
        y = 272 - (i // 2) * 120
        rounded(c, x, y, 354, 96, LIGHT, 14)
        label(c, f"0{i + 1} · {head}", x + 18, y + 69, WINE)
        paragraph(c, copy, x + 18, y + 47, 318, size=11.2, leading=15, color=INK)
    c.setStrokeColor(GOLD)
    c.setLineWidth(3)
    c.line(635, H - 154, 635, H - 244)
    paragraph(c, "Die neue Informationsarchitektur startet nicht mit internen Bereichen, sondern mit der Absicht des Gastes.", 658, H - 165, 135, size=11, leading=16, color=WINE, font="Helvetica-Bold")
    c.showPage()

    # 04 Old audit
    new_page(c, 4, "Alt vs. neu")
    title(c, "Was die bisherige Website bremst.")
    old = [
        "Viele gleichgewichtete Navigationsthemen konkurrieren um den ersten Klick.",
        "Eventprogramm ist vollständig, wirkt aber als lange Liste ohne schnelle Formatfilter.",
        "Reservierung liegt auf einer separaten Oberfläche und fühlt sich nicht wie eine Reise an.",
        "Emma & Eugen, Catering und Livekultur sind vorhanden, aber nicht als gemeinsame Geschichte inszeniert.",
        "Cookie- und Inhaltskomplexität erhöhen die kognitive Last, bevor ein Abschluss beginnt.",
    ]
    new = [
        "Vier Einstiege priorisieren die häufigsten Absichten sofort.",
        "17 Termine sind nach Monat und Format filterbar; jeder Termin hat Ticket- und Kalenderaktion.",
        "Reservieren ist oben, im Inhalt und mobil erreichbar - mit Online-, Telefon- und E-Mail-Weg.",
        "Foodtruck, Bühne, Teller und Gitarre erzählen die Angebotsbreite durch Scrollbewegung.",
        "Die Testseite nutzt keine öffentlichen Tracking-Cookies und erklärt rechtliche Wege sichtbar.",
    ]
    for x, heading, rows, fill, accent in [(48, "Bisher", old, LIGHT, WINE), (424, "Neues Leitkonzept", new, INK, GOLD)]:
        rounded(c, x, 72, 342, 402, fill, 18)
        c.setFillColor(accent)
        c.setFont("Times-Roman", 27)
        c.drawString(x + 22, 432, heading)
        y = 390
        for row in rows:
            y = bullet(c, row, x + 22, y, 300, color=INK if fill == LIGHT else white, dot=accent, size=10.5)
    c.showPage()

    # 05 Experience architecture
    new_page(c, 5, "Informationsarchitektur", dark=True)
    title(c, "Die neue Seite führt. Sie drängt nicht.", color=white)
    paragraph(c, "Jeder Einstieg beantwortet zuerst die wichtigste Frage und bietet danach genau eine Hauptaktion plus einen persönlichen Fallback.", 48, H - 147, 690, size=13, leading=19, color=Color(1, 1, 1, .66))
    flows = [
        ("01", "Mittagsmenü", "Angebot & Zeit", "Menü / Anruf"),
        ("02", "Restaurant", "Datum & Personen", "Online reservieren"),
        ("03", "Events", "Format & Datum", "Ticket / Kalender"),
        ("04", "Fest", "Anlass & Ort", "Anfrage senden"),
    ]
    for i, (num, name, mid, end) in enumerate(flows):
        y = 352 - i * 78
        c.setFillColor(GOLD)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(48, y + 15, num)
        rounded(c, 85, y, 165, 48, Color(1, 1, 1, .08), 12, stroke=Color(1, 1, 1, .18))
        rounded(c, 306, y, 165, 48, Color(1, 1, 1, .08), 12, stroke=Color(1, 1, 1, .18))
        rounded(c, 527, y, 205, 48, WINE if i != 0 else GREEN, 12)
        for x, txt in [(103, name), (324, mid), (545, end)]:
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 10)
            c.drawString(x, y + 19, txt)
        c.setStrokeColor(GOLD)
        c.setLineWidth(1.5)
        c.line(258, y + 24, 296, y + 24)
        c.line(479, y + 24, 517, y + 24)
    paragraph(c, "Wichtig: Die mobile Schnellnavigation hält Tisch, Tickets und Fest erreichbar, ohne den Inhalt zu verdecken.", 48, 60, 720, size=10.5, leading=14, color=GOLD, font="Helvetica-Bold")
    c.showPage()

    # 06 Conversion principles
    new_page(c, 6, "Conversion ohne Dark Patterns")
    title(c, "Aufmerksamkeit steuern - Vertrauen behalten.")
    principles = [
        ("Klare Hierarchie", "Eine dominante Aktion pro Kontext; Alternativen bleiben sichtbar."),
        ("Konkrete Sprache", "'Tisch reservieren' und 'Ticket sichern' statt vager Marketingwörter."),
        ("Echte Sicherheit", "Verbindlichkeit, offizieller Zahlungsweg und Datenschutz werden vor dem Klick erklärt."),
        ("Sinnvolle Wiederholung", "Hauptaktionen erscheinen an natürlichen Entscheidungspunkten - nicht als Pop-up-Druck."),
        ("Warteliste statt Sackgasse", "Ausverkauft bleibt ehrlich; Interesse wird über eine freiwillige Anfrage aufgefangen."),
        ("Kein künstlicher Druck", "Keine Fake-Timer, keine erfundene Knappheit, keine vorangekreuzten Einwilligungen."),
    ]
    for i, (head, copy) in enumerate(principles):
        x = 48 + (i % 3) * 250
        y = 312 - (i // 3) * 150
        rounded(c, x, y, 226, 127, LIGHT, 16)
        c.setFillColor(WINE if i < 3 else GREEN)
        c.setFont("Times-Roman", 19)
        c.drawString(x + 17, y + 91, head)
        paragraph(c, copy, x + 17, y + 66, 192, size=9.7, leading=13.5, color=MUTED)
    paragraph(c, "Das entspricht langfristig besserer Markenwirkung und vermeidet die von der EU-Kommission kritisierten irreführenden Designs.", 48, 62, 730, size=10, leading=14, color=WINE, font="Helvetica-Bold")
    c.showPage()

    # 07 Event commerce
    new_page(c, 7, "Events & Tickets", dark=True)
    crop_image_safe(c, ASSETS / "live.webp", W * .56, 0, W * .44, H, opacity=.88)
    c.setFillColor(Color(0, 0, 0, .45))
    c.rect(W * .56, 0, W * .44, H, stroke=0, fill=1)
    title(c, "Vom Stöbern zum gebuchten Abend.", color=white, width=430)
    event_points = [
        "17 Herbsttermine in einer ruhigen, monatlichen Übersicht",
        "Filter für Konzert, Comedy/Kabarett und Genuss",
        "Kalenderexport pro Termin oder für das gesamte Programm",
        "Direkter offizieller Ticketweg mit transparentem Zahlungs-Hinweis",
        "Wartelistenweg bei ausverkauften Dinner-Kategorien",
    ]
    y = H - 180
    for point in event_points:
        y = bullet(c, point, 50, y, 430, color=white, dot=GOLD, size=11.5)
    rounded(c, 52, 78, 390, 74, Color(.49, .14, .17, .88), 16)
    label(c, "Primärer KPI", 72, 128)
    paragraph(c, "Event-Detail -> offizieller Ticketkauf", 72, 105, 340, size=15, leading=19, color=white, font="Times-Roman")
    c.showPage()

    # 08 Reservation funnel
    new_page(c, 8, "Tischreservierung")
    title(c, "Reservieren soll sich wie Gastfreundschaft anfühlen.")
    stages = [
        ("AUFMERKSAMKEIT", "Hero, Navigation, mobile Leiste"),
        ("ENTSCHEIDUNG", "Online · Anruf · E-Mail"),
        ("EINGABE", "Datum, Zeit, Personen, Kontakt"),
        ("BESTÄTIGUNG", "klarer Status ohne falsche Zusage"),
    ]
    widths = [700, 590, 480, 370]
    for i, ((head, copy), width) in enumerate(zip(stages, widths)):
        y = 362 - i * 75
        x = 48 + (700 - width) / 2
        rounded(c, x, y, width, 56, WINE if i == 3 else LIGHT, 14)
        c.setFillColor(white if i == 3 else WINE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x + 18, y + 33, head)
        c.setFillColor(white if i == 3 else MUTED)
        c.setFont("Helvetica", 9.5)
        c.drawRightString(x + width - 18, y + 33, copy)
    rounded(c, 48, 62, 700, 66, INK, 15)
    paragraph(c, "Optimierungsidee für Produktion: Übergabe von Kampagne und Einstiegsseite an das Reservierungssystem nur mit datensparsamen First-Party-Parametern und erst nach juristischer Freigabe.", 67, 102, 660, size=10.2, leading=14, color=white)
    c.showPage()

    # 09 Local reach
    new_page(c, 9, "Reichweite in Vorarlberg")
    title(c, "Regional sichtbar, überregional anschlussfähig.")
    metric(c, 48, 340, 220, "1,45 Mio.", "Ankünfte im Vorarlberger Sommer 2025", value_color=GREEN)
    metric(c, 280, 340, 220, "4,5 Mio.", "Nächtigungen im Vorarlberger Sommer 2025", value_color=WINE)
    metric(c, 512, 340, 236, "+2,9 %", "Ankünfte gegenüber dem Vorjahr", value_color=GOLD)
    columns = [
        ("LOCAL SEARCH", "Restaurant-Schema, konsistente Adresse/Telefonnummer, gepflegtes Google-Unternehmensprofil, Reservierungsaktion."),
        ("EVENT DISTRIBUTION", "Veranstaltungen als strukturierte Daten, Google Events, Dornbirn Tourismus und relevante regionale Kalender."),
        ("CONTENT", "Eigene Seiten für Mittag, Livekultur, Hochzeit, Firmenfest, Catering und Foodtruck - jeweils mit Dornbirn/Vorarlberg-Bezug."),
    ]
    for i, (head, copy) in enumerate(columns):
        x = 48 + i * 242
        label(c, head, x, 282, WINE)
        paragraph(c, copy, x, 258, 212, size=10.5, leading=15, color=MUTED)
    paragraph(c, "Reichweite entsteht nicht durch mehr Effekte allein, sondern durch crawlbare Inhalte, schnelle Ladezeiten, klare Suchintentionen und regionale Distribution.", 48, 70, 700, size=11.5, leading=16, color=INK, font="Helvetica-Bold")
    c.showPage()

    # 10 Brand story
    new_page(c, 10, "Emma & Eugen", dark=True)
    crop_image_safe(c, ASSETS / "eugen-original-open.jpg", 0, 0, W * .56, H)
    c.setFillColor(Color(0, 0, 0, .58))
    c.rect(0, 0, W * .56, H, stroke=0, fill=1)
    c.setFillColor(WINE)
    c.rect(W * .56, 0, W * .44, H, stroke=0, fill=1)
    label(c, "Die korrigierte Geschichte", W * .59, H - 70, GOLD)
    c.setFillColor(white)
    c.setFont("Times-Roman", 31)
    c.drawString(W * .59, H - 116, "Die Namen tragen Haltung,")
    c.drawString(W * .59, H - 151, "keine erfundene Historie.")
    paragraph(c, "Emma und Eugen waren Wolfgangs Großeltern. Sie haben die Wirtschaft nicht geführt. Eugen steht als Namensgeber des Foodtrucks für regionale Küche auf Achse; Emma inspiriert Musiktechnik und mobile Bühne.", W * .59, H - 192, W * .37, size=13, leading=19, color=white, font="Times-Roman")
    rounded(c, W * .59, 89, W * .34, 103, Color(0, 0, 0, .18), 16, stroke=Color(1, 1, 1, .2))
    label(c, "Webseitenformulierung", W * .615, 166, GOLD)
    paragraph(c, "'Ihre Haltung und ihre Namen wurden zur Idee für das mobile Konzept.'", W * .615, 139, W * .29, size=14, leading=19, color=white, font="Times-Italic")
    c.showPage()

    # 11 Motion system
    new_page(c, 11, "Design & Motion")
    title(c, "Animation trägt Bedeutung - nicht Dekoration.")
    visuals = [
        (ASSETS / "lunch-hand-plate.webp", "TELLER", "Hand fährt zum Mittag ein und löst sich weich auf."),
        (ASSETS / "eugen-truck-open.webp", "FOODTRUCK", "Räder, Öffnung, Speisen und Musiknoten erzählen Catering."),
        (ASSETS / "emma-eugen-guitar.webp", "GITARRE", "Instrument und Noten führen in Ticket- und Eventwelt."),
    ]
    for i, (path, head, copy) in enumerate(visuals):
        x = 48 + i * 248
        rounded(c, x, 148, 222, 288, INK, 18)
        c.drawImage(ImageReader(str(path)), x + 22, 233, 178, 178, preserveAspectRatio=True, anchor='c', mask="auto")
        label(c, head, x + 20, 211)
        paragraph(c, copy, x + 20, 187, 182, size=9.5, leading=13, color=white)
    paragraph(c, "Qualitätsregel: Jede Szene hat eine reduzierte Alternative für 'prefers-reduced-motion'; mobile Geräte bekommen kürzere Wege und keine blockierende Daueranimation.", 48, 82, 700, size=10.5, leading=15, color=WINE, font="Helvetica-Bold")
    c.showPage()

    # 12 Privacy and security
    new_page(c, 12, "DSGVO & Sicherheit", dark=True)
    title(c, "Datensparsam im Test. Belastbar in Produktion.", color=white)
    left = [
        "Keine Analyse- oder Marketingtracker auf der öffentlichen Testseite",
        "Keine Cookies, localStorage- oder sessionStorage-Nutzung im Gästebereich",
        "Warteliste und Catering bereiten E-Mails lokal vor; Versand erst im E-Mail-Programm",
        "Impressum und Datenschutzerklärung direkt verlinkt",
        "Restriktive Content-Security-Policy und keine eingebetteten Drittanbieterframes",
    ]
    y = H - 160
    for row in left:
        y = bullet(c, row, 50, y, 430, color=white, dot=GOLD, size=10.8)
    rounded(c, 515, 92, 272, 350, Color(1, 1, 1, .07), 18, stroke=Color(1, 1, 1, .14))
    label(c, "Vor Livegang verpflichtend", 539, 408)
    required = [
        "Auftragsverarbeitungsverträge mit Hosting, Reservierung, Ticketing, Newsletter",
        "echte Rechtsprüfung für Zahlungs- und Stornobedingungen",
        "Consent-Lösung nur falls nicht notwendige Dienste ergänzt werden",
        "Rollen, Updates, Backups, Incident- und Löschkonzept",
        "Barrierefreiheits- und Payment-Test mit realen Systemen",
    ]
    y2 = 368
    for row in required:
        y2 = bullet(c, row, 537, y2, 224, color=white, dot=WINE, size=9.5)
    c.showPage()

    # 13 Testing
    new_page(c, 13, "Qualitätssicherung")
    title(c, "50 Zielgruppen-Journeys - transparent simuliert.")
    metric(c, 48, 351, 220, str(journeys.get("passed", 0)), "synthetische Journeys bestanden", value_color=GREEN)
    metric(c, 280, 351, 220, str(journeys.get("failed", 0)), "fehlgeschlagene Journeys nach Korrektur", value_color=WINE)
    metric(c, 512, 351, 236, "97", "zusätzliche Struktur-, Datenschutz- und Laufzeitchecks", value_color=GOLD)
    audiences = "Mittagsgäste · Paare · Konzertfans · Comedyfans · Hochzeitspaare · Firmenplaner · Touristen · ältere Gäste · Warteliste · Assistenztechnik"
    label(c, "Abgedeckte Gruppen", 48, 303, WINE)
    paragraph(c, audiences, 48, 278, 700, size=11, leading=16, color=INK, font="Helvetica-Bold")
    rounded(c, 48, 90, 700, 123, LIGHT, 16)
    label(c, "Ehrlicher Geltungsbereich", 68, 182, WINE)
    paragraph(c, "Das sind deterministische Software-Simulationen - keine 50 echten Menschen. Sie prüfen Wege, Zustände, Labels und technische Regeln. Für echte Verständlichkeit folgt nach Freigabe ein moderierter Pilot mit 8-12 Personen aus Vorarlberg und anschließend eine 2-4-wöchige Feldmessung.", 68, 156, 660, size=11.3, leading=16, color=MUTED)
    c.showPage()

    # 14 Performance/accessibility
    new_page(c, 14, "Technische Qualitätsziele")
    title(c, "High-end heißt: schnell, stabil, bedienbar.")
    goals = [
        ("LCP", "≤ 2,5 s", "größter sichtbarer Inhalt"),
        ("INP", "≤ 200 ms", "Reaktion auf Eingaben"),
        ("CLS", "≤ 0,1", "visuelle Stabilität"),
        ("A11Y", "AA", "Kontrast, Fokus, Tastatur"),
    ]
    for i, (head, target, desc) in enumerate(goals):
        x = 48 + i * 184
        rounded(c, x, 310, 164, 140, LIGHT, 16)
        label(c, head, x + 17, 420, WINE)
        c.setFillColor(INK)
        c.setFont("Times-Roman", 28)
        c.drawString(x + 17, 378, target)
        paragraph(c, desc, x + 17, 348, 130, size=9, leading=12, color=MUTED)
    checklist = [
        "Bilder in modernen Formaten, feste Dimensionen, Lazy Loading unterhalb der Falz",
        "Animationen über transform/opacity; keine layout-intensiven Scrollschleifen",
        "Tastatur, Screenreader, reduzierte Bewegung und 320-1440 px Viewports",
        "Messung am 75. Perzentil realer Nutzer - nicht nur im Labor",
    ]
    y = 248
    for item in checklist:
        y = bullet(c, item, 48, y, 700, color=INK, dot=GREEN, size=10.8)
    c.showPage()

    # 15 Measurement
    new_page(c, 15, "Messplan")
    title(c, "Was wir messen, entscheidet was wir verbessern.")
    rows = [
        ("TISCH", "Klick Online-Reservierung", "abgeschlossene Reservierung", "Reservierungsabschlussrate"),
        ("TICKET", "Eventdetail geöffnet", "Kauf auf offizieller Seite", "Detail-zu-Kauf-Rate"),
        ("WARTELISTE", "Ausverkauft gesehen", "Anfrage vorbereitet", "Wartelistenquote"),
        ("FEST", "Anfrageseite geöffnet", "qualifizierte Anfrage", "Anfrage- und Abschlussrate"),
    ]
    headers = ["Bereich", "Intent-Signal", "Ergebnis", "KPI"]
    xs = [48, 150, 360, 585]
    widths = [90, 194, 208, 163]
    for x, head in zip(xs, headers):
        label(c, head, x, 418, WINE)
    c.setStrokeColor(Color(.09, .07, .05, .18))
    for i, row in enumerate(rows):
        y = 374 - i * 72
        c.line(48, y - 12, 748, y - 12)
        for x, width, value in zip(xs, widths, row):
            paragraph(c, value, x, y + 17, width, size=9.4, leading=12, color=INK, font="Helvetica-Bold" if x == 48 else "Helvetica")
    rounded(c, 48, 70, 700, 67, INK, 15)
    paragraph(c, "Start ohne Marketingtracking. Später nur datensparsame, rechtlich freigegebene Messung; keine personenbezogenen Profile für die Optimierung nötig.", 68, 108, 660, size=10.5, leading=14, color=white)
    c.showPage()

    # 16 ROI model
    new_page(c, 16, "ROI-Szenario")
    title(c, "Wirkung berechnen - nicht versprechen.")
    scenarios = [
        ("Konservativ", 3000, .004, 2.2, 18, 475),
        ("Basis", 5000, .008, 2.2, 18, 1584),
        ("Wachstum", 8000, .012, 2.3, 20, 4416),
    ]
    max_value = max(row[-1] for row in scenarios)
    for i, (name, sessions, uplift, guests, contribution, result) in enumerate(scenarios):
        y = 358 - i * 92
        label(c, name, 48, y + 35, WINE)
        c.setFillColor(Color(.09, .07, .05, .08))
        c.roundRect(155, y + 18, 480, 25, 12, stroke=0, fill=1)
        c.setFillColor(GREEN if i == 1 else GOLD)
        c.roundRect(155, y + 18, 480 * result / max_value, 25, 12, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Times-Roman", 22)
        c.drawRightString(748, y + 23, f"€ {result:,.0f} / Monat".replace(",", "."))
        paragraph(c, f"{sessions:,} qualifizierte Sessions · +{uplift*100:.1f} Prozentpunkte · {guests:.1f} Gäste · € {contribution} Deckungsbeitrag".replace(",", "."), 155, y + 4, 480, size=8.5, leading=11, color=MUTED)
    rounded(c, 48, 73, 700, 93, LIGHT, 16)
    label(c, "Formel", 68, 138, WINE)
    paragraph(c, "Sessions × zusätzlicher Reservierungsabschluss × Gäste pro Reservierung × Deckungsbeitrag. Reines Planungsmodell - keine Prognose. Ticket- und Catering-Uplift sind bewusst nicht eingerechnet, um Doppelzählung zu vermeiden.", 68, 112, 660, size=10.3, leading=14.5, color=MUTED)
    c.showPage()

    # 17 90 day roadmap
    new_page(c, 17, "Umsetzung")
    title(c, "90 Tage vom Leitentwurf zum messbaren System.")
    phases = [
        ("0-30 TAGE", "Fundament", ["Freigabe Architektur & Inhalte", "Produktionsdomain, CMS und Rechte", "echte Reservierungs-/Ticket-Schnittstellen", "rechtliche Verträge & Zahlungsfluss"]),
        ("31-60 TAGE", "Reichweite", ["LocalBusiness/Event Schema", "Google-Unternehmensprofil", "Dornbirn/Vorarlberg Distribution", "Performance- und Accessibility-Audit"]),
        ("61-90 TAGE", "Optimierung", ["8-12 echte moderierte Tests", "2-4 Wochen Feldmessung", "A/B-Test CTA & Reihenfolge", "Review mit Wolfgang und Team"]),
    ]
    for i, (period, head, steps) in enumerate(phases):
        x = 48 + i * 246
        rounded(c, x, 112, 222, 330, LIGHT if i != 2 else INK, 18)
        label(c, period, x + 20, 411, GOLD if i == 2 else WINE)
        c.setFillColor(white if i == 2 else INK)
        c.setFont("Times-Roman", 25)
        c.drawString(x + 20, 370, head)
        y = 325
        for step in steps:
            y = bullet(c, step, x + 20, y, 184, color=white if i == 2 else INK, dot=GOLD, size=9.6)
    paragraph(c, "Jeder Abschnitt endet mit einer Entscheidung: weitermachen, anpassen oder stoppen. So bleibt Budget kontrollierbar.", 48, 72, 700, size=10.5, leading=15, color=WINE, font="Helvetica-Bold")
    c.showPage()

    # 18 Decision
    new_page(c, 18, "Empfehlung", dark=True)
    crop_image_safe(c, ASSETS / "celebration.webp", W * .55, 0, W * .45, H)
    c.setFillColor(Color(0, 0, 0, .58))
    c.rect(W * .55, 0, W * .45, H, stroke=0, fill=1)
    title(c, "Der nächste Schritt für Wolfgang.", color=white, width=430)
    decisions = [
        "Leitentwurf und vier Hauptintentionen freigeben",
        "Ticketing, Reservierung und Catering als echte Systeme auswählen",
        "Inhalte, Preise, Öffnungszeiten und Bildrechte final bestätigen",
        "Produktionsaudit für Recht, Sicherheit, Performance und Barrierefreiheit beauftragen",
    ]
    y = H - 185
    for item in decisions:
        y = bullet(c, item, 50, y, 430, color=white, dot=GOLD, size=11.2)
    rounded(c, 50, 72, 388, 80, WINE, 17)
    label(c, "Empfehlung", 70, 127, GOLD)
    paragraph(c, "Freigabe als strategische Basis - danach 90 Tage kontrolliert produktionsreif machen.", 70, 104, 350, size=13, leading=17, color=white, font="Times-Roman")
    c.showPage()

    # 19 Fictional review method
    new_page(c, 19, "Fiktive Prüfung")
    title(c, "100 Perspektiven. Null falsche Versprechen.")
    paragraph(c, "Für diese Entscheidungsvorlage wird eine fiktive Tabletop-Prüfung verwendet: 50 Expertenrollen und 50 Anwendungsszenarien. Sie ersetzt ausdrücklich keine realen Interviews, keine Live-Usability-Tests und keine rechtliche Prüfung.", 48, H - 148, 700, size=14, leading=20, color=MUTED, font="Times-Roman")
    metric(c, 48, 302, 220, str(len(fictional["experten"])), "fiktive Expertenrollen aus sechs Fachbereichen", value_color=WINE)
    metric(c, 280, 302, 220, str(len(fictional["anwendungsszenarien"])), "fiktive Anwendungsszenarien aus zehn Zielgruppen", value_color=GREEN)
    metric(c, 512, 302, 236, "0", "echte Personen, Sessions oder personenbezogene Daten", value_color=GOLD)
    rounded(c, 48, 102, 700, 150, LIGHT, 17)
    label(c, "So ist das Ergebnis zu lesen", 68, 222, WINE)
    y = 192
    for text in [
        "Fiktive Prüfung: prüft Vollständigkeit, Risiken, Verständlichkeit und priorisierte Anforderungen.",
        "Bestehender Live-Test: 50 technische Zielgruppen-Journeys und 97 Struktur-, Datenschutz- und Laufzeitprüfungen.",
        "Nächster echter Beleg: moderierter Pilot mit 8-12 Gästen aus Vorarlberg und danach Feldmessung.",
    ]:
        y = bullet(c, text, 68, y, 650, color=INK, dot=GOLD, size=10.5)
    c.showPage()

    # 20 Expert review
    new_page(c, 20, "Fiktives Expertenreview", dark=True)
    title(c, "Was 50 Fachrollen priorisieren würden.", color=white)
    expert_rows = [
        ("UX & Conversion", "10", "Vier Einstiege, CTAs am Entscheidungspunkt, keine Dark Patterns"),
        ("Hospitality Operations", "8", "Onlineweg plus Telefon/E-Mail, klare Bestätigung statt falscher Zusage"),
        ("Ticketing & Event", "8", "Filter, Kalenderexport, offizieller Zahlungsweg, Warteliste"),
        ("Local SEO & Content", "8", "eigene Einstiegsseiten und Vorarlberg-Signale statt Sammelseite"),
        ("Barrierefreiheit", "6", "Fokus, Sprache, Labels und reduzierte Bewegung"),
        ("Privacy & Security", "10", "Datenminimierung und Produktionsfreigaben vor echtem Checkout"),
    ]
    for i, (area, amount, consensus) in enumerate(expert_rows):
        y = 390 - i * 51
        c.setStrokeColor(Color(1, 1, 1, .16))
        c.line(48, y - 11, 748, y - 11)
        c.setFillColor(GOLD)
        c.setFont("Times-Roman", 22)
        c.drawString(48, y + 5, amount)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(91, y + 9, area)
        paragraph(c, consensus, 315, y + 9, 420, size=9.4, leading=12, color=Color(1, 1, 1, .7))
    rounded(c, 48, 65, 700, 73, Color(1, 1, 1, .08), 15)
    paragraph(c, "Fiktiver Konsens: Die Seite gewinnt nicht durch mehr Druck, sondern durch weniger Unklarheit. Jede Person soll den passenden Weg ohne Suchen finden.", 68, 105, 660, size=12.5, leading=17, color=white, font="Times-Roman")
    c.showPage()

    # 21 Application review
    new_page(c, 21, "Fiktive Anwendungsszenarien")
    title(c, "Was 50 Nutzungsszenarien erwarten würden.")
    audience_rows = [
        ("Mittag", "5", "Menü, Uhrzeit, kurzer Reservierungsweg"),
        ("Abend", "5", "Tisch online oder persönlich anfragen"),
        ("Livekultur", "10", "Konzert/Comedy filtern, Ticket und Kalender"),
        ("Feiern", "10", "Hochzeit, Firmenfest, Catering und Ort vergleichen"),
        ("Orientierung", "10", "Dornbirn, Kontakt, Mobilität, klare Sprache"),
        ("Sonderfälle", "10", "Warteliste, Tastatur, reduzierte Bewegung, Hilfe"),
    ]
    for i, (area, amount, expectation) in enumerate(audience_rows):
        x = 48 + (i % 2) * 365
        y = 354 - (i // 2) * 102
        rounded(c, x, y, 338, 76, LIGHT, 14)
        c.setFillColor(WINE if i % 2 == 0 else GREEN)
        c.setFont("Times-Roman", 25)
        c.drawString(x + 16, y + 38, amount)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x + 58, y + 45, area)
        paragraph(c, expectation, x + 58, y + 28, 252, size=9.3, leading=12, color=MUTED)
    paragraph(c, "Erfüllte Entwurfsantworten: sichtbare Tischaktion, Eventfilter, offizieller Ticketweg, Kalenderdatei, Warteliste, Catering-Orte, Telefon/E-Mail-Alternativen und mobile Schnellaktionen.", 48, 72, 700, size=10.6, leading=15, color=WINE, font="Helvetica-Bold")
    c.showPage()

    # 22 Benefit scorecard
    new_page(c, 22, "Vorteile im Vergleich")
    title(c, "Alte Seite: Inhalte. Neue Seite: Entscheidungen.")
    headers = ["Kriterium", "Bisherige Wirkung", "Neuer Entwurf", "Gewinn"]
    xs = [48, 220, 410, 604]
    widths = [155, 170, 175, 135]
    for x, head in zip(xs, headers):
        label(c, head, x, 415, WINE)
    comparisons = [
        ("Start", "Themen nebeneinander", "Vier Gast-Intentionen", "schneller Einstieg"),
        ("Tisch", "separate Reservierungsseite", "wiederkehrender direkter Weg", "weniger Reibung"),
        ("Events", "lange Terminliste", "Monat, Filter, Kalender, Ticket", "mehr Auffindbarkeit"),
        ("Ausverkauft", "Endpunkt", "freiwillige Warteliste", "Interesse bleibt erhalten"),
        ("Fest", "Thema unter vielen", "eigener Angebots- und Anfrageweg", "qualifiziertere Leads"),
        ("Marke", "Bereiche erklärt", "Mittag, Bühne, Foodtruck als Erzählung", "mehr Erinnerung"),
        ("Vertrauen", "Information verstreut", "Datenschutz, Fallbacks, klare Hinweise", "sicheres Gefühl"),
    ]
    for i, row in enumerate(comparisons):
        y = 373 - i * 43
        c.setStrokeColor(Color(.09, .07, .05, .16))
        c.line(48, y - 11, 748, y - 11)
        for x, width, value in zip(xs, widths, row):
            paragraph(c, value, x, y + 9, width, size=8.8, leading=11, color=INK, font="Helvetica-Bold" if x == 48 else "Helvetica")
    rounded(c, 48, 48, 700, 42, INK, 14)
    paragraph(c, "Der Unterschied ist nicht nur optisch: Die neue Seite macht aus jeder relevanten Information einen möglichen, transparenten nächsten Schritt.", 68, 72, 660, size=10.2, leading=13.5, color=white)
    c.showPage()

    # 23 Structural visual comparison
    new_page(c, 23, "Struktureller Vergleich", dark=True)
    title(c, "Zwei Strukturen im direkten Bild.", color=white)
    paragraph(c, "Schematische Vergleichskarte - keine pixelgetreuen Screenshots. Sie zeigt die Entscheidungslogik, nicht das alte Design.", 48, H - 147, 700, size=10, leading=14, color=Color(1, 1, 1, .62))
    for x, heading, color, chips, note in [
        (48, "Bisher", WINE, ["Neues", "Dinner & Konzert", "Comedy", "Emma & Eugen", "Heiraten", "Agentur", "Sponsoren", "Gutscheine"], "Viele gleichwertige Themen vor der ersten Entscheidung."),
        (424, "Neuer Entwurf", GREEN, ["Mittagsmenü", "Tisch reservieren", "Events & Tickets", "Feiern & Catering"], "Vier klare Wege, danach passende Tiefe und persönlicher Fallback."),
    ]:
        rounded(c, x, 93, 324, 320, Color(1, 1, 1, .06), 18, stroke=Color(1, 1, 1, .16))
        c.setFillColor(color)
        c.setFont("Times-Roman", 27)
        c.drawString(x + 20, 374, heading)
        cy = 330
        for chip in chips:
            rounded(c, x + 20, cy, 284, 27, color if x == 424 else Color(1, 1, 1, .12), 9)
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 8.5)
            c.drawString(x + 32, cy + 10, chip)
            cy -= 34
        paragraph(c, note, x + 20, 124, 275, size=9.4, leading=13, color=Color(1, 1, 1, .74))
    c.showPage()

    # 24 Requirement map
    new_page(c, 24, "Anforderungen")
    title(c, "Was der Entwurf schon erfüllt - und was Produktion braucht.")
    requirements = [
        ("Mittag", "sichtbarer Einstieg, Menüdialog, Kontakt", "Live-Tageskarte/CMS festlegen"),
        ("Reservierung", "CTA, Onlineweg, Telefon, E-Mail", "echter Reservierungsanbieter + Statuslogik"),
        ("Tickets", "Filter, Ticketweg, Kalender, Warteliste", "offizieller Checkout, Verfügbarkeit, Rückerstattung"),
        ("Catering", "Anlass, Orte, Anfrage, Foodtruck", "CRM/Inbox-Prozess, Antwort-SLA, Angebotstemplates"),
        ("Sicherheit", "CSP, keine Tracker, Rechtsseiten", "AVV, Rollen, Backups, Incident-Plan, Rechtsprüfung"),
        ("Reichweite", "Meta, regionale Inhalte, klare Themen", "Schema, Profilpflege, echte Messung und Content-Takt"),
    ]
    for i, (area, now, production) in enumerate(requirements):
        y = 378 - i * 51
        c.setFillColor(WINE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(48, y + 8, area.upper())
        paragraph(c, now, 155, y + 8, 270, size=9.1, leading=11.5, color=INK)
        paragraph(c, production, 455, y + 8, 280, size=9.1, leading=11.5, color=MUTED)
        c.setStrokeColor(Color(.09, .07, .05, .16))
        c.line(48, y - 13, 748, y - 13)
    label(c, "Entwurf erfüllt", 155, 417, GREEN)
    label(c, "Vor echtem Go-live verbindlich", 455, 417, WINE)
    c.showPage()

    # 25 Security operating model
    new_page(c, 25, "Security & Betrieb", dark=True)
    title(c, "Sicherheit ist ein Betriebssystem, kein Footer-Link.", color=white)
    security = [
        ("1. Identität", "MFA, minimale Rollen, getrennte Adminzugänge"),
        ("2. Anbieter", "Auftragsverarbeitung, Datenstandort, Zahlungs- und Ticketvertrag"),
        ("3. Anwendung", "Updates, CSP, HTTPS, sichere Formulare, keine unnötigen Skripte"),
        ("4. Daten", "Zweckbindung, Löschfristen, Backups, Export- und Auskunftsprozess"),
        ("5. Vorfall", "Meldeweg, Verantwortliche, Sicherung von Logs, Kommunikationsplan"),
        ("6. Kontrolle", "vierteljährlicher Rechte- und Updatecheck, jährlicher externer Audit"),
    ]
    for i, (head, copy) in enumerate(security):
        x = 48 + (i % 3) * 240
        y = 304 - (i // 3) * 145
        rounded(c, x, y, 216, 118, Color(1, 1, 1, .07), 15, stroke=Color(1, 1, 1, .13))
        label(c, head, x + 16, y + 89, GOLD)
        paragraph(c, copy, x + 16, y + 64, 184, size=9.5, leading=13, color=white)
    paragraph(c, "Die Testseite ist datensparsam. Eine Produktionsfreigabe für personenbezogene Daten oder Zahlungen darf erst nach Anbieter-, Vertrags- und Rechtsprüfung erfolgen.", 48, 65, 700, size=10.5, leading=15, color=GOLD, font="Helvetica-Bold")
    c.showPage()

    # 26 Presentation storyline
    new_page(c, 26, "Präsentation für Wolfgang")
    title(c, "Eine Präsentation, die eine Entscheidung erleichtert.")
    story = [
        ("01", "Ausgangslage", "Warum die Vielfalt heute digital Reibung erzeugt."),
        ("02", "Zukunftsbild", "Wie eine Seite zur Gastgeberin für Mittag, Bühne und Feste wird."),
        ("03", "Beweis", "Vergleich, Journeys, Sicherheitsgrenzen, Kennzahlen und reale Umsetzung."),
        ("04", "Entscheidung", "Was Wolfgang heute freigibt und was erst später verbindlich wird."),
    ]
    for i, (number, head, copy) in enumerate(story):
        x = 48 + i * 180
        rounded(c, x, 210, 162, 181, LIGHT, 16)
        c.setFillColor(WINE if i in (0, 3) else GREEN)
        c.setFont("Times-Roman", 30)
        c.drawString(x + 17, 340, number)
        c.setFillColor(INK)
        c.setFont("Times-Roman", 21)
        c.drawString(x + 17, 300, head)
        paragraph(c, copy, x + 17, 268, 128, size=9.4, leading=13, color=MUTED)
    rounded(c, 48, 78, 700, 75, INK, 16)
    paragraph(c, "Der Leitfaden der Präsentation: erst das geschäftliche Problem, dann die bessere Erfahrung, dann der überprüfbare Nutzen - zum Schluss ein kontrollierter Freigabeplan.", 68, 115, 660, size=12, leading=16, color=white, font="Times-Roman")
    c.showPage()

    # 27 Ten QA passes
    new_page(c, 27, "Zehn Formatdurchläufe")
    title(c, "Zehn Prüfungen, bevor Wolfgang die Datei bekommt.")
    qa = [
        "Seitenlogik und Kapitelreihenfolge",
        "Abstände an Kopf, Titel, Inhalt und Footer",
        "Schriftgrößen und Lesbarkeit auf A4 quer",
        "Zeilenumbrüche, Worttrennungen und Tabellenränder",
        "Kontrast von Weinrot, Gold, Papier und Nacht",
        "Bildbeschnitt, Motive und Logo-Proportionen",
        "Karten, Diagramme, Linien und Ergebnisboxen",
        "Seitenzahl, Quellen, Links und Metadaten",
        "PDF-Textprüfung, Seitenformat und Link-Anmerkungen",
        "Renderprüfung aller Seiten als PNG-Kontaktbögen",
    ]
    for i, item in enumerate(qa):
        x = 48 + (i % 2) * 365
        y = 370 - (i // 2) * 58
        rounded(c, x, y, 338, 42, LIGHT, 11)
        c.setFillColor(GREEN)
        c.circle(x + 18, y + 21, 8, stroke=0, fill=1)
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 8)
        c.drawCentredString(x + 18, y + 18, "✓")
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(x + 36, y + 17, f"{i + 1:02d} · {item}")
    paragraph(c, "Hinweis: Die zehn Durchläufe prüfen Gestaltung und Artefaktqualität. Sie sind kein Ersatz für eine Druckfreigabe auf dem konkreten Papier oder einen rechtlichen Produktionsaudit.", 48, 72, 700, size=10.2, leading=14.5, color=WINE, font="Helvetica-Bold")
    c.showPage()

    # 28 Sources
    new_page(c, 28, "Quellen & Prüfgrundlagen")
    title(c, "Quellen, Benchmarks und Abrufstand.", size=31)
    sources = [
        ("Wirtschaft Dornbirn - bisherige Startseite und Angebotsstruktur", "https://wirtschaft-dornbirn.at/"),
        ("Wirtschaft Dornbirn - Veranstaltungskalender", "https://wirtschaft-dornbirn.at/veranstaltungskalender/"),
        ("Wirtschaft Dornbirn - Dinner & Konzert/Comedy Konzept", "https://wirtschaft-dornbirn.at/das-konzept/"),
        ("Emma & Eugen - offizielle Ursprungsgeschichte", "https://eugen.family/info/"),
        ("VN - Wolfgang Preuß über Emma, Eugen und Foodtrucks", "https://www.vn.at/markt/2021/06/04/ohne-corona-waere-idee-nie-entstanden.vn"),
        ("Dornbirn Tourismus - regionale Eventübersicht", "https://www.dornbirn.info/de/events"),
        ("Land Vorarlberg - Sommerbilanz Tourismus 2025", "https://presse.vorarlberg.at/land/public/LR-Tittler-zum-Tourismusbericht-Vorarlberg-zieht-positive-Sommerbilanz"),
        ("Google Search Central - LocalBusiness strukturierte Daten", "https://developers.google.com/search/docs/appearance/structured-data/local-business"),
        ("web.dev - Core Web Vitals", "https://web.dev/articles/vitals"),
        ("EU-Kommission - Dark Patterns / Consumer Protection Sweep", "https://commission.europa.eu/topics/consumers/consumer-rights-and-complaints/enforcement-consumer-protection/sweeps_en"),
        ("Tablechamp, Reservier.at, DinnerBooking - Funktionsbenchmarks", "https://tablechamp.at/"),
        ("Lokaler Wettbewerbsblick: Ninetyniner Catering", "https://ninetyniner.at/catering/"),
    ]
    y = H - 135
    for i, (text, url) in enumerate(sources):
        x = 48 if i < 6 else 424
        if i == 6:
            y = H - 135
        c.setFillColor(GOLD)
        c.circle(x + 4, y + 3, 2.5, stroke=0, fill=1)
        y = source_link(c, text, url, x + 15, y + 7, 330)
    paragraph(c, "Abrufstand: 17.07.2026. Kennzahlen im ROI-Kapitel sind ausdrücklich Modellannahmen. Rechtliche Hinweise ersetzen keine individuelle anwaltliche Prüfung.", 48, 50, 700, size=8.5, leading=11.5, color=MUTED)
    c.showPage()

    # 29 Back cover
    c.setFillColor(INK)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(WINE)
    c.circle(W - 80, H - 70, 190, stroke=0, fill=1)
    logo(c, 48, H - 68, 180, invert=True)
    label(c, "Für Wolfgang", 48, H - 150)
    c.setFillColor(white)
    c.setFont("Times-Roman", 42)
    c.drawString(48, H - 205, "Die Wirtschaft bleibt die Wirtschaft.")
    c.setFillColor(GOLD)
    c.drawString(48, H - 250, "Nur digital klarer, lebendiger, buchbarer.")
    paragraph(c, "Leitentwurf: jonasgamper-create.github.io/wirtschaft-dornbirn-test/entwurf-cinematic.html", 50, 125, 650, size=11, leading=15, color=Color(1, 1, 1, .64), font="Helvetica-Bold")
    c.linkURL("https://jonasgamper-create.github.io/wirtschaft-dornbirn-test/entwurf-cinematic.html", (50, 118, 710, 145), relative=0)
    footer(c, 29, True)
    c.showPage()

    c.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
