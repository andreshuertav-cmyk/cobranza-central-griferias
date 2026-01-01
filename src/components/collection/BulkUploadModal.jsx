import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BulkUploadModal({ open, onOpenChange, onSuccess }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
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

    setUploading(true);
    setProcessing(false);
    setError(null);
    setResult(null);

    try {
      // 1. Upload the file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setUploading(false);
      setProcessing(true);

      // 2. Extract data from file
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            clients: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  email: { type: "string" },
                  notes: { type: "string" },
                  documents: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        document_number: { type: "string" },
                        document_type: { type: "string" },
                        amount: { type: "number" },
                        paid_amount: { type: "number" },
                        issue_date: { type: "string" },
                        due_date: { type: "string" },
                        status: { type: "string" },
                        days_overdue: { type: "number" },
                        notes: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (extractResult.status === "error") {
        throw new Error(extractResult.details || "Error al procesar el archivo");
      }

      const clientsData = extractResult.output?.clients || [];

      if (clientsData.length === 0) {
        throw new Error("No se encontraron datos válidos en el archivo");
      }

      // 3. Create clients and documents
      let createdClients = 0;
      let createdDocuments = 0;

      for (const clientData of clientsData) {
        const { documents, ...clientInfo } = clientData;

        // Calculate total debt from documents
        const totalDebt = documents?.reduce((sum, doc) => sum + (doc.amount || 0), 0) || 0;
        const totalPaid = documents?.reduce((sum, doc) => sum + (doc.paid_amount || 0), 0) || 0;

        // Create client
        const client = await base44.entities.Client.create({
          ...clientInfo,
          total_debt: totalDebt,
          paid_amount: totalPaid,
          status: "pendiente"
        });

        createdClients++;

        // Create documents for this client
        if (documents && documents.length > 0) {
          for (const doc of documents) {
            await base44.entities.Document.create({
              ...doc,
              client_id: client.id,
              document_type: doc.document_type || "factura",
              status: doc.status || (doc.days_overdue > 0 ? "vencido" : "vigente"),
              paid_amount: doc.paid_amount || 0
            });
            createdDocuments++;
          }
        }
      }

      setResult({
        success: true,
        clientsCount: createdClients,
        documentsCount: createdDocuments
      });

      // Notify parent
      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (err) {
      setError(err.message || "Error al procesar la carga masiva");
    } finally {
      setUploading(false);
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
    const csvContent = `nombre_cliente,telefono,email,notas_cliente,numero_documento,tipo_documento,monto,monto_pagado,fecha_emision,fecha_vencimiento,dias_mora,notas_documento
Juan Pérez,55 1234 5678,juan@email.com,Cliente nuevo,FAC-001,factura,15000,0,01-01-2024,01-02-2024,30,Factura vencida
María López,55 8765 4321,maria@email.com,Buen pagador,PAG-002,pagare,25000,5000,01-02-2024,15-03-2024,0,Pagos parciales
María López,55 8765 4321,maria@email.com,,FAC-003,factura,8000,0,15-01-2024,28-02-2024,15,Segunda factura de María`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "plantilla_carga_masiva.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Carga masiva de clientes</DialogTitle>
          <DialogDescription>
            Sube un archivo CSV o Excel con clientes y sus documentos en mora
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
                  Plantilla CSV
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          {/* Instructions */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-semibold text-slate-900">Formato del archivo:</h4>
            <ul className="space-y-1 text-slate-600 list-disc list-inside">
              <li>CSV o Excel (.xlsx) con encabezados en la primera fila</li>
              <li>Un cliente puede tener múltiples documentos (repetir datos del cliente)</li>
              <li>Tipos de documento: factura, pagare, contrato, credito, otro</li>
              <li>Las fechas en formato: DD-MM-YYYY (ej: 15-01-2024)</li>
            </ul>
          </div>

          {/* File Upload */}
          {!result && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors">
              <input
                type="file"
                id="bulk-upload"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={uploading || processing}
              />
              <label htmlFor="bulk-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <p className="text-sm font-medium text-slate-900 mb-1">
                  {file ? file.name : "Selecciona un archivo"}
                </p>
                <p className="text-xs text-slate-500">CSV o Excel (máx 10MB)</p>
              </label>
            </div>
          )}

          {/* Processing Status */}
          {(uploading || processing) && (
            <Alert className="border-blue-200 bg-blue-50">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <AlertDescription className="text-blue-900">
                {uploading && "Subiendo archivo..."}
                {processing && "Procesando datos y creando registros..."}
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
                disabled={!file || uploading || processing}
                className="gap-2"
              >
                {(uploading || processing) && <Loader2 className="h-4 w-4 animate-spin" />}
                Cargar datos
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}