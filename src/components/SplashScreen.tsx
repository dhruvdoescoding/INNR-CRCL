"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

// Individual letter reveal for the tagline
function LetterReveal({ text, delay }: { text: string; delay: number }) {
  return (
    <>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: delay + i * 0.04,
            duration: 0.25,
            ease: "easeOut",
          }}
          style={{ display: char === " " ? "inline" : "inline-block" }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </>
  );
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  // Call onComplete after the full 4-second sequence
  useEffect(() => {
    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#0D0D1A" }}
      // Step 6: entire splash fades out at t≈3.2s, gone by t≈3.7s
      animate={{ opacity: [1, 1, 1, 0] }}
      transition={{
        times: [0, 0.75, 0.80, 1],
        duration: 4,
        ease: "easeInOut",
      }}
    >
      {/* ── Step 2: Primary violet circle — pulses & expands ── */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 220,
          height: 220,
          background:
            "radial-gradient(circle, #7C3AED 0%, #7C3AED33 70%, transparent 100%)",
          filter: "blur(2px)",
        }}
        animate={{
          scale:   [0.4, 1.1, 1.3,  0.02, 0.02],
          opacity: [0,   0.9, 0.85, 1,    0   ],
        }}
        transition={{
          times:    [0, 0.18, 0.35, 0.52, 0.6],
          duration: 2.4,
          ease:     "easeInOut",
        }}
      />

      {/* ── Step 3: Accent purple circle — offset, swirls ── */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 180,
          height: 180,
          background:
            "radial-gradient(circle, #A78BFA 0%, #A78BFA44 65%, transparent 100%)",
          filter: "blur(3px)",
        }}
        animate={{
          x:       [40,  -30,  20,  0,    0  ],
          y:       [-30,  30, -20,  0,    0  ],
          scale:   [0.3,  1.0, 1.1, 0.02, 0.02],
          opacity: [0,    0.8, 0.7, 1,    0   ],
          rotate:  [0,    45,  90,  180,  180 ],
        }}
        transition={{
          times:    [0, 0.20, 0.35, 0.52, 0.6],
          duration: 2.4,
          ease:     "easeInOut",
        }}
      />

      {/* ── Step 4: White flash at implosion point ── */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 60, height: 60, backgroundColor: "#ffffff" }}
        animate={{
          scale:   [0, 0, 2.5, 0  ],
          opacity: [0, 0, 0.9, 0  ],
        }}
        transition={{
          times:    [0, 0.48, 0.54, 0.65],
          duration: 2.4,
          ease:     "easeOut",
        }}
      />

      {/* ── Step 5: "INNR-CRCL" + tagline text reveal ── */}
      <motion.div
        className="absolute flex flex-col items-center gap-3 select-none"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.55, duration: 0.55, ease: "easeOut" }}
      >
        <h1
          className="text-5xl sm:text-6xl font-black tracking-widest text-white"
          style={{ letterSpacing: "0.15em" }}
        >
          INNR-CRCL
        </h1>

        {/* Letter-by-letter tagline reveal */}
        <p
          className="text-xs sm:text-sm font-semibold tracking-[0.35em] uppercase"
          style={{ color: "#A78BFA" }}
        >
          <LetterReveal text="STEP INTO YOUR CRCL" delay={2.1} />
        </p>
      </motion.div>
    </motion.div>
  );
}
