import type { State } from '../../backend/model'
import { summarizeMfaAction } from '../../backend/mfaSummary'
import { useEffect, useRef, useState } from 'react'
import { listenForMfa, type MfaRequest } from '../../backend/mfaPrompt'
import { AuthenticatorForm } from '../ui/AuthenticatorForm'
export function MfaActionHost({
  state,
  operatorName,
  operatorAvatarUrl,
  operatorEmail,
}: {
  state?: State
  operatorName?: string
  operatorAvatarUrl?: string | null
  operatorEmail?: string | null
}) {
  const [request, setRequest] = useState<MfaRequest | null>(null)
  const pending = useRef<MfaRequest | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const stop = listenForMfa((next) => {
      if (pending.current) {
        next.reject(new Error('Finish the current verification first.'))
        return
      }
      pending.current = next
      setRequest(next)
    })
    return () => {
      stop()
      pending.current?.reject(new Error('Verification cancelled.'))
      pending.current = null
    }
  }, [])
  useEffect(() => {
    if (request) dialog.current?.showModal()
  }, [request])
  const finish = (success: boolean) => {
    const current = pending.current
    pending.current = null
    setRequest(null)
    if (success) current?.resolve()
    else current?.reject(new Error('Verification cancelled.'))
  }
  return (
    request && (
      <dialog
        ref={dialog}
        aria-label="Verify sensitive action"
        className="mfa-card m-auto max-h-[90dvh] w-[calc(100vw-32px)] max-w-[440px] overflow-y-auto backdrop:bg-black/40 backdrop:backdrop-blur-sm"
        onCancel={(e) => {
          e.preventDefault()
          finish(false)
        }}
      >
        <AuthenticatorForm
          summary={summarizeMfaAction(request.payload, state)}
          scope={request.scope}
          payload={request.payload}
          operatorName={operatorName}
          operatorAvatarUrl={operatorAvatarUrl}
          operatorEmail={operatorEmail}
          onVerified={() => finish(true)}
          onCancel={() => finish(false)}
        />
      </dialog>
    )
  )
}
