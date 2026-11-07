import { GENDERS, nouns, type Gender, type Noun } from '../data/nouns'
import { useProgress } from '../store/progress'
import { makeCaseItem, type Case, type CaseItem } from './cases'
import { decodeNode, unitWords, wordsForNode, type Section } from './curriculum'
import { ruleById } from './rules'
import { isDue, retrievability } from './srs'
import { LEVELS, verbs, type Level, type SituationId } from '../data/verbs'
import { levelFirstNode, verbPath } from './verbCurriculum'
import { buildPhraseDrill, buildPhraseLesson, buildPhraseReview, buildPhraseSituation, makePhraseDrill, skillsForPhrase, type PSkill, type PhraseExercise } from './phraseSession'
import { phrasePath, phraseLevelFirstNode } from './phraseCurriculum'
import { phrases } from '../data/phrases'
import { buildSituation, buildSkillDrill, buildVerbLesson, buildVerbReview, makeDrill, skillsFor, type VSkill, type VerbExercise } from './verbSession'

export type Exercise =
  | { id: string; kind: 'choose'; noun: Noun; isNew: boolean; retry?: boolean }
  | { id: string; kind: 'selectAll'; target: Gender; nouns: Noun[] }
  | { id: string; kind: 'oddOne'; nouns: Noun[]; odd: number }
  | { id: string; kind: 'case'; item: CaseItem; retry?: boolean }
  | VerbExercise
  | PhraseExercise

export type SessionKind =
  | 'lesson'
  | 'checkpoint'
  | 'review'
  | 'blitz'
  | 'rule'
  | 'cases'
  | 'weak'
  | 'placement'
  | 'vLesson'
  | 'vReview'
  | 'vDrill'
  | 'vSituation'
  | 'vPlacement'
  | 'pLesson'
  | 'pReview'
  | 'pDrill'
  | 'pSituation'
  | 'pPlacement'

export interface SessionSpec {
  kind: SessionKind
  title: string
  node?: number
  ruleId?: string
  section?: Section
  caseOnly?: Case
  /** verb path node */
  vnode?: number
  /** phrase path node */
  pnode?: number
  pskill?: PSkill
  skill?: VSkill
  situation?: SituationId
  level?: Level
}

export interface Session {
  spec: SessionSpec
  queue: Exercise[]
  /** Extra items are not re-queued on mistakes (blitz, placement). */
  noRetry?: boolean
  passMark?: number
}

let uid = 0
const nid = () => `x${++uid}`

