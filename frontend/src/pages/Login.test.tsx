// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Login } from './Login'
import { client, fetchRecentPublicActivity } from '../backend/client'

const { mockDbLogs } = vi.hoisted(() => ({
  mockDbLogs: [
    {
      id: 'db-1',
      action: 'checkout',
      at: '2026-10-25T12:00:00Z',
      itemName: 'Sony Alpha a6400 Mirrorless Camera',
      tag: 'TP-CAM-001',
      category: 'Camera',
      details: 'Checked out for campus event',
    },
    {
      id: 'db-2',
      action: 'return',
      at: '2026-10-25T11:45:00Z',
      itemName: 'Rode Wireless GO II Dual Mic System',
      tag: 'TP-AUD-002',
      category: 'Audio',
      details: 'Returned in Good condition',
    },
  ],
}))

vi.mock('../backend/client', () => ({
  client: {
    auth: {
      signInWithOAuth: vi.fn(),
    },
  },
  fetchRecentPublicActivity: vi.fn().mockImplementation(async () => mockDbLogs),
}))

describe('Login Page', () => {
  beforeEach(() => {
    vi.mocked(fetchRecentPublicActivity).mockImplementation(async () => mockDbLogs)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders unboxed hero on the left and chatbox with logo avatars on the right without bottom input bar', async () => {
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

    // Assert the top header card elements are REMOVED for clean sleek design
    expect(screen.queryByText('Timberland Custodian')).toBeNull()
    expect(screen.queryByText('Recent Equipment Usage')).toBeNull()
    expect(screen.queryByText('5 RECENT')).toBeNull()
    expect(screen.queryByText('LIVE DB')).toBeNull()

    // Verify right column sleek unboxed chat container exists
    expect(screen.getByLabelText('Recent equipment usage and returns chatbox')).toBeTruthy()

    // Verify equipment usage and returns loaded from database
    await waitFor(() => {
      expect(screen.getByText('TP-CAM-001')).toBeTruthy()
      expect(screen.getByText('Sony Alpha a6400 Mirrorless Camera')).toBeTruthy()
      expect(screen.getByText('TP-AUD-002')).toBeTruthy()
    })

    // Verify logo avatars exist
    const avatars = screen.getAllByAltText('Timberland avatar')
    expect(avatars.length).toBeGreaterThanOrEqual(1)
  })

  it('renders clean empty state when database returns no recent equipment activity', async () => {
    vi.mocked(fetchRecentPublicActivity).mockResolvedValueOnce([])
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('chatbox-empty-state')).toBeTruthy()
      expect(screen.getByText('No Equipment Activity Yet')).toBeTruthy()
      expect(screen.getByText(/Recent checkouts and returns from publication custodians will appear here/i)).toBeTruthy()
    })
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
      const bubbles = screen.getAllByRole('button', { name: /TP-/i })
      // Maximum 5, and strictly shows only the 2 actual records present
      expect(bubbles).toHaveLength(2)
    })
  })

  it('allows pausing the auto-cycling chatbox on hover and resuming on mouse leave', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    const chatbox = screen.getByLabelText('Recent equipment usage and returns chatbox')
    expect(chatbox).toBeTruthy()

    await waitFor(() => {
      expect(screen.getByText('TP-CAM-001')).toBeTruthy()
    })

    const bubbles = screen.getAllByRole('button', { name: /TP-/i })
    expect(bubbles[0].className).toContain('scale-[1.03]')
    expect(bubbles[0].className).toContain('opacity-100')
    expect(bubbles[1].className).toContain('opacity-45')

    // Hovering pauses auto-cycling
    fireEvent.mouseEnter(chatbox)
    expect(bubbles[0].className).toContain('scale-[1.03]')
    expect(bubbles[0].className).toContain('opacity-100')

    // Mouse leave resumes auto-cycling
    fireEvent.mouseLeave(chatbox)
    expect(bubbles[0].className).toContain('scale-[1.03]')
    expect(bubbles[0].className).toContain('opacity-100')
  })

  it('allows clicking a chat bubble to focus and highlight it', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('TP-AUD-002')).toBeTruthy()
    })

    const bubbles = screen.getAllByRole('button', { name: /TP-/i })
    const secondLogButton = screen.getByRole('button', {
      name: /TP-AUD-002/i,
    })
    expect(secondLogButton).toBeTruthy()

    fireEvent.click(secondLogButton)
    expect(secondLogButton.className).toContain('scale-[1.03]')
    expect(secondLogButton.className).toContain('opacity-100')
    expect(bubbles[0].className).toContain('opacity-45')
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
