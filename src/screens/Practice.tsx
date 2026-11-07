import { motion } from 'motion/react'
import { Brain, BriefcaseBusiness, Dumbbell, Layers, Timer, Trophy } from 'lucide-react'
import { LEVELS, SITUATIONS, SITUATION_ORDER, verbs, type Level } from '../data/verbs'
import { levelAt } from '../lib/verbCurriculum'
import { SKILL_LABEL, dueVerbs, learnedVerbs, type VSkill } from '../lib/verbSession'
import { MessagesSquare } from 'lucide-react'
import { phrases } from '../data/phrases'
import { phraseLevelAt } from '../lib/phraseCurriculum'
import { PSKILL_LABEL, duePhrases, learnedPhrases, type PSkill } from '../lib/phraseSession'
import type { ReactNode } from 'react'
import { Button, SectionTitle } from '../components/ui'
import { CASE_NAME, DEFINITE, type Case } from '../lib/cases'
import { dueNouns, learnedNouns } from '../lib/session'
import { useProgress } from '../store/progress'
import { useUI } from '../store/ui'

function ModeCard({
  icon,
  color,
  title,
  desc,
  meta,
  action,
  onClick,
  disabled,
  i,
}: {
  icon: ReactNode
  color: string
  title: string
  desc: string
  meta?: ReactNode
  action: string
  onClick: () => void
  disabled?: boolean
  i: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="flex flex-col rounded-3xl border-2 border-line bg-surface p-5"
    >
      <div className="flex items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: color }}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-black">{title}</div>
          <div className="text-[15px] font-semibold text-muted">{desc}</div>
          {meta && <div className="mt-1 text-sm font-black" style={{ color }}>{meta}</div>}
        </div>
      </div>
      <Button className="mt-4 w-full" variant="secondary" onClick={onClick} disabled={disabled}>
        {action}
      </Button>
    </motion.div>
  )
}

const VERB_DRILLS: { skill: VSkill; level: Level; desc: string }[] = [
  { skill: 'pres', level: 'A1', desc: 'ich setze um, du setzt um …' },
  { skill: 'aux', level: 'A2', desc: 'hat deployt or ist abgestürzt?' },
  { skill: 'pp', level: 'A2', desc: 'behoben, umgesetzt, implementiert' },
  { skill: 'pret', level: 'B1', desc: 'For written reports' },
  { skill: 'prep', level: 'B1', desc: 'sich kümmern um, warten auf …' },
  { skill: 'k2', level: 'B1', desc: 'Könnten Sie …? Ich würde …' },
  { skill: 'noun', level: 'B1', desc: 'umsetzen → die Umsetzung' },
  { skill: 'passive', level: 'B2', desc: 'Das Feature wird umgesetzt.' },
]

