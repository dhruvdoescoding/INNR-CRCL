"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  doc, getDoc, updateDoc, query, collection,
  where, getDocs,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import PostCard, { type Post } from "@/components/PostCard";
import BottomNav from "@/components/BottomNav";
import FloatingOrbs from "@/components/FloatingOrbs";
import {
  Lock, Pencil, X, Check, LogOut, GraduationCap,
  CalendarDays, Users, FileText,
} from "lucide-react";

// ── Styles ────────────────────────────────────────────────────────────────────
const GLASS: React.CSSProperties = {
  background:     "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  border:         "1px solid rgba(167,139,250,0.15)",
  borderRadius:   "16px",
  boxShadow:      "0 4px 24px rgba(0,0,0,0.25)",
};

const INPUT_STYLE: React.CSSProperties = {
  width:        "100%",
  background:   "rgba(255,255,255,0.05)",
  border:       "1px solid rgba(167,139,250,0.2)",
  borderRadius: "10px",
  color:        "#F1F0FF",
  padding:      "0.6rem 0.9rem",
  fontSize:     "0.875rem",
  outline:      "none",
};

const SELECT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  cursor: "pointer",
  appearance: "none" as React.CSSProperties["appearance"],
};

const DEPARTMENTS = ["CSE", "ECE", "MBA", "Other"];
const YEARS       = [1, 2, 3, 4];

// ── Pill chip ─────────────────────────────────────────────────────────────────
function Pill({ label }: { label: string }) {
  return (
    <span
      className="text-xs px-3 py-1 rounded-full font-medium"
      style={{
        background: "rgba(124,58,237,0.12)",
        border:     "1px solid rgba(124,58,237,0.25)",
        color:      "#A78BFA",
      }}
    >
      {label}
    </span>
  );
}

// ── Stat box ──────────────────────────────────────────────────────────────────
function StatBox({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1 py-3" style={{ borderRight: "1px solid rgba(167,139,250,0.08)" }}>
      <div className="text-lg font-bold" style={{ color: "#F1F0FF" }}>{value}</div>
      <div className="flex items-center gap-1 text-[10px]" style={{ color: "#6B7280" }}>
        {icon}
        <span>{label}</span>
      </div>
    </div>
  );
}

