import './style.css'
import { detectQuality } from './core/tier'
import { Experience } from './core/Experience'

// Boot: profile the device, then build the experience. A short async wait on
// detect-gpu lets us avoid initialising heavy passes on weak hardware. If WebGL is
// unavailable or fails, fall back to the CSS-only cinematic backdrop (.no-webgl).

async function boot(): Promise<void> {
  const yearEl = document.getElementById('year')
  if (yearEl) yearEl.textContent = String(new Date().getFullYear())

  const canvas = document.querySelector<HTMLCanvasElement>('#webgl')
  if (!canvas) return

  try {
    const quality = await detectQuality()
    document.documentElement.dataset.tier = quality.level
    document.documentElement.dataset.reducedMotion = String(quality.reducedMotion)
    new Experience(canvas, quality)
  } catch (err) {
    console.warn('[VANTA] WebGL unavailable — falling back to static backdrop.', err)
    document.body.classList.add('no-webgl')
  }
}

void boot()
