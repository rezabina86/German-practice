import { AnimatePresence, motion } from 'motion/react'
import { ChevronRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, SectionTitle, genderText } from '../components/ui'
import { ARTICLE, GENDERS, type Gender } from '../data/nouns'
import { ruleStats, type RuleStats } from '../lib/rules'
import { useUI } from '../store/ui'

export function Rules() {
  const stats = useMemo(() => ruleStats(), [])
  const [filter, setFilter] = useState<Gender | 'all'>('all')
  const [open, setOpen] = useState<RuleStats | null>(null)
  const list = stats.filter((s) => filter === 'all' || s.rule.gender === filter)
  const strong = list.filter((s) => s.reliability >= 0.85)
  const tendencies = list.filter((s) => s.reliability < 0.85 && s.reliability >= 0.6)

  return (
    <div className="pb-24">
      <SectionTitle sub="Each pattern is measured against all 12,000 words, so you can see how far to trust it.">Gender rules</SectionTitle>

      <div className="mb-6 rounded-3xl bg-brand-soft p-5">
        <div className="text-lg font-black text-brand-text">The compound rule</div>
        <p className="mt-1 text-[15px] font-semibold text-ink/80">
          A compound noun takes the gender of its <b>last</b> part:{' '}
          <span className="whitespace-nowrap">
            das Haus + <span className="text-die">die</span> Tür = <span className="text-die">die</span> Haustür
          </span>
          . Learn the short words well and thousands of long ones come free.
        </p>
      </div>

      <div className="mb-5 flex gap-2">
        {(['all', ...GENDERS] as const).map((g) => (
          <button
            key={g}
            onClick={() => setFilter(g)}
            className={`btn3d border-2 border-b-4 px-4 py-2 text-sm font-black ${
              filter === g ? 'border-brand bg-brand-soft text-brand-text' : 'border-line bg-surface text-muted'
            }`}
          >
            {g === 'all' ? 'All' : ARTICLE[g]}
          </button>
        ))}
      </div>

      <RuleGroup title="Reliable rules" sub="hold for 85% or more of words" items={strong} onOpen={setOpen} />
      <RuleGroup title="Tendencies" sub="useful guesses, with many exceptions" items={tendencies} onOpen={setOpen} />

      <AnimatePresence>{open && <RuleSheet s={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </div>
  )
}

function RuleGroup({ title, sub, items, onOpen }: { title: string; sub: string; items: RuleStats[]; onOpen: (s: RuleStats) => void }) {
  if (!items.length) return null
  return (
    <div className="mb-8">
      <div className="mb-3 flex items-baseline gap-2">
        <h3 className="text-lg font-black">{title}</h3>
        <span className="text-sm font-bold text-muted">{sub}</span>
      </div>
      <div className="grid gap-2">
        {items.map((s, i) => (
          <motion.button
            key={s.rule.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 12) * 0.025 }}
            onClick={() => onOpen(s)}
            className="flex items-center gap-4 rounded-2xl border-2 border-line bg-surface px-4 py-3 text-left hover:bg-surface-2"
          >
            <div className={`w-20 shrink-0 text-xl font-black ${genderText[s.rule.gender]}`}>{s.rule.label.length > 12 ? '' : s.rule.label}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-extrabold">
                {s.rule.label.length > 12 ? s.rule.label : ''} → <span className={genderText[s.rule.gender]}>{ARTICLE[s.rule.gender]}</span>
                <span className="ml-2 text-sm font-bold text-muted">{s.count} words</span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${s.reliability * 100}%`, background: `var(--${ARTICLE[s.rule.gender]})` }}
                />
              </div>
            </div>
            <div className="w-12 text-right text-lg font-black">{Math.round(s.reliability * 100)}%</div>
            <ChevronRight className="size-5 text-muted" />
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function RuleSheet({ s, onClose }: { s: RuleStats; onClose: () => void }) {
  const start = useUI((u) => u.start)
  const g = s.rule.gender
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface md:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div>
            <div className={`text-3xl font-black ${genderText[g]}`}>
              {s.rule.label} → {ARTICLE[g]}
            </div>
            <div className="mt-1 font-semibold text-muted">{s.rule.note}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2" aria-label="Close">
            <X className="size-6" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-surface-2 p-3 font-extrabold">
            <span className="text-3xl font-black">{Math.round(s.reliability * 100)}%</span>
            <span className="text-sm text-muted">
              of {s.count} matching words in the list take {ARTICLE[g]} ({s.matching} follow the rule, {s.exceptions.length} exceptions)
            </span>
          </div>
          <div className="mb-2 text-xs font-black tracking-widest text-muted uppercase">Examples</div>
          <div className="mb-5 flex flex-wrap gap-2">
            {s.examples.map((n) => (
              <span key={n.key} className="rounded-xl border-2 border-line px-2.5 py-1 font-bold">
                <span className={genderText[n.g]}>{ARTICLE[n.g]}</span> {n.w}
              </span>
            ))}
          </div>
          {s.exceptions.length > 0 && (
            <>
              <div className="mb-2 text-xs font-black tracking-widest text-muted uppercase">Common exceptions</div>
              <div className="flex flex-wrap gap-2">
                {s.exceptions.slice(0, 24).map((n) => (
                  <span key={n.key} className="rounded-xl border-2 border-dashed border-line-strong px-2.5 py-1 font-bold">
                    <span className={genderText[n.g]}>{ARTICLE[n.g]}</span> {n.w}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="border-t-2 border-line p-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              onClose()
              start({ kind: 'rule', ruleId: s.rule.id, title: `Rule ${s.rule.label}` })
            }}
          >
            Practice this rule
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
