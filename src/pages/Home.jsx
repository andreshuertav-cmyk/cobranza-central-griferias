import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, Users, DollarSign, AlertTriangle, 
  TrendingUp, Calendar, Loader2, Upload, BarChart3, Trash2, ArrowUpDown, Settings, X, FileText, CreditCard
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, isToday, isTomorrow, isPast } from "date-fns";

import StatsCard from "@/components/collection/StatsCard";
import ClientCard from "@/components/collection/ClientCard";
import AddClientModal from "@/components/collection/AddClientModal";
import BulkUploadModal from "@/components/collection/BulkUploadModal";
import XmlToPdfModal from "@/components/collection/XmlToPdfModal";
import BulkPaymentModal from "@/components/collection/BulkPaymentModal";


export default function Home() {
  const urlParams = new URLSearchParams(window.location.search);
  
  const [search, setSearch] = useState(urlParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(urlParams.get("statusFilter") || "all");
  const [sortBy, setSortBy] = useState(urlParams.get("sortBy") || localStorage.getItem("sortBy") || "name");
  const [debtSortDirection, setDebtSortDirection] = useState(localStorage.getItem("debtSortDirection") || "desc");
  const [moraSortDirection, setMoraSortDirection] = useState(localStorage.getItem("moraSortDirection") || "desc");
  const [showAddClient, setShowAddClient] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showXmlToPdf, setShowXmlToPdf] = useState(false);
  const [showBulkPayment, setShowBulkPayment] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPendingFollowUps, setShowPendingFollowUps] = useState(urlParams.get("showPendingFollowUps") === "true");
  const [showDocsWithoutLogs, setShowDocsWithoutLogs] = useState(urlParams.get("showDocsWithoutLogs") === "true");
  
  const queryClient = useQueryClient();

  // Restore scroll position when returning to this page
  useEffect(() => {
    const savedScrollPosition = sessionStorage.getItem('homeScrollPosition');
    if (savedScrollPosition) {
      window.scrollTo(0, parseInt(savedScrollPosition));
      sessionStorage.removeItem('homeScrollPosition');
    }
  }, []);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date")
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["logs"],
    queryFn: () => base44.entities.CollectionLog.list("-contact_date", 100)
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list()
  });

  const createClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAddClient(false);
    }
  });

  const recalculateDebtsMutation = useMutation({
    mutationFn: async () => {
      const allClients = await base44.entities.Client.list("-created_date", 10000);
      const allDocs = await base44.entities.Document.list("-created_date", 10000);
      
      for (const client of allClients) {
        const clientDocs = allDocs.filter(doc => doc.client_id === client.id);
        
        const totalDebt = clientDocs.reduce((sum, doc) => sum + (doc.amount || 0), 0);
        const totalPaid = clientDocs.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0);
        const hasOverdue = clientDocs.some(doc => (doc.days_overdue || 0) > 0);
        
        await base44.entities.Client.update(client.id, {
          total_debt: totalDebt,
          paid_amount: totalPaid,
          status: hasOverdue ? "mora" : (totalPaid >= totalDebt ? "al_corriente" : client.status)
        });
      }
      
      return allClients.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      alert(`Se recalcularon las deudas de ${count} clientes`);
    }
  });

  const removeDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const allDocs = await base44.entities.Document.list("-created_date", 10000);
      
      // Group documents by client_id + document_number
      const docGroups = {};
      allDocs.forEach(doc => {
        const key = `${doc.client_id}_${doc.document_number}`;
        if (!docGroups[key]) {
          docGroups[key] = [];
        }
        docGroups[key].push(doc);
      });
      
      // Find duplicates and delete newer ones (keep oldest)
      let deletedCount = 0;
      for (const [key, docs] of Object.entries(docGroups)) {
        if (docs.length > 1) {
          // Sort by created_date (oldest first)
          docs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
          
          // Delete all except the first (oldest)
          for (let i = 1; i < docs.length; i++) {
            await base44.entities.Document.delete(docs[i].id);
            deletedCount++;
          }
        }
      }
      
      return deletedCount;
    },
    onSuccess: (deletedCount) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      alert(`Se eliminaron ${deletedCount} documentos duplicados`);
    }
  });

  const updateDocumentStatusMutation = useMutation({
    mutationFn: async () => {
      const allDocs = await base44.entities.Document.list("-created_date", 10000);
      const today = new Date();
      let updatedCount = 0;
      
      for (const doc of allDocs) {
        const remaining = (doc.amount || 0) - (doc.paid_amount || 0);
        
        // Calculate actual status
        let newStatus = doc.status;
        if (remaining <= 0) {
          newStatus = "pagado";
        } else if (doc.due_date) {
          const dueDate = new Date(doc.due_date);
          if (dueDate < today) {
            newStatus = "vencido";
          } else {
            newStatus = "vigente";
          }
        }
        
        // Update if status changed
        if (newStatus !== doc.status) {
          await base44.entities.Document.update(doc.id, { status: newStatus });
          updatedCount++;
        }
      }
      
      return updatedCount;
    },
    onSuccess: (updatedCount) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      alert(`Se actualizaron ${updatedCount} documentos`);
    }
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      // Helper to delete in batches
      const deleteInBatches = async (items, deleteFn, entityName, batchSize = 50) => {
        console.log(`Borrando ${items.length} ${entityName}...`);
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          await Promise.all(batch.map(item => deleteFn(item.id).catch(err => {
            console.error(`Error borrando ${entityName}:`, err);
          })));
          console.log(`Progreso ${entityName}: ${Math.min(i + batchSize, items.length)}/${items.length}`);
        }
        console.log(`✓ ${entityName} borrados completamente`);
      };

      // Fetch all data with no limits
      const allLogs = await base44.entities.CollectionLog.list("-created_date", 10000);
      const allDocs = await base44.entities.Document.list("-created_date", 10000);
      const allClients = await base44.entities.Client.list("-created_date", 10000);

      console.log(`Total a borrar: ${allLogs.length} logs, ${allDocs.length} docs, ${allClients.length} clientes`);

      // Delete in batches: logs first, then docs, then clients
      await deleteInBatches(allLogs, base44.entities.CollectionLog.delete, "logs");
      await deleteInBatches(allDocs, base44.entities.Document.delete, "documentos");
      await deleteInBatches(allClients, base44.entities.Client.delete, "clientes");
      
      console.log("✓ Borrado completo exitoso");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowDeleteConfirm(false);
    }
  });

  // Calculate stats from real documents (only from existing clients)
  const clientIds = new Set(clients.map(c => c.id));
  const validDocuments = documents.filter(doc => clientIds.has(doc.client_id));
  const totalDebt = validDocuments.reduce((sum, doc) => sum + (doc.amount || 0), 0);
  const totalPaid = validDocuments.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0);
  const pendingAmount = totalDebt - totalPaid;

  // Count clients with overdue documents
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const inMora = clients.filter(client => {
    return documents.some(doc => {
      if (doc.client_id !== client.id) return false;
      const docRemaining = (doc.amount || 0) - (doc.paid_amount || 0);
      if (docRemaining <= 0) return false;
      if (!doc.due_date) return false;

      const dateStr = String(doc.due_date).trim();
      let dueDate;
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          if (day.length <= 2 && month.length <= 2 && year.length === 4) {
            dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          }
        }
      }
      if (!dueDate) {
        dueDate = new Date(dateStr);
      }
      dueDate.setHours(0, 0, 0, 0);

      return dueDate < today;
    });
  }).length;

  // Get today's follow-ups (excluding clients that are already "al corriente")
  const todayFollowUps = logs.filter(log => {
    if (!log.follow_up_date) return false;
    const followDate = new Date(log.follow_up_date);
    const isPending = isToday(followDate) || (isPast(followDate) && !isToday(followDate));
    
    if (!isPending) return false;
    
    // Check if client is "al corriente"
    const clientDocs = documents.filter(d => d.client_id === log.client_id);
    const totalDebt = clientDocs.reduce((sum, doc) => sum + (doc.amount || 0), 0);
    const totalPaid = clientDocs.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0);
    const hasDebt = totalDebt > totalPaid;
    
    return hasDebt; // Only include if client still has debt
  });

  // Get client IDs with pending follow-ups
  const clientsWithPendingFollowUps = new Set(
    todayFollowUps.map(log => log.client_id)
  );

  // Count active payment promises
  const activePromises = logs.filter(log => {
    if (log.result !== "promesa_pago" || !log.promised_date) return false;
    
    const promiseDate = new Date(log.promised_date);
    promiseDate.setHours(0, 0, 0, 0);
    
    // Check if promise date is today or in the future (not expired)
    return promiseDate >= today;
  }).length;

  // Get clients with documents but no logs
  const clientsWithDocsButNoLogs = new Set(
    clients.filter(client => {
      const hasDocuments = documents.some(d => d.client_id === client.id);
      const hasLogs = logs.some(l => l.client_id === client.id);
      return hasDocuments && !hasLogs;
    }).map(c => c.id)
  );

  // Filter clients and remove duplicates by name
  const filteredClients = clients
    .filter(c => {
      const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase()) ||
                            c.phone?.includes(search);
      
      // Calculate actual status based on documents
      const clientDocs = documents.filter(d => d.client_id === c.id);
      const totalDebtFromDocs = clientDocs.reduce((sum, doc) => sum + (doc.amount || 0), 0);
      const totalPaidFromDocs = clientDocs.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0);
      const remaining = totalDebtFromDocs - totalPaidFromDocs;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const hasOverdueDocuments = clientDocs.some(doc => {
        const docRemaining = (doc.amount || 0) - (doc.paid_amount || 0);
        if (docRemaining <= 0) return false;

        if (!doc.due_date) return false;

        const dateStr = String(doc.due_date).trim();
        let dueDate;
        if (dateStr.includes('-')) {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const [day, month, year] = parts;
            if (day.length <= 2 && month.length <= 2 && year.length === 4) {
              dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            }
          }
        }
        if (!dueDate) {
          dueDate = new Date(dateStr);
        }
        dueDate.setHours(0, 0, 0, 0);

        return dueDate < today;
      });

      const actualStatus = remaining <= 0 ? "al_corriente" : 
                          hasOverdueDocuments ? "mora" : 
                          "pendiente";
      
      const matchesStatus = statusFilter === "all" || actualStatus === statusFilter;
      const matchesPendingFollowUps = !showPendingFollowUps || clientsWithPendingFollowUps.has(c.id);
      const matchesDocsWithoutLogs = !showDocsWithoutLogs || clientsWithDocsButNoLogs.has(c.id);
      return matchesSearch && matchesStatus && matchesPendingFollowUps && matchesDocsWithoutLogs;
    })
    .reduce((unique, client) => {
      // Keep only the first occurrence of each client name
      if (!unique.find(c => c.name === client.name)) {
        unique.push(client);
      }
      return unique;
    }, [])
    .sort((a, b) => {
      if (sortBy === "name") {
        return (a.name || "").localeCompare(b.name || "");
      } else if (sortBy === "debt") {
        const docsA = documents.filter(d => d.client_id === a.id);
        const docsB = documents.filter(d => d.client_id === b.id);
        const debtA = docsA.reduce((s, d) => s + (d.amount || 0), 0) - docsA.reduce((s, d) => s + (d.paid_amount || 0), 0);
        const debtB = docsB.reduce((s, d) => s + (d.amount || 0), 0) - docsB.reduce((s, d) => s + (d.paid_amount || 0), 0);
        return debtSortDirection === "desc" ? debtB - debtA : debtA - debtB;
      } else if (sortBy === "mora") {
        // Calculate max days overdue in real-time for sorting
        const getMoraA = () => {
          const clientDocsA = documents.filter(d => d.client_id === a.id);
          return Math.max(0, ...clientDocsA.map(doc => {
            const docRemaining = (doc.amount || 0) - (doc.paid_amount || 0);
            if (docRemaining <= 0 || !doc.due_date) return 0;

            const dateStr = String(doc.due_date).trim();
            let dueDate;
            if (dateStr.includes('-')) {
              const parts = dateStr.split('-');
              if (parts.length === 3) {
                const [day, month, year] = parts;
                if (day.length <= 2 && month.length <= 2 && year.length === 4) {
                  dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                }
              }
            }
            if (!dueDate) {
              dueDate = new Date(dateStr);
            }
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate >= today) return 0;
            
            const diffTime = today - dueDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
          }));
        };
        
        const getMoraB = () => {
          const clientDocsB = documents.filter(d => d.client_id === b.id);
          return Math.max(0, ...clientDocsB.map(doc => {
            const docRemaining = (doc.amount || 0) - (doc.paid_amount || 0);
            if (docRemaining <= 0 || !doc.due_date) return 0;

            const dateStr = String(doc.due_date).trim();
            let dueDate;
            if (dateStr.includes('-')) {
              const parts = dateStr.split('-');
              if (parts.length === 3) {
                const [day, month, year] = parts;
                if (day.length <= 2 && month.length <= 2 && year.length === 4) {
                  dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                }
              }
            }
            if (!dueDate) {
              dueDate = new Date(dateStr);
            }
            dueDate.setHours(0, 0, 0, 0);

            if (dueDate >= today) return 0;
            
            const diffTime = today - dueDate;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays;
          }));
        };
        
        const moraA = getMoraA();
        const moraB = getMoraB();
        return moraSortDirection === "desc" ? moraB - moraA : moraA - moraB;
      }
    });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Floating filters and search - fixed on the right, hidden on mobile */}
      <div className="hidden lg:flex fixed top-6 right-6 z-50 flex-col gap-3">
        {/* Search bar */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o teléfono..."
            className="pl-10 pr-10 shadow-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter buttons row */}
        <div className="flex gap-2 justify-end">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="shadow-lg">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pendiente">Pendientes</TabsTrigger>
              <TabsTrigger value="mora">En mora</TabsTrigger>
              <TabsTrigger value="en_negociacion">Negociando</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Sort buttons row */}
        <div className="flex gap-2 justify-end">
          <Button
            variant={sortBy === "name" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSortBy("name");
              localStorage.setItem("sortBy", "name");
            }}
            className="gap-2 shadow-lg"
          >
            <ArrowUpDown className="h-3 w-3" />
            Nombre
          </Button>
          <Button
            variant={sortBy === "debt" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (sortBy === "debt") {
                const newDirection = debtSortDirection === "desc" ? "asc" : "desc";
                setDebtSortDirection(newDirection);
                localStorage.setItem("debtSortDirection", newDirection);
              } else {
                setSortBy("debt");
                localStorage.setItem("sortBy", "debt");
              }
            }}
            className="gap-2 shadow-lg"
          >
            <ArrowUpDown className="h-3 w-3" />
            Deuda {sortBy === "debt" && (debtSortDirection === "desc" ? "↓" : "↑")}
          </Button>
          <Button
            variant={sortBy === "mora" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (sortBy === "mora") {
                const newDirection = moraSortDirection === "desc" ? "asc" : "desc";
                setMoraSortDirection(newDirection);
                localStorage.setItem("moraSortDirection", newDirection);
              } else {
                setSortBy("mora");
                localStorage.setItem("sortBy", "mora");
              }
            }}
            className="gap-2 shadow-lg"
          >
            <ArrowUpDown className="h-3 w-3" />
            Mora {sortBy === "mora" && (moraSortDirection === "desc" ? "↓" : "↑")}
          </Button>
        </div>

        {/* Ver sin gestiones button */}
        <div className="flex justify-end">
          <Button
            size="lg"
            variant={showDocsWithoutLogs ? "default" : "outline"}
            onClick={() => setShowDocsWithoutLogs(!showDocsWithoutLogs)}
            className="gap-2 h-14 px-6 rounded-full shadow-lg"
          >
            <AlertTriangle className="h-5 w-5" />
            {showDocsWithoutLogs ? "Mostrando sin gestiones" : "Ver sin gestiones"}
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bitácora de Cobranza</h1>
            <p className="text-slate-500 mt-1">Gestiona tus clientes y seguimientos</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => updateDocumentStatusMutation.mutate()}
                  disabled={updateDocumentStatusMutation.isPending}
                >
                  {updateDocumentStatusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Actualizar status
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => recalculateDebtsMutation.mutate()}
                  disabled={recalculateDebtsMutation.isPending}
                >
                  {recalculateDebtsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Recalcular deudas
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => removeDuplicatesMutation.mutate()}
                  disabled={removeDuplicatesMutation.isPending}
                >
                  {removeDuplicatesMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Limpiar duplicados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Borrar todo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to={createPageUrl("Reports")}>
              <Button variant="outline" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Reportes</span>
              </Button>
            </Link>
            <Button onClick={() => setShowBulkPayment(true)} variant="outline" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Registrar pagos</span>
            </Button>
            <Button onClick={() => setShowXmlToPdf(true)} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">XML a PDF</span>
            </Button>
            <Button onClick={() => setShowBulkUpload(true)} variant="outline" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Carga masiva</span>
            </Button>
            <Button onClick={() => setShowAddClient(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo cliente</span>
            </Button>
          </div>
        </div>
        
        {/* Mobile filters - shown only on mobile */}
        <div className="lg:hidden mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por nombre o teléfono..."
              className="pl-10 pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="pendiente" className="text-xs">Pendientes</TabsTrigger>
              <TabsTrigger value="mora" className="text-xs">En mora</TabsTrigger>
              <TabsTrigger value="en_negociacion" className="text-xs">Negociando</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Sort buttons */}
          <div className="flex gap-2">
            <Button
              variant={sortBy === "name" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSortBy("name");
                localStorage.setItem("sortBy", "name");
              }}
              className="gap-2 flex-1"
            >
              <ArrowUpDown className="h-3 w-3" />
              Nombre
            </Button>
            <Button
              variant={sortBy === "debt" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (sortBy === "debt") {
                  const newDirection = debtSortDirection === "desc" ? "asc" : "desc";
                  setDebtSortDirection(newDirection);
                  localStorage.setItem("debtSortDirection", newDirection);
                } else {
                  setSortBy("debt");
                  localStorage.setItem("sortBy", "debt");
                }
              }}
              className="gap-2 flex-1"
            >
              <ArrowUpDown className="h-3 w-3" />
              Deuda {sortBy === "debt" && (debtSortDirection === "desc" ? "↓" : "↑")}
            </Button>
            <Button
              variant={sortBy === "mora" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (sortBy === "mora") {
                  const newDirection = moraSortDirection === "desc" ? "asc" : "desc";
                  setMoraSortDirection(newDirection);
                  localStorage.setItem("moraSortDirection", newDirection);
                } else {
                  setSortBy("mora");
                  localStorage.setItem("sortBy", "mora");
                }
              }}
              className="gap-2 flex-1"
            >
              <ArrowUpDown className="h-3 w-3" />
              Mora {sortBy === "mora" && (moraSortDirection === "desc" ? "↓" : "↑")}
            </Button>
          </div>

          {/* Ver sin gestiones button */}
          <Button
            variant={showDocsWithoutLogs ? "default" : "outline"}
            onClick={() => setShowDocsWithoutLogs(!showDocsWithoutLogs)}
            className="gap-2 w-full"
          >
            <AlertTriangle className="h-4 w-4" />
            {showDocsWithoutLogs ? "Mostrando sin gestiones" : "Ver sin gestiones"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
          <StatsCard
            title="Promesas activas"
            value={activePromises}
            icon={Calendar}
            variant="info"
          />
        </div>

        {/* Today's Follow-ups Alert */}
        {todayFollowUps.length > 0 && (
          <button
            onClick={() => setShowPendingFollowUps(!showPendingFollowUps)}
            className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl w-full text-left hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <Calendar className="h-5 w-5" />
                  <span className="font-semibold">Seguimientos pendientes: {todayFollowUps.length}</span>
                </div>
                <p className="text-sm text-amber-600">
                  {showPendingFollowUps 
                    ? "Mostrando clientes con seguimientos pendientes"
                    : `Tienes ${todayFollowUps.length} seguimiento(s) programado(s) para hoy o atrasado(s). Click para filtrar.`
                  }
                </p>
              </div>
              {showPendingFollowUps && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPendingFollowUps(false);
                  }}
                >
                  Ver todos
                </Button>
              )}
            </div>
          </button>
        )}





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
                        {filteredClients.map((client) => {
                          const clientLogs = logs.filter(log => log.client_id === client.id)
                            .sort((a, b) => new Date(b.contact_date) - new Date(a.contact_date));
                          const lastLog = clientLogs.length > 0 ? clientLogs[0] : null;

                          // Calculate actual status based on documents
                          const clientDocs = documents.filter(d => d.client_id === client.id);
                          const totalDebtFromDocs = clientDocs.reduce((sum, doc) => sum + (doc.amount || 0), 0);
                          const totalPaidFromDocs = clientDocs.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0);
                          const remaining = totalDebtFromDocs - totalPaidFromDocs;

                          const today = new Date();
                          today.setHours(0, 0, 0, 0);

                          const hasOverdueDocuments = clientDocs.some(doc => {
                            const docRemaining = (doc.amount || 0) - (doc.paid_amount || 0);
                            if (docRemaining <= 0) return false;

                            if (!doc.due_date) return false;

                            const dateStr = String(doc.due_date).trim();
                            let dueDate;
                            if (dateStr.includes('-')) {
                              const parts = dateStr.split('-');
                              if (parts.length === 3) {
                                const [day, month, year] = parts;
                                if (day.length <= 2 && month.length <= 2 && year.length === 4) {
                                  dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                }
                              }
                            }
                            if (!dueDate) {
                              dueDate = new Date(dateStr);
                            }
                            dueDate.setHours(0, 0, 0, 0);

                            return dueDate < today;
                          });

                          const actualStatus = remaining <= 0 ? "al_corriente" : 
                                              hasOverdueDocuments ? "mora" : 
                                              "pendiente";

                          const clientWithStatus = { ...client, status: actualStatus };

                          // Calculate max days overdue in real-time
                          const maxDaysOverdue = Math.max(0, ...clientDocs.map(doc => {
                            const docRemaining = (doc.amount || 0) - (doc.paid_amount || 0);
                            if (docRemaining <= 0 || !doc.due_date) return 0;

                            const dateStr = String(doc.due_date).trim();
                            let dueDate;
                            if (dateStr.includes('-')) {
                              const parts = dateStr.split('-');
                              if (parts.length === 3) {
                                const [day, month, year] = parts;
                                if (day.length <= 2 && month.length <= 2 && year.length === 4) {
                                  dueDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                }
                              }
                            }
                            if (!dueDate) {
                              dueDate = new Date(dateStr);
                            }
                            dueDate.setHours(0, 0, 0, 0);

                            if (dueDate >= today) return 0;
                            
                            const diffTime = today - dueDate;
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            return diffDays;
                          }));

                          const filterParams = new URLSearchParams({
                            statusFilter,
                            sortBy,
                            search,
                            showPendingFollowUps: showPendingFollowUps.toString(),
                            showDocsWithoutLogs: showDocsWithoutLogs.toString()
                          }).toString();

                          return (
                            <Link 
                              key={client.id} 
                              to={createPageUrl(`ClientDetail?id=${client.id}&${filterParams}`)}
                              onClick={() => {
                                sessionStorage.setItem('homeScrollPosition', window.scrollY.toString());
                              }}
                            >
                              <ClientCard 
                                client={clientWithStatus} 
                                lastLog={lastLog}
                                totalDebt={totalDebtFromDocs}
                                totalPaid={totalPaidFromDocs}
                                maxDaysOverdue={maxDaysOverdue}
                              />
                            </Link>
                          );
                        })}
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

      {/* XML to PDF Modal */}
      <XmlToPdfModal open={showXmlToPdf} onOpenChange={setShowXmlToPdf} />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["clients"] });
          setShowBulkUpload(false);
        }}
      />



      {/* Delete All Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">¿Borrar toda la base de datos?</h3>
            <p className="text-slate-600 mb-6">
              Esta acción eliminará todos los clientes, documentos y registros de gestión. No se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancelar
              </Button>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
              >
                {deleteAllMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Borrar todo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}