import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { getSharedProfiles } from "./sharedProfileService";

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

const CHAT_MESSAGES_CACHE_TTL_MS = 2 * 60 * 1000;
const chatMessagesCache = new Map<string, { timestamp: number; messages: ChatMessage[] }>();
const chatMessagesRequests = new Map<string, Promise<ChatMessage[]>>();
const chatMessageRevisions = new Map<string, number>();
const chatFeeds = new Map<string, { channel: ReturnType<NonNullable<typeof supabase>['channel']>; listeners: Set<(message: ChatMessage) => void> }>();
let chatSubscriptionId = 0;
let chatCacheGeneration = 0;

export function clearChatServiceCaches() {
  chatCacheGeneration += 1;
  chatMessagesCache.clear();
  chatMessagesRequests.clear();
  chatMessageRevisions.clear();
  for (const feed of chatFeeds.values()) { feed.listeners.clear(); void supabase?.removeChannel(feed.channel); }
  chatFeeds.clear();
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

export async function getChatUsersByIds(ids: string[]): Promise<ChatUser[]> {
  return getSharedProfiles({ ids });
}

export async function getChatMessagesForUser(userId: string, options?: { forceRefresh?: boolean }): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const cachedMessages = chatMessagesCache.get(userId);
  if (!options?.forceRefresh && cachedMessages && Date.now() - cachedMessages.timestamp < CHAT_MESSAGES_CACHE_TTL_MS) {
    return cachedMessages.messages;
  }

  const existingRequest = chatMessagesRequests.get(userId);
  if (existingRequest) return existingRequest;

  const generation = chatCacheGeneration;
  const revision = chatMessageRevisions.get(userId) ?? 0;
  const request = Promise.resolve(supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, created_at, read, read_at")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: true }))
    .then(({ data, error }) => {
      if (error) throw error;

      if (generation !== chatCacheGeneration) return [];
      let messages = (data ?? []).map((row) => mapChatMessage(row as ChatMessageRow));
      // A slower snapshot must not erase messages/read receipts received live.
      if ((chatMessageRevisions.get(userId) ?? 0) !== revision) {
        const merged = new Map(messages.map(message => [message.id, message]));
        for (const message of chatMessagesCache.get(userId)?.messages ?? []) {
          const snapshot = merged.get(message.id);
          // Read acknowledgements only move forward, including another device's.
          if (!snapshot?.read || message.read) merged.set(message.id, message);
        }
        messages = [...merged.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }
      chatMessagesCache.set(userId, { timestamp: Date.now(), messages });
      return messages;
    })
    .finally(() => {
      if (chatMessagesRequests.get(userId) === request) chatMessagesRequests.delete(userId);
    });

  chatMessagesRequests.set(userId, request);
  return request;
}

export async function getChatMessagesBetweenUsers(
  userId: string,
  otherUserId: string,
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const generation = chatCacheGeneration;
  const { data, error } = await supabase
    .from("messages")
    .select("id, sender_id, receiver_id, message, created_at, read, read_at")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
    )
    .order("created_at", { ascending: true });

  if (error) throw error;

  return generation === chatCacheGeneration ? (data ?? []).map((row) => mapChatMessage(row as ChatMessageRow)) : [];
}

export async function sendChatMessage(input: {
  senderId: string;
  receiverId: string;
  message: string;
}): Promise<ChatMessage> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error("Supabase no esta configurado.");
  }

  const generation = chatCacheGeneration;
  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: input.senderId,
      receiver_id: input.receiverId,
      message: input.message,
    })
    .select("id, sender_id, receiver_id, message, created_at, read, read_at")
    .single();

  if (error?.message.includes("rate_limit_exceeded")) throw new Error("Has enviado muchos mensajes seguidos. Espera un minuto antes de continuar.");
  if (error || !data) throw error ?? new Error("No se pudo enviar el mensaje.");

  const message = mapChatMessage(data as ChatMessageRow);
  if (generation === chatCacheGeneration) upsertCachedChatMessage(input.senderId, message);
  return message;
}

