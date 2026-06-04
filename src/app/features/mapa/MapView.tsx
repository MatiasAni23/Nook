import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import { Search, SlidersHorizontal, ChevronDown, Star } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { studyPlaces, workPlaces } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import { listPlaces, type AppPlace } from "../../services/placeService";

const getUserRole = (): 'student' | 'worker' | 'admin' => {
  return (window as any).__userRole || 'student';
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function MapView() {
  const navigate = useNavigate();
  const userRole = getUserRole();
  const [activeTab, setActiveTab] = useState('cowork');
  const [searchTerm, setSearchTerm] = useState("");
  const [userLocation] = useState({ lat: -33.4569, lng: -70.6483 });
  const [isBottomSheetExpanded, setIsBottomSheetExpanded] = useState(true);
  const [startY, setStartY] = useState(0);
  const [dbPlaces, setDbPlaces] = useState<AppPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState("");
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    setIsLoadingPlaces(true);
    setPlacesError("");

    listPlaces()
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

  const mockPlaces = userRole === 'worker'
    ? workPlaces.map((place) => ({ ...place, category: "work" as const, images: [] }))
    : studyPlaces.map((place) => ({ ...place, category: "study" as const, images: [] }));
  const basePlaces = isSupabaseConfigured
    ? dbPlaces.filter((place) => (userRole === 'worker' ? place.category === 'work' : place.category === 'study'))
    : mockPlaces;
  const places = basePlaces.filter((place) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = !normalizedSearch ||
      place.name.toLowerCase().includes(normalizedSearch) ||
      place.address?.toLowerCase().includes(normalizedSearch) ||
      place.zone?.toLowerCase().includes(normalizedSearch);
    const matchesTab =
      activeTab === "cowork" ? place.type === "coworking" :
      activeTab === "estudios" ? ["library", "cafe"].includes(place.type) :
      activeTab === "reuniones" ? ["meeting_room", "private_office", "office"].includes(place.type) :
      activeTab === "parques" ? place.type === "park" :
      true;

    return matchesSearch && matchesTab;
  });

  const tabs = [
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const hasPrice = (place: any) => {
    return 'pricePerHour' in place;
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
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    if (diff > 50 && isBottomSheetExpanded) {
      setIsBottomSheetExpanded(false);
    } else if (diff < -50 && !isBottomSheetExpanded) {
      setIsBottomSheetExpanded(true);
    }
  };

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
      <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-purple-50">
        {googleMapsApiKey ? (
          <APIProvider apiKey={googleMapsApiKey}>
            <Map
              defaultCenter={userLocation}
              defaultZoom={13}
              mapId="nook-map"
              disableDefaultUI
              gestureHandling="greedy"
              className="absolute inset-0"
            >
              <AdvancedMarker position={userLocation} zIndex={30}>
                <div className="relative">
                  <div className="size-16 rounded-full bg-purple-200/50 flex items-center justify-center">
                    <div className="size-4 bg-purple-600 rounded-full border-2 border-white shadow-lg" />
                  </div>
                </div>
              </AdvancedMarker>

              {places.map((place) => {
                const placeUrl = userRole === 'worker' ? `/app/workplace/${place.id}` : `/app/place/${place.id}`;

                return (
                  <AdvancedMarker
                    key={place.id}
                    position={{ lat: place.lat, lng: place.lng }}
                    onClick={() => navigate(placeUrl)}
                  >
                    <button className="transition-transform hover:scale-110">
                      <Pin
                        background="#ffffff"
                        borderColor="#4F46E5"
                        glyphColor="#4F46E5"
                        glyph={getPlaceIcon(place.type)}
                        scale={1.15}
                      />
                    </button>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </APIProvider>
        ) : (
          <div className="absolute inset-0">
            <div className="absolute left-4 right-4 top-4 z-30 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
              Agrega VITE_GOOGLE_MAPS_API_KEY en .env para activar Google Maps.
            </div>

            {/* User location */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
              <div className="relative">
                <div className="size-16 rounded-full bg-purple-200/50 flex items-center justify-center">
                  <div className="size-4 bg-purple-600 rounded-full border-2 border-white shadow-lg" />
                </div>
              </div>
            </div>

            {/* Place markers with icons only */}
            {places.map((place) => {
              const offsetX = (place.lng - userLocation.lng) * 3000;
              const offsetY = (userLocation.lat - place.lat) * 3000;
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
                  onClick={() => navigate(placeUrl)}
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
        className={`absolute bottom-0 left-0 right-0 bg-white border-t transition-all duration-300 z-30 ${
          isBottomSheetExpanded ? 'pb-24' : 'pb-24'
        }`}
        style={{
          transform: isBottomSheetExpanded ? 'translateY(0)' : 'translateY(calc(100% - 48px))',
        }}
      >
        {/* Handle bar */}
        <div
          className="px-4 pt-2 pb-2 cursor-pointer"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
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
              <Card className="w-40 shrink-0">
                <CardContent className="p-3 text-sm text-gray-600">
                  Cargando lugares...
                </CardContent>
              </Card>
            )}

            {!isLoadingPlaces && places.length === 0 && (
              <Card className="w-52 shrink-0">
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
                  className={`hover:shadow-lg transition-all shrink-0 ${userRole === 'worker' && placeHasPrice ? 'w-36' : 'w-32'}`}
                >
                  <CardContent className="p-0">
                    {/* Image */}
                    {place.images?.[0] ? (
                      <button
                        className="h-20 w-full overflow-hidden rounded-t-lg bg-gray-100"
                        onClick={() => navigate(placeUrl)}
                      >
                        <img src={place.images[0]} alt={place.name} className="size-full object-cover" />
                      </button>
                    ) : (
                      <div
                        className={`h-20 bg-gradient-to-br ${getPlaceImage(place.id)} rounded-t-lg flex items-center justify-center cursor-pointer`}
                        onClick={() => navigate(placeUrl)}
                      >
                        <span className="text-2xl">{getPlaceIcon(place.type)}</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-2">
                      <div onClick={() => navigate(placeUrl)} className="cursor-pointer">
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
