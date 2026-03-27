import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, MessageSquare, Mail, MessageCircle, Calendar, DollarSign, Trash2, Edit2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const contactIcons = {
  llamada: Phone,
  visita: MapPin,
  mensaje: MessageSquare,
  correo: Mail,
  whatsapp: MessageCircle
};

const resultConfig = {
  contactado: { label: "Contactado", color: "bg-emerald-100 text-emerald-700" },
  no_contesto: { label: "No contestó", color: "bg-slate-100 text-slate-600" },
  numero_equivocado: { label: "Número equivocado", color: "bg-red-100 text-red-700" },
  promesa_pago: { label: "Promesa de pago", color: "bg-blue-100 text-blue-700" },
  pago_realizado: { label: "Pago realizado", color: "bg-emerald-100 text-emerald-700" },
  rechaza_pago: { label: "Rechaza pago", color: "bg-red-100 text-red-700" },
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  otro: { label: "Otro", color: "bg-slate-100 text-slate-600" }
};

const paymentMethodLabels = {
  tarjeta_credito: "Tarjeta de Crédito",
  tarjeta_debito: "Tarjeta de Débito",
  efectivo: "Efectivo",
  cheque: "Cheque",
  transferencia_electronica: "Transferencia Electrónica",
  nota_credito: "Nota de Crédito",
  pagada_factoring: "Pagada a Factoring"
};

export default function LogEntry({ log, onDelete, onEdit, documents }) {
  const Icon = contactIcons[log.contact_type] || Phone;
  const result = resultConfig[log.result] || resultConfig.otro;
  
  // Get document number if document_id exists
  const relatedDoc = documents?.find(d => d.id === log.document_id);

  return (
    <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-sm transition-all">
      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-sm font-medium text-slate-900 capitalize">
              {log.contact_type}
            </p>
            <p className="text-xs text-slate-500">
              {log.contact_date && format(new Date(log.contact_date), "d MMM yyyy, HH:mm", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Badge className={cn("text-xs", result.color)}>
              {result.label}
            </Badge>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-blue-600"
                onClick={() => onEdit(log)}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-red-600"
                onClick={() => onDelete(log.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {log.notes && (
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{log.notes}</p>
        )}

        <div className="flex flex-wrap gap-3 mt-3">
          {log.paid_amount > 0 && log.result === "pago_realizado" && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Pagó: ${log.paid_amount.toLocaleString('es-MX')}</span>
              </div>
              {relatedDoc && (
                <p className="text-xs text-slate-500 ml-5">
                  Factura Nº {relatedDoc.document_number}
                </p>
              )}
              {log.payment_method && (
                <p className="text-xs text-slate-500 ml-5">
                  {paymentMethodLabels[log.payment_method] || log.payment_method}
                </p>
              )}
            </div>
          )}
          {log.promised_amount > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Promesa: ${log.promised_amount.toLocaleString('es-MX')}</span>
            </div>
          )}
          {log.promised_date && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
              <Calendar className="h-3.5 w-3.5" />
              <span>Fecha: {format(new Date(log.promised_date + 'T12:00:00'), "d MMM", { locale: es })}</span>
            </div>
          )}
          {log.follow_up_date && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
              <Calendar className="h-3.5 w-3.5" />
              <span>Seguimiento: {format(new Date(log.follow_up_date + 'T12:00:00'), "d MMM", { locale: es })}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}