import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, Phone, Mail, Plus, Edit2, Trash2, 
  Loader2, Calendar, DollarSign, TrendingUp, History,
  ChevronLeft, ChevronRight, Home
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import LogEntry from "@/components/collection/LogEntry";
import AddLogModal from "@/components/collection/AddLogModal";
import AddClientModal from "@/components/collection/AddClientModal";
import DocumentCard from "@/components/collection/DocumentCard";
import AddDocumentModal from "@/components/collection/AddDocumentModal";
import QuickPaymentModal from "@/components/collection/QuickPaymentModal";

const statusConfig = {
  al_corriente: { label: "Al día", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700 border-amber-200" },
  en_negociacion: { label: "En negociación", color: "bg-blue-100 text-blue-700 border-blue-200" },
  mora: { label: "En mora", color: "bg-red-100 text-red-700 border-red-200" },
  incobrable: { label: "Incobrable", color: "bg-slate-100 text-slate-700 border-slate-200" }
};

export default function ClientDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const clientId = urlParams.get("id");

  const [showAddLog, setShowAddLog] = useState(false);
  const [showEditClient, setShowEditClient] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddDocument, setShowAddDocument] = useState(false);
  const [editingLog, setEditingLog] = useState(null);
  const [showQuickPayment, setShowQuickPayment] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [editingDocument, setEditingDocument] = useState(null);

  const queryClient = useQueryClient();

  const { data: allClientsData, isLoading: loadingAllClients } = useQuery({
    queryKey: ["allClients"],
    queryFn: () => base44.entities.Client.list("-created_date", 10000)
  });

  const { data: client, isLoading: loadingClient } = useQuery({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const allClients = await base44.entities.Client.list("-created_date", 10000);
      return allClients.find(c => c.id === clientId);
    },
    enabled: !!clientId,
    retry: 1
  });

  // Find previous and next clients
  const currentIndex = allClientsData?.findIndex(c => c.id === clientId) ?? -1;
  const previousClient = currentIndex > 0 ? allClientsData[currentIndex - 1] : null;
  const nextClient = currentIndex >= 0 && currentIndex < (allClientsData?.length ?? 0) - 1 ? allClientsData[currentIndex + 1] : null;

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["logs", clientId],
    queryFn: () => base44.entities.CollectionLog.filter({ client_id: clientId }, "-contact_date"),
    enabled: !!clientId
  });

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ["documents", clientId],
    queryFn: () => base44.entities.Document.filter({ client_id: clientId }, "-due_date"),
    enabled: !!clientId
  });

  const createLogMutation = useMutation({
    mutationFn: async (data) => {
      if (editingLog) {
        // If editing, update the log
        await base44.entities.CollectionLog.update(editingLog.id, data);
        return { isEdit: true, data };
      } else {
        // If creating new, create the log
        await base44.entities.CollectionLog.create({ ...data, client_id: clientId });
        return { isEdit: false, data };
      }
    },
    onSuccess: async ({ isEdit, data }) => {
      // If we're editing a payment log, we need to recalculate
      if (isEdit && editingLog.result === "pago_realizado" && editingLog.paid_amount) {
        // Revert old payment
        const oldPaidAmount = editingLog.paid_amount;
        const newClientPaidAmount = Math.max(0, (client.paid_amount || 0) - oldPaidAmount);
        
        if (editingLog.document_id) {
          const doc = documents.find(d => d.id === editingLog.document_id);
          if (doc) {
            const newDocPaidAmount = Math.max(0, (doc.paid_amount || 0) - oldPaidAmount);
            await base44.entities.Document.update(editingLog.document_id, {
              paid_amount: newDocPaidAmount,
              status: newDocPaidAmount < doc.amount ? "vencido" : "pagado"
            });
          }
        }
        
        await base44.entities.Client.update(clientId, {
          paid_amount: newClientPaidAmount,
          status: newClientPaidAmount < client.total_debt ? "mora" : "al_corriente"
        });
      }
      
      // Now apply new payment if result is pago_realizado
      
      // Si es pago realizado, actualizar el paid_amount del cliente y del documento
      if (data.result === "pago_realizado" && data.paid_amount) {
        const newPaidAmount = (client.paid_amount || 0) + data.paid_amount;
        const totalDebt = client.total_debt || 0;
        
        // Si ya pagó toda la deuda, cambiar status a "al_corriente"
        const newStatus = newPaidAmount >= totalDebt ? "al_corriente" : client.status;
        
        await base44.entities.Client.update(clientId, {
          paid_amount: newPaidAmount,
          status: newStatus
        });
        
        // Si se especificó un documento, actualizarlo
        if (data.document_id) {
          const doc = documents.find(d => d.id === data.document_id);
          if (doc) {
            const docTotal = doc.amount || 0;
            const currentPaid = doc.paid_amount || 0;
            const paymentToApply = Math.min(data.paid_amount, docTotal - currentPaid);
            const newDocPaidAmount = currentPaid + paymentToApply;
            const newDocStatus = newDocPaidAmount >= docTotal ? "pagado" : doc.status;
            
            await base44.entities.Document.update(data.document_id, {
              paid_amount: newDocPaidAmount,
              status: newDocStatus
            });
          }
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["logs", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["documents", clientId] });
      setShowAddLog(false);
      setEditingLog(null);
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowEditClient(false);
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: () => base44.entities.Client.delete(clientId),
    onSuccess: () => {
      window.location.href = createPageUrl("Home");
    }
  });

  const createDocumentMutation = useMutation({
    mutationFn: (data) => {
      if (editingDocument) {
        return base44.entities.Document.update(editingDocument.id, data);
      }
      return base44.entities.Document.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", clientId] });
      setShowAddDocument(false);
      setEditingDocument(null);
    }
  });

  const quickPaymentMutation = useMutation({
    mutationFn: async (amount) => {
      const doc = selectedDocument;
      const docTotal = doc.amount || 0;
      const currentPaid = doc.paid_amount || 0;
      const paymentToApply = Math.min(amount, docTotal - currentPaid);
      const newDocPaidAmount = currentPaid + paymentToApply;
      const newDocStatus = newDocPaidAmount >= docTotal ? "pagado" : doc.status;
      
      await base44.entities.Document.update(doc.id, {
        paid_amount: newDocPaidAmount,
        status: newDocStatus
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      setShowQuickPayment(false);
      setSelectedDocument(null);
    }
  });

  const factorizeMutation = useMutation({
    mutationFn: async (doc) => {
      await base44.entities.Document.update(doc.id, {
        status: "factorizada"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    }
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (logId) => {
      // Buscar el log antes de borrarlo
      const logToDelete = logs.find(l => l.id === logId);
      
      // Si era un pago realizado, revertir el pago
      if (logToDelete && logToDelete.result === "pago_realizado" && logToDelete.paid_amount) {
        const newPaidAmount = Math.max(0, (client.paid_amount || 0) - logToDelete.paid_amount);
        await base44.entities.Client.update(clientId, {
          paid_amount: newPaidAmount,
          status: newPaidAmount < client.total_debt ? "mora" : "al_corriente"
        });
        
        // Si había un documento asociado, revertir también su pago
        if (logToDelete.document_id) {
          const doc = documents.find(d => d.id === logToDelete.document_id);
          if (doc) {
            const newDocPaidAmount = Math.max(0, (doc.paid_amount || 0) - logToDelete.paid_amount);
            await base44.entities.Document.update(logToDelete.document_id, {
              paid_amount: newDocPaidAmount,
              status: newDocPaidAmount < doc.amount ? "vencido" : "pagado"
            });
          }
        }
      }
      
      await base44.entities.CollectionLog.delete(logId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs", clientId] });
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["documents", clientId] });
    }
  });

  if (loadingClient) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Cliente no encontrado</h2>
          <Link to={createPageUrl("Home")}>
            <Button variant="outline">Volver al inicio</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Calcular deuda real desde documentos
  const totalDebtFromDocs = documents.reduce((sum, doc) => sum + (doc.amount || 0), 0);
  const totalPaidFromDocs = documents.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0);
  const remaining = totalDebtFromDocs - totalPaidFromDocs;
  const progress = totalDebtFromDocs > 0 ? (totalPaidFromDocs / totalDebtFromDocs) * 100 : 0;
  
  // Verificar si hay documentos vencidos actualmente
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const hasOverdueDocuments = documents.some(doc => {
    const docRemaining = (doc.amount || 0) - (doc.paid_amount || 0);
    if (docRemaining <= 0) return false; // Ya está pagado
    
    if (!doc.due_date) return false;
    
    // Parse due date
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
    
    return dueDate < today; // Está vencido
  });
  
  // Determinar el estado real basado en el saldo y documentos vencidos
  const actualStatus = remaining <= 0 ? "al_corriente" : 
                      hasOverdueDocuments ? "mora" : 
                      "pendiente";
  const status = statusConfig[actualStatus] || statusConfig.pendiente;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed Navigation Buttons */}
      <div className="fixed top-1/2 left-4 -translate-y-1/2 z-50">
        {previousClient ? (
          <Link to={createPageUrl(`ClientDetail?id=${previousClient.id}`)}>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </Link>
        ) : (
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-slate-100 text-slate-300 cursor-not-allowed"
            disabled
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="fixed top-1/2 right-4 -translate-y-1/2 z-50">
        {nextClient ? (
          <Link to={createPageUrl(`ClientDetail?id=${nextClient.id}`)}>
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </Link>
        ) : (
          <Button
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-slate-100 text-slate-300 cursor-not-allowed"
            disabled
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <Link to={createPageUrl("Home")}>
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            <Home className="h-6 w-6" />
          </Button>
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{client.name}</h1>
              <Badge className={cn("border", status.color)}>{status.label}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowEditClient(true)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Client Info Card */}
        <Card className="p-6 mb-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Información de contacto</h3>
              <div className="space-y-2">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-slate-700 hover:text-slate-900">
                    <Phone className="h-4 w-4 text-slate-400" />
                    {client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-slate-700 hover:text-slate-900">
                    <Mail className="h-4 w-4 text-slate-400" />
                    {client.email}
                  </a>
                )}
                {!client.phone && !client.email && (
                  <p className="text-slate-400 text-sm">Sin información de contacto</p>
                )}
              </div>
              {client.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-slate-600">{client.notes}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Estado de cuenta</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs text-slate-500 mb-1">Deuda total</p>
                    <p className="text-xl font-bold text-slate-900">
                      ${totalDebtFromDocs.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-xs text-emerald-600 mb-1">Pagado</p>
                    <p className="text-xl font-bold text-emerald-700">
                      ${totalPaidFromDocs.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-500">Progreso de pago</span>
                    <span className="font-semibold text-slate-900">{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  <p className="text-right text-sm text-slate-500 mt-2">
                    Saldo: <span className="font-semibold text-slate-900">${remaining.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Documents Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-900">Documentos en mora</h2>
            </div>
            <Button onClick={() => setShowAddDocument(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="h-3 w-3" />
              Agregar documento
            </Button>
          </div>

          {loadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : documents.length === 0 ? (
            <Card className="p-8 text-center bg-slate-50">
              <DollarSign className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Sin documentos registrados</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <DocumentCard 
                  key={doc.id} 
                  document={doc}
                  onPayment={(doc) => {
                    setSelectedDocument(doc);
                    setShowQuickPayment(true);
                  }}
                  onEdit={(doc) => {
                    setEditingDocument(doc);
                    setShowAddDocument(true);
                  }}
                  onFactorize={(doc) => factorizeMutation.mutate(doc)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Collection History */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Historial de gestiones</h2>
          </div>
          <Button onClick={() => setShowAddLog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva gestión
          </Button>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : logs.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">Sin gestiones</h3>
            <p className="text-slate-500 mb-4">Registra la primera gestión de cobranza</p>
            <Button onClick={() => setShowAddLog(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Registrar gestión
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <LogEntry 
                key={log.id} 
                log={log}
                documents={documents}
                onEdit={(log) => {
                  setEditingLog(log);
                  setShowAddLog(true);
                }}
                onDelete={(logId) => deleteLogMutation.mutate(logId)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddLogModal
        open={showAddLog}
        onOpenChange={(open) => {
          setShowAddLog(open);
          if (!open) setEditingLog(null);
        }}
        onSubmit={(data) => createLogMutation.mutate(data)}
        isLoading={createLogMutation.isPending}
        totalDebt={remaining}
        documents={documents}
        editLog={editingLog}
      />

      <AddClientModal
        open={showEditClient}
        onOpenChange={setShowEditClient}
        onSubmit={(data) => updateClientMutation.mutate(data)}
        isLoading={updateClientMutation.isPending}
        editClient={client}
      />

      <AddDocumentModal
        open={showAddDocument}
        onOpenChange={(open) => {
          setShowAddDocument(open);
          if (!open) setEditingDocument(null);
        }}
        onSubmit={(data) => createDocumentMutation.mutate(data)}
        isLoading={createDocumentMutation.isPending}
        clientId={clientId}
        editDocument={editingDocument}
      />

      <QuickPaymentModal
        open={showQuickPayment}
        onOpenChange={setShowQuickPayment}
        document={selectedDocument}
        onSubmit={(amount) => quickPaymentMutation.mutate(amount)}
        isLoading={quickPaymentMutation.isPending}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los registros de gestión asociados a este cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteClientMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteClientMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}