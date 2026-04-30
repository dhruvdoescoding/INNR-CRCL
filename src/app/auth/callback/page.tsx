"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const email   = localStorage.getItem("innrcrcl_signup_email");
      const password = localStorage.getItem("innrcrcl_signup_password");
      const profileRaw = localStorage.getItem("innrcrcl_signup_profile");
      const profile    = profileRaw ? JSON.parse(profileRaw) : {};

      let uid: string | null = null;

      // ── Primary: magic link flow ─────────────────────────────────────────
      if (isSignInWithEmailLink(auth, window.location.href)) {
        if (!email) {
          setError("Could not find your email. Please sign up again.");
          return;
        }
        try {
          const result = await signInWithEmailLink(auth, email, window.location.href);
          uid = result.user.uid;
        } catch (magicErr: unknown) {
          console.warn("[callback] magic link failed, trying password fallback:", magicErr);
          // Fall through to password fallback below
        }
      }

      // ── Fallback: email/password ─────────────────────────────────────────
      if (!uid && email && password) {
        try {
          const result = await signInWithEmailAndPassword(auth, email, password);
          uid = result.user.uid;
        } catch (pwErr: unknown) {
          const msg = pwErr instanceof Error ? pwErr.message : "Authentication failed.";
          setError(msg);
          return;
        }
      }

      if (!uid) {
        setError("Invalid or expired sign-in link. Please sign up again.");
        return;
      }

      // ── Create Firestore user doc ─────────────────────────────────────────
      try {
        const res = await fetch("/api/auth/complete-signup", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            uid,
            email,
            realName:    profile.realName    ?? "",
            department:  profile.department  ?? "",
            year:        profile.year        ?? 1,
            collegeName: profile.collegeName ?? "",
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Signup failed.");
        }

        // Clean up localStorage
        localStorage.removeItem("innrcrcl_signup_email");
        localStorage.removeItem("innrcrcl_signup_password");
        localStorage.removeItem("innrcrcl_signup_profile");

        router.push("/feed");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Profile creation failed.");
      }
    }

    handleCallback();
  }, [router]);

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}
      >
        <div
          className="w-full max-w-sm rounded-[20px] p-8 text-center space-y-4"
          style={{
            background:     "rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
            border:         "1px solid rgba(167,139,250,0.15)",
            boxShadow:      "0 8px 32px rgba(0,0,0,0.3)",
          }}
        >
          <p className="text-2xl">⚠️</p>
          <h1 className="text-lg font-bold" style={{ color: "#F1F0FF" }}>
            Something went wrong
          </h1>
          <p className="text-sm" style={{ color: "#6B7280" }}>{error}</p>
          <div className="flex flex-col gap-2 pt-2">
            <a
              href="/signup"
              className="w-full py-2.5 rounded-full text-sm font-semibold text-center"
              style={{
                background: "linear-gradient(135deg, #7C3AED, #6D28D9)",
                color:      "#F1F0FF",
              }}
            >
              Sign up again
            </a>
            <a
              href="/login"
              className="text-sm text-center"
              style={{ color: "#A78BFA" }}
            >
              Or sign in with password
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ background: "radial-gradient(ellipse at top, #1a0533 0%, #0D0D1A 60%)" }}
    >
      <div
        className="w-12 h-12 rounded-full border-[3px] animate-spin"
        style={{
          borderColor:    "rgba(124,58,237,0.2)",
          borderTopColor: "#7C3AED",
        }}
      />
      <p className="text-sm tracking-widest uppercase" style={{ color: "#6B7280" }}>
        Signing you in…
      </p>
    </div>
  );
}
