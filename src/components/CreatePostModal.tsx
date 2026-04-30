"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle } from "lucide-react";

const TABS = ["hot", "memes", "tea", "confessions", "nerd", "stories"] as const;
type TabType = typeof TABS[number];

const ANON_TABS: TabType[] = ["confessions", "tea"];
const MAX = 500;

interface CreatePostModalProps {
  open:        boolean;
  onClose:     () => void;
  authorUid:   string;
  authorAlias: string;
  collegeDomain: string;
  defaultTab?: TabType;
}

const INPUT_STYLE: React.CSSProperties = {
  width:        "100%",
  background:   "rgba(255,255,255,0.05)",
  border:       "1px solid rgba(167,139,250,0.2)",
  borderRadius: "12px",
  color:        "#F1F0FF",
  padding:      "0.75rem 1rem",
  fontSize:     "0.875rem",
  outline:      "none",
  resize:       "none",
  transition:   "border-color 0.2s ease, box-shadow 0.2s ease",
};

export default function CreatePostModal({
  open, onClose, authorUid, authorAlias, collegeDomain, defaultTab = "hot",
}: CreatePostModalProps) {
  const [content,  setContent]  = useState("");
  const [tab,      setTab]      = useState<TabType>(defaultTab);
  const [keyword,  setKeyword]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const isAnon = ANON_TABS.includes(tab);
  const remaining = MAX - content.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setError(""); setLoading(true);
    try {
      await addDoc(collection(db, "posts"), {
        authorUid,
        authorAlias,
        collegeDomain,
        tab,
        content:      content.trim(),
        mediaURL:     null,
        upvotes:      0,
        downvotes:    0,
        commentCount: 0,
        isAnonymous:  isAnon,
        isFlagged:    false,
        isPostOfDay:  false,
        expiresAt:    tab === "stories"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : null,
        keyword:      tab === "nerd" && keyword.trim() ? keyword.trim() : null,
        createdAt:    serverTimestamp(),
      });
      setContent(""); setKeyword(""); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to post. Try again.");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-md border-0 p-0 gap-0"
        style={{
          background:     "rgba(13,13,26,0.97)",
          backdropFilter: "blur(24px)",
          border:         "1px solid rgba(167,139,250,0.2)",
          borderRadius:   "20px",
          boxShadow:      "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle style={{ color: "#F1F0FF", fontSize: "1.1rem" }}>
            New Post
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
          {/* Tab selector */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className="text-xs px-3 py-1.5 rounded-full transition-all duration-150 font-medium capitalize"
                style={
                  tab === t
                    ? {
                        background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                        border:     "1px solid rgba(167,139,250,0.3)",
                        color:      "#F1F0FF",
                        boxShadow:  "0 0 12px rgba(124,58,237,0.4)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        border:     "1px solid rgba(167,139,250,0.15)",
                        color:      "#6B7280",
                      }
                }
              >
                {t}
              </button>
            ))}
          </div>

          {isAnon && (
            <p className="text-xs px-1" style={{ color: "#A78BFA" }}>
              🎭 This post will be anonymous
            </p>
          )}

          {/* Nerd keyword */}
          {tab === "nerd" && (
            <input
              type="text"
              placeholder="Keyword: doubt / pyq / hackathon / notes"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={{ ...INPUT_STYLE, marginBottom: 0 }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#7C3AED";
                e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(124,58,237,0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)";
                e.currentTarget.style.boxShadow   = "none";
              }}
            />
          )}

          {/* Textarea */}
          <div className="relative">
            <textarea
              required
              rows={5}
              maxLength={MAX}
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={INPUT_STYLE}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#7C3AED";
                e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(124,58,237,0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)";
                e.currentTarget.style.boxShadow   = "none";
              }}
            />
            <span
              className="absolute bottom-3 right-3 text-xs"
              style={{ color: remaining < 50 ? "#EF4444" : "#6B7280" }}
            >
              {remaining}/{MAX}
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "#EF4444" }}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !content.trim()}
            className="w-full py-3 rounded-full text-sm font-semibold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
              border:     "1px solid rgba(167,139,250,0.3)",
              boxShadow:  "0 0 20px rgba(124,58,237,0.4)",
              color:      "#F1F0FF",
              opacity:    loading || !content.trim() ? 0.5 : 1,
              cursor:     loading || !content.trim() ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!loading && content.trim())
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 35px rgba(124,58,237,0.6)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 0 20px rgba(124,58,237,0.4)";
            }}
          >
            {loading ? "Posting…" : "Post Anonymously 🎭"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
