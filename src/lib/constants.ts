// ─────────────────────────────────────────────────────────────────────────────
// src/lib/constants.ts — App-wide constants for INNR-CRCL
// ─────────────────────────────────────────────────────────────────────────────

// ─── Crisis keyword detection (client-side string match — no API call) ────────
// Used in /chat/[id] message input onChange handler to show CrisisBanner.
// Privacy: these words are NEVER logged, flagged, or sent to any server.
export const CRISIS_KEYWORDS: string[] = [
  "suicide",
  "suicidal",
  "end my life",
  "kill myself",
  "dont want to live",
  "no point",
  "end it all",
  "hopeless",
  "want to die",
];

// ─── Content length limits (must match Firestore Security Rules) ──────────────
export const MAX_POST_LENGTH = 500;       // characters — posts/{postId}.content
export const MAX_COMMENT_LENGTH = 280;    // characters — posts/{postId}/comments/{id}.content
export const MAX_MESSAGE_LENGTH = 1000;   // characters — chats/{chatId}/messages/{id}.content

// ─── Alias regeneration ───────────────────────────────────────────────────────
// Users may regenerate their alias once per ALIAS_REGEN_DAYS days.
// Enforced via the aliasLastChanged Firestore timestamp field.
export const ALIAS_REGEN_DAYS = 7;

// ─── Chat matching ────────────────────────────────────────────────────────────
// How often (ms) the client polls /api/chat/find-or-create while waiting.
export const CHAT_MATCH_POLL_INTERVAL = 3000; // 3 seconds

// ─── Identity Reveal ──────────────────────────────────────────────────────────
// Minutes after a reveal request before it auto-expires (if partner doesn't respond).
export const REVEAL_TIMEOUT_MINUTES = 5;
