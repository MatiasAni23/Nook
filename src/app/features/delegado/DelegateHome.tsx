import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, Clock, DollarSign, MapPin, TrendingUp } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { isSupabaseConfigured } from "../../lib/supabase";
import { getFirstName } from "../../services/currentUserService";
import {
  getCurrentDelegateDashboard,
  type DelegateDashboardData,
  type DelegateReservationStatus,
} from "../../services/delegateService";

export function DelegateHome() {
  const navigate = useNavigate();
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
          setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar tu panel.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const delegateData = useMemo(() => {
    const places = dashboard?.places ?? [];
    const reservations = dashboard?.reservations ?? [];
    const now = new Date();

    return {
      name: dashboard?.profile?.name ?? "Delegado",
      placesCount: places.length,
      totalReservations: reservations.length,
      pendingReservations: reservations.filter((reservation) => reservation.status === "pending").length,
      monthlyRevenue: reservations
        .filter((reservation) => {
          const createdAt = reservation.createdAt;
          return (
            reservation.status === "confirmed" &&
            createdAt.getMonth() === now.getMonth() &&
            createdAt.getFullYear() === now.getFullYear()
          );
        })
        .reduce((sum, reservation) => sum + reservation.totalAmount, 0),
      places: places.slice(0, 3).map((place) => ({
        id: place.id,
        name: place.name,
        reservations: place.reservationsCount,
      })),
      recentReservations: reservations.slice(0, 3),
    };
  }, [dashboard]);

  const getStatusColor = (status: DelegateReservationStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "confirmed":
      case "completed":
        return "bg-green-100 text-green-700 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-300";
      case "cancelled":
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = (status: DelegateReservationStatus) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "confirmed":
        return "Confirmada";
      case "rejected":
        return "Rechazada";
      case "cancelled":
        return "Cancelada";
      case "completed":
        return "Completada";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          <div>
            <h2 className="mb-1 text-2xl" style={{ fontWeight: 700 }}>
              Hola, {getFirstName(delegateData.name)}
            </h2>
            <p className="text-gray-600">Bienvenido a tu panel de gestion</p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {isLoading && (
            <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
              Cargando panel...
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/delegate/places")}>
              <CardContent className="pb-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-purple-100">
                    <MapPin className="size-6 text-[#4F46E5]" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[#4F46E5]">{delegateData.placesCount}</p>
                    <p className="text-sm text-gray-600">Lugares</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate("/delegate/reservations")}>
              <CardContent className="pb-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-blue-100">
                    <Calendar className="size-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-blue-600">{delegateData.pendingReservations}</p>
                    <p className="text-sm text-gray-600">Pendientes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pb-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-green-100">
                    <TrendingUp className="size-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-green-600">{delegateData.totalReservations}</p>
                    <p className="text-sm text-gray-600">Total Reservas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pb-4 pt-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-orange-100">
                    <DollarSign className="size-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-orange-600">
                      {formatCurrency(delegateData.monthlyRevenue)}
                    </p>
                    <p className="text-xs text-gray-600">Este mes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg" style={{ fontWeight: 700 }}>
                Mis Lugares
              </h3>
              <button
                onClick={() => navigate("/delegate/places")}
                className="text-sm font-semibold text-[#4F46E5] hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="space-y-3">
              {delegateData.places.map((place) => (
                <Card key={place.id} className="cursor-pointer transition-shadow hover:shadow-md">
                  <CardContent className="p-4" onClick={() => navigate("/delegate/places")}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-purple-600">
                          <MapPin className="size-5 text-white" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold">{place.name}</h4>
                          <p className="text-xs text-gray-600">
                            <Calendar className="mr-1 inline size-3" />
                            {place.reservations} reservas
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!isLoading && delegateData.places.length === 0 && (
                <Card>
                  <CardContent className="p-4 text-sm text-gray-600">
                    Aun no tienes lugares asignados.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg" style={{ fontWeight: 700 }}>
                Reservas Recientes
              </h3>
              <button
                onClick={() => navigate("/delegate/reservations")}
                className="text-sm font-semibold text-[#4F46E5] hover:underline"
              >
                Ver todas
              </button>
            </div>

            <div className="space-y-3">
              {delegateData.recentReservations.map((reservation) => (
                <Card key={reservation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="text-sm font-semibold">{reservation.userName}</h4>
                          <Badge className={getStatusColor(reservation.status)}>
                            {getStatusLabel(reservation.status)}
                          </Badge>
                        </div>
                        <p className="mb-1 text-xs text-gray-600">
                          <MapPin className="mr-1 inline size-3" />
                          {reservation.placeName}
                        </p>
                        <p className="text-xs text-gray-600">
                          <Clock className="mr-1 inline size-3" />
                          {(reservation.dates[0] ?? reservation.createdAt).toLocaleDateString("es-CL", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {!isLoading && delegateData.recentReservations.length === 0 && (
                <Card>
                  <CardContent className="p-4 text-sm text-gray-600">
                    Aun no hay reservas registradas en tus lugares.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
