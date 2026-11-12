/**
 * What to pronounce for nouns and verbs: builds Utterances from the recorded clips in the data
 * (see lib/audio.ts). Inflected forms are stitched from the Berlin speaker's single-word clips,
 * e.g. "ich" + "setze" + "um", "hat" + "umgesetzt", "des" + "Mannes".
 */
import type { Noun } from '../data/nouns'
import { verbHelperClips, type Verb } from '../data/verbs'
import { ARTICLE_CLIPS, clipPath, nounBase, type SpokenWord, type Utterance } from './audio'
import { nounForm } from './cases'

/** A noun with its article, in any form: "die Zeit", "die Zeiten", "den Menschen", "des Mannes". */
export function nounUtterance(n: Noun, article?: string, form?: string): Utterance {
  if (!form || form === n.w) return nounBase(n, article)
  let clip = ''
  if (form === n.p) clip = clipPath(form, n.pa)
  else if (form === (n.acc || n.dat).split(' ')[0]) clip = clipPath(form, n.wa)
  else if (form === nounForm(n, 'gen')) clip = clipPath(form, n.ga)
  const words: SpokenWord[] = [{ text: form, clip }]
  if (article) words.unshift({ text: article, clip: ARTICLE_CLIPS[article.toLowerCase()] ?? '', fn: true })
  return { text: article ? `${article} ${form}` : form, words, base: n.au ? { text: n.w, clip: n.au } : undefined }
}

/** A verb's infinitive (any native speaker; the device voice stands in if there is none). */
export function verbBase(v: Verb): Utterance {
  return nounBase({ w: v.lemma, au: v.au })
}

const MAIN_AUX = new Set(['haben', 'sein', 'werden'])

/** A phrase with a verb form, e.g. "ich setze mich ein", "er hat umgesetzt", "Sie würden prüfen". */
export function verbUtterance(v: Verb, text: string): Utterance {
  const helpers = verbHelperClips()
  const words = text
    .replace(/[.,!?…;:]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .map((t): SpokenWord => {
      // pronouns, auxiliaries and würde are function words, unless the verb is haben/sein/werden
      // itself ("er hat Zeit": there "hat" carries the stress)
      const h = helpers[t] ?? helpers[t.toLowerCase()]
      const own = v.fa[t]
      const fn = !!h && !(own && MAIN_AUX.has(v.lemma))
      return { text: t, clip: own ? clipPath(t, own) : (h ?? ''), fn }
    })
  return { text, words, base: v.au ? { text: v.lemma, clip: v.au } : undefined }
}

/** Pronouns as they are said (the UI shows "er/sie/es" and "sie/Sie"). */
export const SPOKEN_PRONOUN = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'] as const
