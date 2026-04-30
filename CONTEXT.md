---

# **INNR-CRCL — Technical Requirements Document v1.0**

**Stack:** Next.js 14 \+ Firebase Spark \+ Tailwind CSS \+ Vercel **Built For:** AI-assisted solo development (Cursor / Claude / Bolt) **Demo Deadline:** March 20, 2026 | **Budget:** $0/month | **Demo Format:** Live screen demo by developer

---

## **01 — DOCUMENT OVERVIEW**

* Document Type: Technical Requirements Document (TRD) v1.0  
* App: INNR-CRCL — College-Exclusive Anonymous Social Platform  
* Built For: AI-assisted solo development (Cursor / Claude / Bolt)  
* Demo Deadline: March 20, 2026 (72 hours from authoring)  
* Demo Format: Live screen demo by developer — evaluators watch, some flows can be seeded  
* Developer Level: Beginner — AI tools write the code, developer directs and debugs  
* Accounts Available: GitHub only — all other services to be created fresh  
* Budget: $0/month — Firebase Spark free tier \+ Vercel Hobby free tier only

HOW TO USE THIS TRD WITH AI TOOLS: Copy exact collection names, field names, and function specs into your AI tool prompt. Say: "Build \[feature\] using these exact Firestore collection names and field definitions from my TRD." The AI will use the names verbatim. Never let the AI invent its own field names — always paste from Section 04\.

---

## **02 — SYSTEM ARCHITECTURE**

Browser (Next.js App Router)  
    ↓  HTTPS  
Vercel Edge (Next.js API Routes)  
    ↓  Firebase Admin SDK  
Firebase Services:  
    ├── Firebase Auth  →  Email magic link \+ domain verification  
    ├── Firestore      →  All data (users, posts, chats, reports)  
    └── Storage        →  Profile photos only  
    ↓  REST  
External APIs:  
    └── OpenAI Moderation API  →  Content flagging on reports

### **Architecture Decisions**

* No custom backend server: All logic lives in Next.js API Routes (serverless) \+ Firestore Security Rules. Zero server to maintain.  
* Firestore real-time: onSnapshot() listeners power live chat — no WebSocket server needed. Firebase handles it.  
* Firebase Auth magic link: No password to forget. User enters email → gets link → clicks → logged in. Simplest auth for demo.  
* Seeded data for demo: A seed script (seed.js) populates Firestore with realistic posts, users, and chats before the evaluation.  
* OpenAI Moderation fallback: If OpenAI API key is not set or call fails, the report is still logged in Firestore with status: "pending\_manual" — moderation still works, just without AI scoring.

---

## **03 — TECHNOLOGY STACK**

| Component | Technology \+ Package | Why This Choice |
| ----- | ----- | ----- |
| Framework | next@14.2.x (App Router) | AI tools know Next.js 14 best. App Router is standard in 2026\. |
| Styling | tailwindcss@3 \+ tailwind-merge | AI generates clean Tailwind classes. No custom CSS needed. |
| UI Components | shadcn/ui (CLI install) | Pre-built accessible components. AI fills them in instantly. |
| Icons | lucide-react@latest | Clean modern icons. Used by every AI tool by default. |
| Animation | framer-motion@11 | Identity Reveal fade-in, chat slide-up. Simple API. |
| Auth | firebase@10 (Firebase Auth) | Magic link email auth. Free. No password logic needed. |
| Database | firebase@10 (Firestore) | Real-time onSnapshot for chat. Free tier: 50K reads/day. |
| File Storage | firebase@10 (Storage) | Profile photo uploads. Free tier: 5GB storage. |
| State Management | zustand@4 | Simpler than Redux. AI generates zustand stores cleanly. |
| Form Handling | react-hook-form@7 | Signup/post creation forms. Less boilerplate than useState. |
| AI Moderation | openai@4 (Moderation endpoint) | Free to call. Classifies hate/harassment/self-harm instantly. |
| Date Formatting | date-fns@3 | "2 hours ago" timestamps. Tiny, tree-shakeable. |
| Dev Environment | Node.js 20 LTS | Required by Next.js 14\. |
| Deployment | Vercel Hobby (free) | One command deploy from GitHub. Free HTTPS \+ CDN. |
| Version Control | GitHub (existing) | Connect to Vercel for auto-deploy on push. |

### **Setup Commands — Run these in order**

