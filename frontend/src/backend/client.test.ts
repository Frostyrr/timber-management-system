import { afterEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc,
    auth: {
      onAuthStateChange: vi.fn(),
      getUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      mfa: {
        listFactors: vi.fn(),
        enroll: vi.fn(),
        unenroll: vi.fn(),
        challengeAndVerify: vi.fn(),
      },
    },
  })),
}))
vi.mock('./bffClient', () => ({
  bffClient: {
    rpc,
    auth: {
      onAuthStateChange: vi.fn(),
      getUser: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      mfa: {
        listFactors: vi.fn(),
        enroll: vi.fn(),
        unenroll: vi.fn(),
        challengeAndVerify: vi.fn(),
      },
    },
  },
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
  vi.clearAllMocks()
})

describe('backend-only persistence', () => {
  it('propagates server errors when endpoints fail closed', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Server authentication is not configured.' } })
    const api = await import('./client')
    await expect(api.snapshot()).rejects.toThrow('Server authentication is not configured.')
    await expect(api.mutate({}, 'request')).rejects.toThrow('Server authentication is not configured.')
  })

  it('uses the server and propagates rejected writes without a local fallback', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Equipment unavailable.' } })
    const api = await import('./client')
    const action = { type: 'checkout', itemId: 'asset' }
    await expect(api.mutate(action, 'request')).rejects.toThrow('Equipment unavailable.')
    expect(rpc).toHaveBeenCalledWith('inventory_mutate', { action, request_id: 'request' })
  })
})
