import { useState } from "react";
import { Search, UserCheck, UserX, Shield, Ban, Filter } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { mockAppUsers, type AppUser } from "../../data/managementData";

export function AdminUsers() {
  const [users, setUsers] = useState(mockAppUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'worker'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'verified' | 'suspended' | 'blocked'>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleStatusChange = (userId: string, newStatus: AppUser['status']) => {
    setUsers(users.map(u =>
      u.id === userId ? { ...u, status: newStatus } : u
    ));
  };

  const getStatusColor = (status: AppUser['status']) => {
    switch (status) {
      case 'verified': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'suspended': return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'blocked': return 'bg-red-100 text-red-700 border-red-300';
    }
  };

  const getStatusLabel = (status: AppUser['status']) => {
    switch (status) {
      case 'verified': return 'Verificado';
      case 'active': return 'Activo';
      case 'suspended': return 'Suspendido';
      case 'blocked': return 'Bloqueado';
    }
  };

  const getRoleLabel = (role: AppUser['role']) => {
    return role === 'student' ? 'Estudiante' : 'Trabajador';
  };

  const getRoleColor = (role: AppUser['role']) => {
    return role === 'student' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg" style={{ fontWeight: 700 }}>Usuarios de la Aplicación</h3>
        <p className="text-sm text-gray-600">{filteredUsers.length} usuarios registrados</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Buscar por nombre o email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-2 block">Tipo de usuario</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={roleFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('all')}
                  className={roleFilter === 'all' ? 'bg-[#4F46E5]' : ''}
                >
                  Todos
                </Button>
                <Button
                  variant={roleFilter === 'student' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('student')}
                  className={roleFilter === 'student' ? 'bg-[#4F46E5]' : ''}
                >
                  Estudiantes
                </Button>
                <Button
                  variant={roleFilter === 'worker' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter('worker')}
                  className={roleFilter === 'worker' ? 'bg-[#4F46E5]' : ''}
                >
                  Trabajadores
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Estado</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className={statusFilter === 'all' ? 'bg-[#4F46E5]' : ''}
                >
                  Todos
                </Button>
                <Button
                  variant={statusFilter === 'verified' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('verified')}
                  className={statusFilter === 'verified' ? 'bg-[#4F46E5]' : ''}
                >
                  Verificados
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  className={statusFilter === 'active' ? 'bg-[#4F46E5]' : ''}
                >
                  Activos
                </Button>
                <Button
                  variant={statusFilter === 'suspended' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('suspended')}
                  className={statusFilter === 'suspended' ? 'bg-[#4F46E5]' : ''}
                >
                  Suspendidos
                </Button>
                <Button
                  variant={statusFilter === 'blocked' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('blocked')}
                  className={statusFilter === 'blocked' ? 'bg-[#4F46E5]' : ''}
                >
                  Bloqueados
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h4 className="font-semibold">{user.name}</h4>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                      <Badge className={getStatusColor(user.status)}>
                        {getStatusLabel(user.status)}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>{user.email}</p>
                      <p>
                        {user.role === 'student' && user.university && `🎓 ${user.university}`}
                        {user.role === 'worker' && user.company && `💼 ${user.company}`}
                      </p>
                      <div className="flex gap-4 pt-1">
                        <span>📅 Registrado: {user.registeredDate.toLocaleDateString('es-CL')}</span>
                        <span>📋 {user.reservationsCount} reservas</span>
                        <span>⚠️ {user.reportsCount} reportes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {user.status !== 'verified' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(user.id, 'verified')}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Shield className="size-3 mr-1" />
                      Verificar
                    </Button>
                  )}
                  {user.status !== 'suspended' && user.status !== 'blocked' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(user.id, 'suspended')}
                      className="text-orange-600 border-orange-300 hover:bg-orange-50"
                    >
                      <UserX className="size-3 mr-1" />
                      Suspender
                    </Button>
                  )}
                  {user.status !== 'active' && user.status !== 'verified' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(user.id, 'active')}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                    >
                      <UserCheck className="size-3 mr-1" />
                      Activar
                    </Button>
                  )}
                  {user.status !== 'blocked' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(user.id, 'blocked')}
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

function Label({ className, children, ...props }: any) {
  return <label className={`text-sm font-medium ${className}`} {...props}>{children}</label>;
}
