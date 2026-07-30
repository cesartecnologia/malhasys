import type { Perfil } from "../types";

export function usePerfil(defaultPerfil: Perfil = "Administrador") {
  return { perfil: defaultPerfil, mostrarFinanceiro: defaultPerfil === "Administrador" };
}
