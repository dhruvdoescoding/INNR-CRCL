"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection, query, where, onSnapshot, doc, getDoc,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Shuffle, Hash, MessageCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingOrbs from "@/components/FloatingOrbs";

// ── Styles ────────────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background:     "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  border:         "1px solid rgba(167,139,250,0.15)",
  borderRadius:   "16px",
  boxShadow:      "0 8px 32px rgba(0,0,0,0.3)",
};

const INPUT_STYLE: React.CSSProperties = {
  width:        "100%",
  background:   "rgba(255,255,255,0.05)",
  border:       "1px solid rgba(167,139,250,0.2)",
  borderRadius: "12px",
  color:        "#F1F0FF",
  padding:      "0.75rem 1rem",
  fontSize:     "0.875rem",
  outline:      "none",
  transition:   "border-color 0.2s ease, box-shadow 0.2s ease",
};

const KEYWORDS = ["anxiety", "music", "placement", "memes", "cricket", "hostel", "crush", "studies"];

// ── Chat card ─────────────────────────────────────────────────────────────────
function ChatCard({ chat, currentUid }: { chat: DocumentData; currentUid: string }) {
  const otherUid   = chat.participants?.find((p: string) => p !== currentUid) ?? "";
  const otherAlias = chat.participantAliases?.[otherUid] ?? "Anonymous";
  const isRevealed = chat.status === "revealed";
  const ts         = chat.lastMessageAt ?? chat.createdAt;
  const time       = ts?.seconds
    ? new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <Link href={`/chat/${chat.chatId ?? chat.id}`}>
      <motion.div
        whileHover={{ scale: 1.01, borderColor: "rgba(167,139,250,0.35)" }}
        transition={{ duration: 0.15 }}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        style={GLASS}
      >
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(167,139,250,0.15))",
            border:     "1px solid rgba(167,139,250,0.3)",
            color:      "#A78BFA",
          }}
        >
          {otherAlias[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate" style={{ color: "#F1F0FF" }}>
              {otherAlias}
            </span>
            {isRevealed ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
                Revealed
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "#10B981" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                Active
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: "#6B7280" }}>Tap to continue chatting</p>
        </div>

        <span className="text-xs flex-shrink-0" style={{ color: "#6B7280" }}>{time}</span>
      </motion.div>
    </Link>
  );
}

// ── Pulsing ring animation ────────────────────────────────────────────────────
function PulseRing({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{ border: "2px solid rgba(124,58,237,0.5)" }}
      animate={{ scale: [1, 1.55, 1.55], opacity: [0.7, 0, 0] }}
      transition={{ duration: 2, delay, repeat: Infinity, ease: "easeOut" }}
    />
  );
}

