"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection, query, where, onSnapshot, getDocs,
  doc, getDoc, updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Search, MessageCircle, Check, X, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import FloatingOrbs from "@/components/FloatingOrbs";

// ── Styles ────────────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background:     "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  border:         "1px solid rgba(167,139,250,0.15)",
  borderRadius:   "16px",
  boxShadow:      "0 4px 24px rgba(0,0,0,0.25)",
};

const ALIAS_PILL: React.CSSProperties = {
  background:   "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(167,139,250,0.1))",
  border:       "1px solid rgba(167,139,250,0.3)",
  borderRadius: "9999px",
  padding:      "2px 12px",
  color:        "#A78BFA",
  fontSize:     "0.78rem",
  fontWeight:   600,
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface UserDoc {
  uid:          string;
  alias:        string;
  realName:     string;
  department:   string;
  year:         number;
  collegeDomain: string;
  collegeName:  string;
}

interface Friendship {
  id:          string;
  participants: string[];
  status:      string;
  requestedBy: string;
  originChatId?: string;
}

// ── Friend card ───────────────────────────────────────────────────────────────
function FriendCard({ user, onMessage }: { user: UserDoc; onMessage: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3"
      style={GLASS}
    >
      {/* Avatar initial */}
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(167,139,250,0.15))",
          border:     "1px solid rgba(167,139,250,0.3)",
          color:      "#A78BFA",
        }}
      >
        {user.alias[0]?.toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={ALIAS_PILL}>{user.alias}</span>
          <span className="text-sm truncate" style={{ color: "#F1F0FF" }}>{user.realName}</span>
        </div>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#6B7280" }}>
          {user.collegeName || user.collegeDomain} · {user.department} · Year {user.year}
        </p>
      </div>

      <button
        onClick={onMessage}
        className="flex-shrink-0 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all"
        style={{
          background: "rgba(124,58,237,0.12)",
          border:     "1px solid rgba(124,58,237,0.3)",
          color:      "#A78BFA",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.22)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "rgba(124,58,237,0.12)";
        }}
      >
        <MessageCircle size={12} /> Message
      </button>
    </motion.div>
  );
}

// ── Pending request card ──────────────────────────────────────────────────────
function PendingCard({
  requester, onAccept, onDecline,
}: {
  requester:  UserDoc;
  onAccept:   () => void;
  onDecline:  () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handle(fn: () => void) {
    setBusy(true);
    try { fn(); } finally { setBusy(false); }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="flex items-center gap-3 px-4 py-3"
      style={{ ...GLASS, border: "1px solid rgba(167,139,250,0.25)" }}
    >
      <div
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
        style={{
          background: "linear-gradient(135deg, rgba(167,139,250,0.2), rgba(124,58,237,0.1))",
          border:     "1px solid rgba(167,139,250,0.35)",
          color:      "#A78BFA",
        }}
      >
        {requester.alias[0]?.toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={ALIAS_PILL}>{requester.alias}</span>
          <span className="text-sm truncate" style={{ color: "#F1F0FF" }}>{requester.realName}</span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
          {requester.department} · Year {requester.year}
        </p>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={() => handle(onAccept)}
          disabled={busy}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: "rgba(16,185,129,0.15)",
            border:     "1px solid rgba(16,185,129,0.35)",
            color:      "#10B981",
          }}
        >
          <Check size={14} />
        </button>
        <button
          onClick={() => handle(onDecline)}
          disabled={busy}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: "rgba(255,255,255,0.04)",
            border:     "1px solid rgba(167,139,250,0.15)",
            color:      "#6B7280",
          }}
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}

