import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, AlertCircle, CheckCircle2, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Recursively convert DOM node to lines array
function xmlNodeToLines(node, indent = 0) {
  const lines = [];
  const pad = "  ".repeat(indent);

  if (node.nodeType === 3) {
    // Text node
    const text = node.textContent.trim();
    if (text) lines.push({ text: pad + text, type: "value", indent });
    return lines;
  }

  if (node.nodeType !== 1) return lines;

  const name = node.localName || node.nodeName;
  const attrs = [];
  for (let i = 0; i < node.attributes.length; i++) {
    const a = node.attributes[i];
    attrs.push(`${a.localName || a.name}="${a.value}"`);
  }

  const attrStr = attrs.length ? " " + attrs.join(" ") : "";
  lines.push({ text: pad + name + attrStr, type: "key", indent });

  const children = Array.from(node.childNodes);
  const elementChildren = children.filter(n => n.nodeType === 1);
  const textChildren = children.filter(n => n.nodeType === 3 && n.textContent.trim());

  if (elementChildren.length === 0 && textChildren.length > 0) {
    const text = textChildren.map(n => n.textContent.trim()).join(" ");
    lines.push({ text: pad + "  " + text, type: "value", indent: indent + 1 });
  } else {
    for (const child of elementChildren) {
      lines.push(...xmlNodeToLines(child, indent + 1));
    }
  }

  return lines;
}

function generatePdf(filename, lines) {
  // Use jsPDF from global (loaded via CDN-like import)
  const { jsPDF } = window.jspdf || {};
  
  // Fallback: dynamic import
  return import("jspdf").then(({ default: JsPDF }) => {
    const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const marginLeft = 12;
    const marginTop = 20;
    const lineH = 5;
    const maxWidth = pageW - marginLeft - 8;

    // Header bar
    pdf.setFillColor(30, 60, 120);
    pdf.rect(0, 0, pageW, 13, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(filename, marginLeft, 9);

    let y = marginTop;

    for (const line of lines) {
      const indentPx = line.indent * 3;

      if (line.type === "key") {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8.5);
        pdf.setTextColor(30, 60, 120);
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(60, 60, 60);
      }

      const wrapped = pdf.splitTextToSize(line.text.trimStart(), maxWidth - indentPx);
      for (const wline of wrapped) {
        if (y > pageH - 10) {
          pdf.addPage();
          y = 15;
        }
        pdf.text(wline, marginLeft + indentPx, y);
        y += lineH;
      }
    }

    pdf.save(filename.replace(/\.xml$/i, "") + ".pdf");
  });
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
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "application/xml");

      const parseError = doc.querySelector("parsererror");
      if (parseError) {
        // Try as text/xml
        const doc2 = parser.parseFromString(text, "text/xml");
        const parseError2 = doc2.querySelector("parsererror");
        if (parseError2) throw new Error("El archivo XML no es válido o está mal formado");
      }

      const root = doc.documentElement;
      const lines = xmlNodeToLines(root, 0);

      await generatePdf(file.name, lines);
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
    if (inputRef.current) inputRef.current.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Convertir XML a PDF</DialogTitle>
          <DialogDescription>Sube un archivo XML (ej. DTE del SII) y descárgalo como PDF</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".xml" className="hidden" onChange={handleFile} />
            <FileText className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            {file ? (
              <>
                <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB · Click para cambiar</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700">Click para seleccionar un archivo XML</p>
                <p className="text-xs text-slate-400 mt-1">DTE, facturas electrónicas, etc.</p>
              </>
            )}
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900 text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-emerald-200 bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-900 text-sm">¡PDF generado y descargado exitosamente!</AlertDescription>
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