import '@fontsource/fredoka/600.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import './devlab.css'
import {
  bezelFor, chromeExtra, COMPARE_SET, deviceById, DEVICES, fitScale, GROUPS, screenFor,
  type Device, type Screen,
} from './devices'

/**
 * QuestBoard Device Lab: the real app running inside phone, tablet, fold, web and TV frames.
 * Every frame runs the app in its sandbox database (see src/app/lab.ts), so testing here never
 * touches real family data. Frames share that sandbox, so side by side frames stay in step the
 * way synced devices will.
 */

type Zoom = 'fit' | '1' | '0.75' | '0.5'
type Screenview = 'kid' | 'parent' | 'tv'

interface LabState {
  device: string
  landscape: boolean | null
  zoom: Zoom
  view: Screenview
  compare: boolean
  demo: boolean
}

const LAB_DB = 'questboard-lab'
const KEY = 'qb-devlab'
const APP_URL = new URL('../', window.location.href)

function loadState(): LabState {
  const fallback: LabState = { device: DEVICES[0].id, landscape: null, zoom: 'fit', view: 'kid', compare: false, demo: true }
  let saved: Partial<LabState> = {}
  try { saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<LabState> } catch { /* storage blocked */ }
  const q = new URLSearchParams(window.location.search)
  const fromUrl: Partial<LabState> = {}
  if (q.get('device')) fromUrl.device = q.get('device')!
  if (q.get('rotate')) fromUrl.landscape = q.get('rotate') === '1'
  if (q.get('compare')) fromUrl.compare = q.get('compare') === '1'
  return { ...fallback, ...saved, ...fromUrl }
}

let state = loadState()

function save(): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage blocked */ }
  const q = new URLSearchParams()
  q.set('device', state.device)
  if (state.landscape !== null) q.set('rotate', state.landscape ? '1' : '0')
  if (state.compare) q.set('compare', '1')
  history.replaceState(null, '', `?${q.toString()}`)
}

function isLandscape(d: Device): boolean {
  if (!d.rotates) return !!d.landscape
  return state.landscape ?? !!d.landscape
}

// Icons ---------------------------------------------------------------------------------------

const ICONS: Record<string, string> = {
  iPhone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M10.5 5h3"/>',
  iPad: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M11 18h2"/>',
  Android: '<rect x="7" y="2" width="10" height="20" rx="2"/><circle cx="12" cy="5" r=".8"/>',
  'Fold and dual': '<rect x="3" y="4" width="8" height="16" rx="1.5"/><rect x="13" y="4" width="8" height="16" rx="1.5"/>',
  Web: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M5 6h.01M7.5 6h.01"/>',
  'TV and displays': '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  rotate: '<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7"/><path d="M20 4v4.7h-4.7"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.3"/><path d="M4 20v-4.7h4.7"/>',
  reload: '<path d="M20 11a8 8 0 1 0-2.3 6.2"/><path d="M20 4v7h-7"/>',
  compare: '<rect x="2" y="5" width="6" height="14" rx="1.5"/><rect x="10" y="3" width="12" height="18" rx="1.5"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  demo: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M15 15.2c.6-.2 1.3-.2 2-.2 2.8 0 4 2 4 5"/>',
  fresh: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  kid: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  parent: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  tv: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
}

function icon(name: string): string {
  return `<svg class="dl-ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] ?? ''}</svg>`
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, html = ''): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  if (html) n.innerHTML = html
  return n
}

function button(label: string, ico: string, onClick: () => void, opts: { pressed?: boolean; title?: string } = {}): HTMLButtonElement {
  const b = el('button', 'dl-btn', `${icon(ico)}<span>${label}</span>`)
  b.type = 'button'
  if (opts.pressed !== undefined) b.setAttribute('aria-pressed', String(opts.pressed))
  if (opts.title) b.title = opts.title
  b.addEventListener('click', onClick)
  return b
}

// Frames --------------------------------------------------------------------------------------

function appSrc(d: Device): string {
  const u = new URL(APP_URL)
  u.searchParams.set('lab', '1')
  if (d.touch) u.searchParams.set('touch', '1')
  if (d.chrome === 'dual' && isLandscape(d)) u.searchParams.set('fold', '1')
  if (state.demo) u.searchParams.set('demo', '1')
  u.hash = state.view === 'kid' ? '' : `#${state.view}`
  return u.toString()
}

