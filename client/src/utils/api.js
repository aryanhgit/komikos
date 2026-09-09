const BASE = "/api/manga";

export async function getMyManga() {
  const res = await fetch(`${BASE}/mine`);
  if (!res.ok) throw new Error("Failed to load manga list");
  return res.json();
}

export async function getMangaDetail(id) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to load manga detail");
  return res.json();
}

export async function addManga(query) {
  const res = await fetch(`${BASE}/mine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Failed to add manga");
  return res.json();
}

export async function refreshManga(id) {
  const res = await fetch(`${BASE}/${id}/refresh`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to refresh manga");
  return res.json();
}

export async function removeManga(id) {
  const res = await fetch(`${BASE}/mine/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to remove manga");
}