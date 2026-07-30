import { initializeApp } from "firebase/app";
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
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);

let authReadyPromise: Promise<User | null> | null = null;

export function assertFirebaseConfigured() {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
    throw new Error("Configure as variaveis VITE_FIREBASE_* no .env para conectar ao Firestore.");
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

  throw new Error("Sessao expirada. Entre novamente no sistema.");
}
