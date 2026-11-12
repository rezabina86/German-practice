#!/usr/bin/env python3
"""Build the noun dataset for the Seedlang article trainer.

Inputs (download separately, not committed):
  1. Wiktionary German nouns (wiktextract / kaikki.org), JSONL:
     https://kaikki.org/dictionary/German/pos-noun/kaikki.org-dictionary-German-by-pos-noun.jsonl
  2. OpenSubtitles frequency list (hermitdave/FrequencyWords), "word count" per line:
     https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt

  3. Leipzig Corpora Collection, deu_mixed-typical_2011_1M (case-sensitive sentences):
     https://downloads.wortschatz-leipzig.de/corpora/deu_mixed-typical_2011_1M.tar.gz

Ranking: the subtitle list is lowercased, so "macht" (verb) and "Macht" (noun) collide.
The Leipzig sentences are case-sensitive: counting capitalised tokens that are NOT at the
start of a sentence gives a clean noun frequency and a "noun share" for each spelling.
Final score = geometric mean of (subtitle freq x noun share) and (corpus noun freq).

Usage:
  python3 -I scripts/build_nouns.py NOUNS.jsonl FREQ.txt SENTENCES.txt public/data/nouns.json [--limit 12000] [--commons]

Output: compact JSON {"v":1,"fields":[...],"rows":[[...], ...]} sorted by frequency.
Recordings: `au` is the base form (best native recording, any speaker). `pa`, `ga` and `wa` are the
Berlin speaker's clips of the plural, the genitive and the weak form (den/dem Menschen), coded
relative to that form (see audio_clips.py). --commons looks up files not yet in the cache.
Both sources are CC BY-SA; the output inherits that licence (see public/data/LICENSE.md).
"""
import json
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import audio_clips  # noqa: E402

BAD_SENSE_TAGS = {
    "form-of", "alt-of", "obsolete", "archaic", "dated", "vulgar",
    "derogatory", "offensive", "slur", "abbreviation", "initialism", "acronym",
    "misspelling", "nonstandard", "pronunciation-spelling", "historical",
}
SOFT_BAD_TAGS = {"rare", "slang", "colloquial", "regional", "Austria", "Switzerland", "Bavaria", "dialectal"}
REGION_QUAL = re.compile(r"rare|Austria|Switzerland|Swiss|regional|obsolete|dated|nonstandard|uncommon|dialect|South Tyrol|Bavaria|Southern", re.I)

# Lowercased frequency forms that collide with very common non-noun words.
# The frequency list is lowercase, so "sie" would otherwise rank "das Sie" #2.
STOP = set("""
ich du er sie es wir ihr man das der die den dem des ein eine einen einem einer eines
und oder aber denn sondern doch ja nein nicht nichts kein keine mal so auch noch schon nur
was wer wie wo wann warum wieso weshalb hier da dort jetzt dann gut sehr mehr weg
in an auf aus bei mit nach von zu um über unter vor hinter neben zwischen durch für gegen ohne
alles alle viel viele wenig ganz gerade bitte danke hallo okay ok hey oh ach na tja ah äh ähm
haben sein werden können müssen sollen wollen dürfen mögen machen tun gehen kommen sagen
sehen wissen lassen geben nehmen ist bin bist sind war hat habe gibt kann will muss
mein dein sein unser euer ihr selbst etwas jemand niemand immer nie wieder heute morgen gestern
eins zwei drei vier fünf sechs sieben acht neun zehn hundert tausend
ihnen ihm ihn uns euch mich dich sich mir dir
zurück los genau klar sicher echt richtig falsch toll super
""".split())
# Lemmas that are real but not useful as article drills (letters, nominalised pronouns, etc.)
SKIP_LEMMAS = set("""
Ich Du Sie Er Es Wir Ihr Man Das Der Die Ja Nein Na Oh Ach Ah Hey Okay Ok So Wo Was Wer Wie
Aus An Auf Ab Zu Um Mal Mein Dein Sein Haben Gut Bitte Danke Hallo Hier Dort Jetzt Nichts Alles
Mehr Weg Morgen Recht Ende
""".split())
# Keep these even though they collide (they are genuinely common nouns).
FORCE_KEEP = {"Morgen", "Recht", "Ende", "Weg", "Mal"}
SKIP_LEMMAS -= FORCE_KEEP


