import { es } from "date-fns/locale";
import { Calendar } from "../../components/ui/calendar";
import { calendarDate, calendarDateKey } from "./reservationDateUtils";

export function ReservationCalendar({ dates, selected, disabled = false, onSelect }: {
  dates: string[]; selected: string; disabled?: boolean; onSelect: (date: string) => void;
}) {
  if (!dates.length) return null;
  const available = new Set(dates);
  return <Calendar key={dates[0] ?? "empty"} mode="single" required locale={es} weekStartsOn={1}
    selected={selected ? calendarDate(selected) : undefined}
    defaultMonth={calendarDate(selected || dates[0])}
    fromMonth={calendarDate(dates[0])} toMonth={calendarDate(dates[dates.length - 1])}
    disabled={(date) => disabled || !available.has(calendarDateKey(date))}
    onSelect={(date) => { if (date && !disabled) onSelect(calendarDateKey(date)); }}
    labels={{ labelNext: () => "Mes siguiente", labelPrevious: () => "Mes anterior" }}
    className="mx-auto w-full max-w-[320px] p-0"
    classNames={{ month: "w-full space-y-3", months: "w-full", table: "w-full border-collapse",
      head_row: "grid grid-cols-7", head_cell: "py-2 text-center text-xs font-medium text-slate-500",
      row: "mt-1 grid grid-cols-7", cell: "relative text-center",
      day: "mx-auto flex size-8 items-center justify-center rounded-full text-sm font-medium transition-colors hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:size-9",
      day_selected: "bg-[#4F46E5] text-white hover:bg-[#4338CA]", day_today: "ring-1 ring-inset ring-indigo-200",
      day_disabled: "text-slate-300 hover:bg-transparent", day_outside: "text-slate-300",
      caption_label: "text-sm font-semibold capitalize text-slate-800",
    }} />;
}
