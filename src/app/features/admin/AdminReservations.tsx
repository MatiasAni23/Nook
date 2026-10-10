import { normalizeAdminSearch } from "./AdminUi";
import { ManagementSectionHeading, ManagementEmpty } from "./AdminUi";
import { useState } from "react";
import { Search, Check, X, Calendar, MapPin, DollarSign } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { mockReservations, type Reservation } from "../../data/managementData";

export function AdminReservations() {
  const [reservations, setReservations] = useState(mockReservations);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | Reservation["status"]
  >("all");

  const filteredReservations = reservations.filter((reservation) => {
    const matchesSearch =
      normalizeAdminSearch(reservation.userName).includes(
        normalizeAdminSearch(searchTerm),
      ) ||
      normalizeAdminSearch(reservation.placeName).includes(
        normalizeAdminSearch(searchTerm),
      );
    const matchesStatus =
      statusFilter === "all" || reservation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (
    reservationId: string,
    newStatus: Reservation["status"],
  ) => {
    setReservations(
      reservations.map((r) =>
        r.id === reservationId ? { ...r, status: newStatus } : r,
      ),
    );

    if (newStatus === "confirmed") {
      alert(
        "Demostración: reserva confirmada en esta vista. No se envió ninguna notificación.",
      );
    } else if (newStatus === "rejected") {
      alert(
        "Demostración: reserva rechazada en esta vista. No se envió ninguna notificación.",
      );
    }
  };

  const getStatusColor = (status: Reservation["status"]) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "confirmed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "rejected":
        return "bg-red-50 text-red-700 border-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = (status: Reservation["status"]) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "confirmed":
        return "Confirmada";
      case "rejected":
        return "Rechazada";
      case "cancelled":
        return "Cancelada";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateRange = (dates: Date[]) => {
    if (dates.length === 1) {
      return dates[0].toLocaleDateString("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const start = dates[0].toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
    });
    const end = dates[dates.length - 1].toLocaleDateString("es-CL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${start} - ${end}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <ManagementSectionHeading
        title="Reservas"
        count={reservations.length}
        description="Solicitudes de espacios, fechas y estado de cada reserva."
      />

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Buscar por usuario o lugar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            className={
              statusFilter === "all"
                ? "management-filter-active"
                : "management-filter-idle"
            }
          >
            Todas
          </Button>
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending")}
            className={
              statusFilter === "pending"
                ? "management-filter-active"
                : "management-filter-idle"
            }
          >
            Pendientes
          </Button>
          <Button
            variant={statusFilter === "confirmed" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("confirmed")}
            className={
              statusFilter === "confirmed"
                ? "management-filter-active"
                : "management-filter-idle"
            }
          >
            Confirmadas
          </Button>
          <Button
            variant={statusFilter === "rejected" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("rejected")}
            className={
              statusFilter === "rejected"
                ? "management-filter-active"
                : "management-filter-idle"
            }
          >
            Rechazadas
          </Button>
        </div>
      </div>

      {/* Reservations List */}
      {filteredReservations.length === 0 && (
        <ManagementEmpty
          title="No encontramos reservas"
          description="Prueba otro usuario, lugar o estado."
        />
      )}
      <div className="management-record-grid">
        {filteredReservations.map((reservation) => (
          <Card key={reservation.id} className="management-record">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-semibold">{reservation.placeName}</h4>
                      <Badge className={getStatusColor(reservation.status)}>
                        {getStatusLabel(reservation.status)}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>Solicitada por {reservation.userName}</p>
                      <p>
                        <Calendar className="size-3 inline mr-1" />
                        {formatDateRange(reservation.dates)}
                        {reservation.dates.length > 1 &&
                          ` (${reservation.dates.length} días)`}
                      </p>
                      <p>
                        <DollarSign className="size-3 inline mr-1" />
                        {formatCurrency(reservation.totalAmount)} -{" "}
                        {reservation.paymentMethod}
                      </p>
                      <p className="text-xs text-gray-500">
                        Creada:{" "}
                        {reservation.createdAt.toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {reservation.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleStatusChange(reservation.id, "confirmed")
                      }
                      className="text-gray-600 border-gray-200 hover:bg-gray-50"
                    >
                      <Check className="size-3 mr-1" />
                      Aprobar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleStatusChange(reservation.id, "rejected")
                      }
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="size-3 mr-1" />
                      Rechazar
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Calendar View Card */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="text-center space-y-2">
            <Calendar className="size-12 text-[#4F46E5] mx-auto mb-3" />
            <h3 className="text-lg font-semibold">Vista de Calendario</h3>
            <p className="text-sm text-gray-600">
              La vista de calendario se implementará próximamente para
              visualizar la disponibilidad y reservas de forma más intuitiva.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