HOMOGRAPHS = {
    "See": "fm", "Band": "nfm", "Leiter": "mf", "Kiefer": "fm", "Steuer": "fn", "Gehalt": "nm",
    "Erbe": "nm", "Golf": "mn", "Schild": "nm", "Bund": "mn", "Laster": "mn", "Verdienst": "mn",
    "Mark": "fn", "Heide": "mf", "Tau": "nm", "Pony": "nm", "Single": "fm", "Stift": "mn",
    "Weise": "fm", "Wehr": "fn", "Moment": "mn", "Kristall": "mn", "Tor": "nm", "Junge": "mn",
    "Elf": "fm", "Plastik": "nf", "Erkenntnis": "f", "Kunde": "m", "Hut": "m", "Messer": "n",
    "Morgen": "m", "Fall": "m", "Ort": "m", "Euro": "m", "Foto": "n", "Post": "f", "Reis": "m",
    "Gang": "m", "Laden": "m", "Bord": "m", "Service": "m", "Bar": "f", "Tee": "m", "Brand": "m",
    "Mittag": "m", "Wende": "f", "Koch": "m", "Mangel": "m", "Maß": "n", "Flur": "m", "Mode": "f",
    "Bulle": "m", "Lob": "n", "Salat": "m", "Set": "n", "Center": "n", "Reiter": "m", "Model": "n",
    "Wiener": "m", "Gründung": "f", "Bock": "m", "Modul": "n", "Weber": "m", "Disco": "f",
    "Diesel": "m", "Frankfurter": "m", "Spektakel": "n", "Korn": "n", "Heroin": "n", "Militär": "n",
    "Böse": "n", "Bauer": "m", "Mast": "m", "Marsch": "m", "Esse": "f", "Back": "",
}
# Same meaning, both genders in use: accept either.
GLOSS_FIX = {"Mal": "time, occasion", "Morgen": "morning"}
MERGE = {"Teil": "mn", "Ex": "mf", "Gummi": "mn", "Match": "nm", "Virus": "nm", "Joghurt": "mn"}


def load_freq(path):
    freq = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            parts = line.split()
            if len(parts) != 2:
                continue
            w, c = parts
            freq.setdefault(w, int(c))
    return freq


TOKEN = re.compile(r"[A-Za-zÄÖÜäöüß]+|[.!?:\"„“»«]")


def load_mid_sentence_counts(path):
    """Case-sensitive token counts, skipping sentence-initial / post-punctuation tokens."""
    counts = defaultdict(int)
    total = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            text = line.split("\t", 1)[-1]
            prev_break = True
            for tok in TOKEN.findall(text):
                if not tok[0].isalpha():
                    prev_break = True
                    continue
                total += 1
                if not prev_break:
                    counts[tok] += 1
                prev_break = False
    return counts, total


def parse_genders(arg1):
    """'m[Germany]:n[Austria],s,s' -> (primary, alternates)."""
    if not arg1:
        return None, []
    first = arg1.split(",")[0]
    first = re.sub(r"<.*?>", "", first)
    out = []
    for part in first.split(":"):
        qual = ""
        m = re.match(r"^\s*([mfnp])(?:\.[a-z.]+)?\s*(?:\[(.*?)\])?", part)
        if not m:
            continue
        g, qual = m.group(1), m.group(2) or ""
        out.append((g, qual))
    if not out:
        return None, []
    primary = None
    alts = []
    for g, qual in out:
        if primary is None and not REGION_QUAL.search(qual):
            primary = g
        elif g != primary and not REGION_QUAL.search(qual):
            alts.append(g)
    if primary is None:
        primary = out[0][0]
    return primary, sorted(set(a for a in alts if a != primary))


def clean_gloss(g):
    g = re.sub(r"\s*\([^()]*\)", "", g)          # drop parentheticals
    g = re.sub(r"\s*\([^()]*\)", "", g)
    g = g.split(";")[0].strip()
    parts = [p.strip() for p in g.split(",") if p.strip()]
    g = ", ".join(parts[:3])
    if len(g) > 48:
        g = g[:48].rsplit(" ", 1)[0].rstrip(",") + "…"
    return g


DERIVED = re.compile(r"^(female equivalent|diminutive) of ([A-ZÄÖÜ][a-zäöüß]+)(?:\s*\(“(.+?)”\))?")


def good_sense(s):
    tags = set(s.get("tags", []))
    if not s.get("glosses"):
        return False
    # keep "female equivalent of Lehrer" / "diminutive of Haus": common, useful words
    if "form-of" in tags and DERIVED.match(s["glosses"][0]) and not (tags & (BAD_SENSE_TAGS - {"form-of"})):
        return True
    return not (tags & BAD_SENSE_TAGS)


def pick_audio(entry):
    """Best native-speaker recording on Wikimedia Commons, as 'e7/De-Zeit.ogg'.
    Prefers the large Berlin set (one consistent speaker who also recorded der/die/das)."""
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


def decl_form(entry, case):
    for fm in entry.get("forms", []):
        tags = set(fm.get("tags", []))
        if fm.get("source") == "declension" and case in tags and "singular" in tags:
            return fm["form"]
    return None


