import { useContext } from 'react'
import { Monitor, ShieldCheck } from 'lucide-react'
import { ComputerModeContext } from '../../backend/computerMode'

export function ComputerModeSettings() {
  const mode = useContext(ComputerModeContext)
  if (!mode) return null
  return <section id="workspace-security" aria-labelledby="workspace-security-title" className="panel scroll-mt-24 p-5 sm:p-6">
    <div className="flex items-center gap-3">
      <span className="rounded-xl bg-emerald-50 p-3 text-primary"><ShieldCheck size={22} aria-hidden="true" /></span>
      <div><h2 id="workspace-security-title" className="text-lg font-semibold text-ink">Workspace security</h2>
        <p className="text-sm text-muted-ink">Choose the lock timing for this computer.</p></div>
    </div>
    <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
      <div><h3 className="flex items-center gap-2 font-semibold text-ink"><Monitor size={18} aria-hidden="true" />Shared computer</h3>
        <p id="computer-mode-help" className="mt-1 text-sm text-muted-ink">Keep this on for the publication PC or any device other people use.</p></div>
      <button type="button" role="switch" aria-checked={mode.shared} aria-label="Shared computer" aria-describedby="computer-mode-help"
        disabled={!mode.ready || mode.saving} onClick={() => void mode.change()}
        className={`flex min-h-11 min-w-20 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 ${mode.shared ? 'border-primary bg-primary text-white hover:bg-emerald-900' : 'border-line bg-white text-ink hover:bg-emerald-50'}`}>
        <span className={`h-3 w-3 rounded-full ${mode.shared ? 'bg-white' : 'bg-slate-400'}`} aria-hidden="true" />{mode.shared ? 'On' : 'Off'}
      </button>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className={`rounded-xl border p-4 ${mode.shared ? 'border-emerald-300 bg-emerald-50' : 'border-line'}`}><h3 className="font-semibold text-ink">Shared computer · 5 minutes</h3><p className="mt-1 text-sm text-muted-ink">Locks sooner when you stop interacting. Recommended for shared devices.</p></div>
      <div className={`rounded-xl border p-4 ${!mode.shared ? 'border-emerald-300 bg-emerald-50' : 'border-line'}`}><h3 className="font-semibold text-ink">Personal computer · 30 minutes</h3><p className="mt-1 text-sm text-muted-ink">Turn the switch off only on a trusted device you use yourself.</p></div>
    </div>
    <p role="status" className="mt-3 text-sm font-medium text-primary">{mode.saving ? 'Saving your preference…' : !mode.ready ? 'Computer options are not available yet.' : `${mode.shared ? 'Shared' : 'Personal'} mode is active for this sign-in session.`}</p>
    <p className="mt-2 text-xs leading-relaxed text-muted-ink">Routine work needs no repeated code while unlocked. Sensitive actions still require verification, and both modes require verification after eight hours. Always lock manually when stepping away. New sign-in sessions start in shared mode.</p>
    {mode.error && <p role="alert" className="mt-3 text-sm text-red-700">{mode.error}</p>}
  </section>
}
