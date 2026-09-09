import asyncio
from pathlib import Path
from typing import cast
from scripts.weeb import Weeb
from scripts.enums import DownloadType

weeb = Weeb()

DOWNLOAD_DIR = Path(__file__).parent / "downloads"
DOWNLOAD_DIR.mkdir(exist_ok=True)


def _find_best_match(query: str):
    results = weeb.search(query=query)
    if not results:
        raise ValueError(f"No manga found for '{query}'")
    return results[0]


def _serialize_chapters(chapters):
    return [
        {
            "id": str(c.index),
            "title": getattr(c, "title", f"Chapter {c.index}"),
            "index": c.index,
            "read": False,
            "download_url": None,
        }
        for c in chapters
    ]


def _fetch_full(query: str) -> dict:
    manga = _find_best_match(query)
    manga.get_details()
    chapters = manga.get_chapters()
    serialized_chapters = _serialize_chapters(chapters)
    latest = max((c["index"] for c in serialized_chapters), default=None)
    details = manga.details or {}
    return {
        "title": manga.title,
        "cover_url": getattr(manga, "cover_url", None),
        "status": details.get("Status"),
        "author": details.get("Author"),
        "description": manga.description,
        "aliases": manga.aliases or [],
        "chapters": serialized_chapters,
        "latest_chapter": latest,
        "search_query": query,
    }


async def fetch_full(query: str) -> dict:
    return await asyncio.to_thread(_fetch_full, query)


def _search_light(query: str, limit: int = 5) -> list[dict]:
    results = weeb.search(query=query)[:limit]
    return [
        {"title": m.title, "cover_url": getattr(m, "cover_url", None)}
        for m in results
    ]


async def search_light(query: str, limit: int = 5) -> list[dict]:
    return await asyncio.to_thread(_search_light, query, limit)


def _download_chapter(query: str, manga_title: str, chapter_index: float) -> Path:
    manga = _find_best_match(query)
    chapters = manga.get_chapters()
    chapter = next((c for c in chapters if c.index == chapter_index), None)
    if chapter is None:
        raise ValueError(f"Chapter {chapter_index} not found")
    out_dir = DOWNLOAD_DIR / manga_title
    out_dir.mkdir(parents=True, exist_ok=True)
    chapter.download(path=str(out_dir), download_type=cast(DownloadType, DownloadType.PDF),)
    return out_dir / f"{chapter_index}.pdf"


async def download_chapter(query: str, manga_title: str, chapter_index: float) -> Path:
    return await asyncio.to_thread(_download_chapter, query, manga_title, chapter_index)