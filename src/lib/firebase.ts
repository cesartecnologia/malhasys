import { getApps, initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseApp = initializeApp(firebaseConfig);
const secondaryFirebaseApp = getApps().find((app) => app.name === "secondary-auth") || initializeApp(firebaseConfig, "secondary-auth");
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const secondaryAuth = getAuth(secondaryFirebaseApp);

let authReadyPromise: Promise<User | null> | null = null;

export function assertFirebaseConfigured() {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
    throw new Error("O sistema ainda não está pronto para receber acessos. Fale com o suporte.");
  }
}

function waitForAuthReady() {
  authReadyPromise ??= new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

  return authReadyPromise;
}

export async function ensureAuthenticated() {
  assertFirebaseConfigured();

  const user = auth.currentUser || await waitForAuthReady();
  if (user) return user;

  throw new Error("Sua sessão expirou. Entre novamente no sistema.");
}
