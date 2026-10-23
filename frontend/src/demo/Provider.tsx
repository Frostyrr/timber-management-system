import { useState, type ReactNode } from 'react'
import { DemoContext } from './context'
import { load, save, seed, transition, type Action } from './model'
export function DemoProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      const loaded = load(window.localStorage)
      const error = save(window.localStorage, loaded.state)
      return { ...loaded, warning: error || loaded.warning }
    } catch {
      return {
        state: seed(),
        warning: 'Browser storage is unavailable. Changes last only for this session.',
      }
    }
  })
  const [state, setState] = useState(initial.state),
    [persona, setPersona] = useState('admin'),
    [warning, setWarning] = useState(initial.warning),
    [notice, setNotice] = useState('')
  const persist = (next: typeof state) => {
    setState(next)
    try {
      const error = save(window.localStorage, next)
      if (error) setWarning(error)
    } catch {
      setWarning('Browser storage is unavailable. Changes last only for this session.')
    }
  }
  const act = (a: Action) => {
    const next = transition(state, persona, a)
    persist(next)
    setNotice(next.events[0]?.text ?? 'Saved.')
  }
  return (
    <DemoContext.Provider
      value={{
        state,
        person: state.profiles.find((p) => p.id === persona) ?? state.profiles[0],
        act,
        switchPerson: (id) => {
          setPersona(id)
        },
        reset: () => {
          persist(seed())
          setPersona('admin')
          setNotice('Demo reset. Fresh sample records are ready.')
        },
        warning,
        notice,
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}
