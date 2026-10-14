import { getSafeWebsiteUrl } from "../../lib/externalUrl";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Briefcase,
  Clock,
  Coffee,
  ExternalLink,
  Lightbulb,
  Lock,
  MapPin,
  MessageCircle,
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
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import { CachedImage, preloadCachedImage } from "../../components/ui/cached-image";
import { ReportIssueModal } from "../shared/ReportIssueModal";
import { getIssueLabel, placeIssues, studyPlaces, type IssueType, workPlaces } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  getIsCurrentUserFavoritePlace,
  setCurrentUserFavoritePlace,
} from "../../services/currentUserService";
import { getPlaceById, type AppPlace } from "../../services/placeService";
import { trackPlaceAnalyticsEvent } from "../../services/placeAnalyticsService";
import { startPlaceContact } from "../../services/placeContactService";
import { sendChatMessage } from "../../services/chatService";
import { useCurrentUser } from "../../context/CurrentUserContext";
import {
  confirmPlaceReport,
  createPlaceReport,
  listPlaceReports,
} from "../../services/placeReportService";
import type { DetailNavigationState } from "./navigationState";
import { PlaceGallery } from "./PlaceGallery";
import { getPlaceTypeLabel } from "./placeFilters";
import { ReservationModal } from "./ReservationModal";
import { getPlaceReservationsEnabled } from "../../services/reservationService";
import "./place-details.css";

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
  { label: "Miércoles", shortLabel: "Mie", aliases: ["Mie", "Miercoles", "Miércoles"] },
  { label: "Jueves", shortLabel: "Jue", aliases: ["Jue", "Jueves"] },
  { label: "Viernes", shortLabel: "Vie", aliases: ["Vie", "Viernes"] },
  { label: "Sábado", shortLabel: "Sab", aliases: ["Sab", "Sabado", "Sábado"] },
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

