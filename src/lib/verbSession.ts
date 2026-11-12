import { ARTICLE } from '../data/nouns'
import { LEVELS, PRONOUNS, REFL, SITUATIONS, exampleParts, prepositions, verbs, withRefl, type Level, type SituationId, type Verb } from '../data/verbs'
import { useProgress } from '../store/progress'
import { isDue, retrievability } from './srs'
import { SPOKEN_PRONOUN } from './voice'

export type VSkill = 'meaning' | 'meaningRev' | 'context' | 'pres' | 'aux' | 'pp' | 'pret' | 'k2' | 'prep' | 'noun' | 'passive'

export const SKILL_LABEL: Record<VSkill, string> = {
  meaning: 'Meaning',
  meaningRev: 'Vocabulary',
  context: 'In context',
  pres: 'Präsens',
  aux: 'Perfekt · haben oder sein?',
  pp: 'Perfekt · Partizip II',
  pret: 'Präteritum',
  k2: 'Konjunktiv II · höflich',
  prep: 'Verb + Präposition',
  noun: 'Nominalisierung',
  passive: 'Passiv',
}

export interface VIntro {
  id: string
  kind: 'vIntro'
  verb: Verb
}

export interface VChoice {
  id: string
  kind: 'vChoice'
  verb: Verb
  skill: VSkill
  title: string
  /** text with null = blank slot */
  line: (string | null)[]
  sub?: string
  options: string[]
  answer: string
  /** full answer phrase shown in feedback, e.g. "du setzt um" */
  solution: string
  /** the phrase to pronounce with recordings (grammar drills), e.g. "er setzt um"; else the infinitive */
  say?: string
  explain: string
  retry?: boolean
}

export type VerbExercise = VIntro | VChoice

let uid = 0
const nid = () => `v${++uid}`

function shuffle<T>(a: T[]): T[] {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]
const uniq = (a: string[]) => [...new Set(a.filter(Boolean))]

function opts(answer: string, distractors: string[], n = 4): string[] {
  const d = shuffle(uniq(distractors).filter((x) => x.toLowerCase() !== answer.toLowerCase())).slice(0, n - 1)
  return shuffle([answer, ...d])
}

function peers(v: Verb, n: number, filter: (x: Verb) => boolean = () => true): Verb[] {
  const all = verbs().filter((x) => x !== v && filter(x))
  const same = all.filter((x) => x.sit === v.sit && x.lvl === v.lvl)
  const lvl = all.filter((x) => x.lvl === v.lvl)
  return uniqVerbs([...shuffle(same), ...shuffle(lvl), ...shuffle(all)]).slice(0, n)
}
function uniqVerbs(a: Verb[]): Verb[] {
  return [...new Set(a)]
}

const OWN_K2 = new Set(['sein', 'haben', 'werden', 'wissen'])
function hasOwnK2(v: Verb): boolean {
  return v.modal || OWN_K2.has(v.lemma)
}

/** Which drills a verb gets: grammar grows with the CEFR level. */
export function skillsFor(v: Verb, level: Level = v.lvl): VSkill[] {
  const L = LEVELS.indexOf(level)
  const s: VSkill[] = ['meaning', 'meaningRev', 'context', 'pres']
  if (L >= 1 && v.pp && !v.modal) s.push('pp')
  if (L >= 1 && v.pp && !v.modal && v.aux.length === 1) s.push('aux')
  if (L >= 2 && v.pret.length) s.push('pret')
  if (L >= 2 && prepositions(v).length) s.push('prep')
  if (L >= 2 && v.noun && v.ng) s.push('noun')
  if (L >= 2 && (hasOwnK2(v) ? v.k2.length > 0 : v.id % 3 === 0)) s.push('k2')
  if (L >= 3 && v.pp && /Akk/.test(v.gov) && !v.refl && !v.modal) s.push('passive')
  return s
}

export function makeIntro(v: Verb): VIntro {
  return { id: nid(), kind: 'vIntro', verb: v }
}

