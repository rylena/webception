import { useEffect, useMemo, useState } from 'react'
import './App.css'

type BlockType = 'hero' | 'text' | 'button' | 'image' | 'section'
type DeviceMode = 'desktop' | 'tablet' | 'mobile'

type BlockStyle = {
  align: 'left' | 'center' | 'right'
  background: string
  color: string
  fontSize: number
  radius: number
  spacing: number
}

type SiteBlock = {
  id: string
  type: BlockType
  title: string
  text: string
  subtext?: string
  action?: string
  image?: string
  style: BlockStyle
}

const storageKey = 'webception-project'

const blockLabels: Record<BlockType, string> = {
  hero: 'Hero',
  text: 'Text',
  button: 'Button',
  image: 'Image',
  section: 'Section',
}

const seedBlocks: SiteBlock[] = [
  {
    id: 'hero-01',
    type: 'hero',
    title: 'Launch pages without waiting on templates',
    text: 'Shape a crisp website from reusable blocks, then export it when the layout feels right.',
    action: 'Start building',
    style: {
      align: 'left',
      background: '#f7f8f3',
      color: '#182019',
      fontSize: 42,
      radius: 18,
      spacing: 28,
    },
  },
  {
    id: 'text-01',
    type: 'text',
    title: 'Design notes',
    text: 'This page is built from live blocks. Select anything on the canvas to tune copy, spacing, color, and shape.',
    style: {
      align: 'left',
      background: '#ffffff',
      color: '#30352f',
      fontSize: 18,
      radius: 12,
      spacing: 18,
    },
  },
  {
    id: 'button-01',
    type: 'button',
    title: 'Primary action',
    text: 'Join the list',
    style: {
      align: 'left',
      background: '#224b35',
      color: '#ffffff',
      fontSize: 16,
      radius: 8,
      spacing: 14,
    },
  },
  {
    id: 'section-01',
    type: 'section',
    title: 'What ships with this page',
    text: 'Responsive structure, editable copy, theme controls, exportable markup, and a focused builder surface.',
    style: {
      align: 'center',
      background: '#eef2e8',
      color: '#273229',
      fontSize: 22,
      radius: 16,
      spacing: 24,
    },
  },
]

const palette: Array<{ type: BlockType; detail: string }> = [
  { type: 'hero', detail: 'Intro with headline and CTA' },
  { type: 'text', detail: 'Paragraph or content block' },
  { type: 'button', detail: 'Link-style action button' },
  { type: 'image', detail: 'Framed visual placeholder' },
  { type: 'section', detail: 'Wide feature band' },
]

const themes = [
  { name: 'Moss', accent: '#224b35', surface: '#f7f8f3' },
  { name: 'Ink', accent: '#2d3b42', surface: '#f4f5f2' },
  { name: 'Clay', accent: '#805a45', surface: '#f8f1eb' },
]

function newBlock(type: BlockType): SiteBlock {
  const id = `${type}-${crypto.randomUUID().slice(0, 8)}`
  const base: BlockStyle = {
    align: type === 'section' ? 'center' : 'left',
    background: type === 'button' ? '#224b35' : type === 'section' ? '#eef2e8' : '#ffffff',
    color: type === 'button' ? '#ffffff' : '#222820',
    fontSize: type === 'hero' ? 38 : type === 'section' ? 22 : 17,
    radius: type === 'button' ? 8 : 14,
    spacing: type === 'hero' ? 28 : 18,
  }

  return {
    id,
    type,
    title: blockLabels[type],
    text:
      type === 'hero'
        ? 'A sharper website starts here'
        : type === 'button'
          ? 'Click me'
          : type === 'image'
            ? 'Image frame'
            : 'Write something specific for this part of the page.',
    subtext: type === 'hero' ? 'Drag blocks, tune details, and export clean static HTML.' : undefined,
    action: type === 'hero' ? 'Publish draft' : undefined,
    image: type === 'image' ? 'https://picsum.photos/seed/webception-canvas/960/520' : undefined,
    style: base,
  }
}

