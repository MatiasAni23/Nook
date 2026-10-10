import { createAdminDataCache, clearAdminDataCaches } from "./adminDataCache";
import type { AppPlace } from "./placeService";
import { clearCurrentUserServiceCaches } from "./currentUserService";
import { supabase } from "../lib/supabase";

export type ManagedUserRole = "student" | "worker";
export type ManagedUserStatus =
  | "active"
  | "verified"
  | "suspended"
  | "blocked"
  | "pending";
export type DelegateStatus = "active" | "suspended" | "pending";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  registeredDate: Date;
  reservationsCount: number;
  reportsCount: number;
  university: string | null;
  company: string | null;
}

export interface ManagedPlaceOption {
  id: string;
  name: string;
  category: "study" | "work";
  address: string;
  status: string;
}

export interface ManagedDelegate {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  status: DelegateStatus;
  subscriptionActive: boolean;
  placesCount: number;
  assignedPlaces: string[];
  joinedDate: Date;
  lastActive: Date;
}

export interface DelegateAssignedPlace extends AppPlace {
  reservationsCount: number;
}

export interface SaveDelegateInput {
  id?: string;
  name: string;
  email: string;
  phone: string;
  status?: DelegateStatus;
  subscriptionActive?: boolean;
  assignedPlaces: string[];
}

export interface DelegateInvitation {
  id: string;
  token: string;
  email: string;
  name: string;
  phone: string | null;
  status: "pending" | "accepted" | "expired" | "revoked";
  assignedPlaces: string[];
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateDelegateInvitationResult {
  invitation: DelegateInvitation;
  inviteUrl: string;
  emailSent: boolean;
  emailError: string | null;
}

export interface CreateDelegateInvitationInput {
  name: string;
  email: string;
  phone: string;
  assignedPlaces: string[];
}

const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000;

const managedUsersCache = createAdminDataCache<ManagedUser[]>();
const managedDelegatesCache = createAdminDataCache<ManagedDelegate[]>();
const managedPlaceOptionsCache = createAdminDataCache<ManagedPlaceOption[]>();
let delegateInvitationCache = new Map<
  string,
  { timestamp: number; invitation: DelegateInvitation }
>();

function requireSupabase() {
  if (!supabase) {
    throw new Error("Faltan variables de Supabase en .env.");
  }

  return supabase;
}

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : new Date();
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function isFresh(timestamp: number) {
  return Date.now() - timestamp < ADMIN_CACHE_TTL_MS;
}

export const getCachedManagedUsers = managedUsersCache.peek;
export const getCachedManagedDelegates = managedDelegatesCache.peek;
export const getCachedManagedPlaceOptions = managedPlaceOptionsCache.peek;
export const getManagedUsersCacheRemaining = managedUsersCache.remaining;
export const getManagedDelegatesCacheRemaining = () =>
  Math.min(
    managedDelegatesCache.remaining(),
    managedPlaceOptionsCache.remaining(),
  );
export function clearAdminManagementCache() {
  clearAdminDataCaches();
  delegateInvitationCache = new Map();
}

async function fetchManagedUsers(): Promise<ManagedUser[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("users")
    .select("id, email, name, phone, role, status, created_at")
    .in("role", ["student", "worker"])
    .order("created_at", { ascending: false });

  if (error) throw error;

  const userIds = (data ?? []).map((row) => String(row.id));

  if (userIds.length === 0) return [];
  const [profilesResult, statsResult] = await Promise.all([
    userIds.length > 0
      ? client
          .from("user_profiles")
          .select("user_id, university, company")
          .in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    client
      .from("users_with_stats")
      .select("id, total_reservations, total_reports")
      .in("id", userIds),
  ]);

  if (profilesResult.error) throw profilesResult.error;
  if (statsResult.error) throw statsResult.error;
  const profiles = profilesResult.data ?? [];
  const stats = statsResult.data ?? [];

  const profileByUserId = new Map(
    profiles.map((profile) => [String(profile.user_id), profile]),
  );
  const statsByUserId = new Map(stats.map((stat) => [String(stat.id), stat]));

  return (data ?? []).map((row) => {
    const profile = profileByUserId.get(String(row.id));
    const userStats = statsByUserId.get(String(row.id));
    return {
      id: String(row.id),
      name: String(row.name ?? "Sin nombre"),
      email: String(row.email ?? ""),
      phone: row.phone ?? null,
      role: (row.role ?? "student") as ManagedUserRole,
      status: (row.status ?? "active") as ManagedUserStatus,
      registeredDate: toDate(row.created_at),
      reservationsCount: Number(userStats?.total_reservations ?? 0),
      reportsCount: Number(userStats?.total_reports ?? 0),
      university: profile?.university ?? null,
      company: profile?.company ?? null,
    };
  });
}

export async function listManagedUsers(options?: {
  forceRefresh?: boolean;
}): Promise<ManagedUser[]> {
  return managedUsersCache.read(fetchManagedUsers, options);
}

export async function updateManagedUserStatus(
  userId: string,
  status: ManagedUserStatus,
) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("users")
    .update({ status })
    .eq("id", userId)
    .select("id, status")
    .single();
  if (error) throw error;
  if (!data || data.id !== userId || data.status !== status)
    throw new Error(
      "El servidor no confirmó el cambio de estado. Recarga la lista antes de intentarlo de nuevo.",
    );

