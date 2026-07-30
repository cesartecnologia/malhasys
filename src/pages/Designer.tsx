import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { ArrowLeft, CheckCircle2, ExternalLink, Grid2X2, ImageIcon, List as ListIcon, Palette, Save, Search, UploadCloud } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../components/Badges";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { usePedidos } from "../hooks/usePedidos";
import { db, ensureAuthenticated } from "../lib/firebase";
import { buildPedidoNumberMap, date, pedidoNumber } from "../lib/format";
import { getPedidoPreviewUrl, normalizePedidoArtes, pedidoTemTodasArtesFinais } from "../lib/pedidoArtes";
import { friendlyErrorMessage } from "../lib/publicErrors";
import { uploadFile } from "../lib/storage";
import type { Pedido, PedidoArte } from "../types";

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
  const { usuarioNome } = useOutletContext<{ usuarioNome: string }>();
  const { pedidos } = usePedidos();
  const numeroMap = useMemo(() => buildPedidoNumberMap(pedidos), [pedidos]);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [designer, setDesigner] = useState(usuarioNome || "");
  const [detalhesArte, setDetalhesArte] = useState("");
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
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

  async function saveDesignerData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await save(false);
  }

  async function releaseToProduction() {
    await save(true);
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
      await updateDoc(doc(db, "pedidos", pedido.id), {
        designer,
        detalhesArte,
        artes: updatedArtes,
        artesFinalizadas: todasFinalizadas,
        ...(primeiraFinal?.arteFinalUrl ? { arteFinalUrl: primeiraFinal.arteFinalUrl, arteFinalPath: primeiraFinal.arteFinalPath || "" } : {}),
        ...(release && todasFinalizadas ? { status: "Arte Aprovada" } : {})
      });
      setFiles({});
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

      <div className="detail-layout">
        <section className="panel grid">
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

          {message ? <p className="muted">{message}</p> : null}

          <div className="form-actions-line">
            <button className="secondary compact-button" type="submit" disabled={saving}>
              <Save size={17} /> {saving ? "Salvando..." : "Salvar detalhes"}
            </button>
            <button className="compact-button" type="button" disabled={saving} onClick={() => void releaseToProduction()}>
              <UploadCloud size={17} /> Marcar arte aprovada e enviar para produção
            </button>
          </div>
        </form>
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
