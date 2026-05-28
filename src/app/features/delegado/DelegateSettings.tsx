import { useState } from "react";
import { User, Mail, Phone, MapPin, Clock, Bell, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";

export function DelegateSettings() {
  const [formData, setFormData] = useState({
    name: 'María González',
    email: 'maria@nook.cl',
    phone: '+56 9 1234 5678',
    notifications: {
      newReservations: true,
      reservationConfirmed: true,
      placeReports: true,
      weeklyReport: false,
    },
  });

  const handleSave = () => {
    alert('Configuración guardada correctamente');
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>Configuración</h2>
            <p className="text-gray-600">Administra tu perfil y preferencias</p>
          </div>

          {/* Profile Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  <User className="size-4 inline mr-2" />
                  Nombre completo
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="size-4 inline mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">
                  <Phone className="size-4 inline mr-2" />
                  Teléfono
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <Bell className="size-5 inline mr-2" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="notif-new">Nuevas reservas</Label>
                  <p className="text-sm text-gray-600">Recibe notificaciones cuando lleguen nuevas solicitudes</p>
                </div>
                <Switch
                  id="notif-new"
                  checked={formData.notifications.newReservations}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, newReservations: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="notif-confirmed">Reservas confirmadas</Label>
                  <p className="text-sm text-gray-600">Notificación cuando confirmes una reserva</p>
                </div>
                <Switch
                  id="notif-confirmed"
                  checked={formData.notifications.reservationConfirmed}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, reservationConfirmed: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="notif-reports">Reportes de lugares</Label>
                  <p className="text-sm text-gray-600">Alertas cuando se reporten problemas en tus lugares</p>
                </div>
                <Switch
                  id="notif-reports"
                  checked={formData.notifications.placeReports}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, placeReports: checked },
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="notif-weekly">Reporte semanal</Label>
                  <p className="text-sm text-gray-600">Resumen de actividad cada semana</p>
                </div>
                <Switch
                  id="notif-weekly"
                  checked={formData.notifications.weeklyReport}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, weeklyReport: checked },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* My Places Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <MapPin className="size-5 inline mr-2" />
                Lugares Administrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">Biblioteca Central Universidad de Chile</span>
                  <span className="text-xs text-gray-600">12 reservas</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm">Café Literario</span>
                  <span className="text-xs text-gray-600">8 reservas</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Parque Biblioteca Vitacura</span>
                  <span className="text-xs text-gray-600">4 reservas</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <Clock className="size-5 inline mr-2" />
                Horarios de Atención
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Los horarios se configuran individualmente para cada lugar desde la sección "Mis Lugares".
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/delegate/places'}
                className="w-full"
              >
                Ir a Mis Lugares
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full bg-[#4F46E5] hover:bg-[#4338CA] h-12"
          >
            <Save className="size-5 mr-2" />
            Guardar Cambios
          </Button>

          {/* Account Info */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="pt-4 pb-4">
              <div className="text-center space-y-2">
                <p className="text-sm font-semibold">Cuenta de Delegado</p>
                <p className="text-xs text-gray-700">
                  Como delegado, puedes administrar tus lugares, gestionar reservas y configurar
                  horarios de forma independiente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
