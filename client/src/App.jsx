import { useState } from "react";
import MangaGrid from "./components/MangaGrid";
import MangaDetail from "./components/MangaDetail";
import "./styles/index.css";

export default function App() {
  const [selectedId, setSelectedId] = useState(null);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-brand" onClick={() => setSelectedId(null)}>
          <div className="app-logo-icon">K</div>
          <span className="app-title">Komikos</span>
        </div>
        {selectedId && (
          <button className="btn btn-secondary" onClick={() => setSelectedId(null)}>
            Library
          </button>
        )}
      </header>

      <main>
        {selectedId ? (
          <MangaDetail id={selectedId} onBack={() => setSelectedId(null)} />
        ) : (
          <MangaGrid onSelect={setSelectedId} />
        )}
      </main>
    </div>
  );
}