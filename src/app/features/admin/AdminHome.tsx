import { useAdminData } from "./useAdminData";
import { adminOverviewSource } from "../../services/adminDashboardService";
import { Link } from "react-router";
import { ArrowRight, Building2, Plus, ChevronRight } from "lucide-react";
import { Button } from "../../components/ui/button";
import { CachedImage } from "../../components/ui/cached-image";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { demoPlaces } from "../../data/demoPlaces";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  AdminEmptyState,
  AdminMetric,
  AdminPageHeading,
  placeTypeLabels,
} from "./AdminUi";

export function AdminHome() {
  const { currentUser } = useCurrentUser();
  const { data, isLoading, error, refresh } = useAdminData(
    adminOverviewSource,
    isSupabaseConfigured,
  );
  const places = data?.places ?? (isSupabaseConfigured ? [] : demoPlaces);
  const reports = data?.reports ?? [];
  const pendingReports = reports.filter(
    (report) => report.status === "pending" || report.status === "reviewing",
  );
  const zones = [
    ...new Set(places.map((place) => place.zone?.trim()).filter(Boolean)),
  ];
  const zoneCounts = zones
    .map((zone) => ({
      zone,
      count: places.filter((place) => place.zone?.trim() === zone).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const value = (count: number) =>
    isLoading || (!data && error)
      ? "—"
      : new Intl.NumberFormat("es-CL").format(count);
  return (
    <div className="space-y-6">
      <AdminPageHeading
        title={
          currentUser?.name
            ? `Hola, ${currentUser.name.split(" ")[0]}`
            : "Inicio"
        }
        description="Un resumen de tus lugares y de lo que necesita atención."
        action={
          <Button asChild className="admin-primary">
            <Link to="/admin/places?action=new">
              <Plus size={16} /> Nuevo lugar
            </Link>
          </Button>
        }
      />
      {!isSupabaseConfigured && (
        <div className="admin-notice">
          Vista de demostración. Los lugares que ves son ejemplos.
        </div>
      )}
      {error && (
        <div className="admin-notice is-error" role="alert">
          {error}{" "}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => refresh()}
          >
            Reintentar
          </button>
        </div>
      )}
      <div className="admin-metrics" aria-busy={isLoading}>
        <AdminMetric
          label="Lugares publicados"
          value={value(places.length)}
          detail="En el catálogo actual"
        />
        <AdminMetric
          label="Espacios de estudio"
          value={value(places.filter((p) => p.category === "study").length)}
        />
        <AdminMetric
          label="Espacios de trabajo"
          value={value(places.filter((p) => p.category === "work").length)}
        />
        <AdminMetric
          label="Reportes pendientes"
          value={!isSupabaseConfigured ? "—" : value(pendingReports.length)}
          detail="Pendientes y en revisión"
        />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="admin-panel overflow-hidden">
          <div className="admin-panel-header">
            <div>
              <h2>Lugares del catálogo</h2>
              <p>Accede a sus fichas para revisar o editar.</p>
            </div>
            <Link to="/admin/places" className="admin-text-link">
              Ver todos <ArrowRight size={14} />
            </Link>
          </div>
          {isLoading ? (
            <div className="admin-empty" role="status">
              Cargando lugares…
            </div>
          ) : places.length ? (
            places.slice(0, 5).map((place) => (
              <Link
                key={place.id}
                to={`/admin/places?edit=${encodeURIComponent(place.id)}`}
                className="admin-row hover:bg-[#fafafe]"
              >
                <span className="admin-thumbnail">
                  {place.images[0] ? (
                    <CachedImage
                      src={place.images[0]}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <Building2 size={20} strokeWidth={1.4} />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{place.name}</p>
                  <small className="truncate">
                    {placeTypeLabels[place.type]} · {place.zone || "Sin zona"}
                  </small>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </Link>
            ))
          ) : (
            <AdminEmptyState
              title="Tu catálogo está vacío"
              description="Agrega el primer lugar para empezar."
            />
          )}
        </section>
        <div className="space-y-6">
          <section className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <h2>Por revisar</h2>
                <p>Reportes abiertos de los lugares.</p>
              </div>
            </div>
            {isLoading ? (
              <div className="admin-empty">Cargando reportes…</div>
            ) : error ? (
              <AdminEmptyState
                title="Resumen no disponible"
                description="Reintenta la carga para consultar los reportes."
              />
            ) : pendingReports.length ? (
              pendingReports.slice(0, 3).map((report) => (
                <Link
                  key={report.id}
                  to="/admin/management?tab=reports"
                  className="admin-row hover:bg-[#fafafe]"
                >
                  <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{report.placeName}</p>
                    <small>
                      {report.status === "pending"
                        ? "Pendiente de revisión"
                        : "En revisión"}
                    </small>
                  </div>
                  <ChevronRight size={16} className="text-gray-400" />
                </Link>
              ))
            ) : (
              <AdminEmptyState
                title={
                  isSupabaseConfigured
                    ? "No hay reportes pendientes"
                    : "Reportes no disponibles en la demo"
                }
                description={
                  isSupabaseConfigured
                    ? "Los nuevos reportes aparecerán aquí."
                    : undefined
                }
              />
            )}
          </section>
          <section className="admin-panel">
            <div className="admin-panel-header">
              <h2>Distribución por zona</h2>
              <span className="text-xs text-gray-500">
                {zones.length} zonas
              </span>
            </div>
            <div className="admin-panel-body space-y-4">
              {zoneCounts.length ? (
                zoneCounts.map(({ zone, count }) => (
                  <div key={zone}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="text-gray-600">{zone}</span>
                      <span className="tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#f0eff6]">
                      <div
                        className="h-full rounded-full bg-[#aaa5d5]"
                        style={{
                          width: `${(count / (zoneCounts[0].count || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">
                  Agrega una zona a tus lugares para ver su distribución.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
