import { collection, getDocs, writeBatch } from "firebase/firestore";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useClientes } from "../hooks/useClientes";
import { usePedidos } from "../hooks/usePedidos";
import { db, ensureAuthenticated } from "../lib/firebase";
import { friendlyErrorMessage } from "../lib/publicErrors";
import type { Empresa, Perfil } from "../types";

const CONFIRM_TEXT = "APAGAR";

export function AdminLimpezaPage() {
  const navigate = useNavigate();
  const { perfil } = useOutletContext<{ perfil: Perfil; mostrarFinanceiro: boolean; empresa: Empresa; usuarioNome: string }>();
  const { clientes } = useClientes();
  const { pedidos } = usePedidos();
  const [confirmText, setConfirmText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canDelete = perfil === "Administrador" && confirmText.trim().toUpperCase() === CONFIRM_TEXT;

  async function apagarDados() {
    if (!canDelete) return;
    setSaving(true);
    setMessage("");

    try {
      await ensureAuthenticated();
      const deletedPedidos = await deleteCollectionDocs("pedidos");
      const deletedClientes = await deleteCollectionDocs("clientes");
      setConfirmText("");
      setMessage(`Limpeza concluída. ${deletedPedidos} pedido(s) e ${deletedClientes} cliente(s) removidos.`);
    } catch (err) {
      setMessage(friendlyErrorMessage(err, "Não foi possível apagar os dados do sistema."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Administração"
        subtitle="Limpeza de dados operacionais do sistema."
        actions={
          <button className="secondary compact-button" type="button" onClick={() => navigate("/")}>
            Voltar
          </button>
        }
      />

      <section className="panel admin-cleanup-panel">
        <div className="admin-cleanup-alert">
          <AlertTriangle size={28} />
          <div>
            <h2>Apagar dados operacionais</h2>
            <p>
              Esta ação remove todos os clientes e pedidos. Os envios são removidos junto com os pedidos, porque fazem parte dos dados do pedido.
            </p>
            <p>Usuários e configurações da empresa não serão apagados.</p>
          </div>
        </div>

        <div className="grid cols-3">
          <div className="card">
            <div className="card-content">
              <p className="muted">Clientes</p>
              <strong className="admin-cleanup-count">{clientes.length}</strong>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <p className="muted">Pedidos</p>
              <strong className="admin-cleanup-count">{pedidos.length}</strong>
            </div>
          </div>
          <div className="card">
            <div className="card-content">
              <p className="muted">Envios</p>
              <strong className="admin-cleanup-count">{pedidos.filter((pedido) => ["Em Preparação", "Enviado", "Entregue"].includes(pedido.status)).length}</strong>
            </div>
          </div>
        </div>

        <label className="field">
          <span>Digite APAGAR para confirmar</span>
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="APAGAR"
            autoComplete="off"
          />
        </label>

        {message ? <p className="muted">{message}</p> : null}

        <div className="form-actions-line">
          <button className="compact-button danger" type="button" disabled={!canDelete || saving} onClick={() => void apagarDados()}>
            <Trash2 size={17} /> {saving ? "Apagando..." : "Apagar dados"}
          </button>
        </div>
      </section>
    </>
  );
}

async function deleteCollectionDocs(collectionName: "clientes" | "pedidos") {
  const snapshot = await getDocs(collection(db, collectionName));
  let batch = writeBatch(db);
  let batchCount = 0;
  let deleted = 0;

  for (const document of snapshot.docs) {
    batch.delete(document.ref);
    batchCount += 1;
    deleted += 1;

    if (batchCount === 450) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  return deleted;
}
