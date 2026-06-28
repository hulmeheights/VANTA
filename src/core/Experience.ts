import { Scene, PerspectiveCamera, Color, FogExp2, WebGLRenderer } from 'three'
import { createRenderer } from './Renderer'
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
  private raf = 0

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

    window.addEventListener('pointermove', this.onPointer)
    this.resize()
    window.addEventListener('resize', this.resize)

    this.start()
  }

  private onPointer = (e: PointerEvent): void => {
    this.pointerX = (e.clientX / window.innerWidth) * 2 - 1
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

      this.post.render(this.time.deltaS)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('pointermove', this.onPointer)
    this.scroll.dispose()
    this.renderer.dispose()
  }
}
