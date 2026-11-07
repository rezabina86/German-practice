import { AnimatePresence, motion } from 'motion/react'
import { Sparkles, Volume2, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ARTICLE, GENDERS, isCorrectGender, type Gender, type Noun } from '../data/nouns'
import { preloadNoun, sayNoun, sfx } from '../lib/audio'
import { CASE_NAME, caseSentence } from '../lib/cases'
import type { Exercise } from '../lib/session'
import { useProgress } from '../store/progress'
import type { FeedbackData } from './Feedback'
import { ArticleChip, Button, Kbd, genderText, genderVariant } from './ui'

export interface ExerciseResult {
  correct: boolean
  feedback: FeedbackData
  retry?: Exercise[]
  /** nouns the learner got wrong — shown on the summary screen */
  missed?: Noun[]
  missedVerbs?: import('../data/verbs').Verb[]
  missedPhrases?: import('../data/phrases').Phrase[]
  /** intro cards: no grading, no feedback sheet */
  neutral?: boolean
}

interface Props<E extends Exercise> {
  ex: E
  locked: boolean
  onResult: (r: ExerciseResult) => void
  /** blitz: skip the sheet, flash feedback inline */
  quick?: boolean
}

let rid = 0
const retryId = () => `r${++rid}`

function useKeys(handler: (e: KeyboardEvent) => void, active: boolean) {
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => {
    if (!active) return
    const fn = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      ref.current(e)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [active])
}

function Header({ children, tag }: { children: React.ReactNode; tag?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col items-start gap-2">
      {tag}
      <h1 className="text-[22px] font-black leading-tight md:text-[26px]">{children}</h1>
    </div>
  )
}

const KEY_TO_GENDER: Record<string, Gender> = { '1': 'm', '2': 'f', '3': 'n', j: 'm', k: 'f', l: 'n' }

/* ------------------------------------------------------------------ choose */

