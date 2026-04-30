"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown, MessageCircle, MoreVertical, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/lib/useAuth";
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc, increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export interface Post {
  postId:        string;
  authorAlias:   string;
  authorUid:     string;
  content:       string;
  tab:           string;
  upvotes:       number;
  downvotes:     number;
  commentCount:  number;
  isAnonymous:   boolean;
  isFlagged:     boolean;
  isPostOfDay:   boolean;
  keyword:       string | null;
  mediaURL:      string | null;
  collegeDomain: string;
  createdAt:     { seconds: number } | null;
  expiresAt:     { seconds: number } | null;
}

interface PostCardProps {
  post:        Post;
  glowBorder?: boolean;
}

const GLASS: React.CSSProperties = {
  background:     "#16213E",
  border:         "1px solid rgba(167,139,250,0.3)",
  borderRadius:   "16px",
  padding:        "16px",
  minHeight:      "80px",
  boxShadow:      "0 4px 20px rgba(0,0,0,0.4)",
  transition:     "border-color 0.2s ease, box-shadow 0.2s ease",
};

const ALIAS_PILL: React.CSSProperties = {
  background:   "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(167,139,250,0.1))",
  border:       "1px solid rgba(167,139,250,0.3)",
  borderRadius: "9999px",
  padding:      "3px 12px",
  color:        "#A78BFA",
  fontSize:     "0.8rem",
  fontWeight:   600,
};

const REPORT_REASONS = [
  { value: "harassment", label: "Harassment" },
  { value: "self-harm",  label: "Self-harm / Suicide content" },
  { value: "hate",       label: "Hate speech" },
  { value: "spam",       label: "Spam" },
  { value: "other",      label: "Other" },
];

