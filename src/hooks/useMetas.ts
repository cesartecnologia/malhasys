import { collection, orderBy, query } from "firebase/firestore";
import { useMemo } from "react";
import { db } from "../lib/firebase";
import type { Meta } from "../types";
import { useCollection } from "./useCollection";

export function useMetas() {
  const q = useMemo(() => query(collection(db, "metas"), orderBy("createdAt", "desc")), []);
  const { data, loading, error } = useCollection<Meta>(q);
  return { metas: data, loading, error };
}
