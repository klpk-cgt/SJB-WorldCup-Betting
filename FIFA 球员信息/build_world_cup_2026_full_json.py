#!/usr/bin/env python3
"""
Generate a full 2026 World Cup squad JSON:
- FIFA official final squads are the canonical roster source.
- Chinese names/clubs are read from the Chinese Wikipedia squad page.
- Market values are read from the public Transfermarkt-derived dataset.
- Age is calculated as of 2026-06-11.
- Players within every team are sorted by market_value_eur descending.
- Ambiguous matches remain null and are written to a validation report.

Run:
    python -m pip install pandas requests pdfplumber beautifulsoup4 lxml \
        rapidfuzz opencc-python-reimplemented
    python build_world_cup_2026_full_json.py

Output:
    world_cup_2026_squads_market_value.json
    world_cup_2026_squads_validation.json
"""

from __future__ import annotations

import gzip
import io
import json
import re
import unicodedata
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pandas as pd
import pdfplumber
import requests
from bs4 import BeautifulSoup
from opencc import OpenCC
from rapidfuzz import fuzz

FIFA_PDF_URL = "https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf"
PLAYERS_CSV_URL = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz"
ZH_WIKI_URL = "https://zh.wikipedia.org/wiki/2026年國際足協世界盃參賽球員名單"

OUTPUT_JSON = Path("world_cup_2026_squads_market_value.json")
VALIDATION_JSON = Path("world_cup_2026_squads_validation.json")
REFERENCE_DATE = date(2026, 6, 11)
SNAPSHOT_DATE = date.today().isoformat()

GROUP_ORDER_CODES = [
    "MEX", "RSA", "KOR", "CZE",
    "CAN", "BIH", "QAT", "SUI",
    "BRA", "MAR", "HAI", "SCO",
    "USA", "PAR", "AUS", "TUR",
    "GER", "CUW", "CIV", "ECU",
    "NED", "JPN", "SWE", "TUN",
    "BEL", "EGY", "IRN", "NZL",
    "ESP", "CPV", "KSA", "URU",
    "FRA", "SEN", "IRQ", "NOR",
    "ARG", "ALG", "AUT", "JOR",
    "POR", "COD", "UZB", "COL",
    "ENG", "CRO", "GHA", "PAN",
]

TEAM_NAME_ZH = {
    "MEX":"墨西哥","RSA":"南非","KOR":"韩国","CZE":"捷克",
    "CAN":"加拿大","BIH":"波黑","QAT":"卡塔尔","SUI":"瑞士",
    "BRA":"巴西","MAR":"摩洛哥","HAI":"海地","SCO":"苏格兰",
    "USA":"美国","PAR":"巴拉圭","AUS":"澳大利亚","TUR":"土耳其",
    "GER":"德国","CUW":"库拉索","CIV":"科特迪瓦","ECU":"厄瓜多尔",
    "NED":"荷兰","JPN":"日本","SWE":"瑞典","TUN":"突尼斯",
    "BEL":"比利时","EGY":"埃及","IRN":"伊朗","NZL":"新西兰",
    "ESP":"西班牙","CPV":"佛得角","KSA":"沙特阿拉伯","URU":"乌拉圭",
    "FRA":"法国","SEN":"塞内加尔","IRQ":"伊拉克","NOR":"挪威",
    "ARG":"阿根廷","ALG":"阿尔及利亚","AUT":"奥地利","JOR":"约旦",
    "POR":"葡萄牙","COD":"刚果民主共和国","UZB":"乌兹别克斯坦","COL":"哥伦比亚",
    "ENG":"英格兰","CRO":"克罗地亚","GHA":"加纳","PAN":"巴拿马",
}

TABLE_SETTINGS = {
    "vertical_strategy": "lines",
    "horizontal_strategy": "lines",
    "intersection_tolerance": 5,
    "snap_tolerance": 3,
    "join_tolerance": 3,
    "edge_min_length": 3,
    "min_words_vertical": 1,
    "min_words_horizontal": 1,
}

SESSION = requests.Session()
SESSION.headers.update({"User-Agent": "Mozilla/5.0 WorldCupDataBuilder/1.0"})
CC = OpenCC("t2s")


