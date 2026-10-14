import { supabase } from "../lib/supabase";
import { createAdminDataCache, clearAdminDataCaches } from "./adminDataCache";
import { listCurrentDelegatePlaces, type DelegateAssignedPlace } from "./adminManagementService";
import { getCurrentUserProfile, clearCurrentUserServiceCaches, type CurrentUserProfile } from "./currentUserService";
import { transitionTrialReservation, reservationError } from "./reservationService";

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
  spaceName: string;
  guestsCount: number;
  notes: string;
  isTrial: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface DelegateDashboardData {
  profile: CurrentUserProfile | null;
  places: DelegateAssignedPlace[];
  reservations: DelegateReservation[];
  subscriptionActive: boolean;
}

const reservationsCache = createAdminDataCache<DelegateReservation[]>();
const subscriptionCache = createAdminDataCache<boolean>();
const dashboardCache = createAdminDataCache<DelegateDashboardData>();
const settingsCache = createAdminDataCache<{ profile: CurrentUserProfile; places: DelegateAssignedPlace[] }>();
export const getCachedDelegateReservations = reservationsCache.peek;
export const getCachedDelegateDashboard = dashboardCache.peek;
export const getCachedDelegateSettings = settingsCache.peek;
export function getCurrentDelegateSettings(options?: { forceRefresh?: boolean }) {
  return settingsCache.read(async () => {
    const [profile, places] = await Promise.all([getCurrentUserProfile(options), listCurrentDelegatePlaces(options)]);
    if (!profile) throw new Error("No hay un usuario autenticado.");
    return { profile, places };
  }, options);
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
  if (value === "trial_no_payment") return "Prueba sin pago";
  if (amount === 0) return "Gratis";
  if (!value) return "No informado";
  return value;
}

function getRelatedSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

async function fetchCurrentDelegateSubscription() {
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
export function getCurrentDelegateSubscription(options?: { forceRefresh?: boolean }) {
  return subscriptionCache.read(fetchCurrentDelegateSubscription, options);
}

async function fetchCurrentDelegateReservations(): Promise<DelegateReservation[]> {
  const client = requireSupabase();
  interface ReservationRow {
    id: string; user_id: string; user_name: string; place_id: string; place_name: string;
    reservation_dates: string[]; start_time: string; end_time: string; status: string;
    total_amount: number; payment_method: string; created_at: string; space_name: string;
    guests_count: number; special_requests: string; is_trial: boolean; starts_at: string | null; ends_at: string | null;
  }
  const data: ReservationRow[] = [];
  for (let offset = 0; ; offset += 200) {
    const { data: page, error } = await client.rpc("get_delegate_reservations", { page_limit: 200, page_offset: offset });
    if (error) throw reservationError(error);
    const rows = (page ?? []) as ReservationRow[];
    data.push(...rows);
    if (rows.length < 200) break;
  }
  return [...new Map(data.map((row) => [row.id, row])).values()].map((row) => {
    const amount = Number(row.total_amount ?? 0);

    return {
      id: String(row.id),
      userId: String(row.user_id),
      userName: row.user_name ?? "Usuario",
      placeId: String(row.place_id),
      placeName: row.place_name ?? "Lugar",
      dates: toReservationDates(row.reservation_dates),
      status: (row.status ?? "pending") as DelegateReservationStatus,
      createdAt: toDate(row.created_at),
      totalAmount: amount,
      paymentMethod: normalizePaymentMethod(row.payment_method, amount),
      startTime: String(row.start_time ?? "").slice(0, 5),
      endTime: String(row.end_time ?? "").slice(0, 5),
      spaceName: String(row.space_name ?? "Lugar completo"),
      guestsCount: Number(row.guests_count ?? 1),
      notes: String(row.special_requests ?? ""),
      isTrial: Boolean(row.is_trial),
      startsAt: row.starts_at ? String(row.starts_at) : null,
      endsAt: row.ends_at ? String(row.ends_at) : null,
    };
  });

}

export function listCurrentDelegateReservations(options?: { forceRefresh?: boolean }) {
  return reservationsCache.read(fetchCurrentDelegateReservations, options);
}
export function refreshCurrentDelegateReservations() {
  return listCurrentDelegateReservations({ forceRefresh: true });
}
export function invalidateDelegateReadCaches() { clearAdminDataCaches(); }

export async function getCurrentDelegateDashboard(options?: { forceRefresh?: boolean }): Promise<DelegateDashboardData> {
  return dashboardCache.read(async () => {
    const [profile, places, reservations, subscriptionActive] = await Promise.all([
      getCurrentUserProfile(options), listCurrentDelegatePlaces(options),
      listCurrentDelegateReservations(options), getCurrentDelegateSubscription(options),
    ]);
    if (!profile) throw new Error("No hay un usuario autenticado.");
    return { profile, places, reservations, subscriptionActive };
  }, options);
}

export async function getFreshCurrentDelegateDashboard() {
  return getCurrentDelegateDashboard({ forceRefresh: true });
}

export async function updateDelegateReservationStatus(
  reservationId: string,
  status: Extract<DelegateReservationStatus, "confirmed" | "rejected" | "cancelled" | "completed">,
  isTrial = false,
) {
  if (isTrial) { await transitionTrialReservation(reservationId, status); return; }
  const { error } = await requireSupabase().rpc("transition_delegate_reservation", {
    target_reservation_id: reservationId, next_status: status,
  });
  if (error) throw reservationError(error);
  clearAdminDataCaches();
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
  clearAdminDataCaches();
}

export function clearDelegateServiceCache() {
  reservationsCache.clear(); subscriptionCache.clear(); dashboardCache.clear(); settingsCache.clear();
}
