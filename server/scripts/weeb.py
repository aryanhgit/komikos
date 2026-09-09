from scripts.enums import (
    Sort,
    Order,
    OfficialTranslation,
    SeriesStatus,
    Genre,)

from ua_generator import generate
from typing import List, Optional, Any
from bs4 import BeautifulSoup
import requests, time, random, io, os
from fpdf import FPDF
from PIL import Image
from concurrent.futures import ThreadPoolExecutor, as_completed


class NetworkError(Exception):
    """Network-related errors: connection timeouts, HTTP status codes."""
    pass


class ParsingError(Exception):
    """Error parsing HTML content: BeautifulSoup."""
    pass


class Cache:
    """A simple in-memory key-value cache with a maximum size limit."""

    def __init__(self, max_size: int = 100):
        """Initializes the cache.

        Args:
                max_size (int): The maximum number of items to store in the cache.
        """
        self._cache = {}
        self.max_size = max_size

    def get(self, key: str) -> Optional[Any]:
        """Retrieves an item from the cache.

        Args:
                key: The key of the item to retrieve.

        Returns:
                The cached value, or None if the key is not found.
        """
        return self._cache.get(key)

    def set(self, key: str, value: Any) -> None:
        """Adds or updates an item in the cache.

        If the cache is full, the oldest item is removed.

        Args:
                key: The key of the item to store.
                value: The value to be stored.
        """
        if len(self._cache) >= self.max_size:
            self._cache.popitem()
        self._cache[key] = value



class Network:
    """Handles network requests using a persistent session and parses HTML content."""

    MAX_RETRIES = 3
    TIMEOUT = 60  # seconds
    BASE_URL = "https://weebcentral.com"

    def __init__(self) -> None:
        self.session = requests.Session()

    def get_response(self, url: str, params: dict = {}) -> requests.Response:
        """Fetches a URL with retries on failure."""
        
        headers = {"User-Agent": generate().text}
        for attempt in range(self.MAX_RETRIES):
            try:
                if params:
                    response = self.session.get(
                        url, params=params, headers=headers, timeout=self.TIMEOUT
                    )
                else:
                    response = self.session.get(
                        url, headers=headers, timeout=self.TIMEOUT
                    )
                response.raise_for_status()
                return response
            except requests.exceptions.RequestException as e:
                if attempt == self.MAX_RETRIES - 1:
                    raise NetworkError(f"Failed to get response from {url} due to {e}")
                time.sleep(random.uniform(0.5, 1))

        raise NetworkError(f"Failed to get response from {url}")


    def create_soup(self, url: str, params: dict = {}) -> BeautifulSoup:
        """Fetches a webpage and parses it into a BeautifulSoup object."""

        try:
            response = self.get_response(url, params)
            return BeautifulSoup(response.text, "html.parser")
        except Exception as e:
            raise ParsingError(f"Failed to parse html from {url} due to: {e}")


    def thread(self, funcs, max_workers: int = 15) -> bool:
        """Executes a list of functions concurrently using a thread pool."""

        try:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [executor.submit(func) for func in funcs]
                for future in as_completed(futures):
                    future.result()
            return True
        except Exception as e:
            return False



class Weeb(Network):
    """Provides high-level methods to interact with WeebCentral.com.

    Inherits network functionality from the Network class and handles searching.
    """

    # cache for search
    _cache = Cache()

    def search(
        self,
        query: str = "",
        sort: Sort = Sort.BEST_MATCH,
        order: Order = Order.DESCENDING,
        official: OfficialTranslation = OfficialTranslation.ANY,
        status: Optional[List[SeriesStatus]] = [],
        genre: Optional[List[Genre]] = [],
    ) -> List[Manga]:
        """Searches for manga on WeebCentral. 
        Results are cached based on search parameters.
        """
        search_url = f"{self.BASE_URL}/search/data"
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
                    manga = Manga(url, title)
                    results.append(manga)
        self._cache.set(cache_key, results)
        return results



