import { Search, X } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { GrowthIcon } from '../components/Mascot'
import { PhraseCard, RegisterChip } from '../components/phraseExercises'
import { LevelChip } from '../components/verbExercises'
import { SectionTitle } from '../components/ui'
import { FUNCTIONS, phrases, type PhraseFunction, type Register } from '../data/phrases'
import { LEVELS, SITUATIONS, type Level } from '../data/verbs'
import { mastery } from '../lib/srs'
import { useProgress } from '../store/progress'
import { Chip } from './Words'

const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')

/** Searchable consulting phrasebook (Redemittel), grouped by what you want to do. */
export function Phrasebook() {
  const cards = useProgress((s) => s.cards)
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q)
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [reg, setReg] = useState<Register | 'all'>('all')
  const [fn, setFn] = useState<PhraseFunction | 'all'>('all')

  const list = useMemo(() => {
    const f = fold(dq.trim())
    return phrases().filter(
      (p) =>
        (level === 'all' || p.lvl === level) &&
        (reg === 'all' || p.reg === reg) &&
        (fn === 'all' || p.fn === fn) &&
        (!f || fold(p.de).includes(f) || p.en.toLowerCase().includes(f) || p.cue.toLowerCase().includes(f)),
    )
  }, [dq, level, reg, fn])
  const learned = phrases().filter((p) => cards[p.key]?.r).length
  const groups = (Object.keys(FUNCTIONS) as PhraseFunction[]).map((f) => ({ f, items: list.filter((p) => p.fn === f) })).filter((g) => g.items.length)

  return (
    <div className="pb-24">
      <SectionTitle sub={`${learned} of ${phrases().length} phrases learned. Search by German, English or situation, e.g. "late reply" or "outage".`}>Consulting phrasebook</SectionTitle>
      <label className="flex h-12 items-center gap-2 rounded-2xl border-2 border-line bg-surface-2 px-3 focus-within:border-brand">
        <Search className="size-5 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search phrase or situation…"
          className="h-full flex-1 bg-transparent font-bold outline-none placeholder:text-muted focus-visible:outline-none"
          aria-label="Search phrases"
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
        <span className="mx-1 w-px bg-line" />
        {(['all', 'formal', 'neutral', 'informal'] as const).map((r) => (
          <Chip key={r} on={reg === r} onClick={() => setReg(r)}>
            {r === 'all' ? 'Any register' : r[0].toUpperCase() + r.slice(1)}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {(['all', ...Object.keys(FUNCTIONS)] as ('all' | PhraseFunction)[]).map((f) => (
          <Chip key={f} on={fn === f} onClick={() => setFn(f)}>
            {f === 'all' ? 'Everything' : FUNCTIONS[f]}
          </Chip>
        ))}
      </div>
      <div className="mt-3 mb-2 text-sm font-bold text-muted">{list.length} phrases</div>
      {groups.map((g) => (
        <div key={g.f} className="mb-6">
          <h3 className="mb-2 text-lg font-black">{FUNCTIONS[g.f]}</h3>
          <div className="space-y-3 text-[15px] font-semibold">
            {g.items.map((p) => (
              <div key={p.key}>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <LevelChip level={p.lvl} />
                  <RegisterChip reg={p.reg} />
                  <span className="text-xs font-bold text-muted">{SITUATIONS[p.sit].en}</span>
                  <span className="ml-auto">
                    <GrowthIcon stage={mastery(cards[p.key])} size={22} />
                  </span>
                </div>
                <PhraseCard p={p} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
