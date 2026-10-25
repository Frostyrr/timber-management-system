// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Login } from './Login'
import { client, fetchRecentPublicActivity } from '../backend/client'

vi.mock('../backend/client', () => ({
  client: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
  fetchRecentPublicActivity: vi.fn().mockResolvedValue([]),
}))

describe('Login Page', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders split-screen layout with CLI terminal and without removed badges', () => {
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

    // Assert "Publication Asset Custody" badge is REMOVED
    expect(screen.queryByText('Publication Asset Custody')).toBeNull()

    // Assert bottom trust badges are REMOVED
    expect(screen.queryByText(/Audit Logging & RLS/i)).toBeNull()
    expect(screen.queryByText(/Google SSO Protected/i)).toBeNull()
    expect(screen.queryByText(/24\/7 Equipment Custody/i)).toBeNull()

    // Verify login card on the right
    expect(screen.getByText('Sign in to Timberland')).toBeTruthy()
    expect(screen.getByText('Continue with Google')).toBeTruthy()

    // Verify CLI terminal container
    expect(screen.getByLabelText('Recent equipment activity CLI stream')).toBeTruthy()
    expect(screen.getByText(/timberd --tail=5 --stream/i)).toBeTruthy()
    expect(screen.getByText(/timber telemetry --tail=5 --format=interactive/i)).toBeTruthy()

    // Verify default fallback tags exist
    expect(screen.getByText('TP-CAM-001')).toBeTruthy()
    expect(screen.getByText('TP-AUD-002')).toBeTruthy()
  })

  it('fetches recent activity from the database and displays them in the CLI', async () => {
    vi.mocked(fetchRecentPublicActivity).mockResolvedValue([
      {
        id: 'real-db-1',
        action: 'checkout',
        at: '2026-10-25T12:30:00Z',
        itemName: 'Canon Cinema EOS C70',
        tag: 'TP-CIN-001',
        category: 'Cinema',
        details: 'Staff checkout: Documentary coverage',
      },
      {
        id: 'real-db-2',
        action: 'return',
        at: '2026-10-25T12:20:00Z',
        itemName: 'Rode Wireless GO II',
        tag: 'TP-MIC-002',
        category: 'Audio',
        details: 'Returned in Good condition',
      },
    ])

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('TP-CIN-001')).toBeTruthy()
      expect(screen.getByText(/Canon Cinema EOS C70/i)).toBeTruthy()
      expect(screen.getByText('TP-MIC-002')).toBeTruthy()
      expect(screen.getByText('LIVE DB')).toBeTruthy()
    })
  })

  it('allows pausing the CLI auto-cycling stream on hover and resuming on mouse leave', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const cliFeed = screen.getByLabelText('Recent equipment activity CLI stream')
    expect(screen.getByText('STREAM')).toBeTruthy()

    // Mouse enter pauses CLI
    fireEvent.mouseEnter(cliFeed)
    expect(screen.getByText('PAUSED')).toBeTruthy()

    // Mouse leave resumes
    fireEvent.mouseLeave(cliFeed)
    expect(screen.getByText('STREAM')).toBeTruthy()
  })

  it('allows clicking an activity log to focus and highlight it in the CLI', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const secondLogButton = screen.getByRole('button', {
      name: /TP-AUD-002/i,
    })
    expect(secondLogButton).toBeTruthy()

    fireEvent.click(secondLogButton)
    // Should have active scaling and left emerald border class
    expect(secondLogButton.className).toContain('border-[#10b981]')
    expect(secondLogButton.className).toContain('translate-x-1.5')
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
