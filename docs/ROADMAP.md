# TapTimez — Build Roadmap (Phase by Phase)

> We build **one phase at a time**, fully working and testable, before moving on.
> Architecture and rationale live in [ARCHITECTURE.md](./ARCHITECTURE.md).
> Each phase lists: **Goal → Tasks → Done when (acceptance) → Depends on.**

---

## Status snapshot (live)

- ✅ **Phase 0 — Foundation:** Vite + React + TS, Firebase wired, deployed to `taptimez.web.app`.
- ✅ **Phase 1 — Auth:** email/password + Google, unique usernames, profiles, security rules.
- ✅ **Phase 2 — Core game:** the buzzer, local-measured timing, results, Practice (with
  hide-clock toggle and a chosen target).
- ✅ **Phase 3 — Leaderboard:** ranked by **perfect scores** (blind modes only), earliest
  breaks ties; composite index deployed.
- 🟡 **Phase 4 — Multiplayer (mostly done):** room codes, lobby, **Player** + **Timekeeper**
  roles, timekeeper-started clocks, results/rematch, **online presence**, **in-app
  challenges** with instant popup, and **"Find a match"** auto-pairing.
- ⬜ **Phase 5 — Polish, anti-cheat, launch:** see below.

**Beyond the original plan, also shipped:** physical buzzer UI + heartbeat loader,
7-segment LED clock (DSEG7), arcade sound + volume + vibration, perfect-score celebration,
copy-code button, friendly empty/warming states.

**Top remaining work (Phase 4 tail + Phase 5):**
- Challenge edge cases: auto-cancel a pending invite if the challenger leaves; "they
  declined" feedback in more places.
- Real matchmaking service (current "Find a match" reads a capped presence list client-side).
- Push notifications (FCM) — deferred until a packaged mobile app.
- Cloud Function score validation (anti-cheat) before perfects affect the global board.
- Shareable result cards, spectators, sounds/haptics polish, final rules review.

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

## Phase 4 — Player Mode: Single + Multiplayer (real-time) ⭐
**Goal:** the room-code multiplayer described in §6 of ARCHITECTURE.

**Design (from product owner):**
- **Player** splits into **Single player** and **Multiplayer**.
- **Single player:** like the solo skill game — no clock during play, score shown only at
  the end.
- **Multiplayer:** one person **creates a game** and **invites** participants:
  - invite a **Timekeeper** + play alone, OR invite **multiple players** + a Timekeeper.
  - **Timekeeper is required when there are multiple players** (someone must keep time).
  - **"No timekeeper" option:** players just play and **see their scores at the end**
    (hidden during play, like the solo result) — no live watcher.
- **Timekeeper view:** sees the live numbers + each player's **name**, synced in real time
  with what that player is starting/stopping. (Future: multiple players, one timekeeper.)
- **Player view:** the buzzer only — **no clock** (the clock is the timekeeper's screen).
- **Target:** decide create-time (host sets) vs. per-round; reuse the Practice target picker.

**Tasks**
- [ ] Create game → generate unique code → write `rooms/{code}` to Realtime DB.
- [ ] Join-by-code / invite flow; roles: timekeeper + player(s); presence indicators.
- [ ] "No timekeeper" variant (end-of-game score reveal).
- [ ] Timekeeper view: live clock + player names/status; Player view: buzzer only.
- [ ] Round signaling: player START/STOP writes to Realtime DB; timekeeper screen reacts.
- [ ] Authoritative `resultMs` measured on player device → written to room + Firestore.
- [ ] Multi-round match, win condition (lowest total error), rematch.
- [ ] Realtime DB Security Rules: only room participants can write.
- [ ] Room cleanup/expiry.

**Done when:** different phones join with one code and play a full match, with fair
(locally-measured) scores shown correctly to players and the timekeeper.

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
