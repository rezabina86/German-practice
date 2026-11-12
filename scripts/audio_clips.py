#!/usr/bin/env python3
"""Native-speaker recordings for words and inflected forms (shared by build_nouns.py / build_verbs.py).

Seedlang only plays real recordings from Wikimedia Commons, by one Berlin speaker (Commons user
Jeuwre), so stitched phrases like "er hat umgesetzt" or "die Zeiten" use a single voice.
Jeuwre recorded inflected forms too (De-setzt.ogg, De-umgesetzt.ogg, De-Zeiten.ogg, De-Mannes.ogg).

A word's Jeuwre clip is found, in this order:
  1. a recording that Wiktionary tags "Berlin" (all of those are Jeuwre's),
  2. an untagged Wiktionary recording whose Commons uploader is Jeuwre,
  3. File:De-<word>.ogg / De-<word>2.ogg (and -3/-4 when known) on Commons, uploaded by Jeuwre,
     which finds the many files no Wiktionary page links yet.

Steps 2 and 3 need the Commons API. Answers are kept in scripts/commons_jeuwre.json (committed),
so rebuilds work offline. Pass --commons to a build script to look up files it has not seen yet.

Clip codes in the JSON are relative to the word they belong to, to keep the data small:
  "66"                -> 66/De-<word>.ogg
  "86:2"              -> 86/De-<word>2.ogg
  "1f/De-other.ogg"   -> any other file name (full path, the format of the existing `au` field)
The app turns these into upload.wikimedia.org MP3 URLs (src/lib/audio.ts, clipPath/clipUrl).
"""
import hashlib
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "commons_jeuwre.json")
SPEAKER = "Jeuwre"
UA = "SeedlangBuild/1.0 (German learning app; data build script)"


def commons_path(name):
    """'De-Zeiten.ogg' -> '66/De-Zeiten.ogg' (Commons stores files under md5 prefixes)."""
    name = name.replace(" ", "_")
    return f"{hashlib.md5(name.encode('utf-8')).hexdigest()[:2]}/{name}"


def code_for(word, name):
    path = commons_path(name)
    h, file = path.split("/", 1)
    if file == f"De-{word}.ogg":
        return h
    m = re.fullmatch(rf"De-{re.escape(word)}(\d+)\.ogg", file)
    return f"{h}:{m.group(1)}" if m else path


class Clips:
    def __init__(self, jsonl_paths, cache_path=CACHE):
        self.sounds = {}  # word -> {file name: tags}
        for p in jsonl_paths:
            with open(p, encoding="utf-8") as f:
                for line in f:
                    if '"sounds"' not in line:
                        continue
                    e = json.loads(line)
                    for s in e.get("sounds", []):
                        name = s.get("audio")
                        if name and s.get("mp3_url"):
                            self.sounds.setdefault(e.get("word"), {})[name.replace(" ", "_")] = set(s.get("tags") or [])
        self.cache_path = cache_path
        self.cache = {}  # file name -> uploader, or "" when the file does not exist
        if os.path.exists(cache_path):
            with open(cache_path, encoding="utf-8") as f:
                self.cache = json.load(f)["files"]
        self.unknown = set()

    def name(self, word):
        """File name of Jeuwre's recording of `word`, or None. Unchecked files are noted in self.unknown."""
        if not word:
            return None
        cands = self.sounds.get(word, {})
        tagged = sorted(n for n, t in cands.items() if "Berlin" in t)
        if tagged:
            return tagged[0]
        for n in sorted(cands):
            if n.startswith("LL-"):
                continue  # Lingua Libre files are named after their speaker
            u = self.cache.get(n)
            if u is None:
                self.unknown.add(n)
            elif u == SPEAKER:
                return n
        for suf in ("", "2", "3", "4"):
            n = f"De-{word}{suf}.ogg".replace(" ", "_")
            u = self.cache.get(n)
            if u is None and suf in ("", "2") and n not in cands:
                self.unknown.add(n)
            elif u == SPEAKER:
                return n
        return None

    def code(self, word):
        n = self.name(word)
        return code_for(word, n) if n else ""

    def path(self, word):
        n = self.name(word)
        return commons_path(n) if n else ""

    def refresh(self):
        """Ask the Commons API about every file noted in self.unknown, and save the answers."""
        todo = sorted(self.unknown - set(self.cache))
        print(f"  Commons: checking {len(todo)} files …", flush=True)
        for i in range(0, len(todo), 50):
            chunk = todo[i:i + 50]
            params = {"action": "query", "format": "json", "prop": "imageinfo", "iiprop": "user",
                      "titles": "|".join("File:" + n for n in chunk)}
            url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
            for attempt in range(8):
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": UA})
                    d = json.load(urllib.request.urlopen(req, timeout=30))
                    break
                except Exception as err:  # HTTP 429 when asked too fast
                    if attempt == 7:
                        raise
                    print(f"  Commons: {err}, retrying", flush=True)
                    time.sleep(min(90, 10 * 2 ** attempt))
            norm = {x["to"]: x["from"] for x in d["query"].get("normalized", [])}
            for page in d["query"]["pages"].values():
                n = norm.get(page["title"], page["title"])[len("File:"):].replace(" ", "_")
                info = (page.get("imageinfo") or [{}])[0]
                self.cache[n] = "" if "missing" in page else info.get("user", "")
            self.save()
            time.sleep(3)
        self.unknown = set()

    def save(self):
        with open(self.cache_path, "w", encoding="utf-8") as f:
            f.write('{"about": "Uploader of Wikimedia Commons pronunciation files (\\"\\" = no such file). '
                    'Written by scripts/audio_clips.py; refresh with --commons.",\n"files": {\n')
            items = sorted(self.cache.items())
            f.write(",\n".join(f"{json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)}" for k, v in items))
            f.write("\n}}\n")


def resolve(clips, words):
    """Look up `words`; with --commons on the command line, first fetch unknown files from Commons."""
    for w in words:
        clips.name(w)
    if clips.unknown:
        if "--commons" in sys.argv:
            clips.refresh()
        else:
            print(f"  note: {len(clips.unknown)} possible recordings not checked on Commons yet (rebuild with --commons)")
