import { LoaderCircle, Radio, WifiOff } from "lucide-react";
import type { ReservationConnection } from "../../services/reservationRealtimeService";

export function ReservationLiveStatus({ connection, updating }: { connection: ReservationConnection; updating: boolean }) {
  const Icon = updating ? LoaderCircle : connection === "connected" ? Radio : connection === "connecting" ? LoaderCircle : WifiOff;
  return <span role="status" className={`inline-flex items-center gap-2 text-xs font-medium ${connection === "connected" ? "text-emerald-700" : "text-slate-600"}`}>
    <Icon aria-hidden="true" className={`size-3.5 ${updating || connection === "connecting" ? "motion-safe:animate-spin" : ""}`} />
    {updating ? "Actualizando reservas…" : connection === "connected" ? "Actualización en vivo" : connection === "connecting" ? "Conectando actualización en vivo…" : "Sin conexión en vivo · puedes actualizar manualmente"}
  </span>;
}
