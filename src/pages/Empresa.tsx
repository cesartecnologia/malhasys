import { doc, setDoc } from "firebase/firestore";
import { Moon, Palette, Save, Sun } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { db, ensureAuthenticated } from "../lib/firebase";
import { uploadFile } from "../lib/storage";
import type { Empresa, Perfil } from "../types";

const THEME_KEY = "malhariaos-theme";
const COLOR_KEY = "malhariaos-primary-color";
const DEFAULT_PRIMARY = "#2563EB";

function getSavedPrimaryColor() {
  return localStorage.getItem(COLOR_KEY) || DEFAULT_PRIMARY;
}

export function EmpresaPage() {
  const { empresa } = useOutletContext<{ perfil: Perfil; mostrarFinanceiro: boolean; empresa: Empresa }>();
  const [cor, setCor] = useState(empresa.corPrimaria || getSavedPrimaryColor());
  const [modoTema, setModoTema] = useState<"system" | "light" | "dark">(
    empresa.modoTema || (localStorage.getItem(THEME_KEY) as "system" | "light" | "dark" | null) || "system"
  );
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = modoTema === "dark" || (modoTema === "system" && prefersDark);

  useEffect(() => {
    setCor(empresa.corPrimaria || getSavedPrimaryColor());
    setModoTema((localStorage.getItem(THEME_KEY) as "system" | "light" | "dark" | null) || empresa.modoTema || (empresa.modoEscuro ? "dark" : "system"));
  }, [empresa.corPrimaria, empresa.modoEscuro, empresa.modoTema]);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-primary", cor);
    localStorage.setItem(COLOR_KEY, cor);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [cor, dark, modoTema]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await ensureAuthenticated();
      const logo = await uploadFile("empresa/logo", file);
      await setDoc(
        doc(db, "empresa", "config"),
        {
          nome: form.get("nome"),
          cnpj: form.get("cnpj"),
          endereco: form.get("endereco"),
          telefone: form.get("telefone"),
          email: form.get("email"),
          corPrimaria: cor,
          modoEscuro: dark,
          modoTema,
          ...(logo.url ? { logoUrl: logo.url, logoPath: logo.path } : {})
        },
        { merge: true }
      );
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar as configuracoes.");
      setSaving(false);
    }
  }

  function selectTheme(value: "system" | "light" | "dark") {
    setModoTema(value);
    localStorage.setItem(THEME_KEY, value);
    const prefersDarkNow = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = value === "system" ? (prefersDarkNow ? "dark" : "light") : value;
  }

  return (
    <>
      <PageHeader
        title="Empresa"
        subtitle="Configurações da malharia e identidade visual."
        actions={
          <div className="empresa-header-controls">
            <label className="field empresa-color-field">
              <span className="paint-picker">
                <Palette size={22} />
                <span style={{ background: cor }} />
                <input type="color" aria-label="Cor de destaque" value={cor} onChange={(event) => setCor(event.target.value)} />
              </span>
            </label>
            <div className="field">
              <div className="theme-toggle" aria-label="Modo de aparência">
                <button className={modoTema === "light" ? "active" : ""} type="button" aria-label="Claro" onClick={() => selectTheme("light")}><Sun size={21} /></button>
                <button className={modoTema === "dark" ? "active" : ""} type="button" aria-label="Escuro" onClick={() => selectTheme("dark")}><Moon size={21} /></button>
                <button className={modoTema === "system" ? "active" : ""} type="button" onClick={() => selectTheme("system")}>Sistema</button>
              </div>
            </div>
          </div>
        }
      />
      <div className="detail-layout">
        <form className="form-card form-grid" onSubmit={submit}>
          <label className="field"><span>Nome da malharia</span><input name="nome" defaultValue={empresa.nome || ""} /></label>
          <label className="field"><span>CNPJ</span><input name="cnpj" defaultValue={empresa.cnpj || ""} /></label>
          <label className="field full"><span>Endereço</span><input name="endereco" defaultValue={empresa.endereco || ""} /></label>
          <label className="field"><span>Telefone</span><input name="telefone" defaultValue={empresa.telefone || ""} /></label>
          <label className="field"><span>Email</span><input name="email" type="email" defaultValue={empresa.email || ""} /></label>
          <label className="field empresa-logo-field"><span>Logo</span><input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
          <div className="form-actions-line">
            <button className="compact-button" type="submit" disabled={saving}><Save size={18} /> {saving ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
        <aside className="panel empresa-preview">
          <h2>Pré-visualização</h2>
          {empresa.logoUrl ? <img src={empresa.logoUrl} alt="Logo" style={{ maxWidth: 120, maxHeight: 120 }} /> : null}
          <div className="empresa-preview-brand"><span className="brand-mark">M</span><span>{empresa.nome || "MalhariaOS"}</span></div>
          <div className="key-values empresa-preview-values">
            <div><span>CNPJ</span><strong>{empresa.cnpj || "-"}</strong></div>
            <div><span>Telefone</span><strong>{empresa.telefone || "-"}</strong></div>
            <div><span>Email</span><strong>{empresa.email || "-"}</strong></div>
          </div>
        </aside>
      </div>
      {error ? (
        <div className="notify error">
          <div>
            <strong>Erro ao salvar</strong>
            <p>{error}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