// ── Locked field ──────────────────────────────────────────────────────────────
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: "#6B7280" }}>{label}</label>
      <div
        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(167,139,250,0.1)", color: "#6B7280" }}
      >
        <Lock size={13} style={{ color: "#6B7280", flexShrink: 0 }} />
        <span className="truncate">{value}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();

  const [user,        setUser]        = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // profile data
  const [alias,       setAlias]       = useState("");
  const [realName,    setRealName]    = useState("");
  const [email,       setEmail]       = useState("");
  const [department,  setDepartment]  = useState("CSE");
  const [year,        setYear]        = useState(1);
  const [collegeName, setCollegeName] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [friendCount, setFriendCount] = useState(0);

  // edit mode
  const [editing,    setEditing]    = useState(false);
  const [editDept,   setEditDept]   = useState("CSE");
  const [editYear,   setEditYear]   = useState(1);
  const [saving,     setSaving]     = useState(false);

  // posts
  const [posts,      setPosts]      = useState<Post[]>([]);
  const [postsLoaded, setPostsLoaded] = useState(false);

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      setEmail(u.email ?? "");

      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const d = snap.data();
          setAlias(d.alias ?? "");
          setRealName(d.realName ?? "");
          setDepartment(d.department ?? "CSE");
          setYear(d.year ?? 1);
          setCollegeName(d.collegeName ?? d.collegeDomain ?? "");
          if (d.createdAt?.seconds) {
            setMemberSince(
              new Date(d.createdAt.seconds * 1000).toLocaleDateString("en-IN", {
                month: "short", year: "numeric",
              })
            );
          }
        }
      } catch { /* ignore */ }

      // Friend count
      try {
        const fSnap = await getDocs(
          query(
            collection(db, "friendships"),
            where("participants", "array-contains", u.uid),
            where("status", "==", "accepted")
          )
        );
        setFriendCount(fSnap.size);
      } catch { /* ignore */ }

      // My posts
      try {
        const pSnap = await getDocs(
          query(collection(db, "posts"), where("authorUid", "==", u.uid))
        );
        const myPosts: Post[] = pSnap.docs.map((d) => {
          const data = d.data();
          return {
            postId:       d.id,
            authorAlias:  data.authorAlias  ?? alias,
            authorUid:    data.authorUid    ?? u.uid,
            content:      data.content      ?? "",
            tab:          data.tab          ?? "hot",
            upvotes:      data.upvotes      ?? 0,
            downvotes:    data.downvotes    ?? 0,
            commentCount: data.commentCount ?? 0,
            isAnonymous:  data.isAnonymous  ?? false,
            isFlagged:    data.isFlagged    ?? false,
            isPostOfDay:  data.isPostOfDay  ?? false,
            keyword:      data.keyword      ?? null,
            mediaURL:     data.mediaURL     ?? null,
            collegeDomain: data.collegeDomain ?? "",
            createdAt:    data.createdAt?.seconds != null
              ? { seconds: data.createdAt.seconds } : null,
            expiresAt:    data.expiresAt?.seconds != null
              ? { seconds: data.expiresAt.seconds } : null,
          };
        });
        setPosts(myPosts);
      } catch { /* ignore */ }
      finally { setPostsLoaded(true); }

      setAuthLoading(false);
    });
    return unsub;
  }, [router]); // alias intentionally omitted — not needed in dep array for this effect

  function startEdit() {
    setEditDept(department);
    setEditYear(year);
    setEditing(true);
  }

  async function saveEdit() {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        department: editDept,
        year:       editYear,
      });
      setDepartment(editDept);
      setYear(editYear);
      setEditing(false);
    } catch (err) {
      console.error("Profile update failed:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    router.push("/");
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
    <div className="min-h-screen pb-24"
      style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}>
      <FloatingOrbs />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-5 py-3"
        style={{ background: "rgba(13,13,26,0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(167,139,250,0.1)" }}>
        <span className="font-black tracking-widest text-xl"
          style={{ background: "linear-gradient(135deg, #A78BFA, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          INNR-CRCL
        </span>
        {!editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-full font-semibold transition-all"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)", color: "#A78BFA" }}
          >
            <Pencil size={12} /> Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full"
              style={{ border: "1px solid rgba(167,139,250,0.2)", color: "#6B7280" }}>
              <X size={12} /> Cancel
            </button>
            <button onClick={saveEdit} disabled={saving}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full font-semibold"
              style={{ background: "linear-gradient(135deg, #7C3AED, #6D28D9)", color: "#F1F0FF", opacity: saving ? 0.6 : 1 }}>
              <Check size={12} /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </nav>

      <div className="max-w-[680px] mx-auto px-4" style={{ paddingTop: "80px" }}>

        {/* ── Profile header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-5 p-6"
          style={GLASS}
        >
          {/* Avatar + names */}
          <div className="flex items-start gap-4 mb-5">
            <div
              className="flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(167,139,250,0.2))",
                border:     "1px solid rgba(167,139,250,0.35)",
                color:      "#A78BFA",
              }}
            >
              {alias[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl font-black mb-0.5 truncate"
                style={{ background: "linear-gradient(135deg, #A78BFA, #7C3AED)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {alias}
              </h1>
              <p className="text-sm truncate" style={{ color: "#9CA3AF" }}>{realName}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {collegeName && <Pill label={collegeName} />}
                <Pill label={department} />
                <Pill label={`Year ${year}`} />
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(167,139,250,0.1)" }}>
            <StatBox icon={<FileText size={10} />} value={posts.length} label="Posts" />
            <StatBox icon={<Users size={10} />}    value={friendCount}  label="Friends" />
            <div className="flex flex-col items-center gap-1 flex-1 py-3">
              <div className="text-sm font-bold" style={{ color: "#F1F0FF" }}>{memberSince || "—"}</div>
              <div className="flex items-center gap-1 text-[10px]" style={{ color: "#6B7280" }}>
                <CalendarDays size={10} />
                <span>Joined</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Edit form ── */}
        <AnimatePresence>
          {editing && (
            <motion.div
              key="edit-form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden"
            >
              <div className="p-5 space-y-4" style={{ ...GLASS, border: "1px solid rgba(124,58,237,0.3)" }}>
                <h2 className="text-sm font-semibold" style={{ color: "#A78BFA" }}>Edit Profile</h2>

                <LockedField label="Email" value={email} />
                <LockedField label="Alias" value={alias} />

                {/* Department */}
                <div className="space-y-1">
                  <label className="text-xs font-medium flex items-center gap-1" style={{ color: "#9CA3AF" }}>
                    <GraduationCap size={12} /> Department
                  </label>
                  <select
                    value={editDept}
                    onChange={(e) => setEditDept(e.target.value)}
                    style={SELECT_STYLE}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.2)"; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {DEPARTMENTS.map((d) => <option key={d} value={d} style={{ background: "#0D0D1A" }}>{d}</option>)}
                  </select>
                </div>

                {/* Year */}
                <div className="space-y-1">
                  <label className="text-xs font-medium flex items-center gap-1" style={{ color: "#9CA3AF" }}>
                    <CalendarDays size={12} /> Year
                  </label>
                  <select
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    style={SELECT_STYLE}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.2)"; }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    {YEARS.map((y) => <option key={y} value={y} style={{ background: "#0D0D1A" }}>Year {y}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── My posts ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={14} style={{ color: "#A78BFA" }} />
            <h2 className="text-sm font-semibold" style={{ color: "#A78BFA" }}>My Posts</h2>
            {posts.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                style={{ background: "rgba(124,58,237,0.2)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.3)" }}>
                {posts.length}
              </span>
            )}
          </div>

          {!postsLoaded ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl p-4 space-y-3 h-24"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(167,139,250,0.1)" }} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2">
              <span className="text-3xl">📭</span>
              <p className="font-semibold text-sm" style={{ color: "#F1F0FF" }}>You haven&apos;t posted yet</p>
              <p className="text-xs" style={{ color: "#6B7280" }}>Head to the feed and share something</p>
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((p) => <PostCard key={p.postId} post={p} />)}
            </div>
          )}
        </div>

        {/* ── Sign out ── */}
        <div className="pb-6">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
            style={{
              background: "rgba(239,68,68,0.08)",
              border:     "1px solid rgba(239,68,68,0.2)",
              color:      "#EF4444",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.14)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow  = "0 0 16px rgba(239,68,68,0.15)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow  = "none";
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
