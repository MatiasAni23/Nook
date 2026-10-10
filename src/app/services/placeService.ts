import { supabase } from "../lib/supabase";
import { clearAdminDataCaches } from "./adminDataCache";

export type PlaceCategory = "study" | "work";

/** Plan comercial que determina las funcionalidades habilitadas para un lugar. */
export type PlacePlanType =
  | "basic"
  | "app_billing"
  | "basic_premium"
  | "host_billing";

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

export interface PlaceSpace {
  id: string;
  name: string;
  capacity: number;
  pricePerHour: number;
  billingUnit: "hour" | "day" | "week" | "month";
  imageUrl: string;
}

export type PlaceSpaceInput = {
  name: string;
  capacity: number;
  pricePerHour: number;
  billingUnit: "hour" | "day" | "week" | "month";
  image: { type: "existing"; url: string } | { type: "new"; file: File };
};

export interface AppPlace {
  id: string;
  name: string;
  type: PlaceType;
  category: PlaceCategory;
  planType: PlacePlanType;
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
  spaces: PlaceSpace[];
  isPromoted?: boolean;
}

export interface CreatePlaceInput {
  name: string;
  type: PlaceType;
  category: PlaceCategory;
  planType: PlacePlanType;
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
  spaces: PlaceSpaceInput[];
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
let placesCacheGeneration = 0;

export function clearPlacesCache() {
  clearAdminDataCaches();
  placesCacheGeneration += 1;
  placesCache = null;
  placesRequest = null;
}

type PlaceRow = {
  id: string;
  name: string;
  type: PlaceType;
  category: PlaceCategory;
  plan_type: PlacePlanType;
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
  is_promoted?: boolean | null;
  place_spaces?: Array<{
    id: string;
    name: string;
    capacity: number;
    price_per_hour: string | number;
    billing_unit: "hour" | "day" | "week" | "month";
    image_url: string;
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
  const pricePerHour =
    row.price_per_hour == null ? undefined : toNumber(row.price_per_hour);

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    category: row.category,
    planType: row.plan_type ?? "basic",
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
    spaces: (row.place_spaces ?? []).map((space) => ({
      id: space.id,
      name: space.name,
      capacity: space.capacity,
      pricePerHour: toNumber(space.price_per_hour),
      billingUnit: space.billing_unit ?? "hour",
      imageUrl: space.image_url,
    })),
    isPromoted: Boolean(row.is_promoted),
  };
}

async function fetchPlaces(): Promise<AppPlace[]> {
  const client = requireSupabase();
  const promotedResult = await client.rpc("list_public_places");

  if (!promotedResult.error && promotedResult.data) {
    const rows = (promotedResult.data ?? []) as PlaceRow[];
    const { data: spaces, error: spacesError } = await client
      .from("place_spaces")
      .select(
        "id, place_id, name, capacity, price_per_hour, billing_unit, image_url",
      );

    // An incomplete record must not become an edit form that erases its spaces.
    if (spacesError) throw spacesError;

    if (!spacesError) {
      const spacesByPlace = new Map<
        string,
        NonNullable<PlaceRow["place_spaces"]>
      >();
      for (const space of spaces ?? []) {
        const placeSpaces = spacesByPlace.get(String(space.place_id)) ?? [];
        placeSpaces.push({
          id: String(space.id),
          name: space.name,
          capacity: space.capacity,
          price_per_hour: space.price_per_hour,
          billing_unit: space.billing_unit,
          image_url: space.image_url,
        });
        spacesByPlace.set(String(space.place_id), placeSpaces);
      }
      rows.forEach((row) => {
        row.place_spaces = spacesByPlace.get(row.id) ?? [];
      });
    }

    return rows.map(toAppPlace).sort(sortPromotedPlaces);
  }

  const { data, error } = await client
    .from("places")
    .select(
      `
      id,
      name,
      type,
      category,
      plan_type,
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
      ),
      place_spaces(
        id,
        name,
        capacity,
        price_per_hour,
        billing_unit,
        image_url
      )
    `,
    )
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as PlaceRow[]).map(toAppPlace).sort(sortPromotedPlaces);
}

export function sortPromotedPlaces(a: AppPlace, b: AppPlace) {
  if (a.isPromoted !== b.isPromoted) return a.isPromoted ? -1 : 1;
  if (b.rating !== a.rating) return b.rating - a.rating;
  return b.reviews - a.reviews;
}

