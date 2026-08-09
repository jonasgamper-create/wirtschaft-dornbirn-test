"""Call-Leitfaden: Repository-Zugang für die zweite Person einrichten.

Zwei Spuren nebeneinander - was Jonas macht, was der Kollege macht -
damit beide im Call synchron abhaken koennen.
"""
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, HRFlowable, KeepTogether
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-zugang-onboarding.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

INK = colors.HexColor("#1B1714")
CREAM = colors.HexColor("#F3EEE4")
PAPER = colors.HexColor("#FBF8F1")
BURGUNDY = colors.HexColor("#7B2631")
GREEN = colors.HexColor("#174A3B")
GOLD = colors.HexColor("#D3AA59")
MUTED = colors.HexColor("#6D655D")
LINE = colors.HexColor("#D8CDBD")

STAND = "09.08.2026"
REPO = "https://github.com/jonasgamper-create/wirtschaft-dornbirn-test"

styles = getSampleStyleSheet()
S = styles.add
S(ParagraphStyle(name="Kicker", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=GOLD, spaceAfter=10))
S(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Times-Roman", fontSize=34, leading=34, textColor=INK, spaceAfter=10))
S(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=17, textColor=MUTED, spaceAfter=16))
S(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Times-Roman", fontSize=25, leading=26, textColor=INK, spaceBefore=0, spaceAfter=9))
S(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=BURGUNDY, spaceBefore=11, spaceAfter=5))
S(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.2, textColor=INK, spaceAfter=6))
S(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.4, leading=9.6, textColor=MUTED, spaceAfter=3))
S(ParagraphStyle(name="Tablex", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.6, leading=10.2, textColor=INK))
S(ParagraphStyle(name="TableHead", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.6, leading=9.6, textColor=CREAM))
S(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=10, leading=14, textColor=CREAM))
S(ParagraphStyle(name="Mono", parent=styles["BodyText"], fontName="Courier", fontSize=8.2, leading=11.5, textColor=INK))
S(ParagraphStyle(name="StepNo", parent=styles["BodyText"], fontName="Times-Roman", fontSize=20, leading=21, textColor=BURGUNDY, alignment=TA_CENTER))
S(ParagraphStyle(name="Lane", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.4, leading=9.4, textColor=CREAM))


def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])


def box(text, bg=BURGUNDY, style="Callout"):
    t = Table([[P(text, style)]], colWidths=[171 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 11), ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    return t


def code(text):
    t = Table([[P(text, "Mono")]], colWidths=[171 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EFE8DB")),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


def section(title, kicker=None):
    items = []
    if kicker:
        items.append(P(kicker.upper(), "Kicker"))
    items.append(P(title, "H1x"))
    items.append(HRFlowable(width="100%", thickness=1, color=GOLD, spaceBefore=0, spaceAfter=10))
    return items


def step(number, title, jonas, kollege, note=None):
    """Ein Schritt mit zwei Spuren zum Abhaken."""
    head = Table(
        [[P(str(number), "StepNo"), P(f"<b>{title}</b>", "Bodyx")]],
        colWidths=[14 * mm, 157 * mm],
    )
    head.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    lanes = Table(
        [[P("JONAS", "Lane"), P("KOLLEGE", "Lane")],
         [P(jonas, "Tablex"), P(kollege, "Tablex")]],
        colWidths=[85.5 * mm, 85.5 * mm],
    )
    lanes.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), GREEN),
        ("BACKGROUND", (1, 0), (1, 0), INK),
        ("BACKGROUND", (0, 1), (-1, 1), PAPER),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    parts = [head, lanes]
    if note:
        parts += [Spacer(1, 2 * mm), P(note, "Smallx")]
    parts.append(Spacer(1, 6 * mm))
    return KeepTogether(parts)


def table(data, widths):
    rows = [[c if hasattr(c, "wrap") else P(str(c), "TableHead" if r == 0 else "Tablex")
             for c in row] for r, row in enumerate(data)]
    t = Table(rows, colWidths=widths, repeatRows=1, hAlign="LEFT")
    cmds = [
        ("GRID", (0, 0), (-1, -1), 0.35, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, 0), GREEN),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]
    for i in range(1, len(rows)):
        if i % 2 == 0:
            cmds.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F6F0E7")))
    t.setStyle(TableStyle(cmds))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CREAM)
    canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 7)
    canvas.drawString(18 * mm, 10 * mm, "WIRTSCHAFT DORNBIRN  /  ZUGANG UND ZUSAMMENARBEIT")
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"{STAND}  ·  Seite {doc.page}")
    canvas.restoreState()


