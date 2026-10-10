import { normalizeAdminSearch } from "./AdminUi";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../../components/ui/dropdown-menu";
import {
  ManagementSectionHeading,
  ManagementAvatar,
  ManagementEmpty,
  ManagementDataNotice,
} from "./AdminUi";
import { useAdminData } from "./useAdminData";
import { useEffect, useMemo, useState } from "react";
import {
  MoreHorizontal,
  Crown,
  Edit,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  getCachedManagedDelegates,
  getCachedManagedPlaceOptions,
  getManagedDelegatesCacheRemaining,
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

const delegateSource = {
  peek: () => {
    const delegates = getCachedManagedDelegates();
    const places = getCachedManagedPlaceOptions();
    return delegates && places ? { delegates, places } : null;
  },
  remaining: getManagedDelegatesCacheRemaining,
  load: async (options?: { forceRefresh?: boolean }) => {
    const [delegates, places] = await Promise.all([
      listManagedDelegates(options),
      listManagedPlaceOptions(options),
    ]);
    return { delegates, places };
  },
};
export function AdminDelegates() {
  const navigate = useNavigate();
  const [delegates, setDelegates] = useState<ManagedDelegate[]>(
    getCachedManagedDelegates() ?? [],
  );
  const [places, setPlaces] = useState<ManagedPlaceOption[]>(
    getCachedManagedPlaceOptions() ?? [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDelegate, setEditingDelegate] =
    useState<ManagedDelegate | null>(null);
  const [formData, setFormData] = useState<DelegateFormData>(emptyFormData);
  const [placeSearchTerm, setPlaceSearchTerm] = useState("");
  const {
    data: loadedData,
    isLoading,
    error: loadError,
    isRefreshing,
    refresh,
  } = useAdminData(delegateSource, isSupabaseConfigured);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingDelegateId, setUpdatingDelegateId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [createdInviteUrl, setCreatedInviteUrl] = useState("");
  const [inviteCopied, setInviteCopied] = useState(false);
  const [createdInviteEmailStatus, setCreatedInviteEmailStatus] = useState<
    "sent" | "failed" | ""
  >("");

  useEffect(() => {
    setDelegates(loadedData?.delegates ?? []);
    setPlaces(loadedData?.places ?? []);
  }, [loadedData]);
  const placeById = useMemo(
    () => new Map(places.map((place) => [place.id, place])),
    [places],
  );

  const filteredDelegates = useMemo(() => {
    const normalizedSearch = normalizeAdminSearch(searchTerm);

    return delegates.filter(
      (delegate) =>
        !normalizedSearch ||
        normalizeAdminSearch(delegate.name).includes(normalizedSearch) ||
        normalizeAdminSearch(delegate.email).includes(normalizedSearch),
    );
  }, [delegates, searchTerm]);

  const filteredPlaces = useMemo(() => {
    const normalizedSearch = normalizeAdminSearch(placeSearchTerm);
    if (!normalizedSearch) return places;

    return places.filter((place) =>
      [
        place.name,
        place.address,
        place.category === "work" ? "trabajo" : "estudio",
      ].some((value) => normalizeAdminSearch(value).includes(normalizedSearch)),
    );
  }, [places, placeSearchTerm]);

  const handleCreate = () => {
    setEditingDelegate(null);
    setFormData(emptyFormData);
    setFormError("");
    setCreatedInviteUrl("");
    setInviteCopied(false);
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
    setInviteCopied(false);
    setCreatedInviteEmailStatus("");
    setPlaceSearchTerm("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim()
    ) {
      setFormError("Completa nombre, email y telefono.");
      return;
    }

    setIsSaving(true);
    setFormError("");
    setErrorMessage("");

    try {
      if (!editingDelegate) {
        const { emailError, emailSent, inviteUrl } =
          await createDelegateInvitation({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            assignedPlaces: formData.assignedPlaces,
          });

        setCreatedInviteUrl(inviteUrl);
        setCreatedInviteEmailStatus(emailSent ? "sent" : "failed");
        if (emailError) {
          setFormError(
            `La invitacion se creo, pero el correo no se pudo enviar automaticamente: ${emailError}`,
          );
        }
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
        const exists = current.some(
          (delegate) => delegate.id === savedDelegate.id,
        );
        return exists
          ? current.map((delegate) =>
              delegate.id === savedDelegate.id ? savedDelegate : delegate,
            )
          : [savedDelegate, ...current];
      });
      setShowModal(false);
      setEditingDelegate(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el delegado.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (delegate: ManagedDelegate) => {
    if (updatingDelegateId !== null) return;
    if (
      !confirm(
        "Estas seguro de eliminar este delegado? Se quitaran sus lugares asignados.",
      )
    )
      return;

    setUpdatingDelegateId(delegate.id);
    setErrorMessage("");
    try {
      await deleteManagedDelegate(delegate);
      setDelegates((current) =>
        current.filter((item) => item.id !== delegate.id),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el delegado.",
      );
    } finally {
      setUpdatingDelegateId(null);
    }
  };

  const handleStatusChange = async (delegate: ManagedDelegate) => {
    if (updatingDelegateId !== null) return;
    const newStatus: DelegateStatus =
      delegate.status === "active" ? "suspended" : "active";
    setUpdatingDelegateId(delegate.id);
    setErrorMessage("");
    try {
      await updateManagedDelegateStatus(delegate, newStatus);
      setDelegates((current) =>
        current.map((item) =>
          item.id === delegate.id ? { ...item, status: newStatus } : item,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el delegado.",
      );
    } finally {
      setUpdatingDelegateId(null);
    }
  };

  const handleSubscriptionChange = async (delegate: ManagedDelegate) => {
    if (updatingDelegateId !== null) return;
    const nextSubscriptionState = !delegate.subscriptionActive;
    setUpdatingDelegateId(delegate.id);
    setErrorMessage("");
    try {
      await updateManagedDelegateSubscription(delegate, nextSubscriptionState);
      setDelegates((current) =>
        current.map((item) =>
          item.id === delegate.id
            ? { ...item, subscriptionActive: nextSubscriptionState }
            : item,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la suscripcion.",
      );
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
      assignedPlaces: Array.from(
        new Set([
          ...current.assignedPlaces,
          ...filteredPlaces.map((place) => place.id),
        ]),
      ),
    }));
  };

  const clearFilteredPlaceSelection = () => {
    const filteredPlaceIds = new Set(filteredPlaces.map((place) => place.id));
    setFormData((current) => ({
      ...current,
      assignedPlaces: current.assignedPlaces.filter(
        (id) => !filteredPlaceIds.has(id),
      ),
    }));
  };

  return (
    <>
      <div className="management-section">
        <ManagementSectionHeading
          title="Delegados"
          count={delegates.length}
          description="Personas que administran los espacios y sus asignaciones."
          action={
            <Button onClick={handleCreate} size="sm" className="admin-primary">
              <Plus size={15} /> Nuevo delegado
            </Button>
          }
        />
        <div className="management-toolbar">
          <div className="relative">
            <Search className="management-search-icon" size={16} />
            <Input
              aria-label="Buscar delegados"
              placeholder="Buscar por nombre o correo…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <span>{filteredDelegates.length} resultados</span>
        </div>
        <ManagementDataNotice
          error={errorMessage || loadError}
          isRefreshing={isRefreshing}
          onRetry={() => {
            setErrorMessage("");
            refresh();
          }}
        />
        {isLoading ? (
          <div className="management-empty" role="status">
            Cargando delegados…
          </div>
        ) : filteredDelegates.length === 0 ? (
          <ManagementEmpty
            title={
              searchTerm
                ? "No encontramos delegados"
                : "Todavía no hay delegados"
            }
            description={
              searchTerm
                ? "Prueba con otro nombre o correo."
                : "Los delegados y sus lugares asignados aparecerán aquí."
            }
          />
        ) : (
          <div className="management-list">
            <div className="management-list-head" aria-hidden="true">
              <span>Persona</span>
              <span>Lugares asignados</span>
              <span>Estado</span>
              <span className="text-right">Acciones</span>
            </div>
            {filteredDelegates.map((delegate) => (
              <article key={delegate.id} className="management-person-row">
                <div className="management-identity">
                  <ManagementAvatar name={delegate.name} />
                  <div className="min-w-0">
                    <h3>{delegate.name}</h3>
                    <p>{delegate.email}</p>
                    <small>{delegate.phone || "Sin teléfono"}</small>
                  </div>
                </div>
                <div className="management-assignment">
                  <strong>
                    {delegate.placesCount}{" "}
                    {delegate.placesCount === 1 ? "lugar" : "lugares"}
                  </strong>
                  <p
                    title={delegate.assignedPlaces
                      .map((id) => placeById.get(id)?.name)
                      .filter(Boolean)
                      .join(", ")}
                  >
                    {delegate.assignedPlaces
                      .map((id) => placeById.get(id)?.name)
                      .filter(Boolean)
                      .join(", ") || "Sin asignaciones"}
                  </p>
                  {delegate.subscriptionActive && (
                    <span className="admin-pill plan-basic_premium">
                      <Crown size={11} /> Premium
                    </span>
                  )}
                </div>
                <div className="management-status">
                  <Badge className={getStatusColor(delegate.status)}>
                    {getStatusLabel(delegate.status)}
                  </Badge>
                </div>
                <div className="management-actions">
                  <button
                    type="button"
                    className="admin-icon-button action-view"
                    aria-label={`Contactar a ${delegate.name}`}
                    title="Contacto"
                    onClick={() => navigate(`/admin/chat/${delegate.userId}`)}
                  >
                    <MessageCircle size={16} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-button action-edit"
                    disabled={updatingDelegateId !== null || isRefreshing}
                    aria-label={`Editar a ${delegate.name}`}
                    title="Editar"
                    onClick={() => handleEdit(delegate)}
                  >
                    <Edit size={16} />
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="admin-icon-button"
                        disabled={updatingDelegateId !== null || isRefreshing}
                        aria-label={`Más acciones para ${delegate.name}`}
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="admin-dialog">
                      <DropdownMenuItem
                        onSelect={() => void handleStatusChange(delegate)}
                      >
                        {delegate.status === "active" ? (
                          <UserX size={15} />
                        ) : (
                          <UserCheck size={15} />
                        )}
                        {delegate.status === "active"
                          ? "Suspender delegado"
                          : "Activar delegado"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => void handleSubscriptionChange(delegate)}
                      >
                        <Crown size={15} />
                        {delegate.subscriptionActive
                          ? "Quitar premium"
                          : "Dar premium"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onSelect={() => void handleDelete(delegate)}
                      >
                        <Trash2 size={15} />
                        Eliminar delegado
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {showModal && (
        <Dialog
          open={showModal}
          onOpenChange={(open) => {
            if (!isSaving) setShowModal(open);
          }}
        >
          <DialogContent
            className="admin-dialog admin-delegate-form flex max-h-[90dvh] flex-col overflow-hidden p-0 sm:max-w-2xl [&>button]:hidden"
            onEscapeKeyDown={(event) => {
              if (isSaving) event.preventDefault();
            }}
            onInteractOutside={(event) => event.preventDefault()}
          >
            <CardContent className="min-h-0 flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl font-medium mb-2">
                      {editingDelegate ? "Editar delegado" : "Nuevo delegado"}
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-500">
                      {editingDelegate
                        ? "Actualiza sus datos y lugares asignados."
                        : "Invita por correo a una persona para que configure su cuenta y acepte sus lugares asignados."}
                    </DialogDescription>
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
                      <p className="text-sm font-semibold text-emerald-800">
                        Invitacion creada
                      </p>
                      <p className="text-xs text-emerald-700">
                        {createdInviteEmailStatus === "sent"
                          ? "El correo se envio automaticamente. El link queda disponible como respaldo."
                          : "La invitacion se creo, pero el correo automatico fallo. Copia este link como respaldo."}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={createdInviteUrl}
                        readOnly
                        className="bg-white text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          try {
                            if (!navigator.clipboard) throw new Error();
                            await navigator.clipboard.writeText(
                              createdInviteUrl,
                            );
                            setInviteCopied(true);
                          } catch {
                            setInviteCopied(false);
                            setFormError(
                              "No pudimos copiar el enlace. Selecciónalo y cópialo manualmente.",
                            );
                          }
                        }}
                        className="shrink-0 bg-white"
                      >
                        {inviteCopied ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                  </div>
                )}

                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <fieldset
                  disabled={isSaving || Boolean(createdInviteUrl)}
                  className="space-y-4 min-w-0"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input
                      id="name"
                      placeholder="Ej: Maria Gonzalez"
                      value={formData.name}
                      onChange={(event) =>
                        setFormData({ ...formData, name: event.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Ej: maria@pinwi.cl"
                      value={formData.email}
                      disabled={
                        Boolean(editingDelegate) || Boolean(createdInviteUrl)
                      }
                      onChange={(event) =>
                        setFormData({ ...formData, email: event.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefono *</Label>
                    <Input
                      id="phone"
                      placeholder="Ej: +56 9 1234 5678"
                      value={formData.phone}
                      disabled={Boolean(createdInviteUrl)}
                      onChange={(event) =>
                        setFormData({ ...formData, phone: event.target.value })
                      }
                    />
                  </div>

                  {editingDelegate && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="status">Estado</Label>
                        <select
                          id="status"
                          value={formData.status}
                          disabled={Boolean(createdInviteUrl)}
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              status: event.target.value as DelegateStatus,
                            })
                          }
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
                          onChange={(event) =>
                            setFormData({
                              ...formData,
                              subscriptionActive: event.target.checked,
                            })
                          }
                          className="mt-1 size-4"
                        />
                        <span>
                          <span className="flex items-center gap-2 text-sm font-semibold">
                            <Crown className="size-4 text-[#4F46E5]" />
                            Suscripcion premium activa
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            Marca el acceso de suscripción del delegado. Esta
                            acción no realiza un cobro.
                          </span>
                        </span>
                      </label>
                    </>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label>Lugares asignados</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={selectAllFilteredPlaces}
                          disabled={
                            Boolean(createdInviteUrl) ||
                            filteredPlaces.length === 0
                          }
                          className="h-8 px-2 text-xs text-[#4F46E5] hover:text-[#4338CA]"
                        >
                          Seleccionar todo
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={clearFilteredPlaceSelection}
                          disabled={
                            Boolean(createdInviteUrl) ||
                            formData.assignedPlaces.length === 0
                          }
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
                        onChange={(event) =>
                          setPlaceSearchTerm(event.target.value)
                        }
                        disabled={Boolean(createdInviteUrl)}
                        placeholder="Buscar por nombre, categoría o dirección..."
                        className="pl-9"
                      />
                    </div>
                    <div className="border rounded-lg p-3 max-h-56 overflow-auto space-y-2">
                      {filteredPlaces.map((place) => (
                        <label
                          key={place.id}
                          className="flex items-start gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.assignedPlaces.includes(place.id)}
                            disabled={Boolean(createdInviteUrl)}
                            onChange={() => togglePlaceSelection(place.id)}
                            className="size-4 mt-0.5"
                          />
                          <span className="text-sm">
                            <span className="block font-medium">
                              {place.name}
                            </span>
                            <span className="block text-xs text-gray-500">
                              {place.category === "work"
                                ? "Trabajo"
                                : "Estudio"}{" "}
                              - {place.address}
                            </span>
                          </span>
                        </label>
                      ))}
                      {places.length === 0 && (
                        <p className="text-sm text-gray-500">
                          No hay lugares disponibles.
                        </p>
                      )}
                      {places.length > 0 && filteredPlaces.length === 0 && (
                        <p className="text-sm text-gray-500">
                          No encontramos lugares con esa búsqueda.
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formData.assignedPlaces.length} lugar(es) seleccionado(s)
                    </p>
                  </div>
                </fieldset>
              </div>
            </CardContent>

            <div className="flex shrink-0 gap-2 border-t bg-white p-6">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
                disabled={isSaving}
              >
                {createdInviteUrl ? "Cerrar" : "Cancelar"}
              </Button>
              {!createdInviteUrl && (
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]"
                  disabled={isSaving}
                >
                  {isSaving
                    ? "Guardando..."
                    : editingDelegate
                      ? "Guardar Cambios"
                      : "Crear Invitacion"}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function getStatusColor(status: DelegateStatus) {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "suspended":
      return "bg-red-50 text-red-700 border-red-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
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
