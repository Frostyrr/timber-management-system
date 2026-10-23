import { createContext, useContext } from 'react'
import type { Action, Profile, State } from './model'
export const InventoryContext = createContext<{
  state: State
  person: Profile
  act: (a: Action) => void | Promise<void>
  mode?: 'live'
  refresh?: () => Promise<void>
  signOut?: () => Promise<void>
  warning: string
  notice: string
} | null>(null)
export const useInventory = () => {
  const value = useContext(InventoryContext)
  if (!value) throw new Error('Inventory provider missing')
  return value
}
