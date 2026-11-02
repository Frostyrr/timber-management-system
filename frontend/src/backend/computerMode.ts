import { createContext } from 'react'

export const ComputerModeContext = createContext<{
  shared: boolean
  ready: boolean
  saving: boolean
  error: string
  change: () => Promise<void>
} | null>(null)
