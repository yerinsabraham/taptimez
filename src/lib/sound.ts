/**
 * Game feedback (sound + vibration), synthesized with the Web Audio API.
 * Arcade-style: one consistent SQUARE-wave timbre, bright high notes that jump
 * UP on press, with a touch of echo for that "let's go!" feel.
 *
 *  - START: a quick two-note jump up + the running tone.
 *  - while running: a bright square tone with a gentle pulse.
 *  - STOP: a quick two-note step down.
 *  - PERFECT: a rising fanfare.
 *
 * Prefs (localStorage): sound on/off (default on), volume 0..1 (default 0.6),
 * vibration on/off (default on).
 */

const SOUND_KEY = 'taptimez:sound'
const VOL_KEY = 'taptimez:volume'
const VIB_KEY = 'taptimez:vibrate'

let ctx: AudioContext | null = null
let graph: { master: GainNode; delay: DelayNode } | null = null
let tone: { osc: OscillatorNode; trem: OscillatorNode; amp: GainNode } | null = null

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
  if (graph) graph.master.gain.value = vol
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
  // 'suspended' (autoplay/inactivity) or 'interrupted' (Safari) -> wake it up.
  if (ctx.state !== 'running') void ctx.resume()
  return ctx
}

function getGraph(c: AudioContext): { master: GainNode; delay: DelayNode } {
  if (!graph) {
    const master = c.createGain()
    master.gain.value = getVolume()
    master.connect(c.destination)
    // short feedback delay for an arcade echo
    const delay = c.createDelay(0.5)
    delay.delayTime.value = 0.13
    const fb = c.createGain()
    fb.gain.value = 0.22
    delay.connect(fb)
    fb.connect(delay)
    delay.connect(master)
    graph = { master, delay }
  }
  return graph
}

let unlockBound = false
/**
 * Keep the AudioContext alive. Browsers suspend it after the tab is backgrounded,
 * the screen locks, or a period of inactivity, which silences all sound. We
 * resume it on every interaction (kept permanently) and when the tab refocuses.
 */
export function initSound(): void {
  if (typeof window === 'undefined' || unlockBound) return
  unlockBound = true
  const resume = () => {
    const c = ctx ?? getCtx()
    if (c && c.state !== 'running') void c.resume()
  }
  window.addEventListener('pointerdown', resume)
  window.addEventListener('keydown', resume)
  window.addEventListener('touchstart', resume)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resume()
  })
}

/** One bright square-wave note, optionally fed into the echo. */
function note(freq: number, atOffset: number, durMs: number, peak = 0.45, echo = true): void {
  const c = getCtx()
  if (!c) return
  const { master, delay } = getGraph(c)
  const t0 = c.currentTime + atOffset
  const t1 = t0 + durMs / 1000
  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.value = freq
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 3600 // tame the harsh upper harmonics
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t1)
  osc.connect(lp)
  lp.connect(g)
  g.connect(master)
  if (echo) g.connect(delay)
  osc.start(t0)
  osc.stop(t1 + 0.02)
}

/* ---------------- public sounds ---------------- */

/** Quick upward two-note jump on START. */
export function clickStart(): void {
  if (!isSoundEnabled()) return
  note(988, 0, 55, 0.42)
  note(1480, 0.05, 80, 0.5)
}

/** Quick downward two-note step on STOP. */
export function clickStop(): void {
  if (!isSoundEnabled()) return
  note(1320, 0, 55, 0.42)
  note(880, 0.05, 90, 0.5)
}

/** Rising fanfare for a perfect score. */
export function playPerfect(): void {
  if (!isSoundEnabled()) return
  ;[784, 988, 1318, 1568].forEach((f, i) => note(f, i * 0.085, 120, 0.5))
  note(2093, 4 * 0.085, 220, 0.42)
}

/** Begin the lively running tone (bright square + gentle pulse). */
export function startTone(): void {
  if (!isSoundEnabled()) return
  const c = getCtx()
  if (!c) return
  stopTone()
  const { master } = getGraph(c)
  const now = c.currentTime

  const osc = c.createOscillator()
  osc.type = 'square'
  osc.frequency.value = 988 // bright, high

  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 3200

  // gentle tremolo for energy (no warble)
  const amp = c.createGain()
  amp.gain.setValueAtTime(0.0001, now)
  amp.gain.exponentialRampToValueAtTime(0.15, now + 0.03)
  const trem = c.createOscillator()
  trem.type = 'sine'
  trem.frequency.value = 7
  const tremDepth = c.createGain()
  tremDepth.gain.value = 0.045
  trem.connect(tremDepth)
  tremDepth.connect(amp.gain)

  osc.connect(lp)
  lp.connect(amp)
  amp.connect(master)
  osc.start(now)
  trem.start(now)
  tone = { osc, trem, amp }
}

/** End the running tone with a quick fade. */
export function stopTone(): void {
  if (!ctx || !tone) return
  const { osc, trem, amp } = tone
  const now = ctx.currentTime
  try {
    amp.gain.cancelScheduledValues(now)
    amp.gain.setValueAtTime(Math.max(0.0001, amp.gain.value), now)
    amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.06)
    osc.stop(now + 0.09)
    trem.stop(now + 0.09)
  } catch {
    /* already stopped */
  }
  tone = null
}

/* ---------------- vibration ---------------- */

/** True only if this browser exposes the Vibration API (Android Chrome/Firefox). */
export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

function vibrate(pattern: number | number[]): void {
  if (!isVibrationEnabled() || !isVibrationSupported()) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* unsupported */
  }
}

/** Fire a buzz regardless of the pref, to confirm support when toggling on. */
export function buzzTest(): void {
  if (!isVibrationSupported()) return
  try {
    navigator.vibrate(60)
  } catch {
    /* ignore */
  }
}

/** Sound + vibration for a START tap. */
export function feedbackStart(): void {
  clickStart()
  vibrate(40)
}

/** Sound + vibration for a STOP tap. */
export function feedbackStop(): void {
  clickStop()
  vibrate([30, 50, 30])
}

/** Celebration sound + vibration for a perfect score. */
export function feedbackPerfect(): void {
  playPerfect()
  vibrate([40, 40, 40, 40, 80])
}