export function getCachedPlaces() {
  return placesCache?.places ?? null;
}

export function getPlacesCacheRemaining() {
  return placesCache
    ? Math.max(0, PLACES_CACHE_TTL_MS - (Date.now() - placesCache.timestamp))
    : 0;
}

export async function listPlaces(options?: {
  forceRefresh?: boolean;
}): Promise<AppPlace[]> {
  const isFresh =
    placesCache && Date.now() - placesCache.timestamp < PLACES_CACHE_TTL_MS;
  if (!options?.forceRefresh && isFresh && placesCache) {
    return placesCache.places;
  }

  if (!options?.forceRefresh && placesRequest) {
    return placesRequest;
  }

  const generation = placesCacheGeneration;
  const request = fetchPlaces()
    .then((places) => {
      if (generation !== placesCacheGeneration) return [];
      placesCache = { timestamp: Date.now(), places };
      return places;
    })
    .finally(() => {
      if (placesRequest === request) placesRequest = null;
    });
  placesRequest = request;
  return request;
}

export async function getPlaceById(placeId: string): Promise<AppPlace | null> {
  const generation = placesCacheGeneration;
  const cachedPlace = placesCache?.places.find((place) => place.id === placeId);
  if (cachedPlace && getPlacesCacheRemaining() > 0) return cachedPlace;

  const client = requireSupabase();
  const { data, error } = await client
    .from("places")
    .select(
      `
      id,
      name,
      type,
      category,
      plan_type,
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
      ),
      place_spaces(
        id,
        name,
        capacity,
        price_per_hour,
        billing_unit,
        image_url
      )
    `,
    )
    .eq("id", placeId)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  if (generation !== placesCacheGeneration) return null;

  const place = toAppPlace(data as PlaceRow);
  if (placesCache) {
    placesCache = {
      timestamp: placesCache.timestamp,
      places: placesCache.places.some(
        (cachedPlace) => cachedPlace.id === place.id,
      )
        ? placesCache.places.map((cachedPlace) =>
            cachedPlace.id === place.id ? place : cachedPlace,
          )
        : [place, ...placesCache.places],
    };
  }
  return place;
}

