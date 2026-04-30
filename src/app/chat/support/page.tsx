"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc, getDoc, onSnapshot, collection, query,
  orderBy, addDoc, updateDoc, serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  ArrowLeft, Send, Heart, Phone, ExternalLink, Loader2,
} from "lucide-react";

// ── Styles ────────────────────────────────────────────────────────────────────
const AMBER_GLASS: React.CSSProperties = {
  background:     "rgba(245,158,11,0.07)",
  backdropFilter: "blur(20px)",
  border:         "1px solid rgba(245,158,11,0.25)",
  borderRadius:   "16px",
  boxShadow:      "0 4px 24px rgba(0,0,0,0.3)",
};

// ── Crisis resources ──────────────────────────────────────────────────────────
function CrisisBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`${compact ? "px-4 py-2" : "px-5 py-3"} text-center`}
      style={{
        background:   "rgba(245,158,11,0.1)",
        borderBottom: "1px solid rgba(245,158,11,0.2)",
        backdropFilter: "blur(12px)",
      }}
    >
      <p className={`${compact ? "text-[11px]" : "text-xs"} font-medium`} style={{ color: "#FCD34D" }}>
        💜 You&apos;re not alone —{" "}
        <strong>iCall: 9152987821</strong>
        {" · "}
        <strong>Vandrevala: 1860-2662-345</strong>
      </p>
    </div>
  );
}

