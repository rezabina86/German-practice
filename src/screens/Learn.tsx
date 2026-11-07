import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, BookOpen, Check, Lock, Star, Trophy, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Mascot } from '../components/Mascot'
import { genderText } from '../components/ui'
import { ARTICLE, nouns } from '../data/nouns'
import {
  LESSONS_PER_UNIT,
  NODES_PER_UNIT,
  SECTIONS,
  decodeNode,
  nodeIndex,
  sectionFirstNode,
  unitWords,
  unitsOf,
  wordsForNode,
  type Section,
  type Unit,
} from '../lib/curriculum'
import { useProgress } from '../store/progress'
import { useUI } from '../store/ui'

const OFFSETS = [0, 52, 78, 52, 0, -52]

export function NounPath() {
  const frontier = useProgress((s) => s.frontier)
  const completed = useProgress((s) => s.completed)
  const start = useUI((s) => s.start)
  const [open, setOpen] = useState<number | null>(null)
  const [wordsOf, setWordsOf] = useState<Unit | null>(null)
  const currentRef = useRef<HTMLDivElement>(null)
  const [currentDir, setCurrentDir] = useState<'up' | 'down' | null>(null)
  const total = nouns().length

  const sections = useMemo(() => SECTIONS.filter((s) => s.from < total), [total])

  useEffect(() => {
    // scroll to the current lesson on first mount
    const t = setTimeout(() => currentRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }), 30)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const el = currentRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setCurrentDir(null)
      else setCurrentDir(e.boundingClientRect.top < 0 ? 'up' : 'down')
    })
    io.observe(el)
    return () => io.disconnect()
  }, [frontier])

  return (
    <div className="relative pb-24" onClick={() => setOpen(null)}>
      {sections.map((s) => (
        <SectionBlock
          key={s.id}
          section={s}
          frontier={frontier}
          completed={completed}
          open={open}
          setOpen={setOpen}
          currentRef={currentRef}
          onStart={(node) => {
            setOpen(null)
            const { isCheckpoint, unit, k } = decodeNode(node)
            start({
              kind: isCheckpoint ? 'checkpoint' : 'lesson',
              node,
              title: isCheckpoint ? `Unit ${unit + 1} checkpoint` : `Unit ${unit + 1} · Lesson ${k + 1}`,
            })
          }}
          onPlacement={() => start({ kind: 'placement', section: s, title: `Jump to ${s.level}` })}
          onWords={setWordsOf}
        />
      ))}

      <AnimatePresence>
        {currentDir && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            onClick={(e) => {
              e.stopPropagation()
              currentRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
            }}
            className="btn3d fixed right-5 bottom-24 z-20 flex size-14 items-center justify-center border-2 border-b-4 border-line-strong bg-surface text-brand-text shadow-lg lg:right-auto lg:bottom-8 lg:ml-[520px]"
            aria-label="Jump to current lesson"
          >
            {currentDir === 'up' ? <ArrowUp className="size-6" strokeWidth={3} /> : <ArrowDown className="size-6" strokeWidth={3} />}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>{wordsOf && <UnitWordsSheet unit={wordsOf} onClose={() => setWordsOf(null)} />}</AnimatePresence>
    </div>
  )
}

