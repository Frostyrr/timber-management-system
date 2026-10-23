import { z } from 'zod'
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['Administrator', 'Inventory Custodian', 'Staff']),
  department: z.string(),
})
const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  tag: z.string(),
  location: z.string(),
  condition: z.enum(['Good', 'Fair', 'Damaged', 'Missing']),
})
export const EVENT_CATEGORIES = [
  'Sports Coverage',
  'Campus News & Governance',
  'Features & Culture',
  'Investigative & Fieldwork',
  'Institutional & Academic',
  'Studio & Internal Production',
  'General Assignment',
] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]

const loanSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  borrowerId: z.string(),
  out: z.string(),
  due: z.string(),
  before: z.string(),
  event: z.string().optional(),
  eventCategory: z.string().optional(),
  returned: z.string().optional(),
  after: z.string().optional(),
})
const incidentSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  kind: z.enum(['Damaged', 'Missing']),
  notes: z.string(),
  at: z.string(),
  reporter: z.string(),
  outcome: z.string().optional(),
  resolved: z.string().optional(),
})
const eventSchema = z.object({
  id: z.string(),
  actor: z.string(),
  at: z.string(),
  text: z.string(),
  entityId: z.string(),
})
export const stateSchema = z.object({
  version: z.literal(2),
  profiles: z.array(profileSchema).min(1),
  items: z.array(itemSchema),
  loans: z.array(loanSchema),
  incidents: z.array(incidentSchema),
  events: z.array(eventSchema),
})
export type State = z.infer<typeof stateSchema>
export type Profile = z.infer<typeof profileSchema>
export type Item = z.infer<typeof itemSchema>
export const uid = () => crypto.randomUUID()
export const isOverdue = (due: string) => new Date(due).getTime() < Date.now()
export function seed(now = new Date()): State {
  const date = (days: number) => new Date(now.getTime() + days * 86400000).toISOString()
  const profiles: Profile[] = [
    { id: 'admin', name: 'Alex Rivera', role: 'Administrator', department: 'Editorial' },
    { id: 'editor', name: 'Maya Santos', role: 'Staff', department: 'Editorial' },
    { id: 'custodian', name: 'Leo Cruz', role: 'Inventory Custodian', department: 'Visuals' },
    { id: 'staff', name: 'Sam Reyes', role: 'Staff', department: 'Editorial' },
    { id: 'p5', name: 'Isabel Flores', role: 'Staff', department: 'Visuals' },
    { id: 'p6', name: 'Noah Garcia', role: 'Staff', department: 'Production' },
    { id: 'p7', name: 'Bea Ramos', role: 'Staff', department: 'Editorial' },
    { id: 'p8', name: 'Eli Mendoza', role: 'Staff', department: 'Production' },
  ]
  const names = [
    'Canon EOS 80D',
    'Sony a6400',
    'Zoom H1n recorder',
    'Manfrotto tripod',
    'Wacom Intuos',
    'Canon EF 50mm lens',
    'LED light panel',
    'MacBook Air',
  ]
  const items: Item[] = names.map((name, i) => ({
    id: `i${i}`,
    name,
    category: i < 2 ? 'Camera' : i === 7 ? 'Computer' : 'Accessories',
    tag: `TP-${String(i + 1).padStart(3, '0')}`,
    location: i === 7 ? 'Layout desk' : 'Equipment cabinet',
    condition: i === 6 ? 'Damaged' : 'Good',
  }))
  return {
    version: 2,
    profiles,

    items,
    loans: [
      {
        id: 'l0',
        itemId: 'i0',
        borrowerId: 'staff',
        out: date(-4),
        due: date(-1),
        before: 'Good',
        event: 'University Games Coverage',
        eventCategory: 'Sports Coverage',
      },
      {
        id: 'l1',
        itemId: 'i2',
        borrowerId: 'p5',
        out: date(-1),
        due: date(2),
        before: 'Good',
        event: 'Student Council Election Forum',
        eventCategory: 'Campus News & Governance',
      },
    ],
    incidents: [
      {
        id: 'in0',
        itemId: 'i6',
        kind: 'Damaged',
        notes: 'Light flickers during use. Awaiting equipment inspection.',
        at: date(-1),
        reporter: 'custodian',
      },
    ],
    events: [
      {
        id: 'e0',
        actor: 'custodian',
        at: date(-2),
        entityId: 'i6',
        text: 'Equipment condition flagged for inspection',
      },
    ],
  }
}
export const canInventory = (p: Profile) =>
  ['Administrator', 'Inventory Custodian'].includes(p.role)
