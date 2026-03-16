import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Loader2, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';
import PaymentHistoryReport from "@/components/reports/PaymentHistoryReport";

export default function PaymentHistoryReportPage() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["logs"],
    queryFn: () => base44.entities.CollectionLog.list("-contact_date", 1000)
  });

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list()
  });

  const isLoading = loadingClients || loadingLogs || loadingDocuments;

  const paymentMethodLabels = {
    tarjeta_credito: "Tarjeta Crédito",
    tarjeta_debito: "Tarjeta Débito",
    efectivo: "Efectivo",
    cheque: "Cheque",
    transferencia_electronica: "Transferencia",
    nota_credito: "Nota de Crédito",
    pagada_factoring: "Factoring"
  };

  const exportToExcel = () => {
    const paymentLogs = logs.filter(l => l.result === "pago_realizado");
    const data = paymentLogs.map(log => {
      const client = clients.find(c => c.id === log.client_id);
      const doc = log.document_id ? documents.find(d => d.id === log.document_id) : null;
      return {
        'Fecha': format(new Date(log.contact_date), "dd/MM/yyyy", { locale: es }),
        'Cliente': client?.name || 'N/A',
        'Monto Pagado': log.paid_amount || 0,
        'Método de Pago': paymentMethodLabels[log.payment_method] || log.payment_method || 'N/A',
        'Documento': doc?.document_number || 'N/A',
        'Tipo Documento': doc?.document_type || 'N/A',
        'Notas': log.notes || ''
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Historial de Pagos');
    XLSX.writeFile(wb, `historial_pagos_${format(new Date(), "ddMMyyyy")}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Reports")}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" size="icon">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Historial de Pagos</h1>
              <p className="text-slate-500 mt-1">Todos los pagos registrados por fecha, medio y documento</p>
            </div>
          </div>
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <PaymentHistoryReport logs={logs} clients={clients} documents={documents} />
        )}
      </div>
    </div>
  );
}