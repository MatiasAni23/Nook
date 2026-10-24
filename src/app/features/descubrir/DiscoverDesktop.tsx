import { useState, type ReactNode } from "react";
import { AlertTriangle, ArrowUpRight, Bell, Building2, Map, MapPin, Plug, Search, Star, Wifi } from "lucide-react";
import { BrandLogo } from "../../components/BrandLogo";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { CachedImage } from "../../components/ui/cached-image";
import { Input } from "../../components/ui/input";
import { Skeleton } from "../../components/ui/skeleton";
import { placeIssues } from "../../data/mockData";
import { getFirstName, getInitials } from "../../services/currentUserService";
import type { AppPlace } from "../../services/placeService";
import { getPlaceTypeLabel, hasValidPlacePrice, placeMatchesTab } from "../mapa/placeFilters";
import { getDistanceInKm, type Coordinates } from "../mapa/proximity";
import { DiscoverBackground } from "./DiscoverBackground";

const editorialImage = new URL("../../../../assets/imagen_descubrir.png", import.meta.url).href;
const categories = [
  { key: "all", label: "Todos los espacios" },
  { key: "estudios", label: "Bibliotecas y cafés" },
  { key: "coworking", label: "Coworking" },
  { key: "reuniones", label: "Salas y oficinas" },
  { key: "parques", label: "Parques" },
];
const formatPrice = (price: number) => new Intl.NumberFormat("es-CL", {
  style: "currency", currency: "CLP", maximumFractionDigits: 0,
}).format(price);
const typeLabel = (type: string) => type === "cafe" ? "Café" : type === "meeting_room" ? "Sala de reuniones" : getPlaceTypeLabel(type);

function PlacePhoto({ place }: { place: AppPlace }) {
  const source = place.images[0];
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return source && source !== failedSource ? (
    <CachedImage src={source} alt={place.name} className="discover-desktop-photo" onError={() => setFailedSource(source)} />
  ) : (
    <span className="discover-desktop-photo-placeholder"><Building2 size={32} strokeWidth={1.3} aria-hidden="true" /><span>Sin foto disponible</span></span>
  );
}

function PlaceRating({ place }: { place: AppPlace }) {
  return place.rating > 0 && place.reviews > 0 ? (
    <span className="discover-desktop-rating"><Star size={14} aria-hidden="true" />{place.rating.toLocaleString("es-CL", { maximumFractionDigits: 1 })}<span>({place.reviews})</span></span>
  ) : <span className="discover-desktop-no-rating">Sin valoraciones</span>;
}

interface DiscoverDesktopProps {
  name: string;
  profileImageUrl: string | null;
  isWorker: boolean;
  unreadCount: number;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  places: AppPlace[];
  recommendedPlaces: AppPlace[];
  userLocation: Coordinates | null;
  placesError: string;
  locationNotice?: ReactNode;
  onOpenPlace: (place: AppPlace) => void;
  onOpenProfile: () => void;
  onOpenMap: () => void;
  onOpenNotifications: () => void;
}

