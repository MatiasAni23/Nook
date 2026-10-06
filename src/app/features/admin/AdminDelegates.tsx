import { useEffect, useMemo, useState } from "react";
import { Crown, Edit, Mail, MapPin, MessageCircle, Phone, Plus, Search, Trash2, UserCheck, UserX, X } from "lucide-react";
import { useNavigate } from "react-router";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  createDelegateInvitation,
  deleteManagedDelegate,
  listManagedDelegates,
  listManagedPlaceOptions,
  saveManagedDelegate,
  updateManagedDelegateStatus,
  updateManagedDelegateSubscription,
  type DelegateStatus,
  type ManagedDelegate,
  type ManagedPlaceOption,
} from "../../services/adminManagementService";

interface DelegateFormData {
  name: string;
  email: string;
  phone: string;
  status: DelegateStatus;
  subscriptionActive: boolean;
  assignedPlaces: string[];
}

const emptyFormData: DelegateFormData = {
  name: "",
  email: "",
  phone: "",
  status: "pending",
  subscriptionActive: false,
  assignedPlaces: [],
};

export function AdminDelegates() {
  const navigate = useNavigate();
  const [delegates, setDelegates] = useState<ManagedDelegate[]>([]);
  const [places, setPlaces] = useState<ManagedPlaceOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDelegate, setEditingDelegate] = useState<ManagedDelegate | null>(null);
  const [formData, setFormData] = useState<DelegateFormData>(emptyFormData);
  const [placeSearchTerm, setPlaceSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingDelegateId, setUpdatingDelegateId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [createdInviteUrl, setCreatedInviteUrl] = useState("");
  const [createdInviteEmailStatus, setCreatedInviteEmailStatus] = useState<"sent" | "failed" | "">("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no esta configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    Promise.all([listManagedDelegates(), listManagedPlaceOptions()])
      .then(([loadedDelegates, loadedPlaces]) => {
        if (!isMounted) return;
        setDelegates(loadedDelegates);
        setPlaces(loadedPlaces);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No se pudo cargar la gestion de delegados.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const placeById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);

  const filteredDelegates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return delegates.filter(
      (delegate) =>
        !normalizedSearch ||
        delegate.name.toLowerCase().includes(normalizedSearch) ||
        delegate.email.toLowerCase().includes(normalizedSearch),
    );
  }, [delegates, searchTerm]);

  const filteredPlaces = useMemo(() => {
    const normalizedSearch = placeSearchTerm.trim().toLowerCase();
    if (!normalizedSearch) return places;

    return places.filter((place) =>
      [place.name, place.address, place.category === "work" ? "trabajo" : "estudio"]
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }, [places, placeSearchTerm]);

  const handleCreate = () => {
    setEditingDelegate(null);
    setFormData(emptyFormData);
    setFormError("");
    setCreatedInviteUrl("");
    setCreatedInviteEmailStatus("");
    setPlaceSearchTerm("");
    setShowModal(true);
  };

  const handleEdit = (delegate: ManagedDelegate) => {
    setEditingDelegate(delegate);
    setFormData({
      name: delegate.name,
      email: delegate.email,
      phone: delegate.phone ?? "",
      status: delegate.status,
      subscriptionActive: delegate.subscriptionActive,
      assignedPlaces: delegate.assignedPlaces,
    });
    setFormError("");
    setCreatedInviteUrl("");
    setCreatedInviteEmailStatus("");
    setPlaceSearchTerm("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim()) {
      setFormError("Completa nombre, email y telefono.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    setErrorMessage("");

    try {
      if (!editingDelegate) {
        const { emailError, emailSent, inviteUrl } = await createDelegateInvitation({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          assignedPlaces: formData.assignedPlaces,
        });

        setCreatedInviteUrl(inviteUrl);
        setCreatedInviteEmailStatus(emailSent ? "sent" : "failed");
        if (emailError) {
          setFormError(`La invitacion se creo, pero el correo no se pudo enviar automaticamente: ${emailError}`);
        }
        setFormData(emptyFormData);
        return;
      }

      const savedDelegate = await saveManagedDelegate({
        id: editingDelegate?.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: formData.status,
        subscriptionActive: formData.subscriptionActive,
        assignedPlaces: formData.assignedPlaces,
      });

      setDelegates((current) => {
        const exists = current.some((delegate) => delegate.id === savedDelegate.id);
        return exists
          ? current.map((delegate) => (delegate.id === savedDelegate.id ? savedDelegate : delegate))
          : [savedDelegate, ...current];
      });
      setShowModal(false);
      setEditingDelegate(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "No se pudo guardar el delegado.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (delegate: ManagedDelegate) => {
    if (!confirm("Estas seguro de eliminar este delegado? Se quitaran sus lugares asignados.")) return;

    const previousDelegates = delegates;
    setUpdatingDelegateId(delegate.id);
    setErrorMessage("");
    setDelegates((current) => current.filter((item) => item.id !== delegate.id));

    try {
      await deleteManagedDelegate(delegate);
    } catch (error) {
      setDelegates(previousDelegates);
      setErrorMessage(error instanceof Error ? error.message : "No se pudo eliminar el delegado.");
    } finally {
      setUpdatingDelegateId(null);
    }
  };

  const handleStatusChange = async (delegate: ManagedDelegate) => {
    const newStatus: DelegateStatus = delegate.status === "active" ? "suspended" : "active";
    const previousDelegates = delegates;
    setUpdatingDelegateId(delegate.id);
    setErrorMessage("");
    setDelegates((current) =>
      current.map((item) => (item.id === delegate.id ? { ...item, status: newStatus } : item)),
    );

    try {
      await updateManagedDelegateStatus(delegate, newStatus);
    } catch (error) {
      setDelegates(previousDelegates);
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar el delegado.");
    } finally {
      setUpdatingDelegateId(null);
    }
  };

  const handleSubscriptionChange = async (delegate: ManagedDelegate) => {
    const nextSubscriptionState = !delegate.subscriptionActive;
    const previousDelegates = delegates;
    setUpdatingDelegateId(delegate.id);
    setErrorMessage("");
    setDelegates((current) =>
      current.map((item) =>
        item.id === delegate.id ? { ...item, subscriptionActive: nextSubscriptionState } : item,
      ),
    );

    try {
      await updateManagedDelegateSubscription(delegate, nextSubscriptionState);
    } catch (error) {
      setDelegates(previousDelegates);
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar la suscripcion.");
    } finally {
      setUpdatingDelegateId(null);
    }
  };

  const togglePlaceSelection = (placeId: string) => {
    setFormData((current) => ({
      ...current,
      assignedPlaces: current.assignedPlaces.includes(placeId)
        ? current.assignedPlaces.filter((id) => id !== placeId)
        : [...current.assignedPlaces, placeId],
    }));
  };

  const selectAllFilteredPlaces = () => {
    setFormData((current) => ({
      ...current,
      assignedPlaces: Array.from(new Set([...current.assignedPlaces, ...filteredPlaces.map((place) => place.id)])),
    }));
  };

  const clearFilteredPlaceSelection = () => {
    const filteredPlaceIds = new Set(filteredPlaces.map((place) => place.id));
    setFormData((current) => ({
      ...current,
      assignedPlaces: current.assignedPlaces.filter((id) => !filteredPlaceIds.has(id)),
    }));
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg" style={{ fontWeight: 700 }}>
              Delegados
            </h3>
            <p className="text-sm text-gray-600">{filteredDelegates.length} delegados registrados</p>
          </div>
          <Button onClick={handleCreate} size="sm" className="bg-[#4F46E5] hover:bg-[#4338CA]">
            <Plus className="size-4 mr-2" />
            Nuevo Delegado
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Buscar delegados..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">Cargando delegados...</div>
        )}

        {!isLoading && filteredDelegates.length === 0 && (
          <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
            No hay delegados que coincidan con la busqueda.
          </div>
        )}

        <div className="space-y-3">
          {filteredDelegates.map((delegate) => (
            <Card key={delegate.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold">{delegate.name}</h4>
                        <Badge className={getStatusColor(delegate.status)}>{getStatusLabel(delegate.status)}</Badge>
                        {delegate.subscriptionActive && (
                          <Badge className="border-purple-300 bg-purple-100 text-[#4F46E5]">
                            <Crown className="mr-1 size-3" />
                            Premium
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="size-3" />
                          {delegate.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="size-3" />
                          {delegate.phone || "Sin telefono"}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3" />
                          {delegate.placesCount} lugar(es) asignado(s)
                        </div>
                        {delegate.assignedPlaces.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {delegate.assignedPlaces.slice(0, 4).map((placeId) => (
                              <Badge key={placeId} variant="outline" className="text-xs">
                                {placeById.get(placeId)?.name ?? "Lugar sin nombre"}
                              </Badge>
                            ))}
                            {delegate.assignedPlaces.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{delegate.assignedPlaces.length - 4}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/chat/${delegate.userId}`)}
                      className="border-sky-300 text-sky-700 hover:bg-sky-50"
                    >
                      <MessageCircle className="mr-1 size-3" />
                      Contacto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingDelegateId === delegate.id}
                      onClick={() => handleEdit(delegate)}
                      className="text-[#4F46E5] border-[#4F46E5] hover:bg-purple-50"
                    >
                      <Edit className="size-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingDelegateId === delegate.id}
                      onClick={() => handleStatusChange(delegate)}
                      className={delegate.status === "active" ? "text-orange-600 border-orange-300" : "text-green-600 border-green-300"}
                    >
                      {delegate.status === "active" ? (
                        <>
                          <UserX className="size-3 mr-1" />
                          Suspender
                        </>
                      ) : (
                        <>
                          <UserCheck className="size-3 mr-1" />
                          Activar
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingDelegateId === delegate.id}
                      onClick={() => handleSubscriptionChange(delegate)}
                      className={delegate.subscriptionActive ? "text-purple-600 border-purple-300" : "text-gray-700 border-gray-300"}
                    >
                      <Crown className="size-3 mr-1" />
                      {delegate.subscriptionActive ? "Quitar premium" : "Dar premium"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingDelegateId === delegate.id}
                      onClick={() => handleDelete(delegate)}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Trash2 className="size-3 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <Card className="flex w-full max-w-2xl max-h-[90vh] flex-col overflow-hidden">
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                <h3 className="text-xl font-semibold mb-2">{editingDelegate ? "Editar Delegado" : "Nuevo Delegado"}</h3>
                <p className="text-sm text-gray-600">
                  {editingDelegate
                    ? "Actualiza sus datos y lugares asignados."
                    : "Crea una invitacion con correo fijo para que el delegado configure su contrasena."}
                </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowModal(false)}
                  disabled={isSaving}
                  className="-mr-2 -mt-2 shrink-0"
                  aria-label="Cerrar formulario"
                >
                  <X className="size-5" />
                </Button>
              </div>

              {createdInviteUrl && (
                <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Invitacion creada</p>
                    <p className="text-xs text-emerald-700">
                      {createdInviteEmailStatus === "sent"
                        ? "El correo se envio automaticamente. El link queda disponible como respaldo."
                        : "La invitacion se creo, pero el correo automatico fallo. Copia este link como respaldo."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input value={createdInviteUrl} readOnly className="bg-white text-xs" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigator.clipboard?.writeText(createdInviteUrl)}
                      className="shrink-0 bg-white"
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: Maria Gonzalez"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ej: maria@pinwi.cl"
                    value={formData.email}
                    disabled={Boolean(editingDelegate) || Boolean(createdInviteUrl)}
                    onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono *</Label>
                  <Input
                    id="phone"
                    placeholder="Ej: +56 9 1234 5678"
                    value={formData.phone}
                    disabled={Boolean(createdInviteUrl)}
                    onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <select
                    id="status"
                    value={formData.status}
                    disabled={Boolean(createdInviteUrl)}
                    onChange={(event) => setFormData({ ...formData, status: event.target.value as DelegateStatus })}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="active">Activo</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-purple-50">
                  <input
                    type="checkbox"
                    checked={formData.subscriptionActive}
                    disabled={Boolean(createdInviteUrl)}
                    onChange={(event) => setFormData({ ...formData, subscriptionActive: event.target.checked })}
                    className="mt-1 size-4"
                  />
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <Crown className="size-4 text-[#4F46E5]" />
                      Suscripcion premium activa
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      Desbloquea estadisticas y prioriza sus lugares en busquedas y recomendados.
                    </span>
                  </span>
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Lugares asignados</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={selectAllFilteredPlaces}
                        disabled={Boolean(createdInviteUrl) || filteredPlaces.length === 0}
                        className="h-8 px-2 text-xs text-[#4F46E5] hover:text-[#4338CA]"
                      >
                        Seleccionar todo
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearFilteredPlaceSelection}
                        disabled={Boolean(createdInviteUrl) || formData.assignedPlaces.length === 0}
                        className="h-8 px-2 text-xs text-gray-600"
                      >
                        Limpiar
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      value={placeSearchTerm}
                      onChange={(event) => setPlaceSearchTerm(event.target.value)}
                      disabled={Boolean(createdInviteUrl)}
                      placeholder="Buscar por nombre, categoría o dirección..."
                      className="pl-9"
                    />
                  </div>
                  <div className="border rounded-lg p-3 max-h-56 overflow-auto space-y-2">
                    {filteredPlaces.map((place) => (
                      <label key={place.id} className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={formData.assignedPlaces.includes(place.id)}
                          disabled={Boolean(createdInviteUrl)}
                          onChange={() => togglePlaceSelection(place.id)}
                          className="size-4 mt-0.5"
                        />
                        <span className="text-sm">
                          <span className="block font-medium">{place.name}</span>
                          <span className="block text-xs text-gray-500">
                            {place.category === "work" ? "Trabajo" : "Estudio"} - {place.address}
                          </span>
                        </span>
                      </label>
                    ))}
                    {places.length === 0 && <p className="text-sm text-gray-500">No hay lugares disponibles.</p>}
                    {places.length > 0 && filteredPlaces.length === 0 && <p className="text-sm text-gray-500">No encontramos lugares con esa búsqueda.</p>}
                  </div>
                  <p className="text-xs text-gray-500">{formData.assignedPlaces.length} lugar(es) seleccionado(s)</p>
                </div>
              </div>
              </div>
            </CardContent>

            <div className="flex shrink-0 gap-2 border-t bg-white p-6">
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1" disabled={isSaving}>
                  {createdInviteUrl ? "Cerrar" : "Cancelar"}
                </Button>
                {!createdInviteUrl && (
                  <Button onClick={handleSave} className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]" disabled={isSaving}>
                    {isSaving ? "Guardando..." : editingDelegate ? "Guardar Cambios" : "Crear Invitacion"}
                  </Button>
                )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

function getStatusColor(status: DelegateStatus) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700 border-green-300";
    case "suspended":
      return "bg-red-100 text-red-700 border-red-300";
    case "pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
  }
}

function getStatusLabel(status: DelegateStatus) {
  switch (status) {
    case "active":
      return "Activo";
    case "suspended":
      return "Suspendido";
    case "pending":
      return "Pendiente";
  }
}
