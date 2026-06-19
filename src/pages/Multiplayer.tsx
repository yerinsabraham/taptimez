import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { useMatch } from '../lib/match.tsx'
import TapButton from '../components/TapButton.tsx'
import Clock from '../components/Clock.tsx'
import TargetStepper from '../components/TargetStepper.tsx'
import Splash from '../components/Splash.tsx'
import PerfectBurst from '../components/PerfectBurst.tsx'
import { fmtTarget, isPerfect, toSec } from '../lib/game.ts'
import { feedbackPerfect, feedbackStart, feedbackStop, startTone, stopTone } from '../lib/sound.ts'
import { recordRankedAttempt } from '../lib/attempts.ts'
import { sendChallenge, setChallengeStatus, subscribeChallenge } from '../lib/challenges.ts'
import { subscribeOnline, type OnlineUser } from '../lib/presence.ts'
import {
  createRoom,
  endGame,
  joinRoom,
  leaveRoom,
  playerStart,
  playerStop,
  rematch,
  startGame,
  subscribeRoom,
  subscribeServerOffset,
  type Role,
  type Room,
  type RoomPlayer,
} from '../lib/rooms.ts'

const CHALLENGE_TARGET_MS = 5000

/* ---------------- The active room (driven by the match context) ---------------- */

export function RoomScreen() {
  const { user, profile } = useAuth()
  const { match, leave } = useMatch()
  const code = match?.code ?? null
  const role = match?.role ?? null
  const uid = user?.uid
  const [room, setRoom] = useState<Room | null>(null)
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!code) return
    const unsubRoom = subscribeRoom(code, setRoom)
    const unsubOffset = subscribeServerOffset(setOffset)
    return () => {
      unsubRoom()
      unsubOffset()
    }
  }, [code])

  // Host auto-ends the game when there's no timekeeper and all players stopped.
  useEffect(() => {
    if (!room || !uid || !code) return
    if (room.meta?.status !== 'playing' || room.meta.hostUid !== uid) return
    const players = room.players ? Object.values(room.players) : []
    const participants = room.participants ? Object.values(room.participants) : []
    const hasTimekeeper = participants.some((p) => p.role === 'timekeeper')
    const allStopped = players.length > 0 && players.every((p) => p.state === 'stopped')
    if (!hasTimekeeper && allStopped) endGame(code).catch(() => {})
  }, [room, uid, code])

  if (!match || !user || !profile || !code || !role) return null

  const exit = () => {
    leaveRoom(code, user.uid).catch(() => {})
    leave()
  }

  if (!room) return <Splash />

  const status = room.meta?.status
  const isHost = room.meta?.hostUid === user.uid

  if (status === 'done') {
    return <Results room={room} uid={user.uid} isHost={isHost} code={code} onExit={exit} />
  }
  if (status === 'playing') {
    const participants = room.participants ? Object.values(room.participants) : []
    const hasTimekeeper = participants.some((p) => p.role === 'timekeeper')
    return role === 'player' ? (
      <PlayerGame room={room} uid={user.uid} code={code} offset={offset} hasTimekeeper={hasTimekeeper} />
    ) : (
      <TimekeeperGame room={room} code={code} offset={offset} />
    )
  }
  return <Lobby room={room} code={code} isHost={isHost} onStart={() => startGame(code)} onExit={exit} />
}

/* ---------------- Entry: online / create / join ---------------- */

export function RoomEntry({ role, onExit }: { role: Role; onExit: () => void }) {
  const { user, profile } = useAuth()
  const { enter } = useMatch()
  const tabs = role === 'player' ? (['online', 'create', 'join'] as const) : (['create', 'join'] as const)
  const [tab, setTab] = useState<(typeof tabs)[number]>(tabs[0])
  const [target, setTarget] = useState(5000)
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!user || !profile) return null
  const name = profile.username

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  const create = () =>
    run(async () => {
      const code = await createRoom(user.uid, name, role, target)
      enter(code, role)
    })

  const join = () =>
    run(async () => {
      const c = joinCode.trim().toUpperCase()
      await joinRoom(c, user.uid, name, role)
      enter(c, role)
    })

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <button onClick={onExit} className="self-start text-sm text-white/40 transition hover:text-white/70">
        ‹ Back
      </button>

      <div className="text-center">
        <h2 className="text-2xl font-black">{role === 'timekeeper' ? 'Timekeeper' : 'Multiplayer'}</h2>
        <p className="mt-1 text-sm text-white/50">
          {role === 'timekeeper'
            ? 'Host a game or join one to keep time.'
            : 'Challenge someone online, or play with a code.'}
        </p>
      </div>

      <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition ${
              tab === t ? 'bg-indigo-500 text-white' : 'text-white/60'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'online' && <FindMatch meUid={user.uid} meName={name} onEnter={enter} />}

      {tab === 'create' && (
        <div className="flex flex-col items-center gap-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Target time</p>
          <TargetStepper targetMs={target} onChange={setTarget} />
          <button
            disabled={busy}
            onClick={create}
            className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create game'}
          </button>
        </div>
      )}

      {tab === 'join' && (
        <div className="flex flex-col gap-3">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="CODE"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            maxLength={4}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-black tracking-[0.3em] text-white outline-none focus:border-indigo-400"
          />
          <button
            disabled={busy || joinCode.trim().length < 4}
            onClick={join}
            className="rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'Joining…' : 'Join game'}
          </button>
        </div>
      )}

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  )
}

