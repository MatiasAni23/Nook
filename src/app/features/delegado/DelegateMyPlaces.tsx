import { useState } from "react";
import { Plus, Edit, MapPin, Calendar, Star, Wifi, Clock } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { AdminAddPlace } from "../admin/AdminAddPlace";
import { AdminEditPlace } from "../admin/AdminEditPlace";

export function DelegateMyPlaces() {
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list');
  const [editingPlace, setEditingPlace] = useState<any>(null);

  // Mock data - lugares asignados a este delegado
  const myPlaces = [
    {
      id: '1',
      name: 'Biblioteca Central Universidad de Chile',
      type: 'library',
      rating: 4.6,
      reviews: 245,
      hours: '8:00 - 22:00',
      wifi: true,
      outlets: true,
      lat: -33.4569,
      lng: -70.6483,
      reservationsCount: 12,
      acceptsReservations: false,
    },
    {
      id: '2',
      name: 'Café Literario',
      type: 'cafe',
      rating: 4.3,
      reviews: 156,
      hours: '9:00 - 20:00',
      wifi: true,
      outlets: true,
      lat: -33.4589,
      lng: -70.6503,
      reservationsCount: 8,
      acceptsReservations: true,
    },
    {
      id: '5',
      name: 'Parque Biblioteca Vitacura',
      type: 'park',
      rating: 4.7,
      reviews: 89,
      hours: '7:00 - 19:00',
      wifi: false,
      outlets: false,
      lat: -33.4609,
      lng: -70.6523,
      reservationsCount: 4,
      acceptsReservations: false,
    },
  ];

  const handleEdit = (place: any) => {
    setEditingPlace(place);
    setView('edit');
  };

  const handleSaveComplete = () => {
    setView('list');
    setEditingPlace(null);
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'library': return '📚';
      case 'cafe': return '☕';
      case 'coworking': return '💼';
      case 'park': return '🌳';
      default: return '📍';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'library': return 'Biblioteca';
      case 'cafe': return 'Café';
      case 'coworking': return 'Cowork';
      case 'park': return 'Parque';
      default: return 'Lugar';
    }
  };

  if (view === 'add') {
    return (
      <div className="size-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <AdminAddPlace />
        </div>
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView('list')}
            className="bg-white"
          >
            ← Volver a mis lugares
          </Button>
        </div>
      </div>
    );
  }

  if (view === 'edit' && editingPlace) {
    return (
      <div className="size-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <AdminEditPlace place={editingPlace} onSave={handleSaveComplete} />
        </div>
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setView('list'); setEditingPlace(null); }}
            className="bg-white"
          >
            ← Volver a mis lugares
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>Mis Lugares</h2>
              <p className="text-gray-600">{myPlaces.length} lugares bajo tu gestión</p>
            </div>
            <Button
              onClick={() => setView('add')}
              className="bg-[#4F46E5] hover:bg-[#4338CA]"
            >
              <Plus className="size-4 mr-2" />
              Agregar Lugar
            </Button>
          </div>

          {/* Places List */}
          <div className="space-y-3">
            {myPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="size-16 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shrink-0">
                        <span className="text-3xl">{getPlaceIcon(place.type)}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold">{place.name}</h3>
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="size-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold">{place.rating}</span>
                            <span className="text-xs text-gray-500">({place.reviews})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(place.type)}
                          </Badge>
                          {place.wifi && (
                            <Badge variant="outline" className="text-xs">
                              <Wifi className="size-3 mr-1" />
                              WiFi
                            </Badge>
                          )}
                          {place.acceptsReservations && (
                            <Badge className="text-xs bg-green-100 text-green-700 border-green-300">
                              <Calendar className="size-3 mr-1" />
                              Acepta Reservas
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-gray-600">
                          <p>
                            <Clock className="size-3 inline mr-1" />
                            {place.hours}
                          </p>
                          <p>
                            <Calendar className="size-3 inline mr-1" />
                            {place.reservationsCount} reservas este mes
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(place)}
                        className="flex-1 text-[#4F46E5] border-[#4F46E5] hover:bg-purple-50"
                      >
                        <Edit className="size-3 mr-1" />
                        Editar Lugar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {/* Navigate to place details */}}
                        className="flex-1 text-gray-700 hover:bg-gray-50"
                      >
                        <MapPin className="size-3 mr-1" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Info Card */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-3">
                <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <MapPin className="size-5 text-[#4F46E5]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">Gestiona tus lugares</h4>
                  <p className="text-xs text-gray-700">
                    Puedes agregar nuevos lugares, editar la información existente, configurar horarios
                    y decidir si aceptas reservas para cada uno de tus espacios.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
