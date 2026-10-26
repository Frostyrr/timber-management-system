import { useContext } from 'react'
import { LockKeyhole } from 'lucide-react'
import { WorkspaceLockContext } from '../../backend/workspaceLock'
export function LockWorkspaceButton() {
  const lock = useContext(WorkspaceLockContext)
  if (!lock) return null
  return (
    <button
      type="button"
      className="icon-button inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary hover:bg-pale focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label="Lock workspace"
      title="Lock workspace"
      onClick={lock}
    >
      <LockKeyhole size={17} />
    </button>
  )
}
