import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { APIProvider, Map, Marker, useMap, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import { LocateFixed, Search, SlidersHorizontal, ChevronDown, Star } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { CachedImage } from "../../components/ui/cached-image";
import { studyPlaces, workPlaces } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getCachedPlaces, listPlaces, type AppPlace } from "../../services/placeService";
import { hasValidPlacePrice, placeMatchesSearch, placeMatchesTab } from "./placeFilters";
import { getDetailNavigationState } from "./navigationState";

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

const cleanMapStyles: google.maps.MapTypeStyle[] = [
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "landscape",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
];

const createSvgMarkerUrl = (svg: string) => {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

function RecenterMap({ request }: { request: RecenterRequest | null }) {
  const map = useMap();

  useEffect(() => {
    if (!request) return;
    map?.panTo(request.center);
  }, [request?.id, map]);

  return null;
}

export function MapView() {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const [activeTab, setActiveTab] = useState('todos');
  const [searchTerm, setSearchTerm] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasResolvedUserLocation, setHasResolvedUserLocation] = useState(false);
  const [userLocationSource, setUserLocationSource] = useState<UserLocationSource | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(true);
  const [startY, setStartY] = useState(0);
  const [dbPlaces, setDbPlaces] = useState<AppPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState("");
  const [userRecenterRequest, setUserRecenterRequest] = useState<RecenterRequest | null>(null);
  const [fallbackMapCenter, setFallbackMapCenter] = useState<Coordinates>(
    savedMapCamera?.center ?? defaultMapCenter,
  );
  const sheetRef = useRef<HTMLDivElement>(null);
  const hasRequestedGoogleFallbackRef = useRef(false);
  const isDraggingSheetRef = useRef(false);

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
  const places = basePlaces.filter((place) => {
    return placeMatchesSearch(place, searchTerm) && placeMatchesTab(place, activeTab);
  });

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

  const getPlaceIcon = (type: string) => {
    switch (type) {
      // Student places
      case 'library': return '📚';
      case 'cafe': return '☕';
      case 'coworking': return '💼';
      case 'park': return '🌳';
      // Worker places
      case 'office': return '🏢';
      case 'meeting_room': return '👥';
      case 'private_office': return '🚪';
      default: return '📍';
    }
  };

  const getPlaceMarkerIcon = (type: string) => {
    const glyph = getPlaceIcon(type);
    return createSvgMarkerUrl(`
        <svg xmlns="http://www.w3.org/2000/svg" width="52" height="58" viewBox="0 0 52 58">
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#111827" flood-opacity="0.26"/>
          </filter>
          <path
            d="M26 55C20.8 47.7 11 36.9 11 24.5C11 16.2 17.7 9.5 26 9.5C34.3 9.5 41 16.2 41 24.5C41 36.9 31.2 47.7 26 55Z"
            fill="#ffffff"
            stroke="#4F46E5"
            stroke-width="3"
            filter="url(#shadow)"
          />
          <circle cx="26" cy="24.5" r="11.5" fill="#EEF2FF"/>
          <text x="26" y="31.5" text-anchor="middle" font-size="20" font-family="Arial, sans-serif">${glyph}</text>
        </svg>
      `);
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
      {/* Header */}
      <div className="flex-none bg-white px-4 py-3 space-y-3">
        {/* Search bar */}
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

        {/* Tabs */}
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

      {/* Map */}
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
                  <Marker
                    key={place.id}
                    position={{ lat: place.lat, lng: place.lng }}
                    onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })}
                    icon={getPlaceMarkerIcon(place.type)}
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

            {/* User location */}
            {userLocation && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="relative">
                  <div className="size-16 rounded-full bg-purple-200/50 flex items-center justify-center">
                    <div className="size-4 bg-purple-600 rounded-full border-2 border-white shadow-lg" />
                  </div>
                </div>
              </div>
            )}

            {/* Place markers with icons only */}
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
                    transform: 'translate(-50%, -50%)',
                  }}
                  onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })}
                >
                  <div className="bg-white rounded-full p-2.5 shadow-lg border-2 border-white">
                    <span className="text-2xl">{getPlaceIcon(place.type)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom section - Cerca de ti (collapsible) */}
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
        {/* Handle bar */}
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

        {/* Cards */}
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
                  className={`shrink-0 rounded-2xl border-gray-100 shadow-[0_8px_22px_rgba(15,23,42,0.08)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.12)] ${userRole === 'worker' && placeHasPrice ? 'w-36' : 'w-32'}`}
                >
                  <CardContent className="p-0">
                    {/* Image */}
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

                    {/* Info */}
                    <div className="p-2">
                      <div onClick={() => navigate(placeUrl, { state: getDetailNavigationState("/app") })} className="cursor-pointer">
                        <h4 className="font-semibold text-xs line-clamp-1 mb-0.5">{place.name}</h4>
                        <p className="text-xs text-gray-400 mb-1 line-clamp-1">{getPlaceZoneLabel(place)}</p>
                        {placeHasPrice ? (
                          <>
                            <p className="text-xs font-semibold text-[#4F46E5]">{formatPrice((place as any).pricePerHour)}</p>
                            <p className="text-xs text-gray-400 mb-2">/hora</p>
                          </>
                        ) : (
                          <p className="text-sm font-semibold text-[#4F46E5] mb-2">Gratis</p>
                        )}
                      </div>

                      {/* Reserve button for workers */}
                      {userRole === 'worker' && placeHasPrice && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/app/checkout/${place.id}`);
                          }}
                          className="w-full py-1.5 rounded-md bg-[#4F46E5] text-white text-xs font-medium hover:bg-[#4338CA] transition-all"
                        >
                          Reservar
                        </button>
                      )}
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
