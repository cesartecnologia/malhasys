import type { Timestamp } from "firebase/firestore";

export const money = (value = 0) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value || 0));

export const parseCurrency = (value: FormDataEntryValue | string | number | null | undefined) => {
  if (typeof value === "number") return value;
  const rawValue = String(value || "").trim();
  if (!rawValue) return 0;
  const normalized = rawValue.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return Number(normalized || 0);
};

export const formatCurrencyInput = (value: string) => {
  const digits = onlyDigits(value);
  if (!digits) return "";
  return money(Number(digits) / 100);
};

export const date = (timestamp?: Timestamp) => {
  if (!timestamp) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(timestamp.toDate());
};

export const shortId = (id: string) => id.slice(0, 6).toUpperCase();

type NumberedItem = {
  id: string;
  createdAt?: Timestamp;
};

export const buildPedidoNumberMap = (pedidos: NumberedItem[]) =>
  new Map(
    [...pedidos]
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate().getTime() || 0;
        const bTime = b.createdAt?.toDate().getTime() || 0;
        return aTime - bTime || a.id.localeCompare(b.id);
      })
      .map((pedido, index) => [pedido.id, index + 1])
  );

export const pedidoNumber = (id: string, numeroMap: Map<string, number>) => {
  const numero = numeroMap.get(id);
  return numero ? `Pedido ${String(numero).padStart(4, "0")}` : "Pedido";
};

export const onlyDigits = (value = "") => value.replace(/\D/g, "");
