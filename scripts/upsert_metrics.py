#!/usr/bin/env python3
"""Upsert follower snapshots and weekly reports into Supabase.

Uses the service role key. Never put that key in the frontend or in git.

Environment:
  SUPABASE_URL                 default: the project URL
  SUPABASE_SERVICE_ROLE_KEY    required

Examples:
  python scripts/upsert_metrics.py snapshot --account escola --date 2026-11-11 --csv seguidores.csv
  python scripts/upsert_metrics.py report --account escola --json dados.json --start 2026-11-03 --end 2026-11-09
  python scripts/upsert_metrics.py fichas --account escola --csv fichas.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_URL = "https://lmycoesvfulfrtrehayn.supabase.co"


def request(method: str, path: str, body=None, prefer: str | None = None):
    url = os.environ.get("SUPABASE_URL", DEFAULT_URL).rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not key:
        raise SystemExit("Defina SUPABASE_SERVICE_ROLE_KEY.")
    data = None if body is None else json.dumps(body).encode()
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    req = urllib.request.Request(url + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            raw = response.read().decode()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        detail = error.read().decode()
        raise SystemExit(f"{method} {path} falhou ({error.code}): {detail}") from error


def upsert(table: str, rows: list[dict], on_conflict: str):
    if not rows:
        return
    encoded = urllib.parse.quote(on_conflict, safe=",")
    step = 200
    for index in range(0, len(rows), step):
        chunk = rows[index : index + step]
        request(
            "POST",
            f"/rest/v1/{table}?on_conflict={encoded}",
            chunk,
            prefer="resolution=merge-duplicates,return=minimal",
        )


def cmd_snapshot(args: argparse.Namespace):
    rows = []
    with open(args.csv, newline="") as handle:
        for row in csv.DictReader(handle):
            arroba = (row.get("arroba") or row.get("username") or "").strip().lstrip("@")
            if not arroba:
                continue
            rows.append(
                {
                    "account": args.account,
                    "snapshot_date": args.date,
                    "arroba": arroba,
                    "nome": row.get("nome") or row.get("name") or "",
                }
            )
    filt = f"account=eq.{args.account}&snapshot_date=eq.{args.date}"
    request("DELETE", f"/rest/v1/follower_snapshots?{filt}", prefer="return=minimal")
    upsert("follower_snapshots", rows, "account,snapshot_date,arroba")
    if args.set_total:
        upsert(
            "goal_days",
            [{"account": args.account, "day": args.date, "total": len(rows)}],
            "account,day",
        )
    print(f"snapshot {args.account} {args.date}: {len(rows)} @")


def cmd_report(args: argparse.Namespace):
    payload = json.loads(open(args.json).read())
    title = args.title or payload.get("titulo") or f"Relatório {args.kind} {args.end}"
    row = {
        "account": args.account,
        "kind": args.kind,
        "period_start": args.start,
        "period_end": args.end,
        "title": title,
        "subtitle": args.subtitle or payload.get("periodo"),
        "pdf_url": args.pdf or None,
        "payload": payload,
    }
    upsert("reports", [row], "account,kind,period_start")
    print(f"relatório {args.account} {args.start} → {args.end}")


def cmd_fichas(args: argparse.Namespace):
    latest: dict[str, dict] = {}
    with open(args.csv, newline="") as handle:
        for row in csv.DictReader(handle):
            arroba = (row.get("arroba") or "").strip().lstrip("@")
            if not arroba:
                continue
            prev = latest.get(arroba)
            if prev is None or (row.get("data") or "") >= (prev.get("data") or ""):
                latest[arroba] = row
    rows = []
    for row in latest.values():
        def num(key: str):
            raw = (row.get(key) or "").strip()
            return int(raw) if raw.isdigit() or (raw.startswith("-") and raw[1:].isdigit()) else None

        rows.append(
            {
                "account": args.account,
                "arroba": row["arroba"].strip().lstrip("@"),
                "nome": row.get("nome") or "",
                "seguidores": num("seguidores"),
                "seguindo": num("seguindo"),
                "posts": num("posts"),
                "privado": (row.get("privado") or "").strip().lower() in {"sim", "true", "1"},
                "bio": row.get("bio") or "",
                "nicho": row.get("nicho") or "",
                "ficha_em": row.get("data") or None,
            }
        )
    upsert("followers", rows, "account,arroba")
    print(f"fichas {args.account}: {len(rows)} perfis")


def main():
    parser = argparse.ArgumentParser(description="Grava métricas no Supabase com a service role.")
    sub = parser.add_subparsers(dest="cmd", required=True)

    snap = sub.add_parser("snapshot")
    snap.add_argument("--account", required=True, choices=["escola", "missao"])
    snap.add_argument("--date", required=True, help="YYYY-MM-DD")
    snap.add_argument("--csv", required=True, help="CSV com colunas arroba,nome")
    snap.add_argument("--set-total", action="store_true", help="Também grava goal_days.total com a contagem")
    snap.set_defaults(func=cmd_snapshot)

    report = sub.add_parser("report")
    report.add_argument("--account", required=True, choices=["escola", "missao"])
    report.add_argument("--json", required=True)
    report.add_argument("--start", required=True)
    report.add_argument("--end", required=True)
    report.add_argument("--kind", default="semanal", choices=["semanal", "mensal"])
    report.add_argument("--title")
    report.add_argument("--subtitle")
    report.add_argument("--pdf")
    report.set_defaults(func=cmd_report)

    fichas = sub.add_parser("fichas")
    fichas.add_argument("--account", required=True, choices=["escola", "missao"])
    fichas.add_argument("--csv", required=True)
    fichas.set_defaults(func=cmd_fichas)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
