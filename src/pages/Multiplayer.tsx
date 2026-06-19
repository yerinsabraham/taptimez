import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import TapButton from '../components/TapButton.tsx'
import Clock from '../components/Clock.tsx'
import TargetStepper from '../components/TargetStepper.tsx'
import Splash from '../components/Splash.tsx'
import { toSec } from '../lib/game.ts'
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

export default function Multiplayer({ role, onExit }: { role: Role; onExit: () => void }) {
  const { user, profile } = useAuth()
  const [code, setCode] = useState<string | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [offset, setOffset] = useState(0)

  // Subscribe to the room + server clock offset once we have a code.
  useEffect(() => {
    if (!code) return
    const unsubRoom = subscribeRoom(code, setRoom)
    const unsubOffset = subscribeServerOffset(setOffset)
    return () => {
      unsubRoom()
      unsubOffset()
    }
  }, [code])

  // Leave the room when we unmount.
  const uid = user?.uid
  useEffect(() => {
    return () => {
      if (code && uid) leaveRoom(code, uid).catch(() => {})
    }
  }, [code, uid])

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

  if (!user || !profile) return null
  const name = profile.username

  if (!code) {
    return (
      <Entry
        role={role}
        onExit={onExit}
        onCreate={(targetMs) =>
          createRoom(user.uid, name, role, targetMs).then(setCode)
        }
        onJoin={(c) => joinRoom(c, user.uid, name, role).then(() => setCode(c))}
      />
    )
  }

  if (!room) return <Splash />

  const status = room.meta?.status
  const isHost = room.meta?.hostUid === user.uid

  if (status === 'done') {
    return <Results room={room} uid={user.uid} isHost={isHost} code={code} onExit={onExit} />
  }
  if (status === 'playing') {
    return role === 'player' ? (
      <PlayerGame room={room} uid={user.uid} code={code} />
    ) : (
      <TimekeeperGame room={room} code={code} offset={offset} />
    )
  }
  return <Lobby room={room} code={code} isHost={isHost} onStart={() => startGame(code)} onExit={onExit} />
}

/* ---------------- Entry: create or join ---------------- */

function Entry({
  role,
  onCreate,
  onJoin,
  onExit,
}: {
  role: Role
  onCreate: (targetMs: number) => Promise<void>
  onJoin: (code: string) => Promise<void>
  onExit: () => void
}) {
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [target, setTarget] = useState(5000)
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
            : 'Create a game or join a friend with a code.'}
        </p>
      </div>

      <div className="flex gap-2 rounded-full border border-white/10 bg-white/5 p-1">
        {(['create', 'join'] as const).map((t) => (
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

      {tab === 'create' ? (
        <div className="flex flex-col items-center gap-5">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Target time</p>
          <TargetStepper targetMs={target} onChange={setTarget} />
          <button
            disabled={busy}
            onClick={() => run(() => onCreate(target))}
            className="w-full rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create game'}
          </button>
        </div>
      ) : (
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
            onClick={() => run(() => onJoin(joinCode.trim()))}
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
        <p className="mt-1 text-5xl font-black tracking-[0.3em] text-emerald-400">{code}</p>
        <p className="mt-2 text-sm text-white/50">
          Target {toSec(room.meta.targetMs)}s · share the code to invite players & a timekeeper
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

function PlayerGame({ room, uid, code }: { room: Room; uid: string; code: string }) {
  const target = room.meta.targetMs
  const me = room.players?.[uid]
  const state = me?.state ?? 'idle'
  const startRef = useRef(0)

  const onPress = () => {
    if (state === 'idle') {
      startRef.current = performance.now()
      playerStart(code, uid).catch(() => {})
    } else if (state === 'running') {
      const elapsed = performance.now() - startRef.current
      const errorMs = Math.abs(Math.round(elapsed) - target)
      playerStop(code, uid, Math.round(elapsed), errorMs).catch(() => {})
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 py-6 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Target</p>
        <p className="mt-1 text-3xl font-black tabular-nums text-emerald-400">
          {toSec(target)}
          <span className="text-lg text-white/40">s</span>
        </p>
      </div>

      {state === 'stopped' ? (
        <>
          <Clock ms={me?.resultMs ?? 0} />
          <p className="text-xl font-black">Locked in! ✅</p>
          <p className="text-sm text-white/40">Waiting for results…</p>
        </>
      ) : (
        <>
          {/* No clock for the player — the timekeeper holds the time. */}
          <Clock ms={0} blank />
          <TapButton label={state === 'idle' ? 'START' : 'STOP'} onPress={onPress} />
          <p className="text-sm text-white/40">
            {state === 'idle'
              ? 'Tap START, then STOP at the target.'
              : 'Feel the time — tap STOP at the target.'}
          </p>
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

  const liveMs = (p: RoomPlayer): number => {
    if (p.state === 'running' && p.startedAt) return Math.max(0, now - p.startedAt)
    if (p.state === 'stopped' && p.resultMs != null) return p.resultMs
    return 0
  }

  return (
    <div className="flex flex-1 flex-col gap-5 px-6 py-6">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/40">Timekeeper · {code}</p>
        <p className="mt-1 text-sm text-white/50">Target {toSec(room.meta.targetMs)}s</p>
      </div>

      <div className="flex flex-col gap-4">
        {players.map(([id, p]) => (
          <div key={id} className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex w-full items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs text-white/40">
                {p.state === 'running' ? 'running…' : p.state === 'stopped' ? `off by ${toSec(p.errorMs ?? 0)}s` : 'ready'}
              </span>
            </div>
            <Clock ms={liveMs(p)} blank={p.state === 'idle'} />
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-center text-sm text-white/40">No players in this game.</p>
        )}
      </div>

      <button
        onClick={() => endGame(code)}
        className="mt-auto rounded-xl bg-indigo-500 px-4 py-3 font-bold text-white transition active:scale-[0.98]"
      >
        Show results
      </button>
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
        <p className="mt-1 text-sm text-white/50">Target {toSec(room.meta.targetMs)}s · closest wins</p>
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
