"use client";

import { motion } from "framer-motion";

export default function FloatingOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
      {/* Orb 1 — top-left violet */}
      <motion.div
        className="absolute rounded-full"
        style={{
          top:    "5rem",
          left:   "5rem",
          width:  "24rem",
          height: "24rem",
          background: "#7C3AED",
          filter: "blur(120px)",
          opacity: 0.2,
        }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Orb 2 — bottom-right accent */}
      <motion.div
        className="absolute rounded-full"
        style={{
          bottom: "5rem",
          right:  "5rem",
          width:  "20rem",
          height: "20rem",
          background: "#A78BFA",
          filter: "blur(120px)",
          opacity: 0.15,
        }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
}