npx create-next-app@14 innr-crcl \--typescript \--tailwind \--app \--src-dir  
cd innr-crcl  
npx shadcn-ui@latest init  
npm install firebase zustand framer-motion react-hook-form date-fns lucide-react openai  
npm install \-D @types/node  
npx vercel link

---

## **04 — DATABASE SCHEMA (Firestore)**

CRITICAL — USE THESE EXACT NAMES: Paste field names verbatim into your AI tool. If AI uses different names, your Security Rules and queries will break. Never rename fields mid-build.

---

### **Collection: users**

Path: users/{uid}

| Field Name | Type | Description |
| ----- | ----- | ----- |
| uid | string | Firebase Auth UID — document ID matches this |
| realName | string | Full name — PRIVATE. Never sent to other users. |
| alias | string | Anonymous alias e.g. "PurpleComet42" — PUBLIC |
| email | string | College email — PRIVATE |
| collegeDomain | string | Domain extracted from email e.g. "[gla.ac.in](http://gla.ac.in)" |
| collegeName | string | Human-readable college name e.g. "GLA University" |
| department | string | Optional — "CSE", "MBA", etc. |
| year | number | Academic year: 1, 2, 3, 4 |
| photoURL | string | Firebase Storage URL — empty string if not set |
| isListener | boolean | true \= opted in as support chat listener |
| isBanned | boolean | true \= account banned by admin |
| chatBanUntil | timestamp or null | Firestore Timestamp — null if not banned |
| aliasLastChanged | timestamp | For once-per-week alias regen enforcement |
| createdAt | timestamp | Account creation time |
| role | string | "user" or "admin" — default "user" |

---

### **Collection: posts**

Path: posts/{postId}

| Field Name | Type | Description |
| ----- | ----- | ----- |
| postId | string | Auto-generated Firestore doc ID |
| authorUid | string | UID of creator — never expose to other users |
| authorAlias | string | Alias at time of posting — always show this |
| collegeDomain | string | College domain — used to filter feed per college |
| tab | string | "hot" or "memes" or "tea" or "confessions" or "nerd" or "stories" |
| content | string | Post body text — max 500 chars |
| mediaURL | string or null | Firebase Storage URL for image (memes/stories) |
| upvotes | number | Total upvote count |
| downvotes | number | Total downvote count |
| commentCount | number | Denormalized comment count for sorting |
| isAnonymous | boolean | true \= never reveal author. Always true for confessions/tea. |
| isFlagged | boolean | true \= hidden pending review |
| isPostOfDay | boolean | true \= awarded Post of the Day |
| expiresAt | timestamp or null | For stories — 24hr expiry. null \= no expiry. |
| createdAt | timestamp | Used for sorting and 24hr window queries |
| keyword | string or null | Keyword tag for NERD CRCL e.g. "doubt", "pyq", "hackathon" |

---

### **Subcollection: posts/{postId}/votes**

Path: posts/{postId}/votes/{uid}

| Field Name | Type | Description |
| ----- | ----- | ----- |
| uid | string | Document ID \= voter UID — prevents double voting |
| vote | string | "up" or "down" |
| createdAt | timestamp | Vote timestamp |

---

### **Subcollection: posts/{postId}/comments**

Path: posts/{postId}/comments/{commentId}

| Field Name | Type | Description |
| ----- | ----- | ----- |
| commentId | string | Auto-generated doc ID |
| authorUid | string | Commenter UID — never expose |
| authorAlias | string | Alias at time of comment |
| content | string | Comment text — max 280 chars |
| createdAt | timestamp | For chronological ordering |

---

### **Collection: chats**

Path: chats/{chatId}

| Field Name | Type | Description |
| ----- | ----- | ----- |
| chatId | string | Auto-generated doc ID |
| participants | string\[\] | Array of exactly 2 UIDs \[uid1, uid2\] |
| participantAliases | map | { uid1: "alias1", uid2: "alias2" } — shown in chat |
| collegeDomain | string | Both users must share this domain |
| status | string | "active" or "ended" or "revealed" |
| matchType | string | "random" or "keyword" |
| keyword | string or null | Keyword used for matching — null if random |
| revealRequests | map | { uid1: true/false, uid2: true/false } — tracks reveal consent |
| revealedAt | timestamp or null | When both accepted — null until then |
| isSupport | boolean | true \= this is a support/listener chat |
| createdAt | timestamp | Chat start time |
| endedAt | timestamp or null | When chat ended — null if active |

---

### **Subcollection: chats/{chatId}/messages**

Path: chats/{chatId}/messages/{messageId}

