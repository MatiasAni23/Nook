import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Clock,
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
import { CachedImage, preloadCachedImage } from "../../components/ui/cached-image";
import { ReportIssueModal } from "../shared/ReportIssueModal";
import { getIssueIcon, getIssueLabel, placeIssues, studyPlaces, type IssueType, workPlaces } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  getIsCurrentUserFavoritePlace,
  setCurrentUserFavoritePlace,
} from "../../services/currentUserService";
import { getPlaceById, type AppPlace } from "../../services/placeService";
import {
  confirmPlaceReport,
  createPlaceReport,
  listPlaceReports,
} from "../../services/placeReportService";
import type { DetailNavigationState } from "./navigationState";

const fallbackAmenities = [
  { key: "wifi", name: "WiFi de alta velocidad" },
  { key: "outlets", name: "Enchufes disponibles" },
  { key: "coffee_tea", name: "Alimentos" },
  { key: "meeting_room", name: "Sala de reunion" },
  { key: "screen", name: "Pantalla disponible" },
  { key: "lockers", name: "Lockers disponibles" },
];

function getAmenityLabel(key?: string, name?: string) {
  if (key === "coffee_tea") return "Alimentos";
  return name ?? key ?? "Servicio";
}

type DisplayScheduleDay = {
  label: string;
  shortLabel: string;
  time: string;
  isOpen: boolean;
};

const weekDays = [
  { label: "Lunes", shortLabel: "Lun", aliases: ["Lun", "Lunes"] },
  { label: "Martes", shortLabel: "Mar", aliases: ["Mar", "Martes"] },
  { label: "Miercoles", shortLabel: "Mie", aliases: ["Mie", "Miercoles", "Miércoles"] },
  { label: "Jueves", shortLabel: "Jue", aliases: ["Jue", "Jueves"] },
  { label: "Viernes", shortLabel: "Vie", aliases: ["Vie", "Viernes"] },
  { label: "Sabado", shortLabel: "Sab", aliases: ["Sab", "Sabado", "Sábado"] },
  { label: "Domingo", shortLabel: "Dom", aliases: ["Dom", "Domingo"] },
];

function normalizeSchedule(hours?: string | null): DisplayScheduleDay[] {
  const scheduleText = String(hours ?? "").trim();
  const singleRange = scheduleText.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  const hasDayLabels = weekDays.some((day) =>
    day.aliases.some((alias) => new RegExp(`\\b${alias}\\b\\s*:`, "i").test(scheduleText)),
  );

  return weekDays.map((day) => {
    const dayPattern = new RegExp(
      `(?:^|[;,])\\s*(?:${day.aliases.join("|")})\\s*:\\s*(Cerrado|\\d{1,2}:\\d{2}\\s*-\\s*\\d{1,2}:\\d{2})?`,
      "i",
    );
    const match = scheduleText.match(dayPattern);
    const rawTime = match?.[1]?.trim();

    if (rawTime) {
      const isOpen = rawTime.toLowerCase() !== "cerrado";
      return { label: day.label, shortLabel: day.shortLabel, time: isOpen ? rawTime : "Cerrado", isOpen };
    }

    if (!hasDayLabels && singleRange) {
      return { label: day.label, shortLabel: day.shortLabel, time: `${singleRange[1]} - ${singleRange[2]}`, isOpen: true };
    }

    return { label: day.label, shortLabel: day.shortLabel, time: "Cerrado", isOpen: false };
  });
}

function getScheduleSummary(schedule: DisplayScheduleDay[]) {
  const groups: Array<{ start: DisplayScheduleDay; end: DisplayScheduleDay; time: string; isOpen: boolean }> = [];

  schedule.forEach((day) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.time === day.time && lastGroup.isOpen === day.isOpen) {
      lastGroup.end = day;
      return;
    }

    groups.push({ start: day, end: day, time: day.time, isOpen: day.isOpen });
  });

  return groups.map((group) => {
    const days = group.start === group.end
      ? group.start.shortLabel
      : `${group.start.shortLabel} - ${group.end.shortLabel}`;
    return `${days}: ${group.time}`;
  });
}

