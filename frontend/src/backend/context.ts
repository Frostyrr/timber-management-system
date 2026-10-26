import { createContext, useContext } from 'react'
import type { Action, Profile, State } from './model'
import type { ToastItem } from '../types/notification'

export const InventoryContext = createContext<{
  state: State
  person: Profile
  act: (a: Action) => void | Promise<void>
  mode?: 'live'
  refresh?: () => Promise<void>
  signOut?: () => Promise<void>
  warning: string
  notice: string
  toasts?: ToastItem[]
  dismissToast?: (id: string) => void
  activityHistory?: ToastItem[]
  clearActivityHistory?: () => void
} | null>(null)

export const useInventory = () => {
  const value = useContext(InventoryContext)
  if (!value) throw new Error('Inventory provider missing')
  return value
}
