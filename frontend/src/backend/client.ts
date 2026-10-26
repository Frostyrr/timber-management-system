import { requestMfa } from './mfaPrompt'
import { bffClient } from './bffClient'
import { profileSchema, stateSchema } from './model'
import type { SecurityState } from './security'

// Authentication is server-managed. Never instantiate a browser Supabase auth client.
export const client = bffClient

export async function identity() {
  if (!client) throw Error('Supabase is not configured.')
  const { data, error } = await client.rpc<Record<string,unknown>>('inventory_identity')
  if (error) throw error
  if (data && !data.email) {
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
  const { data, error } = await client.rpc<Record<string,unknown>>('inventory_snapshot')
  if (error) throw error
  if (!Array.isArray(data?.people)) throw Error('The staff directory database upgrade is required. Apply migration 202610240003_people_directory.sql in Supabase.')
  return stateSchema.parse(data)
}

export async function workspaceAccess(renew = false): Promise<boolean> {
  if (!client) return false
  const { data, error } = await client.rpc('operator_access', { renew })
  if (error) throw Error(error.message)
  return data === true
}
export async function lockWorkspace() {
  if (!client) return
  const { error } = await client.rpc('operator_lock')
  if (error) throw Error(error.message)
}
export async function mutate(action: unknown, requestId: string) {
  if (!client) throw Error('Supabase is not configured.')
  if (['purge-archive','purge-all-archives','membership','delete-profile','self-delete'].includes((action as {type:string}).type)) await requestMfa('inventory',action)
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
  if ((action as {type:string}).type !== 'register-session') await requestMfa('security',action)
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