  clearAdminDataCaches();
}

async function fetchManagedPlaceOptions(): Promise<ManagedPlaceOption[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("places")
    .select("id, name, category, address, status")
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((place) => ({
    id: String(place.id),
    name: String(place.name ?? ""),
    category: place.category === "work" ? "work" : "study",
    address: String(place.address ?? ""),
    status: String(place.status ?? "active"),
  }));
}

export async function listManagedPlaceOptions(options?: {
  forceRefresh?: boolean;
}): Promise<ManagedPlaceOption[]> {
  return managedPlaceOptionsCache.read(fetchManagedPlaceOptions, options);
}

async function fetchManagedDelegates(): Promise<ManagedDelegate[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("delegates_with_places")
    .select(
      "id, user_id, name, email, phone, status, subscription_active, places_count, assigned_place_ids, joined_date, last_active",
    )
    .order("joined_date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((delegate) => ({
    id: String(delegate.id),
    userId: String(delegate.user_id),
    name: String(delegate.name ?? "Sin nombre"),
    email: String(delegate.email ?? ""),
    phone: delegate.phone ?? null,
    status: (delegate.status ?? "pending") as DelegateStatus,
    subscriptionActive: Boolean(delegate.subscription_active),
    placesCount: Number(delegate.places_count ?? 0),
    assignedPlaces: toStringArray(delegate.assigned_place_ids),
    joinedDate: toDate(delegate.joined_date),
    lastActive: toDate(delegate.last_active),
  }));
}

export async function listManagedDelegates(options?: {
  forceRefresh?: boolean;
}): Promise<ManagedDelegate[]> {
  return managedDelegatesCache.read(fetchManagedDelegates, options);
}

export async function saveManagedDelegate(
  input: SaveDelegateInput,
): Promise<ManagedDelegate> {
  const { data: id, error } = await requireSupabase().rpc(
    "save_managed_delegate",
    {
      target_delegate_id: input.id ?? null,
      delegate_email: input.email.trim().toLowerCase(),
      delegate_name: input.name.trim(),
      delegate_phone: input.phone.trim(),
      delegate_status: input.status ?? "pending",
      delegate_subscription_active: Boolean(input.subscriptionActive),
      assigned_place_ids: Array.from(new Set(input.assignedPlaces)),
    },
  );
  if (error) throw error;
  clearAdminManagementCache();
  const saved = (await listManagedDelegates({ forceRefresh: true })).find(
    (delegate) => delegate.id === id,
  );
  if (!saved)
    throw new Error(
      "El delegado se guardo, pero no se pudo recargar. Actualiza la lista.",
    );
  return saved;
}

