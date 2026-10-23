import { Heading } from '../components/layout'
import { useDemo } from '../demo/context'
export function Security() {
 const {mode}=useDemo()
 return <><Heading eyebrow="ACCESS & ACCOUNTABILITY" title="Security information" description="What the inventory system enforces and where its protection ends."/><section className="panel p-6 space-y-4">
 {mode==='live' ? <><h2>Server-enforced access</h2><p>Supabase authenticates accounts. Approved membership and role checks run inside every inventory operation. Staff receive only their own usage and relevant incident history.</p><h2>Append-only application audit history</h2><p>Database triggers record changes in the same transaction. Application users, including administrators, cannot edit or delete those records. A database owner can change database protections; this is not immutable storage against the project owner.</p><p>External borrower contact details are restricted to custodians and administrators and excluded from audit snapshots.</p></> : <><h2>Demo mode</h2><p>Sample records and histories are stored in this browser and can be edited or reset. Persona switching is not authentication. Demo logs are not tamper-resistant.</p></>}
 <h2>Equipment care</h2><p>Incident reports document damage or missing equipment without presuming theft or responsibility. Device wiping, malware scanning, and two-factor authentication enforcement are not implemented by this application.</p></section></>
}
