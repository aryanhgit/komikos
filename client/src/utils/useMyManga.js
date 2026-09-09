import { useEffect, useState, useCallback } from "react";
import { getMyManga } from "./api";

export function useMyManga() {
  const [manga, setManga] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setManga(await getMyManga());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { manga, loading, error, reload };
}