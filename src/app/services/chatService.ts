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
  read: boolean;
  readAt: Date | null;
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
  read: boolean;
  read_at: string | null;
}

const chatUserCache = new Map<string, ChatUser>();
const CHAT_MESSAGES_CACHE_TTL_MS = 2 * 60 * 1000;
const chatMessagesCache = new Map<string, { timestamp: number; messages: ChatMessage[] }>();
const chatMessagesRequests = new Map<string, Promise<ChatMessage[]>>();
let chatSubscriptionId = 0;

export function clearChatServiceCaches() {
  chatUserCache.clear();
  chatMessagesCache.clear();
  chatMessagesRequests.clear();
}

function mapChatMessage(row: ChatMessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    text: row.message,
    createdAt: new Date(row.created_at),
    read: Boolean(row.read),
    readAt: row.read_at ? new Date(row.read_at) : null,
  };
}

function mapChatUser(row: {
  id: string;
  name: string | null;
  role: string | null;
  avatar_url?: string | null;
  user_profiles?: ChatUserProfile[] | ChatUserProfile | null;
}): ChatUser {
  const profileValue = Array.isArray(row.user_profiles)
    ? row.user_profiles[0]
    : row.user_profiles;
  const profileImageUrl = profileValue?.profile_image_url ?? row.avatar_url ?? null;

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
          profile_image_url: profileImageUrl,
        }
      : profileImageUrl
        ? { profile_image_url: profileImageUrl }
        : null,
  };
}

export async function getChatUsersByIds(ids: string[]): Promise<ChatUser[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  if (ids.length === 0) return [];

  const uniqueIds = Array.from(new Set(ids));
  const cachedUsers = uniqueIds
    .map((id) => chatUserCache.get(id))
    .filter((user): user is ChatUser => Boolean(user));
  const missingIds = uniqueIds.filter((id) => !chatUserCache.has(id));

  if (missingIds.length === 0) return cachedUsers;

  const { data, error } = await supabase
    .from("users")
    .select(
      `id,
       name,
       role,
       avatar_url,
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
    .in("id", missingIds)
    .order("name", { ascending: true });

  if (error) throw error;

  const fetchedUsers = (data ?? []).map((row) => mapChatUser(row as typeof data[number]));
  fetchedUsers.forEach((user) => chatUserCache.set(user.id, user));

  return uniqueIds
    .map((id) => chatUserCache.get(id))
    .filter((user): user is ChatUser => Boolean(user));
}

export async function getChatMessagesForUser(userId: string): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const cachedMessages = chatMessagesCache.get(userId);
  if (cachedMessages && Date.now() - cachedMessages.timestamp < CHAT_MESSAGES_CACHE_TTL_MS) {
    return cachedMessages.messages;
  }

  const existingRequest = chatMessagesRequests.get(userId);
  if (existingRequest) return existingRequest;

  const request = supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, created_at, read, read_at")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: true })
    .then(({ data, error }) => {
      if (error) throw error;

      const messages = (data ?? []).map((row) => mapChatMessage(row as ChatMessageRow));
      chatMessagesCache.set(userId, { timestamp: Date.now(), messages });
      return messages;
    })
    .finally(() => {
      chatMessagesRequests.delete(userId);
    });

  chatMessagesRequests.set(userId, request);
  return request;
}

export async function getChatMessagesBetweenUsers(
  userId: string,
  otherUserId: string,
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, created_at, read, read_at")
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
    .select("id, sender_id, receiver_id, message, created_at, read, read_at")
    .single();

  if (error || !data) throw error ?? new Error("No se pudo enviar el mensaje.");

  const message = mapChatMessage(data as ChatMessageRow);
  upsertCachedChatMessage(input.senderId, message);
  upsertCachedChatMessage(input.receiverId, message);
  return message;
}

export async function markChatMessagesAsRead(input: {
  currentUserId: string;
  otherUserId: string;
}): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from("messages")
    .update({
      read: true,
      read_at: new Date().toISOString(),
    })
    .eq("sender_id", input.otherUserId)
    .eq("receiver_id", input.currentUserId)
    .eq("read", false)
    .select("id, sender_id, receiver_id, message, created_at, read, read_at");

  if (error) throw error;

  const messages = (data ?? []).map((row) => mapChatMessage(row as ChatMessageRow));
  messages.forEach((message) => upsertCachedChatMessage(input.currentUserId, message));
  return messages;
}

export function getCachedChatMessagesForUser(userId?: string) {
  if (!userId) return null;
  return chatMessagesCache.get(userId)?.messages ?? null;
}

export function upsertCachedChatMessage(userId: string, message: ChatMessage) {
  const cachedMessages = chatMessagesCache.get(userId)?.messages ?? [];
  const nextMessages = cachedMessages.some((item) => item.id === message.id)
    ? cachedMessages.map((item) => (item.id === message.id ? message : item))
    : [...cachedMessages, message];

  nextMessages.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  chatMessagesCache.set(userId, { timestamp: Date.now(), messages: nextMessages });
}

export function subscribeToChatMessages(
  userId: string,
  onMessage: (message: ChatMessage) => void,
) {
  if (!isSupabaseConfigured || !supabase) return () => undefined;

  chatSubscriptionId += 1;
  const channel = supabase.channel(`messages-${userId}-${chatSubscriptionId}`);

  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      if (!payload.new) return;
      const message = mapChatMessage(payload.new as ChatMessageRow);
      if (message.senderId !== userId && message.receiverId !== userId) return;
      upsertCachedChatMessage(userId, message);
      onMessage(message);
    },
  );

  channel.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "messages" },
    (payload) => {
      if (!payload.new) return;
      const message = mapChatMessage(payload.new as ChatMessageRow);
      if (message.senderId !== userId && message.receiverId !== userId) return;
      upsertCachedChatMessage(userId, message);
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
