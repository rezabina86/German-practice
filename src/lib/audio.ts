import { useProgress } from '../store/progress'

let ctx: AudioContext | null = null
function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!C) return null
    ctx = new C()
  }
  // iOS also uses an 'interrupted' state (e.g. after a phone call or switching apps)
  if (ctx.state !== 'running') void ctx.resume().catch(() => {})
  return ctx
}

/**
 * iPhone: Web Audio is muted by the silent switch and stays locked until the user taps.
 * Speech synthesis is not affected, which is why only the machine voice used to play.
 *  1. Unlock the audio context on the first tap/key press by playing a silent sample.
 *  2. Use the "playback" audio session (Safari 17+) for recordings, so they play like speech
 *     even when the phone is on silent.
 */
type AudioSessionNav = Navigator & { audioSession?: { type: string } }
function setAudioSession(type: 'playback' | 'auto') {
  try {
    const session = (navigator as AudioSessionNav).audioSession
    if (session && session.type !== type) session.type = type
  } catch {
    /* not supported */
  }
}

if (typeof window !== 'undefined') {
  const events = ['touchend', 'click', 'keydown'] as const
  const unlock = () => {
    const a = ac()
    if (!a) return
    try {
      const silent = a.createBufferSource()
      silent.buffer = a.createBuffer(1, 1, 22050)
      silent.connect(a.destination)
      silent.start(0)
    } catch {
      /* ignore */
    }
    void a
      .resume()
      .then(() => {
        if (a.state === 'running') events.forEach((e) => window.removeEventListener(e, unlock, true))
      })
      .catch(() => {})
  }
  events.forEach((e) => window.addEventListener(e, unlock, true))
}

/** Resolve true once the audio context is actually running (or give up quickly). */
async function ensureRunning(a: AudioContext): Promise<boolean> {
  if (a.state === 'running') return true
  try {
    await Promise.race([a.resume(), new Promise((r) => setTimeout(r, 400))])
  } catch {
    /* ignore */
  }
  return (a.state as string) === 'running'
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain = 0.18, slideTo?: number) {
  const a = ac()
  if (!a) return
  const t0 = a.currentTime + start
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(a.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

const enabled = () => useProgress.getState().settings.sound

/** Synthesised UI sounds — no audio files needed. */
export const sfx = {
  correct(combo = 0) {
    if (!enabled()) return
    const lift = Math.min(combo, 8) * 0.03
    tone(784 * (1 + lift), 0, 0.12, 'sine', 0.16)
    tone(1175 * (1 + lift), 0.08, 0.22, 'sine', 0.16)
  },
  wrong() {
    if (!enabled()) return
    tone(220, 0, 0.18, 'triangle', 0.2, 150)
    tone(165, 0.1, 0.24, 'triangle', 0.16, 120)
  },
  tap() {
    if (!enabled()) return
    tone(520, 0, 0.05, 'sine', 0.06)
  },
  complete() {
    if (!enabled()) return
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'sine', 0.14))
    tone(1568, 0.48, 0.5, 'sine', 0.08)
  },
  combo() {
    if (!enabled()) return
    ;[880, 1109, 1319].forEach((f, i) => tone(f, i * 0.06, 0.16, 'square', 0.04))
  },
  tick() {
    if (!enabled()) return
    tone(1400, 0, 0.03, 'square', 0.03)
  },
}

/* ------------------------------------------------------------------ voices */

let voice: SpeechSynthesisVoice | null = null
/** Rank device voices: neural/online voices sound far more natural than the compact defaults. */
function voiceScore(v: SpeechSynthesisVoice): number {
  const n = v.name
  let s = 0
  if (/natural|neural|online/i.test(n)) s += 50 // Edge / Windows neural voices
  if (/premium|enhanced|erweitert/i.test(n)) s += 40 // macOS / iOS downloadable voices
  if (/google/i.test(n)) s += 30 // Chrome's server voice
  if (/anna|petra|helena|katja|conrad|markus|yannick|viktor/i.test(n)) s += 10
  if (v.lang.toLowerCase() === 'de-de') s += 5
  return s
}
function pickVoice(): SpeechSynthesisVoice | null {
  if (voice) return voice
  const de = (window.speechSynthesis?.getVoices() ?? []).filter((v) => v.lang?.toLowerCase().startsWith('de'))
  voice = de.sort((a, b) => voiceScore(b) - voiceScore(a))[0] ?? null
  return voice
}
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    voice = null
    pickVoice()
  }
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && !!window.speechSynthesis
}

/** Speak German text with the device's best German voice (used for whole sentences). */
export function speak(text: string, rate = 0.92) {
  stopHuman()
  if (!canSpeak()) return
  const s = window.speechSynthesis
  s.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'de-DE'
  u.rate = rate
  const v = pickVoice()
  if (v) u.voice = v
  s.speak(u)
}

/* ------------------------------------------------- native speaker recordings */

