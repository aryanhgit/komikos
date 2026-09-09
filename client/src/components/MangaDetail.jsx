import { useEffect, useState } from "react";
import { getMangaDetail } from "../utils/api";

export default function MangaDetail({ id, onBack }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    let active = true;
    getMangaDetail(id).then((d) => active && setDetail(d));
    return () => { active = false; };
  }, [id]);

  if (!detail) return <p className="text-neutral-400 text-sm p-6">Loading…</p>;

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
      <ul className="mt-6 divide-y divide-neutral-800">
        {detail.chapters.map((c) => (
          <li key={c.id} className="py-2 flex justify-between text-sm">
            <span>{c.title}</span>
            <span className="text-neutral-500">{c.date}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}