import { collection, orderBy, query } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../lib/firebase";
import type { Usuario } from "../types";
import { useCollection } from "./useCollection";

export function useUsuarios() {
  const q = useMemo(() => query(collection(db, "usuarios"), orderBy("createdAt", "desc")), []);
  const { data, loading, error } = useCollection<Usuario>(q);
  return { usuarios: data, loading, error };
}
