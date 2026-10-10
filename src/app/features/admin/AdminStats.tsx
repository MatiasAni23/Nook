import type { AppPlace } from "../../services/placeService";
import type { PlaceAnalyticsEvent } from "../../services/placeAnalyticsService";
import { AdminEmptyState, AdminMetric, AdminPageHeading } from "./AdminUi";
import { useMemo, useState } from "react";
import { useAdminData } from "./useAdminData";
import { adminStatisticsSource } from "../../services/adminDashboardService";
import { buildReservationTimeline } from "./reservationTimeline";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { isSupabaseConfigured } from "../../lib/supabase";

type Period = 30 | 90;

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function AdminStats() {
  const [period, setPeriod] = useState<Period>(30);
  const {
    data,
    isLoading,
    error: loadError,
    isRefreshing,
    refresh,
  } = useAdminData(adminStatisticsSource, isSupabaseConfigured);
  const places = data?.places ?? [];
  const reports = data?.reports ?? [];
  const reservations = data?.reservations ?? [];
  const placeEvents = data?.events ?? [];
  const errorMessage = !isSupabaseConfigured
    ? "Las estadísticas no están disponibles en la vista de demostración."
    : loadError;
  const analytics = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - period);
    const periodReservations = reservations.filter(
      (reservation) =>
        reservation.createdAt >= cutoff && reservation.createdAt <= now,
    );
    const periodPlaceEvents = placeEvents.filter(
      (event) => event.createdAt >= cutoff && event.createdAt <= now,
    );
    const resolvedReservations = periodReservations.filter(
      (reservation) =>
        reservation.status === "confirmed" ||
        reservation.status === "completed",
    );
    const confirmedAmount = resolvedReservations.reduce(
      (total, reservation) => total + reservation.totalAmount,
      0,
    );
    const activeReports = reports.filter(
      (report) => report.status === "pending" || report.status === "reviewing",
    );
    const reportResolutionRate = reports.length
      ? Math.round(
          (reports.filter(
            (report) =>
              report.status === "resolved" || report.status === "dismissed",
          ).length /
            reports.length) *
            100,
        )
      : 0;
    const reservationsByCommune = new Map<string, Map<string, number>>();

    periodReservations.forEach((reservation) => {
      const place = places.find((item) => item.id === reservation.placeId);
      const commune = place?.zone?.trim() || "Sin comuna";
      const communeReservations =
        reservationsByCommune.get(commune) ?? new Map<string, number>();
      communeReservations.set(
        reservation.placeId,
        (communeReservations.get(reservation.placeId) ?? 0) + 1,
      );
      reservationsByCommune.set(commune, communeReservations);
    });
    const topRentedByCommune = [...reservationsByCommune.entries()]
      .map(([commune, placeReservations]) => {
        const [placeId, count] = [...placeReservations.entries()].sort(
          (a, b) => b[1] - a[1],
        )[0];
        return {
          commune,
          place: places.find((place) => place.id === placeId),
          count,
        };
      })
      .filter(
        (item): item is { commune: string; place: AppPlace; count: number } =>
          Boolean(item.place),
      )
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    const rankPlacesByEvent = (eventType: PlaceAnalyticsEvent["eventType"]) => {
      const eventCountByPlace = new Map<string, number>();
      periodPlaceEvents
        .filter((event) => event.eventType === eventType)
        .forEach((event) => {
          eventCountByPlace.set(
            event.placeId,
            (eventCountByPlace.get(event.placeId) ?? 0) + 1,
          );
        });
      return [...eventCountByPlace.entries()]
        .map(([placeId, count]) => ({
          place: places.find((place) => place.id === placeId),
          count,
        }))
        .filter((item): item is { place: AppPlace; count: number } =>
          Boolean(item.place),
        )
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
    const weeks = buildReservationTimeline(
      periodReservations.map((reservation) => reservation.createdAt),
      period,
      now,
    );

    return {
      activeReports,
      confirmedAmount,
      detailViewCount: periodPlaceEvents.filter(
        (event) => event.eventType === "details_view",
      ).length,
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
  const metricValue = (value: number | string) =>
    isLoading || (!data && errorMessage) ? "—" : value;
  return (
    <div className="space-y-6">
      <AdminPageHeading
        title="Estadísticas"
        description="Una mirada a la actividad y distribución de los lugares."
        action={
          <div
            className="admin-filter-list rounded-xl border border-[#e9eaf2] bg-white p-1"
            aria-label="Período de estadísticas"
          >
            {([30, 90] as Period[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                aria-pressed={period === value}
              >
                {value} días
              </button>
            ))}
          </div>
        }
      />
      {errorMessage && (
        <div className="admin-notice" role="status">
          {isSupabaseConfigured
            ? errorMessage
            : "Conecta Supabase para consultar las estadísticas. Las cifras se mostrarán cuando haya datos disponibles."}
          {isSupabaseConfigured && (
            <button
              type="button"
              className="ml-2 underline"
              disabled={isRefreshing}
              onClick={refresh}
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      <div className="admin-metrics">
        <AdminMetric
          label="Reservas creadas"
          value={metricValue(analytics.periodReservations.length)}
          detail={`En los últimos ${period} días`}
        />
        <AdminMetric
          label="Vistas de lugares"
          value={metricValue(analytics.detailViewCount)}
          detail="Aperturas de las fichas"
        />
        <AdminMetric
          label="Monto confirmado"
          value={metricValue(formatCompactCurrency(analytics.confirmedAmount))}
          detail="Reservas confirmadas o completadas"
        />
        <AdminMetric
          label="Reportes abiertos"
          value={metricValue(analytics.activeReports.length)}
          detail="Pendientes y en revisión"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Actividad de reservas</h2>
              <p>Reservas creadas por semana.</p>
            </div>
            <span className="admin-pill">Últimos {period} días</span>
          </div>
          <div className="admin-panel-body h-72">
            {analytics.periodReservations.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.weeks}
                  margin={{ left: -24, right: 8, top: 8 }}
                >
                  <CartesianGrid vertical={false} stroke="#eeeef4" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9490a4" }}
                    dy={8}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9490a4" }}
                  />
                  <Tooltip
                    cursor={{ fill: "#fafafe" }}
                    contentStyle={{
                      border: "1px solid #e9eaf2",
                      borderRadius: 12,
                      fontSize: 12,
                      boxShadow: "none",
                    }}
                    formatter={(value) => [value, "Reservas"]}
                    labelFormatter={(label) => `Semana del ${label}`}
                  />
                  <Bar
                    dataKey="reservas"
                    fill="#aaa5d5"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <AdminEmptyState
                title={
                  isLoading
                    ? "Cargando actividad…"
                    : "Sin reservas en este período"
                }
                description="La actividad aparecerá aquí cuando se registren reservas."
              />
            )}
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Estado de los reportes</h2>
              <p>Resumen de atención del total de reportes.</p>
            </div>
          </div>
          <div className="admin-panel-body">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-medium tracking-tight">
                {metricValue(analytics.reportResolutionRate)}
                {!isLoading && !errorMessage && "%"}
              </span>
              <span className="text-xs text-gray-500">
                resueltos o descartados
              </span>
            </div>
            <div className="my-5 h-1.5 rounded-full bg-[#f0eff6]">
              <div
                className="h-full rounded-full bg-[#aaa5d5]"
                style={{ width: `${analytics.reportResolutionRate}%` }}
              />
            </div>
            <div className="divide-y divide-[#f0f0f5]">
              <div className="flex justify-between py-4 text-sm">
                <span className="text-gray-500">Pendientes de atención</span>
                <span>{metricValue(analytics.activeReports.length)}</span>
              </div>
              <div className="flex justify-between gap-3 py-4 text-sm">
                <span className="text-gray-500">Más mostrado en inicio</span>
                <span className="max-w-40 truncate text-right">
                  {analytics.homeFeaturedPlace?.place.name ?? "—"}
                </span>
              </div>
              <div className="flex justify-between py-4 text-sm">
                <span className="text-gray-500">Reservas confirmadas</span>
                <span>
                  {metricValue(analytics.resolvedReservations.length)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Más reservado por comuna</h2>
              <p>El lugar con más reservas en cada comuna.</p>
            </div>
          </div>
          {analytics.topRentedByCommune.length ? (
            analytics.topRentedByCommune.map(
              ({ place, commune, count }, index) => (
                <div key={commune} className="admin-row">
                  <span className="w-5 text-xs text-gray-400">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{place.name}</p>
                    <small>{commune}</small>
                  </div>
                  <span className="admin-pill">{count} reservas</span>
                </div>
              ),
            )
          ) : (
            <AdminEmptyState
              title="Sin lugares para comparar"
              description="Las reservas permitirán identificar los espacios más solicitados."
            />
          )}
        </section>
        <section className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <h2>Fichas más visitadas</h2>
              <p>Interés en los lugares durante el período.</p>
            </div>
          </div>
          {analytics.detailViewsByPlace.length ? (
            analytics.detailViewsByPlace.map(({ place, count }, index) => (
              <div key={place.id} className="admin-row">
                <span className="w-5 text-xs text-gray-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{place.name}</p>
                  <small>{place.zone || "Sin comuna"}</small>
                </div>
                <span className="admin-pill">{count} vistas</span>
              </div>
            ))
          ) : (
            <AdminEmptyState
              title="Sin visitas registradas"
              description="Las aperturas de las fichas se mostrarán aquí."
            />
          )}
        </section>
      </div>
      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <h2>Distribución de lugares</h2>
            <p>Cantidad de lugares publicados por comuna.</p>
          </div>
        </div>
        <div className="admin-panel-body">
          {analytics.communeCoverage.length ? (
            <div className="grid gap-x-12 gap-y-6 sm:grid-cols-2">
              {analytics.communeCoverage.map(({ commune, count }) => (
                <div key={commune}>
                  <div className="mb-3 flex justify-between text-xs">
                    <span className="text-gray-500">{commune}</span>
                    <span>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#f0eff6]">
                    <div
                      className="h-full rounded-full bg-[#aaa5d5]"
                      style={{
                        width: `${(count / maxCommuneCoverage) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AdminEmptyState
              title="Sin distribución disponible"
              description="Los lugares publicados con una comuna aparecerán aquí."
            />
          )}
        </div>
      </section>
      <p className="text-xs leading-6 text-gray-400">
        El monto confirmado corresponde a reservas y no acredita pagos
        recibidos.
      </p>
    </div>
  );
}
