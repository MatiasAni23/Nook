import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Bell, Search, Star } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { CachedImage } from "../../components/ui/cached-image";
import { NotificationsPanel } from "../shared/NotificationsPanel";
import { currentUser, currentWorker, notifications, placeIssues, studyPlaces, workPlaces } from "../../data/mockData";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { getFirstName, getInitials } from "../../services/currentUserService";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getCachedPlaces, listPlaces, type AppPlace } from "../../services/placeService";
import {
  getPlaceTypeLabel,
  hasValidPlacePrice,
  placeMatchesSearch,
  placeMatchesTab,
} from "../mapa/placeFilters";
import { getDetailNavigationState } from "../mapa/navigationState";
import { DiscoverSkeleton } from "./DiscoverSkeleton";

function getAmenityLabel(key?: string, name?: string) {
  if (key === "coffee_tea") return "Alimentos";
  return name ?? key ?? "Servicio";
}

const discoverImageUrl = new URL("../../../../assets/imagen_descubrir.png", import.meta.url).href;

const getUserRole = (): "student" | "worker" | "admin" | "delegate" => {
  return (window as any).__userRole || "student";
};

export function DiscoverView() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [dbPlaces, setDbPlaces] = useState<AppPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState("");
  const { currentUser: cachedUser, isLoadingCurrentUser } = useCurrentUser();
  const userRole = cachedUser?.role ?? getUserRole();
  const isWorker = userRole === "worker";
  const displayName = cachedUser?.name ?? (isWorker ? currentWorker.name : currentUser.name);
  const profileImageUrl = cachedUser?.profile?.profile_image_url ?? null;

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const tabs = [
    { id: "todos", label: "Todos" },
    { id: "cowork", label: "Cowork" },
    { id: "estudios", label: "Estudios" },
    { id: "reuniones", label: "Reuniones" },
    { id: "parques", label: "Parques" },
    { id: "premium", label: "Reserva" },
  ];

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    const cachedPlaces = getCachedPlaces();
    if (cachedPlaces) setDbPlaces(cachedPlaces);
    setIsLoadingPlaces(!cachedPlaces);
    setPlacesError("");

    listPlaces({ forceRefresh: Boolean(cachedPlaces) })
      .then((places) => {
        if (isMounted) setDbPlaces(places);
      })
      .catch((error) => {
        if (isMounted) {
          setDbPlaces([]);
          setPlacesError(error instanceof Error ? error.message : "No se pudieron cargar los lugares.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlaces(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getPlaceImage = (id: string) => {
    const gradients = [
      "from-gray-400 to-gray-600",
      "from-blue-400 to-blue-600",
      "from-green-400 to-green-600",
      "from-orange-400 to-orange-600",
      "from-indigo-400 to-indigo-600",
      "from-pink-400 to-pink-600",
      "from-cyan-400 to-cyan-600",
      "from-red-400 to-red-600",
    ];
    const index = Math.abs(id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % gradients.length;
    return gradients[index];
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case "library":
        return "📚";
      case "cafe":
        return "☕";
      case "coworking":
        return "💼";
      case "park":
        return "🌳";
      case "meeting_room":
        return "👥";
      case "office":
        return "🏢";
      default:
        return "📍";
    }
  };

  const calculateDistance = (lat: number, lng: number) => {
    const userLat = -33.4569;
    const userLng = -70.6483;
    const R = 6371;
    const dLat = ((lat - userLat) * Math.PI) / 180;
    const dLng = ((lng - userLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLat * Math.PI) / 180) *
        Math.cos((lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const mockPlaces = [
    ...studyPlaces.map((place) => ({
      ...place,
      category: "study" as const,
      images: [],
      amenities: [],
    })),
    ...workPlaces.map((place) => ({
      ...place,
      category: "work" as const,
      images: [],
      amenities: [],
    })),
  ];
  const basePlaces = isSupabaseConfigured ? dbPlaces : mockPlaces;
  const filteredPlaces = basePlaces.filter(
    (place) =>
      placeMatchesTab(place, activeTab) &&
      placeMatchesSearch(place, searchTerm),
  );

  if ((isLoadingCurrentUser && !cachedUser) || isLoadingPlaces) {
    return <DiscoverSkeleton />;
  }

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-20">
        <div className="px-4 pt-8 pb-4 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl text-[#4F46E5]" style={{ fontWeight: 800 }}>
              Nook
            </h1>
            <div className="flex items-center gap-3">
              <button className="relative" onClick={() => setShowNotifications(true)}>
                <Bell className="size-6 text-orange-400" />
                {unreadCount > 0 && <div className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full" />}
              </button>
              <button type="button" onClick={() => navigate("/app/profile")} aria-label="Ir al perfil">
                <Avatar className="size-10">
                  {profileImageUrl && <AvatarImage src={profileImageUrl} alt={displayName} className="object-cover" />}
                  <AvatarFallback className="bg-[#4F46E5] text-white">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </button>
            </div>
          </div>

          <div className="mb-4">
            <h2 className="text-xl mb-1" style={{ fontWeight: 700 }}>
              Hola, {getFirstName(displayName)} 👋
            </h2>
            <p className="text-gray-600 text-sm">
              {isWorker ? "Donde quieres trabajar hoy?" : "Donde quieres estudiar hoy?"}
            </p>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Busca espacios, zonas o servicios"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10 h-12 rounded-lg bg-gray-50 border-0 text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-full whitespace-nowrap transition-all text-sm font-medium ${
                  activeTab === tab.id ? "bg-[#4F46E5] text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {placesError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {placesError}
            </div>
          )}
        </div>

        <div className="px-4 py-4">
          <div className="relative h-44 rounded-3xl overflow-hidden shadow-lg">
            <div className="absolute left-0 top-0 bottom-0 w-1/2 bg-[#4F46E5] p-6 flex flex-col justify-center">
              <h2 className="text-xl text-white leading-tight mb-2" style={{ fontWeight: 700 }}>
                Espacios que<br />inspiran<br />productividad
              </h2>
              <p className="text-white/95 text-xs leading-relaxed">
                Encuentra el lugar perfecto<br />para crear, reunirte y crecer.
              </p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gray-100">
              <CachedImage src={discoverImageUrl} alt="" className="size-full object-cover" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="px-4 mb-3 flex items-center justify-between">
          <h3 className="text-lg" style={{ fontWeight: 700 }}>Cerca de ti</h3>
          <button
            onClick={() => setActiveTab("todos")}
            className="text-[#4F46E5] text-sm"
            style={{ fontWeight: 600 }}
          >
            Ver todo
          </button>
        </div>

        <div className="px-4 space-y-3">
          {filteredPlaces.length === 0 && (
            <Card className="bg-white">
              <CardContent className="p-4 text-sm text-gray-600">No hay lugares para este filtro.</CardContent>
            </Card>
          )}

          {filteredPlaces.map((place) => {
            const hasIssues = placeIssues.some((issue) => issue.placeId === place.id);
            const issueCount = placeIssues.filter((issue) => issue.placeId === place.id).length;
            const placeHasPrice = hasValidPlacePrice(place);
            const availableAmenities = (place.amenities ?? []).filter((amenity: any) => amenity.isAvailable !== false);
            const placeUrl = place.category === "work" ? `/app/workplace/${place.id}` : `/app/place/${place.id}`;
            const detailBadges = [
              { key: "type", label: getPlaceTypeLabel(place.type), variant: "secondary" as const },
              ...(place.wifi ? [{ key: "wifi", label: "WiFi", variant: "outline" as const }] : []),
              ...(place.outlets ? [{ key: "outlets", label: "Enchufes", variant: "outline" as const }] : []),
              ...availableAmenities.map((amenity: any) => ({
                key: amenity.key,
                label: getAmenityLabel(amenity.key, amenity.name),
                variant: "outline" as const,
              })),
            ].filter((badge, index, badges) => {
              const normalizedKey = String(badge.key ?? badge.label).toLowerCase();
              return badges.findIndex((item) => String(item.key ?? item.label).toLowerCase() === normalizedKey) === index;
            });
            const visibleBadges = detailBadges.slice(0, 4);
            const hiddenBadgeCount = Math.max(0, detailBadges.length - visibleBadges.length);

            return (
              <Card
                key={place.id}
                className="cursor-pointer hover:shadow-lg transition-all overflow-hidden bg-white"
                onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app/discover") })}
              >
                <CardContent className="p-3">
                  <div className="flex gap-3">
                    <div className={`relative w-24 h-24 rounded-xl ${place.images?.[0] ? "bg-gray-100" : `bg-gradient-to-br ${getPlaceImage(place.id)}`} flex items-center justify-center shrink-0 overflow-hidden`}>
                      {place.images?.[0] ? (
                        <CachedImage src={place.images[0]} alt={place.name} className="size-full object-cover" />
                      ) : (
                        <span className="text-4xl">{getPlaceIcon(place.type)}</span>
                      )}
                    </div>

                    <div className="flex h-24 flex-1 min-w-0 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm leading-tight line-clamp-1">{place.name}</h4>
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="size-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs font-semibold">{place.rating}</span>
                            <span className="text-xs text-gray-500">({place.reviews})</span>
                          </div>
                        </div>

                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                          <span className="line-clamp-1">{place.zone ?? place.address ?? "Santiago"} - {calculateDistance(place.lat, place.lng)} km</span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-2">
                        <div className="flex max-h-12 flex-wrap gap-1 overflow-hidden">
                          {visibleBadges.map((badge, badgeIndex) => (
                            <Badge
                              key={`${place.id}-${badge.key ?? badge.label}-${badgeIndex}`}
                              variant={badge.variant}
                              className={`text-xs px-2 py-0.5 ${badge.variant === "secondary" ? "bg-gray-100" : "border-gray-300"}`}
                            >
                              {badge.label}
                            </Badge>
                          ))}
                          {hiddenBadgeCount > 0 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 border-gray-300">
                              ...
                            </Badge>
                          )}
                        </div>
                        {hasIssues && (
                          <Badge className="shrink-0 text-xs bg-orange-100 text-orange-700 border-orange-300">
                            <AlertTriangle className="size-3 mr-1" />
                            {issueCount} reporte{issueCount > 1 ? "s" : ""}
                          </Badge>
                        )}
                        <div className="min-w-fit text-right">
                          <p className="font-semibold text-sm text-[#4F46E5]">
                            {placeHasPrice ? formatPrice((place as any).pricePerHour) : "Gratis"}
                          </p>
                          {placeHasPrice && <p className="text-xs text-gray-500">/hora</p>}
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

      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
    </div>
  );
}
