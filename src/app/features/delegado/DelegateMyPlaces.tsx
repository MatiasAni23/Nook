import { useEffect, useState } from "react";
import { Calendar, Clock, Edit, MapPin, Plus, Star, Wifi } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { isSupabaseConfigured } from "../../lib/supabase";
import { listCurrentDelegatePlaces, type DelegateAssignedPlace } from "../../services/adminManagementService";
import { AdminAddPlace } from "../admin/AdminAddPlace";
import { AdminEditPlace } from "../admin/AdminEditPlace";

export function DelegateMyPlaces() {
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editingPlace, setEditingPlace] = useState<DelegateAssignedPlace | null>(null);
  const [myPlaces, setMyPlaces] = useState<DelegateAssignedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no esta configurado.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    listCurrentDelegatePlaces()
      .then((places) => {
        if (isMounted) setMyPlaces(places);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar tus lugares.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleEdit = (place: DelegateAssignedPlace) => {
    setEditingPlace(place);
    setView("edit");
  };

  const handleSaveComplete = () => {
    setView("list");
    setEditingPlace(null);
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case "library":
        return "BI";
      case "cafe":
        return "CF";
      case "coworking":
      case "office":
      case "meeting_room":
      case "private_office":
        return "CO";
      case "park":
        return "PA";
      default:
        return "LU";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "library":
        return "Biblioteca";
      case "cafe":
        return "Cafe";
      case "coworking":
        return "Cowork";
      case "office":
        return "Oficina";
      case "meeting_room":
        return "Sala";
      case "private_office":
        return "Oficina privada";
      case "park":
        return "Parque";
      default:
        return "Lugar";
    }
  };

  if (view === "add") {
    return (
      <div className="size-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <AdminAddPlace />
        </div>
        <div className="absolute top-4 left-4 z-10">
          <Button variant="outline" size="sm" onClick={() => setView("list")} className="bg-white">
            Volver a mis lugares
          </Button>
        </div>
      </div>
    );
  }

  if (view === "edit" && editingPlace) {
    return (
      <div className="size-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <AdminEditPlace place={editingPlace} onSave={handleSaveComplete} />
        </div>
        <div className="absolute top-4 left-4 z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setView("list");
              setEditingPlace(null);
            }}
            className="bg-white"
          >
            Volver a mis lugares
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>
                Mis Lugares
              </h2>
              <p className="text-gray-600">{myPlaces.length} lugares bajo tu gestion</p>
            </div>
            <Button onClick={() => setView("add")} className="bg-[#4F46E5] hover:bg-[#4338CA]">
              <Plus className="size-4 mr-2" />
              Agregar Lugar
            </Button>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {isLoading && (
            <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">Cargando lugares...</div>
          )}

          {!isLoading && myPlaces.length === 0 && (
            <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
              Aun no tienes lugares asignados.
            </div>
          )}

          <div className="space-y-3">
            {myPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="size-16 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold text-white">{getPlaceIcon(place.type)}</span>
                      </div>

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
                          <Badge variant="outline" className="text-xs">
                            {place.category === "work" ? "Trabajo" : "Estudio"}
                          </Badge>
                          {place.wifi && (
                            <Badge variant="outline" className="text-xs">
                              <Wifi className="size-3 mr-1" />
                              WiFi
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
                            {place.reservationsCount} reservas registradas
                          </p>
                        </div>
                      </div>
                    </div>

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
                      <Button variant="outline" size="sm" className="flex-1 text-gray-700 hover:bg-gray-50">
                        <MapPin className="size-3 mr-1" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex gap-3">
                <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                  <MapPin className="size-5 text-[#4F46E5]" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">Gestiona tus lugares</h4>
                  <p className="text-xs text-gray-700">
                    Puedes agregar nuevos lugares, editar la informacion existente, configurar horarios y revisar las
                    reservas de cada espacio asignado.
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
