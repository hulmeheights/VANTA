import {
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PerspectiveCamera,
  Vector3,
  Color,
  FogExp2,
} from 'three'
import { Lighting } from './Lighting'
import { Monolith, BASE_EXPONENT } from './Monolith'
import { Fog } from './Fog'
import { palette } from '../core/palette'
import type { Experience } from '../core/Experience'
import type { Time } from '../core/Time'

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

// The persistent scene graph. Built once, never torn down — sections are reached by
// moving the camera, not by mounting/unmounting objects. Scroll progress (p) scrubs
// fog density, the monolith's exponent morph (Capabilities) and the light azimuth;
// the cursor nudges the azimuth so moving the mouse re-rakes the rim.

export class World {
  readonly group = new Group()
  readonly lighting: Lighting
  readonly monolith: Monolith
  readonly fog: Fog
  private readonly fogColor = new Color(palette.bg)

  private readonly camera: PerspectiveCamera
  private readonly sceneFog: FogExp2 | null
  private readonly lightPos = new Vector3()
  private readonly lightDir = new Vector3()

  private scrollAz = -0.5
  private pointerTarget = 0
  private pointerSmooth = 0
  private az = -0.5

  constructor(exp: Experience) {
    exp.scene.add(this.group)
    this.camera = exp.camera
    this.sceneFog = exp.scene.fog instanceof FogExp2 ? exp.scene.fog : null

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

  /** Scrub state from the master progress p ∈ [0,1]. */
  setProgress(p: number): void {
    // Fog: dense at the ends (Hero / Contact), thinnest at Capabilities.
    const thin = smoothstep(0.32, 0.55, p) * (1 - smoothstep(0.55, 0.74, p))
    const contact = smoothstep(0.85, 1, p)
    const density = 0.052 - thin * 0.03 + contact * 0.022
    if (this.sceneFog) this.sceneFog.density = density
    this.monolith.setFog(this.fogColor, density * 0.92)

    // Capabilities morph: the SAME form sharpens then softens to prove its range.
    const phase = smoothstep(0.48, 0.66, p) // 0..1 across the window
    const inWindow = p > 0.46 && p < 0.68 ? 1 : 0
    const exponent = BASE_EXPONENT + Math.sin(phase * Math.PI * 2) * 3.4 * inWindow
    this.monolith.setMorph(exponent)

    // Light azimuth crawls as the camera travels (the rim crosses the edge).
    this.scrollAz = -0.5 + p * 0.7
  }

  setPointer(nx: number): void {
    this.pointerTarget = nx
  }

  update(time: Time): void {
    this.monolith.update(time.elapsedS)

    // Smooth the cursor influence; combine scroll base + slow idle drift + cursor.
    this.pointerSmooth += (this.pointerTarget - this.pointerSmooth) * 0.06
    const idle = Math.sin(time.elapsedS * 0.09) * 0.12
    const targetAz = this.scrollAz + idle + this.pointerSmooth * 0.16
    this.az += (targetAz - this.az) * 0.08
    this.lighting.update(this.az)

    // Feed the monolith's custom shader the live direction toward the key light,
    // and the fog the light's world position so haze pools around it.
    this.lighting.key.getWorldPosition(this.lightPos)
    this.lightDir.copy(this.lightPos).sub(this.monolith.mesh.position).normalize()
    this.monolith.setLightDir(this.lightDir)
    this.fog.setLightPos(this.lightPos)

    this.fog.update(time.elapsedS, this.camera)
  }
}
