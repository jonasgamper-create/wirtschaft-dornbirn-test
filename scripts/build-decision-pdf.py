from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Image, KeepTogether, HRFlowable
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-buchung-ticket-entscheidung-2026-08.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

INK = colors.HexColor("#1B1714")
CREAM = colors.HexColor("#F3EEE4")
PAPER = colors.HexColor("#FBF8F1")
BURGUNDY = colors.HexColor("#7B2631")
GREEN = colors.HexColor("#174A3B")
GOLD = colors.HexColor("#D3AA59")
MUTED = colors.HexColor("#6D655D")
LINE = colors.HexColor("#D8CDBD")
RED = colors.HexColor("#A64141")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverKicker", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=GOLD, tracking=1.5, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Times-Roman", fontSize=34, leading=34, textColor=INK, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=17, textColor=MUTED, spaceAfter=18))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Times-Roman", fontSize=26, leading=27, textColor=INK, spaceBefore=0, spaceAfter=10))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=BURGUNDY, spaceBefore=10, spaceAfter=5))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.2, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.2, leading=9.2, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name="Tablex", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.0, leading=8.8, textColor=INK))
styles.add(ParagraphStyle(name="TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.1, leading=8.8, textColor=CREAM))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=CREAM, spaceAfter=0))
styles.add(ParagraphStyle(name="Metric", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=15, leading=17, textColor=BURGUNDY, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="MetricLabel", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.2, leading=9, textColor=MUTED, alignment=TA_CENTER))

def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])

def bullet(text, color=BURGUNDY):
    return P(f'<font color="{color.hexval()}">●</font>&nbsp;&nbsp;{text}', "Bodyx")

def table(data, widths, header=True, row_heights=None):
    converted = []
    for r, row in enumerate(data):
        converted.append([cell if hasattr(cell, "wrap") else P(str(cell), "TableHead" if header and r == 0 else "Tablex") for cell in row])
    t = Table(converted, colWidths=widths, repeatRows=1 if header else 0, rowHeights=row_heights, hAlign="LEFT")
    commands = [
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands += [("BACKGROUND", (0, 0), (-1, 0), GREEN), ("TEXTCOLOR", (0, 0), (-1, 0), CREAM)]
    for idx in range(1 if header else 0, len(converted)):
        if idx % 2 == 0:
            commands.append(("BACKGROUND", (0, idx), (-1, idx), colors.HexColor("#F6F0E7")))
    t.setStyle(TableStyle(commands))
    return t

def callout(text, bg=BURGUNDY):
    t = Table([[P(text, "Callout")]], colWidths=[171 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0, bg), ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12), ("TOPPADDING", (0, 0), (-1, -1), 11), ("BOTTOMPADDING", (0, 0), (-1, -1), 11)]))
    return t

def section(title, kicker=None):
    items = []
    if kicker:
        items.append(P(kicker.upper(), "CoverKicker"))
    items.append(P(title, "H1x"))
    items.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceBefore=0, spaceAfter=10))
    return items

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(18 * mm, 10 * mm, "WIRTSCHAFT DORNBIRN  /  ENTSCHEIDUNGSPAPIER")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"05.08.2026  ·  Seite {doc.page}")
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=17 * mm, bottomMargin=18 * mm, title="Wirtschaft Dornbirn - Buchung, Tickets und Go-live", author="OpenAI")
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=footer)])

story = []

# Cover
story += [Spacer(1, 8 * mm), P("ENTSCHEIDUNGSPAPIER  /  PILOT DORNBIRN", "CoverKicker"), P("Buchung, Tickets<br/>und Sicherheit", "CoverTitle"), P("Eine belastbare Empfehlung für Wolfgang: aktuelle Verfügbarkeit, niedrige Fixkosten, ausgelagerter Zahlungsverkehr und ein Go-live ohne versteckte Risiken.", "CoverSub")]
hero = ROOT / "site" / "assets" / "restaurant.webp"
if hero.exists():
    img = Image(str(hero), width=171 * mm, height=70 * mm)
    img.hAlign = "CENTER"
    story.append(img)
