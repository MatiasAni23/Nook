import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Ban, Briefcase, CalendarDays, GraduationCap, Search, Shield, UserCheck, UserX } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  listManagedUsers,
  updateManagedUserStatus,
  type ManagedUser,
  type ManagedUserRole,
  type ManagedUserStatus,
} from "../../services/adminManagementService";

type RoleFilter = "all" | ManagedUserRole;
type StatusFilter = "all" | ManagedUserStatus;

export function AdminUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no esta configurado. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    listManagedUsers()
      .then((loadedUsers) => {
        if (isMounted) setUsers(loadedUsers);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los usuarios.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, searchTerm, statusFilter, users]);

  const handleStatusChange = async (userId: string, newStatus: ManagedUserStatus) => {
    const previousUsers = users;
    setUpdatingUserId(userId);
    setErrorMessage("");
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, status: newStatus } : user)));

    try {
      await updateManagedUserStatus(userId, newStatus);
    } catch (error) {
      setUsers(previousUsers);
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar el estado del usuario.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg" style={{ fontWeight: 700 }}>
          Usuarios de la Aplicacion
        </h3>
        <p className="text-sm text-gray-600">{filteredUsers.length} usuarios registrados</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="space-y-3">
            <FilterGroup label="Tipo de usuario">
              <FilterButton active={roleFilter === "all"} onClick={() => setRoleFilter("all")}>
                Todos
              </FilterButton>
              <FilterButton active={roleFilter === "student"} onClick={() => setRoleFilter("student")}>
                Estudiantes
              </FilterButton>
              <FilterButton active={roleFilter === "worker"} onClick={() => setRoleFilter("worker")}>
                Trabajadores
              </FilterButton>
            </FilterGroup>

            <FilterGroup label="Estado">
              {(["all", "verified", "active", "pending", "suspended", "blocked"] as StatusFilter[]).map((status) => (
                <FilterButton key={status} active={statusFilter === status} onClick={() => setStatusFilter(status)}>
                  {status === "all" ? "Todos" : getStatusLabel(status)}
                </FilterButton>
              ))}
            </FilterGroup>
          </div>
        </CardContent>
      </Card>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">Cargando usuarios...</div>
      )}

      {!isLoading && filteredUsers.length === 0 && (
        <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
          No hay usuarios que coincidan con los filtros.
        </div>
      )}

      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-semibold">{user.name}</h4>
                      <Badge className={getRoleColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                      <Badge className={getStatusColor(user.status)}>{getStatusLabel(user.status)}</Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>{user.email}</p>
                      {user.role === "student" && user.university && (
                        <p className="flex items-center gap-2">
                          <GraduationCap className="size-3" />
                          {user.university}
                        </p>
                      )}
                      {user.role === "worker" && user.company && (
                        <p className="flex items-center gap-2">
                          <Briefcase className="size-3" />
                          {user.company}
                        </p>
                      )}
                      <div className="flex gap-4 pt-1 flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="size-3" />
                          Registrado: {user.registeredDate.toLocaleDateString("es-CL")}
                        </span>
                        <span>{user.reservationsCount} reservas</span>
                        <span>{user.reportsCount} reportes</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {user.status !== "verified" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingUserId === user.id}
                      onClick={() => handleStatusChange(user.id, "verified")}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Shield className="size-3 mr-1" />
                      Verificar
                    </Button>
                  )}
                  {user.status !== "suspended" && user.status !== "blocked" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingUserId === user.id}
                      onClick={() => handleStatusChange(user.id, "suspended")}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <UserX className="size-3 mr-1" />
                      Suspender
                    </Button>
                  )}
                  {user.status !== "active" && user.status !== "verified" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingUserId === user.id}
                      onClick={() => handleStatusChange(user.id, "active")}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <UserCheck className="size-3 mr-1" />
                      Activar
                    </Button>
                  )}
                  {user.status !== "blocked" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updatingUserId === user.id}
                      onClick={() => handleStatusChange(user.id, "blocked")}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <Ban className="size-3 mr-1" />
                      Bloquear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
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
    <Button variant={active ? "default" : "outline"} size="sm" onClick={onClick} className={active ? "bg-[#4F46E5]" : ""}>
      {children}
    </Button>
  );
}

function getStatusColor(status: ManagedUserStatus) {
  switch (status) {
    case "verified":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "active":
      return "bg-green-100 text-green-700 border-green-300";
    case "pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case "suspended":
      return "bg-orange-100 text-orange-700 border-orange-300";
    case "blocked":
      return "bg-red-100 text-red-700 border-red-300";
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
  return role === "student" ? "bg-purple-100 text-purple-700" : "bg-cyan-100 text-cyan-700";
}
