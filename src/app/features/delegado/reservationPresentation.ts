import type { DelegateReservation } from "../../services/delegateService";
import { formatReservationTime, getSantiagoDate } from "../../services/reservationService";

export type ReservationBucket = "pending" | "upcoming" | "history";
export function reservationDays(row: DelegateReservation): string[] {
  if (row.startsAt) return [getSantiagoDate(new Date(row.startsAt))];
  return row.dates.map((date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
}
export function reservationHasStarted(row: DelegateReservation, now = new Date()) {
  if (row.startsAt) return new Date(row.startsAt).getTime() <= now.getTime();
  const first = [...reservationDays(row)].sort()[0];
  return Boolean(first && (first < getSantiagoDate(now) || (first === getSantiagoDate(now) && row.startTime <= formatReservationTime(now.toISOString()))));
}
export function reservationHasEnded(row: DelegateReservation, now = new Date()) {
  if (row.endsAt) return new Date(row.endsAt).getTime() <= now.getTime();
  const days = [...reservationDays(row)].sort();
  const last = days[days.length - 1];
  return Boolean(last && (last < getSantiagoDate(now) || (last === getSantiagoDate(now) && row.endTime <= formatReservationTime(now.toISOString()))));
}
export function reservationBucket(row: DelegateReservation, now = new Date()): ReservationBucket {
  if (row.status === "pending") return "pending";
  if (row.status === "confirmed" && !reservationHasEnded(row, now)) return "upcoming";
  return "history";
}
export function reservationMonthGrid(month: string): Array<string | null> {
  const [year, index] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, index - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return [...Array<string | null>((first + 6) % 7).fill(null), ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
}
export function shiftReservationMonth(month: string, delta: number) {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + delta, 1)).toISOString().slice(0, 7);
}
