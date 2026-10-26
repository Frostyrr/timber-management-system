import { createContext } from 'react'
export const WorkspaceLockContext = createContext<(() => void) | null>(null)
