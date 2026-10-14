import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import type { AppPlace } from "../../services/placeService";
import { getPlaceReservationsEnabled, setPlaceReservationsEnabled, listReservationSlots, publishReservationWeek,
  setReservationDayEnabled, setReservationSlotEnabled, formatReservationTime, getSantiagoDate, type ReservationSlot } from "../../services/reservationService";
import { calendarDate, formatCalendarDate, reservationWeekStart, shiftCalendarDate } from "../reservas/reservationDateUtils";

const weekdayNames = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const initialDays = () => weekdayNames.map((name, index) => ({ name, enabled: index < 5, start: "08:00", end: "18:00" }));

export function PlaceReservationSettings({ place, onClose }: { place: AppPlace; onClose: () => void }) {
  const [enabled, setEnabled] = useState(false);
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [spaceId, setSpaceId] = useState(place.spaces[0]?.id ?? "");
  const [week, setWeek] = useState(() => shiftCalendarDate(reservationWeekStart(getSantiagoDate()), 7));
  const [days, setDays] = useState(initialDays);
  const [selectedDay, setSelectedDay] = useState("");
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("18:00");
  const [minutes, setMinutes] = useState(60);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true; setLoading(true); setReady(false); setError("");
    void Promise.all([getPlaceReservationsEnabled(place.id), listReservationSlots(place.id, true)])
      .then(([value, rows]) => { if (active) { setEnabled(value); setSlots(rows); setReady(true); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar las reservas."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [place.id, reload]);
  async function run(operation: () => Promise<void>) {
    if (busy.current || !ready) return;
    busy.current = true; setSaving(true); setError(""); setSuccess("");
    try { await operation(); }
    catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : "No pudimos guardar el cambio."); }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  async function toggle(value: boolean) {
    await run(async () => {
      const confirmed = await setPlaceReservationsEnabled(place.id, value);
      if (mounted.current) { setEnabled(confirmed); setSuccess(value ? "Reservas de prueba activadas." : "Nuevas reservas desactivadas. Las solicitudes existentes se conservan."); }
    });
  }
  async function publish() {
    await run(async () => {
      const count = await publishReservationWeek({ spaceId, weekStart: week, minutes,
        days: publication.map((day) => ({ date: day.date, start: day.start, end: day.end })) });
      if (mounted.current) setSuccess(count ? `${count} franjas publicadas para la semana. Cada franja reserva el espacio completo.` : "Los horarios de esta semana ya estaban publicados. Se conservaron tus excepciones.");
      // A failed follow-up read must not report the confirmed mutation as failed.
      if (mounted.current) setReload((value) => value + 1);
    });
  }
  async function toggleSlot(slot: ReservationSlot) {
    await run(async () => {
      await setReservationSlotEnabled(slot.id, !slot.enabled);
      if (mounted.current) { setSlots((current) => current.map((row) => row.id === slot.id ? { ...row, enabled: !slot.enabled } : row)); setSuccess(slot.enabled ? "Franja retirada." : "Franja habilitada."); }
    });
  }
  const weekDays = days.map((day, index) => ({ ...day, date: shiftCalendarDate(week, index) }));
  const publication = weekDays.filter((day) => day.enabled && day.date >= getSantiagoDate());
  const time = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  const estimate = publication.reduce((count, day) => count + Math.max(0, (time(day.end) - time(day.start)) / minutes), 0);
  const invalidRange = publication.some((day) => !day.start || !day.end || day.end <= day.start || (time(day.end) - time(day.start)) % minutes !== 0);
  const spaceSlots = slots.filter((slot) => slot.spaceId === spaceId);
  const dates = [...new Set(spaceSlots.map((slot) => getSantiagoDate(new Date(slot.startsAt))))].sort();
  const activeDay = dates.includes(selectedDay) ? selectedDay : dates[0] ?? "";
  const visible = spaceSlots.filter((slot) => getSantiagoDate(new Date(slot.startsAt)) === activeDay);
  const unreserved = visible.filter((slot) => !slot.reserved);
  async function toggleDay(value: boolean) {
    await run(async () => {
      const count = await setReservationDayEnabled(spaceId, activeDay, value);
      if (mounted.current) {
        setSuccess(`${count} franjas ${value ? "habilitadas" : "retiradas"}. Las solicitudes y reservas existentes se conservan.`);
        setReload((current) => current + 1);
      }
    });
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy.current) onClose(); }}>
    <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl" onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onPointerDownOutside={(event) => { if (saving) event.preventDefault(); }}>
      <DialogHeader className="shrink-0 border-b border-slate-100 p-4 pr-12 text-left sm:p-5 sm:pr-12">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-indigo-600"><CalendarDays className="size-4" aria-hidden="true" />Disponibilidad y reservas</div>
        <DialogTitle className="text-base leading-snug sm:text-lg">Horarios de {place.name}</DialogTitle>
        <DialogDescription>Publica una semana por espacio y ajusta sus días o franjas cuando lo necesites.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-4 sm:p-5" data-reservation-scroll>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      {loading ? <p role="status">Cargando configuración…</p> : <>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4"><div><Label htmlFor="trial-enabled">Permitir reservas de prueba</Label><p className="mt-1 text-xs text-slate-600">Sin pagos y con tu aprobación. Desactivar conserva las reservas existentes.</p></div><Switch id="trial-enabled" checked={enabled} disabled={saving || !ready || !place.spaces.length} onCheckedChange={(value) => void toggle(value)} /></div>
        {!place.spaces.length ? <p className="text-sm text-slate-600">Agrega los espacios desde Editar lugar para configurar sus reservas.</p> : <>
          <div className="space-y-2"><Label htmlFor="managed-reservation-space">Espacio a gestionar</Label><select id="managed-reservation-space" className="h-10 w-full rounded-lg border bg-white px-3 text-sm" disabled={saving} value={spaceId} onChange={(event) => { setSpaceId(event.target.value); setSelectedDay(""); }}>{place.spaces.map((space) => <option key={space.id} value={space.id}>{space.name} · hasta {space.capacity} personas</option>)}</select></div>
          <section className="space-y-4 rounded-xl border border-slate-200 p-3 sm:p-4" aria-labelledby="weekly-schedule-title">
            <div><h3 id="weekly-schedule-title" className="font-semibold">1. Publicar una semana</h3><p className="mt-1 text-xs leading-relaxed text-slate-500">Selecciona los días y sus horarios. Se publica sólo la semana elegida, en horario de Chile continental.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1"><Label htmlFor="managed-slot-week">Semana del lunes</Label><Input id="managed-slot-week" type="date" min={reservationWeekStart(getSantiagoDate())} max={shiftCalendarDate(getSantiagoDate(), 83)} value={week} disabled={saving} onChange={(event) => { if (event.target.value) setWeek(reservationWeekStart(event.target.value)); }} /><p className="text-xs text-slate-500">Hasta el domingo {new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(calendarDate(shiftCalendarDate(week, 6)))}</p></div>
              <div className="space-y-1"><Label htmlFor="managed-slot-duration">Duración por reserva</Label><select id="managed-slot-duration" className="h-9 w-full rounded-md border bg-white px-3 text-sm" value={minutes} disabled={saving} onChange={(event) => setMinutes(Number(event.target.value))}>{[30,60,90,120,180,240,480].map((duration) => <option key={duration} value={duration}>{duration < 60 ? "30 minutos" : duration === 60 ? "1 hora" : `${duration / 60} horas`}</option>)}</select></div>
            </div>
            <div className="space-y-3 rounded-lg bg-slate-50 p-3"><p className="text-xs font-medium text-slate-600">Horario común para los días seleccionados</p><div className="grid grid-cols-2 gap-3"><div className="min-w-0 space-y-1"><Label htmlFor="managed-slot-start">Desde</Label><Input id="managed-slot-start" type="time" step={1800} value={start} disabled={saving} onChange={(event) => setStart(event.target.value)} /></div><div className="min-w-0 space-y-1"><Label htmlFor="managed-slot-end">Hasta</Label><Input id="managed-slot-end" type="time" step={1800} value={end} disabled={saving} onChange={(event) => setEnd(event.target.value)} /></div></div><Button variant="outline" size="sm" className="w-full whitespace-normal sm:w-auto" disabled={saving || end <= start} onClick={() => setDays((current) => current.map((day) => day.enabled ? { ...day, start, end } : day))}>Aplicar horario a los días seleccionados</Button></div>
            <div className="space-y-2">{weekDays.map((day, index) => <div key={day.name} className={`rounded-lg border p-3 ${day.enabled ? "border-indigo-100" : "border-slate-100 bg-slate-50"}`}>
              <div className="flex items-center justify-between gap-2"><Label htmlFor={`week-day-${index}`} className="flex flex-wrap items-baseline gap-x-2">{day.name}<span className="text-xs font-normal text-slate-500">{new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" }).format(calendarDate(day.date))}</span></Label><Switch id={`week-day-${index}`} checked={day.enabled && day.date >= getSantiagoDate()} disabled={saving || day.date < getSantiagoDate()} onCheckedChange={(value) => setDays((current) => current.map((row, i) => i === index ? { ...row, enabled: value } : row))} /></div>
              {day.enabled && day.date >= getSantiagoDate() ? <div className="mt-3 grid grid-cols-2 gap-3"><div className="min-w-0 space-y-1"><Label htmlFor={`week-start-${index}`} className="text-xs text-slate-500">Desde</Label><Input id={`week-start-${index}`} type="time" step={1800} disabled={saving} value={day.start} onChange={(event) => setDays((current) => current.map((row, i) => i === index ? { ...row, start: event.target.value } : row))} /></div><div className="min-w-0 space-y-1"><Label htmlFor={`week-end-${index}`} className="text-xs text-slate-500">Hasta</Label><Input id={`week-end-${index}`} type="time" step={1800} disabled={saving} value={day.end} onChange={(event) => setDays((current) => current.map((row, i) => i === index ? { ...row, end: event.target.value } : row))} /></div></div> : <p className="mt-1 text-xs text-slate-500">{day.date < getSantiagoDate() ? "Fecha pasada" : "Sin disponibilidad nueva"}</p>}
            </div>)}</div>
            <p className="text-xs text-slate-500">{publication.length} días seleccionados · {Number.isInteger(estimate) ? estimate : "Revisa la duración de las"} franjas. Los horarios ya publicados se conservan; los cambios posteriores se hacen abajo.</p>
            <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA]" disabled={saving || !ready || !spaceId || !publication.length || invalidRange} onClick={() => void publish()}>{saving ? "Guardando…" : "Publicar semana"}</Button>
          </section>
          <section className="space-y-3" aria-labelledby="daily-exceptions-title"><div><h3 id="daily-exceptions-title" className="font-semibold">2. Ajustar días publicados</h3><p className="mt-1 text-xs text-slate-500">Retira un día completo o sólo las franjas que no estarán disponibles. Las reservas existentes quedan protegidas.</p></div>
            {!dates.length ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Todavía no hay horarios publicados para este espacio.</p> : <>
              <div className="space-y-1"><Label htmlFor="managed-exception-date">Día a ajustar</Label><select id="managed-exception-date" className="h-10 w-full rounded-lg border bg-white px-3 text-sm" value={activeDay} disabled={saving} onChange={(event) => setSelectedDay(event.target.value)}>{dates.map((value) => <option key={value} value={value}>{formatCalendarDate(value)}</option>)}</select></div>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={saving || !unreserved.some((slot) => slot.enabled)} onClick={() => void toggleDay(false)}>Retirar día disponible</Button><Button size="sm" variant="outline" disabled={saving || !unreserved.some((slot) => !slot.enabled)} onClick={() => void toggleDay(true)}>Habilitar día disponible</Button></div>
              <div className="grid gap-2 sm:grid-cols-2">{visible.map((slot) => <div key={slot.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"><div className="text-sm"><p className="flex items-center gap-1 font-medium"><Clock className="size-3 shrink-0" aria-hidden="true" />{formatReservationTime(slot.startsAt)} – {formatReservationTime(slot.endsAt)}</p><p className={`mt-1 text-xs ${slot.reserved ? "text-amber-700" : slot.enabled ? "text-emerald-700" : "text-slate-400"}`}>{slot.reserved ? "Reservada / pendiente" : slot.enabled ? "Disponible" : "Retirada"}</p></div><Button size="sm" variant="outline" disabled={saving || slot.reserved} onClick={() => void toggleSlot(slot)}>{slot.enabled ? "Retirar" : "Habilitar"}</Button></div>)}</div>
              {visible.some((slot) => slot.reserved) && <p className="text-xs text-amber-700">Las franjas reservadas no se retiran desde aquí.</p>}
            </>}
          </section>
        </>}
      </>}
      </div>
      <div className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-slate-100 bg-slate-50/70 p-4"><Button variant="outline" disabled={saving || loading} onClick={() => setReload((value) => value + 1)}>Actualizar configuración</Button><Button className="bg-[#4F46E5] hover:bg-[#4338CA]" disabled={saving} onClick={onClose}>Listo</Button></div>
    </DialogContent>
  </Dialog>;
}
