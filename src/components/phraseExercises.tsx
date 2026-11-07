import { AnimatePresence, motion } from 'motion/react'
import { Lightbulb, MessageSquareQuote, Sparkles, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { FUNCTIONS, REGISTER_META, type Phrase, type Register } from '../data/phrases'
import { SITUATIONS } from '../data/verbs'
import { speak } from '../lib/audio'
import { registerExplain, type PChoice, type PIntro, type POrder } from '../lib/phraseSession'
import { useProgress } from '../store/progress'
import type { ExerciseResult } from './exercises'
import { Button, Kbd } from './ui'
import { LevelChip } from './verbExercises'

const REG_STYLE: Record<Register, string> = {
  formal: 'bg-der-soft text-der',
  neutral: 'bg-surface-2 text-muted',
  informal: 'bg-gold/20 text-[#8a5a00] dark:text-gold',
}

export function RegisterChip({ reg }: { reg: Register }) {
  return <span className={`rounded-lg px-2 py-0.5 text-xs font-black ${REG_STYLE[reg]}`}>{REGISTER_META[reg].label}</span>
}

function useKeys(handler: (e: KeyboardEvent) => void, active: boolean) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
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

/** Compact explanation card used in feedback and the phrasebook. */
export function PhraseCard({ p, showCue = true }: { p: Phrase; showCue?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-ink">{p.de}</div>
        <button onClick={() => speak(p.de)} className="shrink-0 rounded-full p-1 text-muted hover:bg-black/5 dark:hover:bg-white/10" aria-label="Read aloud">
          <Volume2 className="size-4" />
        </button>
      </div>
      <div className="text-[13px] text-muted">{p.en}</div>
      {showCue && (
        <div className="mt-2 border-t border-line pt-2 text-[13px] text-ink/80">
          <b>When:</b> {p.cue}
        </div>
      )}
      <div className="mt-1 flex items-start gap-1.5 text-[13px] text-ink/80">
        <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-brand-text" />
        <span>
          {p.note} <span className="text-muted">({registerExplain(p)})</span>
        </span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- intro card */

export function PIntroView({ ex, onResult }: { ex: PIntro; onResult: (r: ExerciseResult) => void }) {
  const p = ex.phrase
  const autoSpeak = useProgress((s) => s.settings.autoSpeak)
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 400)
    const s = autoSpeak ? setTimeout(() => speak(p.de), 350) : undefined
    return () => {
      clearTimeout(t)
      if (s) clearTimeout(s)
    }
  }, [p, autoSpeak])
  const done = () => onResult({ correct: true, neutral: true, feedback: { correct: true } })
  useKeys((e) => {
    if (e.key === 'Enter' && armed && !e.repeat) {
      e.preventDefault()
      done()
    }
  }, true)

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-1 text-xs font-black tracking-wider text-brand-text uppercase">
          <Sparkles className="size-3.5" /> New phrase
        </span>
        <LevelChip level={p.lvl} />
        <RegisterChip reg={p.reg} />
      </div>
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl border-2 border-line bg-surface p-5 md:p-6">
        <div className="flex items-start gap-2 rounded-2xl bg-surface-2 px-4 py-3 text-[15px] font-bold text-ink/80">
          <MessageSquareQuote className="mt-0.5 size-5 shrink-0 text-brand-text" />
          <span>
            <span className="text-xs font-black tracking-wider text-muted uppercase">
              {SITUATIONS[p.sit].en} · {FUNCTIONS[p.fn]}
            </span>
            <br />
            {p.cue}
          </span>
        </div>
        <div className="mt-5 flex items-start gap-2">
          <h1 className="text-[28px] leading-tight font-black md:text-[34px]">{p.de}</h1>
          <button onClick={() => speak(p.de)} className="mt-1 shrink-0 rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Read aloud">
            <Volume2 className="size-6" />
          </button>
        </div>
        <div className="mt-1 text-lg font-bold text-muted">{p.en}</div>
        <div className="mt-5 flex items-start gap-2 text-[15px] font-semibold text-ink/80">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-text" />
          <span>
            <span className="font-black text-ink">Good to know: </span>
            {p.note}
          </span>
        </div>
        <div className="mt-3 text-sm font-bold text-muted">{registerExplain(p)}</div>
      </motion.div>
      <div className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-line bg-bg px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:py-6">
        <div className="mx-auto flex max-w-3xl justify-end">
          <Button size="lg" className="w-full md:w-48" onClick={done} autoFocus>
            Got it <Kbd>↵</Kbd>
          </Button>
        </div>
      </div>
    </div>
  )
}

/* --------------------------------------------------------- multiple choice */

