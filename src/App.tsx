import JSZip from 'jszip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

type DeviceMode = 'desktop' | 'tablet' | 'mobile'
type ThemeMode = 'system' | 'light' | 'dark'
type Align = 'left' | 'center' | 'right'
type ElementKind =
  | 'navbar'
  | 'hero'
  | 'text'
  | 'richText'
  | 'button'
  | 'image'
  | 'gallery'
  | 'card'
  | 'cardGrid'
  | 'features'
  | 'pricing'
  | 'testimonial'
  | 'faq'
  | 'stats'
  | 'contact'
  | 'footer'
  | 'video'
  | 'divider'
  | 'spacer'
  | 'rect'
  | 'circle'
  | 'line'
  | 'pill'
  | 'blob'
  | 'badge'
  | 'icon'

type AnimationType = 'none' | 'fade' | 'rise' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale' | 'blur'
type Easing = 'ease' | 'ease-out' | 'ease-in-out' | 'spring'

type Placement = {
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

type ElementStyle = {
  background: string
  color: string
  borderColor: string
  borderWidth: number
  radius: number
  opacity: number
  fontSize: number
  fontWeight: number
  fontFamily: string
  align: Align
  padding: number
  shadow: number
  rotation: number
}

type ElementAnimation = {
  type: AnimationType
  duration: number
  delay: number
  easing: Easing
  repeat: boolean
}

type BuilderElement = {
  id: string
  kind: ElementKind
  name: string
  title: string
  text: string
  subtext: string
  action: string
  src: string
  placement: Placement
  overrides: Partial<Record<DeviceMode, Partial<Placement>>>
  style: ElementStyle
  animation: ElementAnimation
}

type BuilderProject = {
  name: string
  themeMode: ThemeMode
  pageBackground: string
  elements: BuilderElement[]
}

type DragState = {
  id: string
  mode: 'move' | 'resize'
  pointerX: number
  pointerY: number
  start: Placement
}

const storageKey = 'webception-project-v2'

const canvasSizes: Record<DeviceMode, { width: number; height: number }> = {
  desktop: { width: 1200, height: 820 },
  tablet: { width: 768, height: 960 },
  mobile: { width: 390, height: 1120 },
}

const fonts = ['Satoshi', 'General Sans', 'Hind', 'Nunito']

const animations: Array<{ value: AnimationType; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'rise', label: 'Rise' },
  { value: 'slide-left', label: 'Slide left' },
  { value: 'slide-right', label: 'Slide right' },
  { value: 'slide-up', label: 'Slide up' },
  { value: 'slide-down', label: 'Slide down' },
  { value: 'scale', label: 'Scale' },
  { value: 'blur', label: 'Blur in' },
]

const paletteGroups: Array<{
  label: string
  items: Array<{ kind: ElementKind; label: string; detail: string }>
}> = [
  {
    label: 'Structure',
    items: [
      { kind: 'navbar', label: 'Navbar', detail: 'Brand and links' },
      { kind: 'hero', label: 'Hero', detail: 'Headline and CTA' },
      { kind: 'footer', label: 'Footer', detail: 'Links and closing copy' },
      { kind: 'divider', label: 'Divider', detail: 'Section rule' },
      { kind: 'spacer', label: 'Spacer', detail: 'Empty breathing room' },
    ],
  },
  {
    label: 'Content',
    items: [
      { kind: 'text', label: 'Text', detail: 'Short paragraph' },
      { kind: 'richText', label: 'Rich text', detail: 'Editorial block' },
      { kind: 'button', label: 'Button', detail: 'Primary action' },
      { kind: 'image', label: 'Image', detail: 'Single visual' },
      { kind: 'gallery', label: 'Gallery', detail: 'Three image strip' },
      { kind: 'video', label: 'Video', detail: 'Embed placeholder' },
    ],
  },
  {
    label: 'Sections',
    items: [
      { kind: 'card', label: 'Card', detail: 'Compact callout' },
      { kind: 'cardGrid', label: 'Card grid', detail: 'Three feature cards' },
      { kind: 'features', label: 'Features', detail: 'Checklist section' },
      { kind: 'pricing', label: 'Pricing', detail: 'Plan preview' },
      { kind: 'testimonial', label: 'Testimonial', detail: 'Quote block' },
      { kind: 'faq', label: 'FAQ', detail: 'Question list' },
      { kind: 'stats', label: 'Stats', detail: 'Metric row' },
      { kind: 'contact', label: 'Contact', detail: 'Form mock' },
    ],
  },
  {
    label: 'Shapes',
    items: [
      { kind: 'rect', label: 'Rectangle', detail: 'Filled shape' },
      { kind: 'circle', label: 'Circle', detail: 'Round shape' },
      { kind: 'line', label: 'Line', detail: 'Stroke line' },
      { kind: 'pill', label: 'Pill', detail: 'Rounded label' },
      { kind: 'blob', label: 'Blob', detail: 'Organic backdrop' },
      { kind: 'badge', label: 'Badge', detail: 'Small label' },
      { kind: 'icon', label: 'Icon', detail: 'Simple mark' },
    ],
  },
]

const starterProject: BuilderProject = {
  name: 'Home',
  themeMode: 'system',
  pageBackground: '#f7f8f3',
  elements: [
    makeElement('navbar', { x: 64, y: 36, width: 1072, height: 72, zIndex: 4 }),
    makeElement('hero', { x: 82, y: 146, width: 620, height: 310, zIndex: 2 }),
    makeElement('cardGrid', { x: 82, y: 510, width: 650, height: 210, zIndex: 2 }),
    makeElement('image', { x: 770, y: 172, width: 330, height: 420, zIndex: 1 }),
    makeElement('badge', { x: 788, y: 128, width: 190, height: 38, zIndex: 3 }),
    makeElement('blob', { x: 700, y: 122, width: 420, height: 520, zIndex: 0 }),
  ],
}