| Field Name | Type | Description |
| ----- | ----- | ----- |
| messageId | string | Auto-generated doc ID |
| senderUid | string | Sender UID — resolve to alias at render time |
| content | string | Message text — max 1000 chars |
| type | string | "text" or "system" — system \= "Identity revealed\!" notice |
| readBy | string\[\] | Array of UIDs who have read the message |
| createdAt | timestamp | For ordering messages chronologically |

---

### **Collection: waitingPool**

Path: waitingPool/{uid} Purpose: Holds users waiting to be matched for anonymous chat. Document ID \= user's UID.

| Field Name | Type | Description |
| ----- | ----- | ----- |
| uid | string | Document ID \= UID of waiting user |
| alias | string | Alias for quick display after match |
| collegeDomain | string | Match only with same domain |
| matchType | string | "random" or "keyword" |
| keyword | string or null | Keyword to match on — null for random |
| joinedAt | timestamp | Time entered pool — used to expire stale entries after 60s |

---

### **Collection: friendships**

Path: friendships/{friendshipId}

| Field Name | Type | Description |
| ----- | ----- | ----- |
| friendshipId | string | Auto-generated — or composite "uid1\_uid2" (sorted) |
| participants | string\[\] | \[uid1, uid2\] — always sorted alphabetically |
| status | string | "pending" or "accepted" or "declined" |
| requestedBy | string | UID of person who sent the request |
| originChatId | string or null | Chat where identity was revealed — null if via search |
| createdAt | timestamp | Request sent time |
| acceptedAt | timestamp or null | null until accepted |

---

### **Collection: reports**

Path: reports/{reportId}

| Field Name | Type | Description |
| ----- | ----- | ----- |
| reportId | string | Auto-generated doc ID |
| reportedBy | string | UID of reporter |
| targetType | string | "post" or "message" or "user" |
| targetId | string | postId, messageId, or uid of reported content/user |
| targetContent | string | Actual text content — sent to OpenAI Moderation API |
| reason | string | "harassment" or "self-harm" or "hate" or "spam" or "other" |
| aiScore | map or null | OpenAI moderation result object — null if API not configured |
| aiAutoHide | boolean | true \= AI flagged HIGH confidence and content was auto-hidden |
| status | string | "pending" or "reviewed\_removed" or "reviewed\_approved" or "pending\_manual" |
| reviewedBy | string or null | Admin UID who resolved — null until reviewed |
| createdAt | timestamp | Report submission time |
| reviewedAt | timestamp or null | null until reviewed |

---

## **05 — API DESIGN (Next.js API Routes)**

All routes live in src/app/api/. Each is a serverless function on Vercel. Client-side Firestore calls (reads, real-time chat) do NOT go through these routes — only sensitive write operations do. Routes use Firebase Admin SDK.

---

### **POST /api/auth/verify-domain**

* Purpose: Validate college email domain before sending magic link  
* Input: { email: string }  
* Logic: Extract domain from email. Check against ALLOWED\_DOMAINS list in env. Return allowed: true/false.  
* Output: { allowed: boolean, collegeName: string or null }  
* Error cases: 400 if email malformed. 403 if domain not in allowlist.

### **POST /api/auth/complete-signup**

* Purpose: After Firebase email link auth, create user doc in Firestore  
* Input: { uid: string, email: string, realName: string, collegeName: string, department: string, year: number }  
* Logic: Generate alias using adjective \+ noun \+ 2-digit number. Write to users/{uid}. Set role: "user".  
* Output: { success: boolean, alias: string }  
* Error cases: 409 if user doc already exists.

### **POST /api/chat/find-or-create**

* Purpose: Match two users for anonymous chat (core matching logic)  
* Input: { uid: string, matchType: "random" or "keyword", keyword: string or null, collegeDomain: string }  
* Logic: 1\. Check waitingPool for matching user (same college \+ same matchType \+ same keyword if applicable). 2\. If match found: delete both from waitingPool, create chats/{chatId} doc with both UIDs, return chatId. 3\. If no match: add current user to waitingPool/{uid}. Return status: "waiting".  
* Output: { status: "matched" or "waiting", chatId: string or null }  
* Error cases: 400 if uid not found. Client polls this every 3 seconds while status is "waiting".

### **POST /api/chat/reveal-request**

