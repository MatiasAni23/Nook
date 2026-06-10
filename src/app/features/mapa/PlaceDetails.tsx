import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Coffee,
  DollarSign,
  ExternalLink,
  Heart,
  Lightbulb,
  Lock,
  MapPin,
  Monitor,
  ParkingCircle,
  Plug,
  Presentation,
  Star,
  ThumbsUp,
  Users,
  Volume2,
  Wifi,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { CachedImage } from "../../components/ui/cached-image";
import { ReportIssueModal } from "../shared/ReportIssueModal";
import { getIssueIcon, getIssueLabel, placeIssues, studyPlaces, type IssueType, workPlaces } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  getIsCurrentUserFavoritePlace,
  setCurrentUserFavoritePlace,
} from "../../services/currentUserService";
import { getPlaceById, type AppPlace } from "../../services/placeService";
import type { DetailNavigationState } from "./navigationState";

const getUserRole = (): "student" | "worker" | "admin" => {
  return (window as any).__userRole || "student";
};

const fallbackAmenities = [
  { key: "wifi", name: "WiFi de alta velocidad" },
  { key: "outlets", name: "Enchufes disponibles" },
  { key: "coffee_tea", name: "Cafe y te ilimitados" },
  { key: "meeting_room", name: "Sala de reunion" },
  { key: "screen", name: "Pantalla disponible" },
  { key: "lockers", name: "Lockers disponibles" },
];

