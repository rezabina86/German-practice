import { nouns, type Noun } from '../data/nouns'

export const WORDS_PER_LESSON = 10
export const LESSONS_PER_UNIT = 5
export const WORDS_PER_UNIT = WORDS_PER_LESSON * LESSONS_PER_UNIT
/** 5 lessons + 1 checkpoint per unit */
export const NODES_PER_UNIT = LESSONS_PER_UNIT + 1

export interface Section {
  id: string
  level: string
  title: string
  subtitle: string
  from: number
  to: number
  hue: string
}

export const SECTIONS: Section[] = [
  { id: 'A1', level: 'A1', title: 'Erste Schritte', subtitle: 'The 500 most common nouns', from: 0, to: 500, hue: '#7048E8' },
  { id: 'A2', level: 'A2', title: 'Alltag', subtitle: 'Everyday life · words 501–1,500', from: 500, to: 1500, hue: '#1C8FEF' },
  { id: 'B1', level: 'B1', title: 'Unterwegs', subtitle: 'Independent use · words 1,501–3,500', from: 1500, to: 3500, hue: '#1FB866' },
  { id: 'B2', level: 'B2', title: 'Fließend', subtitle: 'Fluent topics · words 3,501–6,500', from: 3500, to: 6500, hue: '#F08A24' },
  { id: 'C1', level: 'C1', title: 'Meisterschaft', subtitle: 'Mastery · words 6,501–12,000', from: 6500, to: 12000, hue: '#F0437A' },
]

export interface Unit {
  index: number
  section: Section
  numberInSection: number
  from: number
  to: number
}

export function unitCount(): number {
  return Math.ceil(nouns().length / WORDS_PER_UNIT)
}

export function unitsOf(section: Section): Unit[] {
  const total = nouns().length
  const to = Math.min(section.to, total)
  const out: Unit[] = []
  for (let from = section.from, k = 0; from < to; from += WORDS_PER_UNIT, k++) {
    out.push({ index: from / WORDS_PER_UNIT, section, numberInSection: k + 1, from, to: Math.min(from + WORDS_PER_UNIT, to) })
  }
  return out
}

export function unitAt(index: number): Unit {
  const from = index * WORDS_PER_UNIT
  const section = SECTIONS.find((s) => from >= s.from && from < s.to) ?? SECTIONS[SECTIONS.length - 1]
  return {
    index,
    section,
    numberInSection: (from - section.from) / WORDS_PER_UNIT + 1,
    from,
    to: Math.min(from + WORDS_PER_UNIT, nouns().length),
  }
}

export function nodeIndex(unit: number, k: number): number {
  return unit * NODES_PER_UNIT + k
}

export function decodeNode(node: number): { unit: number; k: number; isCheckpoint: boolean } {
  const unit = Math.floor(node / NODES_PER_UNIT)
  const k = node % NODES_PER_UNIT
  return { unit, k, isCheckpoint: k === LESSONS_PER_UNIT }
}

export function wordsForNode(node: number): Noun[] {
  const { unit, k, isCheckpoint } = decodeNode(node)
  const all = nouns()
  const from = unit * WORDS_PER_UNIT
  if (isCheckpoint) return all.slice(from, from + WORDS_PER_UNIT)
  return all.slice(from + k * WORDS_PER_LESSON, from + (k + 1) * WORDS_PER_LESSON)
}

export function unitWords(unit: number): Noun[] {
  const from = unit * WORDS_PER_UNIT
  return nouns().slice(from, from + WORDS_PER_UNIT)
}

export function sectionFirstNode(s: Section): number {
  return nodeIndex(s.from / WORDS_PER_UNIT, 0)
}
