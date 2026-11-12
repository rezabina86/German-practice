# Word data licence

`nouns.json` is derived from:

- **Wiktionary** (English edition), extracted with [wiktextract](https://github.com/tatuylonen/wiktextract) and published by [kaikki.org](https://kaikki.org/dictionary/German/). Licensed CC BY-SA 4.0 by Wiktionary contributors.
- **OpenSubtitles 2018 frequency list** from [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords). Content licensed CC BY-SA 4.0.
- **Pronunciations**: native-speaker recordings from [Wikimedia Commons](https://commons.wikimedia.org/wiki/Category:German_pronunciation) (mostly by Jeuwre), CC BY-SA. This includes the recordings of inflected forms (plurals, genitives, verb forms) and of the pronouns and auxiliaries the app joins them with, all by Jeuwre. Files are streamed from upload.wikimedia.org, not bundled; `nouns.json` and `verbs.json` store only their paths.
- **Leipzig Corpora Collection**, corpus `deu_mixed-typical_2011_1M` ([wortschatz-leipzig.de](https://wortschatz.uni-leipzig.de/en/download)). Used only to count noun frequencies; no sentences are redistributed. CC BY 4.0.

The derived dataset is shared under **CC BY-SA 4.0**. Rebuild it with `scripts/build_nouns.py`.
