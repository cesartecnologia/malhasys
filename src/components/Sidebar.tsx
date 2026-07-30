import { BarChart3, Building2, ClipboardList, Factory, Home, LogOut, Menu, Palette, ShieldCheck, Target, Truck, UserCog, Users, X } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import type { Perfil } from "../types";
import { useState } from "react";
import { clearSession } from "../lib/session";
import { auth } from "../lib/firebase";
import { signOut } from "firebase/auth";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { to: "/producao", label: "Produção", icon: Factory },
  { to: "/envio", label: "Envio", icon: Truck },
  { to: "/designer", label: "Designer", icon: Palette },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/usuarios", label: "Usuários", icon: UserCog },
  { to: "/empresa", label: "Empresa", icon: Building2 }
];

type Props = {
  empresaNome: string;
  logoUrl?: string;
  usuarioNome: string;
  perfil: Perfil;
};

export function Sidebar({ empresaNome, logoUrl, usuarioNome, perfil }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const filteredNavItems = navItems.filter((item) => {
    if (perfil === "Designer") return ["Dashboard", "Designer"].includes(item.label);
    if (perfil === "Produção") return ["Dashboard", "Pedidos", "Produção", "Envio", "Metas"].includes(item.label);
    return true;
  });

  const nav = (
    <nav className="nav-list">
      {filteredNavItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} onClick={() => setOpen(false)}>
            <Icon size={17} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  function logout() {
    clearSession();
    void signOut(auth);
    navigate("/login", { replace: true });
  }

  const initials = usuarioNome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

  return (
    <>
      <aside className="sidebar">
        <Link className="brand" to="/">
          <img className="sidebar-brand-logo" src={logoUrl || "/logo.png"} alt={empresaNome || "Logo MalhaSys"} />
          <span>{empresaNome || "MalhaSys"}</span>
        </Link>
        {nav}
        <div className="sidebar-profile">
          <div className="profile-card">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-copy">
              <strong>{usuarioNome}</strong>
              <span><ShieldCheck size={14} /> {perfil}</span>
            </div>
          </div>
          <button className="secondary profile-logout" type="button" onClick={logout}>
            <LogOut size={17} /> Sair
          </button>
        </div>
      </aside>

      <header className="mobile-header">
        <Link className="mobile-brand" to="/">
          <img src={logoUrl || "/logo.png"} alt={empresaNome || "Logo MalhaSys"} />
          <strong>{empresaNome || "MalhaSys"}</strong>
        </Link>
        <button className="secondary" type="button" aria-label="Menu" onClick={() => setOpen((value) => !value)}>
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </header>
      <div className={`mobile-drawer ${open ? "open" : ""}`}>
        {nav}
      </div>
    </>
  );
}
