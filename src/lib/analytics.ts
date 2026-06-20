import { app } from './firebase.ts'

/**
 * Lightweight analytics wrapper. Firebase Analytics is loaded dynamically so it
 * stays out of the initial bundle. track() is a safe no-op until it's ready.
 */

type LogEventFn = (analytics: unknown, event: string, params?: Record<string, unknown>) => void

let analytics: unknown = null
let logEventFn: LogEventFn | null = null
let started = false

export function initAnalytics(): void {
  if (started) return
  started = true
  import('firebase/analytics')
    .then(async (mod) => {
      const ok = await mod.isSupported().catch(() => false)
      if (!ok) return
      analytics = mod.getAnalytics(app)
      logEventFn = mod.logEvent as unknown as LogEventFn
    })
    .catch(() => {
      /* analytics unavailable; ignore */
    })
}

export function track(event: string, params?: Record<string, unknown>): void {
  try {
    if (analytics && logEventFn) logEventFn(analytics, event, params)
  } catch {
    /* never let analytics break the app */
  }
}
