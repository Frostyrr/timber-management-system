// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar component', () => {
  afterEach(() => {
    cleanup()
  })
  it('renders initials when no URL is provided', () => {
    render(<Avatar name="Marc Elson" />)
    expect(screen.getByText('ME')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('handles single-word and multi-word names correctly', () => {
    const { rerender } = render(<Avatar name="Administrator" />)
    expect(screen.getByText('A')).toBeTruthy()

    rerender(<Avatar name="Dana Paula Gales" />)
    expect(screen.getByText('DP')).toBeTruthy()
  })

  it('renders fallback "?" when name is empty or null', () => {
    const { rerender } = render(<Avatar name="" />)
    expect(screen.getByText('?')).toBeTruthy()

    rerender(<Avatar name={null} />)
    expect(screen.getByText('?')).toBeTruthy()
  })

  it('renders an img element with secure attributes when URL is provided', () => {
    render(<Avatar name="Marc Rebato" url="https://lh3.googleusercontent.com/a/avatar123" />)
    const img = screen.getByRole('img') as HTMLImageElement
    expect(img).toBeTruthy()
    expect(img.src).toBe('https://lh3.googleusercontent.com/a/avatar123')
    expect(img.alt).toBe('Marc Rebato')
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('falls back to initials when the image fails to load (onError)', () => {
    render(<Avatar name="Marc Rebato" url="https://broken-image-link.com/404.jpg" />)
    const img = screen.getByRole('img')
    expect(img).toBeTruthy()

    // Trigger image error
    fireEvent.error(img)

    // Image is removed and initials fallback is displayed
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('MR')).toBeTruthy()
  })

  it('resets error state when a new URL is passed', () => {
    const { rerender } = render(<Avatar name="Marc Rebato" url="https://broken-link.jpg" />)
    const img = screen.getByRole('img')
    fireEvent.error(img)
    expect(screen.getByText('MR')).toBeTruthy()

    // URL updates to a new valid URL
    rerender(<Avatar name="Marc Rebato" url="https://new-image-link.jpg" />)
    expect(screen.getByRole('img')).toBeTruthy()
  })

  it('applies custom className correctly', () => {
    const { container } = render(
      <Avatar
        name="Marc Rebato"
        className="h-16 w-16 text-xl rounded-2xl"
      />
    )
    const avatar = container.querySelector('.avatar')
    expect(avatar?.classList.contains('h-16')).toBe(true)
    expect(avatar?.classList.contains('w-16')).toBe(true)
    expect(avatar?.classList.contains('rounded-2xl')).toBe(true)
  })
})
