#!/usr/bin/env python3
"""Build public/data/phrases.json (consulting phrases / Redemittel) from scripts/phrases_it.txt.

Quality check: every word of every German phrase must occur in a large German corpus
(Leipzig Corpora Collection, deu_mixed-typical_2011_1M sentences). This catches typos and
invented words; real IT jargon that the corpus doesn't know is listed in JARGON below.

Usage:
  python3 -I scripts/build_phrases.py SENTENCES.txt public/data/phrases.json
"""
import json
import os
import re
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
LEVELS = ["A1", "A2", "B1", "B2"]
SITUATIONS = {"kickoff", "daily", "mail", "meeting", "workshop", "dev", "ops", "project", "client"}
FUNCTIONS = {"greet", "small", "clarify", "status", "agree", "disagree", "propose", "request", "schedule", "problem", "close", "email"}
REGISTERS = {"formal", "neutral", "informal"}
# Words the corpus doesn't contain but that are standard in German IT work.
JARGON = {"deployt", "homeoffice", "pull", "request", "requests", "go-live", "proof", "concept", "workaround", "backend-team",
          "it-beraterin", "it-beratung", "cloud-lösung", "testumgebung", "projektumfang", "auftragnehmerseite", "parallelbetrieb",
          "entscheidungswege", "handlungsfelder", "datenqualität", "monitoring", "blocker", "daily", "release", "prototyp", "wartbar",
          "change", "duzen", "fehlermeldung", "zugangsdaten", "mehraufwand", "lenkungsausschuss", "screenshot", "backend", "team",
          "beraterin", "it", "cloud", "lösung", "zeitnah", "einhaken", "zusammenfassend", "bilateral"}
WORD = re.compile(r"[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*")


def corpus_vocab(path):
    vocab = Counter()
    with open(path, encoding="utf-8") as f:
        for line in f:
            for w in WORD.findall(line.split("\t", 1)[-1]):
                vocab[w.lower()] += 1
    return vocab


def main():
    sent_path, out_path = sys.argv[1:3]
    rows = []
    with open(os.path.join(HERE, "phrases_it.txt"), encoding="utf-8") as f:
        for ln, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            p = [x.strip() for x in line.split("|")]
            if len(p) != 8:
                raise SystemExit(f"phrases_it.txt:{ln}: expected 8 fields, got {len(p)}")
            lvl, sit, fn, reg, de, en, cue, note = p
            assert lvl in LEVELS and sit in SITUATIONS and fn in FUNCTIONS and reg in REGISTERS, (ln, lvl, sit, fn, reg)
            rows.append(dict(lvl=lvl, sit=sit, fn=fn, reg=reg, de=de, en=en, cue=cue, note=note, line=ln))

    problems = []
    seen = Counter(r["de"] for r in rows)
    problems += [f"duplicate phrase: {d}" for d, c in seen.items() if c > 1]
    cues = Counter(r["cue"] for r in rows)
    problems += [f"duplicate scenario: {d}" for d, c in cues.items() if c > 1]

    vocab = corpus_vocab(sent_path)
    for r in rows:
        for w in WORD.findall(r["de"]):
            lw = w.lower()
            parts = lw.split("-")
            if lw in JARGON or vocab[lw] >= 2 or all(vocab[x] >= 2 or x in JARGON for x in parts):
                continue
            problems.append(f"line {r['line']}: unknown word '{w}' in: {r['de']}")

    out = []
    for i, r in enumerate(rows):
        tokens = r["de"].split()
        out.append({
            "id": i, "lvl": r["lvl"], "sit": r["sit"], "fn": r["fn"], "reg": r["reg"],
            "de": r["de"], "en": r["en"], "cue": r["cue"], "note": r["note"],
            # word-order exercise only for short, unambiguous sentences
            "order": 3 <= len(tokens) <= 9 and "…" not in r["de"] and ":" not in r["de"] and "," not in r["de"],
        })
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"v": 1, "source": "Curated IT-consulting phrases (Seedlang)", "phrases": out}, f, ensure_ascii=False, separators=(",", ":"))
    print("phrases:", len(out), Counter(r["lvl"] for r in out), "| order-eligible:", sum(r["order"] for r in out))
    print("registers:", Counter(r["reg"] for r in out), "| functions:", Counter(r["fn"] for r in out).most_common())
    if problems:
        print(f"\n{len(problems)} PROBLEM(S):")
        for p in problems:
            print("  -", p)
        sys.exit(1)


if __name__ == "__main__":
    main()
