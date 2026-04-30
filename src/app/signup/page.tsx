"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sendSignInLinkToEmail, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Lock, Mail, AlertTriangle, Eye, EyeOff } from "lucide-react";
import FloatingOrbs from "@/components/FloatingOrbs";

const ADJECTIVES = ["Crimson","Silver","Turbo","Neon","Violet","Azure","Galactic","Solar","Golden","Cosmic"];
const NOUNS      = ["Nova","Moon","Comet","Blast","Pulse","Drift","Wave","Echo","Storm","Spark"];

function previewAlias() {
  const adj  = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num  = String(Math.floor(Math.random() * 90) + 10);
  return `${adj}${noun}${num}`;
}

const slideIn  = { initial: { x: 60, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -60, opacity: 0 } };
const DURATION = { duration: 0.3, ease: "easeInOut" as const };

// ── Shared styles ─────────────────────────────────────────────────────────────
const GLASS_CARD: React.CSSProperties = {
  background:     "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  border:         "1px solid rgba(167,139,250,0.15)",
  borderRadius:   "20px",
  boxShadow:      "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const INPUT_STYLE: React.CSSProperties = {
  width:         "100%",
  background:    "rgba(255,255,255,0.05)",
  border:        "1px solid rgba(167,139,250,0.2)",
  borderRadius:  "12px",
  color:         "#F1F0FF",
  padding:       "0.75rem 1rem",
  fontSize:      "0.875rem",
  outline:       "none",
  transition:    "border-color 0.2s ease, box-shadow 0.2s ease",
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

const GHOST_BTN: React.CSSProperties = {
  background:   "transparent",
  border:       "none",
  color:        "rgba(255,255,255,0.3)",
  fontSize:     "0.75rem",
  cursor:       "pointer",
  padding:      "0.25rem",
  transition:   "color 0.15s ease",
};

function InputField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={INPUT_STYLE}
      placeholder={props.placeholder}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#7C3AED";
        e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(124,58,237,0.2)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)";
        e.currentTarget.style.boxShadow   = "none";
      }}
    />
  );
}

function SelectField(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{ ...INPUT_STYLE, cursor: "pointer" }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "#7C3AED";
        e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(124,58,237,0.2)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(167,139,250,0.2)";
        e.currentTarget.style.boxShadow   = "none";
      }}
    />
  );
}

