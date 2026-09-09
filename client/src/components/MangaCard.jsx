const STATUS_LABEL = {
  ongoing: "Ongoing",
  hiatus: "On Hiatus",
  completed: "Completed",
};

function initials(title) {
  return title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function MangaCard({ manga, onClick }) {
  const statusKey = (manga.status || "").toLowerCase();
  const label = STATUS_LABEL[statusKey] || manga.status;

  return (
    <div className="card" onClick={() => onClick(manga.id)}>
      <div className="art">
        {manga.latest_chapter != null && (
          <span className="chapter-badge">Ch. {manga.latest_chapter}</span>
        )}
        {manga.cover_url ? (
          <img src={manga.cover_url} alt={manga.title} loading="lazy" />
        ) : (
          <div className="monogram">{initials(manga.title)}</div>
        )}
      </div>
      <div className="meta">
        <div className="card-title">{manga.title}</div>
        {label && (
          <div className="status-row">
            <span className={`dot ${statusKey}`} />
            <span className="card-status-text">{label}</span>
          </div>
        )}
      </div>
    </div>
  );
}