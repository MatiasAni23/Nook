import { useCallback, useEffect, useRef, useState } from "react";

/** Show the memory snapshot on return; refresh expired data without hiding it. */
export function useDelegateData<T>(load: (options?: { forceRefresh?: boolean }) => Promise<T>, getCached: () => T | null) {
  const [data, setData] = useState<T | null>(getCached);
  const [loading, setLoading] = useState(() => getCached() === null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const mounted = useRef(false);
  const read = useCallback(async (forceRefresh = false) => {
    const version = ++generation.current;
    setUpdating(true); setError("");
    try {
      const next = await load({ forceRefresh });
      if (mounted.current && version === generation.current) setData(next);
    } catch (cause) {
      if (mounted.current && version === generation.current) setError(cause instanceof Error ? cause.message : "No pudimos cargar los datos.");
    } finally {
      if (mounted.current && version === generation.current) { setLoading(false); setUpdating(false); }
    }
  }, [load]);
  useEffect(() => {
    mounted.current = true;
    const cached = getCached(); setData(cached); setLoading(cached === null);
    void read();
    return () => { mounted.current = false; generation.current += 1; };
  }, [read, getCached]);
  const refresh = useCallback(() => read(true), [read]);
  return { data, setData, loading, updating, error, refresh };
}
