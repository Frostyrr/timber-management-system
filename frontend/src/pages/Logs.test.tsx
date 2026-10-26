// @vitest-environment jsdom
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Logs } from './Logs'
import { InventoryContext } from '../backend/context'
import { seed } from '../demo/model'

beforeEach(() => {
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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('renders actor filter, action details filter, and target equipment filter', () => {
  const state = seed()
  render(
    <MemoryRouter>
      <InventoryContext.Provider
        value={{ state, person: state.profiles[0], act: () => {}, warning: '', notice: '' }}
      >
        <Logs />
      </InventoryContext.Provider>
    </MemoryRouter>
  )

  expect(screen.getByRole('combobox', { name: 'Filter by actor' })).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Filter by action details' })).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Filter by target equipment' })).toBeTruthy()
})

it('filters logs by actor, action details, and target equipment', () => {
  const initial = seed()
  const state = {
    ...initial,
    items: [
      {
        id: 'cam-1',
        name: 'Sony FX3',
        category: 'Camera',
        tag: 'CAM-01',
        location: 'Locker 1',
        condition: 'Good' as const,
      },
      {
        id: 'mic-1',
        name: 'Sennheiser Wireless',
        category: 'Audio',
        tag: 'AUD-01',
        location: 'Locker 2',
        condition: 'Good' as const,
      },
    ],
    events: [
      {
        id: 'ev-1',
        actor: 'user-alice',
        actorName: 'Alice Johnson',
        actorRole: 'Administrator',
        at: '2026-10-01T10:00:00Z',
        text: 'Checked out equipment',
        action: 'checkout',
        entityId: 'cam-1',
      },
      {
        id: 'ev-2',
        actor: 'user-bob',
        actorName: 'Bob Smith',
        actorRole: 'Inventory Custodian',
        at: '2026-10-02T11:00:00Z',
        text: 'Closed loan for Sennheiser Wireless',
        action: 'return',
        entityId: 'mic-1',
      },
      {
        id: 'ev-3',
        actor: 'user-alice',
        actorName: 'Alice Johnson',
        actorRole: 'Administrator',
        at: '2026-10-03T12:00:00Z',
        text: 'Reported incident for Sony FX3',
        action: 'incident',
        entityId: 'cam-1',
      },
    ],
  }

  render(
    <MemoryRouter>
      <InventoryContext.Provider
        value={{ state, person: state.profiles[0], act: () => {}, warning: '', notice: '' }}
      >
        <Logs />
      </InventoryContext.Provider>
    </MemoryRouter>
  )

  // Initial: all 3 events are present
  expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0)

  // 1. Filter by Actor: Bob Smith
  fireEvent.click(screen.getByRole('combobox', { name: 'Filter by actor' }))
  fireEvent.click(screen.getByRole('option', { name: 'Bob Smith' }))
  expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0)
  expect(screen.queryByText('Alice Johnson')).toBeNull()

  // Reset filters
  fireEvent.click(screen.getByRole('button', { name: /reset all filters/i }))
  expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0)

  // 2. Filter by Action Details: Equipment releases
  fireEvent.click(screen.getByRole('combobox', { name: 'Filter by action details' }))
  fireEvent.click(screen.getByRole('option', { name: 'Equipment releases' }))
  expect(screen.queryByText('Bob Smith')).toBeNull()

  // Reset filters
  fireEvent.click(screen.getByRole('button', { name: /reset all filters/i }))

  // 3. Filter by Target Equipment: Sennheiser Wireless (AUD-01)
  fireEvent.click(screen.getByRole('combobox', { name: 'Filter by target equipment' }))
  fireEvent.click(screen.getByRole('option', { name: /Sennheiser Wireless/ }))
  expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0)
  expect(screen.queryByText('Alice Johnson')).toBeNull()
})
