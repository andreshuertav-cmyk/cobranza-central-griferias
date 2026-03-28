import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MapPin, MessageSquare, Mail, Search, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';

const contactIcons = {
  llamada: Phone,
  visita: MapPin,
  mensaje: MessageSquare,
  correo: Mail,
  whatsapp: MessageSquare
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

export default function ClientManagementReport({ logs, clients, documents }) {
  const [search, setSearch] = useState("");

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    const data = filteredStats.map(stat => ({
      'Cliente': stat.client.name,
      'Teléfono': stat.client.phone || '',
      'Total Gestiones': stat.totalLogs,
      'Promesas': stat.promises,
      'Monto Prometido': stat.promisedAmount,
      'Pagos': stat.paymentsReceived,
      'Monto Pagado': stat.totalPaid,
      'Pagos sin Gestión': stat.paymentsWithoutManagement,
      'Saldo': stat.remaining,
      'Última Gestión': stat.lastLog ? format(new Date(stat.lastLog.contact_date), "dd/MM/yyyy", { locale: es }) : 'N/A',
      'Resultado': stat.lastLog ? resultLabels[stat.lastLog.result] : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Gestiones por Cliente');
    XLSX.writeFile(wb, `gestiones_clientes_${format(new Date(), "ddMMyyyy")}.xlsx`);
  };

  // Group logs by client
  const clientStats = clients.map(client => {
    const clientLogs = logs.filter(log => log.client_id === client.id);
    const clientDocs = documents.filter(doc => doc.client_id === client.id);

    // Separate real management logs from "sin gestión" payments
    const managementLogs = clientLogs.filter(log => !log.notes?.includes("[SIN GESTION]"));

    // Count by contact type (only real management logs)
    const contactTypes = managementLogs.reduce((acc, log) => {
      acc[log.contact_type] = (acc[log.contact_type] || 0) + 1;
      return acc;
    }, {});

    // Count by result (only real management logs)
    const results = managementLogs.reduce((acc, log) => {
      acc[log.result] = (acc[log.result] || 0) + 1;
      return acc;
    }, {});

    // Payments
    const paymentsReceived = managementLogs.filter(l => l.result === "pago_realizado").length;
    const paymentsWithoutManagement = clientLogs.filter(l => 
      l.result === "pago_realizado" && l.notes?.includes("[SIN GESTION]")
    ).length;
    const totalPaid = managementLogs
      .filter(l => l.result === "pago_realizado")
      .reduce((sum, l) => sum + (l.paid_amount || 0), 0);

    // Promises
    const promises = managementLogs.filter(l => l.result === "promesa_pago").length;
    const promisedAmount = managementLogs
      .filter(l => l.result === "promesa_pago")
      .reduce((sum, l) => sum + (l.promised_amount || 0), 0);

    // Last contact (only real management logs)
    const lastLog = managementLogs.length > 0 ? managementLogs[0] : null;

    // Debt
    const totalDebt = clientDocs.reduce((sum, doc) => sum + (doc.amount || 0), 0);
    const totalPaidFromDocs = clientDocs.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0);

    return {
      client,
      totalLogs: managementLogs.length,
      contactTypes,
      results,
      paymentsReceived,
      paymentsWithoutManagement,
      totalPaid,
      promises,
      promisedAmount,
      lastLog,
      totalDebt,
      totalPaidFromDocs,
      remaining: totalDebt - totalPaidFromDocs
    };
  }).filter(stat => stat.totalLogs > 0 || stat.paymentsWithoutManagement > 0)
    .sort((a, b) => b.totalLogs - a.totalLogs);

  // Filter by search
  const filteredStats = clientStats.filter(stat =>
    stat.client.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (clientStats.length === 0) {
    return (
      <Card className="p-8 text-center bg-slate-50">
        <p className="text-slate-500">No hay gestiones registradas</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Search and Export */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={exportToExcel} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Client Stats Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Cliente</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">Gestiones</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">Tipos contacto</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">Promesas</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">Pagos</th>
              <th className="text-center px-4 py-3 text-sm font-semibold text-slate-700">Sin gestión</th>
              <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Saldo</th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Última gestión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredStats.map((stat) => {
              const Icon = stat.lastLog ? contactIcons[stat.lastLog.contact_type] : null;
              
              return (
                <tr key={stat.client.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{stat.client.name}</div>
                    {stat.client.phone && (
                      <div className="text-xs text-slate-500">{stat.client.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-slate-900">{stat.totalLogs}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {Object.entries(stat.contactTypes).map(([type, count]) => {
                        const TypeIcon = contactIcons[type];
                        if (!TypeIcon) return null;
                        return (
                          <div key={type} className="flex items-center gap-1 text-xs text-slate-600">
                            <TypeIcon className="h-3 w-3" />
                            <span>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm">
                      <div className="font-semibold text-amber-600">{stat.promises}</div>
                      {stat.promisedAmount > 0 && (
                        <div className="text-xs text-slate-500">
                          ${stat.promisedAmount.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm">
                      <div className="font-semibold text-emerald-600">{stat.paymentsReceived}</div>
                      {stat.totalPaid > 0 && (
                        <div className="text-xs text-slate-500">
                          ${stat.totalPaid.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-sm">
                      <div className="font-semibold text-blue-600">{stat.paymentsWithoutManagement}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-semibold text-slate-900">
                      ${stat.remaining.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {stat.lastLog ? (
                      <div className="text-sm">
                        <div className="flex items-center gap-1 mb-1">
                          {Icon && <Icon className="h-3 w-3 text-slate-400" />}
                          <span className="text-slate-600">
                            {format(new Date(stat.lastLog.contact_date), "d MMM", { locale: es })}
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {resultLabels[stat.lastLog.result]}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Sin gestiones</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-slate-50 rounded-lg grid grid-cols-5 gap-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Clientes gestionados</p>
          <p className="text-lg font-bold text-slate-900">{clientStats.length}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Total gestiones</p>
          <p className="text-lg font-bold text-slate-900">
            {clientStats.reduce((sum, s) => sum + s.totalLogs, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Total promesas</p>
          <p className="text-lg font-bold text-amber-600">
            {clientStats.reduce((sum, s) => sum + s.promises, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Total pagos</p>
          <p className="text-lg font-bold text-emerald-600">
            {clientStats.reduce((sum, s) => sum + s.paymentsReceived, 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Pagos sin gestión</p>
          <p className="text-lg font-bold text-blue-600">
            {clientStats.reduce((sum, s) => sum + s.paymentsWithoutManagement, 0)}
          </p>
        </div>
      </div>
    </Card>
  );
}