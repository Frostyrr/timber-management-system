import { useInventory } from '../backend/context'
import { Heading } from '../components/layout'
export function Settings(){
 const {person,signOut}=useInventory()
 return <><Heading eyebrow="YOUR ACCOUNT" title="My account" description="Your signed-in operator identity."/><section className="panel p-6 space-y-4"><h2 className="font-semibold">{person.name}</h2><p>{person.role}</p><p>Equipment users are managed in Staff directory. Only administrators manage login permissions in System access.</p><button className="secondary" onClick={()=>void signOut?.()}>Sign out</button></section></>
}
