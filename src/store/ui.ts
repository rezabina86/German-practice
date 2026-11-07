import { create } from 'zustand'
import { buildSession, type Session, type SessionSpec } from '../lib/session'

export type Tab = 'learn' | 'practice' | 'rules' | 'words' | 'stats' | 'settings'

interface UIState {
  tab: Tab
  session: Session | null
  setTab: (t: Tab) => void
  start: (spec: SessionSpec) => void
  close: () => void
}

function readTab(): Tab {
  try {
    const t = sessionStorage.getItem('seedlang-tab') as Tab | null
    if (t) return t
  } catch {
    /* storage unavailable */
  }
  return 'learn'
}

export const useUI = create<UIState>((set) => ({
  tab: readTab(),
  session: null,
  setTab: (tab) => {
    try {
      sessionStorage.setItem('seedlang-tab', tab)
    } catch {
      /* ignore */
    }
    set({ tab })
    window.scrollTo({ top: 0 })
  },
  start: (spec) => set({ session: buildSession(spec) }),
  close: () => set({ session: null }),
}))
