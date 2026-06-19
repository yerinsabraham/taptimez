import { fmtTarget, isPerfect, toSec } from './game.ts'

export type ShareCardData = {
  username: string
  targetMs: number
  elapsedMs: number
  errorMs: number
}

const SHARE_URL = 'https://taptimez.web.app'

/** A pasteable text link describing the result (for "Copy link"). */
export function resultShareText(d: ShareCardData): string {
  return `I hit ${toSec(d.elapsedMs)}s aiming for ${fmtTarget(d.targetMs)} on TapTimez! Can you beat it? ${SHARE_URL}`
}

/** Draws a vertical, TikTok-friendly result card onto a canvas. */
function drawCard(d: ShareCardData): HTMLCanvasElement {
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const perfect = isPerfect(d.errorMs)

  // background + soft green glow
  ctx.fillStyle = '#0a0a0f'
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 430, 40, W / 2, 430, 560)
  glow.addColorStop(0, 'rgba(34,197,94,0.22)')
  glow.addColorStop(1, 'rgba(34,197,94,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'

  // title
  ctx.fillStyle = '#ffffff'
  ctx.font = '800 72px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText('TapTimez', W / 2, 150)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '500 34px system-ui, sans-serif'
  ctx.fillText('stop the timer by feel', W / 2, 205)

  // buzzer dome
  const cx = W / 2
  const cy = 430
  const r = 150
  const dome = ctx.createRadialGradient(cx, cy, 8, cx, cy, r)
  dome.addColorStop(0, '#ffffff')
  dome.addColorStop(0.3, '#f0fff6')
  dome.addColorStop(0.62, '#5fe28f')
  dome.addColorStop(1, '#0a7c35')
  ctx.fillStyle = dome
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // big result (7-segment if available)
  ctx.fillStyle = '#3ef58c'
  ctx.font = '700 230px "DSEG7 Classic", ui-monospace, monospace'
  ctx.fillText(toSec(d.elapsedMs), W / 2, 770)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.font = '600 40px system-ui, sans-serif'
  ctx.fillText('seconds', W / 2, 825)

  // target + off by
  ctx.fillStyle = '#a5f3c0'
  ctx.font = '700 46px system-ui, sans-serif'
  ctx.fillText(`Target ${fmtTarget(d.targetMs)}   ·   off by ${toSec(d.errorMs)}s`, W / 2, 910)

  if (perfect) {
    ctx.fillStyle = '#34d36a'
    ctx.font = '900 92px system-ui, sans-serif'
    ctx.fillText('PERFECT! 🎯', W / 2, 1025)
  }

  // username
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 50px system-ui, sans-serif'
  ctx.fillText(`@${d.username}`, W / 2, perfect ? 1130 : 1080)

  // footer
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.font = '600 40px system-ui, sans-serif'
  ctx.fillText('Can you beat it?   taptimez.web.app', W / 2, 1275)

  return canvas
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no blob'))), 'image/png'),
  )
}

export type ShareOutcome = 'shared' | 'downloaded' | 'cancelled' | 'failed'

/** Shares the result card via the Web Share API, falling back to a download. */
export async function shareResult(d: ShareCardData): Promise<ShareOutcome> {
  try {
    // make sure the 7-segment font is ready so the number renders right
    if (document.fonts?.load) {
      try {
        await document.fonts.load('700 230px "DSEG7 Classic"')
      } catch {
        /* fall back to monospace */
      }
    }
    const blob = await toBlob(drawCard(d))
    const file = new File([blob], 'taptimez.png', { type: 'image/png' })
    const text = `I hit ${toSec(d.elapsedMs)}s aiming for ${fmtTarget(d.targetMs)} on TapTimez!`

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'TapTimez', text, url: SHARE_URL })
        return 'shared'
      } catch {
        return 'cancelled'
      }
    }

    // fallback: download the image
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'taptimez.png'
    a.click()
    URL.revokeObjectURL(url)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}
