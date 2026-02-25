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
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file || processing) return;

    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setProgressMessage("Leyendo archivo...");

    try {
      // 1. Read Excel file in frontend
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        throw new Error("El archivo está vacío o no tiene datos válidos");
      }

      // 2. Parse and validate data
      const documentsData = jsonData.map((row, idx) => {
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
            
            // DD/MM/YY or DD-MM-YY (formato latino corto)
            if (dateStr.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2}$/)) {
              const parts = dateStr.split(/[-\/]/);
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              let year = parts[2];
              // Convert 2-digit year to 4-digit (assume 20xx for years < 50, else 19xx)
              year = parseInt(year) < 50 ? `20${year}` : `19${year}`;
              dueDate = `${year}-${month}-${day}`;
            }
            // DD-MM-YYYY or DD/MM/YYYY
            else if (dateStr.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$/)) {
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

        const parsed = {
          tipo: row.TIPO || row.tipo,
          numero: String(row.NÚMERO || row.numero || row.NUMERO || ""),
          cliente: row.CLIENTE || row.cliente,
          vencio: dueDate,
          dias_mora: parseNumber(row['DÍAS MORA'] || row.dias_mora || row['DIAS MORA']),
          total: parseNumber(row.TOTAL || row.total),
          pagado: parseNumber(row.PAGADO || row.pagado),
          pendiente: parseNumber(row.PENDIENTE || row.pendiente),
          vendedor: row.VENDEDOR || row.vendedor || "",
          forma_pago: row['FORMA PAGO'] || row.forma_pago || row['FORMA_PAGO'] || ""
        };

        return parsed;
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

      setProgress(10);
      setProgressMessage("Verificando clientes existentes...");
      
      // 4. Get existing clients to check for duplicates
      const existingClients = await base44.entities.Client.list("-created_date", 10000);
      const existingClientsByName = {};
      existingClients.forEach(client => {
        existingClientsByName[client.name] = client;
      });

      // 5. Prepare clients data - separate new vs existing
      const clientsToCreate = [];
      const clientsToUpdate = [];
      const clientNameToId = {};

      for (const [clientName, clientData] of Object.entries(clientsMap)) {
        const existingClient = existingClientsByName[clientName];

        if (existingClient) {
          // Just track existing client, we'll recalculate debt later
          clientNameToId[clientName] = existingClient.id;
        } else {
          // Create new client with initial debt
          const totalDebt = clientData.documents.reduce((sum, doc) => sum + (doc.total || 0), 0);
          const totalPaid = clientData.documents.reduce((sum, doc) => sum + (doc.pagado || 0), 0);
          const hasOverdueDocuments = clientData.documents.some(doc => (doc.dias_mora || 0) > 0);

          clientsToCreate.push({
            name: clientName,
            total_debt: totalDebt,
            paid_amount: totalPaid,
            status: hasOverdueDocuments ? "mora" : "pendiente"
          });
        }
      }

      setProgress(20);
      setProgressMessage(`Creando ${clientsToCreate.length} clientes nuevos...`);
      
      // 6. Create new clients
      const createdClients = clientsToCreate.length > 0 
        ? await base44.entities.Client.bulkCreate(clientsToCreate)
        : [];

      createdClients.forEach(client => {
        clientNameToId[client.name] = client.id;
      });

      // 7. Recalculate debt for existing clients after documents are created
      // (Will be done after document creation in step 11)

      // 8. Get existing documents to avoid duplicates
      const allExistingDocs = await base44.entities.Document.list("-created_date", 10000);
      const existingDocNumbers = new Set(
        allExistingDocs.map(doc => `${doc.client_id}_${doc.document_number}`)
      );

      // 9. Re-fetch existing documents to catch any created during this session
      const refreshedDocs = await base44.entities.Document.list("-created_date", 10000);
      const refreshedDocNumbers = new Set(
        refreshedDocs.map(doc => `${doc.client_id}_${doc.document_number}`)
      );

      // 9b. Prepare all documents data (create or update)
      const documentsToCreate = [];
      const documentsToUpdate = [];
      
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

          const docData = {
            client_id: clientId,
            document_number: String(doc.numero),
            document_type: mappedType,
            amount: doc.total || 0,
            paid_amount: doc.pagado || 0,
            due_date: doc.vencio,
            status: (doc.dias_mora || 0) > 0 ? "vencido" : "vigente",
            days_overdue: doc.dias_mora || 0,
            notes: doc.vendedor ? `Vendedor: ${doc.vendedor}${doc.forma_pago ? ` | Forma de pago: ${doc.forma_pago}` : ""}` : ""
          };

          // Check if document already exists
          const existingDoc = refreshedDocs.find(d => 
            d.client_id === clientId && d.document_number === String(doc.numero)
          );

          if (existingDoc) {
            documentsToUpdate.push({ id: existingDoc.id, data: docData });
          } else {
            documentsToCreate.push(docData);
          }
        }
      }

      if (documentsToCreate.length === 0 && documentsToUpdate.length === 0) {
        throw new Error("No se encontraron documentos para procesar. Verifica que el archivo tenga datos válidos.");
      }

      // Helper function to add delay between batches
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

      setProgress(30);
      const totalDocs = documentsToCreate.length + documentsToUpdate.length;
      setProgressMessage(`Procesando ${totalDocs} documentos...`);
      
      // 10. Create new documents in batches with delays
      const BATCH_SIZE = 10;
      const createdDocuments = [];
      if (documentsToCreate.length > 0) {
        for (let i = 0; i < documentsToCreate.length; i += BATCH_SIZE) {
          const batch = documentsToCreate.slice(i, i + BATCH_SIZE);
          const batchResult = await base44.entities.Document.bulkCreate(batch);
          createdDocuments.push(...batchResult);
          
          const progressPercent = 30 + Math.floor((i / totalDocs) * 50);
          setProgress(progressPercent);
          setProgressMessage(`Creando documentos: ${i + batch.length}/${documentsToCreate.length}`);
          
          if (i + BATCH_SIZE < documentsToCreate.length) {
            await delay(1200);
          }
        }
      }
      
      // Update existing documents in batches
      const updatedDocuments = [];
      if (documentsToUpdate.length > 0) {
        for (let i = 0; i < documentsToUpdate.length; i += BATCH_SIZE) {
          const batch = documentsToUpdate.slice(i, i + BATCH_SIZE);
          for (const { id, data } of batch) {
            await base44.entities.Document.update(id, data);
            updatedDocuments.push(id);
          }
          
          const processedSoFar = documentsToCreate.length + i + batch.length;
          const progressPercent = 30 + Math.floor((processedSoFar / totalDocs) * 50);
          setProgress(progressPercent);
          setProgressMessage(`Actualizando documentos: ${i + batch.length}/${documentsToUpdate.length}`);
          
          if (i + BATCH_SIZE < documentsToUpdate.length) {
            await delay(1200);
          }
        }
      }

      setProgress(85);
      setProgressMessage("Recalculando deudas de clientes...");
      
      // 11. Recalculate total_debt and paid_amount for ALL clients (new and existing) with delays
      const allClientsInUpload = new Set(Object.keys(clientsMap));
      let clientUpdateCount = 0;
      for (const clientName of allClientsInUpload) {
        const clientId = clientNameToId[clientName];

        // Get ALL documents for this client (old + new)
        const clientDocs = await base44.entities.Document.filter({ client_id: clientId });

        const totalDebt = clientDocs.reduce((sum, doc) => sum + (doc.amount || 0), 0);
        const totalPaid = clientDocs.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0);
        const hasOverdue = clientDocs.some(doc => (doc.days_overdue || 0) > 0);

        await base44.entities.Client.update(clientId, {
          total_debt: totalDebt,
          paid_amount: totalPaid,
          status: hasOverdue ? "mora" : (totalPaid >= totalDebt ? "al_corriente" : "pendiente")
        });
        
        clientUpdateCount++;
        // Add delay after every client update
        await delay(400);
        
        // Update progress (85% to 95% range for client updates)
        const updateProgress = 85 + Math.floor((clientUpdateCount / allClientsInUpload.size) * 10);
        setProgress(updateProgress);
      }

      setProgress(100);
      setProgressMessage("¡Completado!");

      setResult({
        success: true,
        clientsCount: createdClients.length,
        updatedClientsCount: allClientsInUpload.size - createdClients.length,
        documentsCreated: createdDocuments.length,
        documentsUpdated: updatedDocuments.length
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
            <div className="space-y-3">
              <Alert className="border-blue-200 bg-blue-50">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <AlertDescription className="text-blue-900">
                  {progressMessage}
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-center text-slate-600">{progress}%</p>
              </div>
            </div>
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
                  {result.clientsCount > 0 && <div>• {result.clientsCount} cliente(s) nuevo(s) creado(s)</div>}
                  {result.updatedClientsCount > 0 && <div>• {result.updatedClientsCount} cliente(s) actualizado(s)</div>}
                  {result.documentsCreated > 0 && <div>• {result.documentsCreated} documento(s) nuevo(s) creado(s)</div>}
                  {result.documentsUpdated > 0 && <div>• {result.documentsUpdated} documento(s) actualizado(s)</div>}
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