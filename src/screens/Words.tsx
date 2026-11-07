import { AnimatePresence, motion } from 'motion/react'
import { Search, Volume2, X } from 'lucide-react'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { NounDetails } from '../components/Feedback'
import { GrowthIcon } from '../components/Mascot'
import { SectionTitle, genderText } from '../components/ui'
import { ARTICLE, GENDERS, nouns, type Gender, type Noun } from '../data/nouns'
import { sayNoun } from '../lib/audio'
import { MASTERY_LABEL, mastery, retrievability } from '../lib/srs'
import { useProgress } from '../store/progress'
import { VerbWords } from './VerbWords'
import { Phrasebook } from './Phrasebook'

type Status = 'all' | 'learned' | 'new' | 'weak'
const ROW = 60

function fold(s: string) {
  return s.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
}

function NounWords() {
  const cards = useProgress((s) => s.cards)
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q)
  const [g, setG] = useState<Gender | 'all'>('all')
  const [status, setStatus] = useState<Status>('all')
  const [open, setOpen] = useState<Noun | null>(null)
  const [reveal, setReveal] = useState(false)

  const list = useMemo(() => {
    const fq = fold(dq.trim())
    const now = Date.now()
    return nouns().filter((n) => {
      if (g !== 'all' && n.g !== g) return false
      const c = cards[n.key]
      if (status === 'learned' && !c?.r) return false
      if (status === 'new' && c?.r) return false
      if (status === 'weak' && !(c?.r && (retrievability(c, now) < 0.8 || c.ko > c.ok / 3))) return false
      if (fq && !fold(n.w).includes(fq) && !n.e.toLowerCase().includes(fq)) return false
      return true
    })
  }, [dq, g, status, cards])

  const learned = useMemo(() => nouns().filter((n) => cards[n.key]?.r).length, [cards])

  return (
    <div className="pb-24">
      <SectionTitle sub={`${learned.toLocaleString()} of ${nouns().length.toLocaleString()} nouns planted, ordered by how common they are.`}>Word garden</SectionTitle>

      <div className="sticky top-0 z-10 -mx-4 bg-bg/95 px-4 pt-1 pb-3 backdrop-blur md:top-0">
        <label className="flex h-12 items-center gap-2 rounded-2xl border-2 border-line bg-surface-2 px-3 focus-within:border-brand">
          <Search className="size-5 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search German or English…"
            className="h-full flex-1 bg-transparent font-bold outline-none placeholder:text-muted focus-visible:outline-none"
            aria-label="Search words"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search">
              <X className="size-5 text-muted" />
            </button>
          )}
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['all', ...GENDERS] as const).map((x) => (
            <Chip key={x} on={g === x} onClick={() => setG(x)}>
              {x === 'all' ? 'All' : ARTICLE[x]}
            </Chip>
          ))}
          <span className="mx-1 w-px bg-line" />
          {(['all', 'learned', 'new', 'weak'] as Status[]).map((x) => (
            <Chip key={x} on={status === x} onClick={() => setStatus(x)}>
              {x === 'all' ? 'Any' : x[0].toUpperCase() + x.slice(1)}
            </Chip>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-sm font-bold text-muted">
          <span>{list.length.toLocaleString()} words</span>
          <button onClick={() => setReveal((r) => !r)} className="rounded-lg px-2 py-1 hover:bg-surface-2">
            {reveal ? 'Hide' : 'Show'} articles of unlearned words
          </button>
        </div>
      </div>

      <VirtualList items={list} render={(n) => <WordRow n={n} stage={mastery(cards[n.key])} learned={reveal || !!cards[n.key]?.r} onOpen={() => setOpen(n)} />} />

      <AnimatePresence>{open && <WordSheet n={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

export function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border-2 px-3 py-1 text-sm font-black ${on ? 'border-brand bg-brand-soft text-brand-text' : 'border-line text-muted hover:bg-surface-2'}`}
    >
      {children}
    </button>
  )
}

function VirtualList<T>({ items, render }: { items: T[]; render: (t: T) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState([0, 40])
  useEffect(() => {
    const update = () => {
      const el = ref.current
      if (!el) return
      const top = -el.getBoundingClientRect().top
      const first = Math.max(0, Math.floor(top / ROW) - 10)
      const count = Math.ceil(window.innerHeight / ROW) + 20
      setRange([first, first + count])
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [items.length])
  const [a, b] = range
  return (
    <div ref={ref} style={{ height: items.length * ROW, position: 'relative' }}>
      {items.slice(a, b).map((it, i) => (
        <div key={a + i} style={{ position: 'absolute', top: (a + i) * ROW, left: 0, right: 0, height: ROW }}>
          {render(it)}
        </div>
      ))}
    </div>
  )
}

function WordRow({ n, stage, learned, onOpen }: { n: Noun; stage: number; learned: boolean; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex h-full w-full items-center gap-3 border-b border-line px-1 text-left hover:bg-surface-2">
      <span className="w-12 shrink-0 text-right text-xs font-bold text-muted tabular-nums">#{n.rank + 1}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-extrabold">
          <span className={learned ? genderText[n.g] : 'text-muted/60'}>{learned ? ARTICLE[n.g] : '···'}</span> {n.w}
        </span>
        <span className="block truncate text-sm font-semibold text-muted">{n.e}</span>
      </span>
      <span title={MASTERY_LABEL[stage]}>
        <GrowthIcon stage={stage} size={26} />
      </span>
    </button>
  )
}

function WordSheet({ n, onClose }: { n: Noun; onClose: () => void }) {
  const c = useProgress((s) => s.cards[n.key])
  const r = retrievability(c)
  const stage = mastery(c)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <motion.div initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-t-3xl bg-surface p-5 md:rounded-3xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-black tracking-widest text-muted uppercase">#{n.rank + 1} most common</div>
            <div className="mt-1 flex items-center gap-2 text-4xl font-black">
              <span className={genderText[n.g]}>{ARTICLE[n.g]}</span> {n.w}
              <button onClick={() => sayNoun(n, ARTICLE[n.g])} className="rounded-full p-2 text-muted hover:bg-surface-2" aria-label="Pronounce">
                <Volume2 className="size-6" />
              </button>
            </div>
            {n.alt.length > 0 && <div className="text-sm font-bold text-muted">also: {n.alt.map((a) => ARTICLE[a]).join(', ')}</div>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2" aria-label="Close">
            <X className="size-6" />
          </button>
        </div>
        <div className="mt-4">
          <NounDetails noun={n} />
        </div>
        {(n.gen || n.acc) && (
          <div className="mt-3 text-sm font-bold text-muted">
            {n.gen && <>Genitive: des {n.gen.split(' ')[0]} </>}
            {n.acc && <>· Accusative: den {n.acc} (weak noun)</>}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
          <GrowthIcon stage={stage} size={40} />
          <div className="flex-1 text-sm font-bold">
            <div className="text-base font-black">{MASTERY_LABEL[stage]}</div>
            {c?.r ? (
              <div className="text-muted">
                {c.ok} right · {c.ko} wrong · recall {Math.round(r * 100)}% · next review {new Date(c.d).toLocaleDateString()}
              </div>
            ) : (
              <div className="text-muted">Not planted yet. It appears in unit {Math.floor(n.rank / 50) + 1}.</div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

/** Words tab: the 12,000-noun garden and the IT verb dictionary. */
export function Words() {
  const [kind, setKind] = useState<'nouns' | 'verbs' | 'phrases'>(() => {
    try {
      return (sessionStorage.getItem('seedlang-words') as 'nouns' | 'verbs' | 'phrases') || 'nouns'
    } catch {
      return 'nouns'
    }
  })
  const choose = (k: 'nouns' | 'verbs' | 'phrases') => {
    setKind(k)
    try {
      sessionStorage.setItem('seedlang-words', k)
    } catch {
      /* ignore */
    }
  }
  return (
    <div>
      <div className="mb-4 inline-flex gap-1 rounded-2xl border-2 border-line bg-surface-2 p-1">
        {(['nouns', 'verbs', 'phrases'] as const).map((k) => (
          <button
            key={k}
            onClick={() => choose(k)}
            className={`rounded-xl px-4 py-1.5 text-sm font-black ${kind === k ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
          >
            {k === 'nouns' ? 'Nouns' : k === 'verbs' ? 'IT verbs' : 'Phrases'}
          </button>
        ))}
      </div>
      {kind === 'nouns' ? <NounWords /> : kind === 'verbs' ? <VerbWords /> : <Phrasebook />}
    </div>
  )
}
