// ─────────────────────────────────────────────────────────────────────────────
// src/lib/firebase-admin.ts  — SERVER ONLY
// Import ONLY from Next.js API Routes, Server Actions, or Server Components.
// This file must NEVER be bundled into the client — `server-only` enforces that.
// ─────────────────────────────────────────────────────────────────────────────

import "server-only";

import {
  initializeApp,
  getApps,
  cert,
  type App as AdminApp,
} from "firebase-admin/app";
import {
  getFirestore,
  type Firestore as AdminFirestore,
} from "firebase-admin/firestore";
import {
  getAuth,
  type Auth as AdminAuth,
} from "firebase-admin/auth";

// ── Lazy singleton factory ────────────────────────────────────────────────────
// Initialisation is deferred to the first request so that next build does NOT
// crash when Firebase Admin env vars are absent from the build environment.
// At runtime (Netlify Functions / Node server) the vars are always present.

function getAdminApp(): AdminApp {
  if (getApps().length > 0) return getApps()[0];

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[firebase-admin] Missing env vars: FIREBASE_ADMIN_PROJECT_ID, " +
      "FIREBASE_ADMIN_CLIENT_EMAIL, or FIREBASE_ADMIN_PRIVATE_KEY. " +
      "Add them to your Netlify environment variables."
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

// Lazy getters — only called when an API route actually handles a request
const adminDb: AdminFirestore = new Proxy({} as AdminFirestore, {
  get(_, prop) {
    return (getFirestore(getAdminApp()) as unknown as Record<string | symbol, unknown>)[prop];
  },
});

const adminAuth: AdminAuth = new Proxy({} as AdminAuth, {
  get(_, prop) {
    return (getAuth(getAdminApp()) as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { adminDb, adminAuth, getAdminApp };
