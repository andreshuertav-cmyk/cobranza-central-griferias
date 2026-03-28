import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function DebtEvolutionReport() {
  const [report, setReport] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-due_date", 10000),
  });

  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 10000),
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["logs"],
    queryFn: () => base44.entities.CollectionLog.list("-contact_date", 10000),
  });

  const isLoading = loadingDocs || loadingClients || loadingLogs;

  // Build monthly summary from documents
  const buildMonthlySummary = () => {
    const monthMap = {};

    documents.forEach((doc) => {
      if (!doc.due_date || doc.status === "cancelado") return;
      const dateStr = String(doc.due_date).trim();
      let date;
      if (dateStr.includes("-")) {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const [d, m, y] = parts;
          if (d.length <= 2 && m.length <= 2 && y.length === 4) {
            date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
          }
        }
      }
      if (!date) date = new Date(dateStr);
      if (isNaN(date)) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) {
        monthMap[key] = { total: 0, paid: 0, count: 0, overdue: 0 };
      }
      monthMap[key].total += doc.amount || 0;
      monthMap[key].paid += doc.paid_amount || 0;
      monthMap[key].count += 1;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const remaining = (doc.amount || 0) - (doc.paid_amount || 0);
      if (remaining > 0 && date < today) monthMap[key].overdue += remaining;
    });

    // Monthly payments from logs
    const paymentMap = {};
    logs.forEach((log) => {
      if (log.result !== "pago_realizado" || !log.paid_amount || log.notes?.includes("[SIN GESTION]")) return;
      const date = new Date(log.contact_date);
      if (isNaN(date)) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!paymentMap[key]) paymentMap[key] = 0;
      paymentMap[key] += log.paid_amount;
    });

    return { monthMap, paymentMap };
  };

  const generateReport = async () => {
    setIsGenerating(true);
    const { monthMap, paymentMap } = buildMonthlySummary();

    const sortedMonths = Object.keys(monthMap).sort();
    const totalClients = clients.length;
    const today = new Date();

    const monthsSummary = sortedMonths.map((key) => {
      const [year, month] = key.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const label = format(date, "MMMM yyyy", { locale: es });
      const m = monthMap[key];
      const pending = m.total - m.paid;
      const paymentsThisMonth = paymentMap[key] || 0;
      return `- ${label}: ${m.count} documento(s), deuda total $${m.total.toLocaleString("es-MX", { minimumFractionDigits: 0 })}, cobrado $${m.paid.toLocaleString("es-MX", { minimumFractionDigits: 0 })}, pendiente $${pending.toLocaleString("es-MX", { minimumFractionDigits: 0 })}, pagos registrados en el mes $${paymentsThisMonth.toLocaleString("es-MX", { minimumFractionDigits: 0 })}, vencido sin pagar $${m.overdue.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`;
    }).join("\n");

    const totalDebt = documents.filter(d => d.status !== "cancelado").reduce((s, d) => s + (d.amount || 0), 0);
    const totalPaid = documents.filter(d => d.status !== "cancelado").reduce((s, d) => s + (d.paid_amount || 0), 0);
    const totalPending = totalDebt - totalPaid;

    const prompt = `Eres un analista financiero experto en cobranza. Basándote en los siguientes datos reales de una cartera de créditos, redacta un reporte ejecutivo mensual en español, conciso y claro (máximo 400 palabras), que explique cómo ha variado la deuda mes a mes, qué tendencias se observan, si la cobranza está mejorando o empeorando, y cualquier punto de atención importante. No uses listas ni tablas, solo párrafos narrativos.

CONTEXTO GENERAL:
- Total de clientes: ${totalClients}
- Deuda total emitida: $${totalDebt.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
- Total cobrado: $${totalPaid.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
- Saldo pendiente actual: $${totalPending.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
- Fecha del reporte: ${format(today, "d 'de' MMMM 'de' yyyy", { locale: es })}

DESGLOSE POR MES (agrupado por vencimiento de documentos):
${monthsSummary}

Redacta el reporte ahora:`;

    const text = await base44.integrations.Core.InvokeLLM({ prompt });
    setReport(text);
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to={createPageUrl("Reports")}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Evolución de Deuda</h1>
            <p className="text-slate-500 text-sm mt-0.5">Reporte narrativo mensual generado por IA</p>
          </div>
        </div>

        {/* Generate button */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-600">
                  Genera un análisis en texto sobre cómo ha variado la cartera de créditos mes a mes, basado en tus documentos y pagos registrados.
                </p>
              </div>
              <Button
                onClick={generateReport}
                disabled={isLoading || isGenerating}
                className="gap-2 shrink-0"
              >
                {isGenerating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generando...</>
                ) : report ? (
                  <><RefreshCw className="h-4 w-4" /> Regenerar</>
                ) : (
                  <><FileText className="h-4 w-4" /> Generar reporte</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Report output */}
        {isGenerating && (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              <p className="text-slate-500 text-sm">Analizando datos y redactando reporte...</p>
            </CardContent>
          </Card>
        )}

        {report && !isGenerating && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Reporte — {format(new Date(), "MMMM yyyy", { locale: es })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                {report}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}