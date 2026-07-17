#!/usr/bin/env python3
"""Create a concise decision presentation for Wolfgang."""

from __future__ import annotations

from pathlib import Path

from PIL import Image
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "site" / "assets"
OUT = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-webstrategie-wolfgang.pdf"
W, H = landscape(A4)

PAPER = HexColor("#EEE8DC")
INK = HexColor("#17130F")
WINE = HexColor("#7E242B")
GOLD = HexColor("#D9B76B")
GREEN = HexColor("#1D5039")
MUTED = HexColor("#70665D")
SOFT = HexColor("#F8F3EA")


def image_cover(c, path: Path, x, y, w, h, alpha=1.0):
    with Image.open(path) as image:
        iw, ih = image.size
    scale = max(w / iw, h / ih)
    dw, dh = iw * scale, ih * scale
    clip = c.beginPath()
    clip.rect(x, y, w, h)
    c.saveState()
    c.clipPath(clip, stroke=0, fill=0)
    c.setFillAlpha(alpha)
    c.drawImage(ImageReader(str(path)), x + (w - dw) / 2, y + (h - dh) / 2, dw, dh, mask="auto")
    c.restoreState()


def box(c, x, y, w, h, fill, radius=16, stroke=None):
    c.saveState()
    c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.roundRect(x, y, w, h, radius, fill=1, stroke=1)
    else:
        c.roundRect(x, y, w, h, radius, fill=1, stroke=0)
    c.restoreState()


def wrap(text, font, size, width):
    words = text.split()
    lines, line = [], ""
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


