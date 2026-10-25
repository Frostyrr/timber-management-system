import { Heading } from '../components/layout/Heading'
import { useInventory } from '../backend/context'
export function Security() {
 const { person, state } = useInventory()
 return <><Heading eyebrow="ACCESS & ACCOUNTABILITY" title="Security information" description="Server-enforced inventory access and recorded activity."/><section className="panel p-6 space-y-4">
 <h2 className="font-semibold">Your access</h2><p>{person.name} · {person.role} · {person.status}</p>
 <p>Google sign-in establishes your identity. The database checks approved membership and permissions on every operation.</p>
 <h2 className="font-semibold">Audit history</h2><p>{state.events.length} activity records are visible within your access scope. Database triggers record changes in the same transaction. Application users cannot edit or delete audit records; the database owner can change database protections.</p>
 <h2 className="font-semibold">External borrower privacy</h2><p>Contact details are restricted to administrators and inventory custodians and excluded from audit snapshots.</p>
 <h2 className="font-semibold">Authentication settings</h2><p>Manage Google OAuth and authentication protection in the Supabase dashboard. This application does not provide threat monitoring, device scanning, or configurable rate-limit controls.</p>
 </section></>
}
