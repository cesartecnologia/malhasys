import type { Prioridade, StatusPedido } from "../types";
import { statusLabel } from "../lib/status";

export function StatusBadge({ status }: { status: StatusPedido | string }) {
  const label = statusLabel(status);
  const className = label.toLowerCase().replace(/\s+/g, "-").replace("/", "-");
  return <span className={`badge status status-${className}`}>{label}</span>;
}

export function PriorityBadge({ prioridade }: { prioridade: Prioridade | string }) {
  return <span className={`badge priority priority-${prioridade.toLowerCase()}`}>{prioridade}</span>;
}
