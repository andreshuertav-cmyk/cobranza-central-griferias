import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const statusOptions = [
  { value: "al_corriente", label: "Al día" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_negociacion", label: "En negociación" },
  { value: "mora", label: "En mora" },
  { value: "incobrable", label: "Incobrable" }
];

export default function AddClientModal({ open, onOpenChange, onSubmit, isLoading, editClient }) {
  const [formData, setFormData] = useState(editClient || {
    name: "",
    phone: "",
    email: "",
    total_debt: "",
    paid_amount: "",
    status: "pendiente",
    notes: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      total_debt: parseFloat(formData.total_debt) || 0,
      paid_amount: parseFloat(formData.paid_amount) || 0
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {editClient ? "Editar cliente" : "Nuevo cliente"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label>Nombre del cliente *</Label>
            <Input
              placeholder="Nombre completo o razón social"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input
                placeholder="55 1234 5678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Correo</Label>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Deuda total *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.total_debt}
                onChange={(e) => setFormData({ ...formData, total_debt: e.target.value })}
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
            <Label>Notas</Label>
            <Textarea
              placeholder="Información adicional del cliente..."
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!formData.name || !formData.total_debt || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editClient ? "Actualizar" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}