import type { Gender } from './nouns'

export type Level = 'A1' | 'A2' | 'B1' | 'B2'
export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2']

export type SituationId = 'kickoff' | 'daily' | 'mail' | 'meeting' | 'workshop' | 'dev' | 'ops' | 'project' | 'client'

/** Where you'll use the verb in IT-consulting work. Order = order on the path. */
export const SITUATIONS: Record<SituationId, { de: string; en: string }> = {
  kickoff: { de: 'Kennenlernen & Onboarding', en: 'Introductions & onboarding' },
  daily: { de: 'Daily & Teamarbeit', en: 'Stand-up & teamwork' },
  mail: { de: 'E-Mail & Nachrichten', en: 'Emails & messages' },
  meeting: { de: 'Meetings & Calls', en: 'Meetings & calls' },
  workshop: { de: 'Workshop & Anforderungen', en: 'Requirements workshops' },
  dev: { de: 'Entwicklung & Code', en: 'Development & code' },
  ops: { de: 'Betrieb & Support', en: 'Operations, incidents & support' },
  project: { de: 'Projekt & Planung', en: 'Project management' },
  client: { de: 'Kunde & Beratung', en: 'Client consulting' },
}
export const SITUATION_ORDER = Object.keys(SITUATIONS) as SituationId[]

export const PRONOUNS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'] as const
export const REFL = ['mich', 'dich', 'sich', 'uns', 'euch', 'sich'] as const

const MODALS = new Set(['können', 'müssen', 'wollen', 'sollen', 'dürfen', 'möchten'])

export interface Verb {
  id: number
  /** progress key, shared FSRS store with nouns */
  key: string
  inf: string
  /** infinitive without "sich" */
  lemma: string
  lvl: Level
  en: string
  sit: SituationId
  gov: string
  noun: string
  ng: Gender | ''
  ex: string
  exEn: string
  note: string
  refl: boolean
  sep: string
  aux: string[]
  pp: string
  ppx: string[]
  pres: string[]
  pret: string[]
  k2: string[]
  au: string
  modal: boolean
}

// Kept on globalThis so a second copy of this module (dev hot reload) shares the loaded data.
const G = globalThis as unknown as { __seedlangVerbs?: Verb[] }
let loading: Promise<Verb[]> | null = null

export function verbs(): Verb[] {
  return G.__seedlangVerbs ?? []
}

export function loadVerbs(): Promise<Verb[]> {
  if (G.__seedlangVerbs) return Promise.resolve(G.__seedlangVerbs)
  if (loading) return loading
  loading = fetch(`${import.meta.env.BASE_URL}data/verbs.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load verbs (${r.status})`)
      return r.json() as Promise<{ verbs: Omit<Verb, 'id' | 'key' | 'lemma' | 'modal'>[] }>
    })
    .then((d) => {
      G.__seedlangVerbs = d.verbs.map((v, i) => {
        const lemma = v.inf.replace(/^sich /, '')
        return { ...v, id: i, key: `v:${v.inf}`, lemma, modal: MODALS.has(lemma) }
      })
      return G.__seedlangVerbs
    })
  loading.catch(() => {
    loading = null
  })
  return loading
}

/** "kümmere" + person 0 → "kümmere mich"; "stimme ab" → "stimme mich ab". */
export function withRefl(v: Verb, form: string, person: number): string {
  if (!v.refl) return form
  const parts = form.split(' ')
  return [parts[0], REFL[person], ...parts.slice(1)].join(' ')
}

/** The example sentence as plain text (brackets removed). */
export function exampleText(v: Verb): string {
  return v.ex.replace(/\[([^\]]+)\]/g, '$1')
}

/** Split the example into text / verb-form segments for highlighting or blanking. */
export function exampleParts(v: Verb): { text: string; verb: boolean }[] {
  const out: { text: string; verb: boolean }[] = []
  const re = /\[([^\]]+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(v.ex))) {
    if (m.index > last) out.push({ text: v.ex.slice(last, m.index), verb: false })
    out.push({ text: m[1], verb: true })
    last = m.index + m[0].length
  }
  if (last < v.ex.length) out.push({ text: v.ex.slice(last), verb: false })
  return out
}

/** Prepositions + case from the government string, e.g. "um + Akk". */
export function prepositions(v: Verb): { prep: string; kase: string }[] {
  return [...v.gov.matchAll(/(\p{L}+) \+ (Akk|Dat)/gu)].map((m) => ({ prep: m[1], kase: m[2] }))
}

export function perfekt(v: Verb, person = 2): string {
  if (!v.pp || !v.aux.length) return ''
  const aux = v.aux[0] === 'sein' ? ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'] : ['habe', 'hast', 'hat', 'haben', 'habt', 'haben']
  return `${aux[person]}${v.refl ? ` ${REFL[person]}` : ''} ${v.pp}`
}
