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

  it('renders unboxed hero on the left and chatbox with logo avatars on the right without bottom input bar', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    // Verify left column hero title and description
    expect(screen.getByText('The Timberland')).toBeTruthy()
    expect(
      screen.getByText(/Equipping campus journalists, photographers, and editors with reliable gear/i)
    ).toBeTruthy()

    // Verify Continue with Google button is rendered directly in the hero action area
    expect(screen.getByText('Continue with Google')).toBeTruthy()

    // Assert "Publication Asset Custody" badge is REMOVED
    expect(screen.queryByText('Publication Asset Custody')).toBeNull()

    // Assert bottom trust badges are REMOVED
    expect(screen.queryByText(/Audit Logging & RLS/i)).toBeNull()
    expect(screen.queryByText(/Google SSO Protected/i)).toBeNull()

    // Assert decorative bottom send/input bar is REMOVED
    expect(screen.queryByText(/Listening for live equipment events/i)).toBeNull()

    // Verify right column chatbox container and custodian header
    expect(screen.getByLabelText('Recent equipment usage and returns chatbox')).toBeTruthy()
    expect(screen.getByText('Timberland Custodian')).toBeTruthy()

    // Verify logo avatars exist
    const avatars = screen.getAllByAltText('Timberland avatar')
    expect(avatars.length).toBeGreaterThanOrEqual(1)

    // Verify equipment usage and returns
    expect(screen.getByText('TP-CAM-001')).toBeTruthy()
    expect(screen.getByText('Sony Alpha a6400 Mirrorless Camera')).toBeTruthy()
    expect(screen.getByText('TP-AUD-002')).toBeTruthy()
  })

  it('fetches actual equipment usage & returns from database and displays them in the chatbox', async () => {
    vi.mocked(fetchRecentPublicActivity).mockResolvedValue([
      {
        id: 'real-db-1',
        action: 'checkout',
        at: '2026-10-25T12:30:00Z',
        itemName: 'Canon Cinema EOS C70',
        tag: 'TP-CIN-001',
        category: 'Cinema',
        details: 'Checked out for Documentary coverage',
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
      expect(screen.getByText('LIVE DB')).toBeTruthy()
    })
  })

  it('allows pausing the auto-cycling chatbox on hover and resuming on mouse leave', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const chatbox = screen.getByLabelText('Recent equipment usage and returns chatbox')
    expect(screen.getByText('Recent Equipment Usage')).toBeTruthy()

    // Mouse enter pauses
    fireEvent.mouseEnter(chatbox)
    expect(screen.getByText('Paused (Hover)')).toBeTruthy()

    // Mouse leave resumes
    fireEvent.mouseLeave(chatbox)
    expect(screen.getByText('Recent Equipment Usage')).toBeTruthy()
  })

  it('allows clicking a chat bubble to focus and highlight it', () => {
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
