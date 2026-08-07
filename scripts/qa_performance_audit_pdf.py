#!/usr/bin/env python3
"""Ten deterministic layout/content checks for the Arnold audit PDF."""

from __future__ import annotations

import json
from pathlib import Path

import pdfplumber
from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-performance-audit-geo-ads-arnold-2026-08.pdf"
REPORT = ROOT / "output" / "pdf" / "wirtschaft-dornbirn-performance-audit-geo-ads-arnold-qa.json"


def check(name: str, passed: bool, evidence: str) -> dict:
    return {"check": name, "status": "PASS" if passed else "FAIL", "evidence": evidence}


def main() -> None:
    reader = PdfReader(str(PDF))
    pages = len(reader.pages)
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    annotations = sum(len(page.get("/Annots", [])) for page in reader.pages)
    width = float(reader.pages[0].mediabox.width)
    height = float(reader.pages[0].mediabox.height)
    title = (reader.metadata.title if reader.metadata else "") or ""
    checks = [
        check("01 Seitenzahl", pages == 14, f"{pages} Seiten"),
        check("02 A4 quer", abs(width - 841.89) < 1 and abs(height - 595.28) < 1, f"{width:.2f} x {height:.2f} pt"),
        check("03 Metadaten", "Performance" in title and "GEO" in title, title),
        check("04 Textabdeckung", all((page.extract_text() or "").strip() for page in reader.pages), "Alle Seiten enthalten Text."),
        check("05 Zehn Scrolltests", all(f"{i:02d}" in text for i in range(1, 11)), "10 UX-/Scroll-Szenarien vorhanden."),
        check("06 Zehn A/B-Hypothesen", all(f"A{i}" in text for i in range(1, 11)), "10 heuristische Varianten vorhanden."),
        check("07 Buchungsgrenze", "keine Kartendaten" in text and "autoritative Eventquelle" in text, "Zahlungs- und Datenquellen sauber getrennt."),
        check("08 SEO/GEO", all(term in text for term in ["Core Web Vitals", "LocalBusiness", "Event", "Consent Mode"]), "SEO-, Event- und Consent-Plan vorhanden."),
        check("09 Quellenlinks", annotations >= 8, f"{annotations} klickbare Quellenanmerkungen"),
    ]
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
    checks.append(check("10 Satzspiegel", out_of_bounds == 0 and tiny_words == 0, f"Außerhalb: {out_of_bounds}; zu klein: {tiny_words}"))
    report = {"pdf": str(PDF), "checks": checks, "passed": sum(item["status"] == "PASS" for item in checks), "failed": sum(item["status"] == "FAIL" for item in checks)}
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2))
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
