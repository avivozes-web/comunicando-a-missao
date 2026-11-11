#!/usr/bin/env python3
"""Build supabase/seed.sql and src/fixtures/preview.json from the real files.

The planning rows (posts, ideas, the weekday routine) follow the approved
mockups. Metrics are copied from data/real and are never invented.
"""

from __future__ import annotations

import csv
import datetime as dt
import json
import re
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REAL = ROOT / "data" / "real"
NS = uuid.UUID("c0ffee00-0000-4000-8000-000000000001")
ORDER = ["ideia", "roteiro", "gravado", "editado", "arte_pronta", "aprovado", "postado"]


def uid(name: str) -> str:
    return str(uuid.uuid5(NS, name))


def reaches(status: str, need: str) -> bool:
    return ORDER.index(status) >= ORDER.index(need)


def placeholder(title: str) -> bool:
    return re.search(r"a definir|tema a definir|nenhum marcado|sem tema", title, re.I) is not None


def sql_str(value) -> str:
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def sql_json(value) -> str:
    if value is None:
        return "null"
    raw = json.dumps(value, ensure_ascii=False)
    tag = "json"
    while f"${tag}$" in raw:
        tag += "x"
    return f"${tag}${raw}${tag}$::jsonb"


def sql_text_array(values: list[str]) -> str:
    if not values:
        return "'{}'::text[]"
    return "array[" + ", ".join(sql_str(v) for v in values) + "]::text[]"


def sql_int_array(values: list[int]) -> str:
    return "array[" + ", ".join(str(v) for v in values) + "]::int[]"


def daterange(start: str, end: str):
    cur = dt.date.fromisoformat(start)
    last = dt.date.fromisoformat(end)
    while cur <= last:
        yield cur.isoformat()
        cur += dt.timedelta(days=1)


def add_days(iso: str, n: int) -> str:
    return (dt.date.fromisoformat(iso) + dt.timedelta(days=n)).isoformat()


