import { motion } from 'motion/react'
import { BookOpen, Lightbulb, Sparkles, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ARTICLE, GENDERS } from '../data/nouns'
import { SITUATIONS, exampleParts, exampleText, perfekt, withRefl, type Verb } from '../data/verbs'
import { preload, say, speak } from '../lib/audio'
import { verbBase, verbUtterance } from '../lib/voice'
import { SKILL_LABEL, type VChoice, type VIntro } from '../lib/verbSession'
import { useProgress } from '../store/progress'
import type { ExerciseResult } from './exercises'
import { Speaker } from './Speaker'
import { Button, Kbd, genderVariant } from './ui'

const LEVEL_COLOR: Record<string, string> = { A1: 'var(--brand)', A2: 'var(--der)', B1: 'var(--das)', B2: 'var(--flame)' }

export function LevelChip({ level }: { level: string }) {
  return (
    <span className="rounded-lg px-2 py-0.5 text-xs font-black text-white" style={{ background: LEVEL_COLOR[level] }}>
      {level}
    </span>
  )
}

export function SituationChip({ sit }: { sit: Verb['sit'] }) {
  return <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-xs font-black text-muted">{SITUATIONS[sit].en}</span>
}

const sayVerb = (v: Verb) => void say(verbBase(v))
/** What a drill pronounces: its answer phrase ("er hat umgesetzt"), or the infinitive. */
const drillVoice = (ex: VChoice) => (ex.say ? verbUtterance(ex.verb, ex.say) : verbBase(ex.verb))

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

/** The forms worth memorising, e.g. "er setzt um · setzte um · hat umgesetzt". */
export function KeyForms({ v }: { v: Verb }) {
  const items = [
    { label: 'er/sie/es', form: withRefl(v, v.pres[2], 2), say: `er ${withRefl(v, v.pres[2], 2)}` },
    v.pret[2] && !v.modal ? { label: 'Präteritum', form: v.pret[2], say: `er ${withRefl(v, v.pret[2], 2)}` } : null,
    v.pp ? { label: 'Perfekt', form: perfekt(v), say: `er ${perfekt(v)}` } : null,
  ].filter(Boolean) as { label: string; form: string; say: string }[]
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl border-2 border-line px-2 py-2 text-center">
          <div className="text-[11px] font-black tracking-wider text-muted uppercase">{i.label}</div>
          <div className="mt-0.5 font-black">
            {i.form}
            <Speaker u={verbUtterance(v, i.say)} size="sm" label={`Hear ${i.say}`} caption={false} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------- intro card */

export function VIntroView({ ex, onResult }: { ex: VIntro; onResult: (r: ExerciseResult) => void }) {
  const v = ex.verb
  const autoSpeak = useProgress((s) => s.settings.autoSpeak)
  useEffect(() => {
    if (autoSpeak) {
      const t = setTimeout(() => sayVerb(v), 350)
      return () => clearTimeout(t)
    }
  }, [v, autoSpeak])

  const done = () => onResult({ correct: true, neutral: true, feedback: { correct: true } })
  // ignore an Enter that is still held from the previous screen
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 400)
    return () => clearTimeout(t)
  }, [])
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
          <Sparkles className="size-3.5" /> New verb
        </span>
        <LevelChip level={v.lvl} />
        <SituationChip sit={v.sit} />
      </div>

      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-3xl border-2 border-line bg-surface p-5 md:p-6">
        <div className="flex items-center gap-3">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">{v.inf}</h1>
          <button onClick={() => sayVerb(v)} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Hear the verb">
            <Volume2 className="size-6" />
          </button>
        </div>
        <div className="mt-1 text-lg font-bold text-muted">{v.en}</div>
        {v.gov && (
          <div className="mt-2 inline-flex rounded-lg bg-surface-2 px-2 py-0.5 text-sm font-black text-ink/80">
            {v.inf} + {v.gov}
          </div>
        )}

        <div className="mt-5 rounded-2xl bg-brand-soft/60 p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg leading-snug font-bold">
              {exampleParts(v).map((p, i) =>
                p.verb ? (
                  <b key={i} className="text-brand-text">
                    {p.text}
                  </b>
                ) : (
                  <span key={i}>{p.text}</span>
                ),
              )}
            </p>
            <button onClick={() => speak(exampleText(v))} className="shrink-0 rounded-full p-1.5 text-muted hover:bg-black/5 dark:hover:bg-white/10" aria-label="Read the example aloud">
              <Volume2 className="size-5" />
            </button>
          </div>
          <p className="mt-1 text-[15px] font-semibold text-muted">{v.exEn}</p>
        </div>

        <div className="mt-4 flex items-start gap-2 text-[15px] font-semibold text-ink/80">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-text" />
          <span>
            <span className="font-black text-ink">When to use it: </span>
            {v.note}
          </span>
        </div>

        <div className="mt-5">
          <KeyForms v={v} />
        </div>
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

