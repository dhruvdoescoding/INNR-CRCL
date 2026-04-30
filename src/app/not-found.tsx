"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}
    >
      {/* Floating glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-[120px] opacity-20"
          style={{ background: "#7C3AED" }} />
        <div className="absolute bottom-1/3 right-1/4 w-56 h-56 rounded-full blur-[100px] opacity-15"
          style={{ background: "#A78BFA" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        {/* Glyph */}
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
          style={{
            background: "rgba(124,58,237,0.12)",
            border:     "1px solid rgba(167,139,250,0.25)",
            boxShadow:  "0 0 40px rgba(124,58,237,0.2)",
          }}
        >
          🌀
        </div>

        {/* Error code */}
        <p
          className="font-black text-7xl tracking-tight"
          style={{
            background:          "linear-gradient(135deg, #A78BFA, #7C3AED)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </p>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold" style={{ color: "#F1F0FF" }}>
            Lost in the CRCL
          </h1>
          <p className="text-sm max-w-xs" style={{ color: "#6B7280" }}>
            This page drifted into the void. It might have never existed,
            or it got anonymously deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
              color:      "#F1F0FF",
              boxShadow:  "0 0 20px rgba(124,58,237,0.4)",
            }}
          >
            <Home size={15} /> Back to Home
          </Link>
          <Link
            href="/feed"
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border:     "1px solid rgba(167,139,250,0.25)",
              color:      "#A78BFA",
            }}
          >
            <ArrowLeft size={15} /> Go to Feed
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
