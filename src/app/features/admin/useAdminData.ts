import { useEffect, useRef, useState } from "react";
import { ADMIN_DATA_TTL_MS } from "../../services/adminDataCache";
import { useCurrentUser } from "../../context/CurrentUserContext";

type DataSource<T> = {
  peek: () => T | null;
  load: (options?: { forceRefresh?: boolean }) => Promise<T>;
  remaining: () => number;
};

/** Render cached data immediately; refresh expired data without hiding it. */
export function useAdminData<T>(source: DataSource<T>, enabled = true) {
  const { currentUser } = useCurrentUser();
  const account = currentUser?.id ?? null;
  const [dataAccount, setDataAccount] = useState(account);
  const dataAccountRef = useRef(dataAccount);
  dataAccountRef.current = dataAccount;
  const [data, setData] = useState<T | null>(() =>
    enabled ? source.peek() : null,
  );
  const [isLoading, setIsLoading] = useState(enabled && source.peek() === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const sourceRef = useRef(source);
  const dataRef = useRef(data);
  dataRef.current = data;
  sourceRef.current = source;
  useEffect(() => {
    if (!enabled) return;
    if (dataAccount !== account) {
      setData(sourceRef.current.peek());
      setDataAccount(account);
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let running = false;
    const refresh = async (forceRefresh = false) => {
      if (running || cancelled) return;
      running = true;
      clearTimeout(timer);
      const cached = sourceRef.current.peek();
      if (cached !== null) setData(cached);
      const retained =
        dataAccountRef.current === account ? dataRef.current : null;
      setIsLoading(cached === null && retained === null);
      setIsRefreshing(
        (cached !== null || retained !== null) &&
          (forceRefresh || sourceRef.current.remaining() === 0),
      );
      setError("");
      try {
        const next = await sourceRef.current.load({ forceRefresh });
        if (!cancelled) setData(next);
      } catch {
        if (!cancelled)
          setError("No pudimos actualizar los datos. Inténtalo de nuevo.");
      } finally {
        running = false;
        if (!cancelled) {
          setIsLoading(false);
          setIsRefreshing(false);
          // Back off after failures and refresh only while this view is visible.
          timer = setTimeout(() => {
            if (document.visibilityState === "visible" && navigator.onLine)
              void refresh();
          }, sourceRef.current.remaining() || ADMIN_DATA_TTL_MS);
        }
      }
    };
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        navigator.onLine &&
        sourceRef.current.remaining() === 0
      ) {
        clearTimeout(timer);
        void refresh();
      }
    };
    void refresh(revision > 0);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [enabled, revision, account]);
  return {
    data: dataAccount === account ? data : null,
    isLoading: isLoading || dataAccount !== account,
    isRefreshing,
    error,
    refresh: () => setRevision((value) => value + 1),
  };
}
