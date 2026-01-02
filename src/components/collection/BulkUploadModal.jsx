import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";

export default function BulkUploadModal({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      // 1. Read Excel file in frontend
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });

      if (jsonData.length === 0) {
        throw new Error("El archivo está vacío o no tiene datos válidos");
      }

      console.log("Primera fila del Excel:", jsonData[0]);

      // 2. Parse and validate data
      const documentsData = jsonData.map(row => {
        // Handle different date formats
        let vencioValue = row.VENCIÓ || row.vencio || row.VENCIO;
        
        // Convert date to YYYY-MM-DD format
        let dueDate = null;
        
        if (vencioValue) {
          if (typeof vencioValue === 'number') {
            // Excel serial date: days since 1900-01-01
            const excelEpoch = new Date(1900, 0, 1);
            const date = new Date(excelEpoch.getTime() + (vencioValue - 2) * 86400000);
            dueDate = date.toISOString().split('T')[0];
          } else if (typeof vencioValue === 'string') {
            // Try to parse string date in various formats
            const dateStr = String(vencioValue).trim();
            
            // DD-MM-YYYY or DD/MM/YYYY
            if (dateStr.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/)) {
              const parts = dateStr.split(/[-\/]/);
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const year = parts[2];
              dueDate = `${year}-${month}-${day}`;
            } 
            // YYYY-MM-DD or YYYY/MM/DD
            else if (dateStr.match(/^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/)) {
              const parts = dateStr.split(/[-\/]/);
              const year = parts[0];
              const month = parts[1].padStart(2, '0');
              const day = parts[2].padStart(2, '0');
              dueDate = `${year}-${month}-${day}`;
            }
            // MM-DD-YYYY or MM/DD/YYYY (US format)
            else if (dateStr.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/) && dateStr.length <= 10) {
              // Try to parse as DD-MM-YYYY first (more common in Latin America)
              const parts = dateStr.split(/[-\/]/);
              const first = parseInt(parts[0]);
              const second = parseInt(parts[1]);
              
              // If first part > 12, it must be day
              if (first > 12) {
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                dueDate = `${year}-${month}-${day}`;
              } else {
                // Assume DD-MM-YYYY (Latin America standard)
                const day = parts[0].padStart(2, '0');
                const month = parts[1].padStart(2, '0');
                const year = parts[2];
                dueDate = `${year}-${month}-${day}`;
              }
            }
          } else if (vencioValue instanceof Date) {
            // JavaScript Date object
            dueDate = vencioValue.toISOString().split('T')[0];
          }
        }

        // Parse numeric values - handle strings with commas
        const parseNumber = (val) => {
          if (!val) return 0;
          if (typeof val === 'number') return val;
          // Remove commas and convert to number
          const cleaned = String(val).replace(/,/g, '');
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        };

        return {
          tipo: row.TIPO || row.tipo,
          numero: row.NÚMERO || row.numero || row.NUMERO,
          cliente: row.CLIENTE || row.cliente,
          vencio: dueDate,
          dias_mora: parseNumber(row['DÍAS MORA'] || row.dias_mora || row['DIAS MORA']),
          total: parseNumber(row.TOTAL || row.total),
          pagado: parseNumber(row.PAGADO || row.pagado),
          pendiente: parseNumber(row.PENDIENTE || row.pendiente),
          vendedor: row.VENDEDOR || row.vendedor || "",
          forma_pago: row['FORMA PAGO'] || row.forma_pago || row['FORMA_PAGO'] || ""
        };
      });

      if (documentsData.length === 0) {
        throw new Error("No se encontraron datos válidos en el archivo");
      }

      // 3. Group documents by client
      const clientsMap = {};

      for (const docData of documentsData) {
        const clientName = docData.cliente;

        if (!clientsMap[clientName]) {
          clientsMap[clientName] = {
            name: clientName,
            documents: []
          };
        }

        clientsMap[clientName].documents.push(docData);
      }

      // 4. Prepare clients data
      const clientsToCreate = Object.entries(clientsMap).map(([clientName, clientData]) => {
        const totalDebt = clientData.documents.reduce((sum, doc) => sum + (doc.total || 0), 0);
        const totalPaid = clientData.documents.reduce((sum, doc) => sum + (doc.pagado || 0), 0);

        // Check if any document is overdue
        const hasOverdueDocuments = clientData.documents.some(doc => (doc.dias_mora || 0) > 0);

        return {
          name: clientName,
          total_debt: totalDebt,
          paid_amount: totalPaid,
          status: hasOverdueDocuments ? "mora" : "pendiente"
        };
      });

      // 5. Create all clients in bulk
      const createdClients = await base44.entities.Client.bulkCreate(clientsToCreate);

      // 6. Map client names to IDs
      const clientNameToId = {};
      createdClients.forEach(client => {
        clientNameToId[client.name] = client.id;
      });

      // 7. Prepare all documents data
      const documentsToCreate = [];
      for (const [clientName, clientData] of Object.entries(clientsMap)) {
        const clientId = clientNameToId[clientName];

        for (const doc of clientData.documents) {
          // Skip if missing required fields
          if (!doc.numero || !doc.vencio) {
            continue;
          }

          const docType = doc.tipo?.toLowerCase() || "factura";
          const mappedType = docType.includes("factura") ? "factura" : 
                             docType.includes("pagar") ? "pagare" : 
                             docType.includes("contrato") ? "contrato" :
                             docType.includes("crédito") || docType.includes("credito") ? "credito" : "otro";

          documentsToCreate.push({
            client_id: clientId,
            document_number: String(doc.numero),
            document_type: mappedType,
            amount: doc.total || 0,
            paid_amount: doc.pagado || 0,
            due_date: doc.vencio,
            status: (doc.dias_mora || 0) > 0 ? "vencido" : "vigente",
            days_overdue: doc.dias_mora || 0,
            notes: doc.vendedor ? `Vendedor: ${doc.vendedor}${doc.forma_pago ? ` | Forma de pago: ${doc.forma_pago}` : ""}` : ""
          });
        }
      }

      // 8. Validate we have documents to create
      if (documentsToCreate.length === 0) {
        throw new Error("No se encontraron documentos válidos para procesar. Verifica que las columnas NÚMERO y VENCIÓ tengan datos correctos.");
      }

      // 9. Create all documents in bulk
      const createdDocuments = await base44.entities.Document.bulkCreate(documentsToCreate);

      setResult({
        success: true,
        clientsCount: createdClients.length,
        documentsCount: createdDocuments.length
      });

      // Notify parent
      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (err) {
      setError(err.message || "Error al procesar la carga masiva");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const data = [
      ["TIPO", "NÚMERO", "CLIENTE", "VENCIÓ", "DÍAS MORA", "TOTAL", "PAGADO", "PENDIENTE", "VENDEDOR", "FORMA PAGO"],
      ["Factura", "FAC-001", "Juan Pérez", "01-02-2024", 30, 15000, 0, 15000, "Carlos", "Transferencia"],
      ["Pagaré", "PAG-002", "María López", "15-03-2024", 0, 25000, 5000, 20000, "Ana", "Efectivo"],
      ["Factura", "FAC-003", "María López", "28-02-2024", 15, 8000, 0, 8000, "Ana", "Transferencia"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_carga_masiva.xlsx");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Carga masiva de clientes</DialogTitle>
          <DialogDescription>
            Sube un archivo Excel con clientes y sus documentos en mora
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Template Download */}
          <Alert className="bg-blue-50 border-blue-200">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              <div className="flex items-center justify-between">
                <span>Descarga la plantilla para estructurar tus datos correctamente</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  className="gap-2 border-blue-300 hover:bg-blue-100"
                >
                  <Download className="h-3 w-3" />
                  Plantilla Excel
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          {/* Instructions */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-semibold text-slate-900">Formato del archivo:</h4>
            <ul className="space-y-1 text-slate-600 list-disc list-inside">
              <li>Archivo Excel (.xlsx) con columnas: TIPO, NÚMERO, CLIENTE, VENCIÓ, DÍAS MORA, TOTAL, PAGADO, PENDIENTE, VENDEDOR, FORMA PAGO</li>
              <li>Un cliente puede tener múltiples filas (documentos)</li>
              <li>Tipos: Factura, Pagaré, Contrato, Crédito, Otro</li>
              <li>Fechas en formato: DD-MM-YYYY (ej: 15-01-2024)</li>
            </ul>
          </div>

          {/* File Upload */}
          {!result && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors">
              <input
                type="file"
                id="bulk-upload"
                className="hidden"
                accept=".xlsx"
                onChange={handleFileChange}
                disabled={processing}
              />
              <label htmlFor="bulk-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {file ? file.name : "Selecciona un archivo"}
                </p>
                <p className="text-xs text-slate-500">Solo Excel .xlsx (máx 10MB)</p>
              </label>
            </div>
          )}

          {/* Processing Status */}
          {processing && (
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-900">
                Procesando datos y creando registros...
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {result?.success && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-900">
                <div className="font-medium mb-1">¡Carga exitosa!</div>
                <div className="text-sm">
                  Se crearon {result.clientsCount} cliente(s) con {result.documentsCount} documento(s) en total.
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleClose}>
              {result?.success ? "Cerrar" : "Cancelar"}
            </Button>
            {!result?.success && (
              <Button
                onClick={handleUpload}
                disabled={!file || processing}
                className="gap-2"
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                Cargar datos
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}