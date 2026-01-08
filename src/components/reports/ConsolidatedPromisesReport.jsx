import { Card } from "@/components/ui/card";
import { HandshakeIcon, TrendingUp } from "lucide-react";
import { 
  format, parseISO, startOfDay, endOfDay, 
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval,
  isWithinInterval
} from "date-fns";
import { es } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ConsolidatedPromisesReport({ logs, period, dateRange, clients }) {
  // Filter promises
  const promises = logs.filter(log => log.result === "promesa_pago" && log.promised_date);

  if (promises.length === 0) {
    return (
      <Card className="p-12 text-center">
        <HandshakeIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Sin promesas de pago</h3>
        <p className="text-slate-500">No hay promesas registradas en este período</p>
      </Card>
    );
  }

  // Generate time intervals based on period
  const generateIntervals = () => {
    switch (period) {
      case "day":
        return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
      case "week":
        return eachWeekOfInterval({ start: dateRange.start, end: dateRange.end }, { locale: es });
      case "month":
        return eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
      default:
        return [];
    }
  };

  const intervals = generateIntervals();

  // Consolidate promises by period
  const consolidatedData = intervals.map(date => {
    const periodStart = period === "day" ? startOfDay(date) :
                       period === "week" ? startOfWeek(date, { locale: es }) :
                       startOfMonth(date);
    
    const periodEnd = period === "day" ? endOfDay(date) :
                     period === "week" ? endOfWeek(date, { locale: es }) :
                     endOfMonth(date);

    const periodPromises = promises.filter(log => {
      const promisedDate = parseISO(log.promised_date);
      return isWithinInterval(promisedDate, { start: periodStart, end: periodEnd });
    });

    const totalPromises = periodPromises.length;
    const totalAmount = periodPromises.reduce((sum, p) => sum + (p.promised_amount || 0), 0);

    // Check if promise was fulfilled
    const fulfilled = periodPromises.filter(promise => {
      const client = clients?.find(c => c.id === promise.client_id);
      const clientHasNoDebt = client && (client.total_debt || 0) <= (client.paid_amount || 0);
      
      return clientHasNoDebt || logs.some(log => 
        log.client_id === promise.client_id && 
        log.result === "pago_realizado" &&
        parseISO(log.contact_date) >= parseISO(promise.contact_date)
      );
    }).length;

    const pending = totalPromises - fulfilled;

    return {
      period: period === "day" ? format(date, "d MMM", { locale: es }) :
              period === "week" ? `${format(periodStart, "d MMM", { locale: es })} - ${format(periodEnd, "d MMM", { locale: es })}` :
              format(date, "MMMM yyyy", { locale: es }),
      date: format(date, "yyyy-MM-dd"),
      total: totalPromises,
      cumplidas: fulfilled,
      pendientes: pending,
      monto: totalAmount
    };
  }).filter(d => d.total > 0); // Only show periods with promises

  // Calculate totals
  const totalPromises = promises.length;
  const totalAmount = promises.reduce((sum, p) => sum + (p.promised_amount || 0), 0);
  const totalFulfilled = promises.filter(promise => {
    const client = clients?.find(c => c.id === promise.client_id);
    const clientHasNoDebt = client && (client.total_debt || 0) <= (client.paid_amount || 0);
    
    return clientHasNoDebt || logs.some(log => 
      log.client_id === promise.client_id && 
      log.result === "pago_realizado" &&
      parseISO(log.contact_date) >= parseISO(promise.contact_date)
    );
  }).length;

  const fulfillmentRate = totalPromises > 0 ? ((totalFulfilled / totalPromises) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <HandshakeIcon className="h-4 w-4" />
            <span className="text-sm">Total promesas</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totalPromises}</p>
        </Card>

        <Card className="p-4 bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-700 mb-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Monto total</span>
          </div>
          <p className="text-2xl font-bold text-emerald-900">
            ${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
        </Card>

        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <span className="text-sm">Cumplidas</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{totalFulfilled}</p>
          <p className="text-xs text-green-600 mt-1">{fulfillmentRate}% cumplimiento</p>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <span className="text-sm">Pendientes</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">{totalPromises - totalFulfilled}</p>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Promesas por {period === "day" ? "día" : period === "week" ? "semana" : "mes"}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={consolidatedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}
              formatter={(value, name) => {
                if (name === "monto") return [`$${value.toLocaleString('es-MX')}`, "Monto"];
                return [value, name === "cumplidas" ? "Cumplidas" : name === "pendientes" ? "Pendientes" : "Total"];
              }}
            />
            <Legend 
              formatter={(value) => {
                if (value === "cumplidas") return "Cumplidas";
                if (value === "pendientes") return "Pendientes";
                if (value === "monto") return "Monto prometido";
                return value;
              }}
            />
            <Bar dataKey="cumplidas" fill="#10b981" name="cumplidas" />
            <Bar dataKey="pendientes" fill="#f59e0b" name="pendientes" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Detalle por período</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Período</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Cumplidas</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Pendientes</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Monto total</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">% Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {consolidatedData.map((row, idx) => {
                const rate = row.total > 0 ? ((row.cumplidas / row.total) * 100).toFixed(0) : 0;
                return (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-900">{row.period}</td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">{row.total}</td>
                    <td className="py-3 px-4 text-sm text-green-600 text-right font-medium">{row.cumplidas}</td>
                    <td className="py-3 px-4 text-sm text-amber-600 text-right font-medium">{row.pendientes}</td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                      ${row.monto.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`font-medium ${rate >= 70 ? "text-green-600" : rate >= 40 ? "text-amber-600" : "text-red-600"}`}>
                        {rate}%
                      </span>
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