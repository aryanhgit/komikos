from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from scripts.weeb import NetworkError, ParsingError

import db
import weeb_service
from schemas import MangaSummary, MangaDetail, AddMangaRequest, SearchResponse, SearchResultItem, ChapterOut

app = FastAPI(title="Weeb Central API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/downloads", StaticFiles(directory=weeb_service.DOWNLOAD_DIR), name="downloads")


@app.on_event("startup")
def startup():
    db.init_db()


@app.get("/api/manga/mine", response_model=list[MangaSummary])
def get_mine():
    return db.list_manga()


@app.post("/api/manga/mine", response_model=MangaDetail, status_code=201)
async def add_mine(req: AddMangaRequest):
    try:
        data = await weeb_service.fetch_full(req.query)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except (NetworkError, ParsingError) as e:
        raise HTTPException(502, str(e))
    manga_id = db.insert_manga(data)
    return {**data, "id": manga_id}


@app.get("/api/manga/search", response_model=SearchResponse)
async def search(q: str):
    db_matches = db.search_by_title(q)
    tracked_titles = db.all_titles()
    try:
        web = await weeb_service.search_light(q)
    except (NetworkError, ParsingError) as e:
        raise HTTPException(502, str(e))
    web_results = [
        SearchResultItem(
            title=r["title"],
            cover_url=r["cover_url"],
            already_tracked=r["title"].strip().lower() in tracked_titles,
            tracked_id=tracked_titles.get(r["title"].strip().lower()),
        )
        for r in web
    ]
    return SearchResponse(db_matches=db_matches, web_results=web_results) # type: ignore


@app.get("/api/manga/{manga_id}", response_model=MangaDetail)
def get_one(manga_id: int):
    record = db.get_manga(manga_id)
    if record is None:
        raise HTTPException(404, "Manga not tracked")
    return record


@app.post("/api/manga/{manga_id}/refresh", response_model=MangaDetail)
async def refresh_one(manga_id: int):
    record = db.get_manga(manga_id)
    if record is None:
        raise HTTPException(404, "Manga not tracked")
    try:
        data = await weeb_service.fetch_full(record["search_query"])
    except (ValueError, NetworkError, ParsingError) as e:
        raise HTTPException(502, str(e))
    previous = {c["id"]: c for c in record["chapters"]}
    for c in data["chapters"]:
        prev = previous.get(c["id"])
        if prev:
            c["read"] = prev.get("read", False)
            c["download_url"] = prev.get("download_url")
    db.update_manga(manga_id, data)
    return {**data, "id": manga_id}


@app.post("/api/manga/{manga_id}/chapters/{chapter_id}/download", response_model=ChapterOut)
async def download_chapter(manga_id: int, chapter_id: str):
    record = db.get_manga(manga_id)
    if record is None:
        raise HTTPException(404, "Manga not tracked")
    try:
        file_path = await weeb_service.download_chapter(
            record["search_query"], record["title"], chapter_id
        )
    except (ValueError, NetworkError, ParsingError) as e:
        raise HTTPException(502, str(e))
    download_url = f"/downloads/{file_path.relative_to(weeb_service.DOWNLOAD_DIR)}"
    chapters = db.update_chapter(manga_id, chapter_id, read=True, download_url=download_url)
    return next(c for c in chapters if c["id"] == chapter_id) # type: ignore


@app.get("/api/manga/{manga_id}/chapters/{chapter_id}/pages", response_model=list[str])
async def get_chapter_pages(manga_id: int, chapter_id: str):
    record = db.get_manga(manga_id)
    if record is None:
        raise HTTPException(404, "Manga not tracked")
    try:
        return await weeb_service.get_pages(record["search_query"], chapter_id)
    except (ValueError, NetworkError, ParsingError) as e:
        raise HTTPException(502, str(e))


@app.delete("/api/manga/mine/{manga_id}", status_code=204)
def delete_one(manga_id: int):
    db.delete_manga(manga_id)