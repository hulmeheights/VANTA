import {
  Group,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Raycaster,
  Vector2,
  Vector3,
  Color,
  DoubleSide,
  type PerspectiveCamera,
  type Texture,
} from 'three'
import { makeRenderTexture } from './renderTexture'
import { projects, type Project } from '../ui/content'

const smoothstep = (a: number, b: number, x: number): number => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

// The Work gallery in 3D — floating "render" slabs at varying depth/lateral offset
// that the camera threads between during the Work beat. Each resolves out of the
// haze as the camera nears and opens its case study on click. Visibility is gated to
// the Work scroll region so the slabs never clutter the hero.

interface Slab {
  mesh: Mesh
  material: MeshBasicMaterial
  project: Project
  basePos: Vector3
}

// A loose gallery cluster (around x≈-2.5, z≈-1) that the Work camera enters and
// threads through; placed at varying depth so the dolly reveals real parallax.
const LAYOUT: [number, number, number][] = [
  [-3.6, 0.7, -0.3],
  [-1.4, 0.85, -1.7],
  [-3.2, -0.5, -2.1],
  [-1.1, -0.45, 0.3],
]

export class WorkSlabs {
  readonly group = new Group()
  private readonly slabs: Slab[] = []
  private readonly raycaster = new Raycaster()
  private regionVis = 0

  constructor() {
    const geo = new PlaneGeometry(2.7, 1.8)
    projects.forEach((project, i) => {
      const tex: Texture = makeRenderTexture(project, i + 1)
      const material = new MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        side: DoubleSide,
        fog: true,
        depthWrite: false,
        color: new Color(1.25, 1.25, 1.25), // lift the unlit renders so they read
      })
      const mesh = new Mesh(geo, material)
      const [x, y, z] = LAYOUT[i % LAYOUT.length]
      mesh.position.set(x, y, z)
      mesh.lookAt(x - 0.3, y, 8) // face the camera dolly (positioned toward +z)
      mesh.renderOrder = 1
      mesh.visible = false
      mesh.userData.projectId = project.id
      this.group.add(mesh)
      this.slabs.push({ mesh, material, project, basePos: mesh.position.clone() })
    })
  }

  update(p: number, camera: PerspectiveCamera): void {
    // Visible only through the Work region; peaks in the middle of the beat.
    this.regionVis = smoothstep(0.06, 0.13, p) * (1 - smoothstep(0.36, 0.46, p))
    for (const s of this.slabs) {
      const dist = camera.position.distanceTo(s.mesh.position)
      const near = 0.25 + 0.75 * smoothstep(13, 4, dist)
      const op = this.regionVis * near
      s.material.opacity = op
      s.mesh.visible = op > 0.012
    }
  }

  /** Debug: project each slab to NDC + report opacity / on-screen. */
  debug(camera: PerspectiveCamera): unknown[] {
    const v = new Vector3()
    return this.slabs.map((s) => {
      v.copy(s.basePos).project(camera)
      return {
        id: s.project.id,
        op: +s.material.opacity.toFixed(2),
        on: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && v.z < 1,
      }
    })
  }

  /** Returns the project id under the given NDC point, or null. */
  pick(ndc: Vector2, camera: PerspectiveCamera): string | null {
    if (this.regionVis < 0.2) return null
    this.raycaster.setFromCamera(ndc, camera)
    const hits = this.raycaster.intersectObjects(
      this.slabs.filter((s) => s.mesh.visible).map((s) => s.mesh),
      false,
    )
    return hits.length ? (hits[0].object.userData.projectId as string) : null
  }
}
