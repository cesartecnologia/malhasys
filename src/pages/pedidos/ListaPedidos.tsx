import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { AlertCircle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Edit3, Filter, Grid2X2, ImageIcon, List as ListIcon, MoreHorizontal, Plus, Save, Search, Trash2, UserRound, WalletCards, X, XCircle } from "lucide-react";
import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { PageHeader } from "../../components/PageHeader";
import { SystemNotify } from "../../components/SystemNotify";
import { db, ensureAuthenticated } from "../../lib/firebase";
import { buildPedidoNumberMap, date, money, parseCurrency, pedidoNumber as formatPedidoNumber } from "../../lib/format";
import { getPedidoPreviewUrl, normalizePedidoArtes } from "../../lib/pedidoArtes";
import { ARTE_FINAL_OBRIGATORIA, pedidoPodeEntrarNoStatus } from "../../lib/pedidoWorkflow";
import { friendlyErrorMessage } from "../../lib/publicErrors";
import { isCanceled, statusLabel, statusMatches } from "../../lib/status";
import { etapas, type Pedido, type Prioridade, type StatusPedido } from "../../types";
import { usePedidos } from "../../hooks/usePedidos";

type ViewMode = "cards" | "list";
const PAGE_SIZE = 16;

export function ListaPedidos() {
  const navigate = useNavigate();
  const { pedidos, loading, error } = usePedidos();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("Todos");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Pedido | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Pedido | null>(null);
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [workflowNotice, setWorkflowNotice] = useState(false);

  const numeroMap = useMemo(() => buildPedidoNumberMap(pedidos), [pedidos]);

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase();
    return pedidos.filter((pedido) => {
      const numero = pedidoNumber(pedido.id, numeroMap).toLowerCase();
      const matchBusca = pedido.clienteNome?.toLowerCase().includes(termo) || numero.includes(termo);
      const matchStatus = status === "Todos" || statusMatches(pedido.status, status);
      return matchBusca && matchStatus;
    });
  }, [pedidos, busca, status, numeroMap]);

  const totalPages = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginatedPedidos = filtrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [busca, status, viewMode]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function openDetails(pedido: Pedido) {
    navigate(`/pedidos/${pedido.id}`);
  }

  function stopAction(event: MouseEvent) {
    event.stopPropagation();
  }

  function startEdit(pedido: Pedido) {
    setEditing(pedido);
    setMenuOpen(null);
    setFormError("");
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const form = new FormData(event.currentTarget);
    const nextStatus = form.get("status") as StatusPedido;
    if (!pedidoPodeEntrarNoStatus(editing, nextStatus)) {
      setWorkflowNotice(true);
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await ensureAuthenticated();
      await updateDoc(doc(db, "pedidos", editing.id), {
        status: nextStatus,
        prioridade: form.get("prioridade") as Prioridade,
        valorTotal: parseCurrency(form.get("valorTotal")),
        valorEntrada: parseCurrency(form.get("valorEntrada")),
        formaPagamento: form.get("formaPagamento"),
        observacoes: form.get("observacoes")
      });
      setEditing(null);
    } catch (err) {
      setFormError(friendlyErrorMessage(err, "Não foi possível salvar o pedido."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCancelado(pedido: Pedido) {
    await ensureAuthenticated();
    const canceled = isCanceled(pedido.status);
    await updateDoc(doc(db, "pedidos", pedido.id), {
      status: canceled ? "Aguardando Arte" : "Cancelado",
      ativo: canceled
    });
    setMenuOpen(null);
  }

  async function excluirPedido() {
    if (!deleteTarget) return;
    await ensureAuthenticated();
    await deleteDoc(doc(db, "pedidos", deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <>
      <PageHeader
        title="Pedidos"
        subtitle="Gerencie todos os pedidos"
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
            <Link className="button" to="/pedidos/novo">
              <Plus size={18} /> Novo Pedido
            </Link>
          </div>
        }
      />
      <div className="toolbar pedidos-toolbar">
        <div className="pedidos-search">
          <Search size={17} style={{ position: "absolute", left: 12, top: 13, color: "var(--color-muted)" }} />
          <input className="search" style={{ paddingLeft: 38 }} placeholder="Buscar por cliente ou número do pedido..." value={busca} onChange={(event) => setBusca(event.target.value)} />
        </div>
        <label className="field pedidos-filter">
          <span>
            <Filter size={14} /> Status
          </span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option>Todos</option>
            {etapas.map((etapa) => (
              <option key={etapa}>{etapa}</option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="muted">Erro ao carregar pedidos: {error}</p> : null}
      {loading ? <LoadingSpinner /> : null}
      {!loading && pedidos.length === 0 ? <EmptyState title="Nenhum pedido cadastrado." action={<Link className="button" to="/pedidos/novo">Adicionar pedido</Link>} /> : null}
      {!loading && pedidos.length > 0 ? (
        <>
          <section className="pedidos-section">
            {viewMode === "cards" ? (
              <div className="pedidos-grid">
                {paginatedPedidos.map((pedido) => (
                  (() => {
                    const previewUrl = getPedidoPreviewUrl(pedido);
                    const artes = normalizePedidoArtes(pedido);
                    return (
                  <article
                    className={`pedido-card ${pedido.ativo === false ? "inactive" : ""}`}
                    key={pedido.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetails(pedido)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openDetails(pedido);
                    }}
                  >
                    <div className="pedido-art-preview">
                      {previewUrl ? (
                        <img src={previewUrl} alt={`Arte de ${pedidoNumber(pedido.id, numeroMap)}`} />
                      ) : (
                        <div>
                          <ImageIcon size={22} />
                          <span>Sem arte</span>
                        </div>
                      )}
                    </div>
                    <div className="pedido-card-top">
                      <div>
                        <div className="row-title">
                          {pedidoNumber(pedido.id, numeroMap)}
                          {priorityIcon(pedido.prioridade)}
                        </div>
                        <p className="muted"><UserRound size={14} /> {pedido.clienteNome || "Cliente não informado"}</p>
                      </div>
                      <ActionMenu
                        pedido={pedido}
                        menuOpen={menuOpen}
                        setMenuOpen={setMenuOpen}
                        onEdit={startEdit}
                        onToggle={toggleCancelado}
                        onDelete={(item) => {
                          setDeleteTarget(item);
                          setMenuOpen(null);
                        }}
                        onActionClick={stopAction}
                      />
                    </div>
                    <div className="pedido-card-body">
                      <strong><WalletCards size={15} /> {money(pedido.valorTotal)}</strong>
                    </div>
                    <div className="pedido-art-count">
                      <ImageIcon size={14} /> {artes.filter((arte) => arte.arteFinalUrl).length}/{artes.length} arte{artes.length > 1 ? "s" : ""}
                    </div>
                    <div className="pedido-status-row">
                      <StatusPill status={pedido.status} />
                    </div>
                    <div className="pedido-card-footer">
                      <span><CalendarDays size={14} /> {date(pedido.createdAt)}</span>
                      {isCanceled(pedido.status) ? <span className="badge danger-soft">Cancelado</span> : null}
                    </div>
                  </article>
                    );
                  })()
                ))}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="items-table pedidos-table">
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Cliente</th>
                      <th>Status</th>
                      <th>Data</th>
                      <th style={{ textAlign: "right" }}>Valor</th>
                      <th className="actions-heading">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPedidos.map((pedido) => (
                      <tr className="clickable-row" key={pedido.id} onClick={() => openDetails(pedido)}>
                        <td><strong>{pedidoNumber(pedido.id, numeroMap)}</strong></td>
                        <td>{pedido.clienteNome || "-"}</td>
                        <td><StatusPill status={pedido.status} /></td>
                        <td>{date(pedido.createdAt)}</td>
                        <td style={{ textAlign: "right" }}>{money(pedido.valorTotal)}</td>
                        <td className="actions-cell" onClick={stopAction}>
                          <ActionMenu
                            pedido={pedido}
                            menuOpen={menuOpen}
                            setMenuOpen={setMenuOpen}
                            onEdit={startEdit}
                            onToggle={toggleCancelado}
                            onDelete={(item) => {
                              setDeleteTarget(item);
                              setMenuOpen(null);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filtrados.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </section>
        </>
      ) : null}

      {editing ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <form className="modal form-grid" onSubmit={submitEdit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-title-row full">
              <div>
                <h2>Editar pedido</h2>
                <p className="muted">{pedidoNumber(editing.id, numeroMap)} · {editing.clienteNome}</p>
              </div>
              <button className="modal-close-button" type="button" aria-label="Fechar" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <label className="field">
              <span>Status</span>
              <select name="status" defaultValue={statusLabel(editing.status)}>
                {etapas.map((etapa) => <option key={etapa}>{etapa}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Prioridade</span>
              <select name="prioridade" defaultValue={editing.prioridade}>
                <option>Normal</option>
                <option>Alta</option>
                <option>Urgente</option>
              </select>
            </label>
            <label className="field"><span>Valor total</span><input name="valorTotal" inputMode="numeric" defaultValue={money(editing.valorTotal)} /></label>
            <label className="field"><span>Valor de entrada</span><input name="valorEntrada" inputMode="numeric" defaultValue={money(editing.valorEntrada)} /></label>
            <label className="field"><span>Forma de pagamento</span><input name="formaPagamento" defaultValue={editing.formaPagamento || ""} /></label>
            <label className="field full"><span>Observações</span><textarea name="observacoes" defaultValue={editing.observacoes || ""} /></label>
            {formError ? <p className="muted full">{formError}</p> : null}
            <div className="form-actions-line full">
              <button className="secondary compact-button" type="button" onClick={() => setEditing(null)}>Cancelar</button>
              <button className="compact-button" type="submit" disabled={saving}><Save size={18} /> {saving ? "Salvando..." : "Salvar edição"}</button>
            </div>
          </form>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="notify">
          <div>
            <strong>Excluir pedido?</strong>
            <p>Esta ação remove {pedidoNumber(deleteTarget.id, numeroMap)} da coleção de pedidos.</p>
          </div>
          <div className="notify-actions">
            <button className="secondary compact-button" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button className="compact-button danger" type="button" onClick={() => void excluirPedido()}>Excluir</button>
          </div>
        </div>
      ) : null}
      {workflowNotice ? (
        <SystemNotify
          title="Arte final obrigatória"
          message={ARTE_FINAL_OBRIGATORIA}
          onClose={() => setWorkflowNotice(false)}
        />
      ) : null}
    </>
  );
}

function ActionMenu({
  pedido,
  menuOpen,
  setMenuOpen,
  onEdit,
  onToggle,
  onDelete,
  onActionClick
}: {
  pedido: Pedido;
  menuOpen: string | null;
  setMenuOpen: (id: string | null | ((current: string | null) => string | null)) => void;
  onEdit: (pedido: Pedido) => void;
  onToggle: (pedido: Pedido) => Promise<void>;
  onDelete: (pedido: Pedido) => void;
  onActionClick?: (event: MouseEvent) => void;
}) {
  const canceled = isCanceled(pedido.status);

  return (
    <div className="client-actions" onClick={onActionClick}>
      <button
        className="secondary icon-button row-menu-trigger"
        type="button"
        aria-label="Abrir ações"
        onClick={() => setMenuOpen((current) => (current === pedido.id ? null : pedido.id))}
      >
        <MoreHorizontal size={18} />
      </button>
      {menuOpen === pedido.id ? (
        <div className="row-actions-menu">
          <button type="button" onClick={() => onEdit(pedido)}><Edit3 size={15} /> Editar</button>
          <button type="button" onClick={() => void onToggle(pedido)}>
            {canceled ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
            {canceled ? "Reabrir" : "Cancelar"}
          </button>
          <button className="danger" type="button" onClick={() => onDelete(pedido)}><Trash2 size={15} /> Excluir</button>
        </div>
      ) : null}
    </div>
  );
}

function priorityIcon(priority: Prioridade) {
  if (priority === "Urgente") return <AlertCircle size={17} color="#ef4444" />;
  if (priority === "Alta") return <Clock size={17} color="#f97316" />;
  return null;
}

function StatusPill({ status }: { status: StatusPedido }) {
  const color = {
    "Aguardando Arte": "bg-gray",
    "Arte Aprovada": "bg-blue",
    Corte: "bg-purple",
    Estamparia: "bg-pink",
    Costura: "bg-orange",
    "Em Preparação": "bg-yellow",
    Enviado: "bg-green",
    Entregue: "bg-emerald",
    Cancelado: "bg-gray"
  }[statusLabel(status)];

  return <span className={`badge solid ${color}`}>{statusLabel(status)}</span>;
}

function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="pagination">
      <span>{start}-{end} de {totalItems}</span>
      <div>
        <button className="secondary icon-button" type="button" aria-label="Página anterior" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={18} />
        </button>
        <strong>Página {page} de {totalPages}</strong>
        <button className="secondary icon-button" type="button" aria-label="Próxima página" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function pedidoNumber(id: string, numeroMap: Map<string, number>) {
  return formatPedidoNumber(id, numeroMap);
}
