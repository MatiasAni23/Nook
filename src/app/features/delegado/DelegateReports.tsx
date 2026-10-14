import { useState } from "react";
import { AlertTriangle, Check, MapPin, ThumbsUp } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { getIssueLabel } from "../../data/mockData";
import {
  listDelegateReportTickets,
  getCachedDelegateReportTickets,
  updateReportTicketStatus,
  type ReportTicket,
} from "../../services/reportTicketService";
import { useDelegateData } from "./useDelegateData";
import { DelegatePage, DelegateRefresh, DelegateNotice, DelegateSkeleton } from "./DelegatePage";

export function DelegateReports() {
  const read = useDelegateData(listDelegateReportTickets, getCachedDelegateReportTickets);
  const reports = read.data ?? [];
  const setReports = (update: (current: ReportTicket[]) => ReportTicket[]) => read.setData((current) => update(current ?? []));
  const [savingReportId, setSavingReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleResolve = async (reportId: string) => {
    if (savingReportId) return;
    setSavingReportId(reportId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateReportTicketStatus(reportId, "resolved");
      setReports((current) => current.filter((report) => report.id !== reportId));
      setSuccessMessage("Ticket marcado como resuelto. El reporte ya no aparece como problema activo.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo marcar como resuelto.");
    } finally {
      setSavingReportId(null);
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  return (
    <DelegatePage eyebrow="Cuida la experiencia" title="Reportes de tus lugares" description="Revisa los problemas que detectó la comunidad y mantén tus espacios en buenas condiciones." actions={<DelegateRefresh updating={read.updating || Boolean(savingReportId)} onClick={() => void read.refresh()} />}>
      {(read.error || errorMessage) && <DelegateNotice>{errorMessage || read.error}</DelegateNotice>}
      {successMessage && <DelegateNotice success>{successMessage}</DelegateNotice>}
      {read.loading ? <DelegateSkeleton cards={2} /> : <>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">{[
          ["Activos", reports.length], ["En revisión", reports.filter((r) => r.status === "reviewing").length], ["Lugares", new Set(reports.map((r) => r.placeId)).size],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#E6E8F2] bg-white p-3 sm:p-5"><p className="text-xs font-medium text-[#78728D] sm:text-sm">{label}</p><p className="mt-2 text-2xl font-bold text-[#302A47]">{read.error && !read.data ? "—" : value}</p></div>)}</div>
        <div className="grid gap-4 lg:grid-cols-2">{reports.map((report) => <article key={report.id} className="overflow-hidden rounded-2xl border border-[#E6E8F2] bg-white">
          <div className="flex items-start gap-3 border-b border-[#EFEDF6] p-4 sm:p-5"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle className="size-5" aria-hidden="true" /></div><div className="min-w-0 flex-1"><h2 className="font-semibold text-[#302A47]">{getIssueLabel(report.type)}</h2><p className="mt-1 flex items-start gap-1 text-xs text-[#8A839B]"><MapPin className="mt-0.5 size-3 shrink-0" aria-hidden="true" />{report.placeName}</p></div><Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 text-xs text-amber-700">{report.status === "reviewing" ? "En revisión" : "Por resolver"}</Badge></div>
          <div className="space-y-4 p-4 sm:p-5">{report.description && <p className="whitespace-pre-line break-words text-sm leading-relaxed text-[#6E657E]">{report.description}</p>}<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#91889E]"><span>{getTimeAgo(report.createdAt)}</span><span className="flex items-center gap-1.5 rounded-full bg-[#F6F5FB] px-2 py-1"><ThumbsUp className="size-3" aria-hidden="true" />{report.upvotes} confirmaciones</span></div><Button onClick={() => void handleResolve(report.id)} disabled={Boolean(savingReportId)} className="w-full bg-[#4F46E5] hover:bg-[#4338CA]"><Check className="mr-2 size-4" aria-hidden="true" />{savingReportId === report.id ? "Guardando…" : "Marcar como resuelto"}</Button></div>
        </article>)}</div>
        {!reports.length && (!read.error || read.data) && <div className="rounded-2xl border border-dashed border-emerald-200 bg-white p-10 text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="size-7" aria-hidden="true" /></div><h2 className="font-semibold text-[#4B425F]">Todo al día</h2><p className="mt-2 text-sm text-[#8B829D]">Tus lugares no tienen reportes activos por resolver.</p></div>}
      </>}
    </DelegatePage>
  );
}
