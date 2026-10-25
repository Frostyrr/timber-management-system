import { Select } from '../components/ui/Select'
import { equipmentSheet, staffSheet, releaseSheet, incidentSheet, activitySheet } from '../exports/reports'
import { ExportButton } from '../components/ui/ExportButton'
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useInventory } from '../backend/context'
import { canInventory, borrowerName, type Action } from '../backend/model'
import { staffCategory } from '../backend/staffCategories'
import { Heading } from '../components/layout/Heading'
import { Empty } from '../components/ui/Empty'
import { Field } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { dateText } from '../components/format'
import { Trash2, RotateCcw } from 'lucide-react'

export function Archives() {
  const { state, person, act } = useInventory()
  const [tab, setTab] = useState<'equipment' | 'staff'>('equipment')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null)
  const [restoringRecord, setRestoringRecord] = useState<{ id: string; name: string; type: 'equipment' | 'staff' } | null>(null)
  const [purgingRecord, setPurgingRecord] = useState<{ id: string; name: string; type: 'equipment' | 'staff' } | null>(null)
  const [purgeAllConfirm, setPurgeAllConfirm] = useState(false)

  if (!canInventory(person)) return <Navigate to="/" replace />

  const records = tab === 'equipment'
    ? state.items.filter(i => i.archived).map(i => ({ id: i.id, name: i.name, detail: i.tag, category: i.category, condition: i.condition }))
    : (state.people ?? []).filter(p => p.archived).map(p => ({ id: p.id, name: p.name, detail: p.title || 'Position not recorded', category: staffCategory(p.title), condition: '' }))

  const categories = [...new Set(records.map(r => r.category))].sort()
  const filtered = records
    .filter(r => (!category || r.category === category) && `${r.name} ${r.detail} ${r.category}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name))

  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)))
  const loans = history ? state.loans.filter(l => tab === 'equipment' ? l.itemId === history.id : l.borrowerId === history.id) : []
  const incidents = history && tab === 'equipment' ? state.incidents.filter(i => i.itemId === history.id) : []
  const events = history ? state.events.filter(e => e.entityId === history.id || e.subjectId === history.id) : []

  const changeTab = (next: typeof tab) => {
    setTab(next)
    setSearch('')
    setCategory('')
    setPage(1)
    setHistory(null)
  }

  const handleRestore = async () => {
    if (!restoringRecord) return
    const isEquipment = restoringRecord.type === 'equipment'
    await act(
      isEquipment
        ? { type: 'unarchive', itemId: restoringRecord.id }
        : { type: 'person-unarchive', id: restoringRecord.id },
    )
    setRestoringRecord(null)
  }

  const handlePurgeSingle = async () => {
    if (!purgingRecord) return
    await act({
      type: 'purge-archive',
      targetType: purgingRecord.type,
      id: purgingRecord.id,
    } as Action)
    setPurgingRecord(null)
  }

  const handlePurgeAll = async () => {
    await act({
      type: 'purge-all-archives',
      targetType: tab,
    } as Action)
    setPurgeAllConfirm(false)
  }

  return <>
    <Heading
      eyebrow="PRESERVED RECORDS"
      title="Archives"
      description="Archived equipment and staff remain here for reference. Their histories are preserved."
    >
      <ExportButton
        filename={`archives-${tab}`}
        sheets={() => tab === 'equipment' ? [equipmentSheet(state, filtered.flatMap(r => state.items.filter(i => i.id === r.id)))] : [staffSheet(state, filtered.flatMap(r => (state.people??[]).filter(p => p.id === r.id)))]}
      />
      <ExportButton
        filename="archives"
        label="Export all archives"
        sheets={() => [equipmentSheet(state, state.items.filter(i => i.archived)), staffSheet(state, (state.people??[]).filter(p => p.archived))]}
      />
      {records.length > 0 && (
        <button
          type="button"
          onClick={() => setPurgeAllConfirm(true)}
          className="secondary text-xs h-9 px-3 text-danger-text hover:bg-danger-bg hover:border-danger-border flex items-center gap-1.5 font-medium transition"
          title={`Permanently clean up archived ${tab} test records`}
        >
          <Trash2 size={13} />
          <span>Clean up {tab} archives</span>
        </button>
      )}
    </Heading>

    <section className="panel p-5">
      <div role="tablist" aria-label="Archive type" className="mb-5 flex gap-2">
        {(['equipment', 'staff'] as const).map(value => (
          <button
            key={value}
            id={`tab-${value}`}
            type="button"
            role="tab"
            aria-selected={tab === value}
            aria-controls="archive-panel"
            tabIndex={tab === value ? 0 : -1}
            className={tab === value ? 'primary' : 'secondary'}
            onClick={() => changeTab(value)}
            onKeyDown={event => {
              if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
                event.preventDefault()
                const next = event.key === 'Home' ? 'equipment' : event.key === 'End' ? 'staff' : value === 'equipment' ? 'staff' : 'equipment'
                changeTab(next)
                document.getElementById(`tab-${next}`)?.focus()
              }
            }}
          >
            {value === 'equipment' ? 'Equipment' : 'Staff'}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="archive-panel" aria-labelledby={`tab-${tab}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Search archives">
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder={tab === 'equipment' ? 'Name, asset tag, or category' : 'Name, position, or category'}
            />
          </Field>
          <Field label="Archive category">
            <Select
              aria-label="Archive category"
              value={category}
              onChange={e => { setCategory(e.target.value); setPage(1) }}
            >
              <option value="">All categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
        </div>

        <div className="table-wrap mt-4">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>{tab === 'equipment' ? 'Asset tag' : 'Position'}</th>
                <th>Category</th>
                {tab === 'equipment' && <th>Condition</th>}
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice((currentPage-1)*10, currentPage*10).map(r => (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.detail}</td>
                  <td>{r.category}</td>
                  {tab === 'equipment' && <td>{r.condition}</td>}
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        className="secondary text-xs px-2.5 py-1"
                        aria-label={`View history for ${r.name}`}
                        onClick={() => setHistory(r)}
                      >
                        View history
                      </button>
                      <button
                        type="button"
                        className="secondary text-xs px-2.5 py-1 text-primary hover:bg-pale hover:border-line flex items-center gap-1"
                        aria-label={`Restore ${r.name}`}
                        onClick={() => setRestoringRecord({ id: r.id, name: r.name, type: tab })}
                        title="Restore record to active inventory"
                      >
                        <RotateCcw size={11} />
                        <span>Restore</span>
                      </button>
                      <button
                        type="button"
                        className="secondary text-xs px-2 py-1 text-danger-text hover:bg-danger-bg hover:border-danger-border"
                        aria-label={`Purge ${r.name}`}
                        onClick={() => setPurgingRecord({ id: r.id, name: r.name, type: tab })}
                        title="Permanently purge mock archive record"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length && <Empty text={records.length ? 'No archived records match these filters.' : `No archived ${tab} records.`} />}
        <Pagination page={currentPage} total={filtered.length} pageSize={10} onPageChange={setPage} label="archived records" />
      </div>
    </section>

    {history && (
      <Modal title={`${history.name} · history`} submit="Done" onClose={() => setHistory(null)} onSubmit={() => {}}>
        <ExportButton filename="archive-history" label="Export history" sheets={() => [releaseSheet(state, loans), incidentSheet(state, incidents), activitySheet(state, events)]} />
        <h3 className="font-semibold">Equipment releases</h3>
        {loans.map(l => (
          <article key={l.id} className="rounded-xl border border-line p-4">
            <strong>{tab === 'equipment' ? borrowerName(state,l) : state.items.find(i => i.id === l.itemId)?.name ?? 'Equipment'}</strong>
            <p>{l.useType === 'publication_use' ? 'Publication use' : l.useType === 'member_borrowing' ? 'Member borrowing' : l.useType === 'external_borrowing' ? 'External borrowing' : 'Unspecified use'} · {l.purpose || l.event || 'Purpose not recorded'}</p>
            <p>Released {dateText(l.out)} · Due {dateText(l.due)}</p>
            <p>{l.returned ? `Returned ${dateText(l.returned)} · ${l.after || 'Condition not recorded'}` : 'Currently in use'}</p>
          </article>
        ))}
        {!loans.length && <Empty text="No equipment use recorded." />}
        {tab === 'equipment' && <>
          <h3 className="font-semibold">Incidents</h3>
          {incidents.map(i => (
            <article key={i.id} className="rounded-xl border border-line p-4">
              <strong>{i.kind} · {dateText(i.at)}</strong>
              <p>{i.notes}</p>
              <p>{i.resolved ? `Resolved ${dateText(i.resolved)} · ${i.outcome || 'No outcome recorded'}` : 'Unresolved'}</p>
            </article>
          ))}
          {!incidents.length && <Empty text="No incidents recorded." />}
        </>}
        <h3 className="font-semibold">Recorded activity</h3>
        {events.map(e => (
          <article key={e.id} className="rounded-xl border border-line p-4">
            <p>{e.text}</p>
            <p>{dateText(e.at)} · {e.actorName || state.profiles.find(p => p.id === e.actor)?.name || 'Unknown actor'}</p>
            {e.reason && <p>Reason: {e.reason}</p>}
          </article>
        ))}
        {!events.length && <Empty text="No activity available." />}
      </Modal>
    )}

    {restoringRecord && (
      <Modal
        title={`Restore ${restoringRecord.name}?`}
        submit="Restore record"
        onClose={() => setRestoringRecord(null)}
        onSubmit={handleRestore}
      >
        <p className="text-sm text-ink leading-relaxed">
          This will reinstate <strong>{restoringRecord.name}</strong> from preserved archives back into the active {restoringRecord.type === 'equipment' ? 'equipment inventory' : 'staff directory'}.
        </p>
      </Modal>
    )}

    {purgingRecord && (
      <Modal
        title={`Purge ${purgingRecord.name}?`}
        destructive
        submit="Purge record"
        onClose={() => setPurgingRecord(null)}
        onSubmit={handlePurgeSingle}
      >
        <p className="text-sm text-danger-text leading-relaxed">
          Permanently delete <strong>{purgingRecord.name}</strong>? This will purge this {purgingRecord.type} record and its testing history from the database completely. This action cannot be undone.
        </p>
      </Modal>
    )}

    {purgeAllConfirm && (
      <Modal
        title={`Clean up all ${tab} archives?`}
        destructive
        submit="Purge all archives"
        onClose={() => setPurgeAllConfirm(false)}
        onSubmit={handlePurgeAll}
      >
        <p className="text-sm text-danger-text leading-relaxed">
          Are you sure you want to clean up all archived {tab} mock records? All {records.length} archived {tab} entries will be permanently deleted from the database.
        </p>
      </Modal>
    )}
  </>
}
