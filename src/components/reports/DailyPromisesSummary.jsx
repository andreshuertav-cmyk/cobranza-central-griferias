import { Card } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, DollarSign } from "lucide-react";

export default function DailyPromisesSummary({ logs }) {
  // Filter logs with payment promises
  const promises = logs.filter(log => 
    log.result === "promesa_pago" && log.promised_date && log.promised_amount
  );

  if (promises.length === 0) {
    return (
      <Card className="p-8 text-center bg-slate-50">
        <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">Sin promesas de pago registradas</p>
      </Card>
    );
  }

  // Group promises by promised_date and sum amounts
  const promisesByDate = promises.reduce((acc, log) => {
    const date = log.promised_date;
    if (!acc[date]) {
      acc[date] = {
        date: date,
        totalAmount: 0,
        count: 0
      };
    }
    acc[date].totalAmount += log.promised_amount || 0;
    acc[date].count += 1;
    return acc;
  }, {});

  // Convert to array and sort by date
  const sortedPromises = Object.values(promisesByDate).sort((a, b) => {
    return new Date(a.date) - new Date(b.date);
  });

  const totalPromised = sortedPromises.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600 mb-1">Total prometido</p>
            <p className="text-3xl font-bold text-blue-900">
              ${totalPromised.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <DollarSign className="h-12 w-12 text-blue-300" />
        </div>
        <p className="text-sm text-blue-600 mt-2">
          {promises.length} promesa{promises.length !== 1 ? 's' : ''} en {sortedPromises.length} día{sortedPromises.length !== 1 ? 's' : ''}
        </p>
      </Card>

      {/* Daily Breakdown */}
      <Card className="overflow-hidden">
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900">Consolidado diario</h3>
        </div>
        <div className="divide-y divide-slate-200">
          {sortedPromises.map((item, index) => {
            const dateObj = new Date(item.date);
            const isToday = format(new Date(), 'yyyy-MM-dd') === item.date;
            const isPast = dateObj < new Date() && !isToday;

            return (
              <div 
                key={index} 
                className={`px-6 py-4 hover:bg-slate-50 transition-colors ${
                  isPast ? 'bg-red-50' : isToday ? 'bg-amber-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      isPast ? 'bg-red-100' : isToday ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      <Calendar className={`h-5 w-5 ${
                        isPast ? 'text-red-600' : isToday ? 'text-amber-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {format(dateObj, "EEEE, d 'de' MMMM yyyy", { locale: es })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {item.count} promesa{item.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      ${item.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </p>
                    {isPast && (
                      <p className="text-xs text-red-600 font-medium">Vencida</p>
                    )}
                    {isToday && (
                      <p className="text-xs text-amber-600 font-medium">Hoy</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}