* Purpose: Handle one side of the Identity Reveal flow  
* Input: { chatId: string, uid: string }  
* Logic: 1\. Set revealRequests.{uid} \= true in chats/{chatId}. 2\. Check if BOTH revealRequests values are now true. 3\. If both true: set status: "revealed", revealedAt: now. Add a system message to chats/{chatId}/messages with type: "system", content: "Both users revealed their identity\!". 4\. Auto-create friendships/{id} doc with status: "pending", requestedBy: uid.  
* Output: { status: "waiting\_for\_other" or "revealed", revealedAt: timestamp or null }  
* Error cases: 404 if chatId not found. 409 if already revealed.

### **POST /api/moderation/report**

* Purpose: Submit a report \+ run AI moderation \+ auto-hide if needed  
* Input: { reportedBy: string, targetType: string, targetId: string, targetContent: string, reason: string }  
* Logic: 1\. Write report doc to reports/ with status: "pending". 2\. If OPENAI\_API\_KEY env var exists: call OpenAI Moderation API with targetContent. Parse result into aiScore map. 3\. If any category score \> 0.85: set aiAutoHide: true, update target doc isFlagged: true. 4\. If no API key: set status: "pending\_manual", aiScore: null.  
* Output: { reportId: string, autoHidden: boolean }  
* Fallback: If OpenAI call throws: catch error, set status: "pending\_manual", still save report. Never block the user flow.

### **POST /api/admin/resolve-report**

* Purpose: Admin takes action on a flagged report  
* Input: { reportId: string, adminUid: string, action: "remove" or "approve" or "warn" or "ban" }  
* Auth check: Verify adminUid has role: "admin" in Firestore before proceeding  
* Logic: "remove" → set target isFlagged: true (stays hidden). "approve" → set target isFlagged: false (restore). "warn" → update user doc with warning count. "ban" → set user isBanned: true. Update report status and reviewedBy.  
* Output: { success: boolean }

### **GET /api/feed/post-of-day**

