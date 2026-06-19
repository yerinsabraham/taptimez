import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Role } from './rooms.ts'

type Match = { code: string; role: Role } | null

type MatchCtx = {
  match: Match
  enter: (code: string, role: Role) => void
  leave: () => void
}

const MatchContext = createContext<MatchCtx>({
  match: null,
  enter: () => {},
  leave: () => {},
})

/** Holds the app's currently-active room, so a challenge or join can drop you in from anywhere. */
export function MatchProvider({ children }: { children: ReactNode }) {
  const [match, setMatch] = useState<Match>(null)
  return (
    <MatchContext.Provider
      value={{
        match,
        enter: (code, role) => setMatch({ code, role }),
        leave: () => setMatch(null),
      }}
    >
      {children}
    </MatchContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMatch() {
  return useContext(MatchContext)
}
