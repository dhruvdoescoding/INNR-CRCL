"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import SplashScreen from "@/components/SplashScreen";
import FloatingOrbs from "@/components/FloatingOrbs";

const features = [
  {
    icon: "🎭",
    title: "Anonymous First",
    desc: "Every conversation starts masked. No real names, no pressure.",
  },
  {
    icon: "✨",
    title: "Identity Reveal",
    desc: "Reveal yourself only by mutual consent — when you're both ready.",
  },
  {
    icon: "🎓",
    title: "Campus Only",
    desc: "Verified by your college email. Your circle, no outsiders.",
  },
];

// ── Shared style constants ───────────────────────────────────────────────────
const GLASS_CARD: React.CSSProperties = {
  background:     "rgba(255,255,255,0.04)",
  backdropFilter: "blur(20px)",
  border:         "1px solid rgba(167,139,250,0.15)",
  borderRadius:   "20px",
  boxShadow:      "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const GLOW_BTN: React.CSSProperties = {
  background:   "linear-gradient(135deg, #7C3AED, #6D28D9)",
  border:       "1px solid rgba(167,139,250,0.3)",
  boxShadow:    "0 0 20px rgba(124,58,237,0.4)",
  borderRadius: "9999px",
  padding:      "1rem 2.5rem",
  fontSize:     "1.05rem",
  fontWeight:   600,
  color:        "#F1F0FF",
  cursor:       "pointer",
  transition:   "box-shadow 0.2s ease, transform 0.15s ease",
};

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <>
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showSplash ? 0 : 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="min-h-screen flex flex-col relative"
      >
        <FloatingOrbs />

        {/* ── NAVBAR ── */}
        <nav
          className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-6 py-4"
          style={{
            ...GLASS_CARD,
            borderRadius: 0,
            borderTop:    "none",
            borderLeft:   "none",
            borderRight:  "none",
            borderBottom: "1px solid rgba(167,139,250,0.12)",
          }}
        >
          <span
            className="font-black tracking-widest"
            style={{
              fontSize:   "1.4rem",
              background: "linear-gradient(135deg, #A78BFA, #7C3AED)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            INNR-CRCL
          </span>
          <Link
            href="/signup"
            className="text-sm font-semibold transition-all duration-200"
            style={{
              ...GLOW_BTN,
              padding:   "0.5rem 1.25rem",
              fontSize:  "0.875rem",
              boxShadow: "0 0 16px rgba(124,58,237,0.35)",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 30px rgba(124,58,237,0.6)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.boxShadow =
                "0 0 16px rgba(124,58,237,0.35)")
            }
          >
            Join Your CRCL
          </Link>
        </nav>

        {/* ── HERO ── */}
        <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7, ease: "easeOut" }}
          >
            <h1
              className="font-black leading-tight"
              style={{ fontSize: "clamp(2.4rem, 6vw, 4rem)" }}
            >
              <span
                style={{
                  background:           "linear-gradient(135deg, #F1F0FF 30%, #A78BFA 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  display:              "block",
                }}
              >
                Your campus. Your circle.
              </span>
              <span
                style={{
                  background:           "linear-gradient(135deg, #A78BFA, #7C3AED)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  display:              "block",
                  marginTop:            "0.1em",
                }}
              >
                Anonymous, always.
              </span>
            </h1>

            <p
              className="mt-5 max-w-md mx-auto leading-relaxed"
              style={{ fontSize: "1.1rem", color: "#6B7280" }}
            >
              The only place where your campus lives anonymously.
              Find your people.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/signup"
                style={GLOW_BTN}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.boxShadow = "0 0 35px rgba(124,58,237,0.6)";
                  el.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.boxShadow = "0 0 20px rgba(124,58,237,0.4)";
                  el.style.transform = "translateY(0)";
                }}
              >
                Step Into Your CRCL →
              </Link>
              <a
                href="#features"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="text-sm font-semibold transition-all duration-200 cursor-pointer"
                style={{
                  background:   "transparent",
                  border:       "1px solid rgba(167,139,250,0.3)",
                  color:        "#A78BFA",
                  borderRadius: "9999px",
                  padding:      "0.95rem 2rem",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.background =
                    "rgba(167,139,250,0.1)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.background = "transparent")
                }
              >
                Learn more
              </a>
            </div>
          </motion.div>
        </section>

        {/* ── FEATURE CARDS ── */}
        <section id="features" className="px-6 pb-20 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                className="flex flex-col gap-3 p-8 transition-all duration-200"
                style={GLASS_CARD}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(167,139,250,0.35)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 8px 40px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.07)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor =
                    "rgba(167,139,250,0.15)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)";
                }}
              >
                <span className="text-3xl">{f.icon}</span>
                <h3 className="font-bold text-base" style={{ color: "#F1F0FF" }}>
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="pb-8 text-center text-sm" style={{ color: "#4B5563" }}>
          INNR-CRCL © 2026
        </footer>
      </motion.div>
    </>
  );
}
