import { createClient } from '@supabase/supabase-js'
import { profileSchema, stateSchema } from './model'
import type { SecurityState } from './security'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const client = url?.startsWith('https://') && key && !key.includes('REPLACE_ME') && !url.includes('YOUR_PROJECT')
  ? createClient(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null

export async function identity() {
  if (!client) throw Error('Supabase is not configured.')
  const { data, error } = await client.rpc('inventory_identity')
  if (error) throw error
  if (!data?.email) {
    try {
      const { data: userData } = await client.auth.getUser()
      if (userData?.user?.email) data.email = userData.user.email
    } catch {
      // fallback to database profile
    }
  }
  return profileSchema.parse(data)
}

export async function snapshot() {
  if (!client) throw Error('Supabase is not configured.')
  const { data, error } = await client.rpc('inventory_snapshot')
  if (error) throw error
  if (!Array.isArray(data?.people)) throw Error('The staff directory database upgrade is required. Apply migration 202610240003_people_directory.sql in Supabase.')
  return stateSchema.parse(data)
}

export async function mutate(action: unknown, requestId: string) {
  if (!client) throw Error('Supabase is not configured.')
  const { error } = await client.rpc('inventory_mutate', { action, request_id: requestId })
  if (error) throw Error(error.message)
}

export async function fetchSecuritySnapshot(): Promise<SecurityState> {
  if (!client) throw Error('Supabase is not configured.')
  const { data, error } = await client.rpc('security_snapshot')
  if (error) throw error
  return data as SecurityState
}

export async function mutateSecurity(action: unknown, requestId: string = crypto.randomUUID()): Promise<void> {
  if (!client) throw Error('Supabase is not configured.')
  const { error } = await client.rpc('security_mutate', { action, request_id: requestId })
  if (error) throw Error(error.message)
}

export interface PublicActivityLog {
  id: string
  action: string
  at: string
  itemName: string
  tag: string
  category: string
  details: string
}

export async function fetchRecentPublicActivity(): Promise<PublicActivityLog[]> {
  if (!client) return []
  try {
    const { data, error } = await client.rpc('recent_public_activity')
    if (error) {
      console.warn('fetchRecentPublicActivity error:', error)
      return []
    }
    if (!Array.isArray(data)) return []
    return data as PublicActivityLog[]
  } catch (err) {
    console.warn('fetchRecentPublicActivity failed:', err)
    return []
  }
}
