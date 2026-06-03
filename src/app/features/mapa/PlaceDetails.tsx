import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Star, MapPin, Wifi, Users, Clock, Coffee, Monitor, Lock, Heart, Calendar, AlertTriangle, ThumbsUp } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { ReportIssueModal } from "../shared/ReportIssueModal";
import { studyPlaces, workPlaces, placeIssues, getIssueLabel, getIssueIcon, type IssueType } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  getIsCurrentUserFavoritePlace,
  setCurrentUserFavoritePlace,
} from "../../services/currentUserService";

const getUserRole = (): 'student' | 'worker' | 'admin' => {
  return (window as any).__userRole || 'student';
};

export function PlaceDetails() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const userRole = getUserRole();

  // Try to find in study places or work places
  const studyPlace = studyPlaces.find(p => p.id === placeId);
  const workPlace = workPlaces.find(p => p.id === placeId);
  const place = studyPlace || workPlace;
  const isWorkPlace = !!workPlace;

  const [isFavorite, setIsFavorite] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [issues, setIssues] = useState(placeIssues.filter(issue => issue.placeId === placeId));

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
      reportedBy: 'Tú',
      timestamp: new Date(),
      upvotes: 0,
    };
    setIssues([newIssue, ...issues]);
    alert('¡Reporte enviado! Gracias por ayudar a la comunidad.');
  };

  const handleUpvote = (issueId: string) => {
    setIssues(issues.map(issue =>
      issue.id === issueId
        ? { ...issue, upvotes: issue.upvotes + 1 }
        : issue
    ));
  };

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
    <div className="size-full flex flex-col bg-white">
      <div className="flex-1 overflow-auto pb-28">
        {/* Hero Image */}
        <div className="relative h-72 bg-gradient-to-br from-gray-300 to-gray-500">
          <div className={`absolute inset-0 bg-gradient-to-br ${getPlaceImage(place.id)}`} />

          {/* Back and Favorite buttons */}
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
            <Heart className={`size-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
          </button>

          {/* Image counter */}
          <div className="absolute bottom-4 right-4 px-3 py-1 rounded-full bg-black/70 text-white text-sm font-medium">
            1/12
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          {/* Title and Rating */}
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
              <span>Las Condes, Santiago • {calculateDistance(place.lat, place.lng)} km</span>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* Horario */}
            <Card className="bg-gray-50 border-0">
              <CardContent className="pt-4 pb-3 px-3 text-center">
                <Calendar className="size-6 text-[#4F46E5] mx-auto mb-2" />
                <p className="text-xs font-semibold mb-1">Horario</p>
                <p className="text-xs text-gray-600 leading-tight">{place.hours}</p>
              </CardContent>
            </Card>

            {/* Capacidad */}
            <Card className="bg-gray-50 border-0">
              <CardContent className="pt-4 pb-3 px-3 text-center">
                <Users className="size-6 text-[#4F46E5] mx-auto mb-2" />
                <p className="text-xs font-semibold mb-1">Capacidad</p>
                <p className="text-xs text-gray-600 leading-tight">1 - 20<br />personas</p>
              </CardContent>
            </Card>

            {/* Rating */}
            <Card className="bg-gray-50 border-0">
              <CardContent className="pt-4 pb-3 px-3 text-center">
                <Star className="size-6 text-[#4F46E5] mx-auto mb-2" />
                <p className="text-xs font-semibold mb-1">Valoración</p>
                <p className="text-xs text-gray-600 leading-tight">{place.rating}/5.0<br />estrellas</p>
              </CardContent>
            </Card>
          </div>

          {/* Servicios incluidos */}
          <div>
            <h3 className="text-lg mb-3" style={{ fontWeight: 700 }}>Servicios incluidos</h3>
            <div className="grid grid-cols-5 gap-4">
              <div className="flex flex-col items-center">
                <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <Wifi className="size-6 text-gray-700" />
                </div>
                <p className="text-xs text-center text-gray-700 leading-tight">WiFi de alta velocidad</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <Coffee className="size-6 text-gray-700" />
                </div>
                <p className="text-xs text-center text-gray-700 leading-tight">Café y té ilimitados</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <Users className="size-6 text-gray-700" />
                </div>
                <p className="text-xs text-center text-gray-700 leading-tight">Sala de reunión</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <Monitor className="size-6 text-gray-700" />
                </div>
                <p className="text-xs text-center text-gray-700 leading-tight">Pantalla disponible</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                  <Lock className="size-6 text-gray-700" />
                </div>
                <p className="text-xs text-center text-gray-700 leading-tight">Lockers disponibles</p>
              </div>
            </div>
          </div>

          {/* Reportes de problemas */}
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
                  <p className="text-sm text-green-700">✅ No hay problemas reportados</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {issues.slice(0, 3).map((issue) => {
                  const minutesAgo = Math.floor((new Date().getTime() - issue.timestamp.getTime()) / 60000);
                  const timeAgo = minutesAgo < 60
                    ? `Hace ${minutesAgo} min`
                    : `Hace ${Math.floor(minutesAgo / 60)}h`;

                  return (
                    <Card key={issue.id} className="bg-orange-50 border-orange-200">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{getIssueIcon(issue.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-sm">{getIssueLabel(issue.type)}</span>
                              <span className="text-xs text-gray-500">• {timeAgo}</span>
                            </div>
                            {issue.description && (
                              <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                            )}
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
                {issues.length > 3 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    + {issues.length - 3} reporte(s) más
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Horarios disponibles */}
          <div>
            <h3 className="text-lg mb-3" style={{ fontWeight: 700 }}>Horarios disponibles</h3>
            <div className="space-y-2">
              {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map((day) => (
                <div key={day} className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm font-medium">{day}</span>
                  <span className="text-sm text-gray-600">7:00 - 22:00</span>
                </div>
              ))}
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">Sábado</span>
                <span className="text-sm text-gray-600">9:00 - 18:00</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">Domingo</span>
                <span className="text-sm text-red-500">Cerrado</span>
              </div>
            </div>
          </div>

          {/* Reserve button - only for workers on work places */}
          {isWorkPlace && userRole === 'worker' && (
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

      {/* Report Modal */}
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
