import { createClient } from '@supabase/supabase-js'
import { profileSchema, stateSchema } from '../demo/model'

export const demoMode = import.meta.env.VITE_APP_MODE === 'demo'
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const client = !demoMode && url?.startsWith('https://') && key && !key.includes('REPLACE_ME') && !url.includes('YOUR_PROJECT')
  ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null
export async function identity() {
  if (!client) throw Error('Supabase is not configured.')
  const { data, error } = await client.rpc('inventory_identity')
  if (error) throw error
  return profileSchema.parse(data)
}
export async function snapshot() {
  if (!client) throw Error('Supabase is not configured.')
  const { data, error } = await client.rpc('inventory_snapshot')
  if (error) throw error
  return stateSchema.parse(data)
}
export async function mutate(action: unknown, requestId: string) {
  if (!client) throw Error('Supabase is not configured.')
  const { error } = await client.rpc('inventory_mutate', { action, request_id: requestId })
  if (error) throw Error(error.message)
}
