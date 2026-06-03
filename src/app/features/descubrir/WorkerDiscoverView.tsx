import { useState } from "react";
import { useNavigate } from "react-router";
import { Search, Star, Bell } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { NotificationsPanel } from "../shared/NotificationsPanel";
import { workPlaces, currentWorker, notifications } from "../../data/mockData";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { getFirstName, getInitials } from "../../services/currentUserService";

export function WorkerDiscoverView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('coworking');
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const { currentUser: cachedUser } = useCurrentUser();
  const displayName = cachedUser?.name ?? currentWorker.name;
  const profileImageUrl = cachedUser?.profile?.profile_image_url ?? null;

  const unreadCount = notifications.filter(n => !n.read).length;

  const tabs = [
    { id: 'coworking', label: 'Coworking' },
    { id: 'oficinas', label: 'Oficinas' },
    { id: 'salas', label: 'Salas' },
    { id: 'premium', label: 'Premium' },
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
    const index = parseInt(id.replace(/\D/g, '')) % gradients.length;
    return gradients[index];
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'office': return '🏢';
      case 'coworking': return '💼';
      case 'meeting_room': return '👥';
      case 'private_office': return '🚪';
      default: return '📍';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'office': return 'Oficina';
      case 'coworking': return 'Coworking';
      case 'meeting_room': return 'Sala de reunión';
      case 'private_office': return 'Oficina privada';
      default: return 'Espacio';
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-20">
        {/* Header */}
        <div className="px-4 pt-8 pb-4 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl text-[#4F46E5]" style={{ fontWeight: 800 }}>
              WorkSpace
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
                {profileImageUrl && (
                  <AvatarImage
                    src={profileImageUrl}
                    alt={displayName}
                    className="object-cover"
                  />
                )}
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
            <p className="text-gray-600 text-sm">¿Dónde quieres trabajar hoy?</p>
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
                Espacios<br />profesionales<br />listos para ti
              </h2>
              <p className="text-white/95 text-xs leading-relaxed">
                Encuentra el lugar perfecto<br />para trabajar y crecer.
              </p>
            </div>

            {/* Right half - Image/Photo */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-br from-gray-400 to-gray-500">
              <div className="absolute inset-0 opacity-40 bg-[repeating-linear-gradient(90deg,transparent,transparent_30px,rgba(0,0,0,0.1)_30px,rgba(0,0,0,0.1)_31px)]" />
              <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_30px,rgba(0,0,0,0.1)_30px,rgba(0,0,0,0.1)_31px)]" />
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
          {workPlaces.slice(0, 5).map((place) => (
            <Card
              key={place.id}
              className="hover:shadow-lg transition-all overflow-hidden bg-white"
            >
              <CardContent className="p-0">
                <div
                  className="flex gap-3 p-3 cursor-pointer"
                  onClick={() => navigate(`/app/workplace/${place.id}`)}
                >
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

                    <Badge variant="secondary" className="text-xs mb-2 bg-gray-100">
                      {getTypeLabel(place.type)}
                    </Badge>

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {place.wifi && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300">
                            WiFi
                          </Badge>
                        )}
                        {place.parking && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300">
                            Parking
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300">
                          {place.capacity} personas
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-[#4F46E5]">{formatPrice(place.pricePerHour)}</p>
                        <p className="text-xs text-gray-500">/hora</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reserve button */}
                <div className="px-3 pb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/app/checkout/${place.id}`);
                    }}
                    className="w-full py-2.5 rounded-lg bg-[#4F46E5] text-white text-sm font-semibold hover:bg-[#4338CA] transition-all"
                  >
                    Reservar horario
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <NotificationsPanel onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}
