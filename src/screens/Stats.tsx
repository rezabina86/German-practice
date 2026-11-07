import { Flame, Sprout, TreeDeciduous, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { GrowthIcon } from '../components/Mascot'
import { SectionTitle, genderText } from '../components/ui'
import { ARTICLE, GENDERS, nouns } from '../data/nouns'
import { MASTERY_LABEL, mastery } from '../lib/srs'
import { computeStreak, dayKey, useProgress } from '../store/progress'

const STAGE_COLOR = ['var(--surface-2)', '#B8F0CF', '#7FE0A8', '#34C77B', '#14904D']

export function Stats() {
  const cards = useProgress((s) => s.cards)
  const days = useProgress((s) => s.days)
  const xp = useProgress((s) => s.xp)
  const conf = useProgress((s) => s.confusion)
  const { streak } = computeStreak(days)

  const stages = useMemo(() => {
    const c = [0, 0, 0, 0, 0]
    for (const n of nouns()) c[mastery(cards[n.key])]++
    return c
  }, [cards])
  const planted = stages[1] + stages[2] + stages[3] + stages[4]

  const byGender = GENDERS.map((g, i) => {
    const row = conf.slice(i * 3, i * 3 + 3)
    const total = row.reduce((a, b) => a + b, 0)
    return { g, total, acc: total ? row[i] / total : 0, row }
  })
  // biggest off-diagonal confusion
  let worst: { from: number; to: number; n: number } | null = null
  for (let a = 0; a < 3; a++)
    for (let b = 0; b < 3; b++)
      if (a !== b && conf[a * 3 + b] > (worst?.n ?? 0)) worst = { from: a, to: b, n: conf[a * 3 + b] }

  const weeks = 18
  const heat = useMemo(() => {
    const out: { key: string; xp: number; date: Date }[] = []
    // columns are Monday–Sunday weeks, the last column is the current week
    const endSunday = new Date()
    endSunday.setDate(endSunday.getDate() + (6 - ((endSunday.getDay() + 6) % 7)))
    const startD = new Date(endSunday)
    startD.setDate(endSunday.getDate() - (weeks * 7 - 1))
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(startD)
      d.setDate(startD.getDate() + i)
      const k = dayKey(d)
      out.push({ key: k, xp: days[k]?.xp ?? 0, date: d })
    }
    return out
  }, [days])
  const maxXp = Math.max(1, ...heat.map((h) => h.xp))
  const today = dayKey()

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const k = dayKey(d)
    return { label: d.toLocaleDateString('en', { weekday: 'short' }), xp: days[k]?.xp ?? 0, acc: days[k]?.n ? days[k].ok / days[k].n : null }
  })
  const max7 = Math.max(10, ...last7.map((d) => d.xp))

  return (
    <div className="pb-24">
      <SectionTitle>Your progress</SectionTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile icon={<Flame className="size-6 text-flame" fill="currentColor" />} value={streak} label="Day streak" />
        <Tile icon={<Zap className="size-6 text-gold" fill="currentColor" />} value={xp} label="Total XP" />
        <Tile icon={<Sprout className="size-6 text-das" />} value={planted} label="Words planted" />
        <Tile icon={<TreeDeciduous className="size-6 text-das-shadow" />} value={stages[4]} label="Fully grown" />
      </div>

      <Panel title="Garden" sub="How well each word is rooted. Stability grows with every review you get right.">
        <div className="flex h-5 overflow-hidden rounded-full bg-surface-2">
          {stages.slice(1).map((c, i) => (
            <div key={i} style={{ width: `${(c / Math.max(1, planted)) * 100}%`, background: STAGE_COLOR[i + 1] }} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stages.slice(1).map((c, i) => (
            <div key={i} className="flex items-center gap-2 text-sm font-bold">
              <GrowthIcon stage={i + 1} size={26} />
              <span>
                {MASTERY_LABEL[i + 1]} <span className="text-muted">{c}</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Accuracy by gender" sub="Share of words of each gender you answered correctly.">
          <div className="space-y-3">
            {byGender.map(({ g, acc, total }) => (
              <div key={g}>
                <div className="mb-1 flex justify-between text-sm font-black">
                  <span className={genderText[g]}>{ARTICLE[g]}</span>
                  <span className="text-muted">{total ? `${Math.round(acc * 100)}% · ${total}` : '—'}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${acc * 100}%`, background: `var(--${ARTICLE[g]})` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Confusion" sub={worst ? `You most often answer ${ARTICLE[GENDERS[worst.to]]} when it’s ${ARTICLE[GENDERS[worst.from]]}.` : 'Which article you chose vs. the right one.'}>
          <div className="grid grid-cols-[auto_repeat(3,1fr)] gap-1.5 text-center text-sm font-black">
            <div />
            {GENDERS.map((g) => (
              <div key={g} className={`text-xs ${genderText[g]}`}>
                chose {ARTICLE[g]}
              </div>
            ))}
            {GENDERS.map((a, i) => {
              const rowTotal = byGender[i].total || 1
              return [
                <div key={`l${a}`} className={`pr-2 text-left text-xs leading-9 ${genderText[a]}`}>
                  is {ARTICLE[a]}
                </div>,
                ...GENDERS.map((b, j) => {
                  const v = conf[i * 3 + j]
                  const share = v / rowTotal
                  const diag = i === j
                  return (
                    <div
                      key={a + b}
                      className="flex h-9 items-center justify-center rounded-lg"
                      style={{
                        background: diag
                          ? `color-mix(in srgb, var(--ok) ${Math.round(share * 70) + 8}%, transparent)`
                          : `color-mix(in srgb, var(--bad) ${Math.round(share * 140) + (v ? 8 : 0)}%, transparent)`,
                      }}
                    >
                      {v}
                    </div>
                  )
                }),
              ]
            })}
          </div>
        </Panel>
      </div>

      <Panel title="This week">
        <div className="flex h-36 items-end gap-2">
          {last7.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="text-xs font-black text-muted">{d.xp || ''}</div>
              <div
                className="w-full rounded-t-lg"
                style={{ height: `${(d.xp / max7) * 96}px`, minHeight: d.xp ? 6 : 2, background: i === 6 ? 'var(--brand)' : 'color-mix(in srgb, var(--brand) 45%, transparent)' }}
              />
              <div className="text-xs font-black text-muted">{d.label}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Activity" sub={`Last ${weeks} weeks`}>
        <div className="overflow-x-auto">
          <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
            {heat.map((h) => (
              <div
                key={h.key}
                title={`${h.date.toLocaleDateString()}: ${h.xp} XP`}
                className={`size-4 rounded ${h.key === today ? 'ring-2 ring-brand' : ''}`}
                style={{ background: h.xp ? `color-mix(in srgb, var(--das) ${25 + (h.xp / maxXp) * 75}%, transparent)` : 'var(--surface-2)' }}
              />
            ))}
          </div>
        </div>
      </Panel>
    </div>
  )
}

function Tile({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-line bg-surface p-4">
      {icon}
      <div>
        <div className="text-xl leading-tight font-black">{value.toLocaleString()}</div>
        <div className="text-xs font-bold text-muted">{label}</div>
      </div>
    </div>
  )
}

function Panel({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-3xl border-2 border-line bg-surface p-5">
      <div className="text-lg font-black">{title}</div>
      {sub && <div className="mb-4 text-sm font-semibold text-muted">{sub}</div>}
      {!sub && <div className="mb-3" />}
      {children}
    </div>
  )
}
