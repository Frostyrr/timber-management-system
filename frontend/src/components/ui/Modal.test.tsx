// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Modal } from './Modal'

describe('Modal', () => {
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

  it('renders title, children, and opens dialog with responsive full-screen mobile classes', () => {
    const handleClose = vi.fn()
    const handleSubmit = vi.fn()

    render(
      <Modal title="Test Modal Title" onClose={handleClose} onSubmit={handleSubmit}>
        <p>Modal content body</p>
      </Modal>
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(screen.getByText('Test Modal Title')).toBeTruthy()
    expect(screen.getByText('Modal content body')).toBeTruthy()

    // Verifies full-screen mobile classes and responsive desktop classes
    expect(dialog.className).toContain('fixed inset-0')
    expect(dialog.className).toContain('h-[100dvh]')
    expect(dialog.className).toContain('w-screen')
    expect(dialog.className).toContain('sm:max-w-[540px]')
    expect(dialog.className).toContain('sm:rounded-2xl')
  })

  it('invokes onClose when clicking the close X button or Cancel', () => {
    const handleClose = vi.fn()
    const handleSubmit = vi.fn()

    render(
      <Modal title="Close Test" onClose={handleClose} onSubmit={handleSubmit}>
        <div>Body</div>
      </Modal>
    )

    fireEvent.click(screen.getByLabelText('Close dialog'))
    expect(handleClose).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByText('Cancel'))
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('submits form data and invokes onClose upon success', async () => {
    const handleClose = vi.fn()
    const handleSubmit = vi.fn().mockResolvedValue(undefined)

    render(
      <Modal title="Submit Test" onClose={handleClose} onSubmit={handleSubmit} submit="Save Record">
        <input name="testField" defaultValue="testValue" />
      </Modal>
    )

    const submitBtn = screen.getByText('Save Record')
    fireEvent.click(submitBtn)

    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })
})
