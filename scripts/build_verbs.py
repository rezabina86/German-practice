#!/usr/bin/env python3
"""Build public/data/verbs.json for the Seedlang verb trainer.

The verb list, levels, situations, example sentences and usage notes are curated by hand in
scripts/verbs_it.txt (IT-consulting vocabulary). Every conjugated form comes from Wiktionary
(kaikki.org German verbs), never from hand-written rules, and every [bracketed] verb form in
an example sentence is checked against those tables.

Usage:
  python3 -I scripts/build_verbs.py VERBS.jsonl public/data/nouns.json public/data/verbs.json [GOETHE_DIR] [NOUNS.jsonl]

  VERBS.jsonl : https://kaikki.org/dictionary/German/pos-verb/kaikki.org-dictionary-German-by-pos-verb.jsonl
  GOETHE_DIR  : optional, TSV files from github.com/ilkermeliksitki/goethe-institute-wordlist
                (a1-*.tsv, a2-*.tsv, b1-*.tsv), only used to print a level cross-check.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PERSONS = [("first-person", "singular"), ("second-person", "singular"), ("third-person", "singular"),
           ("first-person", "plural"), ("second-person", "plural"), ("third-person", "plural")]
LEVELS = ["A1", "A2", "B1", "B2"]
SITUATIONS = {"kickoff", "daily", "mail", "meeting", "workshop", "dev", "ops", "project", "client"}
# Verbs that take haben OR sein depending on meaning: the auxiliary for the sense taught here.
AUX_FOR_SENSE = {"bekommen": "haben", "starten": "haben", "hängen": "haben", "eskalieren": "haben", "herunterbrechen": "haben"}
INSEPARABLE = ("be", "ge", "er", "ver", "zer", "ent", "emp", "miss", "hinter", "über", "unter", "wider")


def read_source(path):
    out = []
    with open(path, encoding="utf-8") as f:
        for ln, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) != 9:
                raise SystemExit(f"verbs_it.txt:{ln}: expected 9 fields, got {len(parts)}")
            lvl, inf, en, sit, gov, noun, ex, ex_en, note = parts
            assert lvl in LEVELS, (ln, lvl)
            assert sit in SITUATIONS, (ln, sit)
            out.append(dict(lvl=lvl, inf=inf, en=en, sit=sit, gov=gov, noun=noun, ex=ex, exEn=ex_en, note=note, line=ln))
    return out


def load_entries(path, wanted):
    entries = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            if '"lang_code": "de"' not in line:
                continue
            e = json.loads(line)
            w = e.get("word")
            if w in wanted:
                entries.setdefault(w, []).append(e)
    return entries


def form_set(e):
    s = set()
    for fm in e.get("forms", []):
        for tok in fm.get("form", "").split():
            s.add(tok.lower())
    s.add(e["word"].lower())
    return s


def find(e, *need, exclude=("subordinate-clause", "rare", "proscribed", "archaic", "obsolete", "dialectal", "nonstandard")):
    for fm in e.get("forms", []):
        tags = set(fm.get("tags", []))
        if all(n in tags for n in need) and not (tags & set(exclude)):
            return fm["form"]
    return None


def find_all(e, *need, exclude=("subordinate-clause", "rare", "proscribed", "archaic", "obsolete", "dialectal", "nonstandard")):
    return [fm["form"] for fm in e.get("forms", [])
            if all(n in set(fm.get("tags", [])) for n in need) and not (set(fm.get("tags", [])) & set(exclude))]


def conj(e, tense, mood="indicative", prefer=()):
    """One form per person. When Wiktionary lists variants (ich kümmre / kümmere), prefer the one
    used in our example sentence, otherwise the fuller standard form."""
    res = []
    for p, n in PERSONS:
        opts = find_all(e, "subjunctive-ii", p, n) if mood == "subjunctive-ii" else find_all(e, mood, tense, p, n)
        if not opts:
            res.append(None)
            continue
        hit = [o for o in opts if all(t.lower() in prefer for t in o.split())]
        res.append(hit[0] if hit else max(opts, key=len) if mood != "subjunctive-ii" else opts[0])
    return res if all(res) else None


def pick_audio(entry):
    best, best_score = None, -1
    w = entry.get("word", "")
    for snd in entry.get("sounds", []):
        url = snd.get("mp3_url")
        if not url or "/transcoded/" not in url:
            continue
        tags = set(snd.get("tags") or [])
        name = snd.get("audio", "")
        score = 1
        if "Berlin" in tags:
            score = 4
        elif name == f"De-{w}.ogg" and not (tags - {"Germany"}):
            score = 3
        elif name.startswith("LL-"):
            score = 2
        if tags & {"Austria", "Switzerland", "Bavaria"} or name.startswith(("De-at-", "De-ch-")):
            score = 0
        if score > best_score:
            parts = url.split("/")
            best, best_score = f"{parts[-3]}/{parts[-2]}", score
    return best or ""


def wrong_participles(inf, pp, sep):
    """Plausible learner errors: wrong ge-, weak/strong ending mix-ups."""
    base = inf[len(sep):] if sep else inf
    stem = base[:-2] if base.endswith("en") else base[:-1]
    pre = sep or ""
    insep = base.startswith(INSEPARABLE) or base.endswith("ieren")
    t = "et" if stem.endswith(("t", "d")) else "t"  # arbeit-et, start-et
    cands = []
    if insep:
        cands += [f"{pre}ge{pp[len(pre):]}" if not pp[len(pre):].startswith("ge") else pp]
        cands += [f"{pre}{stem}{t}", f"{pre}{stem}en"]
    else:
        cands += [f"{pre}ge{stem}{t}", f"{pre}ge{stem}en", f"{pre}{stem}{t}"]
        if pp.startswith(pre + "ge"):
            cands.append(pre + pp[len(pre) + 2:])
    cands += [inf, f"{pre}ge{base}"]
    seen, out = {pp}, []
    for c in cands:
        if c and c not in seen and c.isalpha() and not re.search(r"(.)\1\1", c):
            seen.add(c)
            out.append(c)
    return out[:3]


def goethe_levels(d):
    lv = {}
    if not d or not os.path.isdir(d):
        return lv
    for fn in sorted(os.listdir(d)):
        m = re.match(r"(a1|a2|b1)-", fn)
        if not m or not fn.endswith(".tsv"):
            continue
        level = m.group(1).upper()
        with open(os.path.join(d, fn), encoding="utf-8") as f:
            for line in f:
                head = line.split("\t")[0]
                head = re.sub(r"\(\d+\)", "", head).strip()
                head = re.sub(r"^sich\s+", "", head)
                for w in re.split(r"[/,]", head):
                    w = w.strip()
                    if w and w[0].islower():
                        if w not in lv or LEVELS.index(level) < LEVELS.index(lv[w]):
                            lv[w] = level
    return lv


def main():
    verbs_path, nouns_path, out_path = sys.argv[1:4]
    goethe_dir = sys.argv[4] if len(sys.argv) > 4 else None
    raw_nouns = sys.argv[5] if len(sys.argv) > 5 else None
    src = read_source(os.path.join(HERE, "verbs_it.txt"))
    dupes = {v["inf"] for v in src if [x["inf"] for x in src].count(v["inf"]) > 1}
    assert not dupes, dupes

    lemma = lambda inf: inf[5:] if inf.startswith("sich ") else inf
    entries = load_entries(verbs_path, {lemma(v["inf"]) for v in src} | {"mögen"})
    # "möchten" is listed only as a subjunctive form of "mögen": use that table as its present tense
    if "mögen" in entries:
        m = entries["mögen"][0]
        k2 = conj(m, None, "subjunctive-ii")
        entries["möchten"] = [{"word": "möchten", "forms": [
            {"form": f, "tags": ["indicative", "present", p, n]} for f, (p, n) in zip(k2, PERSONS)
        ] + [{"form": "möchten", "tags": ["infinitive"]}], "sounds": []}]

    nd = json.load(open(nouns_path, encoding="utf-8"))
    fi = {f: i for i, f in enumerate(nd["fields"])}
    noun_gender = {}
    for r in nd["rows"]:
        noun_gender.setdefault(r[fi["w"]], r[fi["g"]])

    if raw_nouns:  # gender of rarer nominalisations (die Behebung) from the full Wiktionary noun list
        missing = {v["noun"] for v in src if v["noun"] and v["noun"] not in noun_gender}
        with open(raw_nouns, encoding="utf-8") as f:
            for line in f:
                e = json.loads(line)
                w = e.get("word")
                if w in missing and w not in noun_gender:
                    for h in e.get("head_templates", []):
                        g = (h.get("args", {}).get("1") or "")[:1]
                        if h.get("name") == "de-noun" and g in "mfn" and g:
                            noun_gender[w] = g
                            break

    glv = goethe_levels(goethe_dir)
    problems, out = [], []
    for v in src:
        lw = lemma(v["inf"])
        cands = entries.get(lw, [])
        tokens = [t.lower() for t in re.findall(r"\[([^\]]+)\]", v["ex"])]
        if not tokens:
            problems.append(f"{v['inf']}: example has no [verb] tokens")
        # choose the etymology whose table contains the example's forms (umgehen: sep. vs insep.)
        best = None
        for e in cands:
            if not conj(e, "present"):
                continue
            fs = form_set(e)
            if all(t in fs for t in tokens):
                best = e
                break
            best = best or e
        if not best:
            problems.append(f"{v['inf']}: no Wiktionary conjugation found")
            continue
        fs = form_set(best)
        bad = [t for t in tokens if t not in fs]
        if bad:
            problems.append(f"{v['inf']}: example forms not in Wiktionary table: {bad}  ⟶  {v['ex']}")

        pres = conj(best, "present", prefer=set(tokens))
        pret = conj(best, "preterite", prefer=set(tokens))
        k2 = conj(best, None, "subjunctive-ii")
        pp = find(best, "participle", "past")
        auxes = []
        for fm in best.get("forms", []):
            if fm.get("tags") == ["auxiliary"] and fm["form"] in ("haben", "sein") and fm["form"] not in auxes:
                auxes.append(fm["form"])
        sep = ""
        if lw in AUX_FOR_SENSE:
            auxes = [AUX_FOR_SENSE[lw]]
        if pres and " " in pres[0]:
            sep = pres[0].split()[-1]
        noun = v["noun"]
        ng = noun_gender.get(noun, "") if noun else ""
        if noun and not ng:
            print(f"  note: no gender found for '{noun}' ({v['inf']}); noun exercise skipped")
            noun = ""
        g = glv.get(lw)
        if g and LEVELS.index(g) > LEVELS.index(v["lvl"]):
            print(f"  level note: {v['inf']} is {v['lvl']} here, Goethe lists it at {g}")
        out.append({
            "inf": v["inf"],
            "lvl": v["lvl"],
            "en": v["en"],
            "sit": v["sit"],
            "gov": v["gov"],
            "noun": noun,
            "ng": ng,
            "ex": v["ex"],
            "exEn": v["exEn"],
            "note": v["note"],
            "refl": v["inf"].startswith("sich "),
            "sep": sep,
            "aux": auxes or (["haben"] if pp else []),
            "pp": pp or "",
            "ppx": wrong_participles(lw, pp, sep) if pp else [],
            "pres": pres,
            "pret": pret or [],
            "k2": k2 or [],
            "au": pick_audio(best),
            "goethe": g or "",
        })

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"v": 1, "source": "Curated IT-consulting list; conjugations from Wiktionary (kaikki.org), CC BY-SA", "verbs": out},
                  f, ensure_ascii=False, separators=(",", ":"))
    from collections import Counter
    print("verbs written:", len(out), Counter(v["lvl"] for v in out), "audio:", sum(1 for v in out if v["au"]))
    print("situations:", Counter(v["sit"] for v in out))
    if problems:
        print(f"\n{len(problems)} PROBLEM(S):")
        for p in problems:
            print("  -", p)
        sys.exit(1)


if __name__ == "__main__":
    main()
