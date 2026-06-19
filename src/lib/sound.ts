/**
 * Game feedback (sound + vibration), synthesized with the Web Audio API.
 *  - START: a playful upward "coin" chirp + a buzz, then a lively running tone.
 *  - while running: a bright tone with vibrato + tremolo (gamey, not a flatline).
 *  - STOP: a friendly downward chirp + a buzz.
 *
 * Prefs (localStorage): sound on/off (default on), volume 0..1 (default 0.6),
 * vibration on/off (default on).
 */

const SOUND_KEY = 'taptimez:sound'
const VOL_KEY = 'taptimez:volume'
const VIB_KEY = 'taptimez:vibrate'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let tone: { osc: OscillatorNode; vib: OscillatorNode; trem: OscillatorNode; amp: GainNode } | null =
  null

/* ---------------- preferences ---------------- */

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
  if (!on) stopTone()
}

export function getVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(VOL_KEY) ?? '')
    return Number.isNaN(v) ? 0.6 : Math.min(1, Math.max(0, v))
  } catch {
    return 0.6
  }
}

export function setVolume(v: number): void {
  const vol = Math.min(1, Math.max(0, v))
  try {
    localStorage.setItem(VOL_KEY, String(vol))
  } catch {
    /* ignore */
  }
  if (master) master.gain.value = vol
}

export function isVibrationEnabled(): boolean {
  try {
    return localStorage.getItem(VIB_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setVibrationEnabled(on: boolean): void {
  try {
    localStorage.setItem(VIB_KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
}

/* ---------------- audio plumbing ---------------- */

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function getMaster(c: AudioContext): GainNode {
  if (!master) {
    master = c.createGain()
    master.gain.value = getVolume()
    master.connect(c.destination)
  }
  return master
}

let unlockBound = false
/** Resume the AudioContext on the first user gesture so the first beep plays. */
export function initSound(): void {
  if (typeof window === 'undefined' || unlockBound) return
  unlockBound = true
  const unlock = () => {
    const c = getCtx()
    if (!c) return
    if (c.state !== 'running') {
      void c.resume()
      return
    }
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
  window.addEventListener('touchstart', unlock)
}

/** A short pitch-sweep "chirp" (coin-style), routed through the volume master. */
function chirp(fromHz: number, toHz: number, durationMs: number, peak = 0.5): void {
  const c = getCtx()
  if (!c) return
  const out = getMaster(c)
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'triangle'
  const now = c.currentTime
  const end = now + durationMs / 1000
  osc.frequency.setValueAtTime(fromHz, now)
  osc.frequency.exponentialRampToValueAtTime(toHz, end)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  osc.connect(gain)
  gain.connect(out)
  osc.start(now)
  osc.stop(end + 0.02)
}

/* ---------------- public sounds ---------------- */

/** Playful upward chirp when the player taps START. */
export function clickStart(): void {
  if (!isSoundEnabled()) return
  chirp(660, 1320, 110)
}

/** Friendly downward chirp when the player taps STOP. */
export function clickStop(): void {
  if (!isSoundEnabled()) return
  chirp(990, 520, 150)
}

/** Begin the lively running tone (bright + vibrato + tremolo). */
export function startTone(): void {
  if (!isSoundEnabled()) return
  const c = getCtx()
  if (!c) return
  stopTone()
  const out = getMaster(c)
  const now = c.currentTime

  const osc = c.createOscillator()
  osc.type = 'triangle'
  osc.frequency.value = 784 // bright, playful

  // vibrato: wobble the pitch so it feels alive (not a flat EKG tone)
  const vib = c.createOscillator()
  vib.type = 'sine'
  vib.frequency.value = 6.5
  const vibDepth = c.createGain()
  vibDepth.gain.value = 16
  vib.connect(vibDepth)
  vibDepth.connect(osc.frequency)

  // tremolo: gentle amplitude pulse for a gamey rhythm
  const amp = c.createGain()
  amp.gain.setValueAtTime(0.0001, now)
  amp.gain.exponentialRampToValueAtTime(0.34, now + 0.04)
  const trem = c.createOscillator()
  trem.type = 'sine'
  trem.frequency.value = 9
  const tremDepth = c.createGain()
  tremDepth.gain.value = 0.12
  trem.connect(tremDepth)
  tremDepth.connect(amp.gain)

  osc.connect(amp)
  amp.connect(out)
  osc.start(now)
  vib.start(now)
  trem.start(now)
  tone = { osc, vib, trem, amp }
}

/** End the running tone with a quick fade. */
export function stopTone(): void {
  if (!ctx || !tone) return
  const { osc, vib, trem, amp } = tone
  const now = ctx.currentTime
  try {
    amp.gain.cancelScheduledValues(now)
    amp.gain.setValueAtTime(Math.max(0.0001, amp.gain.value), now)
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)
    osc.stop(now + 0.09)
    vib.stop(now + 0.09)
    trem.stop(now + 0.09)
  } catch {
    /* already stopped */
  }
  tone = null
}

/* ---------------- vibration ---------------- */

function vibrate(pattern: number | number[]): void {
  if (!isVibrationEnabled()) return
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* unsupported */
  }
}

/** Sound + vibration for a START tap. */
export function feedbackStart(): void {
  clickStart()
  vibrate(30)
}

/** Sound + vibration for a STOP tap. */
export function feedbackStop(): void {
  clickStop()
  vibrate([25, 35, 25])
}
