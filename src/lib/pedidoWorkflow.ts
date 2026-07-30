import type { Pedido, StatusPedido } from "../types";
import { etapas } from "../types";
import { pedidoTemTodasArtesFinais } from "./pedidoArtes";

export const ARTE_FINAL_OBRIGATORIA =
  "Envie a arte final pelo Designer antes de mover o pedido para Corte.";

export function pedidoPodeEntrarNoStatus(
  pedido: Pick<Pedido, "artes" | "logoUrl" | "logoPath" | "arteFinalUrl" | "arteFinalPath" | "artesFinalizadas">,
  status: StatusPedido
) {
  const corteIndex = etapas.indexOf("Corte");
  const statusIndex = etapas.indexOf(status);
  const exigeArteFinal = statusIndex >= corteIndex;

  return !exigeArteFinal || pedidoTemTodasArtesFinais(pedido);
}
