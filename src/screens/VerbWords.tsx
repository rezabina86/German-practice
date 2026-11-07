import { AnimatePresence, motion } from 'motion/react'
import { Lightbulb, Search, Volume2, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { VerbExample } from '../components/Feedback'
import { GrowthIcon } from '../components/Mascot'
import { LevelChip, SituationChip } from '../components/verbExercises'
import { SectionTitle, genderText } from '../components/ui'
import { ARTICLE } from '../data/nouns'
import { LEVELS, PRONOUNS, SITUATIONS, SITUATION_ORDER, perfekt, verbs, withRefl, type Level, type SituationId, type Verb } from '../data/verbs'
import { sayNoun } from '../lib/audio'
import { MASTERY_LABEL, mastery } from '../lib/srs'
import { useProgress } from '../store/progress'
import { Chip } from './Words'

const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')

export function VerbWords() {
  const cards = useProgress((s) => s.cards)
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q)
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [sit, setSit] = useState<SituationId | 'all'>('all')
  const [open, setOpen] = useState<Verb | null>(null)

  const list = useMemo(() => {
    const f = fold(dq.trim())
    return verbs().filter(
      (v) =>
        (level === 'all' || v.lvl === level) &&
        (sit === 'all' || v.sit === sit) &&
        (!f || fold(v.inf).includes(f) || v.en.toLowerCase().includes(f) || fold(v.ex).includes(f)),
    )
  }, [dq, level, sit])
  const learned = verbs().filter((v) => cards[v.key]?.r).length

  return (
    <div className="pb-24">
      <SectionTitle sub={`${learned} of ${verbs().length} verbs learned. Every verb comes with a real IT-consulting example and when to use it.`}>IT verb dictionary</SectionTitle>
      <label className="flex h-12 items-center gap-2 rounded-2xl border-2 border-line bg-surface-2 px-3 focus-within:border-brand">
        <Search className="size-5 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search verb, meaning or example…"
          className="h-full flex-1 bg-transparent font-bold outline-none placeholder:text-muted focus-visible:outline-none"
          aria-label="Search verbs"
        />
        {q && (
          <button onClick={() => setQ('')} aria-label="Clear search">
            <X className="size-5 text-muted" />
          </button>
        )}
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {(['all', ...LEVELS] as const).map((l) => (
          <Chip key={l} on={level === l} onClick={() => setLevel(l)}>
            {l === 'all' ? 'All levels' : l}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(['all', ...SITUATION_ORDER] as const).map((s) => (
          <Chip key={s} on={sit === s} onClick={() => setSit(s)}>
            {s === 'all' ? 'All situations' : SITUATIONS[s].en}
          </Chip>
        ))}
      </div>
      <div className="mt-3 mb-1 text-sm font-bold text-muted">{list.length} verbs</div>
      <div>
        {list.map((v) => (
          <button key={v.key} onClick={() => setOpen(v)} className="flex w-full items-center gap-3 border-b border-line px-1 py-2.5 text-left hover:bg-surface-2">
            <LevelChip level={v.lvl} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-extrabold">{v.inf}</span>
              <span className="block truncate text-sm font-semibold text-muted">
                {v.en} · {SITUATIONS[v.sit].en}
              </span>
            </span>
            <span title={MASTERY_LABEL[mastery(cards[v.key])]}>
              <GrowthIcon stage={mastery(cards[v.key])} size={26} />
            </span>
          </button>
        ))}
      </div>
      <AnimatePresence>{open && <VerbSheet v={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

export function VerbSheet({ v, onClose }: { v: Verb; onClose: () => void }) {
  const tenses = [
    { name: 'Präsens', forms: v.pres },
    { name: 'Präteritum', forms: v.pret },
    { name: 'Konjunktiv II', forms: v.k2 },
  ].filter((t) => t.forms.length === 6)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-t-3xl bg-surface md:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <LevelChip level={v.lvl} />
              <SituationChip sit={v.sit} />
            </div>
            <div className="mt-2 flex items-center gap-1 text-3xl font-black">
              {v.inf}
              <button onClick={() => sayNoun({ w: v.lemma, au: v.au })} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Pronounce">
                <Volume2 className="size-6" />
              </button>
            </div>
            <div className="font-bold text-muted">{v.en}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2" aria-label="Close">
            <X className="size-6" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto px-5 pb-6 text-[15px] font-semibold">
          <VerbExample verb={v} compact />
          <div className="flex items-start gap-2 rounded-xl bg-brand-soft px-3 py-2 text-brand-text">
            <Lightbulb className="mt-0.5 size-4 shrink-0" />
            <span>
              <b>When to use it:</b> {v.note}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            {v.gov && <span className="rounded-lg bg-surface-2 px-2 py-1 font-black">+ {v.gov}</span>}
            {v.sep && <span className="rounded-lg bg-surface-2 px-2 py-1 font-black">separable: {v.sep}-</span>}
            {v.refl && <span className="rounded-lg bg-surface-2 px-2 py-1 font-black">reflexive</span>}
            {v.pp && <span className="rounded-lg bg-surface-2 px-2 py-1 font-black">Perfekt: er {perfekt(v)}</span>}
            {v.noun && v.ng && (
              <span className="rounded-lg bg-surface-2 px-2 py-1 font-black">
                Noun: <span className={genderText[v.ng]}>{ARTICLE[v.ng]}</span> {v.noun}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-[15px]">
              <thead>
                <tr className="text-xs tracking-wider text-muted uppercase">
                  <th className="py-1.5 pr-3" />
                  {tenses.map((t) => (
                    <th key={t.name} className="py-1.5 pr-3 font-black">
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRONOUNS.map((p, i) => (
                  <tr key={p} className="border-t border-line">
                    <td className="py-1.5 pr-3 font-bold text-muted">{p}</td>
                    {tenses.map((t) => (
                      <td key={t.name} className="py-1.5 pr-3 font-extrabold">
                        {withRefl(v, t.forms[i], i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">Conjugation from Wiktionary (CC BY-SA). Pronunciation: native-speaker recording when available.</p>
        </div>
      </motion.div>
    </motion.div>
  )
}
