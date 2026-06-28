// Device profiling → quality tier.
//
// No single signal is reliable, so we combine: detect-gpu's benchmarked tier,
// reduced-motion preference, coarse-pointer, device memory and core count. The
// result is a quality preset that every subsystem reads to decide what to build.
// A live frame-time monitor (see loop in Experience) can demote at runtime.

import { getGPUTier } from 'detect-gpu'

export type QualityLevel = 'high' | 'medium' | 'low'

export interface Quality {
  level: QualityLevel
  reducedMotion: boolean
  isMobile: boolean
  /** devicePixelRatio ceiling — cost scales with DPR², the single biggest lever. */
  dprCap: number
  // ---- feature switches ----
  bloom: boolean
  dof: boolean
  godrays: boolean
  chromaticAberration: boolean
  grain: boolean
  softShadows: boolean
  shadowMapSize: number
  /** monolith geometry resolution (segments per axis budget) */
  monolithDetail: number
  /** number of drifting fog billboard layers */
  fogLayers: number
  /** true → sample the camera path at discrete eased stations instead of continuous scrub */
  discreteStations: boolean
}

const PRESETS: Record<QualityLevel, Omit<Quality, 'level' | 'reducedMotion' | 'isMobile'>> = {
  high: {
    dprCap: 1.75,
    bloom: true,
    dof: true,
    godrays: true,
    chromaticAberration: true,
    grain: true,
    softShadows: true,
    shadowMapSize: 2048,
    monolithDetail: 1.0,
    fogLayers: 7,
    discreteStations: false,
  },
  medium: {
    dprCap: 1.5,
    bloom: true,
    dof: true,
    godrays: false,
    chromaticAberration: true,
    grain: true,
    softShadows: true,
    shadowMapSize: 1024,
    monolithDetail: 0.7,
    fogLayers: 5,
    discreteStations: false,
  },
  low: {
    dprCap: 1.25,
    bloom: true,
    dof: false,
    godrays: false,
    chromaticAberration: false,
    grain: true,
    softShadows: false,
    shadowMapSize: 1024,
    monolithDetail: 0.5,
    fogLayers: 3,
    discreteStations: true,
  },
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

export async function detectQuality(): Promise<Quality> {
  const params = new URLSearchParams(location.search)
  const forcedMotion = params.get('motion') // 'reduce' | 'full'
  const reducedMotion =
    forcedMotion === 'reduce'
      ? true
      : forcedMotion === 'full'
        ? false
        : matchMedia('(prefers-reduced-motion: reduce)').matches
  const coarse = matchMedia('(pointer: coarse)').matches

  // Manual override (?tier=high|medium|low) — handy for QA and as a user escape hatch.
  const forced = params.get('tier')
  if (forced === 'high' || forced === 'medium' || forced === 'low') {
    const isMobile = coarse
    return { level: forced, reducedMotion, isMobile, ...PRESETS[forced] }
  }
  const nav = navigator as Navigator & { deviceMemory?: number }
  const lowMem = typeof nav.deviceMemory === 'number' ? nav.deviceMemory <= 4 : false
  const lowCores =
    typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency <= 4 : false

  let level: QualityLevel = 'high'
  let isMobile = coarse

  try {
    // detect-gpu fetches a benchmark DB; race it so a slow/blocked network never stalls boot.
    const gpu = await withTimeout(getGPUTier(), 2500)
    isMobile = gpu.isMobile ?? coarse
    if (gpu.tier >= 3 && !gpu.isMobile) level = 'high'
    else if (gpu.tier === 2) level = 'medium'
    else level = 'low'
  } catch {
    // Heuristic fallback if the benchmark can't load.
    level = coarse ? 'low' : 'medium'
  }

  // Demote on corroborating weak signals.
  if (level === 'high' && (lowMem || lowCores || isMobile)) level = 'medium'
  if (level === 'medium' && isMobile && (lowMem || lowCores)) level = 'low'

  return { level, reducedMotion, isMobile, ...PRESETS[level] }
}

/** Build a one-step-lower quality preset (used by the runtime auto-degrade ladder). */
export function demote(q: Quality): Quality {
  const order: QualityLevel[] = ['high', 'medium', 'low']
  const next = order[Math.min(order.indexOf(q.level) + 1, order.length - 1)]
  return { ...q, level: next, ...PRESETS[next] }
}