POSTS = [
    {
        "id": uid("post-chile"),
        "account": "missao",
        "title": "Uma sala no Chile",
        "format": "reel",
        "status": "postado",
        "scheduled_date": "2026-11-11",
        "scheduled_time": None,
        "aspect": None,
        "legenda": None,
        "cover_url": "covers/chile.jpg",
        "drive_url": None,
        "checklist": [
            {"label": "Legenda do Instagram", "done": True},
            {"label": "Legenda do WhatsApp", "done": True},
            {"label": "Publicado no @missaojosue.ofc", "done": True},
        ],
        "note": "Vídeo da semana",
        "date_tag": None,
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-missiologia"),
        "account": "escola",
        "title": "Carrossel Missiologia",
        "format": "carrossel",
        "status": "aprovado",
        "scheduled_date": "2026-11-12",
        "scheduled_time": "12:07",
        "aspect": "4:5",
        "legenda": "Como o portal do aluno ajuda a revisar e guardar o que foi estudado.",
        "cover_url": "covers/missiologia.jpg",
        "drive_url": None,
        "checklist": [
            {"label": "Arte aprovada e programada", "done": True},
            {"label": "Seu ok na legenda nova (467 caracteres)", "done": False},
            {"label": "1º comentário com o QUERO", "done": False},
        ],
        "note": None,
        "date_tag": None,
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-video-13"),
        "account": "escola",
        "title": "Vídeo · nenhum marcado ainda",
        "format": "reel",
        "status": "ideia",
        "scheduled_date": "2026-11-13",
        "scheduled_time": None,
        "aspect": None,
        "legenda": None,
        "cover_url": None,
        "drive_url": None,
        "checklist": [],
        "note": "Sugestão: Reel FIMC",
        "date_tag": None,
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-carrossel-13"),
        "account": "missao",
        "title": "Carrossel · sem tema e sem arte",
        "format": "carrossel",
        "status": "ideia",
        "scheduled_date": "2026-11-13",
        "scheduled_time": None,
        "aspect": None,
        "legenda": None,
        "cover_url": None,
        "drive_url": None,
        "checklist": [],
        "note": None,
        "date_tag": None,
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-matriculas"),
        "account": "escola",
        "title": "Destaque Matrículas 2027",
        "format": "stories",
        "status": "arte_pronta",
        "scheduled_date": "2026-11-16",
        "scheduled_time": None,
        "aspect": None,
        "legenda": None,
        "cover_url": None,
        "drive_url": None,
        "checklist": [],
        "note": None,
        "date_tag": "Abertura das matrículas 2027",
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-leve-16"),
        "account": "missao",
        "title": "Tema a definir",
        "format": "post_leve",
        "status": "ideia",
        "scheduled_date": "2026-11-16",
        "scheduled_time": None,
        "aspect": None,
        "legenda": None,
        "cover_url": None,
        "drive_url": None,
        "checklist": [],
        "note": None,
        "date_tag": None,
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-fimc"),
        "account": "escola",
        "title": "Reel FIMC",
        "format": "reel",
        "status": "editado",
        "scheduled_date": "2026-11-17",
        "scheduled_time": None,
        "aspect": None,
        "legenda": None,
        "cover_url": None,
        "drive_url": None,
        "checklist": [],
        "note": None,
        "date_tag": None,
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-somalia"),
        "account": "missao",
        "title": "Reel Somália",
        "format": "reel",
        "status": "editado",
        "scheduled_date": "2026-11-18",
        "scheduled_time": None,
        "aspect": None,
        "legenda": None,
        "cover_url": None,
        "drive_url": None,
        "checklist": [],
        "note": None,
        "date_tag": None,
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-estuda"),
        "account": "escola",
        "title": "Você estuda e esquece tudo?",
        "format": "carrossel",
        "status": "aprovado",
        "scheduled_date": "2026-11-19",
        "scheduled_time": "12:07",
        "aspect": None,
        "legenda": None,
        "cover_url": "covers/portal.jpg",
        "drive_url": None,
        "checklist": [],
        "note": None,
        "date_tag": None,
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-sexta-escola"),
        "account": "escola",
        "title": "A definir",
        "format": "reel",
        "status": "ideia",
        "scheduled_date": "2026-11-20",
        "scheduled_time": None,
        "aspect": None,
        "legenda": None,
        "cover_url": None,
        "drive_url": None,
        "checklist": [],
        "note": None,
        "date_tag": "Consciência Negra",
        "updated_by": "Lídia",
    },
    {
        "id": uid("post-sexta-missao"),
        "account": "missao",
        "title": "A definir",
        "format": "carrossel",
        "status": "ideia",
        "scheduled_date": "2026-11-20",
        "scheduled_time": None,
        "aspect": None,
        "legenda": None,
        "cover_url": None,
        "drive_url": None,
        "checklist": [],
        "note": None,
        "date_tag": None,
        "updated_by": "Lídia",
    },
]

