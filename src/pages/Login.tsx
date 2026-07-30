import { FormEvent, useState } from "react";
import { ArrowRight, ClipboardCheck, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UsersRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { SystemNotify } from "../components/SystemNotify";
import { setSession } from "../lib/session";
import { assertFirebaseConfigured, auth, db } from "../lib/firebase";
import { loginErrorMessage } from "../lib/publicErrors";
import type { Usuario } from "../types";

export function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail.includes("@")) {
      setError("Informe um email válido.");
      return;
    }

    if (password.trim().length < 4) {
      setError("Informe uma senha com pelo menos 4 caracteres.");
      return;
    }

    setLoading(true);
    try {
      assertFirebaseConfigured();
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const uidSnapshot = await getDoc(doc(db, "usuarios", credential.user.uid));
      const emailSnapshot = uidSnapshot.exists() ? uidSnapshot : await getDoc(doc(db, "usuarios", normalizedEmail));
      const snapshot = emailSnapshot;

      if (!snapshot.exists()) {
        setError("Seu acesso ainda não foi liberado no sistema. Fale com um administrador.");
        return;
      }

      const usuario = { id: snapshot.id, ...snapshot.data() } as Usuario;

      if (!usuario.ativo) {
        setError("Usuário inativo. Fale com um administrador.");
        return;
      }

      setSession({
        uid: credential.user.uid,
        nome: usuario.nome || normalizedEmail,
        email: usuario.email || normalizedEmail,
        perfil: usuario.perfil || "Produção"
      });
      navigate("/", { replace: true });
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel" aria-label="Resumo do MalhaSys">
        <div className="login-brand-top">
          <img className="login-logo" src="/logo.png" alt="Logo MalhaSys" />
          <strong>MalhaSys</strong>
        </div>
        <div className="login-copy">
          <h1>Gestão simples para sua malharia.</h1>
          <p>Pedidos, clientes, produção, metas e equipe em um painel operacional pensado para o dia a dia da fábrica.</p>
        </div>
        <div className="login-insights">
          <div><ShieldCheck size={18} /><span>Acesso por perfil</span></div>
          <div><UsersRound size={18} /><span>Equipe cadastrada</span></div>
          <div><ClipboardCheck size={18} /><span>Controle de etapas</span></div>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-card">
          <div className="login-form-heading">
            <span className="login-lock"><LockKeyhole size={20} /></span>
            <div>
              <h2>Entrar no sistema</h2>
              <p>Acesse a operação da sua malharia.</p>
            </div>
          </div>

          <form className="login-form" onSubmit={submit}>
            <label className="field login-field">
              <span>Email</span>
              <div className="input-with-icon">
                <Mail size={17} />
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
              </div>
            </label>
            <label className="field login-field">
              <span>Senha</span>
              <div className="input-with-icon">
                <LockKeyhole size={17} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                />
                <button className="ghost password-toggle" type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <div className="login-row">
              <label className="login-check"><input type="checkbox" defaultChecked /> Manter conectado</label>
              <button className="ghost login-link" type="button">Recuperar senha</button>
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"} <ArrowRight size={18} />
            </button>
          </form>
          <footer className="login-footer-links">
            <Link to="/termos">Termos de uso</Link>
            <Link to="/privacidade">Política de privacidade</Link>
            <Link to="/lgpd">LGPD</Link>
          </footer>
        </div>
      </section>
      {error ? (
        <SystemNotify
          title="Não foi possível entrar"
          message={error}
          onClose={() => setError("")}
        />
      ) : null}
    </main>
  );
}
