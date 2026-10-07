import { supabase } from "../lib/supabase";
import { getSharedProfiles } from "./sharedProfileService";

const PROFILE_IMAGES_BUCKET = "profile-images";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CurrentUserProfile {
  id: string;
  email: string;
  name: string;
  role: "student" | "worker" | "admin" | "delegate";
  phone?: string | null;
  status?: string;
  delegateStatus?: string | null;
  profile: {
    study_profile_visible?: boolean;
    university?: string | null;
    region_id?: string | null;
    institution_id?: string | null;
    city_id?: string | null;
    career?: string | null;
    subjects?: string[] | null;
    company?: string | null;
    position?: string | null;
    is_independent?: boolean | null;
    industry?: string | null;
    bio?: string | null;
    profile_image_url?: string | null;
    regions?: {
      name: string | null;
      code: string | null;
    } | null;
    institutions?: {
      name: string | null;
      type: string | null;
    } | null;
    cities?: {
      name: string | null;
      regions?: {
        name: string | null;
      } | null;
    } | null;
  } | null;
}

export interface FavoritePlace {
  id: string;
  name: string;
  type: string;
  category: "study" | "work";
  zone?: string | null;
  address: string;
  rating: number;
  wifi: boolean;
  outlets: boolean;
  parking: boolean;
  price_per_hour?: number | null;
  images?: string[] | null;
}

export interface ProfileStats {
  visitedPlaces: number;
  companions: number;
  studiedHours: number;
  reservations: number;
  reservedHours: number;
}

export interface ChatUserProfile {
  career?: string | null;
  subjects?: string[] | null;
  university?: string | null;
  company?: string | null;
  position?: string | null;
  industry?: string | null;
  is_independent?: boolean | null;
  bio?: string | null;
  profile_image_url?: string | null;
}

export interface ChatUser {
  id: string;
  name: string;
  role: "student" | "worker" | "admin" | "delegate" | "support";
  profile: ChatUserProfile | null;
}

let currentUserProfileCache: { timestamp: number; userId: string; profile: CurrentUserProfile | null } | null = null;
let profileCacheGeneration = 0;
const CURRENT_USER_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;
const favoritePlacesCache = new Map<string, { timestamp: number; places: FavoritePlace[] }>();
const favoritePlacesRequests = new Map<string, Promise<FavoritePlace[]>>();
const FAVORITE_PLACES_CACHE_TTL_MS = 5 * 60 * 1000;

export function clearCurrentUserServiceCaches() {
  currentUserProfileCache = null;
  profileCacheGeneration += 1;
  favoritePlacesCache.clear();
  favoritePlacesRequests.clear();
}

function toFavoritePlace(place: unknown): FavoritePlace | null {
  if (!place || typeof place !== "object") return null;

  const value = Array.isArray(place) ? place[0] : place;
  if (!value || typeof value !== "object") return null;

  const rawPlace = value as Record<string, unknown>;

  return {
    id: String(rawPlace.id),
    name: String(rawPlace.name ?? ""),
    type: String(rawPlace.type ?? "library"),
    category: rawPlace.category === "work" ? "work" : "study",
    zone: typeof rawPlace.zone === "string" ? rawPlace.zone : null,
    address: String(rawPlace.address ?? ""),
    rating: Number(rawPlace.rating ?? 0),
    wifi: Boolean(rawPlace.wifi),
    outlets: Boolean(rawPlace.outlets),
    parking: Boolean(rawPlace.parking),
    price_per_hour:
      rawPlace.price_per_hour === null || rawPlace.price_per_hour === undefined
        ? null
        : Number(rawPlace.price_per_hour),
    images: Array.isArray(rawPlace.images) ? (rawPlace.images as string[]) : null,
  };
}

