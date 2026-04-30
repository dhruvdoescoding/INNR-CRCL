#!/usr/bin/env node
/**
 * scripts/make-admin.js
 * Sets role: "admin" on the Firestore user doc matching a given email.
 * Reads Firebase Admin credentials from .env.local automatically.
 *
 * Usage:
 *   node scripts/make-admin.js
 *   node scripts/make-admin.js someone@example.com
 */

const path = require("path");
const fs   = require("fs");

// ── Load .env.local manually (no dotenv dependency needed) ──────────────────
const envPath = path.resolve(__dirname, "../.env.local");
if (!fs.existsSync(envPath)) {
  console.error("❌  .env.local not found at", envPath);
  process.exit(1);
}

for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
  if (!process.env[key]) process.env[key] = val;
}

// ── Validate env vars ───────────────────────────────────────────────────────
const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌  Missing Firebase Admin env vars:");
  if (!projectId)   console.error("    FIREBASE_ADMIN_PROJECT_ID");
  if (!clientEmail) console.error("    FIREBASE_ADMIN_CLIENT_EMAIL");
  if (!privateKey)  console.error("    FIREBASE_ADMIN_PRIVATE_KEY");
  process.exit(1);
}

// ── Target email ────────────────────────────────────────────────────────────
const TARGET_EMAIL = process.argv[2] || "dhruv.pathak_cs24@gla.ac.in";

// ── Init Firebase Admin ─────────────────────────────────────────────────────
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const db = admin.firestore();

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍  Looking for user with email: ${TARGET_EMAIL}\n`);

  const snap = await db
    .collection("users")
    .where("email", "==", TARGET_EMAIL)
    .limit(1)
    .get();

  if (snap.empty) {
    // Fallback: search by uid via Firebase Auth
    console.log("   Not found in Firestore by email field — trying Firebase Auth…");
    try {
      const authUser = await admin.auth().getUserByEmail(TARGET_EMAIL);
      const docRef   = db.collection("users").doc(authUser.uid);
      const docSnap  = await docRef.get();

      if (!docSnap.exists) {
        console.error(`❌  User found in Auth (uid: ${authUser.uid}) but no Firestore doc exists yet.`);
        console.log("    Sign in once to create the profile, then run this script again.");
        process.exit(1);
      }

      await docRef.update({ role: "admin" });
      console.log(`✅  Updated via Auth UID:  ${authUser.uid}`);
      console.log(`    Email:  ${TARGET_EMAIL}`);
      console.log(`    Alias:  ${docSnap.data()?.alias ?? "(unknown)"}`);
      console.log(`    role → "admin"\n`);
    } catch (authErr) {
      console.error("❌  User not found in Firebase Auth either:", authErr.message);
      process.exit(1);
    }
    return;
  }

  const userDoc = snap.docs[0];
  await userDoc.ref.update({ role: "admin" });

  console.log(`✅  Success!`);
  console.log(`    UID:    ${userDoc.id}`);
  console.log(`    Email:  ${TARGET_EMAIL}`);
  console.log(`    Alias:  ${userDoc.data()?.alias ?? "(unknown)"}`);
  console.log(`    role → "admin"\n`);
  console.log(`🛡️   You can now access /admin\n`);
}

main().catch((err) => {
  console.error("❌  Unexpected error:", err.message ?? err);
  process.exit(1);
});
