from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from scripts.weeb import NetworkError, ParsingError

import db
import weeb_service
from schemas import MangaSummary, MangaDetail, AddMangaRequest, SearchResponse, SearchResultItem

app = FastAPI(title="Weeb Central API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    return SearchResponse(db_matches=db_matches, web_results=web_results)


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
    db.update_manga(manga_id, data)
    return {**data, "id": manga_id}


@app.delete("/api/manga/mine/{manga_id}", status_code=204)
def delete_one(manga_id: int):
    db.delete_manga(manga_id)