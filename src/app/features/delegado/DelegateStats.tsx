import { Link } from "react-router";
import { BarChart3, CalendarDays, CheckCircle2, Crown, LockKeyhole, MapPin, Users } from "lucide-react";
import { Button } from "../../components/ui/button";
import { getCachedDelegateDashboard, getCurrentDelegateDashboard } from "../../services/delegateService";
import { useDelegateData } from "./useDelegateData";
import { DelegatePage, DelegateRefresh, DelegateNotice, DelegateSkeleton } from "./DelegatePage";
import { reservationBucket } from "./reservationPresentation";

export function DelegateStats() {
  const read = useDelegateData(getCurrentDelegateDashboard, getCachedDelegateDashboard);
  const rows = read.data?.reservations ?? [];
  const confirmed = rows.filter((r) => r.status === "confirmed" || r.status === "completed");
  const upcoming = rows.filter((r) => reservationBucket(r) === "upcoming");
  const counts = read.data?.places.map((place) => ({ ...place, count: rows.filter((r) => r.placeId === place.id).length })).sort((a,b) => b.count - a.count) ?? [];
  const largest = Math.max(1, ...counts.map((p) => p.count));
  return <DelegatePage eyebrow="Actividad de tus espacios" title="Estadísticas" description="Consulta el movimiento de reservas y la distribución entre tus lugares." actions={<DelegateRefresh updating={read.updating} onClick={() => void read.refresh()} />}>
    {read.error && <DelegateNotice>{read.error}</DelegateNotice>}
    {read.loading ? <DelegateSkeleton cards={2} /> : read.data && (read.data.subscriptionActive ? <>
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4"><Crown className="size-5 text-indigo-500" aria-hidden="true" /><div><p className="text-sm font-semibold text-[#6257BD]">Suscripción activa</p><p className="mt-1 text-xs text-[#8B829D]">Estadísticas de tus lugares asignados.</p></div></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        { label:"Reservas registradas", value:rows.length, icon:CalendarDays },
        { label:"Confirmadas o finalizadas", value:confirmed.length, icon:CheckCircle2 },
        { label:"Personas por recibir", value:upcoming.reduce((sum,r) => sum + r.guestsCount,0), icon:Users },
        { label:"Lugares con actividad", value:counts.filter((p) => p.count > 0).length, icon:MapPin },
      ].map(({label,value,icon:Icon}) => <div key={label} className="rounded-2xl border border-[#E6E8F2] bg-white p-4 sm:p-5"><Icon className="mb-3 size-5 text-indigo-400" aria-hidden="true" /><p className="text-3xl font-bold text-[#302A47]">{value}</p><p className="mt-2 text-xs leading-relaxed text-[#8B829D]">{label}</p></div>)}</div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E6E8F2] bg-white p-5"><h2 className="font-semibold text-[#302A47]">Reservas por lugar</h2><p className="mt-1 text-xs text-[#938BA3]">Incluye solicitudes y su historial.</p><div className="mt-5 space-y-5">{counts.map((p) => <div key={p.id}><div className="mb-2 flex items-start justify-between gap-3 text-sm"><span className="break-words text-[#746685]">{p.name}</span><span className="font-semibold text-[#6257BD]">{p.count}</span></div><div className="h-2 rounded-full bg-[#F0EDF6]"><div className="h-full rounded-full bg-[#8372CA]" style={{width: (100 * p.count / largest) + "%"}} /></div></div>)}{!counts.length && <p className="text-sm text-[#8B829D]">Todavía no hay lugares asignados.</p>}</div></section>
        <section className="rounded-2xl border border-[#E6E8F2] bg-white p-5"><h2 className="font-semibold text-[#302A47]">Estado de las reservas</h2><div className="mt-4 divide-y divide-[#EFEDF6]">{[
          ["Pendientes", rows.filter((r) => r.status === "pending").length], ["Confirmadas", rows.filter((r) => r.status === "confirmed").length], ["Finalizadas", rows.filter((r) => r.status === "completed").length], ["Canceladas o rechazadas", rows.filter((r) => r.status === "cancelled" || r.status === "rejected").length],
        ].map(([label,value]) => <div key={label} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="text-[#8B829D]">{label}</span><span className="font-semibold text-[#6257BD]">{value}</span></div>)}</div><p className="mt-5 rounded-xl bg-[#F7F5FD] p-3 text-xs leading-relaxed text-[#938BA3]">Las reservas de prueba no generan cobros. Estos datos representan solicitudes y disponibilidad.</p></section>
      </div>
    </> : <section className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[#E6E8F2] bg-white">
      <div className="bg-gradient-to-br from-[#4F46E5] to-[#7862CA] p-6 text-white sm:p-8"><div className="mb-5 grid size-12 place-items-center rounded-2xl bg-white/15"><LockKeyhole className="size-6" aria-hidden="true" /></div><p className="mb-2 text-xs font-medium text-indigo-100">Pinwi Premium</p><h2 className="text-2xl font-bold">Un vistazo a la actividad de tus lugares</h2><p className="mt-3 text-sm leading-relaxed text-indigo-100">Este apartado está disponible para cuentas con suscripción activa.</p></div>
      <div className="space-y-5 p-6 sm:p-8"><div className="grid gap-3 sm:grid-cols-2">{[{icon:BarChart3,label:"Distribución de reservas"},{icon:MapPin,label:"Actividad por lugar"},{icon:Users,label:"Grupos por recibir"},{icon:CalendarDays,label:"Estados e historial"}].map(({icon:Icon,label}) => <div key={label} className="flex items-center gap-3 rounded-xl bg-[#F7F5FD] p-3 text-sm text-[#746685]"><Icon className="size-4 shrink-0 text-indigo-400" aria-hidden="true" />{label}</div>)}</div><p className="text-xs leading-relaxed text-[#938BA3]">La suscripción de tu cuenta se gestiona con la administración. Puedes seguir gestionando tus lugares y reservas.</p><Button asChild className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"><Link to="/delegate/places">Ir a mis lugares</Link></Button></div>
    </section>)}
  </DelegatePage>;
}
