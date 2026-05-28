import { useNavigate } from "react-router";
import { MapPin, Calendar, TrendingUp, DollarSign, Users, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export function DelegateHome() {
  const navigate = useNavigate();

  // Mock data - en producción vendría de la base de datos
  const delegateData = {
    name: "María González",
    email: "maria@nook.cl",
    placesCount: 3,
    totalReservations: 24,
    pendingReservations: 3,
    monthlyRevenue: 450000,
    places: [
      { id: '1', name: 'Biblioteca Central Universidad de Chile', reservations: 12 },
      { id: '2', name: 'Café Literario', reservations: 8 },
      { id: '5', name: 'Parque Biblioteca Vitacura', reservations: 4 },
    ],
    recentReservations: [
      {
        id: 'r1',
        userName: 'Pedro Silva',
        placeName: 'Biblioteca Central',
        date: new Date('2026-05-20'),
        status: 'pending' as const,
      },
      {
        id: 'r2',
        userName: 'Lucía Torres',
        placeName: 'Café Literario',
        date: new Date('2026-05-21'),
        status: 'confirmed' as const,
      },
      {
        id: 'r3',
        userName: 'Carlos Mendoza',
        placeName: 'Parque Biblioteca Vitacura',
        date: new Date('2026-05-19'),
        status: 'confirmed' as const,
      },
    ],
  };

  const getStatusColor = (status: 'pending' | 'confirmed') => {
    return status === 'pending'
      ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
      : 'bg-green-100 text-green-700 border-green-300';
  };

  const getStatusLabel = (status: 'pending' | 'confirmed') => {
    return status === 'pending' ? 'Pendiente' : 'Confirmada';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          {/* Welcome Header */}
          <div>
            <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>
              ¡Hola, {delegateData.name.split(' ')[0]}! 👋
            </h2>
            <p className="text-gray-600">Bienvenido a tu panel de gestión</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/delegate/places')}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <MapPin className="size-6 text-[#4F46E5]" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-[#4F46E5]">{delegateData.placesCount}</p>
                    <p className="text-sm text-gray-600">Lugares</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate('/delegate/reservations')}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center">
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
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-green-100 flex items-center justify-center">
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
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-orange-100 flex items-center justify-center">
                    <DollarSign className="size-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-orange-600">{formatCurrency(delegateData.monthlyRevenue)}</p>
                    <p className="text-xs text-gray-600">Este mes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My Places */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg" style={{ fontWeight: 700 }}>Mis Lugares</h3>
              <button
                onClick={() => navigate('/delegate/places')}
                className="text-sm text-[#4F46E5] font-semibold hover:underline"
              >
                Ver todos
              </button>
            </div>

            <div className="space-y-3">
              {delegateData.places.map((place) => (
                <Card key={place.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4" onClick={() => navigate(`/delegate/places/${place.id}`)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                          <MapPin className="size-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{place.name}</h4>
                          <p className="text-xs text-gray-600">
                            <Calendar className="size-3 inline mr-1" />
                            {place.reservations} reservas
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Reservations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg" style={{ fontWeight: 700 }}>Reservas Recientes</h3>
              <button
                onClick={() => navigate('/delegate/reservations')}
                className="text-sm text-[#4F46E5] font-semibold hover:underline"
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
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{reservation.userName}</h4>
                          <Badge className={getStatusColor(reservation.status)}>
                            {getStatusLabel(reservation.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          <MapPin className="size-3 inline mr-1" />
                          {reservation.placeName}
                        </p>
                        <p className="text-xs text-gray-600">
                          <Clock className="size-3 inline mr-1" />
                          {reservation.date.toLocaleDateString('es-CL', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