doc = BaseDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=18 * mm, rightMargin=18 * mm, topMargin=17 * mm, bottomMargin=18 * mm,
    title="Wirtschaft Dornbirn - Zugang und Zusammenarbeit",
    author="Wirtschaft Dornbirn",
)
doc.addPageTemplates([PageTemplate(
    id="all",
    frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")],
    onPage=footer,
)])

story = []

# ---------------------------------------------------------------- Cover
story += [
    Spacer(1, 10 * mm),
    P("CALL-LEITFADEN  /  ZWEITE PERSON EINRICHTEN", "Kicker"),
    P("Zugang einrichten.<br/>Gemeinsam arbeiten.", "CoverTitle"),
    P("Zum gemeinsamen Durchgehen im Call: links steht, was Jonas macht, "
      "rechts, was der Kollege macht. Beide Spuren laufen parallel - abhaken und weiter.", "CoverSub"),
    Spacer(1, 3 * mm),
    box("Grundregel: Kein geteilter Ordner, kein geteiltes Passwort. Jeder arbeitet mit dem "
        "eigenen GitHub-Konto am selben Repository. Änderungen laufen immer über einen Branch "
        "und einen Pull Request.", GREEN),
    Spacer(1, 6 * mm),
]
overview = [
    ["Schritt", "Wer", "Dauer", "Ergebnis"],
    ["1  Daten sammeln", "Kollege", "2 Min", "GitHub-Handle, MFA aktiv, Rolle geklärt"],
    ["2  main schützen", "Jonas", "3 Min", "Kein direkter Push auf die Live-Seite möglich"],
    ["3  Einladung senden", "Jonas", "1 Min", "Kollege erhält Write-Zugang"],
    ["4  Einladung annehmen", "Kollege", "1 Min", "Zugriff aktiv"],
    ["5  Projekt einrichten", "Kollege", "10 Min", "Repo lokal, npm ci gelaufen, Vorschau läuft"],
    ["6  Teständerung", "Beide", "15 Min", "Ein Pull Request einmal komplett durchgespielt"],
]
story += [table(overview, [38 * mm, 24 * mm, 18 * mm, 91 * mm]), Spacer(1, 6 * mm)]
story += [P("Adressbezug: „wirtschaft“ cafe restaurant bar, Bahnhofstraße 24, 6850 Dornbirn  ·  "
            "Repository: <link href='%s'>%s</link>" % (REPO, REPO.replace("https://", "")), "Smallx")]
story.append(PageBreak())

# ---------------------------------------------------------- Vorbereitung
story += section("Vor dem Call: drei Angaben", "01  /  vorbereitung")
story += [P("Diese drei Dinge braucht Jonas vom Kollegen, bevor die Einladung rausgeht. "
            "Am besten schon vorab per Nachricht schicken, dann dauert der Call nur halb so lang.", "Bodyx")]
prep = [
    ["Was", "Wo findet er das", "Warum"],
    ["GitHub-Benutzername",
     "Oben rechts im Profilmenü oder in der Profil-URL github.com/<name>",
     "Die Einladung geht an den Handle, nicht an die E-Mail. Ein Tippfehler lädt eine fremde Person ein."],
    ["Bestätigung: MFA ist aktiv",
     "github.com/settings/security – Zwei-Faktor oder Passkey einschalten",
     "Ohne zweiten Faktor kein Zugang. Das Repo enthält die Quelle der Live-Seite."],
    ["Gewünschte Rolle",
     "Read = nur mitlesen. Write = Branches und Pull Requests anlegen.",
     "Empfehlung: Write. Damit kann er arbeiten, aber nichts löschen und keine Einstellungen ändern."],
]
story += [table(prep, [38 * mm, 61 * mm, 72 * mm]), Spacer(1, 5 * mm)]
story += [box("Niemals per Nachricht schicken: Passwörter, Wiederherstellungscodes, API-Schlüssel, "
              "Zugangsdaten von Reservierungs- oder Ticketanbietern. Der Zugang läuft ausschließlich "
              "über die GitHub-Einladung.", BURGUNDY)]
