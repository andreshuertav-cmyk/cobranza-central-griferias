import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Calendar, TrendingUp, Phone, DollarSign, 
  Users, CheckCircle2, Clock, Loader2, Download
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  startOfDay, endOfDay, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, format, parseISO,
  isWithinInterval, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval
} from "date-fns";
import { es } from "date-fns/locale";

import StatsCard from "@/components/collection/StatsCard";
import CollectionChart from "@/components/reports/CollectionChart";
import ActivityChart from "@/components/reports/ActivityChart";
import TopCollectorsTable from "@/components/reports/TopCollectorsTable";
import PromisesReport from "@/components/reports/PromisesReport";

export default function Reports() {
  const [period, setPeriod] = useState("week"); // day, week, month
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

  // Calculate date ranges
  const getDateRange = () => {
    switch (period) {
      case "day":
        return {
          start: startOfDay(customDate),
          end: endOfDay(customDate)
        };
      case "week":
        return {
          start: startOfWeek(customDate, { locale: es }),
          end: endOfWeek(customDate, { locale: es })
        };
      case "month":
        return {
          start: startOfMonth(customDate),
          end: endOfMonth(customDate)
        };
      default:
        return { start: new Date(), end: new Date() };
    }
  };

  const dateRange = getDateRange();

  // Filter logs by period
  const periodLogs = logs.filter(log => {
    if (!log.contact_date) return false;
    const logDate = parseISO(log.contact_date);
    return isWithinInterval(logDate, dateRange);
  });

  // Calculate metrics
  const totalContacts = periodLogs.length;
  const successfulContacts = periodLogs.filter(l => 
    l.result === "contactado" || l.result === "promesa_pago" || l.result === "pago_realizado"
  ).length;
  const paymentPromises = periodLogs.filter(l => l.result === "promesa_pago").length;
  const paymentsReceived = periodLogs.filter(l => l.result === "pago_realizado").length;
  const promisedAmount = periodLogs
    .filter(l => l.result === "promesa_pago")
    .reduce((sum, l) => sum + (l.promised_amount || 0), 0);

  // Contact types breakdown
  const contactsByType = periodLogs.reduce((acc, log) => {
    acc[log.contact_type] = (acc[log.contact_type] || 0) + 1;
    return acc;
  }, {});

  // Results breakdown
  const resultsByType = periodLogs.reduce((acc, log) => {
    acc[log.result] = (acc[log.result] || 0) + 1;
    return acc;
  }, {});

  // Overdue documents
  const overdueDocuments = documents.filter(d => d.status === "vencido").length;
  const overdueAmount = documents
    .filter(d => d.status === "vencido")
    .reduce((sum, d) => sum + ((d.amount || 0) - (d.paid_amount || 0)), 0);

  const isLoading = loadingClients || loadingLogs || loadingDocuments;

  const exportReport = () => {
    const reportData = {
      periodo: period === "day" ? "Diario" : period === "week" ? "Semanal" : "Mensual",
      fecha: format(customDate, "dd/MM/yyyy", { locale: es }),
      rango: `${format(dateRange.start, "dd/MM/yyyy")} - ${format(dateRange.end, "dd/MM/yyyy")}`,
      metricas: {
        contactos_totales: totalContacts,
        contactos_exitosos: successfulContacts,
        promesas_pago: paymentPromises,
        pagos_recibidos: paymentsReceived,
        monto_prometido: promisedAmount,
        documentos_vencidos: overdueDocuments,
        monto_vencido: overdueAmount
      },
      contactos_por_tipo: contactsByType,
      resultados: resultsByType
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reporte_cobranza_${format(new Date(), "ddMMyyyy")}.json`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl("Home")}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reportes de Cobranza</h1>
              <p className="text-slate-500 mt-1">
                {format(dateRange.start, "d MMM", { locale: es })} - {format(dateRange.end, "d MMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <Button onClick={exportReport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>

        {/* Period Selector */}
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
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatsCard
                title="Contactos"
                value={totalContacts}
                subtitle={`${successfulContacts} exitosos`}
                icon={Phone}
                variant="info"
              />
              <StatsCard
                title="Promesas"
                value={paymentPromises}
                subtitle={`$${promisedAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
                icon={Clock}
                variant="warning"
              />
              <StatsCard
                title="Pagos"
                value={paymentsReceived}
                icon={CheckCircle2}
                variant="success"
              />
              <StatsCard
                title="Docs vencidos"
                value={overdueDocuments}
                subtitle={`$${overdueAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
                icon={DollarSign}
                variant="danger"
              />
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <CollectionChart 
                logs={periodLogs} 
                dateRange={dateRange}
                period={period}
              />
              <ActivityChart 
                contactsByType={contactsByType}
                resultsByType={resultsByType}
              />
            </div>

            {/* Top Performers */}
            <TopCollectorsTable logs={periodLogs} />

            {/* Promises Report */}
            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Reporte de promesas de pago</h2>
              <PromisesReport logs={periodLogs} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}