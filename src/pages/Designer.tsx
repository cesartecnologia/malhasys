import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, ExternalLink, Grid2X2, ImageIcon, List as ListIcon, Palette, Printer, Save, Search, Trash2, UploadCloud } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { usePedidos } from "../hooks/usePedidos";
import { db, ensureAuthenticated } from "../lib/firebase";
import { buildPedidoNumberMap, date, pedidoNumber } from "../lib/format";
import { type PdfImageData, SimplePdf, wrapText } from "../lib/pdf";
import { getPedidoPreviewUrl, normalizePedidoArtes, pedidoTemTodasArtesFinais } from "../lib/pedidoArtes";
import { friendlyErrorMessage } from "../lib/publicErrors";
import { uploadFile } from "../lib/storage";
import type { Empresa, Pedido, PedidoArte, PedidoImagemProducao } from "../types";

type ViewMode = "cards" | "list";

export function DesignerPage() {
  const { pedidos, loading, error } = usePedidos();
  const numeroMap = useMemo(() => buildPedidoNumberMap(pedidos), [pedidos]);
  const fila = useMemo(
    () => pedidos.filter((pedido) => pedido.status === "Aguardando Arte" && pedido.ativo !== false),
    [pedidos]
  );
  const liberados = useMemo(
    () => pedidos.filter((pedido) => pedido.status === "Arte Aprovada" && pedido.ativo !== false),
    [pedidos]
  );
  const [busca, setBusca] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const filaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return fila;
    return fila.filter((pedido) => {
      const numero = pedidoNumber(pedido.id, numeroMap).toLowerCase();
      return numero.includes(termo) || pedido.clienteNome?.toLowerCase().includes(termo);
    });
  }, [busca, fila, numeroMap]);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Designer"
        subtitle="Prepare a arte final e libere para produção somente após aprovação."
        actions={
          <div className="view-header-actions">
            <div className="view-toggle header-view-toggle" aria-label="Alternar visualização">
              <button className={viewMode === "cards" ? "active" : ""} type="button" aria-label="Visualizar em cards" onClick={() => setViewMode("cards")}>
                <Grid2X2 size={17} />
              </button>
              <button className={viewMode === "list" ? "active" : ""} type="button" aria-label="Visualizar em lista" onClick={() => setViewMode("list")}>
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        }
      />
      {error ? <p className="muted">Erro ao carregar pedidos: {error}</p> : null}
      {loading ? <LoadingSpinner /> : null}

      {!loading && fila.length === 0 ? (
        <section className="card">
          <div className="card-content" style={{ textAlign: "center", paddingBlock: 48 }}>
            <Palette size={48} color="var(--color-muted)" />
            <p className="muted">Nenhuma arte pendente</p>
          </div>
        </section>
      ) : null}

      {!loading && fila.length > 0 ? (
        <div className="designer-workspace">
          <section className="designer-queue">
            <div className="designer-toolbar">
              <label className="designer-search">
                <Search size={17} />
                <input
                  value={busca}
                  onChange={(event) => setBusca(event.target.value)}
                  placeholder="Buscar por pedido ou cliente"
                />
              </label>
            </div>

            {filaFiltrada.length > 0 && viewMode === "cards" ? (
              <div className="designer-cards-grid">
                {filaFiltrada.map((pedido) => (
                  <DesignerCard
                    key={pedido.id}
                    pedido={pedido}
                    active={false}
                    numero={pedidoNumber(pedido.id, numeroMap)}
                    onSelect={() => navigate(`/designer/${pedido.id}`)}
                  />
                ))}
              </div>
            ) : null}

            {filaFiltrada.length > 0 && viewMode === "list" ? (
              <div className="table-wrap">
                <table className="items-table designer-table">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Arte</th>
                      <th>Data</th>
                      <th>Prioridade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filaFiltrada.map((pedido) => (
                      <tr className="clickable-row" key={pedido.id} onClick={() => navigate(`/designer/${pedido.id}`)}>
                        <td><strong>{pedidoNumber(pedido.id, numeroMap)}</strong></td>
                        <td>{pedido.clienteNome || "-"}</td>
                        <td><span className={getPedidoPreviewUrl(pedido) ? "muted" : "designer-missing-art"}>{arteStatusText(pedido)}</span></td>
                        <td>{date(pedido.createdAt)}</td>
                        <td><PriorityBadge prioridade={pedido.prioridade} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {filaFiltrada.length === 0 ? <p className="muted designer-empty-search">Nenhum pedido encontrado</p> : null}
          </section>
        </div>
      ) : null}

      {!loading && liberados.length > 0 ? (
        <section className="designer-approved">
          <div className="row-title"><CheckCircle2 size={18} /> Artes liberadas para produção</div>
          <div className="grid cols-3">
            {liberados.slice(0, 6).map((pedido) => (
              <Link className="card" to={`/pedidos/${pedido.id}`} key={pedido.id}>
                <div className="card-content grid">
                  <strong>{pedidoNumber(pedido.id, numeroMap)}</strong>
                  <span className="muted">{pedido.clienteNome}</span>
                  <StatusBadge status={pedido.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!loading && pedidos.length === 0 ? <EmptyState title="Nenhum pedido cadastrado." /> : null}
    </>
  );
}

export function DetalheDesigner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuarioNome, empresa } = useOutletContext<{ usuarioNome: string; empresa: Empresa }>();
  const { pedidos } = usePedidos();
  const numeroMap = useMemo(() => buildPedidoNumberMap(pedidos), [pedidos]);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [designer, setDesigner] = useState(usuarioNome || "");
  const [detalhesArte, setDetalhesArte] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [productionFiles, setProductionFiles] = useState<File[]>([]);
  const [productionPreviewUrls, setProductionPreviewUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!id) return;
    let unsubscribe = () => {};
    let cancelled = false;
    ensureAuthenticated()
      .then(() => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(db, "pedidos", id),
          (snapshot) => {
            if (!snapshot.exists()) {
              setPedido(null);
            } else {
              const data = { id: snapshot.id, ...snapshot.data() } as Pedido;
              setPedido(data);
              setDesigner(data.designer || usuarioNome || "");
              setDetalhesArte(data.detalhesArte || "");
              setFiles({});
              setProductionFiles([]);
              setMessage("");
            }
            setLoading(false);
          },
          (err) => {
            setError(friendlyErrorMessage(err, "Não foi possível carregar o pedido."));
            setLoading(false);
          }
        );
      })
      .catch((err) => {
        setError(friendlyErrorMessage(err, "Não foi possível carregar o pedido."));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [id, usuarioNome]);

  useEffect(() => {
    const urls = Object.entries(files).reduce<Record<string, string>>((acc, [arteId, file]) => {
      if (file) acc[arteId] = URL.createObjectURL(file);
      return acc;
    }, {});
    setPreviewUrls(urls);

    return () => {
      Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  useEffect(() => {
    const urls = productionFiles.map((file) => URL.createObjectURL(file));
    setProductionPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [productionFiles]);

  async function saveDesignerData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save(false);
  }

  async function releaseToProduction() {
    await save(true);
  }

  function addProductionFiles(fileList: FileList | null) {
    if (!pedido || !fileList) return;
    const currentTotal = (pedido.imagensProducao?.length || 0) + productionFiles.length;
    const slots = 4 - currentTotal;
    if (slots <= 0) {
      setMessage("A ficha permite no máximo 4 imagens.");
      return;
    }

    const selected = Array.from(fileList)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, slots);

    if (selected.length === 0) {
      setMessage("Selecione apenas imagens para a ficha de estamparia.");
      return;
    }

    setProductionFiles((current) => [...current, ...selected]);
  }

  async function removeProductionImage(index: number) {
    if (!pedido) return;
    setSaving(true);
    setMessage("");
    try {
      await ensureAuthenticated();
      const imagensProducao = (pedido.imagensProducao || []).filter((_, imageIndex) => imageIndex !== index);
      await updateDoc(doc(db, "pedidos", pedido.id), { imagensProducao });
      setMessage("Imagem removida da ficha.");
    } catch (err) {
      setMessage(friendlyErrorMessage(err, "Não foi possível remover a imagem."));
    } finally {
      setSaving(false);
    }
  }

  async function printProductionSheet() {
    if (!pedido) return;
    setPrinting(true);
    setMessage("");
    try {
      await generateProductionSheetPdf({
        pedido,
        numero: pedidoNumber(pedido.id, numeroMap),
        empresa,
        designer,
        detalhesArte,
        imageUrls: productionSheetImageUrls(pedido, productionPreviewUrls)
      });
    } catch (err) {
      setMessage(friendlyErrorMessage(err, "Não foi possível gerar a ficha de impressão."));
    } finally {
      setPrinting(false);
    }
  }

  async function save(release: boolean) {
    if (!pedido) return;
    const pedidoArtes = normalizePedidoArtes(pedido);
    if (release && pedidoArtes.some((arte) => !arte.arteFinalUrl && !files[arte.id])) {
      setMessage("Envie a arte final de todas as artes antes de liberar para produção.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await ensureAuthenticated();
      const updatedArtes = await Promise.all(
        pedidoArtes.map(async (arte) => {
          const uploaded = await uploadFile("pedidos/artes-finais", files[arte.id]);
          return {
            ...arte,
            ...(uploaded.url ? { arteFinalUrl: uploaded.url, arteFinalPath: uploaded.path } : {})
          };
        })
      );
      const primeiraFinal = updatedArtes.find((arte) => arte.arteFinalUrl);
      const todasFinalizadas = updatedArtes.every((arte) => Boolean(arte.arteFinalUrl?.trim()));
      const uploadedProductionImages = await Promise.all(
        productionFiles.map(async (file, index) => {
          const uploaded = await uploadFile("pedidos/fichas-estamparia", file);
          return uploaded.url
            ? {
                id: createLocalId(`ficha-${index}`),
                nome: file.name,
                url: uploaded.url,
                path: uploaded.path
              }
            : null;
        })
      );
      const imagensProducao = [
        ...(pedido.imagensProducao || []),
        ...uploadedProductionImages.filter(Boolean)
      ].slice(0, 4) as PedidoImagemProducao[];
      await updateDoc(doc(db, "pedidos", pedido.id), {
        designer,
        detalhesArte,
        artes: updatedArtes,
        artesFinalizadas: todasFinalizadas,
        ...(productionFiles.length ? { imagensProducao } : {}),
        ...(primeiraFinal?.arteFinalUrl ? { arteFinalUrl: primeiraFinal.arteFinalUrl, arteFinalPath: primeiraFinal.arteFinalPath || "" } : {}),
        ...(release && todasFinalizadas ? { status: "Arte Aprovada" } : {})
      });
      setFiles({});
      setProductionFiles([]);
      setMessage(release ? "Artes aprovadas e enviadas para produção." : "Detalhes da arte salvos.");
      if (release) window.setTimeout(() => navigate("/designer"), 700);
    } catch (err) {
      setMessage(friendlyErrorMessage(err, "Não foi possível salvar os detalhes da arte."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <p className="muted">Erro ao carregar pedido: {error}</p>;
  if (!pedido) return <p className="muted">Pedido não encontrado.</p>;

  const numero = pedidoNumber(pedido.id, numeroMap);
  const pedidoArtes = normalizePedidoArtes(pedido);
  const totalFinalizadas = pedidoArtes.filter((arte) => arte.arteFinalUrl).length;

  return (
    <>
      <PageHeader
        title={numero}
        subtitle={`${pedido.clienteNome} · ${pedido.cidade || "Cidade não informada"}`}
        actions={
          <>
            <button className="secondary" type="button" onClick={() => navigate(-1)}>
              <ArrowLeft size={18} /> Voltar
            </button>
            <Link className="button secondary" to={`/pedidos/${pedido.id}`}>
              <ExternalLink size={16} /> Abrir pedido
            </Link>
          </>
        }
      />

      <div className="detail-layout designer-detail-layout">
        <form className="panel grid designer-detail-panel" onSubmit={saveDesignerData}>
          <label className="field">
            <span>Designer responsável</span>
            <input value={designer} onChange={(event) => setDesigner(event.target.value)} />
          </label>
          <label className="field">
            <span>Detalhes para silk/DTF</span>
            <textarea
              value={detalhesArte}
              onChange={(event) => setDetalhesArte(event.target.value)}
              placeholder="Cores, posição, tamanho da estampa e qualquer orientação para produção."
            />
          </label>
          <div className="designer-final-upload-list">
            {pedidoArtes.map((arte, index) => (
              <label className="field" key={arte.id}>
                <span>Arte final {index + 1}: {arte.nome}</span>
                <input type="file" accept="image/*,.pdf" onChange={(event) => setFiles((current) => ({ ...current, [arte.id]: event.target.files?.[0] || null }))} />
                {arte.arteFinalUrl || previewUrls[arte.id] ? (
                  <a className="button secondary" href={previewUrls[arte.id] || arte.arteFinalUrl} target="_blank" rel="noreferrer">
                    <ImageIcon size={17} /> Ver arte final
                  </a>
                ) : null}
              </label>
            ))}
          </div>

          <div className="designer-production-images">
            <div className="section-heading-line">
              <span>Imagens para ficha de estamparia</span>
              <small>{(pedido.imagensProducao?.length || 0) + productionFiles.length}/4 imagens</small>
            </div>

            {(pedido.imagensProducao?.length || productionPreviewUrls.length) ? (
              <div className="designer-production-image-grid">
                {(pedido.imagensProducao || []).map((image, index) => (
                  <div className="designer-production-thumb" key={image.id || image.url}>
                    <img src={image.url} alt={`Imagem ${index + 1} da ficha`} />
                    <button type="button" className="icon-button danger ghost" onClick={() => void removeProductionImage(index)} aria-label="Remover imagem da ficha">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {productionPreviewUrls.map((url, index) => (
                  <div className="designer-production-thumb pending" key={url}>
                    <img src={url} alt={`Nova imagem ${index + 1} da ficha`} />
                    <button type="button" className="icon-button danger ghost" onClick={() => setProductionFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} aria-label="Remover imagem selecionada">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inline compact-empty">
                <ImageIcon size={24} />
                <strong>Nenhuma imagem na ficha</strong>
              </div>
            )}

            <label className="field">
              <span>Enviar imagens da ficha</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={(pedido.imagensProducao?.length || 0) + productionFiles.length >= 4}
                onChange={(event) => {
                  addProductionFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>

          {message ? <p className="muted">{message}</p> : null}

          <div className="form-actions-line">
            <button className="secondary compact-button" type="button" disabled={printing} onClick={() => void printProductionSheet()}>
              <Printer size={17} /> {printing ? "Gerando..." : "Imprimir ficha"}
            </button>
            <button className="secondary compact-button" type="submit" disabled={saving}>
              <Save size={17} /> {saving ? "Salvando..." : "Salvar detalhes"}
            </button>
            <button className="compact-button" type="button" disabled={saving} onClick={() => void releaseToProduction()}>
              <UploadCloud size={17} /> Marcar arte aprovada e enviar para produção
            </button>
          </div>
        </form>

        <section className="panel grid designer-order-info-panel">
          <div className="row-title">
            <StatusBadge status={pedido.status} />
            <PriorityBadge prioridade={pedido.prioridade} />
          </div>

          <div className="designer-art-board">
            {pedidoArtes.map((arte, index) => (
              <ArtPreviewCard
                key={arte.id}
                arte={arte}
                index={index}
                previewUrl={previewUrls[arte.id]}
                previewType={files[arte.id]?.type || ""}
                numero={numero}
              />
            ))}
          </div>

          <div className="key-values">
            <div><span>Tipo de estampa</span><strong>{pedido.tipoEstampa || "-"}</strong></div>
            <div><span>Artes finais</span><strong>{totalFinalizadas}/{pedidoArtes.length}</strong></div>
            <div><span>Cliente</span><strong>{pedido.clienteNome || "-"}</strong></div>
            <div><span>Data</span><strong>{date(pedido.createdAt)}</strong></div>
            <div><span>Observações</span><strong>{pedido.observacoes || "-"}</strong></div>
          </div>
        </section>
      </div>
    </>
  );
}

function DesignerCard({
  pedido,
  numero,
  active,
  onSelect
}: {
  pedido: Pedido;
  numero: string;
  active: boolean;
  onSelect: () => void;
}) {
  const previewUrl = getPedidoPreviewUrl(pedido);
  return (
    <button
      className={`designer-order-card ${active ? "active" : ""}`}
      type="button"
      onClick={onSelect}
    >
      <span className="designer-order-art">
        {previewUrl ? <img src={previewUrl} alt={`Referencia de ${numero}`} /> : <ImageIcon size={24} />}
      </span>
      <span>
        <strong>{numero}</strong>
        <small>{pedido.clienteNome}</small>
        <small className={previewUrl ? "" : "designer-missing-art"}>{arteStatusText(pedido)}</small>
        <small>{date(pedido.createdAt)}</small>
      </span>
      <PriorityBadge prioridade={pedido.prioridade} />
    </button>
  );
}

function arteStatusText(pedido: Pedido) {
  const artes = normalizePedidoArtes(pedido);
  if (pedidoTemTodasArtesFinais(pedido)) return `${artes.length} arte${artes.length > 1 ? "s" : ""} finalizada${artes.length > 1 ? "s" : ""}`;
  const referencias = artes.filter((arte) => arte.referenciaUrl).length;
  if (referencias > 0) return `${referencias}/${artes.length} referência${referencias > 1 ? "s" : ""}`;
  return "Sem arte no pedido";
}

function productionSheetImageUrls(pedido: Pedido, pendingUrls: string[]) {
  const savedUrls = (pedido.imagensProducao || []).map((image) => image.url).filter(Boolean);
  if (savedUrls.length || pendingUrls.length) return [...savedUrls, ...pendingUrls].slice(0, 4);

  return normalizePedidoArtes(pedido)
    .map((arte) => arte.arteFinalUrl || arte.referenciaUrl || "")
    .filter(Boolean)
    .slice(0, 4);
}

async function generateProductionSheetPdf({
  pedido,
  numero,
  empresa,
  designer,
  detalhesArte,
  imageUrls
}: {
  pedido: Pedido;
  numero: string;
  empresa: Empresa;
  designer: string;
  detalhesArte: string;
  imageUrls: string[];
}) {
  const pdf = new SimplePdf();
  const logo = await loadPdfImage(empresa.logoUrl || "/logo.png", "ImLogo", 170, 120).catch(() => null);
  const images = (await Promise.all(
    imageUrls.map((url, index) => loadPdfImage(url, `ImFicha${index + 1}`, 520, 380).catch(() => null))
  )).filter(Boolean) as PdfImageData[];

  drawProductionSheetHeader(pdf, empresa, logo, numero, pedido.clienteNome);

  let y = 604;
  pdf.rect(44, y - 10, 507, 30, "0.94 0.96 0.98");
  pdf.text({ text: "Ficha para Estamparia", x: 58, y, size: 14, bold: true });
  pdf.text({ text: `Tipo: ${pedido.tipoEstampa || "-"}`, x: 360, y, size: 10, bold: true });
  y -= 32;

  if (images.length) {
    const slots = [
      { x: 58, y: 420, width: 230, height: 155 },
      { x: 307, y: 420, width: 230, height: 155 },
      { x: 58, y: 244, width: 230, height: 155 },
      { x: 307, y: 244, width: 230, height: 155 }
    ];

    images.forEach((image, index) => {
      const slot = slots[index];
      if (!slot) return;
      pdf.rect(slot.x - 4, slot.y - 4, slot.width + 8, slot.height + 8, "0.98 0.98 0.99");
      const fitted = fitImage(image, slot.width, slot.height);
      pdf.image(image, slot.x + (slot.width - fitted.width) / 2, slot.y + (slot.height - fitted.height) / 2, fitted.width, fitted.height);
      pdf.text({ text: `Imagem ${index + 1}`, x: slot.x, y: slot.y - 17, size: 8, bold: true });
    });
    y = 210;
  } else {
    pdf.rect(58, 430, 479, 120, "0.96 0.96 0.97");
    centerPdfText(pdf, "Nenhuma imagem adicionada para a ficha.", 488, 11, true);
    y = 388;
  }

  pdf.text({ text: "Itens do pedido", x: 58, y, size: 12, bold: true });
  y -= 18;
  pdf.rect(58, y - 7, 479, 20, "0.92 0.94 0.97");
  pdf.text({ text: "Peca", x: 66, y, size: 8, bold: true });
  pdf.text({ text: "Tamanho", x: 180, y, size: 8, bold: true });
  pdf.text({ text: "Cor", x: 258, y, size: 8, bold: true });
  pdf.text({ text: "Gola", x: 378, y, size: 8, bold: true });
  pdf.text({ text: "Qtd.", x: 500, y, size: 8, bold: true });
  y -= 20;

  pedido.itens.slice(0, 8).forEach((item) => {
    pdf.text({ text: truncatePdf(item.tipo || "-", 18), x: 66, y, size: 9 });
    pdf.text({ text: truncatePdf(item.tamanho || "-", 12), x: 180, y, size: 9 });
    pdf.text({ text: truncatePdf(item.cor || "-", 20), x: 258, y, size: 9 });
    pdf.text({ text: truncatePdf(item.gola || "-", 16), x: 378, y, size: 9 });
    pdf.text({ text: String(item.quantidade || 0), x: 505, y, size: 9, bold: true });
    pdf.line({ x1: 58, y1: y - 8, x2: 537, y2: y - 8 });
    y -= 18;
  });

  y -= 6;
  pdf.text({ text: "Orientacoes do designer", x: 58, y, size: 12, bold: true });
  y -= 18;
  pdf.text({ text: `Designer: ${designer || pedido.designer || "-"}`, x: 58, y, size: 9, bold: true });
  y -= 16;
  wrapText(detalhesArte || pedido.detalhesArte || "Sem orientacoes adicionais.", 470, 9).slice(0, 5).forEach((line) => {
    pdf.text({ text: line, x: 58, y, size: 9 });
    y -= 13;
  });

  if (pedido.observacoes) {
    y -= 4;
    pdf.text({ text: "Observacoes do pedido", x: 58, y, size: 10, bold: true });
    y -= 14;
    wrapText(pedido.observacoes, 470, 9).slice(0, 4).forEach((line) => {
      pdf.text({ text: line, x: 58, y, size: 9 });
      y -= 12;
    });
  }

  pdf.line({ x1: 44, y1: 42, x2: 551, y2: 42 });
  centerPdfText(pdf, "Documento para orientacao interna da estamparia.", 24, 8);
  pdf.save(`ficha-estamparia-${numero.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

function drawProductionSheetHeader(pdf: SimplePdf, empresa: Empresa, logo: PdfImageData | null, numero: string, cliente: string) {
  pdf.rect(40, 680, 515, 122, "0.97 0.98 0.99");
  if (logo) pdf.image(logo, 263, 742, 68, 48);
  centerPdfText(pdf, empresa.nome || "MalhaSys", 722, 17, true);
  const dadosEmpresa = [empresa.cnpj, empresa.endereco, empresa.telefone, empresa.email].filter(Boolean).join(" - ");
  wrapText(dadosEmpresa || "Dados da empresa nao informados", 430, 9).slice(0, 2).forEach((line, index) => {
    centerPdfText(pdf, line, 706 - index * 12, 9);
  });
  pdf.line({ x1: 64, y1: 688, x2: 531, y2: 688 });
  centerPdfText(pdf, `${numero} - ${cliente || "Cliente nao informado"}`, 665, 13, true);
  centerPdfText(pdf, `Gerado em ${new Intl.DateTimeFormat("pt-BR").format(new Date())}`, 648, 9);
}

function loadPdfImage(src: string, name: string, maxWidth: number, maxHeight: number): Promise<PdfImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const fitted = fitDimensions(image.naturalWidth, image.naturalHeight, maxWidth, maxHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(fitted.width));
      canvas.height = Math.max(1, Math.round(fitted.height));
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas indisponivel."));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let dataHex = "";
      for (let index = 0; index < data.length; index += 4) {
        dataHex += data[index].toString(16).padStart(2, "0");
        dataHex += data[index + 1].toString(16).padStart(2, "0");
        dataHex += data[index + 2].toString(16).padStart(2, "0");
      }

      resolve({ name, width: canvas.width, height: canvas.height, dataHex: dataHex.toUpperCase() });
    };
    image.onerror = () => reject(new Error("Nao foi possivel carregar a imagem."));
    image.src = src.startsWith("blob:") || src.startsWith("http") ? src : new URL(src, window.location.origin).href;
  });
}

function fitImage(image: PdfImageData, maxWidth: number, maxHeight: number) {
  return fitDimensions(image.width, image.height, maxWidth, maxHeight);
}

function fitDimensions(width: number, height: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: width * scale, height: height * scale };
}

function centerPdfText(pdf: SimplePdf, text: string, y: number, size: number, bold = false) {
  const width = text.length * size * 0.52;
  pdf.text({ text, x: Math.max(40, 297.5 - width / 2), y, size, bold });
}

function truncatePdf(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ArtPreviewCard({
  arte,
  index,
  previewUrl,
  previewType,
  numero
}: {
  arte: PedidoArte;
  index: number;
  previewUrl?: string;
  previewType: string;
  numero: string;
}) {
  const finalUrl = previewUrl || arte.arteFinalUrl || "";
  const referenceUrl = arte.referenciaUrl || "";
  const visibleUrl = finalUrl || referenceUrl;
  const label = finalUrl ? "Arte final" : referenceUrl ? "Referência" : "Sem referência";
  const isPdf = previewType === "application/pdf" || visibleUrl.toLowerCase().includes(".pdf");

  return (
    <div className="designer-art-card">
      <div className="designer-art-card-header">
        <strong>{arte.nome || `Arte ${index + 1}`}</strong>
        <span className={finalUrl ? "badge solid bg-green" : "badge solid bg-gray"}>{finalUrl ? "Final enviada" : "Pendente"}</span>
      </div>
      {visibleUrl ? (
        isPdf ? (
          <a className="empty-inline designer-file-preview" href={visibleUrl} target="_blank" rel="noreferrer">
            <ImageIcon size={28} />
            <strong>{label} em PDF</strong>
            <small>Abrir arquivo</small>
          </a>
        ) : (
          <img src={visibleUrl} alt={`${label} ${index + 1} de ${numero}`} />
        )
      ) : (
        <div className="empty-inline">
          <ImageIcon size={28} />
          <strong>Sem arte no pedido</strong>
        </div>
      )}
    </div>
  );
}
