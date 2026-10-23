import { createContext, useContext } from 'react'
import type { Action, Profile, State } from './model'
export const DemoContext = createContext<{
  state: State
  person: Profile
  act: (a: Action) => void | Promise<void>
  mode?: 'demo' | 'live'
  refresh?: () => Promise<void>
  signOut?: () => Promise<void>
  switchPerson: (id: string) => void
  reset: () => void
  warning: string
  notice: string
} | null>(null)
export const useDemo = () => {
  const value = useContext(DemoContext)
  if (!value) throw new Error('Demo provider missing')
  return value
}
