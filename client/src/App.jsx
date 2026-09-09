import MangaGrid from "./components/MangaGrid";
import { useState } from "react";
import "./theme.css";
import MangaDetail from "./components/MangaDetail";

export default function App() {
  const [selected, setSelected] = useState(null);

  return selected ? (
    <MangaDetail id={selected} onBack={() => setSelected(null)} />
  ) : (
    <MangaGrid onSelect={setSelected} />
  );
}