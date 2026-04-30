import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  const { reportedBy, targetType, targetId, targetContent, reason } = await req.json();

  if (!reportedBy || !targetType || !targetId || !reason) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  let aiAutoHide = false;
  let aiScore: Record<string, number> | null = null;
  let status = "pending_manual";

  // ── OpenAI moderation (optional) ─────────────────────────────────────────
  if (process.env.OPENAI_API_KEY && targetContent) {
    try {
      const res = await fetch("https://api.openai.com/v1/moderations", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ input: targetContent }),
      });

      if (res.ok) {
        const data  = await res.json();
        const scores: Record<string, number> = data.results?.[0]?.category_scores ?? {};
        aiScore  = scores;
        status   = "pending";

        const maxScore = Math.max(...Object.values(scores));
        if (maxScore > 0.85) {
          aiAutoHide = true;
          // Flag the target document
          const targetRef = adminDb.collection(
            targetType === "post" ? "posts" : "messages"
          ).doc(targetId);
          await targetRef.update({ isFlagged: true }).catch(() => { /* doc may not exist */ });
        }
      }
    } catch (err) {
      console.warn("[report] OpenAI moderation failed, falling back to manual:", err);
      status = "pending_manual";
    }
  }

  // ── Write report doc ──────────────────────────────────────────────────────
  const reportRef = await adminDb.collection("reports").add({
    reportedBy,
    targetType,
    targetId,
    targetContent: targetContent ?? "",
    reason,
    status,
    aiAutoHide,
    aiScore,
    reviewedBy:  null,
    reviewedAt:  null,
    createdAt:   FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ reportId: reportRef.id, autoHidden: aiAutoHide });
}
