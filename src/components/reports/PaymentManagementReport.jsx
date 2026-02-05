import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, DollarSign } from "lucide-react";
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from "date-fns";
import { es } from "date-fns/locale";

export default function PaymentManagementReport({ logs, clients }) {
  const [timeFilter, setTimeFilter] = useState("all"); // all, day, week, month

  // Calcular fecha de inicio según el filtro
  const getStartDate = () => {
    const now = new Date();
    switch (timeFilter) {
      case "day":
        return startOfDay(now);
      case "week":
        return startOfWeek(now, { weekStartsOn: 1 });
      case "month":
        return startOfMonth(now);
      default:
        return null;
    }
  };

  const startDate = getStartDate();

  // Filtrar solo pagos realizados y por fecha
  const paymentLogs = logs.filter(log => {
    if (log.result !== "pago_realizado" || !log.paid_amount || log.paid_amount <= 0) return false;
    
    if (startDate && log.contact_date) {
      const logDate = new Date(log.contact_date);
      return logDate >= startDate;
    }
    
    return true;
  });

  // Separar en pagos con gestión y sin gestión
  const paymentsWithManagement = paymentLogs.filter(log => !log.notes?.includes("[SIN GESTION]"));
  const paymentsWithoutManagement = paymentLogs.filter(log => log.notes?.includes("[SIN GESTION]"));

  // Calcular totales
  const totalWithManagement = paymentsWithManagement.reduce((sum, log) => sum + (log.paid_amount || 0), 0);
  const totalWithoutManagement = paymentsWithoutManagement.reduce((sum, log) => sum + (log.paid_amount || 0), 0);
  const totalPayments = totalWithManagement + totalWithoutManagement;

  // Calcular porcentajes
  const percentWithManagement = totalPayments > 0 ? (totalWithManagement / totalPayments) * 100 : 0;
  const percentWithoutManagement = totalPayments > 0 ? (totalWithoutManagement / totalPayments) * 100 : 0;

  // Función para obtener nombre del cliente
  const getClientName = (clientId) => {
    const client = clients?.find(c => c.id === clientId);
    return client?.name || "Cliente desconocido";
  };

  if (paymentLogs.length === 0) {
    return (
      <Card className="p-12 text-center">
        <DollarSign className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Sin pagos registrados</h3>
        <p className="text-slate-500">No hay pagos para mostrar en este reporte</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros de tiempo */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-slate-600 mr-2">Período:</span>
            <Button
              variant={timeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("all")}
            >
              Todo
            </Button>
            <Button
              variant={timeFilter === "day" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("day")}
            >
              Hoy
            </Button>
            <Button
              variant={timeFilter === "week" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("week")}
            >
              Esta Semana
            </Button>
            <Button
              variant={timeFilter === "month" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeFilter("month")}
            >
              Este Mes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Total Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              ${totalPayments.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {paymentLogs.length} pago{paymentLogs.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Con Gestión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">
              ${totalWithManagement.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-emerald-600 mt-1">
              {paymentsWithManagement.length} pago{paymentsWithManagement.length !== 1 ? 's' : ''} • {percentWithManagement.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-amber-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Sin Gestión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              ${totalWithoutManagement.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-amber-600 mt-1">
              {paymentsWithoutManagement.length} pago{paymentsWithoutManagement.length !== 1 ? 's' : ''} • {percentWithoutManagement.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso visual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribución de Pagos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex h-8 rounded-lg overflow-hidden">
              <div 
                className="bg-emerald-500 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${percentWithManagement}%` }}
              >
                {percentWithManagement > 10 && `${percentWithManagement.toFixed(0)}%`}
              </div>
              <div 
                className="bg-amber-500 flex items-center justify-center text-white text-sm font-medium"
                style={{ width: `${percentWithoutManagement}%` }}
              >
                {percentWithoutManagement > 10 && `${percentWithoutManagement.toFixed(0)}%`}
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Con Gestión</span>
              <span>Sin Gestión</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalle: Pagos con Gestión */}
      {paymentsWithManagement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Pagos con Gestión ({paymentsWithManagement.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentsWithManagement.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{getClientName(log.client_id)}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(log.contact_date), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-700">
                    ${log.paid_amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detalle: Pagos sin Gestión */}
      {paymentsWithoutManagement.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Pagos sin Gestión ({paymentsWithoutManagement.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentsWithoutManagement.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{getClientName(log.client_id)}</p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(log.contact_date), "d MMM yyyy, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">
                    ${log.paid_amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}