// ── Search result card ────────────────────────────────────────────────────────
function SearchCard({ user, onMessage }: { user: UserDoc; onMessage: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-3"
      style={GLASS}
    >
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
        style={{
          background: "rgba(124,58,237,0.15)",
          border:     "1px solid rgba(124,58,237,0.3)",
          color:      "#A78BFA",
        }}
      >
        {user.alias[0]?.toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span style={ALIAS_PILL}>{user.alias}</span>
          <span className="text-sm truncate" style={{ color: "#F1F0FF" }}>{user.realName}</span>
        </div>
        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{user.department} · Year {user.year}</p>
      </div>
      <button
        onClick={onMessage}
        className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all"
        style={{
          background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
          color:      "#F1F0FF",
          boxShadow:  "0 0 12px rgba(124,58,237,0.3)",
        }}
      >
        Chat
      </button>
    </motion.div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHeading({ icon, label, count }: { icon: React.ReactNode; label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-sm font-semibold" style={{ color: "#A78BFA" }}>{label}</h2>
      {count !== undefined && count > 0 && (
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
          style={{ background: "rgba(124,58,237,0.2)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.3)" }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FriendsPage() {
  const router = useRouter();

  const [user,        setUser]        = useState<User | null>(null);
  const [myDoc,       setMyDoc]       = useState<UserDoc | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [pending,     setPending]     = useState<{ friendship: Friendship; requester: UserDoc }[]>([]);
  const [friends,     setFriends]     = useState<{ friendship: Friendship; friend: UserDoc }[]>([]);

  const [searchVal,   setSearchVal]   = useState("");
  const [searchRes,   setSearchRes]   = useState<UserDoc[]>([]);
  const [searching,   setSearching]   = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setMyDoc({ uid: u.uid, ...(snap.data() as Omit<UserDoc, "uid">) });
      } catch { /* ignore */ }
      setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  // ── Pending requests listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "friendships"),
      where("participants", "array-contains", user.uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, async (snap) => {
      const incoming = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Friendship))
        .filter((f) => f.requestedBy !== user.uid);

      const enriched = await Promise.all(
        incoming.map(async (f) => {
          const requesterUid = f.participants.find((p) => p !== user.uid) ?? "";
          const uSnap = await getDoc(doc(db, "users", requesterUid));
          const requester: UserDoc = uSnap.exists()
            ? { uid: requesterUid, ...(uSnap.data() as Omit<UserDoc, "uid">) }
            : { uid: requesterUid, alias: "Anonymous", realName: "", department: "", year: 0, collegeDomain: "", collegeName: "" };
          return { friendship: f, requester };
        })
      );
      setPending(enriched);
    });
    return unsub;
  }, [user]);

  // ── Accepted friends listener ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "friendships"),
      where("participants", "array-contains", user.uid),
      where("status", "==", "accepted")
    );
    const unsub = onSnapshot(q, async (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Friendship));
      const enriched = await Promise.all(
        rows.map(async (f) => {
          const friendUid = f.participants.find((p) => p !== user.uid) ?? "";
          const uSnap = await getDoc(doc(db, "users", friendUid));
          const friend: UserDoc = uSnap.exists()
            ? { uid: friendUid, ...(uSnap.data() as Omit<UserDoc, "uid">) }
            : { uid: friendUid, alias: "Anonymous", realName: "", department: "", year: 0, collegeDomain: "", collegeName: "" };
          return { friendship: f, friend };
        })
      );
      setFriends(enriched);
    });
    return unsub;
  }, [user]);

  // ── Debounced search ─────────────────────────────────────────────────────
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const val = searchVal.trim();
    if (!val || !myDoc) { setSearchRes([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, "users"),
            where("collegeDomain", "==", myDoc.collegeDomain)
          )
        );
        const lower = val.toLowerCase();
        const results: UserDoc[] = snap.docs
          .map((d) => ({ uid: d.id, ...(d.data() as Omit<UserDoc, "uid">) }))
          .filter(
            (u) =>
              u.uid !== user?.uid &&
              (u.alias?.toLowerCase().includes(lower) ||
               u.realName?.toLowerCase().includes(lower))
          )
          .slice(0, 8);
        setSearchRes(results);
      } catch { setSearchRes([]); }
      finally   { setSearching(false); }
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchVal, myDoc]);

  // ── Friendship actions ────────────────────────────────────────────────────
  async function acceptFriendship(id: string) {
    await updateDoc(doc(db, "friendships", id), { status: "accepted" });
  }
  async function declineFriendship(id: string) {
    await updateDoc(doc(db, "friendships", id), { status: "declined" });
  }

  function goToChat() { router.push("/chat"); }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}>
        <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: "rgba(124,58,237,0.25)", borderTopColor: "#7C3AED" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}>
      <FloatingOrbs />

      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 py-3"
        style={{ background: "rgba(13,13,26,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(167,139,250,0.1)" }}
      >
        <span
          className="font-black tracking-widest text-xl"
          style={{ background: "linear-gradient(135deg, #A78BFA, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          INNR-CRCL
        </span>
        <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.25)", color: "#A78BFA" }}>
          {myDoc?.alias ?? "…"}
        </span>
      </nav>

      <div className="max-w-[680px] mx-auto px-4" style={{ paddingTop: "80px" }}>
        {/* ── Page header ── */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ background: "linear-gradient(135deg, #A78BFA, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Your Circle
          </h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>Friends made through anonymous conversations</p>
        </div>

        {/* ── Search ── */}
        <div className="mb-8">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "#6B7280" }}
            />
            <input
              id="friends-search"
              type="text"
              placeholder="Search by alias or name..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm"
              style={{
                background:   "rgba(255,255,255,0.05)",
                border:       "1px solid rgba(167,139,250,0.2)",
                borderRadius: "12px",
                color:        "#F1F0FF",
                outline:      "none",
                transition:   "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#7C3AED";
                e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(124,58,237,0.2)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)";
                e.currentTarget.style.boxShadow   = "none";
              }}
            />
          </div>

          <AnimatePresence>
            {searchVal.trim() && (
              <motion.div
                key="search-results"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="mt-2 space-y-2"
              >
                {searching && (
                  <p className="text-xs py-3 text-center" style={{ color: "#6B7280" }}>Searching…</p>
                )}
                {!searching && searchRes.length === 0 && (
                  <p className="text-xs py-3 text-center" style={{ color: "#6B7280" }}>No users found</p>
                )}
                {searchRes.map((u) => (
                  <SearchCard key={u.uid} user={u} onMessage={goToChat} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Pending requests ── */}
        <AnimatePresence>
          {pending.length > 0 && (
            <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
              <SectionHeading
                icon={<span className="text-sm">🤝</span>}
                label="Pending Requests"
                count={pending.length}
              />
              <div className="space-y-2">
                <AnimatePresence>
                  {pending.map(({ friendship, requester }) => (
                    <PendingCard
                      key={friendship.id}
                      requester={requester}
                      onAccept={() => acceptFriendship(friendship.id)}
                      onDecline={() => declineFriendship(friendship.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Friends ── */}
        <div>
          <SectionHeading
            icon={<Users size={14} style={{ color: "#A78BFA" }} />}
            label="Your Friends"
            count={friends.length}
          />

          {friends.length === 0 ? (
            <div className="flex flex-col items-center py-14 gap-3">
              <span className="text-4xl">🌀</span>
              <p className="font-semibold text-base" style={{ color: "#F1F0FF" }}>
                Your circle is empty for now
              </p>
              <p className="text-sm text-center" style={{ color: "#6B7280" }}>
                Start an anonymous chat to find friends
              </p>
              <button
                onClick={goToChat}
                className="mt-2 flex items-center gap-2 text-sm px-5 py-2.5 rounded-full font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                  color:      "#F1F0FF",
                  boxShadow:  "0 0 20px rgba(124,58,237,0.4)",
                }}
              >
                <MessageCircle size={15} /> Start a Chat
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {friends.map(({ friendship, friend }) => (
                  <FriendCard key={friendship.id} user={friend} onMessage={goToChat} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
