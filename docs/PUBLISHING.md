# Publishing & updating Seedlang

**How it will work:** the code lives in a GitHub repository. Every time a change is pushed to the `main` branch, GitHub Actions builds the app and publishes it to GitHub Pages at a fixed address:

**App:** https://rezabina86.github.io/German-practice/ · **Repository:** https://github.com/rezabina86/German-practice The iPhone Home Screen app loads from that address, so it gets each new version automatically, and your progress on the phone stays where it is.

Status legend: ☑ done · ☐ to do · **You** = your decision or action · **Claude** = I do it here

---

## 0. Decisions before anything happens (You)

- ☑ **D1 · Repository name:** `German-practice` → address `https://rezabina86.github.io/German-practice/`. The name becomes part of the URL, so changing it later changes the app's address. A new address means a new app on the phone, and you'd move your progress with a backup.
- ☑ **D2 · Public** (the repository is public). Background: GitHub Pages is free for **public** repos: anyone could read the code and word lists, but not your progress, which never leaves your devices. A **private** repo with Pages needs a paid GitHub plan; otherwise we'd use another free host such as Cloudflare Pages, which needs you to sign in once.
- ☐ **D3 · Code licence (optional).** The word data must stay CC BY-SA (already credited in the app and in `public/data/LICENSE.md`). For your own code you can pick a licence (e.g. MIT) or none ("all rights reserved").
- ☐ **D4 · Custom domain (optional, can wait).** E.g. `seedlang.yourdomain.com`. Can be added later, but it changes the address (see D1).

---

## 1. Prepare the project — local only, nothing goes online (Claude)

- ☑ **1.1 Put the project under version control.** `git init` on a `main` branch. Exclude `node_modules/`, `dist/`, local tool settings (`.claude/`) and raw source data. Commit the generated `public/data/*.json` files, so publishing never needs the 1.6 GB of raw data.
- ☑ **1.2 Automatic deploy.** Add `.github/workflows/deploy.yml`: on every push to `main` (or a manual "Run workflow"), install with `npm ci` on Node 22, type-check, build, and publish to GitHub Pages. A broken build stops before publishing, so the live app stays on the last good version.
- ☑ **1.3 One command to check everything.** Add `npm run check` (type-check + lint + production build), run before every update.
- ☑ **1.4 Keep the data rebuildable.** The raw sources the data scripts use (Wiktionary dumps, subtitle frequencies, Leipzig corpus, Goethe lists) currently sit in a temporary folder that will be deleted. Add `scripts/fetch_sources.sh` to re-download them into a git-ignored `data-raw/` folder. Add `npm run data:nouns`, `npm run data:verbs` and `npm run data:phrases` so a content update is one command.
- ☑ **1.5 Visible updates on the phone.** Today a new version installs silently and appears only on the next launch, which on iPhone can feel random. Change to an **"Update available — tap to refresh"** banner (vite-plugin-pwa *prompt* mode), so you always know when a new version is there.
- ☑ **1.6 Protect your progress across updates.**
  - Keep the storage name `seedlang-artikel-v1` forever. Changing it would make the app start empty.
  - Add a `migrate()` step to the progress store, so future changes to the saved format convert old progress instead of dropping it.
  - Document how progress is keyed: nouns by `Wort|gender`, verbs by `v:<infinitive>`, phrases by `p:<German text>`. Editing a phrase's German text resets that one phrase's progress; adding new words or phrases never affects existing progress.
- ☑ **1.7 Version label.** Show "Version: build date + commit" at the bottom of Settings, so you can check that the phone has the latest version.
- ☑ **1.8 First commit.** Run `npm run check`, then commit everything locally.

---

## 2. Publish — goes online, needs your OK (Claude)

- ☑ **2.1 Push `main`** to `rezabina86/German-practice` (the repository already exists, public and empty).
- ☑ **2.2 Turn on GitHub Pages** with source "GitHub Actions".
- ☑ **2.3 Watch the first deploy.** If the Linux build server behaves differently from your Mac, fix it and push again.
- ☑ **2.4 Smoke test the live site.** It loads; a lesson in each course works; native-speaker audio plays; after one visit it works offline; the address in the Settings install guide is right.

---

## 3. Install on your iPhone (You, about 3 minutes)

The app is live at **https://rezabina86.github.io/German-practice/**

- ☐ **3.1 Back up your current progress.** In the app you've been using (e.g. the browser pane on your Mac): Settings → **Export**. Save or AirDrop the file to your iPhone, or put it in iCloud Drive.
- ☐ **3.2 Install.** On the iPhone, open the address in **Safari** → **Share** → **Add to Home Screen**.
- ☐ **3.3 Import.** Open Seedlang **from the Home Screen icon** (not Safari) → Settings → **Import** → pick the backup file. The Home Screen app keeps its own data, separate from Safari.
- ☐ **3.4 Offline check.** Turn on airplane mode, open the app, do one lesson.

---

## 4. Updating later (repeatable)

**Option A — ask Claude** in this project folder, e.g. *"add 20 B2 phrases about budgets and publish"*. I make the change, run `npm run check`, test it locally, commit and push. GitHub publishes about 2 minutes later.

**Option B — yourself:**

```bash
npm run dev            # try the change at http://localhost:5173
npm run check          # type-check, lint, build
git add -A && git commit -m "Describe the change"
git push               # GitHub Actions publishes it
```

**On the iPhone:** open the app → tap the **Update available** banner (after 1.5). Your progress stays.

**Content updates:**

| What | Edit | Then run |
|---|---|---|
| Verbs | `scripts/verbs_it.txt` (one line per verb) | `npm run data:verbs` (re-checks every example against Wiktionary) |
| Phrases | `scripts/phrases_it.txt` (one line per phrase) | `npm run data:phrases` (spell-checks every word) |
| Nouns | `scripts/build_nouns.py` | `scripts/fetch_sources.sh` once, then `npm run data:nouns` |

**Safety rules:**
- Export a backup before big updates. It takes 2 seconds and is your safety net.
- Never rename the storage key or the repository/address (see D1).
- If an update breaks something, `git revert <commit>` and push: the previous version is republished within minutes, and progress is untouched.

---

## 5. Known limits (decide later if they matter)

- **No sync between devices.** iPhone and Mac each keep their own progress; moving it means export/import. Automatic sync would need a small online backend with a login, so it's a separate project.
- **iOS clean-up.** iOS may clear data of web apps that haven't been opened for weeks. The app asks for persistent storage, and regular use plus occasional backups cover the rest.
- **Audio needs internet the first time.** Native-speaker recordings stream from Wikimedia Commons and are cached after the first play. Sentences use the phone's built-in voice, which works offline.
- **Public repository** (if chosen in D2): the code and course content are visible to anyone; your progress never is.
- **GitHub Actions housekeeping.** GitHub occasionally retires old versions of the build actions and shows warnings in the run log (e.g. "Node.js 20 is deprecated"). When that happens, update the version numbers in `.github/workflows/deploy.yml`, or ask Claude to.
