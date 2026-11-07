import { motion } from 'motion/react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ARTICLE, type Gender } from '../data/nouns'

type Variant = 'primary' | 'secondary' | 'ghost' | 'ok' | 'bad' | 'der' | 'die' | 'das' | 'gold' | 'locked'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand border-brand-shadow text-white',
  secondary: 'bg-surface border-line-strong text-ink border-2 border-b-4',
  ghost: 'bg-transparent border-transparent text-brand-text hover:bg-brand-soft',
  ok: 'bg-ok border-ok-shadow text-white',
  bad: 'bg-bad border-bad-shadow text-white',
  der: 'bg-der border-der-shadow text-white',
  die: 'bg-die border-die-shadow text-white',
  das: 'bg-das border-das-shadow text-white',
  gold: 'bg-gold border-gold-shadow text-[#5b3d00]',
  locked: 'bg-locked border-locked-shadow text-muted',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' | 'custom' }) {
  const sz =
    size === 'custom'
      ? ''
      : `uppercase tracking-wide ${size === 'lg' ? 'h-14 px-6 text-[17px]' : size === 'sm' ? 'h-10 px-4 text-sm' : 'h-12 px-5 text-[15px]'}`
  return (
    <button
      className={`btn3d inline-flex items-center justify-center gap-2 font-extrabold ${sz} ${VARIANT[variant]} disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

export const genderVariant = (g: Gender) => ARTICLE[g] as 'der' | 'die' | 'das'

export function ArticleChip({ g, size = 'md', children }: { g: Gender; size?: 'sm' | 'md' | 'lg'; children?: ReactNode }) {
  const color = { m: 'bg-der-soft text-der', f: 'bg-die-soft text-die', n: 'bg-das-soft text-das' }[g]
  const sz = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : size === 'lg' ? 'px-2.5 py-0.5 text-[1em] align-baseline' : 'px-2 py-0.5 text-sm'
  return (
    <span className={`inline-flex items-center rounded-xl font-black ${color} ${sz}`}>
      {children ?? ARTICLE[g]}
    </span>
  )
}

export const genderText = { m: 'text-der', f: 'text-die', n: 'text-das' } as const
export const genderBg = { m: 'bg-der', f: 'bg-die', n: 'bg-das' } as const
export const genderSoft = { m: 'bg-der-soft', f: 'bg-die-soft', n: 'bg-das-soft' } as const

export function ProgressBar({ value, color = 'var(--ok)', className = '', height = 16 }: { value: number; color?: string; className?: string; height?: number }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-surface-2 ${className}`} style={{ height }}>
      <motion.div
        className="relative h-full rounded-full"
        style={{ background: color }}
        initial={false}
        animate={{ width: `${Math.max(v * 100, v > 0 ? 6 : 0)}%` }}
        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
      >
        <div className="absolute inset-x-2 top-[3px] h-[30%] rounded-full bg-white/35" />
      </motion.div>
    </div>
  )
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-2xl border-2 border-line bg-surface p-4 ${className}`}>{children}</div>
}

export function Ring({ value, size = 56, stroke = 7, color = 'var(--flame)', children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-2)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: 'spring', stiffness: 80, damping: 20 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="hidden min-w-5 rounded-md border border-current/30 px-1 text-center text-[11px] font-bold opacity-70 md:inline-block">
      {children}
    </kbd>
  )
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-black tracking-tight">{children}</h2>
      {sub && <p className="mt-1 text-[15px] font-semibold text-muted">{sub}</p>}
    </div>
  )
}
