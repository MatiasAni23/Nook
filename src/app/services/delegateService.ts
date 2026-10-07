import { supabase } from "../lib/supabase";
import { getSharedProfiles } from "./sharedProfileService";
import { listCurrentDelegatePlaces, type DelegateAssignedPlace } from "./adminManagementService";
import { getCurrentUserProfile, clearCurrentUserServiceCaches, type CurrentUserProfile } from "./currentUserService";

export type DelegateReservationStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";

export interface DelegateReservation {
  id: string;
  userId: string;
  userName: string;
  placeId: string;
  placeName: string;
  dates: Date[];
  status: DelegateReservationStatus;
  createdAt: Date;
  totalAmount: number;
  paymentMethod: string;
  startTime: string;
  endTime: string;
}

export interface DelegateDashboardData {
  profile: CurrentUserProfile | null;
  places: DelegateAssignedPlace[];
  reservations: DelegateReservation[];
  subscriptionActive: boolean;
}

function requireSupabase() {
  if (!supabase) {
    throw new Error("Faltan variables de Supabase en .env.");
  }

  return supabase;
}

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : new Date();
}

function toReservationDates(value: unknown): Date[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((date) => (typeof date === "string" ? new Date(`${date}T00:00:00`) : null))
    .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()));
}

function normalizePaymentMethod(value: string | null | undefined, amount: number) {
  if (amount === 0) return "Gratis";
  if (!value) return "No informado";
  return value;
}

function getRelatedSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export async function getCurrentDelegateSubscription(_options?: { forceRefresh?: boolean }) {
  const client = requireSupabase();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!auth.user) throw new Error("No hay un usuario autenticado.");
  const { data, error } = await client.from("delegates").select("subscription_active, status, users:user_id(role, status)")
    .eq("user_id", auth.user.id).maybeSingle();
  if (error) throw error;
  const account = getRelatedSingle(data?.users);
  return data?.status === "active" && account?.role === "delegate" &&
    ["active", "verified"].includes(account.status) && Boolean(data.subscription_active);
}

async function fetchCurrentDelegateReservations(): Promise<{ userId: string; reservations: DelegateReservation[] }> {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("No hay un usuario autenticado.");

  const places = await listCurrentDelegatePlaces();
  const placeIds = places.map((place) => place.id);

  if (placeIds.length === 0) {
    return { userId: userData.user.id, reservations: [] };
  }

  const { data, error } = await client
    .from("reservations")
    .select(
      `
      id,
      user_id,
      place_id,
      reservation_dates,
      start_time,
      end_time,
      status,
      total_amount,
      payment_method,
      created_at,
      places:place_id(name)
    `,
    )
    .in("place_id", placeIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const sharedProfiles = await getSharedProfiles({ ids: (data ?? []).map((row) => String(row.user_id)) });
  const userNames = new Map(sharedProfiles.map((profile) => [profile.id, profile.name]));
  const reservations = (data ?? []).map((row) => {
    const amount = Number(row.total_amount ?? 0);
    const place = getRelatedSingle(row.places);

    return {
      id: String(row.id),
      userId: String(row.user_id),
      userName: userNames.get(String(row.user_id)) ?? "Usuario",
      placeId: String(row.place_id),
      placeName: String(place?.name ?? "Lugar"),
      dates: toReservationDates(row.reservation_dates),
      status: (row.status ?? "pending") as DelegateReservationStatus,
      createdAt: toDate(row.created_at),
      totalAmount: amount,
      paymentMethod: normalizePaymentMethod(row.payment_method, amount),
      startTime: String(row.start_time ?? ""),
      endTime: String(row.end_time ?? ""),
    };
  });

  return { userId: userData.user.id, reservations };
}

export async function listCurrentDelegateReservations(_options?: { forceRefresh?: boolean }) {
  return (await fetchCurrentDelegateReservations()).reservations;
}

export async function getCurrentDelegateDashboard(options?: { forceRefresh?: boolean }): Promise<DelegateDashboardData> {
  const [profile, places, reservations, subscriptionActive] = await Promise.all([
    getCurrentUserProfile({ forceRefresh: true }), listCurrentDelegatePlaces(options),
    listCurrentDelegateReservations(options), getCurrentDelegateSubscription(options),
  ]);
  if (!profile) throw new Error("No hay un usuario autenticado.");
  return { profile, places, reservations, subscriptionActive };
}

export async function getFreshCurrentDelegateDashboard() {
  return getCurrentDelegateDashboard({ forceRefresh: true });
}

export async function updateDelegateReservationStatus(
  reservationId: string,
  status: Extract<DelegateReservationStatus, "confirmed" | "rejected" | "cancelled" | "completed">,
) {
  const { error } = await requireSupabase().rpc("transition_delegate_reservation", {
    target_reservation_id: reservationId, next_status: status,
  });
  if (error) throw error;
}

export async function updateCurrentDelegateProfile(input: { name: string; phone: string }) {
  if (!input.name.trim()) throw new Error("El nombre no puede quedar vacio.");
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("No hay un usuario autenticado.");

  const { error } = await client
    .from("users")
    .update({
      name: input.name.trim(),
      phone: input.phone.trim() || null,
    })
    .eq("id", userData.user.id).select("id").single();

  if (error) throw error;

  clearCurrentUserServiceCaches();
}

export function clearDelegateServiceCache() {
  // Retained for the shared sign-out cleanup API; delegate records are read fresh.
}