def get_bytes(url: str) -> bytes:
    response = SESSION.get(url, timeout=120)
    response.raise_for_status()
    return response.content


def clean_cell(value: Any) -> str:
    return str(value or "").replace("\n", " ").replace("«", "fi").strip()


def normalize_name(value: Any) -> str:
    value = unicodedata.normalize("NFKD", str(value or ""))
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.lower().replace("ß", "ss")
    value = re.sub(r"[^a-z0-9]+", "", value)
    return value


def calc_age(dob: date) -> int:
    return REFERENCE_DATE.year - dob.year - (
        (REFERENCE_DATE.month, REFERENCE_DATE.day) < (dob.month, dob.day)
    )


def parse_fifa_pdf(pdf_bytes: bytes) -> list[dict[str, Any]]:
    teams: list[dict[str, Any]] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as document:
        for page_number, page in enumerate(document.pages, start=1):
            text = page.extract_text() or ""
            team_name_en = team_code = None
            for line in [x.strip() for x in text.splitlines() if x.strip()][:15]:
                match = re.match(r"^(.*?)\s*\(([A-Z]{3})\)$", line)
                if match:
                    team_name_en, team_code = match.group(1).strip(), match.group(2)
                    break
            if not team_code:
                raise RuntimeError(f"Could not identify team on FIFA PDF page {page_number}")

            table = max(page.extract_tables(TABLE_SETTINGS), key=len)
            header = [clean_cell(cell) for cell in table[0]]
            required = [
                "#", "POS", "PLAYER NAME", "FIRST NAME(S)", "LAST NAME(S)",
                "NAME ON SHIRT", "DOB", "CLUB", "HEIGHT (CM)"
            ]
            idx = {label: header.index(label) for label in required}

            players = []
            for row in table[1:]:
                values = [clean_cell(cell) for cell in row]
                if len(values) <= max(idx.values()):
                    values.extend([""] * (max(idx.values()) + 1 - len(values)))
                if not re.fullmatch(r"\d{1,2}", values[idx["#"]]):
                    continue
                if values[idx["POS"]] not in {"GK", "DF", "MF", "FW"}:
                    continue
                dob = datetime.strptime(values[idx["DOB"]], "%d/%m/%Y").date()
                players.append({
                    "shirt_number": int(values[idx["#"]]),
                    "name_fifa": values[idx["PLAYER NAME"]],
                    "first_names": values[idx["FIRST NAME(S)"]],
                    "last_names": values[idx["LAST NAME(S)"]],
                    "name_on_shirt": values[idx["NAME ON SHIRT"]],
                    "position": values[idx["POS"]],
                    "position_zh": {
                        "GK": "门将", "DF": "后卫", "MF": "中场", "FW": "前锋"
                    }[values[idx["POS"]]],
                    "date_of_birth": dob.isoformat(),
                    "age": calc_age(dob),
                    "club": values[idx["CLUB"]],
                    "height_cm": int(values[idx["HEIGHT (CM)"]])
                        if values[idx["HEIGHT (CM)"]].isdigit() else None,
                })

            if len(players) != 26:
                raise RuntimeError(f"{team_name_en}: expected 26 players, parsed {len(players)}")
            teams.append({
                "team_code": team_code,
                "team_name_en": team_name_en,
                "team_name_zh": TEAM_NAME_ZH.get(team_code),
                "players": players,
            })

    if len(teams) != 48 or sum(len(t["players"]) for t in teams) != 1248:
        raise RuntimeError("FIFA roster total validation failed")
    return teams


