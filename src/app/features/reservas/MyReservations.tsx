import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import { Button } from "../../components/ui/button";
import { listMyTrialReservations, transitionTrialReservation, reservationStatusLabels,
  formatReservationDate, formatReservationTime, type TrialReservation } from "../../services/reservationService";
import { useReservationFeed } from "./useReservationFeed";
import { ReservationLiveStatus } from "./ReservationLiveStatus";

export function MyReservations() {
  const navigate = useNavigate();
  const feed = useReservationFeed(listMyTrialReservations);
  const { rows, loading } = feed;
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<TrialReservation | null>(null);
  const busy = useRef(false);
  async function cancel(row: TrialReservation) {
    if (busy.current) return;
    busy.current = true; setSavingId(row.id); setError("");
    try {
      await transitionTrialReservation(row.id, "cancelled");
      feed.update((current) => current.map((item) => item.id === row.id ? { ...item, status: "cancelled" } : item));
      setCancelling(null); await feed.refresh();
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : "No pudimos cancelar la reserva."); await feed.refresh(); }
    finally { busy.current = false; setSavingId(""); }
  }
  return <div className="size-full overflow-y-auto bg-[#F8F7FC] p-4 pb-24"><div className="mx-auto max-w-3xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><Button variant="ghost" onClick={() => navigate("/app/profile")}><ArrowLeft className="mr-2 size-4" />Mi perfil</Button><h1 className="mt-2 text-2xl font-bold">Mis reservas</h1><p className="text-sm text-slate-600">Prueba sin pagos · Horarios de Chile continental</p><div className="mt-2"><ReservationLiveStatus connection={feed.connection} updating={feed.updating} /></div></div><Button variant="outline" disabled={feed.updating || Boolean(savingId)} onClick={() => { setError(""); void feed.refresh(); }}>Actualizar</Button></div>
    {(error || feed.error) && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error || feed.error}</p>}
    {loading && <p role="status">Cargando reservas…</p>}
    {!loading && !error && !feed.error && !rows.length && <p className="rounded-xl border bg-white p-6 text-slate-600">Aún no tienes reservas de prueba. Solicita una desde la ficha de un lugar que las tenga habilitadas.</p>}
    {rows.map((row) => <article key={row.id} className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{row.placeName}</h2><p className="text-sm text-slate-600">{row.spaceName} · Espacio completo</p></div><span className="rounded-lg bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800">{reservationStatusLabels[row.status]}</span></div><p className="text-sm"><Calendar className="mr-2 inline size-4" aria-hidden="true" />{formatReservationDate(row.startsAt)} · {formatReservationTime(row.startsAt)} – {formatReservationTime(row.endsAt)}</p><p className="text-sm"><Users className="mr-2 inline size-4" aria-hidden="true" />{row.guestsCount} personas · Sin pago</p>
      {(["pending","confirmed"].includes(row.status) && new Date(row.startsAt).getTime() > Date.now()) && (cancelling?.id === row.id ? <div className="space-y-2 rounded-lg bg-slate-50 p-3"><p className="text-sm">¿Cancelar esta reserva y liberar el horario?</p><div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={Boolean(savingId)} onClick={() => void cancel(row)}>{savingId === row.id ? "Cancelando…" : "Sí, cancelar"}</Button><Button variant="outline" disabled={Boolean(savingId)} onClick={() => setCancelling(null)}>Conservar reserva</Button></div></div> : <Button variant="outline" disabled={Boolean(savingId)} onClick={() => setCancelling(row)}>Cancelar reserva</Button>)}
    </article>)}
  </div></div>;
}
