import { Select } from '../components/ui/Select'
import { staffSheet, releaseSheet } from '../exports/reports'
import { ExportButton } from '../components/ui/ExportButton'
import { publicationPositions, staffCategories, staffCategory } from '../backend/staffCategories'
import { PositionCombobox } from '../components/ui/PositionCombobox'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { History, Pencil, Archive } from 'lucide-react'
import { useInventory } from '../backend/context'
import { canInventory, uid, type DirectoryPerson } from '../backend/model'
import { Heading } from '../components/layout/Heading'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { Badge } from '../components/ui/Badge'
import { Empty } from '../components/ui/Empty'
import { ActionMenu } from '../components/ui/ActionMenu'
import { Pagination } from '../components/ui/Pagination'
import { dateText } from '../components/format'



export function Staff() {
  const { state, person, act, refresh } = useInventory()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [editing, setEditing] = useState<DirectoryPerson | null>(null)
  const [archiving, setArchiving] = useState<DirectoryPerson | null>(null)
  const [history, setHistory] = useState<DirectoryPerson | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  if (!canInventory(person)) return <Navigate to="/" replace />

  const counts = new Map((state.people ?? []).map(p => [p.id, { publication: 0, borrowing: 0, active: 0 }]))
  for (const loan of state.loans) {
    const count = counts.get(loan.borrowerId ?? '')
    if (!count) continue
    if (loan.useType === 'publication_use') count.publication++
    if (loan.useType === 'member_borrowing') count.borrowing++
    if (!loan.returned) count.active++
  }
  const people = (state.people ?? []).filter(p =>
    `${p.name} ${p.title} ${staffCategory(p.title)}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (!category || staffCategory(p.title) === category) &&
    (status === 'all' || p.archived === (status === 'archived')),
  ).sort((a, b) => {
    const [metric, direction] = sort.split('-')
    if (metric === 'publication' || metric === 'borrowing' || metric === 'active') {
      const difference = (counts.get(a.id)?.[metric] ?? 0) - (counts.get(b.id)?.[metric] ?? 0)
      if (difference) return direction === 'least' ? difference : -difference
    }
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
  })

  const currentPage = Math.min(page, Math.max(1, Math.ceil(people.length / pageSize)))
  const pagePeople = people.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <>
      <Heading
        eyebrow="PUBLICATION PEOPLE"
        title="Staff directory"
        description="Record publication members, advisers, PICO staff, and external personnel. Directory entries do not grant sign-in access."
      >
        <ExportButton filename="staff" sheets={() => [staffSheet(state, people)]} />
        <button
          className="secondary"
          disabled={refreshing}
          onClick={async () => {
            setRefreshing(true)
            try {
              await refresh?.()
            } finally {
              setRefreshing(false)
            }
          }}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
        <button
          className="primary"
          onClick={() =>
            setEditing({
              id: uid(),
              name: '',
              title: '',
              department: '',
              archived: false,
            })
          }
        >
          Add staff member
        </button>
      </Heading>

      <section className="panel p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Search staff">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Name, position, or category"
          />
        </Field>

        <Field label="Staff category">
          <Select aria-label="Staff category" value={category} onChange={event => { setCategory(event.target.value); setPage(1) }}>
            <option value="">All categories</option>
            {[...Object.keys(staffCategories), 'Uncategorized'].map(name => <option key={name} value={name}>{name}</option>)}
          </Select>
        </Field>
        <Field label="Staff status">
          <Select aria-label="Staff status" value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Field label="Sort by">
          <Select aria-label="Sort by" value={sort} onChange={event => { setSort(event.target.value); setPage(1) }}>
            <option value="name">Name (A–Z)</option>
            <option value="publication-most">Most publication uses</option>
            <option value="publication-least">Least publication uses</option>
            <option value="borrowing-most">Most member borrowings</option>
            <option value="borrowing-least">Least member borrowings</option>
            <option value="active-most">Most active uses</option>
            <option value="active-least">Least active uses</option>
          </Select>
        </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-sm text-muted-ink">{people.length} matching {people.length === 1 ? 'entry' : 'entries'}</p>
          {(search || category || status !== 'all' || sort !== 'name') && <button type="button" className="secondary" onClick={() => { setSearch(''); setCategory(''); setStatus('all'); setSort('name'); setPage(1) }}>Reset filters</button>}
        </div>
        <div className="table-wrap mt-4">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Position</th>
                <th>Category</th>
                <th>Publication uses</th>
                <th>Member borrowings</th>
                <th>Active uses</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagePeople.map((p) => {
                const count = counts.get(p.id)!
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.title || 'Not recorded'}</td>
                    <td>{staffCategory(p.title)}</td>
                    <td>{count.publication}</td>
                    <td>{count.borrowing}</td>
                    <td>{count.active}</td>
                    <td>
                      <Badge>{p.archived ? 'Archived' : 'Active'}</Badge>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center">
                        <ActionMenu
                          triggerLabel={`Actions for ${p.name}`}
                          items={[
                            {
                              label: 'View equipment history',
                              icon: <History size={14} className="text-muted-ink" />,
                              onClick: () => setHistory(p),
                            },
                            !p.archived && {
                              label: 'Edit details & position',
                              icon: <Pencil size={14} className="text-muted-ink" />,
                              onClick: () => setEditing(p),
                            },
                            !p.archived && {
                              label: 'Archive staff member…',
                              icon: <Archive size={14} className="text-[#963838]" />,
                              destructive: true,
                              divider: true,
                              onClick: () => setArchiving(p),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!people.length && (
          <Empty text="No staff members match this view. Try changing or resetting the filters." />
        )}
        <Pagination page={currentPage} total={people.length} pageSize={pageSize} onPageChange={setPage} label="directory entries" />
      </section>

      {editing && (
        <Modal
          title={
            state.people?.some((p) => p.id === editing.id)
              ? 'Edit staff member'
              : 'Add staff member'
          }
          onClose={() => setEditing(null)}
          onSubmit={async (f) => {
            const title = String(f.get('title') ?? '')
            if (!publicationPositions.includes(title)) {
              throw Error('Choose a position or category.')
            }
            await act({
              type: 'person-save',
              id: editing.id,
              name: String(f.get('name')),
              department: staffCategory(title),
              title,
            })
          }}
        >
          <Field label="Full name">
            <input
              name="name"
              placeholder="e.g. Juan Dela Cruz"
              autoComplete="name"
              required
              maxLength={160}
              defaultValue={editing.name}
            />
          </Field>
          <Field label="Position / category">
            <PositionCombobox options={publicationPositions} defaultValue={publicationPositions.includes(editing.title) ? editing.title : ''} />
          </Field>
          {editing.title && !publicationPositions.includes(editing.title) && (
            <p className="hint">
              Previously recorded position: {editing.title}. Select a current
              position to save changes.
            </p>
          )}
          <p className="hint">
            This creates a directory entry only. No Google account is required. For outside borrowers, record the release as External borrowing and include the request-letter reference in its purpose.
          </p>
        </Modal>
      )}

      {archiving && (
        <Modal
          title={`Archive ${archiving.name}?`}
          onClose={() => setArchiving(null)}
          submit="Archive member"
          onSubmit={async (f) => {
            await act({
              type: 'person-archive',
              id: archiving.id,
              reason: String(f.get('reason')),
            })
          }}
        >
          <p>
            Existing usage history is retained. All outstanding equipment must be
            returned before archiving.
          </p>
          <Field label="Reason">
            <textarea name="reason" required maxLength={1000} />
          </Field>
        </Modal>
      )}

      {history && (
        <Modal
          title={`${history.name} · equipment history`}
          onClose={() => setHistory(null)}
          submit="Done"
          onSubmit={() => {}}
        >
          <ExportButton filename="staff-history" label="Export history" sheets={() => [staffSheet(state, [history]), releaseSheet(state, state.loans.filter(l => l.borrowerId === history.id))]} />
          {state.loans
            .filter((l) => l.borrowerId === history.id)
            .map((l) => (
              <article className="rounded-xl border border-line p-4" key={l.id}>
                <strong>
                  {state.items.find((i) => i.id === l.itemId)?.name ?? 'Equipment'}
                </strong>
                <p>
                  {l.useType === 'publication_use'
                    ? 'Publication use'
                    : l.useType === 'member_borrowing'
                      ? 'Member borrowing'
                      : 'Legacy / unspecified'}{' '}
                  · {l.purpose || l.event || 'Purpose not recorded'}
                </p>
                <p>
                  Released {dateText(l.out)} · Due {dateText(l.due)}
                </p>
                <p>
                  {l.returned
                    ? `Returned ${dateText(l.returned)} · ${l.after}`
                    : 'Currently in use'}
                </p>
              </article>
            ))}
          {!state.loans.some((l) => l.borrowerId === history.id) && (
            <Empty text="No equipment use recorded." />
          )}
        </Modal>
      )}
    </>
  )
}
