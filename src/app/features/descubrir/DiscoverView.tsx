import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Bell, Crown, Search, Star } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { CachedImage } from "../../components/ui/cached-image";
import { NotificationsPanel } from "../shared/NotificationsPanel";
import { currentUser, currentWorker, notifications as mockNotifications, placeIssues, studyPlaces, workPlaces } from "../../data/mockData";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { getFirstName, getInitials } from "../../services/currentUserService";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getUnreadNotificationCount, subscribeToNotifications } from "../../services/notificationService";
import { getCachedPlaces, listPlaces, type AppPlace } from "../../services/placeService";
import {
  getPlaceTypeLabel,
  hasValidPlacePrice,
  placeMatchesSearch,
} from "../mapa/placeFilters";
import { getDetailNavigationState } from "../mapa/navigationState";
import { DiscoverSkeleton } from "./DiscoverSkeleton";

// Helpers de presentacion para normalizar datos antes de mostrarlos.
function getAmenityLabel(key?: string, name?: string) {
  if (key === "coffee_tea") return "Alimentos";
  return name ?? key ?? "Servicio";
}

const discoverImageUrl = new URL("../../../../assets/imagen_descubrir.png", import.meta.url).href;

// Rol temporal usado por las rutas mock cuando no hay usuario cargado desde el contexto.
const getUserRole = (): "student" | "worker" | "admin" | "delegate" => {
  return (window as any).__userRole || "student";
};

