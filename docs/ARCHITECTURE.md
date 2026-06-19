# TapTimez — Architecture & Foundation

> **App name:** TapTimez · **Domain:** taptimez.com (confirm/purchase at registrar)

> The single source of truth for **what** we are building and **how** the pieces fit
> together. Read this before touching code. The phase-by-phase build order lives in
> [ROADMAP.md](./ROADMAP.md).

---

## 1. The Game (in one paragraph)

TapTimez is a **time-prediction** game. Each round has a **target duration that can be
any value** — 4s, 6s, 10s, 23s — it is **not** fixed. The player never sees a clock:
they **tap to start** and **tap to stop**, trying to land as close to the target as
possible using only their internal sense of time. The smaller the gap between their stop
and the target, the better the score. Two modes:

- **Solo:** one phone. Tap-start, tap-stop, see how close you landed to the round's target.
- **Versus (Judge + Player):** two phones joined by a **room code**. The *player* sees
  only a button; the *judge* sees the timer and the result. Closest to the target wins
  the round.

A global **leaderboard** ranks players by accuracy (smallest error from the target).

> **Open decision (settle before Phase 2/4):** how is each round's target chosen —
> random within a range, or set by the judge? Working default: **random per round**.

---

## 2. The One Rule That Drives The Whole Design: **Measure on the player's device**

The single most important technical decision:

> The official elapsed time is computed **locally on the player's phone**, from the
> moment they tap *start* to the moment they tap *stop* — using `performance.now()`
> (a monotonic, millisecond-accurate clock). The network is used only to *relay the
> result and animate the judge's screen*, never to measure it.

**Why:** if the timer ran on the judge's phone over the internet, network lag
(50–300ms, and variable) would be baked into every score. Same skill → different
result depending on wifi. By measuring tap-to-tap on one device, the score is fair,
consistent, and cheat-resistant (we can also validate it server-side later).

This is why we do **not** need a custom low-latency game server. Firebase's real-time
sync is purely for *coordination and display*, which it does perfectly.

---

## 3. Technology Stack

| Concern              | Choice                                  | Notes |
|----------------------|-----------------------------------------|-------|
| Frontend framework   | **React + Vite**                        | Runs in any phone browser, no install. |
| Language             | **TypeScript**                          | Catches bugs early; optional but recommended. |
| Styling              | Tailwind CSS (or plain CSS modules)     | Decide in Phase 0. |
| Auth                 | **Firebase Authentication**             | Email/password **+ Google sign-in**. |
| Persistent data      | **Cloud Firestore**                     | User profiles, attempt history, leaderboard. |
| Real-time multiplayer| **Firebase Realtime Database**          | Room codes, join, start/stop signaling. Uses WebSockets internally. |
| Hosting              | **Firebase Hosting**                    | One ecosystem; no Vercel needed. |
| Server logic (later) | **Cloud Functions** (Phase 5)           | Score validation / anti-cheat / leaderboard aggregation. |

**Why two databases?** Firestore is great for structured, queryable, persistent data
(leaderboards, profiles). Realtime Database is optimized for fast, ephemeral,
low-latency state shared between a few connected clients (a live game room). Using each
for what it's best at is the standard Firebase pattern.

---

## 4. High-Level Architecture

```
   Player's Phone (browser)          Judge's Phone (browser)
   ┌─────────────────────┐           ┌─────────────────────┐
   │   React Web App     │           │   React Web App     │
   │  - taps start/stop  │           │  - shows timer anim │
   │  - measures locally │           │  - shows result     │
   └──────────┬──────────┘           └──────────┬──────────┘
              │      (real-time room sync, both ways)        │
              └──────────────┬───────────────────────────────┘
                             ▼
                   ┌───────────────────┐
                   │     FIREBASE      │
                   │ ┌───────────────┐ │
                   │ │ Auth          │ │  email/pw + Google
                   │ ├───────────────┤ │
                   │ │ Realtime DB   │ │  rooms/{code} live state
                   │ ├───────────────┤ │
                   │ │ Firestore     │ │  users, attempts, leaderboard
                   │ ├───────────────┤ │
                   │ │ Hosting       │ │  serves the React app
                   │ └───────────────┘ │
                   └───────────────────┘
```

