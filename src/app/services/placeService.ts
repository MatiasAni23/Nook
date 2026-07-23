import { supabase } from "../lib/supabase";

export type PlaceCategory = "study" | "work";

export type PlaceType =
  | "library"
  | "cafe"
  | "coworking"
  | "office"
  | "meeting_room"
  | "private_office"
  | "park";

export interface PlaceAmenity {
  key: string;
  name: string;
  isAvailable: boolean;
  additionalInfo?: string | null;
}

export interface AppPlace {
  id: string;
  name: string;
  type: PlaceType;
  category: PlaceCategory;
  lat: number;
  lng: number;
  address: string;
  zone?: string | null;
  rating: number;
  reviews: number;
  quietness?: number | null;
  lighting?: number | null;
  wifi: boolean;
  outlets: boolean;
  parking?: boolean;
  openNow: boolean;
  hours: string;
  description: string;
  pricePerHour?: number;
  websiteUrl?: string | null;
  capacity?: number;
  capacityMin?: number | null;
  capacityMax?: number | null;
  images: string[];
  amenities: PlaceAmenity[];
}

export interface CreatePlaceInput {
  name: string;
  type: PlaceType;
  category: PlaceCategory;
  description: string;
  address: string;
  zone?: string | null;
  latitude: number;
  longitude: number;
  hours: string;
  capacityMin?: number | null;
  capacityMax?: number | null;
  pricePerHour?: number | null;
  websiteUrl?: string | null;
  wifi: boolean;
  outlets: boolean;
  parking: boolean;
  quietnessLevel: number;
  lightingLevel: number;
  amenities: PlaceAmenity[];
  imageFiles: File[];
}

type ExistingPlaceImageInput = {
  type: "existing";
  url: string;
};

type NewPlaceImageInput = {
  type: "new";
  file: File;
};

export type PlaceImageInput = ExistingPlaceImageInput | NewPlaceImageInput;

export interface UpdatePlaceInput extends Omit<CreatePlaceInput, "imageFiles"> {
  id: string;
  images: PlaceImageInput[];
}

const PLACE_IMAGES_BUCKET = "place-images";
const PLACES_CACHE_TTL_MS = 5 * 60 * 1000;

let placesCache: { timestamp: number; places: AppPlace[] } | null = null;
let placesRequest: Promise<AppPlace[]> | null = null;

type PlaceRow = {
  id: string;
  name: string;
  type: PlaceType;
  category: PlaceCategory;
  description: string | null;
  address: string;
  latitude: string | number;
  longitude: string | number;
  zone: string | null;
  rating: string | number;
  reviews_count: number;
  capacity_min: number | null;
  capacity_max: number | null;
  hours: string | null;
  price_per_hour: string | number | null;
  website_url: string | null;
  wifi: boolean;
  outlets: boolean;
  parking: boolean;
  quietness_level: number | null;
  lighting_level: number | null;
  images: string[] | null;
  place_amenities?: Array<{
    amenity_key: string;
    amenity_name: string;
    is_available: boolean;
    additional_info: string | null;
  }> | null;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Faltan variables de Supabase en .env.");
  }

  return supabase;
}

function toNumber(value: string | number | null | undefined, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeWebsiteUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function toAppPlace(row: PlaceRow): AppPlace {
  const capacityMax = row.capacity_max ?? null;
  const pricePerHour = row.price_per_hour == null ? undefined : toNumber(row.price_per_hour);

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    category: row.category,
    lat: toNumber(row.latitude),
    lng: toNumber(row.longitude),
    address: row.address,
    zone: row.zone,
    rating: toNumber(row.rating),
    reviews: row.reviews_count ?? 0,
    quietness: row.quietness_level,
    lighting: row.lighting_level,
    wifi: row.wifi,
    outlets: row.outlets,
    parking: row.parking,
    openNow: true,
    hours: row.hours ?? "Horario no informado",
    description: row.description ?? "",
    pricePerHour,
    websiteUrl: row.website_url,
    capacity: capacityMax ?? undefined,
    capacityMin: row.capacity_min,
    capacityMax,
    images: Array.isArray(row.images) ? row.images : [],
    amenities: (row.place_amenities ?? []).map((amenity) => ({
      key: amenity.amenity_key,
      name: amenity.amenity_name,
      isAvailable: amenity.is_available,
      additionalInfo: amenity.additional_info,
    })),
  };
}

