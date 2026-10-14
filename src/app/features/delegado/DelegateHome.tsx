import { Link } from "react-router";
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, MapPin, Users } from "lucide-react";
import { getFirstName } from "../../services/currentUserService";
import { getCachedDelegateDashboard, getCurrentDelegateDashboard } from "../../services/delegateService";
import { formatReservationDate, formatReservationTime, reservationStatusLabels } from "../../services/reservationService";
import { useDelegateData } from "./useDelegateData";
import { DelegatePage, DelegateRefresh, DelegateNotice, DelegateSkeleton } from "./DelegatePage";
import { reservationBucket } from "./reservationPresentation";

export function DelegateHome() {
  const read = useDelegateData(getCurrentDelegateDashboard, getCachedDelegateDashboard);
  const places = read.data?.places ?? [];
  const reservations = read.data?.reservations ?? [];
  const pending = reservations.filter((r) => r.status === "pending");
  const upcoming = reservations.filter((r) => reservationBucket(r) === "upcoming");
  const name = read.data?.profile?.name;
  return <DelegatePage eyebrow="Tu panel de gestión" title={name ? "Hola, " + getFirstName(name) : "Inicio"} description="Tus lugares, solicitudes y próximos grupos, en un solo lugar." actions={<DelegateRefresh updating={read.updating} onClick={() => void read.refresh()} />}>
    {read.error && <DelegateNotice>{read.error}</DelegateNotice>}
    {read.loading ? <DelegateSkeleton cards={2} /> : read.data && <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#4F46E5] to-[#7862CA] p-5 text-white sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full border-[30px] border-white/5" />
        <div className="relative max-w-xl"><p className="mb-2 text-xs font-medium text-indigo-100">Todo listo para organizar tus espacios</p><h2 className="text-xl font-bold leading-snug sm:text-2xl">{pending.length ? pending.length + (pending.length === 1 ? " solicitud necesita tu respuesta" : " solicitudes necesitan tu respuesta") : "Mantén tus espacios al día"}</h2><p className="mt-3 text-sm leading-relaxed text-indigo-100">{pending.length ? "Revisa quién reservó, el espacio y el horario antes de confirmar su visita." : "Configura los horarios de cada espacio para que la comunidad pueda solicitar una reserva."}</p><Link to={pending.length ? "/delegate/reservations" : "/delegate/places"} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-[#4F46E5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">{pending.length ? "Revisar solicitudes" : "Gestionar disponibilidad"}<ArrowRight className="size-4" aria-hidden="true" /></Link></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">{[
        { label:"Lugares asignados", value:places.length, icon:MapPin, link:"/delegate/places", note:"Fichas y disponibilidad" },
        { label:"Por aprobar", value:pending.length, icon:Clock3, link:"/delegate/reservations", note:"Solicitudes pendientes" },
        { label:"Próximas reservas", value:upcoming.length, icon:CheckCircle2, link:"/delegate/reservations", note:"Grupos confirmados" },
      ].map(({label,value,icon:Icon,link,note}) => <Link key={label} to={link} className="rounded-2xl border border-[#E6E8F2] bg-white p-5 transition hover:border-indigo-200 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-indigo-600"><div className="flex items-center justify-between"><p className="text-sm font-medium text-[#78728D]">{label}</p><Icon className="size-5 text-indigo-400" aria-hidden="true" /></div><p className="mt-3 text-3xl font-bold text-[#302A47]">{value}</p><p className="mt-1 text-xs text-[#938BA3]">{note}</p></Link>)}</div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-[#E6E8F2] bg-white"><div className="flex items-center justify-between gap-2 border-b border-[#EFEDF6] p-5"><h2 className="font-semibold text-[#302A47]">Tus lugares</h2><Link to="/delegate/places" className="text-xs font-medium text-indigo-600">Ver todos</Link></div><div className="divide-y divide-[#EFEDF6]">{places.slice(0,3).map((p) => <Link key={p.id} to="/delegate/places" className="flex items-center gap-3 p-5 transition hover:bg-[#FAFAFD] focus-visible:outline-2 focus-visible:outline-indigo-600"><div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-indigo-50">{p.images[0] ? <img src={p.images[0]} alt="" loading="lazy" className="size-full object-cover" /> : <MapPin className="size-5 text-indigo-400" aria-hidden="true" />}</div><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold text-[#554A6C]">{p.name}</h3><p className="mt-1 text-xs text-[#938BA3]">{p.spaces.length} espacios · {p.status === "active" ? "Visible en el mapa" : "Deshabilitado"}</p></div><ArrowRight className="size-4 shrink-0 text-[#ADA3BD]" aria-hidden="true" /></Link>)}{!places.length && <p className="p-6 text-sm text-[#8B829D]">Tus lugares aparecerán aquí cuando los agregues o te los asignen.</p>}</div></section>
        <section className="overflow-hidden rounded-2xl border border-[#E6E8F2] bg-white"><div className="flex items-center justify-between gap-2 border-b border-[#EFEDF6] p-5"><h2 className="font-semibold text-[#302A47]">Actividad reciente</h2><Link to="/delegate/reservations" className="text-xs font-medium text-indigo-600">Ver reservas</Link></div><div className="divide-y divide-[#EFEDF6]">{reservations.slice(0,3).map((r) => <Link key={r.id} to="/delegate/reservations" className="block space-y-2 p-5 transition hover:bg-[#FAFAFD] focus-visible:outline-2 focus-visible:outline-indigo-600"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-[#554A6C]">{r.userName}</p><span className="rounded-full bg-[#F0EDFF] px-2 py-1 text-[11px] text-[#7260A9]">{reservationStatusLabels[r.status]}</span></div><p className="truncate text-xs text-[#8B829D]">{r.spaceName} · {r.placeName}</p><p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#938BA3]">{r.startsAt && <span className="flex items-center gap-1"><CalendarDays className="size-3" aria-hidden="true" />{formatReservationDate(r.startsAt)} · {formatReservationTime(r.startsAt)}</span>}<span className="flex items-center gap-1"><Users className="size-3" aria-hidden="true" />{r.guestsCount} personas</span></p></Link>)}{!reservations.length && <p className="p-6 text-sm text-[#8B829D]">Todavía no hay solicitudes de reserva en tus lugares.</p>}</div></section>
      </div>
    </>}
  </DelegatePage>;
}
