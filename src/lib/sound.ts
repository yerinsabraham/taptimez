/**
 * Game sounds, synthesized with the Web Audio API — no audio files needed.
 *  - START: a short high click, then a sustained ~1 kHz "TV test tone".
 *  - while running: the tone holds until STOP.
 *  - STOP: the tone ends with a short lower blip.
 *
 * Preference is stored in localStorage (default ON).
 */

const PREF_KEY = 'taptimez:sound'

let ctx: AudioContext | null = null
let toneOsc: OscillatorNode | null = null
let toneGain: GainNode | null = null

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? 'on' : 'off')
  } catch {
    /* ignore */
  }
  if (!on) stopTone()
}

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

/** A short percussive beep. */
function blip(freq: number, durationMs: number, type: OscillatorType = 'square', peak = 0.22): void {
  const c = getCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  osc.connect(gain)
  gain.connect(c.destination)
  const now = c.currentTime
  const end = now + durationMs / 1000
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)
  osc.start(now)
  osc.stop(end + 0.02)
}

/** High click played when the player taps START. */
export function clickStart(): void {
  if (!isSoundEnabled()) return
  blip(1200, 90, 'square')
}

/** Lower blip played when the player taps STOP. */
export function clickStop(): void {
  if (!isSoundEnabled()) return
  blip(520, 130, 'square')
}

/** Begin the sustained 1 kHz test tone (held while the timer runs). */
export function startTone(): void {
  if (!isSoundEnabled()) return
  const c = getCtx()
  if (!c) return
  stopTone()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = 1000 // classic SMPTE 1 kHz test tone
  osc.connect(gain)
  gain.connect(c.destination)
  const now = c.currentTime
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.12, now + 0.03)
  osc.start(now)
  toneOsc = osc
  toneGain = gain
}

/** End the sustained tone (with a quick fade so it doesn't click). */
export function stopTone(): void {
  if (!ctx || !toneOsc || !toneGain) return
  const now = ctx.currentTime
  try {
    toneGain.gain.cancelScheduledValues(now)
    toneGain.gain.setValueAtTime(Math.max(0.0001, toneGain.gain.value), now)
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)
    toneOsc.stop(now + 0.08)
  } catch {
    /* already stopped */
  }
  toneOsc = null
  toneGain = null
}
