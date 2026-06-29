import { CanvasTexture, SRGBColorSpace, LinearFilter } from 'three'
import type { Project } from '../ui/content'

// Procedural, stylised "render" thumbnails drawn to a 2D canvas — one per
// discipline — so the Work gallery reads as a wall of renders without any external
// image files. Drop a real image in /public/work/ + set project.image to override
// (handled in WorkSlabs / the case panel).

const W = 768
const H = 512
const ACCENT = 'rgba(232,163,61,'

// Tiny deterministic PRNG so each slab is stable across reloads.
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

function backdrop(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#080809'
  ctx.fillRect(0, 0, W, H)
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#0d0c10')
  g.addColorStop(1, '#070708')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function vignette(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.25, W / 2, H * 0.5, H * 0.9)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, 'rgba(0,0,0,0.72)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)
}

function product(ctx: CanvasRenderingContext2D): void {
  // A glossy dark sphere with a sodium rim — a fragrance-bottle stand-in.
  const cx = W * 0.52
  const cy = H * 0.5
  const r = H * 0.3
  const body = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r)
  body.addColorStop(0, '#23202a')
  body.addColorStop(0.6, '#100f15')
  body.addColorStop(1, '#070708')
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  // rim
  ctx.lineWidth = 3
  ctx.strokeStyle = ACCENT + '0.85)'
  ctx.beginPath()
  ctx.arc(cx, cy, r - 1, Math.PI * 0.7, Math.PI * 1.5)
  ctx.stroke()
  // specular streak
  ctx.fillStyle = 'rgba(255,240,220,0.5)'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.35, cy - r * 0.3, r * 0.06, r * 0.22, -0.4, 0, Math.PI * 2)
  ctx.fill()
  // floor reflection
  const fg = ctx.createLinearGradient(0, cy + r, 0, H)
  fg.addColorStop(0, 'rgba(232,163,61,0.08)')
  fg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = fg
  ctx.fillRect(0, cy + r * 0.6, W, H)
}

function archviz(ctx: CanvasRenderingContext2D, rand: () => number): void {
  // Skyline of dark towers, a low warm horizon, scattered lit windows.
  const horizon = H * 0.62
  const hg = ctx.createLinearGradient(0, horizon - 80, 0, horizon)
  hg.addColorStop(0, 'rgba(0,0,0,0)')
  hg.addColorStop(1, 'rgba(232,163,61,0.16)')
  ctx.fillStyle = hg
  ctx.fillRect(0, horizon - 80, W, 80)
  let x = 0
  while (x < W) {
    const bw = 26 + rand() * 60
    const bh = 60 + rand() * 230
    ctx.fillStyle = '#0c0b0f'
    ctx.fillRect(x, horizon - bh, bw, bh)
    ctx.strokeStyle = 'rgba(232,163,61,0.08)'
    ctx.strokeRect(x + 0.5, horizon - bh + 0.5, bw, bh)
    for (let i = 0; i < bh / 22; i++) {
      if (rand() > 0.78) {
        ctx.fillStyle = ACCENT + (0.4 + rand() * 0.5) + ')'
        ctx.fillRect(x + 6 + rand() * (bw - 12), horizon - bh + 8 + i * 22, 4, 5)
      }
    }
    x += bw + 6
  }
  ctx.fillStyle = '#050506'
  ctx.fillRect(0, horizon, W, H - horizon)
}

function cinematic(ctx: CanvasRenderingContext2D, rand: () => number): void {
  // A volumetric light shaft cutting across a dark void.
  ctx.save()
  const grad = ctx.createLinearGradient(W * 0.2, 0, W * 0.7, H)
  grad.addColorStop(0, 'rgba(232,163,61,0.22)')
  grad.addColorStop(0.5, 'rgba(232,163,61,0.05)')
  grad.addColorStop(1, 'rgba(232,163,61,0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.moveTo(W * 0.28, 0)
  ctx.lineTo(W * 0.46, 0)
  ctx.lineTo(W * 0.86, H)
  ctx.lineTo(W * 0.5, H)
  ctx.closePath()
  ctx.fill()
  // silhouette form
  ctx.fillStyle = '#0a090d'
  ctx.beginPath()
  ctx.ellipse(W * 0.5, H * 0.62, W * 0.13, H * 0.3, 0, 0, Math.PI * 2)
  ctx.fill()
  // dust motes
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = ACCENT + (rand() * 0.4) + ')'
    ctx.fillRect(W * 0.3 + rand() * W * 0.4, rand() * H, 1.5, 1.5)
  }
  ctx.restore()
}

function realtime(ctx: CanvasRenderingContext2D): void {
  // A perspective grid converging on a glowing slab — the WebGL stand-in.
  const cx = W / 2
  const horizon = H * 0.5
  ctx.strokeStyle = 'rgba(232,163,61,0.16)'
  ctx.lineWidth = 1
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath()
    ctx.moveTo(cx + i * 14, horizon)
    ctx.lineTo(cx + i * 120, H)
    ctx.stroke()
  }
  for (let i = 1; i <= 8; i++) {
    const y = horizon + Math.pow(i / 8, 2) * (H - horizon)
    ctx.globalAlpha = 1 - i / 10
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(W, y)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  // glowing slab
  const g = ctx.createLinearGradient(0, horizon - 120, 0, horizon)
  g.addColorStop(0, 'rgba(232,163,61,0.0)')
  g.addColorStop(1, 'rgba(232,163,61,0.5)')
  ctx.fillStyle = '#0c0b10'
  roundRect(ctx, cx - 38, horizon - 130, 76, 120, 10)
  ctx.fill()
  ctx.fillStyle = g
  ctx.fillRect(cx - 40, horizon - 132, 4, 124)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function caption(ctx: CanvasRenderingContext2D, p: Project): void {
  ctx.fillStyle = 'rgba(236,233,228,0.9)'
  ctx.font = '500 22px Georgia, serif'
  ctx.fillText(p.title, 28, H - 46)
  ctx.fillStyle = 'rgba(232,163,61,0.9)'
  ctx.font = '600 12px system-ui, sans-serif'
  ctx.fillText(p.discipline.toUpperCase() + '  ·  ' + p.year, 28, H - 26)
}

const DRAW: Record<string, (ctx: CanvasRenderingContext2D, rand: () => number) => void> = {
  'Product rendering': (ctx) => product(ctx),
  'Architectural visualisation': (ctx, rand) => archviz(ctx, rand),
  'Cinematic CGI': (ctx, rand) => cinematic(ctx, rand),
  'Real-time / WebGL': (ctx) => realtime(ctx),
}

export function makeRenderTexture(p: Project, seed: number): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  const rand = rng(seed * 9301 + 49297)

  backdrop(ctx)
  ;(DRAW[p.discipline] ?? product)(ctx, rand)
  vignette(ctx)
  // thin frame
  ctx.strokeStyle = 'rgba(236,233,228,0.1)'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, W - 2, H - 2)
  caption(ctx, p)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.minFilter = LinearFilter
  tex.magFilter = LinearFilter
  tex.anisotropy = 4
  return tex
}
