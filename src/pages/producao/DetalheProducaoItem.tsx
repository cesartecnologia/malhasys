import { useParams } from "react-router-dom";
import { PedidoDetail } from "../pedidos/DetalhePedido";

export function DetalheProducaoItem() {
  const { id = "", etapa = "" } = useParams();
  return <PedidoDetail id={id} backTo={`/producao/${encodeURIComponent(decodeURIComponent(etapa))}`} />;
}
