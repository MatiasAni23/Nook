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
  Save,
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
  updatePlace,
  type AppPlace,
  type PlaceAmenity,
  type PlaceCategory,
  type PlaceType,
} from "../../services/placeService";

interface AdminEditPlaceProps {
  place: Partial<AppPlace> & { id: string };
  onSave: (place?: AppPlace) => void;
}

type AmenityOption = {
  key: string;
  name: string;
  Icon: LucideIcon;
};

type DaySchedule = {
  key: string;
  label: string;
  shortLabel: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const defaultPosition = { lat: -33.4569, lng: -70.6483 };
type Coordinates = typeof defaultPosition;
type ParsedCoordinates =
  | { position: Coordinates; error?: never }
  | { position?: never; error: string };

const weekDays: DaySchedule[] = [
  { key: "monday", label: "Lunes", shortLabel: "Lun", isOpen: true, openTime: "08:00", closeTime: "22:00" },
  { key: "tuesday", label: "Martes", shortLabel: "Mar", isOpen: true, openTime: "08:00", closeTime: "22:00" },
  { key: "wednesday", label: "Miercoles", shortLabel: "Mie", isOpen: true, openTime: "08:00", closeTime: "22:00" },
  { key: "thursday", label: "Jueves", shortLabel: "Jue", isOpen: true, openTime: "08:00", closeTime: "22:00" },
  { key: "friday", label: "Viernes", shortLabel: "Vie", isOpen: true, openTime: "08:00", closeTime: "22:00" },
  { key: "saturday", label: "Sabado", shortLabel: "Sab", isOpen: true, openTime: "08:00", closeTime: "22:00" },
  { key: "sunday", label: "Domingo", shortLabel: "Dom", isOpen: true, openTime: "08:00", closeTime: "22:00" },
];

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

function getInitialCategory(place: Partial<AppPlace>): PlaceCategory {
  if (place.category) return place.category;
  return ["office", "meeting_room", "private_office"].includes(String(place.type)) ? "work" : "study";
}

function getInitialType(category: PlaceCategory, placeType?: PlaceType): PlaceType {
  if (placeType && typeOptions[category].some((option) => option.value === placeType)) return placeType;
  return typeOptions[category][0].value;
}

function parseHours(hours?: string): DaySchedule[] {
  if (!hours) return weekDays;

  const singleRange = hours.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  const parsedDays = weekDays.map((day) => {
    const dayPattern = new RegExp(`${day.shortLabel}:\\s*(Cerrado|\\d{1,2}:\\d{2}\\s*-\\s*\\d{1,2}:\\d{2})`, "i");
    const match = hours.match(dayPattern);

    if (!match) {
      return singleRange
        ? { ...day, openTime: singleRange[1], closeTime: singleRange[2] }
        : day;
    }

    if (match[1].toLowerCase() === "cerrado") {
      return { ...day, isOpen: false };
    }

    const [openTime, closeTime] = match[1].split("-").map((time) => time.trim());
    return { ...day, isOpen: true, openTime, closeTime };
  });

  return parsedDays;
}

export function AdminEditPlace({ place, onSave }: AdminEditPlaceProps) {
  const initialCategory = getInitialCategory(place);
  const initialPosition = {
    lat: Number.isFinite(place.lat) ? Number(place.lat) : defaultPosition.lat,
    lng: Number.isFinite(place.lng) ? Number(place.lng) : defaultPosition.lng,
  };
  const initialAmenityKeys = place.amenities?.filter((amenity) => amenity.isAvailable).map((amenity) => amenity.key) ?? [
    ...(place.wifi ? ["wifi"] : []),
    ...(place.outlets ? ["outlets"] : []),
    ...(place.parking ? ["parking"] : []),
  ];

  const [name, setName] = useState(place.name ?? "");
  const [category, setCategory] = useState<PlaceCategory>(initialCategory);
  const [type, setType] = useState<PlaceType>(getInitialType(initialCategory, place.type));
  const [description, setDescription] = useState(place.description ?? "");
  const [address, setAddress] = useState(place.address ?? "");
  const [zone, setZone] = useState(place.zone ?? "");
  const [dailySchedule, setDailySchedule] = useState<DaySchedule[]>(parseHours(place.hours));
  const [capacityMin, setCapacityMin] = useState(place.capacityMin == null ? "" : String(place.capacityMin));
  const [capacityMax, setCapacityMax] = useState(place.capacityMax == null ? "" : String(place.capacityMax));
  const [accessType, setAccessType] = useState<"free" | "reservation">(place.pricePerHour ? "reservation" : "free");
  const [pricePerHour, setPricePerHour] = useState(place.pricePerHour == null ? "" : String(place.pricePerHour));
  const [wifi, setWifi] = useState(place.wifi ?? true);
  const [outlets, setOutlets] = useState(place.outlets ?? true);
  const [parking, setParking] = useState(place.parking ?? false);
  const [quietness, setQuietness] = useState([place.quietness ?? 3]);
  const [lighting, setLighting] = useState([place.lighting ?? 4]);
  const [pinPosition, setPinPosition] = useState(initialPosition);
  const [latitudeInput, setLatitudeInput] = useState(initialPosition.lat.toFixed(6));
  const [longitudeInput, setLongitudeInput] = useState(initialPosition.lng.toFixed(6));
  const [selectedAmenityKeys, setSelectedAmenityKeys] = useState<string[]>(initialAmenityKeys);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(place.images ?? []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const previews = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(previews);

    return () => previews.forEach((preview) => URL.revokeObjectURL(preview));
  }, [imageFiles]);

  const selectedAmenities = useMemo<PlaceAmenity[]>(() => {
    return amenityOptions.map((amenity) => ({
      key: amenity.key,
      name: amenity.name,
      isAvailable: selectedAmenityKeys.includes(amenity.key),
    }));
  }, [selectedAmenityKeys]);

  const hours = useMemo(() => {
    return dailySchedule
      .map((day) => `${day.shortLabel}: ${day.isOpen ? `${day.openTime} - ${day.closeTime}` : "Cerrado"}`)
      .join("; ");
  }, [dailySchedule]);

  const setPinCoordinates = (position: Coordinates) => {
    setPinPosition(position);
    setLatitudeInput(position.lat.toFixed(6));
    setLongitudeInput(position.lng.toFixed(6));
  };

  const updateScheduleDay = (dayKey: string, changes: Partial<DaySchedule>) => {
    setDailySchedule((current) =>
      current.map((day) => day.key === dayKey ? { ...day, ...changes } : day),
    );
  };

  const getParsedCoordinates = (): ParsedCoordinates => {
    const latitude = Number(latitudeInput);
    const longitude = Number(longitudeInput);

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return { error: "Ingresa una latitud valida entre -90 y 90." };
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return { error: "Ingresa una longitud valida entre -180 y 180." };
    }

    return { position: { lat: latitude, lng: longitude } };
  };

  const applyCoordinateInputs = () => {
    const parsed = getParsedCoordinates();
    if (parsed.error) {
      setErrorMessage(parsed.error);
      setLatitudeInput(pinPosition.lat.toFixed(6));
      setLongitudeInput(pinPosition.lng.toFixed(6));
      return;
    }

    setErrorMessage("");
    setPinCoordinates(parsed.position);
  };

  const handleFallbackMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const lng = defaultPosition.lng + (x - rect.width / 2) / 3000;
    const lat = defaultPosition.lat - (y - rect.height / 2) / 3000;

    setPinCoordinates({ lat, lng });
  };

  const handleGoogleMapClick = (event: any) => {
    const latLng = event.detail?.latLng;
    if (!latLng) return;
    setPinCoordinates({ lat: latLng.lat, lng: latLng.lng });
  };

  const handleCategoryChange = (value: string) => {
    const nextCategory = value as PlaceCategory;
    setCategory(nextCategory);
    setType(typeOptions[nextCategory][0].value);
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
    const remainingSlots = Math.max(0, 8 - existingImageUrls.length);
    setImageFiles((current) => [...current, ...files].slice(0, remainingSlots));
    event.target.value = "";
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const removeNewImage = (index: number) => {
    setImageFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    const parsedCoordinates = getParsedCoordinates();
    if (parsedCoordinates.error) {
      setErrorMessage(parsedCoordinates.error);
      return;
    }

    if (!name || !type || !description || !address) {
      setErrorMessage("Completa nombre, tipo, direccion, descripcion y horario.");
      return;
    }

    const invalidScheduleDay = dailySchedule.find(
      (day) => day.isOpen && (!day.openTime || !day.closeTime || day.closeTime <= day.openTime),
    );
    if (invalidScheduleDay) {
      setErrorMessage(`Revisa el horario de ${invalidScheduleDay.label}: el cierre debe ser posterior a la apertura.`);
      return;
    }

    const hasOpenDay = dailySchedule.some((day) => day.isOpen);
    if (!hasOpenDay) {
      setErrorMessage("Deja al menos un dia abierto para el lugar.");
      return;
    }

    if (accessType === "reservation" && (!pricePerHour || Number(pricePerHour) <= 0)) {
      setErrorMessage("Ingresa un precio por hora valido para lugares con reserva.");
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no esta configurado. No se puede actualizar el lugar en base de datos.");
      return;
    }

    setIsSaving(true);

    try {
      const updatedPlace = await updatePlace({
        id: place.id,
        name,
        type,
        category,
        description,
        address,
        zone: zone || null,
        latitude: parsedCoordinates.position.lat,
        longitude: parsedCoordinates.position.lng,
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
        existingImageUrls,
        imageFiles,
      });

      onSave(updatedPlace);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar el lugar.");
    } finally {
      setIsSaving(false);
    }
  };

  const fallbackOffsetX = (pinPosition.lng - defaultPosition.lng) * 3000;
  const fallbackOffsetY = (defaultPosition.lat - pinPosition.lat) * 3000;
  const allImagePreviews = [
    ...existingImageUrls.map((url) => ({ type: "existing" as const, url })),
    ...imagePreviews.map((url) => ({ type: "new" as const, url })),
  ];

  return (
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-32">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>Editar Lugar</h2>
            <p className="text-gray-600">Actualiza la informacion del espacio y su ubicacion.</p>
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
                      center={pinPosition}
                      defaultZoom={14}
                      mapId="nook-admin-edit-place-map"
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
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editLatitude">Latitud exacta</Label>
                  <Input
                    id="editLatitude"
                    inputMode="decimal"
                    value={latitudeInput}
                    onChange={(e) => setLatitudeInput(e.target.value)}
                    onBlur={applyCoordinateInputs}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editLongitude">Longitud exacta</Label>
                  <Input
                    id="editLongitude"
                    inputMode="decimal"
                    value={longitudeInput}
                    onChange={(e) => setLongitudeInput(e.target.value)}
                    onBlur={applyCoordinateInputs}
                  />
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
                <Label htmlFor="editName">Nombre del lugar *</Label>
                <Input id="editName" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select value={category} onValueChange={handleCategoryChange}>
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
                  <Label htmlFor="editAddress">Direccion *</Label>
                  <Input id="editAddress" value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editZone">Zona o comuna</Label>
                  <Input id="editZone" value={zone ?? ""} onChange={(e) => setZone(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">Descripcion *</Label>
                <Textarea
                  id="editDescription"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-3 rounded-lg border bg-gray-50 p-3">
                <Label className="flex items-center gap-2">
                  <Clock className="size-4 text-[#4F46E5]" />
                  Horario *
                </Label>
                <div className="space-y-2">
                  {dailySchedule.map((day) => (
                    <div
                      key={day.key}
                      className="grid grid-cols-2 gap-3 rounded-lg border bg-white p-3 sm:grid-cols-[120px_1fr_1fr_auto]"
                    >
                      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-start">
                        <span className="text-sm font-medium text-gray-800">{day.label}</span>
                        <Switch
                          checked={day.isOpen}
                          onCheckedChange={(checked) => updateScheduleDay(day.key, { isOpen: checked })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${day.key}-edit-open`} className="text-xs text-gray-600">Apertura</Label>
                        <Input
                          id={`${day.key}-edit-open`}
                          type="time"
                          value={day.openTime}
                          disabled={!day.isOpen}
                          onChange={(e) => updateScheduleDay(day.key, { openTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${day.key}-edit-close`} className="text-xs text-gray-600">Cierre</Label>
                        <Input
                          id={`${day.key}-edit-close`}
                          type="time"
                          value={day.closeTime}
                          disabled={!day.isOpen}
                          onChange={(e) => updateScheduleDay(day.key, { closeTime: e.target.value })}
                        />
                      </div>
                      <div className="hidden items-center text-xs font-medium text-gray-500 sm:flex">
                        {day.isOpen ? "Abierto" : "Cerrado"}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">Se guardara como: {hours}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="editCapacityMin">Capacidad minima</Label>
                  <Input id="editCapacityMin" type="number" min="0" value={capacityMin} onChange={(e) => setCapacityMin(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editCapacityMax">Capacidad maxima</Label>
                  <Input id="editCapacityMax" type="number" min="0" value={capacityMax} onChange={(e) => setCapacityMax(e.target.value)} />
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
                  <Label htmlFor="editPricePerHour">Precio por hora *</Label>
                  <Input
                    id="editPricePerHour"
                    type="number"
                    min="0"
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(e.target.value)}
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
                htmlFor="editPlaceImages"
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-5 text-center hover:border-[#4F46E5]"
              >
                <Upload className="size-6 text-[#4F46E5]" />
                <span className="text-sm font-medium">Agregar imagenes</span>
                <span className="text-xs text-gray-500">Hasta 8 imagenes en total</span>
              </Label>
              <Input id="editPlaceImages" type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />

              {allImagePreviews.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {allImagePreviews.map((preview, index) => (
                    <div key={`${preview.type}-${preview.url}`} className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-100">
                      <img src={preview.url} alt={`Lugar ${index + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          if (preview.type === "existing") {
                            removeExistingImage(index);
                            return;
                          }
                          removeNewImage(index - existingImageUrls.length);
                        }}
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
                  <Label htmlFor="editWifi" className="cursor-pointer">WiFi</Label>
                  <Switch id="editWifi" checked={wifi} onCheckedChange={setWifi} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3">
                  <Label htmlFor="editOutlets" className="cursor-pointer">Enchufes</Label>
                  <Switch id="editOutlets" checked={outlets} onCheckedChange={setOutlets} />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-3">
                  <Label htmlFor="editParking" className="cursor-pointer">Estacionamiento</Label>
                  <Switch id="editParking" checked={parking} onCheckedChange={setParking} />
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
            className="mb-6 h-12 w-full bg-[#4F46E5] hover:bg-[#4338CA]"
          >
            <Save className="size-5 mr-2" />
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