function SectionBlock({
  section,
  frontier,
  completed,
  open,
  setOpen,
  currentRef,
  onStart,
  onPlacement,
  onWords,
}: {
  section: Section
  frontier: number
  completed: Record<number, number>
  open: number | null
  setOpen: (n: number | null) => void
  currentRef: React.RefObject<HTMLDivElement | null>
  onStart: (node: number) => void
  onPlacement: () => void
  onWords: (u: Unit) => void
}) {
  const units = unitsOf(section)
  const first = sectionFirstNode(section)
  const last = nodeIndex(units[units.length - 1].index, NODES_PER_UNIT - 1)
  const locked = frontier < first
  const doneNodes = units.reduce((acc, u) => {
    for (let k = 0; k < NODES_PER_UNIT; k++) if (completed[nodeIndex(u.index, k)]) acc++
    return acc
  }, 0)
  const totalNodes = units.length * NODES_PER_UNIT
  const [expanded, setExpanded] = useState(!locked || frontier >= first - NODES_PER_UNIT * 2)

  return (
    <section className="mb-10">
      <div
        className="relative mb-8 overflow-hidden rounded-3xl p-5 text-white"
        style={{ background: locked ? 'var(--locked-shadow)' : section.hue }}
      >
        <div className="absolute -top-8 -right-6 size-32 rounded-full bg-white/10" />
        <div className="absolute right-16 -bottom-10 size-24 rounded-full bg-white/10" />
        <div className="relative">
          <div className="text-xs font-black tracking-widest uppercase opacity-80">
            Section {section.level} · {units.length} units
          </div>
          <div className="mt-1 text-2xl font-black">{section.title}</div>
          <div className="text-[15px] font-bold opacity-90">{section.subtitle}</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/15">
              <div className="h-full rounded-full bg-white" style={{ width: `${(doneNodes / totalNodes) * 100}%` }} />
            </div>
            <span className="text-sm font-black">
              {doneNodes}/{totalNodes}
            </span>
          </div>
          {locked && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPlacement()
                }}
                className="btn3d border-b-4 border-black/20 bg-white px-4 py-2 text-sm font-black tracking-wide text-ink uppercase"
              >
                Jump here
              </button>
              {!expanded && (
                <button onClick={() => setExpanded(true)} className="rounded-2xl px-4 py-2 text-sm font-black tracking-wide uppercase opacity-90 hover:bg-white/10">
                  Preview path
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {expanded &&
        units.map((u) => (
          <UnitBlock
            key={u.index}
            unit={u}
            frontier={frontier}
            completed={completed}
            open={open}
            setOpen={setOpen}
            currentRef={currentRef}
            onStart={onStart}
            onWords={onWords}
          />
        ))}
      {!expanded && <div className="text-center text-sm font-bold text-muted">Nodes {first + 1}–{last + 1}</div>}
    </section>
  )
}

function UnitBlock({
  unit,
  frontier,
  completed,
  open,
  setOpen,
  currentRef,
  onStart,
  onWords,
}: {
  unit: Unit
  frontier: number
  completed: Record<number, number>
  open: number | null
  setOpen: (n: number | null) => void
  currentRef: React.RefObject<HTMLDivElement | null>
  onStart: (node: number) => void
  onWords: (u: Unit) => void
}) {
  const sample = unitWords(unit.index).slice(0, 3)
  const hue = unit.section.hue
  const unitLocked = frontier < nodeIndex(unit.index, 0)
  return (
    <div className="relative mb-6" style={{ zIndex: open !== null && decodeNode(open).unit === unit.index ? 10 : undefined }}>
      <div className="mb-6 flex items-center gap-3">
        <div className="h-0.5 flex-1 bg-line" />
        <div className="text-center">
          <div className="text-[13px] font-black tracking-wider uppercase" style={{ color: unitLocked ? 'var(--text-muted)' : hue }}>
            Unit {unit.index + 1}
          </div>
          <div className="text-sm font-bold text-muted">
            {sample.map((n) => n.w).join(', ')}…
          </div>
        </div>
        <div className="h-0.5 flex-1 bg-line" />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onWords(unit)
          }}
          className="btn3d flex size-10 items-center justify-center border-2 border-b-4 border-line bg-surface text-muted"
          aria-label={`Words in unit ${unit.index + 1}`}
        >
          <BookOpen className="size-5" />
        </button>
      </div>

      <div className="relative flex flex-col items-center gap-5 pt-8">
        {unit.index % 3 === 1 && !unitLocked && (
          <div className="pointer-events-none absolute top-16 left-[8%] hidden sm:block">
            <Mascot mood="idle" size={92} />
          </div>
        )}
        {Array.from({ length: NODES_PER_UNIT }, (_, k) => {
          const node = nodeIndex(unit.index, k)
          const isCurrent = node === frontier
          return (
            <div
              key={k}
              ref={isCurrent ? currentRef : undefined}
              style={{ transform: `translateX(${OFFSETS[k]}px)`, zIndex: open === node ? 30 : isCurrent ? 5 : undefined }}
              className="relative"
            >
              <PathNode
                node={node}
                hue={hue}
                state={completed[node] ? 'done' : node <= frontier ? 'open' : 'locked'}
                isCurrent={isCurrent}
                isOpen={open === node}
                onToggle={() => setOpen(open === node ? null : node)}
                onStart={() => onStart(node)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PathNode({
  node,
  hue,
  state,
  isCurrent,
  isOpen,
  onToggle,
  onStart,
}: {
  node: number
  hue: string
  state: 'done' | 'open' | 'locked'
  isCurrent: boolean
  isOpen: boolean
  onToggle: () => void
  onStart: () => void
}) {
  const { k, isCheckpoint, unit } = decodeNode(node)
  return (
    <PathNodeView
      hue={hue}
      state={state}
      isCurrent={isCurrent}
      isOpen={isOpen}
      isCheckpoint={isCheckpoint}
      bubble={node === 0 ? 'Start' : 'Next'}
      ariaLabel={isCheckpoint ? `Unit ${unit + 1} checkpoint` : `Unit ${unit + 1}, lesson ${k + 1}${state === 'locked' ? ' (locked)' : ''}`}
      title={isCheckpoint ? 'Unit checkpoint' : `Lesson ${k + 1} of ${LESSONS_PER_UNIT}`}
      body={
        isCheckpoint
          ? 'Test all 50 words of this unit and earn 1.5× XP.'
          : `New words: ${wordsForNode(node)
              .slice(0, 4)
              .map((n) => n.w)
              .join(', ')}…`
      }
      onToggle={onToggle}
      onStart={onStart}
    />
  )
}

/** A round lesson button on a learning path, with its popover. Shared by the noun and verb courses. */
export function PathNodeView({
  hue,
  state,
  isCurrent,
  isOpen,
  isCheckpoint,
  bubble,
  ariaLabel,
  title,
  body,
  onToggle,
  onStart,
}: {
  hue: string
  state: 'done' | 'open' | 'locked'
  isCurrent: boolean
  isOpen: boolean
  isCheckpoint: boolean
  bubble: string
  ariaLabel: string
  title: string
  body: string
  onToggle: () => void
  onStart: () => void
}) {
  const size = isCheckpoint ? 84 : 72
  const bg = state === 'done' ? 'var(--gold)' : state === 'open' ? hue : 'var(--locked)'
  const shadow = state === 'done' ? 'var(--gold-shadow)' : state === 'open' ? `color-mix(in srgb, ${hue} 70%, black)` : 'var(--locked-shadow)'
  const Icon = state === 'locked' ? Lock : isCheckpoint ? Trophy : state === 'done' ? Check : Star

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      {isCurrent && !isOpen && (
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 rounded-xl border-2 border-line bg-surface px-3 py-1.5 text-sm font-black tracking-wide whitespace-nowrap uppercase"
          style={{ color: hue }}
        >
          {bubble}
          <div className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-line bg-surface" />
        </motion.div>
      )}
      {isCurrent && (
        <div
          className="pointer-events-none absolute -inset-[9px] rounded-full border-[6px]"
          style={{ borderColor: `color-mix(in srgb, ${hue} 25%, transparent)` }}
        />
      )}
      <button
        onClick={onToggle}
        className="btn3d flex items-center justify-center rounded-full"
        style={{ width: size, height: size - 6, background: bg, borderColor: shadow, ['--press' as string]: '7px', borderBottomWidth: 7, borderRadius: '50%' }}
        aria-label={ariaLabel}
      >
        <Icon className={`${isCheckpoint ? 'size-9' : 'size-8'} ${state === 'locked' ? 'text-muted' : 'text-white'}`} fill={state === 'locked' || Icon === Check ? 'none' : 'currentColor'} strokeWidth={Icon === Check ? 4 : 2} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            className="absolute top-full left-1/2 z-20 mt-3 w-72 -translate-x-1/2 rounded-2xl p-4 text-white shadow-xl"
            style={{ background: state === 'locked' ? 'var(--surface-2)' : state === 'done' ? 'var(--gold-shadow)' : hue, color: state === 'locked' ? 'var(--text-muted)' : 'white' }}
          >
            <div className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45" style={{ background: 'inherit' }} />
            <div className="text-lg font-black">{title}</div>
            <div className="mt-0.5 text-sm font-bold opacity-90">{state === 'locked' ? 'Complete the lessons before this to unlock it.' : body}</div>
            {state !== 'locked' && (
              <button
                onClick={onStart}
                className="btn3d mt-3 h-11 w-full border-b-4 border-black/15 bg-white text-[15px] font-black tracking-wide uppercase"
                style={{ color: state === 'done' ? 'var(--gold-shadow)' : hue }}
                autoFocus
              >
                {state === 'done' ? 'Practice again +XP' : 'Start +15 XP'}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function UnitWordsSheet({ unit, onClose }: { unit: Unit; onClose: () => void }) {
  const cards = useProgress((s) => s.cards)
  const words = unitWords(unit.index)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface md:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b-2 border-line p-5">
          <div>
            <div className="text-xs font-black tracking-widest text-muted uppercase">Unit {unit.index + 1} guidebook</div>
            <div className="text-xl font-black">
              Words {unit.from + 1}–{unit.to}
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2" aria-label="Close">
            <X className="size-6" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-x-6 overflow-y-auto p-5 sm:grid-cols-2">
          {words.map((n) => (
            <div key={n.key} className="flex items-baseline justify-between gap-2 border-b border-line py-2">
              <span className="font-extrabold">
                {cards[n.key]?.r ? <span className={genderText[n.g]}>{ARTICLE[n.g]}</span> : <span className="text-muted">···</span>} {n.w}
              </span>
              <span className="truncate text-sm font-semibold text-muted">{n.e}</span>
            </div>
          ))}
        </div>
        <div className="border-t-2 border-line p-4 text-center text-sm font-semibold text-muted">Articles appear once you’ve practised a word.</div>
      </motion.div>
    </motion.div>
  )
}