story += [Spacer(1, 7 * mm), callout("Klares Verdikt: Das bestehende Ticketist-System bleibt im ersten Rollout erhalten. Die Website führt eventbezogen zur offiziellen Wirtschaft-Seite; Resmio/Reservier.at werden für Tischreservierungen geprüft. Verfügbarkeit und Zahlung leben ausschließlich beim Anbieter.", GREEN), Spacer(1, 7 * mm), P("Adressbezug: „wirtschaft“ cafe restaurant bar, Bahnhofstraße 24, 6850 Dornbirn · deutsch zuerst · Vorarlberg", "Smallx"), PageBreak()]

# Executive decision
story += section("Die Entscheidung in einer Seite", "01  /  verdikt")
story += [P("Das eigentliche Problem ist nicht ein schöner Reservierungsbutton, sondern eine zuverlässige Quelle für Plätze, Tickets, Wartelisten, Stornos und Zahlungen. Eine statische Website kann das nicht selbst garantieren.", "Bodyx"), callout("Eine Quelle der Wahrheit. Keine Kapazitätskopie im Frontend. Kein Kartenfeld im eigenen Code.", BURGUNDY), Spacer(1, 6 * mm)]
metrics = Table([[P("1", "Metric"), P("0", "Metric"), P("30", "Metric"), P("2", "Metric")], [P("Buchungsquelle je Prozess", "MetricLabel"), P("Kartendaten im Frontend", "MetricLabel"), P("Pre-Launch-Szenarien", "MetricLabel"), P("Anbieter-Piloten", "MetricLabel")]], colWidths=[42.7 * mm] * 4)
metrics.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), PAPER), ("BOX", (0, 0), (-1, -1), 0.5, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
story.append(metrics)
story += [P("Meine Empfehlung", "H2x"), bullet("Ticketist: bestehender Eventkanal bleibt im Pilot unverändert. Die Website zeigt Termine und verlinkt pro Event zur offiziellen Wirtschaft-Seite; dort bleiben Kontingent, Warteliste, Checkout und Zahlungsverkehr."), bullet("Tisch: Resmio Premium als konservative Referenz testen. Reservier.at Pro mit 39,90 EUR/Monat bleibt die kostensensitive Vergleichsprobe."), bullet("Migration: pretix Hosted erst dann testen, wenn ein Anbieterwechsel wirtschaftlich und operativ begründet ist; laut Anbieter 2,5 Prozent vom Netto-Ticketpreis, gedeckelt auf 15 EUR, plus Zahlungsanbieter."), bullet("Zahlung: Hosted Checkout des gewählten Anbieters. Nie Kartendaten, Payment-Keys oder Webhooks mit Geheimnissen in GitHub, Prompts oder Frontend."), Spacer(1, 5 * mm), P("Diese Empfehlung ist eine Pre-Launch-Entscheidung, keine rechtliche Freigabe. Der Kunde bleibt Verantwortlicher und muss Dienstleister, Rechtsgrundlagen und Datenflüsse final abnehmen.", "Smallx"), PageBreak()]

# Current audit
story += section("Was heute bereits stimmt - und was nicht", "02  /  audit")
story += [P("Der Liveauftritt der Wirtschaft hat bereits getrennte Wege für Tischreservierung und Veranstaltungen. Die offizielle Website listet Veranstaltungen, Wartelisten und Ticketkategorien; das Reservierungsportal fragt Datum, Personen und Kontaktdaten ab. Das ist eine gute Ausgangslage, aber noch kein gemeinsamer, automatischer Datenfluss.", "Bodyx")]
audit = [
    ["Bereich", "Verifiziert", "Risiko / Lücke", "Konsequenz"],
    ["Tisch", "Separate Reservierungsseite vorhanden", "Website-Kopie kann veralten", "Anbieterlink oder geprüfte Server-Schnittstelle"],
    ["Events", "Offizielle Eventseiten mit Ticket/Warteliste", "Demo-Events im Repo sind statisch", "Eventquelle ersetzen, keine Testdaten live"],
    ["Zahlung", "Bestehender Ticketfluss extern", "Vendor- und PCI-Verantwortung teilen sich", "Hosted Checkout + Verträge + Review"],
    ["Datenschutz", "DSB verlangt Vorab-Einwilligung für nicht notwendige Speicherung", "Social/Analytics-Embeds können vor Consent laden", "Consent-Gate oder keine Embeds"],
    ["Google Maps", "Restaurantprofile können Reservierung/Warteliste verlinken", "Falsche Zeiten/Links kosten Conversion", "Profil als operative Quelle pflegen"],
    ["Website", "Public-Build trennt internes Cockpit", "Mailto ist kein belastbarer Buchungsworkflow", "Nur als Pilot-Fallback behalten"],
]
story += [table(audit, [26 * mm, 43 * mm, 52 * mm, 50 * mm]), Spacer(1, 4 * mm), P("Aktuelle Quellen: <link href='https://wirtschaft-dornbirn.at/'>wirtschaft-dornbirn.at</link>, <link href='https://tischreservierung.wirtschaft-dornbirn.at/'>Tischreservierung</link>, <link href='https://wirtschaft-dornbirn.at/event/'>Events</link>. Der offizielle Auftritt ist die Inhaltsreferenz; die neue Seite darf Termine nur nach bestätigter Synchronisierung anzeigen.", "Smallx"), PageBreak()]

# Provider matrix
story += section("Anbieter-Matrix: Kosten gegen Risiko", "03  /  tools")
provider = [
    ["Option", "Preisstruktur", "Stärken", "Risiko / Prüfung", "Urteil"],
    ["Resmio Basic", "0 EUR/Monat", "Basis-Reservierung, Benachrichtigungen", "Warteliste/Tischplan nicht im Basic-Funktionsumfang sichtbar", "Nur einfacher Test"],
    ["Resmio Premium", "69,90 EUR netto/Monat; 12 Monate Mindestlaufzeit laut Anbieter", "Tischplan, Warteliste, Google Reserve, Erinnerungen, EU-Server-Angabe", "AVV, Subprozessoren, Löschung, Export bestätigen", "Referenz-Pilot"],
    ["Reservier.at Pro", "39,90 EUR/Monat; 30 Tage Test laut Anbieter", "Fixpreis, keine Reservierungsprovision, Warteliste/Kapazität/Google laut Anbieter", "Jüngerer Anbieter; Claims und AVV unabhängig prüfen", "Kosten-Pilot"],
    ["Ticketist", "3,7 % + 1,8 % + fixe Gebühr; 990 EUR Einrichtung laut Preisseite", "Bestehender Österreich-Fit und aktueller Eventfluss", "Fixgebühr auf Preisseite unklar; Datenschutzseite älter", "Nur mit Renewal-Check"],
    ["pretix Hosted", "2,5 % netto je bezahltem Ticket, max. 15 EUR, plus Zahlungsanbieter", "Keine Grundgebühr, Hosted Checkout, offene DPA-Infos, Export/API", "Zahlungsanbieter und Steuer-/Refund-Setup prüfen", "Spätere Option"],
    ["Eventbrite AT", "5,5 % Servicegebühr plus 0,99 EUR je Ticket laut Help Center", "Bekannt, starke Distribution", "Teurer bei kleinen Tickets; Anbieter-/Datenfluss prüfen", "Nicht kostensensitiv"],
    ["Stripe Checkout allein", "z.B. 1,5 % + 0,25 EUR EWR-Karte", "Hosted Payment, niedriger technischer Aufwand", "Keine Tisch-/Ticketlogik, keine Warteliste", "Nur Payment-Baustein"],
]
story += [table(provider, [27 * mm, 35 * mm, 43 * mm, 42 * mm, 24 * mm]), Spacer(1, 5 * mm), P("Preisangaben sind Listenwerte zum Recherchezeitpunkt 05.08.2026 und können sich ändern. Reservier.at, Resmio, Ticketist und pretix stellen Datenschutz-/Sicherheitsmerkmale als Anbieterangaben dar; vor Vertrag zählt die schriftliche Prüfung.", "Smallx"), PageBreak()]

# Availability architecture
story += section("So bleibt die Verfügbarkeit wirklich aktuell", "04  /  architecture")
arch = [
    ["Gäste sehen", "Website zeigt geprüfte Termine und einen klaren Button"],
    ["Buchungsquelle", "Resmio verwaltet Tischkapazität, Tischplan, Warteliste und Bestätigung"],
    ["Ticketquelle", "Ticketist verwaltet im Pilot Kontingente, Checkout, Tickets, Refunds und Einlass"],
    ["Website-Sync", "Entweder Anbieter-Widget/Redirect oder authentifizierte Server-API mit kurzem Cache"],
    ["Fallback", "Wenn Sync ausfällt: keine freie Zahl anzeigen; Link zur Anbieterquelle und Hinweis auf Prüfung"],
    ["Gastgeber", "Backend-Dashboard des Anbieters; niemals öffentliches statisches Cockpit"],
]
story += [table(arch, [43 * mm, 128 * mm]), Spacer(1, 5 * mm), callout("Nicht erlaubt: lokale Kapazitätszahlen, selbst programmierte Ticketzahlung, API-Schlüssel im Frontend, Availability aus dem Browser-Storage oder ein künstlicher Countdown.", RED), Spacer(1, 5 * mm), P("Die Website wird dadurch nicht weniger hochwertig. Sie wird vertrauenswürdiger: Der Button führt immer zur Quelle, die auch das Team verwendet. Eine eigene Anzeige ist erst sinnvoll, wenn ein serverseitiger Adapter Fehler, Cache-Alter, Storno und Anbieter-Ausfall sauber behandelt.", "Bodyx"), P("Payment-Sicherheitslogik", "H2x"), bullet("Hosted Checkout oder vollständige Provider-Weiterleitung. Keine Kartennummern, CVCs oder Payment-Keys in diesem Repository."), bullet("Provider-Due-Diligence: PCI-Status, DPA, Subprozessoren, Refunds, Chargebacks, Support, Logs und Löschung dokumentieren."), bullet("Auch bei ausgelagertem Payment bleibt der Händler für Provider-Auswahl, Verträge, Web-Redirect und seine eigene Website verantwortlich."), PageBreak()]

# DSGVO/security
story += section("DSGVO, TKG und Zahlungsrisiko", "05  /  guardrails")
story += [P("Die Sorge vor einem Risiko durch KI ist berechtigt, aber präzise zu formulieren: KI hackt nicht automatisch den Zahlungsverkehr. Das Risiko entsteht, wenn Kartenfelder, Secrets, Webhooks oder personenbezogene Daten in selbst generierten Code gelangen oder wenn externe Dienste ungeprüft eingebettet werden.", "Bodyx"), callout("Sicherheitsziel: KI darf beim Code helfen, aber nie Zahlungsdaten sehen, keine Produktionsschlüssel erhalten und keine ungeprüfte Zahlungslogik veröffentlichen.", GREEN)]
security = [
    ["Kontrolle", "Go-live-Kriterium"],
    ["Secrets", "Keine API-Keys, Stripe-Secrets, Webhook-Signaturen oder Gästedaten in Git, Prompts, Screenshots oder Frontend"],
    ["Consent", "Nicht notwendige Cookies, Storage, Social-Plugins und Analytics erst nach wirksamer Einwilligung; Reject und Accept gleich sichtbar"],
    ["AVV", "Resmio/Reservier.at, pretix/Ticketist, Payment, Hosting, E-Mail und Analytics in DPA/Subprozessorenliste"],
    ["Zugriff", "Persönliche Konten, MFA/Passkeys, Rollen, Branch Protection, Audit-Log, quartalsweise Rechteprüfung"],
    ["Incident", "Kontakt, Triage, Beweissicherung und DSB-Prozess; Datenschutzverletzungen unverzüglich bewerten"],
    ["Löschung", "Export, Löschfristen, Backups und Test der Anbieter-Löschung dokumentieren"],
]
story += [table(security, [36 * mm, 135 * mm]), Spacer(1, 4 * mm), P("Die österreichische Datenschutzbehörde stellt klar: §165 Abs. 3 TKG 2021 betrifft nicht nur Cookies, sondern technische Speicherung oder Zugriff. Nicht notwendige Speicherungen brauchen vorherige Einwilligung; ein Banner darf nicht nudgen. Die WKO weist auf ECG, UGB, GewO, Mediengesetz und Datenschutzinformationen hin.", "Smallx"), PageBreak()]

# 30 scenarios
story += section("30 Pre-Launch-Szenarien und kritische Top 10", "06  /  tests")
story += [P("Die folgenden 30 Checks sind ein strukturierter Review der Website, der Anbieterarchitektur und der Dokumente. Sie sind kein statistischer A/B-Test mit echten Personen. Ein echter A/B-Test braucht Traffic, zufällige Zuteilung, ein Messkonzept, Einwilligung und genügend Buchungen.", "Bodyx")]
scenarios = [
    ["ID", "Szenario", "Status", "Aktion"],
    ["01", "Mobile Mittagssuche", "GAP", "Provider-Button innerhalb 1 Scroll"],
    ["02", "Mobile Abendtisch", "GAP", "Resmio-Liveflow testen"],
    ["03", "Eventdetail auf iPhone", "GAP", "Echter Providerlink + Preis"],
    ["04", "Ausverkauft", "GAP", "Warteliste aus Anbieterquelle"],
    ["05", "Storno", "GAP", "Provider-Mail und Refund prüfen"],
    ["06", "Kalenderexport", "PART", "Start-/Endzeit vom Eventmaster"],
    ["07", "Doppelbuchung", "GAP", "Anbieter als Lock-Quelle"],
    ["08", "Kapazitätsänderung", "GAP", "Kein Frontend-Cache ohne TTL"],
    ["09", "No-show", "GAP", "Deposit-Regel providerseitig"],
    ["10", "Gruppenanfrage", "PART", "Catering-Workflow getrennt"],
    ["11", "Ticketkontingent", "GAP", "pretix/Ticketist live"],
    ["12", "Refund/Chargeback", "GAP", "Test mit Anbieter"],
    ["13", "Hosted Checkout", "PART", "Keine Kartenfelder auf Website"],
    ["14", "Payment-Key-Leak", "OK", "CI-Secret-Scan aktivieren"],
    ["15", "Webhook-Fälschung", "GAP", "Signatur und Serverprüfung"],
    ["16", "AVV", "GAP", "Provider-Dokumente archivieren"],
    ["17", "Subprozessoren", "GAP", "Transferprüfung"],
    ["18", "Löschung", "GAP", "Export-/Deletion-Test"],
    ["19", "Consent vor Analytics", "OK", "Tracker erst nach Opt-in"],
    ["20", "Social Embed", "GAP", "Click-to-load statt Auto-Embed"],
    ["21", "Tastatur", "PART", "Dialog-/Focus-Test"],
    ["22", "Reduced Motion", "OK", "Motion-Schalter beibehalten"],
    ["23", "LCP Mobile", "GAP", "Hero-Video nur bei Bedarf"],
    ["24", "Broken Link", "OK", "CI-Linkcheck"],
    ["25", "Google Maps CTA", "GAP", "Reservierlink täglich prüfen"],
    ["26", "LocalBusiness JSON-LD", "PART", "Adresse/Öffnungszeiten sync"],
    ["27", "Event-Schema", "GAP", "Nur bestätigte Events ausgeben"],
    ["28", "CTA A/B", "PART", "Extern vs. Mailto messen"],
    ["29", "Social Landing", "PART", "Reel-Link mit Event-CTA"],
    ["30", "Attribution", "GAP", "Consent-basierte Messung"],
]
story += [table(scenarios, [10 * mm, 55 * mm, 20 * mm, 86 * mm]), PageBreak()]

# Marketing and A/B
story += section("Performance-Marketing ohne Dark Patterns", "07  /  growth")
story += [P("Die stärkste Conversion ist nicht künstliche Verknappung, sondern ein wahrer, schneller Weg: Was ist heute möglich, was kostet es, wo ist der Termin, und welcher Button führt zur verbindlichen Quelle?", "Bodyx")]
growth = [
    ["Priorität", "Umsetzung", "Messgröße"],
    ["1. Google Maps", "Öffnungszeiten, Menü, Fotos, Events, Reservierungslink und Telefon synchron halten", "Maps-Aufrufe, Routen, Anrufe, Buchungsklicks"],
    ["2. Mittag", "Tageskarte mit Datum, Preis, Bild und klarer Mittagsreservierung", "Mittagsreservierungsrate, Abbrüche"],
    ["3. Abend", "30-45 Sek. echte Atmosphäre: Raum, Teller, Bühne, Publikum", "Eventdetail -> Checkout"],
    ["4. Vertrauen", "Echte Team-/Ort-Geschichten, keine KI-Gäste, keine Fake-Zahlen", "Direkte Buchung, Saves, qualitative Reviews"],
    ["5. Ads", "Nur freigegebenes Kundenbudget; Conversion-Tracking erst rechtlich sauber", "Kosten pro qualifizierter Buchung"],
]
story += [table(growth, [28 * mm, 95 * mm, 48 * mm]), Spacer(1, 4 * mm), P("Seriöse Forschung findet positive Effekte von Food-Fotos auf Dining Experience und Markenbewertung. Neuere Restaurant-Experimente berichten höhere Social-Engagement-Werte bei outcome-fokussierten Bildern; daraus folgt eine sinnvolle Hypothese, keine Garantie für Dornbirn. Authentische UGC- und Team-Inhalte sollten sichtbar, aber nur mit Einwilligung und Nutzungsrecht eingesetzt werden.", "Bodyx"), P("Sauberes A/B-Testdesign", "H2x"), bullet("A: bestehende Auswahlseite mit erklärenden Szenen. B: direkte Provider-CTAs mit gleicher Preis-/Inhaltsbasis."), bullet("Ein Testziel pro Experiment: completed reservation oder paid ticket, nicht Likes."), bullet("Einheitliche Zeit, Zielgruppe, Traffic-Quelle und Consent-Regel; kein Wechsel der Anbieter während des Tests."), bullet("Stop-Regel für technische Fehler, Reklamationen, Ausverkauft-Fehlanzeige oder Datenschutzabweichung."), PageBreak()]

# Rollout
story += section("Rollout und Freigabe", "08  /  14 tage")
rollout = [
    ["Phase", "Ergebnis", "Owner"],
    ["Tag 1-2", "Wolfgang bestätigt Öffnungszeiten, Preise, Eventmaster, Kapazitäten und Verantwortliche", "Wolfgang"],
    ["Tag 3-5", "Resmio/Reservier.at und pretix/Ticketist Testkonten, AVV, Subprozessoren, Export", "Agentur + Anbieter"],
    ["Tag 6-7", "30 Szenarien auf Mobile/Desktop, Tastatur, Reduced Motion, Checkout und Warteliste", "Zwei Reviewer"],
    ["Tag 8-9", "Google Business Profile, Events, Menü, Bilder, Reservierungslink, UTM/Consent", "Marketing"],
    ["Tag 10-11", "Interne Testkäufe, Storno, Refund, Ausverkauft, Incident und Rollback", "Wolfgang + Agentur"],
    ["Tag 12", "Rechtstexte und Anbieter-Datenflüsse final freigegeben", "Kunde + Beratung"],
    ["Tag 13-14", "Preview -> Production, Monitoring, 7-Tage-Review", "Agentur"],
]
story += [table(rollout, [24 * mm, 111 * mm, 36 * mm]), Spacer(1, 6 * mm), callout("Go-live erst nach echter Testreservierung, echtem Testticket, Wartelisten- und Refund-Test. Bis dahin darf die Website nur Demo- oder Anfragezustände zeigen.", GREEN), Spacer(1, 6 * mm), P("Google Maps-Adresse: <link href='https://www.google.com/maps/search/?api=1&amp;query=Wirtschaft%2C%20Bahnhofstraße%2024%2C%206850%20Dornbirn'>Wirtschaft, Bahnhofstraße 24, 6850 Dornbirn</link>", "Bodyx"), P("Entscheidungsvorlage für Wolfgang", "H2x"), P("Freigabe 1: Anbieter-Pilot. Freigabe 2: Datenfluss und Recht. Freigabe 3: Go-live. Die Website ist dann nicht nur schön, sondern betrieblich wahr.", "Bodyx"), PageBreak()]

# Sources
story += section("Quellen und Prüfgrenzen", "09  /  beleg")
sources = [
    "Resmio Preise und Datenschutz: https://www.resmio.com/en/price/ · https://www.resmio.com/en/help/data-processing/",
    "Reservier.at Preise/Funktionen: https://reservier.at/de/preise · https://reservier.at/de/produkt",
    "Ticketist Preise/Datenschutz: https://www.ticketist.io/preise/ · https://www.ticketist.io/datenschutz/",
    "pretix Preise/DPA/Payment: https://pretix.eu/about/de/pricing · https://pretix.eu/about/en/dpa · https://pretix.eu/about/en/features/payment/",
    "Eventbrite Österreich Gebühren: https://www.eventbrite.at/help/de/articles/755615/was-kostet-die-verwendung-von-eventbrite-als-veranstalter/",
    "Stripe Österreich: https://stripe.com/at/pricing · https://stripe.com/at/payments/checkout",
    "Österreichische Datenschutzbehörde: https://dsb.gv.at/faqs/datenschutz-cookies · https://dsb.gv.at/rechte-pflichten/ihre-pflichten-als-verantwortlicher",
    "PCI Security Standards Council: https://www.pcisecuritystandards.org/faqs/1092/ · https://www.pcisecuritystandards.org/faqs/1604/",
    "Google Business Profile Restaurants: https://business.google.com/us/business-profile/restaurants/",
    "Wirtschaft Dornbirn: https://wirtschaft-dornbirn.at/ · https://wirtschaft-dornbirn.at/event/ · https://tischreservierung.wirtschaft-dornbirn.at/",
    "Social-/Restaurantforschung: https://doi.org/10.1016/j.intmar.2018.10.002 · https://doi.org/10.1016/j.ijhm.2026.104713",
]
for s in sources:
    story.append(bullet(s, GOLD))
story += [Spacer(1, 6 * mm), P("Prüfgrenzen: Öffentliche Social-Media-Interaktionszahlen sind ohne Eigentümerzugriff/Insights nicht verlässlich prüfbar. Anbieter-Websites sind Selbstauskünfte und ersetzen keine AVV-, Subprozessor-, PCI-, Sicherheits- oder Rechtsprüfung. Die 30 Szenarien sind Pre-Launch-QA, kein Nachweis einer Conversion-Steigerung.", "Smallx"), Spacer(1, 12 * mm), callout("Definitive Empfehlung: Ticketist bleibt im ersten Rollout bestehen. Resmio Premium oder der geprüfte bestehende Tischanbieter wird für den Reservierungspilot eingesetzt; Reservier.at und pretix Hosted bleiben Vergleichsoptionen.", BURGUNDY)]

doc.build(story)
print(OUT)
