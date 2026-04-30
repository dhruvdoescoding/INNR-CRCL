import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const { chatId, uid } = await req.json();

  if (!chatId || !uid) {
    return NextResponse.json({ error: "Missing chatId or uid" }, { status: 400 });
  }

  try {
    const chatRef  = adminDb.collection("chats").doc(chatId);
    const chatSnap = await chatRef.get();

    if (!chatSnap.exists) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const chat = chatSnap.data()!;
    const { participants, revealRequests, participantAliases } = chat;

    if (!participants.includes(uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Mark this user's reveal request
    await chatRef.update({ [`revealRequests.${uid}`]: true });

    const otherUid = participants.find((p: string) => p !== uid);
    const otherAlreadyRequested = revealRequests?.[otherUid] === true;

    // ── Both sides revealed ─────────────────────────────────────────────────
    if (otherAlreadyRequested) {
      // Get real names from user docs
      const [mySnap, otherSnap] = await Promise.all([
        adminDb.collection("users").doc(uid).get(),
        adminDb.collection("users").doc(otherUid).get(),
      ]);
      const myName    = mySnap.exists    ? (mySnap.data()?.realName    ?? participantAliases?.[uid]    ?? "Someone") : "Someone";
      const otherName = otherSnap.exists ? (otherSnap.data()?.realName ?? participantAliases?.[otherUid] ?? "Someone") : "Someone";

      // Update chat to revealed
      await chatRef.update({
        status:     "revealed",
        revealedAt: FieldValue.serverTimestamp(),
        [`revealRequests.${uid}`]: true,
        realNames: { [uid]: myName, [otherUid]: otherName },
      });

      // System message
      await chatRef.collection("messages").add({
        senderUid:  "system",
        content:    "✨ Both users revealed their identity!",
        type:       "system",
        readBy:     [],
        createdAt:  FieldValue.serverTimestamp(),
      });

      // Create friendship doc
      const sortedPair = [uid, otherUid].sort();
      await adminDb.collection("friendships").add({
        participants:  sortedPair,
        status:        "pending",
        requestedBy:   uid,
        originChatId:  chatId,
        createdAt:     FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ status: "revealed" });
    }

    return NextResponse.json({ status: "waiting_for_other" });
  } catch (err) {
    console.error("[reveal-request]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