export default function PostCard({ post, glowBorder = false }: PostCardProps) {
  const { user } = useAuth();

  const [menuOpen,         setMenuOpen]         = useState(false);
  const [reportOpen,       setReportOpen]       = useState(false);
  const [reportReason,     setReportReason]     = useState("harassment");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportDone,       setReportDone]       = useState(false);

  // Upvote state
  const [upvotes,     setUpvotes]     = useState(post.upvotes);
  const [hasVoted,    setHasVoted]    = useState(false);
  const [voteLoading, setVoteLoading] = useState(false);

  // Check existing vote on mount
  useEffect(() => {
    if (!user) return;
    const voteRef = doc(db, "posts", post.postId, "votes", user.uid);
    getDoc(voteRef).then((snap) => setHasVoted(snap.exists())).catch(() => {});
  }, [user, post.postId]);

  async function toggleUpvote() {
    if (!user || voteLoading) return;
    setVoteLoading(true);
    const voteRef = doc(db, "posts", post.postId, "votes", user.uid);
    const postRef = doc(db, "posts", post.postId);
    try {
      if (hasVoted) {
        await deleteDoc(voteRef);
        await updateDoc(postRef, { upvotes: increment(-1) });
        setHasVoted(false);
        setUpvotes((v) => Math.max(0, v - 1));
      } else {
        await setDoc(voteRef, { uid: user.uid, createdAt: new Date() });
        await updateDoc(postRef, { upvotes: increment(1) });
        setHasVoted(true);
        setUpvotes((v) => v + 1);
      }
    } catch (err) {
      console.error("Vote failed:", err);
    } finally {
      setVoteLoading(false);
    }
  }

  const time = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt.seconds * 1000), { addSuffix: true })
    : "";

  const cardStyle: React.CSSProperties = glowBorder
    ? { ...GLASS, border: "1px solid rgba(124,58,237,0.5)", boxShadow: "0 0 24px rgba(124,58,237,0.25), 0 8px 32px rgba(0,0,0,0.3)" }
    : GLASS;

  async function submitReport() {
    if (!user) return;
    setReportSubmitting(true);
    try {
      await fetch("/api/moderation/report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          reportedBy:    user.uid,
          targetType:    "post",
          targetId:      post.postId,
          targetContent: post.content,
          reason:        reportReason,
        }),
      });
      setReportDone(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportDone(false);
        setMenuOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Report failed:", err);
    } finally {
      setReportSubmitting(false);
    }
  }

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.003 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="relative flex flex-col gap-3"
        style={cardStyle}
        onMouseEnter={(e) => {
          if (!glowBorder) {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(167,139,250,0.45)";
          }
        }}
        onMouseLeave={(e) => {
          if (!glowBorder) {
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(167,139,250,0.3)";
          }
        }}
      >
        {/* Gradient left border for anonymous posts */}
        {post.isAnonymous && (
          <div
            className="absolute left-0 top-3 bottom-3 rounded-full"
            style={{ width: "3px", background: "linear-gradient(to bottom, #7C3AED, #A78BFA)" }}
          />
        )}

        {/* Top row */}
        <div className={`flex items-center justify-between gap-2 ${post.isAnonymous ? "pl-3" : ""}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span style={ALIAS_PILL}>{post.authorAlias}</span>
            {post.isAnonymous && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#7C3AED" }}
              >
                anon
              </span>
            )}
            {post.keyword && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: "#A78BFA" }}
              >
                #{post.keyword}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "#6B7280" }}>{time}</span>

            {/* ⋮ Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="transition-colors duration-150 p-0.5"
                style={{ color: "#6B7280" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#A78BFA")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#6B7280")}
              >
                <MoreVertical size={16} />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 top-6 z-50 py-1 w-36 rounded-xl"
                    style={{ background: "rgba(13,13,26,0.97)", border: "1px solid rgba(167,139,250,0.2)", backdropFilter: "blur(20px)" }}
                  >
                    <button
                      onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                      className="w-full text-left px-4 py-2 text-xs flex items-center gap-2 transition-colors"
                      style={{ color: "#EF4444" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
                    >
                      <Flag size={12} /> Report
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content */}
        <p
          className={`text-sm leading-relaxed line-clamp-4 ${post.isAnonymous ? "pl-3" : ""}`}
          style={{ color: "#F1F0FF" }}
        >
          {post.content}
        </p>

        {/* Bottom action row */}
        <div className={`flex items-center gap-5 ${post.isAnonymous ? "pl-3" : ""}`}>
          <button
            onClick={toggleUpvote}
            disabled={voteLoading}
            className="flex items-center gap-1.5 text-xs transition-all duration-150"
            style={{
              color:      hasVoted ? "#7C3AED" : "#6B7280",
              textShadow: hasVoted ? "0 0 8px rgba(124,58,237,0.5)" : "none",
              fontWeight: hasVoted ? 600 : 400,
            }}
          >
            <ArrowUp size={14} fill={hasVoted ? "#7C3AED" : "none"} /> {upvotes}
          </button>

          <button
            className="flex items-center gap-1.5 text-xs transition-all duration-150"
            style={{ color: "#6B7280" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#EF4444")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#6B7280")}
          >
            <ArrowDown size={14} /> {post.downvotes}
          </button>

          <button
            className="flex items-center gap-1.5 text-xs transition-all duration-150"
            style={{ color: "#6B7280" }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#A78BFA")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#6B7280")}
          >
            <MessageCircle size={14} /> {post.commentCount}
          </button>
        </div>
      </motion.div>

      {/* ── Report Dialog ── */}
      <Dialog open={reportOpen} onOpenChange={(v) => { if (!v) { setReportOpen(false); setMenuOpen(false); } }}>
        <DialogContent
          className="max-w-sm border-0 p-0"
          style={{ background: "rgba(13,13,26,0.97)", backdropFilter: "blur(24px)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "20px" }}
        >
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle style={{ color: "#F1F0FF" }}>Report Post</DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 pt-4 space-y-4">
            {reportDone ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-2xl">✅</p>
                <p className="text-sm font-semibold" style={{ color: "#10B981" }}>Report submitted</p>
                <p className="text-xs" style={{ color: "#6B7280" }}>Thanks for keeping the campus safe</p>
              </div>
            ) : (
              <>
                <p className="text-xs" style={{ color: "#6B7280" }}>Why are you reporting this post?</p>

                <div className="space-y-2">
                  {REPORT_REASONS.map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
                      style={reportReason === value
                        ? { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)" }
                        : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(167,139,250,0.1)" }
                      }
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={value}
                        checked={reportReason === value}
                        onChange={() => setReportReason(value)}
                        className="accent-violet-500"
                      />
                      <span className="text-sm" style={{ color: "#F1F0FF" }}>{label}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={submitReport}
                  disabled={reportSubmitting}
                  className="w-full py-3 rounded-full text-sm font-semibold transition-all"
                  style={{
                    background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                    color:      "#F1F0FF",
                    opacity:    reportSubmitting ? 0.6 : 1,
                    boxShadow:  "0 0 20px rgba(124,58,237,0.35)",
                  }}
                >
                  {reportSubmitting ? "Submitting…" : "Submit Report"}
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
