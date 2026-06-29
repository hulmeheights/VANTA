import { Scene, PerspectiveCamera, Color, FogExp2, WebGLRenderer, Vector2 } from 'three'
import { createRenderer } from './Renderer'
import { openCaseById } from '../ui/sections'
import { Sizes } from './Sizes'
import { Time } from './Time'
import { palette } from './palette'
import type { Quality } from './tier'
import { World } from '../world/World'
import { Post } from '../post/Post'
import { CameraRig } from '../camera/CameraRig'
import { ScrollController } from '../camera/scroll'

// Top-level orchestrator. Owns the renderer, the single persistent scene, the one
// travelling camera, the world (scene graph), the scroll-driven camera rig and the
// render loop. Scroll writes a target progress; the loop damps toward it so the
// camera glides like a film dolly, then fans p out to the world, DOF and (later) UI.

export class Experience {
  readonly sizes = new Sizes()
  readonly time = new Time()
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  readonly renderer: WebGLRenderer
  readonly world: World
  readonly post: Post
  readonly rig: CameraRig
  readonly scroll: ScrollController

  /** Damped scroll progress driving the whole experience. */
  private progress = 0
  private pointerX = 0
  private readonly ndc = new Vector2()
  private raf = 0

  // Frame-time monitor → graceful auto-degrade ladder.
  private frames = 0
  private fpsClock = performance.now()
  private slowChecks = 0
  private degradeStep = 0

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly quality: Quality,
  ) {
    this.renderer = createRenderer(canvas, quality)

    this.scene.background = new Color(palette.bg)
    // FogExp2 is the base atmosphere; drifting noise billboards (World/Fog) add the churn.
    this.scene.fog = new FogExp2(palette.bg, 0.058)

    this.camera = new PerspectiveCamera(34, this.sizes.aspect, 0.1, 200)

    this.world = new World(this)
    this.post = new Post(this.renderer, this.scene, this.camera, quality, [this.world.monolith.mesh])

    this.rig = new CameraRig(this.camera)
    this.post.setFocusTarget(this.rig.target)
    this.rig.setProgress(0)
    this.world.setProgress(0)

    this.scroll = new ScrollController()
    ;(window as unknown as { __vantaDebug?: unknown }).__vantaDebug = () => ({
      slabs: this.world.workSlabs.debug(this.camera),
      plinths: this.world.plinths.debug(this.camera),
    })

    window.addEventListener('pointermove', this.onPointer)
    window.addEventListener('click', this.onClick)
    this.resize()
    window.addEventListener('resize', this.resize)

    this.start()
  }

  private setNdc(e: { clientX: number; clientY: number }): void {
    this.ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
  }

  private onPointer = (e: PointerEvent): void => {
    this.pointerX = (e.clientX / window.innerWidth) * 2 - 1
    // Cursor affordance over a clickable work slab (the pick self-gates to the Work beat).
    this.setNdc(e)
    document.body.style.cursor = this.world.workSlabs.pick(this.ndc, this.camera) ? 'pointer' : ''
  }

  private onClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement
    // Let the DOM list / case panel handle their own clicks.
    if (target.closest('.work__row') || target.closest('.casepanel')) return
    this.setNdc(e)
    const id = this.world.workSlabs.pick(this.ndc, this.camera)
    if (id) openCaseById(id)
  }

  private resize = (): void => {
    this.sizes.update()
    this.camera.aspect = this.sizes.aspect
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.sizes.width, this.sizes.height)
    this.post.setSize(this.sizes.width, this.sizes.height)
  }

  private start(): void {
    const loop = (): void => {
      this.time.tick()

      // Frame-rate-corrected damping toward the scroll target — buttery, decoupled.
      const k = this.quality.reducedMotion ? 1 : 1 - Math.pow(1 - 0.09, this.time.delta / 16.6)
      this.progress += (this.scroll.targetProgress - this.progress) * k

      this.rig.setProgress(this.progress)
      this.world.setProgress(this.progress)
      this.world.setPointer(this.pointerX)
      this.world.update(this.time)

      // Zero delta under reduced motion → static film grain (no shimmer).
      this.post.render(this.quality.reducedMotion ? 0 : this.time.deltaS)
      ;(window as unknown as { __vanta?: unknown }).__vanta = {
        p: +this.progress.toFixed(3),
        target: +this.scroll.targetProgress.toFixed(3),
        cam: this.camera.position.toArray().map((n) => +n.toFixed(2)),
      }
      this.monitor()
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  // Sample fps once a second; expose it and demote quality if sustained-slow.
  private monitor(): void {
    this.frames++
    const now = performance.now()
    const span = now - this.fpsClock
    if (span < 1000) return

    const fps = (this.frames * 1000) / span
    this.frames = 0
    this.fpsClock = now
    ;(window as unknown as { __vantaFps?: number }).__vantaFps = Math.round(fps)

    if (this.quality.reducedMotion) return
    this.slowChecks = fps < 45 ? this.slowChecks + 1 : 0
    if (this.slowChecks >= 2) {
      this.slowChecks = 0
      this.degrade()
    }
  }

  // Graceful ladder: drop pixel ratio first (cost scales with DPR²), then DOF.
  private degrade(): void {
    this.degradeStep++
    if (this.degradeStep === 1) {
      const dpr = Math.min(this.renderer.getPixelRatio(), 1.0)
      this.renderer.setPixelRatio(dpr)
      this.post.setSize(this.sizes.width, this.sizes.height)
      console.info(`[VANTA] perf: pixel ratio → ${dpr}`)
    } else if (this.degradeStep === 2) {
      if (this.post.disableDof()) console.info('[VANTA] perf: depth of field off')
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('pointermove', this.onPointer)
    window.removeEventListener('click', this.onClick)
    this.scroll.dispose()
    this.renderer.dispose()
  }
}