export function DiscoverView() {
  const navigate = useNavigate();

  // Estado de busqueda, notificaciones y carga de lugares.
  const [searchTerm, setSearchTerm] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [dbPlaces, setDbPlaces] = useState<AppPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState("");
  const [unreadCount, setUnreadCount] = useState(
    isSupabaseConfigured ? 0 : mockNotifications.filter((notification) => !notification.read).length,
  );

  // Datos del usuario actual con fallback a mockData para desarrollo local.
  const { currentUser: cachedUser, isLoadingCurrentUser } = useCurrentUser();
  const userRole = cachedUser?.role ?? getUserRole();
  const isWorker = userRole === "worker";
  const displayName = cachedUser?.name ?? (isWorker ? currentWorker.name : currentUser.name);
  const profileImageUrl = cachedUser?.profile?.profile_image_url ?? null;

  // Carga lugares desde Supabase cuando esta configurado; si no, la vista usa mockData.
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

  // Mantiene actualizado el contador del boton de notificaciones.
  useEffect(() => {
    if (!isSupabaseConfigured || !cachedUser?.id) return;

    let isMounted = true;
    const refreshUnreadCount = () => {
      getUnreadNotificationCount()
        .then((count) => {
          if (isMounted) setUnreadCount(count);
        })
        .catch(() => {
          if (isMounted) setUnreadCount(0);
        });
    };

    refreshUnreadCount();
    const unsubscribe = subscribeToNotifications(cachedUser.id, refreshUnreadCount);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [cachedUser?.id]);

  // Gradiente estable para lugares sin imagen principal.
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

  // Icono fallback para lugares sin imagen. Se usa solo en datos mock o lugares incompletos.
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

  // Distancia aproximada desde una ubicacion base en Santiago.
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

  // Formato de precios en pesos chilenos para lugares con reserva pagada.
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Dataset local usado cuando Supabase no esta disponible.
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

  // La seccion Descubrir actualmente filtra solo por el texto del buscador.
  const filteredPlaces = basePlaces.filter((place) => placeMatchesSearch(place, searchTerm));

  if ((isLoadingCurrentUser && !cachedUser) || isLoadingPlaces) {
    return <DiscoverSkeleton />;
  }

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto pb-20">
        {/* Bloque superior: marca, acceso a notificaciones/perfil y saludo del usuario. */}
        <div className="bg-white pb-4">
          <div className="relative overflow-hidden rounded-b-[1.75rem] bg-gradient-to-br from-[#7C3AED] via-[#5B4AEE] to-[#4F46E5] px-4 pb-16 pt-12 text-white shadow-[0_18px_38px_rgba(79,70,229,0.20)] sm:px-6 md:px-8 lg:px-10">
            <div className="pointer-events-none absolute -right-20 -top-24 size-60 rounded-full border border-white/[0.07] bg-white/[0.025]" />
            <div className="pointer-events-none absolute right-10 top-11 size-28 rounded-full border border-white/[0.06] bg-white/[0.025]" />
            <div className="pointer-events-none absolute left-28 bottom-3 size-28 rounded-full border border-white/[0.04]" />

            <div className="relative z-10 mb-7 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid size-9 place-items-center rounded-xl bg-white/14 text-sm font-black shadow-[0_10px_20px_rgba(49,46,129,0.12)]">
                  N
                </div>
                <h1 className="text-lg font-black">Nook</h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="relative grid size-9 place-items-center rounded-xl bg-white/14 text-white shadow-[0_8px_18px_rgba(49,46,129,0.14)] transition hover:bg-white/20"
                  onClick={() => setShowNotifications(true)}
                  aria-label="Ver notificaciones"
                >
                  <Bell className="size-4" />
                  {unreadCount > 0 && (
                    <div className="absolute right-2 top-2 size-2 rounded-full border border-white bg-red-500" />
                  )}
                </button>
                <button type="button" onClick={() => navigate("/app/profile")} aria-label="Ir al perfil">
                  <Avatar className="size-10 border border-white/20 shadow-[0_8px_18px_rgba(49,46,129,0.16)]">
                    {profileImageUrl && <AvatarImage src={profileImageUrl} alt={displayName} className="object-cover" />}
                    <AvatarFallback className="bg-white/18 text-xs font-black text-white">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl font-black leading-tight">
                Hola, {getFirstName(displayName)}
              </h2>
              <p className="mt-1 text-sm font-bold text-white/80">
                {isWorker ? "Donde quieres trabajar hoy?" : "Donde quieres estudiar hoy?"}
              </p>
            </div>
          </div>

          {/* Buscador principal de lugares, zonas y servicios. */}
          <div className="relative z-10 -mt-7 px-4">
            <div className="relative rounded-[1.15rem] bg-white p-2 shadow-[0_12px_28px_rgba(79,70,229,0.14)]">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-4 text-[#8B93F5]" />
              <Input
                placeholder="Busca espacios, zonas o servicios..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="h-12 rounded-[0.85rem] border-0 bg-[#F4F3FF] pl-10 pr-4 text-sm text-[#1E1B4B] shadow-none placeholder:text-[#8C8AAE] focus-visible:ring-2 focus-visible:ring-[#C7D2FE]"
              />
            </div>
          </div>

          {placesError && (
            <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {placesError}
            </div>
          )}
        </div>

        {/* Banner editorial destacado de la pantalla Descubrir. */}
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

        {/* Encabezado de la lista de resultados. */}
        <div className="px-4 mb-3 flex items-center justify-between">
          <h3 className="text-lg" style={{ fontWeight: 700 }}>Cerca de ti</h3>
          <button
            onClick={() => setSearchTerm("")}
            className="text-[#4F46E5] text-sm"
            style={{ fontWeight: 600 }}
          >
            Ver todo
          </button>
        </div>

        {/* Listado de lugares cercanos filtrados por el buscador. */}
        <div className="px-4 space-y-3">
          {filteredPlaces.length === 0 && (
            <Card className="bg-white">
              <CardContent className="p-4 text-sm text-gray-600">No hay lugares para este filtro.</CardContent>
            </Card>
          )}

          {filteredPlaces.map((place) => {
            // Datos derivados para construir la tarjeta sin repetir logica en el JSX.
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
                          <div className="min-w-0">
                            {place.isPromoted && (
                              <div className="mb-0.5 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">
                                <Crown className="size-3" />
                                Destacado
                              </div>
                            )}
                            <h4 className="font-semibold text-sm leading-tight line-clamp-1">{place.name}</h4>
                          </div>
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
                            {placeHasPrice ? "De pago" : "Gratis"}
                          </p>
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

      {showNotifications && (
        <NotificationsPanel
          onClose={() => setShowNotifications(false)}
          onUnreadCountChange={setUnreadCount}
        />
      )}
    </div>
  );
}
