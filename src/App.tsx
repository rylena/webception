import JSZip from 'jszip'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import './App.css'
import { isSupabaseConfigured, supabase } from './supabaseClient'
import landingUiImage from './assets/landing-ui.png'

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

type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'

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
  handle?: ResizeHandle
  pointerX: number
  pointerY: number
  start: Placement
}

type QuickMenuState = {
  id: string
  x: number
  y: number
}

type CloudProject = {
  id: string
  name: string
  updated_at: string
}

type CloudProjectRow = CloudProject & {
  data: BuilderProject
}

type AuthRedirectNotice = {
  kind: 'confirmed' | 'error'
  title: string
  text: string
}

type LibraryKey = 'templates' | 'elements' | 'text' | 'media' | 'sections' | 'shapes'

type PaletteItem = {
  kind: ElementKind
  label: string
  detail: string
  tags?: string[]
  patch?: Partial<Pick<BuilderElement, 'name' | 'title' | 'text' | 'subtext' | 'action' | 'src'>> & {
    style?: Partial<ElementStyle>
    placement?: Partial<Placement>
  }
}

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
  key: Exclude<LibraryKey, 'templates' | 'elements'>
  items: PaletteItem[]
}> = [
  {
    label: 'Structure',
    key: 'sections',
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
    key: 'text',
    items: [
      { kind: 'text', label: 'Text', detail: 'Short paragraph' },
      { kind: 'richText', label: 'Rich text', detail: 'Editorial block' },
      { kind: 'button', label: 'Button', detail: 'Primary action' },
      { kind: 'badge', label: 'Badge label', detail: 'Small supporting label' },
      { kind: 'pill', label: 'Pill tag', detail: 'Rounded metadata tag' },
    ],
  },
  {
    label: 'Media',
    key: 'media',
    items: [
      { kind: 'image', label: 'Image', detail: 'Single visual' },
      { kind: 'gallery', label: 'Gallery', detail: 'Three image strip' },
      { kind: 'video', label: 'Video', detail: 'Embed placeholder' },
    ],
  },
  {
    label: 'Sections',
    key: 'sections',
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
    key: 'shapes',
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

const libraryTabs: Array<{ key: LibraryKey; label: string }> = [
  { key: 'templates', label: 'Templates' },
  { key: 'elements', label: 'Elements' },
  { key: 'text', label: 'Text' },
  { key: 'media', label: 'Media' },
  { key: 'sections', label: 'Sections' },
  { key: 'shapes', label: 'Shapes' },
]

const allPaletteItems = paletteGroups.flatMap((group) => group.items)

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

const templates = [
  { key: 'startup', name: 'Startup', detail: 'SaaS landing page' },
  { key: 'portfolio', name: 'Portfolio', detail: 'Personal project site' },
  { key: 'event', name: 'Event', detail: 'Hack night signup' },
] as const

const passwordMinLength = 8
type PublicRoute = '/' | '/login' | '/signup'

function App() {
  const [project, setProject] = useState<BuilderProject>(() => cloneProject(starterProject))
  const [history, setHistory] = useState<BuilderProject[]>([])
  const [future, setFuture] = useState<BuilderProject[]>([])
  const [selectedId, setSelectedId] = useState(project.elements[0]?.id ?? '')
  const [device, setDevice] = useState<DeviceMode>('desktop')
  const [zoom, setZoom] = useState(64)
  const [lastSaved, setLastSaved] = useState('Online only')
  const [isExporting, setIsExporting] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewTick, setPreviewTick] = useState(0)
  const [activeLibrary, setActiveLibrary] = useState<LibraryKey>('elements')
  const [libraryQuery, setLibraryQuery] = useState('')
  const [recentKinds, setRecentKinds] = useState<ElementKind[]>(['rect', 'circle', 'image', 'button'])
  const [quickMenu, setQuickMenu] = useState<QuickMenuState | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([])
  const [activeCloudProjectId, setActiveCloudProjectId] = useState('')
  const [cloudStatus, setCloudStatus] = useState(isSupabaseConfigured ? 'Sign in to save online' : 'Add Supabase env vars')
  const [authMessage, setAuthMessage] = useState('')
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)
  const [isAuthBusy, setIsAuthBusy] = useState(false)
  const [isCloudBusy, setIsCloudBusy] = useState(false)
  const [isSessionLoading, setIsSessionLoading] = useState(isSupabaseConfigured)
  const [authRedirectNotice, setAuthRedirectNotice] = useState<AuthRedirectNotice | null>(() => readAuthRedirectNotice())
  const [publicRoute, setPublicRoute] = useState<PublicRoute>(() => readPublicRoute())
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches)
  const dragRef = useRef<DragState | null>(null)
  const cloudSaveReadyRef = useRef(false)

  const selected = project.elements.find((element) => element.id === selectedId) ?? project.elements[0]
  const quickMenuElement = quickMenu ? project.elements.find((element) => element.id === quickMenu.id) : undefined
  const user = session?.user ?? null
  const resolvedTheme = project.themeMode === 'system' ? (systemDark ? 'dark' : 'light') : project.themeMode
  const canvasSize = canvasSizes[device]
  const exportBundle = useMemo(() => buildExport(project), [project])
  const visiblePaletteGroups = useMemo(
    () => filterPaletteGroups(activeLibrary, libraryQuery),
    [activeLibrary, libraryQuery],
  )
  const recentItems = useMemo(
    () =>
      recentKinds
        .map((kind) => allPaletteItems.find((item) => item.kind === kind))
        .filter((item): item is PaletteItem => Boolean(item)),
    [recentKinds],
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystemDark(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    function syncRoute() {
      setPublicRoute(readPublicRoute())
    }

    window.addEventListener('popstate', syncRoute)
    return () => window.removeEventListener('popstate', syncRoute)
  }, [])

  function navigatePublicRoute(path: PublicRoute) {
    window.history.pushState(null, '', path)
    setPublicRoute(path)
  }

  useEffect(() => {
    function closeQuickMenu(event: PointerEvent) {
      if ((event.target as HTMLElement).closest('.quick-style-menu')) return
      setQuickMenu(null)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setQuickMenu(null)
    }

    window.addEventListener('pointerdown', closeQuickMenu)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeQuickMenu)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const commitProject = useCallback((updater: (current: BuilderProject) => BuilderProject) => {
    setLastSaved('Saving to cloud')
    setProject((current) => {
      const next = updater(current)
      if (next === current) return current
      setHistory((items) => [...items.slice(-29), current])
      setFuture([])
      return next
    })
  }, [])

  const loadCloudProjects = useCallback(async (nextUser: User) => {
    if (!supabase) return
    setIsCloudBusy(true)
    setCloudStatus('Loading cloud projects')
    cloudSaveReadyRef.current = false

    const { data, error } = await supabase
      .from('builder_projects')
      .select('id,name,updated_at,data')
      .eq('user_id', nextUser.id)
      .order('updated_at', { ascending: false })

    if (error) {
      setCloudStatus('Cloud load failed')
      setAuthMessage(error.message)
      setIsCloudBusy(false)
      return
    }

    let rows = (data ?? []) as CloudProjectRow[]

    if (!rows.length) {
      const firstProject = { ...cloneProject(starterProject), name: 'Home' }
      const { data: created, error: createError } = await supabase
        .from('builder_projects')
        .insert({
          user_id: nextUser.id,
          name: firstProject.name,
          data: firstProject,
        })
        .select('id,name,updated_at,data')
        .single()

      if (createError) {
        setCloudStatus('Cloud setup failed')
        setAuthMessage(createError.message)
        setIsCloudBusy(false)
        return
      }

      rows = [created as CloudProjectRow]
    }

    const summaries = rows.map(({ id, name, updated_at }) => ({ id, name, updated_at }))
    setCloudProjects(summaries)
    setActiveCloudProjectId(rows[0].id)
    setProject(normalizeCloudProject(rows[0].data, rows[0].name))
    setSelectedId(rows[0].data.elements?.[0]?.id ?? '')
    setCloudStatus('Cloud synced')
    window.setTimeout(() => {
      cloudSaveReadyRef.current = true
    }, 0)
    setIsCloudBusy(false)
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    const redirectNotice = readAuthRedirectNotice()

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        setIsDashboardOpen(!redirectNotice)
        void loadCloudProjects(data.session.user)
      }
      if (redirectNotice) {
        setAuthRedirectNotice(redirectNotice)
        cleanupAuthRedirectUrl()
      }
      setIsSessionLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setAuthMessage('')
      setIsAuthOpen(false)
      if (nextSession?.user) {
        setIsDashboardOpen(true)
        void loadCloudProjects(nextSession.user)
      } else {
        cloudSaveReadyRef.current = false
        setCloudProjects([])
        setActiveCloudProjectId('')
        setIsDashboardOpen(false)
        setCloudStatus('Sign in to save online')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [loadCloudProjects])

  useEffect(() => {
    if (!supabase || !user || !activeCloudProjectId || !cloudSaveReadyRef.current) return
    const client = supabase

    const timer = window.setTimeout(async () => {
      setCloudStatus('Saving to cloud')
      const { error } = await client
        .from('builder_projects')
        .update({
          name: project.name || 'Untitled',
          data: project,
        })
        .eq('id', activeCloudProjectId)
        .eq('user_id', user.id)

      if (error) {
        setCloudStatus('Cloud save failed')
        setLastSaved('Cloud save failed')
        setAuthMessage(error.message)
        return
      }

      setCloudStatus('Cloud synced')
      setLastSaved('Cloud synced')
      setCloudProjects((items) =>
        items
          .map((item) =>
            item.id === activeCloudProjectId
              ? { ...item, name: project.name || 'Untitled', updated_at: new Date().toISOString() }
              : item,
          )
          .toSorted((a, b) => b.updated_at.localeCompare(a.updated_at)),
      )
    }, 850)

    return () => window.clearTimeout(timer)
  }, [activeCloudProjectId, project, user])

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const dx = (event.clientX - drag.pointerX) / (zoom / 100)
      const dy = (event.clientY - drag.pointerY) / (zoom / 100)
      const next: Placement =
        drag.mode === 'move'
          ? { ...drag.start, x: Math.round(drag.start.x + dx), y: Math.round(drag.start.y + dy) }
          : resizePlacement(drag.start, drag.handle ?? 'bottom-right', dx, dy)
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

  function addElement(kind: ElementKind, item?: PaletteItem) {
    const maxZ = Math.max(0, ...project.elements.map((item) => item.placement.zIndex))
    const offset = project.elements.length * 14
    const elementBase = makeElement(kind, {
      x: 90 + (offset % 180),
      y: 120 + (offset % 260),
      zIndex: maxZ + 1,
      ...item?.patch?.placement,
    })
    const element = {
      ...elementBase,
      ...item?.patch,
      name: item?.label ?? item?.patch?.name ?? elementBase.name,
      style: { ...elementBase.style, ...item?.patch?.style },
      placement: { ...elementBase.placement, ...item?.patch?.placement },
    }
    commitProject((current) => ({ ...current, elements: [...current.elements, element] }))
    setSelectedId(element.id)
    setRecentKinds((kinds) => [kind, ...kinds.filter((item) => item !== kind)].slice(0, 8))
  }

  async function signIn(email: string, password: string) {
    if (!supabase) return
    setIsAuthBusy(true)
    setAuthMessage('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    setIsAuthBusy(false)
    if (error) {
      setAuthMessage(error.message)
      return
    }
    if (data.session?.user) {
      setSession(data.session)
      setIsDashboardOpen(true)
      void loadCloudProjects(data.session.user)
    }
  }

  async function signUp(email: string, password: string) {
    if (!supabase) return
    setIsAuthBusy(true)
    setAuthMessage('')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/?confirmed=1`,
      },
    })
    setIsAuthBusy(false)
    if (error) {
      setAuthMessage(error.message)
      return
    }
    if (data.session?.user) {
      setSession(data.session)
      setIsDashboardOpen(true)
      void loadCloudProjects(data.session.user)
      return
    }
    setAuthMessage('Account created. Check your inbox and spam folder for the confirmation email.')
  }

  async function resendConfirmation(email: string) {
    if (!supabase) return
    setIsAuthBusy(true)
    setAuthMessage('')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/?confirmed=1`,
      },
    })
    setIsAuthBusy(false)
    if (error) {
      setAuthMessage(error.message)
      return
    }
    setAuthMessage('Confirmation email sent again. Check your inbox and spam folder.')
  }

  async function signOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setSession(null)
    setIsDashboardOpen(false)
    setCloudStatus('Sign in to save online')
  }

  async function createCloudProject() {
    if (!supabase || !user) return
    setIsCloudBusy(true)
    cloudSaveReadyRef.current = false
    const nextProject = {
      ...cloneProject(starterProject),
      name: `Project ${cloudProjects.length + 1}`,
    }
    const { data, error } = await supabase
      .from('builder_projects')
      .insert({
        user_id: user.id,
        name: nextProject.name,
        data: nextProject,
      })
      .select('id,name,updated_at,data')
      .single()

    if (error) {
      setAuthMessage(error.message)
      setCloudStatus('Create failed')
      setIsCloudBusy(false)
      return
    }

    const created = data as CloudProjectRow
    setCloudProjects((items) => [{ id: created.id, name: created.name, updated_at: created.updated_at }, ...items])
    setActiveCloudProjectId(created.id)
    setProject(normalizeCloudProject(created.data, created.name))
    setSelectedId(created.data.elements?.[0]?.id ?? '')
    setCloudStatus('Cloud synced')
    setLastSaved('Cloud synced')
    setIsDashboardOpen(false)
    window.setTimeout(() => {
      cloudSaveReadyRef.current = true
    }, 0)
    setIsCloudBusy(false)
  }

  async function openCloudProject(id: string) {
    if (!supabase || !user || id === activeCloudProjectId) return
    setIsCloudBusy(true)
    cloudSaveReadyRef.current = false
    const { data, error } = await supabase
      .from('builder_projects')
      .select('id,name,updated_at,data')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      setAuthMessage(error.message)
      setCloudStatus('Project load failed')
      setIsCloudBusy(false)
      return
    }

    const row = data as CloudProjectRow
    setActiveCloudProjectId(row.id)
    setProject(normalizeCloudProject(row.data, row.name))
    setSelectedId(row.data.elements?.[0]?.id ?? '')
    setCloudStatus('Cloud synced')
    setLastSaved('Cloud synced')
    setIsDashboardOpen(false)
    window.setTimeout(() => {
      cloudSaveReadyRef.current = true
    }, 0)
    setIsCloudBusy(false)
  }

  async function deleteCloudProject() {
    if (!supabase || !user || !activeCloudProjectId) return
    if (!window.confirm('Delete this cloud project?')) return
    setIsCloudBusy(true)
    cloudSaveReadyRef.current = false
    const { error } = await supabase
      .from('builder_projects')
      .delete()
      .eq('id', activeCloudProjectId)
      .eq('user_id', user.id)

    if (error) {
      setAuthMessage(error.message)
      setCloudStatus('Delete failed')
      setIsCloudBusy(false)
      return
    }

    await loadCloudProjects(user)
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
    updateStyleForElement(selected.id, patch)
  }

  function updateStyleForElement(id: string, patch: Partial<ElementStyle>) {
    commitProject((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === id ? { ...element, style: { ...element.style, ...patch } } : element,
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

  function applyTemplate(key: (typeof templates)[number]['key']) {
    if (!window.confirm(`Replace the canvas with the ${key} template?`)) return
    const next = makeTemplateProject(key)
    commitProject(() => next)
    setSelectedId(next.elements[0]?.id ?? '')
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

  function startDrag(event: React.PointerEvent, element: BuilderElement, mode: DragState['mode'], handle?: ResizeHandle) {
    if ((event.target as HTMLElement).closest('button, input, textarea, select')) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(element.id)
    dragRef.current = {
      id: element.id,
      mode,
      handle,
      pointerX: event.clientX,
      pointerY: event.clientY,
      start: resolvePlacement(element, device),
    }
  }

  function openQuickMenu(event: React.MouseEvent, element: BuilderElement) {
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(element.id)
    setQuickMenu({
      id: element.id,
      x: Math.min(event.clientX, window.innerWidth - 292),
      y: Math.min(event.clientY, window.innerHeight - 312),
    })
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

  if (isSessionLoading) {
    return (
      <main className="landing-shell" data-theme={resolvedTheme}>
        <section className="landing-card loading-card">
          <LogoMark />
          <strong>Loading Webception</strong>
          <span>Checking your secure session.</span>
        </section>
      </main>
    )
  }

  if (authRedirectNotice) {
    return (
      <AuthResultPage
        notice={authRedirectNotice}
        user={user}
        onContinue={() => {
          setAuthRedirectNotice(null)
          if (user) {
            setIsDashboardOpen(true)
          } else {
            setAuthMessage('Account confirmed. Log in to open your dashboard.')
            navigatePublicRoute('/login')
          }
        }}
      />
    )
  }

  if (!user) {
    if (publicRoute === '/login' || publicRoute === '/signup') {
      return (
        <AuthPage
          mode={publicRoute === '/login' ? 'login' : 'signup'}
          configured={isSupabaseConfigured}
          busy={isAuthBusy}
          message={authMessage}
          onSignIn={signIn}
          onSignUp={signUp}
          onResendConfirmation={resendConfirmation}
        />
      )
    }

    return (
      <LandingPage />
    )
  }

  if (isDashboardOpen) {
    return (
      <main className="dashboard-shell" data-theme={resolvedTheme}>
        <ProjectDashboard
          user={user}
          projects={cloudProjects}
          activeProjectId={activeCloudProjectId}
          status={cloudStatus}
          busy={isCloudBusy}
          onProjectOpen={openCloudProject}
          onNewProject={createCloudProject}
          onDeleteProject={deleteCloudProject}
          onSignOut={signOut}
          onClose={() => setIsDashboardOpen(false)}
        />
      </main>
    )
  }

  return (
    <main className="app-shell" data-theme={resolvedTheme}>
      <header className="topbar">
        <CloudProjectControls
          user={user}
          projects={cloudProjects}
          activeProjectId={activeCloudProjectId}
          status={cloudStatus}
          busy={isCloudBusy}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenDashboard={() => setIsDashboardOpen(true)}
          onProjectChange={openCloudProject}
          onNewProject={createCloudProject}
          onDeleteProject={deleteCloudProject}
          onSignOut={signOut}
        />

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
            <button
              type="button"
              key={mode}
              onClick={() => setDevice(mode)}
              className={`device-action ${device === mode ? 'active' : ''}`}
              title={mode}
              aria-label={`${mode} canvas`}
              aria-pressed={device === mode}
            >
              <DeviceIcon mode={mode} />
            </button>
          ))}
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <button
              type="button"
              key={mode}
              onClick={() => commitProject((current) => ({ ...current, themeMode: mode }))}
              className={project.themeMode === mode ? 'active ghost-active' : ''}
              title={`${mode} theme`}
              aria-label={`${mode} theme`}
            >
              <ThemeIcon mode={mode} />
            </button>
          ))}
          <button type="button" onClick={undo} disabled={!history.length} title="Undo" aria-label="Undo">
            <ToolbarIcon name="undo" />
          </button>
          <button type="button" onClick={redo} disabled={!future.length} title="Redo" aria-label="Redo">
            <ToolbarIcon name="redo" />
          </button>
          <button type="button" className="secondary-action" onClick={() => setIsPreviewing((value) => !value)} title="Preview" aria-label="Preview">
            <ToolbarIcon name="preview" />
          </button>
          <button type="button" className="primary-action" onClick={downloadSite} disabled={isExporting} title={isExporting ? 'Exporting' : 'Download'} aria-label={isExporting ? 'Exporting' : 'Download'}>
            <ToolbarIcon name="download" />
          </button>
        </nav>
      </header>

      <section className="workspace">
        <LibrarySidebar
          activeLibrary={activeLibrary}
          libraryQuery={libraryQuery}
          visiblePaletteGroups={visiblePaletteGroups}
          recentItems={recentItems}
          onActiveLibrary={setActiveLibrary}
          onLibraryQuery={setLibraryQuery}
          onAddElement={(item) => addElement(item.kind, item)}
          onApplyTemplate={applyTemplate}
        />

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
                    onResizePointerDown={(event, handle) => startDrag(event, element, 'resize', handle)}
                    onContextMenu={(event) => openQuickMenu(event, element)}
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

      {quickMenuElement && quickMenu && (
        <QuickStyleMenu
          element={quickMenuElement}
          x={quickMenu.x}
          y={quickMenu.y}
          onStyle={(patch) => updateStyleForElement(quickMenuElement.id, patch)}
          onClose={() => setQuickMenu(null)}
        />
      )}

      {isAuthOpen && (
        <AuthDialog
          configured={isSupabaseConfigured}
          busy={isAuthBusy}
          message={authMessage}
          onSignIn={signIn}
          onSignUp={signUp}
          onResendConfirmation={resendConfirmation}
          onClose={() => setIsAuthOpen(false)}
        />
      )}

      {user && isDashboardOpen && (
        <ProjectDashboard
          user={user}
          projects={cloudProjects}
          activeProjectId={activeCloudProjectId}
          status={cloudStatus}
          busy={isCloudBusy}
          onProjectOpen={openCloudProject}
          onNewProject={createCloudProject}
          onDeleteProject={deleteCloudProject}
          onSignOut={signOut}
          onClose={() => setIsDashboardOpen(false)}
        />
      )}
    </main>
  )
}

