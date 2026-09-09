from pydantic import BaseModel
from typing import Optional


class ChapterOut(BaseModel):
    id: str
    title: str
    index: float
    read: bool = False
    download_url: Optional[str] = None


class MangaSummary(BaseModel):
    id: int
    title: str
    cover_url: Optional[str] = None
    status: Optional[str] = None
    latest_chapter: Optional[float] = None


class MangaDetail(MangaSummary):
    description: Optional[str] = None
    author: Optional[str] = None
    aliases: list[str] = []
    chapters: list[ChapterOut] = []


class AddMangaRequest(BaseModel):
    query: str


class SearchResultItem(BaseModel):
    title: str
    cover_url: Optional[str] = None
    already_tracked: bool = False
    tracked_id: Optional[int] = None


class SearchResponse(BaseModel):
    db_matches: list[MangaSummary] = []
    web_results: list[SearchResultItem] = []