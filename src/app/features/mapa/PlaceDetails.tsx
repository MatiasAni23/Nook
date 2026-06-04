import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Coffee,
  Heart,
  Lock,
  MapPin,
  Monitor,
  Star,
  ThumbsUp,
  Users,
  Wifi,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { ReportIssueModal } from "../shared/ReportIssueModal";
import { getIssueIcon, getIssueLabel, placeIssues, studyPlaces, type IssueType, workPlaces } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  getIsCurrentUserFavoritePlace,
  setCurrentUserFavoritePlace,
} from "../../services/currentUserService";
import { getPlaceById, type AppPlace } from "../../services/placeService";

const getUserRole = (): "student" | "worker" | "admin" => {
  return (window as any).__userRole || "student";
};

const fallbackAmenities = [
  { key: "wifi", name: "WiFi de alta velocidad" },
  { key: "coffee_tea", name: "Cafe y te ilimitados" },
  { key: "meeting_room", name: "Sala de reunion" },
  { key: "screen", name: "Pantalla disponible" },
  { key: "lockers", name: "Lockers disponibles" },
];

export function PlaceDetails() {
  const { placeId } = useParams();
  const navigate = useNavigate();
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
      default:
        return Star;
    }
  };

  if (isLoadingPlace) {
    return (
      <div className="p-4">
        <button onClick={() => navigate("/app")} className="flex items-center gap-2 text-gray-600">
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
        <button onClick={() => navigate("/app")} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <p className="mt-4">Lugar no encontrado</p>
      </div>
    );
  }

  const isWorkPlace = place.category === "work" || !!workPlace;
  const placeImages = Array.isArray(place.images) ? place.images : [];
  const includedAmenities =
    Array.isArray(place.amenities) && place.amenities.length > 0
      ? place.amenities.filter((amenity: any) => amenity.isAvailable !== false)
      : fallbackAmenities;
  const capacityText = place.capacityMax || place.capacity
    ? `${place.capacityMin ?? 1} - ${place.capacityMax ?? place.capacity}`
    : "1 - 20";

  return (
    <div className="size-full flex flex-col bg-white">
      <div className="flex-1 overflow-auto pb-28">
        <div className="relative h-72 bg-gradient-to-br from-gray-300 to-gray-500">
          {placeImages[0] ? (
            <img src={placeImages[0]} alt={place.name} className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${getPlaceImage(place.id)}`} />
          )}

          <button
            onClick={() => navigate("/app")}
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

          <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/70 text-white text-sm font-medium">
            {placeImages.length > 0 ? `1/${placeImages.length}` : "1/1"}
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
                <Star className="size-6 text-[#4F46E5] mx-auto mb-2" />
                <p className="text-xs font-semibold mb-1">Valoracion</p>
                <p className="text-xs text-gray-600 leading-tight">{place.rating}/5.0<br />estrellas</p>
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

          {isWorkPlace && userRole === "worker" && (
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
