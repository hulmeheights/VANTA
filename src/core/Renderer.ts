import {
  WebGLRenderer,
  PCFSoftShadowMap,
  NoToneMapping,
  SRGBColorSpace,
} from 'three'
import { palette } from './palette'
import type { Quality } from './tier'

// WebGLRenderer setup.
//
// Tone mapping is deliberately OFF here — it happens at the end of the
// postprocessing chain (the grade pass) so the whole frame, including bloom and
// fog, is graded together as one film still. Antialiasing is likewise handled by
// the composer's multisampling once post is wired; we leave the renderer's own
// MSAA on as a sane default for the pre-composer phase.

export function createRenderer(canvas: HTMLCanvasElement, quality: Quality): WebGLRenderer {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
    stencil: false,
    depth: true,
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.dprCap))
  renderer.setClearColor(palette.bg, 1)
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = NoToneMapping

  if (quality.softShadows) {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = PCFSoftShadowMap
    renderer.shadowMap.autoUpdate = true
  }

  return renderer
}