function AuthResultPage({
  notice,
  user,
  onContinue,
}: {
  notice: AuthRedirectNotice
  user: User | null
  onContinue: () => void
}) {
  return (
    <main className="landing-shell auth-result-shell">
      <section className={`landing-card auth-result-card ${notice.kind}`}>
        <LogoMark />
        <span>{notice.kind === 'confirmed' ? 'Ready' : 'Action needed'}</span>
        <h1>{notice.title}</h1>
        <p>{notice.text}</p>
        <button type="button" className="auth-submit" onClick={onContinue}>
          {user ? 'Head to your dashboard' : 'Log in'}
        </button>
      </section>
    </main>
  )
}

function LandingPage() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav" aria-label="Landing navigation">
        <a className="landing-brand" href="/" aria-label="Webception home">
          <LogoMark />
          <strong>Webception</strong>
        </a>
        <div className="landing-nav-menu" aria-label="Landing sections">
          <a href="#features">About</a>
          <a href="https://www.google.com/search?q=rylen+anil&ie=UTF-8" target="_blank" rel="noreferrer">Creator</a>
          <a href="https://rylena.github.io/PortfolioWebsite/#contact" target="_blank" rel="noreferrer">Contact</a>
          <a href="https://github.com/rylena/webception" target="_blank" rel="noreferrer">GitHub</a>
        </div>
        <div className="landing-nav-actions">
          <a className="landing-link secondary" href="/login">Log in</a>
          <a className="landing-link primary" href="/signup">Start building</a>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <h1>Build websites on a real canvas.</h1>
          <p>
            Webception gives every project a focused studio: design the page, save it to your account,
            and export clean static files when it is ready to publish.
          </p>
          <div className="hero-cta">
            <a className="btn-primary" href="/signup">Create free account</a>
            <a className="btn-secondary" href="#features">See how it works</a>
          </div>
          <small>No credit card required. Free forever on one project.</small>
        </div>

        <section className="preview-wrap" aria-label="Editor preview">
          <div className="browser-frame">
            <div className="browser-bar">
              <div className="browser-dots" aria-hidden="true">
                <span className="red" />
                <span className="yellow" />
                <span className="green" />
              </div>
              <div className="url-bar">webception.app/studio</div>
            </div>
            <div className="browser-content">
              <img src={landingUiImage} alt="Webception editor interface with canvas, blocks, and inspector controls" />
            </div>
          </div>
        </section>
      </section>

      <div className="landing-divider" />

      <section className="features" id="features">
        <p className="section-label">About Webception</p>
        <h2>A focused website studio for turning rough ideas into pages you can actually ship.</h2>
        <p className="features-intro">
          Start with a visual canvas, move sections exactly where they need to go, keep every project saved online,
          and export a static site when the design is ready.
        </p>
        <div className="features-grid">
          <FeatureCard
            icon="cloud"
            title="Projects that follow you"
            text="Start on one browser and pick up on another. Your pages, layout, and edits stay tied to your account."
          />
          <FeatureCard
            icon="canvas"
            title="A canvas that stays flexible"
            text="Move, resize, layer, and tune blocks directly on the page without being trapped in rigid template rows."
          />
          <FeatureCard
            icon="export"
            title="Clean export when it is done"
            text="Download a static site package you can host anywhere, with no builder lock-in once your page is ready."
          />
        </div>
      </section>

      <footer className="landing-footer">
        <span>© 2026 Webception</span>
        <nav aria-label="Footer">
          <a href="/login">Log in</a>
          <a href="/signup">Sign up</a>
          <a href="mailto:support@webception.app">Support</a>
        </nav>
      </footer>
    </main>
  )
}

