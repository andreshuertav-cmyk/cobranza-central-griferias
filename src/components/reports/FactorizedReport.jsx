import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function FactorizedReport({ documents, clients }) {
  const factorizedDocs = documents.filter(doc => doc.status === "factorizada");

  if (factorizedDocs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <p className="text-slate-500">No hay facturas factorizadas</p>
      </Card>
    );
  }

  const totalAmount = factorizedDocs.reduce((sum, doc) => sum + (doc.amount || 0), 0);
  const totalPaid = factorizedDocs.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total facturas</p>
              <p className="text-2xl font-bold text-slate-900">{factorizedDocs.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Monto total</p>
              <p className="text-2xl font-bold text-slate-900">
                ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Recuperado</p>
              <p className="text-2xl font-bold text-emerald-700">
                ${totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Documento
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                  Fecha venc.
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  Monto
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  Pagado
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                  Saldo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {factorizedDocs.map((doc) => {
                const client = clients.find(c => c.id === doc.client_id);
                const remaining = (doc.amount || 0) - (doc.paid_amount || 0);
                
                return (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{doc.document_number}</p>
                          <p className="text-xs text-slate-500">{doc.document_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-slate-900">{client?.name || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {doc.due_date ? (
                        <div className="flex items-center gap-1.5 text-sm text-slate-600">
                          <Calendar className="h-3 w-3" />
                          {(() => {
                            const dateStr = String(doc.due_date).trim();
                            let date;
                            if (dateStr.includes('-')) {
                              const parts = dateStr.split('-');
                              if (parts.length === 3) {
                                const [day, month, year] = parts;
                                if (day.length <= 2 && month.length <= 2 && year.length === 4) {
                                  date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                                }
                              }
                            }
                            if (!date) date = new Date(dateStr);
                            return format(date, "d MMM yyyy", { locale: es });
                          })()}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        ${(doc.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm text-emerald-600">
                        ${(doc.paid_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className={`text-sm font-semibold ${remaining > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                        ${remaining.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}