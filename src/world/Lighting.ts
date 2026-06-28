import {
  DirectionalLight,
  Group,
  AmbientLight,
  type Scene,
} from 'three'
import { palette } from '../core/palette'
import type { Quality } from '../core/tier'

// One key/rim light — the only chromatic event in the world — placed low and
// raking so ~90% of the monolith stays in shadow. Mounted on a "boom" group so the
// scroll-camera rig and a damped cursor vector can swing its azimuth without the
// object itself moving. A whisper of cool ambient keeps the shadow side from
// crushing to pure black on cheaper displays.

export class Lighting {
  readonly boom = new Group()
  readonly key: DirectionalLight
  private readonly ambient: AmbientLight

  /** Base azimuth (radians) the boom rotates around Y. */
  azimuth = -0.5

  constructor(quality: Quality, scene: Scene) {
    this.key = new DirectionalLight(palette.accent, 5.5)
    this.key.position.set(-3.4, 2.2, 3.2)

    if (quality.softShadows) {
      this.key.castShadow = true
      this.key.shadow.mapSize.setScalar(quality.shadowMapSize)
      const cam = this.key.shadow.camera
      cam.near = 0.5
      cam.far = 22
      cam.left = -5
      cam.right = 5
      cam.top = 6
      cam.bottom = -6
      cam.updateProjectionMatrix()
      this.key.shadow.bias = -0.0006
      this.key.shadow.normalBias = 0.02
      this.key.shadow.radius = 4
    }

    this.ambient = new AmbientLight(0x1a1c24, 0.35)

    this.boom.add(this.key, this.key.target)
    scene.add(this.boom, this.ambient)
  }

  /** azimuthTarget: desired Y rotation of the boom; smoothing handled by caller. */
  update(azimuth: number): void {
    this.azimuth = azimuth
    this.boom.rotation.y = azimuth
  }
}
