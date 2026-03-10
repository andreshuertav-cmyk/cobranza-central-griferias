import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Download, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import jsPDF from "jspdf";

function parseXmlToObject(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("El archivo XML no es válido");

  function nodeToObj(node) {
    const obj = {};
    // Attributes
    if (node.attributes && node.attributes.length > 0) {
      for (const attr of node.attributes) {
        obj[`@${attr.name}`] = attr.value;
      }
    }
    // Children
    const children = Array.from(node.childNodes);
    const elementChildren = children.filter(n => n.nodeType === 1);
    const textChildren = children.filter(n => n.nodeType === 3 && n.textContent.trim());

    if (elementChildren.length === 0 && textChildren.length > 0) {
      const text = textChildren.map(n => n.textContent.trim()).join("");
      if (Object.keys(obj).length === 0) return text;
      obj["#text"] = text;
    }

    for (const child of elementChildren) {
      const localName = child.localName;
      const parsed = nodeToObj(child);
      if (obj[localName] !== undefined) {
        if (!Array.isArray(obj[localName])) obj[localName] = [obj[localName]];
        obj[localName].push(parsed);
      } else {
        obj[localName] = parsed;
      }
    }
    return obj;
  }

  return { rootName: doc.documentElement.localName, data: nodeToObj(doc.documentElement) };
}

function renderToPdf(pdf, obj, depth = 0, y = 20) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const maxWidth = pdf.internal.pageSize.getWidth() - margin * 2 - depth * 4;

  const checkPage = (currentY) => {
    if (currentY > pageHeight - 20) {
      pdf.addPage();
      return 20;
    }
    return currentY;
  };

  if (typeof obj === "string" || typeof obj === "number") {
    y = checkPage(y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(60, 60, 60);
    const lines = pdf.splitTextToSize(String(obj), maxWidth);
    pdf.text(lines, margin + depth * 4, y);
    return y + lines.length * 5;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("@")) {
      // Attribute
      y = checkPage(y);
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 180);
      const line = `${key.slice(1)}: ${value}`;
      const lines = pdf.splitTextToSize(line, maxWidth);
      pdf.text(lines, margin + depth * 4, y);
      y += lines.length * 4.5;
    } else if (key === "#text") {
      y = checkPage(y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      const lines = pdf.splitTextToSize(String(value), maxWidth);
      pdf.text(lines, margin + depth * 4, y);
      y += lines.length * 5;
    } else {
      // Element key
      y = checkPage(y);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(30, 60, 120);
      pdf.text(key, margin + depth * 4, y);
      y += 5;

      if (Array.isArray(value)) {
        for (const item of value) {
          y = renderToPdf(pdf, item, depth + 1, y);
        }
      } else {
        y = renderToPdf(pdf, value, depth + 1, y);
      }
    }
  }
  return y;
}

export default function XmlToPdfModal({ open, onOpenChange }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setError(null);
      setSuccess(false);
    }
  };

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const text = await file.text();
      const { rootName, data } = parseXmlToObject(text);

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Header
      pdf.setFillColor(30, 60, 120);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), 14, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text(`XML: ${file.name}`, 14, 9);

      pdf.setFontSize(9);
      pdf.setTextColor(180, 200, 255);
      pdf.text(`Elemento raíz: ${rootName}`, pdf.internal.pageSize.getWidth() - 14, 9, { align: "right" });

      renderToPdf(pdf, data, 0, 22);

      pdf.save(file.name.replace(/\.xml$/i, "") + ".pdf");
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Error al convertir el archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Convertir XML a PDF</DialogTitle>
          <DialogDescription>Sube un archivo XML y descárgalo como PDF</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".xml" className="hidden" onChange={handleFile} />
            <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">
              {file ? file.name : "Selecciona un archivo XML"}
            </p>
            {file && (
              <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            )}
            {!file && <p className="text-xs text-slate-500 mt-1">Solo archivos .xml</p>}
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-900">¡PDF generado y descargado exitosamente!</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>Cerrar</Button>
            <Button onClick={handleConvert} disabled={!file || loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Convertir y descargar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}