// Viewport size tracking. The renderer owns the pixel-ratio cap (see Renderer.ts);
// Sizes only reports CSS pixel dimensions and aspect.

export class Sizes {
  width = window.innerWidth
  height = window.innerHeight

  get aspect(): number {
    return this.width / this.height
  }

  update(): void {
    this.width = window.innerWidth
    this.height = window.innerHeight
  }
}
