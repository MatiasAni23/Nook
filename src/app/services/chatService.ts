import { isSupabaseConfigured, supabase } from "../lib/supabase";

export interface ChatUserProfile {
  career?: string | null;
  subjects?: string[] | null;
  university?: string | null;
  company?: string | null;
  position?: string | null;
  industry?: string | null;
  is_independent?: boolean | null;
  bio?: string | null;
  profile_image_url?: string | null;
}

export interface ChatUser {
  id: string;
  name: string;
  role: "student" | "worker" | "admin" | "delegate" | "support";
  profile: ChatUserProfile | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: Date;
}

export interface TypingEvent {
  from: string;
  isTyping: boolean;
}

interface ChatMessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    text: row.message,
    createdAt: new Date(row.created_at),
  };
}

function mapChatUser(row: {
  id: string;
  name: string | null;
  role: string | null;
  user_profiles?: ChatUserProfile[] | ChatUserProfile | null;
}): ChatUser {
  const profileValue = Array.isArray(row.user_profiles)
    ? row.user_profiles[0]
    : row.user_profiles;

  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    role: (row.role ?? "student") as ChatUser["role"],
    profile: profileValue
      ? {
          career: profileValue.career ?? null,
          subjects: profileValue.subjects ?? null,
          university: profileValue.university ?? null,
          company: profileValue.company ?? null,
          position: profileValue.position ?? null,
          industry: profileValue.industry ?? null,
          is_independent: profileValue.is_independent ?? null,
          bio: profileValue.bio ?? null,
          profile_image_url: profileValue.profile_image_url ?? null,
        }
      : null,
  };
}

export async function getChatUsersByIds(ids: string[]): Promise<ChatUser[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("users")
    .select(
      `id,
       name,
       role,
       user_profiles(
         career,
         subjects,
         university,
         company,
         position,
         industry,
         is_independent,
         bio,
         profile_image_url
       )`,
    )
    .in("id", ids)
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => mapChatUser(row as typeof data[number]));
}

export async function getChatMessagesForUser(userId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, created_at")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => mapChatMessage(row as ChatMessageRow));
}

export async function getChatMessagesBetweenUsers(
  userId: string,
  otherUserId: string,
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, created_at")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => mapChatMessage(row as ChatMessageRow));
}

export async function sendChatMessage(input: {
  senderId: string;
  receiverId: string;
  message: string;
}): Promise<ChatMessage> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: input.senderId,
      receiver_id: input.receiverId,
      message: input.message,
    })
    .select("id, sender_id, receiver_id, message, created_at")
    .single();

  if (error || !data) throw error ?? new Error("No se pudo enviar el mensaje.");

  return mapChatMessage(data as ChatMessageRow);
}

export function subscribeToChatMessages(
  userId: string,
  onMessage: (message: ChatMessage) => void,
) {
  if (!isSupabaseConfigured || !supabase) return () => undefined;

  const channel = supabase.channel(`messages-${userId}`);

  channel.on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "messages",
    },
    (payload) => {
      if (!payload.new) return;
      const message = mapChatMessage(payload.new as ChatMessageRow);
      if (message.senderId !== userId && message.receiverId !== userId) return;
      onMessage(message);
    },
  );

  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function getConversationId(userId: string, otherUserId: string) {
  return [userId, otherUserId].sort().join("-");
}

export function createTypingChannel(
  conversationId: string,
  onTyping: (event: TypingEvent) => void,
) {
  if (!isSupabaseConfigured || !supabase) return null;

  const channel = supabase.channel(`typing-${conversationId}`, {
    config: {
      broadcast: { self: false },
    },
  });

  channel.on("broadcast", { event: "typing" }, (payload) => {
    if (!payload?.payload) return;
    onTyping(payload.payload as TypingEvent);
  });

  channel.subscribe();

  return channel;
}

export function sendTypingEvent(
  channel: { send: (payload: { type: "broadcast"; event: "typing"; payload: TypingEvent }) => void } | null,
  event: TypingEvent,
) {
  if (!channel) return;

  channel.send({
    type: "broadcast",
    event: "typing",
    payload: event,
  });
}
