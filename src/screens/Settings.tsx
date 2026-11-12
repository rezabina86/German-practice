import { Download, Share, SquarePlus, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button, SectionTitle } from '../components/ui'
import { canSpeak, sayNoun, speak } from '../lib/audio'
import { nounsByWord } from '../data/nouns'
import { useProgress, type Theme, type Voice } from '../store/progress'

export function SettingsScreen() {
  const settings = useProgress((s) => s.settings)
  const set = useProgress((s) => s.setSettings)
  const reset = useProgress((s) => s.reset)
  const importState = useProgress((s) => s.importState)
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState('')
  const file = useRef<HTMLInputElement>(null)

  const [lastBackup, setLastBackup] = useState(() => {
    try {
      return Number(localStorage.getItem('seedlang-last-backup')) || 0
    } catch {
      return 0
    }
  })

  const exportData = async () => {
    let raw = ''
    try {
      raw = localStorage.getItem('seedlang-artikel-v1') ?? ''
    } catch {
      /* storage blocked */
    }
    const name = `seedlang-progress-${new Date().toISOString().slice(0, 10)}.json`
    const blob = new Blob([raw || JSON.stringify({ state: useProgress.getState() })], { type: 'application/json' })
    const file = new File([blob], name, { type: 'application/json' })
    const done = () => {
      const now = Date.now()
      setLastBackup(now)
      try {
        localStorage.setItem('seedlang-last-backup', String(now))
      } catch {
        /* ignore */
      }
    }
    // iPhone / iPad: the share sheet lets you save to Files, iCloud Drive or AirDrop it.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Seedlang progress' })
        done()
        setMsg('Backup shared. Keep the file somewhere safe, e.g. iCloud Drive.')
      } catch {
        /* cancelled */
      }
      return
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
    done()
    setMsg('Backup downloaded.')
  }

  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

  return (
    <div className="pb-24">
      <SectionTitle>Settings</SectionTitle>

      <Group title="Lessons">
        <Toggle label="Sound effects" on={settings.sound} onChange={(v) => set({ sound: v })} />
        <Toggle label="Pronounce answers" desc="Say the word with its article after every answer." on={settings.autoSpeak} onChange={(v) => set({ autoSpeak: v })} />
        <Toggle label="Show English meaning" desc="Helps tell homographs apart (der See vs. die See)." on={settings.showGloss} onChange={(v) => set({ showGloss: v })} />
      </Group>

      <Group title="Voice" desc="Native speakers recorded almost every word and form (die Zeiten, er hat umgesetzt). Sentences use your device’s voice.">
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ['human', 'Native speaker', 'Real recordings from Wikimedia Commons (needs internet the first time)'],
              ['device', 'Device voice', canSpeak() ? 'Text-to-speech built into your browser, works offline' : 'Not available in this browser'],
            ] as [Voice, string, string][]
          ).map(([v, label, desc]) => {
            const on = (settings.voice ?? 'human') === v
            return (
              <button
                key={v}
                onClick={() => {
                  set({ voice: v })
                  const n = nounsByWord('Zeit')[0]
                  if (n) setTimeout(() => sayNoun(n, 'die'), 50)
                  else speak('die Zeit')
                }}
                className={`btn3d border-2 border-b-4 p-3 text-left ${on ? 'border-brand bg-brand-soft' : 'border-line bg-surface'}`}
              >
                <div className={`font-black ${on ? 'text-brand-text' : ''}`}>{label}</div>
                <div className="text-sm font-semibold text-muted">{desc}</div>
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-sm font-semibold text-muted">Tap a voice to hear „die Zeit“.</p>
      </Group>

      <Group title="Daily goal">
        <div className="grid grid-cols-4 gap-2">
          {[
            [10, 'Casual'],
            [30, 'Regular'],
            [50, 'Serious'],
            [80, 'Intense'],
          ].map(([xp, label]) => (
            <button
              key={xp}
              onClick={() => set({ dailyGoal: xp as number })}
              className={`btn3d border-2 border-b-4 px-2 py-3 text-center ${settings.dailyGoal === xp ? 'border-brand bg-brand-soft text-brand-text' : 'border-line bg-surface'}`}
            >
              <div className="font-black">{label}</div>
              <div className="text-sm font-bold text-muted">{xp} XP</div>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Appearance">
        <div className="grid grid-cols-3 gap-2">
          {(['system', 'light', 'dark'] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => set({ theme: t })}
              className={`btn3d border-2 border-b-4 py-3 font-black capitalize ${settings.theme === t ? 'border-brand bg-brand-soft text-brand-text' : 'border-line bg-surface'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Install on iPhone" desc={standalone ? 'You are using the installed app. 🎉' : 'Use Seedlang like a real app: full screen, offline, with its own icon.'}>
        {!standalone && (
          <ol className="space-y-2 text-[15px] font-semibold">
            <li className="flex items-start gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-black text-brand-text">1</span>
              <span>Open this page in <b>Safari</b> on your iPhone{ios ? '' : ' (same web address)'}.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-black text-brand-text">2</span>
              <span>
                Tap <Share className="inline size-4 align-text-bottom" /> <b>Share</b>, then <SquarePlus className="inline size-4 align-text-bottom" /> <b>Add to Home Screen</b>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-black text-brand-text">3</span>
              <span>
                Open Seedlang from the Home Screen and <b>import your backup</b> there. The Home Screen app keeps its own data, separate from Safari.
              </span>
            </li>
          </ol>
        )}
      </Group>

      <Group
        title="Your data"
        desc={`Progress is saved on this device only. Export a backup now and then (it takes 2 seconds) and use it to move to another device. ${
          lastBackup ? `Last backup: ${new Date(lastBackup).toLocaleDateString()}.` : 'No backup yet.'
        }`}
      >
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportData}>
            <Download className="size-4" /> Export
          </Button>
          <Button variant="secondary" onClick={() => file.current?.click()}>
            <Upload className="size-4" /> Import
          </Button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setMsg(importState(await f.text()) ? 'Progress imported.' : 'That file doesn’t look like a Seedlang export.')
              e.target.value = ''
            }}
          />
          {!confirm ? (
            <Button variant="ghost" className="text-bad-text" onClick={() => setConfirm(true)}>
              Reset progress
            </Button>
          ) : (
            <Button
              variant="bad"
              onClick={() => {
                reset()
                setConfirm(false)
                setMsg('Progress reset.')
              }}
            >
              Really reset everything?
            </Button>
          )}
        </div>
        {msg && <p className="mt-3 text-sm font-bold text-muted">{msg}</p>}
      </Group>

      <Group title="Keyboard">
        <div className="grid grid-cols-2 gap-2 text-sm font-bold text-muted sm:grid-cols-3">
          <span>1 / 2 / 3 — der / die / das</span>
          <span>J / K / L — der / die / das</span>
          <span>Enter — check / continue</span>
          <span>1–6 — select tiles</span>
          <span>Esc — quit lesson</span>
        </div>
      </Group>

      <p className="mt-8 text-sm font-black text-muted">Version {__APP_VERSION__}</p>
      <p className="mt-2 text-sm font-semibold text-muted">
        Word data: Wiktionary contributors via wiktextract/kaikki.org; frequencies from OpenSubtitles (hermitdave/FrequencyWords) and the Leipzig Corpora
        Collection. Pronunciations: native-speaker recordings by Wikimedia Commons contributors (mainly Jeuwre), CC BY-SA. Licensed CC BY-SA 4.0.
      </p>
    </div>
  )
}

function Group({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-3xl border-2 border-line bg-surface p-5">
      <div className="text-lg font-black">{title}</div>
      {desc && <div className="text-sm font-semibold text-muted">{desc}</div>}
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Toggle({ label, desc, on, onChange }: { label: string; desc?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between gap-4 py-2.5 text-left" role="switch" aria-checked={on}>
      <span>
        <span className="block font-extrabold">{label}</span>
        {desc && <span className="block text-sm font-semibold text-muted">{desc}</span>}
      </span>
      <span className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${on ? 'bg-ok' : 'bg-line-strong'}`}>
        <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
      </span>
    </button>
  )
}
