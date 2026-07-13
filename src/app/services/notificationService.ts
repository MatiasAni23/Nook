import type { Notification, NotificationType } from "../data/mockData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export interface AppNotification extends Notification {
  actionPath?: string | null;
}

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  place_id: string | null;
  read: boolean;
  created_at: string;
  metadata: Record<string, unknown> | null;
  action_path: string | null;
};

const validNotificationTypes = new Set<NotificationType>([
  "issue_report",
  "favorite_issue",
  "reservation_confirmed",
  "new_message",
  "place_update",
  "review_response",
  "system",
]);

function requireSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  return supabase;
}

function getMetadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : undefined;
}

function toNotification(row: NotificationRow): AppNotification {
  const type = validNotificationTypes.has(row.type as NotificationType)
    ? (row.type as NotificationType)
    : "system";

  return {
    id: row.id,
    type,
    title: row.title,
    message: row.message,
    timestamp: new Date(row.created_at),
    read: Boolean(row.read),
    placeId: row.place_id ?? undefined,
    placeName: getMetadataText(row.metadata, "place_name"),
    actionPath: row.action_path,
  };
}

export async function listUserNotifications(): Promise<AppNotification[]> {
  const client = requireSupabase();
  const now = new Date().toISOString();

  const { data, error } = await client
    .from("notifications")
    .select("id, type, title, message, place_id, read, created_at, metadata, action_path")
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return ((data ?? []) as NotificationRow[]).map(toNotification);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const client = requireSupabase();
  const now = new Date().toISOString();

  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false)
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  if (error) throw error;

  return count ?? 0;
}

export async function markNotificationAsRead(notificationId: string) {
  const client = requireSupabase();

  const { error } = await client
    .from("notifications")
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllNotificationsAsRead() {
  const client = requireSupabase();

  const { error } = await client
    .from("notifications")
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq("read", false)
    .is("deleted_at", null);

  if (error) throw error;
}

export function subscribeToNotifications(userId: string, onChange: () => void) {
  if (!isSupabaseConfigured || !supabase) return () => undefined;

  const channel = supabase.channel(`notifications-${userId}-${crypto.randomUUID()}`);

  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
    () => onChange(),
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
