"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc, onSnapshot, collection, query,
  orderBy, addDoc, updateDoc, serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { CRISIS_KEYWORDS } from "@/lib/constants";
import {
  ArrowLeft as AL,
  Sparkles as SP,
  Send as SD,
  MoreVertical as MV,
  UserPlus as UP,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id:        string;
  senderUid: string;
  content:   string;
  type:      "text" | "system";
  createdAt: { seconds: number } | null;
}

// ── Time helper ───────────────────────────────────────────────────────────────
function fmt(ts: { seconds: number } | null) {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Message bubble ────────────────────────────────────────────────────────────
function Bubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  if (msg.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs italic px-4 py-1.5 rounded-full"
          style={{ background: "rgba(167,139,250,0.1)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }}>
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
    >
      <div style={{ maxWidth: "72%" }}>
        <div
          className="px-4 py-2.5 text-sm leading-relaxed"
          style={isMine ? {
            background:   "linear-gradient(135deg, #7C3AED, #6D28D9)",
            borderRadius: "18px 18px 4px 18px",
            color:        "#F1F0FF",
          } : {
            background:   "rgba(255,255,255,0.08)",
            border:       "1px solid rgba(167,139,250,0.2)",
            borderRadius: "18px 18px 18px 4px",
            color:        "#F1F0FF",
          }}
        >
          {msg.content}
        </div>
        <p className={`text-[10px] mt-0.5 px-1 ${isMine ? "text-right" : "text-left"}`} style={{ color: "#6B7280" }}>
          {fmt(msg.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

// ── Main chat page ────────────────────────────────────────────────────────────
export default function ChatRoomPage() {
  const router   = useRouter();
  const params   = useParams();
  const chatId   = params.id as string;

  const [user,          setUser]          = useState<User | null>(null);
  const [chat,          setChat]          = useState<DocumentData | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState("");
  const [authLoading,   setAuthLoading]   = useState(true);
  const [crisisBanner,  setCrisisBanner]  = useState(false);
  const [revealLoading, setRevealLoading] = useState(false);
  const [showMenu,      setShowMenu]      = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  // ── Chat doc listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      if (snap.exists()) setChat({ id: snap.id, ...snap.data() });
    });
    return unsub;
  }, [chatId]);

  // ── Messages listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => {
        const data = d.data();
        return {
          id:        d.id,
          senderUid: data.senderUid ?? "",
          content:   data.content ?? "",
          type:      data.type ?? "text",
          createdAt: data.createdAt?.seconds != null ? { seconds: data.createdAt.seconds } : null,
        };
      }));
    });
    return unsub;
  }, [chatId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const uid        = user?.uid ?? "";
  const otherUid   = chat?.participants?.find((p: string) => p !== uid) ?? "";
  const otherAlias = chat?.participantAliases?.[otherUid] ?? "Anonymous";
  const isRevealed = chat?.status === "revealed";
  const otherName  = chat?.realNames?.[otherUid] ?? otherAlias;
  const myReveal   = chat?.revealRequests?.[uid]      === true;
  const otherReveal = chat?.revealRequests?.[otherUid] === true;
  const showRevealBanner = otherReveal && !myReveal;

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !uid) return;
    setInput("");
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderUid: uid,
      content:   text,
      type:      "text",
      readBy:    [uid],
      createdAt: serverTimestamp(),
    });
  }, [input, uid, chatId]);

  // ── Crisis check ─────────────────────────────────────────────────────────
  function handleInputChange(val: string) {
    setInput(val);
    if (!crisisBanner) {
      const lower = val.toLowerCase();
      if (CRISIS_KEYWORDS.some((k) => lower.includes(k))) setCrisisBanner(true);
    }
  }

  // ── Reveal request ────────────────────────────────────────────────────────
  async function requestReveal() {
    if (!uid || !chatId || myReveal) return;
    setRevealLoading(true);
    try {
      await fetch("/api/chat/reveal-request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ chatId, uid }),
      });
    } finally { setRevealLoading(false); }
  }

  // ── End chat ──────────────────────────────────────────────────────────────
  async function endChat() {
    setShowMenu(false);
    await updateDoc(doc(db, "chats", chatId), { status: "ended" });
    router.push("/chat");
  }

  if (authLoading || !chat) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}>
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: "rgba(124,58,237,0.25)", borderTopColor: "#7C3AED" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}>

      {/* ── HEADER ── */}
      <div className="fixed top-0 inset-x-0 z-40 flex items-center gap-3 px-4 py-3"
        style={{ background: "rgba(13,13,26,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(167,139,250,0.1)" }}>
        <button onClick={() => router.push("/chat")} className="p-1.5 rounded-full transition-colors" style={{ color: "#6B7280" }}>
          <AL size={20} />
        </button>

        <div className="flex-1 flex items-center gap-2">
          <span className="font-semibold text-sm" style={{ color: "#F1F0FF" }}>
            {isRevealed ? otherName : otherAlias}
          </span>
          {isRevealed ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "#10B981", border: "1px solid rgba(16,185,129,0.3)" }}>
              Revealed
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.1)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.25)" }}>
              Anonymous
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isRevealed ? (
            <button className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", color: "#10B981" }}>
              <UP size={13} /> Add Friend
            </button>
          ) : (
            <button onClick={requestReveal} disabled={myReveal || revealLoading}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
              style={{ background: "transparent", border: "1px solid rgba(167,139,250,0.3)", color: myReveal ? "#6B7280" : "#A78BFA", opacity: revealLoading ? 0.6 : 1 }}>
              <SP size={13} /> {myReveal ? "Requested" : "Reveal Identity"}
            </button>
          )}

          <div className="relative">
            <button onClick={() => setShowMenu((v) => !v)} className="p-1.5" style={{ color: "#6B7280" }}>
              <MV size={18} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-8 z-50 py-1 w-36 rounded-xl"
                  style={{ background: "rgba(13,13,26,0.97)", border: "1px solid rgba(167,139,250,0.2)", backdropFilter: "blur(20px)" }}>
                  <button onClick={endChat} className="w-full text-left px-4 py-2 text-sm transition-colors" style={{ color: "#EF4444" }}>
                    End Chat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── CRISIS BANNER ── */}
      <AnimatePresence>
        {crisisBanner && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="fixed z-30 inset-x-0 px-4 py-2.5"
            style={{ top: "56px", background: "rgba(245,158,11,0.12)", borderBottom: "1px solid rgba(245,158,11,0.25)", backdropFilter: "blur(12px)" }}>
            <p className="text-xs text-center" style={{ color: "#FCD34D" }}>
              You&apos;re not alone 💜 Talk to someone:{" "}
              <strong>iCall: 9152987821</strong> | <strong>Vandrevala: 1860-2662-345</strong>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── REVEAL BANNER ── */}
      <AnimatePresence>
        {showRevealBanner && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="fixed z-30 inset-x-0 px-4 py-3"
            style={{ top: crisisBanner ? "92px" : "56px", background: "rgba(167,139,250,0.08)", borderBottom: "1px solid rgba(167,139,250,0.2)", backdropFilter: "blur(12px)" }}>
            <div className="max-w-[680px] mx-auto flex items-center justify-between gap-3">
              <p className="text-sm" style={{ color: "#F1F0FF" }}>
                <span style={{ color: "#A78BFA" }}>{otherAlias}</span> wants to reveal their identity 👀
              </p>
              <div className="flex gap-2">
                <button onClick={requestReveal}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#10B981" }}>
                  ✅ Yes, reveal
                </button>
                <button onClick={() => {/* dismiss locally */}}
                  className="text-xs px-3 py-1.5 rounded-full"
                  style={{ border: "1px solid rgba(167,139,250,0.2)", color: "#6B7280" }}>
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MESSAGES ── */}
      <div
        className="flex-1 overflow-y-auto px-4"
        style={{
          paddingTop:    `${56 + (crisisBanner ? 36 : 0) + (showRevealBanner ? 52 : 0) + 16}px`,
          paddingBottom: "80px",
        }}
      >
        <div className="max-w-[680px] mx-auto">
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} isMine={msg.senderUid === uid} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── INPUT BAR ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 px-4 py-3"
        style={{ background: "rgba(13,13,26,0.9)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(167,139,250,0.1)" }}>
        <div className="max-w-[680px] mx-auto flex items-center gap-3">
          <input
            type="text"
            placeholder="Say something..."
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            className="flex-1 text-sm"
            style={{
              background:   "rgba(255,255,255,0.06)",
              border:       "1px solid rgba(167,139,250,0.2)",
              borderRadius: "9999px",
              color:        "#F1F0FF",
              padding:      "0.6rem 1.1rem",
              outline:      "none",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{
              background: input.trim() ? "linear-gradient(135deg, #7C3AED, #6D28D9)" : "rgba(255,255,255,0.06)",
              color:      input.trim() ? "#fff" : "#6B7280",
              boxShadow:  input.trim() ? "0 0 16px rgba(124,58,237,0.45)" : "none",
            }}
          >
            <SD size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
