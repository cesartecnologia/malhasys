import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { useEmpresa } from "./hooks/useEmpresa";
import { usePerfil } from "./hooks/usePerfil";
import { clearSession, getSession } from "./lib/session";
import { useEffect, useState } from "react";
import { ensureAuthenticated } from "./lib/firebase";
import { canAccessPath } from "./lib/access";

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { empresa } = useEmpresa();
  const [session] = useState(() => getSession());
  const perfil = usePerfil(session?.perfil);

  useEffect(() => {
    if (!session) navigate("/login", { replace: true });
    else {
      ensureAuthenticated()
        .then((user) => {
          if (user.uid !== session.uid) {
            clearSession();
            navigate("/login", { replace: true });
          }
        })
        .catch(() => {
          clearSession();
          navigate("/login", { replace: true });
        });
    }
  }, [navigate, session]);

  useEffect(() => {
    if (session && !canAccessPath(perfil.perfil, location.pathname)) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate, perfil.perfil, session]);

  if (!session) return null;

  return (
    <div className="app-shell">
      <Sidebar
        empresaNome={empresa.nome || "MalhaSys"}
        logoUrl={empresa.logoUrl}
        usuarioNome={session.nome}
        perfil={perfil.perfil}
      />
      <main className="main-content">
        <div className="main-content-body">
          <Outlet context={{ perfil: perfil.perfil, mostrarFinanceiro: perfil.mostrarFinanceiro, empresa, usuarioNome: session.nome }} />
        </div>
        <footer className="app-footer">
          <span>© 2026 Cesar Solução em Tecnologia. Todos os direitos reservados.</span>
        </footer>
      </main>
    </div>
  );
}
