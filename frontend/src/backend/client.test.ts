import { afterEach, describe, expect, it, vi } from 'vitest'

const { createClient, rpc } = vi.hoisted(() => ({ createClient: vi.fn(), rpc: vi.fn() }))
vi.mock('@supabase/supabase-js', () => ({ createClient }))
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks() })
describe('backend-only persistence', () => {
  it('fails closed when configuration is missing, even if the old demo flag is set', async () => {
    vi.stubEnv('VITE_APP_MODE', 'demo')
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    const api = await import('./client')
    expect(api.client).toBeNull()
    expect(createClient).not.toHaveBeenCalled()
    await expect(api.snapshot()).rejects.toThrow('not configured')
    await expect(api.mutate({}, 'request')).rejects.toThrow('not configured')
  })
  it('uses the server and propagates rejected writes without a local fallback', async () => {
    vi.stubEnv('VITE_APP_MODE', 'demo')
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    createClient.mockReturnValue({ rpc })
    rpc.mockResolvedValue({ error: { message: 'Equipment unavailable.' } })
    const api = await import('./client')
    const action = { type: 'checkout', itemId: 'asset' }
    await expect(api.mutate(action, 'request')).rejects.toThrow('Equipment unavailable.')
    expect(rpc).toHaveBeenCalledWith('inventory_mutate', { action, request_id: 'request' })
  })
})
