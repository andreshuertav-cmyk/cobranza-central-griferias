import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HandshakeIcon, Calendar, DollarSign, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format, parseISO, isPast, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function PromisesReport({ logs, clients, documents }) {
  const queryClient = useQueryClient();

  const markAsFulfilledMutation = useMutation({
    mutationFn: async (promise) => {
      // Create a payment log to mark the promise as fulfilled
      await base44.entities.CollectionLog.create({
        client_id: promise.client_id,
        contact_type: "otro",
        contact_date: new Date().toISOString(),
        result: "pago_realizado",
        paid_amount: promise.promised_amount,
        payment_method: "transferencia_electronica",
        document_id: promise.document_id || null,
        notes: `Cumplimiento de promesa del ${format(parseISO(promise.contact_date), "d MMM yyyy", { locale: es })}`
      });

      // Update document if specified
      if (promise.document_id) {
        const doc = documents.find(d => d.id === promise.document_id);
        if (doc) {
          const newPaid = (doc.paid_amount || 0) + promise.promised_amount;
          await base44.entities.Document.update(promise.document_id, {
            paid_amount: newPaid,
            status: newPaid >= doc.amount ? "pagado" : doc.status
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    }
  });

  // Filter promises
  const promises = logs.filter(log => log.result === "promesa_pago" && log.promised_date);

  if (promises.length === 0) {
    return (
      <Card className="p-12 text-center">
        <HandshakeIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Sin promesas de pago</h3>
        <p className="text-slate-500">No hay promesas registradas en este período</p>
      </Card>
    );
  }

  // Categorize promises
  const fulfilled = [];
  const pending = [];
  const overdue = [];

  promises.forEach(promise => {
    const promisedDate = parseISO(promise.promised_date);
    
    // Check if promise was fulfilled
    let wasPaid = false;
    
    // If promise has a specific document, check if that document is paid
    if (promise.document_id) {
      const doc = documents?.find(d => d.id === promise.document_id);
      if (doc) {
        const remaining = (doc.amount || 0) - (doc.paid_amount || 0);
        wasPaid = remaining <= 0;
      }
    } else {
      // No specific document: check if there was ANY payment after the promise
      wasPaid = logs.some(log => 
        log.client_id === promise.client_id && 
        log.result === "pago_realizado" &&
        parseISO(log.contact_date) >= parseISO(promise.contact_date)
      );
    }

    if (wasPaid) {
      fulfilled.push(promise);
    } else if (isPast(promisedDate) && !isToday(promisedDate)) {
      overdue.push(promise);
    } else {
      pending.push(promise);
    }
  });

  const totalPromised = promises.reduce((sum, p) => sum + (p.promised_amount || 0), 0);
  const fulfilledAmount = fulfilled.reduce((sum, p) => sum + (p.promised_amount || 0), 0);
  const pendingAmount = pending.reduce((sum, p) => sum + (p.promised_amount || 0), 0);
  const overdueAmount = overdue.reduce((sum, p) => sum + (p.promised_amount || 0), 0);

  const fulfillmentRate = promises.length > 0 ? (fulfilled.length / promises.length * 100).toFixed(0) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <HandshakeIcon className="h-4 w-4" />
            <span className="text-sm">Total promesas</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{promises.length}</p>
          <p className="text-sm text-slate-500 mt-1">${totalPromised.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Cumplidas</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{fulfilled.length}</p>
          <p className="text-sm text-green-600 mt-1">${fulfilledAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">{pending.length}</p>
          <p className="text-sm text-amber-600 mt-1">${pendingAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
        </Card>

        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <XCircle className="h-4 w-4" />
            <span className="text-sm">Vencidas</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{overdue.length}</p>
          <p className="text-sm text-red-600 mt-1">${overdueAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
        </Card>
      </div>

      {/* Fulfillment Rate */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-700">Tasa de cumplimiento</span>
          <span className="text-2xl font-bold text-slate-900">{fulfillmentRate}%</span>
        </div>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${fulfillmentRate}%` }}
          />
        </div>
      </Card>

      {/* Promise List */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HandshakeIcon className="h-5 w-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-900">Detalle de promesas</h3>
        </div>

        <div className="space-y-3">
          {promises.map((promise, idx) => {
            const promisedDate = parseISO(promise.promised_date);
            const wasPaid = fulfilled.includes(promise);
            const isOverdue = overdue.includes(promise);
            const client = clients?.find(c => c.id === promise.client_id);
            const clientName = client?.name || `Cliente ID: ${promise.client_id.slice(0, 8)}...`;
            
            return (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="font-medium text-slate-900">{clientName}</p>
                    {wasPaid && (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Cumplida
                      </Badge>
                    )}
                    {isOverdue && (
                      <Badge className="bg-red-100 text-red-700 border-red-200">
                        <XCircle className="h-3 w-3 mr-1" />
                        Vencida
                      </Badge>
                    )}
                    {!wasPaid && !isOverdue && (
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        <Clock className="h-3 w-3 mr-1" />
                        Pendiente
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Fecha promesa: {format(promisedDate, "d MMM yyyy", { locale: es })}
                    </span>
                    {promise.notes && (
                      <span className="text-slate-500 text-xs">{promise.notes}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">
                    ${(promise.promised_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs text-slate-500">
                    Registrado: {format(parseISO(promise.contact_date), "d MMM", { locale: es })}
                  </p>
                </div>
                {!wasPaid && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsFulfilledMutation.mutate(promise)}
                    disabled={markAsFulfilledMutation.isPending}
                    className="gap-1"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Marcar cumplida
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}