IDEAS = [
    {
        "id": uid("idea-campos"),
        "account": "missao",
        "title": "Os 10 campos da Missão Josué",
        "body": "Um slide por campo, para quem acompanha a Missão saber onde ela está e quem está lá.",
        "format": "carrossel",
        "tags": ["Campos"],
        "status": "ideia",
        "suggested_date": None,
        "heart": False,
        "updated_by": "Esdras",
    },
    {
        "id": uid("idea-ouvido"),
        "account": "escola",
        "title": "Eu queria ter te ouvido antes",
        "body": "O que muda quando a gente aprende a ouvir a criança antes de ensinar.",
        "format": "reel",
        "tags": ["FIMC"],
        "status": "ideia",
        "suggested_date": None,
        "heart": False,
        "updated_by": "Esdras",
    },
    {
        "id": uid("idea-bagunca"),
        "account": "escola",
        "title": "A criança bagunça na aula ou a aula não foi pensada pra ela?",
        "body": "Muda o foco da “criança difícil” para o preparo de quem ensina.",
        "format": "carrossel",
        "tags": ["FIMC"],
        "status": "ideia",
        "suggested_date": "2026-11-26",
        "heart": True,
        "updated_by": "Esdras",
    },
    {
        "id": uid("idea-regras"),
        "account": "escola",
        "title": "Você ensina as crianças sobre Deus… ou só sobre regras?",
        "body": "Provoca o professor de ministério infantil a ir além do “pode e não pode”.",
        "format": "carrossel",
        "tags": ["FIMC"],
        "status": "aprovada",
        "suggested_date": "2027-01-07",
        "heart": True,
        "updated_by": "Esdras",
    },
    {
        "id": uid("idea-estuda"),
        "account": "escola",
        "title": "Você estuda e esquece tudo?",
        "body": "Como o portal do aluno ajuda a revisar e guardar o que foi estudado.",
        "format": "carrossel",
        "tags": ["Portal"],
        "status": "aprovada",
        "suggested_date": "2026-11-19",
        "heart": False,
        "updated_by": "Esdras",
    },
]

FIXED = [
    ("Atualizar orçamento", "Isabelle", [1, 2, 3, 4, 5], 10),
    ("Análise das contas", "Isabelle", [1], 20),
    ("Buscar ideias de vídeo e carrossel", "Isabelle + Esdras", [1], 30),
    ("Decidir temas dos carrosséis e vídeos", "Isabelle", [1], 40),
    ("Roteiros prontos", "Esdras", [1], 50),
    ("Artes e legendas dos carrosséis: 1 Escola + 2 Missão", "Lídia + Isabelle", [2], 20),
    ("Stories", "Lídia + Isabelle", [2], 30),
    ("Dia de gravação, até 3 vídeos", "Isabelle + Richard", [5], 20),
    ("Edição", "Bezalel", [5], 30),
    ("Checklist: semana que vem pronta?", "Isabelle + Lídia", [5], 40),
]

YEAR_DATES = [
    (2027, 1, "FIMC B", "07/01", "escola", "2027-01-07"),
    (2027, 2, "Carnaval", None, "data", None),
    (2027, 5, "Dia das Mães", None, "data", None),
    (2027, 8, "Dia dos Pais", None, "data", None),
    (2027, 10, "Dia das Crianças (FIMC)", None, "escola", None),
    (2027, 11, "Matrículas 2028", "abertura a confirmar", "data", None),
    (2027, 12, "Formatura", "data a confirmar", "data", None),
    (2027, 12, "Férias de Natal", "sem posts na semana do Natal", "pausa", None),
]

NARRATIVE = (
    "A Escola (@missaojosue.educacao) fala com quem ensina criança: FIMC, o portal do aluno e a matrícula. "
    "A Missão (@missaojosue.ofc) mostra os campos e a vida da igreja. "
    "O Esdras traz ideia na segunda e na quinta; a Isabelle confirma o que entra na grade."
)

STEPS = [
    ("gravar", "Gravar ", "Isabelle", -3, "gravado", 80),
    ("editar", "Editar ", "Bezalel", -2, "editado", 81),
    ("aprovar", "Aprovar a capa e a legenda do ", "Lídia + Isabelle", -1, "aprovado", 82),
    ("postar", "Postar ", "Lídia", 0, "postado", 83),
]


def generated_tasks(posts: list[dict]) -> list[dict]:
    rows = []
    for post in posts:
        if placeholder(post["title"]):
            continue
        for step, prefix, assignee, offset, need, sort in STEPS:
            due = add_days(post["scheduled_date"], offset)
            rows.append(
                {
                    "id": uid(f"task-{post['id']}-{step}"),
                    "title": prefix + post["title"],
                    "assignee": assignee,
                    "account": post["account"],
                    "due_date": due,
                    "done": reaches(post["status"], need),
                    "kind": "generated",
                    "rolled_from": None,
                    "origin_date": due,
                    "post_id": post["id"],
                    "fixed_task_id": None,
                    "step": step,
                    "badge": None,
                    "sort": sort,
                }
            )
    return rows


