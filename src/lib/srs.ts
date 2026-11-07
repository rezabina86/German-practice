import { createEmptyCard, fsrs, Rating, State, type Card, type Grade } from 'ts-fsrs'

/**
 * FSRS (Free Spaced Repetition Scheduler) — the model Anki uses — via ts-fsrs.
 * Each noun gets a memory state (stability / difficulty); reviews are scheduled
 * for when recall probability drops to ~90%.
 */
const scheduler = fsrs({ request_retention: 0.9, maximum_interval: 365, enable_fuzz: true })

/** Compact, JSON-friendly card. */
export interface CardState {
  d: number // due (ms)
  s: number // stability
  df: number // difficulty
  sd: number // scheduled days
  r: number // reps
  l: number // lapses
  ls: number // learning steps
  st: number // FSRS state
  lr: number // last review (ms)
  ok: number // correct answers
  ko: number // wrong answers
}

function toCard(c: CardState): Card {
  return {
    due: new Date(c.d),
    stability: c.s,
    difficulty: c.df,
    scheduled_days: c.sd,
    reps: c.r,
    lapses: c.l,
    learning_steps: c.ls,
    state: c.st as State,
    last_review: c.lr ? new Date(c.lr) : undefined,
    elapsed_days: 0,
  } as Card
}

export function newCardState(now = Date.now()): CardState {
  const c = createEmptyCard(new Date(now))
  return { d: +c.due, s: 0, df: 0, sd: 0, r: 0, l: 0, ls: 0, st: State.New, lr: 0, ok: 0, ko: 0 }
}

/** Map a binary answer + response time onto an FSRS grade. */
export function gradeFor(correct: boolean, ms: number, firstTime: boolean): Grade {
  if (!correct) return Rating.Again
  if (ms > 7000) return Rating.Hard
  if (!firstTime && ms < 2200) return Rating.Easy
  return Rating.Good
}

export function review(prev: CardState | undefined, grade: Grade, now = Date.now()): CardState {
  const base = prev ?? newCardState(now)
  const { card } = scheduler.next(toCard(base), new Date(now), grade)
  return {
    d: +card.due,
    s: card.stability,
    df: card.difficulty,
    sd: card.scheduled_days,
    r: card.reps,
    l: card.lapses,
    ls: card.learning_steps,
    st: card.state,
    lr: now,
    ok: base.ok + (grade === Rating.Again ? 0 : 1),
    ko: base.ko + (grade === Rating.Again ? 1 : 0),
  }
}

/** Probability (0..1) the learner still remembers the word right now. */
export function retrievability(c: CardState | undefined, now = Date.now()): number {
  if (!c || !c.lr || c.s <= 0) return 0
  const days = Math.max(0, (now - c.lr) / 86_400_000)
  // FSRS-6 power forgetting curve with default decay
  const decay = -0.1542
  const factor = Math.pow(0.9, 1 / decay) - 1
  return Math.pow(1 + (factor * days) / c.s, decay)
}

export type Mastery = 0 | 1 | 2 | 3 | 4

/** Plant growth stages: 0 seed (unseen) · 1 sprout · 2 seedling · 3 sapling · 4 tree. */
export function mastery(c: CardState | undefined): Mastery {
  if (!c || !c.r) return 0
  if (c.s < 1) return 1
  if (c.s < 7) return 2
  if (c.s < 30) return 3
  return 4
}

export const MASTERY_LABEL = ['Seed', 'Sprout', 'Seedling', 'Sapling', 'Tree'] as const

export function isDue(c: CardState | undefined, now = Date.now()): boolean {
  return !!c && c.r > 0 && c.d <= now
}
