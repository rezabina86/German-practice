export type Gender = 'm' | 'f' | 'n'
export type Article = 'der' | 'die' | 'das'

export const GENDERS: Gender[] = ['m', 'f', 'n']
export const ARTICLE: Record<Gender, Article> = { m: 'der', f: 'die', n: 'das' }
export const GENDER_NAME: Record<Gender, string> = { m: 'masculine', f: 'feminine', n: 'neuter' }

export interface Noun {
  id: number
  /** Stable key used for progress storage, e.g. "Hund|m". */
  key: string
  w: string
  g: Gender
  /** Alternative genders that are also accepted (der/das Joghurt). */
  alt: Gender[]
  /** Same spelling, different gender, different meaning (der See / die See). */
  homo: Gender[]
  p: string
  e: string
  e2: string
  gen: string
  acc: string
  dat: string
  x: string
  xe: string
  /** Wikimedia Commons recording, e.g. "e7/De-Zeit.ogg" ('' if none). */
  au: string
  /** Berlin speaker's recordings of the plural, the genitive and the weak form (den Menschen),
   *  coded relative to that form (lib/audio.ts clipPath), '' if none. */
  pa: string
  ga: string
  wa: string
  /** 0-based frequency rank. */
  rank: number
}

interface RawData {
  v: number
  source: string
  fields: string[]
  rows: string[][]
}

// Kept on globalThis so a second copy of this module (dev hot reload) shares the loaded data.
const G = globalThis as unknown as { __seedlangNouns?: { list: Noun[]; byKey: Map<string, Noun>; byWord: Map<string, Noun[]> } }
let loading: Promise<Noun[]> | null = null

export function nouns(): Noun[] {
  return G.__seedlangNouns?.list ?? []
}
export function nounByKey(key: string): Noun | undefined {
  return G.__seedlangNouns?.byKey.get(key)
}
export function nounsByWord(w: string): Noun[] {
  return G.__seedlangNouns?.byWord.get(w) ?? []
}

export function loadNouns(): Promise<Noun[]> {
  if (G.__seedlangNouns) return Promise.resolve(G.__seedlangNouns.list)
  if (loading) return loading
  loading = fetch(`${import.meta.env.BASE_URL}data/nouns.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`Failed to load word list (${r.status})`)
      return r.json() as Promise<RawData>
    })
    .then((raw) => {
      const ix = Object.fromEntries(raw.fields.map((f, i) => [f, i])) as Record<string, number>
      const list: Noun[] = raw.rows.map((r, i) => {
        const g = r[ix.g] as Gender
        return {
          id: i,
          key: `${r[ix.w]}|${g}`,
          w: r[ix.w],
          g,
          alt: (r[ix.a] || '').split('') as Gender[],
          homo: (r[ix.h] || '').split('') as Gender[],
          p: r[ix.p],
          e: r[ix.e],
          e2: r[ix.e2],
          gen: r[ix.gen],
          acc: r[ix.acc],
          dat: r[ix.dat],
          x: r[ix.x],
          xe: r[ix.xe],
          au: ix.au !== undefined ? r[ix.au] : '',
          pa: ix.pa !== undefined ? r[ix.pa] : '',
          ga: ix.ga !== undefined ? r[ix.ga] : '',
          wa: ix.wa !== undefined ? r[ix.wa] : '',
          rank: i,
        }
      })
      const byKey = new Map(list.map((n) => [n.key, n]))
      const byWord = new Map<string, Noun[]>()
      for (const n of list) {
        const l = byWord.get(n.w)
        if (l) l.push(n)
        else byWord.set(n.w, [n])
      }
      G.__seedlangNouns = { list, byKey, byWord }
      return list
    })
  loading.catch(() => {
    loading = null
  })
  return loading
}

export function isCorrectGender(n: Noun, g: Gender): boolean {
  return n.g === g || n.alt.includes(g)
}
