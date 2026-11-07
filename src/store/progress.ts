import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GENDERS, isCorrectGender, type Gender, type Noun } from '../data/nouns'
import { gradeFor, review, type CardState } from '../lib/srs'
import { Rating } from 'ts-fsrs'

export type Theme = 'system' | 'light' | 'dark'
export type Voice = 'human' | 'device'

export interface Settings {
  sound: boolean
  autoSpeak: boolean
  /** native-speaker recordings or the device's text-to-speech */
  voice: Voice
  /** which course the Learn tab shows */
  track?: 'nouns' | 'verbs' | 'phrases'
  showGloss: boolean
  dailyGoal: number
  theme: Theme
  onboarded: boolean
}

export interface DayLog {
  xp: number
  n: number // answers
  ok: number // correct answers
  ms: number // practice time
  lessons: number
}

export interface ProgressState {
  cards: Record<string, CardState>
  /** Highest unlocked path node */
  frontier: number
  /** node index -> times completed */
  completed: Record<number, number>
  /** verb path: highest unlocked node and completions */
  vFrontier: number
  vCompleted: Record<number, number>
  /** phrase path */
  pFrontier: number
  pCompleted: Record<number, number>
  xp: number
  days: Record<string, DayLog>
  /** confusion[actual*3 + chosen], genders indexed m,f,n */
  confusion: number[]
  best: { blitz: number }
  freezes: number
  settings: Settings

  answer: (n: Noun, chosen: Gender, ms: number) => boolean
  /** grade without a gender choice (e.g. missed tile in select-all) */
  mark: (n: Noun, correct: boolean, ms?: number) => void
  /** count an answer in today's stats without touching any card */
  tally: (correct: boolean) => void
  finishSession: (r: { xp: number; ms: number; node?: number; vnode?: number; pnode?: number }) => void
  unlockVerbsTo: (node: number) => void
  unlockPhrasesTo: (node: number) => void
  /** grade any card by key (verbs use 'v:<infinitive>') */
  markKey: (key: string, correct: boolean, ms?: number) => void
  unlockTo: (node: number) => void
  setBest: (k: 'blitz', v: number) => void
  setSettings: (s: Partial<Settings>) => void
  reset: () => void
  importState: (json: string) => boolean
}

export function dayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const emptyDay = (): DayLog => ({ xp: 0, n: 0, ok: 0, ms: 0, lessons: 0 })

