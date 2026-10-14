import { supabase } from "../lib/supabase";

export type ReservationConnection = "connecting" | "connected" | "disconnected";
type Listener = { change: () => void; connection: (status: ReservationConnection) => void };
type Channel = ReturnType<NonNullable<typeof supabase>["channel"]>;
const subscriptions = new Map<string, { channel: Channel; listeners: Set<Listener>; state: ReservationConnection }>();
const removals = new Map<string, Promise<unknown>>();

/** Share one private channel per account; never attach to a channel still being removed. */
export function subscribeToReservationChanges(onChange: () => void, onConnection: (status: ReservationConnection) => void) {
  const client = supabase;
  if (!client) { onConnection("disconnected"); return () => undefined; }
  let active = true;
  let leave: (() => void) | null = null;
  const listener: Listener = {
    change: () => { if (active) onChange(); },
    connection: (status) => { if (active) onConnection(status); },
  };
  onConnection("connecting");
  void client.auth.getUser().then(async ({ data, error }) => {
    if (!active) return;
    if (error || !data.user) { onConnection("disconnected"); return; }
    const topic = `reservations:user:${data.user.id}`;
    await removals.get(topic);
    if (!active) return;
    let entry = subscriptions.get(topic);
    let created = false;
    if (!entry) {
      entry = { channel: client.channel(topic, { config: { private: true } }), listeners: new Set(), state: "connecting" };
      subscriptions.set(topic, entry); created = true;
    }
    const current = entry;
    current.listeners.add(listener);
    leave = () => {
      current.listeners.delete(listener);
      if (current.listeners.size || subscriptions.get(topic) !== current) return;
      subscriptions.delete(topic);
      const removal = client.removeChannel(current.channel).catch(() => undefined);
      removals.set(topic, removal);
      void removal.finally(() => { if (removals.get(topic) === removal) removals.delete(topic); });
    };
    if (!created) {
      listener.connection(current.state);
      if (current.state === "connected") listener.change();
      return;
    }
    current.channel.on("broadcast", { event: "reservations_changed" }, ({ payload }: { payload: { changed?: boolean } }) => {
      if (payload?.changed === true) current.listeners.forEach((subscriber) => subscriber.change());
    });
    current.channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        current.state = "connected";
        current.listeners.forEach((subscriber) => { subscriber.connection("connected"); subscriber.change(); });
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        current.state = "disconnected";
        current.listeners.forEach((subscriber) => subscriber.connection("disconnected"));
      }
    });
  }).catch(() => { if (active) onConnection("disconnected"); });
  return () => { active = false; leave?.(); };
}

/** Coalesce bursts and discard reads superseded by another refresh or a confirmed mutation. */
export function createReservationRefreshController<T>(options: {
  load: () => Promise<T>;
  onData: (data: T) => void;
  onError: (error: unknown) => void;
  onUpdating: (value: boolean) => void;
}) {
  let disposed = false;
  let revision = 0;
  let requested = false;
  let running: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let value: T | undefined;
  function refresh(): Promise<void> {
    if (disposed) return Promise.resolve();
    if (timer) { clearTimeout(timer); timer = null; }
    revision += 1; requested = true;
    if (running) return running;
    options.onUpdating(true);
    running = (async () => {
      while (requested && !disposed) {
        requested = false;
        const readRevision = revision;
        try {
          const next = await options.load();
          if (!disposed && readRevision === revision) { value = next; options.onData(next); }
        } catch (error) {
          if (!disposed && readRevision === revision) options.onError(error);
        }
      }
    })().finally(() => { running = null; if (!disposed) options.onUpdating(false); });
    return running;
  }
  return {
    refresh,
    schedule() {
      if (disposed || timer) return;
      // Invalidate an older response immediately, even while the burst is being grouped.
      revision += 1;
      timer = setTimeout(() => { timer = null; void refresh(); }, 200);
    },
    update(change: (previous: T) => T) {
      if (disposed) return;
      revision += 1;
      if (value !== undefined) { value = change(value); options.onData(value); }
      if (running) requested = true;
    },
    dispose() { disposed = true; revision += 1; if (timer) clearTimeout(timer); },
  };
}
