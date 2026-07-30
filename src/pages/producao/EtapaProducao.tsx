import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PriorityBadge, StatusBadge } from "../../components/Badges";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { usePedidos } from "../../hooks/usePedidos";
import { buildPedidoNumberMap, pedidoNumber } from "../../lib/format";
import { statusMatches, statusLabel } from "../../lib/status";

export function EtapaProducao() {
  const { etapa = "" } = useParams();
  const decoded = decodeURIComponent(etapa);
  const { pedidos } = usePedidos();
  const numeroMap = buildPedidoNumberMap(pedidos);
  const filtrados = pedidos.filter((pedido) => statusMatches(pedido.status, decoded));

  return (
    <>
      <PageHeader
        title={statusLabel(decoded)}
        subtitle="Pedidos nesta fase da produção."
        actions={<Link className="button secondary" to="/producao"><ArrowLeft size={18} /> Voltar</Link>}
      />
      {filtrados.length === 0 ? <EmptyState title="Nenhum pedido nesta etapa." /> : null}
      <div className="list">
        {filtrados.map((pedido) => (
          <Link className="row" to={`/producao/${encodeURIComponent(decoded)}/${pedido.id}`} key={pedido.id}>
            <div>
              <div className="row-title">
                {pedidoNumber(pedido.id, numeroMap)} · {pedido.clienteNome}
                <PriorityBadge prioridade={pedido.prioridade} />
              </div>
              <div className="row-meta">{pedido.cidade}</div>
            </div>
            <StatusBadge status={pedido.status} />
          </Link>
        ))}
      </div>
    </>
  );
}
