import { AnimatePresence, motion } from 'motion/react'
import { BarChart3, BookOpen, Dumbbell, Flame, House, Lightbulb, Settings, Sprout, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Mascot } from './components/Mascot'
import { UpdateBanner } from './components/UpdateBanner'
import { Button, ProgressBar, Ring } from './components/ui'
import { loadNouns, nouns } from './data/nouns'
import { loadVerbs, verbs } from './data/verbs'
import { loadPhrases, phrases } from './data/phrases'
import { dueNouns, learnedNouns } from './lib/session'
import { LessonScreen } from './screens/Lesson'
import { Learn } from './screens/LearnHub'
import { Practice } from './screens/Practice'
import { Rules } from './screens/Rules'
import { SettingsScreen } from './screens/Settings'
import { Stats } from './screens/Stats'
import { Words } from './screens/Words'
import { computeStreak, todayLog, useProgress } from './store/progress'
import { useUI, type Tab } from './store/ui'

const NAV: { id: Tab; label: string; icon: typeof House }[] = [
  { id: 'learn', label: 'Learn', icon: House },
  { id: 'practice', label: 'Practice', icon: Dumbbell },
  { id: 'rules', label: 'Rules', icon: Lightbulb },
  { id: 'words', label: 'Words', icon: BookOpen },
  { id: 'stats', label: 'Progress', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function useTheme() {
  const theme = useProgress((s) => s.settings.theme)
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111318' : '#7048E8')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

export default function App() {
  return (
    <>
      {/* registers the service worker (offline + updates) on every screen, including welcome and loading */}
      <UpdateBanner />
      <AppContent />
    </>
  )
}

function AppContent() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(nouns().length && verbs().length && phrases().length ? 'ready' : 'loading')
  const [err, setErr] = useState('')
  const session = useUI((s) => s.session)
  const onboarded = useProgress((s) => s.settings.onboarded)
  useTheme()

  useEffect(() => {
    if (status !== 'loading') return
    Promise.all([loadNouns(), loadVerbs(), loadPhrases()])
      .then(() => setStatus('ready'))
      .catch((e: Error) => {
        setErr(e.message)
        setStatus('error')
      })
  }, [status])

  if (status === 'loading')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <Mascot mood="think" size={110} />
        <div className="font-black text-muted">Planting 12,000 words…</div>
      </div>
    )
  if (status === 'error')
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <Mascot mood="sad" size={110} />
        <div className="font-black">Couldn’t load the word list.</div>
        <div className="text-sm font-semibold text-muted">{err}</div>
        <Button onClick={() => setStatus('loading')}>Try again</Button>
      </div>
    )

  if (!onboarded) return <Welcome />

  return (
    <>
      <Shell />
      <AnimatePresence>
        {session && (
          <motion.div key="lesson" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="fixed inset-0 z-30">
            <LessonScreen session={session} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function Shell() {
  const tab = useUI((s) => s.tab)
  const setTab = useUI((s) => s.setTab)
  const session = useUI((s) => s.session)

  return (
    <div className={`min-h-full ${session ? 'pointer-events-none' : ''}`} aria-hidden={!!session}>
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r-2 border-line bg-bg px-4 py-6 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1.5">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex items-center gap-4 rounded-2xl border-2 px-4 py-2.5 text-[15px] font-black tracking-wide uppercase ${
                tab === n.id ? 'border-brand/40 bg-brand-soft text-brand-text' : 'border-transparent text-muted hover:bg-surface-2'
              }`}
            >
              <n.icon className="size-6" strokeWidth={2.4} />
              {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-60">
        <MobileTopBar />
        <div className="mx-auto flex max-w-[1100px] gap-10 px-4 pt-4 md:px-8 lg:pt-8">
          <main className="min-w-0 flex-1 xl:max-w-[600px]">
            <motion.div key={tab} initial={{ opacity: 0.4, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
              {tab === 'learn' && <Learn />}
              {tab === 'practice' && <Practice />}
              {tab === 'rules' && <Rules />}
              {tab === 'words' && <Words />}
              {tab === 'stats' && <Stats />}
              {tab === 'settings' && <SettingsScreen />}
            </motion.div>
          </main>
          <aside className="sticky top-8 hidden h-fit w-[340px] shrink-0 space-y-4 xl:block">
            <RightRail />
          </aside>
        </div>
      </div>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t-2 border-line bg-bg pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV.filter((n) => n.id !== 'settings').map((n) => (
          <button
            key={n.id}
            onClick={() => setTab(n.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-black tracking-wide uppercase ${tab === n.id ? 'text-brand-text' : 'text-muted'}`}
            aria-current={tab === n.id}
          >
            <span className={`rounded-xl px-3 py-1 ${tab === n.id ? 'bg-brand-soft' : ''}`}>
              <n.icon className="size-6" strokeWidth={2.4} />
            </span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2 px-2">
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="size-9 rounded-xl" />
      <div className="leading-none">
        <div className="text-[22px] font-black tracking-tight text-brand-text">seedlang</div>
        <div className="text-[11px] font-black tracking-[0.2em] text-muted uppercase">der · die · das</div>
      </div>
    </div>
  )
}

function useHeaderStats() {
  const days = useProgress((s) => s.days)
  const goal = useProgress((s) => s.settings.dailyGoal)
  useProgress((s) => s.cards)
  const { streak, activeToday } = computeStreak(days)
  const today = todayLog(days)
  return { streak, activeToday, todayXp: today.xp, goal, due: dueNouns().length, learned: learnedNouns().length }
}

function MobileTopBar() {
  const { streak, activeToday, todayXp, goal, due } = useHeaderStats()
  const setTab = useUI((s) => s.setTab)
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b-2 border-line bg-bg/95 px-4 pt-[max(10px,env(safe-area-inset-top))] pb-2.5 backdrop-blur lg:hidden">
      <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="Seedlang" className="size-8 rounded-lg" />
      <div className="flex items-center gap-4 text-[15px] font-black">
        <span className={`flex items-center gap-1 ${activeToday ? 'text-flame' : 'text-muted'}`} title="Day streak">
          <Flame className="size-5" fill={activeToday ? 'currentColor' : 'none'} /> {streak}
        </span>
        <span className="flex items-center gap-1 text-gold-shadow" title="XP today">
          <Zap className="size-5" fill="currentColor" /> {todayXp}/{goal}
        </span>
        <button onClick={() => setTab('practice')} className="flex items-center gap-1 text-brand-text" title="Words due for review">
          <Dumbbell className="size-5" /> {due}
        </button>
        <button onClick={() => setTab('settings')} className="text-muted" aria-label="Settings">
          <Settings className="size-5" />
        </button>
      </div>
    </header>
  )
}

function RightRail() {
  const { streak, activeToday, todayXp, goal, due, learned } = useHeaderStats()
  const start = useUI((s) => s.start)
  const total = nouns().length
  return (
    <>
      <div className="flex items-center justify-around rounded-2xl border-2 border-line p-3 text-lg font-black">
        <span className={`flex items-center gap-1.5 ${activeToday ? 'text-flame' : 'text-muted'}`}>
          <Flame className="size-6" fill={activeToday ? 'currentColor' : 'none'} /> {streak}
        </span>
        <span className="flex items-center gap-1.5 text-gold-shadow">
          <Zap className="size-6" fill="currentColor" /> {todayXp}
        </span>
        <span className="flex items-center gap-1.5 text-das" title="Words planted">
          <Sprout className="size-6" /> {learned}
        </span>
      </div>

      <div className="rounded-2xl border-2 border-line p-5">
        <div className="flex items-center gap-4">
          <Ring value={todayXp / goal} size={64} color="var(--gold)">
            <Zap className="size-6 text-gold" fill="currentColor" />
          </Ring>
          <div>
            <div className="text-lg font-black">Daily goal</div>
            <div className="font-bold text-muted">
              {todayXp} / {goal} XP {todayXp >= goal && '· done! 🎉'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-line p-5">
        <div className="text-lg font-black">Review</div>
        <p className="mb-3 font-semibold text-muted">
          {due ? `${due} word${due === 1 ? '' : 's'} ready. Reviewing now keeps them from wilting.` : learned ? 'All caught up. Your memory is fresh.' : 'Finish your first lesson to start reviews.'}
        </p>
        <Button variant={due ? 'primary' : 'secondary'} className="w-full" disabled={!learned} onClick={() => start({ kind: 'review', title: 'Smart review' })}>
          {due ? `Review ${Math.min(due, 20)}` : 'Practice anyway'}
        </Button>
      </div>

      <div className="rounded-2xl border-2 border-line p-5">
        <div className="mb-2 flex justify-between text-lg font-black">
          <span>Vocabulary</span>
          <span className="text-muted">{((learned / total) * 100).toFixed(1)}%</span>
        </div>
        <ProgressBar value={learned / total} color="var(--das)" height={12} />
        <div className="mt-2 text-sm font-bold text-muted">
          {learned.toLocaleString()} of {total.toLocaleString()} nouns
        </div>
      </div>
    </>
  )
}

function Welcome() {
  const set = useProgress((s) => s.setSettings)
  const [step, setStep] = useState(0)
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12 text-center">
      <AnimatePresence mode="wait">
        {step === 0 ? (
          <motion.div key="a" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex max-w-md flex-col items-center">
            <Mascot mood="happy" size={160} />
            <h1 className="mt-6 text-4xl font-black tracking-tight">
              Hallo! I’m <span className="text-brand-text">Keimi</span>.
            </h1>
            <p className="mt-3 text-lg font-bold text-muted">
              Let’s grow your German. <b className="text-der">der</b>, <b className="text-die">die</b> or <b className="text-das">das</b>, for 12,000 real nouns, ordered from most to least common.
            </p>
            <Button size="lg" className="mt-10 w-72" onClick={() => setStep(1)}>
              Get started
            </Button>
          </motion.div>
        ) : (
          <motion.div key="b" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex w-full max-w-md flex-col items-center">
            <h2 className="text-3xl font-black">Pick a daily goal</h2>
            <p className="mt-2 font-bold text-muted">You can change this any time.</p>
            <div className="mt-8 flex w-full flex-col gap-3">
              {[
                [10, 'Casual', '~5 min / day'],
                [30, 'Regular', '~10 min / day'],
                [50, 'Serious', '~15 min / day'],
                [80, 'Intense', '~25 min / day'],
              ].map(([xp, label, time]) => (
                <button
                  key={xp}
                  onClick={() => set({ dailyGoal: xp as number, onboarded: true })}
                  className="btn3d flex items-center justify-between border-2 border-b-4 border-line bg-surface px-5 py-4 text-left hover:border-brand hover:bg-brand-soft"
                >
                  <span className="text-lg font-black">{label}</span>
                  <span className="font-bold text-muted">
                    {xp} XP · {time}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
