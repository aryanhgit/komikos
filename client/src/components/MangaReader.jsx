import { useEffect, useRef, useState } from "react";
import { ArrowUp, Settings, ChevronLeft, ChevronRight } from "lucide-react";
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
    return () => { active = false; };
  }, [mangaId, chapter.id, chapter.download_url]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() { setShowBackToTop(el.scrollTop > 400); }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [settings.style]);

  function update(key, value) { setSettings((s) => ({ ...s, [key]: value })); }
  function scrollToTop() { scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }
  function goNext() { setPageIndex((i) => Math.min(i + (settings.style === "double" ? 2 : 1), pages.length - 1)); }
  function goPrev() { setPageIndex((i) => Math.max(i - (settings.style === "double" ? 2 : 1), 0)); }

  const fitClass = settings.fit === "width" ? "w-full h-auto" : "h-full w-auto mx-auto";

  return (
    <div className="fixed inset-0 bg-black text-neutral-100 flex flex-col">
      <div className={`flex items-center justify-between px-4 py-3 bg-neutral-950 border-b border-neutral-800 ${settings.topNav === "sticky" ? "sticky top-0 z-20" : ""}`}>
        <button onClick={onClose} className="text-sm text-neutral-400">← Close</button>
        <span className="text-sm text-neutral-400">
          {settings.style !== "strip" && pages.length > 0 && `${pageIndex + 1} / ${pages.length}`}
        </span>
        <button onClick={() => setSettingsOpen((o) => !o)} className="text-neutral-400">
          <Settings size={18} />
        </button>
      </div>

      {settingsOpen && (
        <div className="absolute right-4 top-16 z-30 w-72 rounded-xl bg-neutral-900 border border-neutral-800 p-4 space-y-4 text-sm">
          <Row label="Top nav">
            <Toggle options={[["simple", "Simple"], ["sticky", "Sticky"]]} value={settings.topNav} onChange={(v) => update("topNav", v)} />
          </Row>
          <Row label="Gap between images">
            <input type="range" min="0" max="32" value={settings.gap} onChange={(e) => update("gap", Number(e.target.value))} className="w-28" />
          </Row>
          <Row label="Back to top button">
            <input type="checkbox" checked={settings.backToTop} onChange={(e) => update("backToTop", e.target.checked)} />
          </Row>
          <Row label="Reading direction">
            <Toggle options={[["ltr", "L → R"], ["rtl", "R → L"]]} value={settings.direction} onChange={(v) => update("direction", v)} />
          </Row>
          <Row label="Reading style">
            <Toggle options={[["strip", "Strip"], ["single", "Single"], ["double", "Double"]]} value={settings.style} onChange={(v) => { update("style", v); setPageIndex(0); }} />
          </Row>
          <Row label="Image fit">
            <Toggle options={[["width", "Width"], ["height", "Height"]]} value={settings.fit} onChange={(v) => update("fit", v)} />
          </Row>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto relative">
        {loading && <p className="text-neutral-400 text-sm p-6">Loading pages…</p>}
        {error && <p className="text-red-400 text-sm p-6">{error}</p>}

        {!loading && !error && settings.style === "strip" && (
          <div className="flex flex-col items-center" style={{ gap: settings.gap }}>
            {pages.map((url, i) => (
              <img key={i} src={url} alt={`Page ${i + 1}`} className={fitClass} />
            ))}
          </div>
        )}

        {!loading && !error && settings.style !== "strip" && pages.length > 0 && (
          <div className="h-full flex items-center justify-center">
            <button onClick={settings.direction === "ltr" ? goPrev : goNext} className="p-2 text-neutral-500">
              <ChevronLeft />
            </button>
            <div className="flex" style={{ gap: settings.gap }}>
              {settings.style === "single" ? (
                <img src={pages[pageIndex]} alt={`Page ${pageIndex + 1}`} className={fitClass} />
              ) : (
                (settings.direction === "ltr"
                  ? [pages[pageIndex], pages[pageIndex + 1]]
                  : [pages[pageIndex + 1], pages[pageIndex]]
                ).filter(Boolean).map((url, i) => <img key={i} src={url} alt="" className={fitClass} />)
              )}
            </div>
            <button onClick={settings.direction === "ltr" ? goNext : goPrev} className="p-2 text-neutral-500">
              <ChevronRight />
            </button>
          </div>
        )}

        {settings.backToTop && showBackToTop && settings.style === "strip" && (
          <button onClick={scrollToTop} className="fixed bottom-6 right-6 rounded-full bg-neutral-100 text-black p-3 shadow-lg z-20">
            <ArrowUp size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ options, value, onChange }) {
  return (
    <div className="flex gap-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-2 py-1 rounded-md text-xs ${value === v ? "bg-neutral-100 text-black" : "bg-neutral-800 text-neutral-300"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}