import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

export type PdfData = {
  num_aut: string;
  data_autorizacao: string;
  paciente: { nome: string; dtn: string; cartao_sus?: string | null; nome_da_mae: string };
  ubs: { nome_posto: string };
  empresa: { nome_fantasia: string; cnpj: string };
  profissional: { nome_profissional: string; conselho: string; numero_conselho: string };
  itens: { descricao: string; quantidade: number; valor_unitario: number; valor_total: number }[];
  total: number;
  sintomas?: string | null;
  sigAtendentePng: Uint8Array;
  sigPacientePng: Uint8Array;
  qrTargetUrl: string;
};

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateBR = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export async function buildAutorizacaoPdf(d: PdfData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;

  const text = (t: string, x: number, yy: number, opts: { size?: number; b?: boolean; color?: [number, number, number] } = {}) => {
    page.drawText(t, {
      x, y: yy, size: opts.size ?? 10,
      font: opts.b ? bold : font,
      color: rgb(...(opts.color ?? [0.06, 0.09, 0.16])),
    });
  };

  // Header
  text("AUTORIZAÇÃO DE PROCEDIMENTO", margin, y, { size: 14, b: true });
  y -= 18;
  text(`Nº ${d.num_aut}`, margin, y, { size: 11, b: true });
  text(`Data: ${dateBR(d.data_autorizacao)}`, width - margin - 120, y, { size: 11 });
  y -= 16;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 14;

  // Paciente
  text("PACIENTE", margin, y, { b: true, size: 10 }); y -= 12;
  text(`Nome: ${d.paciente.nome}`, margin, y); y -= 12;
  text(`Mãe: ${d.paciente.nome_da_mae}`, margin, y); y -= 12;
  text(`DN: ${dateBR(d.paciente.dtn)}    SUS: ${d.paciente.cartao_sus ?? "—"}`, margin, y); y -= 16;

  // Origem
  text("ORIGEM", margin, y, { b: true }); y -= 12;
  text(`UBS: ${d.ubs.nome_posto}`, margin, y); y -= 12;
  text(`Profissional: ${d.profissional.nome_profissional} (${d.profissional.conselho} ${d.profissional.numero_conselho})`, margin, y); y -= 12;
  text(`Empresa executora: ${d.empresa.nome_fantasia} — CNPJ ${d.empresa.cnpj}`, margin, y); y -= 16;

  if (d.sintomas) {
    text("Sintomas / Indicação:", margin, y, { b: true }); y -= 12;
    const lines = wrap(d.sintomas, 95);
    for (const l of lines) { text(l, margin, y); y -= 11; }
    y -= 4;
  }

  // Itens
  text("PROCEDIMENTOS AUTORIZADOS", margin, y, { b: true }); y -= 14;
  text("Descrição", margin, y, { b: true, size: 9 });
  text("Qtd", 360, y, { b: true, size: 9 });
  text("V. Unit.", 410, y, { b: true, size: 9 });
  text("Total", 490, y, { b: true, size: 9 });
  y -= 4;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 12;
  for (const it of d.itens) {
    const lines = wrap(it.descricao, 55);
    text(lines[0] ?? "", margin, y, { size: 9 });
    text(String(it.quantidade), 360, y, { size: 9 });
    text(brl(it.valor_unitario), 410, y, { size: 9 });
    text(brl(it.valor_total), 490, y, { size: 9 });
    y -= 11;
    for (let i = 1; i < lines.length; i++) { text(lines[i], margin, y, { size: 9 }); y -= 11; }
  }
  y -= 6;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 14;
  text(`TOTAL AUTORIZADO: ${brl(d.total)}`, width - margin - 220, y, { b: true, size: 12 });
  y -= 28;

  // Signatures
  const sigW = 200, sigH = 60;
  const sigY = 110;
  const sigA = await pdf.embedPng(d.sigAtendentePng);
  const sigP = await pdf.embedPng(d.sigPacientePng);
  page.drawImage(sigA, { x: margin, y: sigY, width: sigW, height: sigH });
  page.drawImage(sigP, { x: width - margin - sigW, y: sigY, width: sigW, height: sigH });
  page.drawLine({ start: { x: margin, y: sigY - 4 }, end: { x: margin + sigW, y: sigY - 4 }, thickness: 0.5 });
  page.drawLine({ start: { x: width - margin - sigW, y: sigY - 4 }, end: { x: width - margin, y: sigY - 4 }, thickness: 0.5 });
  text("Atendente", margin, sigY - 16, { size: 9 });
  text("Paciente", width - margin - sigW, sigY - 16, { size: 9 });

  // QR
  const qrPng = await qrToPng(d.qrTargetUrl, 160, 0);
  const qrImg = await pdf.embedPng(qrPng);
  page.drawImage(qrImg, { x: width / 2 - 40, y: 30, width: 80, height: 80 });
  text("Validação", width / 2 - 22, 22, { size: 8 });

  return pdf.save();
}

export async function buildQrPng(url: string): Promise<Uint8Array> {
  return qrToPng(url, 256, 1);
}

async function qrToPng(url: string, width: number, margin: number): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(url, { width, margin, type: "image/png" });
  const base64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function wrap(s: string, n: number): string[] {
  const out: string[] = [];
  const words = s.split(/\s+/);
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > n) { out.push(line); line = w; }
    else line = (line ? line + " " : "") + w;
  }
  if (line) out.push(line);
  return out;
}
