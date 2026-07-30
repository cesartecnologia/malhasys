import type { StatusPedido } from "../types";

const LEGACY_ESTAMPARIA = "Silk/Estamparia";

export function normalizeStatus(status?: string): StatusPedido | string {
  return status === LEGACY_ESTAMPARIA ? "Estamparia" : status || "";
}

export function statusLabel(status?: string) {
  return normalizeStatus(status);
}

export function statusMatches(current: string | undefined, expected: string) {
  return normalizeStatus(current) === normalizeStatus(expected);
}

export function isCanceled(status?: string) {
  return normalizeStatus(status) === "Cancelado";
}
