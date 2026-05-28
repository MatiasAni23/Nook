import { useState } from "react";
import { Search, MessageCircle, X, Send, Clock } from "lucide-react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Badge } from "../../components/ui/badge";
import { mockSupportTickets, type SupportTicket, type TicketMessage } from "../../data/managementData";

export function AdminSupport() {
  const [tickets, setTickets] = useState(mockSupportTickets);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | SupportTicket['status']>('all');

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleReply = () => {
    if (!replyMessage.trim() || !selectedTicket) return;

    const newMessage: TicketMessage = {
      id: `m${Date.now()}`,
      from: 'support',
      name: 'Soporte Nook',
      message: replyMessage,
      timestamp: new Date(),
    };

    setTickets(tickets.map(t =>
      t.id === selectedTicket.id
        ? {
            ...t,
            messages: [...t.messages, newMessage],
            updatedAt: new Date(),
            status: 'in_review',
          }
        : t
    ));

    setSelectedTicket({
      ...selectedTicket,
      messages: [...selectedTicket.messages, newMessage],
    });

    setReplyMessage("");
  };

  const handleStatusChange = (ticketId: string, newStatus: SupportTicket['status']) => {
    setTickets(tickets.map(t =>
      t.id === ticketId ? { ...t, status: newStatus, updatedAt: new Date() } : t
    ));
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus });
    }
  };

  const getCategoryIcon = (category: SupportTicket['category']) => {
    switch (category) {
      case 'technical': return '🔧';
      case 'billing': return '💳';
      case 'report': return '⚠️';
      case 'suggestion': return '💡';
      case 'other': return '📋';
    }
  };

  const getCategoryLabel = (category: SupportTicket['category']) => {
    switch (category) {
      case 'technical': return 'Técnico';
      case 'billing': return 'Facturación';
      case 'report': return 'Reporte';
      case 'suggestion': return 'Sugerencia';
      case 'other': return 'Otro';
    }
  };

  const getStatusColor = (status: SupportTicket['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'in_review': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'resolved': return 'bg-green-100 text-green-700 border-green-300';
      case 'closed': return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusLabel = (status: SupportTicket['status']) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_review': return 'En revisión';
      case 'resolved': return 'Resuelto';
      case 'closed': return 'Cerrado';
    }
  };

  const getPriorityColor = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-700';
      case 'medium': return 'bg-orange-100 text-orange-700';
      case 'high': return 'bg-red-100 text-red-700';
    }
  };

  const getPriorityLabel = (priority: SupportTicket['priority']) => {
    switch (priority) {
      case 'low': return 'Baja';
      case 'medium': return 'Media';
      case 'high': return 'Alta';
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-lg" style={{ fontWeight: 700 }}>Centro de Soporte</h3>
        <p className="text-sm text-gray-600">{filteredTickets.length} tickets</p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <Input
            placeholder="Buscar tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

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
            variant={statusFilter === 'in_review' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('in_review')}
            className={statusFilter === 'in_review' ? 'bg-[#4F46E5]' : ''}
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

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4" onClick={() => setSelectedTicket(ticket)}>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg">{getCategoryIcon(ticket.category)}</span>
                      <h4 className="font-semibold">{ticket.subject}</h4>
                    </div>
                    <p className="text-sm text-gray-600">De: {ticket.userName}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge className={getStatusColor(ticket.status)}>
                      {getStatusLabel(ticket.status)}
                    </Badge>
                    <p className="text-xs text-gray-500">
                      <Clock className="size-3 inline mr-1" />
                      {getTimeAgo(ticket.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(ticket.category)}
                  </Badge>
                  <Badge className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                    {getPriorityLabel(ticket.priority)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {ticket.messages.length} mensaje(s)
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
            <CardContent className="p-6 flex-1 overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getCategoryIcon(selectedTicket.category)}</span>
                    <h3 className="text-xl font-semibold">{selectedTicket.subject}</h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getStatusColor(selectedTicket.status)}>
                      {getStatusLabel(selectedTicket.status)}
                    </Badge>
                    <Badge className={getPriorityColor(selectedTicket.priority)}>
                      Prioridad {getPriorityLabel(selectedTicket.priority)}
                    </Badge>
                    <span className="text-sm text-gray-600">De: {selectedTicket.userName}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTicket(null)}
                >
                  <X className="size-5" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto space-y-4 mb-4 border rounded-lg p-4 bg-gray-50">
                {selectedTicket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.from === 'user' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.from === 'user'
                        ? 'bg-white border'
                        : 'bg-[#4F46E5] text-white'
                    }`}>
                      <p className="text-sm font-medium mb-1">{message.name}</p>
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.from === 'user' ? 'text-gray-500' : 'text-white/70'
                      }`}>
                        {message.timestamp.toLocaleString('es-CL')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <div className="space-y-3">
                <Textarea
                  placeholder="Escribe tu respuesta..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleReply}
                    className="bg-[#4F46E5] hover:bg-[#4338CA]"
                  >
                    <Send className="size-4 mr-2" />
                    Enviar Respuesta
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange(selectedTicket.id, 'resolved')}
                    className="text-green-600 border-green-300"
                  >
                    Marcar como Resuelto
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStatusChange(selectedTicket.id, 'closed')}
                    className="text-gray-600"
                  >
                    Cerrar Ticket
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
