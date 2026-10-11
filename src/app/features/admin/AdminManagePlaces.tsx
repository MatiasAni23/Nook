import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { CachedImage } from "../../components/ui/cached-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { demoPlaces } from "../../data/demoPlaces";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  getCachedManagedPlaces,
  getManagedPlacesCacheRemaining,
  listManagedPlaces,
  setManagedPlaceStatus,
  type AppPlace,
  type ManagedPlace,
  type ManagedPlaceStatus,
} from "../../services/placeService";
import { AdminAddPlace } from "./AdminAddPlace";
import { AdminEditPlace } from "./AdminEditPlace";
import {
  AdminEmptyState,
  AdminPageHeading,
  placeTypeLabels,
  planLabels,
} from "./AdminUi";
import { useAdminData } from "./useAdminData";

const placesSource = {
  peek: getCachedManagedPlaces,
  remaining: getManagedPlacesCacheRemaining,
  load: listManagedPlaces,
};

const pageSize = 10;
const filters = [
  { value: "all", label: "Todos" },
  { value: "study", label: "Estudio" },
  { value: "work", label: "Trabajo" },
] as const;
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function AdminManagePlaces() {
  const [params, setParams] = useSearchParams();
  const [places, setPlaces] = useState<ManagedPlace[]>(
    isSupabaseConfigured
      ? (getCachedManagedPlaces() ?? [])
      : demoPlaces.map((place) => ({ ...place, status: "active" })),
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "study" | "work">("all");
  const [page, setPage] = useState(1);
  const {
    data: loadedPlaces,
    isLoading,
    isRefreshing,
    error: loadError,
    refresh,
  } = useAdminData(placesSource, isSupabaseConfigured);
  const [actionError, setError] = useState("");
  const error = actionError || loadError;
  const [success, setSuccess] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<ManagedPlace | null>(null);
  const [placeToChange, setPlaceToChange] = useState<ManagedPlace | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const status: ManagedPlaceStatus =
    params.get("estado") === "deshabilitados" ? "inactive" : "active";
  const editId = params.get("edit");
  const editingPlace = places.find((place) => place.id === editId);
  const adding = params.get("action") === "new";
  const listParams = (): Record<string, string> =>
    status === "inactive" ? { estado: "deshabilitados" } : {};
  const backToList = () => setParams(listParams(), { replace: true });

  useEffect(() => {
    if (loadedPlaces) setPlaces(loadedPlaces);
  }, [loadedPlaces]);

  const query = normalizeSearch(search);
  const sectionPlaces = places.filter((place) => place.status === status);
  const filtered = sectionPlaces.filter(
    (place) =>
      (filter === "all" || place.category === filter) &&
      normalizeSearch(
        [place.name, place.address, place.zone, placeTypeLabels[place.type]]
          .filter(Boolean)
          .join(" "),
      ).includes(query),
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const editPlace = (place: AppPlace) => {
    setSelectedPlace(null);
    setSuccess("");
    setParams({ ...listParams(), edit: place.id });
  };
  const createNew = () => {
    setSuccess("");
    setParams({ ...listParams(), action: "new" });
  };

  const requestStatusChange = (place: ManagedPlace) => {
    setSelectedPlace(null);
    setError("");
    setPlaceToChange(place);
  };

  const handleStatusChange = async () => {
    if (!placeToChange || isChangingStatus) return;
    setIsChangingStatus(true);
    setError("");
    setSuccess("");
    try {
      const nextStatus = await setManagedPlaceStatus(
        placeToChange.id,
        placeToChange.status === "active" ? "inactive" : "active",
      );
      setPlaces((current) =>
        current.map((place) =>
          place.id === placeToChange.id ? { ...place, status: nextStatus } : place,
        ),
      );
      setSuccess(
        nextStatus === "active"
          ? `“${placeToChange.name}” se habilitó y vuelve a aparecer en el mapa.`
          : `“${placeToChange.name}” se deshabilitó. Su ficha e historial se conservan en Lugares deshabilitados.`,
      );
      setPlaceToChange(null);
    } catch {
      setError(
        "No pudimos cambiar el estado del lugar. Vuelve a intentarlo o actualiza el listado para comprobar su estado.",
      );
    } finally {
      setIsChangingStatus(false);
    }
  };

  if (adding)
    return (
      <AdminAddPlace
        onBack={backToList}
        onCreated={(place) => {
          setPlaces((current) => [
            { ...place, status: "active" },
            ...current.filter((item) => item.id !== place.id),
          ]);
          setSuccess(`“${place.name}” se creó correctamente.`);
          backToList();
        }}
      />
    );
  if (editId) {
    if (isLoading)
      return (
        <div className="admin-empty" role="status">
          Cargando la ficha del lugar…
        </div>
      );
    if (!editingPlace)
      return (
        <div className="space-y-4">
          <AdminPageHeading
            title="Editar lugar"
            description="Consulta la ficha antes de guardar cambios."
          />
          <div className="admin-notice" role="alert">
            {error || "Este lugar ya no está disponible en el catálogo."}
          </div>
          <Button variant="outline" onClick={backToList}>
            Volver a lugares
          </Button>
          {error && (
            <Button variant="outline" onClick={() => refresh()}>
              Reintentar
            </Button>
          )}
        </div>
      );
    return (
      <AdminEditPlace
        key={editingPlace.id}
        place={editingPlace}
        onBack={backToList}
        onDeleted={({ imageCleanupPending }) => {
          setPlaces((current) => current.filter((place) => place.id !== editingPlace.id));
          setSuccess(
            `“${editingPlace.name}” se eliminó definitivamente.` +
            (imageCleanupPending ? " Quedó pendiente limpiar algunas imágenes del almacenamiento." : ""),
          );
          backToList();
        }}
        onSave={(updated) => {
          if (!updated) return;
          setPlaces((current) =>
            current.map((place) =>
              place.id === updated.id ? { ...updated, status: place.status } : place,
            ),
          );
          setSuccess(
            `Los cambios de “${updated.name}” se guardaron correctamente.`,
          );
          backToList();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeading
        title="Lugares"
        description="Gestiona las fichas y decide qué espacios aparecen en el mapa."
        action={
          <Button onClick={createNew} className="admin-primary">
            <Plus size={16} /> Nuevo lugar
          </Button>
        }
      />
      {!isSupabaseConfigured && (
        <div className="admin-notice">
          Vista de demostración. Puedes explorar las fichas; guardar y cambiar su estado
          requiere una conexión a Supabase.
        </div>
      )}
      {success && (
        <div
          className="admin-notice is-success flex items-center justify-between gap-3"
          role="status"
        >
          <span>{success}</span>
          <button
            type="button"
            className="admin-icon-button shrink-0"
            aria-label="Cerrar confirmación"
            onClick={() => setSuccess("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="admin-notice is-error" role="alert">
          {error}{" "}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => refresh()}
          >
            Reintentar
          </button>
        </div>
      )}
      <section
        className="admin-panel overflow-hidden"
        aria-label="Catálogo de lugares"
      >
        <div className="admin-place-state-header">
          <div
            className="admin-place-state-options"
            role="group"
            aria-label="Visibilidad de los lugares"
          >
            {([
              ["active", "Lugares habilitados", Eye],
              ["inactive", "Lugares deshabilitados", EyeOff],
            ] as const).map(([value, label, Icon]) => (
              <button
                type="button"
                key={value}
                aria-pressed={status === value}
                onClick={() => {
                  setParams(value === "inactive" ? { estado: "deshabilitados" } : {});
                  setPage(1);
                }}
              >
                <Icon size={17} aria-hidden="true" />
                <span>{label}</span>
                <span className="admin-place-state-count">
                  {places.filter((place) => place.status === value).length}
                </span>
              </button>
            ))}
          </div>
          <p>
            {status === "active"
              ? "Visibles en el mapa y en Descubrir. Puedes ocultarlos sin perder su información."
              : "Ocultos del mapa y de Descubrir. Conservan su ficha e historial; puedes habilitarlos cuando quieras."}
          </p>
        </div>
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              aria-label="Buscar lugares por nombre, dirección o zona"
              placeholder="Buscar por nombre o ubicación…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-10 pl-10"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div
              className="admin-filter-list"
              aria-label="Filtrar por categoría"
            >
              {filters.map(({ value, label }) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => {
                    setFilter(value);
                    setPage(1);
                  }}
                >
                  {label}{" "}
                  <span className="ml-1 text-xs">
                    {
                      sectionPlaces.filter(
                        (place) => value === "all" || place.category === value,
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="admin-icon-button"
              aria-label="Actualizar lugares"
              disabled={isLoading || isRefreshing || isChangingStatus || !isSupabaseConfigured}
              onClick={() => refresh()}
            >
              <RefreshCw
                size={16}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
          </div>
        </div>
        <div className="admin-table-head" aria-hidden="true">
          <span>Lugar</span>
          <span>Categoría</span>
          <span className="admin-place-plan">Plan</span>
          <span className="text-right">Acciones</span>
        </div>
        <div aria-busy={isLoading}>
          {isLoading ? (
            <div className="admin-empty" role="status">
              Cargando lugares…
            </div>
          ) : error && !places.length ? (
            <AdminEmptyState
              title="El catálogo no está disponible"
              description="Reintenta la carga para consultar tus lugares."
            />
          ) : visible.length ? (
            visible.map((place) => (
              <article key={place.id} className="admin-place-row">
                <div className="admin-place-identity flex min-w-0 items-center gap-3">
                  <span className="admin-thumbnail">
                    {place.images[0] ? (
                      <CachedImage
                        src={place.images[0]}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Building2
                        size={20}
                        strokeWidth={1.4}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="block max-w-full truncate text-left text-[15px] font-medium hover:text-[#4f46e5]"
                      onClick={() => setSelectedPlace(place)}
                    >
                      {place.name}
                    </button>
                    <p className="mt-1 truncate text-[13px] text-gray-500">
                      {place.zone || place.address || "Ubicación sin completar"}
                    </p>
                  </div>
                </div>
                <div className="admin-place-category">
                  <p className={`admin-pill category-${place.category}`}>
                    {place.category === "study" ? "Estudio" : "Trabajo"}
                  </p>
                  <span
                    className={`admin-pill admin-place-plan-inline plan-${place.planType}`}
                  >
                    {planLabels[place.planType]}
                  </span>
                  <p className="mt-1 text-[13px] text-gray-400">
                    {placeTypeLabels[place.type]}
                  </p>
                </div>
                <div className="admin-place-plan">
                  <span className={`admin-pill plan-${place.planType}`}>
                    {planLabels[place.planType]}
                  </span>
                </div>
                <div className="admin-place-actions">
                  <button
                    type="button"
                    className="admin-icon-button action-view"
                    onClick={() => setSelectedPlace(place)}
                    aria-label={`Ver ${place.name}`}
                    title="Ver ficha"
                  >
                    <Eye size={17} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-button action-edit"
                    onClick={() => editPlace(place)}
                    aria-label={`Editar ${place.name}`}
                    title="Editar"
                  >
                    <Pencil size={16} strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    className={`admin-icon-button ${place.status === "active" ? "action-disable" : "action-enable"} disabled:opacity-35`}
                    disabled={!isSupabaseConfigured || isChangingStatus}
                    onClick={() => requestStatusChange(place)}
                    aria-label={`${place.status === "active" ? "Deshabilitar" : "Habilitar"} ${place.name}`}
                    title={place.status === "active" ? "Deshabilitar: ocultar del mapa" : "Habilitar: mostrar en el mapa"}
                  >
                    {place.status === "active" ? (
                      <EyeOff size={17} strokeWidth={1.5} />
                    ) : (
                      <Eye size={17} strokeWidth={1.5} />
                    )}
                  </button>
                </div>
              </article>
            ))
          ) : (
            <AdminEmptyState
              title={
                query || filter !== "all"
                  ? "No encontramos lugares"
                  : status === "inactive"
                    ? "Sin lugares deshabilitados"
                    : "Agrega tu primer lugar"
              }
              description={
                query || filter !== "all"
                  ? "Prueba otra búsqueda o cambia los filtros."
                  : status === "inactive"
                    ? "Los espacios que ocultes del mapa aparecerán aquí para que puedas volver a habilitarlos."
                    : "Los espacios que crees aparecerán en este catálogo."
              }
              action={
                (query || filter !== "all" || status === "active") && (
                  <Button
                    variant="outline"
                    onClick={
                      query || filter !== "all"
                        ? () => {
                            setSearch("");
                            setFilter("all");
                            setPage(1);
                          }
                        : createNew
                    }
                  >
                    {query || filter !== "all"
                      ? "Limpiar filtros"
                      : "Nuevo lugar"}
                  </Button>
                )
              }
            />
          )}
        </div>
        <div className="admin-pagination">
          <span>
            {filtered.length} {filtered.length === 1 ? "lugar" : "lugares"}
            {filtered.length > pageSize
              ? ` · Página ${currentPage} de ${pageCount}`
              : ""}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoading}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Página anterior"
            >
              <ChevronLeft size={14} /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pageCount || isLoading}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Página siguiente"
            >
              Siguiente <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </section>
      <AlertDialog
        open={Boolean(placeToChange)}
        onOpenChange={(open) => {
          if (!open && !isChangingStatus) setPlaceToChange(null);
        }}
      >
        <AlertDialogContent className="admin-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {placeToChange?.status === "active" ? "¿Deshabilitar este lugar?" : "¿Habilitar este lugar?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {placeToChange?.status === "active"
                ? `“${placeToChange.name}” dejará de aparecer en el mapa y en Descubrir. Su ficha, reservas e historial se conservarán en Lugares deshabilitados.`
                : `“${placeToChange?.name}” volverá a aparecer en el mapa y en Descubrir con su información actual.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isChangingStatus}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isChangingStatus}
              className="admin-status-confirm"
              onClick={(event) => {
                event.preventDefault();
                void handleStatusChange();
              }}
            >
              {isChangingStatus
                ? "Guardando…"
                : placeToChange?.status === "active" ? "Deshabilitar lugar" : "Habilitar lugar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={Boolean(selectedPlace)}
        onOpenChange={(open) => {
          if (!open) setSelectedPlace(null);
        }}
      >
        <DialogContent className="admin-dialog max-h-[85dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedPlace?.name}</DialogTitle>
            <DialogDescription>
              {selectedPlace &&
                `${placeTypeLabels[selectedPlace.type]} · ${selectedPlace.category === "study" ? "Estudio" : "Trabajo"}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPlace && (
            <div className="space-y-5">
              <p className={`admin-place-visibility is-${selectedPlace.status}`}>
                {selectedPlace.status === "active" ? <Eye size={16} /> : <EyeOff size={16} />}
                {selectedPlace.status === "active" ? "Habilitado · Visible en el mapa" : "Deshabilitado · Oculto del mapa"}
              </p>
              {selectedPlace.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {selectedPlace.images.map((url, index) => (
                    <CachedImage
                      key={url}
                      src={url}
                      alt={`Foto ${index + 1} de ${selectedPlace.name}`}
                      className="h-40 w-56 shrink-0 rounded-xl object-cover"
                    />
                  ))}
                </div>
              )}
              <p className="text-sm leading-7 text-gray-600">
                {selectedPlace.description || "Sin descripción."}
              </p>
              <dl className="grid grid-cols-2 gap-5 text-sm">
                {[
                  ["Dirección", selectedPlace.address || "Sin completar"],
                  ["Zona", selectedPlace.zone || "Sin completar"],
                  ["Plan", planLabels[selectedPlace.planType]],
                  [
                    "Capacidad",
                    selectedPlace.capacityMax
                      ? `${selectedPlace.capacityMin ?? 1}–${selectedPlace.capacityMax} personas`
                      : "Sin informar",
                  ],
                  [
                    "Precio por hora",
                    selectedPlace.pricePerHour
                      ? new Intl.NumberFormat("es-CL", {
                          style: "currency",
                          currency: "CLP",
                          maximumFractionDigits: 0,
                        }).format(selectedPlace.pricePerHour)
                      : "Gratis",
                  ],
                  ["Sitio web", selectedPlace.websiteUrl || "Sin informar"],
                ].map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="mb-1 text-xs text-gray-400">{label}</dt>
                    <dd className="break-words leading-6">{value}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-2 text-xs text-gray-400">Horarios</p>
                <p className="text-sm leading-7 text-gray-600">
                  {selectedPlace.hours}
                </p>
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-400">Comodidades</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPlace.amenities
                    .filter((a) => a.isAvailable)
                    .map((a) => (
                      <span key={a.key} className="admin-pill">
                        {a.name}
                      </span>
                    ))}
                  {!selectedPlace.amenities.some((a) => a.isAvailable) && (
                    <span className="text-sm text-gray-500">
                      Sin comodidades registradas.
                    </span>
                  )}
                </div>
              </div>
              {selectedPlace.spaces.length > 0 && (
                <div>
                  <p className="mb-2 text-xs text-gray-400">
                    Espacios disponibles
                  </p>
                  {selectedPlace.spaces.map((space) => (
                    <p key={space.id} className="text-sm leading-7">
                      {space.name} · {space.capacity} personas
                    </p>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  className="admin-primary"
                  onClick={() => editPlace(selectedPlace)}
                >
                  <Pencil size={15} /> Editar lugar
                </Button>
                <Button
                  variant="outline"
                  disabled={!isSupabaseConfigured || isChangingStatus}
                  onClick={() => requestStatusChange(selectedPlace)}
                >
                  {selectedPlace.status === "active" ? <EyeOff size={16} /> : <Eye size={16} />}
                  {selectedPlace.status === "active" ? "Deshabilitar" : "Habilitar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