def genitives(entry):
    """All genitive singular forms Wiktionary lists (des Systems / des Systemes), headword ones first."""
    out = []
    for fm in entry.get("forms", []):
        tags = fm.get("tags", [])
        if (not fm.get("source") and tags == ["genitive"]) or (
                fm.get("source") == "declension" and "genitive" in tags and "singular" in tags):
            for tok in fm["form"].split():
                if tok not in ("des", "der", "eines", "einer") and tok not in out:
                    out.append(tok)
    return out


def gen_form(r):
    """The genitive the app shows (mirrors nounForm() in src/lib/cases.ts)."""
    if r["gen"]:
        return r["gen"].split(" ")[0]
    if r["g"] == "f":
        return r["w"]
    return r["w"] + ("es" if re.search("[sßxz]$", r["w"]) else "s")


def main():
    nouns_path, freq_path, sent_path, out_path = sys.argv[1:5]
    limit = 12000
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    freq = load_freq(freq_path)
    sub_total = sum(freq.values())
    mid, mid_total = load_mid_sentence_counts(sent_path)
    print("corpus tokens", mid_total, "subtitle tokens", sub_total)
    # (word, gender) -> best record
    cands = {}
    with open(nouns_path, encoding="utf-8") as f:
        for line in f:
            e = json.loads(line)
            w = e.get("word", "")
            if e.get("lang_code") != "de" or not w or not w[0].isupper():
                continue
            if " " in w or "-" in w or "." in w or len(w) < 2 or not w.isalpha():
                continue
            if w in SKIP_LEMMAS:
                continue
            ht = [h for h in e.get("head_templates", []) if h.get("name") == "de-noun"]
            if not ht:
                continue
            g, alts = parse_genders(ht[0]["args"].get("1", ""))
            if g not in ("m", "f", "n"):
                continue  # plural-only and unparseable entries are skipped
            senses = [s for s in e.get("senses", []) if good_sense(s)]
            if not senses:
                continue
            # prefer non-slang senses for the gloss
            pref = [s for s in senses if not (set(s.get("tags", [])) & SOFT_BAD_TAGS)] or senses
            derived_from = None
            dm = DERIVED.match(pref[0]["glosses"][0])
            if dm:
                kind, base, quoted = dm.groups()
                prefix = "female " if kind.startswith("female") else "little "
                if quoted:
                    gloss = prefix + clean_gloss(quoted)
                else:
                    gloss = ""
                    derived_from = (prefix, base)
            else:
                gloss = clean_gloss(pref[0]["glosses"][0])
            if derived_from:
                pass
            elif not gloss or gloss.lower().startswith(("plural of", "agent noun of", "diminutive of", "synonym of", "female equivalent")):
                if len(pref) > 1:
                    gloss = clean_gloss(pref[1]["glosses"][0])
                if not gloss or "of " in gloss[:20]:
                    continue
            gloss2 = ""
            for s in pref[1:4]:
                c = clean_gloss(s["glosses"][0])
                if c and c.lower() not in gloss.lower() and "of " not in c[:15]:
                    gloss2 = c
                    break
            plural = None
            gen = None
            for fm in e.get("forms", []):
                tags = fm.get("tags", [])
                if fm.get("source"):
                    continue
                if tags == ["plural"] and plural is None:
                    plural = fm["form"]
                if tags == ["genitive"] and gen is None:
                    gen = fm["form"]
            ex = None
            for s in pref:
                for x in s.get("examples", []):
                    t, en = x.get("text", ""), x.get("english") or x.get("translation")
                    if x.get("type") != "example":
                        continue
                    if t and en and 12 <= len(t) <= 90 and len(en) <= 110 and "\n" not in t:
                        ex = (t, en)
                        break
                if ex:
                    break
            acc = decl_form(e, "accusative")
            dat = decl_form(e, "dative")
            if gen is None:
                gen = decl_form(e, "genitive")
            lw = w.lower()
            pl = plural if plural and plural != w else None
            cap = mid.get(w, 0) + (mid.get(pl, 0) * 0.5 if pl else 0)
            low = mid.get(lw, 0) + (mid.get(pl.lower(), 0) * 0.5 if pl else 0)
            share = (cap + 0.5) / (cap + low + 1)
            sub = freq.get(lw, 0) + (freq.get(pl.lower(), 0) * 0.5 if pl else 0)
            if lw in STOP and w not in FORCE_KEEP:
                share = min(share, 0.05)
            sub_pm = sub * share * 1e6 / sub_total
            news_pm = cap * 1e6 / mid_total
            score = ((sub_pm + 0.3) * (news_pm + 0.3)) ** 0.5 - 0.3
            if cap < 3 and sub < 20:
                score = 0
            gloss = GLOSS_FIX.get(w, gloss)
            rec = {
                "w": w, "g": g, "a": "".join(alts), "p": plural or "", "e": gloss, "e2": gloss2,
                "s": score, "gen": gen if gen and gen != w else "", "acc": acc if acc and acc != w else "",
                "dat": dat if dat and dat != w else "", "x": ex[0] if ex else "", "xe": ex[1] if ex else "",
                "ns": len(senses), "df": derived_from, "au": pick_audio(e), "gens": genitives(e),
            }
            key = (w, g)
            old = cands.get(key)
            if old is None or rec["ns"] > old["ns"]:
                if old:
                    rec["e2"] = rec["e2"] or old["e"]
                cands[key] = rec

    # Resolve "female equivalent of Freund" -> "female friend"
    for (w, g), r in list(cands.items()):
        if r.get("df"):
            prefix, base = r["df"]
            src = next((cands[(base, gg)] for gg in "mnf" if (base, gg) in cands), None)
            if src and src["e"]:
                r["e"] = prefix + src["e"].split(",")[0].strip()
            else:
                del cands[(w, g)]

    # Homographs with different genders. Wiktionary lists many obscure secondary meanings
    # (das Fall = halyard), so only well-known pairs keep both entries (der See / die See).
    # The first letter in each value is the primary (most common) gender.
    by_word = defaultdict(dict)
    for (w, g), r in cands.items():
        by_word[w][g] = r
    rows = []
    for w, rs in by_word.items():
        if len(rs) == 1:
            r = next(iter(rs.values()))
            r["h"] = ""
            rows.append(r)
            continue
        if w in MERGE:
            prim = rs.get(MERGE[w][0]) or max(rs.values(), key=lambda r: r["ns"])
            prim["a"] = "".join(sorted(set(prim["a"] + "".join(g for g in MERGE[w][1:] if g in rs))))
            prim["h"] = ""
            rows.append(prim)
            continue
        keep = HOMOGRAPHS.get(w)
        if keep is None:
            keep = max(rs.values(), key=lambda r: r["ns"])["g"]
        keep = [g for g in keep if g in rs]
        for i, g in enumerate(keep):
            r = rs[g]
            r["h"] = "".join(sorted(set(keep) - {g}))
            r["a"] = "".join(a for a in r["a"] if a not in keep)
            r["s"] = r["s"] * (1.0 if i == 0 else 0.5)
            rows.append(r)
    rows = [r for r in rows if r["s"] > 0]
    rows.sort(key=lambda r: (-r["s"], r["w"]))
    rows = rows[:limit]

    # Native recordings of the inflected forms, by the speaker who recorded der/die/das.
    # When Wiktionary lists two genitives (Systems / Systemes), teach the one with a recording.
    clips = audio_clips.Clips([nouns_path])
    weak = lambda r: (r["acc"] or r["dat"]).split(" ")[0]
    audio_clips.resolve(clips, sorted({x for r in rows for x in [r["p"], weak(r), *r["gens"], gen_form(r)] if x}))
    switched = 0
    for r in rows:
        if r["gen"] and not clips.name(r["gen"]):
            alt = next((x for x in r["gens"] if x != r["w"] and clips.name(x)), None)
            if alt:
                r["gen"] = alt
                switched += 1
        r["pa"] = clips.code(r["p"]) if r["p"] and r["p"] != "-" else ""
        r["ga"] = clips.code(gen_form(r)) if r["g"] in "mn" else ""
        r["wa"] = clips.code(weak(r)) if weak(r) else ""
    has = lambda k: sum(1 for r in rows if r[k])
    print(f"form recordings: plural {has('pa')}/{sum(1 for r in rows if r['p'] and r['p'] != '-')}, "
          f"genitive {has('ga')}/{sum(1 for r in rows if r['g'] in 'mn')} ({switched} switched to the recorded variant), "
          f"weak {has('wa')}/{sum(1 for r in rows if weak(r))}")

    fields = ["w", "g", "a", "h", "p", "e", "e2", "gen", "acc", "dat", "x", "xe", "au", "pa", "ga", "wa"]
    out = {
        "v": 1,
        "source": "Wiktionary (wiktextract/kaikki.org), OpenSubtitles frequency (hermitdave/FrequencyWords), Leipzig Corpora Collection deu_mixed-typical_2011_1M; CC BY-SA",
        "fields": fields,
        "rows": [[r[k] for k in fields] for r in rows],
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    from collections import Counter
    print("candidates", len(cands), "with freq", sum(1 for r in by_word.values() for x in r.values() if x["s"] > 0))
    print("written", len(rows), Counter(r["g"] for r in rows))
    print("top 60:", " ".join(f"{r['g']}:{r['w']}" for r in rows[:60]))
    print("last 10:", " ".join(f"{r['g']}:{r['w']}" for r in rows[-10:]))


if __name__ == "__main__":
    main()