export function PlaceDetails() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as DetailNavigationState | null;
  const backPath = navigationState?.from ?? "/app/discover";
  const userRole = getUserRole();
  const studyPlace = studyPlaces.find((item) => item.id === placeId);
  const workPlace = workPlaces.find((item) => item.id === placeId);
  const initialPlace = studyPlace || workPlace;

  const [place, setPlace] = useState<any | AppPlace | null>(initialPlace ?? null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(!initialPlace && isSupabaseConfigured);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [issues, setIssues] = useState(placeIssues.filter((issue) => issue.placeId === placeId));
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    if (initialPlace || !placeId || !isSupabaseConfigured) return;

    let isMounted = true;
    setIsLoadingPlace(true);

    getPlaceById(placeId)
      .then((nextPlace) => {
        if (isMounted) setPlace(nextPlace);
      })
      .catch(() => {
        if (isMounted) setPlace(null);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlace(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialPlace, placeId]);

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteState() {
      if (!isSupabaseConfigured || !placeId) return;

      try {
        const nextIsFavorite = await getIsCurrentUserFavoritePlace(placeId);
        if (isMounted) setIsFavorite(nextIsFavorite);
      } catch {
        if (isMounted) setIsFavorite(false);
      }
    }

    loadFavoriteState();

    return () => {
      isMounted = false;
    };
  }, [placeId]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [place?.id]);

  useEffect(() => {
    const imageCount = Array.isArray(place?.images) ? place.images.length : 0;
    if (imageCount > 0 && activeImageIndex > imageCount - 1) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, place?.images]);

  const handleToggleFavorite = async () => {
    const nextIsFavorite = !isFavorite;
    setIsFavorite(nextIsFavorite);

    if (!isSupabaseConfigured || !placeId) return;

    setIsSavingFavorite(true);

    try {
      await setCurrentUserFavoritePlace(placeId, nextIsFavorite);
    } catch {
      setIsFavorite(!nextIsFavorite);
    } finally {
      setIsSavingFavorite(false);
    }
  };

  const handleReport = (type: IssueType, description: string) => {
    const newIssue = {
      id: `i${Date.now()}`,
      placeId: placeId!,
      type,
      description,
      reportedBy: "Tu",
      timestamp: new Date(),
      upvotes: 0,
    };
    setIssues([newIssue, ...issues]);
    alert("Reporte enviado. Gracias por ayudar a la comunidad.");
  };

  const handleUpvote = (issueId: string) => {
    setIssues((currentIssues) =>
      currentIssues.map((issue) =>
        issue.id === issueId ? { ...issue, upvotes: issue.upvotes + 1 } : issue,
      ),
    );
  };

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

  const getAmenityIcon = (key: string) => {
    switch (key) {
      case "wifi":
        return Wifi;
      case "coffee_tea":
        return Coffee;
      case "meeting_room":
        return Users;
      case "screen":
        return Monitor;
      case "lockers":
        return Lock;
      case "outlets":
        return Plug;
      case "parking":
        return ParkingCircle;
      case "presentation":
        return Presentation;
      case "quiet_area":
        return Volume2;
      case "workstations":
        return Briefcase;
      default:
        return Star;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const goToPreviousImage = () => {
    setActiveImageIndex((currentIndex) => {
      const imageCount = Array.isArray(place?.images) ? place.images.length : 0;
      if (imageCount <= 1) return currentIndex;
      return currentIndex === 0 ? imageCount - 1 : currentIndex - 1;
    });
  };

  const goToNextImage = () => {
    setActiveImageIndex((currentIndex) => {
      const imageCount = Array.isArray(place?.images) ? place.images.length : 0;
      if (imageCount <= 1) return currentIndex;
      return currentIndex === imageCount - 1 ? 0 : currentIndex + 1;
    });
  };

  const handleOpenDirections = () => {
    const destination = typeof place?.lat === "number" && typeof place?.lng === "number"
      ? `${place.lat},${place.lng}`
      : place?.address ?? "";
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    window.open(mapsUrl, "_blank", "noopener,noreferrer");
  };

  const renderRatingDots = (value?: number | null) => {
    const filledDots = Math.max(0, Math.min(5, Math.round(value ?? 0)));

    return (
      <div className="flex items-center gap-1.5" aria-label={`${filledDots} de 5`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className={`size-2.5 rounded-full ${
              index < filledDots ? "bg-[#4F46E5]" : "bg-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoadingPlace) {
    return (
      <div className="p-4">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <p className="mt-4">Cargando lugar...</p>
      </div>
    );
  }

  if (!place) {
    return (
      <div className="p-4">
        <button onClick={() => navigate(backPath)} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <p className="mt-4">Lugar no encontrado</p>
      </div>
    );
  }

  const isWorkPlace = place.category === "work" || !!workPlace;
  const placeImages = Array.isArray(place.images) ? place.images : [];
  const selectedImage = placeImages[activeImageIndex];
  const explicitAmenities = [
    { key: "wifi", name: "WiFi disponible", isAvailable: Boolean(place.wifi) },
    { key: "outlets", name: "Enchufes disponibles", isAvailable: Boolean(place.outlets) },
    { key: "parking", name: "Estacionamiento", isAvailable: Boolean(place.parking) },
  ];
  const savedAmenities = Array.isArray(place.amenities)
    ? place.amenities.filter((amenity: any) => amenity.isAvailable !== false)
    : [];
  const savedAmenityKeys = new Set(savedAmenities.map((amenity: any) => amenity.key));
  const availableExplicitAmenities = explicitAmenities.filter((amenity) => amenity.isAvailable);
  const includedAmenities =
    savedAmenities.length > 0
      ? [
          ...savedAmenities,
          ...availableExplicitAmenities.filter((amenity) => !savedAmenityKeys.has(amenity.key)),
        ]
      : availableExplicitAmenities.length > 0
        ? availableExplicitAmenities
      : fallbackAmenities;
  const capacityText = place.capacityMax || place.capacity
    ? `${place.capacityMin ?? 1} - ${place.capacityMax ?? place.capacity}`
    : "1 - 20";
  const hasValidPrice = Number.isFinite(place.pricePerHour) && place.pricePerHour > 0;
  const priceText = hasValidPrice ? `${formatPrice(place.pricePerHour)} / hora` : "Gratis";
  const canReservePlace = hasValidPrice && (userRole === "worker" || place.type !== "coworking");

  return (
    <div className="size-full flex flex-col bg-white">
      <div className="flex-1 overflow-auto pb-28">
        <div className="relative h-72 bg-gradient-to-br from-gray-300 to-gray-500">
          {selectedImage ? (
            <CachedImage src={selectedImage} alt={place.name} className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${getPlaceImage(place.id)}`} />
          )}

          <button
            onClick={() => navigate(backPath)}
            className="absolute top-4 left-4 size-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50"
          >
            <ArrowLeft className="size-5 text-gray-700" />
          </button>
          <button
            onClick={handleToggleFavorite}
            disabled={isSavingFavorite}
            className="absolute top-4 right-4 size-10 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50"
          >
            <Heart className={`size-5 ${isFavorite ? "fill-red-500 text-red-500" : "text-gray-700"}`} />
          </button>

          {placeImages.length > 1 && (
            <>
              <button
                onClick={goToPreviousImage}
                className="absolute left-4 top-1/2 size-10 -translate-y-1/2 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white"
                aria-label="Imagen anterior"
              >
                <ChevronLeft className="size-5 text-gray-700" />
              </button>
              <button
                onClick={goToNextImage}
                className="absolute right-4 top-1/2 size-10 -translate-y-1/2 rounded-full bg-white/90 shadow-lg flex items-center justify-center hover:bg-white"
                aria-label="Imagen siguiente"
              >
                <ChevronRight className="size-5 text-gray-700" />
              </button>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/20 bg-black/35 px-2.5 py-1.5 shadow-lg backdrop-blur-md">
                {placeImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setActiveImageIndex(index)}
                    className={`size-2 rounded-full transition-all ${
                      activeImageIndex === index
                        ? "w-5 bg-[#C4B5FD] shadow-sm"
                        : "bg-white/45 ring-1 ring-white/30"
                    }`}
                    aria-label={`Ver imagen ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

          <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/70 text-white text-sm font-medium">
            {placeImages.length > 0 ? `${activeImageIndex + 1}/${placeImages.length}` : "1/1"}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h1 className="text-2xl" style={{ fontWeight: 700 }}>{place.name}</h1>
              <div className="flex items-center gap-1 shrink-0">
                <Star className="size-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{place.rating}</span>
                <span className="text-sm text-gray-500">({place.reviews})</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <MapPin className="size-4 text-red-500" />
              <span>{place.zone ?? place.address ?? "Santiago"} - {calculateDistance(place.lat, place.lng)} km</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-gray-50 border-0">
              <CardContent className="pt-4 pb-3 px-3 text-center">
                <Calendar className="size-6 text-[#4F46E5] mx-auto mb-2" />
                <p className="text-xs font-semibold mb-1">Horario</p>
                <p className="text-xs text-gray-600 leading-tight">{place.hours}</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-0">
              <CardContent className="pt-4 pb-3 px-3 text-center">
                <Users className="size-6 text-[#4F46E5] mx-auto mb-2" />
                <p className="text-xs font-semibold mb-1">Capacidad</p>
                <p className="text-xs text-gray-600 leading-tight">{capacityText}<br />personas</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-0">
              <CardContent className="pt-4 pb-3 px-3 text-center">
                <DollarSign className="size-6 text-[#4F46E5] mx-auto mb-2" />
                <p className="text-xs font-semibold mb-1">Acceso</p>
                <p className="text-xs text-gray-600 leading-tight">{priceText}</p>
              </CardContent>
            </Card>
          </div>

          {place.description && (
            <div>
              <h3 className="text-lg mb-2" style={{ fontWeight: 700 }}>Descripcion</h3>
              <p className="text-sm leading-relaxed text-gray-700">{place.description}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <MapPin className="mt-0.5 size-5 shrink-0 text-[#4F46E5]" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Direccion</p>
                      <p className="text-sm text-gray-600">{place.address}</p>
                      {place.zone && <p className="text-xs text-gray-500">{place.zone}</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenDirections}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#4F46E5] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[#4338CA]"
                  >
                    <ExternalLink className="size-3.5" />
                    Como llegar
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-50 border-0">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Ambiente</p>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Volume2 className="size-4 text-[#4F46E5]" />
                        <span>Silencio</span>
                      </div>
                      {renderRatingDots(place.quietness)}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Lightbulb className="size-4 text-[#4F46E5]" />
                        <span>Iluminacion</span>
                      </div>
                      {renderRatingDots(place.lighting)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <h3 className="text-lg mb-3" style={{ fontWeight: 700 }}>Servicios incluidos</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {includedAmenities.map((amenity: any) => {
                const AmenityIcon = getAmenityIcon(amenity.key);
                return (
                  <div key={amenity.key} className="flex flex-col items-center">
                    <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <AmenityIcon className="size-6 text-gray-700" />
                    </div>
                    <p className="text-xs text-center text-gray-700 leading-tight">{amenity.name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg" style={{ fontWeight: 700 }}>
                <AlertTriangle className="size-5 inline mr-2 text-orange-500" />
                Reportes de la comunidad
              </h3>
              <button
                onClick={() => setShowReportModal(true)}
                className="text-sm text-[#4F46E5] font-semibold hover:underline"
              >
                Reportar problema
              </button>
            </div>

            {issues.length === 0 ? (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-4 text-center">
                  <p className="text-sm text-green-700">No hay problemas reportados</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {issues.slice(0, 3).map((issue) => {
                  const minutesAgo = Math.floor((new Date().getTime() - issue.timestamp.getTime()) / 60000);
                  const timeAgo = minutesAgo < 60 ? `Hace ${minutesAgo} min` : `Hace ${Math.floor(minutesAgo / 60)}h`;

                  return (
                    <Card key={issue.id} className="bg-orange-50 border-orange-200">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getIssueIcon(issue.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{getIssueLabel(issue.type)}</span>
                              <span className="text-xs text-gray-500">- {timeAgo}</span>
                            </div>
                            {issue.description && <p className="text-sm text-gray-700 mb-2">{issue.description}</p>}
                            <button
                              onClick={() => handleUpvote(issue.id)}
                              className="flex items-center gap-1 text-xs text-gray-600 hover:text-[#4F46E5]"
                            >
                              <ThumbsUp className="size-3" />
                              <span>{issue.upvotes} personas confirman</span>
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg mb-3" style={{ fontWeight: 700 }}>Horarios disponibles</h3>
            <div className="space-y-2">
              {["Lunes", "Martes", "Miercoles", "Jueves", "Viernes"].map((day) => (
                <div key={day} className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium">{day}</span>
                  <span className="text-sm text-gray-600">{place.hours}</span>
                </div>
              ))}
            </div>
          </div>

          {canReservePlace && (
            <div className="pb-4">
              <button
                onClick={() => navigate(`/app/checkout/${placeId}`)}
                className="w-full py-4 rounded-xl bg-[#4F46E5] text-white font-semibold text-lg hover:bg-[#4338CA] transition-all shadow-lg"
              >
                Reservar horario
              </button>
            </div>
          )}
        </div>
      </div>

      {showReportModal && (
        <ReportIssueModal
          placeName={place.name}
          onClose={() => setShowReportModal(false)}
          onReport={handleReport}
        />
      )}
    </div>
  );
}
