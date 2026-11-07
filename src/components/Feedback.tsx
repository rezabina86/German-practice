import { motion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { Check, Lightbulb, Puzzle, TriangleAlert, Volume2, X } from 'lucide-react'
import { ARTICLE, type Noun } from '../data/nouns'
import { exampleParts, exampleText, type Verb } from '../data/verbs'
import type { Phrase } from '../data/phrases'
import { PhraseCard } from './phraseExercises'
import { hintFor } from '../lib/rules'
import { sayNoun, speak } from '../lib/audio'
import { Button, Kbd, genderText } from './ui'
import { useProgress } from '../store/progress'

const PRAISE = ['Richtig!', 'Super!', 'Genau!', 'Prima!', 'Toll!', 'Klasse!', 'Ausgezeichnet!', 'Perfekt!']

export interface FeedbackData {
  correct: boolean
  /** the headline answer, e.g. "die Lampe" */
  answer?: { article: string; word: string; g: Noun['g'] }
  noun?: Noun
  /** extra explanation (case reasoning, select-all summary) */
  note?: string
  sentence?: string
  /** accepted, but a different article is standard */
  altNote?: string
  /** what to pronounce: a noun with its article, in a native speaker's voice */
  voice?: { noun: { w: string; au?: string }; article?: string; form?: string }
  /** verb drills: the full correct phrase and the verb to explain */
  solution?: string
  verb?: Verb
  /** consulting phrases: explanation card + text read aloud */
  phrase?: Phrase
  speakText?: string
}

export function VerbExample({ verb, compact = false }: { verb: Verb; compact?: boolean }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="text-ink">
          {exampleParts(verb).map((p, i) =>
            p.verb ? (
              <b key={i} className="text-brand-text">
                {p.text}
              </b>
            ) : (
              <span key={i}>{p.text}</span>
            ),
          )}
        </div>
        <button onClick={() => speak(exampleText(verb))} className="shrink-0 rounded-full p-1 text-muted hover:bg-black/5 dark:hover:bg-white/10" aria-label="Read the example aloud">
          <Volume2 className="size-4" />
        </button>
      </div>
      <div className="text-[13px] text-muted">{verb.exEn}</div>
      {!compact && verb.note && (
        <div className="mt-2 flex items-start gap-1.5 border-t border-line pt-2 text-[13px] text-ink/80">
          <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-brand-text" />
          <span>{verb.note}</span>
        </div>
      )}
    </div>
  )
}

export function NounDetails({ noun, compact = false }: { noun: Noun; compact?: boolean }) {
  const hint = hintFor(noun)
  return (
    <div className="space-y-2 text-[15px] font-semibold">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-ink/80">
        <span>
          <span className="text-muted">Meaning </span>
          {noun.e}
          {noun.e2 && !compact ? <span className="text-muted">; {noun.e2}</span> : null}
        </span>
        {noun.p && noun.p !== '-' && (
          <span>
            <span className="text-muted">Plural </span>
            <span className="text-die">die</span> {noun.p}
          </span>
        )}
      </div>
      {hint && (
        <div
          className={`flex items-start gap-2 rounded-xl px-3 py-2 ${
            hint.kind === 'exception' ? 'bg-gold/15 text-[#8a5a00] dark:text-gold' : 'bg-brand-soft text-brand-text'
          }`}
        >
          {hint.kind === 'compound' ? (
            <Puzzle className="mt-0.5 size-4 shrink-0" />
          ) : hint.kind === 'exception' ? (
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          ) : (
            <Lightbulb className="mt-0.5 size-4 shrink-0" />
          )}
          <span>
            {hint.kind === 'compound' && hint.compound ? (
              <>
                {hint.compound.prefix} + <b className={genderText[hint.compound.head.g]}>{ARTICLE[hint.compound.head.g]} {hint.compound.head.w}</b>. In
                compounds the last part decides the article.
              </>
            ) : (
              hint.text
            )}
          </span>
        </div>
      )}
      {noun.homo.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2 text-ink/80">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-flame" />
          <span>
            Careful: <b>{noun.homo.map((g) => ARTICLE[g]).join(' / ')} {noun.w}</b> exists too, with a different meaning.
          </span>
        </div>
      )}
      {noun.x && !compact && (
        <div className="rounded-xl bg-surface-2 px-3 py-2">
          <div className="text-ink">„{noun.x}“</div>
          <div className="text-[13px] text-muted">{noun.xe}</div>
        </div>
      )}
    </div>
  )
}

