import { useEffect, useRef, useState } from "react";
import { ArrowUp, Settings, ChevronLeft, ChevronRight, X } from "lucide-react";
import { getChapterPages } from "../utils/api";
import { loadPdfPages } from "../utils/pdfLoader";

const DEFAULT_SETTINGS = {
  topNav: "simple",
  gap: 8,
  backToTop: true,
  direction: "ltr",
  style: "strip",
  fit: "width",
};

export default function MangaReader({ mangaId, chapter, onClose }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setPageIndex(0);

    const source =
      chapter.read && chapter.download_url
        ? loadPdfPages(chapter.download_url)
        : getChapterPages(mangaId, chapter.id);

    source
      .then((p) => active && setPages(p))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [mangaId, chapter.id, chapter.download_url, chapter.read]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      setShowBackToTop(el.scrollTop > 400);
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [settings.style]);

  function update(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function scrollToTop() {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goNext() {
    setPageIndex((i) =>
      Math.min(i + (settings.style === "double" ? 2 : 1), pages.length - 1)
    );
  }

  function goPrev() {
    setPageIndex((i) =>
      Math.max(i - (settings.style === "double" ? 2 : 1), 0)
    );
  }

  const fitClass = settings.fit === "width" ? "fit-width" : "fit-height";

  return (
    <div className="reader-overlay">
      <div className={`reader-topbar ${settings.topNav === "sticky" ? "sticky" : ""}`}>
        <button onClick={onClose} className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "13px" }}>
          ← Close
        </button>

        <div className="reader-title-info">
          <span>{chapter.title}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {settings.style !== "strip" && pages.length > 0 && (
            <span className="reader-page-counter">
              {pageIndex + 1} / {pages.length}
            </span>
          )}
          <button
            onClick={() => setSettingsOpen((o) => !o)}
            className="btn-icon"
            title="Reader Settings"
          >
            {settingsOpen ? <X size={18} /> : <Settings size={18} />}
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="reader-settings-panel">
          <Row label="Top Navigation">
            <Toggle
              options={[
                ["simple", "Simple"],
                ["sticky", "Sticky"],
              ]}
              value={settings.topNav}
              onChange={(v) => update("topNav", v)}
            />
          </Row>

          <Row label="Page Gap">
            <input
              type="range"
              min="0"
              max="32"
              value={settings.gap}
              onChange={(e) => update("gap", Number(e.target.value))}
              className="reader-range-input"
            />
          </Row>

          <Row label="Back to Top Button">
            <input
              type="checkbox"
              checked={settings.backToTop}
              onChange={(e) => update("backToTop", e.target.checked)}
              style={{ accentColor: "var(--accent)", cursor: "pointer" }}
            />
          </Row>

          <Row label="Direction">
            <Toggle
              options={[
                ["ltr", "L → R"],
                ["rtl", "R → L"],
              ]}
              value={settings.direction}
              onChange={(v) => update("direction", v)}
            />
          </Row>

          <Row label="Reading Mode">
            <Toggle
              options={[
                ["strip", "Strip"],
                ["single", "Single"],
                ["double", "Double"],
              ]}
              value={settings.style}
              onChange={(v) => {
                update("style", v);
                setPageIndex(0);
              }}
            />
          </Row>

          <Row label="Image Fit">
            <Toggle
              options={[
                ["width", "Width"],
                ["height", "Height"],
              ]}
              value={settings.fit}
              onChange={(v) => update("fit", v)}
            />
          </Row>
        </div>
      )}

      <div ref={scrollRef} className="reader-content">
        {loading && <p className="status-text">Loading chapter pages…</p>}
        {error && <div className="error-banner" style={{ margin: "24px auto", maxWidth: "600px" }}>{error}</div>}

        {!loading && !error && settings.style === "strip" && (
          <div className="reader-strip-view" style={{ gap: `${settings.gap}px` }}>
            {pages.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Page ${i + 1}`}
                className={`reader-page-img ${fitClass}`}
                loading="lazy"
              />
            ))}
          </div>
        )}

        {!loading && !error && settings.style !== "strip" && pages.length > 0 && (
          <div className="reader-paged-view">
            <button
              onClick={settings.direction === "ltr" ? goPrev : goNext}
              disabled={pageIndex === 0}
              className="reader-nav-btn"
            >
              <ChevronLeft size={22} />
            </button>

            <div style={{ display: "flex", gap: `${settings.gap}px`, alignItems: "center" }}>
              {settings.style === "single" ? (
                <img
                  src={pages[pageIndex]}
                  alt={`Page ${pageIndex + 1}`}
                  className={`reader-page-img ${fitClass}`}
                />
              ) : (
                (settings.direction === "ltr"
                  ? [pages[pageIndex], pages[pageIndex + 1]]
                  : [pages[pageIndex + 1], pages[pageIndex]]
                )
                  .filter(Boolean)
                  .map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Page`}
                      className={`reader-page-img ${fitClass}`}
                    />
                  ))
              )}
            </div>

            <button
              onClick={settings.direction === "ltr" ? goNext : goPrev}
              disabled={pageIndex >= pages.length - 1}
              className="reader-nav-btn"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        )}

        {settings.backToTop && showBackToTop && settings.style === "strip" && (
          <button onClick={scrollToTop} className="back-to-top-btn" title="Back to top">
            <ArrowUp size={20} />
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="settings-row">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Toggle({ options, value, onChange }) {
  return (
    <div className="segmented-control">
      {options.map(([v, text]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`segmented-btn ${value === v ? "active" : ""}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}