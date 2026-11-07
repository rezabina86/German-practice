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
 * Most words and the articles come from the same Berlin speaker, so
 * "die" + "Zeit" are stitched into one natural phrase: both clips are
 * decoded, their silent padding is trimmed, and they play back-to-back.
 */
const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/transcoded'
const ARTICLE_CLIPS: Record<string, string> = {
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

const buffers = new Map<string, Promise<AudioBuffer>>()

function loadClip(path: string): Promise<AudioBuffer> {
  let p = buffers.get(path)
  if (!p) {
    const a = ac()
    if (!a) return Promise.reject(new Error('no audio'))
    p = fetch(clipUrl(path))
      .then((r) => {
        if (!r.ok) throw new Error(`audio ${r.status}`)
        return r.arrayBuffer()
      })
      .then((b) => a.decodeAudioData(b))
      .then(trimSilence)
    p.catch(() => buffers.delete(path))
    buffers.set(path, p)
    if (buffers.size > 400) buffers.delete(buffers.keys().next().value!)
  }
  return p
}

/** Cut leading/trailing silence and normalise loudness so clips join seamlessly. */
function trimSilence(buf: AudioBuffer): AudioBuffer {
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
  const end = Math.min(data.length, (e + 6) * win) // 60 ms release
  const len = Math.max(1, end - start)
  const out = a.createBuffer(buf.numberOfChannels, len, buf.sampleRate)
  const gain = peak > 0 ? Math.min(4, 0.85 / peak) : 1
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const src = buf.getChannelData(c).subarray(start, end)
    const dst = out.getChannelData(c)
    for (let i = 0; i < len; i++) dst[i] = src[i] * gain
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

function playSequence(bufs: AudioBuffer[], gap = 0.03) {
  const a = ac()
  if (!a) return
  let t = a.currentTime + 0.02
  let last: AudioBufferSourceNode | null = null
  for (const b of bufs) {
    const src = a.createBufferSource()
    src.buffer = b
    src.connect(a.destination)
    src.start(t)
    playing.push(src)
    last = src
    t += b.duration + gap
  }
  // back to the default session so later UI sounds respect the silent switch again
  if (last) last.onended = () => setAudioSession('auto')
}

const humanVoiceOn = () => useProgress.getState().settings.voice !== 'device'

/** Warm the cache so the recording plays instantly on the feedback sheet. */
export function preloadNoun(n: { au?: string }) {
  if (!humanVoiceOn() || !n.au) return
  void loadClip(n.au).catch(() => {})
  for (const p of ['01/De-der2.ogg', '76/De-die2.ogg', 'bc/De-das2.ogg']) void loadClip(p).catch(() => {})
}

/**
 * Say a noun, optionally with its article ("die Zeit"), in a native speaker's voice.
 * Falls back to the device voice when there is no recording or the network is down.
 */
export function sayNoun(n: { w: string; au?: string }, article?: string, form?: string) {
  const text = article ? `${article} ${form ?? n.w}` : (form ?? n.w)
  const formOk = !form || form === n.w
  const artPath = article ? ARTICLE_CLIPS[article.toLowerCase()] : undefined
  if (!humanVoiceOn() || !n.au || !formOk || (article && !artPath)) {
    speak(text)
    return
  }
  stopHuman()
  window.speechSynthesis?.cancel()
  const my = token
  setAudioSession('playback')
  const clips = [...(artPath ? [loadClip(artPath)] : []), loadClip(n.au)]
  Promise.all(clips)
    .then(async (bufs) => {
      if (my !== token) return
      const a = ac()
      // never stay silent: if the audio context can't start, use the device voice instead
      if (!a || !(await ensureRunning(a))) {
        setAudioSession('auto')
        speak(text)
        return
      }
      if (my === token) playSequence(bufs)
    })
    .catch(() => {
      setAudioSession('auto')
      if (my === token) speak(text)
    })
}
