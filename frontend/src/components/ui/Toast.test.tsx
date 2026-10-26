// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import { Toast } from './Toast'
import { ToastContainer } from './ToastContainer'
import type { ToastItem } from '../../types/notification'
import { getActionToastDetails } from '../../backend/Provider'
import type { Action, State } from '../../backend/model'

describe('Toast & ToastContainer', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const sampleToast: ToastItem = {
    id: 'test-1',
    type: 'success',
    title: 'Equipment released',
    message: 'Equipment release for Sony FX3 recorded successfully.',
    timestamp: Date.now(),
    actionLabel: 'View in Logs',
    actionUrl: '/logs',
  }

  it('renders title, message, and action link', () => {
    const onDismiss = vi.fn()
    render(
      <BrowserRouter>
        <Toast toast={sampleToast} onDismiss={onDismiss} duration={10000} />
      </BrowserRouter>
    )

    expect(screen.getByText('Equipment released')).toBeTruthy()
    expect(screen.getByText(/Sony FX3/)).toBeTruthy()
    const link = screen.getByText('View in Logs')
    expect(link).toBeTruthy()
    expect(link.closest('a')?.getAttribute('href')).toBe('/logs')
  })

  it('calls onDismiss when close button is clicked', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(
      <BrowserRouter>
        <Toast toast={sampleToast} onDismiss={onDismiss} duration={10000} />
      </BrowserRouter>
    )

    const closeBtn = screen.getByRole('button', { name: /dismiss/i })
    fireEvent.click(closeBtn)

    // Wait for exit transition
    vi.advanceTimersByTime(300)
    expect(onDismiss).toHaveBeenCalledWith('test-1')
  })

  it('renders multiple toasts in ToastContainer', () => {
    const onDismiss = vi.fn()
    const toasts: ToastItem[] = [
      sampleToast,
      {
        id: 'test-2',
        type: 'warning',
        title: 'Incident reported',
        message: 'Camera lens damaged.',
        timestamp: Date.now(),
      },
    ]

    render(
      <BrowserRouter>
        <ToastContainer toasts={toasts} onDismiss={onDismiss} />
      </BrowserRouter>
    )

    expect(screen.getByText('Equipment released')).toBeTruthy()
    expect(screen.getByText('Incident reported')).toBeTruthy()
  })

  it('renders nothing when ToastContainer has no toasts', () => {
    const { container } = render(
      <BrowserRouter>
        <ToastContainer toasts={[]} onDismiss={vi.fn()} />
      </BrowserRouter>
    )
    expect(container.firstChild).toBeNull()
  })

  it('applies the maximum z-index (2147483647) and toast-item class', () => {
    const onDismiss = vi.fn()
    const { container } = render(
      <BrowserRouter>
        <ToastContainer toasts={[sampleToast]} onDismiss={onDismiss} />
      </BrowserRouter>
    )

    const toastContainer = container.querySelector('.toast-container') as HTMLElement
    expect(toastContainer).toBeTruthy()
    expect(toastContainer.style.zIndex).toBe('2147483647')

    const toastItem = container.querySelector('.toast-item') as HTMLElement
    expect(toastItem).toBeTruthy()
    expect(toastItem.style.zIndex).toBe('2147483647')
  })
})

describe('getActionToastDetails', () => {
  const mockState: State = {
    version: 3,
    profiles: [
      { id: 'p1', name: 'Maria Santos', role: 'Staff', department: 'Editorial', status: 'active' },
    ],
    items: [
      { id: 'i1', name: 'Sony FX3', category: 'Camera', tag: 'CAM-01', location: 'Locker A', condition: 'Good' },
    ],
    loans: [
      { id: 'l1', itemId: 'i1', borrowerId: 'p1', out: '2026-10-01', due: '2026-10-05', before: 'Good' },
    ],
    incidents: [],
    events: [],
  }

  it('formats checkout action correctly', () => {
    const action: Action = {
      type: 'checkout',
      itemId: 'i1',
      due: '2026-10-10',
      condition: 'Good',
      purpose: 'News coverage',
      borrowerId: 'p1',
      useType: 'publication_use',
    }
    const details = getActionToastDetails(action, mockState)
    expect(details.title).toBe('Equipment released')
    expect(details.message).toContain('Sony FX3')
    expect(details.actionLabel).toBe('View in Logs')
  })

  it('formats return action correctly', () => {
    const action: Action = {
      type: 'return',
      loanId: 'l1',
      condition: 'Good',
    }
    const details = getActionToastDetails(action, mockState)
    expect(details.title).toBe('Equipment returned')
    expect(details.message).toContain('Sony FX3')
  })

  it('formats item updates correctly', () => {
    const action: Action = {
      type: 'item',
      item: { id: 'i1', name: 'Sony FX3 Mark II', category: 'Camera', tag: 'CAM-01', location: 'Locker B', condition: 'Good' },
    }
    const details = getActionToastDetails(action, mockState)
    expect(details.title).toBe('Equipment updated')
    expect(details.message).toContain('Sony FX3 Mark II')
  })
})