def text(c, content, x, y, width, size=11, leading=None, font="Helvetica", color=INK, max_lines=None):
    leading = leading or size * 1.35
    lines = wrap(content, font, size, width)
    if max_lines:
        lines = lines[:max_lines]
    c.setFillColor(color)
    c.setFont(font, size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def eyebrow(c, content, x, y, color=WINE):
    c.setFillColor(color)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(x, y, content.upper())


def headline(c, content, x=50, y=H - 91, width=700, color=INK, size=39):
    c.setFillColor(color)
    c.setFont("Times-Roman", size)
    for line in wrap(content, "Times-Roman", size, width):
        c.drawString(x, y, line)
        y -= size * 1.02
    return y


def footer(c, page, dark=False):
    c.setFillColor(Color(1, 1, 1, .48) if dark else Color(.09, .07, .05, .44))
    c.setFont("Helvetica", 7.5)
    c.drawString(50, 22, "Wirtschaft Dornbirn · Entscheidungsvorlage für Wolfgang · 17.07.2026")
    c.drawRightString(W - 50, 22, f"{page:02d}")


def start(c, page, section, dark=False):
    c.setFillColor(INK if dark else PAPER)
    c.rect(0, 0, W, H, stroke=0, fill=1)
    eyebrow(c, section, 50, H - 34, GOLD if dark else WINE)
    footer(c, page, dark)


def metric(c, x, y, value, caption, color):
    box(c, x, y, 216, 105, SOFT, 15)
    c.setFillColor(color)
    c.setFont("Times-Roman", 34)
    c.drawString(x + 18, y + 58, value)
    text(c, caption, x + 18, y + 35, 178, size=9.5, leading=13, color=MUTED, font="Helvetica-Bold", max_lines=2)


def bullet(c, content, x, y, width, dark=False):
    c.setFillColor(GOLD)
    c.circle(x + 4, y + 3, 3, fill=1, stroke=0)
    return text(c, content, x + 17, y + 7, width - 17, size=10.4, leading=14, color=white if dark else INK) - 5


def link(c, label, url, x, y, width):
    text(c, label, x, y, width, size=8.5, leading=11, color=INK)
    c.linkURL(url, (x, y - 12, x + width, y + 5), relative=0)


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
    c.setTitle("Wirtschaft Dornbirn - Entscheidungsvorlage für Wolfgang")
    c.setAuthor("Wirtschaft Dornbirn · Strategische Webanalyse")
    c.setSubject("Neue Website: Nutzen, Buchungserlebnis, Sicherheit und Umsetzungsentscheidung")

    # 01
    image_cover(c, ASSETS / "restaurant.webp", 0, 0, W, H)
    c.setFillColor(Color(0, 0, 0, .68))
    c.rect(0, 0, W, H, stroke=0, fill=1)
    c.setFillColor(Color(.49, .14, .17, .72))
    c.rect(W * .65, 0, W * .35, H, stroke=0, fill=1)
    box(c, 50, H - 69, 170, 43, Color(1, 1, 1, .9), 10)
    c.drawImage(ImageReader(str(ASSETS / "wirtschaft-logo.png")), 61, H - 59, 148, 34, mask="auto")
    eyebrow(c, "Persönlich für Wolfgang", 50, H - 136, GOLD)
    headline(c, "Eine Website, die Gäste sicher zum passenden Erlebnis führt.", 50, H - 185, 515, white, 44)
    text(c, "Mittag. Tisch. Livekultur. Feste. Eine klare digitale Gastgeberin für Dornbirn und Vorarlberg.", 52, 157, 470, size=15, leading=21, color=Color(1, 1, 1, .78), font="Times-Roman")
    box(c, 50, 58, 330, 48, Color(1, 1, 1, .11), 24, stroke=Color(1, 1, 1, .28))
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(74, 77, "ENTSCHEIDUNGSVORLAGE · JULI 2026")
    footer(c, 1, True)
    c.showPage()

    # 02
    start(c, 2, "Die Entscheidung")
    headline(c, "Die neue Seite löst ein einfaches Problem: Gäste finden schneller, was sie suchen.")
    text(c, "Die Wirtschaft bietet viel. Digital wird daraus erst dann ein Vorteil, wenn jede Person ohne Suchen zum richtigen nächsten Schritt kommt.", 50, H - 183, 690, size=15, leading=21, color=MUTED, font="Times-Roman")
    metric(c, 50, 252, "4", "klare Einstiege statt einer gleichgewichteten Themenmenge", WINE)
    metric(c, 286, 252, "3", "buchbare Hauptwege: Tisch, Ticket und Festanfrage", GREEN)
    metric(c, 522, 252, "1", "gemeinsame Geschichte: Wirtschaft am Mittag, Bühne am Abend", GOLD)
    box(c, 50, 88, 688, 95, INK, 17)
    text(c, "Die Seite ist nicht dazu da, Gäste zu überreden. Sie soll Orientierung geben, Vertrauen schaffen und den gewünschten Weg angenehm kurz machen.", 72, 137, 642, size=16, leading=22, color=white, font="Times-Roman")
    c.showPage()

    # 03
    start(c, 3, "Die Gastwege")
    headline(c, "Vier Wege. Ein Haus.")
    routes = [
        ("01", "Mittagsmenü", "Heute sehen, was passt. Danach direkt anrufen oder reservieren."),
        ("02", "Tisch", "Datum, Zeit und Personen ohne Umweg wählen."),
        ("03", "Tickets", "Termin filtern, Ticket sichern oder in den Kalender legen."),
        ("04", "Euer Fest", "Anlass, Ort und Gästezahl angeben. Danach persönlich planen."),
    ]
    for i, (number, head, copy) in enumerate(routes):
        x = 50 + (i % 2) * 350
        y = 315 - (i // 2) * 145
        box(c, x, y, 320, 113, SOFT, 16)
        c.setFillColor(WINE if i in (0, 3) else GREEN)
        c.setFont("Times-Roman", 27)
        c.drawString(x + 18, y + 69, number)
        c.setFillColor(INK)
        c.setFont("Times-Roman", 23)
        c.drawString(x + 68, y + 70, head)
        text(c, copy, x + 68, y + 45, 225, size=9.6, leading=13, color=MUTED)
    c.showPage()

    # 04
    start(c, 4, "Der Vergleich", dark=True)
    headline(c, "Vorher: Inhalte. Jetzt: Entscheidungen.", color=white)
    text(c, "Keine Pixelkopie der alten Seite, sondern die sichtbare Veränderung der Informationslogik.", 50, H - 148, 650, size=10.5, leading=15, color=Color(1, 1, 1, .6))
    comparisons = [
        ("Bisher", WINE, ["Viele Themen nebeneinander", "Lange Eventliste", "Reservierung getrennt", "Feiern als eines von vielen Themen"]),
        ("Neuer Entwurf", GREEN, ["Vier klare Einstiege", "Monat, Filter, Kalender und Ticket", "Tischweg sichtbar im ganzen Erlebnis", "Feste und Catering mit eigener Führung"]),
    ]
    for index, (heading, color, items) in enumerate(comparisons):
        x = 50 + index * 355
        box(c, x, 123, 325, 295, Color(1, 1, 1, .06), 18, stroke=Color(1, 1, 1, .15))
        c.setFillColor(color)
        c.setFont("Times-Roman", 28)
        c.drawString(x + 22, 375, heading)
        y = 326
        for item in items:
            box(c, x + 22, y, 281, 36, color if index == 1 else Color(1, 1, 1, .13), 10)
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 9.5)
            c.drawString(x + 36, y + 13, item)
            y -= 52
    c.showPage()

    # 05
    start(c, 5, "Buchen ohne Reibung")
    headline(c, "Für jede Absicht gibt es einen klaren Abschluss.")
    flow = [
        ("Tisch", "Tisch reservieren", "Online wählen", "Telefon und E-Mail bleiben sichtbar."),
        ("Ticket", "Termin entdecken", "Offiziell buchen", "Kalender und Warteliste ergänzen den Weg."),
        ("Fest", "Anlass beschreiben", "Persönlich planen", "Verbindlich erst nach Angebot und Freigabe."),
    ]
    for i, (area, start_label, action, note) in enumerate(flow):
        x = 50 + i * 232
        box(c, x, 174, 210, 239, SOFT, 17)
        eyebrow(c, area, x + 18, 381, WINE if i != 1 else GREEN)
        c.setFillColor(INK)
        c.setFont("Times-Roman", 25)
        c.drawString(x + 18, 330, start_label)
        c.setStrokeColor(GOLD)
        c.setLineWidth(2)
        c.line(x + 19, 298, x + 191, 298)
        c.setFillColor(GREEN if i == 1 else WINE)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x + 18, 271, action.upper())
        text(c, note, x + 18, 240, 166, size=9.6, leading=13, color=MUTED)
    text(c, "Die wichtigsten Aktionen sind auf Desktop und Mobil sichtbar. Alternativen bleiben erreichbar, damit niemand in eine Sackgasse gerät.", 50, 104, 685, size=11, leading=16, color=WINE, font="Helvetica-Bold")
    c.showPage()

    # 06
    start(c, 6, "Events & Tickets", dark=True)
    image_cover(c, ASSETS / "live.webp", W * .57, 0, W * .43, H, .92)
    c.setFillColor(Color(0, 0, 0, .43))
    c.rect(W * .57, 0, W * .43, H, stroke=0, fill=1)
    headline(c, "Die Bühne bekommt ihren eigenen Weg zum Ticket.", color=white, width=435)
    y = 333
    for item in [
        "Nach Monaten und Format sortiert statt als unübersichtliche Liste.",
        "Konzert, Comedy/Kabarett und Genuss direkt filtern.",
        "Jeden Abend einzeln oder alle Termine in den Kalender übernehmen.",
        "Bei ausverkauftem Dinner: freiwillige Warteliste statt Sackgasse.",
    ]:
        y = bullet(c, item, 50, y, 440, dark=True)
    box(c, 50, 86, 392, 55, WINE, 14)
    text(c, "Wirkung: Mehr Orientierung vor dem offiziellen Kaufweg.", 70, 109, 350, size=11.5, leading=15, color=white, font="Helvetica-Bold")
    c.showPage()

    # 07
    start(c, 7, "Feiern & Catering")
    image_cover(c, ASSETS / "celebration.webp", 0, 0, W * .48, H)
    c.setFillColor(Color(0, 0, 0, .38))
    c.rect(0, 0, W * .48, H, stroke=0, fill=1)
    headline(c, "Aus einer vagen Idee wird eine gute erste Anfrage.", 440, H - 92, 330, INK, 34)
    text(c, "Hochzeit, Geburtstag, Firmenfest, Kulturhaus oder Wunschort: Die Seite sortiert die Möglichkeiten, bevor das Team persönlich plant.", 440, H - 185, 310, size=12.5, leading=18, color=MUTED, font="Times-Roman")
    for i, item in enumerate(["Anlass", "Ort", "Termin", "Gästezahl"]):
        x = 440 + (i % 2) * 150
        y = 215 - (i // 2) * 72
        box(c, x, y, 133, 49, SOFT, 12)
        c.setFillColor(GREEN if i % 2 else WINE)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(x + 66, y + 19, item.upper())
    text(c, "Wirkung: bessere Anfragen, weniger Rückfragen und keine Standardpaket-Falle.", 440, 86, 310, size=10.5, leading=15, color=WINE, font="Helvetica-Bold")
    c.showPage()

    # 08
    start(c, 8, "Marke & Erinnerung")
    headline(c, "Mittag. Bühne. Foodtruck. Eine Geschichte, die man sich merkt.")
    image_cover(c, ASSETS / "lunch-hand-plate.webp", 50, 130, 205, 240)
    image_cover(c, ASSETS / "eugen-truck-open.webp", 285, 130, 205, 240)
    image_cover(c, ASSETS / "emma-eugen-guitar.webp", 520, 130, 205, 240)
    for x, head, copy in [
        (50, "Mittag", "Der Teller fährt als warme, klare Einladung ins Bild."),
        (285, "Eugen", "Der Foodtruck bringt regionale Küche nach draußen."),
        (520, "Emma", "Musik und Bühne geben den Events einen eigenen Klang."),
    ]:
        eyebrow(c, head, x + 15, 108, WINE if head != "Eugen" else GREEN)
        text(c, copy, x + 15, 87, 174, size=9.4, leading=13, color=MUTED)
    text(c, "Emma und Eugen waren Wolfgangs Großeltern. Die Website erzählt diese Herkunft korrekt: als Inspiration für das mobile Konzept, nicht als erfundene Betriebsgeschichte.", 50, 54, 680, size=10.2, leading=14, color=INK, font="Helvetica-Bold")
    c.showPage()

    # 09
    start(c, 9, "Vertrauen & Sicherheit", dark=True)
    headline(c, "Vertrauen entsteht, wenn die Grenzen klar sind.", color=white)
    cards = [
        ("Heute", "Keine öffentlichen Analyse-Tracker. Keine Browser-Speicherung im Gästebereich."),
        ("Beim Buchen", "Offizieller Anbieter für Reservierung und Ticketzahlung. Klarer Hinweis vor dem Wechsel."),
        ("Vor Go-live", "Verträge, Zahlungsbedingungen, Rollen, Backups und Datenschutzprüfung verbindlich abschließen."),
    ]
    for i, (head, copy) in enumerate(cards):
        x = 50 + i * 232
        box(c, x, 185, 210, 198, Color(1, 1, 1, .07), 16, stroke=Color(1, 1, 1, .14))
        eyebrow(c, head, x + 18, 347, GOLD)
        text(c, copy, x + 18, 308, 170, size=12.2, leading=17, color=white, font="Times-Roman")
    text(c, "Die Gestaltung kann Sicherheit sichtbar machen. Sie ersetzt nie die technische und rechtliche Produktionsfreigabe.", 50, 102, 690, size=11, leading=16, color=GOLD, font="Helvetica-Bold")
    c.showPage()

    # 10
    start(c, 10, "Fiktiver Prüfrahmen")
    headline(c, "100 Perspektiven als Denkwerkzeug - nicht als behaupteter Feldtest.")
    metric(c, 50, 269, "50", "fiktive Fachrollen: UX, Gastro, Ticketing, SEO, A11Y, Security", WINE)
    metric(c, 286, 269, "50", "fiktive Nutzungsszenarien: Mittag, Tisch, Tickets, Fest und Sonderfälle", GREEN)
    metric(c, 522, 269, "0", "reale Personen, aktive Tests oder personenbezogene Daten", GOLD)
    box(c, 50, 102, 688, 96, SOFT, 16)
    text(c, "Die gemeinsame Erkenntnis wäre: Die Seite gewinnt durch weniger Unsicherheit. Für den echten Nachweis folgt nach Freigabe ein moderierter Pilot mit 8-12 Gästen aus Vorarlberg.", 72, 152, 640, size=14, leading=19, color=INK, font="Times-Roman")
    c.showPage()

    # 11
    start(c, 11, "Der geschäftliche Nutzen")
    headline(c, "Was diese Website für die Wirtschaft besser macht.")
    benefits = [
        ("Mehr Abschlüsse", "Reservierung und Ticketweg stehen nicht nebenbei, sondern am richtigen Moment."),
        ("Bessere Anfragen", "Festanfragen enthalten Anlass, Ort, Termin und Gästezahl als gemeinsame Grundlage."),
        ("Weniger Aufwand", "Klare Vorinformation reduziert Rückfragen und erklärt den nächsten Schritt sofort."),
        ("Stärkere Marke", "Mittag, Kultur und Catering bleiben eigenständig - und gehören doch sichtbar zusammen."),
    ]
    for i, (head, copy) in enumerate(benefits):
        x = 50 + (i % 2) * 350
        y = 296 - (i // 2) * 125
        box(c, x, y, 320, 94, SOFT, 16)
        c.setFillColor(WINE if i in (0, 3) else GREEN)
        c.setFont("Times-Roman", 23)
        c.drawString(x + 18, y + 58, head)
        text(c, copy, x + 18, y + 34, 274, size=9.5, leading=13, color=MUTED)
    c.showPage()

    # 12
    start(c, 12, "Vorarlberg & Reichweite")
    headline(c, "Regional auffindbar. Persönlich erlebbar.")
    text(c, "Die Seite wird zur Grundlage für Suche, regionale Eventkalender und Empfehlungen. Nicht durch laute Werbung, sondern durch klare Angebote und verlässliche Informationen.", 50, H - 178, 650, size=14, leading=20, color=MUTED, font="Times-Roman")
    steps = [
        ("Dornbirn", "Adresse, Kontakt und Restaurantprofil konsistent halten."),
        ("Events", "Termine mit Struktur, Kalender und eindeutigen Ticketseiten ausspielen."),
        ("Anlässe", "Eigene Inhalte für Hochzeit, Firmenfest, Kulturhaus und Catering."),
    ]
    for i, (head, copy) in enumerate(steps):
        x = 50 + i * 232
        box(c, x, 194, 210, 138, SOFT, 16)
        eyebrow(c, head, x + 18, 299, WINE if i != 1 else GREEN)
        text(c, copy, x + 18, 263, 170, size=12.2, leading=17, color=INK, font="Times-Roman")
    text(c, "Produktionsschritt: LocalBusiness- und Event-Strukturdaten, gepflegtes Google-Unternehmensprofil und ein klarer regionaler Content-Takt.", 50, 96, 690, size=10.6, leading=15, color=WINE, font="Helvetica-Bold")
    c.showPage()

    # 13
    start(c, 13, "Der Umsetzungsplan")
    headline(c, "Drei kontrollierte Schritte statt eines großen Sprungs.")
    stages = [
        ("01", "Freigeben", "Inhalte, Bildrechte, Zuständigkeiten und Anbieterentscheidung abschließen."),
        ("02", "Verbinden", "Reservierung, Ticketing, Tageskarte und Anfrageprozess produktionsreif integrieren."),
        ("03", "Lernen", "Mit echten Gästen testen, messen und die klarsten Wege weiter verbessern."),
    ]
    for i, (number, head, copy) in enumerate(stages):
        x = 50 + i * 232
        box(c, x, 175, 210, 229, INK if i == 2 else SOFT, 17)
        c.setFillColor(GOLD if i == 2 else WINE)
        c.setFont("Times-Roman", 31)
        c.drawString(x + 18, 349, number)
        c.setFillColor(white if i == 2 else INK)
        c.setFont("Times-Roman", 25)
        c.drawString(x + 18, 295, head)
        text(c, copy, x + 18, 250, 170, size=10.2, leading=14, color=white if i == 2 else MUTED)
    c.showPage()

    # 14
    start(c, 14, "Entscheidung für Wolfgang", dark=True)
    image_cover(c, ASSETS / "celebration.webp", W * .57, 0, W * .43, H, .86)
    c.setFillColor(Color(0, 0, 0, .46))
    c.rect(W * .57, 0, W * .43, H, stroke=0, fill=1)
    headline(c, "Was heute entschieden werden kann.", color=white, width=435)
    y = 328
    for item in [
        "Den Entwurf als gemeinsame digitale Richtung freigeben.",
        "Tisch, Ticket und Fest als die drei wichtigsten Abschlüsse bestätigen.",
        "Produktionsanbieter und rechtliche Freigaben als nächsten Arbeitsschritt beauftragen.",
    ]:
        y = bullet(c, item, 50, y, 440, dark=True)
    box(c, 50, 75, 392, 65, WINE, 15)
    text(c, "Danach wird aus dem Entwurf ein belastbares Buchungs- und Kommunikationssystem.", 70, 108, 350, size=12, leading=16, color=white, font="Times-Roman")
    c.showPage()

    # 15
    start(c, 15, "Quellen & Hinweise")
    headline(c, "Quellen und Grenzen dieser Entscheidungsvorlage.", size=34)
    text(c, "Die Präsentation fasst einen Testentwurf und eine Strategierichtung zusammen. Sie ist keine Rechtsberatung, kein Sicherheitszertifikat und keine Prognose von Umsätzen.", 50, H - 180, 670, size=12.5, leading=18, color=MUTED, font="Times-Roman")
    sources = [
        ("Wirtschaft Dornbirn - bestehende Website und Veranstaltungskalender", "https://wirtschaft-dornbirn.at/"),
        ("Emma & Eugen - offizielle Ursprungsgeschichte", "https://eugen.family/info/"),
        ("Dornbirn Tourismus - regionale Eventübersicht", "https://www.dornbirn.info/de/events"),
        ("Google Search Central - LocalBusiness strukturierte Daten", "https://developers.google.com/search/docs/appearance/structured-data/local-business"),
        ("web.dev - Core Web Vitals", "https://web.dev/articles/vitals"),
        ("EU-Kommission - Schutz vor irreführenden Dark Patterns", "https://commission.europa.eu/topics/consumers/consumer-rights-and-complaints/enforcement-consumer-protection/sweeps_en"),
    ]
    y = 317
    for label, url in sources:
        c.setFillColor(GOLD)
        c.circle(55, y + 3, 3, fill=1, stroke=0)
        link(c, label, url, 70, y + 7, 650)
        y -= 39
    box(c, 50, 69, 688, 72, INK, 15)
    text(c, "Live-Entwurf: jonasgamper-create.github.io/wirtschaft-dornbirn-test/entwurf-cinematic.html", 70, 106, 640, size=10.5, leading=14, color=white, font="Helvetica-Bold")
    c.linkURL("https://jonasgamper-create.github.io/wirtschaft-dornbirn-test/entwurf-cinematic.html", (70, 94, 710, 120), relative=0)
    c.showPage()

    c.save()
    print(OUT)


if __name__ == "__main__":
    build()
