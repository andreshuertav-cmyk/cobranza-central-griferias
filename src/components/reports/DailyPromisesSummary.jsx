import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";

export default function DailyPromisesSummary({ logs, clients }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
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
        count: 0,
        logs: []
      };
    }
    acc[date].totalAmount += log.promised_amount || 0;
    acc[date].count += 1;
    acc[date].logs.push(log);
    return acc;
  }, {});

  const totalPromised = Object.values(promisesByDate).reduce((sum, item) => sum + item.totalAmount, 0);

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day of week for first day (0 = Sunday, need to adjust to Monday = 0)
  const firstDayOfWeek = (monthStart.getDay() + 6) % 7;

  // Find data for selected date
  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const selectedData = selectedDateStr ? promisesByDate[selectedDateStr] : null;

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
          {promises.length} promesa{promises.length !== 1 ? 's' : ''}
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Calendar */}
        <Card className="overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="p-4">
            {/* Days of week */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before month starts */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Actual days */}
              {daysInMonth.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const hasPromises = promisesByDate[dateStr];
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square rounded-lg text-sm font-medium transition-all
                      ${hasPromises 
                        ? 'bg-blue-100 text-blue-900 hover:bg-blue-200' 
                        : 'text-slate-600 hover:bg-slate-100'
                      }
                      ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                      ${isToday && !isSelected ? 'border-2 border-blue-500' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Selected day details */}
        <Card className="overflow-hidden">
          <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">
              {selectedDate 
                ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })
                : "Selecciona un día"
              }
            </h3>
          </div>

          <div className="p-6">
            {!selectedDate ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Haz click en un día del calendario</p>
              </div>
            ) : !selectedData ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Sin promesas de pago este día</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Total del día</p>
                  <p className="text-3xl font-bold text-blue-900">
                    ${selectedData.totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {selectedData.count} promesa{selectedData.count !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-700">Detalle por cliente:</p>
                  {(() => {
                    // Group by client
                    const byClient = {};
                    selectedData.logs.forEach(log => {
                      if (!byClient[log.client_id]) {
                        const client = clients.find(c => c.id === log.client_id);
                        byClient[log.client_id] = {
                          name: client?.name || "Cliente desconocido",
                          amount: 0,
                          logs: []
                        };
                      }
                      byClient[log.client_id].amount += log.promised_amount || 0;
                      byClient[log.client_id].logs.push(log);
                    });

                    return Object.values(byClient).map((clientData, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-slate-900">{clientData.name}</p>
                          <p className="text-lg font-bold text-blue-900">
                            ${clientData.amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="space-y-1 pt-2 border-t border-slate-200">
                          {clientData.logs.map((log, logIdx) => (
                            <div key={logIdx} className="flex justify-between items-start text-xs">
                              <div className="flex-1">
                                <p className="text-slate-600">{log.notes || "Sin notas"}</p>
                                <p className="text-slate-400">
                                  {format(parseISO(log.contact_date), "HH:mm", { locale: es })}
                                </p>
                              </div>
                              <p className="text-slate-700 font-medium ml-2">
                                ${(log.promised_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}