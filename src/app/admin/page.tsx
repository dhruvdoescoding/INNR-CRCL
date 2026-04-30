"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, query, where, onSnapshot, doc, getDoc,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Shield, CheckCircle2, XCircle, AlertTriangle, Ban, Inbox } from "lucide-react";
import FloatingOrbs from "@/components/FloatingOrbs";

// ── Styles ─────────────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background:     "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  border:         "1px solid rgba(167,139,250,0.15)",
  borderRadius:   "16px",
  boxShadow:      "0 4px 24px rgba(0,0,0,0.25)",
};

// ── Reason badge colours ───────────────────────────────────────────────────────
const REASON_STYLES: Record<string, React.CSSProperties> = {
  harassment: { background: "rgba(239,68,68,0.12)",   border: "1px solid rgba(239,68,68,0.3)",   color: "#EF4444" },
  "self-harm":{ background: "rgba(249,115,22,0.12)",  border: "1px solid rgba(249,115,22,0.3)",  color: "#F97316" },
  hate:       { background: "rgba(239,68,68,0.12)",   border: "1px solid rgba(239,68,68,0.3)",   color: "#EF4444" },
  spam:       { background: "rgba(234,179,8,0.12)",   border: "1px solid rgba(234,179,8,0.3)",   color: "#EAB308" },
  other:      { background: "rgba(107,114,128,0.12)", border: "1px solid rgba(107,114,128,0.3)", color: "#9CA3AF" },
};

const FILTER_TABS = ["all", "posts", "messages", "users"] as const;
type FilterTab = typeof FILTER_TABS[number];

// ── Action button ─────────────────────────────────────────────────────────────
function ActionBtn({
  icon, label, color, onClick, loading,
}: {
  icon:    React.ReactNode;
  label:   string;
  color:   string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all w-full justify-center"
      style={{
        background: `${color}1a`,
        border:     `1px solid ${color}4d`,
        color,
        opacity: loading ? 0.5 : 1,
      }}
    >
      {icon} {label}
    </button>
  );
}