export function makeDrill(v: Verb, skill: VSkill): VChoice {
  const base = { id: nid(), kind: 'vChoice' as const, verb: v, skill }
  const P = (p: number) => PRONOUNS[p]
  switch (skill) {
    case 'meaning': {
      return {
        ...base,
        title: 'What does this verb mean?',
        line: [v.inf],
        options: opts(v.en, peers(v, 8).map((x) => x.en)),
        answer: v.en,
        solution: `${v.inf} = ${v.en}`,
        explain: v.note,
      }
    }
    case 'meaningRev': {
      return {
        ...base,
        title: 'Which German verb fits?',
        line: [v.en],
        options: opts(v.inf, peers(v, 8).map((x) => x.inf)),
        answer: v.inf,
        solution: `${v.en} = ${v.inf}`,
        explain: v.note,
      }
    }
    case 'context': {
      const parts = exampleParts(v)
      const line: (string | null)[] = []
      let blanked = false
      for (const p of parts) {
        if (p.verb) {
          if (!blanked) line.push(null)
          blanked = true
        } else {
          line.push(p.text)
        }
      }
      return {
        ...base,
        title: `Which verb completes the sentence? · ${SITUATIONS[v.sit].en}`,
        line,
        sub: v.exEn,
        options: opts(v.inf, peers(v, 8, (x) => x.refl === v.refl).map((x) => x.inf)),
        answer: v.inf,
        solution: `${v.inf} → ${parts.filter((p) => p.verb).map((p) => p.text).join(' … ')}`,
        explain: v.note,
      }
    }
    case 'pres':
    case 'pret': {
      const table = skill === 'pres' ? v.pres : v.pret
      const p = Math.floor(Math.random() * 6)
      const ans = withRefl(v, table[p], p)
      const other = skill === 'pres' ? v.pret : v.pres
      const ds = [...table.map((f, i) => withRefl(v, f, i)), withRefl(v, other[p] ?? '', p)]
      if (!v.sep) ds.push(v.lemma)
      return {
        ...base,
        title: skill === 'pres' ? 'Conjugate in the present tense' : 'Conjugate in the simple past (Präteritum)',
        line: [`${P(p)} `, null],
        sub: v.inf,
        options: opts(ans, ds),
        answer: ans,
        solution: `${P(p)} ${ans}`,
        say: `${SPOKEN_PRONOUN[p]} ${ans}`,
        explain:
          skill === 'pret'
            ? 'The Präteritum is used in written reports and for sein, haben and modal verbs when speaking.'
            : v.sep
              ? `Separable verb: the prefix „${v.sep}“ goes to the end of the sentence.`
              : `${v.inf}: ${v.pres[0]}, ${v.pres[1]}, ${v.pres[2]} …`,
      }
    }
    case 'k2': {
      const p = pick([0, 3, 5])
      const wuerde = ['würde', 'würdest', 'würde', 'würden', 'würdet', 'würden'][p]
      const werde = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'][p]
      const refl = v.refl ? ` ${REFL[p]}` : ''
      // Only sein, haben, werden, wissen and modals use their own form (wäre, hätte, könnte);
      // everything else says „würde + Infinitiv“.
      const synthetic = hasOwnK2(v)
      const ans = synthetic ? withRefl(v, v.k2[p], p) : `${wuerde}${refl} ${v.lemma}`
      const ds = [withRefl(v, v.pret[p] ?? '', p), withRefl(v, v.pres[p], p), `${werde}${refl} ${v.lemma}`]
      if (synthetic) ds.push(`${wuerde} ${v.lemma}`)
      const pron = p === 5 ? 'Sie' : P(p)
      return {
        ...base,
        title: 'Make it polite: Konjunktiv II',
        line: [`${pron} `, null],
        sub: v.inf,
        options: opts(ans, ds),
        answer: ans,
        solution: `${pron} ${ans}`,
        say: `${pron} ${ans}`,
        explain: synthetic
          ? `„${v.k2[5][0].toUpperCase()}${v.k2[5].slice(1)} Sie …?“ is the polite form. Only sein, haben, werden, wissen and the modal verbs have their own Konjunktiv II.`
          : 'Most verbs form Konjunktiv II with „würde + Infinitiv“. It softens statements: „Ich würde vorschlagen …“ sounds more diplomatic than „Ich schlage vor …“.',
      }
    }
    case 'aux': {
      const isSein = v.aux[0] === 'sein'
      return {
        ...base,
        title: 'Perfekt: haben or sein?',
        line: ['er/sie/es ', null, `${v.refl ? ' sich' : ''} ${v.pp}`],
        sub: v.inf,
        options: ['hat', 'ist'],
        answer: isSein ? 'ist' : 'hat',
        solution: `er ${isSein ? 'ist' : 'hat'}${v.refl ? ' sich' : ''} ${v.pp}`,
        say: `er ${isSein ? 'ist' : 'hat'}${v.refl ? ' sich' : ''} ${v.pp}`,
        explain: isSein
          ? `${v.lemma} takes sein: it describes movement or a change of state (kommen, abstürzen, ausfallen).`
          : 'Most verbs, and all verbs with a direct object, take haben.',
      }
    }
    case 'pp': {
      const aux = v.aux[0] === 'sein' ? 'bin' : 'habe'
      return {
        ...base,
        title: 'Form the Partizip II',
        line: [`ich ${aux}${v.refl ? ' mich' : ''} `, null],
        sub: v.inf,
        options: opts(v.pp, v.ppx),
        answer: v.pp,
        solution: `ich ${aux}${v.refl ? ' mich' : ''} ${v.pp}`,
        say: `ich ${aux}${v.refl ? ' mich' : ''} ${v.pp}`,
        explain: /^(be|ge|er|ver|zer|ent|emp|miss|über|hinter)/.test(v.lemma) && !v.sep
          ? 'Inseparable prefix (be-, ver-, er-, über- …): no „ge-“ in the Partizip II.'
          : v.lemma.endsWith('ieren')
            ? 'Verbs ending in -ieren never take „ge-“: implementiert, konfiguriert.'
            : v.sep
              ? `Separable verb: „ge“ goes between prefix and stem: ${v.pp}.`
              : `${v.inf} → ${v.pp}`,
      }
    }
    case 'passive': {
      const ans = `wird ${v.pp}`
      return {
        ...base,
        title: 'Passive, present tense (Vorgangspassiv)',
        line: ['Es ', null, '.'],
        sub: v.inf,
        options: opts(ans, [`hat ${v.pp}`, `wird ${v.lemma}`, `wurde ${v.pp}`, `ist ${v.lemma}`]),
        answer: ans,
        solution: `Es ${ans}.`,
        say: `es ${ans}`,
        explain: 'Passive = werden + Partizip II. In reports and documentation the passive keeps the focus on the task: „Das Feature wird morgen ausgerollt.“',
      }
    }
    case 'prep': {
      const ps = prepositions(v)
      const { prep, kase } = pick(ps)
      const all = ['an', 'auf', 'aus', 'bei', 'für', 'mit', 'nach', 'über', 'um', 'von', 'zu', 'in', 'durch', 'gegen']
      const valid = new Set(ps.map((x) => x.prep))
      return {
        ...base,
        title: 'Which preposition goes with the verb?',
        line: [`${v.inf} `, null, ` + ${kase}`],
        sub: v.en,
        options: opts(prep, all.filter((x) => !valid.has(x))),
        answer: prep,
        solution: `${v.inf} ${prep} + ${kase}`,
        explain: `Learn it as a unit: ${v.gov}. ${v.note}`,
      }
    }
    case 'noun': {
      return {
        ...base,
        title: 'Nominal style: which article?',
        line: [`${v.inf} → `, null, ` ${v.noun}`],
        sub: 'Consulting documents love nouns: „die Umsetzung erfolgt …“',
        options: ['der', 'die', 'das'],
        answer: ARTICLE[v.ng as 'm' | 'f' | 'n'],
        solution: `${v.inf} → ${ARTICLE[v.ng as 'm' | 'f' | 'n']} ${v.noun}`,
        explain: v.noun.endsWith('ung') ? 'Nouns made with -ung are always feminine: die.' : `${ARTICLE[v.ng as 'm' | 'f' | 'n']} ${v.noun}`,
      }
    }
  }
}

