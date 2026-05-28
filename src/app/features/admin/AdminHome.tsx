import { useState } from "react";
import { MapPin, TrendingUp, Users, Star } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { studyPlaces } from "../../data/mockData";
import { mockPlaceStats, mockZoneStats } from "../../data/adminData";

export function AdminHome() {
  const [userLocation] = useState({ lat: -33.4569, lng: -70.6483 });
  const [selectedPlace, setSelectedPlace] = useState<typeof studyPlaces[0] | null>(null);

  const totalVisits = mockPlaceStats.reduce((sum, place) => sum + place.visits, 0);
  const averageRating = (mockPlaceStats.reduce((sum, place) => sum + place.averageRating, 0) / mockPlaceStats.length).toFixed(1);

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'library': return '📚';
      case 'cafe': return '☕';
      case 'coworking': return '💼';
      case 'park': return '🌳';
      default: return '📍';
    }
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
                    <p className="text-2xl">{studyPlaces.length}</p>
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
                    <p className="text-2xl">{totalVisits.toLocaleString('es-CL')}</p>
                    <p className="text-xs text-gray-600">Visitas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Map */}
          <Card>
            <CardContent className="p-0">
              <div className="relative h-80 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* User location marker */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <div className="relative">
                        <div className="size-5 bg-blue-600 rounded-full border-3 border-white shadow-lg" />
                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75" />
                      </div>
                    </div>

                    {/* Place markers */}
                    {studyPlaces.map((place) => {
                      const offsetX = (place.lng - userLocation.lng) * 3000;
                      const offsetY = (userLocation.lat - place.lat) * 3000;
                      const isSelected = selectedPlace?.id === place.id;

                      return (
                        <button
                          key={place.id}
                          className={`absolute transition-all duration-200 ${
                            isSelected ? 'z-30 scale-125' : 'z-20 hover:scale-110'
                          }`}
                          style={{
                            left: `calc(50% + ${offsetX}px)`,
                            top: `calc(50% + ${offsetY}px)`,
                            transform: 'translate(-50%, -100%)',
                          }}
                          onClick={() => setSelectedPlace(place)}
                        >
                          <div className={`bg-white rounded-full p-2 shadow-lg border-2 ${
                            isSelected ? 'border-[#4F46E5]' : 'border-white'
                          }`}>
                            <span className="text-2xl">{getPlaceIcon(place.type)}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected place info */}
                {selectedPlace && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-3 z-30">
                    <h3 className="font-semibold mb-1">{selectedPlace.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Star className="size-3 fill-yellow-400 text-yellow-400" />
                        <span>{selectedPlace.rating}</span>
                      </div>
                      <span>•</span>
                      <span>{selectedPlace.reviews} reseñas</span>
                      {selectedPlace.openNow ? (
                        <Badge className="bg-green-500 text-xs ml-auto">Abierto</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs ml-auto">Cerrado</Badge>
                      )}
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
                {mockZoneStats.slice(0, 3).map((zone, index) => (
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
                      <p className="text-sm">{zone.totalVisits.toLocaleString('es-CL')}</p>
                      <div className="flex items-center gap-1">
                        <Star className="size-3 fill-yellow-400 text-yellow-400" />
                        <p className="text-xs text-gray-600">{zone.averageRating}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
