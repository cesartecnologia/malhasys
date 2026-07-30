import { doc, updateDoc } from "firebase/firestore";
import { CheckCircle2, ChevronRight, ClipboardList, PackageCheck, Palette, Scissors, Shirt } from "lucide-react";
import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { PageHeader } from "../../components/PageHeader";
import { SystemNotify } from "../../components/SystemNotify";
import { usePedidos } from "../../hooks/usePedidos";
import { db, ensureAuthenticated } from "../../lib/firebase";
import { buildPedidoNumberMap, money, pedidoNumber } from "../../lib/format";
import { ARTE_FINAL_OBRIGATORIA, pedidoPodeEntrarNoStatus } from "../../lib/pedidoWorkflow";
import { statusMatches } from "../../lib/status";
import type { Empresa, Pedido, Perfil, StatusPedido } from "../../types";

const statuses: { id: StatusPedido; label: string; icon: typeof CheckCircle2; color: string }[] = [
  { id: "Aguardando Arte", label: "Pedido Criado", icon: ClipboardList, color: "bg-gray" },
  { id: "Arte Aprovada", label: "Arte Aprovada", icon: CheckCircle2, color: "bg-blue" },
  { id: "Corte", label: "Corte", icon: Scissors, color: "bg-purple" },
  { id: "Estamparia", label: "Estamparia", icon: Palette, color: "bg-pink" },
  { id: "Costura", label: "Costura", icon: Shirt, color: "bg-orange" },
  { id: "Em Preparação", label: "Preparação para Envio", icon: PackageCheck, color: "bg-yellow" }
];

export function Producao() {
  const { pedidos } = usePedidos();
  const { mostrarFinanceiro } = useOutletContext<{ perfil: Perfil; mostrarFinanceiro: boolean; empresa: Empresa; usuarioNome: string }>();
  const numeroMap = buildPedidoNumberMap(pedidos);
  const [selectedStatus, setSelectedStatus] = useState<StatusPedido>("Aguardando Arte");
  const [workflowNotice, setWorkflowNotice] = useState(false);
  const orders = pedidos.filter((pedido) => statusMatches(pedido.status, selectedStatus));

  async function moveNext(pedido: Pedido) {
    const currentIndex = statuses.findIndex((status) => status.id === selectedStatus);
    const next = statuses[currentIndex + 1]?.id || "Enviado";
    if (!pedidoPodeEntrarNoStatus(pedido, next)) {
      setWorkflowNotice(true);
      return;
    }

    await ensureAuthenticated();
    await updateDoc(doc(db, "pedidos", pedido.id), { status: next });
  }

  return (
    <>
      <PageHeader title="Produção" subtitle="Acompanhe e atualize o status dos pedidos em produção" />

      <section className="card production-flow-card">
        <div className="card-content production-flow-content">
          {statuses.map((status, index) => {
            const Icon = status.icon;
            return (
              <button
                key={status.id}
                type="button"
                className={`production-flow-step ${selectedStatus === status.id ? "active" : ""}`}
                onClick={() => setSelectedStatus(status.id)}
                title={status.label}
              >
                <span className={status.color}>
                  <Icon size={17} />
                </span>
                <strong>{status.label}</strong>
                {index < statuses.length - 1 ? <ChevronRight className="flow-chevron" size={17} /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid cols-3" style={{ marginTop: 16 }}>
        {orders.length > 0 ? orders.map((pedido) => {
          const status = statuses.find((item) => item.id === selectedStatus)!;
          const currentIndex = statuses.findIndex((item) => item.id === selectedStatus);
          const nextStatus = statuses[currentIndex + 1]?.id || "Enviado";
          const bloqueadoSemArte = !pedidoPodeEntrarNoStatus(pedido, nextStatus);
          return (
            <article className="card" key={pedido.id}>
              <div className="card-content grid">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Pedido</p>
                    <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800 }}>{pedidoNumber(pedido.id, numeroMap)}</p>
                  </div>
                  <span className={`badge solid production-card-status ${status.color}`}>{status.label}</span>
                </div>
                <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
                  <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Cliente</p>
                  <p style={{ margin: "4px 0 0" }}>{pedido.clienteNome || pedido.clienteId}</p>
                </div>
                {mostrarFinanceiro ? (
                  <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
                    <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Valor Total</p>
                    <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800 }}>{money(pedido.valorTotal)}</p>
                  </div>
                ) : null}
                {pedido.observacoes ? (
                  <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
                    <p className="muted" style={{ margin: 0, fontWeight: 700 }}>Observações</p>
                    <p style={{ margin: "4px 0 0" }}>{pedido.observacoes}</p>
                  </div>
                ) : null}
                <button
                  onClick={() => moveNext(pedido)}
                  title={bloqueadoSemArte ? ARTE_FINAL_OBRIGATORIA : undefined}
                >
                  {bloqueadoSemArte ? "Arte final obrigatória" : "Próximo Status"} <ChevronRight size={17} />
                </button>
                <Link className="button secondary" to={`/producao/${encodeURIComponent(selectedStatus)}/${pedido.id}`}>Abrir detalhe</Link>
              </div>
            </article>
          );
        }) : (
          <section className="card full">
            <div className="card-content" style={{ textAlign: "center", paddingBlock: 36 }}>
              <p className="muted">Nenhum pedido neste status</p>
            </div>
          </section>
        )}
      </div>
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
