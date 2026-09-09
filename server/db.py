import sqlite3
import json
from pathlib import Path

DB_PATH = Path(__file__).parent / "manga.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS manga (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            search_query TEXT NOT NULL,
            cover_url TEXT,
            status TEXT,
            author TEXT,
            description TEXT,
            aliases TEXT,
            chapters TEXT,
            latest_chapter REAL
        )
        """
    )
    conn.commit()
    conn.close()


def insert_manga(data: dict) -> int:
    conn = get_conn()
    cur = conn.execute(
        """
        INSERT INTO manga
            (title, search_query, cover_url, status, author, description, aliases, chapters, latest_chapter)
        VALUES (?,?,?,?,?,?,?,?,?)
        """,
        (
            data["title"],
            data["search_query"],
            data.get("cover_url"),
            data.get("status"),
            data.get("author"),
            data.get("description"),
            json.dumps(data.get("aliases", [])),
            json.dumps(data.get("chapters", [])),
            data.get("latest_chapter"),
        ),
    )
    conn.commit()
    manga_id = cur.lastrowid
    conn.close()
    return manga_id # type: ignore


def list_manga():
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, title, cover_url, status, latest_chapter FROM manga ORDER BY id DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_manga(manga_id: int):
    conn = get_conn()
    row = conn.execute("SELECT * FROM manga WHERE id = ?", (manga_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    record = dict(row)
    record["aliases"] = json.loads(record["aliases"] or "[]")
    record["chapters"] = json.loads(record["chapters"] or "[]")
    return record


def update_manga(manga_id: int, data: dict):
    conn = get_conn()
    conn.execute(
        """
        UPDATE manga
        SET cover_url=?, status=?, author=?, description=?, aliases=?, chapters=?, latest_chapter=?
        WHERE id=?
        """,
        (
            data.get("cover_url"),
            data.get("status"),
            data.get("author"),
            data.get("description"),
            json.dumps(data.get("aliases", [])),
            json.dumps(data.get("chapters", [])),
            data.get("latest_chapter"),
            manga_id,
        ),
    )
    conn.commit()
    conn.close()


def delete_manga(manga_id: int):
    conn = get_conn()
    conn.execute("DELETE FROM manga WHERE id = ?", (manga_id,))
    conn.commit()
    conn.close()
