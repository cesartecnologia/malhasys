import type { Pedido, PedidoArte } from "../types";

export function normalizePedidoArtes(pedido: Pick<Pedido, "artes" | "logoUrl" | "logoPath" | "arteFinalUrl" | "arteFinalPath">): PedidoArte[] {
  if (Array.isArray(pedido.artes) && pedido.artes.length > 0) {
    return pedido.artes.map((arte, index) => ({
      id: arte.id || `arte-${index + 1}`,
      nome: arte.nome || `Arte ${index + 1}`,
      referenciaUrl: arte.referenciaUrl || (index === 0 ? pedido.logoUrl : ""),
      referenciaPath: arte.referenciaPath || (index === 0 ? pedido.logoPath : ""),
      arteFinalUrl: arte.arteFinalUrl || (index === 0 ? pedido.arteFinalUrl : ""),
      arteFinalPath: arte.arteFinalPath || (index === 0 ? pedido.arteFinalPath : "")
    }));
  }

  return [
    {
      id: "arte-1",
      nome: "Arte 1",
      referenciaUrl: pedido.logoUrl || "",
      referenciaPath: pedido.logoPath || "",
      arteFinalUrl: pedido.arteFinalUrl || "",
      arteFinalPath: pedido.arteFinalPath || ""
    }
  ];
}

export function pedidoTemTodasArtesFinais(pedido: Pick<Pedido, "artes" | "logoUrl" | "logoPath" | "arteFinalUrl" | "arteFinalPath" | "artesFinalizadas">) {
  if (pedido.artesFinalizadas) return true;
  return normalizePedidoArtes(pedido).every((arte) => Boolean(arte.arteFinalUrl?.trim()));
}

export function getPedidoPreviewUrl(pedido: Pick<Pedido, "artes" | "logoUrl" | "logoPath" | "arteFinalUrl" | "arteFinalPath">) {
  const artes = normalizePedidoArtes(pedido);
  return artes.find((arte) => arte.arteFinalUrl)?.arteFinalUrl
    || artes.find((arte) => arte.referenciaUrl)?.referenciaUrl
    || "";
}
