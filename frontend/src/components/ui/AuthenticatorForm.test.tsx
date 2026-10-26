// @vitest-environment jsdom
import { afterEach, beforeEach, it, expect, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthenticatorForm, maskEmail } from './AuthenticatorForm'
const api = vi.hoisted(() => ({
  rpc: vi.fn(),
  listFactors: vi.fn(),
  enroll: vi.fn(),
  challengeAndVerify: vi.fn(),
  unenroll: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
}))
vi.mock('../../backend/client', () => ({
  client: { rpc: api.rpc, auth: { mfa: api, signOut: api.signOut, getUser: api.getUser } },
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
  api.getUser.mockResolvedValue({ data: { user: null }, error: null })
})

it('masks email addresses according to m***@domain specification', () => {
  expect(maskEmail('marcelson.rebato@gmail.com')).toBe('m***@gmail.com')
  expect(maskEmail('admin@timber.org')).toBe('a***@timber.org')
  expect(maskEmail('x@test.com')).toBe('x***@test.com')
  expect(maskEmail('')).toBe('')
  expect(maskEmail(null)).toBe('')
  expect(maskEmail(undefined)).toBe('')
})

it('renders user Google profile picture and subtly masked email without redundant name text', async () => {
  render(
    <AuthenticatorForm
      operatorName="Marc Rebato"
      operatorAvatarUrl="https://lh3.googleusercontent.com/a/google-avatar-123"
      operatorEmail="marcelson.rebato@gmail.com"
      onVerified={() => {}}
    />
  )

  await screen.findByLabelText('Authenticator code')

  // Avatar image is rendered with secure attributes
  const avatarImg = screen.getByRole('img', { name: /account avatar for marc rebato/i }) as HTMLImageElement
  expect(avatarImg).toBeTruthy()
  expect(avatarImg.src).toBe('https://lh3.googleusercontent.com/a/google-avatar-123')

  // Masked email is displayed subtly
  expect(screen.getByText('m***@gmail.com')).toBeTruthy()

  // Full name is preserved in accessibility attributes but NOT rendered as a redundant visible text element
  const maskedEmailElem = screen.getByText('m***@gmail.com')
  expect(maskedEmailElem.getAttribute('aria-label')).toBe('Verifying account for Marc Rebato')
  expect(maskedEmailElem.getAttribute('title')).toBe('Marc Rebato (marcelson.rebato@gmail.com)')

  // Ensure full name is not displayed as standalone text
  expect(screen.queryByText('Marc Rebato')).toBeNull()
})

it('renders fallback initials when profile picture is unavailable', async () => {
  render(
    <AuthenticatorForm
      operatorName="Marc Rebato"
      operatorAvatarUrl={null}
      operatorEmail="marcelson.rebato@gmail.com"
      onVerified={() => {}}
    />
  )

  await screen.findByLabelText('Authenticator code')
  expect(screen.queryByRole('img', { name: /account avatar for marc rebato/i })).toBeNull()
  expect(screen.getByText('MR')).toBeTruthy()
  expect(screen.getByText('m***@gmail.com')).toBeTruthy()
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
it('shows QR and manual key for initial setup and copies to clipboard', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
  api.listFactors.mockResolvedValue({ data: { totp: [], all: [] }, error: null })
  api.enroll.mockResolvedValue({
    data: { id: 'new', totp: { qr_code: 'data:image/svg+xml,test', secret: 'SETUPKEY' } },
    error: null,
  })
  render(<AuthenticatorForm onVerified={() => {}} />)
  expect(await screen.findByAltText('Authenticator setup QR code')).toBeTruthy()
  expect(screen.getByText('SETUPKEY')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Copy key' }))
  expect(writeText).toHaveBeenCalledWith('SETUPKEY')
  expect(await screen.findByText('Copied!')).toBeTruthy()
})
it('auto-submits verification upon typing the 6th digit', async () => {
  const done = vi.fn()
  render(<AuthenticatorForm onVerified={done} />)
  await screen.findByLabelText('Authenticator code')
  fireEvent.change(screen.getByLabelText('Authenticator code'), { target: { value: '654321' } })
  await waitFor(() => expect(done).toHaveBeenCalledOnce())
  expect(api.challengeAndVerify).toHaveBeenCalledWith({ factorId: 'factor', code: '654321' })
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
