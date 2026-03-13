import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Loader2, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';
import FactorizedReport from "@/components/reports/FactorizedReport";

export default function FactorizedReportPage() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: documents = [], isLoading: loadingDocuments } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list()
  });

  const isLoading = loadingClients || loadingDocuments;

  const exportToExcel = () => {
    const factorizedDocs = documents.filter(d => d.status === "factorizada");
    const data = factorizedDocs.map(doc => {
      const client = clients.find(c => c.id === doc.client_id);
      return {
        'Cliente': client?.name || 'N/A',
        'Número Documento': doc.document_number,
        'Tipo': doc.document_type,
        'Monto': doc.amount,
        'Fecha Emisión': doc.issue_date ? format(new Date(doc.issue_date), "dd/MM/yyyy", { locale: es }) : 'N/A',
        'Fecha Vencimiento': doc.due_date ? format(new Date(doc.due_date), "dd/MM/yyyy", { locale: es }) : 'N/A'
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Facturas Factorizadas');
    XLSX.writeFile(wb, `facturas_factorizadas_${format(new Date(), "ddMMyyyy")}.xlsx`);
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
              <h1 className="text-2xl font-bold text-slate-900">Facturas Factorizadas</h1>
              <p className="text-slate-500 mt-1">Documentos en proceso de factoraje</p>
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
          <FactorizedReport documents={documents} clients={clients} />
        )}
      </div>
    </div>
  );
}