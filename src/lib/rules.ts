import { ARTICLE, type Gender, type Noun, nouns, nounsByWord } from '../data/nouns'

/**
 * Gender patterns. Reliability is not hard-coded: it is measured against the 12,000-word
 * dataset at runtime, so every hint says how often it holds ("-ung → die, 99% of 412 words").
 */
export interface RuleDef {
  id: string
  label: string
  gender: Gender
  kind: 'suffix' | 'prefix' | 'group'
  test: (n: Noun) => boolean
  note: string
  /** Patterns with more specific variants (e.g. -e vs -ie) rank lower. */
  specificity: number
}

const suffix = (s: string, gender: Gender, note: string, min = 3): RuleDef => ({
  id: `-${s}`,
  label: `-${s}`,
  gender,
  kind: 'suffix',
  note,
  specificity: s.length,
  test: (n) => n.w.length >= s.length + min - 2 && n.w.toLowerCase().endsWith(s),
})

const group = (id: string, label: string, gender: Gender, words: string[], note: string): RuleDef => {
  const set = new Set(words)
  return { id, label, gender, kind: 'group', note, specificity: 100, test: (n) => set.has(n.w) }
}

export const RULE_DEFS: RuleDef[] = [
  // feminine
  suffix('ung', 'f', 'Nouns made from verbs with -ung are feminine: die Wohnung, die Zeitung.'),
  suffix('heit', 'f', 'Abstract nouns in -heit are feminine: die Freiheit, die Gesundheit.'),
  suffix('keit', 'f', 'Abstract nouns in -keit are feminine: die Möglichkeit.'),
  suffix('schaft', 'f', 'Collective and abstract nouns in -schaft: die Freundschaft.'),
  suffix('tion', 'f', 'Latin -tion words are feminine: die Situation, die Nation.'),
  suffix('sion', 'f', 'Latin -sion words are feminine: die Diskussion.'),
  suffix('tät', 'f', 'Latin -tät words are feminine: die Universität, die Qualität.'),
  suffix('ik', 'f', 'Most -ik nouns are feminine: die Musik, die Politik, die Technik.'),
  suffix('ie', 'f', 'Words in -ie are feminine: die Familie, die Energie.'),
  suffix('ei', 'f', 'Stressed -ei is feminine: die Polizei, die Bäckerei.'),
  suffix('ur', 'f', 'Latin -ur words are feminine: die Natur, die Kultur.'),
  suffix('enz', 'f', 'Words in -enz are feminine: die Konferenz.'),
  suffix('anz', 'f', 'Words in -anz are feminine: die Distanz, die Toleranz.'),
  suffix('erin', 'f', 'Female persons in -in are feminine: die Lehrerin.'),
  suffix('age', 'f', 'French -age words are usually feminine: die Garage, die Etage.'),
  suffix('ade', 'f', 'Words in -ade are feminine: die Limonade.'),
  suffix('ette', 'f', 'French -ette words are feminine: die Toilette, die Zigarette.'),
  suffix('itis', 'f', 'Medical -itis words are feminine: die Bronchitis.'),
  suffix('ose', 'f', 'Words in -ose are feminine: die Diagnose.'),
  suffix('e', 'f', 'Most nouns ending in -e are feminine — a strong tendency, not a law.', 3),
  // masculine
  suffix('ismus', 'm', 'Words in -ismus are masculine: der Tourismus.'),
  suffix('ist', 'm', 'Persons in -ist are masculine: der Journalist, der Tourist.'),
  suffix('ling', 'm', 'Words in -ling are masculine: der Frühling, der Liebling.'),
  suffix('or', 'm', 'Latin -or words are mostly masculine: der Motor, der Doktor.'),
  suffix('ich', 'm', 'Words in -ich are masculine: der Teppich.'),
  suffix('ig', 'm', 'Words in -ig are masculine: der Honig, der König.'),
  suffix('ant', 'm', 'Persons in -ant are masculine: der Elefant, der Praktikant.'),
  suffix('eur', 'm', 'French -eur words are masculine: der Ingenieur.'),
  suffix('ast', 'm', 'Words in -ast are mostly masculine: der Palast.'),
  suffix('us', 'm', 'Latin/Greek -us words are mostly masculine: der Rhythmus.'),
  suffix('er', 'm', 'Many -er nouns (often people and tools) are masculine — a tendency.', 4),
  // neuter
  suffix('chen', 'n', 'Diminutives in -chen are always neuter: das Mädchen. Exceptions are not diminutives at all: der Kuchen, der Knochen.'),
  suffix('lein', 'n', 'Diminutives in -lein are neuter: das Fräulein.'),
  suffix('ment', 'n', 'French/Latin -ment words are mostly neuter: das Dokument.'),
  {
    ...suffix('um', 'n', 'Latin -um words are neuter: das Zentrum, das Museum (but der Raum, der Baum are not Latin).'),
    test: (n) => n.w.length >= 4 && n.w.endsWith('um') && !n.w.endsWith('aum'),
  },
  suffix('tum', 'n', 'Words in -tum are mostly neuter: das Eigentum (but der Irrtum).'),
  suffix('ma', 'n', 'Greek -ma words are neuter: das Thema, das Klima.'),
  suffix('nis', 'n', 'Words in -nis are mostly neuter (some feminine: die Erlaubnis).'),
  suffix('o', 'n', 'Words in -o are mostly neuter: das Auto, das Kino.'),
  suffix('zeug', 'n', 'Words in -zeug are neuter: das Flugzeug, das Spielzeug.'),
  suffix('ett', 'n', 'Words in -ett are mostly neuter: das Bett, das Etikett.'),
  {
    id: 'Ge-',
    label: 'Ge-',
    gender: 'n',
    kind: 'prefix',
    specificity: 0.5, // only when no suffix rule applies
    note: 'Nouns starting with Ge- are often neuter: das Gespräch, das Gebäude.',
    // compounds (Geburtstag, Geschäftsmann) follow their last part instead
    test: (n) => /^Ge[bcdfhklmnprstwz]/.test(n.w) && n.w.length > 4 && !compoundFor(n),
  },
  // semantic groups
  group('days', 'Days of the week', 'm', ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag', 'Sonnabend'], 'Days of the week are masculine: der Montag.'),
  group('months', 'Months', 'm', ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'], 'Months are masculine: der Mai.'),
  group('seasons', 'Seasons', 'm', ['Frühling', 'Sommer', 'Herbst', 'Winter', 'Frühjahr'], 'Seasons are masculine: der Sommer (exception: das Frühjahr).'),
  group('compass', 'Compass directions', 'm', ['Norden', 'Süden', 'Osten', 'Westen', 'Nordosten', 'Nordwesten', 'Südosten', 'Südwesten'], 'Compass directions are masculine: der Norden.'),
  group('weather', 'Weather', 'm', ['Regen', 'Schnee', 'Wind', 'Sturm', 'Nebel', 'Hagel', 'Frost', 'Donner', 'Blitz', 'Orkan', 'Tornado', 'Taifun', 'Hurrikan'], 'Weather words are mostly masculine: der Regen, der Schnee.'),
  group('alcohol', 'Alcoholic drinks', 'm', ['Wein', 'Schnaps', 'Whisky', 'Wodka', 'Sekt', 'Champagner', 'Likör', 'Rum', 'Gin', 'Cognac', 'Tequila', 'Martini', 'Brandy'], 'Alcoholic drinks are masculine: der Wein (but das Bier).'),
  group('numbers', 'Numbers as nouns', 'f', ['Eins', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwölf', 'Null', 'Million', 'Milliarde'], 'Numbers used as nouns are feminine: die Drei.'),
  group('metals', 'Metals', 'n', ['Gold', 'Silber', 'Eisen', 'Kupfer', 'Blei', 'Zinn', 'Platin', 'Aluminium', 'Uran', 'Zink', 'Messing', 'Metall'], 'Metals are neuter: das Gold (but der Stahl).'),
]

export interface RuleStats {
  rule: RuleDef
  count: number
  matching: number
  /** share of nouns that follow the rule */
  reliability: number
  exceptions: Noun[]
  examples: Noun[]
}

let statsCache: RuleStats[] | null = null
let nounRule = new Map<number, RuleStats | null>()

function matchingRules(n: Noun): RuleDef[] {
  return RULE_DEFS.filter((r) => r.test(n))
}

/** Most specific rule for a noun (group > longer suffix > shorter suffix). */
function bestRuleDef(n: Noun): RuleDef | null {
  const m = matchingRules(n)
  if (!m.length) return null
  return m.reduce((a, b) => (b.specificity > a.specificity ? b : a))
}

export function ruleStats(): RuleStats[] {
  if (statsCache) return statsCache
  const all = nouns()
  const bucket = new Map<string, Noun[]>()
  for (const n of all) {
    const r = bestRuleDef(n)
    if (!r) continue
    const list = bucket.get(r.id)
    if (list) list.push(n)
    else bucket.set(r.id, [n])
  }
  statsCache = RULE_DEFS.map((rule) => {
    const list = bucket.get(rule.id) ?? []
    const matching = list.filter((n) => n.g === rule.gender || n.alt.includes(rule.gender))
    return {
      rule,
      count: list.length,
      matching: matching.length,
      reliability: list.length ? matching.length / list.length : 0,
      exceptions: list.filter((n) => !(n.g === rule.gender || n.alt.includes(rule.gender))),
      examples: matching.slice(0, 12),
    }
  })
    .filter((s) => s.count >= (s.rule.kind === 'group' ? 3 : 8))
    .sort((a, b) => b.reliability - a.reliability || b.count - a.count)
  nounRule = new Map()
  return statsCache
}

export function ruleForNoun(n: Noun): RuleStats | null {
  ruleStats()
  if (nounRule.has(n.id)) return nounRule.get(n.id)!
  const def = bestRuleDef(n)
  const s = def ? ruleStats().find((x) => x.rule.id === def.id) ?? null : null
  // weak patterns (< 60%) are not worth showing as a hint
  const res = s && s.reliability >= 0.6 ? s : null
  nounRule.set(n.id, res)
  return res
}

export function ruleById(id: string): RuleStats | undefined {
  return ruleStats().find((s) => s.rule.id === id)
}

export interface CompoundHint {
  head: Noun
  prefix: string
}

const compoundCache = new Map<number, CompoundHint | null>()

/** German compounds take the gender of their LAST part: das Haus + die Tür = die Haustür. */
export function compoundFor(n: Noun): CompoundHint | null {
  if (compoundCache.has(n.id)) return compoundCache.get(n.id)!
  let res: CompoundHint | null = null
  const w = n.w
  if (w.length >= 7) {
    for (let i = 3; i <= w.length - 3; i++) {
      const tail = w[i].toUpperCase() + w.slice(i + 1)
      const heads = nounsByWord(tail)
      const head = heads.find((h) => h.g === n.g) ?? null
      if (head && head.rank < 6000) {
        res = { head, prefix: w.slice(0, i) }
        break
      }
      if (heads.length) break // the longest real tail decides; don't fall back to a shorter one
    }
  }
  compoundCache.set(n.id, res)
  return res
}

export function hintFor(n: Noun): { kind: 'compound' | 'rule' | 'exception'; text: string; rule?: RuleStats; compound?: CompoundHint } | null {
  const c = compoundFor(n)
  if (c) {
    return {
      kind: 'compound',
      compound: c,
      text: `Compound: ${c.prefix} + ${c.head.w}. The last part decides — ${ARTICLE[c.head.g]} ${c.head.w}.`,
    }
  }
  const r = ruleForNoun(n)
  if (!r) return null
  const pct = Math.round(r.reliability * 100)
  const ok = n.g === r.rule.gender || n.alt.includes(r.rule.gender)
  if (ok) return { kind: 'rule', rule: r, text: `${r.rule.label} → ${ARTICLE[r.rule.gender]} (${pct}% of ${r.count} words)` }
  return {
    kind: 'exception',
    rule: r,
    text: `Exception! ${pct}% of ${r.rule.label} words take ${ARTICLE[r.rule.gender]}, but this one is ${ARTICLE[n.g]}.`,
  }
}