/**
 * Real recordings by native speakers from Wikimedia Commons (CC BY-SA).
 * Almost every word, inflected form (setzt, umgesetzt, Zeiten, Mannes), pronoun, auxiliary and
 * article comes from the same Berlin speaker, so phrases like "die Zeit", "er hat umgesetzt" or
 * "des Mannes" are stitched from single-word clips: each clip is decoded, its silent padding is
 * trimmed, and they play back-to-back. No phrase is ever generated by a machine voice; only base
 * forms without any recording may use the device voice, as before.
 */
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/transcoded'
export const ARTICLE_CLIPS: Record<string, string> = {
  der: '01/De-der2.ogg',
  die: '76/De-die2.ogg',
  das: 'bc/De-das2.ogg',
  den: '22/De-den2.ogg',
  dem: '23/De-dem2.ogg',
  des: 'e9/De-des2.ogg',
}

export function clipUrl(path: string): string {
  const [hash, file] = path.split('/')
  return `${COMMONS}/${hash[0]}/${hash}/${file}/${file}.mp3`
}

/**
 * Clip codes in the data are relative to the word they belong to (scripts/audio_clips.py):
 * "66" → 66/De-Zeiten.ogg, "86:2" → 86/De-Menschen2.ogg, anything with a slash is a full path.
 */
export function clipPath(word: string, code: string | undefined): string {
  if (!code) return ''
  if (code.includes('/')) return code
  const [hash, take = ''] = code.split(':')
  return `${hash}/De-${word.replace(/ /g, '_')}${take}.ogg`
}

/** One word of a phrase: its text, its clip ('' = no recording) and whether it is a function word. */
export interface SpokenWord {
  text: string
  clip: string
  /** pronoun, article, auxiliary: said a little shorter and softer, like in real speech */
  fn?: boolean
}

/** Something to pronounce with recordings. */
export interface Utterance {
  /** what the learner sees, e.g. "er hat umgesetzt" */
  text: string
  words: SpokenWord[]
  /** said instead (and labelled "base form") when a word of the phrase has no recording */
  base?: { text: string; clip: string }
  /** a base form: the device voice may stand in when there is no recording (never for inflected forms) */
  tts?: boolean
}

/** full: every word recorded · base: only the base form is · none: no recording at all */
export type Coverage = 'full' | 'base' | 'none'

const humanVoiceOn = () => useProgress.getState().settings.voice !== 'device'

export function coverage(u: Utterance): Coverage {
  if (!humanVoiceOn()) return canSpeak() ? 'full' : 'none'
  if (u.words.length && u.words.every((w) => w.clip)) return 'full'
  if (u.base?.clip) return 'base'
  return u.tts && canSpeak() ? 'full' : 'none'
}

const buffers = new Map<string, Promise<AudioBuffer>>()

function loadClip(path: string, fn = false): Promise<AudioBuffer> {
  const key = `${fn ? 'f' : 'c'}${path}`
  let p = buffers.get(key)
  if (!p) {
    const a = ac()
    if (!a) return Promise.reject(new Error('no audio'))
    p = fetch(clipUrl(path))
      .then((r) => {
        if (!r.ok) throw new Error(`audio ${r.status}`)
        return r.arrayBuffer()
      })
      .then((b) => a.decodeAudioData(b))
      .then((b) => trimSilence(b, fn))
    p.catch(() => buffers.delete(key))
    buffers.set(key, p)
    if (buffers.size > 400) buffers.delete(buffers.keys().next().value!)
  }
  return p
}

/**
 * Cut leading/trailing silence and normalise loudness so clips join seamlessly.
 * Function words (ich, hat, die …) were recorded as stressed citation forms; they get a shorter
 * tail and are 2.5 dB softer, so "er hat umgesetzt" puts the weight on the verb.
 */
function trimSilence(buf: AudioBuffer, fn = false): AudioBuffer {
  const a = ac()!
  const data = buf.getChannelData(0)
  let peak = 0
  for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]))
  // energy in 10 ms windows, so quiet onsets (h, sch, f) are kept
  const win = Math.max(1, Math.floor(buf.sampleRate * 0.01))
  const rms: number[] = []
  for (let i = 0; i + win <= data.length; i += win) {
    let sum = 0
    for (let j = i; j < i + win; j++) sum += data[j] * data[j]
    rms.push(Math.sqrt(sum / win))
  }
  const sorted = [...rms].sort((x, y) => x - y)
  const floor = sorted[Math.floor(sorted.length * 0.1)] ?? 0
  const thr = Math.max(floor * 4, (sorted[sorted.length - 1] ?? 0) * 0.02)
  let s = 0
  let e = rms.length - 1
  while (s < e && rms[s] < thr) s++
  while (e > s && rms[e] < thr) e--
  const start = Math.max(0, (s - 4) * win) // 40 ms lead-in
  const end = Math.min(data.length, (e + (fn ? 3 : 6)) * win) // 30 / 60 ms release
  const len = Math.max(1, end - start)
  const out = a.createBuffer(buf.numberOfChannels, len, buf.sampleRate)
  const gain = (peak > 0 ? Math.min(4, 0.85 / peak) : 1) * (fn ? 0.75 : 1)
  // 6 ms fades so clips can overlap slightly without clicks
  const fade = Math.min(Math.floor(buf.sampleRate * 0.006), Math.floor(len / 4))
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c).subarray(start, end)
    const dst = out.getChannelData(c)
    for (let i = 0; i < len; i++) {
      const f = i < fade ? i / fade : i >= len - fade ? (len - 1 - i) / fade : 1
      dst[i] = src[i] * gain * f
    }
  }
  return out
}

