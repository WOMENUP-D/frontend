/**
 * The Firebase app, created once and only when it is first needed.
 *
 * Every value here is public by design — a Firebase web config travels in the
 * page source of every app that uses it, and what protects the project is the
 * authorised-domain list plus the server-side token check, not secrecy. The
 * service-account private key that verifies those tokens lives on the API and
 * never comes near this file.
 *
 * Loaded lazily so a woman who signs in with her phone never pays to download
 * an SDK she does not use.
 */

import type { Auth } from "firebase/auth";

const CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_SENDER_ID ?? "",
};

let configPromise: Promise<void> | null = null;
export function loadFirebaseConfig(): Promise<void> {
  if (!configPromise) {
    configPromise = fetch("/public-config", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Public configuration unavailable");
        const config = await response.json();
        for (const key of Object.keys(CONFIG) as (keyof typeof CONFIG)[]) {
          if (typeof config[key] === "string" && config[key]) CONFIG[key] = config[key];
        }
      })
      .catch((error) => { configPromise = null; throw error; });
  }
  return configPromise;
}

/** The three values sign-in genuinely cannot work without. */
export function firebaseConfigured(): boolean {
  return Boolean(CONFIG.apiKey && CONFIG.authDomain && CONFIG.projectId);
}

let authPromise: Promise<Auth> | null = null;

export function firebaseAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = (async () => {
      await loadFirebaseConfig();
      const [{ initializeApp, getApps, getApp }, { getAuth }] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
      ]);
      // Next re-executes modules across route transitions; initialising twice
      // throws, so an existing app is reused.
      const app = getApps().length ? getApp() : initializeApp(CONFIG);
      return getAuth(app);
    })().catch((error) => {
      // A failed chunk load must not disable the button for the rest of the
      // session — the next click tries again.
      authPromise = null;
      throw error;
    });
  }
  return authPromise;
}
