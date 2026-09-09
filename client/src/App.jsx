import { useState } from "react";
import MangaGrid from "./components/MangaGrid";
import MangaDetail from "./components/MangaDetail";
import SearchManga from "./components/SearchManga";

export default function App() {
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-black">
      {selected ? (
        <MangaDetail id={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <SearchManga
            onAdded={() => setRefreshKey((k) => k + 1)}
            onSelectTracked={setSelected}
          />
          <MangaGrid key={refreshKey} onSelect={setSelected} />
        </>
      )}
    </div>
  );
}