async function fetchCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  if (!supabase) return null;

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    return null;
  }

  const { data: appUser, error: appUserError } = await supabase
    .from("users")
    .select("name, role, status, phone, avatar_url")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (appUserError) throw appUserError;
  if (!appUser) throw new Error("No se encontro el perfil de la cuenta.");
  let delegateStatus: string | null = null;
  if (appUser.role === "delegate") {
    const { data: delegate, error } = await supabase.from("delegates").select("status")
      .eq("user_id", authData.user.id).maybeSingle();
    if (error) throw error;
    delegateStatus = delegate?.status ?? "pending";
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(`
      university,
      region_id,
      institution_id,
      city_id,
      career,
      subjects,
      company,
      position,
      is_independent,
      industry,
      bio,
      profile_image_url,
      study_profile_visible,
      regions:region_id(name, code),
      institutions:institution_id(name, type),
      cities:city_id(name, regions:region_id(name))
    `)
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    id: authData.user.id,
    status: appUser.status,
    delegateStatus,
    email: authData.user.email ?? "",
    name:
      appUser?.name ||
      authData.user.user_metadata.full_name ||
      authData.user.email?.split("@")[0] ||
      "Usuario",
    role: appUser?.role ?? "student",
    phone: appUser?.phone ?? authData.user.user_metadata.phone ?? null,
    profile: profile
      ? {
          ...profile,
          regions: Array.isArray(profile.regions) ? profile.regions[0] ?? null : profile.regions,
          institutions: Array.isArray(profile.institutions) ? profile.institutions[0] ?? null : profile.institutions,
          cities: (() => {
            const city = Array.isArray(profile.cities) ? profile.cities[0] : profile.cities;
            return city ? { ...city, regions: Array.isArray(city.regions) ? city.regions[0] ?? null : city.regions } : null;
          })(),
          profile_image_url: profile.profile_image_url ?? appUser?.avatar_url ?? null,
        }
      : appUser?.avatar_url
        ? { profile_image_url: appUser.avatar_url }
        : null,
  };
}

export async function getCurrentUserProfile(options?: { forceRefresh?: boolean }): Promise<CurrentUserProfile | null> {
  if (!supabase) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = sessionData.session?.user.id;

  if (
    !options?.forceRefresh &&
    sessionUserId &&
    currentUserProfileCache?.userId === sessionUserId &&
    Date.now() - currentUserProfileCache.timestamp < CURRENT_USER_PROFILE_CACHE_TTL_MS
  ) {
    return currentUserProfileCache.profile;
  }

  const generation = profileCacheGeneration;
  const profile = await fetchCurrentUserProfile();
  const { data: latestSession } = await supabase.auth.getSession();
  if (generation !== profileCacheGeneration || latestSession.session?.user.id !== sessionUserId) return null;
  if (profile) currentUserProfileCache = { timestamp: Date.now(), userId: profile.id, profile };
  return profile;
}

export async function updateCurrentUserProfile(input: {
  name: string;
  role: "student" | "worker";
  profileData: Record<string, unknown>;
}) {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) throw new Error("No hay un usuario autenticado.");

  const { error: userError } = await supabase
    .from("users")
    .update({
      name: input.name,
      role: input.role,
      profile_completed: true,
    })
    .eq("id", authData.user.id);

  if (userError) throw userError;

  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: authData.user.id,
        university: input.profileData.university ?? null,
        region_id: input.profileData.regionId ?? null,
        institution_id: input.profileData.institutionId ?? null,
        city_id: input.profileData.cityId ?? null,
        career: input.profileData.career ?? null,
        subjects: input.profileData.subjects ?? null,
        company: input.profileData.company ?? null,
        position: input.profileData.position ?? null,
        is_independent: input.profileData.isIndependent ?? false,
        industry: input.profileData.industry ?? null,
        bio: input.profileData.bio ?? null,
        profile_image_url: input.profileData.profileImageUrl ?? null,
        study_profile_visible: input.role === "student" && input.profileData.studyProfileVisible === true,
      },
      { onConflict: "user_id" },
    );

  if (profileError) throw profileError;

  if (typeof input.profileData.profileImageUrl === "string") {
    const { error: avatarError } = await supabase
      .from("users")
      .update({ avatar_url: input.profileData.profileImageUrl })
      .eq("id", authData.user.id);

    if (avatarError) throw avatarError;
  }

  currentUserProfileCache = null;
}

export async function updateStudyProfileVisibility(visible: boolean) {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!data.user) throw new Error("No hay un usuario autenticado.");
  const { error } = await supabase.from("user_profiles")
    .upsert({ user_id: data.user.id, study_profile_visible: visible }, { onConflict: "user_id" })
    .select("user_id").single();
  if (error) throw error;
  currentUserProfileCache = null;
}

