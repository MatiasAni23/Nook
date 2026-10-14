/** Calendar dates are local civil dates, never UTC instants. */
export function calendarDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}
export function calendarDateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}
export function shiftCalendarDate(value: string, days: number): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
export function reservationWeekStart(value: string): string {
  const day = new Date(`${value}T12:00:00Z`).getUTCDay();
  return shiftCalendarDate(value, -((day + 6) % 7));
}
export function formatCalendarDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(calendarDate(value));
}
