import { deleteDoc, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { CheckCircle2, Edit3, Mail, MoreHorizontal, Phone, Plus, Save, Trash2, UserRound, XCircle } from "lucide-react";
import { FormEvent, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { PageHeader } from "../components/PageHeader";
import { useUsuarios } from "../hooks/useUsuarios";
import { db, ensureAuthenticated } from "../lib/firebase";
import type { Perfil, Usuario } from "../types";

export function UsuariosPage() {
  const { usuarios, loading, error } = useUsuarios();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setFormError("");

    try {
      await ensureAuthenticated();
      const payload = {
        nome: form.get("nome"),
        email: String(form.get("email") || "").trim().toLowerCase(),
        telefone: form.get("telefone"),
        cargo: form.get("cargo"),
        perfil: form.get("perfil") as Perfil,
        ativo: editing?.ativo ?? true
      };

      if (editing) {
        await updateDoc(doc(db, "usuarios", editing.id), payload);
      } else {
        if (!payload.email) throw new Error("Informe o email do usuario.");
        await setDoc(doc(db, "usuarios", payload.email), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      event.currentTarget.reset();
      setOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Nao foi possivel salvar o usuario.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await ensureAuthenticated();
    await updateDoc(doc(db, "usuarios", id), { ativo });
  }

  async function excluirUsuario() {
    if (!deleteTarget) return;
    await ensureAuthenticated();
    await deleteDoc(doc(db, "usuarios", deleteTarget.id));
    setDeleteTarget(null);
  }

  function startCreate() {
    setEditing(null);
    setOpen(true);
    setFormError("");
  }

  function startEdit(usuario: Usuario) {
    setEditing(usuario);
    setOpen(true);
    setMenuOpen(null);
    setFormError("");
  }

  function closeForm() {
    setOpen(false);
    setEditing(null);
    setFormError("");
  }

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Gerencie quem acessa o sistema."
        actions={<button type="button" onClick={startCreate}><Plus size={18} /> Novo usuário</button>}
      />

      {error ? <p className="muted">Erro ao carregar usuários: {error}</p> : null}
      {loading ? <LoadingSpinner /> : null}

      {open ? (
        <form className="form-card form-grid user-form" onSubmit={submit}>
          <label className="field"><span>Nome</span><input name="nome" required placeholder="Nome completo" defaultValue={editing?.nome || ""} /></label>
          <label className="field"><span>Email</span><input name="email" type="email" required readOnly={Boolean(editing)} placeholder="usuario@empresa.com" defaultValue={editing?.email || ""} /></label>
          <label className="field"><span>Telefone</span><input name="telefone" placeholder="WhatsApp ou telefone" defaultValue={editing?.telefone || ""} /></label>
          <label className="field"><span>Cargo</span><input name="cargo" placeholder="Ex: Designer, Costura, Gestor" defaultValue={editing?.cargo || ""} /></label>
          <label className="field">
            <span>Perfil de acesso</span>
            <select name="perfil" defaultValue={editing?.perfil || "Produção"}>
              <option>Administrador</option>
              <option>Produção</option>
              <option>Designer</option>
            </select>
          </label>
          <div className="form-actions-line">
            <button className="secondary compact-button" type="button" onClick={closeForm}>Cancelar</button>
            <button className="compact-button" type="submit" disabled={saving}><Save size={18} /> {saving ? "Salvando..." : editing ? "Salvar edição" : "Salvar usuário"}</button>
          </div>
          {formError ? <p className="muted full">{formError}</p> : null}
        </form>
      ) : null}

      {!loading && usuarios.length === 0 ? (
        <EmptyState title="Nenhum usuário cadastrado." action={<button type="button" onClick={startCreate}>Cadastrar usuário</button>} />
      ) : null}

      {!loading && usuarios.length > 0 ? (
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Equipe cadastrada</h2>
            <p className="card-description">Usuários que poderão acessar o sistema conforme o perfil definido.</p>
          </div>
          <div className="card-content">
            <div className="table-wrap">
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Contato</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th className="actions-heading">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr key={usuario.id}>
                      <td>
                        <div className="user-table-person">
                          <span><UserRound size={16} /></span>
                          <div>
                            <strong>{usuario.nome}</strong>
                            <small>{usuario.cargo || "Sem cargo informado"}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "grid", gap: 4 }}>
                          <span><Mail size={13} /> {usuario.email}</span>
                          <span><Phone size={13} /> {usuario.telefone || "-"}</span>
                        </div>
                      </td>
                      <td><span className="badge">{usuario.perfil}</span></td>
                      <td>
                        <span className={`badge ${usuario.ativo ? "success-soft" : "danger-soft"}`}>
                          {usuario.ativo ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          {usuario.ativo ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="secondary icon-button row-menu-trigger"
                          type="button"
                          aria-label="Abrir ações"
                          onClick={() => setMenuOpen((current) => (current === usuario.id ? null : usuario.id))}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuOpen === usuario.id ? (
                          <div className="row-actions-menu">
                            <button type="button" onClick={() => startEdit(usuario)}><Edit3 size={15} /> Editar</button>
                            <button type="button" onClick={() => {
                              void toggleAtivo(usuario.id, !usuario.ativo);
                              setMenuOpen(null);
                            }}>
                              {usuario.ativo ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                              {usuario.ativo ? "Desativar" : "Ativar"}
                            </button>
                            <button className="danger" type="button" onClick={() => {
                              setDeleteTarget(usuario);
                              setMenuOpen(null);
                            }}>
                              <Trash2 size={15} /> Excluir
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}
      {deleteTarget ? (
        <div className="notify">
          <div>
            <strong>Excluir usuário?</strong>
            <p>Esta ação remove {deleteTarget.nome} da coleção de usuários.</p>
          </div>
          <div className="notify-actions">
            <button className="secondary compact-button" type="button" onClick={() => setDeleteTarget(null)}>Cancelar</button>
            <button className="compact-button danger" type="button" onClick={() => void excluirUsuario()}>Excluir</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