// ── Waiting state ─────────────────────────────────────────────────────────────
function WaitingState({ onCancel }: { onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-5 py-12"
    >
      {/* Smooth pulsing rings */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        <PulseRing delay={0} />
        <PulseRing delay={0.7} />
        <PulseRing delay={1.4} />
        <div
          className="relative w-14 h-14 rounded-full"
          style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", boxShadow: "0 0 24px rgba(124,58,237,0.6)" }}
        />
      </div>

      <div className="text-center space-y-1">
        <p className="font-semibold text-base" style={{ color: "#F1F0FF" }}>Finding your match…</p>
        <p className="text-sm" style={{ color: "#6B7280" }}>Looking for someone on campus</p>
      </div>

      <button
        onClick={onCancel}
        className="text-sm px-5 py-2 rounded-full transition-all"
        style={{ border: "1px solid rgba(167,139,250,0.25)", color: "#6B7280" }}
      >
        Cancel
      </button>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const router = useRouter();
  const [user,        setUser]        = useState<User | null>(null);
  const [alias,       setAlias]       = useState("…");
  const [domain,      setDomain]      = useState("gla.ac.in");
  const [authLoading, setAuthLoading] = useState(true);
  const [waiting,     setWaiting]     = useState(false);
  const [chats,       setChats]       = useState<DocumentData[]>([]);
  const [kwModal,     setKwModal]     = useState(false);
  const [keyword,     setKeyword]     = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingMatch = useRef<{ matchType: string; keyword: string }>({ matchType: "random", keyword: "" });

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          setAlias(snap.data().alias ?? "You");
          setDomain(snap.data().collegeDomain?.trim() || "gla.ac.in");
        }
      } catch { /* ignore */ }
      setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  // Active chats listener
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      where("status", "in", ["active", "revealed"])
    );
    const unsub = onSnapshot(q, (snap) => {
      setChats(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function matchUser(matchType: string, kw = "") {
    if (!user) return;
    setWaiting(true);
    pendingMatch.current = { matchType, keyword: kw };

    // Start polling
    const poll = async () => {
      try {
        const res  = await fetch("/api/chat/find-or-create", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ uid: user.uid, matchType, keyword: kw, collegeDomain: domain }),
        });
        const data = await res.json();
        if (data.status === "matched") {
          clearInterval(pollRef.current!);
          router.push(`/chat/${data.chatId}`);
        }
      } catch { /* retry next interval */ }
    };

    await poll(); // immediate first call
    pollRef.current = setInterval(poll, 3000);
  }

  async function cancelWaiting() {
    if (pollRef.current) clearInterval(pollRef.current);
    setWaiting(false);
    // Remove from waiting pool server-side
    if (user) {
      try {
        await fetch("/api/chat/find-or-create", {
          method:  "DELETE",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ uid: user.uid }),
        });
      } catch { /* ignore */ }
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}>
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: "rgba(124,58,237,0.25)", borderTopColor: "#7C3AED" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}>
      <FloatingOrbs />

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 py-3"
        style={{ background: "rgba(13,13,26,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(167,139,250,0.1)" }}>
        <span className="font-black tracking-widest text-xl" style={{ background: "linear-gradient(135deg, #A78BFA, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          INNR-CRCL
        </span>
        <span className="text-sm font-semibold px-4 py-1.5 rounded-full" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(167,139,250,0.1))", border: "1px solid rgba(167,139,250,0.3)", color: "#A78BFA" }}>
          {alias}
        </span>
      </nav>

      <div className="max-w-[680px] mx-auto px-4 pb-6" style={{ paddingTop: "80px" }}>
        {/* ── Heading ── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ background: "linear-gradient(135deg, #A78BFA, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Find Your Circle
          </h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>Match with someone from your campus</p>
        </div>

        {/* ── Match cards or waiting ── */}
        <AnimatePresence mode="wait">
          {waiting ? (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <WaitingState onCancel={cancelWaiting} />
            </motion.div>
          ) : (
            <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3 mb-8">
              {/* Random Match */}
              <div className="p-5 flex flex-col gap-4" style={{ ...GLASS, borderRadius: "20px" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)" }}>
                  <Shuffle size={18} style={{ color: "#A78BFA" }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#F1F0FF" }}>Random Match</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>Meet anyone from GLA campus</p>
                </div>
                <button onClick={() => matchUser("random")}
                  className="w-full py-2 rounded-full text-xs font-semibold transition-all"
                  style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", color: "#F1F0FF", boxShadow: "0 0 16px rgba(124,58,237,0.4)" }}>
                  Start Chatting
                </button>
              </div>

              {/* Keyword Match */}
              <div className="p-5 flex flex-col gap-4" style={{ ...GLASS, borderRadius: "20px" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)" }}>
                  <Hash size={18} style={{ color: "#A78BFA" }} />
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: "#F1F0FF" }}>Keyword Match</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>Find someone who gets it</p>
                </div>
                <button onClick={() => setKwModal(true)}
                  className="w-full py-2 rounded-full text-xs font-semibold transition-all"
                  style={{ background: "transparent", border: "1px solid rgba(167,139,250,0.35)", color: "#A78BFA" }}>
                  Find My Vibe
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Active chats ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={15} style={{ color: "#A78BFA" }} />
            <h2 className="text-sm font-semibold" style={{ color: "#A78BFA" }}>Your Conversations</h2>
          </div>

          {chats.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <span className="text-3xl">💬</span>
              <p className="text-sm" style={{ color: "#6B7280" }}>No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {chats.map((chat) => (
                <ChatCard key={chat.id} chat={chat} currentUid={user!.uid} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Keyword modal ── */}
      <Dialog open={kwModal} onOpenChange={(v) => !v && setKwModal(false)}>
        <DialogContent className="max-w-sm border-0 p-0"
          style={{ background: "rgba(13,13,26,0.97)", backdropFilter: "blur(24px)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "20px" }}>
          <DialogHeader className="px-6 pt-6 pb-0">
            <DialogTitle style={{ color: "#F1F0FF" }}>What&apos;s on your mind?</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 pt-4 space-y-4">
            <input
              type="text"
              placeholder="Type a keyword..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              style={INPUT_STYLE}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.2)"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
            />
            {/* Suggested pills */}
            <div className="flex flex-wrap gap-2">
              {KEYWORDS.map((k) => (
                <button key={k} onClick={() => setKeyword(k)}
                  className="text-xs px-3 py-1.5 rounded-full transition-all"
                  style={keyword === k
                    ? { background: "rgba(124,58,237,0.25)", border: "1px solid #7C3AED", color: "#A78BFA" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.15)", color: "#6B7280" }
                  }>
                  {k}
                </button>
              ))}
            </div>
            <button
              disabled={!keyword.trim()}
              onClick={() => { setKwModal(false); matchUser("keyword", keyword.trim()); }}
              className="w-full py-3 rounded-full text-sm font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", color: "#F1F0FF", opacity: keyword.trim() ? 1 : 0.5, boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
              Match Me
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
