import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, ChevronRight, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig = {
  al_corriente: { label: "Al día", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700 border-amber-200" },
  en_negociacion: { label: "En negociación", color: "bg-blue-100 text-blue-700 border-blue-200" },
  mora: { label: "En mora", color: "bg-red-100 text-red-700 border-red-200" },
  incobrable: { label: "Incobrable", color: "bg-slate-100 text-slate-700 border-slate-200" }
};

const resultLabels = {
  contactado: "Contactado",
  no_contesto: "No contestó",
  numero_equivocado: "Número equivocado",
  promesa_pago: "Promesa de pago",
  pago_realizado: "Pago realizado",
  rechaza_pago: "Rechaza pago",
  pendiente: "Pendiente",
  otro: "Otro"
};

export default function ClientCard({ client, lastLog, onClick, totalDebt, totalPaid, maxDaysOverdue }) {
  const status = statusConfig[client.status] || statusConfig.pendiente;
  const remaining = totalDebt !== undefined ? (totalDebt - totalPaid) : ((client.total_debt || 0) - (client.paid_amount || 0));
  const progress = totalDebt !== undefined && totalDebt > 0 ? (totalPaid / totalDebt) * 100 : (client.total_debt > 0 ? ((client.paid_amount || 0) / client.total_debt) * 100 : 0);

  const isPendingLog = lastLog?.result === "pendiente";
  const isPromiseLog = lastLog?.result === "promesa_pago";

  // Determine color based on days overdue
  const getMoraColor = (days) => {
    if (days <= 30) return { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" };
    if (days <= 90) return { bg: "bg-red-500", text: "text-white", border: "border-red-600" };
    return { bg: "bg-red-700", text: "text-white", border: "border-red-800" };
  };

  const moraColor = client.status === "mora" && maxDaysOverdue > 0 ? getMoraColor(maxDaysOverdue) : null;

  return (
    <Card 
      className={cn(
        "p-4 hover:shadow-lg transition-all cursor-pointer border-slate-200 hover:border-slate-300 group",
        isPendingLog && "bg-amber-50 border-amber-300",
        isPromiseLog && !isPendingLog && "bg-blue-50 border-blue-300",
        client.status === "al_corriente" && !isPendingLog && !isPromiseLog && "bg-emerald-50 border-emerald-300",
        client.status === "mora" && !isPendingLog && !isPromiseLog && "bg-red-50 border-red-300"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {client.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-slate-900 truncate">{client.name}</h3>
                {maxDaysOverdue > 0 && (
                  <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                    {maxDaysOverdue}d
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                {client.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {client.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500">Avance de pago</span>
                <span className="font-medium text-slate-700">{progress.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
            
            {lastLog && (
              <div className={cn(
                "border rounded-lg px-2 py-1.5",
                isPendingLog ? "bg-amber-100 border-amber-300" : "bg-blue-50 border-blue-200"
              )}>
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className={cn("h-3 w-3 shrink-0", isPendingLog ? "text-amber-600" : "text-blue-600")} />
                  <span className={cn("font-medium", isPendingLog ? "text-amber-900" : "text-blue-900")}>
                    {resultLabels[lastLog.result] || lastLog.result}
                  </span>
                  <span className={isPendingLog ? "text-amber-600" : "text-blue-600"}>•</span>
                  <span className={isPendingLog ? "text-amber-700" : "text-blue-700"}>
                    {formatDistanceToNow(new Date(lastLog.contact_date), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <Badge className={cn("border text-xs font-medium", moraColor ? `${moraColor.bg} ${moraColor.text} ${moraColor.border}` : status.color)}>
            {status.label}
            {client.status === "mora" && maxDaysOverdue > 0 && (
              <span className="ml-1.5 font-semibold">
                {maxDaysOverdue}d
              </span>
            )}
          </Badge>
          <div className="mt-2">
            <p className="text-xs text-slate-500">Adeudo</p>
            <p className="text-lg font-bold text-slate-900">
              ${remaining.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-slate-500 transition-colors self-center" />
      </div>
    </Card>
  );
}