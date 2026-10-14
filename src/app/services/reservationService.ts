import { supabase } from "../lib/supabase";
import { clearAdminDataCaches } from "./adminDataCache";

export type ReservationStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
export interface ReservationSlot {
  id: string;
  spaceId: string;
  spaceName: string;
  capacity: number;
  startsAt: string;
  endsAt: string;
  enabled: boolean;
  reserved: boolean;
}
export interface TrialReservation {
  id: string;
  placeId: string;
  placeName: string;
  spaceName: string;
  startsAt: string;
  endsAt: string;
  guestsCount: number;
  status: ReservationStatus;
}
const errors: Record<string, string> = {
  reservation_account_required: "Inicia sesión con una cuenta activa y correo verificado para reservar.",
  reservation_manager_required: "Solo puedes gestionar las reservas de tus lugares asignados.",
  reservation_place_unavailable: "Las reservas están desactivadas o el lugar no está disponible.",
  reservation_spaces_required: "Agrega al menos un espacio al lugar antes de activar las reservas.",
  reservation_slot_unavailable: "El horario ya no está disponible o el grupo supera la capacidad del espacio.",
  reservation_slot_taken: "Otra persona reservó este horario. Elige otra franja.",
  reservation_schedule_overlap: "Ese rango se cruza con horarios ya publicados, incluidos los desactivados.",
  invalid_reservation_schedule: "Elige horarios futuros dentro de los próximos 90 días y un rango divisible por la duración.",
  invalid_reservation_input: "Revisa la fecha, los horarios y la cantidad de personas.",
  reservation_schedule_limit: "Puedes publicar hasta 200 franjas futuras por espacio.",
  reservation_slot_has_booking: "Este horario tiene una reserva. Resuélvela antes de retirarlo.",
  reservation_space_has_booking: "El espacio tiene reservas futuras. No puedes eliminarlo ni reducir su capacidad por debajo del grupo reservado.",
  reservation_rate_limit: "Alcanzaste el límite de solicitudes. Espera un minuto o revisa tus reservas pendientes.",
  reservation_retry_mismatch: "La solicitud cambió. Actualiza los horarios antes de intentarlo otra vez.",
  invalid_reservation_transition: "El estado de la reserva cambió o todavía no permite esa acción. Actualiza la lista.",
  reservation_not_found_or_forbidden: "No puedes modificar esta reserva o ya no está disponible.",
};
function client() {
  if (!supabase) throw new Error("Las reservas de prueba necesitan conexión con Supabase.");
  return supabase;
}
export function reservationError(error: { message: string; code?: string }): Error {
  for (const [code, message] of Object.entries(errors)) if (error.message.includes(code)) return new Error(message);
  if (error.code === "23505") return new Error(errors.reservation_slot_taken);
  if (["PGRST202", "42P01", "42703"].includes(error.code ?? "")) return new Error("Las reservas aún no están habilitadas en el servidor. Falta aplicar la migración de la prueba.");
  return new Error("No pudimos completar la operación de reservas. Vuelve a intentarlo.");
}
export async function getPlaceReservationsEnabled(placeId: string): Promise<boolean> {
  const { data, error } = await client().rpc("get_place_reservation_config", { target_place_id: placeId });
  if (error) throw reservationError(error);
  return data === true;
}
export async function setPlaceReservationsEnabled(placeId: string, enabled: boolean) {
  const { data, error } = await client().rpc("set_place_reservations_enabled", { target_place_id: placeId, next_enabled: enabled });
  if (error) throw reservationError(error);
  if (data !== enabled) throw new Error("El servidor no confirmó el cambio de reservas.");
  return data as boolean;
}
export async function listReservationSlots(placeId: string, forManagement = false): Promise<ReservationSlot[]> {
  const { data, error } = await client().rpc("get_reservation_slots", { target_place_id: placeId, for_management: forManagement });
  if (error) throw reservationError(error);
  return (data ?? []).map((row: { id: string; space_id: string; space_name: string; capacity: number; starts_at: string; ends_at: string; enabled: boolean; reserved: boolean }) => ({
    id: row.id, spaceId: row.space_id, spaceName: row.space_name, capacity: row.capacity,
    startsAt: row.starts_at, endsAt: row.ends_at, enabled: row.enabled, reserved: row.reserved,
  }));
}
export async function publishReservationSlots(input: { spaceId: string; date: string; start: string; end: string; minutes: number }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.start) || !/^\d{2}:\d{2}$/.test(input.end) || input.end <= input.start) throw new Error(errors.invalid_reservation_input);
  const { data, error } = await client().rpc("publish_reservation_slots", {
    target_space_id: input.spaceId, slot_date: input.date, opening_time: input.start, closing_time: input.end, slot_minutes: input.minutes,
  });
  if (error) throw reservationError(error);
  if (typeof data !== "number" || data <= 0) throw new Error("El servidor no confirmó los horarios.");
  return data;
}
export interface ReservationDaySchedule { date: string; start: string; end: string }
export async function publishReservationWeek(input: { spaceId: string; weekStart: string; days: ReservationDaySchedule[]; minutes: number }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.weekStart) || !input.days.length || input.days.length > 7
    || new Set(input.days.map((day) => day.date)).size !== input.days.length
    || input.days.some((day) => !/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !/^\d{2}:\d{2}$/.test(day.start) || !/^\d{2}:\d{2}$/.test(day.end) || day.end <= day.start)) {
    throw new Error(errors.invalid_reservation_input);
  }
  const { data, error } = await client().rpc("publish_reservation_week", {
    target_space_id: input.spaceId, week_start: input.weekStart, day_schedules: input.days, slot_minutes: input.minutes,
  });
  if (error) throw reservationError(error);
  if (typeof data !== "number" || !Number.isInteger(data) || data < 0) throw new Error("El servidor no confirmó los horarios de la semana.");
  return data;
}
export async function setReservationDayEnabled(spaceId: string, date: string, enabled: boolean) {
  const { data, error } = await client().rpc("set_reservation_day_enabled", {
    target_space_id: spaceId, slot_date: date, next_enabled: enabled,
  });
  if (error) throw reservationError(error);
  if (typeof data !== "number" || !Number.isInteger(data) || data < 0) throw new Error("El servidor no confirmó la disponibilidad del día.");
  return data;
}
export async function setReservationSlotEnabled(slotId: string, enabled: boolean) {
  const { data, error } = await client().rpc("set_reservation_slot_enabled", { target_slot_id: slotId, next_enabled: enabled });
  if (error) throw reservationError(error);
  if (data !== enabled) throw new Error("El servidor no confirmó el horario.");
}
export async function createTrialReservation(input: { slotId: string; guests: number; requestId: string; notes: string }) {
  if (!Number.isInteger(input.guests) || input.guests < 1 || input.notes.length > 500) throw new Error(errors.invalid_reservation_input);
  const { data, error } = await client().rpc("create_trial_reservation", {
    target_slot_id: input.slotId, group_size: input.guests, request_id: input.requestId, notes: input.notes,
  });
  if (error) throw reservationError(error);
  if (typeof data !== "string" || !data) throw new Error("El servidor no confirmó la solicitud.");
  clearAdminDataCaches();
  return data;
}
export async function transitionTrialReservation(id: string, status: Exclude<ReservationStatus, "pending">) {
  const { data, error } = await client().rpc("transition_trial_reservation", { target_reservation_id: id, next_status: status });
  if (error) throw reservationError(error);
  if (data !== status) throw new Error("El servidor no confirmó el estado de la reserva.");
  clearAdminDataCaches();
}
export async function listMyTrialReservations(): Promise<TrialReservation[]> {
  const db = client();
  const { data: auth, error: authError } = await db.auth.getUser();
  if (authError || !auth.user) throw new Error("Inicia sesión para ver tus reservas.");
  const { data, error } = await db.from("reservations")
    .select("id, place_id, space_name, starts_at, ends_at, guests_count, status, places:place_id(name)")
    .eq("user_id", auth.user.id).eq("is_trial", true).order("starts_at", { ascending: false }).limit(200);
  if (error) throw reservationError(error);
  return (data ?? []).map((row) => {
    const place = Array.isArray(row.places) ? row.places[0] : row.places;
    return { id: String(row.id), placeId: String(row.place_id), placeName: String(place?.name ?? "Lugar"),
      spaceName: String(row.space_name), startsAt: String(row.starts_at), endsAt: String(row.ends_at),
      guestsCount: Number(row.guests_count), status: row.status as ReservationStatus };
  });
}
export const reservationStatusLabels: Record<ReservationStatus, string> = {
  pending: "Pendiente de aprobación", confirmed: "Confirmada", rejected: "Rechazada", cancelled: "Cancelada", completed: "Finalizada",
};
export function formatReservationDate(value: string) {
  return new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
export function formatReservationTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(value));
}
export function getSantiagoDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (name: string) => parts.find((item) => item.type === name)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
