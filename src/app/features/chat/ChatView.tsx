import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Building2, CheckCheck, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { isSupabaseConfigured } from "../../lib/supabase";
import { useCurrentUser } from "../../context/CurrentUserContext";
import {
  type ChatMessage,
  type ChatUser,
  createTypingChannel,
  getConversationId,
  getCachedChatMessagesForUser,
  getChatMessagesBetweenUsers,
  getChatMessagesForUser,
  getChatUsersByIds,
  markChatMessagesAsRead,
  sendChatMessage,
  sendTypingEvent,
  subscribeToChatMessages,
} from "../../services/chatService";

type ConversationMap = Record<string, ChatMessage[]>;

function ConversationListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`conversation-skeleton-${index}`} className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-14" />
                </div>
                <Skeleton className="h-3 w-44" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChatThreadSkeleton() {
  return (
    <div className={`flex flex-col overflow-hidden bg-white ${userRole === "delegate" || userRole === "admin" ? "size-full" : "h-dvh max-h-dvh"}`}>
      <div className="border-b px-4 py-3 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-md" />
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="size-3 rounded-full" />
        </div>
      </div>
      <div className="flex-1 space-y-4 overflow-auto bg-gray-50 p-4">
        <Skeleton className="h-10 w-2/3 rounded-lg" />
        <Skeleton className="ml-auto h-14 w-3/4 rounded-lg" />
        <Skeleton className="h-12 w-1/2 rounded-lg" />
        <Skeleton className="ml-auto h-10 w-2/3 rounded-lg" />
      </div>
      <div className="border-t bg-white p-4 pb-20">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-md" />
          <Skeleton className="size-10 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-0.5" aria-label="Escribiendo">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          className="size-2 rounded-full bg-gray-400 animate-bounce"
          style={{ animationDelay: `${dot * 120}ms` }}
        />
      ))}
    </div>
  );
}

function getChatInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MessageStatus({ message }: { message: ChatMessage }) {
  return (
    <span className={`inline-flex items-center gap-1 ${message.read ? "text-sky-200" : "text-purple-100"}`}>
      <CheckCheck className="size-3.5" />
      {message.read ? "Visto" : "Entregado"}
    </span>
  );
}

const getUserRole = (): "student" | "worker" | "admin" | "delegate" | "support" => {
  return (window as any).__userRole || "student";
};

