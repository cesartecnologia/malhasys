import { BarChart3, CalendarDays, Download, Filter, PackageCheck, WalletCards } from "lucide-react";
import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { usePedidos } from "../hooks/usePedidos";
import { buildPedidoNumberMap, date, money, pedidoNumber } from "../lib/format";
import { type PdfImageData, SimplePdf, wrapText } from "../lib/pdf";
import { isCanceled, statusLabel } from "../lib/status";
import type { Empresa, Pedido, Perfil } from "../types";

type TipoRelatorio = "Vendas" | "Produção" | "Financeiro";
type PeriodoFiltro = "Todos" | "Dia" | "Semana" | "Mês";

export function RelatoriosPage() {
  const { empresa } = useOutletContext<{ perfil: Perfil; mostrarFinanceiro: boolean; empresa: Empresa }>();
  const { pedidos } = usePedidos();
  const [tipo, setTipo] = useState<TipoRelatorio>("Vendas");
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoFiltro>("Todos");
  const [dia, setDia] = useState("");
  const [semana, setSemana] = useState("");
  const [mes, setMes] = useState("");
  const [urgentes, setUrgentes] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const periodoLabel = formatPeriod(periodoTipo, { dia, semana, mes });

  const filtrados = useMemo(() => {
    return pedidos.filter((pedido) => {
      const data = pedido.createdAt?.toDate();
      const matchPeriodo = matchesPeriod(data, periodoTipo, { dia, semana, mes });
      const matchUrgente = !urgentes || pedido.prioridade === "Urgente";
      return matchPeriodo && matchUrgente;
    });
  }, [pedidos, periodoTipo, dia, semana, mes, urgentes]);

  const totalVendido = filtrados.reduce((sum, pedido) => sum + Number(pedido.valorTotal || 0), 0);
  const totalRecebido = filtrados.reduce((sum, pedido) => sum + Number(pedido.valorPago || pedido.valorEntrada || 0), 0);
  const abertos = filtrados.filter((pedido) => pedido.status !== "Entregue" && !isCanceled(pedido.status)).length;
  const urgentesCount = filtrados.filter((pedido) => pedido.prioridade === "Urgente").length;
  const ticketMedio = filtrados.length ? totalVendido / filtrados.length : 0;
  const numeroMap = useMemo(() => buildPedidoNumberMap(pedidos), [pedidos]);

  async function exportPdf() {
    await exportRelatorioPdf({
      empresa,
      pedidos: filtrados,
      numeroMap,
      tipo,
      mes,
      urgentes,
      periodoLabel,
      totalVendido,
      totalRecebido,
      ticketMedio,
      abertos
    });
  }

  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Acompanhe pedidos, valores e produção com relatórios prontos para arquivo."
        actions={
          <div className="report-header-actions no-print">
            <button className="secondary" type="button" onClick={() => setFiltersOpen((value) => !value)}>
              <Filter size={19} /> Filtros
            </button>
            <button type="button" onClick={() => void exportPdf()}>
              <Download size={19} /> Exportar PDF
            </button>
          </div>
        }
      />

      {filtersOpen ? (
        <section className="card report-filter-panel">
          <div className="card-header">
            <h2 className="card-title">Filtros do relatório</h2>
            <p className="card-description">Defina o recorte antes de visualizar ou exportar o arquivo.</p>
          </div>
          <div className="card-content">
            <div className="report-filters-grid">
              <label className="field">
                <span>Tipo de relatório</span>
                <select value={tipo} onChange={(event) => setTipo(event.target.value as TipoRelatorio)}>
                  <option>Vendas</option>
                  <option>Produção</option>
                  <option>Financeiro</option>
                </select>
              </label>
              <label className="field">
                <span>Período</span>
                <select value={periodoTipo} onChange={(event) => setPeriodoTipo(event.target.value as PeriodoFiltro)}>
                  <option>Todos</option>
                  <option>Dia</option>
                  <option>Semana</option>
                  <option>Mês</option>
                </select>
              </label>
              {periodoTipo === "Dia" ? (
                <label className="field"><span>Dia</span><input type="date" value={dia} onChange={(event) => setDia(event.target.value)} /></label>
              ) : null}
              {periodoTipo === "Semana" ? (
                <label className="field"><span>Semana</span><input type="week" value={semana} onChange={(event) => setSemana(event.target.value)} /></label>
              ) : null}
              {periodoTipo === "Mês" ? (
                <label className="field"><span>Mês</span><input type="month" value={mes} onChange={(event) => setMes(event.target.value)} /></label>
              ) : null}
              <label className="field">
                <span>Prioridade</span>
                <select value={urgentes ? "Urgentes" : "Todos"} onChange={(event) => setUrgentes(event.target.value === "Urgentes")}>
                  <option>Todos</option>
                  <option>Urgentes</option>
                </select>
              </label>
            </div>
          </div>
        </section>
      ) : null}

      <section className="report-dashboard">
        <Summary icon={PackageCheck} title="Pedidos filtrados" value={filtrados.length.toString()} note={`${abertos} em aberto`} />
        <Summary icon={WalletCards} title="Valor total" value={money(totalVendido)} note={`${money(totalRecebido)} recebido`} />
        <Summary icon={BarChart3} title="Ticket médio" value={money(ticketMedio)} note={`${urgentesCount} urgentes`} />
        <Summary icon={CalendarDays} title="Período" value={periodoLabel} note={tipo} />
      </section>

      <section className="card report-preview-card">
        <div className="card-header report-preview-heading">
          <div>
            <h2 className="card-title">Prévia do relatório</h2>
            <p className="card-description">Esta tabela é a base do PDF nativo exportado.</p>
          </div>
          <span className="badge">{filtrados.length} registros</span>
        </div>
        <div className="card-content">
          <div className="report-document">
            <div className="report-brand">
              {empresa.logoUrl ? <img src={empresa.logoUrl} alt="Logo" /> : <img src="/logo.png" alt="Logo MalhaSys" />}
              <h2 className="card-title">{empresa.nome || "MalhaSys"}</h2>
              <p className="card-description">{[empresa.cnpj, empresa.endereco, empresa.telefone, empresa.email].filter(Boolean).join(" · ") || "Dados da empresa não informados"}</p>
            </div>
            <div className="report-document-meta">
              <span><strong>Tipo:</strong> {tipo}</span>
              <span><strong>Período:</strong> {periodoLabel}</span>
              <span><strong>Prioridade:</strong> {urgentes ? "Urgentes" : "Todos"}</span>
            </div>
            <div className="table-wrap">
              <table className="report-table">
                <thead>
                  <tr><th>Pedido</th><th>Cliente</th><th>Status</th><th>Recebido</th><th style={{ textAlign: "right" }}>Valor</th></tr>
                </thead>
                <tbody>
                  {filtrados.map((pedido) => (
                    <tr key={pedido.id}>
                      <td>{pedidoNumber(pedido.id, numeroMap)}</td>
                      <td>{pedido.clienteNome || "-"}</td>
                      <td><span className="badge status">{statusLabel(pedido.status)}</span></td>
                      <td>{money(Number(pedido.valorPago || pedido.valorEntrada || 0))}</td>
                      <td style={{ textAlign: "right" }}>{money(pedido.valorTotal)}</td>
                    </tr>
                  ))}
                  {filtrados.length === 0 ? <tr><td colSpan={5} style={{ textAlign: "center" }}>Nenhum resultado encontrado com os filtros selecionados</td></tr> : null}
                </tbody>
              </table>
            </div>
            <div className="report-totals">
              <span>Total vendido: <strong>{money(totalVendido)}</strong></span>
              <span>Total recebido: <strong>{money(totalRecebido)}</strong></span>
              <span>Pedidos abertos: <strong>{abertos}</strong></span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Summary({ icon: Icon, title, value, note }: { icon: typeof PackageCheck; title: string; value: string; note: string }) {
  return (
    <div className="card report-summary-card">
      <div>
        <p className="muted">{title}</p>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
      <i><Icon size={22} /></i>
    </div>
  );
}

async function exportRelatorioPdf({
  empresa,
  pedidos,
  numeroMap,
  tipo,
  mes,
  urgentes,
  periodoLabel,
  totalVendido,
  totalRecebido,
  ticketMedio,
  abertos
}: {
  empresa: Empresa;
  pedidos: Pedido[];
  numeroMap: Map<string, number>;
  tipo: TipoRelatorio;
  mes: string;
  urgentes: boolean;
  periodoLabel: string;
  totalVendido: number;
  totalRecebido: number;
  ticketMedio: number;
  abertos: number;
}) {
  const pdf = new SimplePdf();
  const logo = await loadPdfLogo(empresa.logoUrl || "/logo.png");
  let y = 790;

  function header() {
    pdf.rect(40, 684, 515, 118, "0.97 0.98 0.99");
    if (logo) pdf.image(logo, 263, 744, 68, 50);

    const nomeEmpresa = empresa.nome || "MalhaSys";
    centerText(pdf, nomeEmpresa, 724, 18, true);

    const dadosEmpresa = [empresa.cnpj, empresa.endereco, empresa.telefone, empresa.email].filter(Boolean).join(" · ");
    const lines = wrapText(dadosEmpresa || "Dados da empresa não informados", 420, 9).slice(0, 2);
    lines.forEach((line, index) => centerText(pdf, line, 708 - index * 12, 9));

    pdf.line({ x1: 70, y1: 690, x2: 525, y2: 690 });
    centerText(pdf, `Relatório de ${tipo}`, 666, 14, true);
    centerText(pdf, `Gerado em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`, 650, 9);
    y = 622;
  }

  function ensureSpace(height: number) {
    if (y - height < 52) {
      pdf.addPage();
      header();
    }
  }

  header();

  pdf.rect(48, y - 9, 498, 28, "0.95 0.96 0.98");
  pdf.text({ text: `Período: ${periodoLabel}`, x: 60, y, size: 10, bold: true });
  pdf.text({ text: `Prioridade: ${urgentes ? "Urgentes" : "Todos"}`, x: 235, y, size: 10, bold: true });
  pdf.text({ text: `Registros: ${pedidos.length}`, x: 420, y, size: 10, bold: true });
  y -= 24;

  const metrics = [
    ["Pedidos", pedidos.length.toString()],
    ["Valor total", money(totalVendido)],
    ["Valor recebido", money(totalRecebido)],
    ["Ticket médio", money(ticketMedio)],
    ["Pedidos abertos", abertos.toString()]
  ];
  metrics.forEach(([label, value], index) => {
    const x = 54 + (index % 3) * 170;
    if (index === 3) y -= 34;
    pdf.text({ text: label, x, y, size: 9 });
    pdf.text({ text: value, x, y: y - 15, size: 13, bold: true });
  });

  y -= 52;
  drawTableHeader(pdf, y);
  y -= 22;

  if (pedidos.length === 0) {
    pdf.text({ text: "Nenhum resultado encontrado com os filtros selecionados.", x: 54, y, size: 10 });
  }

  pedidos.forEach((pedido) => {
    ensureSpace(28);
    pdf.text({ text: pedidoNumber(pedido.id, numeroMap), x: 54, y, size: 9, bold: true });
    pdf.text({ text: truncate(pedido.clienteNome || "-", 26), x: 116, y, size: 9 });
    pdf.text({ text: statusLabel(pedido.status), x: 262, y, size: 9 });
    pdf.text({ text: date(pedido.createdAt), x: 375, y, size: 9 });
    pdf.text({ text: money(pedido.valorTotal), x: 464, y, size: 9, bold: true });
    pdf.line({ x1: 54, y1: y - 9, x2: 540, y2: y - 9 });
    y -= 22;
  });

  y -= 12;
  ensureSpace(42);
  pdf.text({ text: `Total vendido: ${money(totalVendido)}`, x: 54, y, size: 10, bold: true });
  pdf.text({ text: `Total recebido: ${money(totalRecebido)}`, x: 238, y, size: 10, bold: true });
  pdf.text({ text: `Pedidos abertos: ${abertos}`, x: 430, y, size: 10, bold: true });

  pdf.save(`relatorio-malhasys-${new Date().toISOString().slice(0, 10)}.pdf`);
}

function drawTableHeader(pdf: SimplePdf, y: number) {
  pdf.rect(48, y - 7, 498, 22, "0.92 0.94 0.97");
  pdf.text({ text: "Pedido", x: 54, y, size: 9, bold: true });
  pdf.text({ text: "Cliente", x: 116, y, size: 9, bold: true });
  pdf.text({ text: "Status", x: 262, y, size: 9, bold: true });
  pdf.text({ text: "Recebido", x: 375, y, size: 9, bold: true });
  pdf.text({ text: "Valor", x: 464, y, size: 9, bold: true });
}

function formatMonth(value: string) {
  if (!value) return "Todos";
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(Number(year), Number(month) - 1, 1));
}

