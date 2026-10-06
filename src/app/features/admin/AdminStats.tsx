import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarDays, CheckCircle2, CircleAlert, CircleDollarSign, Eye, MapPin, MousePointerClick, Star } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getCachedPlaces, listPlaces, type AppPlace } from "../../services/placeService";
import { listAdminReportTickets, type ReportTicket } from "../../services/reportTicketService";
import { listAdminReservationMetrics, type AdminReservationMetric } from "../../services/adminStatsService";
import { listAdminPlaceAnalyticsEvents, type PlaceAnalyticsEvent } from "../../services/placeAnalyticsService";

type Period = 30 | 90;

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function AdminStats() {
  const [period, setPeriod] = useState<Period>(30);
  const [places, setPlaces] = useState<AppPlace[]>([]);
  const [reservations, setReservations] = useState<AdminReservationMetric[]>([]);
  const [reports, setReports] = useState<ReportTicket[]>([]);
  const [placeEvents, setPlaceEvents] = useState<PlaceAnalyticsEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no está configurado. Las estadísticas reales no se pueden cargar.");
      return;
    }

    let isMounted = true;
    const cachedPlaces = getCachedPlaces();
    if (cachedPlaces) setPlaces(cachedPlaces);
    setIsLoading(!cachedPlaces);
    setErrorMessage("");
    const since = new Date();
    since.setDate(since.getDate() - 90);

    Promise.all([listPlaces({ forceRefresh: Boolean(cachedPlaces) }), listAdminReservationMetrics(since), listAdminReportTickets(), listAdminPlaceAnalyticsEvents(since).catch(() => [])])
      .then(([nextPlaces, nextReservations, nextReports, nextPlaceEvents]) => {
        if (!isMounted) return;
        setPlaces(nextPlaces);
        setReservations(nextReservations);
        setReports(nextReports);
        setPlaceEvents(nextPlaceEvents);
      })
      .catch((error) => {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar las estadísticas.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const analytics = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    const periodReservations = reservations.filter((reservation) => reservation.createdAt >= cutoff);
    const periodPlaceEvents = placeEvents.filter((event) => event.createdAt >= cutoff);
    const resolvedReservations = periodReservations.filter((reservation) => reservation.status === "confirmed" || reservation.status === "completed");
    const confirmedAmount = resolvedReservations.reduce((total, reservation) => total + reservation.totalAmount, 0);
    const activeReports = reports.filter((report) => report.status === "pending" || report.status === "reviewing");
    const reportResolutionRate = reports.length
      ? Math.round((reports.filter((report) => report.status === "resolved" || report.status === "dismissed").length / reports.length) * 100)
      : 0;
    const reservationsByCommune = new Map<string, Map<string, number>>();

    periodReservations.forEach((reservation) => {
      const place = places.find((item) => item.id === reservation.placeId);
      const commune = place?.zone?.trim() || "Sin comuna";
      const communeReservations = reservationsByCommune.get(commune) ?? new Map<string, number>();
      communeReservations.set(reservation.placeId, (communeReservations.get(reservation.placeId) ?? 0) + 1);
      reservationsByCommune.set(commune, communeReservations);
    });
    const topRentedByCommune = [...reservationsByCommune.entries()]
      .map(([commune, placeReservations]) => {
        const [placeId, count] = [...placeReservations.entries()].sort((a, b) => b[1] - a[1])[0];
        return { commune, place: places.find((place) => place.id === placeId), count };
      })
      .filter((item): item is { commune: string; place: AppPlace; count: number } => Boolean(item.place))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    const rankPlacesByEvent = (eventType: PlaceAnalyticsEvent["eventType"]) => {
      const eventCountByPlace = new Map<string, number>();
      periodPlaceEvents.filter((event) => event.eventType === eventType).forEach((event) => {
        eventCountByPlace.set(event.placeId, (eventCountByPlace.get(event.placeId) ?? 0) + 1);
      });
      return [...eventCountByPlace.entries()]
        .map(([placeId, count]) => ({ place: places.find((place) => place.id === placeId), count }))
        .filter((item): item is { place: AppPlace; count: number } => Boolean(item.place))
        .sort((a, b) => b.count - a.count);
    };
    const detailViewsByPlace = rankPlacesByEvent("details_view").slice(0, 4);
    const homeImpressionsByPlace = rankPlacesByEvent("home_impression");
    const placesByCommune = new Map<string, number>();
    places.forEach((place) => {
      const commune = place.zone?.trim() || "Sin comuna";
      placesByCommune.set(commune, (placesByCommune.get(commune) ?? 0) + 1);
    });
    const communeCoverage = [...placesByCommune.entries()]
      .map(([commune, count]) => ({ commune, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    const weekCount = period === 30 ? 4 : 6;
    const weeks = Array.from({ length: weekCount }, (_, index) => {
      const end = new Date();
      end.setDate(end.getDate() - ((weekCount - 1 - index) * 7));
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      const count = periodReservations.filter((reservation) => reservation.createdAt >= start && reservation.createdAt <= end).length;
      return { label: `${start.getDate()}/${start.getMonth() + 1}`, reservas: count };
    });

    return {
      activeReports,
      confirmedAmount,
      detailViewCount: periodPlaceEvents.filter((event) => event.eventType === "details_view").length,
      detailViewsByPlace,
      homeFeaturedPlace: homeImpressionsByPlace[0] ?? null,
      communeCoverage,
      periodReservations,
      reportResolutionRate,
      resolvedReservations,
      topRentedByCommune,
      weeks,
    };
  }, [period, placeEvents, places, reports, reservations]);

  const maxCommuneCoverage = analytics.communeCoverage[0]?.count ?? 1;

  return (
    <div className="min-h-full bg-[#F6F7FB] p-4 pb-28 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 rounded-[1.5rem] border border-[#E2E0FF] bg-gradient-to-br from-[#F2F0FF] via-white to-[#F7FBFF] p-5 md:flex-row md:items-end md:justify-between md:p-7">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#6259B8]"><BarChart3 className="size-4" /> Lectura operativa</div>
            <h2 className="text-2xl font-black tracking-tight text-[#201A53] md:text-3xl">Lo esencial de tu red.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Reservas, reportes y distribución de lugares: sólo datos que ya existen en Pinwi.</p>
          </div>
          <div className="flex rounded-xl border border-[#DFDCF8] bg-white p-1 shadow-sm">
            {([30, 90] as Period[]).map((value) => <Button key={value} type="button" variant="ghost" size="sm" onClick={() => setPeriod(value)} className={`rounded-lg px-3 font-bold ${period === value ? "bg-[#4F46E5] text-white hover:bg-[#4338CA] hover:text-white" : "text-slate-500"}`}>Últimos {value} días</Button>)}
          </div>
        </section>

        {errorMessage && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric icon={CalendarDays} label="Reservas creadas" value={analytics.periodReservations.length} tone="indigo" isLoading={isLoading} />
          <Metric icon={Eye} label="Vistas de detalle" value={analytics.detailViewCount} tone="sky" isLoading={isLoading} />
          <Metric icon={CircleDollarSign} label="Monto confirmado" value={formatCompactCurrency(analytics.confirmedAmount)} tone="emerald" isLoading={isLoading} />
          <Metric icon={CircleAlert} label="Reportes por revisar" value={analytics.activeReports.length} tone="amber" isLoading={isLoading} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="border-[#E6E8F5] shadow-[0_12px_32px_rgba(15,23,42,0.05)]"><CardContent className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-black text-[#17133F]">Ritmo de reservas</h3><p className="mt-1 text-sm text-slate-500">Reservas creadas por semana durante el período.</p></div><Badge variant="outline" className="border-[#DED9FF] bg-[#F5F4FF] font-bold text-[#4F46E5]">{period} días</Badge></div>
            <div className="mt-6 h-64">{analytics.periodReservations.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={analytics.weeks} margin={{ left: -24, right: 4 }}><CartesianGrid vertical={false} stroke="#EEF0F8" strokeDasharray="4 4" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748B" }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#94A3B8" }} /><Tooltip cursor={{ fill: "#F7F7FF" }} formatter={(value) => [value, "Reservas"]} labelFormatter={(label) => `Semana del ${label}`} /><Bar dataKey="reservas" fill="#4F46E5" radius={[8, 8, 3, 3]} maxBarSize={42} /></BarChart></ResponsiveContainer> : <EmptyState text="Todavía no hay reservas en este período." />}</div>
          </CardContent></Card>

          <Card className="border-[#E6E8F5] shadow-[0_12px_32px_rgba(15,23,42,0.05)]"><CardContent className="p-5 md:p-6">
            <div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-[#17133F]">Estado de la red</h3><p className="mt-1 text-sm text-slate-500">Señales simples para actuar.</p></div><CheckCircle2 className="size-5 text-[#4F46E5]" /></div>
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-[#F5F4FF] p-4"><div className="flex items-center justify-between"><span className="text-sm font-bold text-[#2D2869]">Resolución de reportes</span><span className="text-lg font-black text-[#4F46E5]">{analytics.reportResolutionRate}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-[#DFDCF8]"><div className="h-full rounded-full bg-[#4F46E5]" style={{ width: `${analytics.reportResolutionRate}%` }} /></div><p className="mt-2 text-xs text-[#6259B8]">Incluye reportes resueltos y descartados.</p></div>
              <div className="flex items-center justify-between rounded-2xl border border-[#F4E2B4] bg-[#FFF9EB] p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-amber-100 text-amber-700"><CircleAlert className="size-4" /></span><div><p className="text-sm font-bold text-amber-950">Pendientes de atención</p><p className="text-xs text-amber-700">Reportes aún abiertos</p></div></div><span className="text-2xl font-black text-amber-700">{analytics.activeReports.length}</span></div>
              <div className="flex items-center justify-between rounded-2xl border border-[#E5E8F5] p-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600"><MousePointerClick className="size-4" /></span><div><p className="text-sm font-bold text-slate-800">Más mostrado en Inicio</p><p className="max-w-40 truncate text-xs text-slate-500">{analytics.homeFeaturedPlace?.place.name ?? "Aún sin impresiones"}</p></div></div><span className="text-2xl font-black text-[#24205A]">{analytics.homeFeaturedPlace?.count ?? 0}</span></div>
            </div>
          </CardContent></Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-[#E6E8F5] shadow-[0_12px_32px_rgba(15,23,42,0.05)]"><CardContent className="p-5 md:p-6"><div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-[#17133F]">Más reservado por comuna</h3><p className="mt-1 text-sm text-slate-500">El líder de cada comuna en el período.</p></div><Star className="size-5 text-amber-500" /></div><div className="mt-5 space-y-2">{analytics.topRentedByCommune.length ? analytics.topRentedByCommune.map(({ place, commune, count }) => <div key={commune} className="flex items-center gap-3 rounded-2xl p-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#E8E5FF] text-[#4F46E5]"><MapPin className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#1E1B4B]">{place.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{commune}</p></div><Badge variant="outline" className="shrink-0 border-[#E2E0F7] bg-white text-[#4F46E5]">{count} reservas</Badge></div>) : <EmptyState text="Aún no hay reservas para comparar por comuna." />}</div></CardContent></Card>
          <Card className="border-[#E6E8F5] shadow-[0_12px_32px_rgba(15,23,42,0.05)]"><CardContent className="p-5 md:p-6"><div className="flex items-center justify-between"><div><h3 className="text-lg font-black text-[#17133F]">Vistas de detalle por lugar</h3><p className="mt-1 text-sm text-slate-500">Aperturas reales de la ficha del lugar.</p></div><Eye className="size-5 text-[#4F46E5]" /></div><div className="mt-5 space-y-2">{analytics.detailViewsByPlace.length ? analytics.detailViewsByPlace.map(({ place, count }, index) => <div key={place.id} className="flex items-center gap-3 rounded-2xl p-2.5"><span className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black ${index === 0 ? "bg-[#E8E5FF] text-[#4F46E5]" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#1E1B4B]">{place.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{place.zone || "Sin comuna"}</p></div><Badge variant="outline" className="shrink-0 border-[#E2E0F7] bg-white text-[#4F46E5]">{count} vistas</Badge></div>) : <EmptyState text="Las vistas comenzarán a registrarse desde esta actualización." />}</div></CardContent></Card>
        </section>

        <Card className="border-[#E6E8F5] shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#17133F]">Cantidad de lugares por comuna</h3>
                <p className="mt-1 text-sm text-slate-500">Distribución actual de los lugares publicados.</p>
              </div>
              <MapPin className="size-5 text-[#4F46E5]" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {analytics.communeCoverage.length ? analytics.communeCoverage.map((commune) => (
                <div key={commune.commune}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-semibold text-slate-700">{commune.commune}</span>
                    <span className="text-sm font-black text-[#24205A]">{commune.count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#EEF0FA]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#4F46E5] to-[#8B7DFF]" style={{ width: `${Math.max((commune.count / maxCommuneCoverage) * 100, 8)}%` }} />
                  </div>
                </div>
              )) : <EmptyState text="Aún no hay lugares publicados." />}
            </div>
          </CardContent>
        </Card>

        <p className="px-1 text-xs leading-5 text-slate-400">Las cifras se calculan con lugares, reservas, reportes y eventos de navegación. El monto considera reservas confirmadas o completadas; no reemplaza un reporte de pagos.</p>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone, isLoading }: { icon: typeof CalendarDays; label: string; value: number | string; tone: "indigo" | "sky" | "emerald" | "amber"; isLoading: boolean }) {
  const colors = { indigo: "bg-[#EEEDFF] text-[#4F46E5]", sky: "bg-sky-50 text-sky-600", emerald: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600" };
  return <Card className="border-[#E6E8F5] shadow-[0_8px_22px_rgba(15,23,42,0.04)]"><CardContent className="p-4 md:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-2xl font-black tracking-tight text-[#17133F]">{isLoading ? "—" : value}</p><p className="mt-1 text-xs font-semibold leading-4 text-slate-500">{label}</p></div><span className={`grid size-9 place-items-center rounded-xl ${colors[tone]}`}><Icon className="size-[1.125rem]" /></span></div></CardContent></Card>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="grid h-full min-h-32 place-items-center rounded-2xl bg-slate-50 px-4 text-center text-sm text-slate-500">{text}</div>;
}
