import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const paymentMethodLabels = {
  tarjeta_credito: "Tarjeta de Crédito",
  tarjeta_debito: "Tarjeta de Débito",
  efectivo: "Efectivo",
  cheque: "Cheque",
  transferencia_electronica: "Transferencia Electrónica",
  nota_credito: "Nota de Crédito",
  pagada_factoring: "Pagada a Factoring"
};

const COLORS = {
  tarjeta_credito: "#3b82f6",
  tarjeta_debito: "#06b6d4",
  efectivo: "#10b981",
  cheque: "#f59e0b",
  transferencia_electronica: "#8b5cf6",
  nota_credito: "#ec4899",
  pagada_factoring: "#f97316"
};

export default function PaymentMethodsReport({ logs }) {
  // Filter logs with payments
  const paymentLogs = logs.filter(log => log.result === "pago_realizado" && log.paid_amount > 0);

  if (paymentLogs.length === 0) {
    return (
      <Card className="p-8 text-center bg-slate-50">
        <p className="text-slate-500">No hay pagos registrados en el período seleccionado</p>
      </Card>
    );
  }

  // Group by payment method
  const paymentsByMethod = paymentLogs.reduce((acc, log) => {
    const method = log.payment_method || "sin_especificar";
    if (!acc[method]) {
      acc[method] = {
        method,
        count: 0,
        total: 0
      };
    }
    acc[method].count++;
    acc[method].total += log.paid_amount || 0;
    return acc;
  }, {});

  // Convert to array for chart
  const chartData = Object.values(paymentsByMethod).map(item => ({
    name: paymentMethodLabels[item.method] || "Sin especificar",
    method: item.method,
    cantidad: item.count,
    monto: item.total
  })).sort((a, b) => b.monto - a.monto);

  const totalAmount = paymentLogs.reduce((sum, log) => sum + (log.paid_amount || 0), 0);
  const totalCount = paymentLogs.length;

  return (
    <Card className="p-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
        <div>
          <p className="text-sm text-slate-500 mb-1">Total pagos</p>
          <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500 mb-1">Monto total</p>
          <p className="text-2xl font-bold text-emerald-600">
            ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Monto por método de pago</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={120}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value) => `$${value.toLocaleString('es-MX')}`}
              labelStyle={{ color: '#1e293b' }}
            />
            <Bar dataKey="monto" name="Monto">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.method] || "#94a3b8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Método de pago</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Cantidad</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Monto total</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">% del total</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Promedio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {chartData.map((item, index) => {
              const percentage = ((item.monto / totalAmount) * 100).toFixed(1);
              const average = item.monto / item.cantidad;
              return (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[item.method] || "#94a3b8" }}
                      />
                      <span className="font-medium text-slate-900">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-700">{item.cantidad}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                    ${item.monto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-slate-700">{percentage}%</td>
                  <td className="px-4 py-3 text-sm text-right text-slate-600">
                    ${Math.round(average).toLocaleString('es-MX')}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="px-4 py-3 text-sm text-slate-900">Total</td>
              <td className="px-4 py-3 text-sm text-right text-slate-900">{totalCount}</td>
              <td className="px-4 py-3 text-sm text-right text-slate-900">
                ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </td>
              <td className="px-4 py-3 text-sm text-right text-slate-900">100%</td>
              <td className="px-4 py-3 text-sm text-right text-slate-900">
                ${(totalAmount / totalCount).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}