import { Scene, PerspectiveCamera, Color, FogExp2, WebGLRenderer } from 'three'
import { createRenderer } from './Renderer'
import { Sizes } from './Sizes'
import { Time } from './Time'
import { palette } from './palette'
import type { Quality } from './tier'
import { World } from '../world/World'

// Top-level orchestrator. Owns the renderer, the single persistent scene, the one
// travelling camera, the world (scene graph) and the render loop. Everything else
// hangs off this. Postprocessing and the scroll-camera rig are added in later steps.

export class Experience {
  readonly sizes = new Sizes()
  readonly time = new Time()
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  readonly renderer: WebGLRenderer
  readonly world: World

  private raf = 0

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly quality: Quality,
  ) {
    this.renderer = createRenderer(canvas, quality)

    this.scene.background = new Color(palette.bg)
    // FogExp2 is the base atmosphere; drifting noise billboards (World/Fog) add the churn.
    this.scene.fog = new FogExp2(palette.bg, 0.058)

    this.camera = new PerspectiveCamera(38, this.sizes.aspect, 0.1, 200)
    this.camera.position.set(0, 0.6, 9)
    this.camera.lookAt(0, 0.2, 0)

    this.world = new World(this)

    this.resize()
    window.addEventListener('resize', this.resize)

    this.start()
  }

  private resize = (): void => {
    this.sizes.update()
    this.camera.aspect = this.sizes.aspect
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(this.sizes.width, this.sizes.height)
  }

  private start(): void {
    const loop = (): void => {
      this.time.tick()
      this.world.update(this.time)
      this.renderer.render(this.scene, this.camera)
      this.raf = requestAnimationFrame(loop)
    }
    this.raf = requestAnimationFrame(loop)
  }

  dispose(): void {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.resize)
    this.renderer.dispose()
  }
}
