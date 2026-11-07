import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'motion/react'
import { Clock, Flame, Target, Timer, X, Zap } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FeedbackSheet, type FeedbackData } from '../components/Feedback'
import { Mascot } from '../components/Mascot'
import { CaseView, ChooseView, OddOneView, SelectAllView, type ExerciseResult } from '../components/exercises'
import { VChoiceView, VIntroView } from '../components/verbExercises'
import { PChoiceView, PIntroView, POrderView } from '../components/phraseExercises'
import type { Verb } from '../data/verbs'
import type { Phrase } from '../data/phrases'
import { Button, Kbd, ProgressBar, genderText } from '../components/ui'
import { ARTICLE, type Noun } from '../data/nouns'
import { sfx } from '../lib/audio'
import { sectionFirstNode } from '../lib/curriculum'
import type { Exercise, Session } from '../lib/session'
import { computeStreak, useProgress } from '../store/progress'
import { useUI } from '../store/ui'

const BLITZ_MS = 60_000

interface Summary {
  xp: number
  accuracy: number
  ms: number
  missed: Noun[]
  missedVerbs: Verb[]
  missedPhrases: Phrase[]
  firstTry: number
  total: number
  blitzScore?: number
  passed?: boolean
  streakBefore: number
}

export function LessonScreen({ session }: { session: Session }) {
  const close = useUI((s) => s.close)
  const finish = useProgress((s) => s.finishSession)
  const isBlitz = session.spec.kind === 'blitz'
  const [queue, setQueue] = useState<Exercise[]>(session.queue)
  const [index, setIndex] = useState(0)
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [combo, setCombo] = useState(0)
  const [comboToast, setComboToast] = useState<number | null>(null)
  const [done, setDone] = useState(0)
  const [quitAsk, setQuitAsk] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [flash, setFlash] = useState<'ok' | 'bad' | null>(null)
  const [blitzLeft, setBlitzLeft] = useState(BLITZ_MS)
  const [score, setScore] = useState(0)
  const stats = useRef({ answered: 0, correct: 0, firstTry: 0, missed: new Map<string, Noun>(), missedVerbs: new Map<string, Verb>(), missedPhrases: new Map<string, Phrase>(), start: performance.now(), score: 0 })
  const streakBefore = useMemo(() => computeStreak(useProgress.getState().days).streak, [])
  const total = session.queue.length
  const ex = queue[index]

  const complete = useCallback(() => {
    const s = stats.current
    const ms = performance.now() - s.start
    const accuracy = s.answered ? s.correct / s.answered : 0
    let xp: number
    if (isBlitz) xp = Math.max(1, Math.round(s.score / 2))
    else {
      xp = 5 + s.firstTry + (s.missed.size + s.missedVerbs.size + s.missedPhrases.size === 0 ? 5 : 0)
      if (session.spec.kind === 'checkpoint') xp = Math.round(xp * 1.5)
    }
    let passed: boolean | undefined
    if (session.passMark !== undefined) {
      passed = s.correct >= session.passMark
      if (passed && session.spec.section) useProgress.getState().unlockTo(sectionFirstNode(session.spec.section))
      if (passed && session.spec.kind === 'vPlacement' && session.spec.vnode !== undefined) useProgress.getState().unlockVerbsTo(session.spec.vnode)
      if (passed && session.spec.kind === 'pPlacement' && session.spec.pnode !== undefined) useProgress.getState().unlockPhrasesTo(session.spec.pnode)
    }
    finish({
      xp,
      ms,
      node: session.spec.kind === 'lesson' || session.spec.kind === 'checkpoint' ? session.spec.node : undefined,
      vnode: session.spec.kind === 'vLesson' ? session.spec.vnode : undefined,
      pnode: session.spec.kind === 'pLesson' ? session.spec.pnode : undefined,
    })
    if (isBlitz) useProgress.getState().setBest('blitz', s.score)
    sfx.complete()
    setSummary({
      xp,
      accuracy,
      ms,
      missed: [...s.missed.values()],
      missedVerbs: [...s.missedVerbs.values()],
      missedPhrases: [...s.missedPhrases.values()],
      firstTry: s.firstTry,
      total,
      blitzScore: isBlitz ? s.score : undefined,
      passed,
      streakBefore,
    })
  }, [finish, isBlitz, session, streakBefore, total])

  // blitz timer
  useEffect(() => {
    if (!isBlitz || summary) return
    const t0 = performance.now()
    const id = setInterval(() => {
      const left = BLITZ_MS - (performance.now() - t0)
      setBlitzLeft(left)
      if (left <= 0) {
        clearInterval(id)
        complete()
      }
    }, 100)
    return () => clearInterval(id)
  }, [isBlitz, summary, complete])

  const onResult = (r: ExerciseResult) => {
    if (r.neutral) {
      next(r)
      return
    }
    const s = stats.current
    s.answered++
    const isRetry = 'retry' in ex && ex.retry
    if (r.correct) {
      s.correct++
      if (!isRetry) s.firstTry++
      const c = combo + 1
      setCombo(c)
      sfx.correct(c)
      if (isBlitz) {
        s.score += c >= 10 ? 3 : c >= 5 ? 2 : 1
        setScore(s.score)
      }
      if (c === 5 || c === 10 || c === 20 || c === 30) {
        setComboToast(c)
        sfx.combo()
        setTimeout(() => setComboToast(null), 1400)
      }
    } else {
      setCombo(0)
      sfx.wrong()
      r.missed?.forEach((n) => s.missed.set(n.key, n))
      r.missedVerbs?.forEach((v) => s.missedVerbs.set(v.key, v))
      r.missedPhrases?.forEach((p) => s.missedPhrases.set(p.key, p))
    }

    if (isBlitz) {
      setFlash(r.correct ? 'ok' : 'bad')
      setTimeout(
        () => {
          setFlash(null)
          next(r)
        },
        r.correct ? 260 : 1100,
      )
      return
    }
    setFeedback(r.feedback)
    pending.current = r
  }

  const pending = useRef<ExerciseResult | null>(null)

  const next = (r: ExerciseResult | null) => {
    let q = queue
    const counts = !r || r.correct || session.noRetry
    if (r && !r.correct && !session.noRetry && r.retry?.length) {
      q = [...queue, ...r.retry]
      setQueue(q)
    }
    if (counts) setDone((d) => d + 1)
    setFeedback(null)
    pending.current = null
    if (index + 1 >= q.length) {
      if (isBlitz) {
        complete()
        return
      }
      complete()
      return
    }
    setIndex(index + 1)
  }

  // Enter continues from the feedback sheet
  useEffect(() => {
    if (!feedback) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        next(pending.current)
      }
    }
    // delay so the keypress that answered doesn't also continue
    const id = setTimeout(() => window.addEventListener('keydown', fn), 150)
    return () => {
      clearTimeout(id)
      window.removeEventListener('keydown', fn)
    }
  })

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQuitAsk((q) => !q)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  if (summary) return <SessionComplete summary={summary} session={session} onDone={close} />

  const progress = isBlitz ? blitzLeft / BLITZ_MS : done / total

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-bg">
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`pointer-events-none fixed inset-0 z-0 ${flash === 'ok' ? 'bg-ok-soft' : 'bg-bad-soft'}`}
          />
        )}
      </AnimatePresence>

      <header className="relative z-10 mx-auto flex w-full max-w-3xl items-center gap-4 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-2 md:pt-8">
        <button onClick={() => setQuitAsk(true)} className="rounded-full p-1.5 text-muted hover:bg-surface-2" aria-label="Quit session">
          <X className="size-7" strokeWidth={2.5} />
        </button>
        <div className="relative flex-1">
          <ProgressBar value={progress} color={isBlitz ? (blitzLeft < 10_000 ? 'var(--bad)' : 'var(--flame)') : 'var(--ok)'} />
          <AnimatePresence>
            {comboToast && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded-lg px-2 text-sm font-black whitespace-nowrap text-flame"
              >
                {comboToast} in a row!
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {isBlitz ? (
          <div className="flex min-w-16 items-center justify-end gap-1 font-black text-flame">
            <Timer className="size-5" /> {Math.ceil(Math.max(0, blitzLeft) / 1000)}s
          </div>
        ) : (
          <motion.div
            key={combo}
            initial={{ scale: combo > 1 ? 1.4 : 1 }}
            animate={{ scale: 1 }}
            className={`flex min-w-12 items-center justify-end gap-1 font-black ${combo >= 3 ? 'text-flame' : 'text-muted/50'}`}
          >
            <Flame className="size-5" fill={combo >= 3 ? 'currentColor' : 'none'} /> {combo}
          </motion.div>
        )}
      </header>

      {isBlitz && (
        <div className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between px-6 text-sm font-black text-muted">
          <span>
            Score <span className="text-xl text-ink">{score}</span>
          </span>
          <span>{combo >= 10 ? '×3' : combo >= 5 ? '×2' : '×1'} combo</span>
        </div>
      )}

      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 pt-6 pb-64 md:px-6 md:pt-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={ex.id}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: isBlitz ? 0.12 : 0.22 }}
          >
            {ex.kind === 'choose' && <ChooseView ex={ex} locked={!!feedback || !!flash} onResult={onResult} quick={isBlitz} />}
            {ex.kind === 'selectAll' && <SelectAllView ex={ex} locked={!!feedback} onResult={onResult} />}
            {ex.kind === 'oddOne' && <OddOneView ex={ex} locked={!!feedback} onResult={onResult} />}
            {ex.kind === 'case' && <CaseView ex={ex} locked={!!feedback} onResult={onResult} />}
            {ex.kind === 'vIntro' && <VIntroView ex={ex} onResult={onResult} />}
            {ex.kind === 'vChoice' && <VChoiceView ex={ex} locked={!!feedback} onResult={onResult} />}
            {ex.kind === 'pIntro' && <PIntroView ex={ex} onResult={onResult} />}
            {ex.kind === 'pChoice' && <PChoiceView ex={ex} locked={!!feedback} onResult={onResult} />}
            {ex.kind === 'pOrder' && <POrderView ex={ex} locked={!!feedback} onResult={onResult} />}
          </motion.div>
        </AnimatePresence>
        {isBlitz && flash === 'bad' && ex.kind === 'choose' && (
          <div className="mt-6 text-center text-xl font-black">
            <span className={genderText[ex.noun.g]}>{ARTICLE[ex.noun.g]}</span> {ex.noun.w}
          </div>
        )}
      </main>

      <AnimatePresence>{feedback && <FeedbackSheet key={ex.id} data={feedback} seed={index} onContinue={() => next(pending.current)} />}</AnimatePresence>

      <AnimatePresence>
        {quitAsk && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center">
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              className="w-full max-w-md rounded-t-3xl bg-surface p-6 text-center md:rounded-3xl"
            >
              <Mascot mood="sad" size={88} className="mx-auto" />
              <h3 className="mt-2 text-xl font-black">Wait, don’t go!</h3>
              <p className="mt-1 font-semibold text-muted">Answers so far are saved to your review schedule, but you won’t get XP for this session.</p>
              <div className="mt-5 flex flex-col gap-3">
                <Button size="lg" onClick={() => setQuitAsk(false)}>
                  Keep learning
                </Button>
                <Button variant="ghost" onClick={close} className="text-bad-text">
                  End session
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const t0 = performance.now()
    let raf = 0
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / ms)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function StatTile({ label, value, icon, color, delay }: { label: string; value: string; icon: React.ReactNode; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 18 }}
      className="flex-1 overflow-hidden rounded-2xl border-2"
      style={{ borderColor: color, background: color }}
    >
      <div className="py-1 text-center text-[11px] font-black tracking-wider text-white uppercase">{label}</div>
      <div className="flex items-center justify-center gap-1.5 rounded-xl bg-surface py-3 text-xl font-black" style={{ color }}>
        {icon}
        {value}
      </div>
    </motion.div>
  )
}

