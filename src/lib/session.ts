import type { Perfil } from "../types";

const SESSION_KEY = "malhariaos-session";

export type UserSession = {
  uid: string;
  nome: string;
  email: string;
  perfil: Perfil;
};

export function getSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setSession(session: UserSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
