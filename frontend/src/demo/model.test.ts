import { describe, it, expect } from 'vitest'
import {
  seed,
  transition,
  available,
  load,
  save,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  visibleIncidents,
} from './model'
const due = () => new Date(Date.now() + 86400000).toISOString()
describe('equipment workflows', () => {
  it('prevents double checkout and repeated returns without mutating the source', () => {
    const s = seed()
    const out = transition(s, 'custodian', {
      type: 'checkout', useType:'publication_use', purpose:'Coverage',
      itemId: 'i1',
      borrowerId: 'staff',
      due: due(),
      condition: 'Good',
    })
    expect(available(s, 'i1')).toBe(true)
    expect(available(out, 'i1')).toBe(false)
    expect(() =>
      transition(out, 'admin', {
        type: 'checkout', useType:'publication_use', purpose:'Coverage',
        itemId: 'i1',
        borrowerId: 'p5',
        due: due(),
        condition: 'Good',
      }),
    ).toThrow('unavailable')
    const returned = transition(out, 'custodian', {
      type: 'return',
      loanId: out.loans[0].id,
      condition: 'Good',
    })
    expect(available(returned, 'i1')).toBe(true)
    expect(() =>
      transition(returned, 'admin', { type: 'return', loanId: out.loans[0].id, condition: 'Good' }),
    ).toThrow('already closed')
  })
  it('opens an incident on damaged return and requires an outcome', () => {
    const s = transition(seed(), 'admin', { type: 'return', loanId: 'l0', condition: 'Damaged' })
    expect(s.incidents[0].itemId).toBe('i0')
    expect(available(s, 'i0')).toBe(false)
    expect(() =>
      transition(s, 'admin', {
        type: 'resolve',
        id: s.incidents[0].id,
        outcome: ' ',
        condition: 'Good',
      }),
    ).toThrow('outcome')
    const resolved = transition(s, 'admin', {
      type: 'resolve',
      id: s.incidents[0].id,
      outcome: 'Inspected and repaired.',
      condition: 'Good',
    })
    expect(available(resolved, 'i0')).toBe(true)
  })
  it('rejects invalid dates, unauthorized changes and duplicate asset tags', () => {
    expect(() =>
      transition(seed(), 'staff', { type: 'return', loanId: 'l0', condition: 'Good' }),
    ).toThrow('Only')
    for (const d of ['invalid', '2020-01-01'])
      expect(() =>
        transition(seed(), 'admin', {
          type: 'checkout', useType:'publication_use', purpose:'Coverage',
          itemId: 'i1',
          borrowerId: 'staff',
          due: d,
          condition: 'Good',
        }),
      ).toThrow('future')
    const s = seed()
    expect(() =>
      transition(s, 'admin', { type: 'item', item: { ...s.items[1], tag: s.items[0].tag } }),
    ).toThrow('tag')
  })
})
describe('browser persistence and reset', () => {
  it('round-trips state and preserves dates; reset replaces changed records', () => {
    let raw: string | null = null
    const storage = {
      getItem: () => raw,
      setItem: (_k: string, v: string) => {
        raw = v
      },
    }
    const initial = load(storage).state
    let s = transition(initial, 'admin', { type: 'return', loanId: 'l0', condition: 'Good' })
    expect(save(storage, s)).toBe('')
    expect(load(storage).state).toEqual(s)
    s = seed()
    save(storage, s)
    expect(load(storage).state.loans[0].returned).toBeUndefined()
    expect(STORAGE_KEY).toContain('v3')
  })
  it('recovers corrupt or incompatible records and reports unavailable storage', () => {
    for (const raw of ['{bad', '{}', JSON.stringify({ ...seed(), version: 99 })]) {
      const result = load({ getItem: () => raw })
      expect(result.warning).not.toBe('')
      expect(result.state.items).toHaveLength(8)
    }
    expect(
      save(
        {
          setItem: () => {
            throw Error('quota')
          },
        },
        seed(),
      ),
    ).toContain('only for this session')
    expect(
      load({
        getItem: () => {
          throw Error('blocked')
        },
      }).warning,
    ).not.toBe('')
  })
})

describe('inventory migration and scoped incidents', () => {
  it('preserves legacy inventory data and leaves the original snapshot untouched', () => {
    const original = seed()
    original.items[0].name = 'Our camera'
    original.loans[0].returned = new Date().toISOString()
    const legacy = {
      ...original,
      version: 1,
      profiles: original.profiles.map((p) => ({
        ...p,
        role: p.id === 'editor' ? 'Department Editor' : p.role,
      })),
      assignments: [{ id: 'old-task' }],
      submissions: [],
      merits: [],
      departments: ['Editorial'],
      events: [
        ...original.events,
        {
          id: 'task-event',
          actor: 'admin',
          at: new Date().toISOString(),
          entityId: 'old-task',
          text: 'Old task',
        },
      ],
    }
    const storageData: Record<string, string> = { [LEGACY_STORAGE_KEY]: JSON.stringify(legacy) }
    const storage = {
      getItem: (key: string) => storageData[key] ?? null,
      setItem: (key: string, value: string) => {
        storageData[key] = value
      },
    }
    const migrated = load(storage)
    expect(migrated.warning).toContain('carried into')
    expect(migrated.state.items).toEqual(original.items)
    expect(migrated.state.loans).toEqual(original.loans)
    expect(migrated.state.incidents).toEqual(original.incidents)
    expect(migrated.state.profiles.find((p) => p.id === 'editor')?.role).toBe('Staff')
    expect(migrated.state).not.toHaveProperty('assignments')
    expect(migrated.state).not.toHaveProperty('merits')
    expect(migrated.state.events).not.toContainEqual(
      expect.objectContaining({ entityId: 'old-task' }),
    )
    save(storage, migrated.state)
    expect(JSON.parse(storageData[LEGACY_STORAGE_KEY])).toEqual(legacy)
    expect(load(storage).state).toEqual(migrated.state)
    save(storage, seed())
    expect(load(storage).state.items[0].name).toBe('Canon EOS 80D')
  })
  it('does not expose a later incident to an unrelated former borrower', () => {
    const s = seed(new Date('2026-10-20T12:00:00Z'))
    s.loans[0].returned = '2026-10-20T12:00:00Z'
    s.incidents.push({
      id: 'new',
      itemId: 'i0',
      kind: 'Missing',
      notes: 'Later report',
      reporter: 'custodian',
      at: '2026-10-22T12:00:00Z',
    })
    expect(
      visibleIncidents(
        s,
        s.profiles.find((p) => p.id === 'staff')!,
      ),
    ).toHaveLength(0)
    expect(
      visibleIncidents(
        s,
        s.profiles.find((p) => p.id === 'admin')!,
      ),
    ).toHaveLength(2)
  })
  it('blocks checkout while another incident or loan remains open', () => {
    let s = seed()
    s = transition(s, 'admin', {
      type: 'incident',
      itemId: 'i1',
      kind: 'Damaged',
      notes: 'Inspection needed',
    })
    const first = s.incidents[0].id
    s = transition(s, 'admin', {
      type: 'incident',
      itemId: 'i1',
      kind: 'Damaged',
      notes: 'Second inspection',
    })
    s = transition(s, 'admin', {
      type: 'resolve',
      id: first,
      outcome: 'First resolved',
      condition: 'Good',
    })
    expect(available(s, 'i1')).toBe(false)
  })
})
