# Seedlang · Artikel, Verben & Phrasen

A web app for mastering German articles (**der / die / das**) across **12,000 real nouns**, plus two courses for IT-consulting work, organised by CEFR level (A1–B2) and work situation: **218 verbs** and **149 ready-to-use phrases**.

**Live app:** https://rezabina86.github.io/German-practice/ (on iPhone: open in Safari → Share → Add to Home Screen)

```bash
npm install
npm run dev      # http://localhost:5173
npm run check    # type-check + lint + production build (run before every push)
git push         # GitHub Actions publishes main to GitHub Pages
```

Publishing, iPhone install and how to update safely: see [docs/PUBLISHING.md](docs/PUBLISHING.md).

## What's inside

**Learning path:** 5 sections (A1–C1), 240 units, 1,200 lessons and 240 checkpoints. Each lesson plants 10 new words, mixed with reviews of older ones. Every section header has **Jump here**, a 15-question placement test you must pass (13/15) to skip ahead. A floating button scrolls you back to your current lesson.

**Exercise types**
- *Choose the article*: the core drill. Answer with keys `1 2 3` or `J K L`.
- *Tap every die word*: a tile grid; the check shows hits, wrong picks and misses.
- *Odd one out*: which of 4 words has a different gender?
- *Cases*: articles in sentences (`Ich sehe den Hund`, `mit dem Kind`, `wegen des Mannes`), including weak nouns (`den Menschen`).

Mistakes come back at the end of the lesson, as Duolingo does.

**Feedback that teaches.** After each answer you get:
- the meaning and plural
- an example sentence (when Wiktionary has one)
- pronunciation by a **native speaker**: real Wikimedia Commons recordings for 11,856 of the 12,000 words, mostly by one Berlin speaker who also recorded der/die/das. The article and noun clips are trimmed and joined into one phrase ("die … Zeit"). Sentences, and words without a recording, use the device's best German voice.
- the most useful hint:
  - **Compound rule:** `Haus + die Tür → die Haustür`. Found automatically for about 4,500 words.
  - **Suffix or group rule** with its *measured* reliability, e.g. `-ung → die (99% of 1,200 words)`.
  - **Exceptions:** `Exception! 89% of -chen words take das, but this one is der (der Kuchen)`.
  - **Homograph warnings:** `der See` (lake) vs `die See` (sea).

