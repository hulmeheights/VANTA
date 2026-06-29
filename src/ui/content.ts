// ─────────────────────────────────────────────────────────────────────────────
// ALL site copy + data lives here. Edit this file to change wording or projects;
// nothing is hard-coded in the components. To add a real project: add an entry to
// `projects` and drop its image in /public/work/<image> (see README).
// ─────────────────────────────────────────────────────────────────────────────

export interface Project {
  id: string
  title: string
  client: string
  discipline: string
  year: string
  /** One-line teaser shown in the Work list. */
  blurb: string
  /** Longer copy for the case-study panel. */
  body: string
  role: string[]
  /** Optional real image dropped in /public/work/. If absent, a procedural
   *  thumbnail is generated for the 3D slab and the case panel. */
  image?: string
}

export const projects: Project[] = [
  {
    id: 'aurum',
    title: 'Aurum №7',
    client: 'Maison de Parfum',
    discipline: 'Product rendering',
    year: '2025',
    blurb: 'A sculpted glass flacon, rendered to out-resolve the photography it replaced.',
    body: 'A forty-frame campaign for a flagship fragrance — every shot fully CG. We rebuilt the flacon from the CAD, authored the heavy lead-crystal glass and the liquid inside it, and lit it on a virtual soundstage so the art director could relight in minutes, not days. The hero still printed at six metres.',
    role: ['Look-development', 'Lighting', 'Stills & motion'],
  },
  {
    id: 'meridian',
    title: 'Meridian',
    client: 'Harbour Developments',
    discipline: 'Architectural visualisation',
    year: '2025',
    blurb: 'Pre-construction films of a harbour penthouse, lit for a golden hour that does not exist yet.',
    body: 'Interior and exterior films of a penthouse eighteen months from completion. We modelled to the architect’s drawings, dressed the spaces, and ran a full day-cycle so the sales suite could show the apartment at dawn, noon and dusk — each one graded like a feature.',
    role: ['Set modelling', 'Lighting', 'Film & grade'],
  },
  {
    id: 'helix',
    title: 'Helix',
    client: 'Consumer Technology',
    discipline: 'Cinematic CGI',
    year: '2024',
    blurb: 'A ninety-second launch film exploding a wearable into its 214 components and back.',
    body: 'A story-driven product film for a wearable launch: concept, previz, animation, FX, lighting and comp in-house. The centrepiece is a single unbroken move that disassembles the device into two hundred parts suspended in light, then reassembles it on the wrist.',
    role: ['Previz', 'Animation & FX', 'Comp & grade'],
  },
  {
    id: 'noctis',
    title: 'Noctis',
    client: 'Automotive',
    discipline: 'Real-time / WebGL',
    year: '2024',
    blurb: 'A browser configurator rendering a hypercar at 60fps with believable reflections.',
    body: 'A real-time configurator that runs in the browser: paint, trim and lighting environments swapped live, with screen-space reflections and a custom clear-coat shader. Built on the same WebGL pipeline as this site — proof that the showreel and the product can be the same thing.',
    role: ['Real-time pipeline', 'Shaders', 'Front-end'],
  },
]

export interface Capability {
  index: string
  name: string
  desc: string
  tags: string[]
}

export const capabilities: Capability[] = [
  {
    index: 'i',
    name: 'Product rendering',
    desc: 'Hero stills and motion of physical products — accurate to the micron and the material, lit so the surface tells the story.',
    tags: ['Look-dev', 'Stills', 'Motion'],
  },
  {
    index: 'ii',
    name: 'Architectural visualisation',
    desc: 'Spaces before they are built — interior, exterior, masterplan — lit like cinema rather than catalogue.',
    tags: ['Interior', 'Exterior', 'Film'],
  },
  {
    index: 'iii',
    name: 'Cinematic CGI',
    desc: 'Story-driven CG films, end to end: concept, previz, animation, FX, lighting, comp and grade.',
    tags: ['Previz', 'FX', 'Grade'],
  },
  {
    index: 'iv',
    name: 'Real-time / WebGL',
    desc: 'Interactive 3D for the browser — configurators, launches, and sites like this one — holding 60fps.',
    tags: ['Three.js', 'Shaders', '60fps'],
  },
]

export const studio: string[] = [
  'VANTA is a small studio of rendering artists and engineers. We make images of things that don’t exist yet — and make them more convincing than a photograph.',
  'We work directly with brands and their agencies: from a single hero still to a season of films. No middle layer, no template, no stock.',
]

// Where enquiries would go. Swap for a real endpoint / address (see form.ts TODO).
export const contactEmail = 'studio@vanta.example'