async function uploadPlaceImages(
  placeId: string,
  imageFiles: File[],
  uploadedPaths: string[] = [],
) {
  const client = requireSupabase();
  const imageUrls: string[] = [];

  for (const file of imageFiles) {
    const extension = file.name.split(".").pop() ?? "jpg";
    const path = `${placeId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage
      .from(PLACE_IMAGES_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) throw error;
    uploadedPaths.push(path);

    const { data } = client.storage
      .from(PLACE_IMAGES_BUCKET)
      .getPublicUrl(path);
    imageUrls.push(data.publicUrl);
  }

  return imageUrls;
}

async function savePlaceSpaces(
  placeId: string,
  spaces: PlaceSpaceInput[],
  uploadedPaths: string[] = [],
) {
  const client = requireSupabase();
  const rows = [];

  for (const space of spaces) {
    let imageUrl: string;
    if (space.image.type === "existing") {
      imageUrl = space.image.url;
    } else {
      const [uploadedUrl] = await uploadPlaceImages(
        placeId,
        [space.image.file],
        uploadedPaths,
      );
      imageUrl = uploadedUrl;
    }
    rows.push({
      place_id: placeId,
      name: space.name.trim(),
      capacity: space.capacity,
      price_per_hour: space.pricePerHour,
      billing_unit: space.billingUnit,
      image_url: imageUrl,
    });
  }

  if (rows.length === 0) return [];
  const { data, error } = await client
    .from("place_spaces")
    .insert(rows)
    .select("id, name, capacity, price_per_hour, billing_unit, image_url");
  if (error) throw error;
  return (data ?? []).map((space) => ({
    id: String(space.id),
    name: space.name,
    capacity: space.capacity,
    pricePerHour: toNumber(space.price_per_hour),
    billingUnit: space.billing_unit ?? "hour",
    imageUrl: space.image_url,
  }));
}

export async function createPlace(input: CreatePlaceInput): Promise<AppPlace> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("Inicia sesión antes de crear un lugar.");

  const placeId = crypto.randomUUID();
  const uploadedPaths: string[] = [];

  const { data, error } = await client
    .from("places")
    .insert({
      id: placeId,
      name: input.name,
      type: input.type,
      category: input.category,
      plan_type: input.planType,
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
      verified: false,
      images: [],
      created_by: userData.user?.id ?? null,
    })
    .select(
      `
      id,
      name,
      type,
      category,
      plan_type,
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

  try {
    // Insert first so Storage can check ownership against an existing place.
    const imageUrls =
      input.imageFiles.length > 0
        ? await uploadPlaceImages(placeId, input.imageFiles, uploadedPaths)
        : [];
    if (imageUrls.length) {
      const { error: imagesError } = await client
        .from("places")
        .update({ images: imageUrls })
        .eq("id", placeId)
        .select("id")
        .single();
      if (imagesError) throw imagesError;
    }
    const availableAmenities = input.amenities.filter(
      (amenity) => amenity.isAvailable,
    );
    if (availableAmenities.length > 0) {
      const { error: amenitiesError } = await client
        .from("place_amenities")
        .insert(
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

    const spaces = await savePlaceSpaces(placeId, input.spaces, uploadedPaths);

    const createdPlace = {
      ...toAppPlace({
        ...(data as PlaceRow),
        images: imageUrls,
        place_amenities: [],
      }),
      amenities: availableAmenities,
      spaces,
    };
    // Invalidate pending lists too: a single record is not a complete catalogue.
    clearPlacesCache();

    return createdPlace;
  } catch (saveError) {
    clearPlacesCache();
    // Clean Storage while the parent row still exists for its RLS checks.
    if (uploadedPaths.length)
      await client.storage.from(PLACE_IMAGES_BUCKET).remove(uploadedPaths);
    const { error: rollbackError } = await client
      .from("places")
      .delete()
      .eq("id", placeId)
      .select("id")
      .single();
    if (rollbackError)
      throw new Error(
        "El lugar se creó, pero no se completó su ficha. Recarga el catálogo y revísalo antes de volver a crearlo.",
      );
    throw saveError;
  }
}

export async function updatePlace(input: UpdatePlaceInput): Promise<AppPlace> {
  const client = requireSupabase();
  // Secondary writes may fail after the main row has been saved.
  clearPlacesCache();
  const newImageFiles = input.images
    .filter((image): image is NewPlaceImageInput => image.type === "new")
    .map((image) => image.file);
  const uploadedImageUrls =
    newImageFiles.length > 0
      ? await uploadPlaceImages(input.id, newImageFiles)
      : [];
  let uploadedImageIndex = 0;
  const imageUrls = input.images
    .map((image) => {
      if (image.type === "existing") return image.url;
      const uploadedUrl = uploadedImageUrls[uploadedImageIndex];
      uploadedImageIndex += 1;
      return uploadedUrl;
    })
    .filter(Boolean);

  const { data, error } = await client
    .from("places")
    .update({
      name: input.name,
      type: input.type,
      category: input.category,
      plan_type: input.planType,
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
      plan_type,
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

  try {
    const availableAmenities = input.amenities.filter(
      (amenity) => amenity.isAvailable,
    );
    const { error: deleteAmenitiesError } = await client
      .from("place_amenities")
      .delete()
      .eq("place_id", input.id);

    if (deleteAmenitiesError) throw deleteAmenitiesError;

    if (availableAmenities.length > 0) {
      const { error: amenitiesError } = await client
        .from("place_amenities")
        .insert(
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

    const { error: deleteSpacesError } = await client
      .from("place_spaces")
      .delete()
      .eq("place_id", input.id);
    if (deleteSpacesError) throw deleteSpacesError;
    const spaces = await savePlaceSpaces(input.id, input.spaces);

    const updatedPlace = {
      ...toAppPlace({ ...(data as PlaceRow), place_amenities: [] }),
      amenities: availableAmenities,
      spaces,
    };

    clearPlacesCache();

    return updatedPlace;
  } catch {
    clearPlacesCache();
    throw new Error(
      "No se pudo completar la ficha. Algunos cambios pudieron guardarse; vuelve al listado y recarga el lugar antes de editarlo de nuevo.",
    );
  }
}

export async function deletePlace(placeId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("places")
    .update({ status: "inactive" })
    .eq("id", placeId)
    .select("id")
    .single();

  if (error) throw error;
  clearPlacesCache();
}
