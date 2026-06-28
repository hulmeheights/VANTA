import {
  Mesh,
  ShaderMaterial,
  BoxGeometry,
  BufferAttribute,
  Vector3,
  Color,
  type BufferGeometry,
} from 'three'
import vertexShader from '../shaders/monolith.vert.glsl'
import fragmentShader from '../shaders/monolith.frag.glsl'
import { palette } from '../core/palette'
import type { Quality } from '../core/tier'

// THE MONOLITH — a superellipsoid slab (never a sphere/cube/torus). It floats dead
// still and breathes; it never spins. The same shared noise field drives breath,
// thin-film thickness and (via Fog) the atmosphere, so the whole world is one
// organism. See monolith.vert/frag.glsl for the signature shader.

export const BASE_EXPONENT = 6.0 // tense, architectural edges (Judd, not a pill)
const SIZE = new Vector3(1.0, 1.55, 0.28) // half-extents: a standing tablet

function superPosCPU(d: Vector3, e: number, s: Vector3): Vector3 {
  const qx = Math.abs(d.x / s.x)
  const qy = Math.abs(d.y / s.y)
  const qz = Math.abs(d.z / s.z)
  const denom = Math.pow(qx, e) + Math.pow(qy, e) + Math.pow(qz, e)
  const k = Math.pow(Math.max(denom, 1e-6), -1 / e)
  return d.clone().multiplyScalar(k)
}

// Spherified-cube base: a uniform grid per face gives even resolution on the broad
// faces (where the streak highlight and breath read most). Store the unit direction
// per vertex; bake the base superellipsoid into position for bounds + cast shadow.
function buildGeometry(segments: number): BufferGeometry {
  const box = new BoxGeometry(2, 2, 2, segments, segments, segments)
  const src = box.attributes.position
  const count = src.count
  const dir = new Float32Array(count * 3)
  const pos = new Float32Array(count * 3)
  const d = new Vector3()

  for (let i = 0; i < count; i++) {
    d.set(src.getX(i), src.getY(i), src.getZ(i)).normalize()
    dir[i * 3] = d.x
    dir[i * 3 + 1] = d.y
    dir[i * 3 + 2] = d.z
    const p = superPosCPU(d, BASE_EXPONENT, SIZE)
    pos[i * 3] = p.x
    pos[i * 3 + 1] = p.y
    pos[i * 3 + 2] = p.z
  }

  box.setAttribute('aDir', new BufferAttribute(dir, 3))
  box.setAttribute('position', new BufferAttribute(pos, 3))
  box.deleteAttribute('uv')
  box.deleteAttribute('normal')
  box.computeBoundingSphere()
  return box
}

export class Monolith {
  readonly mesh: Mesh
  readonly material: ShaderMaterial

  constructor(quality: Quality) {
    const segments = Math.max(14, Math.round(54 * quality.monolithDetail))
    const geometry = buildGeometry(segments)

    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uBreathAmp: { value: 0.016 },
        uMorphExponent: { value: BASE_EXPONENT },
        uSize: { value: SIZE.clone() },

        uLightDir: { value: new Vector3(-0.6, 0.5, 0.6).normalize() },
        uLightColor: { value: new Color(0xf6c98e) },
        uLightIntensity: { value: 4.3 },
        uAccent: { value: new Color(palette.accent) },
        uAlbedo: { value: new Color(0.02, 0.022, 0.028) },
        uFogColor: { value: new Color(palette.bg) },
        uFogDensity: { value: 0.05 },

        uFresnelPower: { value: 3.0 },
        uIriFreq: { value: 11.0 },
        uIriStrength: { value: 0.85 },
        uIriSat: { value: 0.4 },
        uRoughLow: { value: 0.045 },
        uRoughHigh: { value: 0.4 },
        uAniso: { value: 0.75 },
        uExposure: { value: 1.0 },
        uAmbient: { value: 0.2 },
      },
    })

    this.mesh = new Mesh(geometry, this.material)
    this.mesh.castShadow = true
    this.mesh.position.set(1.0, 0.4, 0)
  }

  /** Set the world-space direction toward the key light (for the custom lighting). */
  setLightDir(dir: Vector3): void {
    this.material.uniforms.uLightDir.value.copy(dir)
  }

  setFog(color: Color, density: number): void {
    this.material.uniforms.uFogColor.value.copy(color)
    this.material.uniforms.uFogDensity.value = density
  }

  /** Capabilities-section morph: sharpen/soften the same form. */
  setMorph(exponent: number): void {
    this.material.uniforms.uMorphExponent.value = exponent
  }

  update(elapsedS: number): void {
    this.material.uniforms.uTime.value = elapsedS
  }
}
