import type { Level, SituationId } from './verbs'

export type PhraseFunction =
  | 'greet'
  | 'small'
  | 'clarify'
  | 'status'
  | 'agree'
  | 'disagree'
  | 'propose'
  | 'request'
  | 'schedule'
  | 'problem'
  | 'close'
  | 'email'

export type Register = 'formal' | 'neutral' | 'informal'

export const FUNCTIONS: Record<PhraseFunction, string> = {
  greet: 'Greeting & introducing',
  small: 'Small talk',
  clarify: 'Asking & clarifying',
  status: 'Giving status',
  agree: 'Agreeing',
  disagree: 'Disagreeing politely',
  propose: 'Suggesting & recommending',
  request: 'Asking for something',
  schedule: 'Scheduling',
  problem: 'Problems & escalation',
  close: 'Wrapping up',
  email: 'Email phrases',
}

export const REGISTER_META: Record<Register, { label: string; short: string; desc: string }> = {
  formal: { label: 'Formal · Sie', short: 'Formal', desc: 'Clients, management, emails' },
  neutral: { label: 'Neutral', short: 'Neutral', desc: 'Works with clients and colleagues' },
  informal: { label: 'Informal · du', short: 'Informal', desc: 'Team chat, colleagues you say du to' },
}

export interface Phrase {
  id: number
  key: string
  lvl: Level
  sit: SituationId
  fn: PhraseFunction
  reg: Register
  de: string
  en: string
  cue: string
  note: string
  /** short and unambiguous enough for the word-order exercise */
  order: boolean
}

// Kept on globalThis so a second copy of this module (dev hot reload) shares the loaded data.
const G = globalThis as unknown as { __seedlangPhrases?: Phrase[] }
let loading: Promise<Phrase[]> | null = null

export function phrases(): Phrase[] {
  return G.__seedlangPhrases ?? []
}

export function loadPhrases(): Promise<Phrase[]> {
  if (G.__seedlangPhrases) return Promise.resolve(G.__seedlangPhrases)
  if (loading) return loading
  loading = fetch(`${import.meta.env.BASE_URL}data/phrases.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load phrases (${r.status})`)
      return r.json() as Promise<{ phrases: Omit<Phrase, 'key'>[] }>
    })
    .then((d) => {
      // key by text, so editing the list doesn't scramble saved progress
      G.__seedlangPhrases = d.phrases.map((p) => ({ ...p, key: `p:${p.de}` }))
      return G.__seedlangPhrases
    })
  loading.catch(() => {
    loading = null
  })
  return loading
}