/* ---------------- Find a match (auto-invite an online player) ---------------- */

const FIND_TIMEOUT_MS = 15000

type FindPhase = 'idle' | 'inviting' | 'noone' | 'noanswer'

function FindMatch({
  meUid,
  meName,
  onEnter,
}: {
  meUid: string
  meName: string
  onEnter: (code: string, role: Role) => void
}) {
  const [phase, setPhase] = useState<FindPhase>('idle')
  const [opponent, setOpponent] = useState<string | null>(null)
  const usersRef = useRef<OnlineUser[]>([])
  const pendingRef = useRef<{
    code: string
    challengeId: string
    unsub: () => void
    timer: number
  } | null>(null)

  // Abort the current invite: stop listening, leave the room, cancel the challenge.
  const abort = () => {
    const p = pendingRef.current
    if (!p) return
    p.unsub()
    clearTimeout(p.timer)
    leaveRoom(p.code, meUid).catch(() => {})
    setChallengeStatus(p.challengeId, 'cancelled').catch(() => {})
    pendingRef.current = null
  }

  useEffect(() => {
    const unsub = subscribeOnline((list) => {
      usersRef.current = list
    })
    return () => {
      unsub()
      abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const invite = async () => {
    abort()
    setPhase('inviting')
    const available = usersRef.current.filter((u) => u.uid !== meUid && u.status === 'online')
    if (available.length === 0) {
      setPhase('noone')
      return
    }
    const target = available[Math.floor(Math.random() * available.length)]
    setOpponent(target.username)

    let code = ''
    try {
      code = await createRoom(meUid, meName, 'player', CHALLENGE_TARGET_MS)
      const challengeId = await sendChallenge({
        fromUid: meUid,
        fromName: meName,
        toUid: target.uid,
        toName: target.username,
        code,
      })
      const entry = { code, challengeId, unsub: () => {}, timer: 0 }
      entry.unsub = subscribeChallenge(challengeId, (c) => {
        if (!c || pendingRef.current?.challengeId !== challengeId) return
        if (c.status === 'accepted') {
          entry.unsub()
          clearTimeout(entry.timer)
          pendingRef.current = null
          onEnter(code, 'player') // keep the room, jump in
        } else if (c.status === 'declined') {
          abort()
          setPhase('noanswer')
        }
      })
      entry.timer = window.setTimeout(() => {
        abort()
        setPhase('noanswer')
      }, FIND_TIMEOUT_MS)
      pendingRef.current = entry
    } catch {
      if (code) leaveRoom(code, meUid).catch(() => {})
      setPhase('idle')
    }
  }

  const cancel = () => {
    abort()
    setPhase('idle')
  }

  if (phase === 'inviting') {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <div className="heartbeat" />
        <p className="text-sm text-white/60">
          Inviting <span className="font-semibold text-white/90">{opponent}</span>…
        </p>
        <button
          onClick={cancel}
          className="rounded-full border border-white/15 bg-white/5 px-6 py-2 text-sm font-semibold text-white/70 transition active:scale-95"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (phase === 'noone' || phase === 'noanswer') {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="text-4xl">{phase === 'noone' ? '🌙' : '🤷'}</div>
        <p className="max-w-xs text-sm text-white/50">
          {phase === 'noone'
            ? 'No one is online right now. Try again in a bit, or play with a code.'
            : `${opponent ?? 'They'} didn't answer. Try another opponent.`}
        </p>
        <button
          onClick={invite}
          className="rounded-xl bg-indigo-500 px-8 py-3 font-bold text-white transition active:scale-[0.98]"
        >
          {phase === 'noone' ? 'Try again' : 'Find another'}
        </button>
      </div>
    )
  }

  // idle
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <p className="max-w-xs text-sm text-white/50">
        We'll find someone online and invite them to a quick match.
      </p>
      <button
        onClick={invite}
        className="rounded-full bg-indigo-500 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-indigo-500/30 transition active:scale-95"
      >
        Find a match
      </button>
    </div>
  )
}

/* ---------------- Lobby ---------------- */

function Lobby({
  room,
  code,
  isHost,
  onStart,
  onExit,
}: {
  room: Room
  code: string
  isHost: boolean
  onStart: () => void
  onExit: () => void
}) {
  const participants = room.participants ? Object.entries(room.participants) : []
  const playerCount = participants.filter(([, p]) => p.role === 'player').length

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <button onClick={onExit} className="self-start text-sm text-white/40 transition hover:text-white/70">
        ‹ Leave
      </button>

      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Game code</p>
        <div className="mt-1 flex items-center justify-center gap-3">
          <p className="text-5xl font-black tracking-[0.3em] text-emerald-400">{code}</p>
          <CopyCode code={code} />
        </div>
        <p className="mt-2 text-sm text-white/50">
          Target {fmtTarget(room.meta.targetMs)} · share the code to invite players & a timekeeper
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {participants.map(([id, p]) => (
          <div
            key={id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <span className="font-semibold">{p.name}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                p.role === 'timekeeper' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
              }`}
            >
              {p.role}
            </span>
          </div>
        ))}
      </div>

      {isHost ? (
        <button
          onClick={onStart}
          disabled={playerCount < 1}
          className="mt-auto rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98] disabled:opacity-40"
        >
          {playerCount < 1 ? 'Waiting for a player…' : 'Start game'}
        </button>
      ) : (
        <p className="mt-auto text-center text-sm text-white/40">Waiting for the host to start…</p>
      )}
    </div>
  )
}

/* ---------------- Player view (buzzer, no clock) ---------------- */

function PlayerGame({
  room,
  uid,
  code,
  offset,
  hasTimekeeper,
}: {
  room: Room
  uid: string
  code: string
  offset: number
  hasTimekeeper: boolean
}) {
  const target = room.meta.targetMs
  const me = room.players?.[uid]
  const state = me?.state ?? 'idle'
  const startRef = useRef(0)
  const [showPerfect, setShowPerfect] = useState(false)

  // Reset the local start mark whenever we're back to idle (e.g. after a rematch).
  useEffect(() => {
    if (state === 'idle') startRef.current = 0
  }, [state])

  // Sustained tone while running — works whether we started or the timekeeper did.
  useEffect(() => {
    if (state === 'running') startTone()
    else stopTone()
  }, [state])
  useEffect(() => () => stopTone(), [])

  const startSelf = () => {
    feedbackStart()
    startRef.current = performance.now()
    playerStart(code, uid).catch(() => {})
  }

  const stop = () => {
    // If we started locally, use the precise local delta; if the timekeeper
    // started us, measure against the server-synced start time.
    const elapsed =
      startRef.current > 0
        ? performance.now() - startRef.current
        : Date.now() + offset - (me?.startedAt ?? Date.now() + offset)
    const ms = Math.max(0, Math.round(elapsed))
    const err = Math.abs(ms - target)
    playerStop(code, uid, ms, err).catch(() => {})
    // Record to the player's profile so multiplayer perfects count on the leaderboard.
    recordRankedAttempt(uid, target, ms, 'versus').catch(() => {})
    startRef.current = 0
    if (isPerfect(err)) {
      feedbackPerfect()
      setShowPerfect(true)
    } else {
      feedbackStop()
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 py-6 text-center">
      {showPerfect && <PerfectBurst onDone={() => setShowPerfect(false)} />}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Target</p>
        <p className="mt-1 text-3xl font-black tabular-nums text-emerald-400">{fmtTarget(target)}</p>
      </div>

      {state === 'stopped' ? (
        <>
          <Clock ms={me?.resultMs ?? 0} />
          <p className="text-xl font-black">Locked in! ✅</p>
          <p className="text-sm text-white/40">Waiting for results…</p>
        </>
      ) : state === 'running' ? (
        <>
          {/* No clock for the player — the timekeeper holds the time. */}
          <Clock ms={0} hidden />
          <TapButton label="STOP" onPress={stop} />
          <p className="text-sm text-white/40">Feel the time. Tap STOP at the target.</p>
        </>
      ) : hasTimekeeper ? (
        <>
          <Clock ms={0} hidden />
          <TapButton label="WAIT" />
          <p className="text-sm text-white/40">Waiting for the timekeeper to start your clock…</p>
        </>
      ) : (
        <>
          <Clock ms={0} hidden />
          <TapButton label="START" onPress={startSelf} />
          <p className="text-sm text-white/40">Tap START, then STOP at the target.</p>
        </>
      )}
    </div>
  )
}

/* ---------------- Timekeeper view (live synced clocks) ---------------- */

function TimekeeperGame({ room, code, offset }: { room: Room; code: string; offset: number }) {
  const [now, setNow] = useState(() => Date.now() + offset)
  const offsetRef = useRef(offset)
  offsetRef.current = offset

  useEffect(() => {
    let raf = 0
    const loop = () => {
      setNow(Date.now() + offsetRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  const players = room.players ? Object.entries(room.players) : []
  const anyIdle = players.some(([, p]) => p.state === 'idle')

  const liveMs = (p: RoomPlayer): number => {
    if (p.state === 'running' && p.startedAt) return Math.max(0, now - p.startedAt)
    if (p.state === 'stopped' && p.resultMs != null) return p.resultMs
    return 0
  }

  const startAll = () => {
    players.forEach(([id, p]) => {
      if (p.state === 'idle') playerStart(code, id).catch(() => {})
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Timekeeper · {code}</p>
        <p className="mt-1 text-sm text-white/50">Target {fmtTarget(room.meta.targetMs)}</p>
      </div>

      <div className="flex flex-col gap-4">
        {players.map(([id, p]) => (
          <div key={id} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex w-full items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs text-white/40">
                {p.state === 'running'
                  ? 'running…'
                  : p.state === 'stopped'
                    ? `off by ${toSec(p.errorMs ?? 0)}s`
                    : 'ready'}
              </span>
            </div>
            <Clock ms={liveMs(p)} hidden={p.state === 'idle'} />
            {p.state === 'idle' && (
              <button
                onClick={() => playerStart(code, id).catch(() => {})}
                className="rounded-full bg-emerald-500/90 px-5 py-1.5 text-sm font-bold text-black transition active:scale-95"
              >
                Start clock
              </button>
            )}
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-center text-sm text-white/40">No players in this game.</p>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {anyIdle && players.length > 1 && (
          <button
            onClick={startAll}
            className="rounded-xl bg-emerald-500/90 px-4 py-3 font-bold text-black transition active:scale-[0.98]"
          >
            Start all clocks
          </button>
        )}
        <button
          onClick={() => endGame(code)}
          className="rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98]"
        >
          Show results
        </button>
      </div>
    </div>
  )
}

/* ---------------- Results ---------------- */

function Results({
  room,
  uid,
  isHost,
  code,
  onExit,
}: {
  room: Room
  uid: string
  isHost: boolean
  code: string
  onExit: () => void
}) {
  const ranked = (room.players ? Object.entries(room.players) : [])
    .map(([id, p]) => ({ id, ...p }))
    .filter((p) => p.state === 'stopped')
    .sort((a, b) => (a.errorMs ?? Infinity) - (b.errorMs ?? Infinity))

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="text-center">
        <h2 className="text-2xl font-black">Results</h2>
        <p className="mt-1 text-sm text-white/50">Target {fmtTarget(room.meta.targetMs)} · closest wins</p>
      </div>

      <div className="flex flex-col gap-2">
        {ranked.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
              i === 0 ? 'border-emerald-400/40 bg-emerald-400/10' : 'border-white/10 bg-white/5'
            } ${p.id === uid ? 'ring-1 ring-indigo-400/50' : ''}`}
          >
            <div className="flex items-center gap-3">
              <span className="w-5 text-center font-black text-white/40">{i === 0 ? '🏆' : i + 1}</span>
              <span className="font-semibold">{p.name}</span>
            </div>
            <div className="text-right">
              <div className="font-bold tabular-nums">{toSec(p.resultMs ?? 0)}s</div>
              <div className="text-[11px] text-white/40">off by {toSec(p.errorMs ?? 0)}s</div>
            </div>
          </div>
        ))}
        {ranked.length === 0 && (
          <p className="text-center text-sm text-white/40">No finished players.</p>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {isHost && (
          <button
            onClick={() => rematch(code)}
            className="rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98]"
          >
            Rematch
          </button>
        )}
        <button
          onClick={onExit}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white/80 transition active:scale-[0.98]"
        >
          Leave game
        </button>
      </div>
    </div>
  )
}

/* ---------------- Copy code button ---------------- */

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={copy}
      aria-label={copied ? 'Copied' : 'Copy code'}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/70 transition active:scale-95"
    >
      {copied ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34d36a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  )
}
