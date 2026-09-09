import { useState } from "react";
import { searchManga, addManga } from "../utils/api";

export default function SearchManga({ value, onChange, onAdded, onSelectTracked }) {
  const [results, setResults] = useState(null);
  const [busyTitle, setBusyTitle] = useState(null);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const q = value?.trim();
    if (!q) return;
    setError(null);
    try {
      setResults(await searchManga(q));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAdd(title) {
    setBusyTitle(title);
    try {
      const manga = await addManga(title);
      onAdded(manga);
      setResults((prev) => ({
        ...prev,
        web_results: prev.web_results.map((r) =>
          r.title === title ? { ...r, already_tracked: true, tracked_id: manga.id } : r
        ),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyTitle(null);
    }
  }

  return (
    <div className="search-section">
      <div className="search-shell">
        <form onSubmit={submit} className="search-form">
          <div className="search-field">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input"
              value={value || ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Search manga online or in your library…"
              autoComplete="off"
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      {error && <div className="error-banner" style={{ maxWidth: "600px", margin: "16px auto 0" }}>{error}</div>}

      {(results?.db_matches?.length > 0 || results?.web_results?.length > 0) && (
        <div className="search-results-panel">
          {results?.db_matches?.length > 0 && (
            <div>
              <div className="results-group-title">In Your Library</div>
              <ul className="results-list">
                {results.db_matches.map((m) => (
                  <li key={m.id} className="result-item">
                    <span className="result-title">{m.title}</span>
                    <button
                      onClick={() => onSelectTracked(m.id)}
                      className="btn btn-secondary result-action-btn"
                    >
                      View
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results?.web_results?.length > 0 && (
            <div>
              <div className="results-group-title">WeebCentral Results</div>
              <ul className="results-list">
                {results.web_results.map((r) => (
                  <li key={r.title} className="result-item">
                    <span className="result-title">{r.title}</span>
                    {r.already_tracked ? (
                      <button
                        onClick={() => onSelectTracked(r.tracked_id)}
                        className="btn btn-secondary result-action-btn"
                      >
                        In Library
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAdd(r.title)}
                        disabled={busyTitle === r.title}
                        className="btn btn-accent result-action-btn"
                      >
                        {busyTitle === r.title ? "Adding…" : "Add to Library"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}