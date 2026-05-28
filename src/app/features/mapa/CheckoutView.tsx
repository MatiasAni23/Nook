import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, ChevronLeft, ChevronRight, CreditCard, Wallet, Building2, Check } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { workPlaces } from "../../data/mockData";

export function CheckoutView() {
  const { placeId } = useParams();
  const navigate = useNavigate();
  const place = workPlaces.find(p => p.id === placeId);

  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer' | 'onepay'>('card');

  if (!place) {
    return (
      <div className="p-4">
        <button onClick={() => navigate("/app")} className="flex items-center gap-2 text-gray-600">
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <p className="mt-4">Lugar no encontrado</p>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    // Adjust so Monday is 0, Sunday is 6
    const dayOfWeek = firstDay.getDay();
    const startingDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    return { daysInMonth, startingDayOfWeek };
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  const isDateSelected = (date: Date) => {
    return selectedDates.some(d => isSameDay(d, date));
  };

  const toggleDate = (date: Date) => {
    if (isDateSelected(date)) {
      setSelectedDates(selectedDates.filter(d => !isSameDay(d, date)));
    } else {
      setSelectedDates([...selectedDates, date]);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // Price per day (assuming 8 hours per day)
  const pricePerDay = place.pricePerHour * 8;
  const days = selectedDates.length;
  const subtotal = pricePerDay * days;
  const serviceFee = Math.round(subtotal * 0.05); // 5% fee
  const total = subtotal + serviceFee;

  const handleConfirm = () => {
    if (selectedDates.length === 0) {
      alert('Por favor selecciona al menos un día');
      return;
    }
    const datesList = selectedDates.map(d => d.toLocaleDateString('es-CL')).join(', ');
    alert(`Reserva confirmada para ${place.name}. Días: ${datesList}. Total: ${formatPrice(total)}`);
    navigate('/app');
  };

  const getPlaceImage = (id: string) => {
    const gradients = [
      'from-gray-400 to-gray-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-orange-400 to-orange-600',
      'from-indigo-400 to-indigo-600',
      'from-pink-400 to-pink-600',
      'from-cyan-400 to-cyan-600',
      'from-red-400 to-red-600',
    ];
    const index = parseInt(id.replace(/\D/g, '')) % gradients.length;
    return gradients[index];
  };

  const getPlaceIcon = (type: string) => {
    switch (type) {
      case 'office': return '🏢';
      case 'coworking': return '💼';
      case 'meeting_room': return '👥';
      case 'private_office': return '🚪';
      default: return '📍';
    }
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex-none bg-white border-b px-4 py-3 shadow-sm">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-700">
          <ArrowLeft className="size-5" />
          <span className="font-semibold">Volver</span>
        </button>
      </div>

      <div className="flex-1 overflow-auto pb-40">
        <div className="px-4 py-4 space-y-4">
          <h1 className="text-2xl" style={{ fontWeight: 700 }}>Confirmar reserva</h1>

          {/* Place info */}
          <Card>
            <CardContent className="p-0">
              <div className="flex gap-3 p-4">
                <div className={`relative w-20 h-20 rounded-xl bg-gradient-to-br ${getPlaceImage(place.id)} flex items-center justify-center shrink-0`}>
                  <span className="text-3xl">{getPlaceIcon(place.type)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{place.name}</h3>
                  <p className="text-sm text-gray-600 mb-1">Las Condes, Santiago</p>
                  <Badge variant="secondary" className="text-xs">
                    {place.type === 'coworking' ? 'Coworking' :
                     place.type === 'meeting_room' ? 'Sala de reunión' :
                     place.type === 'private_office' ? 'Oficina privada' : 'Oficina'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar selection */}
          <div>
            <h3 className="text-lg mb-3" style={{ fontWeight: 700 }}>Selecciona los días</h3>
            <Card>
              <CardContent className="p-3">
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={goToPreviousMonth}
                    className="size-7 rounded-full flex items-center justify-center hover:bg-gray-100"
                    disabled={currentMonth <= today}
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <h4 className="font-semibold text-sm">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h4>
                  <button
                    onClick={goToNextMonth}
                    className="size-7 rounded-full flex items-center justify-center hover:bg-gray-100"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

                {/* Day names */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  <div className="text-center text-xs font-medium text-gray-600 py-0.5">L</div>
                  <div className="text-center text-xs font-medium text-gray-600 py-0.5">M</div>
                  <div className="text-center text-xs font-medium text-gray-600 py-0.5">M</div>
                  <div className="text-center text-xs font-medium text-gray-600 py-0.5">J</div>
                  <div className="text-center text-xs font-medium text-gray-600 py-0.5">V</div>
                  <div className="text-center text-xs font-medium text-gray-600 py-0.5">S</div>
                  <div className="text-center text-xs font-medium text-gray-600 py-0.5">D</div>
                </div>

                {/* Calendar days */}
                <div className="grid grid-cols-7 gap-0.5">
                  {(() => {
                    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
                    const days = [];

                    // Empty cells before first day
                    for (let i = 0; i < startingDayOfWeek; i++) {
                      days.push(<div key={`empty-${i}`} />);
                    }

                    // Actual days
                    for (let day = 1; day <= daysInMonth; day++) {
                      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const isSelected = isDateSelected(date);

                      days.push(
                        <button
                          key={day}
                          onClick={() => !isPast && toggleDate(date)}
                          disabled={isPast}
                          className={`aspect-square rounded-md text-xs font-medium transition-all ${
                            isPast
                              ? 'text-gray-300 cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#4F46E5] text-white'
                              : 'hover:bg-purple-50 text-gray-700'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    }

                    return days;
                  })()}
                </div>

                {selectedDates.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-1">Días seleccionados: {selectedDates.length}</p>
                    <p className="text-xs text-gray-500">
                      {selectedDates.sort((a, b) => a.getTime() - b.getTime()).map(d =>
                        d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
                      ).join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Price breakdown */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h3 className="font-semibold">Desglose de precio</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{formatPrice(pricePerDay)} x {days} día(s)</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tarifa de servicio (5%)</span>
                  <span className="font-medium">{formatPrice(serviceFee)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-lg text-[#4F46E5]">{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment method */}
          <div>
            <h3 className="text-lg mb-3" style={{ fontWeight: 700 }}>Método de pago</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  paymentMethod === 'card'
                    ? 'border-[#4F46E5] bg-purple-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className={`size-9 rounded-full flex items-center justify-center ${
                  paymentMethod === 'card' ? 'bg-[#4F46E5]' : 'bg-gray-200'
                }`}>
                  <CreditCard className={`size-4 ${paymentMethod === 'card' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">Tarjeta de crédito/débito</p>
                  <p className="text-xs text-gray-600">Visa, Mastercard, American Express</p>
                </div>
                {paymentMethod === 'card' && (
                  <Check className="size-4 text-[#4F46E5]" />
                )}
              </button>

              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  paymentMethod === 'transfer'
                    ? 'border-[#4F46E5] bg-purple-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className={`size-9 rounded-full flex items-center justify-center ${
                  paymentMethod === 'transfer' ? 'bg-[#4F46E5]' : 'bg-gray-200'
                }`}>
                  <Building2 className={`size-4 ${paymentMethod === 'transfer' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">Transferencia bancaria</p>
                  <p className="text-xs text-gray-600">Todos los bancos</p>
                </div>
                {paymentMethod === 'transfer' && (
                  <Check className="size-4 text-[#4F46E5]" />
                )}
              </button>

              <button
                onClick={() => setPaymentMethod('onepay')}
                className={`w-full p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  paymentMethod === 'onepay'
                    ? 'border-[#4F46E5] bg-purple-50'
                    : 'border-gray-300 bg-white'
                }`}
              >
                <div className={`size-9 rounded-full flex items-center justify-center ${
                  paymentMethod === 'onepay' ? 'bg-[#4F46E5]' : 'bg-gray-200'
                }`}>
                  <Wallet className={`size-4 ${paymentMethod === 'onepay' ? 'text-white' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm">Onepay</p>
                  <p className="text-xs text-gray-600">Pago rápido con QR</p>
                </div>
                {paymentMethod === 'onepay' && (
                  <Check className="size-4 text-[#4F46E5]" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 pb-24 shadow-lg">
        <button
          onClick={handleConfirm}
          disabled={selectedDates.length === 0}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
            selectedDates.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
          }`}
        >
          {selectedDates.length === 0
            ? 'Selecciona al menos un día'
            : `Confirmar y pagar ${formatPrice(total)}`
          }
        </button>
      </div>
    </div>
  );
}
