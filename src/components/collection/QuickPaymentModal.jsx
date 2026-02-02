import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const paymentMethods = [
  { value: "tarjeta_credito", label: "Tarjeta de Crédito" },
  { value: "tarjeta_debito", label: "Tarjeta de Débito" },
  { value: "efectivo", label: "Efectivo" },
  { value: "cheque", label: "Cheque" },
  { value: "transferencia_electronica", label: "Transferencia Electrónica" },
  { value: "nota_credito", label: "Nota de Crédito" },
  { value: "pagada_factoring", label: "Pagada a Factoring" }
];

export default function QuickPaymentModal({ open, onOpenChange, document, onSubmit, isLoading }) {
  const remaining = document ? Math.max(0, (document.amount || 0) - (document.paid_amount || 0)) : 0;
  const [amount, setAmount] = useState(remaining);
  const [paymentMethod, setPaymentMethod] = useState("");

  useEffect(() => {
    if (document) {
      const pendingAmount = Math.max(0, (document.amount || 0) - (document.paid_amount || 0));
      setAmount(pendingAmount);
    }
  }, [document]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ amount: parseFloat(amount) || 0, paymentMethod });
    setPaymentMethod("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Registrar pago</DialogTitle>
        </DialogHeader>

        {document && (
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Documento:</span>
                <span className="font-semibold">{document.document_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Saldo pendiente:</span>
                <span className="font-bold text-slate-900">
                  ${remaining.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monto del pago *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                min="0.01"
                max={remaining}
              />
              <p className="text-xs text-slate-500">
                Máximo: ${remaining.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Método de pago *</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                required
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!amount || !paymentMethod || isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Registrar pago
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}