import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'splitwise-pro:current-group-id'

function readStoredGroupId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredGroupId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Private browsing / storage disabled — current group just won't persist.
  }
}

interface GroupContextValue {
  currentGroupId: string | null
  setCurrentGroupId: (id: string | null) => void
}

const GroupContext = createContext<GroupContextValue | undefined>(undefined)

export function GroupProvider({ children }: { children: ReactNode }) {
  const [currentGroupId, setCurrentGroupIdState] = useState<string | null>(readStoredGroupId)

  const setCurrentGroupId = useCallback((id: string | null) => {
    setCurrentGroupIdState(id)
    writeStoredGroupId(id)
  }, [])

  return (
    <GroupContext.Provider value={{ currentGroupId, setCurrentGroupId }}>
      {children}
    </GroupContext.Provider>
  )
}

export function useCurrentGroup(): GroupContextValue {
  const ctx = useContext(GroupContext)
  if (!ctx) {
    throw new Error('useCurrentGroup must be used within a GroupProvider')
  }
  return ctx
}