function App() {
  const [project, setProject] = useState<BuilderProject>(loadProject)
  const [history, setHistory] = useState<BuilderProject[]>([])
  const [future, setFuture] = useState<BuilderProject[]>([])
  const [selectedId, setSelectedId] = useState(project.elements[0]?.id ?? '')
  const [device, setDevice] = useState<DeviceMode>('desktop')
  const [zoom, setZoom] = useState(78)
  const [lastSaved, setLastSaved] = useState('Saved locally')
  const [isExporting, setIsExporting] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewTick, setPreviewTick] = useState(0)
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const dragRef = useRef<DragState | null>(null)

  const selected = project.elements.find((element) => element.id === selectedId) ?? project.elements[0]
  const resolvedTheme = project.themeMode === 'system' ? (systemDark ? 'dark' : 'light') : project.themeMode
  const canvasSize = canvasSizes[device]
  const exportBundle = useMemo(() => buildExport(project), [project])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(project))
    const timer = window.setTimeout(() => setLastSaved('Saved locally'), 250)
    return () => window.clearTimeout(timer)
  }, [project])

  const commitProject = useCallback((updater: (current: BuilderProject) => BuilderProject) => {
    setLastSaved('Saving')
    setProject((current) => {
      const next = updater(current)
      if (next === current) return current
      setHistory((items) => [...items.slice(-29), current])
      setFuture([])
      return next
    })
  }, [])

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const dx = (event.clientX - drag.pointerX) / (zoom / 100)
      const dy = (event.clientY - drag.pointerY) / (zoom / 100)
      const next: Placement =
        drag.mode === 'move'
          ? { ...drag.start, x: Math.round(drag.start.x + dx), y: Math.round(drag.start.y + dy) }
          : {
              ...drag.start,
              width: Math.max(32, Math.round(drag.start.width + dx)),
              height: Math.max(24, Math.round(drag.start.height + dy)),
            }
      setProject((current) => updateElementPlacement(current, drag.id, device, next, false))
      setLastSaved('Saving')
    }

    function handlePointerUp() {
      dragRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [device, zoom])

  function addElement(kind: ElementKind) {
    const maxZ = Math.max(0, ...project.elements.map((item) => item.placement.zIndex))
    const offset = project.elements.length * 14
    const element = makeElement(kind, {
      x: 90 + (offset % 180),
      y: 120 + (offset % 260),
      zIndex: maxZ + 1,
    })
    commitProject((current) => ({ ...current, elements: [...current.elements, element] }))
    setSelectedId(element.id)
  }

  function updateElement(patch: Partial<BuilderElement>) {
    if (!selected) return
    commitProject((current) => ({
      ...current,
      elements: current.elements.map((element) => (element.id === selected.id ? { ...element, ...patch } : element)),
    }))
  }

  function updateStyle(patch: Partial<ElementStyle>) {
    if (!selected) return
    commitProject((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === selected.id ? { ...element, style: { ...element.style, ...patch } } : element,
      ),
    }))
  }

  function updateAnimation(patch: Partial<ElementAnimation>) {
    if (!selected) return
    commitProject((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === selected.id ? { ...element, animation: { ...element.animation, ...patch } } : element,
      ),
    }))
  }

  function updatePlacement(patch: Partial<Placement>) {
    if (!selected) return
    const placement = resolvePlacement(selected, device)
    commitProject((current) =>
      updateElementPlacement(current, selected.id, device, { ...placement, ...patch }, true),
    )
  }

  function clearAll() {
    if (!window.confirm('Clear the canvas? This keeps the project but removes every element.')) return
    commitProject((current) => ({ ...current, elements: [] }))
    setSelectedId('')
  }

  function resetTemplate() {
    if (!window.confirm('Reset to the starter Webception template?')) return
    commitProject(() => cloneProject(starterProject))
    setSelectedId(starterProject.elements[0].id)
  }

  function deleteSelected() {
    if (!selected) return
    commitProject((current) => ({ ...current, elements: current.elements.filter((element) => element.id !== selected.id) }))
    setSelectedId(project.elements.find((element) => element.id !== selected.id)?.id ?? '')
  }

  function duplicateSelected() {
    if (!selected) return
    const duplicate = {
      ...cloneElement(selected),
      id: createId(selected.kind),
      name: `${selected.name} copy`,
      placement: {
        ...selected.placement,
        x: selected.placement.x + 28,
        y: selected.placement.y + 28,
        zIndex: Math.max(1, ...project.elements.map((element) => element.placement.zIndex)) + 1,
      },
    }
    commitProject((current) => ({ ...current, elements: [...current.elements, duplicate] }))
    setSelectedId(duplicate.id)
  }

  function moveLayer(delta: number) {
    if (!selected) return
    const nextZ = Math.max(0, selected.placement.zIndex + delta)
    updatePlacement({ zIndex: nextZ })
  }

  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setFuture((items) => [project, ...items])
    setHistory((items) => items.slice(0, -1))
    setProject(previous)
    setSelectedId(previous.elements[0]?.id ?? '')
  }

  function redo() {
    const next = future[0]
    if (!next) return
    setHistory((items) => [...items, project])
    setFuture((items) => items.slice(1))
    setProject(next)
    setSelectedId(next.elements[0]?.id ?? '')
  }

  function startDrag(event: React.PointerEvent, element: BuilderElement, mode: DragState['mode']) {
    if ((event.target as HTMLElement).closest('button, input, textarea, select')) return
    event.preventDefault()
    setSelectedId(element.id)
    dragRef.current = {
      id: element.id,
      mode,
      pointerX: event.clientX,
      pointerY: event.clientY,
      start: resolvePlacement(element, device),
    }
  }

  async function downloadSite() {
    setIsExporting(true)
    const zip = new JSZip()
    zip.file('index.html', exportBundle.html)
    zip.file('styles.css', exportBundle.css)
    zip.file('script.js', exportBundle.js)
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'webception-site.zip'
    link.click()
    URL.revokeObjectURL(url)
    setIsExporting(false)
  }

  return (
    <main className="app-shell" data-theme={resolvedTheme}>
      <header className="topbar">
        <div className="brand-lockup" aria-label="Webception editor">
          <LogoMark />
          <div>
            <strong>Webception</strong>
            <span>Freeform website studio</span>
          </div>
        </div>

        <div className="page-control" aria-label="Current page">
          <span>Pages</span>
          <input
            aria-label="Page name"
            value={project.name}
            onChange={(event) => commitProject((current) => ({ ...current, name: event.target.value }))}
          />
          <button type="button" onClick={resetTemplate}>Starter</button>
        </div>

        <nav className="top-actions" aria-label="Editor actions">
          {(['desktop', 'tablet', 'mobile'] as const).map((mode) => (
            <button type="button" key={mode} onClick={() => setDevice(mode)} className={device === mode ? 'active' : ''}>
              {mode}
            </button>
          ))}
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => commitProject((current) => ({ ...current, themeMode: mode }))}
              className={project.themeMode === mode ? 'active ghost-active' : ''}
            >
              {mode}
            </button>
          ))}
          <button type="button" onClick={undo} disabled={!history.length}>Undo</button>
          <button type="button" onClick={redo} disabled={!future.length}>Redo</button>
          <button type="button" className="secondary-action" onClick={() => setIsPreviewing((value) => !value)}>Preview</button>
          <button type="button" className="primary-action" onClick={downloadSite} disabled={isExporting}>
            {isExporting ? 'Exporting' : 'Download'}
          </button>
        </nav>
      </header>

      <section className="workspace">
        <aside className="left-panel" aria-label="Blocks panel">
          <div className="panel-heading">
            <span>Blocks</span>
            <small>Tap to add</small>
          </div>
          <div className="palette-scroll">
            {paletteGroups.map((group) => (
              <section className="palette-group" key={group.label}>
                <h2>{group.label}</h2>
                <div className="block-list">
                  {group.items.map((item) => (
                    <button type="button" key={item.kind} className="block-tile" onClick={() => addElement(item.kind)}>
                      <span className={`block-icon ${item.kind}`} aria-hidden="true" />
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <section className="canvas-stage" aria-label="Canvas">
          <div className="canvas-ruler">
            <span>{device} canvas</span>
            <i />
            <span>{zoom}%</span>
          </div>
          <div
            className={`site-canvas ${isPreviewing ? 'previewing' : ''}`}
            style={{
              width: canvasSize.width,
              height: canvasSize.height,
              transform: `scale(${zoom / 100})`,
              background: project.pageBackground,
            }}
          >
            <div className="alignment-guide" aria-hidden="true" />
            {project.elements
              .toSorted((a, b) => resolvePlacement(a, device).zIndex - resolvePlacement(b, device).zIndex)
              .map((element) => {
                const placement = resolvePlacement(element, device)
                return (
                  <CanvasElement
                    key={`${element.id}-${previewTick}`}
                    element={element}
                    placement={placement}
                    selected={element.id === selectedId}
                    previewing={isPreviewing}
                    onSelect={() => setSelectedId(element.id)}
                    onPointerDown={(event) => startDrag(event, element, 'move')}
                    onResizePointerDown={(event) => startDrag(event, element, 'resize')}
                  />
                )
              })}
          </div>
        </section>

        <aside className="right-panel" aria-label="Inspector panel">
          <div className="panel-heading">
            <span>Inspector</span>
            <small>{selected?.kind ?? 'Nothing selected'}</small>
          </div>
          {selected ? (
            <Inspector
              selected={selected}
              placement={resolvePlacement(selected, device)}
              device={device}
              pageBackground={project.pageBackground}
              onProjectBackground={(pageBackground) => commitProject((current) => ({ ...current, pageBackground }))}
              onUpdate={updateElement}
              onStyle={updateStyle}
              onAnimation={updateAnimation}
              onPlacement={updatePlacement}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onLayer={moveLayer}
              onPreview={() => {
                setPreviewTick((value) => value + 1)
                setIsPreviewing(true)
              }}
            />
          ) : (
            <div className="empty-inspector">
              <h2>No element selected</h2>
              <p>Add a block or choose something on the canvas.</p>
              <button type="button" onClick={() => addElement('hero')}>Add hero</button>
            </div>
          )}
        </aside>
      </section>

      <footer className="statusbar">
        <span>{lastSaved}</span>
        <span>{project.elements.length} elements</span>
        <label>
          Zoom
          <input
            type="range"
            min="45"
            max="105"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <button type="button" onClick={clearAll}>Clear all</button>
      </footer>
    </main>
  )
}

function Inspector({
  selected,
  placement,
  device,
  pageBackground,
  onProjectBackground,
  onUpdate,
  onStyle,
  onAnimation,
  onPlacement,
  onDelete,
  onDuplicate,
  onLayer,
  onPreview,
}: {
  selected: BuilderElement
  placement: Placement
  device: DeviceMode
  pageBackground: string
  onProjectBackground: (value: string) => void
  onUpdate: (patch: Partial<BuilderElement>) => void
  onStyle: (patch: Partial<ElementStyle>) => void
  onAnimation: (patch: Partial<ElementAnimation>) => void
  onPlacement: (patch: Partial<Placement>) => void
  onDelete: () => void
  onDuplicate: () => void
  onLayer: (delta: number) => void
  onPreview: () => void
}) {
  return (
    <div className="inspector-stack">
      <section className="control-section">
        <h2>Content</h2>
        <label>
          <span>Name</span>
          <input value={selected.name} onChange={(event) => onUpdate({ name: event.target.value })} />
        </label>
        <label>
          <span>Title</span>
          <input value={selected.title} onChange={(event) => onUpdate({ title: event.target.value })} />
        </label>
        <label>
          <span>Text</span>
          <textarea value={selected.text} onChange={(event) => onUpdate({ text: event.target.value })} />
        </label>
        <label>
          <span>Supporting text</span>
          <textarea value={selected.subtext} onChange={(event) => onUpdate({ subtext: event.target.value })} />
        </label>
        <label>
          <span>Action / label</span>
          <input value={selected.action} onChange={(event) => onUpdate({ action: event.target.value })} />
        </label>
        {(selected.kind === 'image' || selected.kind === 'gallery' || selected.kind === 'video') && (
          <label>
            <span>Media URL</span>
            <input value={selected.src} onChange={(event) => onUpdate({ src: event.target.value })} />
          </label>
        )}
      </section>

      <section className="control-section">
        <h2>Responsive frame: {device}</h2>
        <div className="number-grid">
          <label>
            <span>X</span>
            <input type="number" value={placement.x} onChange={(event) => onPlacement({ x: Number(event.target.value) })} />
          </label>
          <label>
            <span>Y</span>
            <input type="number" value={placement.y} onChange={(event) => onPlacement({ y: Number(event.target.value) })} />
          </label>
          <label>
            <span>W</span>
            <input type="number" value={placement.width} onChange={(event) => onPlacement({ width: Number(event.target.value) })} />
          </label>
          <label>
            <span>H</span>
            <input type="number" value={placement.height} onChange={(event) => onPlacement({ height: Number(event.target.value) })} />
          </label>
        </div>
      </section>

      <section className="control-section">
        <h2>Style</h2>
        <div className="segmented-control" aria-label="Text alignment">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button type="button" key={align} className={selected.style.align === align ? 'active' : ''} onClick={() => onStyle({ align })}>
              {align}
            </button>
          ))}
        </div>
        <label>
          <span>Font</span>
          <select value={selected.style.fontFamily} onChange={(event) => onStyle({ fontFamily: event.target.value })}>
            {fonts.map((font) => (
              <option value={font} key={font}>{font}</option>
            ))}
          </select>
        </label>
        <Range label="Font size" min={10} max={82} value={selected.style.fontSize} onChange={(fontSize) => onStyle({ fontSize })} />
        <Range label="Padding" min={0} max={48} value={selected.style.padding} onChange={(padding) => onStyle({ padding })} />
        <Range label="Radius" min={0} max={80} value={selected.style.radius} onChange={(radius) => onStyle({ radius })} />
        <Range label="Opacity" min={20} max={100} value={selected.style.opacity} onChange={(opacity) => onStyle({ opacity })} />
        <Range label="Rotate" min={-24} max={24} value={selected.style.rotation} onChange={(rotation) => onStyle({ rotation })} />
        <Range label="Shadow" min={0} max={32} value={selected.style.shadow} onChange={(shadow) => onStyle({ shadow })} />
        <div className="color-pair">
          <label>
            <span>Text</span>
            <input type="color" value={selected.style.color} onChange={(event) => onStyle({ color: event.target.value })} />
          </label>
          <label>
            <span>Fill</span>
            <input type="color" value={selected.style.background} onChange={(event) => onStyle({ background: event.target.value })} />
          </label>
          <label>
            <span>Border</span>
            <input type="color" value={selected.style.borderColor} onChange={(event) => onStyle({ borderColor: event.target.value })} />
          </label>
          <label>
            <span>Page</span>
            <input type="color" value={pageBackground} onChange={(event) => onProjectBackground(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="control-section">
        <h2>Animation</h2>
        <label>
          <span>Type</span>
          <select value={selected.animation.type} onChange={(event) => onAnimation({ type: event.target.value as AnimationType })}>
            {animations.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Easing</span>
          <select value={selected.animation.easing} onChange={(event) => onAnimation({ easing: event.target.value as Easing })}>
            {(['ease', 'ease-out', 'ease-in-out', 'spring'] as const).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <Range label="Duration" min={150} max={2200} value={selected.animation.duration} onChange={(duration) => onAnimation({ duration })} />
        <Range label="Delay" min={0} max={1600} value={selected.animation.delay} onChange={(delay) => onAnimation({ delay })} />
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={selected.animation.repeat}
            onChange={(event) => onAnimation({ repeat: event.target.checked })}
          />
          <span>Loop animation</span>
        </label>
        <button type="button" className="wide-action" onClick={onPreview}>Preview animation</button>
      </section>

      <section className="control-section">
        <h2>Layer</h2>
        <div className="inspector-actions">
          <button type="button" onClick={() => onLayer(1)}>Forward</button>
          <button type="button" onClick={() => onLayer(-1)}>Backward</button>
          <button type="button" onClick={onDuplicate}>Duplicate</button>
          <button type="button" className="danger" onClick={onDelete}>Delete</button>
        </div>
      </section>
    </div>
  )
}

function Range({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function CanvasElement({
  element,
  placement,
  selected,
  previewing,
  onSelect,
  onPointerDown,
  onResizePointerDown,
}: {
  element: BuilderElement
  placement: Placement
  selected: boolean
  previewing: boolean
  onSelect: () => void
  onPointerDown: (event: React.PointerEvent) => void
  onResizePointerDown: (event: React.PointerEvent) => void
}) {
  const style = {
    left: placement.x,
    top: placement.y,
    width: placement.width,
    height: placement.height,
    zIndex: placement.zIndex,
    '--element-bg': element.style.background,
    '--element-color': element.style.color,
    '--element-border': element.style.borderColor,
    '--element-border-width': `${element.style.borderWidth}px`,
    '--element-radius': `${element.style.radius}px`,
    '--element-opacity': `${element.style.opacity / 100}`,
    '--element-size': `${element.style.fontSize}px`,
    '--element-weight': element.style.fontWeight,
    '--element-font': `'${element.style.fontFamily}', Satoshi, sans-serif`,
    '--element-padding': `${element.style.padding}px`,
    '--element-shadow': `0 ${element.style.shadow}px ${element.style.shadow * 2.4}px rgba(21, 27, 22, ${element.style.shadow ? 0.14 : 0})`,
    '--element-rotation': `${element.style.rotation}deg`,
    '--animation-duration': `${element.animation.duration}ms`,
    '--animation-delay': `${element.animation.delay}ms`,
    '--animation-easing': element.animation.easing === 'spring' ? 'cubic-bezier(.16,1,.3,1)' : element.animation.easing,
    '--animation-count': element.animation.repeat ? 'infinite' : '1',
  } as React.CSSProperties

  return (
    <article
      className={`canvas-element ${element.kind} ${selected ? 'selected' : ''} ${previewing ? `animate-${element.animation.type}` : ''}`}
      style={style}
      onClick={onSelect}
      onPointerDown={onPointerDown}
      tabIndex={0}
      onFocus={onSelect}
      aria-label={`${element.name} element`}
    >
      <ElementContent element={element} />
      {selected && (
        <>
          <span className="resize-handle top-left" />
          <span className="resize-handle top-right" />
          <span className="resize-handle bottom-left" />
          <span className="resize-handle bottom-right" onPointerDown={onResizePointerDown} />
        </>
      )}
    </article>
  )
}

function ElementContent({ element }: { element: BuilderElement }) {
  switch (element.kind) {
    case 'navbar':
      return (
        <div className="navbar-render">
          <strong>{element.title}</strong>
          <nav><span>Work</span><span>Pricing</span><span>Contact</span></nav>
          <button type="button">{element.action}</button>
        </div>
      )
    case 'hero':
      return (
        <div className={`content-render align-${element.style.align}`}>
          <h1>{element.title}</h1>
          <p>{element.text}</p>
          <small>{element.subtext}</small>
          <button type="button">{element.action}</button>
        </div>
      )
    case 'button':
      return <button type="button" className="button-render">{element.text || element.action}</button>
    case 'image':
      return <img className="image-render" src={element.src} alt="" />
    case 'gallery':
      return (
        <div className="gallery-render">
          {[1, 2, 3].map((item) => <img key={item} src={`https://picsum.photos/seed/webception-gallery-${item}/500/380`} alt="" />)}
        </div>
      )
    case 'video':
      return <div className="video-render"><span /> <strong>{element.title}</strong><p>{element.text}</p></div>
    case 'card':
      return <div className="content-render"><h2>{element.title}</h2><p>{element.text}</p></div>
    case 'cardGrid':
      return (
        <div className="grid-render">
          {['Design', 'Tune', 'Ship'].map((item) => <section key={item}><strong>{item}</strong><p>{element.text}</p></section>)}
        </div>
      )
    case 'features':
      return <ListRender title={element.title} items={['Responsive controls', 'Editable styling', 'Reusable blocks']} />
    case 'pricing':
      return <div className="pricing-render"><h2>{element.title}</h2><strong>$12</strong><p>{element.text}</p><button type="button">{element.action}</button></div>
    case 'testimonial':
      return <blockquote className="quote-render">"{element.text}"<cite>{element.title}</cite></blockquote>
    case 'faq':
      return <ListRender title={element.title} items={['Can I export it?', 'Does it work locally?', 'Can I animate blocks?']} />
    case 'stats':
      return <div className="stats-render">{['18 blocks', '3 devices', '9 motions'].map((item) => <strong key={item}>{item}</strong>)}</div>
    case 'contact':
      return <div className="form-render"><input placeholder="Name" /><input placeholder="Email" /><textarea placeholder="Message" /><button type="button">{element.action}</button></div>
    case 'footer':
      return <div className="footer-render"><strong>{element.title}</strong><span>{element.text}</span></div>
    case 'divider':
      return <div className="divider-render" />
    case 'spacer':
      return <div className="spacer-render" />
    case 'circle':
    case 'rect':
    case 'line':
    case 'pill':
    case 'blob':
    case 'badge':
    case 'icon':
      return <ShapeRender element={element} />
    default:
      return <div className="content-render"><h2>{element.title}</h2><p>{element.text}</p></div>
  }
}

function ListRender({ title, items }: { title: string; items: string[] }) {
  return <div className="list-render"><h2>{title}</h2>{items.map((item) => <p key={item}>{item}</p>)}</div>
}

function ShapeRender({ element }: { element: BuilderElement }) {
  if (element.kind === 'icon') return <div className="icon-render"><LogoMark /></div>
  if (element.kind === 'line') return <div className="line-render" />
  if (element.kind === 'badge' || element.kind === 'pill') return <span className="badge-render">{element.text}</span>
  return <span className="shape-render" />
}

function LogoMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M7 25.5 13.5 8h5L12 25.5H7Z" />
      <path d="M17.5 25.5 24 8h5l-6.5 17.5h-5Z" opacity=".78" />
    </svg>
  )
}

function loadProject(): BuilderProject {
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return cloneProject(starterProject)
    const parsed = JSON.parse(saved) as BuilderProject
    if (!Array.isArray(parsed.elements)) return cloneProject(starterProject)
    return parsed
  } catch {
    return cloneProject(starterProject)
  }
}

function createId(kind: ElementKind) {
  return `${kind}-${crypto.randomUUID().slice(0, 8)}`
}

function makeElement(kind: ElementKind, placementPatch: Partial<Placement> = {}): BuilderElement {
  const basePlacement = defaultPlacement(kind)
  const baseStyle = defaultStyle(kind)
  const copy = defaultCopy(kind)
  return {
    id: createId(kind),
    kind,
    name: copy.name,
    title: copy.title,
    text: copy.text,
    subtext: copy.subtext,
    action: copy.action,
    src: copy.src,
    placement: { ...basePlacement, ...placementPatch },
    overrides: {
      tablet: { x: Math.round((placementPatch.x ?? basePlacement.x) * 0.62), width: Math.min(650, placementPatch.width ?? basePlacement.width) },
      mobile: { x: 24, width: 342, y: Math.round((placementPatch.y ?? basePlacement.y) * 0.82) },
    },
    style: baseStyle,
    animation: { type: 'rise', duration: 620, delay: 0, easing: 'ease-out', repeat: false },
  }
}

function defaultPlacement(kind: ElementKind): Placement {
  const sizes: Record<ElementKind, Omit<Placement, 'zIndex'>> = {
    navbar: { x: 70, y: 40, width: 1060, height: 70 },
    hero: { x: 90, y: 135, width: 610, height: 310 },
    text: { x: 110, y: 200, width: 420, height: 160 },
    richText: { x: 120, y: 220, width: 520, height: 230 },
    button: { x: 120, y: 380, width: 170, height: 54 },
    image: { x: 690, y: 160, width: 360, height: 300 },
    gallery: { x: 120, y: 440, width: 640, height: 190 },
    card: { x: 700, y: 180, width: 330, height: 220 },
    cardGrid: { x: 90, y: 500, width: 650, height: 210 },
    features: { x: 120, y: 470, width: 430, height: 250 },
    pricing: { x: 690, y: 450, width: 320, height: 260 },
    testimonial: { x: 120, y: 520, width: 520, height: 180 },
    faq: { x: 620, y: 520, width: 420, height: 240 },
    stats: { x: 120, y: 640, width: 650, height: 120 },
    contact: { x: 640, y: 210, width: 360, height: 360 },
    footer: { x: 90, y: 690, width: 1020, height: 96 },
    video: { x: 640, y: 230, width: 390, height: 230 },
    divider: { x: 100, y: 460, width: 900, height: 28 },
    spacer: { x: 100, y: 460, width: 460, height: 100 },
    rect: { x: 670, y: 160, width: 260, height: 160 },
    circle: { x: 780, y: 150, width: 190, height: 190 },
    line: { x: 180, y: 450, width: 420, height: 16 },
    pill: { x: 760, y: 120, width: 220, height: 46 },
    blob: { x: 720, y: 130, width: 360, height: 390 },
    badge: { x: 760, y: 120, width: 190, height: 38 },
    icon: { x: 760, y: 140, width: 78, height: 78 },
  }
  return { ...sizes[kind], zIndex: kind === 'blob' ? 0 : 2 }
}

function defaultStyle(kind: ElementKind): ElementStyle {
  const isShape = ['rect', 'circle', 'line', 'pill', 'blob', 'badge', 'icon'].includes(kind)
  return {
    background: kind === 'button' ? '#244e38' : isShape ? '#dbe8d6' : '#ffffff',
    color: kind === 'button' ? '#ffffff' : '#192119',
    borderColor: '#d7ddd2',
    borderWidth: kind === 'line' ? 0 : 1,
    radius: kind === 'circle' ? 80 : kind === 'blob' ? 46 : kind === 'button' || kind === 'pill' || kind === 'badge' ? 999 : 16,
    opacity: kind === 'blob' ? 74 : 100,
    fontSize: kind === 'hero' ? 44 : kind === 'navbar' ? 15 : kind === 'button' || kind === 'badge' ? 15 : 18,
    fontWeight: kind === 'hero' ? 800 : 700,
    fontFamily: kind === 'richText' ? 'General Sans' : 'Satoshi',
    align: kind === 'hero' || kind === 'navbar' ? 'left' : 'center',
    padding: kind === 'button' || isShape ? 12 : 22,
    shadow: kind === 'blob' || kind === 'line' ? 0 : 14,
    rotation: 0,
  }
}

function defaultCopy(kind: ElementKind) {
  const copy: Record<ElementKind, { name: string; title: string; text: string; subtext: string; action: string; src: string }> = {
    navbar: { name: 'Navbar', title: 'NOVA', text: 'Product Pricing Contact', subtext: '', action: 'Get started', src: '' },
    hero: { name: 'Hero', title: 'Build a site that feels custom', text: 'Drag, resize, animate, and export a complete page from Webception.', subtext: 'Freeform controls. Responsive modes. No backend needed.', action: 'Start building', src: '' },
    text: { name: 'Text', title: 'Text block', text: 'Write direct copy that explains what your site does.', subtext: '', action: '', src: '' },
    richText: { name: 'Rich text', title: 'Long-form section', text: 'Use this block for about pages, product notes, updates, or project writeups.', subtext: '', action: '', src: '' },
    button: { name: 'Button', title: 'Button', text: 'Join the list', subtext: '', action: 'Join the list', src: '' },
    image: { name: 'Image', title: 'Image', text: '', subtext: '', action: '', src: 'https://picsum.photos/seed/webception-image/900/900' },
    gallery: { name: 'Gallery', title: 'Gallery', text: 'Three image layout', subtext: '', action: '', src: '' },
    card: { name: 'Card', title: 'Fast edits', text: 'Tune every visual property without leaving the canvas.', subtext: '', action: '', src: '' },
    cardGrid: { name: 'Card grid', title: 'Feature cards', text: 'Reusable, editable, and export-ready.', subtext: '', action: '', src: '' },
    features: { name: 'Features', title: 'Everything needed to ship', text: 'A compact feature list for project pages.', subtext: '', action: '', src: '' },
    pricing: { name: 'Pricing', title: 'Launch plan', text: 'Everything for a polished one-page site.', subtext: '', action: 'Choose plan', src: '' },
    testimonial: { name: 'Testimonial', title: 'Ari Patel', text: 'Webception made the project page feel real before I touched hosting.', subtext: '', action: '', src: '' },
    faq: { name: 'FAQ', title: 'Questions', text: 'Useful answers for visitors.', subtext: '', action: '', src: '' },
    stats: { name: 'Stats', title: 'Stats', text: 'Numbers that show momentum.', subtext: '', action: '', src: '' },
    contact: { name: 'Contact form', title: 'Contact us', text: 'Collect interest with a clean mock form.', subtext: '', action: 'Send message', src: '' },
    footer: { name: 'Footer', title: 'Webception export', text: 'Built locally and ready to host anywhere.', subtext: '', action: '', src: '' },
    video: { name: 'Video', title: 'Project demo', text: 'Drop a video embed here later.', subtext: '', action: '', src: '' },
    divider: { name: 'Divider', title: 'Divider', text: '', subtext: '', action: '', src: '' },
    spacer: { name: 'Spacer', title: 'Spacer', text: '', subtext: '', action: '', src: '' },
    rect: { name: 'Rectangle', title: '', text: '', subtext: '', action: '', src: '' },
    circle: { name: 'Circle', title: '', text: '', subtext: '', action: '', src: '' },
    line: { name: 'Line', title: '', text: '', subtext: '', action: '', src: '' },
    pill: { name: 'Pill', title: '', text: 'Fresh launch', subtext: '', action: '', src: '' },
    blob: { name: 'Blob', title: '', text: '', subtext: '', action: '', src: '' },
    badge: { name: 'Badge', title: '', text: 'Made in Webception', subtext: '', action: '', src: '' },
    icon: { name: 'Icon', title: '', text: '', subtext: '', action: '', src: '' },
  }
  return copy[kind]
}

function resolvePlacement(element: BuilderElement, device: DeviceMode): Placement {
  return { ...element.placement, ...(device === 'desktop' ? {} : element.overrides[device]) }
}

function updateElementPlacement(project: BuilderProject, id: string, device: DeviceMode, placement: Placement, copyToHistory: boolean): BuilderProject {
  const next = {
    ...project,
    elements: project.elements.map((element) => {
      if (element.id !== id) return element
      if (device === 'desktop') return { ...element, placement }
      return { ...element, overrides: { ...element.overrides, [device]: placement } }
    }),
  }
  return copyToHistory ? next : next
}

function cloneProject(project: BuilderProject): BuilderProject {
  return JSON.parse(JSON.stringify(project)) as BuilderProject
}

function cloneElement(element: BuilderElement): BuilderElement {
  return JSON.parse(JSON.stringify(element)) as BuilderElement
}

function buildExport(project: BuilderProject) {
  const elements = project.elements.toSorted((a, b) => a.placement.zIndex - b.placement.zIndex)
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(project.name)} | Built in Webception</title>
  <link rel="preconnect" href="https://api.fontshare.com" />
  <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&f[]=general-sans@400,500,600,700&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Hind:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <main class="page" aria-label="${escapeHtml(project.name)}">
${elements.map((element) => exportElementHtml(element)).join('\n')}
  </main>
  <script src="./script.js"></script>
</body>
</html>`

  const css = `:root { --page-bg: ${project.pageBackground}; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--page-bg); color: #182018; font-family: Satoshi, system-ui, sans-serif; }
.page { position: relative; width: min(1200px, 100%); min-height: 820px; margin: 0 auto; overflow: hidden; }
.wc-el { position: absolute; display: grid; overflow: hidden; }
.wc-el h1, .wc-el h2, .wc-el p { margin: 0; }
.wc-el img { width: 100%; height: 100%; object-fit: cover; display: block; }
.wc-button { width: 100%; height: 100%; border: 0; border-radius: inherit; color: inherit; background: transparent; font: inherit; font-weight: 800; }
.wc-navbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; width: 100%; height: 100%; }
.wc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; }
.wc-grid section { padding: 14px; border: 1px solid rgba(20, 29, 20, .1); border-radius: 12px; background: rgba(255,255,255,.42); }
.wc-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.wc-gallery img { border-radius: 12px; }
.wc-form { display: grid; gap: 10px; width: 100%; }
.wc-form input, .wc-form textarea { border: 1px solid rgba(20,29,20,.16); border-radius: 10px; padding: 11px; font: inherit; }
.wc-divider { width: 100%; height: 2px; background: currentColor; align-self: center; }
${elements.map((element) => exportElementCss(element)).join('\n')}
@media (max-width: 820px) {
  .page { width: 390px; min-height: 1120px; }
${elements.map((element) => exportElementCss(element, 'mobile')).join('\n')}
}
@keyframes wc-fade { from { opacity: 0; } to { opacity: var(--target-opacity, 1); } }
@keyframes wc-rise { from { opacity: 0; transform: translateY(28px) rotate(var(--rotate)); } to { opacity: var(--target-opacity, 1); transform: translateY(0) rotate(var(--rotate)); } }
@keyframes wc-slide-left { from { opacity: 0; transform: translateX(40px) rotate(var(--rotate)); } to { opacity: var(--target-opacity, 1); transform: translateX(0) rotate(var(--rotate)); } }
@keyframes wc-slide-right { from { opacity: 0; transform: translateX(-40px) rotate(var(--rotate)); } to { opacity: var(--target-opacity, 1); transform: translateX(0) rotate(var(--rotate)); } }
@keyframes wc-slide-up { from { opacity: 0; transform: translateY(40px) rotate(var(--rotate)); } to { opacity: var(--target-opacity, 1); transform: translateY(0) rotate(var(--rotate)); } }
@keyframes wc-slide-down { from { opacity: 0; transform: translateY(-40px) rotate(var(--rotate)); } to { opacity: var(--target-opacity, 1); transform: translateY(0) rotate(var(--rotate)); } }
@keyframes wc-scale { from { opacity: 0; transform: scale(.92) rotate(var(--rotate)); } to { opacity: var(--target-opacity, 1); transform: scale(1) rotate(var(--rotate)); } }
@keyframes wc-blur { from { opacity: 0; filter: blur(10px); } to { opacity: var(--target-opacity, 1); filter: blur(0); } }`

  const js = `document.querySelectorAll('[data-animate]').forEach((el) => {
  const type = el.dataset.animate;
  if (!type || type === 'none') return;
  el.style.animationName = 'wc-' + type;
});`

  return { html, css, js }
}

function exportElementHtml(element: BuilderElement) {
  const id = `el-${element.id}`
  return `    <section id="${id}" class="wc-el ${exportClass(element.kind)}" data-animate="${element.animation.type}">
      ${exportContent(element)}
    </section>`
}

function exportClass(kind: ElementKind) {
  return `wc-${kind.replace(/[A-Z]/g, (value) => `-${value.toLowerCase()}`)}`
}

function exportContent(element: BuilderElement) {
  if (element.kind === 'navbar') return `<div class="wc-navbar"><strong>${escapeHtml(element.title)}</strong><span>Work Pricing Contact</span><button>${escapeHtml(element.action)}</button></div>`
  if (element.kind === 'hero') return `<h1>${escapeHtml(element.title)}</h1><p>${escapeHtml(element.text)}</p><small>${escapeHtml(element.subtext)}</small><button>${escapeHtml(element.action)}</button>`
  if (element.kind === 'button') return `<button class="wc-button">${escapeHtml(element.text || element.action)}</button>`
  if (element.kind === 'image') return `<img src="${escapeHtml(element.src)}" alt="" />`
  if (element.kind === 'gallery') return `<div class="wc-gallery"><img src="https://picsum.photos/seed/export-1/500/380" alt="" /><img src="https://picsum.photos/seed/export-2/500/380" alt="" /><img src="https://picsum.photos/seed/export-3/500/380" alt="" /></div>`
  if (element.kind === 'divider' || element.kind === 'line') return `<div class="wc-divider"></div>`
  if (element.kind === 'contact') return `<form class="wc-form"><input placeholder="Name" /><input placeholder="Email" /><textarea placeholder="Message"></textarea><button>${escapeHtml(element.action)}</button></form>`
  if (['rect', 'circle', 'blob', 'spacer'].includes(element.kind)) return ''
  if (['pill', 'badge'].includes(element.kind)) return escapeHtml(element.text)
  if (element.kind === 'icon') return '<strong>W</strong>'
  if (element.kind === 'cardGrid') return `<div class="wc-grid"><section><strong>Design</strong><p>${escapeHtml(element.text)}</p></section><section><strong>Tune</strong><p>${escapeHtml(element.text)}</p></section><section><strong>Ship</strong><p>${escapeHtml(element.text)}</p></section></div>`
  return `<h2>${escapeHtml(element.title)}</h2><p>${escapeHtml(element.text)}</p>`
}

function exportElementCss(element: BuilderElement, device: DeviceMode = 'desktop') {
  const placement = resolvePlacement(element, device)
  const animationName = element.animation.type === 'none' ? 'none' : `wc-${element.animation.type}`
  const radius = element.kind === 'circle' ? '999px' : `${element.style.radius}px`
  return `#el-${element.id} {
  left: ${placement.x}px; top: ${placement.y}px; width: ${placement.width}px; height: ${placement.height}px; z-index: ${placement.zIndex};
  padding: ${element.style.padding}px; color: ${element.style.color}; background: ${element.style.background}; border: ${element.style.borderWidth}px solid ${element.style.borderColor};
  border-radius: ${radius}; opacity: ${element.style.opacity / 100}; --target-opacity: ${element.style.opacity / 100}; --rotate: ${element.style.rotation}deg;
  font-family: '${element.style.fontFamily}', Satoshi, sans-serif; font-size: ${element.style.fontSize}px; font-weight: ${element.style.fontWeight}; text-align: ${element.style.align};
  box-shadow: 0 ${element.style.shadow}px ${element.style.shadow * 2.4}px rgba(21, 27, 22, ${element.style.shadow ? 0.14 : 0});
  transform: rotate(${element.style.rotation}deg); animation: ${animationName} ${element.animation.duration}ms ${element.animation.easing === 'spring' ? 'cubic-bezier(.16,1,.3,1)' : element.animation.easing} ${element.animation.delay}ms ${element.animation.repeat ? 'infinite' : '1'} both;
}`
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

export default App
