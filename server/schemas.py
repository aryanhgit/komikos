from pydantic import BaseModel
from typing import Optional


class ChapterOut(BaseModel):
    id: str
    title: str
    index: float


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
