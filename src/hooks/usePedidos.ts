import { collection, orderBy, query } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../lib/firebase";
import type { Pedido } from "../types";
import { useCollection } from "./useCollection";

export function usePedidos() {
  const q = useMemo(() => query(collection(db, "pedidos"), orderBy("createdAt", "desc")), []);
  const { data, loading, error } = useCollection<Pedido>(q);
  return { pedidos: data, loading, error };
}
