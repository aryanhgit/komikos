import { useMemo, useState } from "react";
import { useMyManga } from "../utils/useMyManga";
import MangaCard from "./MangaCard";
import SearchManga from "./SearchManga";

export default function MangaGrid({ onSelect }) {
  const { manga, loading, error, reload } = useMyManga();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return manga;
    return manga.filter((m) => m.title.toLowerCase().includes(q));
  }, [manga, query]);

  const handleAdded = () => {
    reload();
  };

  return (
    <div className="page">
      <SearchManga
        value={query}
        onChange={setQuery}
        onAdded={handleAdded}
        onSelectTracked={onSelect}
      />

      <div className="grid-section-header">
        <h2 className="grid-title">Library</h2>
        <span className="grid-count">{manga.length} Manga</span>
      </div>

      {loading && <p className="status-text">Loading library…</p>}
      {error && <div className="error-banner">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">
            {manga.length === 0 ? "No manga in library" : "No matching manga found"}
          </div>
          <div className="empty-state-desc">
            {manga.length === 0
              ? "Use the search bar above to discover and add manga to your collection."
              : "Try searching with a different keyword."}
          </div>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid">
          {filtered.map((m) => (
            <MangaCard key={m.id} manga={m} onClick={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}