export const available = (s: State, id: string) =>
  !s.loans.some((l) => l.itemId === id && !l.returned) &&
  !s.incidents.some((i) => i.itemId === id && !i.resolved) &&
  ['Good', 'Fair'].includes(s.items.find((i) => i.id === id)?.condition ?? '')
export type Action =
  | { type: 'item'; item: Item }
  | {
      type: 'checkout'
      itemId: string
      borrowerId: string
      due: string
      condition: string
      event?: string
      eventCategory?: string
    }
  | { type: 'return'; loanId: string; condition: Item['condition'] }
  | { type: 'incident'; itemId: string; kind: 'Damaged' | 'Missing'; notes: string }
  | { type: 'resolve'; id: string; outcome: string; condition: Item['condition'] }
const requireThat = (ok: unknown, message: string) => {
  if (!ok) throw new Error(message)
}
const future = (v: string) => Number.isFinite(Date.parse(v)) && Date.parse(v) > Date.now()
export function transition(state: State, actorId: string, action: Action): State {
  const s = structuredClone(state),
    p = s.profiles.find((p) => p.id === actorId)!
  requireThat(p, 'Unknown persona.')
  const now = new Date().toISOString()
  const log = (text: string, entityId: string) =>
    s.events.unshift({ id: uid(), actor: actorId, at: now, text, entityId })
  const incident = (itemId: string, kind: 'Damaged' | 'Missing', notes: string) => {
    s.incidents.unshift({ id: uid(), itemId, kind, notes, at: now, reporter: actorId })
    s.items.find((i) => i.id === itemId)!.condition = kind
  }
  if (action.type === 'item') {
    requireThat(canInventory(p), 'Only custodians and administrators manage equipment.')
    const i = action.item
    requireThat(
      i.name.trim() && i.tag.trim() && i.location.trim() && i.category.trim(),
      'Complete all item fields.',
    )
    requireThat(
      !s.items.some((x) => x.tag.toLowerCase() === i.tag.toLowerCase() && x.id !== i.id),
      'Asset tag already exists.',
    )
    const index = s.items.findIndex((x) => x.id === i.id)
    if (index >= 0) {
      requireThat(
        i.condition === s.items[index].condition,
        'Use a return or incident resolution to change condition.',
      )
      s.items[index] = i
    } else {
      requireThat(
        ['Good', 'Fair'].includes(i.condition),
        'Register usable equipment, then report any incident.',
      )
      s.items.push(i)
    }
    log(`Saved equipment: ${i.name}`, i.id)
  } else if (action.type === 'checkout') {
    requireThat(canInventory(p), 'Only custodians and administrators issue equipment.')
    requireThat(available(s, action.itemId), 'Equipment is unavailable.')
    requireThat(
      s.profiles.some((p) => p.id === action.borrowerId),
      'Choose a borrower.',
    )
    requireThat(future(action.due), 'Return deadline must be in the future.')
    requireThat(action.condition.trim(), 'Record checkout condition.')
    s.loans.unshift({
      id: uid(),
      itemId: action.itemId,
      borrowerId: action.borrowerId,
      out: now,
      due: action.due,
      before: action.condition,
      event: action.event?.trim() || undefined,
      eventCategory: action.eventCategory?.trim() || undefined,
    })
    const eventSuffix = action.event?.trim() ? ` for ${action.event.trim()}` : ''
    const categorySuffix = action.eventCategory?.trim() ? ` [${action.eventCategory.trim()}]` : ''
    const borrowerName = s.profiles.find((p) => p.id === action.borrowerId)?.name ?? 'staff'
    log(`Released equipment to ${borrowerName}${eventSuffix}${categorySuffix}`, action.itemId)
  } else if (action.type === 'return') {
    requireThat(canInventory(p), 'Only custodians and administrators record returns.')
    const l = s.loans.find((l) => l.id === action.loanId)
    requireThat(l && !l.returned, 'This loan is already closed or does not exist.')
    l!.returned = now
    l!.after = action.condition
    s.items.find((i) => i.id === l!.itemId)!.condition = action.condition
    if (['Damaged', 'Missing'].includes(action.condition))
      incident(
        l!.itemId,
        action.condition as 'Damaged' | 'Missing',
        'Condition recorded when closing the loan. Review required; no responsibility presumed.',
      )
    log(`Closed loan · ${action.condition}`, l!.itemId)
  } else if (action.type === 'incident') {
    requireThat(
      s.items.some((i) => i.id === action.itemId),
      'Choose equipment.',
    )
    requireThat(
      canInventory(p) ||
        s.loans.some((l) => l.itemId === action.itemId && l.borrowerId === p.id && !l.returned),
      'Report an incident for equipment you are borrowing.',
    )
    requireThat(action.notes.trim(), 'Describe the incident.')
    incident(action.itemId, action.kind, action.notes)
    log('Opened equipment incident for review', action.itemId)
  } else if (action.type === 'resolve') {
    requireThat(canInventory(p), 'Only custodians and administrators resolve incidents.')
    const i = s.incidents.find((i) => i.id === action.id)
    requireThat(i && !i.resolved, 'Incident is already resolved.')
    requireThat(action.outcome.trim(), 'Document the outcome.')
    i!.outcome = action.outcome
    i!.resolved = now
    s.items.find((x) => x.id === i!.itemId)!.condition = action.condition
    log(`Resolved incident: ${action.outcome}`, i!.itemId)
  }
  return s
}
export const visibleIncidents = (s: State, p: Profile) =>
  s.incidents.filter(
    (i) =>
      canInventory(p) ||
      i.reporter === p.id ||
      s.loans.some(
        (l) =>
          l.itemId === i.itemId &&
          l.borrowerId === p.id &&
          Date.parse(l.out) <= Date.parse(i.at) &&
          (!l.returned || Date.parse(l.returned) >= Date.parse(i.at)),
      ),
  )
