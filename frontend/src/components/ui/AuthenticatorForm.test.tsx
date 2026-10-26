// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthenticatorForm } from './AuthenticatorForm'
const api = vi.hoisted(() => ({
  rpc: vi.fn(),
  listFactors: vi.fn(),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
  unenroll: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../../backend/client', () => ({
  client: { rpc: api.rpc, auth: { mfa: api, signOut: api.signOut } },
}))
afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  api.rpc.mockResolvedValue({ data: 'intent', error: null })
  api.listFactors.mockResolvedValue({
    data: { totp: [{ id: 'factor', status: 'verified' }], all: [] },
    error: null,
  })
  api.challengeAndVerify.mockResolvedValue({ error: null })
})
it('verifies an existing factor before completing server authorization', async () => {
  const done = vi.fn()
  render(<AuthenticatorForm onVerified={done} />)
  await screen.findByLabelText('Authenticator code')
  fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '123456' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Unlock workspace' }).closest('form')!)
  await waitFor(() => expect(done).toHaveBeenCalledOnce())
  expect(api.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'factor', code: '123456' })
  expect(api.rpc).toHaveBeenCalledWith('operator_complete', { intent_id: 'intent' })
  expect(api.enroll).not.toHaveBeenCalled()
})
it('shows QR and manual key for initial setup', async () => {
  api.listFactors.mockResolvedValue({ data: { totp: [], all: [] }, error: null })
  api.enroll.mockResolvedValue({
    data: { id: 'new', totp: { qr_code: 'data:image/svg+xml,test', secret: 'SETUPKEY' } },
    error: null,
  })
  render(<AuthenticatorForm onVerified={() => {}} />)
  expect(await screen.findByAltText('Authenticator setup QR code')).toBeTruthy()
  expect(screen.getByText('SETUPKEY')).toBeTruthy()
})
it('does not approve a rejected code or store it in the form', async () => {
  api.challengeAndVerify.mockResolvedValue({ error: new Error('Invalid code') })
  const done = vi.fn()
  render(<AuthenticatorForm onVerified={done} />)
  await screen.findByLabelText('Authenticator code')
  fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '111111' } })
  fireEvent.submit(screen.getByRole('button', { name: 'Unlock workspace' }).closest('form')!)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Invalid code')
  expect(done).not.toHaveBeenCalled()
  expect(api.rpc).not.toHaveBeenCalledWith('operator_complete', expect.anything())
  expect((screen.getByLabelText('Authenticator code') as HTMLInputElement).value).toBe('')
})