function clock(): string {
  const now = new Date()
  const h = now.getHours() % 12 || 12
  return `${h}:${String(now.getMinutes()).padStart(2, '0')}`
}

const STATUS_ICONS = '<svg viewBox="0 0 64 14" aria-hidden="true" fill="currentColor"><rect x="0" y="9" width="3" height="4" rx="1"/><rect x="5" y="6.5" width="3" height="6.5" rx="1"/><rect x="10" y="4" width="3" height="9" rx="1"/><rect x="15" y="1.5" width="3" height="11.5" rx="1"/><path d="M30 12.6l-2.4-2.4a3.4 3.4 0 0 1 4.8 0zM25.6 8.2a6.2 6.2 0 0 1 8.8 0l-1.3 1.3a4.4 4.4 0 0 0-6.2 0zM23.4 6a9.3 9.3 0 0 1 13.2 0l-1.3 1.3a7.5 7.5 0 0 0-10.6 0z"/><rect x="41" y="2" width="20" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".5"/><rect x="43" y="4" width="14" height="6" rx="1.5"/><rect x="62" y="5" width="1.6" height="4" rx=".8" opacity=".5"/></svg>'

interface Built {
  root: HTMLElement
  frame: HTMLIFrameElement
  status: HTMLElement | null
  layout: HTMLElement
  outerW: number
  outerH: number
  scaler: HTMLElement
  body: HTMLElement
}

function buildDevice(d: Device): Built {
  const landscape = isLandscape(d)
  const scr: Screen = screenFor(d, landscape)
  const bezel = bezelFor(d.chrome)
  const extra = chromeExtra(d.chrome, landscape)
  const outerW = scr.width + bezel * 2 + extra.left + extra.right
  const outerH = scr.height + bezel * 2 + extra.top + extra.bottom + (d.chrome === 'tv' ? 40 : 0)

  const root = el('figure', 'dl-unit')
  const scaler = el('div', 'dl-scaler')
  const body = el('div', `dl-device dl-c-${d.chrome}${landscape ? ' dl-land' : ''}`)
  body.style.padding = `${bezel + extra.top}px ${bezel + extra.right}px ${bezel + extra.bottom}px ${bezel + extra.left}px`

  if (d.chrome === 'browser') {
    const bar = el('div', 'dl-browserbar', '<span class="dl-dots"><i></i><i></i><i></i></span>')
    const addr = el('span', 'dl-address')
    addr.textContent = APP_URL.host + APP_URL.pathname
    bar.append(addr)
    body.append(bar)
  }
  if (d.chrome === 'homebutton') body.append(el('span', 'dl-homebutton'))

  const screen = el('div', 'dl-screen')
  screen.style.width = `${scr.width}px`
  screen.style.height = `${scr.height}px`

  const frame = el('iframe', 'dl-frame')
  frame.title = `QuestBoard on ${d.name}`
  frame.width = String(scr.width)
  frame.height = String(scr.height)
  frame.src = appSrc(d)
  frame.addEventListener('load', () => applyInsets(frame, scr))
  screen.append(frame)

  // Overlays sit above the app and never take taps.
  let status: HTMLElement | null = null
  if (['island', 'homebutton', 'punch', 'tablet', 'fold'].includes(d.chrome) && scr.insets.top > 0) {
    status = el('div', `dl-status dl-status-${d.chrome}`)
    status.style.height = `${scr.insets.top}px`
    status.innerHTML = `<span class="dl-time">${clock()}</span><span class="dl-sicons">${STATUS_ICONS}</span>`
    screen.append(status)
  }
  if (d.chrome === 'island') screen.append(el('span', landscape ? 'dl-island dl-island-side' : 'dl-island'))
  if (d.chrome === 'punch') screen.append(el('span', landscape ? 'dl-punch dl-punch-side' : 'dl-punch'))
  if (d.chrome === 'island' || (d.chrome === 'punch' && !landscape) || d.chrome === 'fold') {
    if (scr.insets.bottom > 0) screen.append(el('span', 'dl-homebar'))
  }
  if (d.chrome === 'fold') screen.append(el('span', landscape ? 'dl-crease' : 'dl-crease dl-crease-flat'))
  if (d.chrome === 'dual' && d.hinge) {
    const hinge = el('span', 'dl-hinge')
    if (landscape) {
      hinge.style.cssText = `left:${(scr.width - d.hinge) / 2}px;top:0;width:${d.hinge}px;height:100%`
    } else {
      hinge.style.cssText = `top:${(scr.height - d.hinge) / 2}px;left:0;height:${d.hinge}px;width:100%`
    }
    screen.append(hinge)
  }

  body.append(screen)
  if (d.chrome === 'tv') body.append(el('span', 'dl-stand'))
  scaler.append(body)

  const caption = el('figcaption', 'dl-caption')
  const name = el('strong', '')
  name.textContent = d.name
  const size = el('span', '')
  size.textContent = `${scr.width} x ${scr.height}`
  const layout = el('span', 'dl-layout')
  caption.append(name, size, layout)
  root.append(scaler, caption)
  return { root, frame, status, layout, outerW, outerH, scaler, body }
}

