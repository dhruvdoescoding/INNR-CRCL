import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const collegeDomain = searchParams.get("collegeDomain");

  if (!collegeDomain) {
    return NextResponse.json({ post: null }, { status: 400 });
  }

  try {
    const snap = await adminDb
      .collection("posts")
      .where("collegeDomain", "==", collegeDomain)
      .where("isPostOfDay", "==", true)
      .where("isFlagged", "==", false)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ post: null });
    }

    const doc  = snap.docs[0];
    const data = doc.data();

    // Convert Firestore Timestamps to plain objects for JSON serialization
    const post = {
      ...data,
      postId:    doc.id,
      createdAt: data.createdAt?.toMillis
        ? { seconds: Math.floor(data.createdAt.toMillis() / 1000) }
        : null,
      expiresAt: data.expiresAt?.toMillis
        ? { seconds: Math.floor(data.expiresAt.toMillis() / 1000) }
        : null,
    };

    return NextResponse.json({ post });
  } catch (err) {
    console.error("[post-of-day]", err);
    return NextResponse.json({ post: null }, { status: 500 });
  }
}
