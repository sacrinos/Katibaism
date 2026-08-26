#!/usr/bin/env python3
"""Parse the Kenya Law Constitution dump into a versioned structured knowledge base."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data/constitution/kenya-law-source.md"
OUT = ROOT / "data/constitution/kenya-2010.v1.json"

CHAPTER_TITLES = {
    1: "SOVEREIGNTY OF THE PEOPLE AND SUPREMACY OF THIS CONSTITUTION",
    2: "THE REPUBLIC",
    3: "CITIZENSHIP",
    4: "THE BILL OF RIGHTS",
    5: "LAND AND ENVIRONMENT",
    6: "LEADERSHIP AND INTEGRITY",
    7: "REPRESENTATION OF THE PEOPLE",
    8: "THE LEGISLATURE",
    9: "THE EXECUTIVE",
    10: "JUDICIARY",
    11: "DEVOLVED GOVERNMENT",
    12: "PUBLIC FINANCE",
    13: "THE PUBLIC SERVICE",
    14: "NATIONAL SECURITY",
    15: "COMMISSIONS AND INDEPENDENT OFFICES",
    16: "AMENDMENT OF THIS CONSTITUTION",
    17: "GENERAL PROVISIONS",
    18: "TRANSITIONAL AND CONSEQUENTIAL PROVISIONS",
}

ARTICLE_CHAPTER = {}
for start, end, chapter in [
    (1, 3, 1),
    (4, 11, 2),
    (12, 18, 3),
    (19, 59, 4),
    (60, 72, 5),
    (73, 80, 6),
    (81, 92, 7),
    (93, 128, 8),
    (129, 158, 9),
    (159, 173, 10),
    (174, 200, 11),
    (201, 231, 12),
    (232, 237, 13),
    (238, 247, 14),
    (248, 254, 15),
    (255, 257, 16),
    (258, 260, 17),
    (261, 264, 18),
]:
    for n in range(start, end + 1):
        ARTICLE_CHAPTER[n] = chapter

PARTS = {
    range(19, 26): "General provisions relating to the Bill of Rights",
    range(26, 52): "Rights and fundamental freedoms",
    range(52, 58): "Specific application of rights",
    range(58, 60): "State of emergency and Kenya National Human Rights and Equality Commission",
    range(60, 69): "Land",
    range(69, 73): "Environment and natural resources",
    range(81, 88): "Electoral system and process",
    range(88, 91): "Independent Electoral and Boundaries Commission",
    range(91, 93): "Political parties",
    range(93, 97): "Establishment and role of Parliament",
    range(97, 106): "Composition and membership of Parliament",
    range(106, 109): "Offices of Parliament",
    range(109, 117): "Procedures for enacting legislation",
    range(117, 126): "Parliament's general procedures and rules",
    range(129, 136): "Principles and structure of the national executive",
    range(136, 152): "The President and Deputy President",
    range(152, 156): "The Cabinet",
    range(159, 169): "Judicial authority and legal system",
    range(169, 171): "Subordinate courts",
    range(171, 174): "Judicial Service Commission",
    range(174, 176): "Objects and principles of devolved government",
    range(176, 186): "County governments",
    range(186, 188): "Functions and powers of county governments",
    range(188, 193): "Boundaries and intergovernmental relations",
    range(201, 206): "Principles and framework of public finance",
    range(206, 211): "Public funds and taxation",
    range(211, 215): "Revenue and borrowing",
    range(215, 220): "Revenue allocation",
    range(220, 225): "Budgets and spending",
    range(225, 228): "Financial control and procurement",
    range(248, 255): "Commissions and independent offices",
}

CONCEPTS: dict[int, list[str]] = {
    1: ["sovereignty", "people", "delegation of power", "State organs"],
    2: ["constitutional supremacy", "invalidity of inconsistent law", "international law"],
    3: ["defence of the Constitution"],
    6: ["devolution", "counties", "access to services"],
    10: ["national values", "participation of the people", "rule of law", "accountability", "human rights"],
    19: ["Bill of Rights", "human dignity", "rights not granted by the State"],
    20: ["application of Bill of Rights", "interpretation of rights"],
    21: ["implementation of rights", "vulnerable groups"],
    22: ["enforcement of rights", "standing"],
    24: ["limitation of rights", "reasonable and justifiable", "less restrictive means"],
    25: ["non-derogable rights", "fair trial", "torture", "slavery", "habeas corpus"],
    27: ["equality", "non-discrimination", "protected grounds"],
    28: ["human dignity"],
    29: ["freedom and security of the person", "arbitrary detention"],
    31: ["privacy", "personal information", "search and seizure"],
    33: ["freedom of expression"],
    35: ["access to information"],
    37: ["assembly", "demonstration", "petition"],
    40: ["property", "compulsory acquisition", "compensation"],
    41: ["labour relations", "fair labour practices"],
    43: ["economic and social rights"],
    47: ["fair administrative action", "reasons", "review"],
    48: ["access to justice"],
    49: ["arrested persons"],
    50: ["fair hearing", "independent court"],
    51: ["detained persons"],
    73: ["leadership", "integrity", "public trust"],
    94: ["legislative authority", "delegated legislation", "Parliament"],
    95: ["National Assembly"],
    96: ["Senate", "counties"],
    109: ["legislative power", "Bills"],
    110: ["Bills concerning county government", "Senate participation"],
    111: ["Special Bills concerning county government"],
    112: ["Ordinary Bills concerning county government"],
    113: ["mediation committee"],
    114: ["Money Bills"],
    115: ["Presidential assent"],
    116: ["commencement of laws"],
    118: ["public participation", "public access"],
    119: ["petition Parliament"],
    160: ["judicial independence"],
    165: ["High Court jurisdiction", "constitutional interpretation"],
    174: ["objects of devolution"],
    185: ["county legislative authority"],
    186: ["division of functions"],
    201: ["public finance principles", "openness", "accountability"],
    209: ["power to impose taxes"],
    210: ["imposition of tax", "waiver"],
    211: ["national borrowing"],
    213: ["loan guarantees"],
    232: ["public service values"],
    248: ["independent commissions"],
    249: ["objects of commissions", "independence"],
    255: ["constitutional amendment", "referendum"],
    256: ["parliamentary amendment"],
    257: ["popular initiative"],
}

TAGS: dict[int, list[str]] = {
    1: ["foundational", "sovereignty"],
    2: ["foundational", "supremacy"],
    3: ["foundational"],
    10: ["values", "governance"],
    24: ["rights", "limitation"],
    25: ["rights", "non-derogable"],
    27: ["rights", "equality"],
    31: ["rights", "privacy"],
    33: ["rights", "expression"],
    35: ["rights", "information"],
    40: ["rights", "property"],
    47: ["rights", "administration"],
    48: ["rights", "justice"],
    50: ["rights", "fair hearing"],
    73: ["integrity"],
    94: ["legislation", "delegation"],
    110: ["procedure", "counties"],
    114: ["procedure", "money"],
    118: ["procedure", "participation"],
    174: ["devolution"],
    186: ["devolution", "functions"],
    201: ["finance"],
    209: ["finance", "taxation"],
    210: ["finance", "taxation"],
    248: ["institutions"],
    249: ["institutions", "independence"],
    255: ["amendment"],
}


def normalize_legal_text(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"https://\S+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    # Insert space after clause markers glued to words: (1)All → (1) All
    text = re.sub(r"(\([0-9]+[a-z]?\))(?=[A-Z])", r"\1 ", text)
    text = re.sub(r"(\([a-z]\))(?=[A-Za-z])", r"\1 ", text)
    text = re.sub(r"(\([ivxlc]+\))(?=[A-Za-z])", r"\1 ", text)
    text = re.sub(r"\.(\([0-9]+[a-z]?\))", r". \1", text)
    text = re.sub(r";(\([0-9a-z]+\))", r"; \1", text)
    text = re.sub(r"—(\d+\.)", r"— \1 ", text)
    text = re.sub(r"(\d+\.)(?=[A-Z])", r"\1 ", text)
    # After closing paren of a clause list before next clause
    text = re.sub(r";(and|or)(\()", r"; \1 \2", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def part_for(article: int) -> str | None:
    for r, title in PARTS.items():
        if article in r:
            return title
    return None


def parse_articles(raw: str) -> list[dict]:
    # Stop before FIRST SCHEDULE / history
    cut = re.search(r"^## FIRST SCHEDULE", raw, re.M)
    body = raw[: cut.start()] if cut else raw

    pattern = re.compile(r"^### (\d+)\.\s+(.+)$", re.M)
    matches = list(pattern.finditer(body))
    articles = []
    for i, m in enumerate(matches):
        number = int(m.group(1))
        title = m.group(2).strip()
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        text = normalize_legal_text(body[start:end])
        chapter = ARTICLE_CHAPTER.get(number)
        articles.append(
            {
                "id": f"art-{number}",
                "kind": "article",
                "article": number,
                "subsection": None,
                "citation": f"Article {number}",
                "title": title,
                "chapter": chapter,
                "chapter_title": CHAPTER_TITLES.get(chapter) if chapter else None,
                "part": part_for(number),
                "text": text,
                "concepts": CONCEPTS.get(number, []),
                "tags": TAGS.get(number, []),
                "source": {
                    "publisher": "National Council for Law Reporting (Kenya Law)",
                    "instrument": "Constitution of Kenya, 2010",
                    "url": "https://new.kenyalaw.org/akn/ke/act/2010/constitution",
                    "version": "kenya-2010.v1",
                },
            }
        )
    return articles


def parse_fourth_schedule(raw: str) -> list[dict]:
    m = re.search(
        r"## FOURTH SCHEDULE(.*?)## FIFTH SCHEDULE",
        raw,
        re.S,
    )
    if not m:
        return []
    block = m.group(1)
    national_m = re.search(r"## Part 1 – NATIONAL GOVERNMENT(.*?)## Part 2", block, re.S)
    county_m = re.search(r"## Part 2 – COUNTY GOVERNMENTS(.*)$", block, re.S)
    items = []
    if national_m:
        items.append(
            {
                "id": "sch-4-part-1",
                "kind": "schedule",
                "article": None,
                "subsection": None,
                "citation": "Fourth Schedule, Part 1",
                "title": "Functions of the national government",
                "chapter": 11,
                "chapter_title": CHAPTER_TITLES[11],
                "part": "Fourth Schedule",
                "text": normalize_legal_text(national_m.group(1)),
                "concepts": [
                    "national functions",
                    "division of functions",
                    "Fourth Schedule",
                ],
                "tags": ["devolution", "functions"],
                "source": {
                    "publisher": "National Council for Law Reporting (Kenya Law)",
                    "instrument": "Constitution of Kenya, 2010",
                    "url": "https://new.kenyalaw.org/akn/ke/act/2010/constitution",
                    "version": "kenya-2010.v1",
                },
            }
        )
    if county_m:
        items.append(
            {
                "id": "sch-4-part-2",
                "kind": "schedule",
                "article": None,
                "subsection": None,
                "citation": "Fourth Schedule, Part 2",
                "title": "Functions of county governments",
                "chapter": 11,
                "chapter_title": CHAPTER_TITLES[11],
                "part": "Fourth Schedule",
                "text": normalize_legal_text(county_m.group(1)),
                "concepts": [
                    "county functions",
                    "division of functions",
                    "Fourth Schedule",
                    "agriculture",
                    "county health",
                    "county transport",
                    "trade licensing",
                ],
                "tags": ["devolution", "functions", "counties"],
                "source": {
                    "publisher": "National Council for Law Reporting (Kenya Law)",
                    "instrument": "Constitution of Kenya, 2010",
                    "url": "https://new.kenyalaw.org/akn/ke/act/2010/constitution",
                    "version": "kenya-2010.v1",
                },
            }
        )
    return items


def main() -> None:
    raw = SOURCE.read_text(encoding="utf-8")
    articles = parse_articles(raw)
    schedules = parse_fourth_schedule(raw)
    missing = [n for n in range(1, 265) if not any(a["article"] == n for a in articles)]
    if missing:
        raise SystemExit(f"Missing articles: {missing}")

    kb = {
        "version": "kenya-2010.v1",
        "instrument": "Constitution of Kenya, 2010",
        "canonical_source": "https://new.kenyalaw.org/akn/ke/act/2010/constitution",
        "publisher": "National Council for Law Reporting (Kenya Law)",
        "published": "2010-09-03",
        "commenced": "2010-08-27",
        "assented": "2010-08-04",
        "notes": [
            "Text extracted from the official Kenya Law HTML publication.",
            "Spacing between clause markers and words has been normalised; wording is otherwise the Kenya Law text.",
            "This file is version-controlled. Do not silently overwrite.",
        ],
        "provisions": articles + schedules,
    }
    OUT.write_text(json.dumps(kb, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(articles)} articles and {len(schedules)} schedule entries to {OUT}")


if __name__ == "__main__":
    main()
