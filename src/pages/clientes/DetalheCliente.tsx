import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar } from "../../components/Avatar";
import { StatusBadge } from "../../components/Badges";
import { LoadingSpinner } from "../../components/LoadingSpinner";
import { PageHeader } from "../../components/PageHeader";
import { usePedidos } from "../../hooks/usePedidos";
import { db } from "../../lib/firebase";
import { buildPedidoNumberMap, date, money, pedidoNumber } from "../../lib/format";
import type { Cliente } from "../../types";

export function DetalheCliente() {
  const { id = "" } = useParams();
  const { pedidos } = usePedidos();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "clientes", id), (snapshot) => {
      setCliente(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Cliente) : null);
      setLoading(false);
    });
    return unsubscribe;
  }, [id]);

  if (loading) return <LoadingSpinner />;
  if (!cliente) return <p className="muted">Cliente não encontrado.</p>;

  const historico = pedidos.filter((pedido) => pedido.clienteId === cliente.id);
  const numeroMap = buildPedidoNumberMap(pedidos);
  const total = historico.reduce((sum, pedido) => sum + Number(pedido.valorTotal || 0), 0);

  return (
    <>
      <PageHeader title={cliente.nome} subtitle={formatLocation(cliente.cidade, cliente.estado)} />
      <div className="detail-layout">
        <section className="panel grid">
          <div className="row-title">
            <Avatar name={cliente.nome} src={cliente.fotoUrl} />
            <strong>{cliente.nome}</strong>
          </div>
          <div className="key-values">
            <div><span>Endereço</span><strong>{cliente.endereco || "-"}</strong></div>
            <div><span>Cidade/Estado</span><strong>{formatLocation(cliente.cidade, cliente.estado)}</strong></div>
            <div><span>CNPJ/CPF</span><strong>{cliente.documento || "-"}</strong></div>
            <div><span>Email</span><strong>{cliente.email || "-"}</strong></div>
            <div><span>WhatsApp</span><strong>{cliente.whatsapp || "-"}</strong></div>
          </div>
        </section>
        <aside className="panel key-values">
          <div><span>Total de pedidos</span><strong>{historico.length}</strong></div>
          <div><span>Valor total acumulado</span><strong>{money(total)}</strong></div>
        </aside>
      </div>
      <section className="panel" style={{ marginTop: 16 }}>
        <h2>Histórico de pedidos</h2>
        <div className="list">
          {historico.map((pedido) => (
            <Link className="row" to={`/pedidos/${pedido.id}`} key={pedido.id}>
              <div>
                <div className="row-title">{pedidoNumber(pedido.id, numeroMap)} · {money(pedido.valorTotal)}</div>
                <div className="row-meta">{date(pedido.createdAt)}</div>
              </div>
              <StatusBadge status={pedido.status} />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

function formatLocation(cidade?: string, estado?: string) {
  if (cidade && estado) return `${cidade}/${estado}`;
  return cidade || estado || "-";
}
