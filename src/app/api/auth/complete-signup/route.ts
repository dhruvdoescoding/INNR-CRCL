import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const ADJECTIVES = [
  "Crimson", "Silver", "Turbo", "Neon", "Violet",
  "Azure",   "Galactic", "Solar", "Golden", "Cosmic",
];
const NOUNS = [
  "Nova",  "Moon",  "Comet", "Blast", "Pulse",
  "Drift", "Wave",  "Echo",  "Storm", "Spark",
];

function generateAlias(): string {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = String(Math.floor(Math.random() * 90) + 10); // 10-99
  return `${adj}${noun}${num}`;
}

export async function POST(req: NextRequest) {
  let body: {
    uid: string;
    email: string;
    realName: string;
    department: string;
    year: number;
    collegeName: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { uid, email, realName, department, year, collegeName } = body;

  if (!uid || !email || !realName) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check for existing user doc — 409 if already exists
  const ref = adminDb.collection("users").doc(uid);
  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data();
    return NextResponse.json({ success: true, alias: data?.alias ?? "" });
  }

  const collegeDomain = email.split("@")[1]?.toLowerCase() ?? "";
  const alias = generateAlias();
  const now = FieldValue.serverTimestamp();

  await ref.set({
    uid,
    realName,
    alias,
    email,
    collegeDomain,
    collegeName: collegeName ?? collegeDomain,
    department:  department ?? "",
    year:        Number(year) || 1,
    photoURL:    "",
    isListener:  false,
    isBanned:    false,
    chatBanUntil:     null,
    aliasLastChanged: now,
    createdAt:        now,
    role:             "user",
  });

  return NextResponse.json({ success: true, alias });
}
