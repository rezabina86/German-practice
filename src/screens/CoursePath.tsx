import { AnimatePresence } from 'motion/react'
import { BookOpen } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LEVELS, type Level } from '../data/verbs'
import { PathNodeView } from './Learn'

const OFFSETS = [0, 52, 78, 52, 0, -52, -78, -52]

export interface CourseUnit {
  index: number
  level: Level
  numberInLevel: number
  title: string
  subtitle: string
  firstNode: number
  count: number
  lessonCount: number
}

export interface CourseNode {
  index: number
  unit: number
  k: number
  isCheckpoint: boolean
  /** popover text, e.g. "New verbs: …" */
  preview: string
}

export interface LevelMeta {
  title: string
  subtitle: string
  hue: string
  grammar: string
}

/** Level → unit → lesson path shared by the verb and phrase courses. */
export function CoursePath({
  meta,
  units,
  nodes,
  frontier,
  completed,
  itemName,
  onStart,
  onPlacement,
  renderSheet,
}: {
  meta: Record<Level, LevelMeta>
  units: CourseUnit[]
  nodes: CourseNode[]
  frontier: number
  completed: Record<number, number>
  itemName: string
  onStart: (node: number) => void
  onPlacement: (level: Level) => void
  renderSheet: (unit: number, close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState<number | null>(null)
  const [sheet, setSheet] = useState<number | null>(null)
  const currentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => currentRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }), 30)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="relative pb-24" onClick={() => setOpen(null)}>
      {LEVELS.map((level) => {
        const lu = units.filter((u) => u.level === level)
        if (!lu.length) return null
        const m = meta[level]
        const ln = nodes.filter((n) => lu.some((u) => u.index === n.unit))
        const done = ln.filter((n) => completed[n.index]).length
        const locked = frontier < lu[0].firstNode
        return (
          <section key={level} className="mb-10">
            <div className="relative mb-8 overflow-hidden rounded-3xl p-5 text-white" style={{ background: locked ? 'var(--locked-shadow)' : m.hue }}>
              <div className="absolute -top-8 -right-6 size-32 rounded-full bg-white/10" />
              <div className="absolute right-16 -bottom-10 size-24 rounded-full bg-white/10" />
              <div className="relative">
                <div className="text-xs font-black tracking-widest uppercase opacity-80">
                  Level {level} · {lu.reduce((a, u) => a + u.count, 0)} {itemName} · {lu.length} units
                </div>
                <div className="mt-1 text-2xl font-black">{m.title}</div>
                <div className="text-[15px] font-bold opacity-90">{m.subtitle}</div>
                <div className="mt-2 inline-block rounded-lg bg-black/15 px-2 py-0.5 text-xs font-black">{m.grammar}</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/15">
                    <div className="h-full rounded-full bg-white" style={{ width: `${(done / ln.length) * 100}%` }} />
                  </div>
                  <span className="text-sm font-black">
                    {done}/{ln.length}
                  </span>
                </div>
                {locked && level !== 'A1' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onPlacement(level)
                    }}
                    className="btn3d mt-4 border-b-4 border-black/20 bg-white px-4 py-2 text-sm font-black tracking-wide text-ink uppercase"
                  >
                    Jump here
                  </button>
                )}
              </div>
            </div>

            {lu.map((u) => (
              <div key={u.index} className="relative mb-6" style={{ zIndex: open !== null && nodes[open]?.unit === u.index ? 10 : undefined }}>
                <div className="mb-6 flex items-center gap-3">
                  <div className="h-0.5 flex-1 bg-line" />
                  <div className="max-w-[70%] text-center">
                    <div className="text-[13px] font-black tracking-wider uppercase" style={{ color: frontier >= u.firstNode ? m.hue : 'var(--text-muted)' }}>
                      {level} · Unit {u.numberInLevel}
                    </div>
                    <div className="text-[15px] leading-tight font-black">{u.title}</div>
                    <div className="text-sm font-bold text-muted">{u.subtitle}</div>
                  </div>
                  <div className="h-0.5 flex-1 bg-line" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSheet(u.index)
                    }}
                    className="btn3d flex size-10 shrink-0 items-center justify-center border-2 border-b-4 border-line bg-surface text-muted"
                    aria-label={`Guidebook: ${u.title}`}
                  >
                    <BookOpen className="size-5" />
                  </button>
                </div>
                <div className="relative flex flex-col items-center gap-5 pt-8">
                  {nodes
                    .filter((n) => n.unit === u.index)
                    .map((n, i) => {
                      const isCurrent = n.index === frontier
                      return (
                        <div
                          key={n.index}
                          ref={isCurrent ? currentRef : undefined}
                          style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)`, zIndex: open === n.index ? 30 : isCurrent ? 5 : undefined }}
                          className="relative"
                        >
                          <PathNodeView
                            hue={m.hue}
                            state={completed[n.index] ? 'done' : n.index <= frontier ? 'open' : 'locked'}
                            isCurrent={isCurrent}
                            isOpen={open === n.index}
                            isCheckpoint={n.isCheckpoint}
                            bubble={n.index === 0 ? 'Start' : 'Next'}
                            ariaLabel={n.isCheckpoint ? `${u.title} checkpoint` : `${u.title}, lesson ${n.k + 1}`}
                            title={n.isCheckpoint ? 'Unit checkpoint' : `Lesson ${n.k + 1} of ${u.lessonCount}`}
                            body={n.preview}
                            onToggle={() => setOpen(open === n.index ? null : n.index)}
                            onStart={() => {
                              setOpen(null)
                              onStart(n.index)
                            }}
                          />
                        </div>
                      )
                    })}
                </div>
              </div>
            ))}
          </section>
        )
      })}
      <AnimatePresence>{sheet !== null && renderSheet(sheet, () => setSheet(null))}</AnimatePresence>
    </div>
  )
}
