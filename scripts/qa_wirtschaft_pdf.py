#!/usr/bin/env python3
"""Ten deterministic QA passes for the Wolfgang presentation PDF."""

from __future__ import annotations

import json
from pathlib import Path

import pdfplumber
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-webstrategie-wolfgang.pdf"
REPORT = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-pdf-qa.json"


def result(name: str, passed: bool, evidence: str) -> dict:
    return {"pass": name, "status": "PASS" if passed else "FAIL", "evidence": evidence}


def main() -> None:
    reader = PdfReader(str(PDF))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    annotations = sum(len(page.get("/Annots", [])) for page in reader.pages)
    pages = len(reader.pages)
    width = float(reader.pages[0].mediabox.width)
    height = float(reader.pages[0].mediabox.height)
    title = (reader.metadata.title if reader.metadata else "") or ""
    details = []
    details.append(result("01 Seitenlogik", pages == 15, f"{pages} Seiten; erwartete Struktur: Cover bis Quellen- und Hinweiseseite."))
    details.append(result("02 A4-Querformat", abs(width - 841.89) < 1 and abs(height - 595.28) < 1, f"{width:.2f} x {height:.2f} pt."))
    details.append(result("03 Metadaten", "Wirtschaft Dornbirn" in title, f"Titel: {title}"))
    details.append(result("04 Textabdeckung", all((page.extract_text() or "").strip() for page in reader.pages), "Jede Seite enthält extrahierbaren Text."))
    details.append(result("05 Vier Gastwege", all(term in text for term in ["Mittagsmenü", "Tisch", "Tickets", "Euer Fest"]), "Vier klare Einstiege vorhanden."))
    details.append(result("06 Nutzenvergleich", "Vorher: Inhalte. Jetzt: Entscheidungen." in text, "Alt-gegen-Neu-Vergleich vorhanden."))
    details.append(result("07 Buchungslogik", "Warteliste" in text and "PERSÖNLICH PLANEN" in text, "Tisch-, Ticket- und Festweg verständlich dargestellt."))
    details.append(result("08 Sicherheitsgrenze", "Produktionsfreigabe" in text and "Ticketzahlung" in text, "Entwurf und echte Zahlungs-/Betriebsreife getrennt."))
    details.append(result("09 Fiktionshinweis & Quellen", "fiktive Fachrollen" in text and "reale Personen" in text and annotations >= 7, f"Fiktiver Prüfrahmen und {annotations} PDF-Link-Anmerkungen vorhanden."))

    with pdfplumber.open(PDF) as pdf:
        out_of_bounds = 0
        tiny_words = 0
        for page in pdf.pages:
            for char in page.chars:
                if char["x0"] < -0.5 or char["x1"] > page.width + 0.5 or char["top"] < -0.5 or char["bottom"] > page.height + 0.5:
                    out_of_bounds += 1
            for word in page.extract_words() or []:
                if word["bottom"] - word["top"] < 3.2:
                    tiny_words += 1
    details.append(result("10 Satzspiegel", out_of_bounds == 0 and tiny_words == 0, f"Außerhalb: {out_of_bounds}; unlesbar klein: {tiny_words}."))

    report = {"pdf": str(PDF), "passes": details, "passed": sum(item["status"] == "PASS" for item in details), "failed": sum(item["status"] == "FAIL" for item in details)}
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
