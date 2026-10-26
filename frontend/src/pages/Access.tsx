import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useInventory } from '../backend/context'
import { type Profile } from '../backend/model'
import { Heading } from '../components/layout/Heading'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Avatar } from '../components/ui/Avatar'
export function Access(){
 const {state,person,act,refresh}=useInventory()
 const [editing,setEditing]=useState<Profile|null>(null)
 const [refreshing,setRefreshing]=useState(false)
 if(person.role!=='Administrator')return <Navigate to="/" replace/>
 return <><Heading eyebrow="SYSTEM OPERATOR ACCOUNTS" title="System access" description="Approve executives and custodians who operate the system. Staff directory members do not have sign-in access unless registered here."><button className="secondary" disabled={refreshing} onClick={async()=>{setRefreshing(true);try{await refresh?.()}finally{setRefreshing(false)}}}>{refreshing?'Refreshing…':'Refresh accounts'}</button></Heading>
 <section className="panel p-5"><p className="mb-4">New operators must sign in with Google once to appear here as pending. Editorial staff members (writers, photographers) do not require operator accounts to borrow equipment.</p><div className="table-wrap"><table><thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{state.profiles.map(p=><tr key={p.id}><td><div className="flex items-center gap-2.5 min-w-0"><Avatar name={p.name} url={p.avatar_url} /><span className="truncate font-medium text-ink">{p.name}</span></div></td><td>{p.role==='Staff'?'Unassigned / no operator access':p.role}</td><td><Badge>{p.status??'pending'}</Badge></td><td>{p.id===person.id?<span>Your account</span>:<button className="action-pill" onClick={()=>setEditing(p)}>Review access</button>}</td></tr>)}</tbody></table></div></section>
 {editing&&<Modal title={`Access for ${editing.name}`} onClose={()=>setEditing(null)} onSubmit={async f=>{await act({type:'membership',id:editing.id,role:String(f.get('role')) as Profile['role'],status:String(f.get('status')) as 'active'|'pending'|'suspended',reason:String(f.get('reason'))})}}><Field label="Operator role"><Select name="role" defaultValue={editing.role==='Administrator'?'Administrator':'Inventory Custodian'} options={["Inventory Custodian", "Administrator"]} /></Field><Field label="Access status"><Select name="status" defaultValue={editing.status??'pending'} options={[{value:"pending",label:"Pending"},{value:"active",label:"Active"},{value:"suspended",label:"Suspended"}]} /></Field><Field label="Reason for access change"><textarea name="reason" required maxLength={1000}/></Field><p>Suspension blocks access but preserves prior actions and equipment history.</p></Modal>}
 </>
}
