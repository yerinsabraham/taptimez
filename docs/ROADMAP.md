# TapTimez — Build Roadmap (Phase by Phase)

> We build **one phase at a time**, fully working and testable, before moving on.
> Architecture and rationale live in [ARCHITECTURE.md](./ARCHITECTURE.md).
> Each phase lists: **Goal → Tasks → Done when (acceptance) → Depends on.**

---

## Phase 0 — Foundation & Setup
**Goal:** an empty-but-running React app wired to a real Firebase project.

**Tasks**
- [ ] Create React + Vite + TypeScript app in repo root.
- [ ] Add styling approach (Tailwind recommended).
- [ ] Create the Firebase project in the console (enable Auth, Firestore, Realtime DB, Hosting).
- [ ] Add Firebase SDK; create `src/lib/firebase.ts` initializing the app from `.env.local`.
- [ ] Commit `.env.example`; git-ignore `.env.local`.
- [ ] Basic app shell + routing (Home / Play / Leaderboard / Profile placeholders).
- [ ] Deploy the empty shell to Firebase Hosting once, to prove the pipeline works.

**Done when:** the live URL loads a "Hello TapTimez" shell that successfully connects
to Firebase (no console errors).

---

## Phase 1 — Authentication & User Profiles
**Goal:** people can sign up, sign in, and have a persistent identity.

**Tasks**
- [ ] Email/password sign-up + sign-in (Firebase Auth).
- [ ] Google sign-in.
- [ ] First-time **username** selection, enforced unique (via `usernames` collection + transaction).
- [ ] On first sign-in, create `users/{uid}` profile doc (defaults from §5.1 of ARCHITECTURE).
- [ ] Auth state context + protected routes (must be signed in to Play).
- [ ] Sign-out; basic Profile page showing username, best score, attempts.
- [ ] Firestore Security Rules: users can only write their own profile.

**Done when:** a new user can sign up with email or Google, pick a unique username, see
their (empty) profile, refresh the page, and still be signed in.

**Depends on:** Phase 0.

---

## Phase 2 — Solo Game (the core mechanic) ⭐
**Goal:** the actual fun — prove the game is enjoyable on a single phone.

**Tasks**
- [ ] Big round START/STOP button (center screen, thumb-friendly).
- [ ] Local measurement with `performance.now()` (no timer shown to player while running).
- [ ] On stop: reveal `elapsedMs`, `errorMs`, and a "closeness" reaction.
- [ ] Per-round **target duration** that varies (NOT fixed) — e.g. random in a range.
- [ ] Save each attempt to Firestore `attempts`; update `users/{uid}` best fields.
- [ ] "Play again" loop; show your best-ever this session.

**Done when:** on a phone browser you can tap-start, tap-stop, get a millisecond-accurate
result, and your best score persists to your profile across refreshes.

**Depends on:** Phase 1. *(This is the make-or-break phase — validate the fun here.)*

---

## Phase 3 — Leaderboard
**Goal:** social proof + competition.

**Tasks**
- [ ] Leaderboard page: query `users` ordered by `bestErrorMs` ascending, top N.
- [ ] Show rank, username, best error, best elapsed.
- [ ] Highlight the current user's row / rank.
- [ ] (Optional) filter by target mode.

**Done when:** finishing a good solo run moves you up a live, shared leaderboard visible
to everyone.

**Depends on:** Phase 2.

---

## Phase 4 — Versus Mode (Judge + Player, real-time) ⭐
**Goal:** the two-phone, room-code multiplayer described in §6 of ARCHITECTURE.

**Tasks**
- [ ] Room creation → generate unique code → write `rooms/{code}` to Realtime DB.
- [ ] Join-by-code flow; assign judge/player roles; presence/connected indicators.
- [ ] Judge view: animated timer + live status; Player view: button only.
- [ ] Round signaling: player START/STOP writes to Realtime DB; judge screen reacts.
- [ ] Authoritative `resultMs` measured on player device → written to room + Firestore.
- [ ] Multi-round match, win condition (lowest total error), rematch.
- [ ] Realtime DB Security Rules: only room participants can write.
- [ ] Room cleanup/expiry.

**Done when:** two different phones on different networks join with one code and play a
full match, with fair (locally-measured) scores shown on both screens.

**Depends on:** Phase 2 (mechanic) + Phase 1 (identity).

---

## Phase 5 — Polish, Anti-Cheat, Sharing, Launch
**Goal:** make it shareable and trustworthy, then ship.

**Tasks**
- [ ] Cloud Function to validate submitted scores before they affect the global board.
- [ ] Shareable result card (image/link) for TikTok ("I hit 6.003s — beat that").
- [ ] Spectator join (extra people watch a room).
- [ ] Configurable targets (6s / 7s / 67s / random) matching the TikTok variants.
- [ ] Empty/error/loading states, mobile polish, sounds/haptics.
- [ ] Final Security Rules review; production deploy.

**Done when:** a stranger can find the site, play solo or versus, and share a result —
and the leaderboard can't be trivially faked.

**Depends on:** Phases 1–4.

---

## Suggested order of value
Phase 2 (solo) is the fastest path to *"is this actually fun?"* — it's playable by one
person with no friend required and immediately feeds the leaderboard. Versus (Phase 4)
is the social/viral hook but depends on the mechanic feeling good first.
