import type { Gender, Noun } from '../data/nouns'

export type Case = 'nom' | 'akk' | 'dat' | 'gen'

export const CASE_NAME: Record<Case, string> = {
  nom: 'Nominativ',
  akk: 'Akkusativ',
  dat: 'Dativ',
  gen: 'Genitiv',
}

export const DEFINITE: Record<Case, Record<Gender, string>> = {
  nom: { m: 'der', f: 'die', n: 'das' },
  akk: { m: 'den', f: 'die', n: 'das' },
  dat: { m: 'dem', f: 'der', n: 'dem' },
  gen: { m: 'des', f: 'der', n: 'des' },
}

export const OPTIONS: Record<Case, string[]> = {
  nom: ['der', 'die', 'das'],
  akk: ['der', 'den', 'die', 'das'],
  dat: ['dem', 'den', 'der', 'die'],
  gen: ['des', 'dem', 'der', 'die'],
}

interface Template {
  c: Case
  /** `_` = article slot, `N` = noun */
  de: string
  en: string
  why: string
}

const TEMPLATES: Template[] = [
  { c: 'nom', de: '_ N ist hier.', en: 'The {e} is here.', why: 'Subject of the sentence' },
  { c: 'nom', de: 'Wo ist _ N?', en: 'Where is the {e}?', why: 'Subject of the sentence' },
  { c: 'nom', de: 'Das ist _ N.', en: 'That is the {e}.', why: 'After "sein", nominative' },
  { c: 'akk', de: 'Ich sehe _ N.', en: 'I see the {e}.', why: 'Direct object of "sehen"' },
  { c: 'akk', de: 'Wir brauchen _ N.', en: 'We need the {e}.', why: 'Direct object of "brauchen"' },
  { c: 'akk', de: 'Das ist für _ N.', en: 'That is for the {e}.', why: '"für" always takes the accusative' },
  { c: 'akk', de: 'Ohne _ N geht es nicht.', en: "It doesn't work without the {e}.", why: '"ohne" always takes the accusative' },
  { c: 'dat', de: 'Wir sprechen mit _ N.', en: 'We are talking with the {e}.', why: '"mit" always takes the dative' },
  { c: 'dat', de: 'Ich komme gerade von _ N.', en: 'I am just coming from the {e}.', why: '"von" always takes the dative' },
  { c: 'dat', de: 'Was hältst du von _ N?', en: 'What do you think of the {e}?', why: '"von" always takes the dative' },
  { c: 'dat', de: 'Es geht um alles außer _ N.', en: 'It is about everything except the {e}.', why: '"außer" always takes the dative' },
  { c: 'gen', de: 'Wegen _ N bleiben wir.', en: 'Because of the {e}, we stay.', why: '"wegen" takes the genitive' },
  { c: 'gen', de: 'Trotz _ N lachen wir.', en: 'Despite the {e}, we laugh.', why: '"trotz" takes the genitive' },
]

/** The noun form a case requires (weak nouns: den Menschen; genitive: des Mannes). */
export function nounForm(n: Noun, c: Case): string {
  if (c === 'akk' && n.acc) return n.acc.split(' ')[0]
  if (c === 'dat' && n.dat) return n.dat.split(' ')[0]
  if (c === 'gen') {
    if (n.gen) return n.gen.split(' ')[0]
    if (n.g === 'f') return n.w
    return /[sßxz]$/.test(n.w) ? `${n.w}es` : `${n.w}s`
  }
  return n.w
}

export interface CaseItem {
  noun: Noun
  c: Case
  before: string
  after: string
  form: string
  answer: string
  options: string[]
  en: string
  why: string
}

export function makeCaseItem(n: Noun, rnd: () => number = Math.random, only?: Case): CaseItem {
  const pool = only ? TEMPLATES.filter((t) => t.c === only) : TEMPLATES
  const t = pool[Math.floor(rnd() * pool.length)]
  const form = nounForm(n, t.c)
  const [beforeRaw, afterRaw] = t.de.split('N')
  const [before] = beforeRaw.split('_')
  return {
    noun: n,
    c: t.c,
    before,
    after: afterRaw,
    form,
    answer: DEFINITE[t.c][n.g],
    options: OPTIONS[t.c],
    en: t.en.replace('{e}', n.e.split(',')[0]),
    why: t.why,
  }
}

export function caseSentence(item: CaseItem, article: string): string {
  const art = item.before.trim() === '' ? article[0].toUpperCase() + article.slice(1) : article
  return `${item.before}${art} ${item.form}${item.after}`
}