export function ChatView() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentUser: cachedUser, onlineUserIds } = useCurrentUser();
  const fallbackRole = getUserRole();
  const userRole = cachedUser?.role ?? fallbackRole;
  const currentUserId = cachedUser?.id ?? "";
  const chatBasePath = userRole === "admin" ? "/admin/chat" : userRole === "delegate" ? "/delegate/chat" : "/app/chat";

  const [participants, setParticipants] = useState<Record<string, ChatUser>>({});
  const [conversations, setConversations] = useState<ConversationMap>({});
  const [messageText, setMessageText] = useState("");
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingChannelRef = useRef<ReturnType<typeof createTypingChannel> | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingListTimeoutsRef = useRef<Record<string, number>>({});
  const typingLastSentRef = useRef(0);

  const activePerson = userId ? participants[userId] : null;
  const activeChat = userId ? conversations[userId] : null;
  const isActivePersonOnline = Boolean(activePerson && onlineUserIds.has(activePerson.id));

  const subtitle = useMemo(() => {
    if (!activePerson) return "";
    if (activePerson.role === "student") {
      return activePerson.profile?.career ?? "Estudiante";
    }

    if (activePerson.profile?.is_independent) {
      return activePerson.profile?.industry
        ? `Independiente • ${activePerson.profile.industry}`
        : "Independiente";
    }

    return activePerson.profile?.company ?? "Empresa";
  }, [activePerson]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTypingEvent = (event: { from: string; isTyping: boolean }) => {
    if (!userId || event.from !== userId) return;

    setIsOtherTyping(event.isTyping);

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    if (event.isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        setIsOtherTyping(false);
      }, 3000);
    }
  };

  const upsertConversationMessage = (message: ChatMessage) => {
    const otherUserId = message.senderId === currentUserId ? message.receiverId : message.senderId;

    setConversations((prev) => {
      const existing = prev[otherUserId] ?? [];
      if (existing.some((item) => item.id === message.id)) {
        return {
          ...prev,
          [otherUserId]: existing.map((item) => (item.id === message.id ? message : item)),
        };
      }
      return {
        ...prev,
        [otherUserId]: [...existing, message].sort(
          (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
        ),
      };
    });

    if (!participants[otherUserId]) {
      getChatUsersByIds([otherUserId])
        .then((users) => {
          if (users.length === 0) return;
          setParticipants((prev) => ({ ...prev, [otherUserId]: users[0] }));
        })
        .catch(() => undefined);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId) return;

    const cachedMessages = getCachedChatMessagesForUser(currentUserId);
    if (cachedMessages) {
      const grouped: ConversationMap = {};
      cachedMessages.forEach((message) => {
        const otherUserId =
          message.senderId === currentUserId ? message.receiverId : message.senderId;
        if (!grouped[otherUserId]) grouped[otherUserId] = [];
        grouped[otherUserId].push(message);
      });

      setConversations(grouped);

      const participantIds = Array.from(new Set(Object.keys(grouped)));
      if (userId && !participantIds.includes(userId)) {
        participantIds.push(userId);
      }

      getChatUsersByIds(participantIds)
        .then((users) => {
          const nextParticipants = users.reduce<Record<string, ChatUser>>((acc, user) => {
            acc[user.id] = user;
            return acc;
          }, {});
          setParticipants(nextParticipants);
        })
        .catch(() => undefined);
    }

    setIsLoadingConversations(!cachedMessages);
    setChatError("");

    getChatMessagesForUser(currentUserId)
      .then((messages) => {
        const grouped: ConversationMap = {};
        messages.forEach((message) => {
          const otherUserId =
            message.senderId === currentUserId ? message.receiverId : message.senderId;
          if (!grouped[otherUserId]) grouped[otherUserId] = [];
          grouped[otherUserId].push(message);
        });

        Object.values(grouped).forEach((conversation) =>
          conversation.sort(
            (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
          ),
        );

        setConversations(grouped);

        const participantIds = Array.from(new Set(Object.keys(grouped)));
        if (userId && !participantIds.includes(userId)) {
          participantIds.push(userId);
        }

        return getChatUsersByIds(participantIds);
      })
      .then((users) => {
        if (!users) return;
        const nextParticipants = users.reduce<Record<string, ChatUser>>((acc, user) => {
          acc[user.id] = user;
          return acc;
        }, {});
        setParticipants(nextParticipants);
      })
      .catch((error) => {
        setChatError(
          error instanceof Error ? error.message : "No se pudieron cargar los mensajes.",
        );
      })
      .finally(() => setIsLoadingConversations(false));
  }, [currentUserId, userId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId) return;

    const unsubscribe = subscribeToChatMessages(currentUserId, upsertConversationMessage);

    return () => {
      unsubscribe();
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId || !userId) return;

    const conversationId = getConversationId(currentUserId, userId);
    const channel = createTypingChannel(conversationId, handleTypingEvent);
    typingChannelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      if (typingChannelRef.current) {
        typingChannelRef.current.unsubscribe();
      }
      typingChannelRef.current = null;
      setIsOtherTyping(false);
    };
  }, [currentUserId, userId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUserId || userId) return;

    const participantIds = Object.keys(participants);
    const channels = participantIds.map((participantId) => {
      const conversationId = getConversationId(currentUserId, participantId);
      return createTypingChannel(conversationId, (event) => {
        if (event.from !== participantId) return;

        setTypingUsers((prev) => ({ ...prev, [participantId]: event.isTyping }));

        if (typingListTimeoutsRef.current[participantId]) {
          window.clearTimeout(typingListTimeoutsRef.current[participantId]);
        }

        if (event.isTyping) {
          typingListTimeoutsRef.current[participantId] = window.setTimeout(() => {
            setTypingUsers((prev) => ({ ...prev, [participantId]: false }));
          }, 3000);
        }
      });
    });

    return () => {
      Object.values(typingListTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      typingListTimeoutsRef.current = {};
      channels.forEach((channel) => channel?.unsubscribe());
      setTypingUsers({});
    };
  }, [currentUserId, Object.keys(participants).join("|"), userId]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured || !currentUserId) return;
    if (conversations[userId]?.length) return;

    getChatMessagesBetweenUsers(currentUserId, userId)
      .then((messages) => {
        if (messages.length === 0) return;
        setConversations((prev) => ({
          ...prev,
          [userId]: messages,
        }));
      })
      .catch(() => undefined);
  }, [conversations, currentUserId, userId]);

  useEffect(() => {
    if (!activeChat) return;
    scrollToBottom();
  }, [activeChat?.length]);

  useEffect(() => {
    if (!userId || !currentUserId || !activeChat?.some((message) => (
      message.senderId === userId && message.receiverId === currentUserId && !message.read
    ))) {
      return;
    }

    markChatMessagesAsRead({ currentUserId, otherUserId: userId })
      .then((messages) => {
        if (messages.length === 0) return;
        setConversations((prev) => {
          const existing = prev[userId] ?? [];
          return {
            ...prev,
            [userId]: existing.map((message) => {
              const nextMessage = messages.find((item) => item.id === message.id);
              return nextMessage ?? message;
            }),
          };
        });
      })
      .catch(() => undefined);
  }, [activeChat, currentUserId, userId]);

  const sendTypingStatus = (isTyping: boolean) => {
    if (!userId || !currentUserId) return;
    sendTypingEvent(typingChannelRef.current, { from: currentUserId, isTyping });
  };

  const handleMessageChange = (value: string) => {
    setMessageText(value);

    const now = Date.now();
    if (value.trim().length === 0) {
      sendTypingStatus(false);
      return;
    }

    if (now - typingLastSentRef.current > 1200) {
      typingLastSentRef.current = now;
      sendTypingStatus(true);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !userId || !currentUserId) return;

    setIsSending(true);
    setChatError("");

    try {
      const message = await sendChatMessage({
        senderId: currentUserId,
        receiverId: userId,
        message: messageText.trim(),
      });

      upsertConversationMessage(message);
      sendTypingStatus(false);
      setMessageText("");
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "No se pudo enviar el mensaje.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Configura Supabase para habilitar el chat en tiempo real.
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Inicia sesión para ver tus conversaciones.
      </div>
    );
  }

  // Conversation list view
  if (!userId) {
    const conversationList = Object.entries(conversations)
      .map(([id, messages]) => {
        const person = participants[id];
        const lastMessage = messages[messages.length - 1];
        return { person, lastMessage, id };
      })
      .filter((item) => item.person && item.lastMessage)
      .filter((item) => {
        if (userRole === "admin") return item.person?.role === "delegate";
        if (userRole === "delegate") return item.person?.role === "admin" || item.person?.role === "worker";
        return true;
      })
      .sort((left, right) =>
        right.lastMessage!.createdAt.getTime() - left.lastMessage!.createdAt.getTime(),
      );

    return (
      <div className="size-full flex flex-col bg-gray-50">
        <div className="flex-none p-4 pb-2">
          <h2 className="text-2xl">Mensajes</h2>
        </div>
        <div className="flex-1 overflow-auto px-4 pb-20">
          {chatError && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {chatError}
            </div>
          )}
          <div className="space-y-3">
            {isLoadingConversations ? (
              <ConversationListSkeleton />
            ) : conversationList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <p>{userRole === "admin" || userRole === "delegate" ? "No hay chats activos" : "No tienes conversaciones aun"}</p>
                  {userRole !== "admin" && userRole !== "delegate" && (
                    <Button
                      className="mt-4"
                      onClick={() => navigate(userRole === "worker" ? "/app/discover" : "/app/students")}
                    >
                      {userRole === "worker" ? "Buscar espacios" : "Buscar estudiantes"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              conversationList.map(({ person, lastMessage, id }) => {
                if (!person || !lastMessage) return null;

                const isOnline = onlineUserIds.has(person.id);
                const isUnread = lastMessage.receiverId === currentUserId && !lastMessage.read;
                const isTyping = Boolean(typingUsers[id]);
                const unreadCount = conversations[id].filter(
                  (message) => message.receiverId === currentUserId && !message.read,
                ).length;

                return (
                  <Card
                    key={id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      isUnread ? "border-[#4F46E5]/30 bg-white shadow-sm" : "bg-white"
                    }`}
                    onClick={() => navigate(`${chatBasePath}/${id}`)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <Avatar className="size-12">
                            {person.profile?.profile_image_url && (
                              <AvatarImage
                                src={person.profile.profile_image_url}
                                alt={person.name}
                              />
                            )}
                            <AvatarFallback className="bg-[#4F46E5] text-white">
                              {person.role === "worker" ? (
                                <Building2 className="size-6" />
                              ) : (
                                getChatInitials(person.name)
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white ${
                              isOnline ? "bg-green-500" : "bg-gray-300"
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className={`truncate ${isUnread ? "font-bold" : "font-semibold"}`}>
                              {person.name}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={`shrink-0 text-xs ${
                                isOnline
                                  ? "bg-green-50 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {isOnline ? "En linea" : "Desconectado"}
                            </Badge>
                          </div>
                          <p className="truncate text-sm text-gray-600">
                            {person.role === "student"
                              ? person.profile?.career ?? "Estudiante"
                              : person.profile?.company ?? "Empresa"}
                          </p>
                          <div className="mt-1 flex items-center justify-between gap-3">
                            <p
                              className={`truncate text-sm ${
                                isTyping
                                  ? "font-semibold text-[#4F46E5]"
                                  : isUnread
                                    ? "font-bold text-gray-900"
                                    : "text-gray-500"
                              }`}
                            >
                              {isTyping ? "Escribiendo..." : lastMessage.text}
                            </p>
                            {unreadCount > 0 && (
                              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#4F46E5] text-xs font-bold text-white">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <p className={`mt-1 text-xs ${isUnread ? "font-semibold text-[#4F46E5]" : "text-gray-400"}`}>
                            {lastMessage.createdAt.toLocaleTimeString("es", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!activePerson && !isLoadingConversations) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(chatBasePath)}> 
          <ArrowLeft className="size-4 mr-2" />
          Volver
        </Button>
        <p className="mt-4">Usuario no encontrado</p>
      </div>
    );
  }

  if (!activePerson) {
    return <ChatThreadSkeleton />;
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[34rem] flex-col bg-white">
      {/* Chat Header */}
      <div className="border-b px-4 py-3 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(chatBasePath)}> 
            <ArrowLeft className="size-4" />
          </Button>

          <Avatar className="size-10">
            {activePerson.profile?.profile_image_url && (
              <AvatarImage src={activePerson.profile.profile_image_url} alt={activePerson.name} />
            )}
            <AvatarFallback className="bg-[#4F46E5] text-white">
              {activePerson.role === "worker" ? (
                <Building2 className="size-5" />
              ) : (
                activePerson.name.split(" ").map((n) => n[0]).join("")
              )}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h3 className="font-semibold">{activePerson.name}</h3>
            <p className="text-xs text-gray-600">
              {isOtherTyping ? "Escribiendo..." : `${subtitle} - ${isActivePersonOnline ? "En linea" : "Desconectado"}`}
            </p>
          </div>

          <div
            className={`size-3 rounded-full ${
              isActivePersonOnline ? "bg-green-500" : "bg-gray-300"
            }`}
          />
        </div>
      </div>

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-hidden space-y-4 bg-gray-50 p-4">
        {!activeChat || activeChat.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              Inicia la conversacion con {activePerson.name}
            </p>
          </div>
        ) : (
          <>
            {activeChat.map((message) => {
              const isOwn = message.senderId === currentUserId;

              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-4 py-2 ${
                      isOwn
                        ? "bg-[#4F46E5] text-white"
                        : "bg-white border shadow-sm"
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p
                      className={`mt-1 flex items-center justify-end gap-2 text-xs ${
                        isOwn ? "text-purple-100" : "text-gray-500"
                      }`}
                    >
                      <span>
                        {message.createdAt.toLocaleTimeString("es", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isOwn && <MessageStatus message={message} />}
                    </p>
                  </div>
                </div>
              );
            })}
            {isOtherTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="shrink-0 border-t bg-white p-4 pb-20">
        {chatError && (
          <div className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {chatError}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Escribe un mensaje..."
            value={messageText}
            onChange={(e) => handleMessageChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            onBlur={() => sendTypingStatus(false)}
          />
          <Button onClick={sendMessage} disabled={!messageText.trim() || isSending}>
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
