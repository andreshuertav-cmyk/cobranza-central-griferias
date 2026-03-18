import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TIPO_DTE = {
  "33": "FACTURA ELECTRÓNICA",
  "34": "FACTURA NO AFECTA O EXENTA",
  "39": "BOLETA ELECTRÓNICA",
  "41": "BOLETA NO AFECTA O EXENTA",
  "52": "GUÍA DE DESPACHO ELECTRÓNICA",
  "56": "NOTA DE DÉBITO ELECTRÓNICA",
  "61": "NOTA DE CRÉDITO ELECTRÓNICA",
};

const ONES = ["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE","DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE","DIECIOCHO","DIECINUEVE","VEINTE"];
const TENS = ["","","VEINTI","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
const HUNDREDS = ["","CIENTO","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS","SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];

function toWords(n) {
  n = Math.round(n);
  if (n === 0) return "CERO";
  let r = "";
  if (n >= 1000000) { const m = Math.floor(n / 1000000); r += (m === 1 ? "UN MILLÓN " : toWords(m) + " MILLONES "); n %= 1000000; }
  if (n >= 1000) { const k = Math.floor(n / 1000); r += (k === 1 ? "MIL " : toWords(k) + " MIL "); n %= 1000; }
  if (n >= 100) { r += (n === 100 ? "CIEN " : HUNDREDS[Math.floor(n / 100)] + " "); n %= 100; }
  if (n > 20) { r += TENS[Math.floor(n / 10)]; if (n % 10) r += "Y " + ONES[n % 10] + " "; else r += " "; }
  else if (n > 0) r += ONES[n] + " ";
  return r.trim();
}

function formatDate(d) {
  if (!d) return "";
  const months = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
  try {
    const dt = new Date(d + "T12:00:00");
    return `${dt.getDate()} de ${months[dt.getMonth()]} de ${dt.getFullYear()}`;
  } catch { return d; }
}

function parseDTE(xmlText) {
  const parser = new DOMParser();
  let doc = parser.parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) doc = parser.parseFromString(xmlText, "text/xml");
  if (doc.querySelector("parsererror")) throw new Error("El XML no es válido o está mal formado");

  const g = (tag) => { const el = doc.getElementsByTagName(tag)[0]; return el ? el.textContent.trim() : ""; };

  const emisor = {
    rut: g("RUTEmisor") || g("RutEmisor"),
    razonSocial: g("RznSoc"),
    giro: g("GiroEmis"),
    direccion: g("DirOrigen"),
    comuna: g("CmnaOrigen"),
    ciudad: g("CiudadOrigen"),
    sucursal: g("Sucursal"),
    correo: g("CorreoEmisor"),
    telefono: g("Telefono"),
  };

  const idDoc = {
    tipo: g("TipoDTE"),
    folio: g("Folio"),
    fecha: g("FchEmis"),
    formaPago: g("FmaPago"),
  };

  const receptor = {
    rut: g("RUTRecep"),
    razonSocial: g("RznSocRecep"),
    giro: g("GiroRecep"),
    direccion: g("DirRecep"),
    comuna: g("CmnaRecep"),
    ciudad: g("CiudadRecep"),
    contacto: g("Contacto"),
    vendedor: g("CdgVendedor"),
  };

  const detalleEls = Array.from(doc.getElementsByTagName("Detalle"));
  const detalles = detalleEls.map(d => {
    const dg = (tag) => { const el = d.getElementsByTagName(tag)[0]; return el ? el.textContent.trim() : ""; };
    return {
      nro: dg("NroLinDet"),
      codigo: dg("VlrCodigo") || dg("CdgItem") || "0",
      descripcion: dg("NmbItem"),
      unidad: dg("UnmdItem"),
      cantidad: dg("QtyItem"),
      precioUnit: dg("PrcItem"),
      descuento: dg("DescuentoMonto") || "0",
      total: dg("MontoItem"),
    };
  });

  const totales = {
    neto: parseInt(g("MntNeto") || "0"),
    tasaIVA: g("TasaIVA") || "19",
    iva: parseInt(g("IVA") || "0"),
    total: parseInt(g("MntTotal") || "0"),
    exento: parseInt(g("MntExe") || "0"),
  };

  return { emisor, idDoc, receptor, detalles, totales };
}

// Fix special characters for jsPDF helvetica (latin-1 encoding)
function fixText(str) {
  if (!str) return "";
  return str
    .replace(/á/g, "\u00e1").replace(/Á/g, "\u00c1")
    .replace(/é/g, "\u00e9").replace(/É/g, "\u00c9")
    .replace(/í/g, "\u00ed").replace(/Í/g, "\u00cd")
    .replace(/ó/g, "\u00f3").replace(/Ó/g, "\u00d3")
    .replace(/ú/g, "\u00fa").replace(/Ú/g, "\u00da")
    .replace(/ü/g, "\u00fc").replace(/Ü/g, "\u00dc")
    .replace(/ñ/g, "\u00f1").replace(/Ñ/g, "\u00d1")
    .replace(/¿/g, "\u00bf").replace(/¡/g, "\u00a1")
    .replace(/°/g, "\u00b0");
}

async function generatePdf(filename, data) {
  const { default: JsPDF } = await import("jspdf");
  const { emisor, idDoc, receptor, detalles, totales } = data;

  const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const BLACK = [0, 0, 0];
  const RED = [170, 0, 0];
  const BLUE = [0, 0, 180];
  const GRAY = [100, 100, 100];

  let y = 14;
  const leftW = W * 0.62;
  const centerX = leftW / 2 + 8;

  // ── EMISOR (left block) ──
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...BLACK);
  pdf.text(fixText(emisor.razonSocial || ""), centerX, y, { align: "center" });

  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text(fixText(emisor.giro || ""), centerX, y, { align: "center" });

  y += 4;
  pdf.setDrawColor(...BLACK);
  pdf.setLineWidth(0.4);
  pdf.line(10, y, leftW + 6, y);

  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...BLUE);
  pdf.text("Direcci\u00f3n:", centerX, y, { align: "center" });
  y += 4;
  pdf.text(fixText(emisor.direccion || ""), centerX, y, { align: "center" });
  y += 4;
  if (emisor.comuna || emisor.ciudad)
    pdf.text(fixText(`${emisor.comuna || ""} - ${emisor.ciudad || ""}`.trim().replace(/^-\s*/, "").replace(/\s*-$/, "")), centerX, y, { align: "center" });
  if (emisor.sucursal) { y += 4; pdf.text(fixText(`Sucursal: ${emisor.sucursal}`), centerX, y, { align: "center" }); }
  if (emisor.correo) { y += 4; pdf.text(fixText(`Correo Electr\u00f3nico: ${emisor.correo}`), centerX, y, { align: "center" }); }

  // ── RUT / TIPO / FOLIO BOX (right) ──
  const boxX = leftW + 10;
  const boxW = W - boxX - 8;
  const boxY = 8;
  const boxH = 36;
  const bCX = boxX + boxW / 2;

  pdf.setDrawColor(...RED);
  pdf.setLineWidth(1);
  pdf.rect(boxX, boxY, boxW, boxH);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...RED);
  pdf.text(`R.U.T.: ${emisor.rut || ""}`, bCX, boxY + 9, { align: "center" });

  pdf.setFontSize(9);
  const tipoLabel = fixText(TIPO_DTE[idDoc.tipo] || `TIPO ${idDoc.tipo}`);
  const tipoLines = pdf.splitTextToSize(tipoLabel, boxW - 4);
  let ty = boxY + 17;
  for (const tl of tipoLines) { pdf.text(tl, bCX, ty, { align: "center" }); ty += 5; }

  pdf.setFontSize(10);
  pdf.text(`Nº ${idDoc.folio || ""}`, bCX, boxY + boxH - 5, { align: "center" });

  // SII & date
  const headerBottom = Math.max(y, boxY + boxH) + 5;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...BLACK);
  pdf.text("S.I.I. - MELIPILLA", W - 10, headerBottom, { align: "right" });

  pdf.setFont("helvetica", "normal");
  const ciudad = emisor.ciudad ? `${emisor.ciudad}, ` : "";
  pdf.text(`${ciudad}${formatDate(idDoc.fecha)}`, W - 10, headerBottom + 5, { align: "right" });

  y = headerBottom + 11;

  // ── RECEPTOR TABLE ──
  const tX = 8;
  const tW = W - 16;
  const midX = tX + tW / 2;
  const recRowH = 5.5;
  const recFields = [
    ["Se\u00f1or(es)", receptor.razonSocial],
    ["R.U.T.", receptor.rut],
    ["Giro", receptor.giro],
    ["Direcci\u00f3n", receptor.direccion],
    ["Comuna", receptor.comuna],
  ];
  const recRight = [
    ["Tel\u00e9fono", receptor.contacto || ""],
    ["Vencimiento", ""],
    ["Forma de Pago", idDoc.formaPago || ""],
    ["Vendedor", receptor.vendedor || ""],
    ["Ciudad", receptor.ciudad || ""],
  ];
  const recH = recFields.length * recRowH;

  pdf.setDrawColor(...BLACK);
  pdf.setLineWidth(0.3);
  pdf.rect(tX, y, tW, recH);
  pdf.line(midX, y, midX, y + recH);

  for (let i = 0; i < recFields.length; i++) {
    const ry = y + (i + 1) * recRowH - 1.5;
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...BLACK);
    pdf.text(recFields[i][0], tX + 2, ry);
    pdf.setFont("helvetica", "normal");
    pdf.text(`: ${(recFields[i][1] || "").substring(0, 38)}`, tX + 22, ry);
    pdf.setFont("helvetica", "bold");
    pdf.text(recRight[i][0], midX + 2, ry);
    pdf.setFont("helvetica", "normal");
    pdf.text(`: ${(recRight[i][1] || "").substring(0, 28)}`, midX + 30, ry);
  }

  y += recH + 0.5;
  pdf.rect(tX, y, tW, recRowH);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...BLACK);
  pdf.text("Referencia", tX + 2, y + recRowH - 1.5);

  y += recRowH + 5;

  // ── ITEMS TABLE ──
  const cols = [
    { label: "Item",         w: 10,  align: "center" },
    { label: "Código",       w: 16,  align: "center" },
    { label: "Descripción",  w: 74,  align: "left"   },
    { label: "U.M.",         w: 12,  align: "center" },
    { label: "Cant.",        w: 12,  align: "center" },
    { label: "Precio Unit.", w: 24,  align: "right"  },
    { label: "Valor Dscto.", w: 22,  align: "right"  },
    { label: "Total",        w: 24,  align: "right"  },
  ];
  const rowH = 6;
  const itemTableStartY = y;

  // Header
  pdf.setFillColor(0, 0, 0);
  pdf.rect(tX, y, tW, rowH, "F");
  let cx = tX;
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255);
  for (const col of cols) {
    const tx = col.align === "right" ? cx + col.w - 1.5 : col.align === "left" ? cx + 2 : cx + col.w / 2;
    pdf.text(col.label, tx, y + 4, { align: col.align === "center" ? "center" : col.align === "right" ? "right" : "left" });
    cx += col.w;
  }
  y += rowH;

  // Rows
  for (const item of detalles) {
    const rowData = [
      item.nro,
      item.codigo,
      item.descripcion,
      item.unidad,
      item.cantidad,
      item.precioUnit ? Number(item.precioUnit).toLocaleString("es-CL") : "",
      item.descuento ? Number(item.descuento).toLocaleString("es-CL") : "0",
      item.total ? Number(item.total).toLocaleString("es-CL") : "",
    ];
    cx = tX;
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.setTextColor(...BLACK);
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      const tx = col.align === "right" ? cx + col.w - 1.5 : col.align === "left" ? cx + 2 : cx + col.w / 2;
      const txt = ((rowData[i] || "").toString()).substring(0, col.align === "left" ? 50 : 14);
      pdf.text(txt, tx, y + 4, { align: col.align === "center" ? "center" : col.align === "right" ? "right" : "left" });
      cx += col.w;
    }
    pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.1);
    pdf.line(tX, y + rowH, tX + tW, y + rowH);
    pdf.setLineWidth(0.3); pdf.setDrawColor(...BLACK);
    y += rowH;
  }

  // Table outer border + vertical lines
  pdf.rect(tX, itemTableStartY, tW, y - itemTableStartY);
  cx = tX;
  for (let i = 0; i < cols.length - 1; i++) {
    cx += cols[i].w;
    pdf.line(cx, itemTableStartY, cx, y);
  }

  // ── TOTALS ──
  const totY = H - 48;
  const totX = W - 76;
  const totW = 68;

  const mntNeto = totales.neto;
  const mntIVA = totales.iva;
  const mntTotal = totales.total || mntNeto + mntIVA;

  // Amount in words
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(...BLACK);
  const words = toWords(mntTotal);
  const wordLines = pdf.splitTextToSize(`SON: ${words} PESOS.--`, tW);
  pdf.text(wordLines, tX, totY - 2);

  // Totals rows
  const tRows = [];
  if (totales.exento > 0) tRows.push({ label: "Exento:", val: `$ ${totales.exento.toLocaleString("es-CL")}` });
  if (mntNeto > 0) tRows.push({ label: "Neto:", val: `$ ${mntNeto.toLocaleString("es-CL")}` });
  tRows.push({ label: `${totales.tasaIVA} % I.V.A.:`, val: `$ ${mntIVA.toLocaleString("es-CL")}` });
  tRows.push({ label: "Total:", val: `$ ${mntTotal.toLocaleString("es-CL")}` });

  let tty = totY;
  for (const row of tRows) {
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(...BLACK);
    pdf.text(row.label, totX + totW * 0.48, tty + 4, { align: "right" });
    pdf.setTextColor(...BLUE);
    pdf.text(row.val, totX + totW - 2, tty + 4, { align: "right" });
    pdf.setDrawColor(190, 190, 190); pdf.setLineWidth(0.1);
    pdf.line(totX, tty, totX + totW, tty);
    tty += 6;
  }
  pdf.setDrawColor(...BLACK); pdf.setLineWidth(0.3);
  pdf.rect(totX, totY, totW, tRows.length * 6);

  pdf.save(filename.replace(/\.xml$/i, "") + ".pdf");
}

export default function XmlToPdfModal({ open, onOpenChange }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setError(null); setSuccess(false); }
  };

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true); setError(null); setSuccess(false);
    try {
      const text = await file.text();
      const data = parseDTE(text);
      await generatePdf(file.name, data);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Error al convertir el archivo");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null); setError(null); setSuccess(false);
    if (inputRef.current) inputRef.current.value = "";
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Convertir XML DTE a PDF</DialogTitle>
          <DialogDescription>Sube un DTE del SII y descárgalo como factura en PDF</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-2">
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
                <p className="text-xs text-slate-400 mt-1">DTE del SII (facturas, boletas, notas de crédito/débito)</p>
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