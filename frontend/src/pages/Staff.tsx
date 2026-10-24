import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { History, Pencil, Archive } from 'lucide-react'
import { useInventory } from '../backend/context'
import { canInventory, uid, type DirectoryPerson } from '../backend/model'
import { Heading } from '../components/layout'
import { Modal, Field, Badge, Empty, Select, ActionMenu } from '../components/ui'
import { dateText } from '../components/format'

const publicationPositions = [
  'Editor-in-Chief',
  'Associate Editor',
  'Multimedia Director',
  'Head Photojournalist',
  'Head Videojournalist',
  'Head Video Editor',
  'Head Cartoonist',
  'Head Graphics Artist',
  'News Writer',
  'Column Writer',
  'Editorial Writer',
  'Feature Writer',
  'Sports Writer',
  'Literary Writer',
  'Photojournalist',
  'Videojournalist',
  'Video Editor',
  'Graphics Artist',
  'Cartoonist',
  'Staff Member',
]

export function Staff() {
  const { state, person, act, refresh } = useInventory()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<DirectoryPerson | null>(null)
  const [archiving, setArchiving] = useState<DirectoryPerson | null>(null)
  const [history, setHistory] = useState<DirectoryPerson | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  if (!canInventory(person)) return <Navigate to="/" replace />

  const people = (state.people ?? []).filter((p) =>
    `${p.name} ${p.title}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <Heading
        eyebrow="PUBLICATION PEOPLE"
        title="Staff directory"
        description="Record members responsible for equipment. Directory entries do not grant sign-in access."
      >
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
        <Field label="Search staff">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or position"
          />
        </Field>

        <div className="table-wrap mt-4">
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Position</th>
                <th>Publication uses</th>
                <th>Member borrowings</th>
                <th>Active uses</th>
                <th>Status</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const uses = state.loans.filter((l) => l.borrowerId === p.id)
                return (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.title || 'Not recorded'}</td>
                    <td>{uses.filter((l) => l.useType === 'publication_use').length}</td>
                    <td>{uses.filter((l) => l.useType === 'member_borrowing').length}</td>
                    <td>{uses.filter((l) => !l.returned).length}</td>
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
          <Empty text="No staff members match this view. Add a directory entry to record equipment use." />
        )}
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
              throw Error('Choose a publication position.')
            }
            await act({
              type: 'person-save',
              id: editing.id,
              name: String(f.get('name')),
              department: editing.department,
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
          <Field label="Position">
            <Select
              name="title"
              required
              placeholder="Select a position"
              defaultValue={
                publicationPositions.includes(editing.title)
                  ? editing.title
                  : ''
              }
              maxVisibleOptions={5}
              menuClassName="slick-scroll-green"
              options={publicationPositions.map((position) => ({
                value: position,
                label: position,
              }))}
            />
          </Field>
          {editing.title && !publicationPositions.includes(editing.title) && (
            <p className="hint">
              Previously recorded position: {editing.title}. Select a current
              position to save changes.
            </p>
          )}
          <p className="hint">
            This creates a directory entry only. No Google account is required.
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
