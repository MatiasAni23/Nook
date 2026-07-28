import { supabase } from "../lib/supabase";
import { listCurrentDelegatePlaces, type DelegateAssignedPlace } from "./adminManagementService";
import { getCurrentUserProfile, type CurrentUserProfile } from "./currentUserService";

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

const DELEGATE_CACHE_TTL_MS = 5 * 60 * 1000;

let reservationsCache: { timestamp: number; userId: string; reservations: DelegateReservation[] } | null = null;
let reservationsRequest: Promise<{ userId: string; reservations: DelegateReservation[] }> | null = null;
let dashboardCache: { timestamp: number; userId: string; dashboard: DelegateDashboardData } | null = null;
let dashboardRequest: Promise<{ userId: string; dashboard: DelegateDashboardData }> | null = null;

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
    .filter((date): date is Date => Boolean(date) && !Number.isNaN(date.getTime()));
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

export async function getCurrentDelegateSubscription(options?: { forceRefresh?: boolean }) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("No hay un usuario autenticado.");

  if (
    !options?.forceRefresh &&
    dashboardCache?.userId === userData.user.id &&
    Date.now() - dashboardCache.timestamp < DELEGATE_CACHE_TTL_MS
  ) {
    return dashboardCache.dashboard.subscriptionActive;
  }

  const { data, error } = await client
    .from("delegates")
    .select("subscription_active")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.subscription_active);
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
      users:user_id(name, email),
      places:place_id(name)
    `,
    )
    .in("place_id", placeIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const reservations = (data ?? []).map((row) => {
    const amount = Number(row.total_amount ?? 0);
    const reservedUser = getRelatedSingle(row.users);
    const place = getRelatedSingle(row.places);

    return {
      id: String(row.id),
      userId: String(row.user_id),
      userName: String(reservedUser?.name ?? reservedUser?.email ?? "Usuario"),
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

export async function listCurrentDelegateReservations(options?: { forceRefresh?: boolean }) {
  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();

  if (userError) throw userError;
  if (!userData.user) throw new Error("No hay un usuario autenticado.");

  if (
    !options?.forceRefresh &&
    reservationsCache &&
    reservationsCache.userId === userData.user.id &&
    Date.now() - reservationsCache.timestamp < DELEGATE_CACHE_TTL_MS
  ) {
    return reservationsCache.reservations;
  }

  if (!options?.forceRefresh && reservationsRequest) {
    const result = await reservationsRequest;
    return result.reservations;
  }

  reservationsRequest = fetchCurrentDelegateReservations()
    .then((result) => {
      reservationsCache = {
        timestamp: Date.now(),
        userId: result.userId,
        reservations: result.reservations,
      };
      return result;
    })
    .finally(() => {
      reservationsRequest = null;
    });

  const result = await reservationsRequest;
  return result.reservations;
}

export async function getCurrentDelegateDashboard(options?: { forceRefresh?: boolean }): Promise<DelegateDashboardData> {
  const client = requireSupabase();
  const { data: sessionData } = await client.auth.getSession();
  const sessionUserId = sessionData.session?.user.id;

  if (
    !options?.forceRefresh &&
    sessionUserId &&
    dashboardCache?.userId === sessionUserId &&
    Date.now() - dashboardCache.timestamp < DELEGATE_CACHE_TTL_MS
  ) {
    return dashboardCache.dashboard;
  }

  if (!options?.forceRefresh && dashboardRequest) {
    const result = await dashboardRequest;
    return result.dashboard;
  }

  dashboardRequest = Promise.all([
    getCurrentUserProfile(options),
    listCurrentDelegatePlaces(options),
    listCurrentDelegateReservations(options),
    getCurrentDelegateSubscription(options),
  ])
    .then(([profile, places, reservations, subscriptionActive]) => {
      const userId = profile?.id ?? sessionUserId;
      if (!userId) throw new Error("No hay un usuario autenticado.");

      const dashboard = { profile, places, reservations, subscriptionActive };
      dashboardCache = {
        timestamp: Date.now(),
        userId,
        dashboard,
      };
      return { userId, dashboard };
    })
    .finally(() => {
      dashboardRequest = null;
    });

  const result = await dashboardRequest;
  return result.dashboard;
}

export async function getFreshCurrentDelegateDashboard(): Promise<DelegateDashboardData> {
  const [profile, places, reservations] = await Promise.all([
    getCurrentUserProfile({ forceRefresh: true }),
    listCurrentDelegatePlaces({ forceRefresh: true }),
    listCurrentDelegateReservations({ forceRefresh: true }),
  ]);
  const subscriptionActive = await getCurrentDelegateSubscription({ forceRefresh: true });

  const dashboard = { profile, places, reservations, subscriptionActive };
  if (profile) {
    dashboardCache = {
      timestamp: Date.now(),
      userId: profile.id,
      dashboard,
    };
  }
  return dashboard;
}

export async function updateDelegateReservationStatus(
  reservationId: string,
  status: Extract<DelegateReservationStatus, "confirmed" | "rejected" | "cancelled" | "completed">,
) {
  const client = requireSupabase();
  const { error } = await client
    .from("reservations")
    .update({ status })
    .eq("id", reservationId);

  if (error) throw error;

  if (reservationsCache) {
    reservationsCache = {
      ...reservationsCache,
      reservations: reservationsCache.reservations.map((reservation) =>
        reservation.id === reservationId ? { ...reservation, status } : reservation,
      ),
    };
  }

  if (dashboardCache) {
    dashboardCache = {
      ...dashboardCache,
      dashboard: {
        ...dashboardCache.dashboard,
        reservations: dashboardCache.dashboard.reservations.map((reservation) =>
          reservation.id === reservationId ? { ...reservation, status } : reservation,
        ),
      },
    };
  }
}

export async function updateCurrentDelegateProfile(input: { name: string; phone: string }) {
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
    .eq("id", userData.user.id);

  if (error) throw error;

  if (dashboardCache?.dashboard.profile) {
    dashboardCache = {
      ...dashboardCache,
      dashboard: {
        ...dashboardCache.dashboard,
        profile: {
          ...dashboardCache.dashboard.profile,
          name: input.name.trim(),
          phone: input.phone.trim() || null,
        },
      },
    };
  }
}

export function clearDelegateServiceCache() {
  reservationsCache = null;
  reservationsRequest = null;
  dashboardCache = null;
  dashboardRequest = null;
}
