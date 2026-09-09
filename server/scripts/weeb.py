from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
import io
import logging
import os
import random
import time
from typing import Any, List, Optional

from bs4 import BeautifulSoup
from fpdf import FPDF
from PIL import Image
import requests
from ua_generator import generate

from scripts.enums import (
    Genre,
    OfficialTranslation,
    Order,
    SeriesStatus,
    Sort,
)


logger = logging.getLogger(__name__)


class NetworkError(Exception):
    """Network-related errors: connection timeouts, HTTP status codes."""
    pass


class ParsingError(Exception):
    """Error parsing HTML content."""
    pass


class Cache:
    """Simple in-memory key-value cache with a size limit."""

    def __init__(self, max_size: int = 100):
        """Initialize the cache."""
        self._cache = {}
        self.max_size = max_size

    def get(self, key: str) -> Optional[Any]:
        """Return a cached value, or None when not found."""
        return self._cache.get(key)

    def set(self, key: str, value: Any) -> None:
        """Store a value and remove the oldest item when full."""
        if len(self._cache) >= self.max_size:
            self._cache.popitem()
        self._cache[key] = value


class Network:
    """Handle network requests and HTML parsing."""

    MAX_RETRIES = 3
    TIMEOUT = 60
    BASE_URL = "https://weebcentral.com"

    def __init__(self) -> None:
        self.session = requests.Session()

    def get_response(
        self, url: str, params: Optional[dict] = None
    ) -> requests.Response:
        """Fetch a URL with retries on request failure."""

        headers = {"User-Agent": generate().text}

        for attempt in range(self.MAX_RETRIES):
            try:
                if params:
                    response = self.session.get(
                        url,
                        params=params,
                        headers=headers,
                        timeout=self.TIMEOUT,
                    )
                else:
                    response = self.session.get(
                        url,
                        headers=headers,
                        timeout=self.TIMEOUT,
                    )

                response.raise_for_status()
                return response
            except requests.exceptions.RequestException as exc:
                if attempt == self.MAX_RETRIES - 1:
                    logger.error("Request failed for %s: %s", url, exc)
                    raise NetworkError(
                        f"Failed to get response from {url} due to {exc}"
                    ) from exc

                time.sleep(random.uniform(0.5, 1))

        raise NetworkError(f"Failed to get response from {url}")


    def create_soup(
        self, url: str, params: Optional[dict] = None
    ) -> BeautifulSoup:
        """Fetch and parse a webpage into BeautifulSoup."""

        try:
            response = self.get_response(url, params)
            return BeautifulSoup(response.text, "html.parser")
        except NetworkError:
            raise
        except Exception as exc:
            logger.error("Failed to parse HTML from %s: %s", url, exc)
            raise ParsingError(
                f"Failed to parse html from {url} due to: {exc}"
            ) from exc


    def thread(self, funcs, max_workers: int = 15) -> bool:
        """Execute functions concurrently using a thread pool."""

        try:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [executor.submit(func) for func in funcs]
                for future in as_completed(futures):
                    future.result()
            return True
        except Exception as exc:
            logger.error("Concurrent task execution failed: %s", exc)
            return False



class Weeb(Network):
    """Provide high-level methods for searching WeebCentral."""

    _cache = Cache()

    def search(
        self,
        query: str = "",
        sort: Sort = Sort.BEST_MATCH,
        order: Order = Order.DESCENDING,
        official: OfficialTranslation = OfficialTranslation.ANY,
        status: Optional[List[SeriesStatus]] = None,
        genre: Optional[List[Genre]] = None,
    ) -> List[Manga]:
        """Search WeebCentral for manga and cache the results."""

        search_url = f"{self.BASE_URL}/search/data"
        status = status or []
        genre = genre or []

        params = {
            "text": query,
            "sort": sort,
            "order": order,
            "official": official,
            "included_status": status,
            "included_tag": genre,
            "display_mode": "Full Display",
        }

        cache_key = str(sorted(params.items()))
        if cache := self._cache.get(cache_key):
            return cache

        soup = self.create_soup(search_url, params)
        results = []

        for item in soup.find_all("span", class_="tooltip tooltip-bottom"):
            if a_tag := item.find("a"):
                title = item.get("data-tip")
                url = a_tag.get("href")
                if isinstance(title, str) and isinstance(url, str):
                    results.append(Manga(url, title))

        self._cache.set(cache_key, results)
        return results



