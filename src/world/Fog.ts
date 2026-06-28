import {
  Group,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  AdditiveBlending,
  Color,
  Vector2,
  Vector3,
  type Camera,
} from 'three'
import vertexShader from '../shaders/fog.vert.glsl'
import fragmentShader from '../shaders/fog.frag.glsl'
import { palette } from '../core/palette'
import type { Quality } from '../core/tier'

// Volumetric-fog stand-in: a handful of large camera-facing haze cards at varying
// depths, each with animated fbm density, additively blended. Reads as drifting
// volumetric fog that pools around the sodium light — a fraction of the cost of a
// real raymarched volume (see plan: raymarch deferred to an optional max tier).

const GEO = new PlaneGeometry(1, 1)

export class Fog {
  readonly group = new Group()
  private readonly layers: { mesh: Mesh; mat: ShaderMaterial; drift: Vector3 }[] = []

  constructor(quality: Quality) {
    const count = quality.fogLayers
    const cool = new Color(0x1b1f2c)
    const warm = new Color(palette.accent).multiplyScalar(0.7)

    for (let i = 0; i < count; i++) {
      const t = i / Math.max(1, count - 1)
      const mat = new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: cool.clone() },
          uWarm: { value: warm.clone() },
          uLightPos: { value: new Vector3(-3.4, 2.2, 3.2) },
          uOpacity: { value: 0.17 + 0.1 * (1 - t) },
          uScale: { value: 2.0 + i * 0.6 },
          uSeed: { value: new Vector2(i * 12.7, i * 4.3) },
          uDrift: { value: 0.012 + i * 0.004 },
        },
      })

      const mesh = new Mesh(GEO, mat)
      // Spread from far behind the monolith to just in front of it (foreground haze).
      const z = 4 - t * 14
      const w = 16 + t * 10
      const h = 11 + t * 6
      mesh.scale.set(w, h, 1)
      mesh.position.set((i % 2 === 0 ? -1 : 1) * (1.5 + t * 2), 1 + t * 1.5, z)
      mesh.renderOrder = 2
      this.group.add(mesh)
      this.layers.push({ mesh, mat, drift: new Vector3() })
    }
  }

  setLightPos(pos: Vector3): void {
    for (const l of this.layers) l.mat.uniforms.uLightPos.value.copy(pos)
  }

  update(elapsedS: number, camera: Camera): void {
    for (const l of this.layers) {
      l.mat.uniforms.uTime.value = elapsedS
      // Face the camera so the cards stay broad as the camera travels.
      l.mesh.quaternion.copy(camera.quaternion)
    }
  }
}
