import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { CalendarDays, CheckCircle2, Clock3, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { createTrialReservation, listReservationSlots, formatReservationDate, formatReservationTime, getSantiagoDate, type ReservationSlot } from "../../services/reservationService";
import type { PlaceSpace } from "../../services/placeService";
import { ReservationCalendar } from "../reservas/ReservationCalendar";
import { formatCalendarDate } from "../reservas/reservationDateUtils";

export function ReservationModal({ placeId, placeName, initialSpaceId, spaces: placeSpaces = [], onClose }: {
  placeId: string; placeName: string; initialSpaceId?: string; spaces?: Pick<PlaceSpace, "id" | "name">[]; onClose: () => void;
}) {
  const navigate = useNavigate();
  const [slots, setSlots] = useState<ReservationSlot[]>([]);
  const [spaceId, setSpaceId] = useState(initialSpaceId ?? placeSpaces[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [guests, setGuests] = useState("1");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [reload, setReload] = useState(0);
  const busy = useRef(false);
  const retry = useRef<{ payload: string; id: string } | null>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void listReservationSlots(placeId).then((next) => {
      if (!active) return;
      setSlots(next);
      setSpaceId((current) => current || next[0]?.spaceId || "");
    }).catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "No pudimos cargar los horarios."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [placeId, reload]);
  const spaces = [...new Map([...placeSpaces.map((space) => [space.id, space] as const), ...slots.map((slot) => [slot.spaceId, { id: slot.spaceId, name: slot.spaceName }] as const)]).values()];
  const dates = [...new Set(slots.filter((slot) => slot.spaceId === spaceId).map((slot) => getSantiagoDate(new Date(slot.startsAt))))].sort();
  const selectedDate = dates.includes(date) ? date : dates[0] ?? "";
  const visible = slots.filter((slot) => slot.spaceId === spaceId && getSantiagoDate(new Date(slot.startsAt)) === selectedDate);
  const selected = visible.find((slot) => slot.id === selectedId && !slot.reserved);
  async function reserve() {
    if (!selected || busy.current) return;
    if (!Number.isInteger(Number(guests)) || Number(guests) < 1 || Number(guests) > selected.capacity) {
      setError(`El grupo debe tener entre 1 y ${selected.capacity} personas.`); return;
    }
    busy.current = true; setSaving(true); setError("");
    const payload = JSON.stringify([selected.id, Number(guests), notes.trim()]);
    if (retry.current?.payload !== payload) retry.current = { payload, id: crypto.randomUUID() };
    try {
      await createTrialReservation({ slotId: selected.id, guests: Number(guests), notes: notes.trim(), requestId: retry.current.id });
      if (mounted.current) setSuccess(true);
    } catch (cause) {
      if (mounted.current) { setError(cause instanceof Error ? cause.message : "No pudimos solicitar la reserva."); setSelectedId(""); setReload((value) => value + 1); }
    } finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy.current) onClose(); }}>
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-3xl" onEscapeKeyDown={(event) => { if (saving) event.preventDefault(); }} onPointerDownOutside={(event) => { if (saving) event.preventDefault(); }}>
        <DialogHeader className="shrink-0 border-b border-slate-100 p-4 pr-12 text-left sm:p-5 sm:pr-12">
          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-indigo-600"><CalendarDays className="size-4" aria-hidden="true" />Reserva de prueba · sin pago</div>
          <DialogTitle className="text-base leading-snug sm:text-lg">Reservar en {placeName}</DialogTitle>
          <DialogDescription>Elige un espacio y un horario para tu grupo. El delegado revisará tu solicitud.</DialogDescription>
        </DialogHeader>
        {!success && error && <div className="shrink-0 border-b border-red-100 bg-red-50 px-4 py-3 sm:px-5"><p role="alert" className="text-sm text-red-700">{error}</p></div>}
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5" data-reservation-scroll>
        {success ? <div className="space-y-4 py-3"><CheckCircle2 className="size-10 text-emerald-600" aria-hidden="true" /><h3 className="font-semibold">Solicitud recibida</h3><p className="text-sm text-slate-600">Quedó pendiente de aprobación. Puedes revisar el estado y cancelar antes del inicio desde Mis reservas.</p><Button className="w-full" onClick={() => { onClose(); navigate("/app/reservations"); }}>Ver mis reservas</Button></div> : <div className="space-y-4">
          {error && <Button variant="outline" disabled={saving} onClick={() => { onClose(); navigate("/app/reservations"); }}>Revisar mis solicitudes antes de reintentar</Button>}
          {loading ? <p role="status">Cargando horarios…</p> : !slots.length ? <div className="space-y-3"><p className="text-sm text-slate-600">No hay horarios reservables publicados para este lugar.</p><Button variant="outline" onClick={() => { setError(""); setReload((value) => value + 1); }}>Volver a cargar</Button></div> : <>
            <div className="space-y-2"><Label htmlFor="reservation-space">Espacio</Label><select id="reservation-space" className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={spaceId} disabled={saving} onChange={(event) => { setSpaceId(event.target.value); setSelectedId(""); setDate(""); }}>{spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}</select></div>
            {dates.length > 0 ? <div className="grid gap-5 sm:grid-cols-[280px_minmax(0,1fr)]">
              <section aria-label="Elige una fecha" className="space-y-3 rounded-xl border border-slate-200 p-3">
                <h3 className="text-sm font-semibold">1. Elige una fecha</h3>
                <ReservationCalendar dates={dates} selected={selectedDate} disabled={saving} onSelect={(value) => { setDate(value); setSelectedId(""); }} />
                <p className="text-center text-xs text-slate-500">Sólo puedes elegir días con horarios publicados.</p>
              </section>
              <fieldset className="min-w-0 space-y-3"><legend className="mb-2 text-sm font-semibold">2. Elige un horario</legend>
                <p className="text-sm capitalize text-slate-600">{formatCalendarDate(selectedDate)}</p>
                <div className="grid grid-cols-2 gap-2">{visible.map((slot) => <button key={slot.id} type="button" aria-pressed={selectedId === slot.id} disabled={saving || slot.reserved} onClick={() => setSelectedId(slot.id)} className={`rounded-xl border px-2 py-3 text-sm transition focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 ${selectedId === slot.id ? "border-indigo-600 bg-indigo-50 font-medium text-indigo-800 ring-1 ring-indigo-600" : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"}`}>{formatReservationTime(slot.startsAt)} – {formatReservationTime(slot.endsAt)}{slot.reserved && <span className="mt-1 block text-xs">Ocupado</span>}</button>)}</div>
                <p className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="size-3" aria-hidden="true" />Horarios de Chile continental</p>
              </fieldset>
            </div> : <p className="text-sm text-slate-600">Este espacio aún no tiene horarios publicados. Puedes seleccionar otro espacio.</p>}
            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="space-y-2"><Label htmlFor="reservation-guests"><Users className="mr-1 inline size-4" aria-hidden="true" />Personas del grupo{selected && ` (máximo ${selected.capacity})`}</Label><Input id="reservation-guests" type="number" min={1} max={selected?.capacity} step={1} value={guests} disabled={saving} onChange={(event) => setGuests(event.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="reservation-notes">Comentario para el delegado (opcional)</Label><Textarea id="reservation-notes" maxLength={500} value={notes} disabled={saving} onChange={(event) => setNotes(event.target.value)} placeholder="Por ejemplo, el propósito de la reunión" /></div>
            </div>
          </>}
        </div>}
        </div>
        {!success && <div className="shrink-0 space-y-3 border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
          {selected && <p className="text-sm text-slate-700"><span className="font-medium">{selected.spaceName}</span> · {formatReservationDate(selected.startsAt)} · {formatReservationTime(selected.startsAt)}–{formatReservationTime(selected.endsAt)}</p>}
          <Button className="w-full bg-[#4F46E5] hover:bg-[#4338CA]" disabled={!selected || saving || loading} onClick={reserve}>{saving ? "Enviando solicitud…" : "Solicitar reserva sin pago"}</Button>
          <p className="text-center text-xs text-slate-500">Sin pago ni tarjeta. La reserva se confirma cuando el delegado la aprueba.</p>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
