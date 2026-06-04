import { useEffect, useMemo, useState } from "react";
import { APIProvider, AdvancedMarker, Map, Pin } from "@vis.gl/react-google-maps";
import {
  Briefcase,
  Check,
  Clock,
  Coffee,
  DollarSign,
  ImagePlus,
  Lightbulb,
  Lock,
  MapPin,
  Monitor,
  ParkingCircle,
  Plug,
  Presentation,
  Upload,
  Users,
  Volume2,
  Wifi,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Slider } from "../../components/ui/slider";
import { Switch } from "../../components/ui/switch";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  createPlace,
  type AppPlace,
  type PlaceAmenity,
  type PlaceCategory,
  type PlaceType,
} from "../../services/placeService";

interface AdminAddPlaceProps {
  onCreated?: (place: AppPlace) => void;
}

type AmenityOption = {
  key: string;
  name: string;
  Icon: LucideIcon;
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const defaultPosition = { lat: -33.4569, lng: -70.6483 };

const amenityOptions: AmenityOption[] = [
  { key: "wifi", name: "WiFi de alta velocidad", Icon: Wifi },
  { key: "coffee_tea", name: "Cafe y te ilimitados", Icon: Coffee },
  { key: "meeting_room", name: "Sala de reunion", Icon: Users },
  { key: "screen", name: "Pantalla disponible", Icon: Monitor },
  { key: "lockers", name: "Lockers disponibles", Icon: Lock },
  { key: "outlets", name: "Enchufes disponibles", Icon: Plug },
  { key: "parking", name: "Estacionamiento", Icon: ParkingCircle },
  { key: "presentation", name: "Proyector o pizarra", Icon: Presentation },
  { key: "quiet_area", name: "Zona silenciosa", Icon: Volume2 },
  { key: "workstations", name: "Puestos de trabajo", Icon: Briefcase },
];

const typeOptions: Record<PlaceCategory, Array<{ value: PlaceType; label: string }>> = {
  study: [
    { value: "library", label: "Biblioteca" },
    { value: "cafe", label: "Cafe" },
    { value: "coworking", label: "Coworking" },
    { value: "park", label: "Parque" },
  ],
  work: [
    { value: "coworking", label: "Coworking" },
    { value: "office", label: "Oficina" },
    { value: "meeting_room", label: "Sala de reunion" },
    { value: "private_office", label: "Oficina privada" },
  ],
};

export function AdminAddPlace({ onCreated }: AdminAddPlaceProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("study");
  const [type, setType] = useState<PlaceType>("library");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState("");
  const [openTime, setOpenTime] = useState("08:00");
  const [closeTime, setCloseTime] = useState("22:00");
  const [capacityMin, setCapacityMin] = useState("1");
  const [capacityMax, setCapacityMax] = useState("20");
  const [accessType, setAccessType] = useState<"free" | "reservation">("free");
  const [pricePerHour, setPricePerHour] = useState("");
  const [wifi, setWifi] = useState(true);
  const [outlets, setOutlets] = useState(true);
  const [parking, setParking] = useState(false);
  const [quietness, setQuietness] = useState([3]);
  const [lighting, setLighting] = useState([4]);
  const [pinPosition, setPinPosition] = useState(defaultPosition);
  const [selectedAmenityKeys, setSelectedAmenityKeys] = useState<string[]>([
    "wifi",
    "outlets",
  ]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const previews = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);

    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [imageFiles]);

  useEffect(() => {
    setType(typeOptions[category][0].value);
  }, [category]);

  const selectedAmenities = useMemo<PlaceAmenity[]>(() => {
    return amenityOptions.map((amenity) => ({
      key: amenity.key,
      name: amenity.name,
      isAvailable: selectedAmenityKeys.includes(amenity.key),
    }));
  }, [selectedAmenityKeys]);

  const hours = useMemo(() => {
    if (!openTime || !closeTime) return "";
    return `${openTime} - ${closeTime}`;
  }, [openTime, closeTime]);

  const handleFallbackMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lng = defaultPosition.lng + (x - rect.width / 2) / 3000;
    const lat = defaultPosition.lat - (y - rect.height / 2) / 3000;

    setPinPosition({ lat, lng });
  };

  const handleGoogleMapClick = (event: any) => {
    const latLng = event.detail?.latLng;
    if (!latLng) return;
    setPinPosition({ lat: latLng.lat, lng: latLng.lng });
  };

  const toggleAmenity = (amenityKey: string) => {
    setSelectedAmenityKeys((current) =>
      current.includes(amenityKey)
        ? current.filter((key) => key !== amenityKey)
        : [...current, amenityKey],
    );
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    setImageFiles((current) => [...current, ...files].slice(0, 8));
    event.target.value = "";
  };

  const removeImage = (index: number) => {
    setImageFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const resetForm = () => {
    setName("");
    setCategory("study");
    setType("library");
    setDescription("");
    setAddress("");
    setZone("");
    setOpenTime("08:00");
    setCloseTime("22:00");
    setCapacityMin("1");
    setCapacityMax("20");
    setAccessType("free");
    setPricePerHour("");
    setWifi(true);
    setOutlets(true);
    setParking(false);
    setQuietness([3]);
    setLighting([4]);
    setPinPosition(defaultPosition);
    setSelectedAmenityKeys(["wifi", "outlets"]);
    setImageFiles([]);
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!name || !type || !description || !address || !openTime || !closeTime) {
      setErrorMessage("Completa nombre, tipo, direccion, descripcion y horario.");
      return;
    }

    if (closeTime <= openTime) {
      setErrorMessage("La hora de cierre debe ser posterior a la hora de apertura.");
      return;
    }

    if (accessType === "reservation" && (!pricePerHour || Number(pricePerHour) <= 0)) {
      setErrorMessage("Ingresa un precio por hora valido para lugares con reserva.");
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no esta configurado. No se puede guardar el lugar en base de datos.");
      return;
    }

    setIsSaving(true);

    try {
      const place = await createPlace({
        name,
        type,
        category,
        description,
        address,
        zone: zone || null,
        latitude: pinPosition.lat,
        longitude: pinPosition.lng,
        hours,
        capacityMin: capacityMin ? Number(capacityMin) : null,
        capacityMax: capacityMax ? Number(capacityMax) : null,
        pricePerHour: accessType === "reservation" ? Number(pricePerHour) : null,
        wifi,
        outlets,
        parking,
        quietnessLevel: quietness[0],
        lightingLevel: lighting[0],
        amenities: selectedAmenities,
        imageFiles,
      });

      resetForm();
      onCreated?.(place);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el lugar.");
    } finally {
      setIsSaving(false);
    }
  };

  const fallbackOffsetX = (pinPosition.lng - defaultPosition.lng) * 3000;
  const fallbackOffsetY = (defaultPosition.lat - pinPosition.lat) * 3000;

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-20">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>Agregar Nuevo Lugar</h2>
            <p className="text-gray-600">Completa la informacion del espacio y fija su ubicacion.</p>
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="size-5 text-[#4F46E5]" />
                Ubicacion en el mapa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-72 overflow-hidden rounded-lg border bg-gray-100">
                {googleMapsApiKey ? (
                  <APIProvider apiKey={googleMapsApiKey}>
                    <Map
                      defaultCenter={pinPosition}
                      defaultZoom={14}
                      mapId="nook-admin-place-map"
                      gestureHandling="greedy"
                      disableDefaultUI
                      onClick={handleGoogleMapClick}
                      className="absolute inset-0"
                    >
                      <AdvancedMarker position={pinPosition}>
                        <Pin background="#ef4444" borderColor="#ffffff" glyphColor="#ffffff" />
                      </AdvancedMarker>
                    </Map>
                  </APIProvider>
                ) : (
                  <div
                    className="absolute inset-0 cursor-crosshair bg-gradient-to-br from-blue-100 via-white to-green-100"
                    onClick={handleFallbackMapClick}
                  >
                    <div
                      className="absolute z-20 transition-all duration-200"
                      style={{
                        left: `calc(50% + ${fallbackOffsetX}px)`,
                        top: `calc(50% + ${fallbackOffsetY}px)`,
                        transform: "translate(-50%, -100%)",
                      }}
                    >
                      <MapPin className="size-10 fill-red-500 text-red-600 drop-shadow-lg" />
                    </div>
                  </div>
                )}

                <p className="absolute top-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-sm shadow-md">
                  Haz clic para posicionar el pin
                </p>
                <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-md">
                  <p><span className="font-semibold">Lat:</span> {pinPosition.lat.toFixed(6)}</p>
                  <p><span className="font-semibold">Lng:</span> {pinPosition.lng.toFixed(6)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Informacion basica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del lugar *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Biblioteca Central" />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value as PlaceCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="study">Estudio</SelectItem>
                      <SelectItem value="work">Trabajo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de lugar *</Label>
                  <Select value={type} onValueChange={(value) => setType(value as PlaceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions[category].map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Direccion *</Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej: Av. Providencia 1234" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zone">Zona o comuna</Label>
                  <Input id="zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ej: Providencia" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripcion *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe el lugar, ambiente y caracteristicas principales."
                  rows={3}
                />
              </div>

              <div className="space-y-3 rounded-lg border bg-gray-50 p-3">
                <Label className="flex items-center gap-2">
                  <Clock className="size-4 text-[#4F46E5]" />
                  Horario *
                </Label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="openTime" className="text-xs text-gray-600">Apertura</Label>
                    <Input
                      id="openTime"
                      type="time"
                      value={openTime}
                      onChange={(e) => setOpenTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="closeTime" className="text-xs text-gray-600">Cierre</Label>
                    <Input
                      id="closeTime"
                      type="time"
                      value={closeTime}
                      onChange={(e) => setCloseTime(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Se guardara como: {hours || "Selecciona apertura y cierre"}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="capacityMin">Capacidad minima</Label>
                  <Input id="capacityMin" type="number" min="0" value={capacityMin} onChange={(e) => setCapacityMin(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacityMax">Capacidad maxima</Label>
                  <Input id="capacityMax" type="number" min="0" value={capacityMax} onChange={(e) => setCapacityMax(e.target.value)} />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border bg-white p-3">
                <Label className="flex items-center gap-2">
                  <DollarSign className="size-4 text-[#4F46E5]" />
                  Acceso
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccessType("free");
                      setPricePerHour("");
                    }}
                    className={`rounded-lg border px-3 py-3 text-sm font-medium ${
                      accessType === "free"
                        ? "border-[#4F46E5] bg-purple-50 text-[#312E81]"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    Gratis
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessType("reservation")}
                    className={`rounded-lg border px-3 py-3 text-sm font-medium ${
                      accessType === "reservation"
                        ? "border-[#4F46E5] bg-purple-50 text-[#312E81]"
                        : "border-gray-200 text-gray-700"
                    }`}
                  >
                    Con reserva
                  </button>
                </div>
              </div>

              {accessType === "reservation" && (
                <div className="space-y-2">
                  <Label htmlFor="pricePerHour">Precio por hora *</Label>
                  <Input
                    id="pricePerHour"
                    type="number"
                    min="0"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(e.target.value)}
                    placeholder="Ej: 12000"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ImagePlus className="size-5 text-[#4F46E5]" />
                Imagenes del lugar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label
                htmlFor="placeImages"
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-5 text-center hover:border-[#4F46E5]"
              >
                <Upload className="size-6 text-[#4F46E5]" />
                <span className="text-sm font-medium">Seleccionar imagenes</span>
                <span className="text-xs text-gray-500">Hasta 8 imagenes JPG, PNG o WebP</span>
              </Label>
              <Input id="placeImages" type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={preview} className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-100">
                      <img src={preview} alt={`Lugar ${index + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white text-gray-700 shadow"
                        aria-label="Quitar imagen"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Comodidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {amenityOptions.map(({ key, name: amenityName, Icon }) => {
                  const isSelected = selectedAmenityKeys.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleAmenity(key)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition-all ${
                        isSelected ? "border-[#4F46E5] bg-purple-50 text-[#312E81]" : "border-gray-200 bg-white text-gray-700"
                      }`}
                    >
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${isSelected ? "bg-[#4F46E5] text-white" : "bg-gray-100"}`}>
                        <Icon className="size-5" />
                      </span>
                      <span className="flex-1 text-sm font-medium">{amenityName}</span>
                      {isSelected && <Check className="size-4 text-[#4F46E5]" />}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-3 border-t pt-4 sm:grid-cols-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3">
                  <Label htmlFor="wifi" className="cursor-pointer">WiFi</Label>
                  <Switch id="wifi" checked={wifi} onCheckedChange={setWifi} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3">
                  <Label htmlFor="outlets" className="cursor-pointer">Enchufes</Label>
                  <Switch id="outlets" checked={outlets} onCheckedChange={setOutlets} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3">
                  <Label htmlFor="parking" className="cursor-pointer">Estacionamiento</Label>
                  <Switch id="parking" checked={parking} onCheckedChange={setParking} />
                </div>
              </div>
            </CardContent>
          </Card>

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
                <Slider value={quietness} onValueChange={setQuietness} max={5} step={1} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Lightbulb className="size-5 text-[#4F46E5]" />
                    Iluminacion
                  </Label>
                  <span className="text-sm font-semibold">{lighting[0]}/5</span>
                </div>
                <Slider value={lighting} onValueChange={setLighting} max={5} step={1} />
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full bg-[#4F46E5] hover:bg-[#4338CA] h-12"
          >
            <Check className="size-5 mr-2" />
            {isSaving ? "Guardando..." : "Guardar lugar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
