import type { Perfil } from "../types";
import { canSeeFinance } from "../lib/access";

export function usePerfil(defaultPerfil: Perfil = "Administrador") {
  return { perfil: defaultPerfil, mostrarFinanceiro: canSeeFinance(defaultPerfil) };
}
