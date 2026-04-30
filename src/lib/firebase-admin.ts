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

// FIREBASE_ADMIN_PRIVATE_KEY is stored with literal \n characters in
// .env.local / Vercel environment variables. Replace them so the PEM is
// correctly formatted at runtime.
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

// Singleton — prevents re-initializing the Admin app across hot-reloads
const adminApp: AdminApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL!,
        privateKey,
      }),
    });

const adminDb: AdminFirestore = getFirestore(adminApp);
const adminAuth: AdminAuth = getAuth(adminApp);

export { adminApp, adminDb, adminAuth };
