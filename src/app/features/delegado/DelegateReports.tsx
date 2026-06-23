import { useEffect, useState } from "react";
import { AlertTriangle, Check, MapPin, ThumbsUp } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { getIssueIcon, getIssueLabel } from "../../data/mockData";
import { isSupabaseConfigured } from "../../lib/supabase";
import {
  listDelegateReportTickets,
  updateReportTicketStatus,
  type ReportTicket,
} from "../../services/reportTicketService";

export function DelegateReports() {
  const [reports, setReports] = useState<ReportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [savingReportId, setSavingReportId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase no esta configurado.");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage("");

    listDelegateReportTickets()
      .then((nextReports) => {
        if (isMounted) setReports(nextReports);
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "No se pudieron cargar los tickets.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResolve = async (reportId: string) => {
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
    <div className="size-full flex flex-col bg-gray-50">
      <div className="flex-1 overflow-auto p-4 pb-28">
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl mb-1" style={{ fontWeight: 700 }}>Tickets de reportes</h2>
            <p className="text-gray-600">{reports.length} problemas activos en tus lugares</p>
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

          {isLoading && (
            <div className="rounded-lg border bg-white px-3 py-3 text-sm text-gray-600">
              Cargando tickets...
            </div>
          )}

          {!isLoading && reports.length === 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="mx-auto mb-2 size-6 text-green-700" />
                <p className="text-sm font-medium text-green-700">No hay problemas activos por resolver.</p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {reports.map((report) => (
              <Card key={report.id} className="border-orange-200 bg-orange-50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{getIssueIcon(report.type)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{getIssueLabel(report.type)}</h3>
                          <Badge className="border-blue-300 bg-blue-100 text-blue-700">
                            Ticket activo
                          </Badge>
                        </div>
                        <p className="mb-2 text-sm text-gray-700">
                          <MapPin className="size-3 inline mr-1" />
                          {report.placeName}
                        </p>
                        {report.description && (
                          <p className="mb-2 text-sm text-gray-700">"{report.description}"</p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                          <span>{getTimeAgo(report.createdAt)}</span>
                          <span>
                            <ThumbsUp className="size-3 inline mr-1" />
                            {report.upvotes} confirmaciones
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleResolve(report.id)}
                      disabled={savingReportId === report.id}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Check className="size-4 mr-2" />
                      {savingReportId === report.id ? "Marcando..." : "Marcar como resuelto"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
