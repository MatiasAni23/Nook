import { supabase } from "../lib/supabase";

export type ManagedUserRole = "student" | "worker";
export type ManagedUserStatus = "active" | "verified" | "suspended" | "blocked" | "pending";
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
  placesCount: number;
  assignedPlaces: string[];
  joinedDate: Date;
  lastActive: Date;
}

export interface DelegateAssignedPlace {
  id: string;
  name: string;
  type: string;
  category: "study" | "work";
  rating: number;
  reviews: number;
  hours: string;
  wifi: boolean;
  outlets: boolean;
  address: string;
  reservationsCount: number;
}

export interface SaveDelegateInput {
  id?: string;
  name: string;
  email: string;
  phone: string;
  status?: DelegateStatus;
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

let managedUsersCache: { timestamp: number; users: ManagedUser[] } | null = null;
let managedUsersRequest: Promise<ManagedUser[]> | null = null;
let managedDelegatesCache: { timestamp: number; delegates: ManagedDelegate[] } | null = null;
let managedDelegatesRequest: Promise<ManagedDelegate[]> | null = null;
let managedPlaceOptionsCache: { timestamp: number; places: ManagedPlaceOption[] } | null = null;
let managedPlaceOptionsRequest: Promise<ManagedPlaceOption[]> | null = null;
let currentDelegatePlacesCache: { timestamp: number; userId: string; places: DelegateAssignedPlace[] } | null = null;
let currentDelegatePlacesRequest: Promise<DelegateAssignedPlace[]> | null = null;
let delegateInvitationCache = new Map<string, { timestamp: number; invitation: DelegateInvitation }>();

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

function cacheManagedUsers(users: ManagedUser[]) {
  managedUsersCache = { timestamp: Date.now(), users };
}

function cacheManagedDelegates(delegates: ManagedDelegate[]) {
  managedDelegatesCache = { timestamp: Date.now(), delegates };
}

function cacheManagedPlaceOptions(places: ManagedPlaceOption[]) {
  managedPlaceOptionsCache = { timestamp: Date.now(), places };
}

export function clearAdminManagementCache() {
  managedUsersCache = null;
  managedUsersRequest = null;
  managedDelegatesCache = null;
  managedDelegatesRequest = null;
  managedPlaceOptionsCache = null;
  managedPlaceOptionsRequest = null;
  currentDelegatePlacesCache = null;
  currentDelegatePlacesRequest = null;
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

  const [profilesResult, statsResult] = await Promise.allSettled([
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

  const profiles =
    profilesResult.status === "fulfilled" && !profilesResult.value.error
      ? profilesResult.value.data ?? []
      : [];
  const stats =
    statsResult.status === "fulfilled" && !statsResult.value.error
      ? statsResult.value.data ?? []
      : [];

  const profileByUserId = new Map(profiles.map((profile) => [String(profile.user_id), profile]));
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

export async function listManagedUsers(options?: { forceRefresh?: boolean }): Promise<ManagedUser[]> {
  if (!options?.forceRefresh && managedUsersCache && isFresh(managedUsersCache.timestamp)) {
    return managedUsersCache.users;
  }

  if (!options?.forceRefresh && managedUsersRequest) {
    return managedUsersRequest;
  }

  managedUsersRequest = fetchManagedUsers()
    .then((users) => {
      cacheManagedUsers(users);
      return users;
    })
    .finally(() => {
      managedUsersRequest = null;
    });

  return managedUsersRequest;
}

export async function updateManagedUserStatus(userId: string, status: ManagedUserStatus) {
  const client = requireSupabase();
  const { error } = await client.from("users").update({ status }).eq("id", userId);
  if (error) throw error;

  if (managedUsersCache) {
    cacheManagedUsers(
      managedUsersCache.users.map((user) => (user.id === userId ? { ...user, status } : user)),
    );
  }
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

export async function listManagedPlaceOptions(options?: { forceRefresh?: boolean }): Promise<ManagedPlaceOption[]> {
  if (!options?.forceRefresh && managedPlaceOptionsCache && isFresh(managedPlaceOptionsCache.timestamp)) {
    return managedPlaceOptionsCache.places;
  }

  if (!options?.forceRefresh && managedPlaceOptionsRequest) {
    return managedPlaceOptionsRequest;
  }

  managedPlaceOptionsRequest = fetchManagedPlaceOptions()
    .then((places) => {
      cacheManagedPlaceOptions(places);
      return places;
    })
    .finally(() => {
      managedPlaceOptionsRequest = null;
    });

  return managedPlaceOptionsRequest;
}

async function fetchManagedDelegates(): Promise<ManagedDelegate[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("delegates_with_places")
    .select("id, user_id, name, email, phone, status, places_count, assigned_place_ids, joined_date, last_active")
    .order("joined_date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((delegate) => ({
    id: String(delegate.id),
    userId: String(delegate.user_id),
    name: String(delegate.name ?? "Sin nombre"),
    email: String(delegate.email ?? ""),
    phone: delegate.phone ?? null,
    status: (delegate.status ?? "pending") as DelegateStatus,
    placesCount: Number(delegate.places_count ?? 0),
    assignedPlaces: toStringArray(delegate.assigned_place_ids),
    joinedDate: toDate(delegate.joined_date),
    lastActive: toDate(delegate.last_active),
  }));
}

export async function listManagedDelegates(options?: { forceRefresh?: boolean }): Promise<ManagedDelegate[]> {
  if (!options?.forceRefresh && managedDelegatesCache && isFresh(managedDelegatesCache.timestamp)) {
    return managedDelegatesCache.delegates;
  }

  if (!options?.forceRefresh && managedDelegatesRequest) {
    return managedDelegatesRequest;
  }

  managedDelegatesRequest = fetchManagedDelegates()
    .then((delegates) => {
      cacheManagedDelegates(delegates);
      return delegates;
    })
    .finally(() => {
      managedDelegatesRequest = null;
    });

  return managedDelegatesRequest;
}

export async function saveManagedDelegate(input: SaveDelegateInput): Promise<ManagedDelegate> {
  const client = requireSupabase();
  const normalizedEmail = input.email.trim().toLowerCase();

  const { data: user, error: userLookupError } = await client
    .from("users")
    .select("id, email, name, phone")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  if (userLookupError) throw userLookupError;
  if (!user) {
    throw new Error("No existe un usuario registrado con ese email. Primero debe crear su cuenta en la app.");
  }

  const { error: userUpdateError } = await client
    .from("users")
    .update({
      name: input.name.trim(),
      phone: input.phone.trim() || null,
      role: "delegate",
      status: input.status === "suspended" ? "suspended" : "active",
    })
    .eq("id", user.id);

  if (userUpdateError) throw userUpdateError;

  const delegatePayload = {
    user_id: user.id,
    status: input.status ?? "pending",
    last_active: new Date().toISOString(),
  };

  const { data: delegate, error: delegateError } = await client
    .from("delegates")
    .upsert(input.id ? { id: input.id, ...delegatePayload } : delegatePayload, { onConflict: "user_id" })
    .select("id, user_id, status, joined_date, last_active")
    .single();

  if (delegateError) throw delegateError;

  const { error: deleteAssignmentsError } = await client
    .from("delegate_places")
    .delete()
    .eq("delegate_id", delegate.id);

  if (deleteAssignmentsError) throw deleteAssignmentsError;

  const uniquePlaceIds = Array.from(new Set(input.assignedPlaces));
  if (uniquePlaceIds.length > 0) {
    const { error: insertAssignmentsError } = await client.from("delegate_places").insert(
      uniquePlaceIds.map((placeId) => ({
        delegate_id: delegate.id,
        place_id: placeId,
      })),
    );

    if (insertAssignmentsError) throw insertAssignmentsError;
  }

  const savedDelegate = {
    id: String(delegate.id),
    userId: String(delegate.user_id),
    name: input.name.trim(),
    email: normalizedEmail,
    phone: input.phone.trim() || null,
    status: (delegate.status ?? "pending") as DelegateStatus,
    placesCount: uniquePlaceIds.length,
    assignedPlaces: uniquePlaceIds,
    joinedDate: toDate(delegate.joined_date),
    lastActive: toDate(delegate.last_active),
  };

  if (managedDelegatesCache) {
    const exists = managedDelegatesCache.delegates.some((currentDelegate) => currentDelegate.id === savedDelegate.id);
    cacheManagedDelegates(
      exists
        ? managedDelegatesCache.delegates.map((currentDelegate) =>
            currentDelegate.id === savedDelegate.id ? savedDelegate : currentDelegate,
          )
        : [savedDelegate, ...managedDelegatesCache.delegates],
    );
  }

  if (managedUsersCache) {
    cacheManagedUsers(managedUsersCache.users.filter((userRow) => userRow.id !== savedDelegate.userId));
  }

  currentDelegatePlacesCache = null;
  return savedDelegate;
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
  const fallback = error instanceof Error ? error.message : "No se pudo invocar la Edge Function.";
  const context = (error as { context?: unknown } | null)?.context;

  if (context instanceof Response) {
    try {
      const payload = await context.clone().json();
      const message = typeof payload.message === "string" ? payload.message : null;
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

export async function createDelegateInvitation(input: CreateDelegateInvitationInput): Promise<CreateDelegateInvitationResult> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("No hay un usuario administrador autenticado.");

  const token = crypto.randomUUID();
  const normalizedEmail = input.email.trim().toLowerCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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
    .select("id, token, email, name, phone, status, assigned_place_ids, expires_at, created_at")
    .single();

  if (error) throw error;

  const invitation = toDelegateInvitation(data);
  const inviteUrl = `${window.location.origin}/delegate-invite?token=${encodeURIComponent(token)}`;
  delegateInvitationCache.set(token, { timestamp: Date.now(), invitation });

  let emailSent = false;
  let emailError: string | null = null;

  const { error: functionError } = await client.functions.invoke("send-delegate-invitation", {
    body: {
      invitationId: invitation.id,
      email: invitation.email,
      name: invitation.name,
      phone: invitation.phone,
      inviteUrl,
    },
  });

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

export async function getDelegateInvitationByToken(token: string): Promise<DelegateInvitation | null> {
  const cached = delegateInvitationCache.get(token);
  if (cached && isFresh(cached.timestamp)) {
    return cached.invitation;
  }

  const client = requireSupabase();
  const { data, error } = await client.rpc("get_delegate_invitation", { invitation_token: token });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;

  const invitation = toDelegateInvitation(row);
  delegateInvitationCache.set(token, { timestamp: Date.now(), invitation });
  return invitation;
}

export async function claimDelegateInvitation(token: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("claim_delegate_invitation", { invitation_token: token });
  if (error) throw error;

  clearAdminManagementCache();
}

export async function updateManagedDelegateStatus(delegate: ManagedDelegate, status: DelegateStatus) {
  const client = requireSupabase();
  const { error: delegateError } = await client
    .from("delegates")
    .update({ status, last_active: new Date().toISOString() })
    .eq("id", delegate.id);

  if (delegateError) throw delegateError;

  const { error: userError } = await client
    .from("users")
    .update({ status: status === "suspended" ? "suspended" : "active" })
    .eq("id", delegate.userId);

  if (userError) throw userError;

  if (managedDelegatesCache) {
    cacheManagedDelegates(
      managedDelegatesCache.delegates.map((currentDelegate) =>
        currentDelegate.id === delegate.id
          ? { ...currentDelegate, status, lastActive: new Date() }
          : currentDelegate,
      ),
    );
  }
}

export async function deleteManagedDelegate(delegate: ManagedDelegate) {
  const client = requireSupabase();
  const { error: delegateError } = await client.from("delegates").delete().eq("id", delegate.id);
  if (delegateError) throw delegateError;

  const { error: userError } = await client
    .from("users")
    .update({ role: "worker", status: "active" })
    .eq("id", delegate.userId);

  if (userError) throw userError;

  if (managedDelegatesCache) {
    cacheManagedDelegates(managedDelegatesCache.delegates.filter((currentDelegate) => currentDelegate.id !== delegate.id));
  }

  managedUsersCache = null;
  currentDelegatePlacesCache = null;
}

async function fetchCurrentDelegatePlaces(): Promise<{ userId: string; places: DelegateAssignedPlace[] }> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("No hay un usuario autenticado.");
  const userId = userData.user.id;

  const { data: delegate, error: delegateError } = await client
    .from("delegates")
    .select("id")
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
        rating,
        reviews_count,
        hours,
        wifi,
        outlets,
        address,
        reservations(id)
      )
    `,
    )
    .eq("delegate_id", delegate.id);

  if (error) throw error;

  const places = (data ?? [])
    .map((assignment) => {
      const place = Array.isArray(assignment.places) ? assignment.places[0] : assignment.places;
      if (!place) return null;

      return {
        id: String(place.id),
        name: String(place.name ?? ""),
        type: String(place.type ?? "library"),
        category: place.category === "work" ? "work" : "study",
        rating: Number(place.rating ?? 0),
        reviews: Number(place.reviews_count ?? 0),
        hours: String(place.hours ?? "Horario no informado"),
        wifi: Boolean(place.wifi),
        outlets: Boolean(place.outlets),
        address: String(place.address ?? ""),
        reservationsCount: Array.isArray(place.reservations) ? place.reservations.length : 0,
      };
    })
    .filter((place): place is DelegateAssignedPlace => Boolean(place));

  return { userId, places };
}

export async function listCurrentDelegatePlaces(options?: { forceRefresh?: boolean }): Promise<DelegateAssignedPlace[]> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("No hay un usuario autenticado.");

  if (
    !options?.forceRefresh &&
    currentDelegatePlacesCache &&
    currentDelegatePlacesCache.userId === userData.user.id &&
    isFresh(currentDelegatePlacesCache.timestamp)
  ) {
    return currentDelegatePlacesCache.places;
  }

  if (!options?.forceRefresh && currentDelegatePlacesRequest) {
    return currentDelegatePlacesRequest;
  }

  currentDelegatePlacesRequest = fetchCurrentDelegatePlaces()
    .then(({ userId, places }) => {
      currentDelegatePlacesCache = { timestamp: Date.now(), userId, places };
      return places;
    })
    .finally(() => {
      currentDelegatePlacesRequest = null;
    });

  return currentDelegatePlacesRequest;
}
