import { useState } from 'react'
import { useAuth } from '../lib/auth.tsx'
import { logOut } from '../lib/auth-actions.ts'
import {
  buzzTest,
  getVolume,
  isSoundEnabled,
  isVibrationEnabled,
  isVibrationSupported,
  setSoundEnabled,
  setVibrationEnabled,
  setVolume,
} from '../lib/sound.ts'

function fmtMs(ms: number | null): string {
  return ms == null ? '--' : `${(ms / 1000).toFixed(3)}s`
}

export default function Profile() {
  const { user, profile } = useAuth()
  const [soundOn, setSoundOn] = useState(isSoundEnabled)
  const [volume, setVol] = useState(getVolume)
  const [vibrateOn, setVibrateOn] = useState(isVibrationEnabled)
  const vibrationSupported = isVibrationSupported()
  if (!profile) return null

  const stats = [
    { label: 'Perfect scores', value: String(profile.perfectCount ?? 0) },
    { label: 'Closest ever', value: profile.bestErrorMs == null ? '--' : `±${fmtMs(profile.bestErrorMs)}` },
    { label: 'Best-hit time', value: fmtMs(profile.bestElapsedMs) },
    { label: 'Attempts', value: String(profile.totalAttempts) },
  ]

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        {profile.photoURL ? (
          <img src={profile.photoURL} alt="" className="h-20 w-20 rounded-full" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-2xl font-black text-indigo-300">
            {profile.username.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 className="text-2xl font-bold">{profile.username}</h2>
        <p className="text-sm text-white/40">{user?.email}</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
              <div className="text-xl font-bold">{s.value}</div>
              <div className="mt-1 text-xs text-white/40">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="px-1 text-[11px] leading-relaxed text-white/35">
          Closest ever is the smallest gap you've ever hit (only changes when you beat it).
          Best-hit time is the time you stopped on that closest attempt.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Sound</div>
            <div className="text-xs text-white/40">Click and tone while you play</div>
          </div>
          <Switch
            on={soundOn}
            onChange={(v) => {
              setSoundEnabled(v)
              setSoundOn(v)
            }}
          />
        </div>

        <div className={`flex items-center gap-3 ${soundOn ? '' : 'opacity-40'}`}>
          <span className="text-xs text-white/40">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            disabled={!soundOn}
            onChange={(e) => {
              const v = Number(e.target.value)
              setVolume(v)
              setVol(v)
            }}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/15 accent-emerald-400"
          />
          <span className="w-8 text-right text-xs tabular-nums text-white/40">
            {Math.round(volume * 100)}
          </span>
        </div>

        <div className={`flex items-center justify-between ${vibrationSupported ? '' : 'opacity-50'}`}>
          <div>
            <div className="font-semibold">Vibration</div>
            <div className="text-xs text-white/40">
              {vibrationSupported
                ? 'Buzz on each tap'
                : 'Not supported on this device or browser'}
            </div>
          </div>
          <Switch
            on={vibrateOn && vibrationSupported}
            disabled={!vibrationSupported}
            onChange={(v) => {
              setVibrationEnabled(v)
              setVibrateOn(v)
              if (v) buzzTest()
            }}
          />
        </div>
      </div>

      <button
        onClick={() => logOut()}
        className="mt-auto rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white/80 transition active:scale-[0.98]"
      >
        Sign out
      </button>
    </div>
  )
}

function Switch({
  on,
  onChange,
  disabled,
}: {
  on: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition disabled:cursor-not-allowed ${on ? 'bg-emerald-500' : 'bg-white/15'}`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on ? 'left-6' : 'left-1'}`}
      />
    </button>
  )
}
