import { useEffect, useRef, useState } from 'react'
import { listenForMfa, type MfaRequest } from '../../backend/mfaPrompt'
import { AuthenticatorForm } from '../ui/AuthenticatorForm'
export function MfaActionHost() {
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
        className="m-auto w-[calc(100%-32px)] max-w-md rounded-2xl bg-white p-6 backdrop:bg-black/50"
        onCancel={(e) => {
          e.preventDefault()
          finish(false)
        }}
      >
        <AuthenticatorForm
          scope={request.scope}
          payload={request.payload}
          onVerified={() => finish(true)}
          onCancel={() => finish(false)}
        />
      </dialog>
    )
  )
}
