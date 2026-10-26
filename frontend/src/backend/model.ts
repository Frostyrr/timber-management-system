import { externalSchema, type ReleaseDetails } from '../demo/release'
import { z } from 'zod'
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['Administrator', 'Inventory Custodian', 'Staff']),
  department: z.string(),
  status: z.enum(['pending','active','suspended']).optional(),
  title: z.string().optional(),
  email: z.string().optional(),
  avatar_url: z.string().nullable().optional(),
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
  archiveReason: z.string().optional(),
  archive_reason: z.string().nullable().optional(),
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
  actorName: z.string().optional(),
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
export const directorySchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string(),
  title: z.string(),
  archived: z.boolean(),
  archiveReason: z.string().optional(),
  archive_reason: z.string().nullable().optional(),
})
export type DirectoryPerson = z.infer<typeof directorySchema>
export const stateSchema = z.object({
  version: z.literal(3),
  profiles: z.array(profileSchema).min(1),
  people: z.array(directorySchema).optional(),
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
export const canInventory = (p: Profile) =>
  ['Administrator', 'Inventory Custodian'].includes(p.role)
export const available = (s: State, id: string) =>
  !s.items.find(i=>i.id===id)?.archived && !s.items.find(i=>i.id===id)?.unavailable && !s.loans.some((l) => l.itemId === id && !l.returned) &&
  !s.incidents.some((i) => i.itemId === id && !i.resolved) &&
  ['Good', 'Fair'].includes(s.items.find((i) => i.id === id)?.condition ?? '')
export type Action =
  | { type:'person-save'; id:string; name:string; department:string; title:string }
  | { type:'person-archive'; id:string; reason:string }
  | { type:'person-unarchive'; id:string; reason?:string }
  | { type: 'item'; item: Item }
  | ({ type:'checkout';itemId:string;due:string;condition:string;event?:string;eventCategory?:string } & ReleaseDetails)
  | { type: 'return'; loanId: string; condition: Item['condition'] }
  | { type: 'incident'; itemId: string; kind: 'Damaged' | 'Missing'; notes: string }
  | { type: 'resolve'; id: string; outcome: string; condition: Item['condition'] }
  | { type: 'archive'; itemId: string; reason: string }
  | { type: 'unarchive'; itemId: string; reason?: string }
  | { type: 'archive-note'; targetType: 'equipment' | 'staff'; id: string; reason: string }
  | { type: 'purge-archive'; targetType: 'equipment' | 'staff'; id: string; reason?: string }
  | { type: 'purge-all-archives'; targetType?: 'equipment' | 'staff' | 'all'; reason?: string }
  | { type: 'correct'; loanId: string; purpose: string; due: string; reason: string }
  | { type: 'membership'; id: string; role: Profile['role']; status: 'active' | 'pending' | 'suspended'; reason: string }
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
  const borrower = state.people?.find(
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

  // Staff Directory Changes (Human-readable descriptions, never leak technical keys)
  if (rawAction.startsWith('people.') || rawAction === 'person-save' || rawAction === 'person-archive' || rawAction === 'person-unarchive') {
    const personObj = state.people?.find((p) => p.id === e.entityId || p.id === e.subjectId)
    const rawName = (e.after?.name as string) || (e.before?.name as string) || personObj?.name
    const name = rawName && rawName !== 'Directory member' && rawName !== 'undefined' ? rawName : ''
    const nameSuffix = name ? `: ${name}` : ''
    const position = (e.after?.title as string) || personObj?.title
    const positionSuffix = position ? ` (${position})` : ''

    if (rawAction === 'people.insert' || (rawAction === 'person-save' && !e.before)) {
      return `Added directory member${nameSuffix}${positionSuffix}`
    }
    if (e.after?.archived || rawAction === 'people.delete' || rawAction === 'person-archive') {
      return `Archived directory member${nameSuffix}`
    }
    if (rawAction === 'person-unarchive') {
      return `Restored directory member from archives${nameSuffix}`
    }
    return `Updated directory member${nameSuffix}${positionSuffix}`
  }

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

  if (rawAction === 'unarchive') {
    return `Restored equipment from archives: ${itemName}`
  }

  if (rawAction === 'archive-note') {
    return `Updated archive disposition memo: ${e.reason || itemName}`
  }

  if (rawAction === 'purge-archive' || rawAction === 'purge-all-archives') {
    return `Purged archived record from system: ${itemName}`
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
    'people.insert',
    'people.update',
    'people.delete',
  ]
  if (e.text && !technicalKeys.includes(e.text.trim().toLowerCase()) && !e.text.includes('.')) {
    return displayEvent(e.text)
  }

  // Safe fallback for technical dot-syntax action keys (never show technical specifics like people.insert)
  if (rawAction.includes('.')) {
    const [domain, op] = rawAction.split('.')
    const domainMap: Record<string, string> = {
      people: 'Staff directory',
      items: 'Equipment',
      releases: 'Equipment loan',
      incidents: 'Incident review',
      profiles: 'System access',
      memberships: 'Permissions',
    }
    const opMap: Record<string, string> = {
      insert: 'registered',
      update: 'updated',
      delete: 'archived',
    }
    const cleanDomain = domainMap[domain] || domain
    const cleanOp = opMap[op] || op
    return `${cleanDomain} ${cleanOp}`
  }

  // Ultimate fallback formatted gracefully
  return e.action
    ? e.action
        .replace('.', ' ')
        .replace(/^[a-z]/, (c) => c.toUpperCase())
    : 'System activity recorded'
}
export const borrowerName=(s:State,l:State['loans'][number])=>l.external?.name??s.people?.find(p=>p.id===l.borrowerId)?.name??'Not recorded'
export const visibleEvents=(s:State,p:Profile)=>s.events.filter(e=>canInventory(p)||e.actor===p.id||e.subjectId===p.id)
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

export const auditActorName = (e: State['events'][number], s: State) => e.actorName ?? s.profiles.find(p=>p.id===e.actor)?.name ?? (e.actor === 'system' ? 'System' : 'Unknown operator')
export const equipmentStatus = (s: State, i: Item) => i.archived ? 'Archived' : s.loans.some(l=>l.itemId===i.id&&!l.returned) ? (s.loans.some(l=>l.itemId===i.id&&!l.returned&&isOverdue(l.due)) ? 'Overdue' : 'In use') : s.incidents.some(n=>n.itemId===i.id&&!n.resolved) ? 'Under review' : available(s,i.id) ? 'Available' : 'Unavailable'
