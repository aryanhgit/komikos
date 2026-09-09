import { useState } from "react";
import { addManga } from "../utils/api";

export default function AddMangaForm({ onAdded }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const manga = await addManga(query.trim());
      setQuery("");
      onAdded(manga);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2 p-6 pb-0">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search manga to track…"
        className="flex-1 rounded-lg bg-neutral-900 border border-neutral-800 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-neutral-100 text-black text-sm font-medium px-4 py-2 disabled:opacity-50"
      >
        {busy ? "Adding…" : "Add"}
      </button>
      {error && <p className="text-red-400 text-xs self-center">{error}</p>}
    </form>
  );
}