function AuthPage({
  mode,
  configured,
  busy,
  message,
  onSignIn,
  onSignUp,
  onResendConfirmation,
}: {
  mode: 'login' | 'signup'
  configured: boolean
  busy: boolean
  message: string
  onSignIn: (email: string, password: string) => void
  onSignUp: (email: string, password: string) => void
  onResendConfirmation: (email: string) => void
}) {
  const isLogin = mode === 'login'

  return (
    <main className="auth-page">
      <nav className="landing-nav" aria-label="Account navigation">
        <a className="landing-brand" href="/" aria-label="Webception home">
          <LogoMark />
          <strong>Webception</strong>
        </a>
        <a className="landing-link secondary" href={isLogin ? '/signup' : '/login'}>
          {isLogin ? 'Create account' : 'Log in'}
        </a>
      </nav>

      <section className="auth-page-grid">
        <div className="auth-page-copy">
          <span>{isLogin ? 'Welcome back' : 'Start building'}</span>
          <h1>{isLogin ? 'Log in to your dashboard.' : 'Create your Webception account.'}</h1>
          <p>
            {isLogin
              ? 'Open saved projects, continue editing, and export your next site from the same online studio.'
              : 'Save projects online, edit from any browser, and publish a clean static site when it is ready.'}
          </p>
        </div>
        <section className="auth-page-card" aria-label={isLogin ? 'Login form' : 'Signup form'}>
          <div className="auth-page-card-header">
            <span>{isLogin ? 'Log in' : 'Sign up'}</span>
            <strong>{isLogin ? 'Continue to Webception' : 'Create your account'}</strong>
          </div>
          <AuthForm
            configured={configured}
            busy={busy}
            message={message}
            onSignIn={onSignIn}
            onSignUp={onSignUp}
            onResendConfirmation={onResendConfirmation}
            fixedMode={mode}
          />
          <p className="auth-page-switch">
            {isLogin ? 'No account yet?' : 'Already have an account?'}{' '}
            <a href={isLogin ? '/signup' : '/login'}>{isLogin ? 'Sign up' : 'Log in'}</a>
          </p>
        </section>
      </section>
    </main>
  )
}

