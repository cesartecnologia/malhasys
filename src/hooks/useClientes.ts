import { collection, orderBy, query } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../lib/firebase";
import type { Cliente } from "../types";
import { useCollection } from "./useCollection";

export function useClientes() {
  const q = useMemo(() => query(collection(db, "clientes"), orderBy("createdAt", "desc")), []);
  const { data, loading, error } = useCollection<Cliente>(q);
  return { clientes: data, loading, error };
}