export function PChoiceView({ ex, locked, onResult }: { ex: PChoice; locked: boolean; onResult: (r: ExerciseResult) => void }) {
  const p = ex.phrase
  const markKey = useProgress((s) => s.markKey)
  const t0 = useRef(0)
  const [picked, setPicked] = useState<string | null>(null)
  useEffect(() => {
    t0.current = performance.now()
  }, [ex.id])

  const choose = (o: string) => {
    if (locked || picked) return
    setPicked(o)
    const correct = o === ex.answer
    markKey(p.key, correct, performance.now() - t0.current)
    onResult({
      correct,
      feedback: {
        correct,
        // the phrase card below shows German + English, so only the register answer needs a headline
        solution: ex.skill === 'register' ? ex.answer : undefined,
        phrase: p,
        speakText: p.de,
      },
      retry: correct ? undefined : [{ ...ex, id: `${ex.id}r${Date.now()}`, retry: true }],
      missedPhrases: correct ? undefined : [p],
    })
  }
  useKeys((e) => {
    const k = parseInt(e.key, 10)
    if (k >= 1 && k <= ex.options.length) choose(ex.options[k - 1])
  }, !locked && !picked)

  const isGerman = ex.skill === 'respond'
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-black tracking-wider text-muted uppercase">{ex.title}</span>
        <LevelChip level={p.lvl} />
        {ex.retry && <span className="rounded-lg bg-gold/20 px-2 py-1 text-xs font-black text-[#8a5a00] uppercase dark:text-gold">Previous mistake</span>}
      </div>
      {ex.skill === 'respond' ? (
        <div className="mb-6 rounded-3xl border-2 border-line bg-surface p-5">
          <div className="text-xs font-black tracking-wider text-muted uppercase">{ex.context}</div>
          <div className="mt-1 text-[20px] leading-snug font-black md:text-[24px]">{ex.prompt}</div>
        </div>
      ) : (
        <div className="mb-6 flex items-start justify-center gap-2 py-4 text-center">
          <div className="text-[26px] leading-snug font-black md:text-[32px]">„{ex.prompt}“</div>
          <button onClick={() => speak(p.de)} className="mt-1 shrink-0 rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Read aloud">
            <Volume2 className="size-5" />
          </button>
        </div>
      )}
      <div className="grid gap-3">
        {ex.options.map((o, i) => {
          const show = picked !== null
          const state = !show ? 'border-line bg-surface' : o === ex.answer ? 'border-ok bg-ok-soft' : o === picked ? 'border-bad bg-bad-soft' : 'border-line bg-surface opacity-50'
          return (
            <motion.button
              key={o}
              onClick={() => choose(o)}
              disabled={!!picked || locked}
              animate={show && o === picked && o !== ex.answer ? { x: [0, -8, 8, -6, 6, 0] } : {}}
              className={`btn3d flex min-h-14 items-center justify-between gap-3 border-2 border-b-4 px-4 py-3 text-left ${isGerman ? 'text-[17px]' : 'text-[16px]'} font-extrabold ${state}`}
            >
              <span>{o}</span>
              <Kbd>{i + 1}</Kbd>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- word order */

export function POrderView({ ex, locked, onResult }: { ex: POrder; locked: boolean; onResult: (r: ExerciseResult) => void }) {
  const p = ex.phrase
  const markKey = useProgress((s) => s.markKey)
  const t0 = useRef(0)
  // indexes into ex.tiles, in the order the learner placed them
  const [placed, setPlaced] = useState<number[]>([])
  const [checked, setChecked] = useState<boolean | null>(null)
  useEffect(() => {
    t0.current = performance.now()
  }, [ex.id])

  const add = (i: number) => {
    if (locked || checked !== null || placed.includes(i)) return
    setPlaced((s) => [...s, i])
  }
  const remove = (pos: number) => {
    if (locked || checked !== null) return
    setPlaced((s) => s.filter((_, j) => j !== pos))
  }
  const check = () => {
    if (checked !== null || placed.length !== ex.tiles.length) return
    const built = placed.map((i) => ex.tiles[i])
    const correct = built.join(' ') === ex.answer.join(' ')
    setChecked(correct)
    markKey(p.key, correct, performance.now() - t0.current)
    onResult({
      correct,
      feedback: { correct, phrase: p, speakText: p.de },
      retry: correct ? undefined : [{ ...ex, id: `${ex.id}r${Date.now()}`, retry: true }],
      missedPhrases: correct ? undefined : [p],
    })
  }
  useKeys((e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      check()
    } else if (e.key === 'Backspace') {
      setPlaced((s) => s.slice(0, -1))
    } else {
      const k = parseInt(e.key, 10)
      if (k >= 1 && k <= ex.tiles.length) {
        // number keys pick the k-th tile that is still in the bank
        const free = ex.tiles.map((_, i) => i).filter((i) => !placed.includes(i))
        if (free[k - 1] !== undefined) add(free[k - 1])
      }
    }
  }, !locked && checked === null)

  const tile = 'btn3d border-2 border-b-4 border-line bg-surface px-3 py-2 text-[17px] font-extrabold'
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-black tracking-wider text-muted uppercase">Build the sentence</span>
        <LevelChip level={p.lvl} />
        {ex.retry && <span className="rounded-lg bg-gold/20 px-2 py-1 text-xs font-black text-[#8a5a00] uppercase dark:text-gold">Previous mistake</span>}
      </div>
      <h1 className="mb-2 text-[22px] leading-tight font-black md:text-[26px]">Put the words in the right order</h1>
      <p className="mb-6 text-[17px] font-bold text-muted">„{p.en}“</p>

      <div
        className={`flex min-h-[7.5rem] flex-wrap content-start items-start gap-2 border-y-2 py-4 ${
          checked === null ? 'border-line' : checked ? 'border-ok' : 'border-bad'
        }`}
      >
        <span className="rounded-xl bg-brand-soft px-3 py-2 text-[17px] font-extrabold text-brand-text">{ex.first}</span>
        <AnimatePresence>
          {placed.map((i, pos) => (
            <motion.button
              key={i}
              layout
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              onClick={() => remove(pos)}
              className={tile}
            >
              {ex.tiles[i]}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {ex.tiles.map((t, i) => {
          const used = placed.includes(i)
          return (
            <button key={i} onClick={() => add(i)} disabled={used || checked !== null} className={`${tile} ${used ? 'invisible' : ''}`}>
              {t}
            </button>
          )
        })}
      </div>

      {checked === null && (
        <div className="fixed inset-x-0 bottom-0 border-t-2 border-line bg-bg px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:py-6">
          <div className="mx-auto flex max-w-3xl justify-end">
            <Button size="lg" className="w-full md:w-48" disabled={placed.length !== ex.tiles.length} onClick={check}>
              Check <Kbd>↵</Kbd>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
