import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { Plus, TrendingUp, Users, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { useMetas } from "../hooks/useMetas";
import { db, ensureAuthenticated } from "../lib/firebase";

export function MetasPage() {
  const { metas } = useMetas();
  const [open, setOpen] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await ensureAuthenticated();
    await addDoc(collection(db, "metas"), {
      nome: form.get("nome"),
      periodo: form.get("periodo"),
      valorAlvo: Number(form.get("valorAlvo") || 0),
      valorAtual: Number(form.get("valorAtual") || 0),
      createdAt: serverTimestamp()
    });
    event.currentTarget.reset();
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Metas de Produção"
        subtitle="Defina e acompanhe as metas da equipe"
        actions={<button onClick={() => setOpen(true)}><Plus size={18} /> Nova Meta</button>}
      />
      {metas.length === 0 ? <EmptyState title="Nenhuma meta cadastrada." /> : null}
      <div className="grid cols-3">
        {metas.map((meta) => {
          const progress = Math.min(100, Math.round((Number(meta.valorAtual || 0) / Math.max(Number(meta.valorAlvo || 1), 1)) * 100));
          return (
            <article className="card grid" key={meta.id}>
              <div className="card-content grid">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Membro</p>
                    <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800 }}>{meta.nome}</p>
                  </div>
                  <span style={{ display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: "50%", background: progress >= 100 ? "#dcfce7" : "#dbeafe" }}>
                    <TrendingUp size={21} color={progress >= 100 ? "#16a34a" : "#2563eb"} />
                  </span>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Progresso</p>
                    <strong>{progress}%</strong>
                  </div>
                  <div className="progress"><span style={{ width: `${progress}%` }} /></div>
                </div>
                <div className="grid cols-2" style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
                  <div><p className="muted" style={{ margin: 0 }}>Realizado</p><strong>{meta.valorAtual}</strong></div>
                  <div><p className="muted" style={{ margin: 0 }}>Meta</p><strong>{meta.valorAlvo}</strong></div>
                </div>
                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
                  <p className="muted" style={{ margin: 0 }}>Período</p>
                  <strong>{meta.periodo}</strong>
                </div>
                <label className="field">
                  <span>Atualizar realizado</span>
                  <input type="number" defaultValue={meta.valorAtual} onBlur={async (event) => {
                    await ensureAuthenticated();
                    await updateDoc(doc(db, "metas", meta.id), { valorAtual: Number(event.target.value || 0) });
                  }} />
                </label>
              </div>
            </article>
          );
        })}
      </div>
      {metas.length > 0 ? (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h2 className="card-title">Resumo de Metas</h2>
            <p className="card-description">Visão geral do desempenho da equipe</p>
          </div>
          <div className="card-content grid cols-3">
            <Summary label="Total de Metas" value={metas.length.toString()} />
            <Summary label="Meta Total" value={metas.reduce((sum, meta) => sum + Number(meta.valorAlvo || 0), 0).toString()} />
            <Summary label="Realizado" value={metas.reduce((sum, meta) => sum + Number(meta.valorAtual || 0), 0).toString()} />
          </div>
        </section>
      ) : null}

      {open ? (
        <div className="modal-backdrop">
          <form className="modal grid" onSubmit={submit}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2>Criar Nova Meta</h2>
                <p className="muted">Defina uma meta de produção para um membro da equipe</p>
              </div>
              <button className="modal-close-button" type="button" aria-label="Fechar" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <label className="field"><span>Nome da meta</span><input name="nome" required placeholder="Ex: Equipe de costura" /></label>
            <label className="field"><span>Tipo de Meta</span><input name="periodo" required placeholder="Ex: Dia, Semana ou Mês" /></label>
            <label className="field"><span>Quantidade Meta</span><input name="valorAlvo" type="number" min="1" required /></label>
            <label className="field"><span>Valor atual</span><input name="valorAtual" type="number" defaultValue={0} /></label>
            <button type="submit">Criar Meta</button>
          </form>
        </div>
      ) : null}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 16 }}>
      <p className="muted" style={{ margin: 0 }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800 }}>{value}</p>
    </div>
  );
}