story.append(PageBreak())

# ------------------------------------------------------------- Schritte
story += section("Der Call: Schritt für Schritt", "02  /  ablauf")
story.append(step(
    1, "Daten prüfen",
    "Handle laut vorlesen und gemeinsam gegen das Profil prüfen. "
    "Bei Namensgleichheit: Profilbild und Repos vergleichen.",
    "Profil offen halten, damit der Handle zweifelsfrei stimmt. "
    "Zwei-Faktor gemeinsam kurz zeigen.",
    "Genau hier passieren die Fehler: ähnliche Handles sind häufig. Lieber 30 Sekunden länger schauen."
))
story.append(step(
    2, "main schützen – zuerst, nicht später",
    "Settings → Branches → Add branch ruleset. Branch <b>main</b> wählen, "
    "„Require a pull request before merging“ mit 1 Review aktivieren, speichern.",
    "Zuschauen. Der Schutz gilt ab sofort auch für Jonas selbst – das ist gewollt.",
    "Wichtiger als die Einladung: Ohne diesen Schutz kann ein versehentlicher Push die Live-Seite verändern."
))
story.append(step(
    3, "Einladung senden",
    "Settings → Collaborators and teams → Add people. Handle eingeben, "
    "Rolle <b>Write</b> wählen, bestätigen.",
    "Noch nichts tun. Warten, bis die Benachrichtigung ankommt.",
))
story.append(step(
    4, "Einladung annehmen",
    "Kurz bestätigen lassen, dass der Zugriff sichtbar ist.",
    "github.com/notifications öffnen oder den Link aus der E-Mail nutzen → <b>Accept invitation</b>. "
    "Danach das Repository einmal öffnen.",
))
story.append(PageBreak())

story += section("Projekt einrichten und ein Pull Request üben", "03  /  praxis")
story.append(step(
    5, "Projekt lokal einrichten",
    "Beim ersten Durchlauf mitschauen. Node 20 oder neuer wird gebraucht.",
    "Terminal öffnen und die drei Befehle der Reihe nach ausführen (siehe unten). "
    "Danach die Vorschau im Browser öffnen.",
))
story += [
    code("git clone " + REPO + ".git<br/>"
         "cd wirtschaft-dornbirn-test<br/>"
         "npm ci<br/>"
         "npx http-server site -p 8123"),
    Spacer(1, 3 * mm),
    P("Die Vorschau läuft danach auf <b>http://localhost:8123</b>. "
      "Das ist die lokale Arbeitsansicht, nicht die Live-Seite.", "Smallx"),
    Spacer(1, 6 * mm),
]
story.append(step(
    6, "Eine kleine Änderung komplett durchspielen",
    "Den Pull Request prüfen: Diff lesen, Mobile bei 390 px ansehen, "
    "Buchungswege klicken, CI-Ergebnis kontrollieren. Erst dann mergen.",
    "Branch anlegen, eine Kleinigkeit ändern, <b>npm run ci</b> laufen lassen, "
    "committen, pushen und den Pull Request öffnen.",
    "Einmal gemeinsam durchspielen lohnt sich – danach sitzt der Ablauf."
))
story += [
    code("git checkout -b feature/kurzer-name<br/>"
         "# … Änderung machen …<br/>"
         "npm run ci<br/>"
         "git add -A &amp;&amp; git commit -m \"kurze beschreibung\"<br/>"
         "git push -u origin feature/kurzer-name"),
    Spacer(1, 4 * mm),
    box("npm run ci muss grün sein, bevor ein Pull Request gemergt wird. "
        "Die Prüfung deckt Build, Eventdaten, Texte, Public-Build, Datenschutz, "
        "Interaktionen und die Mittagskarte ab.", GREEN),
]
story.append(PageBreak())