function App() {
  const [blocks, setBlocks] = useState<SiteBlock[]>(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? (JSON.parse(saved) as SiteBlock[]) : seedBlocks
  })
  const [selectedId, setSelectedId] = useState(seedBlocks[0].id)
  const [device, setDevice] = useState<DeviceMode>('desktop')
  const [zoom, setZoom] = useState(92)
  const [showExport, setShowExport] = useState(false)
  const [lastSaved, setLastSaved] = useState('Saved locally')

  const selected = blocks.find((block) => block.id === selectedId) ?? blocks[0]

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(blocks))
    const timer = window.setTimeout(() => setLastSaved('Saved locally'), 300)
    return () => window.clearTimeout(timer)
  }, [blocks])

  const exportMarkup = useMemo(() => buildExport(blocks), [blocks])

  function saveBlocks(updater: (items: SiteBlock[]) => SiteBlock[]) {
    setLastSaved('Saving')
    setBlocks(updater)
  }

  function addBlock(type: BlockType) {
    const block = newBlock(type)
    saveBlocks((items) => [...items, block])
    setSelectedId(block.id)
  }

  function updateSelected(patch: Partial<SiteBlock>) {
    saveBlocks((items) =>
      items.map((item) => (item.id === selectedId ? { ...item, ...patch } : item)),
    )
  }

  function updateStyle(patch: Partial<BlockStyle>) {
    saveBlocks((items) =>
      items.map((item) =>
        item.id === selectedId ? { ...item, style: { ...item.style, ...patch } } : item,
      ),
    )
  }

  function moveSelected(direction: -1 | 1) {
    const index = blocks.findIndex((block) => block.id === selectedId)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= blocks.length) return
    saveBlocks((items) => {
      const copy = [...items]
      const [removed] = copy.splice(index, 1)
      copy.splice(nextIndex, 0, removed)
      return copy
    })
  }

  function removeSelected() {
    if (blocks.length === 1) return
    const index = blocks.findIndex((block) => block.id === selectedId)
    const nextBlocks = blocks.filter((block) => block.id !== selectedId)
    setLastSaved('Saving')
    setBlocks(nextBlocks)
    setSelectedId(nextBlocks[Math.max(0, index - 1)].id)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const type = event.dataTransfer.getData('block/type') as BlockType
    if (type in blockLabels) addBlock(type)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup" aria-label="Webception editor">
          <span className="brand-mark">W</span>
          <div>
            <strong>Webception</strong>
            <span>Project page builder</span>
          </div>
        </div>

        <div className="page-control" aria-label="Current page">
          <span>Pages</span>
          <button type="button">Home</button>
          <button type="button">New page</button>
        </div>

        <nav className="top-actions" aria-label="Editor actions">
          <button type="button" onClick={() => setDevice('desktop')} className={device === 'desktop' ? 'active' : ''}>
            Desktop
          </button>
          <button type="button" onClick={() => setDevice('tablet')} className={device === 'tablet' ? 'active' : ''}>
            Tablet
          </button>
          <button type="button" onClick={() => setDevice('mobile')} className={device === 'mobile' ? 'active' : ''}>
            Mobile
          </button>
          <button type="button" className="secondary-action">Preview</button>
          <button type="button" className="primary-action" onClick={() => setShowExport(true)}>
            Export
          </button>
        </nav>
      </header>

      <section className="workspace">
        <aside className="left-panel" aria-label="Blocks panel">
          <div className="panel-heading">
            <span>Blocks</span>
            <small>Drag or tap</small>
          </div>
          <div className="block-list">
            {palette.map((item) => (
              <button
                type="button"
                key={item.type}
                className="block-tile"
                draggable
                onDragStart={(event) => event.dataTransfer.setData('block/type', item.type)}
                onClick={() => addBlock(item.type)}
              >
                <span className={`block-icon ${item.type}`} aria-hidden="true" />
                <span>
                  <strong>{blockLabels[item.type]}</strong>
                  <small>{item.detail}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="theme-switcher">
            <div className="panel-heading">
              <span>Theme</span>
              <small>Page tint</small>
            </div>
            {themes.map((theme) => (
              <button
                type="button"
                key={theme.name}
                className="theme-row"
                onClick={() =>
                  saveBlocks((items) =>
                    items.map((item, index) => ({
                      ...item,
                      style: {
                        ...item.style,
                        background: index === 0 ? theme.surface : item.style.background,
                        color: item.type === 'button' ? '#ffffff' : item.style.color,
                      },
                    })),
                  )
                }
              >
                <span style={{ background: theme.accent }} />
                {theme.name}
              </button>
            ))}
          </div>
        </aside>

        <section
          className="canvas-stage"
          aria-label="Canvas"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <div className="canvas-ruler">
            <span>Canvas</span>
            <i />
            <span>{zoom}%</span>
          </div>
          <div className={`site-canvas ${device}`} style={{ transform: `scale(${zoom / 100})` }}>
            <div className="alignment-guide" aria-hidden="true" />
            {blocks.map((block) => (
              <CanvasBlock
                key={block.id}
                block={block}
                selected={block.id === selectedId}
                onSelect={() => setSelectedId(block.id)}
              />
            ))}
          </div>
        </section>

        <aside className="right-panel" aria-label="Inspector panel">
          <div className="panel-heading">
            <span>Inspector</span>
            <small>{selected?.type ?? 'None'}</small>
          </div>

          {selected ? (
            <div className="inspector-stack">
              <label>
                <span>Block name</span>
                <input value={selected.title} onChange={(event) => updateSelected({ title: event.target.value })} />
              </label>
              <label>
                <span>Text</span>
                <textarea value={selected.text} onChange={(event) => updateSelected({ text: event.target.value })} />
              </label>
              {selected.type === 'hero' && (
                <>
                  <label>
                    <span>Supporting copy</span>
                    <textarea
                      value={selected.subtext ?? ''}
                      onChange={(event) => updateSelected({ subtext: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>Hero button</span>
                    <input
                      value={selected.action ?? ''}
                      onChange={(event) => updateSelected({ action: event.target.value })}
                    />
                  </label>
                </>
              )}
              {selected.type === 'image' && (
                <label>
                  <span>Image URL</span>
                  <input value={selected.image ?? ''} onChange={(event) => updateSelected({ image: event.target.value })} />
                </label>
              )}

              <div className="segmented-control" aria-label="Text alignment">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    type="button"
                    key={align}
                    className={selected.style.align === align ? 'active' : ''}
                    onClick={() => updateStyle({ align })}
                  >
                    {align}
                  </button>
                ))}
              </div>

              <label>
                <span>Font size</span>
                <input
                  type="range"
                  min="13"
                  max="54"
                  value={selected.style.fontSize}
                  onChange={(event) => updateStyle({ fontSize: Number(event.target.value) })}
                />
              </label>
              <label>
                <span>Spacing</span>
                <input
                  type="range"
                  min="8"
                  max="42"
                  value={selected.style.spacing}
                  onChange={(event) => updateStyle({ spacing: Number(event.target.value) })}
                />
              </label>
              <label>
                <span>Radius</span>
                <input
                  type="range"
                  min="0"
                  max="26"
                  value={selected.style.radius}
                  onChange={(event) => updateStyle({ radius: Number(event.target.value) })}
                />
              </label>
              <div className="color-pair">
                <label>
                  <span>Text</span>
                  <input
                    type="color"
                    value={selected.style.color}
                    onChange={(event) => updateStyle({ color: event.target.value })}
                  />
                </label>
                <label>
                  <span>Fill</span>
                  <input
                    type="color"
                    value={selected.style.background}
                    onChange={(event) => updateStyle({ background: event.target.value })}
                  />
                </label>
              </div>

              <div className="inspector-actions">
                <button type="button" onClick={() => moveSelected(-1)}>Move up</button>
                <button type="button" onClick={() => moveSelected(1)}>Move down</button>
                <button type="button" className="danger" onClick={removeSelected}>Delete</button>
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      <footer className="statusbar">
        <span>{lastSaved}</span>
        <span>{blocks.length} blocks</span>
        <label>
          Zoom
          <input
            type="range"
            min="68"
            max="108"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <span>Publish ready</span>
      </footer>

      {showExport && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowExport(false)}>
          <section className="export-modal" role="dialog" aria-modal="true" aria-label="Export HTML" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span>Export</span>
                <h2>Static HTML</h2>
              </div>
              <button type="button" onClick={() => setShowExport(false)}>Close</button>
            </div>
            <textarea readOnly value={exportMarkup} />
          </section>
        </div>
      )}
    </main>
  )
}

function CanvasBlock({
  block,
  selected,
  onSelect,
}: {
  block: SiteBlock
  selected: boolean
  onSelect: () => void
}) {
  const style = {
    '--block-bg': block.style.background,
    '--block-color': block.style.color,
    '--block-size': `${block.style.fontSize}px`,
    '--block-radius': `${block.style.radius}px`,
    '--block-gap': `${block.style.spacing}px`,
  } as React.CSSProperties

  return (
    <article
      className={`canvas-block ${block.type} ${selected ? 'selected' : ''}`}
      style={style}
      onClick={onSelect}
      tabIndex={0}
      onFocus={onSelect}
    >
      <div className={`block-content align-${block.style.align}`}>
        {block.type === 'hero' && (
          <>
            <p className="canvas-label">Hero</p>
            <h1>{block.title}</h1>
            <p>{block.text}</p>
            {block.subtext && <small>{block.subtext}</small>}
            {block.action && <button type="button">{block.action}</button>}
          </>
        )}
        {block.type === 'text' && (
          <>
            <h2>{block.title}</h2>
            <p>{block.text}</p>
          </>
        )}
        {block.type === 'button' && <button type="button">{block.text}</button>}
        {block.type === 'image' && (
          <>
            <img src={block.image} alt="" />
            <span>{block.text}</span>
          </>
        )}
        {block.type === 'section' && (
          <>
            <h2>{block.title}</h2>
            <p>{block.text}</p>
          </>
        )}
      </div>
      {selected && (
        <>
          <span className="resize-handle top-left" />
          <span className="resize-handle top-right" />
          <span className="resize-handle bottom-left" />
          <span className="resize-handle bottom-right" />
        </>
      )}
    </article>
  )
}

function buildExport(blocks: SiteBlock[]) {
  const body = blocks
    .map((block) => {
      const style = `text-align:${block.style.align};background:${block.style.background};color:${block.style.color};border-radius:${block.style.radius}px;padding:${block.style.spacing * 1.4}px;`
      if (block.type === 'hero') {
        return `<section style="${style}"><h1>${escapeHtml(block.title)}</h1><p>${escapeHtml(block.text)}</p><a href="#">${escapeHtml(block.action ?? 'Start')}</a></section>`
      }
      if (block.type === 'button') {
        return `<p style="text-align:${block.style.align}"><a style="${style}" href="#">${escapeHtml(block.text)}</a></p>`
      }
      if (block.type === 'image') {
        return `<figure style="${style}"><img src="${escapeHtml(block.image ?? '')}" alt="" /><figcaption>${escapeHtml(block.text)}</figcaption></figure>`
      }
      return `<section style="${style}"><h2>${escapeHtml(block.title)}</h2><p>${escapeHtml(block.text)}</p></section>`
    })
    .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Exported from Webception</title>
  <style>
    body { margin: 0; font-family: ui-sans-serif, system-ui, sans-serif; background: #f6f7f3; color: #1f241f; }
    main { width: min(960px, calc(100% - 32px)); margin: 48px auto; display: grid; gap: 18px; }
    img { max-width: 100%; border-radius: 12px; display: block; }
    a { display: inline-block; color: inherit; text-decoration: none; font-weight: 700; }
  </style>
</head>
<body>
  <main>
${body}
  </main>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export default App
