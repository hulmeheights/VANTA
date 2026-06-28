import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PerspectiveCamera,
  Vector3,
} from 'three'
import { Lighting } from './Lighting'
import { Monolith } from './Monolith'
import { Fog } from './Fog'
import { palette } from '../core/palette'
import type { Experience } from '../core/Experience'
import type { Time } from '../core/Time'

// The persistent scene graph. Built once, never torn down — sections are reached by
// moving the camera, not by mounting/unmounting objects.

export class World {
  readonly group = new Group()
  readonly lighting: Lighting
  readonly monolith: Monolith
  readonly fog: Fog

  private readonly camera: PerspectiveCamera
  private readonly lightPos = new Vector3()
  private readonly lightDir = new Vector3()

  constructor(exp: Experience) {
    exp.scene.add(this.group)
    this.camera = exp.camera

    this.lighting = new Lighting(exp.quality, exp.scene)

    // Contact plane — matte shadow receiver that roots the floating monolith.
    const plane = new Mesh(
      new PlaneGeometry(120, 120),
      new MeshStandardMaterial({ color: palette.bgDeep, roughness: 1, metalness: 0 }),
    )
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -1.65
    plane.receiveShadow = true
    this.group.add(plane)

    this.monolith = new Monolith(exp.quality)
    this.group.add(this.monolith.mesh)

    this.fog = new Fog(exp.quality)
    this.group.add(this.fog.group)
  }

  update(time: Time): void {
    this.monolith.update(time.elapsedS)

    // The light barely turns its head: a slow azimuth drift re-rakes the rim.
    this.lighting.update(-0.5 + Math.sin(time.elapsedS * 0.09) * 0.18)

    // Feed the monolith's custom shader the live direction toward the key light,
    // and the fog the light's world position so haze pools around it.
    this.lighting.key.getWorldPosition(this.lightPos)
    this.lightDir.copy(this.lightPos).sub(this.monolith.mesh.position).normalize()
    this.monolith.setLightDir(this.lightDir)
    this.fog.setLightPos(this.lightPos)

    this.fog.update(time.elapsedS, this.camera)
  }
}