def extract_wiki_tables() -> dict[str, list[dict[str, Any]]]:
    html = SESSION.get(ZH_WIKI_URL, timeout=120).text
    soup = BeautifulSoup(html, "lxml")
    roster_tables = []
    for table in soup.select("table.wikitable"):
        headers = [cell.get_text(" ", strip=True) for cell in table.select("tr th")]
        joined = " ".join(headers[:10])
        if "球員姓名" in joined and "出生日期" in joined and ("效力球會" in joined or "球会" in joined):
            roster_tables.append(table)

    if len(roster_tables) < 48:
        raise RuntimeError(f"Chinese Wikipedia: found only {len(roster_tables)} roster tables")

    output: dict[str, list[dict[str, Any]]] = {}
    for code, table in zip(GROUP_ORDER_CODES, roster_tables[:48]):
        rows = []
        for tr in table.select("tr")[1:]:
            cells = tr.find_all(["td", "th"], recursive=False)
            if len(cells) < 4:
                continue
            number_text = cells[0].get_text(" ", strip=True)
            if not re.fullmatch(r"\d{1,2}", number_text):
                continue
            name_cell = cells[2]
            # The first internal link is normally the Chinese player article/name.
            link = name_cell.find("a")
            name_zh = link.get_text(" ", strip=True) if link else name_cell.get_text(" ", strip=True)
            name_zh = CC.convert(re.sub(r"\s*（.*$", "", name_zh).strip())

            dob_match = re.search(r"(19|20)\d{2}-\d{2}-\d{2}", cells[3].get_text(" ", strip=True))
            club_zh = CC.convert(cells[-1].get_text(" ", strip=True))
            rows.append({
                "shirt_number": int(number_text),
                "name_zh": name_zh,
                "date_of_birth": dob_match.group(0) if dob_match else None,
                "club_zh": club_zh,
            })
        output[code] = rows
    return output


def load_market_players() -> pd.DataFrame:
    raw = get_bytes(PLAYERS_CSV_URL)
    with gzip.GzipFile(fileobj=io.BytesIO(raw)) as archive:
        frame = pd.read_csv(archive, low_memory=False)

    if "date_of_birth" not in frame.columns:
        raise RuntimeError("Transfermarkt dataset lacks date_of_birth")
    frame["date_of_birth"] = pd.to_datetime(frame["date_of_birth"], errors="coerce").dt.date.astype("string")

    possible_name_columns = [
        column for column in ["name", "player_name", "first_name", "last_name", "player_code"]
        if column in frame.columns
    ]
    frame["_candidate_name"] = frame[possible_name_columns].fillna("").astype(str).agg(" ".join, axis=1)
    frame["_normalized_name"] = frame["_candidate_name"].map(normalize_name)
    return frame


def best_market_match(player: dict[str, Any], frame: pd.DataFrame) -> tuple[dict[str, Any] | None, str]:
    subset = frame[frame["date_of_birth"] == player["date_of_birth"]].copy()
    if subset.empty:
        return None, "no_same_dob"

    target_variants = [
        normalize_name(player["name_fifa"]),
        normalize_name(player["first_names"] + " " + player["last_names"]),
        normalize_name(player["name_on_shirt"]),
    ]
    target_variants = [value for value in target_variants if value]

    def score(candidate: str) -> float:
        return max(fuzz.ratio(target, candidate) for target in target_variants)

    subset["_score"] = subset["_normalized_name"].map(score)
    subset = subset.sort_values(
        by=["_score", "market_value_in_eur"],
        ascending=[False, False],
        na_position="last",
    )
    best = subset.iloc[0]
    second_score = float(subset.iloc[1]["_score"]) if len(subset) > 1 else -1
    best_score = float(best["_score"])

    if best_score < 65:
        return None, f"low_name_score:{best_score:.1f}"
    if second_score >= 0 and best_score - second_score < 4:
        return None, f"ambiguous:{best_score:.1f}/{second_score:.1f}"

    result = {
        "transfermarkt_player_id": int(best["player_id"]) if pd.notna(best.get("player_id")) else None,
        "market_value_eur": int(best["market_value_in_eur"])
            if pd.notna(best.get("market_value_in_eur")) else None,
        "market_value_source_name": best.get("name") or best.get("player_name"),
        "market_value_match_score": round(best_score, 1),
        "position_detail": best.get("sub_position") if pd.notna(best.get("sub_position")) else None,
        "current_club_transfermarkt": best.get("current_club_name")
            if pd.notna(best.get("current_club_name")) else None,
    }
    return result, "matched"


def format_market_value(value: int | None) -> str | None:
    if value is None:
        return None
    if value >= 1_000_000:
        return f"€{value / 1_000_000:g}m"
    if value >= 1_000:
        return f"€{value / 1_000:g}k"
    return f"€{value}"


