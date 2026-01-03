import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Mail, ChevronRight, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig = {
  al_corriente: { label: "Al corriente", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
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
  otro: "Otro"
};

export default function ClientCard({ client, lastLog, onClick }) {
  const status = statusConfig[client.status] || statusConfig.pendiente;
  const remaining = (client.total_debt || 0) - (client.paid_amount || 0);
  const progress = client.total_debt > 0 ? ((client.paid_amount || 0) / client.total_debt) * 100 : 0;

  return (
    <Card 
      className="p-4 hover:shadow-lg transition-all cursor-pointer border-slate-200 hover:border-slate-300 group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {client.name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">{client.name}</h3>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5">
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3 w-3 text-blue-600 shrink-0" />
                  <span className="text-blue-900 font-medium">
                    {resultLabels[lastLog.result] || lastLog.result}
                  </span>
                  <span className="text-blue-600">•</span>
                  <span className="text-blue-700">
                    {formatDistanceToNow(new Date(lastLog.contact_date), { addSuffix: true, locale: es })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <Badge className={cn("border text-xs font-medium", status.color)}>
            {status.label}
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