import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, Users, DollarSign, AlertTriangle, 
  TrendingUp, Calendar, Loader2 
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isToday, isTomorrow, isPast } from "date-fns";

import StatsCard from "@/components/collection/StatsCard";
import ClientCard from "@/components/collection/ClientCard";
import AddClientModal from "@/components/collection/AddClientModal";

export default function Home() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddClient, setShowAddClient] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date")
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => base44.entities.CollectionLog.list("-contact_date", 100)
  });

  const createClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAddClient(false);
    }
  });

  // Calculate stats
  const totalDebt = clients.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  const totalPaid = clients.reduce((sum, c) => sum + (c.paid_amount || 0), 0);
  const pendingAmount = totalDebt - totalPaid;
  const inMora = clients.filter(c => c.status === "mora").length;

  // Get today's follow-ups
  const todayFollowUps = logs.filter(log => {
    if (!log.follow_up_date) return false;
    const followDate = new Date(log.follow_up_date);
    return isToday(followDate) || (isPast(followDate) && !isToday(followDate));
  });

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
                          c.phone?.includes(search);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bitácora de Cobranza</h1>
            <p className="text-slate-500 mt-1">Gestiona tus clientes y seguimientos</p>
          </div>
          <Button onClick={() => setShowAddClient(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Clientes"
            value={clients.length}
            icon={Users}
            variant="info"
          />
          <StatsCard
            title="Por cobrar"
            value={`$${pendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            icon={DollarSign}
            variant="warning"
          />
          <StatsCard
            title="Cobrado"
            value={`$${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
            icon={TrendingUp}
            variant="success"
          />
          <StatsCard
            title="En mora"
            value={inMora}
            icon={AlertTriangle}
            variant="danger"
          />
        </div>

        {/* Today's Follow-ups Alert */}
        {todayFollowUps.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-amber-700 mb-2">
              <Calendar className="h-5 w-5" />
              <span className="font-semibold">Seguimientos pendientes: {todayFollowUps.length}</span>
            </div>
            <p className="text-sm text-amber-600">
              Tienes {todayFollowUps.length} seguimiento(s) programado(s) para hoy o atrasado(s).
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
              <TabsTrigger value="mora">En mora</TabsTrigger>
              <TabsTrigger value="en_negociacion">Negociando</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Client List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {search || statusFilter !== "all" ? "No se encontraron clientes" : "Sin clientes"}
            </h3>
            <p className="text-slate-500 mb-4">
              {search || statusFilter !== "all" 
                ? "Intenta con otros filtros" 
                : "Agrega tu primer cliente para comenzar"}
            </p>
            {!search && statusFilter === "all" && (
              <Button onClick={() => setShowAddClient(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar cliente
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <Link key={client.id} to={createPageUrl(`ClientDetail?id=${client.id}`)}>
                <ClientCard client={client} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        open={showAddClient}
        onOpenChange={setShowAddClient}
        onSubmit={(data) => createClientMutation.mutate(data)}
        isLoading={createClientMutation.isPending}
      />
    </div>
  );
}