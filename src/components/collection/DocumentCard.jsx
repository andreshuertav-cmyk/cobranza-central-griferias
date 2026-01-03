import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, AlertCircle, DollarSign } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const documentTypeLabels = {
  factura: "Factura",
  pagare: "Pagaré",
  contrato: "Contrato",
  credito: "Crédito",
  otro: "Otro"
};

const statusConfig = {
  vigente: { label: "Vigente", color: "bg-blue-100 text-blue-700 border-blue-200" },
  vencido: { label: "Vencido", color: "bg-red-100 text-red-700 border-red-200" },
  pagado: { label: "Pagado", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelado: { label: "Cancelado", color: "bg-slate-100 text-slate-700 border-slate-200" }
};

export default function DocumentCard({ document, onPayment }) {
  const totalAmount = document.amount || 0;
  const paidAmount = document.paid_amount || 0;
  const remaining = Math.max(0, totalAmount - paidAmount);
  const progress = totalAmount > 0 ? Math.min(100, (paidAmount / totalAmount) * 100) : 0;
  
  // Parse date from DD-MM-YYYY format
  const dueDate = document.due_date ? (() => {
    const dateStr = String(document.due_date).trim();
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        // DD-MM-YYYY format
        if (day.length <= 2 && month.length <= 2 && year.length === 4) {
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
    }
    return new Date(dateStr);
  })() : null;
  
  const today = new Date();
  const daysOverdue = dueDate && dueDate < today ? differenceInDays(today, dueDate) : 0;
  
  // Calculate actual status based on current state
  const actualStatus = remaining <= 0 ? "pagado" : 
                      daysOverdue > 0 ? "vencido" : 
                      document.status === "cancelado" ? "cancelado" : "vigente";
  
  const status = statusConfig[actualStatus] || statusConfig.vigente;
  const isOverdue = daysOverdue > 0 && actualStatus !== "pagado";

  return (
    <Card className={cn(
      "p-4 border transition-all hover:shadow-md",
      isOverdue && "border-red-200 bg-red-50/30"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={cn(
            "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
            isOverdue ? "bg-red-100" : "bg-slate-100"
          )}>
            <FileText className={cn("h-5 w-5", isOverdue ? "text-red-600" : "text-slate-600")} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-slate-900">{document.document_number}</h3>
              <span className="text-xs text-slate-500">
                {documentTypeLabels[document.document_type] || "Documento"}
              </span>
            </div>

            {dueDate && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                <Calendar className="h-3 w-3" />
                <span>Vence: {format(dueDate, "d MMM yyyy", { locale: es })}</span>
                {isOverdue && (
                  <span className="flex items-center gap-1 text-red-600 font-medium ml-2">
                    <AlertCircle className="h-3 w-3" />
                    {daysOverdue} día{daysOverdue !== 1 ? "s" : ""} de mora
                  </span>
                )}
              </div>
            )}

            {document.notes && (
              <p className="text-sm text-slate-600 mb-2">{document.notes}</p>
            )}

            {/* Progress bar */}
            {document.paid_amount > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Pagado</span>
                  <span className="font-medium">{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <Badge className={cn("border text-xs mb-2", status.color)}>
            {status.label}
          </Badge>
          <div>
            <p className="text-xs text-slate-500">Adeudo</p>
            <p className="text-lg font-bold text-slate-900">
              ${remaining.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          </div>
          {document.paid_amount > 0 && (
            <p className="text-xs text-emerald-600 mt-1">
              Pagado: ${document.paid_amount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
            </p>
          )}
          {remaining > 0 && onPayment && (
            <Button
              size="sm"
              onClick={() => onPayment(document)}
              className="mt-3 w-full gap-1"
            >
              <DollarSign className="h-3 w-3" />
              Pagar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}