export async function markChatMessagesAsRead(input: {
  currentUserId: string;
  otherUserId: string;
}): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const generation = chatCacheGeneration;
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

  if (generation !== chatCacheGeneration) return [];
  const messages = (data ?? []).map((row) => mapChatMessage(row as ChatMessageRow));
  if (messages.length) upsertCachedChatMessages(input.currentUserId, messages);
  return messages;
}

export function getCachedChatMessagesForUser(userId?: string) {
  if (!userId) return null;
  return chatMessagesCache.get(userId)?.messages ?? null;
}

export function upsertCachedChatMessage(userId: string, message: ChatMessage) {
  upsertCachedChatMessages(userId, [message]);
}

function upsertCachedChatMessages(userId: string, messages: ChatMessage[]) {
  chatMessageRevisions.set(userId, (chatMessageRevisions.get(userId) ?? 0) + 1);
  const cachedMessages = chatMessagesCache.get(userId)?.messages ?? [];
  const merged = new Map(cachedMessages.map(message => [message.id, message]));
  for (const message of messages) merged.set(message.id, message);
  const nextMessages = [...merged.values()];

  nextMessages.sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  chatMessagesCache.set(userId, { timestamp: Date.now(), messages: nextMessages });
}

export function subscribeToChatMessages(
  userId: string,
  onMessage: (message: ChatMessage) => void,
) {
  if (!isSupabaseConfigured || !supabase) return () => undefined;

  const existingFeed = chatFeeds.get(userId);
  if (existingFeed) {
    existingFeed.listeners.add(onMessage);
    return () => releaseChatFeed(userId, existingFeed, onMessage);
  }

  chatSubscriptionId += 1;
  const client = supabase;
  const generation = chatCacheGeneration;
  const channel = client.channel(`messages-${userId}-${chatSubscriptionId}`);
  const feed = { channel, listeners: new Set([onMessage]) };
  chatFeeds.set(userId, feed);

  channel.on(
    "postgres_changes",
    { event: "INSERT", schema: "public", table: "messages" },
    (payload) => {
      if (!payload.new || generation !== chatCacheGeneration) return;
      const message = mapChatMessage(payload.new as ChatMessageRow);
      if (message.senderId !== userId && message.receiverId !== userId) return;
      upsertCachedChatMessage(userId, message);
      for (const listener of feed.listeners) listener(message);
    },
  );

  channel.on(
    "postgres_changes",
    { event: "UPDATE", schema: "public", table: "messages" },
    (payload) => {
      if (!payload.new || generation !== chatCacheGeneration) return;
      const message = mapChatMessage(payload.new as ChatMessageRow);
      if (message.senderId !== userId && message.receiverId !== userId) return;
      upsertCachedChatMessage(userId, message);
      for (const listener of feed.listeners) listener(message);
    },
  );

  channel.subscribe();

  return () => {
    releaseChatFeed(userId, feed, onMessage);
  };
}

function releaseChatFeed(userId: string, feed: NonNullable<ReturnType<typeof chatFeeds.get>>, listener: (message: ChatMessage) => void) {
  feed.listeners.delete(listener);
  if (feed.listeners.size === 0 && chatFeeds.get(userId) === feed) {
    chatFeeds.delete(userId);
    void supabase?.removeChannel(feed.channel);
  }
}

export function removeTypingChannel(channel: ReturnType<typeof createTypingChannel>) {
  if (channel) void supabase?.removeChannel(channel);
}

export function getConversationId(userId: string, otherUserId: string) {
  return [userId, otherUserId].sort().join("-");
}

export function createTypingChannel(
  conversationId: string,
  onTyping: (event: TypingEvent) => void,
) {
  if (!isSupabaseConfigured || !supabase) return null;

  const client = supabase;
  const channel = client.channel(`typing-${conversationId}`, {
    config: {
      private: true,
      broadcast: { self: false },
    },
  });

  channel.on("broadcast", { event: "typing" }, (payload) => {
    const event: unknown = payload?.payload;
    if (!event || typeof event !== "object") return;
    const candidate = event as Record<string, unknown>;
    const participants = [conversationId.slice(0, 36), conversationId.slice(37)];
    if (typeof candidate.from !== "string" || typeof candidate.isTyping !== "boolean" || !participants.includes(candidate.from)) return;
    onTyping({ from: candidate.from, isTyping: candidate.isTyping });
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
