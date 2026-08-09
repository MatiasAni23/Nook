import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  APIProvider,
  Map,
  Marker,
  useMap,
  type MapCameraChangedEvent,
} from "@vis.gl/react-google-maps";
import { Crown, LocateFixed, Search, SlidersHorizontal, ChevronDown, Star } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { CachedImage } from "../../components/ui/cached-image";
import { studyPlaces, workPlaces } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getCachedPlaces, listPlaces, type AppPlace } from "../../services/placeService";
import { trackPlaceAnalyticsEvents } from "../../services/placeAnalyticsService";
import { hasValidPlacePrice, placeMatchesSearch, placeMatchesTab } from "./placeFilters";
import { getDetailNavigationState } from "./navigationState";
import { getPlacePinAsset } from "./placePinAssets";
import { cleanMapStyles } from "./mapStyles";
import { sortPlacesByDistance } from "./proximity";

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
  const sheetRef = useRef<HTMLDivElement>(null);
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

    if (error?.code === error.PERMISSION_DENIED) {
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

  const mockPlaces = [
    ...studyPlaces.map((place) => ({ ...place, category: "study" as const, images: [] })),
    ...workPlaces.map((place) => ({ ...place, category: "work" as const, images: [] })),
  ];
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
    { id: 'todos', label: 'Todos' },
    { id: 'cowork', label: 'Cowork' },
    { id: 'estudios', label: 'Estudios' },
    { id: 'reuniones', label: 'Reuniones' },
    { id: 'parques', label: 'Parques' },
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
    const index = Math.abs(id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % gradients.length;
    return gradients[index];
  };

  // Helpers visuales compartidos por mapa, fallback y tarjetas.
  const getPlaceIcon = (type: string) => {
    switch (type) {
      // Lugares para estudiantes
      case 'library': return '📚';
      case 'cafe': return '☕';
      case 'coworking': return '💼';
      case 'park': return '🌳';
      // Lugares para trabajadores
      case 'office': return '🏢';
      case 'meeting_room': return '👥';
      case 'private_office': return '🚪';
      default: return '📍';
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const hasPrice = (place: any) => {
    return hasValidPlacePrice(place);
  };

  const getZoneName = (name: string) => {
    if (name.includes('Providencia') || name.includes('Literario')) return 'Providencia';
    if (name.includes('Las Condes') || name.includes('PUC')) return 'Las Condes';
    if (name.includes('Vitacura')) return 'Vitacura';
    return 'Centro';
  };

  const getPlaceZoneLabel = (place: any) => {
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
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header: busqueda y filtros principales */}
      <div className="flex-none bg-white px-4 py-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Buscar en esta área"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 rounded-lg bg-gray-50 border-0 text-sm"
            />
          </div>
          <button className="size-11 rounded-lg bg-[#4F46E5] flex items-center justify-center shrink-0">
            <SlidersHorizontal className="size-5 text-white" />
          </button>
        </div>

        {placesError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {placesError}
          </div>
        )}

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

      {/* Mapa: Google Maps si hay API key, fallback visual si no */}
      <div
        className="relative flex-1 bg-gradient-to-br from-blue-50 to-purple-50 transition-[margin] duration-300"
        style={{
          marginBottom: isBottomSheetExpanded ? "18rem" : "8.5rem",
        }}
      >
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
                const placeUrl = userRole === 'worker' ? `/app/workplace/${place.id}` : `/app/place/${place.id}`;

                return (
                  <PlaceMapMarker
                    key={place.id}
                    place={place}
                    onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })}
                  />
                );
              })}
            </Map>
            <div className="absolute right-4 top-4 z-30 flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={requestUserLocation}
                className="flex size-11 items-center justify-center rounded-full bg-white text-[#4F46E5] shadow-lg transition-all hover:bg-purple-50"
                aria-label="Centrar en mi ubicacion"
              >
                <LocateFixed className={`size-5 ${isLocatingUser ? "animate-pulse" : ""}`} />
              </button>
              {locationError && (
                <div className="max-w-56 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-right text-xs text-yellow-800 shadow-md">
                  {locationError}
                </div>
              )}
              {hasResolvedUserLocation && !locationError && (
                <div className="rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-[#4F46E5] shadow-md">
                  {userLocationSource === "google" ? "Ubicacion aproximada" : "Ubicacion activa"}
                </div>
              )}
            </div>
          </APIProvider>
        ) : (
          <div className="absolute inset-0">
            <div className="absolute left-4 right-4 top-4 z-30 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              Agrega VITE_GOOGLE_MAPS_API_KEY en .env para activar Google Maps.
            </div>

            {/* Ubicacion del usuario en fallback */}
            {userLocation && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="relative">
                  <div className="size-16 rounded-full bg-purple-200/50 flex items-center justify-center">
                    <div className="size-4 bg-purple-600 rounded-full border-2 border-white shadow-lg" />
                  </div>
                </div>
              </div>
            )}

            {/* Marcadores de lugares en fallback */}
            {places.map((place) => {
              const offsetX = (place.lng - fallbackMapCenter.lng) * 3000;
              const offsetY = (fallbackMapCenter.lat - place.lat) * 3000;
              const placeUrl = userRole === 'worker' ? `/app/workplace/${place.id}` : `/app/place/${place.id}`;

              return (
                <button
                  key={place.id}
                  className="absolute z-0 transition-transform hover:scale-110"
                  style={{
                    left: `calc(50% + ${offsetX}px)`,
                    top: `calc(50% + ${offsetY}px)`,
                    transform: 'translate(-50%, -100%)',
                  }}
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
      </div>

      {/* Bottom sheet: lista horizontal de lugares cercanos */}
      <div
        ref={sheetRef}
        className={`absolute left-0 right-0 rounded-t-[1.75rem] border-t border-gray-100 bg-white shadow-[0_-16px_34px_rgba(15,23,42,0.16)] transition-all duration-300 z-30 ${
          isBottomSheetExpanded ? 'pb-24' : 'pb-24'
        }`}
        style={{
          bottom: isBottomSheetExpanded ? "0px" : "5.75rem",
          transform: isBottomSheetExpanded ? 'translateY(0)' : 'translateY(calc(100% - 48px))',
        }}
      >
        {/* Handle para expandir o colapsar */}
        <div
          className="px-4 pt-3 pb-2 cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onClick={handleSheetHeaderClick}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
          <div className="flex items-center justify-between">
            <h3 className="text-base" style={{ fontWeight: 700 }}>Cerca de ti</h3>
            <ChevronDown
              className={`size-5 text-gray-600 transition-transform ${
                isBottomSheetExpanded ? '' : 'rotate-180'
              }`}
            />
          </div>
        </div>

        {/* Tarjetas de lugares */}
        <div className="px-4 pb-4 overflow-hidden">
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-2">
            {isLoadingPlaces && (
              <Card className="w-40 shrink-0 rounded-2xl border-gray-100 shadow-[0_8px_22px_rgba(15,23,42,0.08)]">
                <CardContent className="p-3 text-sm text-gray-600">
                  Cargando lugares...
                </CardContent>
              </Card>
            )}

            {!isLoadingPlaces && places.length === 0 && (
              <Card className="w-52 shrink-0 rounded-2xl border-gray-100 shadow-[0_8px_22px_rgba(15,23,42,0.08)]">
                <CardContent className="p-3 text-sm text-gray-600">
                  No hay lugares para este filtro.
                </CardContent>
              </Card>
            )}

            {places.slice(0, 5).map((place) => {
              const placeHasPrice = hasPrice(place);
              const placeUrl = userRole === 'worker' ? `/app/workplace/${place.id}` : `/app/place/${place.id}`;

              return (
                <Card
                  key={place.id}
                  className="w-32 shrink-0 rounded-2xl border-gray-100 shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
                >
                  <CardContent className="p-0">
                    {/* Imagen o fondo generado del lugar */}
                    {place.images?.[0] ? (
                      <button
                        className="h-20 w-full overflow-hidden rounded-t-2xl bg-gray-100"
                        onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })}
                      >
                        <CachedImage src={place.images[0]} alt={place.name} className="size-full object-cover" />
                      </button>
                    ) : (
                      <div
                        className={`h-20 bg-gradient-to-br ${getPlaceImage(place.id)} rounded-t-2xl flex items-center justify-center cursor-pointer`}
                        onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })}
                      >
                        <span className="text-2xl">{getPlaceIcon(place.type)}</span>
                      </div>
                    )}

                    {/* Informacion resumida del lugar */}
                    <div className="p-2">
                      <div onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })} className="cursor-pointer">
                        {place.isPromoted && (
                          <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-[#4F46E5]">
                            <Crown className="size-3" />
                            Destacado
                          </div>
                        )}
                        <h4 className="font-semibold text-xs line-clamp-1 mb-0.5">{place.name}</h4>
                        <p className="text-xs text-gray-400 mb-1 line-clamp-1">{getPlaceZoneLabel(place)}</p>
                        {placeHasPrice ? (
                          <p className="text-sm font-semibold text-[#4F46E5] mb-2">De pago</p>
                        ) : (
                          <p className="text-sm font-semibold text-[#4F46E5] mb-2">Gratis</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
