import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Loader2, DollarSign, CheckSquare, Square, Search, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BulkPaymentModal({ open, onOpenChange, documents, clients, onSuccess }) {
  const [selectedDocs, setSelectedDocs] = useState({});
  const [payAmounts, setPayAmounts] = useState({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Only show pending/overdue docs with remaining balance
  const pendingDocs = useMemo(() => {
    return documents
      .filter(doc => {
        const remaining = (doc.amount || 0) - (doc.paid_amount || 0);
        return remaining > 0 && doc.status !== "pagado" && doc.status !== "cancelado" && doc.status !== "factorizada";
      })
      .map(doc => {
        const client = clients.find(c => c.id === doc.client_id);
        return { ...doc, clientName: client?.name || "Sin cliente" };
      })
      .filter(doc => {
        if (!search) return true;
        return doc.clientName.toLowerCase().includes(search.toLowerCase()) ||
               doc.document_number?.toLowerCase().includes(search.toLowerCase());
      })
      .sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [documents, clients, search]);

  const toggleDoc = (docId) => {
    setSelectedDocs(prev => {
      const next = { ...prev };
      if (next[docId]) {
        delete next[docId];
      } else {
        next[docId] = true;
        // Default pay amount = full remaining
        const doc = pendingDocs.find(d => d.id === docId);
        if (doc) {
          setPayAmounts(pa => ({
            ...pa,
            [docId]: String((doc.amount || 0) - (doc.paid_amount || 0))
          }));
        }
      }
      return next;
    });
  };

  const selectAll = () => {
    const newSelected = {};
    const newAmounts = { ...payAmounts };
    pendingDocs.forEach(doc => {
      newSelected[doc.id] = true;
      if (!newAmounts[doc.id]) {
        newAmounts[doc.id] = String((doc.amount || 0) - (doc.paid_amount || 0));
      }
    });
    setSelectedDocs(newSelected);
    setPayAmounts(newAmounts);
  };

  const deselectAll = () => setSelectedDocs({});

  const selectedCount = Object.keys(selectedDocs).length;
  const totalToPay = pendingDocs
    .filter(d => selectedDocs[d.id])
    .reduce((sum, d) => sum + (parseFloat(payAmounts[d.id]) || 0), 0);

  const handlePay = async () => {
    if (selectedCount === 0) return;
    setLoading(true);
    setError(null);

    try {
      const docsToUpdate = pendingDocs.filter(d => selectedDocs[d.id]);

      for (const doc of docsToUpdate) {
        const payAmt = parseFloat(payAmounts[doc.id]) || 0;
        const newPaid = (doc.paid_amount || 0) + payAmt;
        const remaining = (doc.amount || 0) - newPaid;
        const newStatus = remaining <= 0 ? "pagado" : "vencido";

        await base44.entities.Document.update(doc.id, {
          paid_amount: newPaid,
          status: newStatus
        });
      }

      // Recalculate affected clients
      const affectedClientIds = [...new Set(docsToUpdate.map(d => d.client_id))];
      const allDocs = await base44.entities.Document.list("-created_date", 10000);

      for (const clientId of affectedClientIds) {
        const clientDocs = allDocs.filter(d => d.client_id === clientId);
        const totalDebt = clientDocs.reduce((s, d) => s + (d.amount || 0), 0);
        const totalPaid = clientDocs.reduce((s, d) => s + (d.paid_amount || 0), 0);
        const hasOverdue = clientDocs.some(d => (d.days_overdue || 0) > 0 && ((d.amount || 0) - (d.paid_amount || 0)) > 0);

        await base44.entities.Client.update(clientId, {
          total_debt: totalDebt,
          paid_amount: totalPaid,
          status: totalPaid >= totalDebt ? "al_corriente" : (hasOverdue ? "mora" : "pendiente")
        });
      }

      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err.message || "Error al procesar los pagos");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDocs({});
    setPayAmounts({});
    setSearch("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Registrar pagos</DialogTitle>
          <DialogDescription>Selecciona las facturas a pagar sin registrar gestión</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 flex-1 min-h-0">
          {/* Search + select all */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar cliente o documento..."
                className="pl-9 pr-8"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={selectAll} className="gap-1 shrink-0">
              <CheckSquare className="h-4 w-4" />
              Todos
            </Button>
            {selectedCount > 0 && (
              <Button variant="ghost" size="sm" onClick={deselectAll} className="gap-1 shrink-0">
                <Square className="h-4 w-4" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Doc list */}
          <div className="flex-1 overflow-y-auto border rounded-lg divide-y min-h-0">
            {pendingDocs.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <DollarSign className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p>No hay documentos pendientes</p>
              </div>
            ) : (
              pendingDocs.map(doc => {
                const remaining = (doc.amount || 0) - (doc.paid_amount || 0);
                const isSelected = !!selectedDocs[doc.id];
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : ""}`}
                    onClick={() => toggleDoc(doc.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleDoc(doc.id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.clientName}</p>
                      <p className="text-xs text-slate-500">{doc.document_number}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      ${remaining.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                    </Badge>
                    {isSelected && (
                      <div onClick={e => e.stopPropagation()} className="w-28 shrink-0">
                        <Input
                          type="number"
                          value={payAmounts[doc.id] ?? ""}
                          onChange={e => setPayAmounts(pa => ({ ...pa, [doc.id]: e.target.value }))}
                          className="h-7 text-xs text-right"
                          placeholder="Monto"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-900">{error}</AlertDescription>
            </Alert>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-slate-600">
              {selectedCount > 0 ? (
                <>
                  <span className="font-semibold text-slate-900">{selectedCount}</span> doc(s) seleccionado(s) ·{" "}
                  <span className="font-semibold text-emerald-700">
                    ${totalToPay.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
                  </span>
                </>
              ) : (
                "Selecciona documentos para pagar"
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                onClick={handlePay}
                disabled={selectedCount === 0 || loading}
                className="gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <DollarSign className="h-4 w-4" />
                Registrar pago
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}