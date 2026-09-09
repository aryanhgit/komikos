import { useState } from "react";
import { searchManga, addManga } from "../utils/api";

export default function SearchManga({ onAdded, onSelectTracked }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [busyTitle, setBusyTitle] = useState(null);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    try {
      setResults(await searchManga(query.trim()));
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
    <div className="p-6">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search manga…"
          className="flex-1 rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
        />
        <button type="submit" className="rounded-lg bg-neutral-100 text-black text-sm font-medium px-4 py-2">
          Search
        </button>
      </form>

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      {results?.db_matches?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-neutral-500 mb-2">Already in your list</p>
          <ul className="space-y-1">
            {results.db_matches.map((m) => (
              <li key={m.id}>
                <button onClick={() => onSelectTracked(m.id)} className="text-sm text-neutral-100 hover:underline">
                  {m.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {results?.web_results?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-neutral-500 mb-2">Results from weebcentral.com</p>
          <ul className="space-y-2">
            {results.web_results.map((r) => (
              <li key={r.title} className="flex items-center justify-between rounded-lg bg-neutral-900/40 px-3 py-2">
                <span className="text-sm text-neutral-100">{r.title}</span>
                {r.already_tracked ? (
                  <button onClick={() => onSelectTracked(r.tracked_id)} className="text-xs text-neutral-400">
                    View
                  </button>
                ) : (
                  <button
                    onClick={() => handleAdd(r.title)}
                    disabled={busyTitle === r.title}
                    className="text-xs rounded-md bg-neutral-100 text-black px-2 py-1 disabled:opacity-50"
                  >
                    {busyTitle === r.title ? "Adding…" : "Add"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}