import { useState } from "react";
import MangaGrid from "./components/MangaGrid";
import MangaDetail from "./components/MangaDetail";
import AddMangaForm from "./components/AddMangaForm";

export default function App() {
  const [selected, setSelected] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-black">
      {selected ? (
        <MangaDetail id={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <AddMangaForm onAdded={() => setRefreshKey((k) => k + 1)} />
          <MangaGrid key={refreshKey} onSelect={setSelected} />
        </>
      )}
    </div>
  );
}