function toDelegateInvitation(row: Record<string, any>): DelegateInvitation {
  return {
    id: String(row.id),
    token: String(row.token),
    email: String(row.email ?? ""),
    name: String(row.name ?? ""),
    phone: row.phone ?? null,
    status: row.status ?? "pending",
    assignedPlaces: toStringArray(row.assigned_place_ids),
    expiresAt: toDate(row.expires_at),
    createdAt: toDate(row.created_at),
  };
}

async function getFunctionErrorMessage(error: unknown) {
  const fallback =
    error instanceof Error
      ? error.message
      : "No se pudo invocar la Edge Function.";
  const context = (error as { context?: unknown } | null)?.context;

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      const message =
        typeof payload.message === "string" ? payload.message : null;
      const code = typeof payload.error === "string" ? payload.error : null;
      if (message && code) return `${code}: ${message}`;
      if (message) return message;
      if (code) return code;
    } catch {
      try {
        const text = await context.clone().text();
        if (text) return text;
      } catch {
        return fallback;
      }
    }
  }

  return fallback;
}

export async function createDelegateInvitation(
  input: CreateDelegateInvitationInput,
): Promise<CreateDelegateInvitationResult> {
  const client = requireSupabase();
  const normalizedEmail = input.email.trim().toLowerCase();
  if (
    !input.name.trim() ||
    !input.phone.trim() ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
  ) {
    throw new Error(
      "Completa nombre, teléfono y un correo válido antes de crear la invitación.",
    );
  }
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user)
    throw new Error("No hay un usuario administrador autenticado.");

  const token = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await client
    .from("delegate_invitations")
    .insert({
      token,
      email: normalizedEmail,
      name: input.name.trim(),
      phone: input.phone.trim() || null,
      status: "pending",
      assigned_place_ids: Array.from(new Set(input.assignedPlaces)),
      invited_by: userData.user.id,
      expires_at: expiresAt,
    })
    .select(
      "id, token, email, name, phone, status, assigned_place_ids, expires_at, created_at",
    )
    .single();

  if (error) throw error;

  const invitation = toDelegateInvitation(data);
  const inviteUrl = `${window.location.origin}/delegate-invite?token=${encodeURIComponent(token)}`;
  delegateInvitationCache.set(token, { timestamp: Date.now(), invitation });

  let emailSent = false;
  let emailError: string | null = null;

  const { error: functionError } = await client.functions.invoke(
    "send-delegate-invitation",
    {
      body: {
        invitationId: invitation.id,
        email: invitation.email,
        name: invitation.name,
        phone: invitation.phone,
        inviteUrl,
      },
    },
  );

  if (functionError) {
    const functionMessage = await getFunctionErrorMessage(functionError);
    emailError =
      functionMessage === "Failed to send a request to the Edge Function"
        ? "No se pudo invocar la Edge Function. Verifica que send-delegate-invitation este desplegada y con CORS/JWT configurado."
        : functionMessage;
  } else {
    emailSent = true;
  }

  return {
    invitation,
    inviteUrl,
    emailSent,
    emailError,
  };
}