function FeatureCard({ icon, title, text }: { icon: 'cloud' | 'canvas' | 'export'; title: string; text: string }) {
  return (
    <article className="feature-card">
      <div className="feature-icon">
        {icon === 'cloud' && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6.5 18.5h10.8a4 4 0 0 0 .5-8 6.4 6.4 0 0 0-12.2 1.4 3.3 3.3 0 0 0 .4 6.6Z" />
          </svg>
        )}
        {icon === 'canvas' && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="4" y="4" width="16" height="16" rx="2.5" />
            <path d="M9 4v16M4 9h5M4 15h5" />
          </svg>
        )}
        {icon === 'export' && (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v10M8 10l4 4 4-4" />
            <path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
          </svg>
        )}
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  )
}

function CloudProjectControls({
  user,
  projects,
  activeProjectId,
  status,
  busy,
  onOpenAuth,
  onOpenDashboard,
  onProjectChange,
  onNewProject,
  onDeleteProject,
  onSignOut,
}: {
  user: User | null
  projects: CloudProject[]
  activeProjectId: string
  status: string
  busy: boolean
  onOpenAuth: () => void
  onOpenDashboard: () => void
  onProjectChange: (id: string) => void
  onNewProject: () => void
  onDeleteProject: () => void
  onSignOut: () => void
}) {
  if (!user) {
    return (
      <section className="cloud-controls" aria-label="Account controls">
        <button type="button" className="cloud-primary" onClick={onOpenAuth}>
          Log in
        </button>
        <span>{status}</span>
      </section>
    )
  }

  return (
    <section className="cloud-controls" aria-label="Cloud project controls">
      <button type="button" className="cloud-primary" onClick={onOpenDashboard}>
        Dashboard
      </button>
      <button type="button" onClick={() => onProjectChange(activeProjectId)} disabled={busy || !activeProjectId}>
        Open
      </button>
      <button type="button" onClick={onNewProject} disabled={busy}>New</button>
      <button type="button" onClick={onDeleteProject} disabled={busy || projects.length <= 1} aria-label="Delete current project">Delete</button>
      <span>{projects.find((item) => item.id === activeProjectId)?.name ?? status}</span>
      <button type="button" onClick={onSignOut} aria-label="Sign out">
        {user.email?.split('@')[0] ?? 'Account'}
      </button>
    </section>
  )
}

