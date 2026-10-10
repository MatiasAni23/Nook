export const ADMIN_DATA_TTL_MS = 5 * 60 * 1000;

type RefreshOptions = { forceRefresh?: boolean };
const caches = new Set<{ clear: () => void }>();
let accountId: string | null = null;

/** Memory only; invalidated on account changes and confirmed mutations. */
export function createAdminDataCache<T>() {
  let snapshot: { value: T; timestamp: number } | null = null;
  let request: Promise<T> | null = null;
  let generation = 0;
  const cache = {
    peek: () => snapshot?.value ?? null,
    remaining: () =>
      snapshot
        ? Math.max(0, ADMIN_DATA_TTL_MS - (Date.now() - snapshot.timestamp))
        : 0,
    clear: () => {
      generation++;
      snapshot = null;
      request = null;
    },
    async read(loader: () => Promise<T>, options?: RefreshOptions): Promise<T> {
      if (!options?.forceRefresh && snapshot && cache.remaining() > 0)
        return snapshot.value;
      if (request) return request;
      const version = generation;
      const pending = loader()
        .then((value) => {
          if (version !== generation)
            throw new Error(
              "La sesión o los datos cambiaron durante la consulta.",
            );
          snapshot = { value, timestamp: Date.now() };
          return value;
        })
        .finally(() => {
          if (request === pending) request = null;
        });
      request = pending;
      return pending;
    },
  };
  caches.add(cache);
  return cache;
}

export function clearAdminDataCaches() {
  caches.forEach((cache) => cache.clear());
}

export function setAdminCacheAccount(nextAccountId: string | null) {
  if (accountId === nextAccountId) return;
  accountId = nextAccountId;
  clearAdminDataCaches();
}
