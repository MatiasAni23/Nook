import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { X, Bell, AlertTriangle, MessageCircle, Calendar, Info } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { type Notification, notifications as initialNotifications } from "../../data/mockData";
import { getDetailNavigationState } from "../mapa/navigationState";

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'issue_report':
      case 'favorite_issue':
        return <AlertTriangle className="size-5 text-orange-500" />;
      case 'reservation_confirmed':
        return <Calendar className="size-5 text-green-500" />;
      case 'new_message':
        return <MessageCircle className="size-5 text-blue-500" />;
      case 'place_update':
        return <Info className="size-5 text-purple-500" />;
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    setNotifications(notifications.map(n =>
      n.id === notification.id ? { ...n, read: true } : n
    ));

    // Navigate if there's a place
    if (notification.placeId) {
      const isWorkplace = notification.placeId.startsWith('w');
      navigate(
        isWorkplace ? `/app/workplace/${notification.placeId}` : `/app/place/${notification.placeId}`,
        { state: getDetailNavigationState(location.pathname) },
      );
      onClose();
    } else if (notification.type === 'new_message') {
      navigate('/app/chat');
      onClose();
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-4 px-4">
      <Card className="w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex-none border-b p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Bell className="size-5 text-[#4F46E5]" />
              <h2 className="text-xl font-semibold">Notificaciones</h2>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="size-5" />
            </button>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-[#4F46E5] hover:underline"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <Bell className="size-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No tienes notificaciones</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-sm">
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <div className="size-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {notification.message}
                      </p>
                      {notification.placeName && (
                        <p className="text-xs text-gray-500 mb-1">
                          📍 {notification.placeName}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {getTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
