import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  BoxGeometry,
} from 'three'
import { Lighting } from './Lighting'
import { palette } from '../core/palette'
import type { Experience } from '../core/Experience'
import type { Time } from '../core/Time'

// The persistent scene graph. Built once, never torn down — sections are reached by
// moving the camera, not by mounting/unmounting objects.
//
// SCAFFOLD STATE: a placeholder slab stands in for the real superquadric monolith
// (added with its signature shader in the hero step). The contact plane and key
// light are real and stay.

export class World {
  readonly group = new Group()
  readonly lighting: Lighting
  private readonly placeholder: Mesh

  constructor(exp: Experience) {
    exp.scene.add(this.group)

    this.lighting = new Lighting(exp.quality, exp.scene)

    // Contact plane — matte shadow receiver that roots the floating object.
    const plane = new Mesh(
      new PlaneGeometry(80, 80),
      new MeshStandardMaterial({ color: palette.bgDeep, roughness: 1, metalness: 0 }),
    )
    plane.rotation.x = -Math.PI / 2
    plane.position.y = -2.6
    plane.receiveShadow = true
    this.group.add(plane)

    // Placeholder monolith.
    this.placeholder = new Mesh(
      new BoxGeometry(2, 3, 0.5, 1, 1, 1),
      new MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.35, metalness: 0.4 }),
    )
    this.placeholder.castShadow = true
    this.group.add(this.placeholder)
  }

  update(time: Time): void {
    // Gentle idle so the canvas is visibly alive during scaffold.
    this.placeholder.rotation.y = Math.sin(time.elapsedS * 0.18) * 0.35
  }
}