function SessionComplete({ summary, session, onDone }: { summary: Summary; session: Session; onDone: () => void }) {
  const xp = useCountUp(summary.xp)
  const acc = useCountUp(Math.round(summary.accuracy * 100))
  const days = useProgress((s) => s.days)
  const { streak } = computeStreak(days)
  const streakUp = streak > summary.streakBefore
  const [showStreak, setShowStreak] = useState(false)
  const failed = summary.passed === false

  useEffect(() => {
    if (failed) return
    const end = performance.now() + 900
    const colors = ['#7048E8', '#1C8FEF', '#F0437A', '#1FB866', '#FFC107']
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, disableForReducedMotion: true })
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, disableForReducedMotion: true })
      if (performance.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [failed])

  const advance = () => {
    if (streakUp && !showStreak) setShowStreak(true)
    else onDone()
  }

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  })

  const mm = Math.floor(summary.ms / 60000)
  const ss = Math.floor((summary.ms % 60000) / 1000)
  const title =
    summary.passed === true
      ? 'Section unlocked!'
      : failed
        ? 'Not quite yet'
        : session.spec.kind === 'blitz'
          ? `${summary.blitzScore} points!`
          : summary.missed.length + summary.missedVerbs.length + summary.missedPhrases.length === 0
            ? 'Perfect lesson!'
            : 'Lesson complete!'

  if (showStreak) {
    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return { label: d.toLocaleDateString('en', { weekday: 'narrow' }), on: (days[k]?.lessons ?? 0) > 0, today: i === 6 }
    })
    return (
      <div className="fixed inset-0 z-30 flex flex-col items-center justify-center bg-bg px-6 text-center">
        <motion.div initial={{ scale: 0.3, rotate: -15 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 10 }}>
          <Flame className="size-32 text-flame" fill="currentColor" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-2 text-7xl font-black text-flame">
          {streak}
        </motion.div>
        <div className="text-2xl font-black">day streak!</div>
        <div className="mt-8 flex gap-2 rounded-2xl border-2 border-line p-4">
          {week.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className={`text-xs font-black ${d.today ? 'text-flame' : 'text-muted'}`}>{d.label}</span>
              <motion.div
                initial={d.today ? { scale: 0 } : false}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className={`flex size-8 items-center justify-center rounded-full ${d.on ? 'bg-flame text-white' : 'bg-surface-2'}`}
              >
                {d.on && <Flame className="size-4" fill="currentColor" />}
              </motion.div>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-xs font-semibold text-muted">Practice every day to keep your seed growing.</p>
        <div className="fixed inset-x-0 bottom-0 border-t-2 border-line px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:py-6">
          <div className="mx-auto flex max-w-3xl justify-end">
            <Button size="lg" className="w-full md:w-48" onClick={onDone}>
              Continue <Kbd>↵</Kbd>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-bg">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-6 pt-12 pb-40 text-center">
        <Mascot mood={failed ? 'sad' : 'cheer'} size={150} />
        <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-3xl font-black text-gold-shadow md:text-4xl">
          {title}
        </motion.h1>
        {failed && <p className="mt-2 font-semibold text-muted">You need {session.passMark} of {summary.total} to skip ahead. Try again, or start from the beginning.</p>}
        {summary.passed && <p className="mt-2 font-semibold text-muted">Great — {session.spec.section?.level} is open. Jump right in.</p>}
        <div className="mt-8 flex w-full gap-3">
          <StatTile label="Total XP" value={`${xp}`} icon={<Zap className="size-5" fill="currentColor" />} color="var(--gold-shadow)" delay={0.15} />
          <StatTile label="Accuracy" value={`${acc}%`} icon={<Target className="size-5" />} color="var(--ok)" delay={0.3} />
          <StatTile label="Time" value={`${mm}:${String(ss).padStart(2, '0')}`} icon={<Clock className="size-5" />} color="var(--der)" delay={0.45} />
        </div>
        {summary.missed.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 w-full text-left">
            <div className="mb-2 text-sm font-black tracking-wider text-muted uppercase">Words to review</div>
            <div className="flex flex-wrap gap-2">
              {summary.missed.map((n) => (
                <span key={n.key} className="rounded-xl border-2 border-line px-3 py-1.5 font-bold">
                  <span className={genderText[n.g]}>{ARTICLE[n.g]}</span> {n.w}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold text-muted">These come back sooner in your reviews.</p>
          </motion.div>
        )}
        {summary.missedVerbs.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 w-full text-left">
            <div className="mb-2 text-sm font-black tracking-wider text-muted uppercase">Verbs to review</div>
            <div className="flex flex-wrap gap-2">
              {summary.missedVerbs.map((v) => (
                <span key={v.key} className="rounded-xl border-2 border-line px-3 py-1.5 font-bold">
                  {v.inf} <span className="text-muted">· {v.en}</span>
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold text-muted">They come back sooner in your verb reviews.</p>
          </motion.div>
        )}
        {summary.missedPhrases.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-8 w-full text-left">
            <div className="mb-2 text-sm font-black tracking-wider text-muted uppercase">Phrases to review</div>
            <div className="flex flex-col gap-2">
              {summary.missedPhrases.map((p) => (
                <div key={p.key} className="rounded-xl border-2 border-line px-3 py-2 font-bold">
                  {p.de} <span className="block text-sm font-semibold text-muted">{p.en}</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm font-semibold text-muted">They come back sooner in your phrase reviews.</p>
          </motion.div>
        )}
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t-2 border-line bg-bg px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:py-6">
        <div className="mx-auto flex max-w-3xl justify-end">
          <Button size="lg" className="w-full md:w-48" onClick={advance} autoFocus>
            Continue <Kbd>↵</Kbd>
          </Button>
        </div>
      </div>
    </div>
  )
}
