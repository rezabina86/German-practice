import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { PhraseCard, RegisterChip } from '../components/phraseExercises'
import { LevelChip } from '../components/verbExercises'
import { PHRASE_LEVEL_META, phrasePath, type PhraseUnit } from '../lib/phraseCurriculum'
import { useProgress } from '../store/progress'
import { useUI } from '../store/ui'
import { CoursePath } from './CoursePath'

export function PhrasePath() {
  const frontier = useProgress((s) => s.pFrontier)
  const completed = useProgress((s) => s.pCompleted)
  const start = useUI((s) => s.start)
  const { units, nodes } = phrasePath()
  return (
    <CoursePath
      meta={PHRASE_LEVEL_META}
      itemName="phrases"
      frontier={frontier}
      completed={completed}
      units={units.map((u) => ({ index: u.index, level: u.level, numberInLevel: u.numberInLevel, title: u.title, subtitle: u.subtitle, firstNode: u.firstNode, count: u.items.length, lessonCount: u.lessons.length }))}
      nodes={nodes.map((n) => ({
        index: n.index,
        unit: n.unit.index,
        k: n.k,
        isCheckpoint: n.isCheckpoint,
        preview: n.isCheckpoint ? `What would you say? All ${n.unit.items.length} phrases of this unit.` : `„${n.items[0].de}“ and ${n.items.length - 1} more`,
      }))}
      onStart={(i) => {
        const n = nodes[i]
        start({ kind: 'pLesson', pnode: i, title: n.isCheckpoint ? `${n.unit.title} · checkpoint` : `${n.unit.title} · lesson ${n.k + 1}` })
      }}
      onPlacement={(level) => start({ kind: 'pPlacement', level, title: `Jump to ${level}` })}
      renderSheet={(u, close) => <UnitPhraseSheet key="sheet" unit={units[u]} onClose={close} />}
    />
  )
}

function UnitPhraseSheet({ unit, onClose }: { unit: PhraseUnit; onClose: () => void }) {
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
        <div className="space-y-3 overflow-y-auto p-5 text-[15px] font-semibold">
          {unit.items.map((p) => (
            <div key={p.key}>
              <div className="mb-1">
                <RegisterChip reg={p.reg} />
              </div>
              <PhraseCard p={p} />
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