export function PlaceDetails() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const location = useLocation();
  const [isCompactLayout, setIsCompactLayout] = useState(() => window.matchMedia("(max-width: 899px)").matches);
  const reportsSectionRef = useRef<HTMLElement>(null);
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
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [reservationsEnabled, setReservationsEnabled] = useState(false);
  const [reservationSpace, setReservationSpace] = useState<string | null>(null);
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);
  const [contactMessageStatus, setContactMessageStatus] = useState("");
  const trackedDetailIdsRef = useRef(new Set<string>());
  const currentPlaceImages: string[] = useMemo(
    () => Array.isArray(place?.images) ? place.images : [],
    [place?.images],
  );
  const selectedImage = currentPlaceImages[activeImageIndex];

  useEffect(() => {
    let active = true;
    setReservationsEnabled(false); setReservationSpace(null);
    if (isSupabaseConfigured && placeId && currentUser?.id) {
      void getPlaceReservationsEnabled(placeId).then((enabled) => { if (active) setReservationsEnabled(enabled); })
        .catch(() => { /* Keep the pilot hidden until its server configuration is available. */ });
    }
    return () => { active = false; };
  }, [placeId, currentUser?.id]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 899px)");
    const updateLayout = () => setIsCompactLayout(mediaQuery.matches);
    mediaQuery.addEventListener("change", updateLayout);
    updateLayout();
    return () => mediaQuery.removeEventListener("change", updateLayout);
  }, []);

  const handlePlaceContact = async () => {
    if (!placeId || !currentUser?.id || !contactMessage.trim()) return;
    setIsSendingContact(true);
    setContactMessageStatus("");
    try {
      const result = await startPlaceContact(placeId, contactMessage);
      if (result.status === "active" && result.delegateUserId) {
        await sendChatMessage({
          senderId: currentUser.id,
          receiverId: result.delegateUserId,
          message: `[${place.name}] ${contactMessage.trim()}`,
        });
        setShowContactDialog(false);
        setContactMessage("");
        navigate(`/app/chat/${result.delegateUserId}`);
      } else {
        setContactMessageStatus("Tu mensaje quedó en espera. Se entregará al delegado cuando sea asignado.");
        setContactMessage("");
      }
    } catch (error) {
      setContactMessageStatus(error instanceof Error ? error.message : "No se pudo enviar el mensaje.");
    } finally {
      setIsSendingContact(false);
    }
  };

  useEffect(() => {
    if (initialPlace) {
      setPlace(initialPlace);
      setIsLoadingPlace(false);
      return;
    }
    if (!placeId || !isSupabaseConfigured) {
      setPlace(null);
      setIsLoadingPlace(false);
      return;
    }

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
    if (!isSupabaseConfigured || !place?.id || trackedDetailIdsRef.current.has(place.id)) return;
    trackedDetailIdsRef.current.add(place.id);
    void trackPlaceAnalyticsEvent(place.id, "details_view");
  }, [place?.id]);

  useEffect(() => {
    let isMounted = true;
    setIsFavorite(false);

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
    if (value == null || !Number.isFinite(value)) return <span className="place-muted">Sin información</span>;
    const filledDots = Math.max(0, Math.min(5, Math.round(value)));

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
      : availableExplicitAmenities;
  const uniqueIncludedAmenities = includedAmenities.filter((amenity: any, index, amenities) => {
    const normalizedKey = String(amenity.key ?? amenity.name).toLowerCase();
    return amenities.findIndex((item: any) => String(item.key ?? item.name).toLowerCase() === normalizedKey) === index;
  });
  const maximumCapacity = place.capacityMax || place.capacity;
  const capacityText = maximumCapacity
    ? place.capacityMin ? `${place.capacityMin} – ${maximumCapacity} personas` : `Hasta ${maximumCapacity} personas`
    : "Sin información";
  const hasValidPrice = Number.isFinite(place.pricePerHour) && place.pricePerHour > 0;
  const priceText = hasValidPrice ? formatPrice(place.pricePerHour) : "Gratis";
  const websiteUrl = getSafeWebsiteUrl(place.websiteUrl);
  const locationText = place.zone || place.address || "Ver ubicación";
  const hasSchedule = Boolean(String(place.hours ?? "").trim());

  const placeHeading = (
    <header className="place-details-heading">
      <span className="place-type-label">{getPlaceTypeLabel(place.type)}</span>
      <h1>{place.name}</h1>
      <div className="place-heading-meta">
        <span><MapPin size={15} aria-hidden="true" />{locationText}</span>
        {place.rating > 0 && place.reviews > 0 ? (
          <span className="place-rating"><Star size={14} aria-hidden="true" />{place.rating.toLocaleString("es-CL", { maximumFractionDigits: 1 })}<span>· {place.reviews} valoraciones</span></span>
        ) : <span>Sin valoraciones todavía</span>}
        {issues.length > 0 && (
          <button
            type="button"
            className="place-report-notice"
            onClick={() => {
              reportsSectionRef.current?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
                block: "start",
              });
              reportsSectionRef.current?.focus({ preventScroll: true });
            }}
          >
            <AlertTriangle size={14} aria-hidden="true" />
            {issues.length} {issues.length === 1 ? "reporte" : "reportes"} · Ver avisos
          </button>
        )}
      </div>
    </header>
  );

  const placeDescription = (
    place.description && (
      <section className="place-section" aria-labelledby="place-description-heading">
        <h2 id="place-description-heading">Sobre este lugar</h2>
        <p className="place-description">{place.description}</p>
      </section>
    )
  );

  const placeVisitPanel = (
    <section className="place-visit-panel">
      <span className="place-panel-label">{hasValidPrice ? "Precio de acceso" : "Acceso al lugar"}</span>
      <p className="place-access-price">{priceText}{hasValidPrice && <span> / hora</span>}</p>
      <div className="place-capacity"><Users size={16} aria-hidden="true" /><span>{capacityText}</span></div>
      <div className="place-visit-location">
        <MapPin size={18} aria-hidden="true" />
        <div><h2>Ubicación</h2><p>{place.address || place.zone || "Dirección no informada"}</p>{place.address && place.zone && <span>{place.zone}</span>}</div>
      </div>
      <button type="button" className="place-primary-action" onClick={handleOpenDirections}><ExternalLink size={16} aria-hidden="true" />Cómo llegar</button>
      {reservationsEnabled && <button type="button" className="place-secondary-action" onClick={() => setReservationSpace("")}><Calendar size={16} aria-hidden="true" />Reservar · Prueba sin pago</button>}
      {currentUser?.role === "worker" && (
        <button type="button" className="place-secondary-action" onClick={() => { setContactMessageStatus(""); setShowContactDialog(true); }}><MessageCircle size={16} aria-hidden="true" />Contactar al lugar</button>
      )}
      {websiteUrl && (
        <a className="place-website-link" href={websiteUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" />Visitar sitio web</a>
      )}
    </section>
  );

  const placeSchedule = (
    <section className="place-schedule-panel" aria-labelledby="place-schedule-heading">
      <div className="place-schedule-heading">
        <Calendar size={18} aria-hidden="true" />
        <h2 id="place-schedule-heading">Horarios de atención</h2>
      </div>
      {hasSchedule ? (
        <div className="place-schedule-days">
          {schedule.map((day) => (
            <div key={day.shortLabel} className={day.isOpen ? "" : "is-closed"}><span>{day.label}</span><span>{day.time}</span></div>
          ))}
        </div>
      ) : <p className="place-muted">El lugar aún no ha indicado sus horarios.</p>}
    </section>
  );

  const placeInformation = (
    <>
      <section className="place-section" aria-labelledby="place-amenities-heading">
        <h2 id="place-amenities-heading">Servicios incluidos</h2>
        {uniqueIncludedAmenities.length > 0 ? (
          <div className="place-amenities">
            {uniqueIncludedAmenities.map((amenity: { key?: string; name?: string }, index: number) => {
              const AmenityIcon = getAmenityIcon(amenity.key ?? "");
              return (
                <div key={(amenity.key ?? amenity.name) + "-" + index} className="place-amenity">
                  <AmenityIcon size={18} strokeWidth={1.7} aria-hidden="true" />
                  <span>{getAmenityLabel(amenity.key, amenity.name)}</span>
                </div>
              );
            })}
          </div>
        ) : <p className="place-muted">El lugar aún no ha indicado sus servicios.</p>}
      </section>

      <section className="place-section" aria-labelledby="place-atmosphere-heading">
        <h2 id="place-atmosphere-heading">Ambiente</h2>
        <div className="place-atmosphere">
          <div><span><Volume2 size={18} aria-hidden="true" />Silencio</span>{renderRatingDots(place.quietness)}</div>
          <div><span><Lightbulb size={18} aria-hidden="true" />Iluminación</span>{renderRatingDots(place.lighting)}</div>
        </div>
      </section>

      {Array.isArray(place.spaces) && place.spaces.length > 0 && (
        <section className="place-section" aria-labelledby="place-spaces-heading">
          <h2 id="place-spaces-heading">Espacios del lugar</h2>
          <div className="place-spaces-grid">
            {place.spaces.map((space: AppPlace["spaces"][number]) => (
              <article key={space.id} className="place-space">
                <div className="place-space-image">
                  {space.imageUrl ? <CachedImage src={space.imageUrl} alt={space.name} className="size-full object-cover" /> : <Briefcase size={28} strokeWidth={1.4} aria-hidden="true" />}
                </div>
                <div className="place-space-info">
                  <h3>{space.name}</h3>
                  <p><Users size={14} aria-hidden="true" />{space.capacity} personas</p>
                  <span>{space.pricePerHour > 0 ? formatPrice(space.pricePerHour) + " / " + (space.billingUnit === "day" ? "día" : space.billingUnit === "week" ? "semana" : space.billingUnit === "month" ? "mes" : "hora") : "Gratis"}</span>
                  {reservationsEnabled && <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => setReservationSpace(space.id)}>Reservar este espacio</Button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section id="place-reports" ref={reportsSectionRef} tabIndex={-1} className="place-section" aria-labelledby="place-reports-heading">
        <div className="place-section-header">
          <h2 id="place-reports-heading">Reportes de la comunidad</h2>
          <button type="button" className="place-text-button" onClick={() => setShowReportModal(true)}>Reportar problema</button>
        </div>
        {issuesMessage && <p className="place-feedback" role="status">{issuesMessage}</p>}
        {issues.length === 0 ? (
          <p className="place-muted">No hay reportes disponibles para este lugar.</p>
        ) : (
          <div className="place-reports-list">
            {issues.slice(0, 3).map((issue) => {
              const minutesAgo = Math.max(0, Math.floor((Date.now() - issue.timestamp.getTime()) / 60000));
              const timeAgo = minutesAgo < 60 ? "Hace " + minutesAgo + " min" : "Hace " + Math.floor(minutesAgo / 60) + " h";
              return (
                <article key={issue.id} className="place-report">
                  <span className="place-report-icon" aria-hidden="true"><AlertTriangle size={18} /></span>
                  <div>
                    <div className="place-report-heading"><h3>{getIssueLabel(issue.type)}</h3><span>{timeAgo}</span></div>
                    {issue.description && <p>{issue.description}</p>}
                    <button
                      type="button"
                      onClick={() => handleUpvote(issue.id)}
                      disabled={issue.hasConfirmed || confirmingIssueIds.includes(issue.id)}
                      className="place-report-confirm"
                    >
                      <ThumbsUp size={13} aria-hidden="true" />
                      {confirmingIssueIds.includes(issue.id) ? "Confirmando…" : issue.upvotes + " personas confirman"}
                      {issue.hasConfirmed && " · Confirmado"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );

  return (
    <div className="place-details">
      <div className="place-details-scroll">
        <div className="place-details-container">
          <PlaceGallery
            key={place.id}
            name={place.name}
            images={placeImages}
            displayedImage={heroImage}
            activeIndex={activeImageIndex}
            isCompactLayout={isCompactLayout}
            onSelect={setActiveImageIndex}
            onBack={() => navigate(backPath)}
            isFavorite={isFavorite}
            isSavingFavorite={isSavingFavorite}
            onToggleFavorite={handleToggleFavorite}
          />

          <div className="place-content-grid">
            {placeHeading}
            {isCompactLayout ? (
              <>
                {placeVisitPanel}
                {placeDescription}
                {placeSchedule}
                <div className="place-main-content">{placeInformation}</div>
              </>
            ) : (
              <>
                <div className="place-main-content">
                  {placeDescription}
                  {placeInformation}
                </div>
                <aside className="place-sidebar" aria-label="Información para visitar el lugar">
                  {placeVisitPanel}
                  {placeSchedule}
                </aside>
              </>
            )}
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
      {reservationSpace !== null && placeId && <ReservationModal key={placeId + reservationSpace} placeId={placeId} placeName={String(place.name)} spaces={place.spaces ?? []} initialSpaceId={reservationSpace || undefined} onClose={() => setReservationSpace(null)} />}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contactar a {place.name}</DialogTitle>
            <DialogDescription>Tu mensaje será enviado al delegado del lugar. Si aún no hay uno asignado, quedará en espera.</DialogDescription>
          </DialogHeader>
          {contactMessageStatus && <p className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">{contactMessageStatus}</p>}
          <Textarea value={contactMessage} onChange={(event) => setContactMessage(event.target.value)} placeholder="Escribe tu consulta..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContactDialog(false)} disabled={isSendingContact}>Cancelar</Button>
            <Button onClick={handlePlaceContact} disabled={!contactMessage.trim() || isSendingContact}>{isSendingContact ? "Enviando..." : "Enviar mensaje"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
