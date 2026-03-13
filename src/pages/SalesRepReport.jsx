import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Loader2, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import * as XLSX from 'xlsx';
import SalesRepReport from "@/components/reports/SalesRepReport";

export default function SalesRepReportPage() {
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
    const salesRepData = {};

    documents.forEach(doc => {
      if (!doc.notes) return;
      const match = doc.notes.match(/Vendedor:\s*([^|]+)/i);
      if (!match) return;
      const salesRep = match[1].trim();
      if (!salesRep) return;

      if (!salesRepData[salesRep]) {
        salesRepData[salesRep] = {
          clientIds: new Set(),
          totalDebt: 0,
          overdueDebt: 0,
          overdueClients: new Set()
        };
      }

      salesRepData[salesRep].clientIds.add(doc.client_id);
      const debt = (doc.amount || 0) - (doc.paid_amount || 0);
      salesRepData[salesRep].totalDebt += debt;

      if (doc.status === "vencido" && debt > 0) {
        salesRepData[salesRep].overdueDebt += debt;
        salesRepData[salesRep].overdueClients.add(doc.client_id);
      }
    });

    const data = Object.entries(salesRepData).map(([name, data]) => ({
      'Vendedor': name,
      'Total Clientes': data.clientIds.size,
      'Clientes en Mora': data.overdueClients.size,
      'Saldo Total': data.totalDebt,
      'Saldo en Mora': data.overdueDebt,
      '% Mora': data.clientIds.size > 0 ? Math.round((data.overdueClients.size / data.clientIds.size) * 100) : 0
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Vendedores');
    XLSX.writeFile(wb, `reporte_vendedores_${format(new Date(), "ddMMyyyy")}.xlsx`);
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
              <h1 className="text-2xl font-bold text-slate-900">Reporte por Vendedor</h1>
              <p className="text-slate-500 mt-1">Análisis de cartera por vendedor</p>
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
          <SalesRepReport documents={documents} clients={clients} />
        )}
      </div>
    </div>
  );
}