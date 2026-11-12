import { useState } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { coverage, say, type Utterance } from '../lib/audio'
import { useProgress } from '../store/progress'

/**
 * Speaker button for a word or phrase in the native speaker's voice.
 * - every word recorded: plays the phrase
 * - only the base form recorded: plays that, labelled "base form"
 * - nothing recorded: a greyed-out icon (inflected forms never use the device voice)
 */
export function Speaker({
  u,
  size = 'md',
  label = 'Play pronunciation',
  caption = true,
}: {
  u: Utterance
  size?: 'sm' | 'md'
  label?: string
  /** show the "base form" note next to the button (off in tight spots; it is still in the tooltip) */
  caption?: boolean
}) {
  useProgress((s) => s.settings.voice) // re-render when the voice setting changes
  const [offline, setOffline] = useState(false)
  const cov = coverage(u)
  const icon = size === 'sm' ? 'size-4' : 'size-5'
  const pad = size === 'sm' ? 'p-1' : 'p-1.5'
  if (cov === 'none') {
    return (
      <span className={`inline-flex ${pad} text-muted/50`} title="No native recording for this form yet" aria-label="No native recording for this form yet">
        <VolumeX className={icon} />
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <button
        onClick={(e) => {
          e.stopPropagation()
          void say(u).then((r) => setOffline(r === 'offline'))
        }}
        className={`rounded-full ${pad} text-muted hover:bg-black/5 dark:hover:bg-white/10`}
        aria-label={cov === 'base' ? `${label} (base form ${u.base?.text})` : label}
        title={cov === 'base' ? `No recording of this form yet: you hear the base form „${u.base?.text}“` : undefined}
      >
        <Volume2 className={icon} />
      </button>
      {cov === 'base' && caption && (
        <span className="text-xs font-bold whitespace-nowrap text-muted" title="No recording of this form yet: you hear the base form">
          {u.base?.text} · base form
        </span>
      )}
      {offline && <span className="text-xs font-bold whitespace-nowrap text-muted">offline</span>}
    </span>
  )
}
