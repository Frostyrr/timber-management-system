import { useState } from 'react'
import { useDemo } from '../demo/context'
import { Heading } from '../components/layout'
import { Modal, Field } from '../components/ui'
import type { Profile } from '../demo/model'
export function Settings() {
 const { state,person,mode,switchPerson,reset,act,signOut }=useDemo()
 const [editing,setEditing]=useState<Profile|null>(null)
 const [resetting,setResetting]=useState(false)
 return <><Heading eyebrow="ACCOUNT & ACCESS" title="Account settings" description="Publication membership controls access to shared equipment."/>
 <section className="panel p-6 space-y-4"><h2>{person.name}</h2><p>{person.role} · {person.department || 'Department not recorded'}</p>
 {mode !== 'live' ? <><Field label="Demo persona"><select value={person.id} onChange={e=>switchPerson(e.target.value)}>{state.profiles.map(p=><option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}</select></Field><p>Persona switching demonstrates permissions; it is not authorization.</p><div className="flex items-center gap-3"><button className="secondary" onClick={()=>setResetting(true)}>Reset demo</button>{typeof window !== 'undefined' && localStorage.getItem('timber_demo_override') === 'true' && <button className="secondary" onClick={()=>{ localStorage.removeItem('timber_demo_override'); window.location.href = '/login'; }}>Return to Live Mode</button>}</div></> : <button className="secondary" onClick={()=>void signOut?.()}>Sign out</button>}
 </section>
 {mode==='live' && person.role==='Administrator' && <section className="panel p-6 mt-5"><h2 className="mb-4">Membership approvals</h2>{state.profiles.map(p=><div key={p.id} className="flex gap-4 justify-between border-b py-3"><span>{p.name} · {p.role} · {p.status}</span>{p.id!==person.id && <button className="secondary" onClick={()=>setEditing(p)}>Review access</button>}</div>)}</section>}
 {resetting && <Modal title="Reset fictional demo records?" onClose={()=>setResetting(false)} onSubmit={()=>reset()} submit="Reset demo"><p>This replaces the sample records saved in this browser. It does not affect Supabase.</p></Modal>}
 {editing && <Modal title={`Access for ${editing.name}`} onClose={()=>setEditing(null)} onSubmit={async f=>{await act({type:'membership',id:editing.id,role:String(f.get('role')) as Profile['role'],status:String(f.get('status')) as 'active'|'pending'|'suspended',reason:String(f.get('reason'))})}}><Field label="Role"><select name="role" defaultValue={editing.role}>{['Staff','Inventory Custodian','Administrator'].map(r=><option key={r}>{r}</option>)}</select></Field><Field label="Membership status"><select name="status" defaultValue={editing.status}>{['pending','active','suspended'].map(r=><option key={r}>{r}</option>)}</select></Field><Field label="Reason for access change"><textarea name="reason" required maxLength={1000}/></Field></Modal>}
 </>
}
