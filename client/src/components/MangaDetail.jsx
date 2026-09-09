import { useEffect, useState } from "react";
import { getMangaDetail, downloadChapter } from "../utils/api";
import MangaReader from "./MangaReader";

export default function MangaDetail({ id, onBack }) {
  const [detail, setDetail] = useState(null);
  const [busyChapter, setBusyChapter] = useState(null);
  const [error, setError] = useState(null);
  const [readingChapter, setReadingChapter] = useState(null);

  useEffect(() => {
    let active = true;
    getMangaDetail(id).then((d) => active && setDetail(d));
    return () => { active = false; };
  }, [id]);

  async function handleDownload(chapterId) {
    setBusyChapter(chapterId);
    setError(null);
    try {
      const updated = await downloadChapter(id, chapterId);
      setDetail((prev) => ({
        ...prev,
        chapters: prev.chapters.map((c) => (c.id === chapterId ? updated : c)),
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyChapter(null);
    }
  }

  if (!detail) return <p className="text-neutral-400 text-sm p-6">Loading…</p>;

  if (readingChapter) {
    return (
      <MangaReader
        mangaId={id}
        chapter={readingChapter}
        onClose={() => setReadingChapter(null)}
      />
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto text-neutral-100">
      <button onClick={onBack} className="text-sm text-neutral-400 mb-4">← Back</button>
      <div className="flex gap-6">
        <img src={detail.cover_url} alt={detail.title} className="w-40 rounded-xl" />
        <div>
          <h1 className="text-xl font-semibold">{detail.title}</h1>
          <p className="text-sm text-neutral-400 mt-1">{detail.author}</p>
          <p className="text-sm text-neutral-400">{detail.status}</p>
          <p className="text-sm mt-3 text-neutral-300">{detail.description}</p>
        </div>
      </div>

      {error && <p className="text-red-400 text-xs mt-4">{error}</p>}

      <ul className="mt-6 divide-y divide-neutral-800">
        {detail.chapters.map((c) => (
          <li key={c.id} className="py-2 flex items-center justify-between text-sm">
            <span className={c.read ? "text-neutral-500" : "text-neutral-100"}>{c.title}</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setReadingChapter(c)} className="text-xs text-neutral-400 hover:underline">
                Read
              </button>
              <button
                onClick={() => handleDownload(c.id)}
                disabled={busyChapter === c.id}
                className="text-xs rounded-md bg-neutral-100 text-black px-2 py-1 disabled:opacity-50"
              >
                {busyChapter === c.id ? "Downloading…" : c.read ? "Re-download" : "Download"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}