def fixed_rows() -> list[dict]:
    rows = []
    for title, assignee, weekdays, sort in FIXED:
        rows.append(
            {
                "id": uid("fixed-" + title),
                "title": title,
                "assignee": assignee,
                "weekdays": weekdays,
                "account": None,
                "sort": sort,
                "active": True,
            }
        )
    return rows


def materialized(fixed: list[dict]) -> list[dict]:
    rows = []
    for day in daterange("2026-11-09", "2026-11-22"):
        wd = dt.date.fromisoformat(day).isoweekday()
        for ft in fixed:
            if wd not in ft["weekdays"]:
                continue
            rows.append(
                {
                    "id": uid(f"task-fixed-{ft['id']}-{day}"),
                    "title": ft["title"],
                    "assignee": ft["assignee"],
                    "account": ft["account"],
                    "due_date": day,
                    "done": ft["title"] == "Atualizar orçamento" and day == "2026-11-11",
                    "kind": "fixed",
                    "rolled_from": None,
                    "origin_date": day,
                    "post_id": None,
                    "fixed_task_id": ft["id"],
                    "step": None,
                    "badge": None,
                    "sort": ft["sort"],
                }
            )
    return rows


def adhoc_tasks() -> list[dict]:
    return [
        {
            "id": uid("task-legendas"),
            "title": "Fechar as legendas do carrossel de amanhã",
            "assignee": "Lídia",
            "account": "escola",
            "due_date": "2026-11-11",
            "done": False,
            "kind": "adhoc",
            "rolled_from": "2026-11-10",
            "origin_date": "2026-11-10",
            "post_id": None,
            "fixed_task_id": None,
            "step": None,
            "badge": "eventual",
            "sort": 60,
        },
        {
            "id": uid("task-gravar-24"),
            "title": "Gravar Reel da Escola → editar → aprovar capa → postar 24/11",
            "assignee": "Isabelle · Bezalel · Lídia",
            "account": "escola",
            "due_date": "2026-11-20",
            "done": False,
            "kind": "adhoc",
            "rolled_from": None,
            "origin_date": "2026-11-20",
            "post_id": None,
            "fixed_task_id": None,
            "step": None,
            "badge": "eventual",
            "sort": 70,
        },
    ]


def load_reports() -> list[dict]:
    specs = [
        (
            "2026-11-09",
            "2026-11-03",
            "2026-11-09",
            "Relatório semanal · 09/11",
            "Semana 03 a 09 de novembro · dados do relatório",
            REAL / "relatorio-2026-11-09.json",
        ),
        (
            "2026-11-02",
            "2026-10-26",
            "2026-11-01",
            "Relatório semanal · 02/11",
            "Semana 26/10 a 01/11 · dados do relatório",
            REAL / "relatorio-2026-11-02.json",
        ),
    ]
    rows = []
    for key, start, end, title, subtitle, path in specs:
        rows.append(
            {
                "id": uid("report-" + key),
                "account": "escola",
                "kind": "semanal",
                "period_start": start,
                "period_end": end,
                "title": title,
                "subtitle": subtitle,
                "pdf_url": None,
                "payload": json.loads(path.read_text()),
            }
        )
    rows.append(
        {
            "id": uid("report-2026-10-26"),
            "account": "escola",
            "kind": "semanal",
            "period_start": "2026-10-20",
            "period_end": "2026-10-26",
            "title": "Relatório semanal · 26/10",
            "subtitle": "Semana 20 a 26 de outubro · PDF ainda não anexado",
            "pdf_url": None,
            "payload": None,
        }
    )
    rows.append(
        {
            "id": uid("report-2026-10"),
            "account": "escola",
            "kind": "mensal",
            "period_start": "2026-10-01",
            "period_end": "2026-10-31",
            "title": "Relatório mensal · outubro",
            "subtitle": "Mês completo da Escola · PDF ainda não anexado",
            "pdf_url": None,
            "payload": None,
        }
    )
    return rows


