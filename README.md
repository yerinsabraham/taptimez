# TapTimez

Stop the timer by feel. TapTimez is a time-prediction game: a target duration is set (any
value, e.g. 6s), you tap to start and tap to stop with **no clock visible**, and you score
on how close you land. Hit it within **0.02s** and it's a **perfect**.

**Live:** https://taptimez.web.app

Inspired by the TikTok "timer" challenge, built as a fast way to test whether people want
to replay a precision-timing game.

---

## What's in this repo

This is a monorepo with three parts:

| Path | What it is |
|------|------------|
| `/` (root), `src/` | **Web app** — React + Vite + TypeScript + Tailwind (the live product) |
| `mobile/` | **Flutter app** — native iOS/Android client (in progress) |
| `functions/` | **Cloud Functions** — server-side anti-cheat auditor |
| `docs/` | Architecture and the phase-by-phase build roadmap |

Backend is **Firebase**: Authentication, Cloud Firestore, Realtime Database, Cloud
Functions, Hosting, and Analytics.

---

## The game

- **Practice** — pick a target, train with the clock shown or hidden.
- **Single player** — no clock, scored against your target, feeds your stats.
- **Multiplayer** — create/join a room by code, or "Find a match" against someone online;
  optional **Timekeeper** role and a **keep-score** series across rematches.
- **Leaderboard** — ranked by number of **perfect** scores (within 0.02s), earliest to a
  count breaks ties. Practice doesn't count.
- Perfect-score celebration, shareable result cards, arcade sound + vibration.

The official time is always measured **on the player's own device** (tap-to-tap), so scores
are network-independent and fair.

---

## Web app

### Stack
React 19 · Vite · TypeScript · Tailwind CSS v4 · Firebase (Auth, Firestore, Realtime
Database, Hosting, Analytics) · DSEG7 7-segment font.

### Setup
```bash
npm install
cp .env.example .env.local   # then fill in your Firebase web config
npm run dev                  # http://localhost:5173
```

`.env.local` holds the Firebase web config (public by design; real protection is the
security rules). It is git-ignored — see `.env.example` for the required keys.

### Build & deploy
```bash
npm run build                # type-check + production build to dist/
npm run deploy               # build + deploy to Firebase Hosting
```

Security rules and indexes live in `firestore.rules`, `firestore.indexes.json`, and
`database.rules.json`. Deploy them with:
```bash
firebase deploy --only firestore:rules,firestore:indexes,database
```

---

## Cloud Functions (`functions/`)

`auditAttempt` is a Firestore-triggered anti-cheat auditor: it re-validates each attempt's
consistency and bounds server-side and **flags** users with a statistically impossible
perfect rate. Flagged users are hidden from the leaderboard, and clients can't clear their
own flag (the security rules only permit legal stat advances). Requires the Firebase Blaze
plan.

```bash
cd functions && npm install
firebase deploy --only functions
```

---

## Mobile app (`mobile/`)

A native Flutter client targeting iOS and Android (`com.creovine.taptimez`). Firebase is
initialized via `firebase_options.dart`; feature parity with the web app (auth, leaderboard,
multiplayer) is in progress.

```bash
cd mobile
flutter pub get
flutter run
```

iOS note: add `ios/Runner/GoogleService-Info.plist` to the Runner target in Xcode, and add
the `REVERSED_CLIENT_ID` URL scheme to `Info.plist` if you enable Google Sign-In.

---

## Notes

- Firebase web/mobile API keys in this repo are **client configuration** (public by design);
  access is controlled by Auth + Security Rules, not by hiding the keys.
- Architecture and roadmap: see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
  [`docs/ROADMAP.md`](docs/ROADMAP.md).