export function DiscoverDesktop({ name, profileImageUrl, isWorker, unreadCount, searchTerm, onSearchChange, places, recommendedPlaces, userLocation, placesError, locationNotice, onOpenPlace, onOpenProfile, onOpenMap, onOpenNotifications }: DiscoverDesktopProps) {
  const [category, setCategory] = useState("all");
  const results = places.filter(place => placeMatchesTab(place, category));
  const isFiltered = Boolean(searchTerm.trim()) || category !== "all";

  return (
    <div className="discover-desktop">
      <header className="discover-desktop-header">
        <div className="discover-desktop-brand"><BrandLogo /><span>Descubrir</span></div>
        <div className="discover-desktop-account">
          <button type="button" className="discover-desktop-map-link" onClick={onOpenMap}><Map size={18} aria-hidden="true" />Ver mapa</button>
          <button type="button" className="discover-desktop-notifications" onClick={onOpenNotifications} aria-label="Ver notificaciones">
            <Bell size={20} aria-hidden="true" />{unreadCount > 0 && <span className="discover-desktop-unread" aria-label={unreadCount + " notificaciones sin leer"} />}
          </button>
          <button type="button" className="discover-desktop-profile" onClick={onOpenProfile} aria-label="Ir al perfil">
            <span>{getFirstName(name)}</span>
            <Avatar className="size-10"><AvatarImage src={profileImageUrl ?? undefined} alt="" /><AvatarFallback className="bg-[#EEE8FA] text-[#60458D]">{getInitials(name)}</AvatarFallback></Avatar>
          </button>
        </div>
      </header>

      <section className="discover-desktop-hero bg-gradient-to-br from-[#7C3AED] via-[#5B4AEE] to-[#4F46E5]" aria-labelledby="discover-desktop-title">
        <DiscoverBackground />
        <div className="discover-desktop-intro">
          <p className="discover-desktop-greeting">Hola, {getFirstName(name)}</p>
          <h1 id="discover-desktop-title">{isWorker ? "Encuentra tu lugar para trabajar." : "Encuentra tu lugar para estudiar."}</h1>
          <p className="discover-desktop-description">Explora espacios, compara lo que ofrecen y elige dónde pasar tu día.</p>
          <div className="discover-desktop-search">
            <label htmlFor="discover-desktop-search" className="sr-only">Buscar lugares, zonas o servicios</label>
            <Search size={20} aria-hidden="true" />
            <Input id="discover-desktop-search" type="search" placeholder="Busca espacios, zonas o servicios…" value={searchTerm} onChange={event => onSearchChange(event.target.value)} />
          </div>
        </div>
        <div className="discover-desktop-hero-image"><CachedImage src={editorialImage} alt="" className="discover-desktop-photo" /></div>
      </section>

      {placesError && <p className="discover-desktop-error" role="alert">{placesError}</p>}
      {locationNotice}

      {!isFiltered && recommendedPlaces.length > 0 && (
        <section className="discover-desktop-recommendations" aria-labelledby="discover-recommended-heading">
          <div className="discover-desktop-section-heading"><h2 id="discover-recommended-heading">Recomendados para ti</h2><span>Una selección para explorar</span></div>
          <div className="discover-desktop-recommended-grid">
            {recommendedPlaces.slice(0, 3).map(place => (
              <button key={place.id} type="button" className="discover-desktop-recommended-place" onClick={() => onOpenPlace(place)}>
                <span className="discover-desktop-recommended-image"><PlacePhoto place={place} /></span>
                <span className="discover-desktop-recommended-info"><span className="discover-desktop-place-name">{place.name}</span><span className="discover-desktop-location">{place.zone || place.address || "Ubicación por confirmar"}</span><PlaceRating place={place} /></span>
                <ArrowUpRight size={17} className="discover-desktop-recommended-arrow" aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="discover-desktop-results" aria-labelledby="discover-results-heading">
        <div className="discover-desktop-section-heading">
          <div><h2 id="discover-results-heading">{isFiltered ? "Resultados de tu búsqueda" : userLocation ? "Espacios cerca de ti" : "Explora los espacios"}</h2><p aria-live="polite">{results.length} {results.length === 1 ? "lugar disponible" : "lugares disponibles"}{!isFiltered && userLocation ? " · Ordenados por cercanía" : ""}</p></div>
          {isFiltered && <button type="button" className="discover-desktop-clear" onClick={() => { setCategory("all"); onSearchChange(""); }}>Limpiar filtros</button>}
        </div>
        <div className="discover-desktop-categories" role="group" aria-label="Tipo de espacio">
          {categories.map(item => <button key={item.key} type="button" aria-pressed={category === item.key} onClick={() => setCategory(item.key)}>{item.label}</button>)}
        </div>
        {results.length === 0 ? (
          <div className="discover-desktop-empty"><Search size={28} aria-hidden="true" /><h3>No encontramos lugares con estos filtros</h3><p>Prueba con otro nombre, zona o tipo de espacio.</p><button type="button" onClick={() => { setCategory("all"); onSearchChange(""); }}>Ver todos los espacios</button></div>
        ) : (
          <div className="discover-desktop-places-grid">
            {results.map(place => {
              const reportCount = placeIssues.filter(issue => issue.placeId === place.id).length;
              const distance = userLocation ? getDistanceInKm(userLocation, place) : null;
              return (
                <button key={place.id} type="button" className="discover-desktop-place-card" onClick={() => onOpenPlace(place)}>
                  <span className="discover-desktop-place-image"><PlacePhoto place={place} /><span className="discover-desktop-place-type">{typeLabel(place.type)}{place.isPromoted && <span> · Destacado</span>}</span></span>
                  <span className="discover-desktop-place-info">
                    <span className="discover-desktop-place-title"><span className="discover-desktop-place-name">{place.name}</span><PlaceRating place={place} /></span>
                    <span className="discover-desktop-location"><MapPin size={14} aria-hidden="true" />{place.zone || place.address || "Ubicación por confirmar"}{distance !== null && Number.isFinite(distance) && <span> · {distance.toFixed(1)} km</span>}</span>
                    <span className="discover-desktop-place-footer">
                      <span className="discover-desktop-services">{place.wifi && <span><Wifi size={14} aria-hidden="true" />WiFi</span>}{place.outlets && <span><Plug size={14} aria-hidden="true" />Enchufes</span>}</span>
                      <span className="discover-desktop-price">{hasValidPlacePrice(place) ? <>{formatPrice(place.pricePerHour!)}<span> / hora</span></> : "Gratis"}</span>
                    </span>
                    {reportCount > 0 && <span className="discover-desktop-report"><AlertTriangle size={14} aria-hidden="true" />{reportCount} {reportCount === 1 ? "reporte de la comunidad" : "reportes de la comunidad"}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export function DiscoverDesktopSkeleton() {
  return (
    <div className="discover-desktop" aria-busy="true" aria-label="Cargando Descubrir">
      <div className="discover-desktop-header"><Skeleton className="h-12 w-36" /><Skeleton className="h-10 w-40 rounded-full" /></div>
      <div className="discover-desktop-hero discover-desktop-skeleton-hero bg-gradient-to-br from-[#7C3AED] via-[#5B4AEE] to-[#4F46E5]"><div className="discover-desktop-intro"><Skeleton className="h-5 w-28 bg-white/20" /><Skeleton className="mt-4 h-20 w-full bg-white/20" /><Skeleton className="mt-6 h-14 w-full bg-white/20" /></div></div>
      <div className="discover-desktop-recommendations"><Skeleton className="mb-5 h-6 w-56" /><div className="discover-desktop-recommended-grid">{[0, 1, 2].map(index => <Skeleton key={index} className="h-24 rounded-xl" />)}</div></div>
      <div className="discover-desktop-results"><Skeleton className="mb-6 h-6 w-48" /><Skeleton className="mb-6 h-10 w-full" /><div className="discover-desktop-places-grid">{[0, 1, 2, 3, 4, 5].map(index => <div key={index}><Skeleton className="aspect-[16/10] w-full rounded-xl" /><Skeleton className="mt-4 h-5 w-4/5" /><Skeleton className="mt-3 h-4 w-3/5" /></div>)}</div></div>
    </div>
  );
}
