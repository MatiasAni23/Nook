import { useState } from "react";
import { Plus, Search, Edit, Trash2, UserCheck, UserX, MapPin, Mail, Phone } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { Label } from "../../components/ui/label";
import { mockDelegates, type Delegate } from "../../data/managementData";
import { studyPlaces, workPlaces } from "../../data/mockData";

export function AdminDelegates() {
  const [delegates, setDelegates] = useState(mockDelegates);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDelegate, setEditingDelegate] = useState<Delegate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    assignedPlaces: [] as string[],
  });

  const allPlaces = [...studyPlaces, ...workPlaces];

  const filteredDelegates = delegates.filter(delegate =>
    delegate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    delegate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setEditingDelegate(null);
    setFormData({ name: '', email: '', phone: '', assignedPlaces: [] });
    setShowModal(true);
  };

  const handleEdit = (delegate: Delegate) => {
    setEditingDelegate(delegate);
    setFormData({
      name: delegate.name,
      email: delegate.email,
      phone: delegate.phone,
      assignedPlaces: delegate.assignedPlaces,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      alert('Por favor completa todos los campos');
      return;
    }

    if (editingDelegate) {
      setDelegates(delegates.map(d =>
        d.id === editingDelegate.id
          ? {
              ...d,
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              assignedPlaces: formData.assignedPlaces,
              placesCount: formData.assignedPlaces.length,
            }
          : d
      ));
    } else {
      const newDelegate: Delegate = {
        id: `d${Date.now()}`,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        status: 'pending',
        placesCount: formData.assignedPlaces.length,
        assignedPlaces: formData.assignedPlaces,
        joinedDate: new Date(),
        lastActive: new Date(),
      };
      setDelegates([...delegates, newDelegate]);
    }

    setShowModal(false);
  };

  const handleDelete = (delegateId: string) => {
    if (confirm('¿Estás seguro de eliminar este delegado?')) {
      setDelegates(delegates.filter(d => d.id !== delegateId));
    }
  };

  const handleStatusChange = (delegateId: string) => {
    setDelegates(delegates.map(d =>
      d.id === delegateId
        ? { ...d, status: d.status === 'active' ? 'suspended' : 'active' as any }
        : d
    ));
  };

  const togglePlaceSelection = (placeId: string) => {
    if (formData.assignedPlaces.includes(placeId)) {
      setFormData({
        ...formData,
        assignedPlaces: formData.assignedPlaces.filter(id => id !== placeId),
      });
    } else {
      setFormData({
        ...formData,
        assignedPlaces: [...formData.assignedPlaces, placeId],
      });
    }
  };

  const getStatusColor = (status: Delegate['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300';
      case 'suspended': return 'bg-red-100 text-red-700 border-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  const getStatusLabel = (status: Delegate['status']) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'suspended': return 'Suspendido';
      case 'pending': return 'Pendiente';
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg" style={{ fontWeight: 700 }}>Delegados</h3>
            <p className="text-sm text-gray-600">{filteredDelegates.length} delegados registrados</p>
          </div>
          <Button
            onClick={handleCreate}
            size="sm"
            className="bg-[#4F46E5] hover:bg-[#4338CA]"
          >
            <Plus className="size-4 mr-2" />
            Nuevo Delegado
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Buscar delegados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Delegates List */}
        <div className="space-y-3">
          {filteredDelegates.map((delegate) => (
            <Card key={delegate.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{delegate.name}</h4>
                        <Badge className={getStatusColor(delegate.status)}>
                          {getStatusLabel(delegate.status)}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="size-3" />
                          {delegate.email}
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="size-3" />
                          {delegate.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="size-3" />
                          {delegate.placesCount} lugar(es) asignado(s)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(delegate)}
                      className="text-[#4F46E5] border-[#4F46E5] hover:bg-purple-50"
                    >
                      <Edit className="size-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(delegate.id)}
                      className={delegate.status === 'active' ? 'text-orange-600 border-orange-300' : 'text-green-600 border-green-300'}
                    >
                      {delegate.status === 'active' ? (
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
                      onClick={() => handleDelete(delegate.id)}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardContent className="p-6 space-y-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {editingDelegate ? 'Editar Delegado' : 'Nuevo Delegado'}
                </h3>
                <p className="text-sm text-gray-600">
                  Completa la información del delegado
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    placeholder="Ej: María González"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Ej: maria@nook.cl"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono *</Label>
                  <Input
                    id="phone"
                    placeholder="Ej: +56 9 1234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Lugares asignados</Label>
                  <div className="border rounded-lg p-3 max-h-48 overflow-auto space-y-2">
                    {allPlaces.map((place) => (
                      <label
                        key={place.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={formData.assignedPlaces.includes(place.id)}
                          onChange={() => togglePlaceSelection(place.id)}
                          className="size-4"
                        />
                        <span className="text-sm">{place.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {formData.assignedPlaces.length} lugar(es) seleccionado(s)
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-[#4F46E5] hover:bg-[#4338CA]"
                >
                  {editingDelegate ? 'Guardar Cambios' : 'Crear Delegado'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
