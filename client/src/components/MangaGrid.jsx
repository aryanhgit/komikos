import { useMyManga } from "../utils/useMyManga";
import MangaCard from "./MangaCard";

export default function MangaGrid({ onSelect }) {
  const { manga, loading, error } = useMyManga();

  if (loading) return <p className="text-neutral-400 text-sm p-6">Loading your manga…</p>;
  if (error) return <p className="text-red-400 text-sm p-6">{error}</p>;
  if (!manga.length) return <p className="text-neutral-400 text-sm p-6">No manga tracked yet.</p>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 p-6">
      {manga.map((m) => (
        <MangaCard key={m.id} manga={m} onClick={onSelect} />
      ))}
    </div>
  );
}