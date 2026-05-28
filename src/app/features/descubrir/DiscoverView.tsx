import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Star, MapPin, Bell, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { NotificationsPanel } from "../shared/NotificationsPanel";
import { studyPlaces, currentUser, placeIssues, notifications } from "../../data/mockData";
import { getCurrentUserProfile, getFirstName, getInitials } from "../../services/currentUserService";

export function DiscoverView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cowork');
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser.name);

  useEffect(() => {
    getCurrentUserProfile().then((user) => {
      if (user?.name) {
        setDisplayName(user.name);
      }
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const tabs = [
    { id: 'cowork', label: 'Cowork' },
    { id: 'estudios', label: 'Estudios' },
    { id: 'reuniones', label: 'Reuniones' },
    { id: 'parques', label: 'Parques' },
  ];

  const getPlaceImage = (id: string) => {
    const gradients = [
      'from-gray-400 to-gray-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-orange-400 to-orange-600',
      'from-indigo-400 to-indigo-600',
      'from-pink-400 to-pink-600',
      'from-cyan-400 to-cyan-600',
      'from-red-400 to-red-600',
    ];
    const index = parseInt(id) % gradients.length;
    return gradients[index];
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'library': return '📚';
      case 'cafe': return '☕';
      case 'coworking': return '💼';
      case 'park': return '🌳';
      default: return '📍';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'library': return 'Biblioteca';
      case 'cafe': return 'Café';
      case 'coworking': return 'Cowork';
      case 'park': return 'Parque';
      default: return 'Lugar';
    }
  };

  const calculateDistance = (lat: number, lng: number) => {
    const userLat = -33.4569;
    const userLng = -70.6483;
    const R = 6371;
    const dLat = (lat - userLat) * Math.PI / 180;
    const dLng = (lng - userLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-20">
        {/* Header */}
        <div className="px-4 pt-8 pb-4 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl text-[#4F46E5]" style={{ fontWeight: 800 }}>
              Nook
            </h1>
            <div className="flex items-center gap-3">
              <button
                className="relative"
                onClick={() => setShowNotifications(true)}
              >
                <Bell className="size-6 text-orange-400" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full" />
                )}
              </button>
              <Avatar className="size-10">
                <AvatarFallback className="bg-[#4F46E5] text-white">
                  {getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xl mb-1" style={{ fontWeight: 700 }}>
              ¡Hola, {getFirstName(displayName)}! 👋
            </h2>
            <p className="text-gray-600 text-sm">¿Dónde quieres estudiar hoy?</p>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Busca espacios, zonas o servicios"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 rounded-lg bg-gray-50 border-0 text-sm"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium ${
                  activeTab === tab.id
                    ? 'bg-[#4F46E5] text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Banner */}
        <div className="px-4 py-4">
          <div className="relative h-44 rounded-3xl overflow-hidden shadow-lg">
            {/* Left half - Solid purple with text */}
            <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#4F46E5] p-6 flex flex-col justify-center">
              <h2 className="text-xl text-white leading-tight mb-2" style={{ fontWeight: 700 }}>
                Espacios que<br />inspiran<br />productividad
              </h2>
              <p className="text-white/95 text-xs leading-relaxed">
                Encuentra el lugar perfecto<br />para crear, reunirte y crecer.
              </p>
            </div>

            {/* Right half - Image/Photo */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-br from-gray-400 to-gray-500">
              {/* Simulated office/coworking space photo effect */}
              <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,transparent,transparent_30px,rgba(0,0,0,0.1)_30px,rgba(0,0,0,0.1)_31px)]" />
              <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_30px,rgba(0,0,0,0.1)_30px,rgba(0,0,0,0.1)_31px)]" />
              {/* Simulated desks/furniture silhouettes */}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-600/20 to-transparent" />
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="px-4 mb-3 flex items-center justify-between">
          <h3 className="text-lg" style={{ fontWeight: 700 }}>Cerca de ti</h3>
          <button className="text-[#4F46E5] text-sm" style={{ fontWeight: 600 }}>
            Ver todo
          </button>
        </div>

        {/* Places List */}
        <div className="px-4 space-y-3">
          {studyPlaces.slice(0, 5).map((place) => {
            const hasIssues = placeIssues.some(issue => issue.placeId === place.id);
            const issueCount = placeIssues.filter(issue => issue.placeId === place.id).length;

            return (
              <Card
                key={place.id}
                className="cursor-pointer hover:shadow-lg transition-all overflow-hidden bg-white"
                onClick={() => navigate(`/app/place/${place.id}`)}
              >
                <CardContent className="p-0">
                  <div className="flex gap-3 p-3">
                    {/* Image */}
                    <div className={`relative w-24 h-24 rounded-xl bg-gradient-to-br ${getPlaceImage(place.id)} flex items-center justify-center shrink-0 overflow-hidden`}>
                      <span className="text-4xl">{getPlaceIcon(place.type)}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm line-clamp-1">{place.name}</h4>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{place.rating}</span>
                          <span className="text-xs text-gray-500">({place.reviews})</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <span>Las Condes • {calculateDistance(place.lat, place.lng)} km</span>
                      </div>

                      <div className="flex items-center gap-1 mb-2">
                        <Badge variant="secondary" className="text-xs bg-gray-100">
                          {getTypeLabel(place.type)}
                        </Badge>
                        {hasIssues && (
                          <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                            <AlertTriangle className="size-3 mr-1" />
                            {issueCount} reporte{issueCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {place.wifi && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300">
                            WiFi
                          </Badge>
                        )}
                        {place.outlets && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300">
                            Café
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300">
                          Sala de reunión
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">Gratis</p>
                        <p className="text-xs text-gray-500">/hora</p>
                      </div>
                    </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}
