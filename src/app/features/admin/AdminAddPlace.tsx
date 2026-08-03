import { useEffect, useMemo, useState } from "react";
import { APIProvider, Map, useMap, type MapCameraChangedEvent } from "@vis.gl/react-google-maps";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  Coffee,
  DollarSign,
  ExternalLink,
  ImagePlus,
  Lightbulb,
  Lock,
  MapPin,
  Monitor,
  ParkingCircle,
  Plug,
  Presentation,
  Star,
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
import { PlaceSpacesEditor, arePlaceSpacesValid, validPlaceSpaces, type PlaceSpaceDraft } from "../shared/PlaceSpacesEditor";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  createPlace,
  type AppPlace,
  type PlaceAmenity,
  type PlaceCategory,
  type PlacePlanType,
  type PlaceType,
} from "../../services/placeService";

interface AdminAddPlaceProps {
  onCreated?: (place: AppPlace) => void;
  onBack?: () => void;
  showPlanType?: boolean;
}

type AmenityOption = {
  key: string;
  name: string;
  Icon: LucideIcon;
};

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const defaultPosition = { lat: -33.4569, lng: -70.6483 };
const coordinateDecimals = 10;

type DaySchedule = {
  key: string;
  label: string;
  shortLabel: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

type Coordinates = typeof defaultPosition;
type ParsedCoordinates =
  | { position: Coordinates }
  | { error: string };

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
  { key: "coffee_tea", name: "Alimentos", Icon: Coffee },
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

const planTypeOptions: Array<{ value: PlacePlanType; label: string; description: string }> = [
  { value: "basic", label: "Basic", description: "Sin costo" },
  { value: "app_billing", label: "App Billing", description: "Comisión + fee de pago" },
  { value: "basic_premium", label: "Basic Premium", description: "Suscripción" },
  { value: "host_billing", label: "Host Billing", description: "Comisión derivada / integración" },
];

function formatCoordinate(value: number) {
  return value.toFixed(coordinateDecimals);
}

function formatCurrencyInput(value: string) {
  const amount = Number(value);
  if (!value || !Number.isFinite(amount)) return "";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getCurrencyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function RecenterAdminMap({ center }: { center: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    map?.panTo(center);
  }, [center.lat, center.lng, map]);

  return null;
}

function CenterMapPin() {
  return (
    <svg
      viewBox="0 0 72 88"
      className="h-9 w-7 drop-shadow-lg"
      aria-hidden="true"
    >
      <path
        d="M36 84C28.5 71.5 8 48 8 31C8 14.2 20.2 3 36 3S64 14.2 64 31C64 48 43.5 71.5 36 84Z"
        fill="#EF1F2D"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path
        d="M18 32C18 18.4 28.8 10 43 11"
        fill="none"
        stroke="#F65A61"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="36" cy="31" r="12.5" fill="#FFFFFF" />
      <path d="M36 84C43.5 71.5 64 48 64 31C64 45 51.5 60 36 75V84Z" fill="#C91524" opacity="0.35" />
    </svg>
  );
}

export function AdminAddPlace({ onCreated, onBack, showPlanType = true }: AdminAddPlaceProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<PlaceCategory>("study");
  const [type, setType] = useState<PlaceType>("library");
  const [planType, setPlanType] = useState<PlacePlanType>("basic");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [dailySchedule, setDailySchedule] = useState<DaySchedule[]>(weekDays);
  const [capacityMin, setCapacityMin] = useState("1");
  const [capacityMax, setCapacityMax] = useState("20");
  const [accessType, setAccessType] = useState<"free" | "reservation">("free");
  const [pricePerHour, setPricePerHour] = useState("");
  const [quietness, setQuietness] = useState([3]);
  const [lighting, setLighting] = useState([4]);
  const [pinPosition, setPinPosition] = useState(defaultPosition);
  const [mapCenterRequest, setMapCenterRequest] = useState(defaultPosition);
  const [latitudeInput, setLatitudeInput] = useState(formatCoordinate(defaultPosition.lat));
  const [longitudeInput, setLongitudeInput] = useState(formatCoordinate(defaultPosition.lng));
  const [selectedAmenityKeys, setSelectedAmenityKeys] = useState<string[]>([
    "wifi",
    "outlets",
  ]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [spaces, setSpaces] = useState<PlaceSpaceDraft[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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
  const hasWifi = selectedAmenityKeys.includes("wifi");
  const hasOutlets = selectedAmenityKeys.includes("outlets");
  const hasParking = selectedAmenityKeys.includes("parking");

  const hours = useMemo(() => {
    return dailySchedule
      .map((day) => `${day.shortLabel}: ${day.isOpen ? `${day.openTime} - ${day.closeTime}` : "Cerrado"}`)
      .join("; ");
  }, [dailySchedule]);

  const setPinCoordinates = (position: Coordinates, shouldRecenterMap = true) => {
    setPinPosition(position);
    setLatitudeInput(formatCoordinate(position.lat));
    setLongitudeInput(formatCoordinate(position.lng));
    if (shouldRecenterMap) setMapCenterRequest(position);
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
    if ("error" in parsed) {
      setErrorMessage(parsed.error);
      setLatitudeInput(formatCoordinate(pinPosition.lat));
      setLongitudeInput(formatCoordinate(pinPosition.lng));
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

  const handleGoogleCameraChanged = (event: MapCameraChangedEvent) => {
    const center = event.detail.center;
    if (!Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return;
    setPinCoordinates({ lat: center.lat, lng: center.lng }, false);
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

  const moveImage = (index: number, direction: -1 | 1) => {
    setImageFiles((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const setCoverImage = (index: number) => {
    setImageFiles((current) => {
      if (index <= 0 || index >= current.length) return current;
      const next = [...current];
      const [cover] = next.splice(index, 1);
      return [cover, ...next];
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    setImageFiles((current) => {
      const next = [...current];
      const [draggedItem] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, draggedItem);
      return next;
    });

    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const resetForm = () => {
    setName("");
    setCategory("study");
    setType("library");
    setPlanType("basic");
    setDescription("");
    setAddress("");
    setZone("");
    setWebsiteUrl("");
    setDailySchedule(weekDays);
    setCapacityMin("1");
    setCapacityMax("20");
    setAccessType("free");
    setPricePerHour("");
    setQuietness([3]);
    setLighting([4]);
    setPinCoordinates(defaultPosition);
    setSelectedAmenityKeys(["wifi", "outlets"]);
    setImageFiles([]);
    setSpaces([]);
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    const parsedCoordinates = getParsedCoordinates();
    if ("error" in parsedCoordinates) {
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
      setErrorMessage("Ingresa un precio por hora valido para lugares de paga.");
      return;
    }

    if (!arePlaceSpacesValid(spaces)) {
      setErrorMessage("Completa nombre, capacidad e imagen para cada espacio agregado.");
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
        planType,
        description,
        address,
        zone: zone || null,
        websiteUrl,
        latitude: parsedCoordinates.position.lat,
        longitude: parsedCoordinates.position.lng,
        hours,
        capacityMin: capacityMin ? Number(capacityMin) : null,
        capacityMax: capacityMax ? Number(capacityMax) : null,
        pricePerHour: accessType === "reservation" ? Number(pricePerHour) : null,
        wifi: hasWifi,
        outlets: hasOutlets,
        parking: hasParking,
        quietnessLevel: quietness[0],
        lightingLevel: lighting[0],
        amenities: selectedAmenities,
        spaces: validPlaceSpaces(spaces),
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
      <div className="flex-1 overflow-auto p-4 pb-32">
        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center gap-3">
              {onBack && (
                <Button
                  type="button"
                  size="icon"
                  onClick={onBack}
                  className="size-10 shrink-0 rounded-xl bg-[#4F46E5] text-white shadow-[0_10px_20px_rgba(79,70,229,0.20)] hover:bg-[#4338CA]"
                  aria-label="Volver a listado"
                >
                  <ArrowLeft className="size-5" />
                </Button>
              )}
              <h2 className="text-2xl" style={{ fontWeight: 700 }}>Agregar Nuevo Lugar</h2>
            </div>
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
                      onCameraChanged={handleGoogleCameraChanged}
                      className="absolute inset-0"
                    >
                      <RecenterAdminMap center={mapCenterRequest} />
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

                {googleMapsApiKey && (
                  <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-full">
                    <CenterMapPin />
                  </div>
                )}
                <p className="absolute top-3 left-3 rounded-lg bg-white/90 px-3 py-2 text-sm shadow-md">
                  {googleMapsApiKey ? "Mueve el mapa para posicionar el pin" : "Haz clic para posicionar el pin"}
                </p>
                <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/90 px-3 py-2 text-xs shadow-md">
                  <p><span className="font-semibold">Lat:</span> {formatCoordinate(pinPosition.lat)}</p>
                  <p><span className="font-semibold">Lng:</span> {formatCoordinate(pinPosition.lng)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitud exacta</Label>
                  <Input
                    id="latitude"
                    inputMode="decimal"
                    value={latitudeInput}
                    onChange={(e) => setLatitudeInput(e.target.value)}
                    onBlur={applyCoordinateInputs}
                    placeholder="-33.4569000000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitud exacta</Label>
                  <Input
                    id="longitude"
                    inputMode="decimal"
                    value={longitudeInput}
                    onChange={(e) => setLongitudeInput(e.target.value)}
                    onBlur={applyCoordinateInputs}
                    placeholder="-70.6483000000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-lg">Espacios del lugar</CardTitle></CardHeader>
            <CardContent><PlaceSpacesEditor spaces={spaces} onChange={setSpaces} /></CardContent>
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

              {showPlanType && <div className="space-y-2">
                <Label>Plan del lugar *</Label>
                <Select value={planType} onValueChange={(value) => setPlanType(value as PlacePlanType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {planTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label} — {option.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>}

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
                <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                  <ExternalLink className="size-4 text-[#4F46E5]" />
                  Pagina web
                </Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://ejemplo.cl"
                />
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
                        <Label htmlFor={`${day.key}-open`} className="text-xs text-gray-600">Apertura</Label>
                        <Input
                          id={`${day.key}-open`}
                          type="time"
                          value={day.openTime}
                          disabled={!day.isOpen}
                          onChange={(e) => updateScheduleDay(day.key, { openTime: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={`${day.key}-close`} className="text-xs text-gray-600">Cierre</Label>
                        <Input
                          id={`${day.key}-close`}
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
                    De paga
                  </button>
                </div>
              </div>

              {accessType === "reservation" && (
                <div className="space-y-2">
                  <Label htmlFor="pricePerHour">Precio por hora *</Label>
                  <Input
                    id="pricePerHour"
                    type="text"
                    inputMode="numeric"
                    value={formatCurrencyInput(pricePerHour)}
                    onChange={(e) => setPricePerHour(getCurrencyDigits(e.target.value))}
                    placeholder="$12.000"
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
              {/* Contenedor relativo para superponer el upload */}
              <div className="relative">
                {/* Grid de imágenes - Fondo */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {/* Portada */}
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                    {imagePreviews.length > 0 ? (
                      <>
                        <img src={imagePreviews[0]} alt="Portada del lugar" className="size-full object-cover" />
                        <div className="absolute top-2 left-2 flex size-8 items-center justify-center rounded-full bg-[#4F46E5] text-white font-bold text-sm shadow">
                          1
                        </div>
                        <div className="absolute top-2 right-2 px-3 py-1 rounded-full bg-[#4F46E5] text-white text-xs font-semibold shadow">
                          Portada
                        </div>
                        <button
                          type="button"
                          onClick={() => removeImage(0)}
                          className="absolute right-2 bottom-12 flex size-7 items-center justify-center rounded-full bg-white text-gray-700 shadow hover:bg-gray-100"
                          aria-label="Quitar imagen"
                        >
                          <X className="size-4" />
                        </button>
                        {imagePreviews.length > 1 && (
                          <button
                            type="button"
                            onClick={() => moveImage(0, 1)}
                            className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-white text-gray-700 shadow hover:bg-gray-100"
                            aria-label="Mover portada a la derecha"
                          >
                            <ArrowRight className="size-4" />
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center">
                        <Star className="size-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Portada</p>
                      </div>
                    )}
                  </div>

                  {/* Demás imágenes */}
                  {imagePreviews.length > 0 ? (
                    imagePreviews.slice(1).map((preview, previewIndex) => {
                      const index = previewIndex + 1;
                      return (
                        <div
                          key={preview}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`relative aspect-[4/3] overflow-hidden rounded-lg border cursor-move transition-all ${
                            draggedIndex === index ? "opacity-50 bg-blue-50" : "bg-gray-100"
                          }`}
                        >
                          <img src={preview} alt={`Lugar ${index}`} className="size-full object-cover" />
                          <div className="absolute top-2 left-2 flex size-8 items-center justify-center rounded-full bg-[#4F46E5] text-white font-bold text-sm shadow">
                            {index + 1}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white text-gray-700 shadow hover:bg-gray-100"
                            aria-label="Quitar imagen"
                          >
                            <X className="size-4" />
                          </button>
                          <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => moveImage(index, -1)}
                              className="flex size-8 items-center justify-center rounded-full bg-white text-gray-700 shadow hover:bg-gray-100"
                              aria-label="Mover imagen a la izquierda"
                            >
                              <ArrowLeft className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setCoverImage(index)}
                              className="flex size-8 items-center justify-center rounded-full bg-white text-[#4F46E5] shadow hover:bg-purple-50"
                              aria-label="Definir como portada"
                            >
                              <Star className="size-4" />
                            </button>
                            {index < imagePreviews.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveImage(index, 1)}
                                className="flex size-8 items-center justify-center rounded-full bg-white text-gray-700 shadow hover:bg-gray-100"
                                aria-label="Mover imagen a la derecha"
                              >
                                <ArrowRight className="size-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-lg text-gray-300 font-semibold">2</p>
                          <p className="text-xs text-gray-400">Imagen</p>
                        </div>
                      </div>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-lg text-gray-300 font-semibold">3</p>
                          <p className="text-xs text-gray-400">Imagen</p>
                        </div>
                      </div>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-lg text-gray-300 font-semibold">4</p>
                          <p className="text-xs text-gray-400">Imagen</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Overlay de upload - Encima del grid */}
                {imagePreviews.length === 0 && (
                  <Label
                    htmlFor="placeImages"
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white/90 backdrop-blur-sm px-4 py-5 text-center cursor-pointer hover:bg-white hover:border-[#4F46E5] transition-all z-10"
                  >
                    <Upload className="size-6 text-[#4F46E5]" />
                    <span className="text-sm font-medium">Seleccionar imagenes</span>
                    <span className="text-xs text-gray-500">Hasta 8 imagenes JPG, PNG o WebP</span>
                  </Label>
                )}
              </div>

              <Input id="placeImages" type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
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
            <Check className="size-5 mr-2" />
            {isSaving ? "Guardando..." : "Guardar lugar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
