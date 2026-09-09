export default function MangaCard({ manga, onClick }) {
  return (
    <button
      onClick={() => onClick(manga.id)}
      className="group text-left rounded-2xl overflow-hidden bg-neutral-900/40 hover:bg-neutral-900/70 transition"
    >
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={manga.cover_url}
          alt={manga.title}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
        />
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-neutral-100 truncate">{manga.title}</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          {manga.latest_chapter ? `Ch. ${manga.latest_chapter}` : manga.status}
        </p>
      </div>
    </button>
  );
}