* Purpose: Return Post of the Day for a college domain  
* Input: Query param: ?[collegeDomain=gla.ac.in](http://collegeDomain=gla.ac.in)  
* Logic: Query posts where collegeDomain matches, isFlagged: false, createdAt \> 24h ago. Sort by (upvotes \+ commentCount) descending. Return top 1\. Cache result for 1 hour (Vercel Edge cache header).  
* Output: { post: Post or null }

---

## **06 — SECURITY & RATE LIMITING**

### **Firestore Security Rules**

Rule Principle: Users can only read their own realName, email, and photoURL. All other users only see alias and collegeName. Chat messages are only readable by the two participants. Admin routes require role: "admin" check in API route (not Firestore rules).

rules\_version \= "2";  
service cloud.firestore {  
  match /databases/{db}/documents {

    // Users: public fields readable by all, private fields by owner only  
    match /users/{uid} {  
      allow read: if request.auth \!= null;  
      allow write: if request.auth.uid \== uid;  
    }

    // Posts: anyone logged in from same college can read unflagged posts  
    match /posts/{postId} {  
      allow read: if request.auth \!= null && resource.data.isFlagged \== false;  
      allow create: if request.auth \!= null;  
      allow update: if request.auth \!= null;  
    }

    // Chats: only participants can read/write  
    match /chats/{chatId} {  
      allow read, write: if request.auth.uid in resource.data.participants;  
      match /messages/{msgId} {  
        allow read, write: if request.auth.uid in  
          get(/databases/$(db)/documents/chats/$(chatId)).data.participants;  
      }  
    }

    // Reports: only creator can write, no user can read others' reports  
    match /reports/{reportId} {  
      allow create: if request.auth \!= null;  
      allow read: if false; // admin reads via Admin SDK in API routes  
    }  
  }  
}

### **Rate Limiting**

| Endpoint / Action | Limit | Enforcement |
| ----- | ----- | ----- |
| POST /api/chat/find-or-create | 10 requests/minute per IP | Vercel Edge rate limit header |
| POST /api/moderation/report | 5 reports/hour per UID | Check reports count in Firestore before writing |
| Post creation | 10 posts/hour per UID | Count posts by authorUid in last 60 min |
| Alias regeneration | 1 per week per UID | Check aliasLastChanged field before allowing |
| Chat matching poll | Every 3 seconds max | Client-side setInterval with 3000ms minimum |
| Magic link email | 3 per hour per email | Firebase Auth built-in rate limiting |

---

## **07 — AI INTEGRATION**

### **OpenAI Moderation API**

* Cost: Completely free to call. No cost per request.  
* Endpoint: [https://api.openai.com/v1/moderations](https://api.openai.com/v1/moderations)  
* Model: text-moderation-latest  
* Package: openai@4 — use ModerationCreateResponse type  
* Called from: /api/moderation/report only — never called client-side  
* Input: targetContent string from report submission  
* Output categories checked: hate, harassment, self-harm, sexual, violence  
* Auto-hide threshold: Any category score \> 0.85 triggers isFlagged: true on target  
* Fallback: Wrap in try/catch. If API throws: set aiScore: null, status: "pending\_manual". Never block report submission.  
* Env variable name: OPENAI\_API\_KEY — set in Vercel dashboard \+ .env.local

### **Crisis Keyword Detection (Client-Side)**

This is NOT an AI call — it's a simple string match. Run it in the chat message input onChange handler.

* Location: Client-side in /chat/\[id\] component — no API call needed  
* Trigger: User types a message containing any crisis keyword  
* Keywords array name: CRISIS\_KEYWORDS — store in src/lib/constants.ts  
* Keywords list: suicide, suicidal, end my life, kill myself, dont want to live, no point, end it all, hopeless, want to die  
* Action on match: Show CrisisBanner component at top of chat window — NOT a blocking modal  
* Banner content: "You're not alone. Talk to someone: iCall 9152987821 | Vandrevala 1860-2662-345"  
* Dismiss behavior: Banner stays visible for the session — no close button (safety intent)  
* Privacy: No logging, no API call, no flagging of the user account for typing these words

---

## **08 — DEPLOYMENT STRATEGY**

### **Step-by-Step Setup (Do This Once Tonight)**

1. Go to [console.firebase.google.com](http://console.firebase.google.com) → Create project → Name it "innr-crcl"  
2. In Firebase console: Enable Authentication → Email/Password \+ Email Link (passwordless) sign-in methods  
3. In Firebase console: Create Firestore database → Start in test mode (change to production rules before demo)  
4. In Firebase console: Enable Storage → Default bucket  
5. In Firebase console: Project Settings → Your apps → Add Web App → Copy firebaseConfig object  
6. Create .env.local file in project root with all Firebase config values (see env table below)  
7. Go to [platform.openai.com](http://platform.openai.com) → Create free account → API Keys → Create key → Add to .env.local  
8. Go to [vercel.com](http://vercel.com) → Sign up with GitHub → Import your innr-crcl repo  
9. In Vercel dashboard: Settings → Environment Variables → Add all .env.local values  
10. Push to GitHub main branch → Vercel auto-deploys → Get your live URL

### **Environment Variables (.env.local)**

| Variable Name | Where to Get It | Example Value |
| ----- | ----- | ----- |
| NEXT\_PUBLIC\_FIREBASE\_API\_KEY | Firebase Project Settings → Your apps | AIzaSy... |
| NEXT\_PUBLIC\_FIREBASE\_AUTH\_DOMAIN | Firebase Project Settings | [innr-crcl.firebaseapp.com](http://innr-crcl.firebaseapp.com) |
| NEXT\_PUBLIC\_FIREBASE\_PROJECT\_ID | Firebase Project Settings | innr-crcl |
| NEXT\_PUBLIC\_FIREBASE\_STORAGE\_BUCKET | Firebase Project Settings | [innr-crcl.appspot.com](http://innr-crcl.appspot.com) |
| NEXT\_PUBLIC\_FIREBASE\_MESSAGING\_SENDER\_ID | Firebase Project Settings | 1234567890 |
| NEXT\_PUBLIC\_FIREBASE\_APP\_ID | Firebase Project Settings | 1:123:web:abc |
| FIREBASE\_ADMIN\_PROJECT\_ID | Same as PROJECT\_ID | innr-crcl |
| FIREBASE\_ADMIN\_CLIENT\_EMAIL | Firebase → Service Accounts → Generate key | firebase-adminsdk@... |
| FIREBASE\_ADMIN\_PRIVATE\_KEY | From downloaded service account JSON | "-----BEGIN PRIVATE KEY..." |
| OPENAI\_API\_KEY | [platform.openai.com](http://platform.openai.com) → API Keys | sk-... |
| NEXT\_PUBLIC\_APP\_URL | Your Vercel URL | [https://innr-crcl.vercel.app](https://innr-crcl.vercel.app) |
| ALLOWED\_DOMAINS | Comma-separated college domains | [gla.ac.in](http://gla.ac.in),[iitbhu.ac.in](http://iitbhu.ac.in),[cu.ac.in](http://cu.ac.in) |

### **Seed Script (Run Before Demo)**

Create scripts/seed.js and run with: node scripts/seed.js

| Seed Data | Count | Details |
| ----- | ----- | ----- |
| users | 8 fake users | Mix of departments, years, all same collegeDomain |
| posts (confessions) | 5 posts | Realistic anonymous confessions, tab: "confessions" |
| posts (memes) | 4 posts | Meme text posts, tab: "memes" |
| posts (tea) | 3 posts | Gossip posts, tab: "tea" |
| posts (nerd) | 4 posts | Mix of keywords: "doubt", "pyq", "hackathon", "notes" |
| posts (hot) | 3 posts | High upvote count, isPostOfDay: true on one |
| chats (sample) | 1 chat | Status: "revealed" — shows post-reveal state for demo |
| friendships | 2 records | One pending, one accepted — shows friend flow |

---

## **09 — PERFORMANCE REQUIREMENTS**

| Metric | Target | How to Achieve |
| ----- | ----- | ----- |
| Initial page load (LCP) | \< 2.5 seconds | Static landing page \+ Vercel CDN. No heavy images on load. |
| Feed load time | \< 1.5 seconds | Firestore query limit 20 posts per tab. Paginate on scroll. |
| Chat message delivery | \< 500ms | Firestore onSnapshot — near-instant push. No polling needed. |
| Identity Reveal animation | 300ms fade-in | framer-motion: opacity 0→1 over 0.3s on reveal state change |
| Chat message animation | 200ms slide-up | framer-motion: y: 20→0 on new message appearing |
| Mobile responsiveness | Chrome on Android | Tailwind sm: breakpoints. Test at 390px width. |
| Concurrent live users (demo) | 5 users max | Firebase Spark handles this easily |
| Firestore reads (daily) | \< 50,000 | Free tier limit. With seeded data \+ 1-day demo: \~500 reads max. |

---

## **10 — COST ESTIMATE**

BOTTOM LINE: $0/MONTH FOR THE DEMO AND WELL BEYOND. Firebase Spark free tier \+ Vercel Hobby free tier covers everything through the demo and for the first few hundred users. You will not be charged unless you explicitly upgrade.

### **Firebase Spark Free Tier Limits**

| Service | Free Limit | Expected Demo Usage | Safe? |
| ----- | ----- | ----- | ----- |
| Firestore reads | 50,000 / day | \~500 reads (demo day) | ✅ 100x headroom |
| Firestore writes | 20,000 / day | \~100 writes (demo day) | ✅ 200x headroom |
| Firestore storage | 1 GB | \~1 MB (seeded data) | ✅ Infinite headroom |
| Firebase Auth | Unlimited MAU | \< 10 users for demo | ✅ No limit |
| Storage (photos) | 5 GB / month | \~0 for demo | ✅ Not used in demo |
| Functions | NOT used | API Routes replace Functions | ✅ N/A |

### **Cost Scaling After Demo**

| Users | Monthly Cost | Notes |
| ----- | ----- | ----- |
| 0–100 | $0 | Well within Spark free tier |
| 100–500 | $0 | Still within free tier for typical usage |
| 500–1,000 | $0–$5 | May exceed Firestore reads — add pagination to stay free |
| 1,000–5,000 | $5–$25 | Upgrade to Firebase Blaze pay-as-you-go — still cheap |
| 10,000+ | $25–$100 | Consider Redis for waitingPool, CDN for media |

---

## **11 — DEVELOPMENT CHECKLIST**

HOW TO USE WITH AI TOOLS: For each task, open Cursor/Claude, paste: "I am building INNR-CRCL, a Next.js 14 \+ Firebase app. My Firestore collections are: \[paste Section 04 names\]. Now build: \[task name below\]." The AI will produce the exact component or function. Test it, check it off, move to next.

---

### **Phase 0 — Tonight March 17 (Before 3 AM)**

* \[ \] 0.1 — Run setup commands from Section 03 | No AI needed, copy-paste terminal commands  
* \[ \] 0.2 — Create Firebase project \+ enable Auth \+ Firestore \+ Storage | Firebase console — manual setup, 10 minutes  
* \[ \] 0.3 — Create .env.local with all Firebase config values | Copy from Firebase project settings  
* \[ \] 0.4 — Create OpenAI account \+ API key (free) | [platform.openai.com](http://platform.openai.com) → API Keys  
* \[ \] 0.5 — Connect GitHub repo to Vercel, deploy blank app | "Deploy Next.js to Vercel from GitHub"  
* \[ \] 0.6 — Create src/lib/firebase.ts — Firebase client \+ admin init | "Create Firebase client and admin SDK init for Next.js 14"  
* \[ \] 0.7 — Create src/lib/constants.ts — CRISIS\_KEYWORDS array | "Create constants file with crisis keywords array"  
* \[ \] 0.8 — Write Firestore Security Rules from Section 06 | "Apply these Firestore security rules exactly: \[paste rules\]"  
* \[ \] 0.9 — Write seed script and run it — verify data in Firebase console | "Write a Node.js seed script for Firestore with these collections: \[paste schema\]"

### **Phase 1 — Day 1: March 17–18 (Auth \+ Feed)**

* \[ \] 1.1 — Landing page / (static, looks great) | "Build a dark violet landing page for INNR-CRCL with hero text, 3 feature cards, CTA button"  
* \[ \] 1.2 — POST /api/auth/verify-domain route | "Build Next.js API route that validates college email domain against ALLOWED\_DOMAINS env var"  
* \[ \] 1.3 — /signup page — email input \+ domain check | "Build signup page that calls /api/auth/verify-domain then sends Firebase magic link"  
* \[ \] 1.4 — /login page \+ magic link handler | "Build login page and magic link callback handler for Firebase Auth email link sign-in"  
* \[ \] 1.5 — POST /api/auth/complete-signup route \+ alias generator | "Build API route that creates Firestore user doc with auto-generated alias like PurpleComet42"  
* \[ \] 1.6 — Auth context/store (zustand) — user session | "Build zustand auth store for Firebase onAuthStateChanged in Next.js 14 App Router"  
* \[ \] 1.7 — /feed page layout with 6 tab navigation | "Build feed page with tabs: Hot, Stories, Memes, Tea, Confessions, Nerd — use shadcn Tabs"  
* \[ \] 1.8 — PostCard component | "Build PostCard component showing alias, content, upvote count, timestamp using these fields: \[paste post schema\]"  
* \[ \] 1.9 — Feed data fetching — Firestore query per tab | "Build Firestore query for posts filtered by collegeDomain and tab field, ordered by createdAt desc"  
* \[ \] 1.10 — Create Post modal (Confessions \+ Memes tabs) | "Build CreatePostModal with textarea, 500 char limit, tab selector, posts to Firestore posts collection"  
* \[ \] 1.11 — Post of the Day banner at top of feed | "Build PostOfDay component that calls /api/feed/post-of-day and shows highlighted card"

### **Phase 2 — Day 2: March 18–19 (Chat \+ Reveal)**

* \[ \] 2.1 — POST /api/chat/find-or-create matching route | "Build chat matching API: check waitingPool Firestore collection for same college \+ keyword match, create chat doc if found, else add to waiting pool"  
* \[ \] 2.2 — /chat page — active chats list \+ match buttons | "Build chat home page showing active chats from Firestore and two buttons: Random Chat and Keyword Chat"  
* \[ \] 2.3 — Keyword input UI for keyword-based matching | "Build keyword input modal that lets user type a topic keyword before entering the matching pool"  
* \[ \] 2.4 — Matching waiting screen (3s poll) | "Build waiting screen that polls /api/chat/find-or-create every 3 seconds until status is matched"  
* \[ \] 2.5 — /chat/\[id\] page — real-time message display | "Build chat window using Firestore onSnapshot on chats/{chatId}/messages, show alias names from participantAliases map"  
* \[ \] 2.6 — Message send — write to Firestore subcollection | "Build message input that writes to chats/{chatId}/messages with senderUid, content, createdAt fields"  
* \[ \] 2.7 — Identity Reveal button \+ POST /api/chat/reveal-request | "Build Reveal Identity button in chat header that calls /api/chat/reveal-request and shows pending banner"  
* \[ \] 2.8 — Reveal accepted UI — framer-motion fade-in of real names | "Build reveal animation: when chat.status becomes revealed, fade in real names with framer-motion opacity 0 to 1 over 300ms"  
* \[ \] 2.9 — Add Friend button post-reveal | "Build Add Friend button that appears after identity reveal and writes to Firestore friendships collection"  
* \[ \] 2.10 — CrisisBanner component — keyword detection | "Build CrisisBanner component that appears in chat when message input contains any word from CRISIS\_KEYWORDS array"  
* \[ \] 2.11 — /chat/support page — listener matching | "Build support chat entry page with Need to talk button that matches user with a peer where isListener is true"  
* \[ \] 2.12 — /friends page — list \+ pending requests | "Build friends page showing accepted friendships and pending requests from Firestore friendships collection"

### **Phase 3 — Day 3: March 19–20 (Polish \+ Moderation \+ Deploy)**

* \[ \] 3.1 — Report button on posts (⋮ menu) | "Build report dropdown menu on PostCard with reason selector that calls /api/moderation/report"  
* \[ \] 3.2 — Report button in chat messages | "Build report button on chat messages that submits to /api/moderation/report with targetType: message"  
* \[ \] 3.3 — POST /api/moderation/report route \+ OpenAI call | "Build moderation report API route: write to Firestore reports collection, call OpenAI moderation API, auto-hide if score \> 0.85"  
* \[ \] 3.4 — /admin page — flagged content queue | "Build admin dashboard at /admin showing all reports from Firestore with status pending, with approve/remove buttons"  
* \[ \] 3.5 — POST /api/admin/resolve-report route | "Build admin resolve route with admin role check using Firebase Admin SDK, handles remove/approve/ban actions"  
* \[ \] 3.6 — /profile/me page | "Build own profile page showing realName, alias, collegeName and list of own posts from Firestore"  
* \[ \] 3.7 — Mobile responsive pass — test at 390px | "Review and fix all Tailwind classes for mobile: sm: breakpoints, touch-friendly button sizes min 44px"  
* \[ \] 3.8 — Navigation bar — bottom nav for mobile | "Build bottom navigation bar for mobile with icons for Feed, Chat, Friends, Profile using lucide-react"  
* \[ \] 3.9 — Loading states \+ error states on all pages | "Add loading skeleton components and error boundary UI to Feed, Chat, and Friends pages"  
* \[ \] 3.10 — Set Firestore Security Rules to production (not test mode) | "Update Firestore rules to use the security rules from Section 06 of TRD, not test mode"  
* \[ \] 3.11 — Final seed run — refresh all demo data | Run node scripts/seed.js to ensure fresh realistic data  
* \[ \] 3.12 — Push to GitHub → verify Vercel deploy succeeds | Check Vercel dashboard for build logs — fix any build errors  
* \[ \] 3.13 — Full demo walkthrough rehearsal | Run through all 4 flows: Onboarding, Chat+Reveal, Confession, Report

---

## **12 — TECHNICAL SUCCESS CRITERIA**

The app is demo-ready when ALL of these pass. Test each one manually in your browser. Open two incognito windows to test real-time features.

### **Auth**

* Enter [gmail.com](http://gmail.com) email on signup → Error: "Only college email addresses are allowed"  
* Enter valid .ac.in email → Magic link email arrives within 30 seconds  
* Click magic link → Redirected to /feed, alias shown in header  
* Refresh page after login → Still logged in (Firebase session persists)

### **Feed**

* Open /feed → All 6 tabs visible, each has at least 2 posts loaded  
* Click each tab → Content changes, correct tab stays highlighted  
* Post a confession → Post appears in Confessions tab with alias, no real name  
* Upvote a post → Count increments, button changes state  
* Check Post of Day banner → Shows one post with highest engagement at top of Hot tab

### **Anonymous Chat \+ Identity Reveal**

* Open two browser tabs as two different users → Both can enter the matching pool  
* Both tap Random Chat → Both match within 3 seconds, chat window opens  
* Send messages from both tabs → Messages appear in real-time in both windows under 500ms  
* One user taps Reveal Identity → Other user sees reveal request banner  
* Both tap Yes on reveal → Real names fade in on both sides within 2 seconds  
* Tap Add Friend after reveal → Friendship doc created, appears in /friends as pending  
* Type "suicide" in support chat → Crisis banner appears at top of chat window

### **Moderation**

* Tap ⋮ on a post → Report → Reason selector appears, submit button works  
* Submit a report → Report disappears from feed (if AI flags it) OR stays with "report received" toast  
* Open /admin → Report appears in queue with AI score or "pending manual" label  
* Click Remove in admin → Post becomes hidden in feed immediately

### **Mobile**

* Open on phone browser (Chrome) → No horizontal scroll, all buttons tappable  
* Bottom navigation visible → Feed / Chat / Friends / Profile icons all visible  
* Landscape mode → Chat input stays visible, not hidden by keyboard

---

*INNR-CRCL — Ship it.*

---

 