from enum import Enum


class Sort(Enum):
    BEST_MATCH = "Best Match"
    ALPHABET = "Alphabet"
    RECENTLY_ADDED = "Recently Added"
    LATEST_UPDATES = "Latest Updates"

    def __str__(self):
        return self.value


class Order(Enum):
    ASCENDING = "Ascending"
    DESCENDING = "Descending"

    def __str__(self):
        return self.value


class OfficialTranslation(Enum):
    ANY = "Any"
    TRUE = "True"
    FALSE = "False"

    def __str__(self):
        return self.value


class SeriesStatus(Enum):
    ONGOING = "Ongoing"
    COMPLETE = "Complete"
    HIATUS = "Hiatus"
    CANCELED = "Canceled"

    def __str__(self):
        return self.value


class Genre(Enum):
    ACTION = "Action"
    ADULT = "Adult"
    ADVENTURE = "Adventure"
    COMEDY = "Comedy"
    DRAMA = "Drama"
    ECCHI = "Ecchi"
    FANTASY = "Fantasy"
    HAREM = "Harem"
    HENTAI = "Hentai"
    HISTORICAL = "Historical"
    HORROR = "Horror"
    ISEKAI = "Isekai"
    JOSEI = "Josei"
    MARTIAL_ARTS = "Martial Arts"
    MATURE = "Mature"
    MECHA = "Mecha"
    MYSTERY = "Mystery"
    PSYCHOLOGICAL = "Psychological"
    ROMANCE = "Romance"
    SCHOOL_LIFE = "School Life"
    SCI_FI = "Sci-fi"
    SEINEN = "Seinen"
    SHOUNEN = "Shounen"
    SLICE_OF_LIFE = "Slice of Life"
    SPORTS = "Sports"
    SUPERNATURAL = "Supernatural"
    TRAGEDY = "Tragedy"
    OTHER = "Other"

    def __str__(self):
        return self.value
