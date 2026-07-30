import type { Empresa, Pedido } from "../types";
import { onlyDigits } from "./format";
import { statusLabel } from "./status";

function empresaNome(empresa?: Empresa) {
  return empresa?.nome?.trim() || "MalhaSys";
}

function whatsappUrl(telefone: string, text: string) {
  return `https://wa.me/55${onlyDigits(telefone)}?text=${encodeURIComponent(text)}`;
}

export function buildPedidoStatusWhatsapp(pedido: Pedido, empresa?: Empresa) {
  const text = [
    `Olá, ${pedido.clienteNome}! 😊`,
    "",
    `Aqui é a equipe da ${empresaNome(empresa)}.`,
    "Esperamos que esteja tudo bem com você! ✨",
    "",
    "📌 *Atualização do Pedido*",
    "",
    `📍 Status atual: *${statusLabel(pedido.status)}*`,
    "",
    "Assim que houver uma nova atualização, avisaremos por aqui.",
    "",
    "Obrigado pela confiança! 🤝"
  ].join("\n");

  return whatsappUrl(pedido.whatsapp, text);
}

export function buildTrackingWhatsapp(pedido: Pedido, rastreio: string, empresa?: Empresa) {
  const text = [
    `Olá, ${pedido.clienteNome}! 😊`,
    "",
    `Aqui é a equipe da ${empresaNome(empresa)}.`,
    "Temos uma atualização importante sobre o seu pedido. ✨",
    "",
    "🚚 *Envio do Pedido*",
    "",
    "Seu pedido foi enviado.",
    `📦 Código de rastreio: *${rastreio.trim()}*`,
    "",
    "Você pode acompanhar a entrega usando esse código junto à transportadora.",
    "",
    "Obrigado pela confiança! 🤝"
  ].join("\n");

  return whatsappUrl(pedido.whatsapp, text);
}
