import { demoPlaces } from "../../data/demoPlaces";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  APIProvider,
  Map,
  Marker,
  useMap,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import {
  BookOpen, BriefcaseBusiness, Building2, ChevronDown, Coffee, Crown,
  LocateFixed, MapPin, Search, Star, Trees, Users, X,
} from "lucide-react";
import { Input } from "../../components/ui/input";
import { CachedImage } from "../../components/ui/cached-image";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getCachedPlaces, listPlaces, type AppPlace } from "../../services/placeService";
import { trackPlaceAnalyticsEvents } from "../../services/placeAnalyticsService";
import { hasValidPlacePrice, placeMatchesSearch, placeMatchesTab } from "./placeFilters";
import { getDetailNavigationState } from "./navigationState";
import { getPlacePinAsset } from "./placePinAssets";
import { cleanMapStyles } from "./mapStyles";
import { sortPlacesByDistance } from "./proximity";
import "./map.css";

// Configuracion base del mapa y del rol activo.
const getUserRole = (): 'student' | 'worker' | 'admin' => {
  return (window as any).__userRole || 'student';
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const googleGeolocationUrl = "https://www.googleapis.com/geolocation/v1/geolocate";
const defaultMapCenter = { lat: -33.4569, lng: -70.6483 };

type UserLocationSource = "browser" | "google";
type Coordinates = typeof defaultMapCenter;
type SavedMapCamera = {
  center: Coordinates;
  zoom: number;
};
type RecenterRequest = {
  center: Coordinates;
  id: number;
};

let savedMapCamera: SavedMapCamera | null = null;

const createSvgMarkerUrl = (svg: string) => {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

// Permite recentrar Google Maps desde cambios de estado en React.
function RecenterMap({ request }: { request: RecenterRequest | null }) {
  const map = useMap();

  useEffect(() => {
    if (!request) return;
    map?.panTo(request.center);
  }, [request?.id, map]);

  return null;
}

function PlaceMapMarker({
  place,
  onClick,
}: {
  place: Pick<AppPlace, "lat" | "lng" | "type" | "name">;
  onClick: () => void;
}) {
  const map = useMap();
  const canBuildIcon =
    Boolean(map) &&
    typeof google !== "undefined" &&
    typeof google.maps?.Size === "function" &&
    typeof google.maps?.Point === "function";

  if (!canBuildIcon) return null;

  return (
    <Marker
      position={{ lat: place.lat, lng: place.lng }}
      title={place.name}
      onClick={onClick}
      icon={{
        url: getPlacePinAsset(place.type),
        scaledSize: new google.maps.Size(50, 50),
        anchor: new google.maps.Point(25, 50),
      }}
    />
  );
}

export function MapView() {
  const navigate = useNavigate();
  const userRole = getUserRole();

  // Filtros, busqueda y datos de lugares.
  const [activeTab, setActiveTab] = useState('todos');
  const [searchTerm, setSearchTerm] = useState("");
  const [dbPlaces, setDbPlaces] = useState<AppPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState("");

  // Ubicacion del usuario y control de recentrado del mapa.
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasResolvedUserLocation, setHasResolvedUserLocation] = useState(false);
  const [userLocationSource, setUserLocationSource] = useState<UserLocationSource | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [userRecenterRequest, setUserRecenterRequest] = useState<RecenterRequest | null>(null);
  const [fallbackMapCenter, setFallbackMapCenter] = useState<Coordinates>(
    savedMapCamera?.center ?? defaultMapCenter,
  );

  // Estado tactil del bottom sheet.
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(true);
  const [startY, setStartY] = useState(0);
  const hasRequestedGoogleFallbackRef = useRef(false);
  const isDraggingSheetRef = useRef(false);
  const trackedHomeImpressionsRef = useRef(new Set<string>());

  // Normaliza ubicaciones obtenidas por navegador o por Google Geolocation.
  const applyUserCoordinates = (coords: Coordinates, source: UserLocationSource, shouldCenterMap = false) => {
    setUserLocation(coords);
    setUserLocationSource(source);
    setHasResolvedUserLocation(true);
    setLocationError("");
    setIsLocatingUser(false);

    if (shouldCenterMap) {
      savedMapCamera = {
        center: coords,
        zoom: savedMapCamera?.zoom ?? 15,
      };
      setFallbackMapCenter(coords);
      setUserRecenterRequest({ center: coords, id: Date.now() });
    }
  };

  const applyUserPosition = (position: GeolocationPosition, shouldCenterMap = false) => {
    hasRequestedGoogleFallbackRef.current = false;
    applyUserCoordinates(
      {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      },
      "browser",
      shouldCenterMap,
    );
  };

  // Fallback aproximado cuando el navegador no entrega ubicacion precisa.
  const requestGoogleApproximateLocation = async (shouldCenterMap = false) => {
    if (!googleMapsApiKey) {
      setLocationError("No se pudo obtener tu ubicacion.");
      setIsLocatingUser(false);
      return;
    }

    try {
      const response = await fetch(`${googleGeolocationUrl}?key=${googleMapsApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ considerIp: true }),
      });

      if (!response.ok) {
        throw new Error("Google Geolocation no disponible.");
      }

      const data = await response.json();
      const lat = data?.location?.lat;
      const lng = data?.location?.lng;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error("Google Geolocation no devolvio coordenadas.");
      }

      applyUserCoordinates({ lat, lng }, "google", shouldCenterMap);
    } catch {
      setHasResolvedUserLocation(false);
      setUserLocationSource(null);
      setIsLocatingUser(false);
      setLocationError("No se pudo obtener tu ubicacion. Activa permisos del navegador o Geolocation API en GCP.");
    }
  };

  const handleLocationError = (
    error?: GeolocationPositionError,
    allowGoogleFallback = true,
    shouldCenterFallback = false,
  ) => {
    if (allowGoogleFallback && !hasRequestedGoogleFallbackRef.current) {
      hasRequestedGoogleFallbackRef.current = true;
      requestGoogleApproximateLocation(shouldCenterFallback);
      return;
    }

    setUserLocationSource(null);
    setHasResolvedUserLocation(false);
    setIsLocatingUser(false);

    if (error?.code === 1) {
      setLocationError("Permiso de ubicacion bloqueado en el navegador.");
      return;
    }

    setLocationError("No se pudo obtener tu ubicacion.");
  };

  // Solicitud manual desde el boton de localizar.
  const requestUserLocation = () => {
    hasRequestedGoogleFallbackRef.current = false;

    if (!navigator.geolocation) {
      setIsLocatingUser(true);
      requestGoogleApproximateLocation(true);
      return;
    }

    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (position) => applyUserPosition(position, true),
      (error) => handleLocationError(error, true, true),
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 12_000,
      },
    );
  };

  // Mantiene actualizada la ubicacion mientras la vista esta montada.
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsLocatingUser(true);
      requestGoogleApproximateLocation();
      return;
    }

    setIsLocatingUser(true);

    const watchId = navigator.geolocation.watchPosition(
      applyUserPosition,
      (error) => handleLocationError(error),
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      },
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Carga lugares reales desde Supabase; si no esta configurado, se usan mocks.
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    const cachedPlaces = getCachedPlaces();
    if (cachedPlaces) setDbPlaces(cachedPlaces);
    setIsLoadingPlaces(!cachedPlaces);
    setPlacesError("");

    listPlaces()
      .then((places) => {
        if (isMounted) setDbPlaces(places);
      })
      .catch((error) => {
        if (isMounted) {
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

  const mockPlaces = demoPlaces;
  const basePlaces = isSupabaseConfigured ? dbPlaces : mockPlaces;
  const filteredPlaces = basePlaces.filter((place) => {
    return placeMatchesSearch(place, searchTerm) && placeMatchesTab(place, activeTab);
  });
  // Los pines y el carrusel usan el mismo orden de cercanía.
  const places = sortPlacesByDistance(filteredPlaces, userLocation);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const visiblePlaceIds = places
      .slice(0, 5)
      .map((place) => place.id)
      .filter((placeId) => !trackedHomeImpressionsRef.current.has(placeId));

    if (visiblePlaceIds.length === 0) return;
    visiblePlaceIds.forEach((placeId) => trackedHomeImpressionsRef.current.add(placeId));
    void trackPlaceAnalyticsEvents(visiblePlaceIds, "home_impression");
  }, [places]);

  // Opciones visibles en el filtro horizontal.
  const tabs = [
    { id: 'todos', label: 'Todos', icon: MapPin },
    { id: 'cowork', label: 'Cowork', icon: BriefcaseBusiness },
    { id: 'estudios', label: 'Estudio', icon: BookOpen },
    { id: 'reuniones', label: 'Reuniones', icon: Users },
    { id: 'parques', label: 'Parques', icon: Trees },
  ];

  // Helpers visuales compartidos por mapa, fallback y tarjetas.
  const getPlaceIcon = (type: string) => {
    switch (type) {
      // Lugares para estudiantes
      case 'library': return BookOpen;
      case 'cafe': return Coffee;
      case 'coworking': return BriefcaseBusiness;
      case 'park': return Trees;
      // Lugares para trabajadores
      case 'office': return Building2;
      case 'meeting_room': return Users;
      case 'private_office': return Building2;
      default: return MapPin;
    }
  };

  const getUserMarkerIcon = () => {
    return createSvgMarkerUrl(`
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="30" fill="#c4b5fd" fill-opacity="0.45"/>
          <circle cx="32" cy="32" r="8" fill="#7c3aed" stroke="#ffffff" stroke-width="4"/>
        </svg>
      `);
  };

  const hasPrice = (place: AppPlace) => {
    return hasValidPlacePrice(place);
  };

  const getZoneName = (name: string) => {
    if (name.includes('Providencia') || name.includes('Literario')) return 'Providencia';
    if (name.includes('Las Condes') || name.includes('PUC')) return 'Las Condes';
    if (name.includes('Vitacura')) return 'Vitacura';
    return 'Centro';
  };

  const getPlaceZoneLabel = (place: AppPlace) => {
    return place.zone || place.address || getZoneName(place.name);
  };

  // Gestos para expandir o colapsar la bandeja inferior.
  const handleTouchStart = (e: React.TouchEvent) => {
    setStartY(e.touches[0].clientY);
    isDraggingSheetRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 50 && isBottomSheetExpanded) {
      isDraggingSheetRef.current = true;
      setIsBottomSheetExpanded(false);
    } else if (diff < -50 && !isBottomSheetExpanded) {
      isDraggingSheetRef.current = true;
      setIsBottomSheetExpanded(true);
    }
  };

  const handleSheetHeaderClick = () => {
    if (isDraggingSheetRef.current) {
      isDraggingSheetRef.current = false;
      return;
    }

    setIsBottomSheetExpanded((expanded) => !expanded);
  };

  // Guarda camara para volver al mapa sin perder posicion y zoom.
  const handleGoogleCameraChanged = (event: MapCameraChangedEvent) => {
    const { center, zoom } = event.detail;

    if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng) || !Number.isFinite(zoom)) {
      return;
    }

    savedMapCamera = {
      center: {
        lat: center.lat,
        lng: center.lng,
      },
      zoom,
    };
  };

  const initialMapCenter = savedMapCamera?.center ?? defaultMapCenter;
  const initialMapZoom = savedMapCamera?.zoom ?? 13;

  return (
    <div className="map-page">
      <header className="map-toolbar">
        <h1 className="sr-only">Mapa de lugares</h1>
        <div className="map-search">
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <label htmlFor="map-place-search" className="sr-only">Buscar lugares por nombre o ubicación</label>
          <Input
            id="map-place-search"
            type="search"
            placeholder="Busca un lugar o una zona"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="map-search-input"
          />
          {searchTerm && (
            <button type="button" className="map-search-clear" onClick={() => setSearchTerm("")} aria-label="Limpiar búsqueda">
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="map-toolbar-filters">
          <div className="map-categories" role="group" aria-label="Filtrar lugares por categoría">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={"map-category" + (activeTab === id ? " is-active" : "")}
                aria-pressed={activeTab === id}
              >
                <Icon className="size-3.5" strokeWidth={1.8} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          <span className="map-result-count" role="status">
            {isLoadingPlaces ? "Buscando lugares…" : places.length + (places.length === 1 ? " lugar" : " lugares")}
          </span>
        </div>

        {placesError && (
          <p className="map-places-error" role="alert">
            {placesError}
            {dbPlaces.length > 0 && " Se muestran los últimos lugares disponibles."}
          </p>
        )}
      </header>

      <div className="map-canvas" role="region" aria-label="Mapa de lugares">
        {googleMapsApiKey ? (
          <APIProvider apiKey={googleMapsApiKey}>
            <Map
              defaultCenter={initialMapCenter}
              defaultZoom={initialMapZoom}
              disableDefaultUI
              clickableIcons={false}
              gestureHandling="greedy"
              styles={cleanMapStyles}
              className="absolute inset-0"
              onCameraChanged={handleGoogleCameraChanged}
            >
              <RecenterMap request={userRecenterRequest} />
              {userLocation && (
                <Marker position={userLocation} icon={getUserMarkerIcon()} zIndex={30} />
              )}
              {places.map((place) => {
                const placeUrl = userRole === 'worker' ? "/app/workplace/" + place.id : "/app/place/" + place.id;
                return (
                  <PlaceMapMarker
                    key={place.id}
                    place={place}
                    onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })}
                  />
                );
              })}
            </Map>
          </APIProvider>
        ) : (
          <div className="absolute inset-0">
            <div className="map-demo-notice">
              <MapPin className="size-3.5" aria-hidden="true" />
              Vista de ejemplo · Mapa no disponible
            </div>
            {userLocation && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="size-16 rounded-full bg-purple-200/50 flex items-center justify-center">
                  <div className="size-4 bg-purple-600 rounded-full border-2 border-white shadow-sm" />
                </div>
              </div>
            )}
            {places.map((place) => {
              const offsetX = (place.lng - fallbackMapCenter.lng) * 3000;
              const offsetY = (fallbackMapCenter.lat - place.lat) * 3000;
              const placeUrl = userRole === 'worker' ? "/app/workplace/" + place.id : "/app/place/" + place.id;
              return (
                <button
                  key={place.id}
                  type="button"
                  className="absolute z-0 transition-transform hover:scale-110"
                  style={{
                    left: "calc(50% + " + offsetX + "px)",
                    top: "calc(50% + " + offsetY + "px)",
                    transform: 'translate(-50%, -100%)',
                  }}
                  aria-label={"Ver " + place.name}
                  onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })}
                >
                  <img
                    src={getPlacePinAsset(place.type)}
                    alt=""
                    aria-hidden="true"
                    className="size-[50px] max-w-none object-contain drop-shadow-[0_7px_9px_rgba(15,23,42,0.20)]"
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="map-location-controls">
          <button
            type="button"
            onClick={requestUserLocation}
            className="map-locate-button"
            disabled={isLocatingUser}
            aria-label={isLocatingUser ? "Buscando tu ubicación" : "Centrar en mi ubicación"}
            title="Centrar en mi ubicación"
          >
            <LocateFixed className={"size-5" + (isLocatingUser ? " animate-pulse" : "")} aria-hidden="true" />
          </button>
          {locationError && <p className="map-location-error" role="status">{locationError}</p>}
          {hasResolvedUserLocation && !locationError && (
            <span className="map-location-status">
              <span aria-hidden="true" />
              {userLocationSource === "google" ? "Ubicación aproximada" : "Ubicación activa"}
            </span>
          )}
        </div>
      </div>

      <section className={"map-nearby" + (isBottomSheetExpanded ? "" : " is-collapsed")} aria-label="Lugares cercanos">
        <h2>
          <button
            type="button"
            className="map-nearby-toggle"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onClick={handleSheetHeaderClick}
            aria-expanded={isBottomSheetExpanded}
            aria-controls="map-nearby-places"
          >
            <span className="map-sheet-grip" aria-hidden="true" />
            <span className="map-nearby-icon" aria-hidden="true"><MapPin className="size-5" strokeWidth={1.8} /></span>
            <span className="map-nearby-heading">
              <span className="map-nearby-title">{userLocation ? "Cerca de ti" : "Explora lugares"}</span>
              <span className="map-nearby-description">
                {userLocation ? "Ordenados por cercanía" : "Activa tu ubicación para ver los más cercanos"}
              </span>
            </span>
            <span className={"map-sheet-chevron" + (isBottomSheetExpanded ? "" : " is-collapsed")} aria-hidden="true">
              <ChevronDown className="size-4" />
            </span>
          </button>
        </h2>

        <div id="map-nearby-places" className="map-nearby-body" hidden={!isBottomSheetExpanded}>
          <div className="map-nearby-list" aria-label="Lista de lugares" aria-busy={isLoadingPlaces}>
            {isLoadingPlaces && <p className="map-list-message" role="status">Cargando lugares…</p>}
            {!isLoadingPlaces && places.length === 0 && (
              <div className="map-list-message" role="status">
                <p>{placesError ? "No pudimos cargar los lugares." : "No hay lugares que coincidan con tu búsqueda."}</p>
                {!placesError && (searchTerm || activeTab !== "todos") && (
                  <button type="button" onClick={() => { setSearchTerm(""); setActiveTab("todos"); }}>
                    Limpiar filtros
                  </button>
                )}
              </div>
            )}
            {places.slice(0, 5).map((place) => {
              const placeHasPrice = hasPrice(place);
              const PlaceIcon = getPlaceIcon(place.type);
              const placeUrl = userRole === 'worker' ? "/app/workplace/" + place.id : "/app/place/" + place.id;
              return (
                <button
                  key={place.id}
                  type="button"
                  className="map-place-card"
                  onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })}
                >
                  <span className={"map-place-image map-place-image--" + place.type} aria-hidden="true">
                    {place.images?.[0] ? (
                      <CachedImage src={place.images[0]} alt="" className="size-full object-cover" />
                    ) : (
                      <PlaceIcon className="size-7" strokeWidth={1.4} />
                    )}
                  </span>
                  <span className="map-place-info">
                    <span className="map-place-name">{place.name}</span>
                    <span className="map-place-zone">{getPlaceZoneLabel(place)}</span>
                    <span className="map-place-meta">
                      <span className={"map-place-price" + (placeHasPrice ? "" : " is-free")}>
                        {placeHasPrice ? "De pago" : "Gratis"}
                      </span>
                      {place.rating > 0 && place.reviews > 0 && (
                        <span className="map-place-rating"><Star className="size-3" aria-hidden="true" />{place.rating.toLocaleString("es-CL", { maximumFractionDigits: 1 })}</span>
                      )}
                      {place.isPromoted && (
                        <span className="map-place-promoted"><Crown className="size-3" aria-hidden="true" />Destacado</span>
                      )}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
