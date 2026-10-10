import { normalizeAdminSearch } from "./AdminUi";
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
import type { ReactNode } from "react";
import {
  MoreHorizontal,
  Ban,
  Briefcase,
  GraduationCap,
  Search,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";

import { Input } from "../../components/ui/input";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  getCachedManagedUsers,
  getManagedUsersCacheRemaining,
  listManagedUsers,
  updateManagedUserStatus,
  type ManagedUser,
  type ManagedUserRole,
  type ManagedUserStatus,
} from "../../services/adminManagementService";

type RoleFilter = "all" | ManagedUserRole;
type StatusFilter = "all" | ManagedUserStatus;

const usersSource = {
  peek: getCachedManagedUsers,
  remaining: getManagedUsersCacheRemaining,
  load: listManagedUsers,
};

export function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>(
    getCachedManagedUsers() ?? [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const {
    data: loadedUsers,
    isLoading,
    error: loadError,
    isRefreshing,
    refresh,
  } = useAdminData(usersSource, isSupabaseConfigured);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setUsers(loadedUsers ?? []);
  }, [loadedUsers]);
  const filteredUsers = useMemo(() => {
    const normalizedSearch = normalizeAdminSearch(searchTerm);

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeAdminSearch(user.name).includes(normalizedSearch) ||
        normalizeAdminSearch(user.email).includes(normalizedSearch);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  const handleStatusChange = async (
    userId: string,
    newStatus: ManagedUserStatus,
  ) => {
    if (updatingUserId !== null) return;
    setUpdatingUserId(userId);
    setErrorMessage("");
    try {
      await updateManagedUserStatus(userId, newStatus);
      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, status: newStatus } : user,
        ),
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado del usuario.",
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="management-section">
      <ManagementSectionHeading
        title="Usuarios"
        count={users.length}
        description="Cuentas de estudiantes y trabajadores de la comunidad."
      />
      <div className="management-toolbar">
        <div className="relative">
          <Search size={16} className="management-search-icon" />
          <Input
            aria-label="Buscar usuarios"
            placeholder="Buscar por nombre o correo…"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10 h-10"
          />
        </div>
        <span>{filteredUsers.length} resultados</span>
      </div>
      <div className="management-filters">
        <FilterGroup label="Perfil">
          <FilterButton
            active={roleFilter === "all"}
            onClick={() => setRoleFilter("all")}
          >
            Todos
          </FilterButton>
          <FilterButton
            active={roleFilter === "student"}
            onClick={() => setRoleFilter("student")}
          >
            Estudiantes
          </FilterButton>
          <FilterButton
            active={roleFilter === "worker"}
            onClick={() => setRoleFilter("worker")}
          >
            Trabajadores
          </FilterButton>
        </FilterGroup>
        <div className="management-status-filter">
          <label htmlFor="managed-user-status">Estado</label>
          <select
            id="managed-user-status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as StatusFilter)
            }
          >
            {(
              [
                "all",
                "verified",
                "active",
                "pending",
                "suspended",
                "blocked",
              ] as StatusFilter[]
            ).map((status) => (
              <option key={status} value={status}>
                {status === "all"
                  ? "Todos los estados"
                  : getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
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
          Cargando usuarios…
        </div>
      ) : filteredUsers.length === 0 ? (
        <ManagementEmpty
          title={
            searchTerm || roleFilter !== "all" || statusFilter !== "all"
              ? "No encontramos usuarios"
              : "Todavía no hay usuarios"
          }
          description="Las cuentas de la comunidad aparecerán en este listado."
        />
      ) : (
        <div className="management-list">
          <div className="management-list-head" aria-hidden="true">
            <span>Persona</span>
            <span>Perfil</span>
            <span>Estado</span>
            <span className="text-right">Acciones</span>
          </div>
          {filteredUsers.map((user) => (
            <article key={user.id} className="management-person-row">
              <div className="management-identity">
                <ManagementAvatar
                  name={user.name}
                  tone={user.role === "student" ? "violet" : "sage"}
                />
                <div className="min-w-0">
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <small>
                    Registro · {user.registeredDate.toLocaleDateString("es-CL")}
                  </small>
                </div>
              </div>
              <div className="management-assignment">
                <span
                  className={`admin-pill category-${user.role === "student" ? "study" : "work"}`}
                >
                  {user.role === "student" ? (
                    <GraduationCap size={12} />
                  ) : (
                    <Briefcase size={12} />
                  )}
                  {getRoleLabel(user.role)}
                </span>
                <p>
                  {user.role === "student"
                    ? user.university || "Sin institución"
                    : user.company || "Sin empresa"}
                </p>
                <small>
                  {user.reservationsCount} reservas · {user.reportsCount}{" "}
                  reportes
                </small>
              </div>
              <div className="management-status">
                <Badge className={getStatusColor(user.status)}>
                  {getStatusLabel(user.status)}
                </Badge>
              </div>
              <div className="management-actions">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="admin-icon-button action-view"
                      disabled={updatingUserId !== null || isRefreshing}
                      aria-label={`Acciones para ${user.name}`}
                      title="Gestionar cuenta"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="admin-dialog">
                    {user.status !== "verified" && (
                      <DropdownMenuItem
                        onSelect={() =>
                          void handleStatusChange(user.id, "verified")
                        }
                      >
                        <Shield size={15} />
                        Verificar cuenta
                      </DropdownMenuItem>
                    )}
                    {user.status !== "active" && user.status !== "verified" && (
                      <DropdownMenuItem
                        onSelect={() =>
                          void handleStatusChange(user.id, "active")
                        }
                      >
                        <UserCheck size={15} />
                        Activar cuenta
                      </DropdownMenuItem>
                    )}
                    {user.status !== "suspended" &&
                      user.status !== "blocked" && (
                        <DropdownMenuItem
                          onSelect={() =>
                            void handleStatusChange(user.id, "suspended")
                          }
                        >
                          <UserX size={15} />
                          Suspender cuenta
                        </DropdownMenuItem>
                      )}
                    {user.status !== "blocked" && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onSelect={() =>
                            void handleStatusChange(user.id, "blocked")
                          }
                        >
                          <Ban size={15} />
                          Bloquear cuenta
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <div className="flex gap-2 flex-wrap">{children}</div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      aria-pressed={active}
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function getStatusColor(status: ManagedUserStatus) {
  switch (status) {
    case "verified":
      return "bg-slate-50 text-slate-600 border-slate-200";
    case "active":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "suspended":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "blocked":
      return "bg-red-50 text-red-700 border-red-200";
  }
}

function getStatusLabel(status: StatusFilter) {
  switch (status) {
    case "verified":
      return "Verificado";
    case "active":
      return "Activo";
    case "pending":
      return "Pendiente";
    case "suspended":
      return "Suspendido";
    case "blocked":
      return "Bloqueado";
    case "all":
      return "Todos";
  }
}

function getRoleLabel(role: ManagedUserRole) {
  return role === "student" ? "Estudiante" : "Trabajador";
}

function getRoleColor(role: ManagedUserRole) {
  return role === "student"
    ? "bg-[#f0effb] text-[#6f6c80]"
    : "bg-gray-100 text-gray-600";
}
