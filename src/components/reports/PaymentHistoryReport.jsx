import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, CreditCard, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const paymentMethodLabels = {
  tarjeta_credito: "Tarjeta Crédito",
  tarjeta_debito: "Tarjeta Débito",
  efectivo: "Efectivo",
  cheque: "Cheque",
  transferencia_electronica: "Transferencia",
  nota_credito: "Nota de Crédito",
  pagada_factoring: "Factoring"
};

const paymentMethodColors = {
  tarjeta_credito: "bg-blue-100 text-blue-700",
  tarjeta_debito: "bg-indigo-100 text-indigo-700",
  efectivo: "bg-green-100 text-green-700",
  cheque: "bg-amber-100 text-amber-700",
  transferencia_electronica: "bg-purple-100 text-purple-700",
  nota_credito: "bg-orange-100 text-orange-700",
  pagada_factoring: "bg-teal-100 text-teal-700"
};

export default function PaymentHistoryReport({ logs, clients, documents }) {
  const [search, setSearch] = useState("");

  const paymentLogs = logs
    .filter(l => l.result === "pago_realizado")
    .sort((a, b) => new Date(b.contact_date) - new Date(a.contact_date));

  const filtered = paymentLogs.filter(log => {
    const client = clients.find(c => c.id === log.client_id);
    const doc = log.document_id ? documents.find(d => d.id === log.document_id) : null;
    const q = search.toLowerCase();
    return (
      !q ||
      client?.name?.toLowerCase().includes(q) ||
      doc?.document_number?.toLowerCase().includes(q) ||
      paymentMethodLabels[log.payment_method]?.toLowerCase().includes(q)
    );
  });

  const totalPaid = filtered.reduce((sum, l) => sum + (l.paid_amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg shrink-0">
            <DollarSign className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">Total cobrado</p>
            <p className="text-lg font-bold text-emerald-700 truncate">${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg shrink-0">
            <CreditCard className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">Pagos registrados</p>
            <p className="text-lg font-bold text-blue-700">{filtered.length}</p>
          </div>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          className="pl-10"
          placeholder="Buscar por cliente, documento o método..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Desktop Table */}
      <Card className="overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: "700px" }}>
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Fecha</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Monto</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Método</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Documento</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Notas</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No se encontraron pagos
                  </td>
                </tr>
              ) : (
                filtered.map(log => {
                  const client = clients.find(c => c.id === log.client_id);
                  const doc = log.document_id ? documents.find(d => d.id === log.document_id) : null;
                  return (
                    <tr key={log.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {format(new Date(log.contact_date), "dd MMM yyyy", { locale: es })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 max-w-[180px] truncate">
                        {client?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">
                        ${(log.paid_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {log.payment_method ? (
                          <Badge className={paymentMethodColors[log.payment_method] || "bg-slate-100 text-slate-700"}>
                            {paymentMethodLabels[log.payment_method] || log.payment_method}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {doc ? (
                          <span>{doc.document_number} <span className="text-xs text-slate-400">({doc.document_type})</span></span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">
                        {log.notes || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center text-slate-400">No se encontraron pagos</Card>
        ) : (
          filtered.map(log => {
            const client = clients.find(c => c.id === log.client_id);
            const doc = log.document_id ? documents.find(d => d.id === log.document_id) : null;
            return (
              <Card key={log.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{client?.name || "—"}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(log.contact_date), "dd MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <p className="font-bold text-emerald-700 whitespace-nowrap shrink-0">
                    ${(log.paid_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {log.payment_method && (
                    <Badge className={paymentMethodColors[log.payment_method] || "bg-slate-100 text-slate-700"}>
                      {paymentMethodLabels[log.payment_method] || log.payment_method}
                    </Badge>
                  )}
                  {doc && (
                    <span className="text-xs text-slate-500">{doc.document_number} <span className="text-slate-400">({doc.document_type})</span></span>
                  )}
                </div>
                {log.notes && (
                  <p className="text-xs text-slate-400 truncate">{log.notes}</p>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}