function randomDrill(v: Verb, level: Level = v.lvl, exclude: VSkill[] = []): VChoice {
  const s = skillsFor(v, level).filter((x) => !exclude.includes(x))
  // grammar skills of the verb's own level are favoured
  const weighted = [...s, ...s.filter((x) => !['meaning', 'meaningRev', 'context'].includes(x))]
  return makeDrill(v, pick(weighted.length ? weighted : ['meaning']))
}

export function learnedVerbs(): Verb[] {
  const cards = useProgress.getState().cards
  return verbs().filter((v) => (cards[v.key]?.r ?? 0) > 0)
}

export function dueVerbs(): Verb[] {
  const cards = useProgress.getState().cards
  const now = Date.now()
  return verbs()
    .filter((v) => isDue(cards[v.key], now))
    .sort((a, b) => cards[a.key].d - cards[b.key].d)
}

export function weakVerbs(n: number): Verb[] {
  const cards = useProgress.getState().cards
  const now = Date.now()
  return learnedVerbs()
    .map((v) => ({ v, s: retrievability(cards[v.key], now) - (cards[v.key].ko / Math.max(1, cards[v.key].ok + cards[v.key].ko)) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, n)
    .map((x) => x.v)
}

/** A lesson: meet each verb (intro card), use it in context, then one grammar drill. */
export function buildVerbLesson(newVerbs: Verb[], isCheckpoint: boolean): VerbExercise[] {
  if (isCheckpoint) {
    const qs = shuffle(newVerbs).flatMap((v) => [randomDrill(v), randomDrill(v, v.lvl, ['context'])])
    return shuffle(qs).slice(0, 16)
  }
  const cards = useProgress.getState().cards
  const out: VerbExercise[] = []
  for (const v of newVerbs) {
    if (!(cards[v.key]?.r > 0)) out.push(makeIntro(v))
    out.push(makeDrill(v, 'context'))
  }
  const later = shuffle(newVerbs.map((v) => randomDrill(v, v.lvl, ['context'])))
  const review = shuffle([...dueVerbs(), ...learnedVerbs()].filter((v) => !newVerbs.includes(v))).slice(0, 2)
  return [...out, ...shuffle([...later, ...review.map((v) => randomDrill(v))])]
}

export function buildVerbReview(level: Level): VerbExercise[] {
  const due = dueVerbs()
  const list = due.length >= 12 ? due.slice(0, 15) : [...due, ...weakVerbs(15 - due.length).filter((v) => !due.includes(v))]
  const pool = list.length ? list : verbs().filter((v) => v.lvl === 'A1').slice(0, 12)
  return shuffle(pool).map((v) => randomDrill(v, LEVELS.indexOf(v.lvl) > LEVELS.indexOf(level) ? v.lvl : level))
}

export function buildSkillDrill(skill: VSkill, level: Level, n = 15): VerbExercise[] {
  const maxL = LEVELS.indexOf(level)
  if (skill === 'aux') {
    // only a few verbs take sein, so mix them in deliberately (about half the questions)
    const withAux = verbs().filter((v) => skillsFor(v, 'B2').includes('aux'))
    const sein = shuffle(withAux.filter((v) => v.aux[0] === 'sein'))
    const haben = shuffle(withAux.filter((v) => v.aux[0] === 'haben' && LEVELS.indexOf(v.lvl) <= Math.max(maxL, 1)))
    const take = Math.min(sein.length, Math.ceil(n / 2))
    return shuffle([...sein.slice(0, take), ...haben.slice(0, n - take)]).map((v) => makeDrill(v, 'aux'))
  }
  const pool = verbs().filter((v) => LEVELS.indexOf(v.lvl) <= Math.max(maxL, skill === 'pp' ? 1 : 0) && skillsFor(v, 'B2').includes(skill))
  return shuffle(pool).slice(0, n).map((v) => makeDrill(v, skill))
}

export function buildSituation(sit: SituationId, level: Level): VerbExercise[] {
  const maxL = LEVELS.indexOf(level)
  let pool = verbs().filter((v) => v.sit === sit && LEVELS.indexOf(v.lvl) <= maxL)
  // too few verbs at your level for this situation: include the higher levels too
  if (pool.length < 6) pool = verbs().filter((v) => v.sit === sit)
  return shuffle(pool)
    .slice(0, 12)
    .flatMap((v) => [makeDrill(v, 'context'), ...(Math.random() < 0.5 ? [randomDrill(v, v.lvl, ['context'])] : [])])
}

export const REFL_PRONOUNS = REFL