export function ChooseView({ ex, locked, onResult, quick }: Props<Extract<Exercise, { kind: 'choose' }>>) {
  const { noun } = ex
  const showGloss = useProgress((s) => s.settings.showGloss)
  const answer = useProgress((s) => s.answer)
  const t0 = useRef(performance.now())
  const [chosen, setChosen] = useState<Gender | null>(null)
  useEffect(() => preloadNoun(noun), [noun])

  const pickG = (g: Gender) => {
    if (locked || chosen) return
    const ms = performance.now() - t0.current
    setChosen(g)
    const correct = answer(noun, g, ms)
    const alt = correct && g !== noun.g
    onResult({
      correct,
      feedback: {
        correct,
        noun,
        answer: { article: ARTICLE[noun.g], word: noun.w, g: noun.g },
        voice: { noun, article: ARTICLE[noun.g] },
        altNote: alt ? `${ARTICLE[g]} ${noun.w} is accepted too, but ${ARTICLE[noun.g]} ${noun.w} is standard.` : undefined,
      },
      retry: correct ? undefined : [{ id: retryId(), kind: 'choose', noun, isNew: false, retry: true }],
      missed: correct ? undefined : [noun],
    })
  }

  useKeys((e) => {
    const g = KEY_TO_GENDER[e.key.toLowerCase()]
    if (g) {
      e.preventDefault()
      pickG(g)
    }
  }, !locked && !chosen)

  const revealed = chosen !== null
  const correctG = revealed && isCorrectGender(noun, chosen!) ? chosen! : noun.g
  const slotG = revealed ? (quick ? correctG : chosen!) : null

  return (
    <div>
      {!quick && (
        <Header
          tag={
            ex.isNew ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-1 text-xs font-black uppercase tracking-wider text-brand-text">
                <Sparkles className="size-3.5" /> New word
              </span>
            ) : ex.retry ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-gold/20 px-2 py-1 text-xs font-black uppercase tracking-wider text-[#8a5a00] dark:text-gold">
                <RotateCcw className="size-3.5" /> Previous mistake
              </span>
            ) : undefined
          }
        >
          Choose the article
        </Header>
      )}

      <div className="flex flex-col items-center py-4 md:py-8">
        <div className="flex items-baseline gap-3 text-[42px] font-black leading-none tracking-tight sm:text-[56px]">
          <span className="relative inline-flex min-w-[2.2em] justify-end">
            <AnimatePresence mode="popLayout">
              {slotG ? (
                <motion.span
                  key={slotG}
                  initial={{ y: 24, opacity: 0, scale: 0.6 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  className={genderText[slotG]}
                >
                  {ARTICLE[slotG]}
                </motion.span>
              ) : (
                <motion.span key="blank" exit={{ opacity: 0 }} className="inline-block h-[0.9em] w-full translate-y-[0.08em] border-b-[5px] border-dotted border-line-strong" />
              )}
            </AnimatePresence>
          </span>
          <span className="break-all">{noun.w}</span>
        </div>
        {showGloss && <div className="mt-4 text-center text-lg font-bold text-muted">{noun.e}</div>}
        {!quick && (
          <button
            onClick={() => sayNoun(noun)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-muted hover:bg-surface-2"
            aria-label="Hear the word"
          >
            <Volume2 className="size-4" /> Hear it
          </button>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 md:mt-10 md:gap-4">
        {GENDERS.map((g, i) => {
          const isChosen = chosen === g
          const dim = revealed && !isChosen && g !== noun.g
          return (
            <motion.div key={g} animate={isChosen && !isCorrectGender(noun, g) ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
              <Button
                variant={genderVariant(g)}
                size="custom"
                className={`h-20 w-full text-[28px] font-black md:h-24 md:text-[34px] ${dim ? 'opacity-40' : ''} ${
                  revealed && g === noun.g && !isChosen ? 'ring-4 ring-ok/60' : ''
                }`}
                data-pressed={isChosen}
                disabled={locked || revealed}
                onClick={() => pickG(g)}
                aria-label={`${ARTICLE[g]} (${i + 1})`}
              >
                <span className="flex flex-col items-center leading-none">
                  {ARTICLE[g]}
                  <span className="mt-1.5">
                    <Kbd>{i + 1}</Kbd>
                  </span>
                </span>
              </Button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- select all */

export function SelectAllView({ ex, locked, onResult }: Props<Extract<Exercise, { kind: 'selectAll' }>>) {
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [checked, setChecked] = useState(false)
  const mark = useProgress((s) => s.mark)
  const target = ex.target

  const toggle = (i: number) => {
    if (checked || locked) return
    sfx.tap()
    setSel((s) => {
      const n = new Set(s)
      if (n.has(i)) n.delete(i)
      else n.add(i)
      return n
    })
  }

  const check = () => {
    if (checked || !sel.size) return
    setChecked(true)
    const wrong: Noun[] = []
    ex.nouns.forEach((n, i) => {
      const should = isCorrectGender(n, target)
      if (should !== sel.has(i)) wrong.push(n)
    })
    wrong.forEach((n) => mark(n, false))
    const correct = wrong.length === 0
    if (correct) useProgress.getState().tally(true)
    const right = ex.nouns.filter((n) => isCorrectGender(n, target))
    onResult({
      correct,
      feedback: {
        correct,
        note: correct
          ? `All ${ARTICLE[target]} words found: ${right.map((n) => n.w).join(', ')}.`
          : `The ${ARTICLE[target]} words are: ${right.map((n) => n.w).join(', ')}.`,
      },
      retry: wrong.slice(0, 2).map((n) => ({ id: retryId(), kind: 'choose', noun: n, isNew: false, retry: true })),
      missed: wrong,
    })
  }

  useKeys((e) => {
    const k = parseInt(e.key, 10)
    if (k >= 1 && k <= ex.nouns.length) toggle(k - 1)
    if (e.key === 'Enter') {
      e.preventDefault()
      check()
    }
  }, !locked && !checked)

  return (
    <div>
      <Header>
        Tap every word that takes <ArticleChip g={target} size="lg" />
      </Header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ex.nouns.map((n, i) => {
          const on = sel.has(i)
          const should = isCorrectGender(n, target)
          let state = on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'
          if (checked) {
            if (should && on) state = 'border-ok bg-ok-soft'
            else if (should && !on) state = 'border-flame bg-gold/10 border-dashed'
            else if (!should && on) state = 'border-bad bg-bad-soft'
            else state = 'border-line bg-surface opacity-60'
          }
          return (
            <button
              key={n.key}
              onClick={() => toggle(i)}
              className={`btn3d flex min-h-24 flex-col items-center justify-center border-2 border-b-4 px-2 py-3 ${state}`}
              data-pressed={on && !checked}
            >
              <span className="text-[19px] font-black">
                {checked && <span className={genderText[n.g]}>{ARTICLE[n.g]} </span>}
                {n.w}
              </span>
              <span className="mt-0.5 line-clamp-1 text-[13px] font-semibold text-muted">{n.e}</span>
              <span className="mt-1 text-muted">
                <Kbd>{i + 1}</Kbd>
              </span>
            </button>
          )
        })}
      </div>
      {!checked && (
        <div className="fixed inset-x-0 bottom-0 border-t-2 border-line bg-bg px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:py-6">
          <div className="mx-auto flex max-w-3xl justify-end">
            <Button size="lg" className="w-full md:w-48" disabled={!sel.size} onClick={check}>
              Check <Kbd>↵</Kbd>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ----------------------------------------------------------------- odd one */

export function OddOneView({ ex, locked, onResult }: Props<Extract<Exercise, { kind: 'oddOne' }>>) {
  const [picked, setPicked] = useState<number | null>(null)
  const mark = useProgress((s) => s.mark)
  const tally = useProgress((s) => s.tally)
  const odd = ex.nouns[ex.odd]
  const groupG = ex.nouns[(ex.odd + 1) % ex.nouns.length].g

  const choose = (i: number) => {
    if (locked || picked !== null) return
    setPicked(i)
    const correct = i === ex.odd
    if (correct) tally(true)
    else mark(odd, false)
    onResult({
      correct,
      feedback: {
        correct,
        answer: { article: ARTICLE[odd.g], word: odd.w, g: odd.g },
        voice: { noun: odd, article: ARTICLE[odd.g] },
        note: `The others all take ${ARTICLE[groupG]}.`,
        noun: correct ? undefined : odd,
      },
      retry: correct ? undefined : [{ id: retryId(), kind: 'choose', noun: odd, isNew: false, retry: true }],
      missed: correct ? undefined : [odd],
    })
  }

  useKeys((e) => {
    const k = parseInt(e.key, 10)
    if (k >= 1 && k <= 4) choose(k - 1)
  }, !locked && picked === null)

  return (
    <div>
      <Header>Which word takes a different article?</Header>
      <div className="grid grid-cols-2 gap-3">
        {ex.nouns.map((n, i) => {
          let state = 'border-line bg-surface'
          if (picked !== null) {
            if (i === ex.odd) state = 'border-ok bg-ok-soft'
            else if (i === picked) state = 'border-bad bg-bad-soft'
            else state = 'border-line bg-surface opacity-70'
          }
          return (
            <motion.button
              key={n.key}
              onClick={() => choose(i)}
              animate={picked === i && i !== ex.odd ? { x: [0, -8, 8, -6, 6, 0] } : {}}
              className={`btn3d flex min-h-28 flex-col items-center justify-center border-2 border-b-4 px-2 py-4 ${state}`}
            >
              <span className="text-[22px] font-black">
                {picked !== null && <span className={genderText[n.g]}>{ARTICLE[n.g]} </span>}
                {n.w}
              </span>
              <span className="mt-0.5 line-clamp-1 text-[13px] font-semibold text-muted">{n.e}</span>
              <span className="mt-1 text-muted">
                <Kbd>{i + 1}</Kbd>
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------- case */

export function CaseView({ ex, locked, onResult }: Props<Extract<Exercise, { kind: 'case' }>>) {
  const { item } = ex
  const [picked, setPicked] = useState<string | null>(null)
  const tally = useProgress((s) => s.tally)
  const showGloss = useProgress((s) => s.settings.showGloss)
  const cap = item.before.trim() === ''
  const fmt = (a: string) => (cap ? a[0].toUpperCase() + a.slice(1) : a)

  const choose = (o: string) => {
    if (locked || picked) return
    setPicked(o)
    const correct = o === item.answer
    tally(correct)
    const n = item.noun
    onResult({
      correct,
      feedback: {
        correct,
        sentence: caseSentence(item, item.answer),
        voice: item.form === n.w ? { noun: n, article: item.answer } : undefined,
        answer: { article: fmt(item.answer), word: `${item.form}${item.after}`.trim(), g: n.g },
        note:
          item.c === 'nom'
            ? `${CASE_NAME[item.c]} · ${item.why}. ${n.w} is ${ARTICLE[n.g] === 'der' ? 'masculine' : ARTICLE[n.g] === 'die' ? 'feminine' : 'neuter'}.`
            : `${CASE_NAME[item.c]} · ${item.why}: ${ARTICLE[n.g]} ${n.w} → ${item.answer} ${item.form}`,
      },
      retry: correct ? undefined : [{ ...ex, id: retryId(), retry: true }],
      missed: correct ? undefined : [n],
    })
  }

  useKeys((e) => {
    const k = parseInt(e.key, 10)
    if (k >= 1 && k <= item.options.length) choose(item.options[k - 1])
  }, !locked && !picked)

  return (
    <div>
      <Header
        tag={
          <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-black uppercase tracking-wider text-muted">
            {CASE_NAME[item.c]}
          </span>
        }
      >
        Complete the sentence
      </Header>
      <div className="flex flex-col items-center py-6 text-center">
        <div className="text-[28px] font-black leading-snug sm:text-[34px]">
          {item.before}
          <span
            className={`mx-1 inline-block min-w-[2.6em] rounded-xl border-b-4 px-2 ${
              picked ? (picked === item.answer ? 'border-ok bg-ok-soft text-ok-text' : 'border-bad bg-bad-soft text-bad-text') : 'border-dashed border-line-strong'
            }`}
          >
            {picked ? fmt(picked) : ' '}
          </span>{' '}
          {item.form}
          {item.after}
        </div>
        {showGloss && <div className="mt-3 text-[15px] font-bold text-muted">{item.en}</div>}
      </div>
      <div className={`mt-4 grid gap-3 ${item.options.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
        {item.options.map((o, i) => (
          <Button
            key={o}
            variant="secondary"
            size="custom"
            className="h-16 text-[22px] font-black"
            disabled={!!picked || locked}
            data-pressed={picked === o}
            onClick={() => choose(o)}
          >
            {fmt(o)} <Kbd>{i + 1}</Kbd>
          </Button>
        ))}
      </div>
    </div>
  )
}
