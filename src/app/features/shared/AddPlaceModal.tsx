import { useState } from "react";
import { X, MapPin, Clock, Wifi, Zap, Volume2, Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";

interface AddPlaceModalProps {
  onClose: () => void;
}

export function AddPlaceModal({ onClose }: AddPlaceModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [wifi, setWifi] = useState(true);
  const [outlets, setOutlets] = useState(true);
  const [quietness, setQuietness] = useState([3]);
  const [lighting, setLighting] = useState([4]);

  const handleSubmit = () => {
    if (!name || !type || !description || !address || !hours) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    // En producción, esto guardaría en Supabase
    alert(`Lugar "${name}" agregado correctamente!`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-white rounded-lg">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b sticky top-0 bg-white">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">Agregar Nuevo Lugar</CardTitle>
              <button
                onClick={onClose}
                className="size-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg">Información Básica</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre del lugar *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Biblioteca Central"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo de lugar *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="library">📚 Biblioteca</SelectItem>
                    <SelectItem value="cafe">☕ Café</SelectItem>
                    <SelectItem value="coworking">💼 Coworking</SelectItem>
                    <SelectItem value="park">🌳 Parque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Dirección *</Label>
                <Input
                  id="address"
                  placeholder="Ej: Av. Libertador Bernardo O'Higgins 1058"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el lugar, ambiente, características especiales..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">Horario de atención *</Label>
                <Input
                  id="hours"
                  placeholder="Ej: 8:00 - 22:00"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg">Comodidades</h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="size-5 text-purple-600" />
                  <Label htmlFor="wifi" className="cursor-pointer">WiFi disponible</Label>
                </div>
                <Switch
                  id="wifi"
                  checked={wifi}
                  onCheckedChange={setWifi}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="size-5 text-purple-600" />
                  <Label htmlFor="outlets" className="cursor-pointer">Enchufes disponibles</Label>
                </div>
                <Switch
                  id="outlets"
                  checked={outlets}
                  onCheckedChange={setOutlets}
                />
              </div>
            </div>

            {/* Environment */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg">Ambiente</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Volume2 className="size-5 text-purple-600" />
                    Nivel de silencio
                  </Label>
                  <span className="text-sm">{quietness[0]}/5</span>
                </div>
                <Slider
                  value={quietness}
                  onValueChange={setQuietness}
                  max={5}
                  step={1}
                />
                <p className="text-xs text-gray-500">1 = Ruidoso, 5 = Muy silencioso</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Lightbulb className="size-5 text-purple-600" />
                    Iluminación
                  </Label>
                  <span className="text-sm">{lighting[0]}/5</span>
                </div>
                <Slider
                  value={lighting}
                  onValueChange={setLighting}
                  max={5}
                  step={1}
                />
                <p className="text-xs text-gray-500">1 = Oscuro, 5 = Muy iluminado</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleSubmit} className="flex-1 bg-purple-600 hover:bg-purple-700">
                Agregar Lugar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
