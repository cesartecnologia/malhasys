import { useEffect, useState } from "react";
import type { DocumentData, Query } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import { ensureAuthenticated } from "../lib/firebase";
import { friendlyErrorMessage } from "../lib/publicErrors";

export function useCollection<T extends { id: string }>(queryRef: Query<DocumentData>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    setLoading(true);
    const loadingFallback = window.setTimeout(() => setLoading(false), 1600);

    ensureAuthenticated()
      .then(() => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          queryRef,
          (snapshot) => {
            window.clearTimeout(loadingFallback);
            setData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as T));
            setError(null);
            setLoading(false);
          },
          (err) => {
            window.clearTimeout(loadingFallback);
            setError(friendlyErrorMessage(err, "Não foi possível carregar as informações."));
            setLoading(false);
          }
        );
      })
      .catch((err) => {
        window.clearTimeout(loadingFallback);
        setError(friendlyErrorMessage(err, "Não foi possível carregar as informações."));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(loadingFallback);
      unsubscribe();
    };
  }, [queryRef]);

  return { data, loading, error };
}