def main() -> None:
    fifa_teams = parse_fifa_pdf(get_bytes(FIFA_PDF_URL))
    wiki = extract_wiki_tables()
    market = load_market_players()

    issues = []
    matched_market = 0
    matched_zh = 0

    for team in fifa_teams:
        code = team["team_code"]
        wiki_rows = wiki.get(code, [])

        for player in team["players"]:
            zh_candidates = [
                item for item in wiki_rows
                if item.get("date_of_birth") == player["date_of_birth"]
            ]
            if len(zh_candidates) == 1:
                player["name_zh"] = zh_candidates[0]["name_zh"]
                player["club_zh"] = zh_candidates[0]["club_zh"]
                matched_zh += 1
            else:
                # Shirt number is a secondary fallback within the same team.
                number_candidates = [
                    item for item in wiki_rows
                    if item.get("shirt_number") == player["shirt_number"]
                ]
                if len(number_candidates) == 1:
                    player["name_zh"] = number_candidates[0]["name_zh"]
                    player["club_zh"] = number_candidates[0]["club_zh"]
                    matched_zh += 1
                else:
                    player["name_zh"] = None
                    player["club_zh"] = None
                    issues.append({
                        "team_code": code,
                        "player": player["name_fifa"],
                        "field": "name_zh",
                        "reason": "no_unique_wikipedia_match",
                    })

            market_result, reason = best_market_match(player, market)
            if market_result:
                player.update(market_result)
                matched_market += 1
            else:
                player.update({
                    "transfermarkt_player_id": None,
                    "market_value_eur": None,
                    "market_value_source_name": None,
                    "market_value_match_score": None,
                    "position_detail": None,
                    "current_club_transfermarkt": None,
                })
                issues.append({
                    "team_code": code,
                    "player": player["name_fifa"],
                    "field": "market_value_eur",
                    "reason": reason,
                })

            player["market_value_display"] = format_market_value(player["market_value_eur"])
            player["source"] = {
                "squad": "FIFA official squad PDF",
                "club": "FIFA official squad PDF",
                "dob": "FIFA official squad PDF",
                "name_zh": "Chinese Wikipedia" if player["name_zh"] else None,
                "market_value": "dcaribou Transfermarkt-derived dataset"
                    if player["market_value_eur"] is not None else None,
            }

        team["players"].sort(
            key=lambda p: (
                p["market_value_eur"] is None,
                -(p["market_value_eur"] or 0),
                p["shirt_number"],
            )
        )
        for rank, player in enumerate(team["players"], start=1):
            player["market_value_rank"] = rank if player["market_value_eur"] is not None else None
        team["player_count"] = len(team["players"])
        team["market_value_total_eur"] = sum(
            p["market_value_eur"] or 0 for p in team["players"]
        )
        team["market_value_known_count"] = sum(
            p["market_value_eur"] is not None for p in team["players"]
        )

    payload = {
        "tournament": "FIFA World Cup 2026",
        "dataset_version": f"full-{SNAPSHOT_DATE}",
        "generated_at": datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "age_reference_date": REFERENCE_DATE.isoformat(),
        "market_value_snapshot_date": SNAPSHOT_DATE,
        "currency": "EUR",
        "sort_rule": "market_value_eur_desc_null_last",
        "validation": {
            "team_count": len(fifa_teams),
            "total_players": sum(len(t["players"]) for t in fifa_teams),
            "chinese_name_matches": matched_zh,
            "market_value_matches": matched_market,
            "unresolved_fields": len(issues),
        },
        "sources": {
            "official_squad_pdf": FIFA_PDF_URL,
            "market_value_dataset": PLAYERS_CSV_URL,
            "market_value_project": "https://github.com/dcaribou/transfermarkt-datasets",
            "chinese_name_reference": ZH_WIKI_URL,
        },
        "teams": fifa_teams,
    }

    OUTPUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    VALIDATION_JSON.write_text(
        json.dumps(
            {
                "generated_at": payload["generated_at"],
                "summary": payload["validation"],
                "issues": issues,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(json.dumps(payload["validation"], ensure_ascii=False, indent=2))
    print(f"Wrote {OUTPUT_JSON}")
    print(f"Wrote {VALIDATION_JSON}")


if __name__ == "__main__":
    main()
