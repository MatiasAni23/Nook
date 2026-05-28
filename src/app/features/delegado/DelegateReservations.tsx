import { useState } from "react";
import { Check, X, Calendar, MapPin, DollarSign, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

interface Reservation {
  id: string;
  userId: string;
  userName: string;
  placeId: string;
  placeName: string;
  dates: Date[];
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  createdAt: Date;
  totalAmount: number;
  paymentMethod: string;
}

export function DelegateReservations() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 1)); // Mayo 2026
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Mock data - reservas de los lugares del delegado
  const [reservations, setReservations] = useState<Reservation[]>([
    {
      id: 'r1',
      userId: 'u1',
      userName: 'Pedro Silva',
      placeId: '1',
      placeName: 'Biblioteca Central Universidad de Chile',
      dates: [new Date('2026-05-20')],
      status: 'pending',
      createdAt: new Date('2026-05-19T10:30:00'),
      totalAmount: 0,
      paymentMethod: 'Gratis',
    },
    {
      id: 'r2',
      userId: 'u2',
      userName: 'Lucía Torres',
      placeId: '2',
      placeName: 'Café Literario',
      dates: [new Date('2026-05-21'), new Date('2026-05-22')],
      status: 'pending',
      createdAt: new Date('2026-05-19T14:00:00'),
      totalAmount: 25000,
      paymentMethod: 'Tarjeta de crédito',
    },
    {
      id: 'r3',
      userId: 'u3',
      userName: 'Carlos Mendoza',
      placeId: '2',
      placeName: 'Café Literario',
      dates: [new Date('2026-05-23')],
      status: 'confirmed',
      createdAt: new Date('2026-05-18T09:00:00'),
      totalAmount: 12000,
      paymentMethod: 'Transferencia',
    },
    {
      id: 'r4',
      userId: 'u4',
      userName: 'Ana Martínez',
      placeId: '5',
      placeName: 'Parque Biblioteca Vitacura',
      dates: [new Date('2026-05-25')],
      status: 'confirmed',
      createdAt: new Date('2026-05-17T16:00:00'),
      totalAmount: 0,
      paymentMethod: 'Gratis',
    },
    {
      id: 'r5',
      userId: 'u5',
      userName: 'Roberto Vega',
      placeId: '1',
      placeName: 'Biblioteca Central Universidad de Chile',
      dates: [new Date('2026-05-26')],
      status: 'pending',
      createdAt: new Date('2026-05-19T16:30:00'),
      totalAmount: 0,
      paymentMethod: 'Gratis',
    },
    {
      id: 'r6',
      userId: 'u6',
      userName: 'Sofía Ramírez',
      placeId: '2',
      placeName: 'Café Literario',
      dates: [new Date('2026-05-27'), new Date('2026-05-28')],
      status: 'confirmed',
      createdAt: new Date('2026-05-17T11:00:00'),
      totalAmount: 30000,
      paymentMethod: 'Tarjeta de débito',
    },
  ]);

  const handleStatusChange = (reservationId: string, newStatus: Reservation['status']) => {
    setReservations(reservations.map(r =>
      r.id === reservationId ? { ...r, status: newStatus } : r
    ));

    if (newStatus === 'confirmed') {
      alert('✅ Reserva confirmada. Se ha enviado una notificación al usuario.');
    } else if (newStatus === 'rejected') {
      alert('❌ Reserva rechazada. Se ha enviado una notificación al usuario.');
    }
  };

  const pendingReservations = reservations.filter(r => r.status === 'pending');

  const getStatusColor = (status: Reservation['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'confirmed': return 'bg-green-100 text-green-700 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-300';
      case 'cancelled': return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: Reservation['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'rejected': return 'Rechazada';
      case 'cancelled': return 'Cancelada';
    }
  };

  const formatCurrency = (amount: number) => {
    return amount === 0 ? 'Gratis' : new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateRange = (dates: Date[]) => {
    if (dates.length === 1) {
      return dates[0].toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    const start = dates[0].toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
    const end = dates[dates.length - 1].toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const dayOfWeek = firstDay.getDay();
    const startingDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const getReservationsForDate = (date: Date) => {
    return reservations.filter(reservation =>
      reservation.dates.some(resDate => isSameDay(resDate, date))
    );
  };

  const hasReservations = (date: Date) => {
    const dayReservations = getReservationsForDate(date);
    return {
      hasPending: dayReservations.some(r => r.status === 'pending'),
      hasConfirmed: dayReservations.some(r => r.status === 'confirmed'),
      count: dayReservations.length,
    };
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  const days = getDaysInMonth(currentDate);
  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  const selectedDayReservations = selectedDate ? getReservationsForDate(selectedDate) : [];

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>Gestión de Reservas</h2>
            <p className="text-gray-600">Aprueba o rechaza solicitudes en el calendario</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-semibold text-yellow-600">{pendingReservations.length}</p>
                <p className="text-xs text-gray-600">Pendientes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-semibold text-green-600">
                  {reservations.filter(r => r.status === 'confirmed').length}
                </p>
                <p className="text-xs text-gray-600">Confirmadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-lg font-semibold text-[#4F46E5]">
                  {formatCurrency(reservations.filter(r => r.status === 'confirmed').reduce((sum, r) => sum + r.totalAmount, 0))}
                </p>
                <p className="text-xs text-gray-600">Ingresos</p>
              </CardContent>
            </Card>
          </div>

          {/* Pending Requests */}
          {pendingReservations.length > 0 && (
            <div>
              <h3 className="text-lg mb-3" style={{ fontWeight: 700 }}>
                ⏳ Solicitudes Pendientes ({pendingReservations.length})
              </h3>
              <div className="space-y-3">
                {pendingReservations.map((reservation) => (
                  <Card key={reservation.id} className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-3">
                        {/* Content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold">{reservation.placeName}</h4>
                            <Badge className={getStatusColor(reservation.status)}>
                              {getStatusLabel(reservation.status)}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-gray-700">
                            <p>
                              <User className="size-3 inline mr-1" />
                              {reservation.userName}
                            </p>
                            <p>
                              <Calendar className="size-3 inline mr-1" />
                              {formatDateRange(reservation.dates)}
                              {reservation.dates.length > 1 && ` (${reservation.dates.length} días)`}
                            </p>
                            <p>
                              <DollarSign className="size-3 inline mr-1" />
                              {formatCurrency(reservation.totalAmount)}
                            </p>
                            <p className="text-xs text-gray-600">
                              <Clock className="size-3 inline mr-1" />
                              Solicitada: {reservation.createdAt.toLocaleDateString('es-CL', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Actions - Below on mobile, Right on desktop */}
                        <div className="flex md:flex-col gap-2 md:w-32 md:shrink-0 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-yellow-200 md:pl-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(reservation.id, 'confirmed')}
                            className="flex-1 md:w-full text-green-600 border-green-300 hover:bg-green-50"
                          >
                            <Check className="size-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStatusChange(reservation.id, 'rejected')}
                            className="flex-1 md:w-full text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <X className="size-4 mr-1" />
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

          {/* Calendar */}
          <div>
            <h3 className="text-lg mb-3" style={{ fontWeight: 700 }}>
              📅 Calendario de Reservas
            </h3>
            <Card>
              <CardContent className="p-4">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={previousMonth}
                    className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <h4 className="font-semibold capitalize">{monthName}</h4>
                  <button
                    onClick={nextMonth}
                    className="size-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map((day, index) => (
                    <div key={`day-name-${index}`} className="text-center text-xs font-semibold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const { hasPending, hasConfirmed, count } = hasReservations(day);
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={`day-${index}`}
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square rounded-lg p-1 text-sm transition-all relative ${
                          isSelected
                            ? 'bg-[#4F46E5] text-white ring-2 ring-[#4F46E5] ring-offset-2'
                            : hasPending
                            ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-900'
                            : hasConfirmed
                            ? 'bg-green-100 hover:bg-green-200 text-green-900'
                            : 'hover:bg-gray-100'
                        } ${isToday && !isSelected ? 'ring-2 ring-blue-400' : ''}`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span className={`font-medium ${isSelected ? 'text-white' : ''}`}>
                            {day.getDate()}
                          </span>
                          {count > 0 && (
                            <span className={`text-xs ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                              {count}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex gap-4 mt-4 pt-4 border-t text-xs">
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded bg-yellow-100 border-2 border-yellow-300" />
                    <span>Pendiente</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-4 rounded bg-green-100 border-2 border-green-300" />
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

          {/* Selected Day Details */}
          {selectedDate && selectedDayReservations.length > 0 && (
            <div>
              <h3 className="text-lg mb-3" style={{ fontWeight: 700 }}>
                Reservas del {selectedDate.toLocaleDateString('es-CL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
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
                            <User className="size-3 inline mr-1" />
                            {reservation.userName}
                          </p>
                          <p>
                            <DollarSign className="size-3 inline mr-1" />
                            {formatCurrency(reservation.totalAmount)} - {reservation.paymentMethod}
                          </p>
                        </div>
                        {reservation.status === 'pending' && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(reservation.id, 'confirmed')}
                              className="flex-1 text-green-600 border-green-300 hover:bg-green-50"
                            >
                              <Check className="size-3 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusChange(reservation.id, 'rejected')}
                              className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
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
            </div>
          )}

          {selectedDate && selectedDayReservations.length === 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-6 text-center">
                <Calendar className="size-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">
                  No hay reservas para el {selectedDate.toLocaleDateString('es-CL', {
                    day: 'numeric',
                    month: 'long'
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
