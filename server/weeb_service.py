import asyncio
from scripts.weeb import Weeb

weeb = Weeb()


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
