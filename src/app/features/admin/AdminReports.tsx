import { normalizeAdminSearch } from "./AdminUi";
import { useAdminData } from "./useAdminData";
import {
  ManagementSectionHeading,
  ManagementEmpty,
  ManagementDataNotice,
} from "./AdminUi";
import { useEffect, useMemo, useState } from "react";
import {
  Flag,
  Check,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ThumbsUp,
  X,
} from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { getIssueLabel, type IssueType } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  getCachedAdminReportTickets,
  getAdminReportsCacheRemaining,
  listAdminReportTickets,
  updateReportTicketStatus,
  type ReportTicket,
  type ReportTicketStatus,
} from "../../services/reportTicketService";

const reportsSource = {
  peek: getCachedAdminReportTickets,
  remaining: getAdminReportsCacheRemaining,
  load: listAdminReportTickets,
};
export function AdminReports() {
  const [reports, setReports] = useState<ReportTicket[]>(
    getCachedAdminReportTickets() ?? [],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportTicketStatus>(
    "all",
  );
  const [typeFilter, setTypeFilter] = useState<"all" | IssueType>("all");
  const {
    data: loadedReports,
    isLoading,
    error: loadError,
    isRefreshing,
    refresh,
  } = useAdminData(reportsSource, isSupabaseConfigured);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingReportId, setSavingReportId] = useState<string | null>(null);

  useEffect(() => {
    setReports(loadedReports ?? []);
  }, [loadedReports]);
  const filteredReports = useMemo(() => {
    const normalizedSearch = normalizeAdminSearch(searchTerm);

    return reports.filter((report) => {
      const matchesSearch =
        normalizeAdminSearch(report.placeName).includes(normalizedSearch) ||
        normalizeAdminSearch(report.reporterName).includes(normalizedSearch) ||
        normalizeAdminSearch(report.description).includes(normalizedSearch) ||
        report.delegates.some((delegate) =>
          normalizeAdminSearch(delegate.name).includes(normalizedSearch),
        );
      const matchesStatus =
        statusFilter === "all" || report.status === statusFilter;
      const matchesType = typeFilter === "all" || report.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const handleStatusChange = async (
    reportId: string,
    newStatus: ReportTicketStatus,
  ) => {
    if (savingReportId !== null) return;
    setSavingReportId(reportId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedReport = await updateReportTicketStatus(reportId, newStatus);
      setReports((current) =>
        current.map((report) =>
          report.id === updatedReport.id ? updatedReport : report,
        ),
      );
      setSuccessMessage(
        newStatus === "resolved"
          ? "Ticket marcado como resuelto."
          : "Ticket actualizado.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el reporte.",
      );
    } finally {
      setSavingReportId(null);
    }
  };

  const getStatusColor = (status: ReportTicketStatus) => {
    switch (status) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "reviewing":
        return "bg-slate-50 text-slate-600 border-slate-200";
      case "resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "dismissed":
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = (status: ReportTicketStatus) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "reviewing":
        return "En revision";
      case "resolved":
        return "Resuelto";
      case "dismissed":
        return "Descartado";
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

  const issueTypes: IssueType[] = [
    "no_wifi",
    "crowded",
    "noisy",
    "no_outlets",
    "closed",
    "dirty",
    "no_parking",
    "other",
  ];

  const activeCount = reports.filter(
    (report) => report.status === "pending" || report.status === "reviewing",
  ).length;

  return (
    <div className="space-y-4">
      <ManagementSectionHeading
        title="Reportes"
        count={activeCount}
        description="Incidencias de los espacios y seguimiento de su resolución."
      />

      <ManagementDataNotice
        error={errorMessage || loadError}
        isRefreshing={isRefreshing}
        onRetry={() => {
          setErrorMessage("");
          refresh();
        }}
      />

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Buscar por lugar, usuario, delegado o descripcion..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="management-filters">
        <div className="management-status-filter">
          <label htmlFor="report-status">Estado</label>
          <select
            id="report-status"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "all" | ReportTicketStatus)
            }
          >
            {(
              ["all", "pending", "reviewing", "resolved", "dismissed"] as const
            ).map((status) => (
              <option key={status} value={status}>
                {status === "all"
                  ? "Todos los estados"
                  : getStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>
        <div className="management-status-filter">
          <label htmlFor="report-type">Tipo de problema</label>
          <select
            id="report-type"
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as "all" | IssueType)
            }
          >
            <option value="all">Todos los problemas</option>
            {issueTypes.map((type) => (
              <option key={type} value={type}>
                {getIssueLabel(type)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
          Cargando reportes...
        </div>
      )}

      {!isLoading && filteredReports.length === 0 && (
        <ManagementEmpty
          title="No hay reportes para mostrar"
          description="Las incidencias de los lugares aparecerán aquí. Puedes cambiar los filtros para revisar otros estados."
        />
      )}

      <div className="management-record-grid">
        {filteredReports.map((report) => (
          <Card key={report.id} className="management-record">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="management-report-icon">
                    <Flag size={18} strokeWidth={1.5} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">
                        {getIssueLabel(report.type)}
                      </h4>
                      <Badge className={getStatusColor(report.status)}>
                        {getStatusLabel(report.status)}
                      </Badge>
                    </div>
                    <p className="mb-2 text-sm text-gray-700">
                      <MapPin className="size-3 inline mr-1" />
                      {report.placeName}
                    </p>
                    {report.description && (
                      <p className="mb-2 text-sm text-gray-700">
                        "{report.description}"
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                      <span>Por: {report.reporterName}</span>
                      <span>{getTimeAgo(report.createdAt)}</span>
                      <span>
                        <ThumbsUp className="size-3 inline mr-1" />
                        {report.upvotes} confirmaciones
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-white p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
                    <MessageCircle className="size-4 text-[#4F46E5]" />
                    Contacto del delegado
                  </div>
                  {report.delegates.length > 0 ? (
                    <div className="space-y-2">
                      {report.delegates.map((delegate) => (
                        <div
                          key={delegate.id}
                          className="flex flex-wrap items-center gap-2 text-sm text-gray-700"
                        >
                          <span className="font-medium">{delegate.name}</span>
                          {delegate.email && (
                            <a
                              className="inline-flex items-center gap-1 text-[#4F46E5] hover:underline"
                              href={`mailto:${delegate.email}`}
                            >
                              <Mail className="size-3.5" />
                              {delegate.email}
                            </a>
                          )}
                          {delegate.phone && (
                            <a
                              className="inline-flex items-center gap-1 text-[#4F46E5] hover:underline"
                              href={`tel:${delegate.phone}`}
                            >
                              <Phone className="size-3.5" />
                              {delegate.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Este lugar aun no tiene delegado asignado.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {report.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={savingReportId !== null || isRefreshing}
                      onClick={() => handleStatusChange(report.id, "reviewing")}
                      className="text-gray-600 border-gray-200 hover:bg-gray-50"
                    >
                      Revisar ticket
                    </Button>
                  )}
                  {(report.status === "pending" ||
                    report.status === "reviewing") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingReportId !== null || isRefreshing}
                        onClick={() =>
                          handleStatusChange(report.id, "resolved")
                        }
                        className="text-gray-600 border-gray-200 hover:bg-gray-50"
                      >
                        <Check className="size-3 mr-1" />
                        Marcar resuelto
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingReportId !== null || isRefreshing}
                        onClick={() =>
                          handleStatusChange(report.id, "dismissed")
                        }
                        className="text-gray-600 border-gray-300 hover:bg-gray-50"
                      >
                        <X className="size-3 mr-1" />
                        Descartar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
