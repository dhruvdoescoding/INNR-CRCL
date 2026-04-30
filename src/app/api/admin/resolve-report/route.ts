import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

type Action = "remove" | "approve" | "warn" | "ban";

export async function POST(req: NextRequest) {
  const { reportId, adminUid, action } = await req.json() as {
    reportId: string;
    adminUid: string;
    action:   Action;
  };

  if (!reportId || !adminUid || !action) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // ── Verify admin role ────────────────────────────────────────────────────
  const adminSnap = await adminDb.collection("users").doc(adminUid).get();
  if (!adminSnap.exists || adminSnap.data()?.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // ── Get report ────────────────────────────────────────────────────────────
  const reportRef  = adminDb.collection("reports").doc(reportId);
  const reportSnap = await reportRef.get();
  if (!reportSnap.exists) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const report     = reportSnap.data()!;
  const { targetId, targetType, reportedBy: targetAuthorUid } = report;

  const targetCollection = targetType === "post" ? "posts" : "messages";
  const targetRef = adminDb.collection(targetCollection).doc(targetId);

  // ── Apply action ─────────────────────────────────────────────────────────
  try {
    switch (action) {
      case "remove":
        await targetRef.update({ isFlagged: true }).catch(() => {/* ignore missing */});
        break;

      case "approve":
        await targetRef.update({ isFlagged: false }).catch(() => {/* ignore missing */});
        break;

      case "warn": {
        const authorUid = (await targetRef.get().catch(() => null))?.data()?.authorUid ?? targetAuthorUid;
        if (authorUid) {
          await adminDb.collection("users").doc(authorUid).update({
            warningCount: FieldValue.increment(1),
          }).catch(() => {/* ignore if field missing */});
        }
        break;
      }

      case "ban": {
        const authorUid = (await targetRef.get().catch(() => null))?.data()?.authorUid ?? targetAuthorUid;
        if (authorUid) {
          await adminDb.collection("users").doc(authorUid).update({ isBanned: true });
        }
        break;
      }
    }
  } catch (err) {
    console.error("[resolve-report] action error:", err);
  }

  // ── Update report status ─────────────────────────────────────────────────
  await reportRef.update({
    status:     "reviewed",
    action,
    reviewedBy: adminUid,
    reviewedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ success: true });
}
