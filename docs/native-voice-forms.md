# Native voice for inflected forms

> **Status: implemented (option A).** `scripts/audio_clips.py` finds the clips (cache in `scripts/commons_jeuwre.json`), the builds write `fa`/`clips` (verbs) and `pa`/`ga`/`wa` (nouns), `src/lib/voice.ts` builds the phrases and `src/lib/audio.ts` plays them; `src/components/Speaker.tsx` shows the "base form" and "no recording" states. Final numbers after the build: 98.7 % of the words in all verb forms, plural 10,481 / 10,849, genitive 6,626 / 6,996 (83 nouns switched to the recorded variant, e.g. *des Systems*), weak forms 295 / 303. Differences from the plan below: helper clips live in `verbs.json` (`clips`) instead of a generated `src/data/clips.ts`, and there is no service-worker precache of helper clips (each drill preloads its own phrase; heard clips are cached as before).

**Question:** can Seedlang pronounce inflected forms (`er setzt um`, `hat umgesetzt`, `ich würde umsetzen`, `die Zeiten`, `den Menschen`, `des Mannes`) with the same real native-speaker voice it already uses for base forms, without any machine-generated speech?

**Short answer: yes, for about 98 % of what the verb course shows and 93–99 % of the noun forms, using recordings that already exist on Wikimedia Commons by the same Berlin speaker (Jeuwre).** Jeuwre recorded inflected word forms as well as headwords (`De-setzt.ogg`, `De-umgesetzt.ogg`, `De-Zeiten.ogg`, `De-Mannes.ogg`), plus every pronoun, reflexive pronoun, auxiliary and separable particle the app needs. The current `sayNoun` stitching can be generalised to say any phrase whose words all have a recording. The rest gets a visible "no recording" state, never TTS.

