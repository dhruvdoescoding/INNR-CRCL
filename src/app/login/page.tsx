"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Eye, EyeOff, AlertTriangle } from "lucide-react";
import FloatingOrbs from "@/components/FloatingOrbs";

const GLASS_CARD: React.CSSProperties = {
  background:     "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  border:         "1px solid rgba(167,139,250,0.15)",
  borderRadius:   "20px",
  boxShadow:      "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
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

const GLOW_BTN: React.CSSProperties = {
  width:        "100%",
  background:   "linear-gradient(135deg, #7C3AED, #6D28D9)",
  border:       "1px solid rgba(167,139,250,0.3)",
  boxShadow:    "0 0 20px rgba(124,58,237,0.4)",
  borderRadius: "9999px",
  padding:      "0.75rem",
  fontSize:     "0.875rem",
  fontWeight:   600,
  color:        "#F1F0FF",
  cursor:       "pointer",
  transition:   "box-shadow 0.2s ease, opacity 0.2s ease",
};

function focusOn(el: HTMLElement) {
  el.style.borderColor = "#7C3AED";
  el.style.boxShadow   = "0 0 0 3px rgba(124,58,237,0.2)";
}
function blurOn(el: HTMLElement) {
  el.style.borderColor = "rgba(167,139,250,0.2)";
  el.style.boxShadow   = "none";
}

export default function LoginPage() {
  const router = useRouter();
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/feed");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password" ||
          code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err instanceof Error ? err.message : "Sign in failed.");
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <FloatingOrbs />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="w-full max-w-md"
        style={GLASS_CARD}
      >
        <div className="p-8 space-y-6">
          {/* Brand */}
          <div className="text-center">
            <Link
              href="/"
              className="font-black tracking-widest"
              style={{
                fontSize:             "1.4rem",
                background:           "linear-gradient(135deg, #A78BFA, #7C3AED)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
              }}
            >
              INNR-CRCL
            </Link>
          </div>

          <div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "#F1F0FF" }}>
              Welcome back
            </h1>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Sign in to your CRCL
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <input
              id="login-email"
              type="email"
              required
              placeholder="you@college.ac.in"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              style={INPUT_STYLE}
              autoComplete="email"
              onFocus={(e) => focusOn(e.currentTarget)}
              onBlur={(e)  => blurOn(e.currentTarget)}
            />

            {/* Password with show/hide */}
            <div className="relative">
              <input
                id="login-password"
                type={showPass ? "text" : "password"}
                required
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                style={{ ...INPUT_STYLE, paddingRight: "3rem" }}
                autoComplete="current-password"
                onFocus={(e) => focusOn(e.currentTarget)}
                onBlur={(e)  => blurOn(e.currentTarget)}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: "#6B7280" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "#A78BFA")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.color = "#6B7280")
                }
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "#EF4444" }}>
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ ...GLOW_BTN, opacity: loading ? 0.6 : 1 }}
              onMouseEnter={(e) => {
                if (!loading)
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 0 35px rgba(124,58,237,0.6)";
              }}
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 20px rgba(124,58,237,0.4)")
              }
            >
              {loading ? "Signing in…" : "Sign In →"}
            </button>
          </form>

          <p className="text-center text-sm" style={{ color: "#6B7280" }}>
            New here?{" "}
            <Link
              href="/signup"
              className="font-semibold transition-colors"
              style={{ color: "#A78BFA" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = "#F1F0FF")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = "#A78BFA")
              }
            >
              Join your CRCL
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
