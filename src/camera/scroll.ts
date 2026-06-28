import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

// Must register before use or the plugin tree-shakes out and silently no-ops.
gsap.registerPlugin(ScrollTrigger)

// Maps page scroll to a single normalised progress p ∈ [0,1] — the master clock for
// the whole experience. We do NOT scrub the camera directly here; the render loop
// damps toward this target so motion glides like a film dolly (see Experience).

export class ScrollController {
  targetProgress = 0
  private trigger: ScrollTrigger
  private railFill: HTMLElement | null

  constructor(onProgress?: (p: number) => void) {
    this.railFill = document.querySelector<HTMLElement>('.rail__fill')

    this.trigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        this.targetProgress = self.progress
        if (this.railFill) this.railFill.style.height = `${self.progress * 100}%`
        onProgress?.(self.progress)
      },
    })
  }

  /** Jump the page to a section anchor (used by reduced-motion / nav). */
  scrollToProgress(p: number): void {
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: max * p, behavior: 'auto' })
  }

  refresh(): void {
    ScrollTrigger.refresh()
  }

  dispose(): void {
    this.trigger.kill()
  }
}