async function fetchPlaces(): Promise<AppPlace[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("places")
    .select(
      `
      id,
      name,
      type,
      category,
      description,
      address,
      latitude,
      longitude,
      zone,
      rating,
      reviews_count,
      capacity_min,
      capacity_max,
      hours,
      price_per_hour,
      website_url,
      wifi,
      outlets,
      parking,
      quietness_level,
      lighting_level,
      images,
      place_amenities(
        amenity_key,
        amenity_name,
        is_available,
        additional_info
      )
    `,
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as PlaceRow[]).map(toAppPlace);
}

export function getCachedPlaces() {
  return placesCache?.places ?? null;
}

export async function listPlaces(options?: { forceRefresh?: boolean }): Promise<AppPlace[]> {
  const isFresh = placesCache && Date.now() - placesCache.timestamp < PLACES_CACHE_TTL_MS;
  if (!options?.forceRefresh && isFresh) {
    return placesCache.places;
  }

  if (!options?.forceRefresh && placesRequest) {
    return placesRequest;
  }

  placesRequest = fetchPlaces()
    .then((places) => {
      placesCache = { timestamp: Date.now(), places };
      return places;
    })
    .finally(() => {
      placesRequest = null;
    });

  return placesRequest;
}

export async function getPlaceById(placeId: string): Promise<AppPlace | null> {
  const cachedPlace = placesCache?.places.find((place) => place.id === placeId);
  if (cachedPlace) return cachedPlace;

  const client = requireSupabase();
  const { data, error } = await client
    .from("places")
    .select(
      `
      id,
      name,
      type,
      category,
      description,
      address,
      latitude,
      longitude,
      zone,
      rating,
      reviews_count,
      capacity_min,
      capacity_max,
      hours,
      price_per_hour,
      website_url,
      wifi,
      outlets,
      parking,
      quietness_level,
      lighting_level,
      images,
      place_amenities(
        amenity_key,
        amenity_name,
        is_available,
        additional_info
      )
    `,
    )
    .eq("id", placeId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const place = toAppPlace(data as PlaceRow);
  if (placesCache) {
    placesCache = {
      timestamp: placesCache.timestamp,
      places: placesCache.places.some((cachedPlace) => cachedPlace.id === place.id)
        ? placesCache.places.map((cachedPlace) => cachedPlace.id === place.id ? place : cachedPlace)
        : [place, ...placesCache.places],
    };
  }
  return place;
}

async function uploadPlaceImages(placeId: string, imageFiles: File[]) {
  const client = requireSupabase();
  const imageUrls: string[] = [];

  for (const file of imageFiles) {
    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `${placeId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(PLACE_IMAGES_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) throw error;

    const { data } = client.storage.from(PLACE_IMAGES_BUCKET).getPublicUrl(path);
    imageUrls.push(data.publicUrl);
  }

  return imageUrls;
}

export async function createPlace(input: CreatePlaceInput): Promise<AppPlace> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;

  const placeId = crypto.randomUUID();
  const imageUrls = input.imageFiles.length > 0 ? await uploadPlaceImages(placeId, input.imageFiles) : [];

  const { data, error } = await client
    .from("places")
    .insert({
      id: placeId,
      name: input.name,
      type: input.type,
      category: input.category,
      description: input.description,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      zone: input.zone || null,
      capacity_min: input.capacityMin ?? null,
      capacity_max: input.capacityMax ?? null,
      hours: input.hours,
      price_per_hour: input.pricePerHour ?? null,
      website_url: normalizeWebsiteUrl(input.websiteUrl),
      wifi: input.wifi,
      outlets: input.outlets,
      parking: input.parking,
      quietness_level: input.quietnessLevel,
      lighting_level: input.lightingLevel,
      status: "active",
      verified: true,
      images: imageUrls,
      created_by: userData.user?.id ?? null,
    })
    .select(
      `
      id,
      name,
      type,
      category,
      description,
      address,
      latitude,
      longitude,
      zone,
      rating,
      reviews_count,
      capacity_min,
      capacity_max,
      hours,
      price_per_hour,
      website_url,
      wifi,
      outlets,
      parking,
      quietness_level,
      lighting_level,
      images
    `,
    )
    .single();

  if (error) throw error;

  const availableAmenities = input.amenities.filter((amenity) => amenity.isAvailable);
  if (availableAmenities.length > 0) {
    const { error: amenitiesError } = await client.from("place_amenities").insert(
      availableAmenities.map((amenity) => ({
        place_id: placeId,
        amenity_key: amenity.key,
        amenity_name: amenity.name,
        is_available: true,
        additional_info: amenity.additionalInfo ?? null,
      })),
    );

    if (amenitiesError) throw amenitiesError;
  }

  const createdPlace = {
    ...toAppPlace({ ...(data as PlaceRow), place_amenities: [] }),
    amenities: availableAmenities,
  };
  placesCache = {
    timestamp: Date.now(),
    places: [createdPlace, ...(placesCache?.places ?? [])],
  };

  return createdPlace;
}

export async function updatePlace(input: UpdatePlaceInput): Promise<AppPlace> {
  const client = requireSupabase();
  const newImageFiles = input.images
    .filter((image): image is NewPlaceImageInput => image.type === "new")
    .map((image) => image.file);
  const uploadedImageUrls = newImageFiles.length > 0 ? await uploadPlaceImages(input.id, newImageFiles) : [];
  let uploadedImageIndex = 0;
  const imageUrls = input.images.map((image) => {
    if (image.type === "existing") return image.url;
    const uploadedUrl = uploadedImageUrls[uploadedImageIndex];
    uploadedImageIndex += 1;
    return uploadedUrl;
  }).filter(Boolean);

  const { data, error } = await client
    .from("places")
    .update({
      name: input.name,
      type: input.type,
      category: input.category,
      description: input.description,
      address: input.address,
      latitude: input.latitude,
      longitude: input.longitude,
      zone: input.zone || null,
      capacity_min: input.capacityMin ?? null,
      capacity_max: input.capacityMax ?? null,
      hours: input.hours,
      price_per_hour: input.pricePerHour ?? null,
      website_url: normalizeWebsiteUrl(input.websiteUrl),
      wifi: input.wifi,
      outlets: input.outlets,
      parking: input.parking,
      quietness_level: input.quietnessLevel,
      lighting_level: input.lightingLevel,
      images: imageUrls,
    })
    .eq("id", input.id)
    .select(
      `
      id,
      name,
      type,
      category,
      description,
      address,
      latitude,
      longitude,
      zone,
      rating,
      reviews_count,
      capacity_min,
      capacity_max,
      hours,
      price_per_hour,
      website_url,
      wifi,
      outlets,
      parking,
      quietness_level,
      lighting_level,
      images
    `,
    )
    .single();

  if (error) throw error;

  const availableAmenities = input.amenities.filter((amenity) => amenity.isAvailable);
  const { error: deleteAmenitiesError } = await client
    .from("place_amenities")
    .delete()
    .eq("place_id", input.id);

  if (deleteAmenitiesError) throw deleteAmenitiesError;

  if (availableAmenities.length > 0) {
    const { error: amenitiesError } = await client.from("place_amenities").insert(
      availableAmenities.map((amenity) => ({
        place_id: input.id,
        amenity_key: amenity.key,
        amenity_name: amenity.name,
        is_available: true,
        additional_info: amenity.additionalInfo ?? null,
      })),
    );

    if (amenitiesError) throw amenitiesError;
  }

  const updatedPlace = {
    ...toAppPlace({ ...(data as PlaceRow), place_amenities: [] }),
    amenities: availableAmenities,
  };

  if (placesCache) {
    placesCache = {
      timestamp: Date.now(),
      places: placesCache.places.map((cachedPlace) => cachedPlace.id === updatedPlace.id ? updatedPlace : cachedPlace),
    };
  }

  return updatedPlace;
}

export async function deletePlace(placeId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("places")
    .update({ status: "inactive" })
    .eq("id", placeId);

  if (error) throw error;

  if (placesCache) {
    placesCache = {
      timestamp: Date.now(),
      places: placesCache.places.filter((place) => place.id !== placeId),
    };
  }
}
