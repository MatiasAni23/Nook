import { useMemo, useState } from "react";
import { Building2, Calendar, Clock, Coffee, Edit, EyeOff, MapPin, Plus, Search, Star, Users, Wifi } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getCachedCurrentDelegatePlaces, listCurrentDelegatePlaces, type DelegateAssignedPlace } from "../../services/adminManagementService";
import { setManagedPlaceStatus, type AppPlace } from "../../services/placeService";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { AdminAddPlace } from "../admin/AdminAddPlace";
import { AdminEditPlace } from "../admin/AdminEditPlace";
import { PlaceReservationSettings } from "./PlaceReservationSettings";
import { useDelegateData } from "./useDelegateData";
import { DelegatePage, DelegateRefresh, DelegateNotice, DelegateSkeleton } from "./DelegatePage";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export function DelegateMyPlaces() {
  const [view, setView] = useState<"list" | "add" | "edit">("list");
  const [editingPlace, setEditingPlace] = useState<DelegateAssignedPlace | null>(null);
  const read = useDelegateData(listCurrentDelegatePlaces, getCachedCurrentDelegatePlaces);
  const myPlaces = read.data ?? [];
  const setMyPlaces = (update: (current: DelegateAssignedPlace[]) => DelegateAssignedPlace[]) => read.setData((current) => update(current ?? []));
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const visible = useMemo(() => myPlaces.filter((place) => (filter === "all" || place.status === filter) && `${place.name} ${place.address}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(search.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim())), [myPlaces, filter, search]);
  const [placeToDisable, setPlaceToDisable] = useState<DelegateAssignedPlace | null>(null);
  const [isDisabling, setIsDisabling] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reservationPlace, setReservationPlace] = useState<DelegateAssignedPlace | null>(null);

  const handleDisable = async () => {
    if (!placeToDisable || isDisabling) return;
    setIsDisabling(true);
    setStatusError("");
    setSuccessMessage("");
    try {
      const status = await setManagedPlaceStatus(placeToDisable.id, "inactive");
      setMyPlaces((current) => current.map((place) =>
        place.id === placeToDisable.id ? { ...place, status } : place,
      ));
      setSuccessMessage(`“${placeToDisable.name}” se deshabilitó. Su información e historial se conservan.`);
      setPlaceToDisable(null);
    } catch {
      setStatusError("No pudimos deshabilitar el lugar. Vuelve a intentarlo.");
    } finally {
      setIsDisabling(false);
    }
  };

  const handleEdit = (place: DelegateAssignedPlace) => {
    setEditingPlace(place);
    setView("edit");
  };

  const handleSaveComplete = (updatedPlace?: AppPlace) => {
    if (updatedPlace) {
      setMyPlaces((current) =>
        current.map((place) => place.id === updatedPlace.id ? { ...place, ...updatedPlace } : place),
      );
    }
    setView("list");
    setEditingPlace(null);
  };


  const getTypeLabel = (type: string) => {
    switch (type) {
      case "library":
        return "Biblioteca";
      case "cafe":
        return "Cafetería";
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
          <AdminAddPlace showPlanType={false} onBack={() => setView("list")} onCreated={(place) => {
            setMyPlaces((current) => [{ ...place, reservationsCount: 0, status: "active" }, ...current]);
            setView("list");
          }} />
        </div>
      </div>
    );
  }

  if (view === "edit" && editingPlace) {
    return (
      <div className="size-full flex flex-col">
        <div className="flex-1 overflow-hidden">
          <AdminEditPlace place={editingPlace} onSave={handleSaveComplete} onBack={() => { setView("list"); setEditingPlace(null); }} showPlanType={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <DelegatePage eyebrow="Tus espacios en Pinwi" title="Mis lugares" description="Mantén tus fichas al día y organiza la disponibilidad de cada espacio." actions={<><DelegateRefresh updating={read.updating} onClick={() => void read.refresh()} /><Button onClick={() => setView("add")} className="bg-[#4F46E5] hover:bg-[#4338CA]"><Plus className="mr-2 size-4" aria-hidden="true" />Agregar lugar</Button></>}>
        {read.error && <DelegateNotice>{read.error}</DelegateNotice>}
        {successMessage && <DelegateNotice success>{successMessage}</DelegateNotice>}
        {read.loading ? <DelegateSkeleton cards={4} /> : <>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">{[
            { label: "Lugares", value: myPlaces.length, icon: MapPin },
            { label: "En el mapa", value: myPlaces.filter((p) => p.status === "active").length, icon: Building2 },
            { label: "Espacios", value: myPlaces.reduce((n, p) => n + p.spaces.length, 0), icon: Users },
          ].map(({ label, value, icon: Icon }) => <div key={label} className="rounded-2xl border border-[#E6E8F2] bg-white p-3 sm:p-5"><div className="flex items-center justify-between text-xs font-medium text-[#78728D] sm:text-sm">{label}<Icon className="hidden size-4 text-indigo-400 sm:block" aria-hidden="true" /></div><p className="mt-2 text-2xl font-bold text-[#302A47]">{read.error && !read.data ? "—" : value}</p></div>)}</div>
          <div className="grid gap-3 rounded-2xl border border-[#E6E8F2] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:p-4">
            <div className="relative"><Label htmlFor="delegate-place-search" className="sr-only">Buscar lugares</Label><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#9A93AD]" aria-hidden="true" /><Input id="delegate-place-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o dirección" className="border-[#E7E4F0] bg-[#FAFAFD] pl-9" /></div>
            <div><Label htmlFor="delegate-place-filter" className="sr-only">Estado del lugar</Label><select id="delegate-place-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="h-9 w-full rounded-md border border-[#E7E4F0] bg-[#FAFAFD] px-3 text-sm"><option value="all">Todos mis lugares</option><option value="active">Visibles en el mapa</option><option value="inactive">Deshabilitados</option></select></div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">{visible.map((place) => <article key={place.id} className="overflow-hidden rounded-2xl border border-[#E6E8F2] bg-white shadow-[0_3px_14px_rgba(41,32,75,0.03)]">
            <div className="relative h-44 overflow-hidden bg-gradient-to-br from-indigo-100 via-[#F0ECFF] to-[#E4E8FB]">
              {place.images[0] ? <img src={place.images[0]} alt="" loading="lazy" className="size-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : <div className="flex size-full items-center justify-center">{place.type === "cafe" ? <Coffee className="size-12 text-indigo-300" aria-hidden="true" /> : <Building2 className="size-12 text-indigo-300" aria-hidden="true" />}</div>}
              <span className={"absolute left-4 top-4 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm " + (place.status === "active" ? "border-emerald-100 bg-white/95 text-emerald-700" : "border-slate-200 bg-white/95 text-slate-600")}>{place.status === "active" ? "Visible en el mapa" : "Oculto del mapa"}</span>
              <Badge className="absolute bottom-3 left-4 border-0 bg-white/95 text-[#61547E]">{getTypeLabel(place.type)}</Badge>
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-lg font-bold text-[#302A47]">{place.name}</h2><p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-[#8A839B]"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{place.address || "Dirección pendiente"}</p></div>{place.reviews > 0 && <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-[#61547E]"><Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />{place.rating.toFixed(1)}</span>}</div>
              <div className="flex flex-wrap gap-2 text-xs text-[#79728B]"><span className="rounded-lg bg-[#F6F5FB] px-2 py-1">{place.spaces.length} espacios</span><span className="rounded-lg bg-[#F6F5FB] px-2 py-1">{place.reservationsCount} {place.reservationsCount === 1 ? "reserva" : "reservas"}</span>{place.wifi && <span className="flex items-center gap-1 rounded-lg bg-[#F6F5FB] px-2 py-1"><Wifi className="size-3" aria-hidden="true" />WiFi</span>}</div>
              <p className="flex items-start gap-2 text-xs leading-relaxed text-[#8A839B]"><Clock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{place.hours}</p>
              <Button variant="outline" className="h-10 w-full border-indigo-200 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100" disabled={place.status !== "active" || !isSupabaseConfigured} onClick={() => setReservationPlace(place)}><Calendar className="mr-2 size-4" aria-hidden="true" />Reservas y horarios</Button>
              <div className="flex flex-wrap gap-2 border-t border-[#EFEDF6] pt-3"><Button variant="ghost" size="sm" className="flex-1 text-[#6257BD] hover:bg-indigo-50" onClick={() => handleEdit(place)}><Edit className="mr-1.5 size-4" aria-hidden="true" />Editar lugar</Button><Button variant="ghost" size="sm" disabled={place.status !== "active" || isDisabling || !isSupabaseConfigured} className="flex-1 text-[#8A728A] hover:bg-rose-50 hover:text-rose-700" onClick={() => { setStatusError(""); setPlaceToDisable(place); }}><EyeOff className="mr-1.5 size-4" aria-hidden="true" />{place.status === "inactive" ? "Deshabilitado" : "Deshabilitar"}</Button></div>
            </div>
          </article>)}</div>
          {!visible.length && (!read.error || read.data) && <div className="rounded-2xl border border-dashed border-[#DFDAEE] bg-white/70 p-10 text-center"><MapPin className="mx-auto mb-3 size-10 text-[#B1A7D1]" aria-hidden="true" /><h2 className="font-semibold text-[#4B425F]">{myPlaces.length ? "No hay lugares con estos filtros" : "Tus lugares aparecerán aquí"}</h2><p className="mt-2 text-sm text-[#8B829D]">{myPlaces.length ? "Prueba otra búsqueda o cambia el estado." : "Agrega tu primer lugar o espera una asignación de administración."}</p>{myPlaces.length > 0 && <Button variant="ghost" className="mt-3 text-indigo-600" onClick={() => { setSearch(""); setFilter("all"); }}>Limpiar filtros</Button>}</div>}
        </>}
      </DelegatePage>
      {reservationPlace && <PlaceReservationSettings key={reservationPlace.id} place={reservationPlace} onClose={() => setReservationPlace(null)} />}
      <AlertDialog open={Boolean(placeToDisable)} onOpenChange={(open) => { if (!open && !isDisabling) setPlaceToDisable(null); }}>
        <AlertDialogContent className="admin-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Deshabilitar este lugar?</AlertDialogTitle>
            <AlertDialogDescription>
              “{placeToDisable?.name}” se ocultará del mapa y de Descubrir. Su información,
              reservas e historial se conservarán. Un administrador podrá volver a habilitarlo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {statusError && <p className="text-sm text-red-700" role="alert">{statusError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDisabling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={isDisabling} className="admin-status-confirm" onClick={(event) => { event.preventDefault(); void handleDisable(); }}>
              {isDisabling ? "Guardando…" : "Deshabilitar lugar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
