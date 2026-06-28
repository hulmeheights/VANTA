import {
  EffectComposer,
  RenderPass,
  EffectPass,
  SelectiveBloomEffect,
  DepthOfFieldEffect,
  ToneMappingEffect,
  ToneMappingMode,
  ChromaticAberrationEffect,
} from 'postprocessing'
import { HalfFloatType, Vector2, type Vector3, type WebGLRenderer, type Scene, type PerspectiveCamera, type Object3D } from 'three'
import { GradeEffect } from './GradeEffect'
import type { Quality } from '../core/tier'

// The postprocessing chain. Half-float buffers throughout (no banding in a 90%-black
// scene). Bloom is selective so only the monolith's sodium rim blooms — never the UI
// or, later, the work-slab renders. DOF focus is driven by scroll progress (no depth
// readback). ACES tonemap + the custom film grade close it out. Tasteful, not a mess.

export class Post {
  readonly composer: EffectComposer
  readonly bloom?: SelectiveBloomEffect
  readonly dof?: DepthOfFieldEffect
  readonly grade: GradeEffect

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
    quality: Quality,
    bloomSelection: Object3D[],
  ) {
    this.composer = new EffectComposer(renderer, {
      frameBufferType: HalfFloatType,
      multisampling: quality.level === 'high' ? 4 : quality.level === 'medium' ? 2 : 0,
    })
    this.composer.addPass(new RenderPass(scene, camera))

    // ---- DOF (own pass; convolution) ----
    if (quality.dof) {
      this.dof = new DepthOfFieldEffect(camera, {
        worldFocusDistance: 8.5,
        worldFocusRange: 7,
        bokehScale: 2.4,
        resolutionScale: 0.5,
      })
      this.composer.addPass(new EffectPass(camera, this.dof))
    }

    // ---- Mergeable chain: bloom + tonemap + grade + chromatic aberration ----
    const effects = []

    if (quality.bloom) {
      this.bloom = new SelectiveBloomEffect(scene, camera, {
        intensity: 1.25,
        luminanceThreshold: 0.45,
        luminanceSmoothing: 0.4,
        mipmapBlur: true,
        radius: 0.72,
      })
      this.bloom.inverted = false
      for (const obj of bloomSelection) this.bloom.selection.add(obj)
      effects.push(this.bloom)
    }

    effects.push(new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC }))
    this.grade = new GradeEffect({ grain: quality.grain ? 0.032 : 0, vignette: 0.72 })
    effects.push(this.grade)

    if (quality.chromaticAberration) {
      effects.push(
        new ChromaticAberrationEffect({
          offset: new Vector2(0.0009, 0.0009),
          radialModulation: true,
          modulationOffset: 0.25,
        }),
      )
    }

    this.composer.addPass(new EffectPass(camera, ...effects))
  }

  /** Focus the DOF on a live world-space target (the rig's look point / a slab). */
  setFocusTarget(target: Vector3): void {
    if (this.dof) this.dof.target = target
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height)
  }

  render(deltaSeconds: number): void {
    this.composer.render(deltaSeconds)
  }
}
