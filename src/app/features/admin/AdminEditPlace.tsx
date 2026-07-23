import { useEffect, useMemo, useRef, useState } from "react";
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
  Save,
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
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  updatePlace,
  type AppPlace,
  type PlaceImageInput,
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
const coordinateDecimals = 10;
type Coordinates = typeof defaultPosition;
type ParsedCoordinates =
  | { position: Coordinates }
  | { error: string };

type EditableImage =
  | { id: string; type: "existing"; url: string }
  | { id: string; type: "new"; file: File; url: string };

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
      className="h-12 w-10 drop-shadow-lg"
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
  const objectUrlsRef = useRef<string[]>([]);
  const initialCategory = getInitialCategory(place);
  const initialPosition = {
    lat: Number.isFinite(place.lat) ? Number(place.lat) : defaultPosition.lat,
    lng: Number.isFinite(place.lng) ? Number(place.lng) : defaultPosition.lng,
  };
  const initialAmenityKeys = Array.from(new Set([
    ...(place.amenities?.filter((amenity) => amenity.isAvailable).map((amenity) => amenity.key) ?? []),
    ...(place.wifi ? ["wifi"] : []),
    ...(place.outlets ? ["outlets"] : []),
    ...(place.parking ? ["parking"] : []),
  ]));

  const [name, setName] = useState(place.name ?? "");
  const [category, setCategory] = useState<PlaceCategory>(initialCategory);
  const [type, setType] = useState<PlaceType>(getInitialType(initialCategory, place.type));
  const [description, setDescription] = useState(place.description ?? "");
  const [address, setAddress] = useState(place.address ?? "");
  const [zone, setZone] = useState(place.zone ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(place.websiteUrl ?? "");
  const [dailySchedule, setDailySchedule] = useState<DaySchedule[]>(parseHours(place.hours));
  const [capacityMin, setCapacityMin] = useState(place.capacityMin == null ? "" : String(place.capacityMin));
  const [capacityMax, setCapacityMax] = useState(place.capacityMax == null ? "" : String(place.capacityMax));
  const [accessType, setAccessType] = useState<"free" | "reservation">(place.pricePerHour ? "reservation" : "free");
  const [pricePerHour, setPricePerHour] = useState(place.pricePerHour == null ? "" : String(place.pricePerHour));
  const [quietness, setQuietness] = useState([place.quietness ?? 3]);
  const [lighting, setLighting] = useState([place.lighting ?? 4]);
  const [pinPosition, setPinPosition] = useState(initialPosition);
  const [mapCenterRequest, setMapCenterRequest] = useState(initialPosition);
  const [latitudeInput, setLatitudeInput] = useState(formatCoordinate(initialPosition.lat));
  const [longitudeInput, setLongitudeInput] = useState(formatCoordinate(initialPosition.lng));
  const [selectedAmenityKeys, setSelectedAmenityKeys] = useState<string[]>(initialAmenityKeys);
  const [images, setImages] = useState<EditableImage[]>(
    (place.images ?? []).map((url) => ({ id: `existing-${url}`, type: "existing", url })),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

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
    setImages((current) => {
      const remainingSlots = Math.max(0, 8 - current.length);
      const newImages = files.slice(0, remainingSlots).map((file) => ({
        id: `new-${crypto.randomUUID()}`,
        type: "new" as const,
        file,
        url: URL.createObjectURL(file),
      }));
      objectUrlsRef.current = [...objectUrlsRef.current, ...newImages.map((image) => image.url)];
      return [...current, ...newImages];
    });
    event.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((current) => {
      const image = current[index];
      if (image?.type === "new") {
        URL.revokeObjectURL(image.url);
        objectUrlsRef.current = objectUrlsRef.current.filter((url) => url !== image.url);
      }
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const setCoverImage = (index: number) => {
    setImages((current) => {
      if (index <= 0 || index >= current.length) return current;
      const next = [...current];
      const [cover] = next.splice(index, 1);
      return [cover, ...next];
    });
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
        images: images.map<PlaceImageInput>((image) => (
          image.type === "existing"
            ? { type: "existing", url: image.url }
            : { type: "new", file: image.file }
        )),
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
                      defaultZoom={14}
                      mapId="nook-admin-edit-place-map"
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
                <Label htmlFor="editWebsiteUrl" className="flex items-center gap-2">
                  <ExternalLink className="size-4 text-[#4F46E5]" />
                  Pagina web
                </Label>
                <Input
                  id="editWebsiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://ejemplo.cl"
                />
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
                    De paga
                  </button>
                </div>
              </div>

              {accessType === "reservation" && (
                <div className="space-y-2">
                  <Label htmlFor="editPricePerHour">Precio por hora *</Label>
                  <Input
                    id="editPricePerHour"
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
              <Label
                htmlFor="editPlaceImages"
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-5 text-center hover:border-[#4F46E5]"
              >
                <Upload className="size-6 text-[#4F46E5]" />
                <span className="text-sm font-medium">Agregar imagenes</span>
                <span className="text-xs text-gray-500">Hasta 8 imagenes en total</span>
              </Label>
              <Input id="editPlaceImages" type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />

              {images.length > 0 && (
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <Star className="size-4 fill-[#4F46E5] text-[#4F46E5]" />
                      Portada
                    </div>
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[#4F46E5] bg-gray-100">
                      <img src={images[0].url} alt="Portada del lugar" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(0)}
                        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white text-gray-700 shadow"
                        aria-label="Quitar imagen"
                      >
                        <X className="size-4" />
                      </button>
                      {images.length > 1 && (
                        <button
                          type="button"
                          onClick={() => moveImage(0, 1)}
                          className="absolute bottom-2 right-2 flex size-8 items-center justify-center rounded-full bg-white text-gray-700 shadow"
                          aria-label="Mover portada a la derecha"
                        >
                          <ArrowRight className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {images.length > 1 && (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-gray-800">Demas imagenes</div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {images.slice(1).map((image, imageIndex) => {
                          const index = imageIndex + 1;
                          return (
                            <div key={image.id} className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-gray-100">
                              <img src={image.url} alt={`Lugar ${index + 1}`} className="size-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-white text-gray-700 shadow"
                                aria-label="Quitar imagen"
                              >
                                <X className="size-4" />
                              </button>
                              <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => moveImage(index, -1)}
                                  className="flex size-8 items-center justify-center rounded-full bg-white text-gray-700 shadow"
                                  aria-label="Mover imagen a la izquierda"
                                >
                                  <ArrowLeft className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCoverImage(index)}
                                  className="flex size-8 items-center justify-center rounded-full bg-white text-[#4F46E5] shadow"
                                  aria-label="Definir como portada"
                                >
                                  <Star className="size-4" />
                                </button>
                                {index < images.length - 1 && (
                                  <button
                                    type="button"
                                    onClick={() => moveImage(index, 1)}
                                    className="flex size-8 items-center justify-center rounded-full bg-white text-gray-700 shadow"
                                    aria-label="Mover imagen a la derecha"
                                  >
                                    <ArrowRight className="size-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