# ------------------------------------------------------------ Spielregeln
story += section("Spielregeln – nicht verhandelbar", "04  /  regeln")
story += [P("Diese Punkte gelten für beide gleichermaßen. Sie stehen so auch in CLAUDE.md und SECURITY.md "
            "im Repository.", "Bodyx")]
rules = [
    ["Thema", "Regel", "Warum"],
    ["Branches", "Nie direkt auf main. Jede Änderung als Branch mit Präfix feature/ und Pull Request.",
     "main veröffentlicht die Testseite."],
    ["Eventdaten", "Nur aus site/data/events.json, vorher gegen die offizielle Eventseite geprüft.",
     "Erfundene Termine, Preise oder ein falscher Status kosten Vertrauen und Buchungen."],
    ["Mittagskarte", "Nur aus site/data/lunch-menu.json. Keine Gerichte oder Preise erfinden.",
     "Eine falsche Karte ist für den Gast ein gebrochenes Versprechen."],
    ["Buchung", "Reservierung und Tickets bleiben Weiterleitungen zu den offiziellen Anbietern.",
     "Die Website verarbeitet keine Zahlungs- oder Gästedaten."],
    ["Daten", "Keine echten Gäste-, Zahlungs-, Login- oder API-Daten in Code, Screenshots, Issues oder KI-Prompts.",
     "DSGVO und Sicherheit. Einmal veröffentlicht ist nicht zurückzuholen."],
    ["Tracker", "Keine Analyse- oder Marketing-Skripte ohne geprüfte Einwilligung.",
     "Vorab-Einwilligung ist Pflicht, nicht Kür."],
    ["Bilder", "Große Rohbilder und Videos in den geschützten Drive-Ordner, nicht ins Repository.",
     "Das Repository bleibt schlank und versionierbar."],
]
story += [table(rules, [26 * mm, 82 * mm, 63 * mm])]
story.append(PageBreak())

story += section("Ablage und Links", "05  /  referenz")
story += [P("Ablage außerhalb des Codes", "H2x")]
story += [P("Website und Code leben im Repository. Alles andere gehört in den Drive-Ordner. "
            "Kampagnen- und Projektordner immer mit Datum benennen, zum Beispiel "
            "<b>2026-08-09_kampagne-herbst</b>.", "Bodyx")]
folders = [
    ["Ordner", "Inhalt"],
    ["01_Briefing-und-Freigaben", "Schriftliche Freigaben von Wolfgang, Briefings, Protokolle"],
    ["02_Originalbilder-und-Videos", "Rohmaterial mit Nutzungsrechten"],
    ["03_Eventdaten-und-Texte", "Termine, Texte, Menü-Entwürfe vor der Freigabe"],
    ["04_Rechtliches-DSGVO-Impressum", "Verträge, AVV, Rechtstexte"],
    ["05_Social-Export", "Fertige Posts und Stories"],
    ["06_Archiv", "Abgeschlossenes"],
    ["07_Performance-Marketing", "Kampagnen, Budgets, Auswertungen – je Kampagne ein Datumsordner"],
]
story += [table(folders, [56 * mm, 115 * mm]), Spacer(1, 6 * mm)]

story += [P("Wichtige Links", "H2x")]
links = [
    ["Zweck", "Link"],
    ["Repository und Aufgaben", REPO],
    ["Testseite ansehen", "https://jonasgamper-create.github.io/wirtschaft-dornbirn-test/"],
    ["Offizielle Eventquelle", "https://wirtschaft-dornbirn.at/event/"],
    ["Tischreservierung (offiziell)", "https://tischreservierung.wirtschaft-dornbirn.at/"],
    ["Ausführliche Anleitung im Repo", "docs/onboarding-kollege.md"],
    ["Arbeitsregeln im Repo", "CLAUDE.md und SECURITY.md"],
]
story += [table(links, [52 * mm, 119 * mm]), Spacer(1, 5 * mm)]
story += [P("Die Testseite steht bewusst auf noindex und ist kein Produktivsystem: keine echten "
            "Reservierungen, keine Zahlungen, keine Gästedaten. Sie zeigt den Stand des "
            "main-Branches – lokale Arbeitsstände sind dort noch nicht sichtbar.", "Smallx")]

doc.build(story)
print(f"PDF erstellt: {OUT.relative_to(ROOT)}")
