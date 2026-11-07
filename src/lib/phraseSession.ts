import { FUNCTIONS, REGISTER_META, phrases, type Phrase } from '../data/phrases'
import { LEVELS, SITUATIONS, type Level, type SituationId } from '../data/verbs'
import { useProgress } from '../store/progress'
import { isDue, retrievability } from './srs'

export type PSkill = 'respond' | 'meaning' | 'register' | 'order'

export const PSKILL_LABEL: Record<PSkill, string> = {
  respond: 'What would you say?',
  meaning: 'Meaning',
  register: 'Formal or informal?',
  order: 'Build the sentence',
}

export interface PIntro {
  id: string
  kind: 'pIntro'
  phrase: Phrase
}

export interface PChoice {
  id: string
  kind: 'pChoice'
  phrase: Phrase
  skill: 'respond' | 'meaning' | 'register'
  title: string
  prompt: string
  context?: string
  options: string[]
  answer: string
  retry?: boolean
}

export interface POrder {
  id: string
  kind: 'pOrder'
  phrase: Phrase
  /** first word is given, the rest are shuffled tiles */
  first: string
  tiles: string[]
  answer: string[]
  retry?: boolean
}

export type PhraseExercise = PIntro | PChoice | POrder

let uid = 0
const nid = () => `p${++uid}`

function shuffle<T>(a: T[]): T[] {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]

export const REGISTER_OPTIONS = {
  formal: 'Formal: fine with clients and in emails',
  informal: 'Informal: only with colleagues you say du to',
}

/** Distractors that clearly don't fit: same level, different communicative function. */
function others(p: Phrase, n: number): Phrase[] {
  const all = phrases().filter((x) => x !== p && x.fn !== p.fn)
  const close = all.filter((x) => x.lvl === p.lvl && x.sit === p.sit)
  const lvl = all.filter((x) => x.lvl === p.lvl)
  return [...new Set([...shuffle(close), ...shuffle(lvl), ...shuffle(all)])].slice(0, n)
}

export function skillsForPhrase(p: Phrase): PSkill[] {
  const s: PSkill[] = ['respond', 'meaning']
  if (p.order) s.push('order')
  if (p.reg !== 'neutral') s.push('register')
  return s
}

export function makePhraseDrill(p: Phrase, skill: PSkill): PhraseExercise {
  if (skill === 'order') {
    const words = p.de.split(' ')
    const rest = words.slice(1)
    let tiles = shuffle(rest)
    for (let i = 0; i < 5 && tiles.join(' ') === rest.join(' ') && rest.length > 1; i++) tiles = shuffle(rest)
    return { id: nid(), kind: 'pOrder', phrase: p, first: words[0], tiles, answer: rest }
  }
  const base = { id: nid(), kind: 'pChoice' as const, phrase: p, skill }
  if (skill === 'respond') {
    return {
      ...base,
      title: 'What would you say?',
      prompt: p.cue,
      context: `${SITUATIONS[p.sit].en} · ${FUNCTIONS[p.fn]}`,
      options: shuffle([p.de, ...others(p, 3).map((x) => x.de)]),
      answer: p.de,
    }
  }
  if (skill === 'meaning') {
    return {
      ...base,
      title: 'What does this mean?',
      prompt: p.de,
      options: shuffle([p.en, ...others(p, 3).map((x) => x.en)]),
      answer: p.en,
    }
  }
  return {
    ...base,
    title: 'Where can you use this?',
    prompt: p.de,
    options: [REGISTER_OPTIONS.formal, REGISTER_OPTIONS.informal],
    answer: p.reg === 'informal' ? REGISTER_OPTIONS.informal : REGISTER_OPTIONS.formal,
  }
}

export function registerExplain(p: Phrase): string {
  return `${REGISTER_META[p.reg].label}: ${REGISTER_META[p.reg].desc}.`
}

function randomDrill(p: Phrase, exclude: PSkill[] = []): PhraseExercise {
  const s = skillsForPhrase(p).filter((x) => !exclude.includes(x))
  return makePhraseDrill(p, pick(s.length ? s : ['meaning']))
}

export function learnedPhrases(): Phrase[] {
  const cards = useProgress.getState().cards
  return phrases().filter((p) => (cards[p.key]?.r ?? 0) > 0)
}

export function duePhrases(): Phrase[] {
  const cards = useProgress.getState().cards
  const now = Date.now()
  return phrases()
    .filter((p) => isDue(cards[p.key], now))
    .sort((a, b) => cards[a.key].d - cards[b.key].d)
}

function weakPhrases(n: number): Phrase[] {
  const cards = useProgress.getState().cards
  const now = Date.now()
  return learnedPhrases()
    .map((p) => ({ p, s: retrievability(cards[p.key], now) - cards[p.key].ko / Math.max(1, cards[p.key].ok + cards[p.key].ko) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, n)
    .map((x) => x.p)
}

/** Meet each phrase, react to a scenario with it, then build it or check its register. */
export function buildPhraseLesson(items: Phrase[], isCheckpoint: boolean): PhraseExercise[] {
  if (isCheckpoint) return shuffle(items.flatMap((p) => [makePhraseDrill(p, 'respond'), randomDrill(p, ['respond'])])).slice(0, 16)
  const cards = useProgress.getState().cards
  const out: PhraseExercise[] = []
  for (const p of items) {
    if (!(cards[p.key]?.r > 0)) out.push({ id: nid(), kind: 'pIntro', phrase: p })
    out.push(makePhraseDrill(p, p.order ? 'order' : 'meaning'))
  }
  const review = shuffle([...duePhrases(), ...learnedPhrases()].filter((p) => !items.includes(p))).slice(0, 2)
  return [...out, ...shuffle([...items.map((p) => makePhraseDrill(p, 'respond')), ...review.map((p) => randomDrill(p))])]
}

export function buildPhraseReview(): PhraseExercise[] {
  const due = duePhrases()
  const list = due.length >= 12 ? due.slice(0, 15) : [...due, ...weakPhrases(15 - due.length).filter((p) => !due.includes(p))]
  const pool = list.length ? list : phrases().filter((p) => p.lvl === 'A1').slice(0, 12)
  return shuffle(pool).map((p) => randomDrill(p))
}

export function buildPhraseDrill(skill: PSkill, level: Level, n = 12): PhraseExercise[] {
  const maxL = LEVELS.indexOf(level)
  let pool = phrases().filter((p) => LEVELS.indexOf(p.lvl) <= maxL && skillsForPhrase(p).includes(skill))
  if (pool.length < n) pool = phrases().filter((p) => skillsForPhrase(p).includes(skill))
  if (skill === 'register') {
    // balance formal and informal so guessing "formal" doesn't win
    const inf = shuffle(pool.filter((p) => p.reg === 'informal'))
    const form = shuffle(pool.filter((p) => p.reg === 'formal'))
    const k = Math.min(inf.length, Math.ceil(n / 2))
    return shuffle([...inf.slice(0, k), ...form.slice(0, n - k)]).map((p) => makePhraseDrill(p, 'register'))
  }
  return shuffle(pool).slice(0, n).map((p) => makePhraseDrill(p, skill))
}

export function buildPhraseSituation(sit: SituationId, level: Level): PhraseExercise[] {
  const maxL = LEVELS.indexOf(level)
  let pool = phrases().filter((p) => p.sit === sit && LEVELS.indexOf(p.lvl) <= maxL)
  if (pool.length < 6) pool = phrases().filter((p) => p.sit === sit)
  return shuffle(pool).slice(0, 12).map((p) => makePhraseDrill(p, 'respond'))
}
