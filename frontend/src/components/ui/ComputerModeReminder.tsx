import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, X } from 'lucide-react'

export function ComputerModeReminder({ onDismiss }: { onDismiss: () => void }) {
  return <aside aria-labelledby="computer-reminder-title" className="fixed bottom-4 left-4 right-4 z-[90000] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl border border-emerald-700 bg-[#153f32] p-5 text-white shadow-2xl sm:left-auto sm:w-[400px] sm:p-6">
    <button type="button" aria-label="Dismiss computer settings reminder" onClick={onDismiss} className="absolute right-2 top-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"><X size={18} /></button>
    <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-100"><ShieldCheck size={20} aria-hidden="true" />Your workspace, your timing</div>
    <div role="status"><h2 id="computer-reminder-title" className="pr-3 text-xl font-semibold">Choose when your workspace locks</h2>
      <p className="mt-3 text-sm leading-relaxed text-emerald-50">Using the publication PC? Keep Shared computer on for a 5-minute inactivity lock. On your own trusted device, choose 30 minutes instead.</p></div>
    <p className="mt-3 text-sm leading-relaxed text-emerald-50">You’ll find these options in <strong>Account settings → Workspace security</strong>.</p>
    <Link to="/settings#workspace-security" onClick={onDismiss} className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#153f32] transition-colors hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">Open account settings<ArrowRight size={16} aria-hidden="true" /></Link>
    <button type="button" onClick={onDismiss} className="mt-2 min-h-11 w-full cursor-pointer rounded-xl text-sm text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white">Got it</button>
  </aside>
}
