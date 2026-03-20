import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function AuditReport() {
  const { data: clients = [], isLoading: loadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("-created_date", 10000)
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ["documents"],
    queryFn: () => base44.entities.Document.list("-created_date", 10000)
  });

  const { data: logs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ["logs"],
    queryFn: () => base44.entities.CollectionLog.list("-contact_date", 10000)
  });

  if (loadingClients || loadingDocs || loadingLogs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const clientIds = new Set(clients.map(c => c.id));
  const activeDocuments = documents.filter(doc => doc.status !== "cancelado" && clientIds.has(doc.client_id));

  // Totals from documents
  const totalDebt = activeDocuments.reduce((s, d) => s + (d.amount || 0), 0);
  const totalPaidDocs = activeDocuments.reduce((s, d) => s + (d.paid_amount || 0), 0);
  const totalPending = totalDebt - totalPaidDocs;

  // Totals from payment logs
  const paymentLogs = logs.filter(l => l.result === "pago_realizado" && l.paid_amount > 0);
  const totalPaidLogs = paymentLogs.reduce((s, l) => s + (l.paid_amount || 0), 0);

  // Per-client breakdown
  const clientBreakdown = clients.map(client => {
    const clientDocs = activeDocuments.filter(d => d.client_id === client.id);
    const clientLogs = paymentLogs.filter(l => l.client_id === client.id);
    const debt = clientDocs.reduce((s, d) => s + (d.amount || 0), 0);
    const paidDocs = clientDocs.reduce((s, d) => s + (d.paid_amount || 0), 0);
    const paidLogs = clientLogs.reduce((s, l) => s + (l.paid_amount || 0), 0);
    const diff = paidDocs - paidLogs;
    return { client, debt, paidDocs, paidLogs, diff, docCount: clientDocs.length, logCount: clientLogs.length };
  }).filter(r => r.debt > 0 || r.paidDocs > 0).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const fmt = (n) => `$${(n || 0).toLocaleString('es-CL')}`;
  const diffTotal = totalPaidDocs - totalPaidLogs;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl("Home")}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Auditoría de Cobros</h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-xs text-slate-500 mb-1">Deuda total (docs)</p>
            <p className="text-xl font-bold text-slate-900">{fmt(totalDebt)}</p>
          </Card>
          <Card className="p-4 bg-emerald-50 border-emerald-200">
            <p className="text-xs text-emerald-600 mb-1">Cobrado (paid_amount docs)</p>
            <p className="text-xl font-bold text-emerald-700">{fmt(totalPaidDocs)}</p>
            <p className="text-xs text-slate-400 mt-1">Suma de paid_amount en documentos</p>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-xs text-blue-600 mb-1">Cobrado (registros de pago)</p>
            <p className="text-xl font-bold text-blue-700">{fmt(totalPaidLogs)}</p>
            <p className="text-xs text-slate-400 mt-1">Suma de pagos en gestiones</p>
          </Card>
          <Card className={`p-4 ${Math.abs(diffTotal) > 1000 ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
            <p className="text-xs text-slate-500 mb-1">Diferencia (docs - gestiones)</p>
            <p className={`text-xl font-bold ${Math.abs(diffTotal) > 1000 ? 'text-red-600' : 'text-slate-700'}`}>{fmt(diffTotal)}</p>
            <p className="text-xs text-slate-400 mt-1">{Math.abs(diffTotal) < 1000 ? "✓ Cuadra bien" : "⚠ Hay diferencia"}</p>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4">
            <p className="text-xs text-slate-500">Total documentos activos</p>
            <p className="text-2xl font-bold">{activeDocuments.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Registros de pago (gestiones)</p>
            <p className="text-2xl font-bold">{paymentLogs.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-slate-500">Saldo pendiente</p>
            <p className="text-2xl font-bold text-red-600">{fmt(totalPending)}</p>
          </Card>
        </div>

        {/* Per-client table */}
        <Card className="overflow-hidden">
          <div className="p-4 border-b bg-slate-50">
            <h2 className="font-semibold text-slate-800">Desglose por cliente</h2>
            <p className="text-xs text-slate-500 mt-1">Ordenado por mayor diferencia entre paid_amount en docs vs registros de gestión</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 text-xs">
                <tr>
                  <th className="text-left px-4 py-2">Cliente</th>
                  <th className="text-right px-4 py-2">Deuda</th>
                  <th className="text-right px-4 py-2">Cobrado (docs)</th>
                  <th className="text-right px-4 py-2">Cobrado (gestiones)</th>
                  <th className="text-right px-4 py-2">Diferencia</th>
                  <th className="text-right px-4 py-2">Docs / Pagos</th>
                </tr>
              </thead>
              <tbody>
                {clientBreakdown.map(({ client, debt, paidDocs, paidLogs, diff, docCount, logCount }) => (
                  <tr key={client.id} className={`border-t hover:bg-slate-50 ${Math.abs(diff) > 10000 ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2 font-medium text-slate-800">{client.name}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{fmt(debt)}</td>
                    <td className="px-4 py-2 text-right text-emerald-700 font-medium">{fmt(paidDocs)}</td>
                    <td className="px-4 py-2 text-right text-blue-700">{fmt(paidLogs)}</td>
                    <td className={`px-4 py-2 text-right font-semibold ${Math.abs(diff) > 10000 ? 'text-red-600' : 'text-slate-500'}`}>
                      {diff !== 0 ? fmt(diff) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-400 text-xs">{docCount} / {logCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}