def load_metrics():
    painel = json.loads((REAL / "painel-1000.json").read_text())
    snapshots = []
    with (REAL / "snapshot-2026-11-11.csv").open(newline="") as handle:
        for row in csv.DictReader(handle):
            snapshots.append(
                {
                    "account": "escola",
                    "snapshot_date": "2026-11-11",
                    "arroba": row["arroba"],
                    "nome": row.get("nome") or "",
                }
            )
    latest: dict[str, dict] = {}
    with (REAL / "fichas.csv").open(newline="") as handle:
        for row in csv.DictReader(handle):
            prev = latest.get(row["arroba"])
            if prev is None or row["data"] >= prev["data"]:
                latest[row["arroba"]] = row
    followers = []
    for row in latest.values():
        followers.append(
            {
                "account": "escola",
                "arroba": row["arroba"],
                "nome": row.get("nome") or "",
                "seguidores": int(row["seguidores"]) if row.get("seguidores") else None,
                "seguindo": int(row["seguindo"]) if row.get("seguindo") else None,
                "posts": int(row["posts"]) if row.get("posts") else None,
                "privado": (row.get("privado") or "").strip().lower() == "sim",
                "bio": row.get("bio") or "",
                "nicho": row.get("nicho") or "",
                "ficha_em": row.get("data") or None,
            }
        )
    events = []
    for kind, key in (("entrou", "entraram"), ("saiu", "sairam")):
        for item in painel.get(key) or []:
            events.append(
                {
                    "id": uid(f"ev-{kind}-{item.get('data')}-{item.get('arroba') or item.get('nome')}"),
                    "account": "escola",
                    "event_date": item.get("data"),
                    "kind": kind,
                    "arroba": item.get("arroba"),
                    "nome": item.get("nome") or "",
                    "note": item.get("obs"),
                }
            )
    goal_days = []
    for row in painel["historico"]:
        meta = row.get("meta_dia") if isinstance(row.get("meta_dia"), dict) else {}
        goal_days.append(
            {
                "account": "escola",
                "day": row["data"],
                "total": row.get("total"),
                "entraram": row.get("entraram"),
                "sairam": row.get("sairam"),
                "saldo": row.get("saldo"),
                "fonte": row.get("fonte"),
                "status": row.get("status"),
                "meta_dia": None if meta.get("meta") is None else meta.get("meta"),
                "meta_semana": meta.get("meta_semana"),
                "acumulada": meta.get("acumulada"),
                "foco": meta.get("foco"),
            }
        )
    meta = painel["meta"]
    goal = {
        "account": "escola",
        "alvo": meta["alvo"],
        "data_alvo": meta["data_alvo"],
        "inicio": meta["inicio"],
        "base": meta["base"],
        "base_data": meta["base_data"],
        "rampa": meta["rampa"],
        "checkpoints": meta["checkpoints"],
        "funil": painel.get("funil_atual"),
        "posts_metricas": painel.get("posts_metricas") or [],
        "link_insights": (painel.get("toques_link_insights") or {}).get("registros") or [],
        "notes": {"traga1": ""},
    }
    taps = []
    for item in goal["link_insights"]:
        taps.append(
            {
                "account": "escola",
                "day": item["data"],
                "periodo": item.get("periodo") or "",
                "toques": item.get("toques"),
                "fonte": item.get("fonte"),
            }
        )
    return snapshots, followers, events, goal_days, goal, taps


