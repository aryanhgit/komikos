import { useMemo, useState } from "react";
import { useMyManga } from "../utils/useMyManga";
import MangaCard from "./MangaCard";
import SearchManga from "./SearchManga";

export default function MangaLibrary({ onSelect }) {
  const { manga, loading, error } = useMyManga();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return manga;
    return manga.filter((m) => m.title.toLowerCase().includes(q));
  }, [manga, query]);

  const handleAdded = (newManga) => {
    console.log("Added new manga:", newManga);
    setMangaList((prev) => [...prev, newManga]);
  };

  // Called when a user clicks a manga that is already tracked or in the DB
  const handleSelectTracked = (id) => {
    console.log("Selected manga ID:", id);
    setSelectedMangaId(id);
  };

  return (
    <div className="page">

      <SearchManga value={query} onChange={setQuery} onAdded={handleAdded}
        onSelectTracked={handleSelectTracked} />

      {loading && <p className="status-text">Loading your manga…</p>}
      {error && <p className="status-text">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          {manga.length === 0 ? "No manga tracked yet." : "No manga match that search."}
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