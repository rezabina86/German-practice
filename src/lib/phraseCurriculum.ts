import { phrases, type Phrase } from '../data/phrases'
import { LEVELS, SITUATIONS, SITUATION_ORDER, type Level, type SituationId } from '../data/verbs'

export const PHRASE_LEVEL_META: Record<Level, { title: string; subtitle: string; hue: string; grammar: string }> = {
  A1: { title: 'Survive the first week', subtitle: 'Greetings, asking again, simple status and email basics', hue: '#7048E8', grammar: 'Short, safe phrases' },
  A2: { title: 'Everyday project talk', subtitle: 'Scheduling, blockers, attachments, polite requests', hue: '#1C8FEF', grammar: 'Polite requests · Konjunktiv II' },
  B1: { title: 'Run your own meetings', subtitle: 'Status, scope, workarounds, disagreeing politely', hue: '#1FB866', grammar: 'Diplomacy · würde · allerdings' },
  B2: { title: 'Consult at management level', subtitle: 'Recommendations, objections, escalation, formal writing', hue: '#F08A24', grammar: 'Nominal style · formal written German' },
}

export interface PhraseUnit {
  index: number
  level: Level
  numberInLevel: number
  title: string
  subtitle: string
  items: Phrase[]
  firstNode: number
  lessons: Phrase[][]
}

export interface PhraseNode {
  index: number
  unit: PhraseUnit
  k: number
  items: Phrase[]
  isCheckpoint: boolean
}

let cache: { units: PhraseUnit[]; nodes: PhraseNode[] } | null = null

/** Levels → situation units (small ones merged) → lessons of up to 5 phrases + a checkpoint. */
export function phrasePath() {
  if (cache && cache.nodes.length) return cache
  const units: PhraseUnit[] = []
  const nodes: PhraseNode[] = []
  for (const level of LEVELS) {
    const groups: { sits: SituationId[]; items: Phrase[] }[] = []
    for (const sit of SITUATION_ORDER) {
      const ps = phrases().filter((p) => p.lvl === level && p.sit === sit)
      if (!ps.length) continue
      const prev = groups[groups.length - 1]
      if (prev && (ps.length < 3 || prev.items.length < 3) && prev.items.length + ps.length <= 12) {
        prev.sits.push(sit)
        prev.items.push(...ps)
      } else groups.push({ sits: [sit], items: [...ps] })
    }
    groups.forEach((g, gi) => {
      const n = Math.ceil(g.items.length / 5)
      const size = Math.ceil(g.items.length / n)
      const lessons: Phrase[][] = []
      for (let i = 0; i < g.items.length; i += size) lessons.push(g.items.slice(i, i + size))
      const unit: PhraseUnit = {
        index: units.length,
        level,
        numberInLevel: gi + 1,
        title: g.sits.map((s) => SITUATIONS[s].de).join(' · '),
        subtitle: g.sits.map((s) => SITUATIONS[s].en).join(' · '),
        items: g.items,
        firstNode: nodes.length,
        lessons,
      }
      units.push(unit)
      lessons.forEach((ls, k) => nodes.push({ index: nodes.length, unit, k, items: ls, isCheckpoint: false }))
      nodes.push({ index: nodes.length, unit, k: -1, items: g.items, isCheckpoint: true })
    })
  }
  cache = { units, nodes }
  return cache
}

export function phraseLevelFirstNode(level: Level): number {
  return phrasePath().units.find((u) => u.level === level)?.firstNode ?? 0
}

export function phraseLevelAt(node: number): Level {
  const { nodes } = phrasePath()
  const n = nodes[Math.min(node, nodes.length - 1)]
  return n ? n.unit.level : 'A1'
}
