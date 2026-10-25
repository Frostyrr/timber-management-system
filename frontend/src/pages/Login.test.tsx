// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Login } from './Login'
import { client } from '../backend/client'

vi.mock('../backend/client', () => ({
  client: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
}))

describe('Login Page', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders split-screen layout with brand masthead, login card, and 5 recent activity logs', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    // Verify brand masthead
    expect(screen.getByText('The Timberland')).toBeTruthy()
    expect(
      screen.getByText(/Equipping campus journalists, photographers, and editors with reliable gear/i)
    ).toBeTruthy()

    // Verify login card heading on the right
    expect(screen.getByText('Sign in to Timberland')).toBeTruthy()
    expect(screen.getByText('Continue with Google')).toBeTruthy()

    // Verify 5 recent equipment logs wire header
    expect(screen.getByText('Recent Equipment Activity')).toBeTruthy()
    expect(screen.getByText('Top 5 Wire')).toBeTruthy()

    // Verify each of the 5 logs is present
    const expectedTags = ['TP-CAM-001', 'TP-AUD-002', 'TP-GIM-001', 'TP-LGT-003', 'TP-TRP-002']
    expectedTags.forEach((tag) => {
      expect(screen.getByText(tag)).toBeTruthy()
    })

    expect(screen.getByText('Sony Alpha a6400 Mirrorless Camera')).toBeTruthy()
    expect(screen.getByText('Zoom H6 Handy Field Audio Recorder')).toBeTruthy()
  })

  it('allows pausing auto-cycling on hover and resuming on mouse leave', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const activityFeed = screen.getByLabelText('Recent equipment activity stream')
    expect(screen.getByText('Auto-cycling')).toBeTruthy()

    // Mouse enter pauses
    fireEvent.mouseEnter(activityFeed)
    expect(screen.getByText('Paused')).toBeTruthy()

    // Mouse leave resumes
    fireEvent.mouseLeave(activityFeed)
    expect(screen.getByText('Auto-cycling')).toBeTruthy()
  })

  it('allows clicking an activity log to focus and highlight it', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const thirdLogButton = screen.getByRole('button', {
      name: /TP-GIM-001/i,
    })
    expect(thirdLogButton).toBeTruthy()

    fireEvent.click(thirdLogButton)
    // Should have active scaling/border class
    expect(thirdLogButton.className).toContain('border-primary/40')
  })

  it('invokes client.auth.signInWithOAuth when clicking Continue with Google', async () => {
    const signInMock = vi.mocked(client!.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com/o/oauth2/auth' },
      error: null,
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const button = screen.getByText('Continue with Google')
    fireEvent.click(button)

    expect(signInMock).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/auth/callback') },
    })
  })

  it('displays error message if signInWithOAuth returns an error', async () => {
    vi.mocked(client!.auth.signInWithOAuth).mockResolvedValue({
      data: { provider: 'google', url: null },
      error: new Error('Access denied by Google Workspace policy') as never,
    })

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const button = screen.getByText('Continue with Google')
    fireEvent.click(button)

    const errorAlert = await screen.findByRole('alert')
    expect(errorAlert.textContent).toContain('Access denied by Google Workspace policy')
  })
})
