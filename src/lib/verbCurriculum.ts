import { LEVELS, SITUATIONS, SITUATION_ORDER, verbs, type Level, type SituationId, type Verb } from '../data/verbs'

export const VERB_LEVEL_META: Record<Level, { title: string; subtitle: string; hue: string; grammar: string }> = {
  A1: { title: 'Erste Schritte im Job', subtitle: 'Present tense, modal verbs, everyday team talk', hue: '#7048E8', grammar: 'Präsens · Modalverben' },
  A2: { title: 'Im Projektalltag', subtitle: 'Perfekt (haben or sein?), separable verbs', hue: '#1C8FEF', grammar: '+ Perfekt · trennbare Verben' },
  B1: { title: 'Selbstständig beraten', subtitle: 'Präteritum, verbs with prepositions, polite Konjunktiv II', hue: '#1FB866', grammar: '+ Präteritum · Präpositionen · Konjunktiv II' },
  B2: { title: 'Souverän im Kundenprojekt', subtitle: 'Passive voice and formal consulting language', hue: '#F08A24', grammar: '+ Passiv · Nominalstil' },
}

export interface VerbUnit {
  index: number
  level: Level
  numberInLevel: number
  situations: SituationId[]
  title: string
  subtitle: string
  verbs: Verb[]
  /** first node index of this unit */
  firstNode: number
  lessons: Verb[][]
}

export interface VerbNode {
  index: number
  unit: VerbUnit
  /** lesson number inside the unit, or -1 for the checkpoint */
  k: number
  verbs: Verb[]
  isCheckpoint: boolean
}

let cache: { units: VerbUnit[]; nodes: VerbNode[] } | null = null

/** Levels → situations (units) → lessons of up to 5 verbs + a checkpoint. */
export function verbPath() {
  if (cache && cache.nodes.length) return cache
  const units: VerbUnit[] = []
  const nodes: VerbNode[] = []
  for (const level of LEVELS) {
    const groups: { sits: SituationId[]; verbs: Verb[] }[] = []
    for (const sit of SITUATION_ORDER) {
      const vs = verbs().filter((v) => v.lvl === level && v.sit === sit)
      if (!vs.length) continue
      const prev = groups[groups.length - 1]
      // tiny groups join the previous unit so every unit has substance
      if (prev && (vs.length < 3 || prev.verbs.length < 3) && prev.verbs.length + vs.length <= 12) {
        prev.sits.push(sit)
        prev.verbs.push(...vs)
      } else groups.push({ sits: [sit], verbs: [...vs] })
    }
    groups.forEach((g, gi) => {
      const nLessons = Math.ceil(g.verbs.length / 5)
      const size = Math.ceil(g.verbs.length / nLessons)
      const lessons: Verb[][] = []
      for (let i = 0; i < g.verbs.length; i += size) lessons.push(g.verbs.slice(i, i + size))
      const unit: VerbUnit = {
        index: units.length,
        level,
        numberInLevel: gi + 1,
        situations: g.sits,
        title: g.sits.map((s) => SITUATIONS[s].de).join(' · '),
        subtitle: g.sits.map((s) => SITUATIONS[s].en).join(' · '),
        verbs: g.verbs,
        firstNode: nodes.length,
        lessons,
      }
      units.push(unit)
      lessons.forEach((ls, k) => nodes.push({ index: nodes.length, unit, k, verbs: ls, isCheckpoint: false }))
      nodes.push({ index: nodes.length, unit, k: -1, verbs: g.verbs, isCheckpoint: true })
    })
  }
  cache = { units, nodes }
  return cache
}

export function levelFirstNode(level: Level): number {
  return verbPath().units.find((u) => u.level === level)?.firstNode ?? 0
}

/** Highest level whose path the learner has reached. */
export function levelAt(node: number): Level {
  const n = verbPath().nodes[Math.min(node, verbPath().nodes.length - 1)]
  return n ? n.unit.level : 'A1'
}
