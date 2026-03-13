import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Loader2, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';
import DailyPromisesSummary from "@/components/reports/DailyPromisesSummary";

export default function DailyPromisesReportPage() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["logs"],
    queryFn: () => base44.entities.CollectionLog.list("-contact_date", 1000)
  });

  const isLoading = loadingClients || loadingLogs;

  const exportToExcel = () => {
    const promiseLogs = logs.filter(l => l.result === "promesa_pago" && l.promised_date);
    const promisesByDate = promiseLogs.reduce((acc, log) => {
      const dateKey = format(new Date(log.promised_date), "yyyy-MM-dd");
      if (!acc[dateKey]) {
        acc[dateKey] = { count: 0, total: 0 };
      }
      acc[dateKey].count += 1;
      acc[dateKey].total += log.promised_amount || 0;
      return acc;
    }, {});

    const data = Object.entries(promisesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        'Fecha': format(new Date(date), "dd/MM/yyyy", { locale: es }),
        'Cantidad Promesas': data.count,
        'Monto Total': data.total
      }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Promesas Diarias');
    XLSX.writeFile(wb, `promesas_diarias_${format(new Date(), "ddMMyyyy")}.xlsx`);
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
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Resumen Diario de Promesas</h1>
              <p className="text-slate-500 mt-1">Promesas consolidadas por día</p>
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
          <DailyPromisesSummary logs={logs} clients={clients} />
        )}
      </div>
    </div>
  );
}