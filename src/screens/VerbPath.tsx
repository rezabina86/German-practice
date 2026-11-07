import { motion } from 'motion/react'
import { Volume2, X } from 'lucide-react'
import { KeyForms, LevelChip } from '../components/verbExercises'
import { sayNoun } from '../lib/audio'
import { VERB_LEVEL_META, verbPath, type VerbUnit } from '../lib/verbCurriculum'
import { useProgress } from '../store/progress'
import { useUI } from '../store/ui'
import { CoursePath } from './CoursePath'

export function VerbPath() {
  const frontier = useProgress((s) => s.vFrontier)
  const completed = useProgress((s) => s.vCompleted)
  const start = useUI((s) => s.start)
  const { units, nodes } = verbPath()
  return (
    <CoursePath
      meta={VERB_LEVEL_META}
      itemName="verbs"
      frontier={frontier}
      completed={completed}
      units={units.map((u) => ({ index: u.index, level: u.level, numberInLevel: u.numberInLevel, title: u.title, subtitle: u.subtitle, firstNode: u.firstNode, count: u.verbs.length, lessonCount: u.lessons.length }))}
      nodes={nodes.map((n) => ({
        index: n.index,
        unit: n.unit.index,
        k: n.k,
        isCheckpoint: n.isCheckpoint,
        preview: n.isCheckpoint ? `Mixed drills on all ${n.unit.verbs.length} verbs of this unit.` : `New verbs: ${n.verbs.map((v) => v.inf).join(', ')}`,
      }))}
      onStart={(i) => {
        const n = nodes[i]
        start({ kind: 'vLesson', vnode: i, title: n.isCheckpoint ? `${n.unit.title} · checkpoint` : `${n.unit.title} · lesson ${n.k + 1}` })
      }}
      onPlacement={(level) => start({ kind: 'vPlacement', level, title: `Jump to ${level}` })}
      renderSheet={(u, close) => <UnitVerbsSheet key="sheet" unit={units[u]} onClose={close} />}
    />
  )
}

function UnitVerbsSheet({ unit, onClose }: { unit: VerbUnit; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <motion.div
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        exit={{ y: 80 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-surface md:rounded-3xl"
      >
        <div className="flex items-start justify-between border-b-2 border-line p-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-black tracking-widest text-muted uppercase">
              <LevelChip level={unit.level} /> Unit guidebook
            </div>
            <div className="mt-1 text-xl font-black">{unit.title}</div>
            <div className="text-sm font-bold text-muted">{unit.subtitle}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface-2" aria-label="Close">
            <X className="size-6" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          {unit.verbs.map((v) => (
            <div key={v.key} className="border-b border-line pb-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-lg font-black">
                  {v.inf}
                  <button onClick={() => sayNoun({ w: v.lemma, au: v.au })} className="ml-1 inline-flex rounded-full p-1 align-middle text-muted hover:bg-surface-2" aria-label={`Hear ${v.inf}`}>
                    <Volume2 className="size-4" />
                  </button>
                </span>
                <span className="text-right text-sm font-semibold text-muted">{v.en}</span>
              </div>
              <div className="mt-1 text-[15px] font-semibold">{v.ex.replace(/[[\]]/g, '')}</div>
              <div className="mb-2 text-[13px] text-muted">{v.exEn}</div>
              <KeyForms v={v} />
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
