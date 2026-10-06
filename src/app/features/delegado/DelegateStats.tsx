import { useEffect, useMemo, useState } from "react";
import { BarChart3, Calendar, Crown, DollarSign, Lock, MapPin, TrendingUp } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getCurrentDelegateDashboard, type DelegateDashboardData } from "../../services/delegateService";

export function DelegateStats() {
  const [dashboard, setDashboard] = useState<DelegateDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no esta configurado.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    getCurrentDelegateDashboard()
      .then((data) => {
        if (isMounted) setDashboard(data);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar las estadisticas.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const reservations = dashboard?.reservations ?? [];
    const places = dashboard?.places ?? [];
    const confirmed = reservations.filter((reservation) => reservation.status === "confirmed");
    const revenue = confirmed.reduce((sum, reservation) => sum + reservation.totalAmount, 0);
    const topPlace = places
      .slice()
      .sort((a, b) => b.reservationsCount - a.reservationsCount)[0];

    return {
      reservations: reservations.length,
      confirmed: confirmed.length,
      revenue,
      topPlace,
      conversionRate: reservations.length > 0 ? Math.round((confirmed.length / reservations.length) * 100) : 0,
    };
  }, [dashboard]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading && !dashboard) {
    return (
      <div className="size-full flex flex-col bg-gray-50">
        <div className="flex-1 overflow-auto p-4 pb-20">
          <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">Cargando estadisticas...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          <div>
            <h2 className="mb-1 text-2xl" style={{ fontWeight: 700 }}>
              Estadísticas
            </h2>
            <p className="text-gray-600">Rendimiento de tus lugares y visibilidad premium</p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {!dashboard?.subscriptionActive ? (
            <div className="space-y-4">
              <Card className="overflow-hidden border-purple-200 bg-white">
                <CardContent className="p-0">
                  <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-5 text-white">
                    <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-white/15">
                      <Lock className="size-6" />
                    </div>
                    <h3 className="text-xl font-black">Desbloquea Pinwi Premium</h3>
                    <p className="mt-2 text-sm font-medium text-white/80">
                      Activa tu suscripcion para acceder a estadisticas y aparecer con mayor prioridad en busquedas y recomendados.
                    </p>
                  </div>
                  <div className="space-y-3 p-5">
                    <div className="flex items-center gap-3 rounded-2xl bg-purple-50 p-3">
                      <BarChart3 className="size-5 text-[#4F46E5]" />
                      <span className="text-sm font-semibold text-[#1E1B4B]">Metricas de reservas e ingresos</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-purple-50 p-3">
                      <TrendingUp className="size-5 text-[#4F46E5]" />
                      <span className="text-sm font-semibold text-[#1E1B4B]">Mayor prioridad en recomendados</span>
                    </div>
                    <div className="flex items-center gap-3 rounded-2xl bg-purple-50 p-3">
                      <Crown className="size-5 text-[#4F46E5]" />
                      <span className="text-sm font-semibold text-[#1E1B4B]">Sello premium para tus espacios</span>
                    </div>
                    <Button className="h-12 w-full bg-[#4F46E5] font-bold hover:bg-[#4338CA]">
                      Solicitar suscripcion
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3 opacity-60 blur-[1px]">
                {["Reservas", "Ingresos", "Conversion", "Top lugar"].map((label) => (
                  <Card key={label}>
                    <CardContent className="p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
                      <div className="mt-3 h-6 rounded bg-gray-200" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="border-purple-200 bg-purple-50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="grid size-11 place-items-center rounded-2xl bg-[#4F46E5] text-white">
                    <Crown className="size-5" />
                  </div>
                  <div>
                    <p className="font-black text-[#1E1B4B]">Suscripcion activa</p>
                    <p className="text-sm text-gray-600">Tus lugares tienen prioridad en recomendados.</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="p-4">
                    <Calendar className="mb-3 size-5 text-[#4F46E5]" />
                    <p className="text-2xl font-black text-[#1E1B4B]">{stats.reservations}</p>
                    <p className="text-sm text-gray-600">Reservas totales</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <DollarSign className="mb-3 size-5 text-green-600" />
                    <p className="text-lg font-black text-[#1E1B4B]">{formatCurrency(stats.revenue)}</p>
                    <p className="text-sm text-gray-600">Ingresos confirmados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <TrendingUp className="mb-3 size-5 text-blue-600" />
                    <p className="text-2xl font-black text-[#1E1B4B]">{stats.conversionRate}%</p>
                    <p className="text-sm text-gray-600">Conversion</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <MapPin className="mb-3 size-5 text-orange-600" />
                    <p className="line-clamp-1 text-sm font-black text-[#1E1B4B]">
                      {stats.topPlace?.name ?? "Sin datos"}
                    </p>
                    <p className="text-sm text-gray-600">Lugar destacado</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