export const STORAGE_KEY = 'timber-inventory-demo-v2'
export const LEGACY_STORAGE_KEY = 'timber-publication-demo-v1'
export function load(storage: Pick<Storage, 'getItem'>): { state: State; warning: string } {
  try {
    const current = storage.getItem(STORAGE_KEY)
    const raw = current ?? storage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return { state: seed(), warning: '' }
    const data = JSON.parse(raw)
    const migrating = current === null && data.version === 1
    if (migrating) {
      data.version = 2
      if (Array.isArray(data.profiles))
        data.profiles = data.profiles.map((p: Record<string, unknown>) => ({
          ...p,
          role: p.role === 'Department Editor' ? 'Staff' : p.role,
        }))
    }
    const parsed = stateSchema.safeParse(data)
    if (parsed.success) {
      const state = parsed.data
      state.events = state.events.filter((e) => state.items.some((i) => i.id === e.entityId))
      return {
        state,
        warning: migrating
          ? 'Your saved equipment, loans, and incident records have been carried into the inventory workspace.'
          : '',
      }
    }
    return { state: seed(), warning: 'Saved demo data was incompatible and has been reset.' }
  } catch {
    return {
      state: seed(),
      warning:
        'Saved data could not be read. A fresh demo is active; browser storage may be unavailable.',
    }
  }
}
export function save(storage: Pick<Storage, 'setItem'>, state: State) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
    return ''
  } catch {
    return 'Browser storage is unavailable. Changes will last only for this session.'
  }
}