function ProjectDashboard({
  user,
  projects,
  activeProjectId,
  status,
  busy,
  onProjectOpen,
  onNewProject,
  onDeleteProject,
  onSignOut,
  onClose,
}: {
  user: User
  projects: CloudProject[]
  activeProjectId: string
  status: string
  busy: boolean
  onProjectOpen: (id: string) => void
  onNewProject: () => void
  onDeleteProject: () => void
  onSignOut: () => void
  onClose: () => void
}) {
  const activeProject = projects.find((item) => item.id === activeProjectId)

  return (
    <div className="auth-backdrop dashboard-backdrop" role="presentation">
      <section className="project-dashboard" role="dialog" aria-modal="true" aria-label="Project dashboard">
        <header className="dashboard-header">
          <div>
            <span>Webception Dashboard</span>
            <strong>{activeProject?.name ?? 'Projects'}</strong>
            <small>{user.email}</small>
          </div>
          <div className="dashboard-header-actions">
            <button type="button" onClick={onNewProject} disabled={busy}>New project</button>
            <button type="button" onClick={onSignOut}>Sign out</button>
            <button type="button" onClick={onClose} aria-label="Close dashboard">x</button>
          </div>
        </header>

        <section className="dashboard-summary" aria-label="Account summary">
          <div>
            <span>Projects</span>
            <strong>{projects.length}</strong>
          </div>
          <div>
            <span>Sync</span>
            <strong>{status}</strong>
          </div>
          <div>
            <span>Current</span>
            <strong>{activeProject?.name ?? 'None'}</strong>
          </div>
        </section>

        <section className="dashboard-projects" aria-label="Saved projects">
          {projects.map((item) => (
            <article className={item.id === activeProjectId ? 'active' : ''} key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>Updated {formatProjectDate(item.updated_at)}</span>
              </div>
              <div className="project-card-actions">
                <button type="button" className="cloud-primary" disabled={busy} onClick={() => onProjectOpen(item.id)}>
                  Open
                </button>
                {item.id === activeProjectId && (
                  <button type="button" disabled={busy || projects.length <= 1} onClick={onDeleteProject}>
                    Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </section>
    </div>
  )
}

function AuthDialog({
  configured,
  busy,
  message,
  onSignIn,
  onSignUp,
  onResendConfirmation,
  onClose,
}: {
  configured: boolean
  busy: boolean
  message: string
  onSignIn: (email: string, password: string) => void
  onSignUp: (email: string, password: string) => void
  onResendConfirmation: (email: string) => void
  onClose: () => void
}) {
  return (
    <div className="auth-backdrop" role="presentation">
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-label="Account login">
        <div className="auth-header">
          <div>
            <strong>Log in to Webception</strong>
            <span>Save and switch projects from any browser.</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close login">x</button>
        </div>
        <AuthForm
          configured={configured}
          busy={busy}
          message={message}
          onSignIn={onSignIn}
          onSignUp={onSignUp}
          onResendConfirmation={onResendConfirmation}
        />
      </section>
    </div>
  )
}

function AuthForm({
  configured,
  busy,
  message,
  onSignIn,
  onSignUp,
  onResendConfirmation,
  fixedMode,
}: {
  configured: boolean
  busy: boolean
  message: string
  onSignIn: (email: string, password: string) => void
  onSignUp: (email: string, password: string) => void
  onResendConfirmation: (email: string) => void
  fixedMode?: 'login' | 'signup'
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const activeMode = fixedMode ?? mode
  const trimmedEmail = email.trim().toLowerCase()
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
  const hasLongPassword = password.length >= passwordMinLength
  const canSubmit = configured && !busy && hasEmail && hasLongPassword
  const canResendConfirmation = configured && !busy && hasEmail

  function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return
    if (activeMode === 'login') {
      onSignIn(trimmedEmail, password)
      return
    }
    onSignUp(trimmedEmail, password)
  }

  return (
    <form className="auth-form" onSubmit={submitAuth}>
        {!fixedMode && (
          <div className="auth-mode" aria-label="Choose login or signup">
            <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
              Log in
            </button>
            <button type="button" className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>
              Sign up
            </button>
          </div>
        )}

        {!configured && (
          <p className="auth-warning">
            Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Supabase login.
          </p>
        )}

        <label>
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>
        <label>
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={`${passwordMinLength}+ characters`} autoComplete={activeMode === 'login' ? 'current-password' : 'new-password'} />
          <small className={hasLongPassword ? 'valid' : ''}>
            Use at least {passwordMinLength} characters.
          </small>
        </label>

        <button type="submit" className="auth-submit cloud-primary" disabled={!canSubmit}>
          {busy ? 'Working...' : activeMode === 'login' ? 'Log in' : 'Create account'}
        </button>

        <button
          type="button"
          className="auth-resend"
          disabled={!canResendConfirmation}
          onClick={() => onResendConfirmation(trimmedEmail)}
        >
          Resend confirmation email
        </button>

        {message && <p className="auth-message">{message}</p>}
    </form>
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

function QuickStyleMenu({
  element,
  x,
  y,
  onStyle,
  onClose,
}: {
  element: BuilderElement
  x: number
  y: number
  onStyle: (patch: Partial<ElementStyle>) => void
  onClose: () => void
}) {
  return (
    <aside
      className="quick-style-menu"
      style={{ left: x, top: y }}
      onPointerDown={(event) => event.stopPropagation()}
      aria-label="Quick style controls"
    >
      <div className="quick-menu-title">
        <strong>{element.name}</strong>
        <button type="button" onClick={onClose} aria-label="Close quick style menu">x</button>
      </div>

      <div className="quick-menu-grid">
        <label>
          <span>Font</span>
          <select value={element.style.fontFamily} onChange={(event) => onStyle({ fontFamily: event.target.value })}>
            {fonts.map((font) => (
              <option value={font} key={font}>{font}</option>
            ))}
          </select>
        </label>

        <label>
          <span>Size</span>
          <input
            type="number"
            min="10"
            max="82"
            value={element.style.fontSize}
            onChange={(event) => onStyle({ fontSize: Number(event.target.value) })}
          />
        </label>
      </div>

      <input
        className="quick-size-slider"
        aria-label="Font size"
        type="range"
        min="10"
        max="82"
        value={element.style.fontSize}
        onChange={(event) => onStyle({ fontSize: Number(event.target.value) })}
      />

      <div className="quick-align-row" aria-label="Text alignment">
        {(['left', 'center', 'right'] as const).map((align) => (
          <button type="button" key={align} className={element.style.align === align ? 'active' : ''} onClick={() => onStyle({ align })}>
            {align}
          </button>
        ))}
      </div>

      <div className="quick-color-row">
        <label>
          <span>Text</span>
          <input type="color" value={element.style.color} onChange={(event) => onStyle({ color: event.target.value })} />
        </label>
        <label>
          <span>Fill</span>
          <input type="color" value={element.style.background} onChange={(event) => onStyle({ background: event.target.value })} />
        </label>
        <label>
          <span>Border</span>
          <input type="color" value={element.style.borderColor} onChange={(event) => onStyle({ borderColor: event.target.value })} />
        </label>
      </div>
    </aside>
  )
}

function LibrarySidebar({
  activeLibrary,
  libraryQuery,
  visiblePaletteGroups,
  recentItems,
  onActiveLibrary,
  onLibraryQuery,
  onAddElement,
  onApplyTemplate,
}: {
  activeLibrary: LibraryKey
  libraryQuery: string
  visiblePaletteGroups: typeof paletteGroups
  recentItems: PaletteItem[]
  onActiveLibrary: (key: LibraryKey) => void
  onLibraryQuery: (value: string) => void
  onAddElement: (item: PaletteItem) => void
  onApplyTemplate: (key: (typeof templates)[number]['key']) => void
}) {
  return (
    <aside className="left-panel" aria-label="Design library">
      <nav className="library-rail" aria-label="Library sections">
        <div className="rail-logo" aria-label="Webception">
          <LogoMark />
        </div>
        {libraryTabs.map((tab) => (
          <button
            type="button"
            key={tab.key}
            className={activeLibrary === tab.key ? 'active' : ''}
            onClick={() => onActiveLibrary(tab.key)}
            aria-pressed={activeLibrary === tab.key}
          >
            <LibraryIcon name={tab.key} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <section className="library-pane">
        <div className="panel-heading library-heading">
          <span>{libraryTabs.find((tab) => tab.key === activeLibrary)?.label}</span>
          <small>{activeLibrary === 'templates' ? 'Replace canvas' : 'Tap to add'}</small>
        </div>

        {activeLibrary !== 'templates' && (
          <label className="library-search">
            <span aria-hidden="true">+</span>
            <input
              aria-label="Search elements"
              placeholder="Search elements"
              value={libraryQuery}
              onChange={(event) => onLibraryQuery(event.target.value)}
            />
          </label>
        )}

        <div className="library-scroll">
          {activeLibrary === 'templates' ? (
            <section className="template-list" aria-label="Templates">
              {templates.map((template) => (
                <button type="button" key={template.key} className="template-tile" onClick={() => onApplyTemplate(template.key)}>
                  <strong>{template.name}</strong>
                  <small>{template.detail}</small>
                </button>
              ))}
            </section>
          ) : (
            <>
              {!libraryQuery && recentItems.length > 0 && (
                <section className="recent-library" aria-label="Recently used elements">
                  <div className="library-section-title">
                    <h2>Recently used</h2>
                    <small>{recentItems.length}</small>
                  </div>
                  <div className="recent-strip">
                    {recentItems.map((item) => (
                      <button type="button" key={`recent-${item.kind}`} className={`recent-tile ${item.kind}`} onClick={() => onAddElement(item)} aria-label={`Add ${item.label}`}>
                        <span className={`block-icon ${item.kind}`} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </section>
              )}

              <section className="category-browser" aria-label="Browse categories">
                <div className="library-section-title">
                  <h2>{libraryQuery ? 'Search results' : 'Browse categories'}</h2>
                </div>
                {visiblePaletteGroups.length ? (
                  visiblePaletteGroups.map((group) => (
                    <section className="palette-group" key={group.label}>
                      <h2>{group.label}</h2>
                      <div className="block-list">
                        {group.items.map((item) => (
                          <button type="button" key={`${group.label}-${item.label}-${item.kind}`} className="block-tile" onClick={() => onAddElement(item)}>
                            <span className={`block-icon ${item.kind}`} aria-hidden="true" />
                            <span>
                              <strong>{item.label}</strong>
                              <small>{item.detail}</small>
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <p className="empty-library">No matching elements.</p>
                )}
              </section>
            </>
          )}
        </div>
      </section>
    </aside>
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
  onContextMenu,
}: {
  element: BuilderElement
  placement: Placement
  selected: boolean
  previewing: boolean
  onSelect: () => void
  onPointerDown: (event: React.PointerEvent) => void
  onResizePointerDown: (event: React.PointerEvent, handle: ResizeHandle) => void
  onContextMenu: (event: React.MouseEvent) => void
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
      onContextMenu={onContextMenu}
      tabIndex={0}
      onFocus={onSelect}
      aria-label={`${element.name} element`}
    >
      <ElementContent element={element} />
      {selected && (
        <>
          {(['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left'] as const).map((handle) => (
            <span
              key={handle}
              className={`resize-handle ${handle}`}
              onPointerDown={(event) => onResizePointerDown(event, handle)}
              aria-hidden="true"
            />
          ))}
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
    case 'image': {
      const src = safeMediaUrl(element.src)
      return src ? <img className="image-render" src={src} alt="" /> : <div className="image-render image-placeholder" />
    }
    case 'gallery':
      return (
        <div className="gallery-render">
          {[1, 2, 3].map((item) => <span key={item} />)}
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
      <rect x="2.5" y="2.5" width="31" height="31" rx="9" />
      <path className="logo-window" d="M9 11.2h18a2 2 0 0 1 2 2v11.6a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V13.2a2 2 0 0 1 2-2Z" />
      <path className="logo-bar" d="M7.6 15.2h20.8" />
      <path className="logo-dot" d="M11 13.25h.1M14 13.25h.1M17 13.25h.1" />
      <path className="logo-w" d="M10.7 18.2 13 24l2.5-4.5L18 24l2.5-5.8M20.5 24l2.8-5.8" />
    </svg>
  )
}

function DeviceIcon({ mode }: { mode: DeviceMode }) {
  if (mode === 'mobile') {
    return (
      <svg className="device-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="3" width="8" height="18" rx="2.4" />
        <path d="M11 18h2" />
      </svg>
    )
  }

  if (mode === 'tablet') {
    return (
      <svg className="device-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="6" y="3.5" width="12" height="17" rx="2.6" />
        <path d="M11 17.5h2" />
      </svg>
    )
  }

  return (
    <svg className="device-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="11" rx="1.8" />
      <path d="M9 20h6M12 16v4" />
    </svg>
  )
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  if (mode === 'light') {
    return (
      <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </svg>
    )
  }

  if (mode === 'dark') {
    return (
      <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 15.4A7.2 7.2 0 0 1 8.6 5a7.7 7.7 0 1 0 10.4 10.4Z" />
      </svg>
    )
  }

  return (
    <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="14" rx="3" />
      <path d="M12 5v14" />
    </svg>
  )
}

function ToolbarIcon({ name }: { name: 'undo' | 'redo' | 'preview' | 'download' }) {
  if (name === 'undo') {
    return (
      <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 7H5v4" />
        <path d="M5.5 11A7 7 0 1 0 8 5.7" />
      </svg>
    )
  }

  if (name === 'redo') {
    return (
      <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 7h4v4" />
        <path d="M18.5 11A7 7 0 1 1 16 5.7" />
      </svg>
    )
  }

  if (name === 'download') {
    return (
      <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4v10" />
        <path d="m8 10 4 4 4-4" />
        <path d="M5 19h14" />
      </svg>
    )
  }

  return (
    <svg className="toolbar-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.8 12s3.4-6 9.2-6 9.2 6 9.2 6-3.4 6-9.2 6-9.2-6-9.2-6Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  )
}

function LibraryIcon({ name }: { name: LibraryKey }) {
  if (name === 'templates') {
    return (
      <svg className="library-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    )
  }

  if (name === 'text') {
    return (
      <svg className="library-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6h14M12 6v13M8 19h8" />
      </svg>
    )
  }

  if (name === 'media') {
    return (
      <svg className="library-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="m7 16 3.4-3.4 2.4 2.4 2.2-2.8L18 16M8 9h.01" />
      </svg>
    )
  }

  if (name === 'sections') {
    return (
      <svg className="library-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 6h14M5 12h14M5 18h14" />
      </svg>
    )
  }

  if (name === 'shapes') {
    return (
      <svg className="library-icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="8" cy="8" r="3" />
        <path d="M14 5h5v5h-5zM6 17h12" />
      </svg>
    )
  }

  return (
    <svg className="library-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function filterPaletteGroups(activeLibrary: LibraryKey, query: string): typeof paletteGroups {
  const cleanQuery = query.trim().toLowerCase()
  if (activeLibrary === 'templates') return []

  return paletteGroups
    .filter((group) => activeLibrary === 'elements' || group.key === activeLibrary)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!cleanQuery) return true
        return [item.label, item.detail, item.kind, ...(item.tags ?? [])].join(' ').toLowerCase().includes(cleanQuery)
      }),
    }))
    .filter((group) => group.items.length > 0)
}

function resizePlacement(start: Placement, handle: ResizeHandle, dx: number, dy: number): Placement {
  const minWidth = 32
  const minHeight = 24
  const originalRight = start.x + start.width
  const originalBottom = start.y + start.height
  let x = start.x
  let y = start.y
  let width = start.width
  let height = start.height

  if (handle.includes('right')) {
    width = Math.max(minWidth, start.width + dx)
  }

  if (handle.includes('left')) {
    x = Math.min(start.x + dx, originalRight - minWidth)
    width = originalRight - x
  }

  if (handle.includes('bottom')) {
    height = Math.max(minHeight, start.height + dy)
  }

  if (handle.includes('top')) {
    y = Math.min(start.y + dy, originalBottom - minHeight)
    height = originalBottom - y
  }

  return {
    ...start,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
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

function makeTemplateProject(key: (typeof templates)[number]['key']): BuilderProject {
  if (key === 'portfolio') {
    return {
      name: 'Portfolio',
      themeMode: 'system',
      pageBackground: '#f2f4ef',
      elements: [
        makeElement('navbar', { x: 64, y: 34, width: 1072, height: 70, zIndex: 4 }),
        customize(makeElement('hero', { x: 82, y: 136, width: 610, height: 300, zIndex: 2 }), {
          title: 'Rylen builds useful web experiments',
          text: 'A focused portfolio for projects, demos, and small internet tools.',
          action: 'View work',
        }),
        customize(makeElement('gallery', { x: 82, y: 500, width: 650, height: 200, zIndex: 2 }), { title: 'Selected work' }),
        customize(makeElement('stats', { x: 760, y: 146, width: 310, height: 130, zIndex: 2 }), { title: 'Project stats' }),
        customize(makeElement('testimonial', { x: 740, y: 330, width: 360, height: 210, zIndex: 2 }), {
          title: 'Build log',
          text: 'Every project gets clearer when the demo page is easy to change.',
        }),
      ],
    }
  }

  if (key === 'event') {
    return {
      name: 'Event',
      themeMode: 'system',
      pageBackground: '#f8f1eb',
      elements: [
        customize(makeElement('badge', { x: 82, y: 120, width: 190, height: 40, zIndex: 3 }), { text: 'Friday 6:30 PM' }),
        customize(makeElement('hero', { x: 82, y: 170, width: 620, height: 290, zIndex: 2 }), {
          title: 'Ship night at the clubhouse',
          text: 'Bring a half-finished idea and leave with something people can open.',
          action: 'Reserve a spot',
        }),
        customize(makeElement('contact', { x: 760, y: 160, width: 330, height: 360, zIndex: 2 }), {
          title: 'RSVP',
          action: 'Join event',
        }),
        customize(makeElement('faq', { x: 96, y: 520, width: 520, height: 230, zIndex: 2 }), { title: 'Event notes' }),
        customize(makeElement('blob', { x: 700, y: 110, width: 430, height: 480, zIndex: 0 }), {}),
      ],
    }
  }

  return cloneProject(starterProject)
}

function customize(element: BuilderElement, patch: Partial<BuilderElement>): BuilderElement {
  return { ...element, ...patch }
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
    image: { name: 'Image', title: 'Image', text: '', subtext: '', action: '', src: '' },
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

function normalizeCloudProject(project: BuilderProject, fallbackName: string): BuilderProject {
  return {
    name: project?.name || fallbackName || 'Untitled',
    themeMode: project?.themeMode ?? 'system',
    pageBackground: project?.pageBackground || '#f7f8f3',
    elements: Array.isArray(project?.elements) ? project.elements : [],
  }
}

function formatProjectDate(value: string) {
  const timestamp = Date.parse(value)
  if (Number.isNaN(timestamp)) return 'recently'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
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
body { margin: 0; background: var(--page-bg); color: #182018; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.page { position: relative; width: min(1200px, 100%); min-height: 820px; margin: 0 auto; overflow: hidden; }
.wc-el { position: absolute; display: grid; overflow: hidden; }
.wc-el h1, .wc-el h2, .wc-el p { margin: 0; }
.wc-el img { width: 100%; height: 100%; object-fit: cover; display: block; }
.wc-button { width: 100%; height: 100%; border: 0; border-radius: inherit; color: inherit; background: transparent; font: inherit; font-weight: 800; }
.wc-navbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; width: 100%; height: 100%; }
.wc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; width: 100%; }
.wc-grid section { padding: 14px; border: 1px solid rgba(20, 29, 20, .1); border-radius: 12px; background: rgba(255,255,255,.42); }
.wc-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.wc-gallery span, .wc-image-placeholder { border-radius: 12px; background: linear-gradient(135deg, rgba(36, 81, 58, .12), rgba(116, 170, 134, .24)), repeating-linear-gradient(45deg, rgba(36, 81, 58, .12) 0 10px, transparent 10px 20px); }
.wc-form { display: grid; gap: 10px; width: 100%; }
.wc-form input, .wc-form textarea { border: 1px solid rgba(20,29,20,.16); border-radius: 10px; padding: 11px; font: inherit; }
.wc-divider { width: 100%; height: 2px; background: currentColor; align-self: center; }
.wc-icon { display: grid; place-items: center; }
.wc-icon-mark { width: min(78%, 72px); height: min(78%, 72px); fill: currentColor; }
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
  if (element.kind === 'image') {
    const src = safeMediaUrl(element.src)
    return src ? `<img src="${escapeHtml(src)}" alt="" />` : '<div class="wc-image-placeholder"></div>'
  }
  if (element.kind === 'gallery') return '<div class="wc-gallery"><span></span><span></span><span></span></div>'
  if (element.kind === 'divider' || element.kind === 'line') return `<div class="wc-divider"></div>`
  if (element.kind === 'contact') return `<form class="wc-form"><input placeholder="Name" /><input placeholder="Email" /><textarea placeholder="Message"></textarea><button>${escapeHtml(element.action)}</button></form>`
  if (['rect', 'circle', 'blob', 'spacer'].includes(element.kind)) return ''
  if (['pill', 'badge'].includes(element.kind)) return escapeHtml(element.text)
  if (element.kind === 'icon') return exportLogoMark()
  if (element.kind === 'cardGrid') return `<div class="wc-grid"><section><strong>Design</strong><p>${escapeHtml(element.text)}</p></section><section><strong>Tune</strong><p>${escapeHtml(element.text)}</p></section><section><strong>Ship</strong><p>${escapeHtml(element.text)}</p></section></div>`
  return `<h2>${escapeHtml(element.title)}</h2><p>${escapeHtml(element.text)}</p>`
}

function exportLogoMark() {
  return `<svg class="wc-icon-mark" viewBox="0 0 36 36" aria-hidden="true">
    <path d="M7 25.5 13.5 8h5L12 25.5H7Z"></path>
    <path d="M17.5 25.5 24 8h5l-6.5 17.5h-5Z" opacity=".78"></path>
  </svg>`
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

function safeMediaUrl(value: string) {
  if (!value.trim()) return ''
  try {
    const url = new URL(value)
    return url.protocol === 'https:' ? url.toString() : ''
  } catch {
    return ''
  }
}

function readAuthRedirectNotice(): AuthRedirectNotice | null {
  const params = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const error = params.get('error_description') || hashParams.get('error_description') || params.get('error') || hashParams.get('error')

  if (error) {
    return {
      kind: 'error',
      title: 'Confirmation link did not work',
      text: error.replaceAll('+', ' '),
    }
  }

  const type = params.get('type') || hashParams.get('type')
  if (params.get('confirmed') === '1' || type === 'signup' || type === 'email' || params.has('code') || hashParams.has('access_token')) {
    return {
      kind: 'confirmed',
      title: 'Account confirmed',
      text: 'Your Webception account is ready. Head to your dashboard to create or open a project.',
    }
  }

  return null
}

function cleanupAuthRedirectUrl() {
  window.history.replaceState(null, '', window.location.pathname || '/')
}

function readPublicRoute(): PublicRoute {
  if (window.location.pathname === '/login') return '/login'
  if (window.location.pathname === '/signup') return '/signup'
  return '/'
}

export default App
