import { BriefcaseBusiness, MessagesSquare, Shapes } from 'lucide-react'
import { useProgress } from '../store/progress'
import { NounPath } from './Learn'
import { PhrasePath } from './PhrasePath'
import { VerbPath } from './VerbPath'

/** Three courses on one Learn tab: articles (12,000 nouns), IT-consulting verbs and consulting phrases (A1–B2). */
export function Learn() {
  const track = useProgress((s) => s.settings.track ?? 'nouns')
  const set = useProgress((s) => s.setSettings)
  const tabs = [
    { id: 'nouns' as const, icon: Shapes, label: 'Artikel', sub: 'der · die · das' },
    { id: 'verbs' as const, icon: BriefcaseBusiness, label: 'Verben', sub: 'IT consulting' },
    { id: 'phrases' as const, icon: MessagesSquare, label: 'Phrasen', sub: 'What to say' },
  ]
  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-1.5 rounded-2xl border-2 border-line bg-surface-2 p-1.5" role="tablist" aria-label="Course">
        {tabs.map((t) => {
          const on = track === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => set({ track: t.id })}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center transition-colors sm:flex-row sm:gap-2.5 sm:text-left ${on ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'}`}
            >
              <t.icon className={`size-6 shrink-0 ${on ? 'text-brand-text' : ''}`} strokeWidth={2.4} />
              <span className="leading-tight">
                <span className={`block font-black ${on ? 'text-ink' : ''}`}>{t.label}</span>
                <span className="block text-xs font-bold text-muted">{t.sub}</span>
              </span>
            </button>
          )
        })}
      </div>
      {track === 'verbs' ? <VerbPath key="verbs" /> : track === 'phrases' ? <PhrasePath key="phrases" /> : <NounPath key="nouns" />}
    </div>
  )
}
