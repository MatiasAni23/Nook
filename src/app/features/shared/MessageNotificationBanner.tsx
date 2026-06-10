import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { MessageCircle, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { isSupabaseConfigured } from "../../lib/supabase";
import { useCurrentUser } from "../../context/CurrentUserContext";
import {
  type ChatMessage,
  type ChatUser,
  getChatUsersByIds,
  subscribeToChatMessages,
} from "../../services/chatService";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function MessageNotificationBanner() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useCurrentUser();
  const currentPathRef = useRef(location.pathname);
  const lastNotifiedMessageIdRef = useRef<string | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const [notification, setNotification] = useState<{
    message: ChatMessage;
    sender: ChatUser | null;
  } | null>(null);

  useEffect(() => {
    currentPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser?.id) return;

    const unsubscribe = subscribeToChatMessages(currentUser.id, (message) => {
      if (message.receiverId !== currentUser.id || message.read) return;
      if (message.id === lastNotifiedMessageIdRef.current) return;

      const activeConversationPath = `/app/chat/${message.senderId}`;
      if (currentPathRef.current === activeConversationPath) return;

      lastNotifiedMessageIdRef.current = message.id;

      getChatUsersByIds([message.senderId])
        .then((users) => {
          setNotification({
            message,
            sender: users[0] ?? null,
          });

          if (hideTimeoutRef.current) {
            window.clearTimeout(hideTimeoutRef.current);
          }

          hideTimeoutRef.current = window.setTimeout(() => {
            setNotification((current) => (current?.message.id === message.id ? null : current));
          }, 6000);
        })
        .catch(() => {
          setNotification({ message, sender: null });
        });
    });

    return () => {
      unsubscribe();
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [currentUser?.id]);

  if (!notification) return null;

  const senderName = notification.sender?.name ?? "Nuevo mensaje";

  return (
    <div className="fixed left-3 right-3 top-3 z-[60]">
      <div className="flex w-full items-center gap-3 rounded-xl border border-purple-100 bg-white/95 p-3 text-left shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => {
            setNotification(null);
            navigate(`/app/chat/${notification.message.senderId}`);
          }}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition-transform active:scale-[0.99]"
        >
          <Avatar className="size-10 shrink-0">
            {notification.sender?.profile?.profile_image_url && (
              <AvatarImage src={notification.sender.profile.profile_image_url} alt={senderName} />
            )}
            <AvatarFallback className="bg-[#4F46E5] text-white">
              {notification.sender ? getInitials(senderName) : <MessageCircle className="size-5" />}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 shrink-0 text-[#4F46E5]" />
              <p className="truncate text-sm font-semibold text-gray-900">{senderName}</p>
            </div>
            <p className="mt-0.5 truncate text-sm text-gray-600">{notification.message.text}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setNotification(null);
          }}
          className="grid size-8 shrink-0 place-items-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Cerrar notificacion"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