function CrisisResources() {
  return (
    <div className="space-y-3 p-5" style={AMBER_GLASS}>
      <p className="text-sm font-semibold" style={{ color: "#FCD34D" }}>
        Immediate support available 💜
      </p>
      <div className="space-y-2">
        {[
          { label: "iCall (TISS)", number: "9152987821" },
          { label: "Vandrevala Foundation", number: "1860-2662-345" },
        ].map(({ label, number }) => (
          <a
            key={number}
            href={`tel:${number.replace(/-/g, "")}`}
            className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
            style={{
              background: "rgba(245,158,11,0.08)",
              border:     "1px solid rgba(245,158,11,0.2)",
            }}
          >
            <div>
              <p className="text-xs font-semibold" style={{ color: "#F1F0FF" }}>{label}</p>
              <p className="text-sm font-bold" style={{ color: "#FCD34D" }}>{number}</p>
            </div>
            <Phone size={16} style={{ color: "#FCD34D" }} />
          </a>
        ))}
        <a
          href="https://icallhelpline.org"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div>
            <p className="text-xs font-semibold" style={{ color: "#F1F0FF" }}>iCall Website</p>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>icallhelpline.org</p>
          </div>
          <ExternalLink size={14} style={{ color: "#FCD34D" }} />
        </a>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
interface Message {
  id:        string;
  senderUid: string;
  content:   string;
  type:      "text" | "system";
  createdAt: { seconds: number } | null;
}

function fmt(ts: { seconds: number } | null) {
  if (!ts) return "";
  return new Date(ts.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Bubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  if (msg.type === "system") {
    return (
      <div className="flex justify-center my-3">
        <span
          className="text-xs italic px-4 py-1.5 rounded-full"
          style={{ background: "rgba(245,158,11,0.1)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
    >
      <div style={{ maxWidth: "72%" }}>
        <div
          className="px-4 py-2.5 text-sm leading-relaxed"
          style={isMine ? {
            background:   "linear-gradient(135deg, #D97706, #B45309)",
            borderRadius: "18px 18px 4px 18px",
            color:        "#FEF3C7",
          } : {
            background:   "rgba(255,255,255,0.07)",
            border:       "1px solid rgba(245,158,11,0.2)",
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

// ── Waiting state ─────────────────────────────────────────────────────────────
function WaitingState({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-10">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full animate-ping"
          style={{ border: "2px solid rgba(245,158,11,0.35)" }} />
        <div className="absolute inset-3 rounded-full animate-ping"
          style={{ border: "2px solid rgba(245,158,11,0.25)", animationDelay: "0.4s" }} />
        <Heart size={24} style={{ color: "#F59E0B" }} />
      </div>
      <div className="text-center space-y-1">
        <p className="font-semibold text-sm" style={{ color: "#F1F0FF" }}>Finding a peer listener…</p>
        <p className="text-xs" style={{ color: "#9CA3AF" }}>Matching you with someone who cares</p>
      </div>
      <button
        onClick={onCancel}
        className="text-xs px-5 py-2 rounded-full"
        style={{ border: "1px solid rgba(245,158,11,0.25)", color: "#9CA3AF" }}
      >
        Cancel
      </button>
    </div>
  );
}

// ── No listeners available ────────────────────────────────────────────────────
function NoListeners() {
  return (
    <div className="space-y-4 py-4">
      <div className="text-center space-y-2 py-6">
        <p className="text-2xl">🌙</p>
        <p className="font-semibold text-sm" style={{ color: "#F1F0FF" }}>No listeners available right now</p>
        <p className="text-xs" style={{ color: "#9CA3AF" }}>
          Our peer listeners may be offline. Try again later or reach out below.
        </p>
      </div>
      <CrisisResources />
    </div>
  );
}

// ── Phase types ───────────────────────────────────────────────────────────────
type Phase = "disclaimer" | "waiting" | "no-listeners" | "chat";

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SupportChatPage() {
  const router = useRouter();

  const [user,        setUser]        = useState<User | null>(null);
  const [myDomain,    setMyDomain]    = useState("gla.ac.in");
  const [authLoading, setAuthLoading] = useState(true);

  const [phase,  setPhase]  = useState<Phase>("disclaimer");
  const [chatId, setChatId] = useState<string | null>(null);
  const [chat,   setChat]   = useState<DocumentData | null>(null);

  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [showMenu,  setShowMenu]  = useState(false);

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setMyDomain(snap.data().collegeDomain?.trim() || "gla.ac.in");
      } catch { /* ignore */ }
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

  // ── Messages listener ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatId || phase !== "chat") return;
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id:        d.id,
            senderUid: data.senderUid ?? "",
            content:   data.content ?? "",
            type:      data.type ?? "text",
            createdAt: data.createdAt?.seconds != null
              ? { seconds: data.createdAt.seconds } : null,
          };
        })
      );
    });
    return unsub;
  }, [chatId, phase]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Cleanup poll ──────────────────────────────────────────────────────────
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ── Start matching ────────────────────────────────────────────────────────
  function startMatching() {
    setPhase("waiting");

    const poll = async () => {
      if (!user) return;
      try {
        const res  = await fetch("/api/chat/find-or-create", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            uid:          user.uid,
            matchType:    "support",
            keyword:      null,
            collegeDomain: myDomain,
            isSupport:    true,
          }),
        });
        const data = await res.json();

        if (data.status === "matched") {
          clearInterval(pollRef.current!);
          setChatId(data.chatId);
          setPhase("chat");
        } else if (data.noListeners) {
          clearInterval(pollRef.current!);
          setPhase("no-listeners");
        }
      } catch { /* retry */ }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);

    // After 30s with no match → show no-listeners
    setTimeout(() => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        setPhase((prev) => prev === "waiting" ? "no-listeners" : prev);
      }
    }, 30_000);
  }

  function cancelWaiting() {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase("disclaimer");
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !user || !chatId) return;
    setSending(true);
    setInput("");
    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderUid: user.uid,
        content:   text,
        type:      "text",
        readBy:    [user.uid],
        createdAt: serverTimestamp(),
      });
    } finally { setSending(false); }
  }, [input, user, chatId]);

  // ── End chat ──────────────────────────────────────────────────────────────
  async function endChat() {
    setShowMenu(false);
    if (chatId) await updateDoc(doc(db, "chats", chatId), { status: "ended" });
    router.push("/chat");
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const uid        = user?.uid ?? "";
  const otherUid   = chat?.participants?.find((p: string) => p !== uid) ?? "";
  const otherAlias = chat?.participantAliases?.[otherUid] ?? "Peer Listener";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at top, #1a0a00 0%, #0D0D1A 60%)" }}>
        <Loader2 className="animate-spin" size={28} style={{ color: "#F59E0B" }} />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "radial-gradient(ellipse at top, #1a0a00 0%, #0D0D1A 60%)" }}
    >
      {/* ── HEADER ── */}
      <div
        className="fixed top-0 inset-x-0 z-40 flex items-center gap-3 px-4 py-3"
        style={{ background: "rgba(13,13,5,0.9)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(245,158,11,0.15)" }}
      >
        <button onClick={() => router.push("/chat")} className="p-1.5" style={{ color: "#9CA3AF" }}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: "#FCD34D" }}>Support Chat</p>
          <p className="text-[10px]" style={{ color: "#9CA3AF" }}>Talk to a peer listener anonymously</p>
        </div>
        {phase === "chat" && (
          <div className="relative">
            <button onClick={() => setShowMenu((v) => !v)} className="p-1.5" style={{ color: "#9CA3AF" }}>
              ⋮
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  className="absolute right-0 top-8 z-50 py-1 w-36 rounded-xl"
                  style={{ background: "rgba(13,13,5,0.97)", border: "1px solid rgba(245,158,11,0.2)", backdropFilter: "blur(20px)" }}
                >
                  <button
                    onClick={endChat}
                    className="w-full text-left px-4 py-2 text-xs"
                    style={{ color: "#EF4444" }}
                  >
                    End Chat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── ALWAYS-ON CRISIS BANNER (in chat) ── */}
      {phase === "chat" && (
        <div className="fixed inset-x-0 z-30" style={{ top: "52px" }}>
          <CrisisBanner compact />
        </div>
      )}

      {/* ── CONTENT ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop:    phase === "chat" ? "92px" : "68px",
          paddingBottom: phase === "chat" ? "80px" : "24px",
        }}
      >
        <div className="max-w-[680px] mx-auto px-4">

          {/* ── DISCLAIMER ── */}
          {phase === "disclaimer" && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4">
              <div className="p-5 space-y-4" style={AMBER_GLASS}>
                <div className="flex items-center gap-2">
                  <Heart size={18} style={{ color: "#F59E0B", flexShrink: 0 }} />
                  <p className="text-sm font-bold" style={{ color: "#FCD34D" }}>
                    Before you continue
                  </p>
                </div>
                <ul className="space-y-2 text-sm" style={{ color: "#D1D5DB" }}>
                  <li className="flex items-start gap-2">
                    <span style={{ color: "#F59E0B", flexShrink: 0 }}>•</span>
                    This is <strong style={{ color: "#FCD34D" }}>peer support</strong>, not professional mental health care
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: "#F59E0B", flexShrink: 0 }}>•</span>
                    Your chat is fully anonymous — no identity reveal in support chats
                  </li>
                  <li className="flex items-start gap-2">
                    <span style={{ color: "#F59E0B", flexShrink: 0 }}>•</span>
                    For emergencies: <strong style={{ color: "#FCD34D" }}>iCall 9152987821</strong> or <strong style={{ color: "#FCD34D" }}>112</strong>
                  </li>
                </ul>
              </div>

              <button
                onClick={startMatching}
                className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #D97706, #B45309)",
                  color:      "#FEF3C7",
                  boxShadow:  "0 0 24px rgba(245,158,11,0.3)",
                }}
              >
                I understand — Find a Listener
              </button>

              <div className="pt-2">
                <CrisisResources />
              </div>
            </motion.div>
          )}

          {/* ── WAITING ── */}
          {phase === "waiting" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <WaitingState onCancel={cancelWaiting} />
              <div className="mt-6">
                <CrisisResources />
              </div>
            </motion.div>
          )}

          {/* ── NO LISTENERS ── */}
          {phase === "no-listeners" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <NoListeners />
            </motion.div>
          )}

          {/* ── CHAT MESSAGES ── */}
          {phase === "chat" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Listener connected notice */}
              <div className="flex justify-center mb-4 mt-2">
                <span
                  className="text-[11px] italic px-4 py-1.5 rounded-full"
                  style={{ background: "rgba(245,158,11,0.1)", color: "#FCD34D", border: "1px solid rgba(245,158,11,0.2)" }}
                >
                  Connected with {otherAlias} 💜 You&apos;re safe here
                </span>
              </div>

              {messages.map((msg) => (
                <Bubble key={msg.id} msg={msg} isMine={msg.senderUid === uid} />
              ))}
              <div ref={bottomRef} />
            </motion.div>
          )}
        </div>
      </div>

      {/* ── INPUT BAR (only in chat) ── */}
      {phase === "chat" && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 px-4 py-3"
          style={{ background: "rgba(13,13,5,0.92)", backdropFilter: "blur(20px)", borderTop: "1px solid rgba(245,158,11,0.12)" }}
        >
          <div className="max-w-[680px] mx-auto flex items-center gap-3">
            <input
              type="text"
              placeholder="Say something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              className="flex-1 text-sm"
              style={{
                background:   "rgba(245,158,11,0.07)",
                border:       "1px solid rgba(245,158,11,0.2)",
                borderRadius: "9999px",
                color:        "#F1F0FF",
                padding:      "0.6rem 1.1rem",
                outline:      "none",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{
                background: input.trim()
                  ? "linear-gradient(135deg, #D97706, #B45309)"
                  : "rgba(255,255,255,0.06)",
                color:     input.trim() ? "#FEF3C7" : "#6B7280",
                boxShadow: input.trim() ? "0 0 16px rgba(245,158,11,0.35)" : "none",
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
