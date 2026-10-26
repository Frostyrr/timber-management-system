// @vitest-environment jsdom
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Inventory } from './Inventory'
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

it('renders location, condition, status, and usage details filters', () => {
  const state = seed()
  render(
    <MemoryRouter>
      <InventoryContext.Provider
        value={{ state, person: state.profiles[0], act: () => {}, warning: '', notice: '' }}
      >
        <Inventory />
      </InventoryContext.Provider>
    </MemoryRouter>
  )

  expect(screen.getByRole('combobox', { name: 'Filter by location' })).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Filter by condition' })).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Equipment status' })).toBeTruthy()
  expect(screen.getByRole('combobox', { name: 'Filter by usage details' })).toBeTruthy()
})

it('filters inventory items by location, condition, and usage details', () => {
  const initial = seed()
  const state = {
    ...initial,
    items: [
      {
        id: 'item-1',
        name: 'Canon Cinema Camera',
        category: 'Camera',
        tag: 'CAM-01',
        location: 'Studio Cabinet A',
        condition: 'Good' as const,
      },
      {
        id: 'item-2',
        name: 'Rode Wireless Mic',
        category: 'Audio',
        tag: 'AUD-01',
        location: 'Audio Locker B',
        condition: 'Fair' as const,
      },
      {
        id: 'item-3',
        name: 'Tripod Heavy Duty',
        category: 'Grip',
        tag: 'GRP-01',
        location: 'Studio Cabinet A',
        condition: 'Damaged' as const,
      },
    ],
    loans: [
      {
        id: 'loan-1',
        itemId: 'item-1',
        borrowerId: initial.profiles[0].id,
        useType: 'publication_use' as const,
        out: '2026-10-01',
        due: '2026-10-15',
        before: 'Good',
        purpose: 'Event coverage',
      },
    ],
  }

  render(
    <MemoryRouter>
      <InventoryContext.Provider
        value={{ state, person: state.profiles[0], act: () => {}, warning: '', notice: '' }}
      >
        <Inventory />
      </InventoryContext.Provider>
    </MemoryRouter>
  )

  // Initial: all 3 items visible
  expect(screen.getAllByText('Canon Cinema Camera').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Rode Wireless Mic').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Tripod Heavy Duty').length).toBeGreaterThan(0)

  // Filter by location: Studio Cabinet A
  fireEvent.click(screen.getByRole('combobox', { name: 'Filter by location' }))
  fireEvent.click(screen.getByRole('option', { name: 'Studio Cabinet A' }))
  expect(screen.getAllByText('Canon Cinema Camera').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Tripod Heavy Duty').length).toBeGreaterThan(0)
  expect(screen.queryByText('Rode Wireless Mic')).toBeNull()

  // Filter by condition: Damaged
  fireEvent.click(screen.getByRole('combobox', { name: 'Filter by condition' }))
  fireEvent.click(screen.getByRole('option', { name: 'Damaged' }))
  expect(screen.getAllByText('Tripod Heavy Duty').length).toBeGreaterThan(0)
  expect(screen.queryByText('Canon Cinema Camera')).toBeNull()

  // Click Reset all filters
  const resetBtn = screen.getByRole('button', { name: /reset all filters/i })
  fireEvent.click(resetBtn)
  expect(screen.getAllByText('Canon Cinema Camera').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Rode Wireless Mic').length).toBeGreaterThan(0)
  expect(screen.getAllByText('Tripod Heavy Duty').length).toBeGreaterThan(0)

  // Filter by usage details: Publication use
  fireEvent.click(screen.getByRole('combobox', { name: 'Filter by usage details' }))
  fireEvent.click(screen.getByRole('option', { name: 'Publication use' }))
  expect(screen.getAllByText('Canon Cinema Camera').length).toBeGreaterThan(0)
  expect(screen.queryByText('Rode Wireless Mic')).toBeNull()
  expect(screen.queryByText('Tripod Heavy Duty')).toBeNull()
})