/* ------------------------------------------------------- multiple-choice drill */

export function VChoiceView({ ex, locked, onResult }: { ex: VChoice; locked: boolean; onResult: (r: ExerciseResult) => void }) {
  const v = ex.verb
  const markKey = useProgress((s) => s.markKey)
  const t0 = useRef(0)
  const [picked, setPicked] = useState<string | null>(null)
  useEffect(() => {
    t0.current = performance.now()
    preload(drillVoice(ex))
  }, [v, ex])

  const choose = (o: string) => {
    if (locked || picked) return
    setPicked(o)
    const correct = o === ex.answer
    markKey(v.key, correct, performance.now() - t0.current)
    onResult({
      correct,
      feedback: { correct, solution: ex.solution, note: ex.explain === v.note ? undefined : ex.explain, verb: v, voice: drillVoice(ex) },
      retry: correct ? undefined : [{ ...ex, id: `${ex.id}r${Date.now()}`, retry: true }],
      missedVerbs: correct ? undefined : [v],
    })
  }

  useKeys((e) => {
    const k = parseInt(e.key, 10)
    if (k >= 1 && k <= ex.options.length) choose(ex.options[k - 1])
    if (ex.skill === 'aux') {
      if (e.key.toLowerCase() === 'h') choose('hat')
      if (e.key.toLowerCase() === 's' || e.key.toLowerCase() === 'i') choose('ist')
    }
  }, !locked && !picked)

  const isArticle = ex.skill === 'noun'
  const long = ex.options.some((o) => o.length > 22)
  const ok = picked === ex.answer

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-lg bg-surface-2 px-2 py-1 text-xs font-black tracking-wider text-muted uppercase">{SKILL_LABEL[ex.skill]}</span>
        <LevelChip level={v.lvl} />
        {ex.retry && <span className="rounded-lg bg-gold/20 px-2 py-1 text-xs font-black text-[#8a5a00] uppercase dark:text-gold">Previous mistake</span>}
      </div>
      <h1 className="mb-6 text-[22px] leading-tight font-black md:text-[26px]">{ex.title}</h1>

      <div className="flex flex-col items-center py-4 text-center md:py-8">
        <div className={`font-black leading-snug ${ex.skill === 'context' ? 'text-[24px] sm:text-[30px]' : 'text-[32px] sm:text-[44px]'}`}>
          {ex.line.map((part, i) =>
            part === null ? (
              <span
                key={i}
                className={`mx-1 inline-block min-w-[3.2em] rounded-xl border-b-4 px-2 align-baseline ${
                  picked ? (ok ? 'border-ok bg-ok-soft text-ok-text' : 'border-bad bg-bad-soft text-bad-text') : 'border-dotted border-line-strong'
                }`}
              >
                {picked === null
                  ? '\u00a0'
                  : ok && ex.skill === 'context'
                    ? exampleParts(v)
                        .filter((p) => p.verb)
                        .map((p) => p.text)
                        .join(' … ')
                    : picked}
              </span>
            ) : (
              <span key={i}>{part}</span>
            ),
          )}
        </div>
        {ex.sub && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[15px] font-bold text-muted">
            {ex.skill !== 'context' && <BookOpen className="size-4" />}
            {ex.sub}
          </div>
        )}
      </div>

      {isArticle ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          {GENDERS.map((g, i) => (
            <Button
              key={g}
              variant={genderVariant(g)}
              size="custom"
              className="h-20 text-[28px] font-black"
              disabled={!!picked || locked}
              data-pressed={picked === ARTICLE[g]}
              onClick={() => choose(ARTICLE[g])}
            >
              {ARTICLE[g]} <Kbd>{i + 1}</Kbd>
            </Button>
          ))}
        </div>
      ) : (
        <div className={`mt-4 grid gap-3 ${ex.options.length === 2 ? 'grid-cols-2' : long ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {ex.options.map((o, i) => {
            const show = picked !== null
            const state = !show
              ? 'border-line bg-surface'
              : o === ex.answer
                ? 'border-ok bg-ok-soft'
                : o === picked
                  ? 'border-bad bg-bad-soft'
                  : 'border-line bg-surface opacity-50'
            return (
              <motion.button
                key={o}
                onClick={() => choose(o)}
                disabled={!!picked || locked}
                animate={show && o === picked && o !== ex.answer ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                className={`btn3d flex min-h-16 items-center justify-between gap-3 border-2 border-b-4 px-4 py-3 text-left text-[18px] font-extrabold ${state}`}
              >
                <span>{o}</span>
                <Kbd>{ex.skill === 'aux' ? (o === 'hat' ? 'H' : 'S') : i + 1}</Kbd>
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}
