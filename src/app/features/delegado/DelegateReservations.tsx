import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, ChevronLeft, ChevronRight, Clock, DollarSign, User, X } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  listCurrentDelegateReservations,
  updateDelegateReservationStatus,
  type DelegateReservation,
  type DelegateReservationStatus,
} from "../../services/delegateService";

export function DelegateReservations() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [reservations, setReservations] = useState<DelegateReservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savingReservationId, setSavingReservationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no esta configurado.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    listCurrentDelegateReservations()
      .then((nextReservations) => {
        if (isMounted) setReservations(nextReservations);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar las reservas.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleStatusChange = async (
    reservationId: string,
    newStatus: Extract<DelegateReservationStatus, "confirmed" | "rejected">,
  ) => {
    if (savingReservationId) return;
    setSavingReservationId(reservationId);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await updateDelegateReservationStatus(reservationId, newStatus);
      setReservations((current) => current.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, status: newStatus } : reservation));
      setSuccessMessage(newStatus === "confirmed" ? "Reserva confirmada." : "Reserva rechazada.");
    } catch (error) {
      try { setReservations(await listCurrentDelegateReservations({ forceRefresh: true })); } catch { /* Keep the last confirmed state. */ }
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar la reserva.");
    } finally {
      setSavingReservationId(null);
    }
  };

  const pendingReservations = useMemo(
    () => reservations.filter((reservation) => reservation.status === "pending"),
    [reservations],
  );

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
    return amount === 0
      ? "Gratis"
      : new Intl.NumberFormat("es-CL", {
          style: "currency",
          currency: "CLP",
          minimumFractionDigits: 0,
        }).format(amount);
  };

  const formatDateRange = (dates: Date[]) => {
    if (dates.length === 0) return "Fecha no informada";
    if (dates.length === 1) {
      return dates[0].toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const start = dates[0].toLocaleDateString("es-CL", { day: "numeric", month: "short" });
    const end = dates[dates.length - 1].toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${start} - ${end}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const dayOfWeek = firstDay.getDay();
    const startingDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i += 1) days.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) days.push(new Date(year, month, day));

    return days;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    );
  };

  const getReservationsForDate = (date: Date) => {
    return reservations.filter((reservation) =>
      reservation.dates.some((reservationDate) => isSameDay(reservationDate, date)),
    );
  };

  const hasReservations = (date: Date) => {
    const dayReservations = getReservationsForDate(date);
    return {
      hasPending: dayReservations.some((reservation) => reservation.status === "pending"),
      hasConfirmed: dayReservations.some((reservation) => reservation.status === "confirmed"),
      count: dayReservations.length,
    };
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const confirmedRevenue = reservations
    .filter((reservation) => reservation.status === "confirmed" || reservation.status === "completed")
    .reduce((sum, reservation) => sum + reservation.totalAmount, 0);
  const monthName = currentDate.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
  const days = getDaysInMonth(currentDate);
  const dayNames = ["L", "M", "M", "J", "V", "S", "D"];
  const selectedDayReservations = selectedDate ? getReservationsForDate(selectedDate) : [];

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          <div>
            <h2 className="mb-1 text-2xl" style={{ fontWeight: 700 }}>
              Gestion de Reservas
            </h2>
            <p className="text-gray-600">Aprueba o rechaza solicitudes en el calendario</p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMessage}
            </div>
          )}

          {isLoading && (
            <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
              Cargando reservas...
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-2xl font-semibold text-yellow-600">{pendingReservations.length}</p>
                <p className="text-xs text-gray-600">Pendientes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-2xl font-semibold text-green-600">
                  {reservations.filter((reservation) => reservation.status === "confirmed").length}
                </p>
                <p className="text-xs text-gray-600">Confirmadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pb-4 pt-4 text-center">
                <p className="text-lg font-semibold text-[#4F46E5]">{formatCurrency(confirmedRevenue)}</p>
                <p className="text-xs text-gray-600">Ingresos</p>
              </CardContent>
            </Card>
          </div>

          {pendingReservations.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg" style={{ fontWeight: 700 }}>
                Solicitudes Pendientes ({pendingReservations.length})
              </h3>
              <div className="space-y-3">
                {pendingReservations.map((reservation) => (
                  <Card key={reservation.id} className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-3 md:flex-row">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <h4 className="font-semibold">{reservation.placeName}</h4>
                            <Badge className={getStatusColor(reservation.status)}>
                              {getStatusLabel(reservation.status)}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-700">
                            <p>
                              <User className="mr-1 inline size-3" />
                              {reservation.userName}
                            </p>
                            <p>
                              <Calendar className="mr-1 inline size-3" />
                              {formatDateRange(reservation.dates)}
                              {reservation.dates.length > 1 && ` (${reservation.dates.length} dias)`}
                            </p>
                            <p>
                              <Clock className="mr-1 inline size-3" />
                              {reservation.startTime} - {reservation.endTime}
                            </p>
                            <p>
                              <DollarSign className="mr-1 inline size-3" />
                              {formatCurrency(reservation.totalAmount)}
                            </p>
                            <p className="text-xs text-gray-600">
                              Solicitada:{" "}
                              {reservation.createdAt.toLocaleDateString("es-CL", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 border-t border-yellow-200 pt-2 md:w-32 md:shrink-0 md:flex-col md:border-l md:border-t-0 md:pl-3 md:pt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={savingReservationId !== null}
                            onClick={() => handleStatusChange(reservation.id, "confirmed")}
                            className="flex-1 border-green-300 text-green-600 hover:bg-green-50 md:w-full"
                          >
                            <Check className="mr-1 size-4" />
                            Aprobar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={savingReservationId !== null}
                            onClick={() => handleStatusChange(reservation.id, "rejected")}
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 md:w-full"
                          >
                            <X className="mr-1 size-4" />
                            Rechazar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {!isLoading && reservations.length === 0 && (
            <Card>
              <CardContent className="p-4 text-center text-sm text-gray-600">
                Aun no hay reservas registradas en tus lugares.
              </CardContent>
            </Card>
          )}

          <div>
            <h3 className="mb-3 text-lg" style={{ fontWeight: 700 }}>
              Calendario de Reservas
            </h3>
            <Card>
              <CardContent className="p-4">
                <div className="mb-4 flex items-center justify-between">
                  <button type="button" aria-label="Mes anterior" onClick={previousMonth} className="flex size-8 items-center justify-center rounded-full hover:bg-gray-100">
                    <ChevronLeft className="size-5" />
                  </button>
                  <h4 className="font-semibold capitalize">{monthName}</h4>
                  <button type="button" aria-label="Mes siguiente" onClick={nextMonth} className="flex size-8 items-center justify-center rounded-full hover:bg-gray-100">
                    <ChevronRight className="size-5" />
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1">
                  {dayNames.map((day, index) => (
                    <div key={`day-name-${index}`} className="py-2 text-center text-xs font-semibold text-gray-600">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    if (!day) return <div key={`empty-${index}`} className="aspect-square" />;

                    const { hasPending, hasConfirmed, count } = hasReservations(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={`day-${index}`}
                        onClick={() => setSelectedDate(day)}
                        className={`relative aspect-square rounded-lg p-1 text-sm transition-all ${
                          isSelected
                            ? "bg-[#4F46E5] text-white ring-2 ring-[#4F46E5] ring-offset-2"
                            : hasPending
                              ? "bg-yellow-100 text-yellow-900 hover:bg-yellow-200"
                              : hasConfirmed
                                ? "bg-green-100 text-green-900 hover:bg-green-200"
                                : "hover:bg-gray-100"
                        } ${isToday && !isSelected ? "ring-2 ring-blue-400" : ""}`}
                      >
                        <div className="flex h-full flex-col items-center justify-center">
                          <span className={`font-medium ${isSelected ? "text-white" : ""}`}>{day.getDate()}</span>
                          {count > 0 && (
                            <span className={`text-xs ${isSelected ? "text-white" : "text-gray-600"}`}>{count}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex gap-4 border-t pt-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded border-2 border-yellow-300 bg-yellow-100" />
                    <span>Pendiente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded border-2 border-green-300 bg-green-100" />
                    <span>Confirmada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded ring-2 ring-blue-400" />
                    <span>Hoy</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {selectedDate && selectedDayReservations.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg" style={{ fontWeight: 700 }}>
                Reservas del{" "}
                {selectedDate.toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              <div className="space-y-3">
                {selectedDayReservations.map((reservation) => (
                  <Card key={reservation.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{reservation.placeName}</h4>
                          <Badge className={getStatusColor(reservation.status)}>
                            {getStatusLabel(reservation.status)}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <User className="mr-1 inline size-3" />
                            {reservation.userName}
                          </p>
                          <p>
                            <Clock className="mr-1 inline size-3" />
                            {reservation.startTime} - {reservation.endTime}
                          </p>
                          <p>
                            <DollarSign className="mr-1 inline size-3" />
                            {formatCurrency(reservation.totalAmount)} - {reservation.paymentMethod}
                          </p>
                        </div>
                        {reservation.status === "pending" && (
                          <div className="flex gap-2 border-t pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={savingReservationId !== null}
                              onClick={() => handleStatusChange(reservation.id, "confirmed")}
                              className="flex-1 border-green-300 text-green-600 hover:bg-green-50"
                            >
                              <Check className="mr-1 size-3" />
                              Aprobar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={savingReservationId !== null}
                              onClick={() => handleStatusChange(reservation.id, "rejected")}
                              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <X className="mr-1 size-3" />
                              Rechazar
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {selectedDate && selectedDayReservations.length === 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-6 text-center">
                <Calendar className="mx-auto mb-3 size-12 text-gray-400" />
                <p className="text-gray-600">
                  No hay reservas para el{" "}
                  {selectedDate.toLocaleDateString("es-CL", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
