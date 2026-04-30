import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const { uid, matchType, keyword, collegeDomain } = await req.json();

  if (!uid || !matchType || !collegeDomain) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const now = Date.now();
    const staleMs = 60_000;

    // ── 1. Clean stale waitingPool entries ─────────────────────────────────
    const staleSnap = await adminDb
      .collection("waitingPool")
      .where("collegeDomain", "==", collegeDomain)
      .get();

    const deleteStale = staleSnap.docs
      .filter((d) => {
        const joinedAt = d.data().joinedAt?.toMillis?.() ?? 0;
        return now - joinedAt > staleMs;
      })
      .map((d) => d.ref.delete());
    await Promise.all(deleteStale);

    // ── 2. Find a match in waitingPool ─────────────────────────────────────
    let matchQuery = adminDb
      .collection("waitingPool")
      .where("collegeDomain", "==", collegeDomain)
      .where("matchType", "==", matchType);

    if (matchType === "keyword" && keyword) {
      matchQuery = matchQuery.where("keyword", "==", keyword);
    }

    const poolSnap = await matchQuery.limit(10).get();
    const match = poolSnap.docs.find((d) => d.data().uid !== uid);

    // ── 3. Match found ──────────────────────────────────────────────────────
    if (match) {
      const matchData = match.data();
      const otherUid = matchData.uid;

      // Get both user docs for their aliases
      const [userSnap, otherSnap] = await Promise.all([
        adminDb.collection("users").doc(uid).get(),
        adminDb.collection("users").doc(otherUid).get(),
      ]);
      const myAlias    = userSnap.exists    ? (userSnap.data()?.alias    ?? "Anonymous") : "Anonymous";
      const otherAlias = otherSnap.exists   ? (otherSnap.data()?.alias   ?? "Anonymous") : "Anonymous";

      // Create chat doc
      const chatRef = adminDb.collection("chats").doc();
      await chatRef.set({
        chatId:            chatRef.id,
        participants:      [uid, otherUid],
        participantAliases: { [uid]: myAlias, [otherUid]: otherAlias },
        collegeDomain,
        status:            "active",
        matchType,
        keyword:           matchType === "keyword" ? (keyword ?? null) : null,
        revealRequests:    { [uid]: false, [otherUid]: false },
        revealedAt:        null,
        isSupport:         false,
        createdAt:         FieldValue.serverTimestamp(),
        endedAt:           null,
      });

      // Remove both from waiting pool
      await Promise.all([
        adminDb.collection("waitingPool").doc(uid).delete(),
        adminDb.collection("waitingPool").doc(otherUid).delete(),
      ]);

      return NextResponse.json({ status: "matched", chatId: chatRef.id });
    }

    // ── 4. No match — add to pool ───────────────────────────────────────────
    await adminDb.collection("waitingPool").doc(uid).set({
      uid,
      collegeDomain,
      matchType,
      keyword: matchType === "keyword" ? (keyword ?? null) : null,
      joinedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ status: "waiting", chatId: null });
  } catch (err) {
    console.error("[find-or-create]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE — cancel waiting (remove from pool) ────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { uid } = await req.json();
    if (!uid) return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    await adminDb.collection("waitingPool").doc(uid).delete();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[find-or-create DELETE]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