function formatPeriod(periodoTipo: PeriodoFiltro, value: { dia: string; semana: string; mes: string }) {
  if (periodoTipo === "Dia") {
    if (!value.dia) return "Dia";
    return new Intl.DateTimeFormat("pt-BR").format(parseLocalDate(value.dia));
  }
  if (periodoTipo === "Semana") {
    return value.semana ? `Semana ${value.semana.replace("-W", " ")}` : "Semana";
  }
  if (periodoTipo === "Mês") return formatMonth(value.mes);
  return "Todos";
}

function matchesPeriod(date: Date | undefined, periodoTipo: PeriodoFiltro, value: { dia: string; semana: string; mes: string }) {
  if (periodoTipo === "Todos") return true;
  if (!date) return false;

  if (periodoTipo === "Dia") {
    return !value.dia || formatInputDate(date) === value.dia;
  }

  if (periodoTipo === "Semana") {
    return !value.semana || getIsoWeekKey(date) === value.semana;
  }

  if (periodoTipo === "Mês") {
    return !value.mes || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` === value.mes;
  }

  return true;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatInputDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getIsoWeekKey(date: Date) {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function centerText(pdf: SimplePdf, text: string, y: number, size: number, bold = false) {
  const width = estimateTextWidth(text, size);
  pdf.text({ text, x: Math.max(40, 297.5 - width / 2), y, size, bold });
}

function estimateTextWidth(text: string, size: number) {
  return text.length * size * 0.52;
}

async function loadPdfLogo(src: string): Promise<PdfImageData | null> {
  try {
    return await imageToPdfData(src);
  } catch {
    if (src !== "/logo.png") {
      try {
        return await imageToPdfData("/logo.png");
      } catch {
        return null;
      }
    }
    return null;
  }
}

function imageToPdfData(src: string): Promise<PdfImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 150;
      canvas.height = 110;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas indisponivel."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const x = (canvas.width - drawWidth) / 2;
      const y = (canvas.height - drawHeight) / 2;
      context.drawImage(image, x, y, drawWidth, drawHeight);

      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let dataHex = "";
      for (let index = 0; index < data.length; index += 4) {
        dataHex += data[index].toString(16).padStart(2, "0");
        dataHex += data[index + 1].toString(16).padStart(2, "0");
        dataHex += data[index + 2].toString(16).padStart(2, "0");
      }

      resolve({ name: "ImLogo", width: canvas.width, height: canvas.height, dataHex: dataHex.toUpperCase() });
    };
    image.onerror = () => reject(new Error("Nao foi possivel carregar a logo."));
    image.src = src;
  });
}
