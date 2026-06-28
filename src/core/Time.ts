// Frame clock. delta is clamped so a backgrounded tab (which pauses rAF) doesn't
// produce a huge jump on return that would snap animations.

export class Time {
  readonly startTime = performance.now()
  current = this.startTime
  /** ms since start */
  elapsed = 0
  /** ms since last frame, clamped to [0, 64] */
  delta = 16.6

  tick(): this {
    const now = performance.now()
    this.delta = Math.min(now - this.current, 64)
    this.current = now
    this.elapsed = now - this.startTime
    return this
  }

  /** seconds since start */
  get elapsedS(): number {
    return this.elapsed * 0.001
  }

  /** seconds since last frame */
  get deltaS(): number {
    return this.delta * 0.001
  }
}
