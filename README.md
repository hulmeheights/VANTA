# VANTA — 3D Rendering & Visualisation Studio

The website for a high‑end 3D rendering studio, built so that **the site itself is the showreel**. The homepage is one continuous, interactive WebGL world — a dark superquadric monolith breathing in volumetric fog, lit by a single sodium light — that a scroll‑driven camera flies through. Every section is a destination inside that one world.

> Concept: **MA / 間 — “The Long Exhale.”** Negative space, slow film‑camera motion, near‑black with one warm light. The object never spins; it breathes. The camera is the only thing that travels.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production bundle to /dist
npm run preview  # serve the production build
```

Requires Node 20+ (developed on Node 22). No environment variables, no backend.

### Handy URL flags

| Flag | Effect |
|------|--------|
| `?tier=high\|medium\|low` | Force a quality tier (skips GPU detection). |
| `?motion=reduce\|full` | Force the reduced‑motion path on/off. |

`window.__vantaFps` holds the live frames‑per‑second (updated each second) for quick profiling in the console.

---

## Art direction

- **Accent — `#E8A33D` “Sodium Dawn.”** A warm sodium‑vapour amber. It appears **only as light** (the rim, the fog glow, the text caret, focus rings, the active accents) — never as flat UI fill — held under ~4% of the frame against near‑black `#08080A`.
- **Type — Fraunces (display) + Inter (body),** both self‑hosted variable fonts (`@fontsource-variable/*`, OFL, no CDN). The hero drives Fraunces’ optical‑size axis at 144 for the high‑contrast editorial cut.
- **Motion** eases like a film dolly (`cubic-bezier(.22,1,.36,1)`); nothing bounces. Respects `prefers-reduced-motion`.

---

## Architecture

```
src/
  main.ts                 boot: device profiling → Experience; DOM init
  core/
    Experience.ts         orchestrator: renderer, scene, camera, loop,
                          scroll→progress damping, fps monitor + degrade ladder
    Renderer.ts           WebGLRenderer (DPR cap, PCF shadows, tonemap → post)
    tier.ts               device profiling → quality preset (detect-gpu +
                          reduced-motion + cores/memory; ?tier / ?motion overrides)
    Sizes.ts  Time.ts  palette.ts
  world/
    World.ts              persistent scene graph; scrubs fog/morph/light from p
    Monolith.ts           superquadric geometry + the signature ShaderMaterial
    Lighting.ts           one sodium key light on a boom + tight shadow frustum
    Fog.ts                drifting fbm haze billboards (volumetric stand-in)
  camera/
    CameraRig.ts          CatmullRom dolly + look-at curves; section anchors → p
    scroll.ts             GSAP ScrollTrigger → normalized progress + side rail
  post/
    Post.ts               pmndrs EffectComposer: selective bloom · DOF · grade
    GradeEffect.ts        custom GLSL effect: split-tone · vignette · film grain
  shaders/
    lib/noise.glsl        simplex + fbm — the shared "organism" field
    monolith.vert/.frag   the signature shader (see below)
    fog.vert/.frag        billboard haze
  ui/
    content.ts            ALL copy + projects/capabilities/studio data
    sections.ts           builds Work/Capabilities/Studio, case panel, reveals
    form.ts               enquiry form → console.log + mailto (TODO: backend)
```

### One world, one camera (scroll‑camera)

Scroll maps to a single normalized progress **`p ∈ [0,1]`** (the master clock). The render loop damps `currentP → targetP` (frame‑rate‑corrected) so motion glides, then fans `p` out to: the camera pose (a `CatmullRomCurve3` position curve + a parallel look‑at curve, section anchors remapped to curve params), DOF focus, fog density, the monolith’s exponent morph (Capabilities), and the light azimuth. Nothing mounts or unmounts — sections are reached by moving the camera.

### The signature shader (`shaders/monolith.*`)

A fully custom `ShaderMaterial` that makes the monolith one living surface:

- **Vertex** — reprojects a per‑vertex unit direction onto a **superellipsoid** whose exponent can morph live (sphere ↔ slab); displaces it along the surface by a slow domain‑warped **breath** field; **recomputes the normal by finite difference** of the displaced surface (so the breathing surface shades correctly).
- **Fragment** — near‑black graphite albedo; **spatially varying roughness** (broad faces near‑mirror, flanks satin); **anisotropic GGX** so the highlight is a vertical streak; a **fresnel‑gated thin‑film rim** tinted to the sodium accent, living only on the silhouette and gated by the light; per‑fragment **height fog**.

The same noise field (`lib/noise.glsl`) drives breath, thin‑film thickness and the fog drift — geometry, material and atmosphere breathe together.

### Postprocessing

pmndrs `postprocessing` on a **half‑float** buffer (no banding in a 90 %‑black scene): **SelectiveBloom** on the monolith only (so the rim blooms, UI/renders never do) → **DepthOfField** (half‑res, world‑focus, its own pass) → **ACES tonemap** + the custom **GradeEffect** (split‑tone, vignette, luma‑aware film grain) + subtle **chromatic aberration**, merged into one pass. Tonemapping lives here, not on the renderer.

---

## Performance

- **Target: a locked 60 fps on a modern laptop** (Apple silicon / recent Iris Xe / any discrete GPU). The scene is one low‑poly mesh + one light, so the budget goes almost entirely to postprocessing fill‑rate.
- **Biggest levers (in order):** `devicePixelRatio` cap (cost scales with DPR²) → half‑res DOF/bloom → tight shadow frustum → low draw‑call count → the fused grade pass.
- **Auto‑degrade ladder:** a frame‑time monitor watches fps; if it stays under 45 fps it drops the pixel ratio to 1.0, then disables DOF — no reload, no cliff.
- **Tiers** (`tier.ts`): `high` (full stack), `medium` (no godrays, lighter bloom), `low/mobile` (no DOF/chromatic aberration, shadows off, halved monolith detail, DPR ≤ 1.25). Tier is chosen from `detect-gpu` + corroborating signals, and can be overridden with `?tier=`.
- **Reduced motion / no WebGL:** `prefers-reduced-motion` freezes all autonomous motion into a composed still per section; if WebGL is unavailable the canvas is dropped for a CSS‑only cinematic backdrop and the (fully semantic) DOM remains usable.

> Note: this was developed in a headless software‑rendering (SwiftShader) environment, which is **not** representative of real‑GPU fps — the 60 fps target is based on the frame budget above and the standard levers, with the auto‑degrade ladder as the safety net. Profile on real hardware via `window.__vantaFps` and the browser’s performance panel.

---

## Where to drop real project imagery

1. **Add the image** to `public/work/` (e.g. `public/work/aurum.jpg`).
2. **Reference it** in `src/ui/content.ts` — give the project an `image` field:
   ```ts
   { id: 'aurum', title: 'Aurum №7', /* … */ image: 'aurum.jpg' }
   ```
   The case‑study panel uses it automatically; without it, a warm procedural placeholder is generated. All copy (projects, capabilities, studio text, contact email) lives in `content.ts` — edit there, nothing is hard‑coded in components.

### Wiring the contact form

`src/ui/form.ts` currently logs the payload and opens a `mailto:`. Replace the marked block (`// TODO`) with a `POST` to your endpoint / form service, and set `contactEmail` in `content.ts`.

---

## Known extension points (deliberately left open)

- **Work slabs & capability plinths in 3D.** The brief’s hard requirements — a work gallery → case studies, and capabilities shown by the scene shifting — are met via the project list + slide‑in case panels and the monolith’s exponent morph + camera rise. The design synthesis also imagined floating render‑slabs the camera threads between and four live mini‑demos on plinths; these are left as a clean extension (add meshes in `world/`, place them along the Work/Capabilities camera beats) rather than risk cluttering the art direction.
- **True raymarched volumetric fog** as an optional `max` tier (the current fog is fbm billboards — looks volumetric, holds 60 fps).
- **Font subsetting** to the exact glyphs used (`glyphhanger`) to shave the variable‑font payload further.

---

## Stack

Vite 8 · TypeScript 5 · three 0.185 (pinned — `postprocessing`’s peer range) · postprocessing 6.39 · GSAP 3.15 (ScrollTrigger) · vite‑plugin‑glsl · detect‑gpu · @fontsource‑variable (Fraunces, Inter).