export function PlaceDetails() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState = location.state as DetailNavigationState | null;
  const backPath = navigationState?.from ?? "/app/discover";
  const studyPlace = studyPlaces.find((item) => item.id === placeId);
  const workPlace = workPlaces.find((item) => item.id === placeId);
  const initialPlace = studyPlace || workPlace;

  const [place, setPlace] = useState<any | AppPlace | null>(initialPlace ?? null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(!initialPlace && isSupabaseConfigured);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [issues, setIssues] = useState(placeIssues.filter((issue) => issue.placeId === placeId));
  const [issuesMessage, setIssuesMessage] = useState("");
  const [confirmingIssueIds, setConfirmingIssueIds] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [readyImageUrls, setReadyImageUrls] = useState<Set<string>>(new Set());
  const [displayedImage, setDisplayedImage] = useState<string | undefined>();
  const currentPlaceImages: string[] = useMemo(
    () => Array.isArray(place?.images) ? place.images : [],
    [place?.images],
  );
  const selectedImage = currentPlaceImages[activeImageIndex];

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
    if (!placeId) return;

    if (!isSupabaseConfigured) {
      setIssues(placeIssues.filter((issue) => issue.placeId === placeId));
      return;
    }

    let isMounted = true;
    setIssuesMessage("");

    listPlaceReports(placeId)
      .then((nextIssues) => {
        if (isMounted) setIssues(nextIssues);
      })
      .catch((error) => {
        if (isMounted) {
          setIssuesMessage(error instanceof Error ? error.message : "No se pudieron cargar los reportes.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [placeId]);

  useEffect(() => {
    setActiveImageIndex(0);
    setDisplayedImage(currentPlaceImages[0]);
  }, [place?.id]);

  useEffect(() => {
    const imageCount = currentPlaceImages.length;
    if (imageCount > 0 && activeImageIndex > imageCount - 1) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, currentPlaceImages]);

  useEffect(() => {
    let isMounted = true;

    setReadyImageUrls(new Set());
    setDisplayedImage(currentPlaceImages[0]);

    currentPlaceImages.forEach((imageUrl) => {
      void preloadCachedImage(imageUrl).then(() => {
        if (!isMounted) return;
        setReadyImageUrls((current) => {
          const nextReadyImageUrls = new Set(current);
          nextReadyImageUrls.add(imageUrl);
          return nextReadyImageUrls;
        });
      });
    });

    return () => {
      isMounted = false;
    };
  }, [place?.id, currentPlaceImages]);

  useEffect(() => {
    if (!selectedImage) {
      setDisplayedImage(undefined);
      return;
    }

    if (readyImageUrls.has(selectedImage) || !displayedImage) {
      setDisplayedImage(selectedImage);
    }
  }, [displayedImage, readyImageUrls, selectedImage]);

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

  const handleReport = async (type: IssueType, description: string) => {
    if (!placeId) return;

    if (isSupabaseConfigured) {
      const newIssue = await createPlaceReport(placeId, type, description);
      setIssues((currentIssues) => [newIssue, ...currentIssues]);
      setIssuesMessage("Reporte enviado. Gracias por ayudar a la comunidad.");
      return;
    }

    const newIssue = {
      id: `i${Date.now()}`,
      placeId,
      type,
      description,
      reportedBy: "Tu",
      timestamp: new Date(),
      upvotes: 0,
    };
    setIssues((currentIssues) => [newIssue, ...currentIssues]);
    setIssuesMessage("Reporte enviado. Gracias por ayudar a la comunidad.");
  };

  const handleUpvote = async (issueId: string) => {
    const currentIssue = issues.find((issue) => issue.id === issueId);
    if (!currentIssue || currentIssue.hasConfirmed || confirmingIssueIds.includes(issueId)) return;

    if (isSupabaseConfigured) {
      setConfirmingIssueIds((current) => [...current, issueId]);
      setIssuesMessage("");

      try {
        const nextUpvotes = await confirmPlaceReport(issueId);
        setIssues((currentIssues) =>
          currentIssues.map((issue) =>
            issue.id === issueId ? { ...issue, upvotes: nextUpvotes, hasConfirmed: true } : issue,
          ),
        );
        setIssuesMessage("Confirmacion guardada.");
      } catch (error) {
        setIssuesMessage(error instanceof Error ? error.message : "No se pudo confirmar el problema.");
      } finally {
        setConfirmingIssueIds((current) => current.filter((id) => id !== issueId));
      }
      return;
    }

    setIssues((currentIssues) =>
      currentIssues.map((issue) =>
        issue.id === issueId ? { ...issue, upvotes: issue.upvotes + 1, hasConfirmed: true } : issue,
      ),
    );
    setIssuesMessage("Confirmacion guardada.");
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
    const address = place?.address?.trim();
    const destination = address && address.length > 0 && address !== `${place?.lat},${place?.lng}`
      ? address
      : typeof place?.lat === "number" && typeof place?.lng === "number"
        ? `${place.lat},${place.lng}`
        : address ?? "";
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

  const schedule = useMemo(() => normalizeSchedule(place?.hours), [place?.hours]);
  const scheduleSummary = useMemo(() => getScheduleSummary(schedule), [schedule]);

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
  const placeImages = currentPlaceImages;
  const heroImage = displayedImage ?? selectedImage;
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
  const uniqueIncludedAmenities = includedAmenities.filter((amenity: any, index, amenities) => {
    const normalizedKey = String(amenity.key ?? amenity.name).toLowerCase();
    return amenities.findIndex((item: any) => String(item.key ?? item.name).toLowerCase() === normalizedKey) === index;
  });
  const capacityText = place.capacityMax || place.capacity
    ? `${place.capacityMin ?? 1} - ${place.capacityMax ?? place.capacity}`
    : "1 - 20";
  const hasValidPrice = Number.isFinite(place.pricePerHour) && place.pricePerHour > 0;
  const priceText = hasValidPrice ? `${formatPrice(place.pricePerHour)} / hora` : "Gratis";
  const websiteUrl = typeof place.websiteUrl === "string" ? place.websiteUrl.trim() : "";
  const weekdaySchedule = schedule.slice(0, 5);
  const weekendSchedule = schedule.slice(5);

  return (
    <div className="size-full flex flex-col bg-white">
      <div className="flex-1 overflow-auto pb-28">
        <div className="relative h-72 bg-gradient-to-br from-gray-300 to-gray-500">
          {heroImage ? (
            <CachedImage src={heroImage} alt={place.name} className="absolute inset-0 size-full object-cover" />
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
              <div className="flex shrink-0 items-center gap-2">
                {websiteUrl && (
                  <button
                    type="button"
                    onClick={() => window.open(websiteUrl, "_blank", "noopener,noreferrer")}
                    className="flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-[#4F46E5] transition-all hover:border-[#4F46E5] hover:bg-white"
                    aria-label="Abrir sitio web"
                  >
                    <ExternalLink className="size-3.5" />
                    Web
                  </button>
                )}
                <div className="flex items-center gap-1">
                  <Star className="size-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">{place.rating}</span>
                  <span className="text-sm text-gray-500">({place.reviews})</span>
                </div>
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
                <div className="space-y-0.5 text-xs text-gray-600 leading-tight">
                  {scheduleSummary.map((summary) => (
                    <p key={summary}>{summary}</p>
                  ))}
                </div>
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
              {uniqueIncludedAmenities.map((amenity: any, amenityIndex) => {
                const AmenityIcon = getAmenityIcon(amenity.key);
                const amenityLabel = getAmenityLabel(amenity.key, amenity.name);
                return (
                  <div key={`${amenity.key ?? amenity.name}-${amenityIndex}`} className="flex flex-col items-center">
                    <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                      <AmenityIcon className="size-6 text-gray-700" />
                    </div>
                    <p className="text-xs text-center text-gray-700 leading-tight">{amenityLabel}</p>
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

            {issuesMessage && (
              <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                {issuesMessage}
              </div>
            )}

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
                              disabled={issue.hasConfirmed || confirmingIssueIds.includes(issue.id)}
                              className={`flex items-center gap-1 text-xs ${
                                issue.hasConfirmed
                                  ? "text-[#4F46E5]"
                                  : "text-gray-600 hover:text-[#4F46E5]"
                              } disabled:cursor-default`}
                            >
                              <ThumbsUp className={`size-3 ${issue.hasConfirmed ? "fill-[#4F46E5]" : ""}`} />
                              <span>
                                {confirmingIssueIds.includes(issue.id)
                                  ? "Confirmando..."
                                  : `${issue.upvotes} personas confirman`}
                              </span>
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

          <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white shadow-sm">
                <Calendar className="size-5" />
              </div>
              <div>
                <h3 className="text-lg leading-tight" style={{ fontWeight: 700 }}>Horarios disponibles</h3>
                <p className="text-xs text-gray-500">{schedule.filter((day) => day.isOpen).length} dias abiertos</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_0.72fr]">
              <div className="rounded-lg border border-purple-100 bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4F46E5]">Lunes a viernes</p>
                <div className="divide-y divide-gray-100">
                  {weekdaySchedule.map((day) => (
                    <div key={day.shortLabel} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{day.label}</p>
                        <div className={`mt-0.5 flex items-center gap-1.5 text-xs ${day.isOpen ? "text-gray-500" : "text-gray-400"}`}>
                          <Clock className="size-3.5 shrink-0" />
                          <span>{day.time}</span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          day.isOpen
                            ? "bg-purple-100 text-[#4F46E5]"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {day.isOpen ? "Abierto" : "Cerrado"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-purple-100 bg-white p-3 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#4F46E5]">Fin de semana</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {weekendSchedule.map((day) => (
                    <div
                      key={day.shortLabel}
                      className={`rounded-lg border px-3 py-3 ${
                        day.isOpen
                          ? "border-purple-100 bg-purple-50/70"
                          : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-gray-900">{day.label}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            day.isOpen
                              ? "bg-white text-[#4F46E5]"
                              : "bg-white text-gray-500"
                          }`}
                        >
                          {day.isOpen ? "Abierto" : "Cerrado"}
                        </span>
                      </div>
                      <div className={`flex items-center gap-2 text-sm ${day.isOpen ? "text-gray-700" : "text-gray-400"}`}>
                        <Clock className="size-4 shrink-0" />
                        <span className="font-medium">{day.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