class Manga(Network):
    """Represent a manga series and its chapters."""

    _cache = Cache()

    def __init__(self, url: str, title: str) -> None:
        """Initialize a manga instance."""
        super().__init__()
        self.url = url
        self.title = title
        self.details: dict = {}
        self.description: str = ""
        self.related_series: List[Manga] = []
        self.aliases: List[str] = []


    def get_chapters(self, force: bool = False) -> List[Chapter]:
        """Fetch and cache all available chapters."""
        
        if not force and (cache := self._cache.get(self.url)):
            return cache

        data = []
        manga_url = self.url.split("/")
        manga_url.pop()
        manga_url.append("full-chapter-list")
        url = "/".join(manga_url)

        soup = self.create_soup(url)
        chapters_target = soup.find_all(
            "span", class_="grow flex items-center gap-2"
        )
        chapters_target.reverse()

        links_target = soup.find_all("div", class_="flex items-center")
        links_target.reverse()

        count = 0
        season = 1

        for chapter, link in zip(chapters_target, links_target):
            chapter = chapter.span.get_text(strip=True).split() # type: ignore
            link = link.a.get("href") # type: ignore

            if not chapter or not isinstance(link, str):
                continue

            if chapter[0].startswith("S"):
                chapter = Chapter(chapter[-1], link, int(chapter[0][1:]))
            else:
                count += 1
                if count == 100:
                    count = 0
                    season += 1
                chapter = Chapter(chapter[-1], link, season)

            data.append(chapter)

        self._cache.set(self.url, data)
        return data


    def filter_chapters(
        self,
        chapters: List[Chapter],
        start: float = 1,
        end: float = 0,
        season: int = 0,
    ) -> List[Chapter]:
        """Filter chapters by chapter number range and season."""

        if not chapters:
            return []

        if season:
            chapters = [
                chapter for chapter in chapters if chapter.season == season
            ]

        if not chapters:
            return []

        max_index = float(chapters[-1].index)
        end = end if end else max_index

        if max_index < end or start < 1:
            return []

        return [
            chapter
            for chapter in chapters
            if start <= float(chapter.index) <= end
        ]


    def download(self, chapters: List[Chapter]) -> None:
        """Download the given chapters for the manga."""

        path = "-".join(self.title.split())
        os.makedirs(path, exist_ok=True)

        for chapter in chapters:
            chapter.download(path)


    def get_details(self) -> None:
        """Scrape and store manga metadata, aliases, and related series."""

        soup = self.create_soup(self.url)
        uls = soup.find_all("ul", class_="flex flex-col gap-4")

        if len(uls) < 2:
            logger.warning("Could not find expected metadata sections for %s", self.url)
            return

        about = uls[0]
        strongs = about.find_all("strong")

        for strong in strongs:
            label = strong.get_text(strip=True)
            if label.startswith("RSS") or label.startswith("Track"):
                continue

            a = strong.find_next_sibling("a")
            if a is not None:
                self.details[label] = a.get_text(strip=True)
            else:
                values = []
                for span in strong.find_next_siblings("span"):
                    if span.a is not None:
                        values.append(span.a.get_text(strip=True))
                    else:
                        values.append(span.get_text(strip=True))
                self.details[label] = ", ".join(values)

        desc = uls[1]
        strongs = desc.find_all("strong")
        self.description = desc.p.get_text(strip=True) if desc.p else ""

        if len(strongs) < 2:
            return

        text = strongs[1].get_text(strip=True)
        names = desc.ul.find_all("li") if desc.ul else []

        if text.startswith("Related"):
            for name in names:
                if name.a is not None:
                    self.related_series.append(
                        Manga(name.a.get("href"), name.get_text(strip=True)) # type: ignore
                    )
            return

        self.aliases = [name.get_text(strip=True) for name in names]



class Chapter(Network):
    """Represent a single manga chapter."""

    _cache = Cache()

    def __init__(self, index: str, url: str, season: int = 0):
        """Initialize a chapter instance."""

        super().__init__()
        self.index = index
        self.url = url
        self.season = season


    def get_pages(self) -> List[Page]:
        """Fetch and cache all pages for the chapter."""

        if cache := self._cache.get(self.url):
            return cache

        pages_url = self.url
        if pages_url.startswith("/"):
            pages_url = f"{self.BASE_URL}{pages_url}"
        pages_url += "/images"

        params = {"is_prev": "False", "reading_style": "long_strip"}
        soup = self.create_soup(pages_url, params)
        images = soup.find_all("img")
        pages = []

        for index, image in enumerate(images, start=1):
            url = image.get("src")
            if isinstance(url, str):
                pages.append(Page(index, url))

        self._cache.set(self.url, pages)
        return pages


    def download_pages(self) -> List[Page]:
        """Download page data concurrently and return pages in order."""

        pages = self.get_pages()
        success = self.thread([page.fetch_data for page in pages])

        if not success:
            return []

        pages.sort(key=lambda page: page.index)
        return pages


    def download(self, path: str) -> None:
        """Download the chapter and save it as a PDF."""

        index = self.index if not self.season else f"S{self.season}_{self.index}"
        file_name = f"{index}.pdf"
        file_path = os.path.join(path, file_name)

        logger.info("Downloading chapter: %s", index)
        pages = self.download_pages()

        if not pages:
            logger.error("No pages downloaded for chapter %s", index)
            return

        self.create_pdf(file_path, pages)


    def create_pdf(self, path: str, pages: List[Page]) -> None:
        """Compile downloaded pages into a single PDF file."""
        pdf = FPDF(unit="mm")
        pdf.set_compression(False)
        pdf.set_margins(0, 0)
        pdf.set_auto_page_break(False)

        for page in pages:
            if not page.data:
                continue

            img_bytes = page.data
            with Image.open(io.BytesIO(img_bytes)) as img:
                width_mm = img.width * 25.4 / 96
                height_mm = img.height * 25.4 / 96

            pdf.add_page(format=(width_mm, height_mm))
            pdf.image(
                io.BytesIO(img_bytes), x=0, y=0, w=width_mm, h=height_mm,
            )

        pdf.output(path)
        logger.info("Chapter %s has been downloaded as %s", self.index, path)



class Page(Network):
    """Represent a single page of a manga chapter."""

    _cache = Cache()

    def __init__(self, index: int, url: str) -> None:
        """Initialize a page instance."""

        super().__init__()
        self.index = index
        self.url = url
        self.data: bytes = b""

    def fetch_data(self) -> None:
        """Fetch and cache the raw image data for this page."""
        
        if cache := self._cache.get(self.url):
            self.data = cache
            return

        self.data = self.get_response(self.url).content
        self._cache.set(self.url, self.data)
