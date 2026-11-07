import { motion } from 'motion/react'

export type Mood = 'idle' | 'happy' | 'sad' | 'cheer' | 'think'

/** Keimi — a little seed with a sprout. Grows with your vocabulary. */
export function Mascot({ mood = 'idle', size = 96, className = '' }: { mood?: Mood; size?: number; className?: string }) {
  const body = {
    idle: { y: [0, -3, 0], rotate: 0, transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' as const } },
    happy: { y: [0, -14, 0], rotate: [0, -6, 6, 0], transition: { duration: 0.6 } },
    cheer: { y: [0, -18, 0, -10, 0], rotate: [0, -8, 8, -4, 0], transition: { duration: 1.1, repeat: Infinity, repeatDelay: 0.6 } },
    sad: { y: 4, rotate: -4, transition: { type: 'spring' as const, stiffness: 120 } },
    think: { y: 0, rotate: [0, 4, 0], transition: { duration: 2, repeat: Infinity } },
  }[mood]

  const leafL = mood === 'sad' ? -38 : mood === 'cheer' || mood === 'happy' ? -8 : -18
  const leafR = mood === 'sad' ? 38 : mood === 'cheer' || mood === 'happy' ? 8 : 18

  return (
    <motion.svg viewBox="0 0 120 120" width={size} height={size} className={className} animate={body} aria-hidden>
      <ellipse cx="60" cy="112" rx="30" ry="5" fill="currentColor" opacity="0.08" />
      <path d="M60 44 V30" stroke="#22B865" strokeWidth="5" strokeLinecap="round" />
      <motion.path
        d="M60 32 C48 30 38 20 38 8 C50 8 60 16 60 32 Z"
        fill="#5BE08F"
        style={{ originX: '60px', originY: '32px' }}
        animate={{ rotate: leafL }}
        transition={{ type: 'spring', stiffness: 160, damping: 10 }}
      />
      <motion.path
        d="M60 32 C72 30 84 18 86 4 C72 4 60 14 60 32 Z"
        fill="#22B865"
        style={{ originX: '60px', originY: '32px' }}
        animate={{ rotate: leafR }}
        transition={{ type: 'spring', stiffness: 160, damping: 10 }}
      />
      <ellipse cx="60" cy="76" rx="34" ry="32" fill="#FFC861" stroke="#E89B1B" strokeWidth="3" />
      <ellipse cx="48" cy="64" rx="10" ry="6" fill="#fff" opacity="0.35" />
      {mood === 'happy' || mood === 'cheer' ? (
        <>
          <path d="M42 72 q6 -7 12 0" stroke="#3A2A12" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M66 72 q6 -7 12 0" stroke="#3A2A12" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="48" cy="72" r="5.5" fill="#3A2A12" />
          <circle cx="72" cy="72" r="5.5" fill="#3A2A12" />
          <circle cx="50" cy="70" r="1.8" fill="#fff" />
          <circle cx="74" cy="70" r="1.8" fill="#fff" />
        </>
      )}
      <circle cx="40" cy="84" r="5" fill="#FF8FA3" opacity="0.5" />
      <circle cx="80" cy="84" r="5" fill="#FF8FA3" opacity="0.5" />
      {mood === 'sad' ? (
        <path d="M52 92 q8 -6 16 0" stroke="#3A2A12" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : mood === 'think' ? (
        <path d="M54 90 h12" stroke="#3A2A12" strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <path d="M50 86 q10 10 20 0" stroke="#3A2A12" strokeWidth="3.5" fill={mood === 'idle' ? 'none' : '#C2410C'} strokeLinecap="round" />
      )}
    </motion.svg>
  )
}

/** Mastery stage icon: seed → sprout → seedling → sapling → tree */
export function GrowthIcon({ stage, size = 22 }: { stage: number; size?: number }) {
  const green = '#22B865'
  const light = '#5BE08F'
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-label={['Seed', 'Sprout', 'Seedling', 'Sapling', 'Tree'][stage]}>
      {stage === 0 && <ellipse cx="12" cy="15" rx="5" ry="4" fill="#E8B86A" opacity="0.7" />}
      {stage >= 1 && <rect x="2" y="19" width="20" height="3" rx="1.5" fill="#C89A5B" opacity="0.6" />}
      {stage === 1 && (
        <>
          <path d="M12 19v-5" stroke={green} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 15c-3 0-4-2-4-4 3 0 4 2 4 4Z" fill={light} />
        </>
      )}
      {stage === 2 && (
        <>
          <path d="M12 19v-8" stroke={green} strokeWidth="2" strokeLinecap="round" />
          <path d="M12 13c-4 0-5-3-5-5 4 0 5 3 5 5Z" fill={light} />
          <path d="M12 12c4 0 5-3 5-5-4 0-5 3-5 5Z" fill={green} />
        </>
      )}
      {stage === 3 && (
        <>
          <path d="M12 19V8" stroke="#9A6B3A" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="8" r="5" fill={green} />
          <circle cx="9.5" cy="7" r="2" fill={light} />
        </>
      )}
      {stage === 4 && (
        <>
          <path d="M12 20V10" stroke="#9A6B3A" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="12" cy="8" r="6.5" fill={green} />
          <circle cx="7.5" cy="10" r="3.5" fill={green} />
          <circle cx="16.5" cy="10" r="3.5" fill={green} />
          <circle cx="10" cy="6" r="2.4" fill={light} />
        </>
      )}
    </svg>
  )
}
