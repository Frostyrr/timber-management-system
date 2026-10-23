import { z } from 'zod'
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(['Administrator', 'Department Editor', 'Inventory Custodian', 'Staff']),
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
const loanSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  borrowerId: z.string(),
  out: z.string(),
  due: z.string(),
  before: z.string(),
  returned: z.string().optional(),
  after: z.string().optional(),
})
const assignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  deliverable: z.string(),
  department: z.string(),
  assignee: z.string(),
  due: z.string(),
  hours: z.number(),
  points: z.number(),
  type: z.string(),
  status: z.enum([
    'Pending',
    'In progress',
    'Submitted',
    'Completed',
    'Excuse requested',
    'Excused',
  ]),
  reason: z.string().optional(),
  feedback: z.string().optional(),
})
const submissionSchema = z.object({
  id: z.string(),
  assignmentId: z.string(),
  url: z.string(),
  notes: z.string(),
  at: z.string(),
  reviewer: z.string().optional(),
  approved: z.boolean(),
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
const meritSchema = z.object({
  id: z.string(),
  assignmentId: z.string(),
  submissionId: z.string(),
  profileId: z.string(),
  points: z.number(),
  at: z.string(),
  reviewer: z.string(),
})
const eventSchema = z.object({
  id: z.string(),
  actor: z.string(),
  at: z.string(),
  text: z.string(),
  entityId: z.string(),
})
export const stateSchema = z.object({
  version: z.literal(1),
  profiles: z.array(profileSchema).min(8),
  departments: z.array(z.string()),
  items: z.array(itemSchema),
  loans: z.array(loanSchema),
  assignments: z.array(assignmentSchema),
  submissions: z.array(submissionSchema),
  incidents: z.array(incidentSchema),
  merits: z.array(meritSchema),
  events: z.array(eventSchema),
})
export type State = z.infer<typeof stateSchema>
export type Profile = z.infer<typeof profileSchema>
export type Item = z.infer<typeof itemSchema>
export type Assignment = z.infer<typeof assignmentSchema>
export const criteria: Record<string, number> = {
  Article: 10,
  Photography: 8,
  Layout: 12,
  Editing: 6,
  Administration: 4,
}
export const uid = () => crypto.randomUUID()
export const isOverdue = (due: string) => new Date(due).getTime() < Date.now()
export function seed(now = new Date()): State {
  const date = (days: number) => new Date(now.getTime() + days * 86400000).toISOString()
  const profiles: Profile[] = [
    { id: 'admin', name: 'Alex Rivera', role: 'Administrator', department: 'Editorial' },
    { id: 'editor', name: 'Maya Santos', role: 'Department Editor', department: 'Editorial' },
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
  const statuses: Assignment['status'][] = [
    'Pending',
    'In progress',
    'Pending',
    'Submitted',
    'Completed',
    'Excused',
  ]
  const titles = [
    'Campus voices: the new semester',
    'Student council interview',
    'Library hours fact-check',
    'Editorial: room for every voice',
    'Freshman welcome story',
    'Weekend campus coverage',
  ]
  const assignments: Assignment[] = titles.map((title, i) => ({
    id: `a${i}`,
    title,
    description: 'Bring student perspectives into a clear, carefully verified story.',
    deliverable: 'A reviewed draft with sources',
    department: 'Editorial',
    assignee: i === 2 ? 'p7' : 'staff',
    due: date(i === 2 ? -2 : i + 2),
    hours: i + 1,
    points: 10,
    type: 'Article',
    status: statuses[i],
    ...(i === 5 ? { reason: 'Approved academic examination schedule' } : {}),
  }))
  return {
    version: 1,
    profiles,
    departments: ['Editorial', 'Visuals', 'Production'],
    items,
    loans: [
      { id: 'l0', itemId: 'i0', borrowerId: 'staff', out: date(-4), due: date(-1), before: 'Good' },
      { id: 'l1', itemId: 'i2', borrowerId: 'p5', out: date(-1), due: date(2), before: 'Good' },
    ],
    assignments,
    submissions: [
      {
        id: 's3',
        assignmentId: 'a3',
        url: 'https://example.com/editorial-draft',
        notes: 'Draft ready for editorial review.',
        at: date(-1),
        approved: false,
      },
      {
        id: 's4',
        assignmentId: 'a4',
        url: 'https://example.com/welcome-story',
        notes: 'Verified welcome feature.',
        at: date(-3),
        approved: true,
        reviewer: 'editor',
      },
    ],
    merits: [
      {
        id: 'm4',
        assignmentId: 'a4',
        submissionId: 's4',
        profileId: 'staff',
        points: 10,
        at: date(-2),
        reviewer: 'editor',
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
        actor: 'editor',
        at: date(-2),
        entityId: 'a4',
        text: 'Approved Freshman welcome story · 10 merit points',
      },
    ],
  }
}
export const canInventory = (p: Profile) =>
  ['Administrator', 'Inventory Custodian'].includes(p.role)
export const canEdit = (p: Profile, department: string) =>
  p.role === 'Administrator' || (p.role === 'Department Editor' && p.department === department)
export const visibleAssignments = (s: State, p: Profile) =>
  s.assignments.filter((a) => a.assignee === p.id || canEdit(p, a.department))
export const available = (s: State, id: string) =>
  !s.loans.some((l) => l.itemId === id && !l.returned) &&
  !s.incidents.some((i) => i.itemId === id && !i.resolved) &&
  ['Good', 'Fair'].includes(s.items.find((i) => i.id === id)?.condition ?? '')
export type Action =
  | { type: 'item'; item: Item }
  | { type: 'checkout'; itemId: string; borrowerId: string; due: string; condition: string }
  | { type: 'return'; loanId: string; condition: Item['condition'] }
  | { type: 'incident'; itemId: string; kind: 'Damaged' | 'Missing'; notes: string }
  | { type: 'resolve'; id: string; outcome: string; condition: Item['condition'] }
  | { type: 'assignment'; assignment: Assignment }
  | { type: 'start'; id: string }
  | { type: 'submit'; id: string; url: string; notes: string }
  | { type: 'excuse'; id: string; reason: string }
  | { type: 'review'; id: string; decision: 'approve' | 'revise' | 'excuse'; feedback: string }
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
    })
    log('Checked out equipment', action.itemId)
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
  } else if (action.type === 'assignment') {
    const a = action.assignment
    requireThat(canEdit(p, a.department), 'You cannot assign work in this department.')
    requireThat(
      s.profiles.some((p) => p.id === a.assignee && p.department === a.department),
      'Choose a staff member in this department.',
    )
    requireThat(
      a.title.trim() && a.description.trim() && a.deliverable.trim(),
      'Complete the assignment details.',
    )
    requireThat(future(a.due), 'Assignment deadline must be in the future.')
    requireThat(
      Number.isFinite(a.hours) &&
        a.hours > 0 &&
        Number.isInteger(a.points) &&
        a.points >= 0 &&
        a.points <= 100,
      'Use positive effort and 0–100 whole points.',
    )
    requireThat(!s.assignments.some((x) => x.id === a.id), 'Assignment already exists.')
    s.assignments.unshift({ ...a, status: 'Pending' })
    log(`Created assignment: ${a.title}`, a.id)
  } else {
    const a = s.assignments.find((a) => a.id === action.id)
    requireThat(a, 'Assignment not found.')
    if (action.type === 'review') {
      requireThat(canEdit(p, a!.department), 'You cannot review this department.')
      requireThat(a!.assignee !== p.id, 'You cannot verify your own work.')
      if (action.decision === 'excuse') {
        requireThat(a!.status === 'Excuse requested', 'No excuse request is pending.')
        requireThat(action.feedback.trim(), 'Record the reason for approving the excuse.')
        a!.status = 'Excused'
      } else {
        requireThat(
          a!.status === 'Submitted',
          'This assignment is not awaiting contribution review.',
        )
        const sub = s.submissions.find((x) => x.assignmentId === a!.id && !x.approved)
        requireThat(sub, 'Submission not found.')
        if (action.decision === 'approve') {
          requireThat(!s.merits.some((m) => m.assignmentId === a!.id), 'Merit already awarded.')
          a!.status = 'Completed'
          sub!.approved = true
          sub!.reviewer = p.id
          s.merits.unshift({
            id: uid(),
            assignmentId: a!.id,
            submissionId: sub!.id,
            profileId: a!.assignee,
            points: a!.points,
            at: now,
            reviewer: p.id,
          })
        } else {
          requireThat(action.feedback.trim(), 'Add revision feedback.')
          a!.status = 'In progress'
        }
      }
      a!.feedback = action.feedback
      log(
        `${action.decision === 'approve' ? 'Approved contribution' : action.decision === 'excuse' ? 'Approved excuse' : 'Requested revision'}: ${a!.title}${action.feedback ? ` · ${action.feedback}` : ''}`,
        a!.id,
      )
    } else {
      requireThat(a!.assignee === p.id, 'Only the assignee can update this work.')
      requireThat(
        ['Pending', 'In progress'].includes(a!.status),
        'This assignment cannot be updated in its current state.',
      )
      if (action.type === 'start') {
        a!.status = 'In progress'
        log(`Started: ${a!.title}`, a!.id)
      }
      if (action.type === 'excuse') {
        requireThat(action.reason.trim(), 'Explain the excuse request.')
        a!.status = 'Excuse requested'
        a!.reason = action.reason
        log(`Requested an excuse: ${a!.title}`, a!.id)
      }
      if (action.type === 'submit') {
        let url: URL
        try {
          url = new URL(action.url)
        } catch {
          throw new Error('Enter a valid https:// or http:// output URL.')
        }
        requireThat(
          ['http:', 'https:'].includes(url.protocol),
          'Use an http:// or https:// output URL.',
        )
        s.submissions.unshift({
          id: uid(),
          assignmentId: a!.id,
          url: action.url,
          notes: action.notes,
          at: now,
          approved: false,
        })
        a!.status = 'Submitted'
        log(`Submitted: ${a!.title}`, a!.id)
      }
    }
  }
  return s
}
export const STORAGE_KEY = 'timber-publication-demo-v1'
export function load(storage: Pick<Storage, 'getItem'>): { state: State; warning: string } {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return { state: seed(), warning: '' }
    const parsed = stateSchema.safeParse(JSON.parse(raw))
    if (parsed.success) return { state: parsed.data, warning: '' }
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