export async function uploadCurrentUserProfileImage(file: File) {
  if (!supabase) throw new Error("Supabase no esta configurado.");

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) throw new Error("No hay un usuario autenticado.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeName = `${Date.now()}.${extension}`;
  const path = `${authData.user.id}/${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);
  const imageUrl = data.publicUrl;

  const { error: profileError } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id: authData.user.id,
        profile_image_url: imageUrl,
      },
      { onConflict: "user_id" },
    );

  if (profileError) throw profileError;

  const { error: userError } = await supabase
    .from("users")
    .update({ avatar_url: imageUrl })
    .eq("id", authData.user.id);

  if (userError) throw userError;

  currentUserProfileCache = null;
  return imageUrl;
}

export async function getCurrentUserProfileStats(): Promise<ProfileStats> {
  return {
    visitedPlaces: 0,
    companions: 0,
    studiedHours: 0,
    reservations: 0,
    reservedHours: 0,
  };
}

export async function getCurrentUserFavoritePlaces(category?: "study" | "work") {
  if (!supabase) return [];

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) return [];

  const cacheKey = `${authData.user.id}:${category ?? "all"}`;
  const cachedPlaces = favoritePlacesCache.get(cacheKey);
  if (cachedPlaces && Date.now() - cachedPlaces.timestamp < FAVORITE_PLACES_CACHE_TTL_MS) {
    return cachedPlaces.places;
  }

  const existingRequest = favoritePlacesRequests.get(cacheKey);
  if (existingRequest) return existingRequest;

  const request = Promise.resolve(supabase
    .from("favorites")
    .select(`
      places:place_id(
        id,
        name,
        type,
        category,
        zone,
        address,
        rating,
        wifi,
        outlets,
        parking,
        price_per_hour,
        images
      )
    `)
    .eq("user_id", authData.user.id)
    .order("created_at", { ascending: false }))
    .then(({ data, error }) => {
      if (error) throw error;

      const places = (data ?? [])
        .map((favorite) => toFavoritePlace((favorite as { places?: unknown }).places))
        .filter((place): place is FavoritePlace => Boolean(place))
        .filter((place) => !category || place.category === category);

      favoritePlacesCache.set(cacheKey, { timestamp: Date.now(), places });
      return places;
    })
    .finally(() => {
      favoritePlacesRequests.delete(cacheKey);
    });

  favoritePlacesRequests.set(cacheKey, request);
  return request;
}

export function getCachedCurrentUserFavoritePlaces(userId?: string, category?: "study" | "work") {
  if (!userId) return null;
  return favoritePlacesCache.get(`${userId}:${category ?? "all"}`)?.places ?? null;
}

export async function getChatUsers(options?: { role?: ChatUser["role"] }): Promise<ChatUser[]> {
  const users = await getSharedProfiles({ studentDirectory: options?.role === "student" });
  return options?.role ? users.filter((user) => user.role === options.role) : users;
}

export async function getIsCurrentUserFavoritePlace(placeId: string) {
  if (!supabase || !UUID_PATTERN.test(placeId)) return false;

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) return false;

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", authData.user.id)
    .eq("place_id", placeId)
    .maybeSingle();

  if (error) throw error;

  return Boolean(data);
}

export async function setCurrentUserFavoritePlace(placeId: string, shouldFavorite: boolean) {
  if (!supabase) throw new Error("Supabase no esta configurado.");
  if (!UUID_PATTERN.test(placeId)) return false;

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!authData.user) throw new Error("No hay un usuario autenticado.");

  if (shouldFavorite) {
    const { error } = await supabase
      .from("favorites")
      .upsert(
        {
          user_id: authData.user.id,
          place_id: placeId,
        },
        { onConflict: "user_id,place_id" },
      );

    if (error) throw error;
    favoritePlacesCache.clear();
    return true;
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", authData.user.id)
    .eq("place_id", placeId);

  if (error) throw error;
  favoritePlacesCache.clear();
  return false;
}

export function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Usuario";
}

export function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";

  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