// ── Report card ───────────────────────────────────────────────────────────────
function ReportCard({
  report, adminUid, onResolved,
}: {
  report:     DocumentData;
  adminUid:   string;
  onResolved: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function resolve(action: string) {
    setBusy(true);
    try {
      await fetch("/api/admin/resolve-report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reportId: report.id, adminUid, action }),
      });
      onResolved(report.id);
    } catch (err) {
      console.error("Resolve failed:", err);
    } finally {
      setBusy(false);
    }
  }

  const reasonStyle = REASON_STYLES[report.reason] ?? REASON_STYLES.other;

  // highest AI score
  let aiMax   = 0;
  let aiLabel = "";
  if (report.aiScore && typeof report.aiScore === "object") {
    const entries = Object.entries(report.aiScore as Record<string, number>);
    const [topKey, topVal] = entries.reduce(
      (best, cur) => (cur[1] > best[1] ? cur : best),
      ["", 0]
    );
    aiMax   = topVal;
    aiLabel = topKey.replace(/_/g, " ");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="p-4 flex gap-4"
      style={GLASS}
    >
      {/* Content preview */}
      <div className="flex-1 min-w-0 space-y-2">
        <p
          className="text-sm line-clamp-2 leading-relaxed"
          style={{ color: "#F1F0FF" }}
        >
          {report.targetContent || <span style={{ color: "#6B7280", fontStyle: "italic" }}>No content preview</span>}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reason badge */}
          <span className="text-[10px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wide" style={reasonStyle}>
            {report.reason}
          </span>

          {/* Target type badge */}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: "#A78BFA" }}
          >
            {report.targetType}
          </span>

          {/* Status */}
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={
              report.status === "reviewed"
                ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981" }
                : { background: "rgba(234,179,8,0.1)",  border: "1px solid rgba(234,179,8,0.25)",  color: "#EAB308" }
            }
          >
            {report.status}
          </span>
        </div>

        {/* Reporter */}
        <p className="text-xs" style={{ color: "#6B7280" }}>
          Reported by <span style={{ color: "#A78BFA" }}>{report.reportedBy?.slice(0, 8)}…</span>
        </p>

        {/* AI score bar */}
        {aiMax > 0 && (
          <div className="space-y-1">
            <p className="text-[10px]" style={{ color: "#6B7280" }}>
              {Math.round(aiMax * 100)}% {aiLabel} confidence
            </p>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width:      `${Math.round(aiMax * 100)}%`,
                  background: aiMax > 0.85
                    ? "linear-gradient(90deg, #EF4444, #F97316)"
                    : "linear-gradient(90deg, #EAB308, #F97316)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1.5 flex-shrink-0 w-28">
        <ActionBtn icon={<CheckCircle2 size={11} />} label="Approve" color="#10B981" onClick={() => resolve("approve")} loading={busy} />
        <ActionBtn icon={<XCircle size={11} />}      label="Remove"  color="#EF4444" onClick={() => resolve("remove")}  loading={busy} />
        <ActionBtn icon={<AlertTriangle size={11} />} label="Warn"   color="#EAB308" onClick={() => resolve("warn")}    loading={busy} />
        <ActionBtn icon={<Ban size={11} />}          label="Ban"     color="#F97316" onClick={() => resolve("ban")}     loading={busy} />
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter();

  const [adminUid,    setAdminUid]    = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [reports,     setReports]     = useState<DocumentData[]>([]);
  const [dismissed,   setDismissed]   = useState<Set<string>>(new Set());
  const [filterTab,   setFilterTab]   = useState<FilterTab>("all");

  // ── Auth + role check ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }

      const snap = await getDoc(doc(db, "users", u.uid));
      if (!snap.exists() || snap.data()?.role !== "admin") {
        router.push("/feed");
        return;
      }

      setAdminUid(u.uid);
      setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  // ── Reports listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!adminUid) return;

    const q = filterTab === "all"
      ? query(collection(db, "reports"), where("status", "in", ["pending", "pending_manual"]))
      : query(
          collection(db, "reports"),
          where("status", "in", ["pending", "pending_manual"]),
          where("targetType", "==", filterTab === "posts" ? "post" : filterTab === "messages" ? "message" : "user")
        );

    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [adminUid, filterTab]);

  const visibleReports = reports.filter((r) => !dismissed.has(r.id));
  const pendingCount   = visibleReports.length;

  function handleResolved(id: string) {
    setDismissed((prev) => new Set(prev).add(id));
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}>
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin"
          style={{ borderColor: "rgba(124,58,237,0.25)", borderTopColor: "#7C3AED" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10"
      style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}>
      <FloatingOrbs />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-40 flex items-center gap-3 px-5 py-3"
        style={{ background: "rgba(13,13,26,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(167,139,250,0.1)" }}>
        <Shield size={18} style={{ color: "#A78BFA" }} />
        <span className="font-bold text-base" style={{ color: "#F1F0FF" }}>Moderation Queue</span>
        {pendingCount > 0 && (
          <span
            className="text-xs px-2.5 py-0.5 rounded-full font-bold"
            style={{ background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.35)", color: "#EF4444" }}
          >
            {pendingCount}
          </span>
        )}
      </nav>

      <div className="max-w-[760px] mx-auto px-4" style={{ paddingTop: "76px" }}>

        {/* ── Filter tabs ── */}
        <div className="flex gap-1 mb-5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className="text-xs px-4 py-2 rounded-full font-medium capitalize whitespace-nowrap transition-all"
              style={filterTab === tab
                ? { background: "linear-gradient(135deg, #7C3AED, #6D28D9)", color: "#F1F0FF", boxShadow: "0 0 16px rgba(124,58,237,0.3)" }
                : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.15)", color: "#6B7280" }
              }
            >
              {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Report list ── */}
        <AnimatePresence>
          {visibleReports.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-3"
            >
              <Inbox size={40} style={{ color: "#6B7280" }} />
              <p className="font-semibold text-base" style={{ color: "#F1F0FF" }}>No pending reports 🎉</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>The campus is behaving itself</p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {visibleReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  adminUid={adminUid!}
                  onResolved={handleResolved}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
