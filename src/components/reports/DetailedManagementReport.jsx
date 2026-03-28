import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from 'xlsx';

const contactTypeLabels = {
  llamada: "Llamada",
  visita: "Visita",
  mensaje: "Mensaje",
  correo: "Correo",
  whatsapp: "WhatsApp"
};

const resultLabels = {
  contactado: "Contactado",
  no_contesto: "No contestó",
  numero_equivocado: "Número equivocado",
  promesa_pago: "Promesa de pago",
  pago_realizado: "Pago realizado",
  rechaza_pago: "Rechaza pago",
  otro: "Otro",
  sin_gestion: "Sin gestión"
};

const getResultLabel = (log) => {
  if (log.notes?.includes("[SIN GESTION]")) return "Sin gestión";
  return resultLabels[log.result] || log.result;
};

const getContactTypeLabel = (log) => {
  if (log.notes?.includes("[SIN GESTION]")) return "Sin gestión";
  return contactTypeLabels[log.contact_type] || log.contact_type;
};

export default function DetailedManagementReport({ logs, clients }) {
  // Group logs by client and sort by date
  const clientData = clients.map(client => {
    const clientLogs = logs
      .filter(log => log.client_id === client.id && !log.notes?.includes("[SIN GESTION]"))
      .sort((a, b) => new Date(a.contact_date) - new Date(b.contact_date));
    
    return {
      client,
      logs: clientLogs
    };
  }).filter(data => data.logs.length > 0);

  // Find max number of logs for any client
  const maxLogs = Math.max(...clientData.map(d => d.logs.length), 0);

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Create data rows
    const data = clientData.map(({ client, logs }) => {
      const row = {
        'Cliente': client.name,
        'Teléfono': client.phone || '',
        'Email': client.email || ''
      };

      // Add each log as separate columns
      logs.forEach((log, index) => {
        const logNum = index + 1;
        row[`G${logNum} - Fecha`] = log.contact_date ? format(new Date(log.contact_date), "dd/MM/yyyy HH:mm", { locale: es }) : '';
        row[`G${logNum} - Tipo`] = getContactTypeLabel(log);
        row[`G${logNum} - Resultado`] = getResultLabel(log);
        
        if (log.result === 'promesa_pago') {
          row[`G${logNum} - Detalle`] = `Promesa: $${(log.promised_amount || 0).toLocaleString('es-MX')} - ${log.promised_date ? format(new Date(log.promised_date), "dd/MM/yyyy", { locale: es }) : 'Sin fecha'}`;
        } else if (log.result === 'pago_realizado') {
          row[`G${logNum} - Detalle`] = `Pago: $${(log.paid_amount || 0).toLocaleString('es-MX')} - ${log.payment_method || ''}`;
        } else {
          row[`G${logNum} - Detalle`] = log.notes || '';
        }
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-width columns
    const colWidths = [];
    if (data.length > 0) {
      const keys = Object.keys(data[0]);
      keys.forEach(key => {
        const maxLength = Math.max(
          key.length,
          ...data.map(row => String(row[key] || '').length)
        );
        colWidths.push({ wch: Math.min(maxLength + 2, 50) });
      });
      ws['!cols'] = colWidths;
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Gestiones Detalladas');
    XLSX.writeFile(wb, `gestiones_detalladas_${format(new Date(), "ddMMyyyy")}.xlsx`);
  };

  if (clientData.length === 0) {
    return (
      <Card className="p-8 text-center bg-slate-50">
        <p className="text-slate-500">No hay gestiones registradas</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={exportToExcel} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar a Excel
        </Button>
      </div>

      <Card className="p-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-300">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 bg-slate-50 sticky left-0 z-10 min-w-[200px]">
                Cliente
              </th>
              {Array.from({ length: maxLogs }).map((_, i) => (
                <th key={i} colSpan={4} className="text-center px-2 py-3 text-sm font-semibold text-slate-700 bg-slate-50 border-l border-slate-300">
                  Gestión {i + 1}
                </th>
              ))}
            </tr>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-2 text-xs text-slate-600 sticky left-0 z-10"></th>
              {Array.from({ length: maxLogs }).map((_, i) => (
                <>
                  <th key={`${i}-fecha`} className="text-center px-2 py-2 text-xs text-slate-600 border-l border-slate-200">
                    Fecha
                  </th>
                  <th key={`${i}-tipo`} className="text-center px-2 py-2 text-xs text-slate-600">
                    Tipo
                  </th>
                  <th key={`${i}-resultado`} className="text-center px-2 py-2 text-xs text-slate-600">
                    Resultado
                  </th>
                  <th key={`${i}-detalle`} className="text-center px-2 py-2 text-xs text-slate-600">
                    Detalle
                  </th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientData.map(({ client, logs }) => (
              <tr key={client.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900 bg-white sticky left-0 z-10">
                  <div>{client.name}</div>
                  {client.phone && (
                    <div className="text-xs text-slate-500">{client.phone}</div>
                  )}
                </td>
                {Array.from({ length: maxLogs }).map((_, i) => {
                  const log = logs[i];
                  if (!log) {
                    return (
                      <>
                        <td key={`${i}-fecha-empty`} className="px-2 py-3 text-xs text-slate-400 text-center border-l border-slate-200">-</td>
                        <td key={`${i}-tipo-empty`} className="px-2 py-3 text-xs text-slate-400 text-center">-</td>
                        <td key={`${i}-resultado-empty`} className="px-2 py-3 text-xs text-slate-400 text-center">-</td>
                        <td key={`${i}-detalle-empty`} className="px-2 py-3 text-xs text-slate-400 text-center">-</td>
                      </>
                    );
                  }

                  let detalle = '';
                  if (log.result === 'promesa_pago') {
                    detalle = `$${(log.promised_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
                    if (log.promised_date) {
                      detalle += ` - ${format(new Date(log.promised_date), "dd/MM/yy", { locale: es })}`;
                    }
                  } else if (log.result === 'pago_realizado') {
                    detalle = `$${(log.paid_amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
                    if (log.payment_method) {
                      detalle += ` - ${log.payment_method}`;
                    }
                  } else if (log.notes) {
                    detalle = log.notes.substring(0, 50) + (log.notes.length > 50 ? '...' : '');
                  }

                  return (
                    <>
                      <td key={`${i}-fecha`} className="px-2 py-3 text-xs text-slate-700 text-center border-l border-slate-200 whitespace-nowrap">
                        {format(new Date(log.contact_date), "dd/MM/yy", { locale: es })}
                      </td>
                      <td key={`${i}-tipo`} className="px-2 py-3 text-xs text-slate-700 text-center">
                        {getContactTypeLabel(log)}
                      </td>
                      <td key={`${i}-resultado`} className="px-2 py-3 text-xs text-center">
                        <span className={
                          log.notes?.includes("[SIN GESTION]") ? 'text-slate-500 font-medium' :
                          log.result === 'pago_realizado' ? 'text-emerald-600 font-medium' :
                          log.result === 'promesa_pago' ? 'text-amber-600 font-medium' :
                          'text-slate-700'
                        }>
                          {getResultLabel(log)}
                        </span>
                      </td>
                      <td key={`${i}-detalle`} className="px-2 py-3 text-xs text-slate-600 max-w-[200px] truncate">
                        {detalle}
                      </td>
                    </>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="p-4 bg-slate-50 rounded-lg">
        <p className="text-sm text-slate-600">
          Mostrando {clientData.length} clientes con gestiones • Total de gestiones: {clientData.reduce((sum, d) => sum + d.logs.length, 0)}
        </p>
      </div>
    </div>
  );
}