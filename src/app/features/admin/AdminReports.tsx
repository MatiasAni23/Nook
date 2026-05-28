import { useState } from "react";
import { Search, MapPin, ThumbsUp, Check, X } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { mockPlaceReports, type PlaceReport } from "../../data/managementData";
import { getIssueLabel, getIssueIcon } from "../../data/mockData";

export function AdminReports() {
  const [reports, setReports] = useState(mockPlaceReports);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | PlaceReport['status']>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | PlaceReport['type']>('all');

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.placeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesType = typeFilter === 'all' || report.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleStatusChange = (reportId: string, newStatus: PlaceReport['status']) => {
    setReports(reports.map(r =>
      r.id === reportId ? { ...r, status: newStatus } : r
    ));
  };

  const getStatusColor = (status: PlaceReport['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'reviewing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'resolved': return 'bg-green-100 text-green-700 border-green-300';
      case 'dismissed': return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: PlaceReport['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'reviewing': return 'Revisando';
      case 'resolved': return 'Resuelto';
      case 'dismissed': return 'Descartado';
    }
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  const issueTypes: PlaceReport['type'][] = [
    'no_wifi',
    'crowded',
    'noisy',
    'no_outlets',
    'closed',
    'dirty',
    'no_parking',
    'other',
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg" style={{ fontWeight: 700 }}>Reportes de la Comunidad</h3>
        <p className="text-sm text-gray-600">{filteredReports.length} reportes activos</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
        <Input
          placeholder="Buscar reportes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Estado</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-[#4F46E5]' : ''}
              >
                Todos
              </Button>
              <Button
                variant={statusFilter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('pending')}
                className={statusFilter === 'pending' ? 'bg-[#4F46E5]' : ''}
              >
                Pendientes
              </Button>
              <Button
                variant={statusFilter === 'reviewing' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('reviewing')}
                className={statusFilter === 'reviewing' ? 'bg-[#4F46E5]' : ''}
              >
                En revisión
              </Button>
              <Button
                variant={statusFilter === 'resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('resolved')}
                className={statusFilter === 'resolved' ? 'bg-[#4F46E5]' : ''}
              >
                Resueltos
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Tipo de problema</p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
                className={typeFilter === 'all' ? 'bg-[#4F46E5]' : ''}
              >
                Todos
              </Button>
              {issueTypes.map((type) => (
                <Button
                  key={type}
                  variant={typeFilter === type ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTypeFilter(type)}
                  className={typeFilter === type ? 'bg-[#4F46E5]' : ''}
                >
                  {getIssueIcon(type)} {getIssueLabel(type)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredReports.map((report) => (
          <Card key={report.id} className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getIssueIcon(report.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold">{getIssueLabel(report.type)}</h4>
                      <Badge className={getStatusColor(report.status)}>
                        {getStatusLabel(report.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <MapPin className="size-3 inline mr-1" />
                      {report.placeName}
                    </p>
                    {report.description && (
                      <p className="text-sm text-gray-700 mb-2">
                        "{report.description}"
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>📍 Por: {report.userName}</span>
                      <span>🕐 {getTimeAgo(report.createdAt)}</span>
                      <span>
                        <ThumbsUp className="size-3 inline mr-1" />
                        {report.upvotes} confirmaciones
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {report.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(report.id, 'reviewing')}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      Revisar
                    </Button>
                  )}
                  {(report.status === 'pending' || report.status === 'reviewing') && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(report.id, 'resolved')}
                        className="text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Check className="size-3 mr-1" />
                        Resolver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(report.id, 'dismissed')}
                        className="text-gray-600 border-gray-300 hover:bg-gray-50"
                      >
                        <X className="size-3 mr-1" />
                        Descartar
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[#4F46E5] border-[#4F46E5] hover:bg-purple-50"
                  >
                    <MapPin className="size-3 mr-1" />
                    Ver en Mapa
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
