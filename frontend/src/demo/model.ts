import { releaseDetailsSchema, externalSchema, type ReleaseDetails } from './release'
import { z } from 'zod'
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['Administrator', 'Inventory Custodian', 'Staff']),
  department: z.string(),
  status: z.enum(['pending','active','suspended']).optional(),
  title: z.string().optional(),
})
const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  tag: z.string(),
  location: z.string(),
  condition: z.enum(['Good', 'Fair', 'Damaged', 'Missing']),
  archived: z.boolean().optional(),
  unavailable: z.boolean().optional(),
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
  borrowerId: z.string().optional(),
  useType: z.enum(['publication_use','member_borrowing','external_borrowing']).optional(),
  purpose: z.string().optional(),
  external: externalSchema.optional(),
  issuedBy: z.string().optional(),
  receivedBy: z.string().optional(),
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
  action: z.string().optional(),
  actorRole: z.string().optional(),
  subjectId: z.string().nullable().optional(),
  releaseId: z.string().nullable().optional(),
  requestId: z.string().optional(),
  before: z.record(z.string(),z.unknown()).nullable().optional(),
  after: z.record(z.string(),z.unknown()).nullable().optional(),
  reason: z.string().optional(),
  useType: z.string().nullable().optional(),
})
export const stateSchema = z.object({
  version: z.literal(3),
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
    { id: 'admin', name: 'Marc Elson Rebato', role: 'Administrator', title: 'Multimedia Director', department: 'Multimedia & Visuals' },
    { id: 'dana-gales', name: 'Dana Paula Gales', role: 'Administrator', title: 'Associate Editor', department: 'Editorial Board' },
    { id: 'custodian', name: 'Juvie Rose Mosquite', role: 'Inventory Custodian', title: 'Head Photojournalist', department: 'Photojournalism' },
    { id: 'robert-dedumo', name: 'Robert Kent Dedumo', role: 'Inventory Custodian', title: 'Head Videojournalist', department: 'Videojournalism' },
    { id: 'staff', name: 'Christian Punay', role: 'Staff', title: 'Head Video Editor', department: 'Video Production' },
    { id: 'p5', name: 'Zhairo Milan', role: 'Staff', title: 'Head Cartoonist', department: 'Art & Cartoons' },
    { id: 'jennel-inso', name: 'Jennel Inso', role: 'Staff', title: 'Head Graphics Artist', department: 'Layout & Graphics' },
    { id: 'editor', name: 'Ryan Ilagan', role: 'Staff', title: 'News Writer', department: 'News Desk' },
    { id: 'hanna-bonggot', name: 'Hanna Camela Bonggot', role: 'Staff', title: 'News Writer', department: 'News Desk' },
    { id: 'p8', name: 'Anthony Pormento', role: 'Staff', title: 'Column Writer', department: 'Opinion & Columns' },
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
    version: 3,
    profiles,

    items,
    loans: [
      {
        id: 'l0',
        itemId: 'i0',
        borrowerId: 'staff',
        useType:'publication_use',purpose:'University Games Coverage',issuedBy:'custodian',
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
        useType:'member_borrowing',purpose:'Personal audio practice',issuedBy:'custodian',
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
  !s.items.find(i=>i.id===id)?.archived && !s.items.find(i=>i.id===id)?.unavailable && !s.loans.some((l) => l.itemId === id && !l.returned) &&
  !s.incidents.some((i) => i.itemId === id && !i.resolved) &&
  ['Good', 'Fair'].includes(s.items.find((i) => i.id === id)?.condition ?? '')
export type Action =
  | { type: 'item'; item: Item }
  | ({ type:'checkout';itemId:string;due:string;condition:string;event?:string;eventCategory?:string } & ReleaseDetails)
  | { type: 'return'; loanId: string; condition: Item['condition'] }
  | { type: 'incident'; itemId: string; kind: 'Damaged' | 'Missing'; notes: string }
  | { type: 'resolve'; id: string; outcome: string; condition: Item['condition'] }
  | { type: 'archive'; itemId: string; reason: string }
  | { type: 'correct'; loanId: string; purpose: string; due: string; reason: string }
  | { type: 'membership'; id: string; role: Profile['role']; status: 'active' | 'pending' | 'suspended'; reason: string }
  | { type: 'add-profile'; name: string; role: Profile['role']; title?: string; department: string; status?: 'active' | 'pending' | 'suspended' }
  | { type: 'update-profile'; id: string; name?: string; role?: Profile['role']; title?: string; department?: string; status?: 'active' | 'pending' | 'suspended'; reason?: string }
  | { type: 'delete-profile'; id: string; reason?: string }
export const displayEvent = (text:string)=>text.replace('Checked out equipment','Released equipment').replace('Closed loan','Recorded return')
export function formatEventDetails(
  e: State['events'][number],
  state: State,
): string {
  const item = state.items.find((i) => i.id === e.entityId)
  const itemName =
    item?.name ||
    (e.after?.name as string) ||
    (e.before?.name as string) ||
    'Equipment'
  const borrower = state.profiles.find(
    (p) =>
      p.id ===
      (e.subjectId ||
        (e.after?.borrower_id as string) ||
        (e.before?.borrower_id as string)),
  )
  const borrowerName =
    borrower?.name ||
    (e.after?.external_name as string) ||
    (e.before?.external_name as string) ||
    'member'

  const rawAction = (e.action || e.text || '').trim().toLowerCase()

  // 1. Releases / Equipment checkouts
  if (rawAction === 'releases.insert' || rawAction === 'checkout') {
    const purpose = (e.after?.purpose as string) || (e.after?.event as string)
    const purposeText = purpose ? ` for ${purpose}` : ''
    return `Released ${itemName} to ${borrowerName}${purposeText}`
  }

  // 2. Returns & Loan updates
  if (
    rawAction === 'releases.update' ||
    rawAction === 'return' ||
    rawAction === 'correct'
  ) {
    const isReturn =
      Boolean(e.after?.returned_at || e.after?.returned) ||
      (e.reason && e.reason.toLowerCase().includes('return')) ||
      (!e.before?.returned_at && Boolean(e.after?.returned_at))
    if (isReturn) {
      const condition =
        (e.after?.condition_after as string) ||
        (e.after?.after as string) ||
        (e.after?.condition as string)
      return `Recorded return for ${itemName}${condition ? ` (${condition} condition)` : ''}`
    }
    if (e.reason) {
      return `Updated loan record: ${e.reason}`
    }
    return `Updated loan details for ${itemName}`
  }

  if (rawAction === 'releases.delete') {
    return `Cancelled loan record for ${itemName}`
  }

  // 3. Equipment Updates & Registration
  if (rawAction === 'items.insert' || (rawAction === 'item' && !e.before)) {
    const tag = (e.after?.tag as string) || item?.tag
    return `Registered new equipment: ${itemName}${tag ? ` (${tag})` : ''}`
  }

  if (rawAction === 'items.update' || rawAction === 'item') {
    const beforeCond = e.before?.condition as string
    const afterCond = e.after?.condition as string
    if (beforeCond && afterCond && beforeCond !== afterCond) {
      return `Updated condition of ${itemName} (${beforeCond} → ${afterCond})`
    }
    if (e.after?.archived) {
      return `Archived equipment: ${itemName}`
    }
    return `Updated equipment details for ${itemName}`
  }

  if (rawAction === 'items.delete' || rawAction === 'archive') {
    return `Decommissioned equipment: ${itemName}${e.reason ? ` (${e.reason})` : ''}`
  }

  // 4. Incident Reports & Resolutions
  if (rawAction === 'incidents.insert' || rawAction === 'incident') {
    const kind = (e.after?.kind as string) || 'Adverse condition'
    const notes = (e.after?.notes as string) || e.reason
    return `Flagged incident report: ${kind}${notes ? ` (${notes})` : ''}`
  }

  if (rawAction === 'incidents.update' || rawAction === 'resolve') {
    const outcome = (e.after?.outcome as string) || e.reason || 'Resolved'
    return `Resolved incident review: ${outcome}`
  }

  // 5. Account Management & Memberships
  if (
    rawAction === 'memberships.update' ||
    rawAction === 'profiles.update' ||
    rawAction === 'membership'
  ) {
    const target = state.profiles.find(
      (p) => p.id === (e.subjectId || (e.after?.id as string)),
    )
    const targetName =
      target?.name || (e.after?.name as string) || 'Staff account'
    const role = (e.after?.role as string) || target?.role
    const reasonText = e.reason ? ` — ${e.reason}` : ''
    return `Updated access permissions for ${targetName}${role ? ` (${role})` : ''}${reasonText}`
  }

  if (rawAction === 'profiles.delete' || rawAction === 'delete-profile') {
    const targetName = (e.before?.name as string) || 'Staff account'
    return `Deleted account for ${targetName}${e.reason ? ` — ${e.reason}` : ''}`
  }

  // Fallback: If e.text has readable English sentences, format them nicely
  const technicalKeys = [
    'items.update',
    'items.insert',
    'items.delete',
    'releases.insert',
    'releases.update',
    'releases.delete',
    'incidents.insert',
    'incidents.update',
    'incidents.delete',
    'profiles.insert',
    'profiles.update',
    'profiles.delete',
    'memberships.update',
  ]
  if (e.text && !technicalKeys.includes(e.text.trim().toLowerCase())) {
    return displayEvent(e.text)
  }

  // Ultimate fallback formatted gracefully
  return e.action
    ? e.action
        .replace('.', ' ')
        .replace(/^[a-z]/, (c) => c.toUpperCase())
    : 'System activity recorded'
}
export const borrowerName=(s:State,l:State['loans'][number])=>l.external?.name??s.profiles.find(p=>p.id===l.borrowerId)?.name??'Not recorded'
export const visibleEvents=(s:State,p:Profile)=>s.events.filter(e=>canInventory(p)||e.actor===p.id||e.subjectId===p.id)
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
    s.events.unshift({ id: uid(), actor: actorId, actorRole:p.role, action:action.type, at: now, text, entityId })
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
    const details=releaseDetailsSchema.parse(action)
    if(details.useType !== 'external_borrowing') requireThat(s.profiles.some(p=>p.id===details.borrowerId),'Choose a member.')
    requireThat(future(action.due), 'Return deadline must be in the future.')
    requireThat(action.condition.trim(), 'Record checkout condition.')
    s.loans.unshift({
      id: uid(),
      itemId: action.itemId,
      ...details, issuedBy:actorId,
      out: now,
      due: action.due,
      before: action.condition,
      event: action.event?.trim() || undefined,
      eventCategory: action.eventCategory?.trim() || undefined,
    })
    const eventSuffix = action.event?.trim() ? ` for ${action.event.trim()}` : ''
    const categorySuffix = action.eventCategory?.trim() ? ` [${action.eventCategory.trim()}]` : ''
    const name = details.useType==='external_borrowing'?'external borrower':s.profiles.find(p=>p.id===details.borrowerId)?.name??'member'
    log(`Released equipment to ${name}${eventSuffix}${categorySuffix}`, action.itemId)
  } else if (action.type === 'return') {
    requireThat(canInventory(p), 'Only custodians and administrators record returns.')
    const l = s.loans.find((l) => l.id === action.loanId)
    requireThat(l && !l.returned, 'This usage record is already closed or does not exist.')
    l!.receivedBy = actorId
    l!.returned = now
    l!.after = action.condition
    s.items.find((i) => i.id === l!.itemId)!.condition = action.condition
    if (['Damaged', 'Missing'].includes(action.condition))
      incident(
        l!.itemId,
        action.condition as 'Damaged' | 'Missing',
        'Condition recorded when closing the loan. Review required; no responsibility presumed.',
      )
    log(`Recorded return · ${action.condition}`, l!.itemId)
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
  } else if (action.type === 'archive') {
    requireThat(canInventory(p), 'Only custodians and administrators manage equipment.')
    const i = s.items.find((x) => x.id === action.itemId)
    if (!i) throw Error('Equipment not found.')
    requireThat(!s.loans.some((l) => l.itemId === action.itemId && !l.returned), 'Cannot delete equipment currently checked out on loan.')
    i.archived = true
    s.items = s.items.filter((x) => x.id !== action.itemId)
    log(`Deleted equipment: ${i.name} (${i.tag}) - ${action.reason || 'Decommissioned'}`, i.id)
  } else if (action.type === 'add-profile') {
    requireThat(canInventory(p), 'Only custodians and administrators can add members.')
    requireThat(action.name.trim(), 'Staff member name is required.')
    requireThat(action.department.trim(), 'Department is required.')
    const newProfile: Profile = {
      id: uid(),
      name: action.name.trim(),
      role: action.role,
      title: action.title?.trim() || undefined,
      department: action.department.trim(),
      status: action.status || 'active',
    }
    s.profiles.push(newProfile)
    log(`Added staff member: ${newProfile.name} (${newProfile.title || newProfile.role})`, newProfile.id)
  } else if (action.type === 'update-profile' || action.type === 'membership') {
    requireThat(canInventory(p), 'Only custodians and administrators can update member accounts.')
    const target = s.profiles.find((x) => x.id === action.id)
    if (!target) throw Error('Staff member not found.')
    if (action.type === 'update-profile') {
      if (action.name?.trim()) target.name = action.name.trim()
      if (action.role) target.role = action.role
      if (action.title !== undefined) target.title = action.title.trim() || undefined
      if (action.department?.trim()) target.department = action.department.trim()
      if (action.status) target.status = action.status
      log(`Updated staff member details for ${target.name} (${target.title || target.role})`, target.id)
    } else {
      target.role = action.role
      target.status = action.status
      log(`Updated member role for ${target.name} to ${action.role} (${action.status})`, target.id)
    }
  } else if (action.type === 'delete-profile') {
    requireThat(canInventory(p), 'Only custodians and administrators can delete accounts.')
    if (s.profiles.find((x) => x.id === action.id)?.role === 'Administrator') {
      requireThat(p.role === 'Administrator', 'Only administrators can delete administrator accounts.')
    }
    requireThat(action.id !== actorId, 'You cannot delete your own active administrator account.')
    const target = s.profiles.find((x) => x.id === action.id)
    if (!target) throw Error('Account not found.')
    requireThat(!s.loans.some((l) => l.borrowerId === action.id && !l.returned), 'Cannot remove account with unreturned active equipment loans.')
    s.profiles = s.profiles.filter((x) => x.id !== action.id)
    log(`Deleted account for ${target.name} (${target.role}) - ${action.reason || 'Account deleted'}`, action.id)
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
export const STORAGE_KEY = 'timber-inventory-demo-v3'
export const PREVIOUS_STORAGE_KEY = 'timber-inventory-demo-v2'
export const LEGACY_STORAGE_KEY = 'timber-publication-demo-v1'
export function load(storage: Pick<Storage, 'getItem'>): { state: State; warning: string } {
  try {
    const current = storage.getItem(STORAGE_KEY)
    const raw = current ?? storage.getItem(PREVIOUS_STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return { state: seed(), warning: '' }
    const data = JSON.parse(raw)
    const migrating = current === null && [1,2].includes(data.version)
    if (migrating) {
      data.version = 3
      if (Array.isArray(data.profiles))
        data.profiles = data.profiles.map((p: Record<string, unknown>) => ({
          ...p,
          role: p.role === 'Department Editor' ? 'Staff' : p.role,
        }))
    }
    const parsed = stateSchema.safeParse(data)
    if (parsed.success) {
      const state = parsed.data
      if (state.profiles.some((p) => p.name === 'Alex Rivera' || p.name === 'Sam Reyes')) {
        state.profiles = seed().profiles
      }
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

