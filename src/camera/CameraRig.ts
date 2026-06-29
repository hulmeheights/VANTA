import { CatmullRomCurve3, Vector3, type PerspectiveCamera } from 'three'

// One camera, one continuous world. The whole site is a single long-take: a
// hand-authored CatmullRom dolly path supplies position, a parallel curve supplies
// the look-at target. Section anchors (p) map to control points via a piecewise
// remap so the camera lands exactly on each beat while the curve keeps it smooth.
//
// The choreography orbits and dollies around the central monolith so it stays the
// throughline: front → swing left → swing right → rise → three-quarter → retreat.

interface Keyframe {
  p: number
  pos: [number, number, number]
  look: [number, number, number]
}

// p values track the centred-section scroll positions so each beat lands with its
// content in view (Hero 0 · Work ~0.23 · Capabilities ~0.45 · Studio ~0.68 · Contact 1).
export const KEYFRAMES: Keyframe[] = [
  { p: 0.0, pos: [0.0, -0.1, 8.6], look: [0.6, 0.7, 0.0] }, // Hero — low, looking up
  { p: 0.16, pos: [-3.4, 0.2, 5.6], look: [0.3, 0.5, 0.0] }, // Work — swing left, thread in
  { p: 0.31, pos: [3.6, 0.7, 5.2], look: [0.7, 0.5, 0.0] }, // Work — swing right
  { p: 0.46, pos: [0.4, 2.7, 6.4], look: [0.9, 0.1, 0.0] }, // Capabilities — rise, look down
  { p: 0.68, pos: [3.9, 0.9, 5.0], look: [0.5, 0.6, 0.0] }, // Studio — three-quarter, close
  { p: 1.0, pos: [0.6, 0.3, 12.8], look: [0.8, 0.5, 0.0] }, // Contact — retreat into fog
]

export class CameraRig {
  private readonly posCurve: CatmullRomCurve3
  private readonly lookCurve: CatmullRomCurve3
  private readonly anchors: number[]

  private readonly pos = new Vector3()
  private readonly look = new Vector3()
  /** Current look-at target in world space (for DOF focus, etc.). */
  readonly target = new Vector3()

  constructor(private readonly camera: PerspectiveCamera) {
    this.anchors = KEYFRAMES.map((k) => k.p)
    this.posCurve = new CatmullRomCurve3(
      KEYFRAMES.map((k) => new Vector3(...k.pos)),
      false,
      'centripetal',
      0.5,
    )
    this.lookCurve = new CatmullRomCurve3(
      KEYFRAMES.map((k) => new Vector3(...k.look)),
      false,
      'centripetal',
      0.5,
    )
  }

  // Map p (with custom anchor spacing) → curve parameter t (uniform per segment).
  private remap(p: number): number {
    const a = this.anchors
    const n = a.length - 1
    const cp = Math.min(Math.max(p, 0), 1)
    for (let i = 0; i < n; i++) {
      if (cp <= a[i + 1]) {
        const local = (cp - a[i]) / (a[i + 1] - a[i])
        return (i + local) / n
      }
    }
    return 1
  }

  setProgress(p: number): void {
    const t = this.remap(p)
    this.posCurve.getPoint(t, this.pos)
    this.lookCurve.getPoint(t, this.look)
    this.camera.position.copy(this.pos)
    this.camera.lookAt(this.look)
    this.target.copy(this.look)
  }
}
