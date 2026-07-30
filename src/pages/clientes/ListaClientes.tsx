import { deleteDoc, doc, updateDoc } from "firebase/firestore";
import { CheckCircle2, Edit3, Grid2X2, List, Mail, MoreHorizontal, Phone, Plus, Save, Trash2, X, XCircle } from "lucide-react";
import { FormEvent, MouseEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { PageHeader } from "../../components/PageHeader";
import { useClientes } from "../../hooks/useClientes";
import { db, ensureAuthenticated } from "../../lib/firebase";
import { friendlyErrorMessage } from "../../lib/publicErrors";
import type { Cliente } from "../../types";

type ViewMode = "cards" | "list";

export function ListaClientes() {
  const navigate = useNavigate();
  const { clientes, loading, error } = useClientes();
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cliente | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  function openDetails(cliente: Cliente) {
    navigate(`/clientes/${cliente.id}`);
  }

  function stopAction(event: MouseEvent) {
    event.stopPropagation();
  }

  function startEdit(cliente: Cliente) {
    setEditing(cliente);
    setMenuOpen(null);
    setFormError("");
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    const form = new FormData(event.currentTarget);
    setSaving(true);
    setFormError("");

    try {
      await ensureAuthenticated();
      await updateDoc(doc(db, "clientes", editing.id), {
        nome: form.get("nome"),
        documento: form.get("documento"),
        endereco: form.get("endereco"),
        cidade: form.get("cidade"),
        estado: String(form.get("estado") || "").trim().toUpperCase().slice(0, 2),
        email: form.get("email"),
        whatsapp: form.get("whatsapp")
      });
      setEditing(null);
    } catch (err) {
      setFormError(friendlyErrorMessage(err, "Não foi possível salvar o cliente."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(cliente: Cliente) {
    await ensureAuthenticated();
    await updateDoc(doc(db, "clientes", cliente.id), { ativo: cliente.ativo === false });
    setMenuOpen(null);
  }

  async function excluirCliente() {
    if (!deleteTarget) return;
    await ensureAuthenticated();
    await deleteDoc(doc(db, "clientes", deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Gerencie seus clientes e suas informações"
        actions={
          <div className="view-header-actions">
            <div className="view-toggle header-view-toggle" aria-label="Alternar visualização">
              <button
                className={viewMode === "cards" ? "active" : ""}
                type="button"
                aria-label="Visualizar em cards"
                onClick={() => setViewMode("cards")}
              >
                <Grid2X2 size={17} />
              </button>
              <button
                className={viewMode === "list" ? "active" : ""}
                type="button"
                aria-label="Visualizar em lista"
                onClick={() => setViewMode("list")}
              >
                <List size={18} />
              </button>
            </div>
            <Link className="button" to="/clientes/novo"><Plus size={18} /> Novo Cliente</Link>
          </div>
        }
      />
      {error ? <p className="muted">Erro ao carregar clientes: {error}</p> : null}
      {loading ? <LoadingSpinner /> : null}
      {!loading && clientes.length === 0 ? <EmptyState title="Nenhum cliente cadastrado." action={<Link className="button" to="/clientes/novo">Adicionar cliente</Link>} /> : null}
      {!loading && clientes.length > 0 ? (
        <section className="clients-section">
          <div className="clients-content">
            {viewMode === "cards" ? (
              <div className="clients-grid">
                {clientes.map((cliente) => (
                  <article
                    className={`client-card ${cliente.ativo === false ? "inactive" : ""}`}
                    key={cliente.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openDetails(cliente)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openDetails(cliente);
                    }}
                  >
                    <div className="client-card-top">
                      <Avatar name={cliente.nome} src={cliente.fotoUrl} />
                      <div>
                        <h3>{cliente.nome}</h3>
                        <p>{formatLocation(cliente.cidade, cliente.estado)}</p>
                      </div>
                      <ActionMenu
                        cliente={cliente}
                        menuOpen={menuOpen}
                        setMenuOpen={setMenuOpen}
                        onEdit={startEdit}
                        onToggle={toggleAtivo}
                        onDelete={(item) => {
                          setDeleteTarget(item);
                          setMenuOpen(null);
                        }}
                        onActionClick={stopAction}
                      />
                    </div>
                    <div className="client-card-info">
                      <span><Mail size={14} /> {cliente.email || "-"}</span>
                      <span><Phone size={14} /> {cliente.whatsapp || "-"}</span>
                    </div>
                    <div className="client-card-footer">
                      <span className="client-code">{cliente.id.slice(0, 6).toUpperCase()}</span>
                      <StatusBadge ativo={cliente.ativo !== false} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="table-wrap">
                <table className="items-table clients-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nome</th>
                      <th>Contato</th>
                      <th>Cidade/Estado</th>
                      <th>Status</th>
                      <th className="actions-heading">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((cliente) => (
                      <tr className="clickable-row" key={cliente.id} onClick={() => openDetails(cliente)}>
                        <td>{cliente.id.slice(0, 6).toUpperCase()}</td>
                        <td><strong>{cliente.nome}</strong></td>
                        <td>
                          <div style={{ display: "grid", gap: 4 }}>
                            <span><Mail size={13} /> {cliente.email || "-"}</span>
                            <span><Phone size={13} /> {cliente.whatsapp || "-"}</span>
                          </div>
                        </td>
                        <td>{formatLocation(cliente.cidade, cliente.estado)}</td>
                        <td><StatusBadge ativo={cliente.ativo !== false} /></td>
                        <td className="actions-cell" onClick={stopAction}>
                          <ActionMenu
                            cliente={cliente}
                            menuOpen={menuOpen}
                            setMenuOpen={setMenuOpen}
                            onEdit={startEdit}
                            onToggle={toggleAtivo}
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
          </div>
        </section>
      ) : null}

      {editing ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setEditing(null)}>
          <form className="modal form-grid" onSubmit={submitEdit} onClick={(event) => event.stopPropagation()}>
            <div className="modal-title-row full">
              <div>
                <h2>Editar cliente</h2>
                <p className="muted">Atualize os dados cadastrais do cliente.</p>
              </div>
              <button className="modal-close-button" type="button" aria-label="Fechar" onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <label className="field"><span>Nome</span><input name="nome" required defaultValue={editing.nome || ""} /></label>
            <label className="field"><span>CNPJ/CPF</span><input name="documento" defaultValue={editing.documento || ""} /></label>
            <label className="field"><span>Endereço</span><input name="endereco" defaultValue={editing.endereco || ""} /></label>
            <label className="field"><span>Cidade</span><input name="cidade" defaultValue={editing.cidade || ""} /></label>
            <label className="field"><span>Estado</span><input name="estado" maxLength={2} defaultValue={editing.estado || ""} /></label>
            <label className="field"><span>Email</span><input name="email" type="email" defaultValue={editing.email || ""} /></label>
            <label className="field"><span>WhatsApp</span><input name="whatsapp" defaultValue={editing.whatsapp || ""} /></label>
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
            <strong>Excluir cliente?</strong>
            <p>Esta ação remove {deleteTarget.nome} da coleção de clientes.</p>
          </div>
          <div className="notify-actions">
            <button className="secondary compact-button" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button className="compact-button danger" type="button" onClick={() => void excluirCliente()}>Excluir</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ActionMenu({
  cliente,
  menuOpen,
  setMenuOpen,
  onEdit,
  onToggle,
  onDelete,
  onActionClick
}: {
  cliente: Cliente;
  menuOpen: string | null;
  setMenuOpen: (id: string | null | ((current: string | null) => string | null)) => void;
  onEdit: (cliente: Cliente) => void;
  onToggle: (cliente: Cliente) => Promise<void>;
  onDelete: (cliente: Cliente) => void;
  onActionClick?: (event: MouseEvent) => void;
}) {
  const active = cliente.ativo !== false;

  return (
    <div className="client-actions" onClick={onActionClick}>
      <button
        className="secondary icon-button row-menu-trigger"
        type="button"
        aria-label="Abrir ações"
        onClick={() => setMenuOpen((current) => (current === cliente.id ? null : cliente.id))}
      >
        <MoreHorizontal size={18} />
      </button>
      {menuOpen === cliente.id ? (
        <div className="row-actions-menu">
          <button type="button" onClick={() => onEdit(cliente)}><Edit3 size={15} /> Editar</button>
          <button type="button" onClick={() => void onToggle(cliente)}>
            {active ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
            {active ? "Desativar" : "Ativar"}
          </button>
          <button className="danger" type="button" onClick={() => onDelete(cliente)}><Trash2 size={15} /> Excluir</button>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({ ativo }: { ativo: boolean }) {
  return (
    <span className={`badge ${ativo ? "success-soft" : "danger-soft"}`}>
      {ativo ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

function formatLocation(cidade?: string, estado?: string) {
  if (cidade && estado) return `${cidade}/${estado}`;
  return cidade || estado || "-";
}