def insert_posts(posts: list[dict]) -> str:
    lines = []
    for post in posts:
        lines.append(
            "insert into public.posts (id, account, title, format, status, scheduled_date, scheduled_time, aspect, legenda, cover_url, drive_url, checklist, note, date_tag, updated_by) values ("
            + ", ".join(
                [
                    sql_str(post["id"]),
                    sql_str(post["account"]),
                    sql_str(post["title"]),
                    sql_str(post["format"]),
                    sql_str(post["status"]),
                    sql_str(post["scheduled_date"]),
                    "null" if not post["scheduled_time"] else sql_str(post["scheduled_time"]) + "::time",
                    sql_str(post["aspect"]),
                    sql_str(post["legenda"]),
                    sql_str(post["cover_url"]),
                    sql_str(post["drive_url"]),
                    sql_json(post["checklist"]),
                    sql_str(post["note"]),
                    sql_str(post["date_tag"]),
                    sql_str(post["updated_by"]),
                ]
            )
            + ");"
        )
    return "\n".join(lines)


def insert_tasks_sql(rows: list[dict]) -> str:
    chunks = []
    for row in rows:
        chunks.append(
            "("
            + ", ".join(
                [
                    sql_str(row["id"]),
                    sql_str(row["title"]),
                    sql_str(row["assignee"]),
                    sql_str(row["account"]),
                    sql_str(row["due_date"]),
                    "true" if row["done"] else "false",
                    sql_str(row["kind"]),
                    sql_str(row["rolled_from"]),
                    sql_str(row["origin_date"]),
                    sql_str(row["post_id"]),
                    sql_str(row["fixed_task_id"]),
                    sql_str(row["step"]),
                    sql_str(row["badge"]),
                    str(row["sort"]),
                ]
            )
            + ")"
        )
    return (
        "insert into public.tasks (id, title, assignee, account, due_date, done, kind, rolled_from, origin_date, post_id, fixed_task_id, step, badge, sort) values\n"
        + ",\n".join(chunks)
        + ";"
    )


