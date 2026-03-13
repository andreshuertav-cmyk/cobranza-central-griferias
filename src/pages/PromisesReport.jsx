import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Home, Loader2, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, format, parseISO, isWithinInterval
} from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';
import PromisesReport from "@/components/reports/PromisesReport";

export default function PromisesReportPage() {
  const [period, setPeriod] = useState("week");
  const [customDate, setCustomDate] = useState(new Date());

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

  const getDateRange = () => {
    switch (period) {
      case "day":
        return { start: startOfDay(customDate), end: endOfDay(customDate) };
      case "week":
        return { start: startOfWeek(customDate, { locale: es }), end: endOfWeek(customDate, { locale: es }) };
      case "month":
        return { start: startOfMonth(customDate), end: endOfMonth(customDate) };
      default:
        return { start: new Date(), end: new Date() };
    }
  };

  const dateRange = getDateRange();

  const periodLogs = logs.filter(log => {
    if (!log.contact_date) return false;
    const logDate = parseISO(log.contact_date);
    return isWithinInterval(logDate, dateRange);
  });

  const isLoading = loadingClients || loadingLogs || loadingDocuments;

  const exportToExcel = () => {
    const promises = periodLogs.filter(l => l.result === "promesa_pago");
    const data = promises.map(log => {
      const client = clients.find(c => c.id === log.client_id);
      return {
        'Cliente': client?.name || 'N/A',
        'Fecha Contacto': format(new Date(log.contact_date), "dd/MM/yyyy", { locale: es }),
        'Monto Prometido': log.promised_amount || 0,
        'Fecha Prometida': log.promised_date ? format(new Date(log.promised_date), "dd/MM/yyyy", { locale: es }) : 'N/A',
        'Notas': log.notes || ''
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Promesas de Pago');
    XLSX.writeFile(wb, `promesas_pago_${format(new Date(), "ddMMyyyy")}.xlsx`);
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
              <h1 className="text-2xl font-bold text-slate-900">Detalle de Promesas del Período</h1>
              <p className="text-slate-500 mt-1">
                {format(dateRange.start, "d MMM", { locale: es })} - {format(dateRange.end, "d MMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <Button onClick={exportToExcel} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="day">Diario</TabsTrigger>
              <TabsTrigger value="week">Semanal</TabsTrigger>
              <TabsTrigger value="month">Mensual</TabsTrigger>
            </TabsList>
          </Tabs>
          <input
            type="date"
            value={format(customDate, "yyyy-MM-dd")}
            onChange={(e) => setCustomDate(new Date(e.target.value))}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <PromisesReport logs={periodLogs} clients={clients} documents={documents} />
        )}
      </div>
    </div>
  );
}