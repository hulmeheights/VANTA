// VANTA palette — single source of truth for colour, used by both CSS-side
// constants and Three.js. Kept as hex numbers; create new THREE.Color where needed
// so nothing mutates a shared instance.

export const palette = {
  /** Near-black world. The whole site sits here. */
  bg: 0x08080a,
  bgCss: '#08080A',
  /** Even darker floor / vignette corners. */
  bgDeep: 0x050506,
  /** "Sodium Dawn" — the one warm accent. Appears only as light, never as fill. */
  accent: 0xe8a33d,
  accentCss: '#E8A33D',
  /** Near-bone text colour. */
  bone: 0xece9e4,
  boneCss: '#ECE9E4',
} as const