export function shuffle<T>(a: T[]): T[] {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

function pick<T>(a: T[], k: number): T[] {
  return shuffle(a).slice(0, k)
}

const choose = (noun: Noun, isNew = false): Exercise => ({ id: nid(), kind: 'choose', noun, isNew })

/** Learned words, weakest (lowest recall probability) first. */
export function learnedNouns(): Noun[] {
  const cards = useProgress.getState().cards
  return nouns().filter((n) => (cards[n.key]?.r ?? 0) > 0)
}

export function dueNouns(): Noun[] {
  const cards = useProgress.getState().cards
  const now = Date.now()
  return nouns()
    .filter((n) => isDue(cards[n.key], now))
    .sort((a, b) => cards[a.key].d - cards[b.key].d)
}

export function weakNouns(limit = 40): Noun[] {
  const cards = useProgress.getState().cards
  const now = Date.now()
  return learnedNouns()
    .map((n) => {
      const c = cards[n.key]
      const errRate = c.ko / Math.max(1, c.ok + c.ko)
      return { n, score: retrievability(c, now) - errRate * 0.8 - c.l * 0.05 }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.n)
}

function selectAllFrom(pool: Noun[]): Exercise | null {
  const g = GENDERS[Math.floor(Math.random() * 3)]
  const yes = pick(pool.filter((n) => n.g === g && !n.alt.length), 3)
  const no = pick(pool.filter((n) => n.g !== g && !n.alt.includes(g)), 6 - yes.length)
  if (yes.length < 2 || no.length < 3) return null
  return { id: nid(), kind: 'selectAll', target: g, nouns: shuffle([...yes, ...no]) }
}

function oddOneFrom(pool: Noun[]): Exercise | null {
  const clean = pool.filter((n) => !n.alt.length)
  for (const g of shuffle(GENDERS)) {
    const same = pick(clean.filter((n) => n.g === g), 3)
    const other = pick(clean.filter((n) => n.g !== g), 1)
    if (same.length === 3 && other.length === 1) {
      const items = shuffle([...same, other[0]])
      return { id: nid(), kind: 'oddOne', nouns: items, odd: items.indexOf(other[0]) }
    }
  }
  return null
}

function sprinkle(base: Exercise[], extra: (Exercise | null)[]): Exercise[] {
  const out = base.slice()
  for (const e of extra) {
    if (!e) continue
    const at = Math.max(3, Math.floor(Math.random() * (out.length + 1)))
    out.splice(Math.min(at, out.length), 0, e)
  }
  return out
}

function fallbackPool(min = 30): Noun[] {
  const l = learnedNouns()
  return l.length >= min ? l : nouns().slice(0, Math.max(min, 60))
}

export function buildSession(spec: SessionSpec): Session {
  const cards = useProgress.getState().cards
  switch (spec.kind) {
    case 'lesson': {
      const words = wordsForNode(spec.node!)
      const fresh = words.map((n) => choose(n, !(cards[n.key]?.r > 0)))
      const due = dueNouns().filter((n) => !words.includes(n))
      const learned = learnedNouns().filter((n) => !words.includes(n))
      const reviews = (due.length >= 4 ? due.slice(0, 4) : [...due, ...pick(learned, 4 - due.length)]).map((n) => choose(n))
      // new words come in pairs with reviews interleaved
      const base: Exercise[] = []
      fresh.forEach((f, i) => {
        base.push(f)
        if (i % 3 === 2 && reviews.length) base.push(reviews.shift()!)
      })
      base.push(...reviews)
      const pool = [...words, ...learned.slice(0, 40)]
      const { unit } = decodeNode(spec.node!)
      const extras: (Exercise | null)[] = [selectAllFrom(pool), oddOneFrom(pool)]
      if (unit >= 2 && learned.length > 20) extras.push({ id: nid(), kind: 'case', item: makeCaseItem(pick(learned, 1)[0]) })
      return { spec, queue: sprinkle(base, extras) }
    }
    case 'checkpoint': {
      const { unit } = decodeNode(spec.node!)
      const words = unitWords(unit)
      const qs = pick(words, 14).map((n) => choose(n))
      return {
        spec,
        queue: sprinkle(qs, [selectAllFrom(words), oddOneFrom(words), selectAllFrom(words), { id: nid(), kind: 'case', item: makeCaseItem(pick(words, 1)[0]) }]),
      }
    }
    case 'review': {
      const due = dueNouns()
      const list = due.length >= 15 ? due.slice(0, 20) : [...due, ...weakNouns(20 - due.length).filter((n) => !due.includes(n))]
      const qs = (list.length ? list : fallbackPool().slice(0, 15)).map((n) => choose(n))
      const pool = fallbackPool()
      return { spec, queue: sprinkle(shuffle(qs), [selectAllFrom(pool), oddOneFrom(pool)]) }
    }
    case 'weak': {
      const list = weakNouns(15)
      return { spec, queue: (list.length ? list : fallbackPool().slice(0, 15)).map((n) => choose(n)) }
    }
    case 'blitz': {
      const pool = fallbackPool(60)
      return { spec, queue: shuffle(pool).slice(0, 200).map((n) => choose(n)), noRetry: true }
    }
    case 'rule': {
      const st = ruleById(spec.ruleId!)
      if (!st) return { spec, queue: [] }
      const exc = pick(st.exceptions.filter((n) => n.rank < 8000), 3)
      const excSet = new Set(st.exceptions)
      const followers = nouns().filter((n) => !excSet.has(n) && st.rule.test(n) && n.rank < 8000)
      const qs = [...pick(followers, 12 - exc.length), ...exc].map((n) => choose(n))
      return { spec, queue: shuffle(qs) }
    }
    case 'cases': {
      const pool = fallbackPool(40)
      return { spec, queue: pick(pool, 15).map((n) => ({ id: nid(), kind: 'case', item: makeCaseItem(n, Math.random, spec.caseOnly) })) }
    }
    case 'placement': {
      const s = spec.section!
      const all = nouns().slice(Math.max(0, s.from - 500), s.from)
      return { spec, queue: pick(all, 15).map((n) => choose(n)), noRetry: true, passMark: 13 }
    }
    case 'vLesson': {
      const node = verbPath().nodes[spec.vnode!]
      return { spec, queue: buildVerbLesson(node.verbs, node.isCheckpoint) }
    }
    case 'vReview':
      return { spec, queue: buildVerbReview(spec.level ?? 'A1') }
    case 'vDrill':
      return { spec, queue: buildSkillDrill(spec.skill!, spec.level ?? 'A1') }
    case 'vSituation':
      return { spec, queue: buildSituation(spec.situation!, spec.level ?? 'A1') }
    case 'vPlacement': {
      // pass 10 of 12 questions on the levels below to unlock this one
      const L = LEVELS.indexOf(spec.level!)
      const pool = verbs().filter((v) => LEVELS.indexOf(v.lvl) < L)
      const q = pick(pool, 12).map((v) => {
        const skills = skillsFor(v, LEVELS[L - 1]).filter((s) => s !== 'meaning')
        return makeDrill(v, skills[Math.floor(Math.random() * skills.length)])
      })
      return { spec: { ...spec, vnode: levelFirstNode(spec.level!) }, queue: q, noRetry: true, passMark: 10 }
    }
    case 'pLesson': {
      const node = phrasePath().nodes[spec.pnode!]
      return { spec, queue: buildPhraseLesson(node.items, node.isCheckpoint) }
    }
    case 'pReview':
      return { spec, queue: buildPhraseReview() }
    case 'pDrill':
      return { spec, queue: buildPhraseDrill(spec.pskill!, spec.level ?? 'A1') }
    case 'pSituation':
      return { spec, queue: buildPhraseSituation(spec.situation!, spec.level ?? 'A1') }
    case 'pPlacement': {
      const L = LEVELS.indexOf(spec.level!)
      const pool = phrases().filter((p) => LEVELS.indexOf(p.lvl) < L)
      const q = pick(pool, 12).map((p) => makePhraseDrill(p, pick(skillsForPhrase(p).filter((s) => s !== 'order'), 1)[0]))
      return { spec: { ...spec, pnode: phraseLevelFirstNode(spec.level!) }, queue: q, noRetry: true, passMark: 10 }
    }
  }
}