export function FeedbackSheet({ data, onContinue, seed }: { data: FeedbackData; onContinue: () => void; seed: number }) {
  const autoSpeak = useProgress((s) => s.settings.autoSpeak)
  const { correct, answer, noun } = data
  const title = correct ? PRAISE[seed % PRAISE.length] : 'Not quite'
  const say = data.sentence ?? (answer ? `${answer.article} ${answer.word}` : '')
  const play = () => {
    if (data.speakText) speak(data.speakText)
    else if (data.voice) sayNoun(data.voice.noun, data.voice.article, data.voice.form)
    else if (say) speak(say)
  }

  // Pronounce once, shortly after the sheet appears. (Not in onAnimationComplete: that also
  // fires when the sheet slides out on "Continue", which made every word play twice.)
  const playRef = useRef(play)
  playRef.current = play
  useEffect(() => {
    if (!autoSpeak) return
    const t = setTimeout(() => playRef.current(), 250)
    return () => clearTimeout(t)
  }, [autoSpeak])

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className={`fixed inset-x-0 bottom-0 z-40 border-t-2 ${correct ? 'border-ok/30 bg-ok-soft' : 'border-bad/30 bg-bad-soft'}`}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-h-[62vh] max-w-3xl flex-col gap-3 overflow-y-auto px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))] md:flex-row md:items-end md:gap-6 md:px-6 md:py-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.4, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className={`flex size-10 shrink-0 items-center justify-center rounded-full ${correct ? 'bg-ok' : 'bg-bad'} text-white`}
            >
              {correct ? <Check strokeWidth={4} className="size-6" /> : <X strokeWidth={4} className="size-6" />}
            </motion.div>
            <div className="min-w-0">
              <div className={`text-2xl font-black ${correct ? 'text-ok-text' : 'text-bad-text'}`}>{title}</div>
              {answer && (
                <div className="flex items-center gap-2 text-lg font-extrabold">
                  {!correct && <span className="text-sm font-bold text-bad-text">Correct answer:</span>}
                  <span>
                    <span className={genderText[answer.g]}>{answer.article}</span> {answer.word}
                  </span>
                  {(say || data.voice || data.speakText) && (
                    <button
                      onClick={play}
                      className="rounded-full p-1.5 text-muted hover:bg-black/5 dark:hover:bg-white/10"
                      aria-label="Play pronunciation"
                    >
                      <Volume2 className="size-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          {data.altNote && <p className="mt-2 text-sm font-bold text-ok-text">{data.altNote}</p>}
          {data.solution && (
            <div className="mt-1 text-xl font-black">
              {!correct && <span className="mr-2 text-sm font-bold text-bad-text">Correct answer:</span>}
              {data.solution}
            </div>
          )}
          {data.note && <p className="mt-2 text-[15px] font-bold text-ink/80">{data.note}</p>}
          {data.phrase && (
            <div className="mt-3 text-[15px] font-semibold">
              <PhraseCard p={data.phrase} showCue={!correct} />
            </div>
          )}
          {data.verb && (
            <div className="mt-3 text-[15px] font-semibold">
              <VerbExample verb={data.verb} compact={correct} />
            </div>
          )}
          {noun && (
            <div className="mt-3">
              <NounDetails noun={noun} compact={correct} />
            </div>
          )}
        </div>
        <Button variant={correct ? 'ok' : 'bad'} size="lg" className="w-full shrink-0 md:w-48" onClick={onContinue} autoFocus>
          Continue <Kbd>↵</Kbd>
        </Button>
      </div>
    </motion.div>
  )
}
