import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useInventory } from '../backend/context'
import { canInventory, borrowerName } from '../backend/model'
import { staffCategory } from '../backend/staffCategories'
import { Heading } from '../components/layout/Heading'
import { Empty } from '../components/ui/Empty'
import { Field } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Pagination } from '../components/ui/Pagination'
import { dateText } from '../components/format'

export function Archives() {
  const { state, person } = useInventory()
  const [tab, setTab] = useState<'equipment' | 'staff'>('equipment')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState<{ id: string; name: string } | null>(null)
  if (!canInventory(person)) return <Navigate to="/" replace />
  const records = tab === 'equipment'
    ? state.items.filter(i => i.archived).map(i => ({ id: i.id, name: i.name, detail: i.tag, category: i.category, condition: i.condition }))
    : (state.people ?? []).filter(p => p.archived).map(p => ({ id: p.id, name: p.name, detail: p.title || 'Position not recorded', category: staffCategory(p.title), condition: '' }))
  const categories = [...new Set(records.map(r => r.category))].sort()
  const filtered = records.filter(r => (!category || r.category === category) && `${r.name} ${r.detail} ${r.category}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a,b) => a.name.localeCompare(b.name))
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / 10)))
  const loans = history ? state.loans.filter(l => tab === 'equipment' ? l.itemId === history.id : l.borrowerId === history.id) : []
  const incidents = history && tab === 'equipment' ? state.incidents.filter(i => i.itemId === history.id) : []
  const events = history ? state.events.filter(e => e.entityId === history.id || e.subjectId === history.id) : []
  const changeTab = (next: typeof tab) => { setTab(next); setSearch(''); setCategory(''); setPage(1); setHistory(null) }
  return <>
    <Heading eyebrow="PRESERVED RECORDS" title="Archives" description="Archived equipment and staff remain here for reference. Their histories are preserved." />
    <section className="panel p-5">
      <div role="tablist" aria-label="Archive type" className="mb-5 flex gap-2">
        {(['equipment', 'staff'] as const).map(value => <button key={value} id={`tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls="archive-panel" tabIndex={tab === value ? 0 : -1} className={tab === value ? 'primary' : 'secondary'} onClick={() => changeTab(value)} onKeyDown={event => {
          if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) {
            event.preventDefault()
            const next = event.key === 'Home' ? 'equipment' : event.key === 'End' ? 'staff' : value === 'equipment' ? 'staff' : 'equipment'
            changeTab(next); document.getElementById(`tab-${next}`)?.focus()
          }
        }}>{value === 'equipment' ? 'Equipment' : 'Staff'}</button>)}
      </div>
      <div role="tabpanel" id="archive-panel" aria-labelledby={`tab-${tab}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Search archives"><input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder={tab === 'equipment' ? 'Name, asset tag, or category' : 'Name, position, or category'} /></Field>
          <Field label="Archive category"><select value={category} onChange={e => { setCategory(e.target.value); setPage(1) }}><option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></Field>
        </div>
        <div className="table-wrap mt-4"><table><thead><tr><th>Name</th><th>{tab === 'equipment' ? 'Asset tag' : 'Position'}</th><th>Category</th>{tab === 'equipment' && <th>Condition</th>}<th>History</th></tr></thead>
          <tbody>{filtered.slice((currentPage-1)*10,currentPage*10).map(r => <tr key={r.id}><td>{r.name}</td><td>{r.detail}</td><td>{r.category}</td>{tab === 'equipment' && <td>{r.condition}</td>}<td><button type="button" className="secondary" aria-label={`View history for ${r.name}`} onClick={() => setHistory(r)}>View history</button></td></tr>)}</tbody></table></div>
        {!filtered.length && <Empty text={records.length ? 'No archived records match these filters.' : `No archived ${tab} records.`} />}
        <Pagination page={currentPage} total={filtered.length} pageSize={10} onPageChange={setPage} label="archived records" />
      </div>
    </section>
    {history && <Modal title={`${history.name} · history`} submit="Done" onClose={() => setHistory(null)} onSubmit={() => {}}>
      <h3 className="font-semibold">Equipment releases</h3>
      {loans.map(l => <article key={l.id} className="rounded-xl border border-line p-4"><strong>{tab === 'equipment' ? borrowerName(state,l) : state.items.find(i => i.id === l.itemId)?.name ?? 'Equipment'}</strong><p>{l.useType === 'publication_use' ? 'Publication use' : l.useType === 'member_borrowing' ? 'Member borrowing' : l.useType === 'external_borrowing' ? 'External borrowing' : 'Unspecified use'} · {l.purpose || l.event || 'Purpose not recorded'}</p><p>Released {dateText(l.out)} · Due {dateText(l.due)}</p><p>{l.returned ? `Returned ${dateText(l.returned)} · ${l.after || 'Condition not recorded'}` : 'Currently in use'}</p></article>)}
      {!loans.length && <Empty text="No equipment use recorded." />}
      {tab === 'equipment' && <><h3 className="font-semibold">Incidents</h3>{incidents.map(i => <article key={i.id} className="rounded-xl border border-line p-4"><strong>{i.kind} · {dateText(i.at)}</strong><p>{i.notes}</p><p>{i.resolved ? `Resolved ${dateText(i.resolved)} · ${i.outcome || 'No outcome recorded'}` : 'Unresolved'}</p></article>)}{!incidents.length && <Empty text="No incidents recorded." />}</>}
      <h3 className="font-semibold">Recorded activity</h3>
      {events.map(e => <article key={e.id} className="rounded-xl border border-line p-4"><p>{e.text}</p><p>{dateText(e.at)} · {e.actorName || state.profiles.find(p => p.id === e.actor)?.name || 'Unknown actor'}</p>{e.reason && <p>Reason: {e.reason}</p>}</article>)}
      {!events.length && <Empty text="No activity available." />}
    </Modal>}
  </>
}