class Manga(Network):
    """Represents a single manga series, providing methods to fetch its details and chapters."""

    _cache = Cache()

    def __init__(self, url: str, title: str) -> None:
        """Initializes a Manga instance."""

        super().__init__()
        self.url = url
        self.title = title
        self.details: dict = {}
        self.description: str = ""
        self.related_series: List[Manga] = []
        self.aliases: List[str] = []


    def get_chapters(self, force: bool = False) -> List[Chapter]:
        """Fetches a list of all available chapters for the manga.

        Results are cached."""

        if not force and self._cache.get(self.url):
            return self._cache.get(self.url)
        
        data = []
        manga_url = self.url.split("/")
        manga_url.pop()
        manga_url.append("full-chapter-list")
        url = "/".join(manga_url)
        soup = self.create_soup(url)
        chapters_target = soup.find_all("span", class_="grow flex items-center gap-2")
        chapters_target.reverse()
        links_target = soup.find_all("div", class_="flex items-center")
        links_target.reverse()

        count = 0
        season = 1
        for chapter, link in zip(chapters_target, links_target):
            chapter = chapter.span.get_text(strip=True).split()
            link = link.a.get("href")
            if chapter[0].startswith("S"):
                # has a season.
                chapter = Chapter(chapter[-1], link, int(chapter[0][1:]))
            else:
                count += 1
                if count == 100:
                    count = 0
                    season += 1
                chapter = Chapter(chapter[-1], link, season)
            data.append(chapter)
        # save for next time if needed
        self._cache.set(self.url, data)
        return data


    def filter_chapters(
        self, chapters: List[Chapter], start: float = 1, end: float = 0, season: int = 0
    ) -> List[Chapter]:
        """Filters a given list of chapters by chapter number range and/or season."""

        if season:
            chapters = [chapter for chapter in chapters if chapter.season == season]
        max = float(chapters[-1].index)
        end = end if end else max
        if max < end or start < 1:
            return []

        def in_between(n):
            index = float(n.index)
            return index <= end and index >= start

        chapters = filter(in_between, chapters)
        return chapters


    def download(self, chapters: List[Chapter]) -> None:
        """Downloads a given list of chapters for the manga."""

        path = "-".join(self.title.split())
        os.makedirs(path, exist_ok=True)
        for chapter in chapters:
            chapter.download(path)


    def get_details(self) -> None:
        """Scrapes the manga's page to populate its metadata attributes.

        This includes details like author, artist, genres, description,
        aliases, and related series.
        """

        #todo: add image url also to scrape
        soup = self.create_soup(self.url)
        uls = soup.find_all("ul", class_="flex flex-col gap-4")
        about = uls[0]
        strongs = about.find_all("strong")
        for strong in strongs:
            if strong.get_text(strip=True).startswith("RSS") or strong.get_text(
                strip=True
            ).startswith("Track"):
                continue
            a = strong.find_next_sibling("a")
            if a is not None:
                self.details[strong.get_text(strip=True)] = a.get_text(strip=True)
            else:
                spans = strong.find_next_siblings("span")
                to_print = []
                for span in spans:
                    if span.a is not None:
                        to_print.append(span.a.get_text(strip=True))
                    else:
                        to_print.append(span.get_text(strip=True))
                self.details[strong.get_text(strip=True)] = ", ".join(to_print)

        desc = uls[1]
        strongs = desc.find_all("strong")
        self.description = desc.p.get_text(strip=True)
        try:
            text = strongs[1].get_text(strip=True)
        except:
            return
        names = [name for name in desc.ul.find_all("li")]
        if text.startswith("Related"):
            for name in names:
                self.related_series.append(
                    Manga(name.a.get("href"), name.get_text(strip=True))
                )
            return
        self.aliases = [name.get_text(strip=True) for name in names]




class Chapter(Network):
    """Represents a single chapter of a manga."""

    _cache = Cache()

    def __init__(self, index: str, url: str, season: int = 0):
        """Initializes a Chapter instance."""
        super().__init__()
        self.index = index
        self.url = url
        self.season = season

    def get_pages(self) -> List[Page]:
        """Fetches a list of all pages for this chapter.

        The list of pages is cached after the first retrieval.

        Returns:
                        A list of Page objects in reading order.
        """
        if cache := self._cache.get(self.url):
            return cache
        pages_url = self.url + "/images"
        params = {"is_prev": "False", "reading_style": "long_strip"}
        soup = self.create_soup(pages_url, params)
        images = soup.find_all("img")
        pages = []
        for index, image in enumerate(images, start=1):
            url = image.get("src")
            page = Page(index, url)
            pages.append(page)

        # save for next if needed
        self._cache.set(self.url, pages)
        return pages

    def download_pages(self) -> List[Page]:
        """Downloads the image data for all pages in the chapter concurrently.

        Returns:
                        A list of Page objects with their `data` attribute populated.
                        Returns an empty list on failure.
        """
        pages = self.get_pages()
        success = self.thread([page.fetch_data for page in pages])
        if not success:
            return []
        # sort pages just in case
        pages.sort(key=lambda page: page.index)
        return pages

    def download(self, path: str) -> None:
        """Downloads the chapter and saves it to a specified path."""
        
        index = self.index if not self.season else f"S{self.season}_{self.index}"
        file_name = f"{index}.pdf"
        file_path = os.path.join(path, file_name)
        
        print(f"Downloading Chapter: {index}", end="\r")
        pages = self.download_pages()
        assert pages
        self.create_pdf(file_path, pages)

    def create_pdf(self, path: str, pages: List[Page]) -> None:
        """Compiles a list of downloaded pages into a single PDF file."""
        pdf = FPDF(unit="mm")
        pdf.set_compression(False)
        pdf.set_margins(0, 0)
        pdf.set_auto_page_break(False)

        for page in pages:
            img_bytes = page.data
            assert img_bytes
            with Image.open(io.BytesIO(img_bytes)) as img:
                width_mm = img.width * 25.4 / 96
                height_mm = img.height * 25.4 / 96

            pdf.add_page(format=(width_mm, height_mm))
            pdf.image(io.BytesIO(img_bytes), x=0, y=0, w=width_mm, h=height_mm)
        pdf.output(path)
        print(f"Chapter {self.index} has been downloaded as {path}")



class Page(Network):
    """Represents a single page of a manga chapter."""

    _cache = Cache()

    def __init__(self, index: int, url: str) -> None:
        """Initializes a Page instance."""
        super().__init__()
        self.index = index
        self.url = url
        # not initiated in constructor cause we don't wanna overload unless need it.
        self.data: bytes = b""

    def fetch_data(self) -> None:
        """Fetches the raw image data for this page and stores it in the `data` attribute.

        Image data is cached to prevent re-downloads.
        """
        if cache := self._cache.get(self.url):
            self.data = cache
            return
        self.data = self.get_response(self.url).content
        self._cache.set(self.url, self.data)
