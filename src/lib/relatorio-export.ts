import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportRow = (string | number)[];

export function exportarXlsx(nome: string, headers: string[], rows: ExportRow[]) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Relatório");
  XLSX.writeFile(wb, `${nome}.xlsx`);
}

export function exportarPdf(
  titulo: string,
  headers: string[],
  rows: ExportRow[],
  subtitulo?: string,
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(titulo, 14, 15);
  if (subtitulo) {
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(subtitulo, 14, 21);
  }
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((c) => String(c))),
    startY: subtitulo ? 26 : 20,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 40] },
  });
  doc.save(`${titulo}.pdf`);
}