def main() -> None:
    fixed = fixed_rows()
    tasks = materialized(fixed) + generated_tasks(POSTS) + adhoc_tasks()
    reports = load_reports()
    snapshots, followers, events, goal_days, goal, taps = load_metrics()
    months = [
        {"year": 2027, "month": month, "theme": None, "campaign": month == 11}
        for month in range(1, 13)
    ]
    dates = [
        {
            "id": uid(f"yd-{year}-{month}-{label}"),
            "year": year,
            "month": month,
            "label": label,
            "detail": detail,
            "kind": kind,
            "event_date": event,
        }
        for year, month, label, detail, kind, event in YEAR_DATES
    ]
    ideas = []
    for idea in IDEAS:
        ideas.append({**idea, "updated_at": "2026-11-09T12:00:00Z"})

    preview = {
        "posts": POSTS,
        "ideas": ideas,
        "fixed_tasks": fixed,
        "tasks": tasks,
        "year_months": months,
        "year_dates": dates,
        "narrative": {"body": NARRATIVE, "updated_by": "Isabelle"},
        "reports": reports,
        "snapshots": snapshots,
        "followers": followers,
        "events": events,
        "goal_days": goal_days,
        "goal_config": goal,
        "link_taps": taps,
    }
    out = ROOT / "src" / "fixtures" / "preview.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(preview, ensure_ascii=False))

    parts = [
        "-- Generated by scripts/build_seed.py. Apply AFTER the migration.",
        "-- Metrics come from data/real. Planning rows follow the approved mockups.",
        "begin;",
        "",
        "-- Weekday routine",
    ]
    for ft in fixed:
        parts.append(
            "insert into public.fixed_tasks (id, title, assignee, weekdays, account, sort, active) values ("
            + ", ".join(
                [
                    sql_str(ft["id"]),
                    sql_str(ft["title"]),
                    sql_str(ft["assignee"]),
                    sql_int_array(ft["weekdays"]),
                    "null",
                    str(ft["sort"]),
                    "true",
                ]
            )
            + ");"
        )
    parts.append("")
    parts.append("-- Posts. The trigger creates gravar / editar / aprovar / postar, except for placeholder titles.")
    parts.append(insert_posts(POSTS))
    parts.append("")
    parts.append("select public.materialize_fixed_tasks('2026-11-09', '2026-11-22');")
    parts.append(
        "update public.tasks set done = true where fixed_task_id = "
        + sql_str(uid("fixed-Atualizar orçamento"))
        + " and origin_date = '2026-11-11';"
    )
    parts.append("")
    parts.append("-- Avulsas, including the one that already rolled from 10/11.")
    parts.append(insert_tasks_sql(adhoc_tasks()))
    parts.append("")
    parts.append("-- Ideas")
    for idea in ideas:
        parts.append(
            "insert into public.ideas (id, account, title, body, format, tags, status, suggested_date, heart, updated_by, updated_at) values ("
            + ", ".join(
                [
                    sql_str(idea["id"]),
                    sql_str(idea["account"]),
                    sql_str(idea["title"]),
                    sql_str(idea["body"]),
                    sql_str(idea["format"]),
                    sql_text_array(idea["tags"]),
                    sql_str(idea["status"]),
                    sql_str(idea["suggested_date"]),
                    "true" if idea["heart"] else "false",
                    sql_str(idea["updated_by"]),
                    sql_str(idea["updated_at"]),
                ]
            )
            + ");"
        )
    parts.append("")
    for month in months:
        parts.append(
            "insert into public.year_months (year, month, theme, campaign) values ("
            + f"2027, {month['month']}, null, {'true' if month['campaign'] else 'false'});"
        )
    for item in dates:
        parts.append(
            "insert into public.year_dates (id, year, month, label, detail, kind, event_date) values ("
            + ", ".join(
                [
                    sql_str(item["id"]),
                    str(item["year"]),
                    str(item["month"]),
                    sql_str(item["label"]),
                    sql_str(item["detail"]),
                    sql_str(item["kind"]),
                    sql_str(item["event_date"]),
                ]
            )
            + ");"
        )
    parts.append(
        "insert into public.narrative (id, body, updated_by) values (1, "
        + sql_str(NARRATIVE)
        + ", 'Isabelle');"
    )
    parts.append("")
    parts.append("-- Weekly reports. Payload is the dados.json file, unchanged.")
    for report in reports:
        parts.append(
            "insert into public.reports (id, account, kind, period_start, period_end, title, subtitle, pdf_url, payload) values ("
            + ", ".join(
                [
                    sql_str(report["id"]),
                    sql_str(report["account"]),
                    sql_str(report["kind"]),
                    sql_str(report["period_start"]),
                    sql_str(report["period_end"]),
                    sql_str(report["title"]),
                    sql_str(report["subtitle"]),
                    sql_str(report["pdf_url"]),
                    sql_json(report["payload"]),
                ]
            )
            + ");"
        )
    parts.append("")
    parts.append("-- Follower snapshot 2026-11-11 (252 handles).")
    values = []
    for row in snapshots:
        values.append(
            "("
            + ", ".join(
                [
                    sql_str(row["account"]),
                    sql_str(row["snapshot_date"]),
                    sql_str(row["arroba"]),
                    sql_str(row["nome"]),
                ]
            )
            + ")"
        )
    parts.append(
        "insert into public.follower_snapshots (account, snapshot_date, arroba, nome) values\n"
        + ",\n".join(values)
        + ";"
    )
    parts.append("")
    parts.append("-- Latest profile card per @ from fichas.csv.")
    values = []
    for row in followers:
        values.append(
            "("
            + ", ".join(
                [
                    sql_str(row["account"]),
                    sql_str(row["arroba"]),
                    sql_str(row["nome"]),
                    "null" if row["seguidores"] is None else str(row["seguidores"]),
                    "null" if row["seguindo"] is None else str(row["seguindo"]),
                    "null" if row["posts"] is None else str(row["posts"]),
                    "true" if row["privado"] else "false",
                    sql_str(row["bio"]),
                    sql_str(row["nicho"]),
                    sql_str(row["ficha_em"]),
                ]
            )
            + ")"
        )
    parts.append(
        "insert into public.followers (account, arroba, nome, seguidores, seguindo, posts, privado, bio, nicho, ficha_em) values\n"
        + ",\n".join(values)
        + ";"
    )
    parts.append("")
    values = []
    for row in events:
        values.append(
            "("
            + ", ".join(
                [
                    sql_str(row["id"]),
                    sql_str(row["account"]),
                    sql_str(row["event_date"]),
                    sql_str(row["kind"]),
                    sql_str(row["arroba"]),
                    sql_str(row["nome"]),
                    sql_str(row["note"]),
                ]
            )
            + ")"
        )
    parts.append(
        "insert into public.follower_events (id, account, event_date, kind, arroba, nome, note) values\n"
        + ",\n".join(values)
        + ";"
    )
    parts.append("")
    values = []
    for row in goal_days:
        values.append(
            "("
            + ", ".join(
                [
                    sql_str(row["account"]),
                    sql_str(row["day"]),
                    "null" if row["total"] is None else str(row["total"]),
                    "null" if row["entraram"] is None else str(row["entraram"]),
                    "null" if row["sairam"] is None else str(row["sairam"]),
                    "null" if row["saldo"] is None else str(row["saldo"]),
                    sql_str(row["fonte"]),
                    sql_str(row["status"]),
                    "null" if row["meta_dia"] is None else str(row["meta_dia"]),
                    "null" if row["meta_semana"] is None else str(row["meta_semana"]),
                    "null" if row["acumulada"] is None else str(row["acumulada"]),
                    sql_str(row["foco"]),
                ]
            )
            + ")"
        )
    parts.append(
        "insert into public.goal_days (account, day, total, entraram, sairam, saldo, fonte, status, meta_dia, meta_semana, acumulada, foco) values\n"
        + ",\n".join(values)
        + ";"
    )
    parts.append(
        "insert into public.goal_config (account, alvo, data_alvo, inicio, base, base_data, rampa, checkpoints, funil, posts_metricas, link_insights, notes) values ("
        + ", ".join(
            [
                sql_str(goal["account"]),
                str(goal["alvo"]),
                sql_str(goal["data_alvo"]),
                sql_str(goal["inicio"]),
                str(goal["base"]),
                sql_str(goal["base_data"]),
                sql_json(goal["rampa"]),
                sql_json(goal["checkpoints"]),
                sql_json(goal["funil"]),
                sql_json(goal["posts_metricas"]),
                sql_json(goal["link_insights"]),
                sql_json(goal["notes"]),
            ]
        )
        + ");"
    )
    values = []
    for row in taps:
        values.append(
            "("
            + ", ".join(
                [
                    sql_str(row["account"]),
                    sql_str(row["day"]),
                    sql_str(row["periodo"]),
                    "null" if row["toques"] is None else str(row["toques"]),
                    sql_str(row["fonte"]),
                ]
            )
            + ")"
        )
    parts.append(
        "insert into public.link_taps (account, day, periodo, toques, fonte) values\n"
        + ",\n".join(values)
        + ";"
    )
    parts.append("commit;")
    seed = ROOT / "supabase" / "seed.sql"
    seed.write_text("\n".join(parts) + "\n")
    print(f"preview {out} {out.stat().st_size} bytes")
    print(f"seed {seed} {seed.stat().st_size} bytes")
    print(f"posts {len(POSTS)} tasks {len(tasks)} followers {len(followers)} snapshots {len(snapshots)} events {len(events)} days {len(goal_days)}")


if __name__ == "__main__":
    main()