const initial = {
  cards: {} as Record<string, CardState>,
  frontier: 0,
  completed: {} as Record<number, number>,
  vFrontier: 0,
  vCompleted: {} as Record<number, number>,
  pFrontier: 0,
  pCompleted: {} as Record<number, number>,
  xp: 0,
  days: {} as Record<string, DayLog>,
  confusion: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  best: { blitz: 0 },
  freezes: 1,
  settings: { sound: true, autoSpeak: true, voice: 'human' as Voice, showGloss: true, dailyGoal: 30, theme: 'system' as Theme, onboarded: false },
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,

      answer: (n, chosen, ms) => {
        const correct = isCorrectGender(n, chosen)
        const prev = get().cards[n.key]
        const grade = gradeFor(correct, ms, !prev || prev.r === 0)
        const k = dayKey()
        set((s) => {
          const conf = s.confusion.slice()
          conf[GENDERS.indexOf(n.g) * 3 + GENDERS.indexOf(chosen)]++
          const day = { ...(s.days[k] ?? emptyDay()) }
          day.n++
          if (correct) day.ok++
          return {
            cards: { ...s.cards, [n.key]: review(prev, grade) },
            confusion: conf,
            days: { ...s.days, [k]: day },
          }
        })
        return correct
      },

      mark: (n, correct, ms = 3000) => {
        const prev = get().cards[n.key]
        const grade = correct ? gradeFor(true, ms, !prev || prev.r === 0) : Rating.Again
        const k = dayKey()
        set((s) => {
          const day = { ...(s.days[k] ?? emptyDay()) }
          day.n++
          if (correct) day.ok++
          return { cards: { ...s.cards, [n.key]: review(prev, grade) }, days: { ...s.days, [k]: day } }
        })
      },

      tally: (correct) => {
        const k = dayKey()
        set((s) => {
          const day = { ...(s.days[k] ?? emptyDay()) }
          day.n++
          if (correct) day.ok++
          return { days: { ...s.days, [k]: day } }
        })
      },

      markKey: (key, correct, ms = 3000) => {
        const prev = get().cards[key]
        const grade = gradeFor(correct, ms, !prev || prev.r === 0)
        const k = dayKey()
        set((s) => {
          const day = { ...(s.days[k] ?? emptyDay()) }
          day.n++
          if (correct) day.ok++
          return { cards: { ...s.cards, [key]: review(prev, grade) }, days: { ...s.days, [k]: day } }
        })
      },

      unlockVerbsTo: (node) => set((s) => ({ vFrontier: Math.max(s.vFrontier, node) })),
      unlockPhrasesTo: (node) => set((s) => ({ pFrontier: Math.max(s.pFrontier, node) })),

      finishSession: ({ xp, ms, node, vnode, pnode }) => {
        const k = dayKey()
        set((s) => {
          const day = { ...(s.days[k] ?? emptyDay()) }
          day.xp += xp
          day.ms += ms
          day.lessons++
          const completed = { ...s.completed }
          let frontier = s.frontier
          if (node !== undefined) {
            completed[node] = (completed[node] ?? 0) + 1
            frontier = Math.max(frontier, node + 1)
          }
          const vCompleted = { ...s.vCompleted }
          let vFrontier = s.vFrontier
          if (vnode !== undefined) {
            vCompleted[vnode] = (vCompleted[vnode] ?? 0) + 1
            vFrontier = Math.max(vFrontier, vnode + 1)
          }
          const pCompleted = { ...s.pCompleted }
          let pFrontier = s.pFrontier
          if (pnode !== undefined) {
            pCompleted[pnode] = (pCompleted[pnode] ?? 0) + 1
            pFrontier = Math.max(pFrontier, pnode + 1)
          }
          return { xp: s.xp + xp, days: { ...s.days, [k]: day }, completed, frontier, vCompleted, vFrontier, pCompleted, pFrontier }
        })
      },

      unlockTo: (node) => set((s) => ({ frontier: Math.max(s.frontier, node) })),
      setBest: (key, v) => set((s) => ({ best: { ...s.best, [key]: Math.max(s.best[key], v) } })),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      reset: () => set({ ...initial, settings: { ...get().settings, onboarded: true } }),
      importState: (json) => {
        try {
          const data = JSON.parse(json)
          const st = data.state ?? data
          if (typeof st !== 'object' || !st.cards) return false
          set({ ...initial, ...st })
          return true
        } catch {
          return false
        }
      },
    }),
    {
      // NEVER rename this key: it is where every device keeps its progress.
      name: 'seedlang-artikel-v1',
      version: 1,
      // When the saved format changes, bump `version` and convert old data here instead of dropping it.
      migrate: (persisted, fromVersion) => {
        const s = (persisted ?? {}) as Partial<ProgressState>
        void fromVersion // version 1 is the first format; add `if (fromVersion < 2) { … }` steps here
        return s as ProgressState
      },
      // Settings added in later versions get their defaults instead of being undefined.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgressState>
        return { ...current, ...p, settings: { ...current.settings, ...(p.settings ?? {}) } }
      },
      partialize: (s) => ({
        cards: s.cards,
        frontier: s.frontier,
        completed: s.completed,
        vFrontier: s.vFrontier,
        vCompleted: s.vCompleted,
        pFrontier: s.pFrontier,
        pCompleted: s.pCompleted,
        xp: s.xp,
        days: s.days,
        confusion: s.confusion,
        best: s.best,
        freezes: s.freezes,
        settings: s.settings,
      }),
    },
  ),
)

/** Consecutive days with at least one finished session, ending today (or yesterday). */
export function computeStreak(days: Record<string, DayLog>, today = new Date()): { streak: number; activeToday: boolean } {
  const d = new Date(today)
  const activeToday = (days[dayKey(d)]?.lessons ?? 0) > 0
  if (!activeToday) d.setDate(d.getDate() - 1)
  let streak = 0
  while ((days[dayKey(d)]?.lessons ?? 0) > 0) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return { streak, activeToday }
}

export function todayLog(days: Record<string, DayLog>): DayLog {
  return days[dayKey()] ?? emptyDay()
}
