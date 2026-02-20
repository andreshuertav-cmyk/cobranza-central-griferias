import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  { value: "pendiente", label: "Pendiente" },
  { value: "otro", label: "Otro" }
];

const paymentMethods = [
  { value: "tarjeta_credito", label: "Tarjeta de Crédito" },
  { value: "tarjeta_debito", label: "Tarjeta de Débito" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
  { value: "transferencia_electronica", label: "Transferencia Electrónica" },
  { value: "nota_credito", label: "Nota de Crédito" },
  { value: "pagada_factoring", label: "Pagada a Factoring" }
];

export default function AddLogModal({ open, onOpenChange, onSubmit, isLoading, totalDebt, documents, editLog }) {
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
    contact_type: editLog?.contact_type || "llamada",
    contact_date: getLocalDateTime(),
    result: editLog?.result || "",
    notes: editLog?.notes || "",
    promised_amount: editLog?.promised_amount || "",
    promised_date: editLog?.promised_date ? editLog.promised_date.split('T')[0] : "",
    follow_up_date: editLog?.follow_up_date ? editLog.follow_up_date.split('T')[0] : "",
    paid_amount: editLog?.paid_amount || "",
    document_id: editLog?.document_id || "",
    payment_method: editLog?.payment_method || ""
  });

  const [selectedDocuments, setSelectedDocuments] = useState([]);

  // Update paid amount when selected documents change
  useEffect(() => {
    if (selectedDocuments.length > 0 && documents) {
      const total = selectedDocuments.reduce((sum, docId) => {
        const doc = documents.find(d => d.id === docId);
        if (doc) {
          const pending = (doc.amount || 0) - (doc.paid_amount || 0);
          return sum + pending;
        }
        return sum;
      }, 0);
      setFormData(prev => ({ ...prev, paid_amount: total.toString() }));
    }
  }, [selectedDocuments, documents]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const submittedData = {
      ...formData,
      promised_amount: formData.promised_amount ? parseFloat(formData.promised_amount) : null,
      paid_amount: formData.paid_amount ? parseFloat(formData.paid_amount) : null,
      document_id: formData.document_id || null,
      selected_documents: selectedDocuments.length > 0 ? selectedDocuments : null
    };

    // Ajustar promised_date para evitar cambio de día por zona horaria
    if (formData.promised_date) {
      const [year, month, day] = formData.promised_date.split('-');
      submittedData.promised_date = `${year}-${month}-${day}`;
    }

    // Ajustar follow_up_date para evitar cambio de día por zona horaria
    if (formData.follow_up_date) {
      const [year, month, day] = formData.follow_up_date.split('-');
      submittedData.follow_up_date = `${year}-${month}-${day}`;
    }
    
    onSubmit(submittedData);
  };

  const showPromiseFields = formData.result === "promesa_pago";
  const showPaymentFields = formData.result === "pago_realizado";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editLog ? "Editar gestión" : "Registrar gestión"}
          </DialogTitle>
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

          {showPaymentFields && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-4">
              {totalDebt !== undefined && (
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
                  <span className="text-sm text-emerald-700">Deuda pendiente:</span>
                  <span className="text-lg font-bold text-emerald-900">${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}</span>
                </div>
              )}
              
              {documents && documents.length > 0 && (
                <div className="space-y-2">
                  <Label>Documento(s) a pagar</Label>
                  <div className="border rounded-lg p-3 bg-white max-h-48 overflow-y-auto space-y-2">
                    {documents.filter(doc => {
                      const pending = (doc.amount || 0) - (doc.paid_amount || 0);
                      return pending > 0;
                    }).map((doc) => {
                      const pending = (doc.amount || 0) - (doc.paid_amount || 0);
                      const isSelected = selectedDocuments.includes(doc.id);
                      return (
                        <div key={doc.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedDocuments([...selectedDocuments, doc.id]);
                              } else {
                                setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id));
                              }
                            }}
                          />
                          <label className="flex-1 text-sm cursor-pointer">
                            <span className="font-medium">{doc.document_number}</span>
                            <span className="text-slate-600"> - ${pending.toLocaleString('es-MX', { minimumFractionDigits: 0 })} pendiente</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                  {selectedDocuments.length > 0 && (
                    <p className="text-xs text-slate-500">
                      {selectedDocuments.length} documento{selectedDocuments.length !== 1 ? 's' : ''} seleccionado{selectedDocuments.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Monto pagado</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (totalDebt !== undefined) {
                        setFormData({ ...formData, paid_amount: totalDebt.toString() });
                      }
                    }}
                  >
                    Pagar todo
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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