function VerbPractice() {
  const start = useUI((s) => s.start)
  useProgress((s) => s.cards)
  const vFrontier = useProgress((s) => s.vFrontier)
  const reached = levelAt(vFrontier)
  const due = dueVerbs().length
  const learned = learnedVerbs().length
  const max = (a: Level, b: Level) => (LEVELS.indexOf(a) > LEVELS.indexOf(b) ? a : b)

  return (
    <div className="mt-10">
      <SectionTitle sub={`${learned} of ${verbs().length} verbs learned · you've reached ${reached}. Drills unlock with your level, but you can try any of them.`}>
        <span className="inline-flex items-center gap-2">
          <BriefcaseBusiness className="size-6 text-brand-text" /> Verbs for IT consulting
        </span>
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          i={0}
          icon={<Brain className="size-7" />}
          color="var(--brand)"
          title="Verb review"
          desc="Spaced repetition across meaning, conjugation and usage."
          meta={due ? `${due} verbs due now` : learned ? 'Nothing due, so this reviews your weakest verbs' : 'Start the verb course on the Learn tab'}
          action="Review verbs"
          onClick={() => start({ kind: 'vReview', level: reached, title: 'Verb review' })}
        />
        <div className="rounded-3xl border-2 border-line bg-surface p-5">
          <div className="text-lg font-black">Practise by situation</div>
          <div className="mb-3 text-[15px] font-semibold text-muted">The verbs you need for one kind of work moment.</div>
          <div className="flex flex-wrap gap-2">
            {SITUATION_ORDER.map((sit) => (
              <button
                key={sit}
                onClick={() => start({ kind: 'vSituation', situation: sit, level: reached, title: SITUATIONS[sit].de })}
                className="rounded-xl border-2 border-line px-3 py-1.5 text-sm font-black hover:border-brand hover:bg-brand-soft hover:text-brand-text"
              >
                {SITUATIONS[sit].en}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {VERB_DRILLS.map((d) => {
          const unlocked = LEVELS.indexOf(reached) >= LEVELS.indexOf(d.level)
          return (
            <button
              key={d.skill}
              onClick={() => start({ kind: 'vDrill', skill: d.skill, level: max(reached, d.level), title: SKILL_LABEL[d.skill] })}
              className={`btn3d flex flex-col items-start border-2 border-b-4 p-3 text-left ${unlocked ? 'border-line bg-surface' : 'border-line bg-surface opacity-60'}`}
            >
              <span className="rounded-md bg-surface-2 px-1.5 text-[11px] font-black text-muted">{d.level}</span>
              <span className="mt-1 text-[15px] leading-tight font-black">{SKILL_LABEL[d.skill]}</span>
              <span className="mt-0.5 text-xs font-semibold text-muted">{d.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const PHRASE_DRILLS: { skill: PSkill; desc: string }[] = [
  { skill: 'respond', desc: 'A work scenario: pick what you would say' },
  { skill: 'order', desc: 'Tap words into German word order' },
  { skill: 'register', desc: 'Client email or team chat?' },
  { skill: 'meaning', desc: 'What does the phrase mean?' },
]

function PhrasePractice() {
  const start = useUI((s) => s.start)
  useProgress((s) => s.cards)
  const pFrontier = useProgress((s) => s.pFrontier)
  const reached = phraseLevelAt(pFrontier)
  const due = duePhrases().length
  const learned = learnedPhrases().length
  return (
    <div className="mt-10">
      <SectionTitle sub={`${learned} of ${phrases().length} phrases learned · you've reached ${reached}.`}>
        <span className="inline-flex items-center gap-2">
          <MessagesSquare className="size-6 text-brand-text" /> Consulting phrases
        </span>
      </SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          i={0}
          icon={<Brain className="size-7" />}
          color="var(--das)"
          title="Phrase review"
          desc="Spaced repetition for the phrases you've met."
          meta={due ? `${due} phrases due now` : learned ? 'Nothing due, so this reviews your weakest phrases' : 'Start the Phrasen course on the Learn tab'}
          action="Review phrases"
          onClick={() => start({ kind: 'pReview', title: 'Phrase review' })}
        />
        <div className="rounded-3xl border-2 border-line bg-surface p-5">
          <div className="text-lg font-black">Rehearse a situation</div>
          <div className="mb-3 text-[15px] font-semibold text-muted">Scenarios from one kind of work moment, before you walk in.</div>
          <div className="flex flex-wrap gap-2">
            {SITUATION_ORDER.map((sit) => (
              <button
                key={sit}
                onClick={() => start({ kind: 'pSituation', situation: sit, level: reached, title: SITUATIONS[sit].de })}
                className="rounded-xl border-2 border-line px-3 py-1.5 text-sm font-black hover:border-brand hover:bg-brand-soft hover:text-brand-text"
              >
                {SITUATIONS[sit].en}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PHRASE_DRILLS.map((d) => (
          <button
            key={d.skill}
            onClick={() => start({ kind: 'pDrill', pskill: d.skill, level: reached, title: PSKILL_LABEL[d.skill] })}
            className="btn3d flex flex-col items-start border-2 border-b-4 border-line bg-surface p-3 text-left"
          >
            <span className="text-[15px] leading-tight font-black">{PSKILL_LABEL[d.skill]}</span>
            <span className="mt-0.5 text-xs font-semibold text-muted">{d.desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function Practice() {
  const start = useUI((s) => s.start)
  useProgress((s) => s.cards) // re-render on progress
  const best = useProgress((s) => s.best.blitz)
  const due = dueNouns().length
  const learned = learnedNouns().length

  return (
    <div className="pb-24">
      <SectionTitle sub="Spaced repetition decides what you see, so practice goes where it helps most.">Practice</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <ModeCard
          i={0}
          icon={<Brain className="size-7" />}
          color="var(--brand)"
          title="Smart review"
          desc="Words the FSRS scheduler says you’re about to forget."
          meta={due ? `${due} words due now` : learned ? 'Nothing due, so this reviews your weakest words' : 'Finish a lesson first'}
          action="Review"
          onClick={() => start({ kind: 'review', title: 'Smart review' })}
          disabled={!learned}
        />
        <ModeCard
          i={1}
          icon={<Timer className="size-7" />}
          color="var(--flame)"
          title="Blitz"
          desc="60 seconds. Streaks multiply your score ×2, then ×3."
          meta={
            <span className="inline-flex items-center gap-1">
              <Trophy className="size-4" /> Best: {best}
            </span>
          }
          action="Go!"
          onClick={() => start({ kind: 'blitz', title: 'Blitz' })}
        />
        <ModeCard
          i={2}
          icon={<Dumbbell className="size-7" />}
          color="var(--bad)"
          title="Weak words"
          desc="The words you get wrong most and remember least."
          action="Train"
          onClick={() => start({ kind: 'weak', title: 'Weak words' })}
          disabled={learned < 5}
          meta={learned < 5 ? 'Learn a few words first' : undefined}
        />
        <ModeCard
          i={3}
          icon={<Layers className="size-7" />}
          color="var(--der)"
          title="All four cases"
          desc="Use articles in sentences: den, dem, des…"
          action="Mixed cases"
          onClick={() => start({ kind: 'cases', title: 'Cases' })}
        />
      </div>

      <div className="mt-8 rounded-3xl border-2 border-line bg-surface p-5">
        <div className="mb-1 text-lg font-black">Train one case</div>
        <p className="mb-4 text-[15px] font-semibold text-muted">The gender stays the same; the article changes with the case.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-center text-[15px] font-extrabold">
            <thead>
              <tr className="text-xs tracking-wider text-muted uppercase">
                <th className="py-2 text-left">Case</th>
                <th className="text-der">masc.</th>
                <th className="text-die">fem.</th>
                <th className="text-das">neut.</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {(['nom', 'akk', 'dat', 'gen'] as Case[]).map((c) => (
                <tr key={c} className="border-t-2 border-line">
                  <td className="py-2.5 text-left">{CASE_NAME[c]}</td>
                  <td className="text-der">{DEFINITE[c].m}</td>
                  <td className="text-die">{DEFINITE[c].f}</td>
                  <td className="text-das">{DEFINITE[c].n}</td>
                  <td className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => start({ kind: 'cases', caseOnly: c, title: CASE_NAME[c] })}>
                      Practice
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <VerbPractice />
      <PhrasePractice />
    </div>
  )
}
