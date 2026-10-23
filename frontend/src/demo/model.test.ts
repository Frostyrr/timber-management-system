import { describe, it, expect } from 'vitest'
import { seed, transition, available, load, save, STORAGE_KEY, visibleAssignments } from './model'
const due = () => new Date(Date.now() + 86400000).toISOString()
describe('equipment workflows', () => {
  it('prevents double checkout and repeated returns without mutating the source', () => {
    const s = seed()
    const out = transition(s, 'custodian', {
      type: 'checkout',
      itemId: 'i1',
      borrowerId: 'staff',
      due: due(),
      condition: 'Good',
    })
    expect(available(s, 'i1')).toBe(true)
    expect(available(out, 'i1')).toBe(false)
    expect(() =>
      transition(out, 'admin', {
        type: 'checkout',
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
          type: 'checkout',
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
describe('assignment and merit workflows', () => {
  it('completes the showcase with a single atomic award', () => {
    let s = seed()
    s = transition(s, 'admin', {
      type: 'assignment',
      assignment: { ...s.assignments[0], id: 'new', title: 'Showcase story', due: due() },
    })
    s = transition(s, 'staff', { type: 'start', id: 'new' })
    s = transition(s, 'staff', {
      type: 'submit',
      id: 'new',
      url: 'https://example.com/story',
      notes: 'Ready',
    })
    s = transition(s, 'editor', {
      type: 'review',
      id: 'new',
      decision: 'approve',
      feedback: 'Verified',
    })
    expect(s.assignments.find((a) => a.id === 'new')?.status).toBe('Completed')
    expect(s.merits.filter((m) => m.assignmentId === 'new')).toHaveLength(1)
    expect(s.submissions[0].reviewer).toBe('editor')
    expect(() =>
      transition(s, 'editor', { type: 'review', id: 'new', decision: 'approve', feedback: '' }),
    ).toThrow()
    expect(s.merits.filter((m) => m.assignmentId === 'new')).toHaveLength(1)
  })
  it('rejects self-verification and cross-department review', () => {
    const s = seed()
    s.assignments[3].assignee = 'editor'
    expect(() =>
      transition(s, 'editor', { type: 'review', id: 'a3', decision: 'approve', feedback: '' }),
    ).toThrow('own work')
    s.assignments[3].department = 'Visuals'
    s.assignments[3].assignee = 'p5'
    expect(() =>
      transition(s, 'editor', { type: 'review', id: 'a3', decision: 'approve', feedback: '' }),
    ).toThrow('department')
  })
  it('preserves excuse context without awarding merit', () => {
    const s = transition(seed(), 'staff', { type: 'excuse', id: 'a0', reason: 'Final exams' })
    expect(() =>
      transition(s, 'editor', { type: 'review', id: 'a0', decision: 'excuse', feedback: '' }),
    ).toThrow('reason')
    const done = transition(s, 'editor', {
      type: 'review',
      id: 'a0',
      decision: 'excuse',
      feedback: 'Exam schedule confirmed',
    })
    expect(done.assignments[0].status).toBe('Excused')
    expect(done.assignments[0].reason).toBe('Final exams')
    expect(done.merits).toHaveLength(1)
  })
  it('requires revision feedback and approves the latest resubmission', () => {
    let s = seed()
    expect(() =>
      transition(s, 'editor', { type: 'review', id: 'a3', decision: 'revise', feedback: '' }),
    ).toThrow('feedback')
    s = transition(s, 'editor', {
      type: 'review',
      id: 'a3',
      decision: 'revise',
      feedback: 'Add sources',
    })
    s = transition(s, 'staff', {
      type: 'submit',
      id: 'a3',
      url: 'https://example.com/revised',
      notes: 'Added sources',
    })
    s = transition(s, 'editor', { type: 'review', id: 'a3', decision: 'approve', feedback: '' })
    expect(s.submissions[0].approved).toBe(true)
    expect(s.merits[0].submissionId).toBe(s.submissions[0].id)
  })
  it('rejects unsafe URLs and limits staff visibility', () => {
    for (const url of ['javascript:alert(1)', 'file:///secret', 'not a url'])
      expect(() =>
        transition(seed(), 'staff', { type: 'submit', id: 'a0', url, notes: '' }),
      ).toThrow()
    const s = seed()
    expect(
      visibleAssignments(
        s,
        s.profiles.find((p) => p.id === 'staff')!,
      ).every((a) => a.assignee === 'staff'),
    ).toBe(true)
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
    expect(STORAGE_KEY).toContain('v1')
  })
  it('recovers corrupt or incompatible records and reports unavailable storage', () => {
    for (const raw of ['{bad', '{}', JSON.stringify({ ...seed(), version: 2 })]) {
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
