import { createContext } from 'react'

// A guest never reads or writes account history.
export const AccessContext = createContext({ isGuest: true })
