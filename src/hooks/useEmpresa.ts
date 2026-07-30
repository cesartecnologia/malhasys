import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, ensureAuthenticated } from "../lib/firebase";
import type { Empresa } from "../types";

const THEME_KEY = "malhariaos-theme";
const COLOR_KEY = "malhariaos-primary-color";
const DEFAULT_PRIMARY = "#2563EB";

function getSavedPrimaryColor() {
  return localStorage.getItem(COLOR_KEY) || DEFAULT_PRIMARY;
}

export function useEmpresa() {
  const [empresa, setEmpresa] = useState<Empresa>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;
    const loadingFallback = window.setTimeout(() => setLoading(false), 1600);
    document.documentElement.style.setProperty("--color-primary", getSavedPrimaryColor());

    ensureAuthenticated()
      .then(() => {
        if (cancelled) return;
        unsubscribe = onSnapshot(
          doc(db, "empresa", "config"),
          (snapshot) => {
            window.clearTimeout(loadingFallback);
            const data = snapshot.exists() ? (snapshot.data() as Empresa) : {};
            setEmpresa(data);
            const primaryColor = data.corPrimaria || getSavedPrimaryColor();
            document.documentElement.style.setProperty("--color-primary", primaryColor);
            if (data.corPrimaria) localStorage.setItem(COLOR_KEY, data.corPrimaria);
            const savedTheme = localStorage.getItem(THEME_KEY) as Empresa["modoTema"] | null;
            const modoTema = savedTheme || data.modoTema || "system";
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const theme = modoTema === "system" ? (prefersDark ? "dark" : "light") : modoTema;
            document.documentElement.dataset.theme = theme;
            setError(null);
            setLoading(false);
          },
          (err) => {
            window.clearTimeout(loadingFallback);
            setError(err.message);
            setLoading(false);
          }
        );
      })
      .catch((err) => {
        window.clearTimeout(loadingFallback);
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(loadingFallback);
      unsubscribe();
    };
  }, []);

  return { empresa, loading, error };
}
