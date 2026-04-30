"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection, query, where, getDocs,
  type DocumentData,
} from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PostCard, { type Post } from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";
import BottomNav from "@/components/BottomNav";
import FloatingOrbs from "@/components/FloatingOrbs";
import { PenLine } from "lucide-react";

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { value: "hot", label: "Hot 🔥" },
  { value: "stories", label: "Stories 📸" },
  { value: "memes", label: "Memes 😂" },
  { value: "tea", label: "Tea ☕" },
  { value: "confessions", label: "Confessions 🤫" },
  { value: "nerd", label: "Nerd 📚" },
] as const;
type TabValue = typeof TABS[number]["value"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const FALLBACK_DOMAIN = "gla.ac.in";

function toPost(data: DocumentData, id: string): Post {
  return {
    postId: id,
    authorAlias: data.authorAlias ?? "Anonymous",
    authorUid: data.authorUid ?? "",
    content: data.content ?? "",
    tab: data.tab ?? "hot",
    upvotes: data.upvotes ?? 0,
    downvotes: data.downvotes ?? 0,
    commentCount: data.commentCount ?? 0,
    isAnonymous: data.isAnonymous ?? false,
    isFlagged: data.isFlagged ?? false,
    isPostOfDay: data.isPostOfDay ?? false,
    keyword: data.keyword ?? null,
    mediaURL: data.mediaURL ?? null,
    collegeDomain: data.collegeDomain ?? "",
    createdAt: data.createdAt?.seconds != null
      ? { seconds: data.createdAt.seconds }
      : null,
    expiresAt: data.expiresAt?.seconds != null
      ? { seconds: data.expiresAt.seconds }
      : null,
  };
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-2xl p-4 space-y-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(167,139,250,0.1)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex gap-2 items-center">
        <div className="h-5 w-24 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="h-4 w-12 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
      <div className="h-4 w-full rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="h-4 w-4/5 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="h-4 w-2/3 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
    </div>
  );
}

// ── Post of Day banner ────────────────────────────────────────────────────────
function PostOfDayBanner({ collegeDomain }: { collegeDomain: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/feed/post-of-day?collegeDomain=${encodeURIComponent(collegeDomain)}`)
      .then((r) => r.json())
      .then((d) => { setPost(d.post); setDone(true); })
      .catch(() => setDone(true));
  }, [collegeDomain]);

  if (!done || !post) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-4"
    >
      <div
        className="rounded-[22px] p-0.5"
        style={{
          background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
        }}
      >
        <div
          className="rounded-[20px] p-4"
          style={{ background: "rgba(13,13,26,0.95)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">👑</span>
            <span
              className="text-xs font-bold tracking-widest uppercase"
              style={{ color: "#A78BFA" }}
            >
              Post of the Day
            </span>
          </div>
          <PostCard post={post} glowBorder />
        </div>
      </div>
    </motion.div>
  );
}

// ── Tab feed with realtime Firestore ─────────────────────────────────────────
function TabFeed({ tab }: { tab: TabValue }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    console.log("[TabFeed] fetching tab:", tab);

    getDocs(
      query(collection(db, "posts"), where("tab", "==", tab))
    )
      .then((snap) => {
        if (cancelled) return;
        const docs = snap.docs.map((d) => toPost(d.data() as DocumentData, d.id));
        console.log(`[TabFeed] ${tab} → ${docs.length} posts`, docs);
        setPosts(docs);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error("[TabFeed] getDocs error:", (err as Error).message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <span className="text-4xl">💭</span>
        <p className="font-semibold text-base" style={{ color: "#F1F0FF" }}>
          No posts yet
        </p>
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Be the first to post in this tab
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence initial={false}>
        {posts.filter((p) => !p.isPostOfDay).map((post, i) => (
          <motion.div
            key={post.postId}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, delay: i < 5 ? i * 0.05 : 0 }}
          >
            <PostCard post={post} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Main feed page ────────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [alias, setAlias] = useState("…");
  const [collegeDomain, setCollegeDomain] = useState(FALLBACK_DOMAIN);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("hot");
  const [modalOpen, setModalOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/signup"); return; }
      setUser(u);

      // Fetch alias + collegeDomain from Firestore user doc
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setAlias(snap.data().alias ?? "You");
          // Use the user's actual domain; fall back to demo domain if missing
          setCollegeDomain(
            data.collegeDomain && data.collegeDomain.trim()
              ? data.collegeDomain.trim()
              : FALLBACK_DOMAIN
          );
        }
      } catch { setAlias("You"); }

      setAuthLoading(false);
    });
    return unsub;
  }, [router]);

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}
      >
        <div
          className="w-10 h-10 rounded-full border-[3px] animate-spin"
          style={{ borderColor: "rgba(124,58,237,0.25)", borderTopColor: "#7C3AED" }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}
    >
      <FloatingOrbs />

      {/* ── TOP NAVBAR ── */}
      <nav
        className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 py-3"
        style={{
          background: "rgba(13,13,26,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(167,139,250,0.1)",
        }}
      >
        <span
          className="font-black tracking-widest text-xl"
          style={{
            background: "linear-gradient(135deg, #A78BFA, #7C3AED)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          INNR-CRCL
        </span>
        <Link
          href="/profile/me"
          className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all duration-150"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(167,139,250,0.1))",
            border: "1px solid rgba(167,139,250,0.3)",
            color: "#A78BFA",
          }}
        >
          {alias}
        </Link>
      </nav>

      {/* ── TAB NAV (sticky, glass) ── */}
      <div
        className="fixed z-30 inset-x-0 top-[52px] overflow-x-auto"
        style={{
          background: "rgba(13,13,26,0.8)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(167,139,250,0.08)",
        }}
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
        >
          <TabsList className="flex gap-0 bg-transparent h-auto px-4 py-0 w-max">
            {TABS.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="px-4 py-3 text-sm font-medium whitespace-nowrap rounded-none
                           border-b-2 border-transparent data-[state=active]:border-[#7C3AED]
                           data-[state=active]:text-white data-[state=active]:bg-transparent
                           data-[state=inactive]:text-[#6B7280] bg-transparent
                           hover:text-white/80 transition-all duration-150"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ── FEED CONTENT — normal flow, padded below both fixed bars ── */}
      <div
        className="max-w-[680px] mx-auto px-4 pb-24"
        style={{ paddingTop: "110px" }}
      >
        {activeTab === "hot" && (
          <PostOfDayBanner collegeDomain={collegeDomain} />
        )}
        <TabFeed tab={activeTab} />
      </div>

      {/* ── FAB ── */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setModalOpen(true)}
        className="fixed z-40 flex items-center justify-center rounded-full"
        style={{
          bottom: "84px",
          right: "20px",
          width: "56px",
          height: "56px",
          background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
          border: "1px solid rgba(167,139,250,0.3)",
          boxShadow: "0 0 24px rgba(124,58,237,0.55)",
          color: "#fff",
        }}
      >
        <PenLine size={22} />
      </motion.button>

      {/* ── MODAL ── */}
      {user && (
        <CreatePostModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          authorUid={user.uid}
          authorAlias={alias}
          collegeDomain={collegeDomain}
          defaultTab={activeTab}
        />
      )}

      {/* ── BOTTOM NAV ── */}
      <BottomNav />
    </div>
  );
}
