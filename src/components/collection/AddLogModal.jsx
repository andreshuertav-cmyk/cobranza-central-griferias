import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MapPin, MessageSquare, Mail, MessageCircle, Loader2 } from "lucide-react";

const contactTypes = [
  { value: "llamada", label: "Llamada", icon: Phone },
  { value: "visita", label: "Visita", icon: MapPin },
  { value: "mensaje", label: "Mensaje", icon: MessageSquare },
  { value: "correo", label: "Correo", icon: Mail },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle }
];

const resultTypes = [
  { value: "contactado", label: "Contactado" },
  { value: "no_contesto", label: "No contestó" },
  { value: "numero_equivocado", label: "Número equivocado" },
  { value: "promesa_pago", label: "Promesa de pago" },
  { value: "pago_realizado", label: "Pago realizado" },
  { value: "rechaza_pago", label: "Rechaza pago" },
  { value: "otro", label: "Otro" }
];

export default function AddLogModal({ open, onOpenChange, onSubmit, isLoading, totalDebt }) {
  const getLocalDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    contact_type: "llamada",
    contact_date: getLocalDateTime(),
    result: "",
    notes: "",
    promised_amount: "",
    promised_date: "",
    follow_up_date: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      promised_amount: formData.promised_amount ? parseFloat(formData.promised_amount) : null,
      contact_date: new Date(formData.contact_date).toISOString()
    });
  };

  const showPromiseFields = formData.result === "promesa_pago";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Registrar gestión</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de contacto</Label>
              <Select
                value={formData.contact_type}
                onValueChange={(v) => setFormData({ ...formData, contact_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contactTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <t.icon className="h-4 w-4" />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha y hora</Label>
              <Input
                type="datetime-local"
                value={formData.contact_date}
                onChange={(e) => setFormData({ ...formData, contact_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Resultado</Label>
            <Select
              value={formData.result}
              onValueChange={(v) => setFormData({ ...formData, result: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el resultado" />
              </SelectTrigger>
              <SelectContent>
                {resultTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showPromiseFields && (
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-4">
              {totalDebt !== undefined && (
                <div className="flex items-center justify-between pb-3 border-b border-blue-200">
                  <span className="text-sm text-blue-700">Deuda total del cliente:</span>
                  <span className="text-lg font-bold text-blue-900">${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto prometido</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.promised_amount}
                    onChange={(e) => setFormData({ ...formData, promised_amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de pago</Label>
                  <Input
                    type="date"
                    value={formData.promised_date}
                    onChange={(e) => setFormData({ ...formData, promised_date: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Detalles de la gestión..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Próximo seguimiento</Label>
            <Input
              type="date"
              value={formData.follow_up_date}
              onChange={(e) => setFormData({ ...formData, follow_up_date: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.result || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}