// @vitest-environment jsdom
import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SecurityThreats } from './SecurityThreats'
import { SecuritySessions } from './SecuritySessions'
import { SecurityPolicies } from './SecurityPolicies'
import { InventoryContext } from '../../backend/context'
import { seed } from '../../demo/model'
import { getInitialSecurityState, saveSecurityState } from '../../backend/security'

beforeEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  saveSecurityState(getInitialSecurityState())

  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }),
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open')
    }),
  })
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 200,
    height: 40,
    top: 0,
    bottom: 40,
    left: 0,
    right: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
})

it('SecurityThreats: displays posture score and allows resolving an active threat', async () => {
  render(
    <MemoryRouter>
      <SecurityThreats />
    </MemoryRouter>,
  )

  expect(screen.getByText('Security Posture')).toBeTruthy()
  expect(screen.getByText('Active Threats')).toBeTruthy()
  expect(screen.getByText('Impossible Geolocation Travel Detected')).toBeTruthy()

  const resolveButtons = screen.getAllByRole('button', { name: 'Resolve Alert' })
  fireEvent.click(resolveButtons[0])

  expect(screen.getByRole('dialog')).toBeTruthy()
  const noteInput = screen.getByPlaceholderText(/Verified with staff member/i)
  fireEvent.change(noteInput, { target: { value: 'Verified legitimate international travel' } })

  const confirmBtn = screen.getByRole('button', { name: 'Confirm resolution' })
  fireEvent.submit(confirmBtn.closest('form')!)

  expect(await screen.findByText(/Verified legitimate international travel/)).toBeTruthy()
})

it('SecuritySessions: switches between tabs and tracks login history & failed attempts', () => {
  render(
    <MemoryRouter initialEntries={['/security/sessions']}>
      <SecuritySessions />
    </MemoryRouter>,
  )

  expect(screen.getByText('Current Device (This Browser Session)')).toBeTruthy()
  expect(screen.getByRole('button', { name: /Active Sessions/i })).toBeTruthy()

  // Switch to Login History tab
  fireEvent.click(screen.getByRole('button', { name: /Login History & Failures/i }))
  expect(screen.getByText('unknown.intruder@gmail.com')).toBeTruthy()

  // Filter to Failed logins
  fireEvent.click(screen.getByRole('button', { name: /Failed \(/i }))
  expect(screen.getAllByText('Unauthorized Email Domain').length).toBeGreaterThan(0)

  // Switch to New Devices tab
  fireEvent.click(screen.getByRole('button', { name: /New Devices/i }))
  expect(screen.getAllByText('New Device').length).toBeGreaterThan(0)
})

it('SecuritySessions: identifies current browser session and terminates active remote sessions', () => {
  render(
    <MemoryRouter initialEntries={['/security/sessions']}>
      <SecuritySessions />
    </MemoryRouter>,
  )

  const revokeButtons = screen.getAllByRole('button', { name: 'Revoke Session' })
  expect(revokeButtons.length).toBeGreaterThan(0)

  fireEvent.click(revokeButtons[0])
  expect(screen.getByRole('heading', { name: 'Revoke active bearer token?' })).toBeTruthy()

  const terminateBtn = screen.getByRole('button', { name: 'Terminate session' })
  fireEvent.submit(terminateBtn.closest('form')!)

  expect(screen.getAllByText('Revoked').length).toBeGreaterThan(0)
})

it('SecurityPolicies: manages allowed domains and authorized email allowlist', async () => {
  const initial = seed()
  render(
    <MemoryRouter initialEntries={['/security/policies']}>
      <InventoryContext.Provider
        value={{ state: initial, person: initial.profiles[0], act: vi.fn(), warning: '', notice: '' }}
      >
        <SecurityPolicies />
      </InventoryContext.Provider>
    </MemoryRouter>,
  )

  expect(screen.getByText('Strict Institutional Domain Enforcement')).toBeTruthy()
  expect(screen.getByText('@thetimberland.pub')).toBeTruthy()

  // Add new domain
  const domainInput = screen.getByPlaceholderText(/publication\.university\.edu/i)
  fireEvent.change(domainInput, { target: { value: 'journalism.edu' } })
  fireEvent.click(screen.getByRole('button', { name: /Add Domain/i }))
  expect(screen.getByText('@journalism.edu')).toBeTruthy()

  // Authorize individual email
  fireEvent.click(screen.getByRole('button', { name: /Authorize Email/i }))
  expect(screen.getByRole('heading', { name: 'Authorize Individual Email' })).toBeTruthy()

  const emailInput = screen.getByPlaceholderText(/adviser\.external@gmail\.com/i)
  const noteInput = screen.getByPlaceholderText(/External Photography Mentor/i)
  fireEvent.change(emailInput, { target: { value: 'guest.speaker@gmail.com' } })
  fireEvent.change(noteInput, { target: { value: 'Keynote Lecturer for Campus Press Fest' } })

  fireEvent.submit(screen.getByRole('button', { name: 'Grant authorization' }).closest('form')!)
  expect(await screen.findByText('guest.speaker@gmail.com')).toBeTruthy()
  expect(screen.getByText('Keynote Lecturer for Campus Press Fest')).toBeTruthy()
})

it('SecurityPolicies: locks down an account via Suspensions tab and allows reinstatement', async () => {
  const initial = seed()
  const act = vi.fn().mockResolvedValue(undefined)

  render(
    <MemoryRouter initialEntries={['/security/policies?tab=suspensions']}>
      <InventoryContext.Provider
        value={{ state: initial, person: initial.profiles[0], act, warning: '', notice: '' }}
      >
        <SecurityPolicies />
      </InventoryContext.Provider>
    </MemoryRouter>,
  )

  // Switch to Suspensions tab if not already on it
  fireEvent.click(screen.getByRole('button', { name: /Account Suspensions & Killswitch/i }))

  expect(screen.getByRole('button', { name: /Suspended \(/i })).toBeTruthy()

  // Find an enabled user to suspend (non-self)
  const suspendButtons = screen.getAllByRole('button', { name: 'Suspend Account' })
  const enabledBtn = suspendButtons.find((btn) => !btn.hasAttribute('disabled'))!
  fireEvent.click(enabledBtn)

  expect(screen.getByRole('heading', { name: /Emergency Suspension:/i })).toBeTruthy()

  const reasonInput = screen.getByPlaceholderText(/Unusual login location detected/i)
  fireEvent.change(reasonInput, { target: { value: 'Credential leak suspected; quarantined by admin.' } })

  const confirmSuspendBtn = screen.getByRole('button', { name: 'Quarantine & lock account' })
  fireEvent.submit(confirmSuspendBtn.closest('form')!)

  expect(await screen.findByText('Credential leak suspected; quarantined by admin.')).toBeTruthy()
  const reactivateBtn = screen.getByRole('button', { name: 'Reactivate' })
  expect(reactivateBtn).toBeTruthy()

  // Reactivate user
  fireEvent.click(reactivateBtn)
  expect(screen.getByRole('heading', { name: /Reactivate Account:/i })).toBeTruthy()
  fireEvent.submit(screen.getByRole('button', { name: 'Reactivate account' }).closest('form')!)

  expect(screen.getAllByText('Good standing · No active security holds').length).toBeGreaterThan(0)
})
