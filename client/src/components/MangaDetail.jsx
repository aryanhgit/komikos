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
    getMangaDetail(id)
      .then((d) => active && setDetail(d))
      .catch((err) => active && setError(err.message));
    return () => {
      active = false;
    };
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

  if (readingChapter) {
    return (
      <MangaReader
        mangaId={id}
        chapter={readingChapter}
        onClose={() => setReadingChapter(null)}
      />
    );
  }

  if (!detail && !error) {
    return (
      <div className="page">
        <p className="status-text">Loading manga details…</p>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="page">
        <button onClick={onBack} className="back-btn">
          ← Back to Library
        </button>
        <div className="error-banner">{error}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="detail-view">
        <button onClick={onBack} className="back-btn">
          ← Back to Library
        </button>

        <div className="detail-hero">
          {detail.cover_url ? (
            <img src={detail.cover_url} alt={detail.title} className="detail-cover" />
          ) : (
            <div className="detail-cover-fallback">
              {detail.title?.[0]?.toUpperCase() || "M"}
            </div>
          )}

          <div className="detail-meta">
            <h1 className="detail-title">{detail.title}</h1>
            {detail.author && <div className="detail-author">By {detail.author}</div>}
            
            <div className="detail-pills">
              {detail.status && (
                <span className="pill">
                  <span className={`dot ${detail.status.toLowerCase()}`} />
                  {detail.status}
                </span>
              )}
              {detail.chapters && (
                <span className="pill">{detail.chapters.length} Chapters</span>
              )}
            </div>

            {detail.description && (
              <p className="detail-description">{detail.description}</p>
            )}
          </div>
        </div>

        {error && <div className="error-banner" style={{ marginTop: "24px" }}>{error}</div>}

        <div className="detail-actions">
          <h3 className="section-subtitle">Chapters</h3>
        </div>

        {(!detail.chapters || detail.chapters.length === 0) ? (
          <p className="status-text">No chapters available.</p>
        ) : (
          <ul className="chapter-list">
            {detail.chapters.map((c) => (
              <li key={c.id} className={`chapter-item ${c.read ? "read" : ""}`}>
                <div className="chapter-title-wrap">
                  <span className="chapter-title">{c.title}</span>
                  {c.read && <span className="read-badge">Downloaded</span>}
                </div>

                <div className="chapter-controls">
                  <button
                    onClick={() => setReadingChapter(c)}
                    className="btn btn-secondary"
                    style={{ fontSize: "12px", padding: "6px 14px" }}
                  >
                    Read
                  </button>
                  <button
                    onClick={() => handleDownload(c.id)}
                    disabled={busyChapter === c.id}
                    className={`btn ${c.read ? "btn-secondary" : "btn-primary"} btn-download`}
                  >
                    {busyChapter === c.id
                      ? "Downloading…"
                      : c.read
                      ? "Re-download"
                      : "Download"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}