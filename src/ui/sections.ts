import { projects, capabilities, studio, type Project } from './content'

// Builds the DOM for Work / Capabilities / Studio from content.ts, wires the
// case-study panel, and reveals content as each section scrolls into view. All copy
// is data-driven; the 3D world is animated separately by the camera rig.

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function buildWork(): void {
  const list = document.getElementById('work-list')
  if (!list) return
  projects.forEach((p, i) => {
    const row = el('li', 'work__row reveal')
    row.style.transitionDelay = `${i * 0.07}s`
    row.dataset.id = p.id
    row.tabIndex = 0
    row.setAttribute('role', 'button')
    row.setAttribute('aria-label', `${p.title} — view case study`)

    row.append(
      el('span', 'work__no', String(i + 1).padStart(2, '0')),
      el('span', 'work__title', p.title),
      el('span', 'work__meta', `${p.discipline} · ${p.year}`),
    )

    const open = (): void => openCase(p)
    row.addEventListener('click', open)
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        open()
      }
    })
    list.append(row)
  })
}

function buildCapabilities(): void {
  const list = document.getElementById('caps-list')
  if (!list) return
  capabilities.forEach((c, i) => {
    const row = el('li', 'caps__row reveal')
    row.style.transitionDelay = `${i * 0.07}s`

    const left = el('div', 'caps__name')
    left.innerHTML = `<span class="caps__rn">${c.index}</span>${c.name}`

    const right = el('div')
    right.append(el('p', 'caps__desc', c.desc))
    right.append(el('p', 'caps__tags', c.tags.join('  ·  ')))

    row.append(left, right)
    list.append(row)
  })
}

function buildStudio(): void {
  const wrap = document.getElementById('studio-copy')
  if (!wrap) return
  studio.forEach((para, i) => {
    const p = el('p', 'reveal')
    p.style.transitionDelay = `${i * 0.1}s`
    if (i > 0) p.classList.add('muted')
    p.textContent = para
    wrap.append(p)
  })
}

// ---- Case-study panel ----------------------------------------------------------

let panel: HTMLElement | null = null

function ensurePanel(): HTMLElement {
  if (panel) return panel
  panel = el('div', 'casepanel')
  panel.setAttribute('role', 'dialog')
  panel.setAttribute('aria-modal', 'true')
  panel.hidden = true
  panel.innerHTML = `
    <div class="casepanel__backdrop" data-close></div>
    <article class="casepanel__sheet">
      <button class="casepanel__close" data-close aria-label="Close">Close ✕</button>
      <div class="casepanel__visual" data-visual></div>
      <div class="casepanel__body">
        <span class="casepanel__index" data-meta></span>
        <h3 class="casepanel__title" data-title></h3>
        <p class="casepanel__lede" data-lede></p>
        <p class="casepanel__text" data-text></p>
        <ul class="casepanel__role" data-role></ul>
      </div>
    </article>`
  panel.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).hasAttribute('data-close')) closeCase()
  })
  document.body.append(panel)
  return panel
}

function openCase(p: Project): void {
  const node = ensurePanel()
  const q = <T extends Element>(sel: string): T => node.querySelector(sel) as T

  q<HTMLElement>('[data-meta]').textContent = `${p.client} — ${p.year}`
  q<HTMLElement>('[data-title]').textContent = p.title
  q<HTMLElement>('[data-lede]').textContent = p.blurb
  q<HTMLElement>('[data-text]').textContent = p.body

  const role = q<HTMLElement>('[data-role]')
  role.innerHTML = ''
  for (const r of p.role) role.append(el('li', undefined, r))

  // Procedural placeholder visual tinted per project (real image drops in here).
  const visual = q<HTMLElement>('[data-visual]')
  if (p.image) {
    visual.style.backgroundImage = `url(/work/${p.image})`
    visual.textContent = ''
  } else {
    // Warm, sodium-keyed placeholder — varies position per project, never hue.
    const seed = p.id.charCodeAt(0)
    const hue = 20 + (seed % 18) // 20–37: amber → burnt orange only
    const px = 24 + (seed % 34)
    visual.style.background = `
      radial-gradient(120% 90% at ${px}% 20%, hsl(${hue} 55% 16%), transparent 62%),
      radial-gradient(70% 55% at 80% 90%, rgba(232,163,61,0.16), transparent 60%),
      linear-gradient(160deg, #0c0b0e, #070708)`
    visual.innerHTML = `<span>${p.discipline}</span>`
  }

  node.hidden = false
  // Force reflow so the open transition runs.
  void node.offsetWidth
  node.classList.add('is-open')
  document.body.classList.add('locked')
  ;(node.querySelector('.casepanel__close') as HTMLElement)?.focus()
}

function closeCase(): void {
  if (!panel) return
  panel.classList.remove('is-open')
  document.body.classList.remove('locked')
  const node = panel
  setTimeout(() => {
    node.hidden = true
  }, 600)
}

// ---- Scroll reveal -------------------------------------------------------------

function setupReveal(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.section'))
  const hero = document.getElementById('hero')
  let ticking = false

  const check = (): void => {
    ticking = false
    const vh = window.innerHeight
    for (const s of sections) {
      const r = s.getBoundingClientRect()
      if (r.top < vh * 0.82 && r.bottom > vh * 0.18) s.classList.add('in')
    }
    // Fade the fixed brand once the hero is mostly gone (avoids heading collisions).
    if (hero) {
      const hr = hero.getBoundingClientRect()
      document.body.classList.toggle('past-hero', hr.bottom < vh * 0.55)
    }
  }

  const onScroll = (): void => {
    if (!ticking) {
      ticking = true
      requestAnimationFrame(check)
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  check()
}

export function initSections(): void {
  buildWork()
  buildCapabilities()
  buildStudio()
  setupReveal()

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCase()
  })
}
