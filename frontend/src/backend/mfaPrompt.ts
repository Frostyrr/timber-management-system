type Request = {
  scope: 'inventory' | 'security'
  payload: unknown
  resolve: () => void
  reject: (error: Error) => void
}
let listener: ((request: Request) => void) | undefined
export function listenForMfa(next: (request: Request) => void) {
  listener = next
  return () => {
    listener = undefined
  }
}
export type MfaRequest = Request
export function requestMfa(scope: Request['scope'], payload: unknown) {
  return new Promise<void>((resolve, reject) => {
    if (!listener) {
      reject(new Error('Unlock the workspace before continuing.'))
      return
    }
    listener({ scope, payload, resolve, reject })
  })
}