export async function getDelegateInvitationByToken(
  token: string,
): Promise<DelegateInvitation | null> {
  const cached = delegateInvitationCache.get(token);
  if (cached && isFresh(cached.timestamp)) {
    return cached.invitation;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("get_delegate_invitation", {
    invitation_token: token,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  const invitation = toDelegateInvitation(row);
  delegateInvitationCache.set(token, { timestamp: Date.now(), invitation });
  return invitation;
}

export async function claimDelegateInvitation(token: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("claim_delegate_invitation", {
    invitation_token: token,
  });
  if (error) throw error;

  clearAdminManagementCache();
  clearCurrentUserServiceCaches();
}

export async function updateManagedDelegateStatus(
  delegate: ManagedDelegate,
  status: DelegateStatus,
) {
  const { error } = await requireSupabase().rpc("set_managed_delegate_status", {
    target_delegate_id: delegate.id,
    next_status: status,
  });
  if (error) throw error;
  clearAdminManagementCache();
}

export async function updateManagedDelegateSubscription(
  delegate: ManagedDelegate,
  subscriptionActive: boolean,
) {
  const { error } = await requireSupabase().rpc(
    "set_managed_delegate_subscription",
    {
      target_delegate_id: delegate.id,
      subscription_active: subscriptionActive,
    },
  );
  if (error) throw error;
  clearAdminManagementCache();
}

export async function deleteManagedDelegate(delegate: ManagedDelegate) {
  const { error } = await requireSupabase().rpc("delete_managed_delegate", {
    target_delegate_id: delegate.id,
  });
  if (error) throw error;
  clearAdminManagementCache();
}

async function fetchCurrentDelegatePlaces(): Promise<{
  userId: string;
  places: DelegateAssignedPlace[];
}> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("No hay un usuario autenticado.");
  const userId = userData.user.id;

  const { data: delegate, error: delegateError } = await client
    .from("delegates")
    .select("id")
    .eq("status", "active")
    .eq("user_id", userId)
    .maybeSingle();

  if (delegateError) throw delegateError;
  if (!delegate) return { userId, places: [] };

  const { data, error } = await client
    .from("delegate_places")
    .select(
      `
      places:place_id(
        id,
        name,
        type,
        category,
        plan_type,
        description,
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
        address,
        images,
        reservations(id),
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
      )
    `,
    )
    .eq("delegate_id", delegate.id);

  if (error) throw error;

  const places = (data ?? [])
    .map((assignment): DelegateAssignedPlace | null => {
      const place = Array.isArray(assignment.places)
        ? assignment.places[0]
        : assignment.places;
      if (!place) return null;

      return {
        id: String(place.id),
        name: String(place.name ?? ""),
        type: (place.type ?? "library") as AppPlace["type"],
        openNow: false,
        category: place.category === "work" ? "work" : "study",
        planType: (place.plan_type ??
          "basic") as DelegateAssignedPlace["planType"],
        description: String(place.description ?? ""),
        lat: Number(place.latitude ?? 0),
        lng: Number(place.longitude ?? 0),
        zone: place.zone == null ? null : String(place.zone),
        rating: Number(place.rating ?? 0),
        reviews: Number(place.reviews_count ?? 0),
        hours: String(place.hours ?? "Horario no informado"),
        pricePerHour:
          place.price_per_hour == null
            ? undefined
            : Number(place.price_per_hour),
        websiteUrl:
          place.website_url == null ? null : String(place.website_url),
        capacityMin:
          place.capacity_min == null ? null : Number(place.capacity_min),
        capacityMax:
          place.capacity_max == null ? null : Number(place.capacity_max),
        wifi: Boolean(place.wifi),
        outlets: Boolean(place.outlets),
        parking: Boolean(place.parking),
        quietness:
          place.quietness_level == null ? null : Number(place.quietness_level),
        lighting:
          place.lighting_level == null ? null : Number(place.lighting_level),
        address: String(place.address ?? ""),
        images: Array.isArray(place.images) ? place.images : [],
        amenities: (place.place_amenities ?? []).map((amenity) => ({
          key: String(amenity.amenity_key),
          name: String(amenity.amenity_name),
          isAvailable: Boolean(amenity.is_available),
          additionalInfo:
            amenity.additional_info == null
              ? null
              : String(amenity.additional_info),
        })),
        spaces: (place.place_spaces ?? []).map((space) => ({
          id: String(space.id),
          name: String(space.name ?? ""),
          capacity: Number(space.capacity ?? 0),
          pricePerHour: Number(space.price_per_hour ?? 0),
          billingUnit: (space.billing_unit ??
            "hour") as AppPlace["spaces"][number]["billingUnit"],
          imageUrl: String(space.image_url ?? ""),
        })),
        reservationsCount: Array.isArray(place.reservations)
          ? place.reservations.length
          : 0,
      };
    })
    .filter((place): place is DelegateAssignedPlace => Boolean(place));

  return { userId, places };
}

export async function listCurrentDelegatePlaces(_options?: {
  forceRefresh?: boolean;
}): Promise<DelegateAssignedPlace[]> {
  // Assignments may change in another session; always consult current permissions.
  return (await fetchCurrentDelegatePlaces()).places;
}
