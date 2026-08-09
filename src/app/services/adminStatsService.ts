import { supabase } from "../lib/supabase";

export type AdminReservationStatus = "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
export type AdminPaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface AdminReservationMetric {
  id: string;
  placeId: string;
  status: AdminReservationStatus;
  paymentStatus: AdminPaymentStatus;
  totalAmount: number;
  createdAt: Date;
}

function requireSupabase() {
  if (!supabase) throw new Error("Faltan variables de Supabase en .env.");
  return supabase;
}

export async function listAdminReservationMetrics(since: Date): Promise<AdminReservationMetric[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("reservations")
    .select("id, place_id, status, payment_status, total_amount, created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((reservation) => ({
    id: String(reservation.id),
    placeId: String(reservation.place_id),
    status: (reservation.status ?? "pending") as AdminReservationStatus,
    paymentStatus: (reservation.payment_status ?? "pending") as AdminPaymentStatus,
    totalAmount: Number(reservation.total_amount ?? 0),
    createdAt: reservation.created_at ? new Date(reservation.created_at) : new Date(),
  }));
}
