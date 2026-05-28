import { useState } from "react";
import { MapPin, Wifi, Zap, Volume2, Lightbulb, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";

export function AdminAddPlace() {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [wifi, setWifi] = useState(true);
  const [outlets, setOutlets] = useState(true);
  const [quietness, setQuietness] = useState([3]);
  const [lighting, setLighting] = useState([4]);
  const [pinPosition, setPinPosition] = useState({ lat: -33.4569, lng: -70.6483 });

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convertir coordenadas del click a lat/lng (simplificado)
    const lng = -70.6483 + (x - rect.width / 2) / 3000;
    const lat = -33.4569 - (y - rect.height / 2) / 3000;

    setPinPosition({ lat, lng });
  };

  const handleSubmit = () => {
    if (!name || !type || !description || !address || !hours) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    alert(`Lugar "${name}" agregado en coordenadas:\nLat: ${pinPosition.lat.toFixed(4)}, Lng: ${pinPosition.lng.toFixed(4)}`);

    // Reset form
    setName("");
    setType("");
    setDescription("");
    setAddress("");
    setHours("");
    setPinPosition({ lat: -33.4569, lng: -70.6483 });
  };

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl mb-1">Agregar Nuevo Lugar</h2>
            <p className="text-gray-600">Completa la información del espacio de estudio</p>
          </div>

          {/* Map */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="size-5 text-[#4F46E5]" />
                Ubicación en el Mapa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="relative h-64 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg cursor-crosshair overflow-hidden"
                onClick={handleMapClick}
              >
                {/* Pin marker */}
                <div
                  className="absolute z-20 transition-all duration-200"
                  style={{
                    left: `50%`,
                    top: `50%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <div className="relative">
                    <MapPin className="size-10 text-red-600 fill-red-500 drop-shadow-lg animate-bounce" />
                  </div>
                </div>

                <p className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm shadow-md">
                  Haz clic en el mapa para posicionar el lugar
                </p>

                <div className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs">
                  <p><span className="font-semibold">Lat:</span> {pinPosition.lat.toFixed(6)}</p>
                  <p><span className="font-semibold">Lng:</span> {pinPosition.lng.toFixed(6)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Información Básica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Comodidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="size-5 text-[#4F46E5]" />
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
                  <Zap className="size-5 text-[#4F46E5]" />
                  <Label htmlFor="outlets" className="cursor-pointer">Enchufes disponibles</Label>
                </div>
                <Switch
                  id="outlets"
                  checked={outlets}
                  onCheckedChange={setOutlets}
                />
              </div>
            </CardContent>
          </Card>

          {/* Environment */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Ambiente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Volume2 className="size-5 text-[#4F46E5]" />
                    Nivel de silencio
                  </Label>
                  <span className="text-sm font-semibold">{quietness[0]}/5</span>
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
                    <Lightbulb className="size-5 text-[#4F46E5]" />
                    Iluminación
                  </Label>
                  <span className="text-sm font-semibold">{lighting[0]}/5</span>
                </div>
                <Slider
                  value={lighting}
                  onValueChange={setLighting}
                  max={5}
                  step={1}
                />
                <p className="text-xs text-gray-500">1 = Oscuro, 5 = Muy iluminado</p>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            className="w-full bg-[#4F46E5] hover:bg-[#4338CA] h-12"
          >
            <Check className="size-5 mr-2" />
            Agregar Lugar
          </Button>
        </div>
      </div>
    </div>
  );
}