---

## 5. Data Models

### 5.1 Firestore (persistent)

```
users/{uid}
  username        string   (unique, chosen at first sign-in)
  email           string
  photoURL        string?  (from Google)
  createdAt       timestamp
  bestErrorMs     number   (smallest |elapsed - target|, lower = better)
  bestElapsedMs   number
  totalAttempts   number
  totalWins       number   (versus mode)

attempts/{autoId}
  uid             string
  mode            "solo" | "versus"
  targetMs        number   (the round's target duration — varies, NOT fixed)
  elapsedMs       number
  errorMs         number   (|elapsedMs - targetMs|)
  createdAt       timestamp

usernames/{usernameLowercase}   // uniqueness guard
  uid             string
```

**Leaderboard** is just a query: `users` ordered by `bestErrorMs` ascending, limit N.
(Later, a Cloud Function can maintain a denormalized `leaderboard/global` doc for speed.)

### 5.2 Realtime Database (ephemeral, live rooms)

```
rooms/{code}
  status        "waiting" | "playing" | "finished"
  targetMs      <varies per round>
  createdAt     <ts>
  judge:
    uid         string
    connected   bool
  player:
    uid         string
    connected   bool
  round:
    state       "idle" | "running" | "stopped"
    startedAt   <client perf ts>     // for the judge's animation only
    resultMs    number?              // authoritative value from player's device
    errorMs     number?
```

Room codes: 4–6 character uppercase alphanumeric (e.g. `K7Q2`), generated on room
creation, used as the Realtime DB key. Rooms auto-expire / are cleaned up after the game.

---

## 6. Core Game Flow (Versus mode)

1. **Judge** signs in → creates a room → gets code `K7Q2`. Realtime DB node created,
   `status: "waiting"`.
2. **Player** signs in → enters `K7Q2` → joins room. Both now see "connected".
3. Judge starts the round → `round.state: "idle"`, player's button becomes active.
4. **Player taps START** → records `t0 = performance.now()` locally; writes
   `round.state: "running"` so the judge's timer animation begins.
5. **Player taps STOP** → records `t1 = performance.now()`, computes
   `resultMs = t1 - t0` **on the player's device**, writes `round.resultMs` + `errorMs`,
   sets `round.state: "stopped"`.
6. Judge's screen displays the stopped time and the error. Result is also written to
   Firestore `attempts` and the player's `users` doc is updated if it's a new best.
7. Repeat for N rounds; lowest total error wins. `status: "finished"`.

> Note: the judge's animated timer is *cosmetic* (it's an estimate driven by the start
> signal). The number that counts is the player's locally-measured `resultMs`.

---

## 7. Security & Fairness (planned)

- **Firestore Security Rules:** a user may only write their own `users/{uid}` and
  `attempts` with their own `uid`. Usernames enforced unique via the `usernames`
  collection + a transaction.
- **Realtime DB Rules:** only the room's judge/player UIDs may write to that room node.
- **Anti-cheat (Phase 5):** Cloud Function re-validates submitted scores (sane bounds,
  rate limits) before they affect the leaderboard. Client-submitted scores are never
  blindly trusted for the *global* board.

---

## 8. Environment & Secrets

- Firebase web config (apiKey, authDomain, projectId, etc.) lives in `.env.local`,
  injected via Vite (`import.meta.env.VITE_...`). The web apiKey is *not* secret (it's
  public by design); real protection comes from Auth + Security Rules.
- `.env.local` is git-ignored. A committed `.env.example` documents required keys.

---

## 9. What we are explicitly NOT building (for v1)

- No native iOS/Android app (web only — test demand first).
- No Bluetooth (internet + room code covers same-room and remote play).
- No custom WebSocket server (Firebase Realtime DB replaces it).
- No payments, no chat, no friend system (possible future work).

See [ROADMAP.md](./ROADMAP.md) for the phase-by-phase build plan.
