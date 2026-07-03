import { useEffect, useState } from "react";
import { MapPin, TrendingUp, Users, Star } from "lucide-react";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { Card, CardContent } from "../../components/ui/card";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getCachedPlaces, listPlaces, type AppPlace } from "../../services/placeService";

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const createSvgMarkerUrl = (svg: string) => {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export function AdminHome() {
  const [userLocation] = useState({ lat: -33.4569, lng: -70.6483 });
  const [selectedPlace, setSelectedPlace] = useState<AppPlace | null>(null);
  const [dbPlaces, setDbPlaces] = useState<AppPlace[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    const cachedPlaces = getCachedPlaces();
    if (cachedPlaces) setDbPlaces(cachedPlaces);
    setIsLoadingPlaces(!cachedPlaces);

    listPlaces({ forceRefresh: Boolean(cachedPlaces) })
      .then((places) => {
        if (isMounted) setDbPlaces(places);
      })
      .catch(() => {
        if (isMounted) setDbPlaces([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPlaces(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Calcular estadísticas dinámicamente desde lugares reales
  const calculateZoneStats = () => {
    const zoneMap: any = {};

    dbPlaces.forEach((place) => {
      const zone = place.zone || "Sin zona";
      if (!zoneMap[zone]) {
        zoneMap[zone] = { zone, totalPlaces: 0, totalVisits: 0, averageRating: 0 };
      }
      zoneMap[zone].totalPlaces += 1;
    });

    return Object.values(zoneMap).sort((a: any, b: any) => b.totalPlaces - a.totalPlaces);
  };

  const zoneStats = calculateZoneStats() as any;

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'library': return '📚';
      case 'cafe': return '☕';
      case 'coworking': return '💼';
      case 'park': return '🌳';
      case 'office': return '🏢';
      case 'meeting_room': return '👥';
      case 'private_office': return '🚪';
      default: return '📍';
    }
  };

  const getPlaceMarkerIcon = (type: string) => {
    const glyph = getPlaceIcon(type);
    return createSvgMarkerUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" width="45" height="52" viewBox="0 0 52 58">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#111827" flood-opacity="0.26"/>
          </filter>
        </defs>
        <path
          d="M26 55C20.8 47.7 11 36.9 11 24.5C11 16.2 17.7 9.5 26 9.5C34.3 9.5 41 16.2 41 24.5C41 36.9 31.2 47.7 26 55Z"
          fill="#4F46E5"
          filter="url(#shadow)"
        />
        <circle cx="26" cy="24.5" r="13" fill="#ffffff"/>
        <text x="26" y="25" text-anchor="middle" dominant-baseline="middle" font-size="14" font-family="Arial, sans-serif">${glyph}</text>
      </svg>
    `);
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          {/* Welcome */}
          <div>
            <h2 className="text-2xl mb-1">Bienvenido, Administrador</h2>
            <p className="text-gray-600">Gestión de espacios de estudio en Santiago</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <MapPin className="size-5 text-[#4F46E5]" />
                  </div>
                  <div>
                    <p className="text-2xl">{dbPlaces.length}</p>
                    <p className="text-xs text-gray-600">Lugares</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="size-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl">{dbPlaces.length}</p>
                    <p className="text-xs text-gray-600">Activos</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          <Card>
            <CardContent className="p-0">
              <div className="relative h-80 bg-gray-100 rounded-lg overflow-hidden">
                {googleMapsApiKey ? (
                  <APIProvider apiKey={googleMapsApiKey}>
                    <Map
                      defaultCenter={userLocation}
                      defaultZoom={13}
                      disableDefaultUI
                      clickableIcons={false}
                      gestureHandling="greedy"
                      className="absolute inset-0"
                    >
                      {/* User location marker */}
                      <Marker position={userLocation} title="Tu ubicación" />

                      {/* Place markers */}
                      {dbPlaces.map((place) => (
                        <Marker
                          key={place.id}
                          position={{ lat: place.lat, lng: place.lng }}
                          title={place.name}
                          icon={getPlaceMarkerIcon(place.type)}
                          onClick={() => setSelectedPlace(place)}
                        />
                      ))}
                    </Map>
                  </APIProvider>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-green-100">
                    <div className="text-center">
                      <MapPin className="size-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Google Maps no configurado</p>
                    </div>
                  </div>
                )}

                {/* Selected place info */}
                {selectedPlace && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3 z-30">
                    <h3 className="font-semibold mb-1">{selectedPlace.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span>{selectedPlace.type}</span>
                      </div>
                      <span>•</span>
                      <span>{selectedPlace.address}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Zones */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <h3 className="text-lg mb-3">Zonas Principales</h3>
              <div className="space-y-3">
                {zoneStats.length > 0 ? (
                  zoneStats.slice(0, 3).map((zone: any, index: number) => (
                    <div key={zone.zone} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`size-8 rounded-full flex items-center justify-center text-white text-sm ${
                          index === 0 ? 'bg-[#4F46E5]' : index === 1 ? 'bg-[#6366F1]' : 'bg-[#818CF8]'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{zone.zone}</p>
                          <p className="text-xs text-gray-600">{zone.totalPlaces} lugares</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{zone.totalPlaces}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No hay zonas registradas</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
