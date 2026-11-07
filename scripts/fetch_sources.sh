#!/usr/bin/env bash
# Download the raw sources the data scripts need into data-raw/ (git-ignored, ~1.7 GB).
# Only needed to rebuild public/data/*.json; the app itself never needs these files.
#
#   npm run data:fetch      # once
#   npm run data:nouns      # rebuild nouns.json   (Wiktionary + frequencies)
#   npm run data:verbs      # rebuild verbs.json   (needs nouns.json; checks examples against Wiktionary)
#   npm run data:phrases    # rebuild phrases.json (spell-checks against the Leipzig corpus)
#
# Note: Wiktionary (kaikki.org) is updated regularly, so a rebuild may differ slightly from the
# committed data. Saved progress is keyed by word, not by position, so it is not affected.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p data-raw/goethe data-raw/leipzig
cd data-raw

get() { # url file
  if [ -s "$2" ]; then echo "✓ $2 (already there)"; return; fi
  echo "↓ $2"
  curl -fL --retry 3 -o "$2.part" "$1" && mv "$2.part" "$2"
}

get https://kaikki.org/dictionary/German/pos-noun/kaikki.org-dictionary-German-by-pos-noun.jsonl nouns.jsonl
get https://kaikki.org/dictionary/German/pos-verb/kaikki.org-dictionary-German-by-pos-verb.jsonl verbs.jsonl
get https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt freq.txt

if [ ! -s leipzig/deu_mixed-typical_2011_1M/deu_mixed-typical_2011_1M-sentences.txt ]; then
  get https://downloads.wortschatz-leipzig.de/corpora/deu_mixed-typical_2011_1M.tar.gz leipzig/corpus.tgz
  tar -xzf leipzig/corpus.tgz -C leipzig --include='*sentences.txt'
  rm leipzig/corpus.tgz
else
  echo "✓ Leipzig sentences (already there)"
fi

# Goethe-Institut A1–B1 word lists (only used to cross-check verb levels)
for level in a1 a2 b1; do
  curl -fsL "https://api.github.com/repos/ilkermeliksitki/goethe-institute-wordlist/contents/$level" |
    python3 -I -c 'import sys,json; [print(f["download_url"]) for f in json.load(sys.stdin) if f["type"]=="file"]' |
    while read -r url; do
      out="goethe/$level-$(basename "$url")"
      [ -s "$out" ] || curl -fsL -o "$out" "$url"
    done
done
echo "✓ Goethe word lists"
echo "Done. Sources are in data-raw/."
