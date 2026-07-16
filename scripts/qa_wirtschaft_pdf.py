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
    details.append(result("01 Seitenlogik", pages == 29, f"{pages} Seiten; erwartete Struktur: Cover bis Quellen/Schlussseite."))
    details.append(result("02 A4-Querformat", abs(width - 841.89) < 1 and abs(height - 595.28) < 1, f"{width:.2f} x {height:.2f} pt."))
    details.append(result("03 Metadaten", "Wirtschaft Dornbirn" in title, f"Titel: {title}"))
    details.append(result("04 Textabdeckung", all((page.extract_text() or "").strip() for page in reader.pages), "Jede Seite enthält extrahierbaren Text."))
    details.append(result("05 Fiktionshinweis", "keine realen Interviews" in text and "50 Expertenrollen" in text and "Anwendungsszenarien" in text, "Fiktive 50+50-Prüfung klar als nicht reale Studie markiert."))
    details.append(result("06 Nutzenvergleich", "Alte Seite: Inhalte. Neue Seite: Entscheidungen." in text, "Alt-gegen-Neu-Vergleich vorhanden."))
    details.append(result("07 Sicherheitsgrenze", "Produktionsfreigabe" in text and "Zahlungen" in text, "Entwurf und echte Zahlungs-/Betriebsreife getrennt."))
    details.append(result("08 Quellen & Links", annotations >= 13, f"{annotations} PDF-Link-Anmerkungen gefunden."))
    details.append(result("09 Entscheiderstory", "Wolfgang" in text and "90 Tage" in text and "Freigabe" in text, "Persönlicher Entscheidungs- und Umsetzungsabschnitt vorhanden."))

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
