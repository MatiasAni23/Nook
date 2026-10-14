import { useCallback, useEffect, useRef, useState } from "react";
import { createReservationRefreshController, subscribeToReservationChanges, type ReservationConnection } from "../../services/reservationRealtimeService";

export function useReservationFeed<T>(load: () => Promise<T[]>, options: {
  getCached?: () => T[] | null; loadFresh?: () => Promise<T[]>; invalidate?: () => void;
} = {}) {
  const { getCached, loadFresh, invalidate } = options;
  const [rows, setRows] = useState<T[]>(() => getCached?.() ?? []);
  const [loading, setLoading] = useState(() => getCached?.() == null);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [connection, setConnection] = useState<ReservationConnection>("connecting");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const controllerRef = useRef<ReturnType<typeof createReservationRefreshController<T[]>> | null>(null);
  useEffect(() => {
    const cached = getCached?.() ?? null;
    setRows(cached ?? []); setLoading(cached == null); setError(""); setLastUpdated(cached ? new Date() : null);
    let initialRead = true;
    const controller = createReservationRefreshController<T[]>({
      load: () => { const read = initialRead ? load : loadFresh ?? load; initialRead = false; return read(); },
      onData: (next) => { setRows(next); setLoading(false); setError(""); setLastUpdated(new Date()); },
      onError: (cause) => { setLoading(false); setError(cause instanceof Error ? cause.message : "No pudimos actualizar las reservas."); },
      onUpdating: setUpdating,
    });
    controllerRef.current = controller;
    const onChange = () => { invalidate?.(); if (document.visibilityState !== "hidden") controller.schedule(); };
    const unsubscribe = subscribeToReservationChanges(onChange, setConnection);
    void controller.refresh();
    const onVisible = () => { if (document.visibilityState === "visible") controller.schedule(); };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.dispose(); controllerRef.current = null; unsubscribe();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, getCached, loadFresh, invalidate]);
  const refresh = useCallback(() => controllerRef.current?.refresh() ?? Promise.resolve(), []);
  const update = useCallback((change: (previous: T[]) => T[]) => controllerRef.current?.update(change), []);
  return { rows, loading, updating, error, connection, lastUpdated, refresh, update };
}
