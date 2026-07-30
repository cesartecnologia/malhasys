import type { Perfil } from "../types";

const accessByPerfil: Record<Perfil, string[]> = {
  Administrador: ["Dashboard", "Clientes", "Pedidos", "Produção", "Envio", "Designer", "Metas", "Relatórios", "Usuários", "Empresa", "Admin"],
  Produção: ["Dashboard", "Clientes", "Pedidos", "Produção", "Envio", "Metas"],
  Designer: ["Dashboard", "Designer"],
  Operacional: ["Dashboard", "Clientes", "Pedidos", "Produção", "Envio", "Designer"]
};

const pathAccess: { path: string; label: string }[] = [
  { path: "/clientes", label: "Clientes" },
  { path: "/pedidos", label: "Pedidos" },
  { path: "/producao", label: "Produção" },
  { path: "/envio", label: "Envio" },
  { path: "/designer", label: "Designer" },
  { path: "/metas", label: "Metas" },
  { path: "/relatorios", label: "Relatórios" },
  { path: "/usuarios", label: "Usuários" },
  { path: "/empresa", label: "Empresa" },
  { path: "/admin", label: "Admin" }
];

export function canAccessNav(perfil: Perfil, label: string) {
  return accessByPerfil[perfil]?.includes(label) ?? false;
}

export function canAccessPath(perfil: Perfil, pathname: string) {
  if (pathname === "/") return true;
  if (perfil === "Operacional" && pathname === "/pedidos/novo") return false;
  const route = pathAccess.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  return route ? canAccessNav(perfil, route.label) : false;
}

export function canSeeFinance(perfil: Perfil) {
  return perfil === "Administrador";
}
