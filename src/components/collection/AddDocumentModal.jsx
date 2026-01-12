import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const documentTypes = [
  { value: "factura", label: "Factura" },
  { value: "boleta", label: "Boleta" }
];

const statusOptions = [
  { value: "vigente", label: "Vigente" },
  { value: "vencido", label: "Vencido" },
  { value: "pagado", label: "Pagado" },
  { value: "cancelado", label: "Cancelado" },
  { value: "factorizada", label: "Factorizada" }
];

export default function AddDocumentModal({ open, onOpenChange, onSubmit, isLoading, clientId, editDocument }) {
  const [formData, setFormData] = useState({
    document_number: "",
    document_type: "factura",
    amount: "",
    paid_amount: "0",
    issue_date: "",
    due_date: "",
    status: "vigente",
    days_overdue: "0",
    notes: ""
  });

  useEffect(() => {
    if (editDocument) {
      setFormData({
        document_number: editDocument.document_number || "",
        document_type: editDocument.document_type || "factura",
        amount: editDocument.amount?.toString() || "",
        paid_amount: editDocument.paid_amount?.toString() || "0",
        issue_date: editDocument.issue_date || "",
        due_date: editDocument.due_date || "",
        status: editDocument.status || "vigente",
        days_overdue: editDocument.days_overdue?.toString() || "0",
        notes: editDocument.notes || ""
      });
    } else {
      setFormData({
        document_number: "",
        document_type: "factura",
        amount: "",
        paid_amount: "0",
        issue_date: "",
        due_date: "",
        status: "vigente",
        days_overdue: "0",
        notes: ""
      });
    }
  }, [editDocument, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      client_id: clientId,
      amount: parseFloat(formData.amount) || 0,
      paid_amount: parseFloat(formData.paid_amount) || 0,
      days_overdue: parseInt(formData.days_overdue) || 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editDocument ? "Editar documento" : "Nuevo documento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Número de documento *</Label>
              <Input
                placeholder="FAC-001"
                value={formData.document_number}
                onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.document_type}
                onValueChange={(v) => setFormData({ ...formData, document_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Monto pagado</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.paid_amount}
                onChange={(e) => setFormData({ ...formData, paid_amount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha emisión</Label>
              <Input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha vencimiento *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Días de mora</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.days_overdue}
                onChange={(e) => setFormData({ ...formData, days_overdue: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea
              placeholder="Información adicional..."
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.document_number || !formData.amount || !formData.due_date || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editDocument ? "Actualizar documento" : "Crear documento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}