export default function SignupPage() {
  const [step, setStep]               = useState<1 | 2 | 3>(1);
  const [email, setEmail]             = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [realName, setRealName]       = useState("");
  const [department, setDepartment]   = useState("CSE");
  const [year, setYear]               = useState("1");
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [showPass, setShowPass]       = useState(false);
  const [error, setError]             = useState("");
  const [loading, setLoading]         = useState(false);

  const alias = useMemo(() => previewAlias(), []);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/verify-domain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!data.allowed) {
        setError("Only college emails allowed. Try your .ac.in or .edu address.");
      } else {
        setCollegeName(data.collegeName ?? ""); setStep(2);
      }
    } catch { setError("Something went wrong. Please try again."); }
    finally  { setLoading(false); }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    if (password !== confirmPw) {
      setError("Passwords don't match."); setLoading(false); return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters."); setLoading(false); return;
    }
    try {
      // 1. Create email/password account as fallback auth method
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (createErr: unknown) {
        const code = (createErr as { code?: string }).code ?? "";
        // Ignore "already exists" — user may be re-signing up
        if (code !== "auth/email-already-in-use") throw createErr;
      }

      // 2. Send magic link (primary flow)
      const actionCodeSettings = {
        url: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      // 3. Persist for callback page
      localStorage.setItem("innrcrcl_signup_email", email);
      localStorage.setItem("innrcrcl_signup_password", password);
      localStorage.setItem("innrcrcl_signup_profile", JSON.stringify({
        realName, department, year: Number(year), collegeName,
      }));
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send magic link.");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <FloatingOrbs />

      <div className="w-full max-w-md" style={GLASS_CARD}>
        <div className="p-8">
          {/* Brand */}
          <div className="text-center mb-8">
            <span
              className="font-black tracking-widest"
              style={{
                fontSize:             "1.4rem",
                background:           "linear-gradient(135deg, #A78BFA, #7C3AED)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
              }}
            >
              INNR-CRCL
            </span>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <motion.div
                key={s}
                className="rounded-full"
                animate={{
                  width:           s === step ? "2rem" : "0.5rem",
                  backgroundColor: s <= step  ? "#7C3AED" : "rgba(255,255,255,0.1)",
                  boxShadow:       s === step  ? "0 0 8px rgba(124,58,237,0.6)" : "none",
                }}
                style={{ height: "0.375rem" }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* ── STEP 1 ── */}
            {step === 1 && (
              <motion.div key="step1" {...slideIn} transition={DURATION} className="space-y-5">
                <div>
                  <h1 className="text-xl font-bold mb-1" style={{ color: "#F1F0FF" }}>
                    Enter your college email
                  </h1>
                  <p className="text-sm" style={{ color: "#6B7280" }}>
                    Only institutional emails allowed
                  </p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <InputField
                    id="email" type="email" required
                    placeholder="you@college.ac.in"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    autoComplete="email"
                  />

                  {error && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "#EF4444" }}>
                      <AlertTriangle size={14} /> {error}
                    </div>
                  )}

                  <button
                    type="submit" disabled={loading}
                    style={{ ...GLOW_BTN, opacity: loading ? 0.6 : 1 }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 0 35px rgba(124,58,237,0.6)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 0 20px rgba(124,58,237,0.4)")
                    }
                  >
                    {loading ? "Checking…" : "Continue →"}
                  </button>

                  <p className="text-center text-xs" style={{ color: "#6B7280" }}>
                    Already have an account?{" "}
                    <a href="/login" style={{ color: "#A78BFA", fontWeight: 600 }}>Sign in instead</a>
                  </p>
                </form>
              </motion.div>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <motion.div key="step2" {...slideIn} transition={DURATION} className="space-y-5">
                <div>
                  <h1 className="text-xl font-bold mb-1" style={{ color: "#F1F0FF" }}>
                    Set up your profile
                  </h1>
                  <p className="text-sm" style={{ color: "#6B7280" }}>
                    Tell us a bit about yourself
                  </p>
                </div>

                {/* Alias pill */}
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{
                      background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(167,139,250,0.1))",
                      border:     "1px solid rgba(167,139,250,0.3)",
                    }}
                  >
                    <Lock size={14} style={{ color: "#A78BFA" }} />
                    <span className="text-sm font-semibold" style={{ color: "#A78BFA" }}>
                      {alias}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    Your anonymous identity on INNR-CRCL
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <InputField
                    id="realName" type="text" required
                    placeholder="Full name"
                    value={realName}
                    onChange={(e) => setRealName(e.target.value)}
                  />
                  <SelectField id="department" value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MBA">MBA</option>
                    <option value="Other">Other</option>
                  </SelectField>
                  <SelectField id="year" value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </SelectField>

                  {/* Password fields */}
                  <div className="relative">
                    <InputField
                      id="password" type={showPass ? "text" : "password"} required
                      placeholder="Choose a password (min 6 chars)"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(""); }}
                      autoComplete="new-password"
                      style={{ ...INPUT_STYLE, paddingRight: "3rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "#6B7280" }}
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <InputField
                    id="confirmPassword" type="password" required
                    placeholder="Confirm password"
                    value={confirmPw}
                    onChange={(e) => { setConfirmPw(e.target.value); setError(""); }}
                    autoComplete="new-password"
                  />

                  {error && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: "#EF4444" }}>
                      <AlertTriangle size={14} /> {error}
                    </div>
                  )}

                  <button
                    type="submit" disabled={loading}
                    style={{ ...GLOW_BTN, opacity: loading ? 0.6 : 1 }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 0 35px rgba(124,58,237,0.6)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "0 0 20px rgba(124,58,237,0.4)")
                    }
                  >
                    {loading ? "Sending…" : "Send Magic Link ✨"}
                  </button>

                  <button
                    type="button"
                    style={GHOST_BTN}
                    onClick={() => { setStep(1); setError(""); }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)")
                    }
                    className="w-full text-center"
                  >
                    ← Back
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <motion.div
                key="step3" {...slideIn} transition={DURATION}
                className="flex flex-col items-center text-center gap-4"
              >
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(167,139,250,0.1))",
                    border:     "1px solid rgba(167,139,250,0.3)",
                    boxShadow:  "0 0 24px rgba(124,58,237,0.3)",
                  }}
                >
                  <Mail size={36} style={{ color: "#A78BFA" }} />
                </div>

                <h1 className="text-xl font-bold" style={{ color: "#F1F0FF" }}>
                  Check your inbox
                </h1>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                  We sent a magic link to{" "}
                  <span className="font-medium" style={{ color: "#A78BFA" }}>{email}</span>.
                  <br />
                  Click it to complete signup.
                </p>
                <p className="text-xs" style={{ color: "#4B5563" }}>
                  Check your spam folder if you don&apos;t see it within 1 minute.
                </p>
                <button
                  type="button"
                  style={GHOST_BTN}
                  onClick={() => { setStep(1); setError(""); }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.3)")
                  }
                  className="mt-2"
                >
                  Wrong email? Go back
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
