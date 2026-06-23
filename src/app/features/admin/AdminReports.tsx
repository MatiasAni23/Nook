import { useEffect, useMemo, useState } from "react";
import { Check, Mail, MapPin, MessageCircle, Phone, Search, ThumbsUp, X } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { getIssueIcon, getIssueLabel, type IssueType } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  listAdminReportTickets,
  updateReportTicketStatus,
  type ReportTicket,
  type ReportTicketStatus,
} from "../../services/reportTicketService";

export function AdminReports() {
  const [reports, setReports] = useState<ReportTicket[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportTicketStatus>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | IssueType>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [savingReportId, setSavingReportId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no esta configurado. Los reportes reales no se pueden cargar.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    listAdminReportTickets()
      .then((nextReports) => {
        if (isMounted) setReports(nextReports);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los reportes.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase();

    return reports.filter((report) => {
      const matchesSearch =
        report.placeName.toLowerCase().includes(normalizedSearch) ||
        report.reporterName.toLowerCase().includes(normalizedSearch) ||
        report.description.toLowerCase().includes(normalizedSearch) ||
        report.delegates.some((delegate) => delegate.name.toLowerCase().includes(normalizedSearch));
      const matchesStatus = statusFilter === "all" || report.status === statusFilter;
      const matchesType = typeFilter === "all" || report.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const handleStatusChange = async (reportId: string, newStatus: ReportTicketStatus) => {
    setSavingReportId(reportId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const updatedReport = await updateReportTicketStatus(reportId, newStatus);
      setReports((current) =>
        current.map((report) => report.id === updatedReport.id ? updatedReport : report),
      );
      setSuccessMessage(newStatus === "resolved" ? "Ticket marcado como resuelto." : "Ticket actualizado.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar el reporte.");
    } finally {
      setSavingReportId(null);
    }
  };

  const getStatusColor = (status: ReportTicketStatus) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "reviewing": return "bg-blue-100 text-blue-700 border-blue-300";
      case "resolved": return "bg-green-100 text-green-700 border-green-300";
      case "dismissed": return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = (status: ReportTicketStatus) => {
    switch (status) {
      case "pending": return "Pendiente";
      case "reviewing": return "En revision";
      case "resolved": return "Resuelto";
      case "dismissed": return "Descartado";
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

  const activeCount = reports.filter((report) => report.status === "pending" || report.status === "reviewing").length;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg" style={{ fontWeight: 700 }}>Tickets de reportes</h3>
        <p className="text-sm text-gray-600">{activeCount} tickets activos</p>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

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

      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Estado</p>
            <div className="flex gap-2 flex-wrap">
              {(["all", "pending", "reviewing", "resolved", "dismissed"] as const).map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={statusFilter === status ? "bg-[#4F46E5]" : ""}
                >
                  {status === "all" ? "Todos" : getStatusLabel(status)}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Tipo de problema</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={typeFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter("all")}
                className={typeFilter === "all" ? "bg-[#4F46E5]" : ""}
              >
                Todos
              </Button>
              {issueTypes.map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(type)}
                  className={typeFilter === type ? "bg-[#4F46E5]" : ""}
                >
                  {getIssueIcon(type)} {getIssueLabel(type)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
          Cargando reportes...
        </div>
      )}

      {!isLoading && filteredReports.length === 0 && (
        <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
          No hay tickets para los filtros seleccionados.
        </div>
      )}

      <div className="space-y-3">
        {filteredReports.map((report) => (
          <Card key={report.id} className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getIssueIcon(report.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold">{getIssueLabel(report.type)}</h4>
                      <Badge className={getStatusColor(report.status)}>{getStatusLabel(report.status)}</Badge>
                    </div>
                    <p className="mb-2 text-sm text-gray-700">
                      <MapPin className="size-3 inline mr-1" />
                      {report.placeName}
                    </p>
                    {report.description && (
                      <p className="mb-2 text-sm text-gray-700">"{report.description}"</p>
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
                    Contactar delegado para solucion
                  </div>
                  {report.delegates.length > 0 ? (
                    <div className="space-y-2">
                      {report.delegates.map((delegate) => (
                        <div key={delegate.id} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                          <span className="font-medium">{delegate.name}</span>
                          {delegate.email && (
                            <a className="inline-flex items-center gap-1 text-[#4F46E5] hover:underline" href={`mailto:${delegate.email}`}>
                              <Mail className="size-3.5" />
                              {delegate.email}
                            </a>
                          )}
                          {delegate.phone && (
                            <a className="inline-flex items-center gap-1 text-[#4F46E5] hover:underline" href={`tel:${delegate.phone}`}>
                              <Phone className="size-3.5" />
                              {delegate.phone}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">Este lugar aun no tiene delegado asignado.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {report.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={savingReportId === report.id}
                      onClick={() => handleStatusChange(report.id, "reviewing")}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      Revisar ticket
                    </Button>
                  )}
                  {(report.status === "pending" || report.status === "reviewing") && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingReportId === report.id}
                        onClick={() => handleStatusChange(report.id, "resolved")}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Check className="size-3 mr-1" />
                        Marcar resuelto
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingReportId === report.id}
                        onClick={() => handleStatusChange(report.id, "dismissed")}
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
