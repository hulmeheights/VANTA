import {
  Group,
  Mesh,
  InstancedMesh,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  ConeGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  AdditiveBlending,
  PointLight,
  Matrix4,
  Vector3,
  Color,
  DoubleSide,
} from 'three'
import type { Monolith } from './Monolith'
import { palette } from '../core/palette'

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

// Four plinths, each topped with a tiny live procedural demo — the Capabilities
// breadth proof, framed as the camera rises in that beat:
//   Product (glossy sphere) · Archviz (extruded grid-city) · Cinematic (light
//   shaft) · Real-time (a mini of the hero monolith shader). Gated to the
//   Capabilities scroll region.

const SEED = 1337
function rng(s: number): () => number {
  let x = s >>> 0
  return () => ((x = (x * 1664525 + 1013904223) >>> 0), x / 4294967296)
}

export class Plinths {
  readonly group = new Group()
  private region = 0
  private readonly faders: { opacity: number }[] = []
  private readonly spin: Mesh[] = []
  private readonly mini: Mesh
  private readonly fill: PointLight

  // Plinth tops, clustered (around x≈2.6, z≈-1) where the Capabilities camera looks down.
  private readonly spots: Vector3[] = [
    new Vector3(1.4, -0.3, -0.2),
    new Vector3(2.5, -0.3, -1.5),
    new Vector3(3.5, -0.3, -0.4),
    new Vector3(2.7, -0.1, -2.4),
  ]

  constructor(monolith: Monolith) {
    // Shared pedestals (one instanced draw).
    const ped = new InstancedMesh(
      new CylinderGeometry(0.32, 0.4, 0.9, 24),
      new MeshStandardMaterial({ color: 0x0b0b0e, roughness: 0.8, metalness: 0.1 }),
      this.spots.length,
    )
    ped.castShadow = true
    const m = new Matrix4()
    this.spots.forEach((s, i) => {
      m.makeTranslation(s.x, s.y - 0.55, s.z)
      ped.setMatrixAt(i, m)
    })
    ped.instanceMatrix.needsUpdate = true
    this.group.add(ped)

    // 1 · Product — glossy sphere.
    const sphere = new Mesh(
      new SphereGeometry(0.34, 48, 32),
      new MeshStandardMaterial({
        color: 0x14141a,
        roughness: 0.16,
        metalness: 0.9,
        transparent: true,
      }),
    )
    sphere.position.copy(this.spots[0])
    sphere.castShadow = true
    this.add(sphere, true)

    // 2 · Archviz — extruded grid-city (instanced towers on a plate).
    const city = new Group()
    const towers = new InstancedMesh(
      new BoxGeometry(0.12, 1, 0.12),
      new MeshStandardMaterial({ color: 0x0d0d12, roughness: 0.7, transparent: true }),
      36,
    )
    const rand = rng(SEED)
    let idx = 0
    for (let gx = -2; gx < 4; gx++) {
      for (let gz = -3; gz < 3; gz++) {
        const h = 0.1 + rand() * 0.7
        m.makeScale(1, h, 1)
        m.setPosition(gx * 0.14, h * 0.5, gz * 0.14)
        towers.setMatrixAt(idx++, m)
      }
    }
    towers.instanceMatrix.needsUpdate = true
    city.add(towers)
    city.position.copy(this.spots[1])
    this.group.add(city)
    this.fadeMat(towers.material as MeshStandardMaterial)

    // 3 · Cinematic — a volumetric light shaft.
    const shaft = new Mesh(
      new ConeGeometry(0.4, 1.5, 32, 1, true),
      new MeshBasicMaterial({
        color: new Color(palette.accent),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    )
    shaft.position.copy(this.spots[2]).setY(this.spots[2].y + 0.5)
    this.add(shaft, false)

    // 4 · Real-time — a mini of the hero monolith shader (shared geometry+material).
    this.mini = new Mesh(monolith.mesh.geometry, monolith.material)
    this.mini.scale.setScalar(0.22)
    this.mini.position.copy(this.spots[3]).setY(this.spots[3].y + 0.45)
    this.group.add(this.mini)
    this.spin.push(this.mini)

    // A local warm fill so the demos read (the distant key light barely reaches here).
    this.fill = new PointLight(0xffe2b4, 0, 9, 2)
    this.fill.position.set(2.4, 2.0, 1.0)
    this.group.add(this.fill)

    this.group.visible = false
  }

  private add(mesh: Mesh, spins: boolean): void {
    this.group.add(mesh)
    this.fadeMat(mesh.material as MeshStandardMaterial | MeshBasicMaterial)
    if (spins) this.spin.push(mesh)
  }

  private fadeMat(mat: { opacity: number; transparent: boolean }): void {
    mat.transparent = true
    this.faders.push(mat)
  }

  debug(camera: import('three').PerspectiveCamera): unknown {
    const v = new Vector3()
    return {
      visible: this.group.visible,
      region: +this.region.toFixed(2),
      spots: this.spots.map((s) => {
        v.copy(s).project(camera)
        return { on: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1 }
      }),
    }
  }

  update(p: number, elapsedS: number): void {
    this.region = smoothstep(0.34, 0.42, p) * (1 - smoothstep(0.52, 0.62, p))
    this.group.visible = this.region > 0.02
    const peak = this.region
    for (const f of this.faders) f.opacity = peak
    for (const s of this.spin) s.rotation.y = elapsedS * 0.25
    this.fill.intensity = peak * 9
  }
}