All numbers below were measured on 12 November 2026 against `public/data/verbs.json` (218 verbs), `public/data/nouns.json` (12,000 nouns), the Wiktionary dumps in `data-raw/` and the live Commons API. The scripts are listed in [Method](#method).

---

## 1. Coverage of real recordings

### Who is "Berlin"?

The Wiktionary dumps tag recordings with accent labels. Every `Berlin`-tagged file I checked on Commons was uploaded by **Jeuwre**:

| Check | Result |
|---|---|
| Distinct `Berlin`-tagged files in `data-raw/nouns.jsonl` + `verbs.jsonl` | 185,133 |
| Uploader of 200 randomly sampled `Berlin` files (Commons `imageinfo`) | Jeuwre: **200 / 200** |
| Jeuwre's Commons edit count | 1.4 million (registered 2014) |

So "has a `Berlin` recording" means "has a Jeuwre recording". The raw dumps also contain the Wiktionary pages for *inflected forms* (`setzt`, `umgesetzt`, `Zeiten`, `Mannes` are their own entries), which is why they can be used to find form recordings offline, no API needed.

The tag is a lower bound, though. Two more sources of Jeuwre recordings need the Commons API:

- **Untagged files.** Some Jeuwre files are linked from Wiktionary without the `Berlin` label (`De-kosten2.ogg`, `De-weiß2.ogg`). Of the 87 untagged, non-Lingua-Libre files for forms the app needs, **46 are Jeuwre's**.
- **Files no Wiktionary page links.** I looked up `File:De-<form>.ogg` and `File:De-<form>2.ogg` for all 2,607 forms that had no Jeuwre recording in the dumps (5,214 titles). **2,050 of those titles exist, 2,018 of them uploaded by Jeuwre** (`De-pushe.ogg`, `De-skaliere.ogg`, `De-delegiere.ogg`, many plurals and genitives). This is the biggest single gain: it lifts noun plurals from 87 % to 97 %.

The tables below show both: what the offline dumps give, and what the API lookups add.

### Stitching pieces: all exist, all by Jeuwre

| Piece | Jeuwre file(s) |
|---|---|
| Pronouns | `De-ich2` `De-du2` `De-er2` `De-sie2` `De-es2` `De-wir2` `De-ihr2` `De-Sie2` |
| Reflexives | `De-mich2` `De-dich2` `De-sich2` `De-uns3` `De-euch2` |
| haben | `De-habe2` `De-hast` `De-hat3` `De-haben3` `De-habt` |
| sein | `De-bin2` `De-bist2` `De-ist2` `De-sind2` `De-seid2` |
| würde / werden | `De-würde2` `De-würdest` `De-würden` `De-würdet` `De-wird2` `De-werde2` `De-wurde2` |
| Articles (already used) | `De-der2` `De-die2` `De-das2` `De-den2` `De-dem2` `De-des2` |
| Separable particles used by the 218 verbs | `ab` `an` `auf` `aus` `bei` `bereit` `dar` `durch` `ein` `entgegen` `fest` `frei` `her` `herunter` `hoch` `mit` `nach` `um` `voran` `voraus` `vor` `weiter` `wieder` `zu` `zurück` `zusammen` (plus `hin` `los` `weg` `fort` `statt`) |

(All `.ogg`; other speakers' versions also exist for most, e.g. `De-ich.ogg` by another user, but they are not needed.)

### Verbs: utterances the drills actually show

Each row is the exact text the drill's solution shows, split into words, and counted as covered only when **every** word has a recording.

| Utterance (example) | n | All words by Jeuwre: `Berlin` tag in dumps | Jeuwre incl. untagged and unlinked files (Commons API) | Any human speaker, mixed |
|---|---:|---:|---:|---:|
| Infinitive (`umsetzen`, today's `au`) | 218 | 95.4 % | 97.2 % | 99.1 % |
| Present: pronoun + form (`ich setze um`) | 1,308 | 95.5 % | 97.6 % | 98.9 % |
| Präteritum: pronoun + form (`ich setzte um`) | 1,302 | 94.2 % | 98.7 % | 98.8 % |
| Konjunktiv II: pronoun + form (`ich wäre`) | 1,302 | 95.7 % | 97.1 % | 99.1 % |
| `würde` + infinitive (`ich würde umsetzen`) | 1,308 | 95.4 % | 97.2 % | 99.1 % |
| Perfekt (`ich habe umgesetzt`, `er hat umgesetzt`) | 434 | 94.0 % | 97.7 % | 99.1 % |
| Passive (`es wird umgesetzt`) | 217 | 94.0 % | 97.7 % | 99.1 % |
| **All verb utterances** | **6,089** | **95.1 %** | **97.7 %** | **99.0 %** |
| Key-forms card (`setzt um · setzte um · hat umgesetzt`) | 652 | 94.3 % | 97.9 % | 98.8 % |

- Verbs where **every** form is covered by Jeuwre: **201 of 218**.
- Without the particle clips, separable verbs would be stuck: only **3 %** of the 390 two-word present forms (`setze um`) and 390 two-word Präteritum forms have a recording as a whole. The single-word forms are at 93–98 %. Stitching the particle is what lifts separable verbs to the 98 % above.
- What is missing is concentrated, not random: 35 distinct words are left, in three groups:
  - **English loan verbs** nobody has recorded in any form: `deployen`, `debuggen` and all their forms (18 words).
  - **Common words that an earlier speaker recorded, so Jeuwre skipped them**: `entscheiden`, `führen`, `definieren`, `macht`, `möchte`, `gesprochen`, `geteilt` (recordings exist by other users, so the "any speaker" column covers them).
  - **A few rarer forms**: `einrichten`/`eingerichtet`, `abgleichen`, `greift`/`griff`, `trafen`, `sähen`, `saht`, `willst`, `plant`.

### Nouns: article + inflected form

| Form | Frequency band | n | Jeuwre: `Berlin` tag in dumps | Jeuwre incl. Commons API | Any speaker, mixed |
|---|---|---:|---:|---:|---:|
| Plural (`die Zeiten`) | top 1,000 | 937 | 97.8 % | 98.8 % | 99.5 % |
| | rank 1,001–3,000 | 1,843 | 95.5 % | 97.6 % | 98.2 % |
| | rank 3,001–12,000 | 8,069 | 83.5 % | 96.1 % | 96.4 % |
| | **all** | **10,849** | **86.8 %** | **96.6 %** | **97.0 %** |
| Genitive (`des Mannes`) | top 1,000 | 592 | 94.6 % | 96.3 % | 97.6 % |
| | rank 1,001–3,000 | 1,155 | 89.5 % | 93.6 % | 94.5 % |
| | rank 3,001–12,000 | 5,249 | 76.2 % | 93.2 % | 93.5 % |
| | **all** | **6,996** | **80.0 %** | **93.5 %** | **94.0 %** |
| Weak noun acc (`den Menschen`) | all | 301 | 93.0 % | 97.3 % | 98.0 % |
| Weak noun dat (`dem Menschen`) | all | 303 | 92.7 % | 97.4 % | 98.0 % |

Base forms (today's `au`) for comparison: 97 % Jeuwre, 99 % any speaker.

**Genitive bonus:** `nouns.json` stores the first genitive Wiktionary lists, which is often the rarer long variant (`Systemes`, `Urteiles`, `Signales`, `Zufalles`). Often the other variant has a Jeuwre recording (`De-Systems.ogg`, `De-Urteils.ogg`, `De-Signals.ogg` …), and the short one is also the more common form in modern German. Preferring the recorded variant in `build_nouns.py` covers **87** more nouns (177 with the dumps alone), about +1.3 points on genitives, and makes the taught form more idiomatic.

The case exercise only shows singular forms with `den`/`dem`/`des`, and for most nouns the accusative and dative singular are the base form, which is already covered by `au` + the article clip. Only weak nouns (`n.acc`/`n.dat`) and the genitive need a new clip.

---

## 2. Stitching: how natural does it sound?

I built test phrases offline by porting `trimSilence` + `playSequence` (30 ms gap) from `src/lib/audio.ts` to Python and stitching the real Commons MP3 transcodes. Listen to them in the shared notes folder: `~/Library/Application Support/Claude/side-session-notes/local_456d30f7-d29f-4289-9443-97a9444ef89d/native-voice-demos/` (`01_die_Zeit.wav` is what the app plays today, as a reference).

| Phrase | Clips | Trimmed clip lengths | Total | Natural speech (≈5 syll./s) |
|---|---|---|---:|---:|
| die Zeit (today) | die2 + Zeit2 | 0.82 + 0.55 s | 1.43 s | ≈0.4 s |
| die Zeiten | die2 + Zeiten | 0.82 + 0.88 s | 1.76 s | ≈0.6 s |
| den Menschen | den2 + Menschen2 | 0.74 + 0.70 s | 1.50 s | ≈0.6 s |
| des Mannes | des2 + Mannes | 0.49 + 0.88 s | 1.43 s | ≈0.6 s |
| er setzt um | er2 + setzt + um3 | 0.46 + 0.70 + 0.39 s | 1.64 s | ≈0.6 s |
| ich setze um | ich2 + setze + um3 | 0.48 + 0.74 + 0.39 s | 1.70 s | ≈0.8 s |
| er hat umgesetzt | er2 + hat3 + umgesetzt | 0.46 + 0.52 + 0.95 s | 2.02 s | ≈1.0 s |
| ich würde umsetzen | ich2 + würde2 + umsetzen | 0.48 + 0.66 + 0.97 s | 2.20 s | ≈1.2 s |

Pitch tracks (autocorrelation, rough) show why: every clip is a citation form with its own **falling end** (`er` 108→84 Hz, `ich` 115→93, `würde` 102→76, `um` 116→92, `umgesetzt` 127→88 Hz), and `die2` is a long stressed rise-fall (155→172→91 Hz). Stitched phrases therefore sound like **careful, slow dictation, word by word**: clearly the same real voice, clearly correct sounds and word stress, but not one fluent phrase.

What that means per pattern:

- **Article + noun / plural / genitive:** same quality as today's `die Zeit`, which the user already accepts. Plurals and genitives are recorded as whole words, so the inflection itself is perfectly natural.
- **Separable verbs (`setzt … um`):** good. The particle carries stress in the real phrase too (`er setzt UM`), so a stressed `um` clip fits better than an unstressed article does.
- **Auxiliary + participle, pronoun + verb, `würde` + infinitive:** the function word is too long and too prominent (0.45–0.65 s instead of ~0.15 s). Still intelligible and still a real voice; noticeably "list-like".

Ways to make it smoother, all without generating any speech:

1. **Tighter trimming for function words** (pronouns, articles, `hat`/`ist`/`würde`, reflexives): shorter release (≈20 ms instead of 60 ms) and no gap before the next word. Cuts 0.1–0.2 s per phrase.
2. **Loudness by RMS, not peak:** `trimSilence` normalises to peak, so short words like `er`/`des` come out louder than the content word. RMS normalisation with function words ~3 dB quieter imitates natural de-accenting.
3. **10–15 ms crossfade** between clips instead of a gap, to remove clicks at hard onsets.
4. *(Optional, the user's call)* **time-compress function words** by 15–25 % with a pitch-preserving stretch (WSOLA). This is signal processing of the real recording, not synthesis, but it is a step further than trimming; keep it off unless the user likes the result.

Playback rate (`AudioBufferSourceNode.playbackRate`) is not an option: it changes pitch and makes the speaker sound different.

---

## 3. Other human-voice options

| Option | Coverage | Naturalness | Effort / cost | Licence |
|---|---|---|---|---|
| **A. Jeuwre word clips, stitched** (recommended) | ≈98 % of verb utterances, 97 % plurals (99 % top 1,000), 93.5 % genitives (95 % with variant choice), 97 % weak nouns | Correct sounds and stress; phrases sound like slow dictation | Data pipeline + `audio.ts` change, a few days | CC BY-SA, already credited in `public/data/LICENSE.md` |
| **B. Record the missing forms yourself** | Fills the gaps (≈167 clips for all verbs + top 3,000 nouns; ≈785 for everything) | Natural, but a **different voice** from Jeuwre | ≈1–2 h of recording per 300 clips; best done in **Lingua Libre**, which uploads straight to Commons | Your choice (CC BY-SA via Lingua Libre) |
| **C. Pay a native speaker** for the missing forms | Same as B | Natural, different voice; can record whole phrases (`er hat umgesetzt`) instead of stitching | Freelance word-list recording is typically priced per word or per hour; a few hundred clips is a small, one-off job (rough order: tens to low hundreds of euros). Needs a written licence grant | Must be a licence the app can redistribute (ideally CC BY-SA or CC0) |
| **D. Ask Jeuwre** (Commons/Wiktionary talk page) to record the missing forms | Same as B, **same voice** | Best possible fit | Free, but uncertain and slow; a list of ~167 words is a reasonable request | CC BY-SA, same as now |
| **E. Common Voice** (Mozilla, German) | Huge (≈1,486 h, ~1 M read sentences, 20 k speakers), so most words occur somewhere | Words cut out of connected speech by forced alignment: many speakers, mixed mic quality, co-articulation at cut edges | High: alignment pipeline (e.g. Montreal Forced Aligner), manual QA; and every word could be a different speaker | CC0 for the scripted dataset (no attribution needed) |
| **F. Forvo** | Good for common words | Many different speakers | Paid API | Not open: Forvo dropped Creative Commons in 2019 for a custom licence restricting copying and redistribution. **Not usable** for a public PWA that streams/caches clips |
| **G. Other Commons speakers / Lingua Libre (`LL-…` files)** | Adds ~0.5–1.5 points (the "any speaker" column) | Mixing a second voice inside one phrase is jarring | Free | CC BY-SA |

Licence notes:

- Commons pronunciation files are CC BY-SA (the app already credits "Wikimedia Commons (mostly by Jeuwre)" in `public/data/LICENSE.md`). Streaming more files from the same author changes nothing; the credit line should say the inflected forms come from the same source. If option B/C clips are added, credit them separately.
- Do not mix speakers inside one phrase. If a word in the phrase has only another speaker's recording, treat the phrase as uncovered (G is only acceptable for a single-word clip, the way `au` already falls back to other speakers today).

---

## 4. UX when no recording exists (no TTS)

Today `sayNoun` silently falls back to the device voice (`speak(text)`) when there is no recording, when the form differs from the base form, or when loading fails. For forms, that fallback goes away:

1. **Before playing, check coverage** (from the data, no network needed) and pick one of:
   - **All words covered:** stitch and play.
   - **Some word missing, but the base form has a recording:** play the base form, and show its text under the speaker icon (`🔊 umsetzen · base form`). The learner never hears a different form than the one they see without being told.
   - **Nothing recorded:** show the speaker button disabled (greyed, `aria-disabled`, tooltip "No native recording for this form yet"). Don't autoplay.
2. **Offline / network error:** show a small "offline, recording not cached" state instead of switching to TTS. The service worker already caches heard clips (`commons-audio`, 4,000 entries); precaching the ~70 helper clips (pronouns, auxiliaries, particles, articles, ≈20 KB each, ≈1.4 MB) means stitched phrases only need the content word to be fetched.
3. **Example sentences and phrases keep the device voice** (unchanged, they are whole sentences no recording covers). The existing `Device voice` setting stays an explicit, user-chosen option; the change is that the app never *falls back* to it for forms.
4. The case exercise currently speaks the whole TTS sentence (`Wegen des Mannes bleiben wir.`) whenever the form differs from the base. Switch that to the stitched article + form (`des Mannes`), and leave the sentence readable but not auto-spoken.

---

## 5. Recommendation

**Do option A now; fill the remaining gaps with D (ask Jeuwre) and, failing that, B via Lingua Libre.**

- It meets the hard constraint: every sound is a real recording, and almost all of it by the same Berlin speaker the user already likes.
- It already covers about 49 of 50 verb utterances (201 of 218 verbs completely) and 94–99 % of the forms of the 3,000 most frequent nouns, with no recording work at all.
- It is mostly a data change; `sayNoun`'s stitching already works.
- The weak spot, function words that sound over-articulated, is cosmetic and can be reduced with trimming and loudness tweaks. Whole-phrase recordings (C) would sound better but cost money and bring in a second voice.
- Plurals, genitives and participles are recorded as whole words, so the part the learner is actually practising always sounds natural.

---

## 6. Implementation plan (option A)

### 6.1 Data pipeline

New `scripts/audio_index.py` (shared by both build scripts):

- Scan `data-raw/nouns.jsonl` and `data-raw/verbs.jsonl` once and build `word → best clip` from every entry's `sounds`, including the inflected-form entries. Rank Jeuwre (`Berlin` tag) first, as `pick_audio` does today; among several Jeuwre takes, prefer the one Wiktionary lists (usually `De-x2.ogg` for new takes).
- For words that only have untagged recordings, ask the Commons API for each file's uploader (a Jeuwre file without the `Berlin` label still counts).
- For words still missing, look up `File:De-<word>.ogg` and `File:De-<word>2.ogg` with the Commons API (`prop=imageinfo&iiprop=user`, 50 titles per request, ≈3 s between requests to stay under the rate limit). Keep a file only if `user == 'Jeuwre'`. Cache the answers in `data-raw/commons_jeuwre.json` so rebuilds are offline. (For this study's ≈5,300 titles that took ≈110 requests and about 15 minutes, because Commons returns HTTP 429 when asked faster.)
- Export a fixed `HELPER_CLIPS` table (pronouns, reflexives, `haben`/`sein`/`werden`/`würde` forms, articles, particles) as generated code in `src/data/clips.ts`, replacing the hand-written `ARTICLE_CLIPS`.

`scripts/build_verbs.py`:

- New field `fa`: object mapping every single-word token in `pres`, `pret`, `k2`, `pp` (and the infinitive) to its clip, e.g. `{"setze": "06/De-setze.ogg", "umgesetzt": "db/De-umgesetzt.ogg", …}`. Particles and helpers are not repeated per verb; they come from `HELPER_CLIPS`.
- Print coverage in the build summary (`audio: 218 · forms by Jeuwre: 97.7 %`) so regressions are visible.

`scripts/build_nouns.py`:

- New columns in `fields`: `pa` (plural clip), `ga` (genitive clip), `wa` (weak-form clip, shared by acc/dat/gen when they are the same word, e.g. `Menschen`).
- When choosing `gen`, prefer the variant that has a Jeuwre recording (`Systems` over `Systemes`).
- Size: storing full paths like `au` (`66/De-Zeiten.ogg`, ≈22 bytes) adds ≈400 KB to the 1.3 MB `nouns.json`. Since the file name is predictable from the form, the new columns can store only the hash and an optional take suffix (`"66"`, `"86:2"` for `De-Menschen2.ogg`), and `clipUrl` rebuilds `De-<form>[<take>].ogg`. That is ≈18,000 values × 3–5 bytes ≈ 80 KB before gzip.

`public/data/LICENSE.md`: one sentence saying inflected-form recordings come from the same Commons source and author.

### 6.2 `src/lib/audio.ts`

- Generalise `sayNoun` into `sayPhrase(words: { text: string; clip?: string; role?: 'fn' | 'content' }[], opts)`. It resolves each word's clip (`HELPER_CLIPS`, the verb's `fa`, the noun's `au`/`pa`/`ga`/`wa`) and stitches them. `sayNoun` and a new `sayVerbForm(v, text)` become thin wrappers.
- `coverage(words) → 'full' | 'base-only' | 'none'`, exported, so the UI can render the speaker button state before anything is played.
- `trimSilence(buf, role)`: shorter release and RMS-based gain for `role: 'fn'`.
- `playSequence`: replace the 30 ms gap with a 10–15 ms crossfade, and no gap after function words.
- Remove the `speak(text)` fallbacks in this path; failures call an `onUnavailable` callback instead.
- Preload: `preloadVerb(v, skill)` loads the clips for the upcoming drill's answer, and helper clips are added to the service worker precache in `vite.config.ts`.

### 6.3 Call sites

- `components/verbExercises.tsx`: feedback `voice` becomes the solution phrase (`ich setze um`, `er hat umgesetzt`) instead of the infinitive; `KeyForms` gets a speaker per form.
- `components/exercises.tsx` (`CaseView`): `voice` is set for every case form (`des Mannes`, `den Menschen`), not only when `form === n.w`.
- `components/Feedback.tsx`: the plural line gets a speaker for `die <p>`; render the three coverage states from section 4.
- `screens/Settings.tsx`: update the voice description ("Native speakers recorded almost every word *and form*").

### 6.4 Effort and order

1. Audio index + `fa`/`pa`/`ga`/`wa` fields + coverage report (≈1 day).
2. `sayPhrase`, coverage states, no-TTS fallback (≈1 day).
3. Function-word trimming / crossfade tuned by ear with the demo phrases (≈half a day).
4. Collect the remaining gaps into a word list (verbs + top 3,000 nouns first) for option D/B.

---

## Method

Scripts (throwaway, not in the repo; copies plus the Commons lookup caches are in the session notes folder `native-voice-research/`, so the implementation doesn't have to repeat the 15-minute Commons crawl) ran against the repo's data:

- `index.py`: word → recordings from every `sounds` entry in `data-raw/*.jsonl` (178,179 words with audio).
- `sample.py`: uploader of 200 random `Berlin` files via the Commons API.
- `pieces.py`: Commons lookups for pronouns, auxiliaries, particles (`De-x.ogg`, `De-x2/3/4.ogg`, uploader).
- `check_all.py`: direct Commons lookup of 2,607 words missing from the dumps (`De-w.ogg`, `De-w2.ogg`); `untagged.py`: uploader of untagged files.
- `cov2.py`: builds each drill's solution text the way `verbSession.ts` / `cases.ts` do and checks every word.
- `gen.py`: genitive variants from the raw noun entries.
- `demo.py`, `f0.py`: stitched demos with a Python port of `trimSilence`/`playSequence`, and rough pitch tracks.

Sources for section 3: [Common Voice German, Mozilla Data Collective](https://datacollective.mozillafoundation.org/datasets/cmn4rsdh6009unz07jdn2ol9p) (CC0, 1,485.7 h, 20,466 speakers), [Forvo on Wikipedia](https://en.wikipedia.org/wiki/Forvo) (licence change in 2019), [Lingua Libre on Meta-Wiki](https://meta.wikimedia.org/wiki/Lingua_Libre/pl).
