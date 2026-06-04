import { useEffect, useState } from "react";
import { Edit, MapPin, Plus, Search, Star, Trash2, Wifi } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { studyPlaces, workPlaces } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import { listPlaces, type AppPlace } from "../../services/placeService";
import { AdminAddPlace } from "./AdminAddPlace";
import { AdminEditPlace } from "./AdminEditPlace";

export function AdminManagePlaces() {
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editingPlace, setEditingPlace] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "student" | "work">("all");
  const [dbPlaces, setDbPlaces] = useState<AppPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    listPlaces()
      .then((places) => {
        if (isMounted) setDbPlaces(places);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los lugares.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const mockPlaces = [
    ...studyPlaces.map((place) => ({ ...place, category: "study" as const, images: [], amenities: [] })),
    ...workPlaces.map((place) => ({ ...place, category: "work" as const, outlets: false, images: [], amenities: [] })),
  ];
  const allPlaces = isSupabaseConfigured ? dbPlaces : mockPlaces;

  const filteredPlaces = allPlaces.filter((place) => {
    const matchesSearch = place.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "student" && place.category === "study") ||
      (filter === "work" && place.category === "work");
    return matchesSearch && matchesFilter;
  });

  const handleEdit = (place: any) => {
    setEditingPlace(place);
    setView("edit");
  };

  const handleDelete = (placeId: string) => {
    if (confirm("Estas seguro de eliminar este lugar?")) {
      alert(`Lugar ${placeId} eliminado`);
    }
  };

  const handleSaveComplete = () => {
    setView("list");
    setEditingPlace(null);
  };

  const handlePlaceCreated = (place: AppPlace) => {
    setDbPlaces((current) => [place, ...current]);
    setView("list");
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
        return "Sala de reunion";
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
          <AdminAddPlace onCreated={handlePlaceCreated} />
        </div>
        <div className="absolute top-4 left-4 z-10">
          <Button variant="outline" size="sm" onClick={() => setView("list")} className="bg-white">
            Volver a listado
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
            Volver a listado
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
              <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>Gestion de Lugares</h2>
              <p className="text-gray-600">{filteredPlaces.length} lugares registrados</p>
            </div>
            <Button onClick={() => setView("add")} className="bg-[#4F46E5] hover:bg-[#4338CA]">
              <Plus className="size-4 mr-2" />
              Nuevo Lugar
            </Button>
          </div>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                  <Input
                    placeholder="Buscar lugares..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  <Button
                    variant={filter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("all")}
                    className={filter === "all" ? "bg-[#4F46E5]" : ""}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={filter === "student" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("student")}
                    className={filter === "student" ? "bg-[#4F46E5]" : ""}
                  >
                    Estudiantes
                  </Button>
                  <Button
                    variant={filter === "work" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter("work")}
                    className={filter === "work" ? "bg-[#4F46E5]" : ""}
                  >
                    Trabajadores
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {isLoading && (
            <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
              Cargando lugares...
            </div>
          )}

          <div className="space-y-3">
            {filteredPlaces.map((place) => (
              <Card key={place.id}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="size-16 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {place.images?.[0] ? (
                        <img src={place.images[0]} alt={place.name} className="size-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold text-[#4F46E5]">{getPlaceIcon(place.type)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold">{place.name}</h3>
                        <div className="flex items-center gap-1 shrink-0">
                          <Star className="size-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-semibold">{place.rating}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-2">
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

                      <p className="text-xs text-gray-600 mb-2">
                        <MapPin className="size-3 inline mr-1" />
                        {place.address || place.hours}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(place)}
                          className="text-[#4F46E5] border-[#4F46E5] hover:bg-purple-50"
                        >
                          <Edit className="size-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(place.id)}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <Trash2 className="size-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
