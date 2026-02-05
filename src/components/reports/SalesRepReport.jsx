import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, DollarSign, AlertTriangle, FileText } from "lucide-react";

export default function SalesRepReport({ documents, clients }) {
  const [showOverdueModal, setShowOverdueModal] = useState(false);
  // Extract sales rep from document notes
  const salesRepData = {};

  documents.forEach(doc => {
    if (!doc.notes) return;
    
    // Extract vendedor from notes like "Vendedor: Carlos | Forma de pago: ..."
    const match = doc.notes.match(/Vendedor:\s*([^|]+)/i);
    if (!match) return;
    
    const salesRep = match[1].trim();
    if (!salesRep) return;

    if (!salesRepData[salesRep]) {
      salesRepData[salesRep] = {
        clientIds: new Set(),
        totalDebt: 0,
        overdueDebt: 0,
        overdueClients: new Set(),
        overdueClientDocs: {}
      };
    }

    // Add client
    salesRepData[salesRep].clientIds.add(doc.client_id);

    // Calculate debt
    const debt = (doc.amount || 0) - (doc.paid_amount || 0);
    salesRepData[salesRep].totalDebt += debt;

    // Check if overdue
    if (doc.status === "vencido" && debt > 0) {
      salesRepData[salesRep].overdueDebt += debt;
      salesRepData[salesRep].overdueClients.add(doc.client_id);
      
      // Track overdue documents per client
      if (!salesRepData[salesRep].overdueClientDocs[doc.client_id]) {
        salesRepData[salesRep].overdueClientDocs[doc.client_id] = [];
      }
      salesRepData[salesRep].overdueClientDocs[doc.client_id].push(doc);
    }
  });

  // Convert to array and calculate totals
  const salesRepArray = Object.entries(salesRepData).map(([name, data]) => ({
    name,
    totalClients: data.clientIds.size,
    overdueClients: data.overdueClients.size,
    totalDebt: data.totalDebt,
    overdueDebt: data.overdueDebt,
    overdueClientDocs: data.overdueClientDocs
  })).sort((a, b) => b.totalDebt - a.totalDebt);

  const totals = salesRepArray.reduce((acc, rep) => ({
    clients: acc.clients + rep.totalClients,
    overdueClients: acc.overdueClients + rep.overdueClients,
    totalDebt: acc.totalDebt + rep.totalDebt,
    overdueDebt: acc.overdueDebt + rep.overdueDebt
  }), { clients: 0, overdueClients: 0, totalDebt: 0, overdueDebt: 0 });

  if (salesRepArray.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">Sin datos de vendedores</h3>
        <p className="text-slate-500">No hay información de vendedores registrada</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">Vendedores</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{salesRepArray.length}</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total clientes</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{totals.clients}</p>
        </Card>

        <Card 
          className="p-4 bg-red-50 border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => setShowOverdueModal(true)}
        >
          <div className="flex items-center gap-2 text-red-700 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Clientes en mora</span>
          </div>
          <p className="text-2xl font-bold text-red-900">{totals.overdueClients}</p>
          <p className="text-xs text-red-600 mt-1">Click para ver detalle</p>
        </Card>

        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm">Saldo total</span>
          </div>
          <p className="text-2xl font-bold text-amber-900">
            ${totals.totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
          </p>
        </Card>
      </div>

      {/* Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Detalle por vendedor</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Vendedor</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total clientes</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Clientes en mora</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Saldo total</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Saldo en mora</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">% Mora</th>
              </tr>
            </thead>
            <tbody>
              {salesRepArray.map((rep, idx) => {
                const moraRate = rep.totalClients > 0 ? ((rep.overdueClients / rep.totalClients) * 100).toFixed(0) : 0;
                return (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-900 font-medium">{rep.name}</td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right">{rep.totalClients}</td>
                    <td className="py-3 px-4 text-sm text-red-600 text-right font-medium">{rep.overdueClients}</td>
                    <td className="py-3 px-4 text-sm text-slate-900 text-right font-medium">
                      ${rep.totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-red-600 text-right font-medium">
                      ${rep.overdueDebt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </td>
                    <td className="py-3 px-4 text-sm text-right">
                      <span className={`font-medium ${moraRate >= 50 ? "text-red-600" : moraRate >= 25 ? "text-amber-600" : "text-green-600"}`}>
                        {moraRate}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="py-3 px-4 text-sm font-bold text-slate-900">TOTAL</td>
                <td className="py-3 px-4 text-sm font-bold text-slate-900 text-right">{totals.clients}</td>
                <td className="py-3 px-4 text-sm font-bold text-red-600 text-right">{totals.overdueClients}</td>
                <td className="py-3 px-4 text-sm font-bold text-slate-900 text-right">
                  ${totals.totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-4 text-sm font-bold text-red-600 text-right">
                  ${totals.overdueDebt.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                </td>
                <td className="py-3 px-4 text-sm text-right">
                  <span className="font-bold text-slate-900">
                    {totals.clients > 0 ? ((totals.overdueClients / totals.clients) * 100).toFixed(0) : 0}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de clientes en mora */}
      <Dialog open={showOverdueModal} onOpenChange={setShowOverdueModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Clientes en Mora por Vendedor
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            {salesRepArray.filter(rep => rep.overdueClients > 0).map((rep) => (
              <Card key={rep.name} className="p-4">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center justify-between">
                  <span>{rep.name}</span>
                  <span className="text-sm text-red-600">
                    {rep.overdueClients} cliente{rep.overdueClients !== 1 ? 's' : ''} en mora
                  </span>
                </h3>
                
                <div className="space-y-2">
                  {Object.entries(rep.overdueClientDocs)
                    .filter(([clientId]) => clients.find(c => c.id === clientId))
                    .map(([clientId, docs]) => {
                    const client = clients.find(c => c.id === clientId);
                    return (
                      <div key={clientId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">
                            {client.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Saldo en mora: ${docs.reduce((sum, doc) => sum + ((doc.amount || 0) - (doc.paid_amount || 0)), 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-semibold text-red-600">
                            {docs.length} doc{docs.length !== 1 ? 's' : ''} en mora
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}