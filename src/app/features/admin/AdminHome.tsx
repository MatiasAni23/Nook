import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Crown,
  MapPinned,
  Plus,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getCachedPlaces, listPlaces, type AppPlace } from "../../services/placeService";
import { listAdminReportTickets, type ReportTicket } from "../../services/reportTicketService";

const numberFormatter = new Intl.NumberFormat("es-CL");

function getPlaceTypeLabel(type: AppPlace["type"]) {
  const labels: Record<AppPlace["type"], string> = {
    library: "Biblioteca",
    cafe: "Cafetería",
    coworking: "Cowork",
    office: "Oficina",
    meeting_room: "Sala de reunión",
    private_office: "Oficina privada",
    park: "Parque",
  };

  return labels[type];
}

export function AdminHome() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState<AppPlace[]>([]);
  const [reports, setReports] = useState<ReportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;
    const cachedPlaces = getCachedPlaces();
    if (cachedPlaces) setPlaces(cachedPlaces);
    setIsLoading(!cachedPlaces);

    Promise.all([listPlaces({ forceRefresh: Boolean(cachedPlaces) }), listAdminReportTickets()])
      .then(([nextPlaces, nextReports]) => {
        if (!isMounted) return;
        setPlaces(nextPlaces);
        setReports(nextReports);
      })
      .catch(() => {
        // El panel sigue siendo útil con los lugares almacenados en caché.
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const dashboard = useMemo(() => {
    const activePlaces = places.filter((place) => place.openNow).length;
    const premiumPlaces = places.filter((place) => place.planType === "basic_premium").length;
    const activeReports = reports.filter((report) => report.status === "pending" || report.status === "reviewing");
    const zoneCounts = new Map<string, number>();

    places.forEach((place) => {
      const zone = place.zone?.trim() || "Sin zona";
      zoneCounts.set(zone, (zoneCounts.get(zone) ?? 0) + 1);
    });

    const leadingZones = [...zoneCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    const popularPlaces = [...places]
      .sort((a, b) => b.reviews - a.reviews || b.rating - a.rating)
      .slice(0, 3);

    return { activePlaces, activeReports, leadingZones, popularPlaces, premiumPlaces, totalZones: zoneCounts.size };
  }, [places, reports]);

  const today = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const maxZoneCount = dashboard.leadingZones[0]?.count ?? 1;

  return (
    <div className="min-h-full bg-[#F6F7FB] p-4 pb-28 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-[#201A53] px-5 py-6 text-white shadow-[0_20px_50px_rgba(49,46,129,0.22)] md:px-8 md:py-8">
          <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-[#8B7DFF]/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 size-52 rounded-full bg-[#22D3EE]/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-200">
                <Sparkles className="size-4" />
                Centro de control
              </div>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">Todo lo importante, a la vista.</h2>
              <p className="mt-3 text-sm leading-6 text-indigo-100 md:text-base">
                Revisa la salud de Pinwi, prioriza incidencias y mantén la red de lugares creciendo con orden.
              </p>
              <p className="mt-4 text-xs font-semibold capitalize text-indigo-200">{today}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-2xl font-black">{numberFormatter.format(dashboard.activePlaces)}</p>
                <p className="mt-1 text-xs font-semibold text-indigo-100">lugares abiertos</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <p className="text-2xl font-black">{numberFormatter.format(dashboard.activeReports.length)}</p>
                <p className="mt-1 text-xs font-semibold text-indigo-100">alertas activas</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard icon={Building2} label="Lugares publicados" value={places.length} tone="indigo" isLoading={isLoading} />
          <MetricCard icon={MapPinned} label="Zonas cubiertas" value={dashboard.totalZones} tone="sky" isLoading={isLoading} />
          <MetricCard icon={Crown} label="Con plan premium" value={dashboard.premiumPlaces} tone="amber" isLoading={isLoading} />
          <MetricCard icon={BellRing} label="Requieren atención" value={dashboard.activeReports.length} tone="rose" isLoading={isLoading} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Card className="overflow-hidden border-[#E6E8F5] shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <CardContent className="p-0">
              <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 md:px-6">
                <div>
                  <p className="text-lg font-black text-[#17133F]">Tu foco de hoy</p>
                  <p className="mt-1 text-sm text-slate-500">Acciones que mantienen la operación en movimiento.</p>
                </div>
                <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${dashboard.activeReports.length ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                  {dashboard.activeReports.length ? <CircleAlert className="size-5" /> : <CheckCircle2 className="size-5" />}
                </div>
              </div>

              {dashboard.activeReports.length ? (
                <div className="border-y border-[#EEF0F8]">
                  {dashboard.activeReports.slice(0, 3).map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => navigate("/admin/management")}
                      className="group flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-[#FAFAFF] md:px-6"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                        <CircleAlert className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-[#1E1B4B]">{report.placeName}</span>
                        <span className="mt-0.5 block truncate text-xs text-slate-500">{report.description || "Reporte pendiente de revisión"}</span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#4F46E5]" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mx-5 mb-5 rounded-2xl bg-emerald-50 px-4 py-5 md:mx-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-bold text-emerald-900">No hay incidencias pendientes</p>
                      <p className="mt-0.5 text-xs text-emerald-700">La red de lugares está al día.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2 p-5 sm:grid-cols-3 md:px-6">
                <ActionButton icon={Plus} label="Nuevo lugar" onClick={() => navigate("/admin/places")} primary />
                <ActionButton icon={UsersRound} label="Gestionar equipo" onClick={() => navigate("/admin/management")} />
                <ActionButton icon={BarChart3} label="Ver estadísticas" onClick={() => navigate("/admin/stats")} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-[#E6E8F5] shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-black text-[#17133F]">Cobertura</p>
                  <p className="mt-1 text-sm text-slate-500">Lugares por zona</p>
                </div>
                <MapPinned className="size-5 text-[#4F46E5]" />
              </div>
              <div className="mt-6 space-y-4">
                {dashboard.leadingZones.length ? dashboard.leadingZones.map((zone) => (
                  <div key={zone.name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-semibold text-slate-700">{zone.name}</span>
                      <span className="font-black text-[#24205A]">{zone.count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[#EEF0FA]">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#8B7DFF]" style={{ width: `${Math.max((zone.count / maxZoneCount) * 100, 8)}%` }} />
                    </div>
                  </div>
                )) : (
                  <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">Aún no hay lugares publicados.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <Card className="border-[#E6E8F5] shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-lg font-black text-[#17133F]">Lugares destacados</p>
                  <p className="mt-1 text-sm text-slate-500">Mayor actividad registrada</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/admin/places")} className="font-bold text-[#4F46E5]">
                  Ver todos <ArrowRight className="ml-1 size-4" />
                </Button>
              </div>
              <div className="mt-5 space-y-3">
                {dashboard.popularPlaces.length ? dashboard.popularPlaces.map((place, index) => (
                  <button key={place.id} type="button" onClick={() => navigate("/admin/places")} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-[#FAFAFF]">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black ${index === 0 ? "bg-[#E8E5FF] text-[#4F46E5]" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-[#1E1B4B]">{place.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{getPlaceTypeLabel(place.type)} · {place.zone || "Sin zona"}</span>
                    </span>
                    <Badge variant="outline" className="shrink-0 border-[#E2E0F7] bg-white text-xs text-[#4F46E5]">{place.reviews} reseñas</Badge>
                  </button>
                )) : <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-500">Los lugares aparecerán aquí al publicarlos.</p>}
              </div>
            </CardContent>
          </Card>

          <div className="rounded-[1.5rem] border border-[#DCD9FF] bg-gradient-to-br from-[#EEEDFF] via-[#F8F7FF] to-white p-5 md:p-6">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#4F46E5] text-white shadow-[0_10px_22px_rgba(79,70,229,0.24)]"><Sparkles className="size-5" /></div>
            <h3 className="mt-5 text-xl font-black tracking-tight text-[#201A53]">Haz crecer la red con intención.</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Publica los próximos espacios, asigna responsables y revisa el rendimiento para que Pinwi sea más útil en cada zona.</p>
            <Button onClick={() => navigate("/admin/places")} className="mt-5 rounded-xl bg-[#4F46E5] font-bold hover:bg-[#4338CA]">
              Administrar lugares <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone, isLoading }: { icon: typeof Building2; label: string; value: number; tone: "indigo" | "sky" | "amber" | "rose"; isLoading: boolean }) {
  const colors = {
    indigo: "bg-[#EEEDFF] text-[#4F46E5]",
    sky: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return <Card className="border-[#E6E8F5] shadow-[0_8px_22px_rgba(15,23,42,0.04)]"><CardContent className="p-4 md:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-2xl font-black tracking-tight text-[#17133F]">{isLoading ? "—" : numberFormatter.format(value)}</p><p className="mt-1 text-xs font-semibold leading-4 text-slate-500">{label}</p></div><span className={`grid size-9 place-items-center rounded-xl ${colors[tone]}`}><Icon className="size-[1.125rem]" /></span></div></CardContent></Card>;
}

function ActionButton({ icon: Icon, label, onClick, primary = false }: { icon: typeof Plus; label: string; onClick: () => void; primary?: boolean }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-bold transition ${primary ? "bg-[#4F46E5] text-white shadow-[0_8px_16px_rgba(79,70,229,0.2)] hover:bg-[#4338CA]" : "border border-[#E6E8F5] bg-white text-slate-700 hover:border-[#CFCBFF] hover:bg-[#FAFAFF]"}`}><span className="flex items-center gap-2"><Icon className="size-4" />{label}</span><ChevronRight className="size-4" /></button>;
}
