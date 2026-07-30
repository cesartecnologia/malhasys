export function loginErrorMessage(error: unknown) {
  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message : "";

  if (
    code === "auth/invalid-credential"
    || code === "auth/wrong-password"
    || code === "auth/user-not-found"
    || code === "auth/invalid-login-credentials"
  ) {
    return "Email ou senha incorretos. Confira os dados e tente novamente.";
  }

  if (code === "auth/too-many-requests") {
    return "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.";
  }

  if (code === "auth/network-request-failed") {
    return "Não foi possível conectar agora. Verifique sua internet e tente novamente.";
  }

  if (code === "auth/user-disabled") {
    return "Este acesso está desativado. Fale com um administrador.";
  }

  if (code === "auth/invalid-email") {
    return "Informe um email válido para entrar.";
  }

  if (code === "auth/email-already-in-use") {
    return "Este email já possui acesso cadastrado no sistema.";
  }

  if (code === "auth/weak-password") {
    return "Crie uma senha com pelo menos 6 caracteres.";
  }

  if (message.includes("VITE_FIREBASE") || message.includes(".env") || message.includes("Firestore")) {
    return "O sistema ainda não está pronto para receber acessos. Fale com o suporte.";
  }

  return "Não foi possível entrar no sistema agora. Tente novamente em instantes.";
}

export function friendlyErrorMessage(error: unknown, fallback = "Não foi possível concluir a ação. Tente novamente.") {
  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message : "";

  if (code === "permission-denied" || message.includes("Missing or insufficient permissions")) {
    return "Você não tem permissão para realizar esta ação.";
  }

  if (code === "unauthenticated") {
    return "Sua sessão expirou. Entre novamente no sistema.";
  }

  if (code === "auth/email-already-in-use") {
    return "Este email já possui acesso cadastrado no sistema.";
  }

  if (code === "auth/weak-password") {
    return "Crie uma senha com pelo menos 6 caracteres.";
  }

  if (code === "unavailable" || code === "deadline-exceeded" || message.includes("network")) {
    return "Não foi possível conectar agora. Verifique sua internet e tente novamente.";
  }

  if (message.includes("VITE_") || message.includes(".env") || message.includes("Firebase") || message.includes("Firestore") || message.includes("Cloudinary")) {
    return "O sistema ainda não está pronto para esta ação. Fale com o suporte.";
  }

  if (message && !looksTechnical(message)) {
    return message;
  }

  return fallback;
}

function getErrorCode(error: unknown) {
  if (typeof error === "object" && error && "code" in error) {
    return String((error as { code?: unknown }).code || "");
  }

  return "";
}

function looksTechnical(message: string) {
  return /(^FirebaseError|auth\/|permission-denied|VITE_|\.env|Firestore|Cloudinary|undefined|null|stack|network-request-failed)/i.test(message);
}
