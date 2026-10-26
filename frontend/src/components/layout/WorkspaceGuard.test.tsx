import { LockWorkspaceButton } from '../ui/LockWorkspaceButton'
// @vitest-environment jsdom
import { afterEach, it, expect, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, act } from '@testing-library/react'
import { WorkspaceGuard } from './WorkspaceGuard'
const api = vi.hoisted(() => ({
  workspaceAccess: vi.fn(async () => true),
  lockWorkspace: vi.fn(async () => {}),
}))
vi.mock('../../backend/client', () => api)
vi.mock('../ui/AuthenticatorForm', () => ({ AuthenticatorForm: () => <p>Verify phone code</p> }))
vi.mock('./MfaActionHost', () => ({ MfaActionHost: () => null }))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.clearAllMocks()
})
it('preserves drafts while hiding and disabling the locked workspace', async () => {
  render(
    <WorkspaceGuard onUnlocked={async () => {}}>
      <LockWorkspaceButton/><input aria-label="Draft" defaultValue="Keep this" />
    </WorkspaceGuard>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Lock workspace' }))
  expect(screen.getByText('Verify phone code')).toBeTruthy()
  expect(screen.queryByRole('textbox', { name: 'Draft' })).toBeNull()
  expect((screen.getByLabelText('Draft') as HTMLInputElement).value).toBe('Keep this')
  expect(api.lockWorkspace).toHaveBeenCalledOnce()
})
it('locks after three minutes without interaction', async () => {
  vi.useFakeTimers()
  render(
    <WorkspaceGuard onUnlocked={async () => {}}>
      <p>Private records</p>
    </WorkspaceGuard>,
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(180000)
  })
  expect(screen.getByText('Verify phone code')).toBeTruthy()
  expect(api.lockWorkspace).toHaveBeenCalled()
})
