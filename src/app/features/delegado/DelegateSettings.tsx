import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, Clock, Mail, MapPin, Phone, Save, User } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { isSupabaseConfigured } from "../../lib/supabase";
import { listCurrentDelegatePlaces, type DelegateAssignedPlace } from "../../services/adminManagementService";
import { getCurrentUserProfile, type CurrentUserProfile } from "../../services/currentUserService";
import { updateCurrentDelegateProfile } from "../../services/delegateService";

export function DelegateSettings() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<CurrentUserProfile | null>(null);
  const [places, setPlaces] = useState<DelegateAssignedPlace[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notifications: {
      newReservations: true,
      reservationConfirmed: true,
      placeReports: true,
      weeklyReport: false,
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

    Promise.all([getCurrentUserProfile(), listCurrentDelegatePlaces()])
      .then(([profile, assignedPlaces]) => {
        if (!isMounted) return;
        setCurrentUser(profile);
        setPlaces(assignedPlaces);
        setFormData((current) => ({
          ...current,
          name: profile?.name ?? "",
          email: profile?.email ?? "",
          phone: profile?.phone ?? "",
        }));
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar tu configuracion.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateCurrentDelegateProfile({
        name: formData.name,
        phone: formData.phone,
      });
      setCurrentUser((current) =>
        current
          ? {
              ...current,
              name: formData.name.trim(),
              phone: formData.phone.trim() || null,
            }
          : current,
      );
      setSuccessMessage("Configuracion guardada correctamente.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar la configuracion.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          <div>
            <h2 className="mb-1 text-2xl" style={{ fontWeight: 700 }}>
              Configuracion
            </h2>
            <p className="text-gray-600">Administra tu perfil y preferencias</p>
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
              Cargando configuracion...
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informacion Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delegate-name">
                  <User className="mr-2 inline size-4" />
                  Nombre completo
                </Label>
                <Input
                  id="delegate-name"
                  value={formData.name}
                  onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delegate-email">
                  <Mail className="mr-2 inline size-4" />
                  Email
                </Label>
                <Input id="delegate-email" type="email" value={formData.email} disabled className="bg-gray-100" />
                <p className="text-xs text-gray-500">
                  El correo viene de tu cuenta de acceso y no se cambia desde este formulario.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delegate-phone">
                  <Phone className="mr-2 inline size-4" />
                  Telefono
                </Label>
                <Input
                  id="delegate-phone"
                  value={formData.phone}
                  onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <Bell className="mr-2 inline size-5" />
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
                  <p className="text-sm text-gray-600">Notificacion cuando confirmes una reserva</p>
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

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <MapPin className="mr-2 inline size-5" />
                Lugares Administrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {places.map((place) => (
                  <div key={place.id} className="flex items-center justify-between border-b py-2 last:border-b-0">
                    <span className="text-sm">{place.name}</span>
                    <span className="text-xs text-gray-600">{place.reservationsCount} reservas</span>
                  </div>
                ))}

                {!isLoading && places.length === 0 && (
                  <p className="text-sm text-gray-600">Aun no tienes lugares asignados.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                <Clock className="mr-2 inline size-5" />
                Horarios de Atencion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-gray-600">
                Los horarios se configuran individualmente para cada lugar desde la seccion "Mis Lugares".
              </p>
              <Button variant="outline" size="sm" onClick={() => navigate("/delegate/places")} className="w-full">
                Ir a Mis Lugares
              </Button>
            </CardContent>
          </Card>

          <Button
            onClick={handleSave}
            disabled={isSaving || !currentUser}
            className="h-12 w-full bg-[#4F46E5] hover:bg-[#4338CA]"
          >
            <Save className="mr-2 size-5" />
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </Button>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pb-4 pt-4">
              <div className="space-y-2 text-center">
                <p className="text-sm font-semibold">Cuenta de Delegado</p>
                <p className="text-xs text-gray-700">
                  Como delegado, puedes administrar tus lugares, gestionar reservas y configurar horarios de forma
                  independiente.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
