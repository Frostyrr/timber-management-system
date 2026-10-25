// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Settings } from './Settings'
import { InventoryContext } from '../backend/context'
import { seed } from '../demo/model'

describe('Settings page', () => {
  beforeEach(() => {
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
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders current operator identity, email, role, and department', () => {
    const state = seed()
    const person = {
      ...state.profiles[0],
      email: 'marc.rebato@thetimberland.pub',
    }

    render(
      <MemoryRouter>
        <InventoryContext.Provider value={{ state, person, act: vi.fn(), warning: '', notice: '' }}>
          <Settings />
        </InventoryContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Account settings' })).toBeTruthy()
    expect(screen.getByText('Marc Elson Rebato')).toBeTruthy()
    expect(screen.getByText('marc.rebato@thetimberland.pub')).toBeTruthy()
    expect(screen.getAllByText('Administrator').length).toBeGreaterThan(0)
    expect(screen.getByText('Multimedia & Visuals')).toBeTruthy()
  })

  it('navigates to Devices & Sessions and displays current logged-in device', () => {
    const state = seed()
    const person = state.profiles[0]

    render(
      <MemoryRouter>
        <InventoryContext.Provider value={{ state, person, act: vi.fn(), warning: '', notice: '' }}>
          <Settings />
        </InventoryContext.Provider>
      </MemoryRouter>,
    )

    const devicesTab = screen.getByRole('tab', { name: /Devices & Sessions/i })
    fireEvent.click(devicesTab)

    expect(screen.getByText('Active Device Sessions')).toBeTruthy()
    expect(screen.getByText('Current device')).toBeTruthy()
    expect(screen.getByText('Recent Sign-in History')).toBeTruthy()
  })

  it('navigates to My Activity Logs and filters personal events', () => {
    const state = seed()
    const person = state.profiles[0] // admin
    // Add an event by this admin
    state.events = [
      {
        id: 'e-test-1',
        entityId: 'i0',
        actor: person.id,
        at: new Date().toISOString(),
        text: 'Released Canon EOS 80D',
        action: 'checkout',
      },
    ]

    render(
      <MemoryRouter>
        <InventoryContext.Provider value={{ state, person, act: vi.fn(), warning: '', notice: '' }}>
          <Settings />
        </InventoryContext.Provider>
      </MemoryRouter>,
    )

    const activityTab = screen.getByRole('tab', { name: /My Activity Logs/i })
    fireEvent.click(activityTab)

    expect(screen.getByText('Personal Audit Trail')).toBeTruthy()
    expect(screen.getByPlaceholderText(/Search actions by equipment/i)).toBeTruthy()
  })

  it('blocks account deletion when user is the sole administrator', async () => {
    const state = seed()
    // Make only 1 admin in profiles
    const person = { ...state.profiles[0], role: 'Administrator' as const }
    state.profiles = [
      person,
      { ...state.profiles[2], role: 'Inventory Custodian' as const },
    ]

    render(
      <MemoryRouter>
        <InventoryContext.Provider value={{ state, person, act: vi.fn(), warning: '', notice: '' }}>
          <Settings />
        </InventoryContext.Provider>
      </MemoryRouter>,
    )

    const dangerTab = screen.getByRole('tab', { name: /Account Security & Actions/i })
    fireEvent.click(dangerTab)

    const deleteBtn = screen.getByRole('button', { name: /Delete my operator account…/i })
    fireEvent.click(deleteBtn)

    expect(await screen.findByText('Account Deletion Blocked')).toBeTruthy()
    expect(screen.getByText(/sole active Administrator/i)).toBeTruthy()
  })

  it('requires exact confirmation phrase before deleting account when eligible', async () => {
    const state = seed()
    const act = vi.fn().mockResolvedValue(undefined)
    const signOut = vi.fn().mockResolvedValue(undefined)

    // Ensure there is another admin so deletion is allowed
    const person = {
      ...state.profiles[0],
      email: 'marc.rebato@thetimberland.pub',
    }
    // No active loans
    state.loans = []

    render(
      <MemoryRouter>
        <InventoryContext.Provider value={{ state, person, act, signOut, warning: '', notice: '' }}>
          <Settings />
        </InventoryContext.Provider>
      </MemoryRouter>,
    )

    const dangerTab = screen.getByRole('tab', { name: /Account Security & Actions/i })
    fireEvent.click(dangerTab)

    const deleteBtn = screen.getByRole('button', { name: /Delete my operator account…/i })
    fireEvent.click(deleteBtn)

    expect(await screen.findByText('Confirm Account Deactivation')).toBeTruthy()

    // Type incorrect phrase
    const input = screen.getByPlaceholderText('marc.rebato@thetimberland.pub')
    fireEvent.change(input, { target: { value: 'wrong phrase' } })

    const confirmSubmit = screen.getByRole('button', { name: /Permanently Deactivate Account/i })
    fireEvent.submit(confirmSubmit.closest('form')!)

    expect(await screen.findByText(/Please type "marc.rebato@thetimberland.pub" exactly/i)).toBeTruthy()
    expect(act).not.toHaveBeenCalled()

    // Type exact phrase
    fireEvent.change(input, { target: { value: 'marc.rebato@thetimberland.pub' } })
    fireEvent.submit(confirmSubmit.closest('form')!)

    await waitFor(() => {
      expect(act).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'delete-profile',
          id: person.id,
        }),
      )
      expect(signOut).toHaveBeenCalled()
    })
  })
})