/** Hands the simulated safe areas to the app (see the --qb-lab-* fallbacks in its CSS). */
function applyInsets(frame: HTMLIFrameElement, scr: Screen): void {
  try {
    const root = frame.contentDocument?.documentElement
    if (!root) return
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      root.style.setProperty(`--qb-lab-${side}`, `${scr.insets[side]}px`)
    }
  } catch { /* cross origin, nothing to do */ }
}

/** First solid background from the app's top-level containers down to the page itself. */
function backgroundOf(doc: Document): string {
  const nodes = [doc.querySelector('.qb-shell'), doc.querySelector('#root > *'), doc.body, doc.documentElement]
  for (const n of nodes) {
    if (!n) continue
    const bg = getComputedStyle(n).backgroundColor
    const alpha = bg.match(/rgba?\([^)]*?,[^)]*?,[^)]*?,\s*([\d.]+)\)/)
    if (bg && bg !== 'transparent' && (!alpha || Number(alpha[1]) > 0.5)) return bg
  }
  return 'rgb(255, 255, 255)'
}

function luminance(rgb: string): number {
  const m = rgb.match(/\d+(\.\d+)?/g)
  if (!m) return 1
  const [r, g, b] = m.slice(0, 3).map((v) => {
    const c = Number(v) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Keeps each status bar readable on the app background and shows which layout the app chose. */
function syncFrames(): void {
  for (const b of built) {
    try {
      const doc = b.frame.contentDocument
      if (!doc?.body) continue
      if (b.status) {
        b.status.dataset.tone = luminance(backgroundOf(doc)) < 0.35 ? 'light' : 'dark'
        const time = b.status.querySelector('.dl-time')
        if (time) time.textContent = clock()
      }
      const mode = doc.querySelector<HTMLElement>('[data-mode]')?.dataset.mode
      const tv = doc.querySelector('.tv-stage')
      const label = mode ?? (tv ? 'tv' : doc.querySelector('[class*="setup"]') ? 'setup' : '')
      b.layout.textContent = label ? `${label} layout` : ''
    } catch { /* frame not ready */ }
  }
}

// Layout --------------------------------------------------------------------------------------

let built: Built[] = []
const app = document.getElementById('lab')!
const toolbar = el('header', 'dl-toolbar')
const stage = el('main', 'dl-stage')
const note = el('p', 'dl-note')
app.append(toolbar, stage, note)

function fit(): void {
  const gap = 24
  const n = built.length
  const availW = (stage.clientWidth - 32 - gap * (n - 1)) / n
  const availH = stage.clientHeight - 32 - 44
  for (const b of built) {
    const s = state.zoom === 'fit' ? fitScale(b.outerW, b.outerH, availW, availH) : Number(state.zoom)
    b.scaler.style.width = `${b.outerW * s}px`
    b.scaler.style.height = `${b.outerH * s}px`
    b.body.style.width = `${b.outerW}px`
    b.body.style.height = `${b.outerH}px`
    b.body.style.transform = `scale(${s})`
  }
}

function renderStage(): void {
  stage.replaceChildren()
  const ids = state.compare ? COMPARE_SET : [state.device]
  built = ids.map((id) => buildDevice(deviceById(id)))
  for (const b of built) stage.append(b.root)
  stage.dataset.count = String(built.length)
  fit()
}

function renderToolbar(): void {
  toolbar.replaceChildren()
  const current = deviceById(state.device)

  const brand = el('div', 'dl-brand', '<strong>QuestBoard</strong><span>Device Lab</span>')
  const groups = el('div', 'dl-groups')
  groups.setAttribute('role', 'group')
  groups.setAttribute('aria-label', 'Device type')
  for (const g of GROUPS) {
    const first = DEVICES.find((d) => d.group === g)!
    groups.append(button(g === 'Fold and dual' ? 'Fold' : g === 'TV and displays' ? 'TV' : g, g, () => {
      state = { ...state, device: first.id, landscape: null, compare: false }
      update()
    }, { pressed: !state.compare && current.group === g }))
  }

  const pick = el('select', 'dl-select')
  pick.setAttribute('aria-label', 'Device')
  for (const d of DEVICES.filter((x) => x.group === current.group)) {
    const o = el('option', '')
    o.value = d.id
    o.textContent = d.name
    o.selected = d.id === current.id
    pick.append(o)
  }
  pick.disabled = state.compare
  pick.addEventListener('change', () => { state = { ...state, device: pick.value, landscape: null }; update() })

  const zoom = el('select', 'dl-select')
  zoom.setAttribute('aria-label', 'Zoom')
  for (const [v, t] of [['fit', 'Fit'], ['1', '100%'], ['0.75', '75%'], ['0.5', '50%']] as const) {
    const o = el('option', '')
    o.value = v
    o.textContent = t
    o.selected = state.zoom === v
    zoom.append(o)
  }
  zoom.addEventListener('change', () => { state = { ...state, zoom: zoom.value as Zoom }; save(); fit() })

  const rotate = button('Rotate', 'rotate', () => {
    state = { ...state, landscape: !isLandscape(current) }
    update()
  })
  rotate.disabled = state.compare || !current.rotates

  const views = el('div', 'dl-groups')
  views.setAttribute('role', 'group')
  views.setAttribute('aria-label', 'Screen')
  for (const [v, t] of [['kid', 'Kid'], ['parent', 'Parent'], ['tv', 'TV board']] as const) {
    views.append(button(t, v, () => { state = { ...state, view: v }; update() }, { pressed: state.view === v }))
  }

  const tools = el('div', 'dl-groups')
  tools.append(
    button('Side by side', 'compare', () => { state = { ...state, compare: !state.compare }; update() }, { pressed: state.compare, title: 'iPhone, Pixel and iPad at once, sharing one sandbox' }),
    button('Reload', 'reload', () => renderStage()),
    button('Demo family', 'demo', () => void resetSandbox(true), { title: 'Erase the sandbox and load Nolan and Makenna (parent PIN 1234)' }),
    button('Fresh install', 'fresh', () => void resetSandbox(false), { title: 'Erase the sandbox and start at setup' }),
    button('Open app', 'open', () => window.open(appSrc(current), '_blank', 'noopener')),
  )

  const row1 = el('div', 'dl-row')
  row1.append(brand, groups, pick, rotate, zoom)
  const row2 = el('div', 'dl-row')
  row2.append(views, tools)
  toolbar.append(row1, row2)
}

async function resetSandbox(demo: boolean): Promise<void> {
  for (const b of built) b.frame.src = 'about:blank'
  await new Promise((r) => setTimeout(r, 150))
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(LAB_DB)
    req.onsuccess = req.onerror = req.onblocked = () => resolve()
  })
  state = { ...state, demo }
  save()
  renderStage()
}

function update(): void {
  save()
  renderToolbar()
  renderStage()
}

note.textContent = 'Sandbox data: everything here lives in a separate lab database in this browser, apart from real family data. Demo parent PIN is 1234. Frames show the installed app full screen; safe areas match the real device. Touch is simulated with the mouse.'

new ResizeObserver(() => fit()).observe(stage)
setInterval(syncFrames, 700)
update()
