import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ComputerModeSettings } from '../ui/ComputerModeSettings'
import { LockWorkspaceButton } from '../ui/LockWorkspaceButton'
// @vitest-environment jsdom
import { afterEach, it, expect, vi } from 'vitest'
import { cleanup, render as renderUI, screen, fireEvent, act } from '@testing-library/react'
import { WorkspaceGuard } from './WorkspaceGuard'
const render = (ui: ReactNode) => renderUI(<MemoryRouter>{ui}</MemoryRouter>)
const api = vi.hoisted(() => ({
  computerMode: vi.fn(async (shared?: boolean) => shared ?? true),
  workspaceAccess: vi.fn(async () => true),
  lockWorkspace: vi.fn(async () => {}),
}))
vi.mock('../../backend/client', () => api)
vi.mock('../ui/AuthenticatorForm', () => ({ AuthenticatorForm: () => <p>Verify phone code</p> }))
vi.mock('./MfaActionHost', () => ({ MfaActionHost: () => null }))
afterEach(() => {
  cleanup()
  localStorage.clear()
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
it('locks after five minutes without interaction', async () => {
  vi.useFakeTimers()
  render(
    <WorkspaceGuard onUnlocked={async () => {}}>
      <ComputerModeSettings /><p>Private records</p>
    </WorkspaceGuard>,
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300000)
  })
  expect(screen.getByText('Verify phone code')).toBeTruthy()
  expect(api.lockWorkspace).toHaveBeenCalled()
})

it('personal mode allows activity beyond five minutes and locks after thirty', async () => {
  vi.useFakeTimers()
  render(<WorkspaceGuard onUnlocked={async () => {}}><ComputerModeSettings /><p>Private records</p></WorkspaceGuard>)
  await act(async () => {})
  await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'Shared computer' })) })
  expect(api.computerMode).toHaveBeenCalledWith(false)
  await act(async () => { await vi.advanceTimersByTimeAsync(300000) })
  expect(screen.queryByText('Verify phone code')).toBeNull()
  await act(async () => { await vi.advanceTimersByTimeAsync(1500000) })
  expect(screen.getByText('Verify phone code')).toBeTruthy()
})

it('keeps shared mode when the server rejects a change', async () => {
  render(<WorkspaceGuard onUnlocked={async () => {}}><ComputerModeSettings /><p>Private records</p></WorkspaceGuard>)
  await act(async () => {})
  api.computerMode.mockRejectedValueOnce(new Error('Offline'))
  await act(async () => { fireEvent.click(screen.getByRole('switch', { name: 'Shared computer' })) })
  expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true')
  expect(screen.getByRole('alert').textContent).toContain('Could not change')
})

it('keeps routine work unlocked while the operator remains active', async () => {
  vi.useFakeTimers()
  render(<WorkspaceGuard onUnlocked={async () => {}}><input aria-label="Working" /></WorkspaceGuard>)
  await act(async () => {})
  for (let minute = 0; minute < 35; minute++) {
    fireEvent.keyDown(screen.getByLabelText('Working'), { key: 'a' })
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
  }
  expect(screen.queryByText('Verify phone code')).toBeNull()
  expect(api.workspaceAccess).toHaveBeenCalledWith(true)
})

it('shows a first-use reminder and remembers dismissal', async () => {
  const view = render(<WorkspaceGuard onUnlocked={async () => {}}><p>Records</p></WorkspaceGuard>)
  await act(async () => {})
  expect(screen.getByText(/Choose when your workspace locks/)).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Open account settings' }).getAttribute('href')).toBe('/settings#workspace-security')
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
  view.unmount()
  render(<WorkspaceGuard onUnlocked={async () => {}}><p>Records</p></WorkspaceGuard>)
  await act(async () => {})
  expect(screen.queryByText(/Choose when your workspace locks/)).toBeNull()
  expect(screen.queryByRole('switch', { name: 'Shared computer' })).toBeNull()
})
