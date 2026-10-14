import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, List, MapPin, Search, Users, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { DelegateReservationSkeleton } from "./DelegatePage";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../../components/ui/alert-dialog";
import { getCachedDelegateReservations, invalidateDelegateReadCaches, listCurrentDelegateReservations, refreshCurrentDelegateReservations, updateDelegateReservationStatus, type DelegateReservation, type DelegateReservationStatus } from "../../services/delegateService";
import { formatReservationDate, formatReservationTime, getSantiagoDate, reservationStatusLabels } from "../../services/reservationService";
import { ReservationLiveStatus } from "../reservas/ReservationLiveStatus";
import { useReservationFeed } from "../reservas/useReservationFeed";
import { reservationBucket, reservationDays, reservationHasEnded, reservationHasStarted, reservationMonthGrid, shiftReservationMonth, type ReservationBucket } from "./reservationPresentation";

type Action = Exclude<DelegateReservationStatus, "pending">;
const filters: { id: ReservationBucket; title: string; description: string }[] = [
  { id: "pending", title: "Por aprobar", description: "Solicitudes que necesitan tu respuesta" },
  { id: "upcoming", title: "Próximas reservas", description: "Confirmadas y todavía en curso o por venir" },
  { id: "history", title: "Historial", description: "Finalizadas, canceladas y rechazadas" },
];
const statusStyles: Record<DelegateReservationStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  confirmed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
  completed: "border-indigo-200 bg-indigo-50 text-indigo-800",
};
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const dayLabel = (day: string) => formatReservationDate(day + "T12:00:00Z");
const currency = (amount: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(amount);

function ReservationCard({ row, saving, onAction }: { row: DelegateReservation; saving: boolean; onAction: (row: DelegateReservation, action: Action) => void }) {
  const days = reservationDays(row);
  const dateText = days.length > 1 ? dayLabel(days[0]) + " — " + dayLabel(days[days.length - 1]) : days[0] ? dayLabel(days[0]) : "Fecha no informada";
  const started = reservationHasStarted(row);
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E6E8F2] bg-white shadow-[0_3px_16px_rgba(30,27,75,0.025)]">
      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[#77738E]"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="break-words">{row.placeName}</span></p>
            <h3 className="break-words text-lg font-bold text-[#242039]">{row.spaceName}</h3>
            <p className="mt-2 break-words text-sm text-[#6C687E]">Solicita <span className="font-semibold text-[#35314D]">{row.userName}</span></p>
          </div>
          <span className={"inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold " + statusStyles[row.status]}>
            {row.status === "confirmed" ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : row.status === "pending" ? <Clock3 className="size-3.5" aria-hidden="true" /> : null}
            {row.status === "pending" ? "Por aprobar" : reservationStatusLabels[row.status]}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-[#F8F8FC] p-3 sm:grid-cols-3 sm:p-4">
          <div><dt className="mb-1 flex items-center gap-1.5 text-xs text-[#817B96]"><CalendarDays className="size-3.5" aria-hidden="true" />Fecha</dt><dd className="text-sm font-semibold text-[#35314D]">{dateText}</dd></div>
          <div><dt className="mb-1 flex items-center gap-1.5 text-xs text-[#817B96]"><Clock3 className="size-3.5" aria-hidden="true" />Horario de Chile</dt><dd className="text-sm font-semibold text-[#35314D]">{row.startsAt ? formatReservationTime(row.startsAt) : row.startTime} – {row.endsAt ? formatReservationTime(row.endsAt) : row.endTime}</dd></div>
          <div><dt className="mb-1 flex items-center gap-1.5 text-xs text-[#817B96]"><Users className="size-3.5" aria-hidden="true" />Grupo</dt><dd className="text-sm font-semibold text-[#35314D]">{row.guestsCount} {row.guestsCount === 1 ? "persona" : "personas"}<span className="mt-0.5 block text-xs font-normal text-[#817B96]">Espacio completo</span></dd></div>
        </dl>
        {row.notes && <div className="border-l-2 border-indigo-200 pl-3"><p className="mb-1 text-xs font-semibold text-[#77738E]">Comentario de la solicitud</p><p className="whitespace-pre-line break-words text-sm text-[#514B66]">{row.notes}</p></div>}
        {row.status === "pending" && started && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">El horario de inicio ya pasó. Rechaza la solicitud para cerrar el registro.</p>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEEFF5] px-4 py-3 sm:px-5">
        <span className="text-xs font-medium text-[#817B96]">{row.isTrial ? "Prueba sin pago" : "Monto de la reserva: " + currency(row.totalAmount)}</span>
        <div className="flex flex-wrap gap-2">
          {row.status === "pending" && <>
            <Button size="sm" variant="outline" disabled={saving} className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={() => onAction(row, "rejected")}><X className="mr-1 size-4" aria-hidden="true" />Rechazar</Button>
            <Button size="sm" disabled={saving || started} title={started ? "El horario ya pasó" : undefined} className="bg-[#4F46E5] hover:bg-[#4338CA]" onClick={() => onAction(row, "confirmed")}><Check className="mr-1 size-4" aria-hidden="true" />Aprobar</Button>
          </>}
          {row.status === "confirmed" && <>
            <Button size="sm" variant="outline" disabled={saving} onClick={() => onAction(row, "cancelled")}>Cancelar reserva</Button>
            {reservationHasEnded(row) && <Button size="sm" variant="outline" disabled={saving} onClick={() => onAction(row, "completed")}>Marcar finalizada</Button>}
          </>}
        </div>
      </div>
    </article>
  );
}

export function DelegateReservations() {
  const feed = useReservationFeed(listCurrentDelegateReservations, {
    getCached: getCachedDelegateReservations, loadFresh: refreshCurrentDelegateReservations, invalidate: invalidateDelegateReadCaches,
  });
  const [bucket, setBucket] = useState<ReservationBucket>("pending");
  const [search, setSearch] = useState("");
  const [placeFilter, setPlaceFilter] = useState("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [month, setMonth] = useState(() => getSantiagoDate().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState("");
  const [savingId, setSavingId] = useState("");
  const [actionTarget, setActionTarget] = useState<{ row: DelegateReservation; action: "rejected" | "cancelled" } | null>(null);
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const busy = useRef(false);
  const today = getSantiagoDate();
  const counts = useMemo(() => ({
    pending: feed.rows.filter((row) => reservationBucket(row) === "pending").length,
    upcoming: feed.rows.filter((row) => reservationBucket(row) === "upcoming").length,
    history: feed.rows.filter((row) => reservationBucket(row) === "history").length,
  }), [feed.rows, today]);
  const places = [...new Map(feed.rows.map((row) => [row.placeId, row.placeName])).entries()];
  const inScope = feed.rows.filter((row) => (!placeFilter || row.placeId === placeFilter) && normalize([row.userName, row.placeName, row.spaceName].join(" ")).includes(normalize(search.trim())));
  const visible = inScope.filter((row) => reservationBucket(row) === bucket && (!selectedDay || view !== "calendar" || reservationDays(row).includes(selectedDay)))
    .sort((a, b) => bucket === "history" ? b.createdAt.getTime() - a.createdAt.getTime() : (reservationDays(a)[0] ?? "").localeCompare(reservationDays(b)[0] ?? "") || a.startTime.localeCompare(b.startTime));
  const activeFilter = filters.find((filter) => filter.id === bucket)!;
  async function transition(row: DelegateReservation, action: Action) {
    if (busy.current) return false;
    busy.current = true; setSavingId(row.id); setActionError(""); setSuccess("");
    try {
      await updateDelegateReservationStatus(row.id, action, row.isTrial);
      feed.update((current) => current.map((item) => item.id === row.id ? { ...item, status: action } : item));
      setSuccess(action === "confirmed" ? "Reserva confirmada." : action === "rejected" ? "Solicitud rechazada." : action === "cancelled" ? "Reserva cancelada." : "Reserva finalizada.");
      await feed.refresh();
      return true;
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "No pudimos actualizar la reserva.");
      await feed.refresh();
      return false;
    } finally { busy.current = false; setSavingId(""); }
  }
  function onAction(row: DelegateReservation, action: Action) {
    if (action === "rejected" || action === "cancelled") { setActionError(""); setActionTarget({ row, action }); }
    else void transition(row, action);
  }
  return (
    <div className="min-h-full bg-[#F6F7FB] px-4 py-5 pb-24 sm:px-6 sm:py-7">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#8D86AA]">Tu agenda de espacios</p><h1 className="text-2xl font-bold tracking-tight text-[#26213C] sm:text-3xl">Reservas</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-[#78728D]">Revisa las solicitudes y organiza los grupos que llegarán a tus lugares.</p><div className="mt-3"><ReservationLiveStatus connection={feed.connection} updating={feed.updating} /></div></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={feed.updating || Boolean(savingId)} onClick={() => void feed.refresh()}>Actualizar</Button><Button asChild className="bg-[#4F46E5] hover:bg-[#4338CA]"><Link to="/delegate/places"><CalendarDays className="mr-2 size-4" aria-hidden="true" />Configurar horarios</Link></Button></div>
        </header>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">{filters.map((filter, index) => <button key={filter.id} type="button" aria-pressed={bucket === filter.id} onClick={() => { setBucket(filter.id); setSelectedDay(""); }} className={"rounded-2xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:p-5 " + (bucket === filter.id ? "border-indigo-300 bg-white shadow-[0_4px_18px_rgba(79,70,229,0.06)]" : "border-[#E6E8F2] bg-white/65 hover:bg-white")}>
          <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[#55506C] sm:text-sm">{filter.title}{index === 0 ? <Clock3 className="hidden size-4 text-amber-600 sm:block" aria-hidden="true" /> : index === 1 ? <CheckCircle2 className="hidden size-4 text-emerald-600 sm:block" aria-hidden="true" /> : <CalendarDays className="hidden size-4 text-indigo-500 sm:block" aria-hidden="true" />}</span><span className="mt-2 block text-2xl font-bold text-[#2F2945] sm:text-3xl">{feed.loading || !feed.lastUpdated ? "—" : counts[filter.id]}</span><span className="mt-1 hidden text-xs leading-relaxed text-[#8A839C] sm:block">{filter.description}</span>
        </button>)}</div>
        {(feed.error || actionError) && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{actionError || feed.error}</p>}
        {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />{success}</p>}
        <section className="space-y-4" aria-labelledby="reservation-list-heading" aria-busy={feed.loading}>
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="reservation-list-heading" className="text-lg font-bold text-[#302A47]">{activeFilter.title}</h2><p className="mt-1 text-xs text-[#8A839C]">{selectedDay && view === "calendar" ? dayLabel(selectedDay) : "Todos los horarios se muestran en Chile continental."}</p></div><div className="inline-flex rounded-xl border border-[#E5E4EF] bg-white p-1" role="group" aria-label="Vista de reservas">{(["list", "calendar"] as const).map((mode) => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => { setView(mode); setSelectedDay(""); }} className={"inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-indigo-600 " + (view === mode ? "bg-[#EFEDFF] text-[#4F46E5]" : "text-[#827B95]")}>{mode === "list" ? <List className="size-4" aria-hidden="true" /> : <CalendarDays className="size-4" aria-hidden="true" />}{mode === "list" ? "Lista" : "Calendario"}</button>)}</div></div>
          <div className="grid gap-3 rounded-2xl border border-[#E6E8F2] bg-white p-3 sm:grid-cols-[minmax(0,1fr)_15rem] sm:p-4">
            <div><Label className="sr-only" htmlFor="reservation-search">Buscar persona, lugar o espacio</Label><div className="relative"><Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-[#9A93AD]" aria-hidden="true" /><Input id="reservation-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar persona, lugar o espacio" className="border-[#E7E4F0] bg-[#FAFAFD] pl-9" /></div></div>
            <div><Label className="sr-only" htmlFor="reservation-place-filter">Filtrar por lugar</Label><select id="reservation-place-filter" value={placeFilter} onChange={(event) => setPlaceFilter(event.target.value)} className="h-9 w-full rounded-md border border-[#E7E4F0] bg-[#FAFAFD] px-3 text-sm text-[#615972]"><option value="">Todos mis lugares</option>{places.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          </div>
          <div className={view === "calendar" ? "grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]" : ""}>
            {view === "calendar" && <aside className="rounded-2xl border border-[#E6E8F2] bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-2"><Button size="icon" variant="ghost" aria-label="Mes anterior" onClick={() => { setMonth(shiftReservationMonth(month, -1)); setSelectedDay(""); }}><ChevronLeft className="size-4" /></Button><h3 className="text-sm font-bold capitalize text-[#3B3452]">{new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", month: "long", year: "numeric" }).format(new Date(month + "-15T12:00:00Z"))}</h3><Button size="icon" variant="ghost" aria-label="Mes siguiente" onClick={() => { setMonth(shiftReservationMonth(month, 1)); setSelectedDay(""); }}><ChevronRight className="size-4" /></Button></div>
              <div className="grid grid-cols-7 gap-1 text-center">{["L", "M", "M", "J", "V", "S", "D"].map((day, index) => <span key={index} className="pb-2 text-[11px] font-semibold text-[#9992AB]">{day}</span>)}{reservationMonthGrid(month).map((day, index) => {
                if (!day) return <span key={index} />;
                const count = inScope.filter((row) => reservationBucket(row) === bucket && reservationDays(row).includes(day)).length;
                return <button key={day} type="button" aria-label={dayLabel(day) + ", " + count + " reservas"} aria-pressed={selectedDay === day} onClick={() => setSelectedDay(day)} className={"flex min-h-11 flex-col items-center justify-center rounded-lg text-xs focus-visible:outline-2 focus-visible:outline-indigo-600 " + (selectedDay === day ? "bg-[#4F46E5] font-bold text-white" : count ? "bg-[#F0EEFF] font-semibold text-[#6257BD]" : "text-[#817A92] hover:bg-[#F6F5FB]") + (day === today && selectedDay !== day ? " ring-1 ring-indigo-300" : "")}><span>{Number(day.slice(-2))}</span>{count > 0 && <span className="text-[9px]">{count}</span>}</button>;
              })}</div>
              <Button variant="ghost" size="sm" className="mt-3 w-full text-[#6E63BF]" onClick={() => { setMonth(today.slice(0, 7)); setSelectedDay(""); }}>Ver todas las reservas</Button>
            </aside>}
            <div className="min-w-0 space-y-3">
              {feed.error && !feed.lastUpdated && <p className="rounded-xl border bg-white p-5 text-sm text-slate-600">No pudimos obtener la lista de reservas. Vuelve a intentarlo con Actualizar.</p>}
              {(!feed.error || feed.lastUpdated) && <>
              {feed.loading ? <DelegateReservationSkeleton /> : visible.length ? visible.map((row) => <ReservationCard key={row.id} row={row} saving={Boolean(savingId)} onAction={onAction} />) : <div className="rounded-2xl border border-dashed border-[#DFDAEE] bg-white/70 px-5 py-10 text-center"><CalendarDays className="mx-auto mb-3 size-9 text-[#B1A7D1]" aria-hidden="true" /><h3 className="font-semibold text-[#4B425F]">{search || placeFilter || selectedDay ? "No hay reservas con estos filtros" : bucket === "pending" ? "No tienes solicitudes por aprobar" : bucket === "upcoming" ? "Aún no hay próximas reservas" : "El historial aparecerá aquí"}</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#8B829D]">{bucket === "pending" ? "Las nuevas solicitudes aparecerán automáticamente cuando llegue una reserva." : "Puedes cambiar de vista o revisar las otras categorías."}</p>{(search || placeFilter || selectedDay) && <Button variant="ghost" className="mt-3 text-indigo-600" onClick={() => { setSearch(""); setPlaceFilter(""); setSelectedDay(""); }}>Limpiar filtros</Button>}</div>}
              </>}
            </div>
          </div>
        </section>
      </div>
      <AlertDialog open={Boolean(actionTarget)} onOpenChange={(open) => { if (!open && !busy.current) setActionTarget(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{actionTarget?.action === "rejected" ? "¿Rechazar esta solicitud?" : "¿Cancelar esta reserva?"}</AlertDialogTitle><AlertDialogDescription>{actionTarget?.row.userName} reservó {actionTarget?.row.spaceName}. Se liberará su horario y se notificará el cambio en la app.</AlertDialogDescription></AlertDialogHeader>
          {actionError && <p role="alert" className="text-sm text-rose-700">{actionError}</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={Boolean(savingId)}>Volver</AlertDialogCancel><AlertDialogAction disabled={Boolean(savingId)} className="bg-rose-600 hover:bg-rose-700" onClick={(event) => { event.preventDefault(); if (actionTarget) void transition(actionTarget.row, actionTarget.action).then((saved) => { if (saved) setActionTarget(null); }); }}>{savingId ? "Guardando…" : actionTarget?.action === "rejected" ? "Sí, rechazar" : "Sí, cancelar"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