**Spaced repetition** uses [FSRS](https://github.com/open-spaced-repetition/ts-fsrs), the scheduler in modern Anki. Response time feeds into the grade: fast and right counts as "easy", slow as "hard".

**Practice modes:** Smart review (due words), Blitz (60 s, combo multipliers ×2/×3), Weak words, and drills for one case or one rule.

**Rules browser:** about 45 gender patterns, each measured against the full dataset, with examples, exceptions and a practice button.

**Word garden:** search all 12,000 words, in German or English and with or without umlauts. Each word shows its mastery stage (seed → sprout → seedling → sapling → tree).

**Progress:** streak, XP, daily goal, accuracy by gender, a der/die/das **confusion matrix**, a weekly chart and an activity heatmap.

**Polish:** light and dark themes, works on mobile and desktop, full keyboard control, synthesised sound effects, reduced-motion support, export/import of progress, and offline use via a service worker.

## Verb course (IT consulting, A1–B2)

On the Learn tab, switch between **Artikel** and **Verben**.

- **218 hand-picked verbs** for consulting work: from *arbeiten* and *schicken* (A1) to *gewährleisten* and *priorisieren* (B2). They are grouped into nine work situations: kick-off, daily, emails, meetings, requirements workshops, development, operations/incidents, project management and client consulting.
- **Each verb has:** a real IT example sentence with translation, a "when to use it" note (register, typical phrases, loanwords like *deployen* vs. formal *bereitstellen*), its case or preposition, the related noun (*die Umsetzung*), and a native-speaker recording.
- **Grammar grows with the level:**
  - A1: meaning, in-context use, present tense
  - A2: + Perfekt (*haben* or *sein*?, participle)
  - B1: + Präteritum, verb + preposition, polite Konjunktiv II, related nouns
  - B2: + passive
- **Path:** level → situation units → lessons of about 5 verbs + a checkpoint. "Jump here" placement tests let you start at A2, B1 or B2.
- **Practice tab:** spaced-repetition verb review, practice by situation, and focused drills for each grammar point.
- **Words tab → IT verbs:** a searchable dictionary with the full Präsens / Präteritum / Konjunktiv II table.

The verb list lives in `scripts/verbs_it.txt` (one line per verb). `scripts/build_verbs.py` merges it with **Wiktionary conjugation tables**, so no form is typed by hand. It **checks every verb form in every example sentence** against those tables and cross-checks levels with the Goethe-Institut A1–B1 word lists. To rebuild:

```bash
python3 -I scripts/build_verbs.py kaikki.org-dictionary-German-by-pos-verb.jsonl public/data/nouns.json public/data/verbs.json [goethe-dir] [nouns.jsonl]
```

## Phrase course (consulting phrases, A1–B2)

On the Learn tab, choose **Phrasen**: 149 complete sentences for the moments that happen in every project.

- **What's covered:** greeting and introducing, small talk, asking and clarifying, giving status, agreeing, disagreeing politely, suggesting, requesting, scheduling, problems and escalation, wrapping up, and email openers and closers.
- **Each phrase has:** the scenario it's for ("The client speaks too fast on a call"), its register (Formal · Sie / Neutral / Informal · du), the English meaning and a usage note.
- **Exercises:**
  - *What would you say?*: a work scenario with four phrases; only one fits.
  - *Build the sentence*: tap word tiles into German word order. The first word is given.
  - *Formal or informal?*: is this OK in a client email, or only in team chat?
  - *Meaning*
- **Levels:** A1 survival phrases → B2 management-level diplomacy (*Ich gebe zu bedenken, dass …*), each with a "Jump here" test.
- **Practice tab:** phrase review (FSRS), rehearse-a-situation sessions and one drill per exercise type.
- **Words tab → Phrases:** a searchable phrasebook grouped by communicative function, filterable by level and register.

The source is `scripts/phrases_it.txt`. `scripts/build_phrases.py` checks every German word against the 1-million-sentence Leipzig corpus to catch typos, and rejects duplicate phrases and scenarios:

```bash
python3 -I scripts/build_phrases.py deu_mixed-typical_2011_1M-sentences.txt public/data/phrases.json
```

## Data pipeline

`public/data/nouns.json` is generated by `scripts/build_nouns.py`:

1. **Wiktionary** via [kaikki.org](https://kaikki.org/dictionary/German/) provides gender (with accepted alternates such as der/das Joghurt), plural, genitive, weak-noun forms, English glosses and example sentences. Obsolete, vulgar and form-of entries are dropped. "Female equivalent of Lehrer" becomes "female teacher".
2. **Frequency ranking** combines OpenSubtitles counts (everyday speech) with a case-sensitive count from the **Leipzig** corpus. The subtitle list is lowercased, so the verb *macht* and the noun *Macht* collide. Counting only capitalised words in mid-sentence position removes those false hits.
3. **Homographs:** a curated list keeps the well-known pairs (der/die See, das/der Band/die Band) and drops obscure secondary meanings.

To rebuild it, download the three sources listed in the script's docstring, then run:

```bash
python3 -I scripts/build_nouns.py nouns.jsonl de_50k.txt deu_mixed-typical_2011_1M-sentences.txt public/data/nouns.json --limit 12000
```

Data licence: CC BY-SA 4.0 (see `public/data/LICENSE.md`).

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Motion, Zustand (persisted to localStorage), ts-fsrs, canvas-confetti, lucide-react and vite-plugin-pwa.

```
src/
  data/nouns.ts         dataset loader and types
  lib/rules.ts          gender rules, measured reliability, compound detection
  lib/srs.ts            FSRS wrapper, recall probability, mastery stages
  lib/session.ts        lesson, review, blitz and placement builders
  lib/cases.ts          case sentence templates and noun declension
  lib/curriculum.ts     sections, units, lessons
  lib/audio.ts          Web Audio sound effects and German TTS
  store/progress.ts     persisted progress, streaks, confusion matrix
  screens/              Learn (path), Lesson, Practice, Rules, Words, Stats, Settings
  components/           exercises, feedback sheet, mascot, UI primitives
```