let playing: AudioBufferSourceNode[] = []
let token = 0

function stopHuman() {
  token++
  for (const s of playing) {
    try {
      s.stop()
    } catch {
      /* already stopped */
    }
  }
  playing = []
}

/** Play clips back-to-back: a short pause between content words, none after a function word. */
function playSequence(bufs: AudioBuffer[], fn: boolean[]) {
  const a = ac()
  if (!a) return
  let t = a.currentTime + 0.02
  let last: AudioBufferSourceNode | null = null
  bufs.forEach((b, i) => {
    const src = a.createBufferSource()
    src.buffer = b
    src.connect(a.destination)
    src.start(t)
    playing.push(src)
    last = src
    t += b.duration + (fn[i] ? -0.015 : 0.03)
  })
  // back to the default session so later UI sounds respect the silent switch again
  if (last) (last as AudioBufferSourceNode).onended = () => setAudioSession('auto')
}

function partsFor(u: Utterance): SpokenWord[] | null {
  const cov = coverage(u)
  if (cov === 'none') return null
  if (u.words.every((w) => w.clip)) return u.words
  if (u.base?.clip) return [{ text: u.base.text, clip: u.base.clip }]
  return null
}

/** Warm the cache so the recording plays instantly on the feedback sheet. */
export function preload(u: Utterance) {
  if (!humanVoiceOn()) return
  for (const w of partsFor(u) ?? []) void loadClip(w.clip, w.fn).catch(() => {})
}

/**
 * Say an utterance in the native speaker's voice. Resolves to what happened:
 * 'full' (the whole phrase), 'base' (only the base form has a recording), 'none' (nothing to say)
 * or 'offline' (the recording could not be loaded). Inflected forms never fall back to the
 * device voice; base forms without a recording (`tts`) do, as before.
 */
export function say(u: Utterance): Promise<Coverage | 'offline'> {
  if (!humanVoiceOn()) {
    speak(u.text)
    return Promise.resolve(canSpeak() ? 'full' : 'none')
  }
  const parts = partsFor(u)
  if (!parts) {
    if (u.tts && canSpeak()) {
      speak(u.text)
      return Promise.resolve('full')
    }
    return Promise.resolve('none')
  }
  const cov: Coverage = parts === u.words ? 'full' : 'base'
  stopHuman()
  window.speechSynthesis?.cancel()
  const my = token
  setAudioSession('playback')
  const fallback = (): Coverage | 'offline' => {
    setAudioSession('auto')
    if (u.tts && my === token && canSpeak()) {
      speak(u.text)
      return 'full'
    }
    return 'offline'
  }
  return Promise.all(parts.map((w) => loadClip(w.clip, w.fn)))
    .then(async (bufs) => {
      if (my !== token) return cov
      const a = ac()
      // never stay silent on a base form: if the audio context can't start, use the device voice
      if (!a || !(await ensureRunning(a))) return fallback()
      if (my === token) playSequence(bufs, parts.map((w) => !!w.fn))
      return cov
    })
    .catch(fallback)
}

/** A noun's base form, optionally with its article ("die Zeit"). */
export function nounBase(n: { w: string; au?: string }, article?: string): Utterance {
  const art = article ? { text: article, clip: ARTICLE_CLIPS[article.toLowerCase()] ?? '', fn: true } : null
  return {
    text: article ? `${article} ${n.w}` : n.w,
    words: [...(art ? [art] : []), { text: n.w, clip: n.au ?? '' }],
    tts: true,
  }
}

/** Warm the cache for a noun and the three articles. */
export function preloadNoun(n: { w?: string; au?: string }) {
  if (!humanVoiceOn() || !n.au) return
  void loadClip(n.au).catch(() => {})
  for (const p of [ARTICLE_CLIPS.der, ARTICLE_CLIPS.die, ARTICLE_CLIPS.das]) void loadClip(p, true).catch(() => {})
}

/** Say a noun (or a verb's infinitive), optionally with its article, in a native speaker's voice. */
export function sayNoun(n: { w: string; au?: string }, article?: string) {
  void say(nounBase(n, article))
}
