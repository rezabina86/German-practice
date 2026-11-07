import { AnimatePresence, motion } from 'motion/react'
import { RefreshCw } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Shows "New version available" when a newer build has been published.
 * The installed iPhone app checks on launch, when it comes back to the foreground, and hourly.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return
      const check = () => {
        if (navigator.onLine) void reg.update().catch(() => {})
      }
      setInterval(check, 60 * 60 * 1000)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          className="fixed inset-x-0 top-0 z-[60] flex justify-center px-3 pt-[max(10px,env(safe-area-inset-top))]"
        >
          <div className="flex w-full max-w-md items-center gap-3 rounded-2xl border-2 border-brand/30 bg-surface px-4 py-3 shadow-xl">
            <RefreshCw className="size-5 shrink-0 text-brand-text" />
            <div className="min-w-0 flex-1 text-[15px] leading-tight font-bold">
              New version available
              <div className="text-xs font-semibold text-muted">Your progress stays as it is.</div>
            </div>
            <button onClick={() => setNeedRefresh(false)} className="rounded-lg px-2 py-1 text-sm font-black text-muted">
              Later
            </button>
            <button onClick={() => void updateServiceWorker(true)} className="btn3d border-b-4 border-brand-shadow bg-brand px-3 py-1.5 text-sm font-black text-white">
              Update
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
