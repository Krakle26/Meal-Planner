# Getting Mise onto GitHub and GitHub Pages

> **This is done.** The folder is a repository, `origin` points at
> `https://github.com/Krakle26/Meal-Planner.git`, and `main` has been
> pushed. Day-to-day updates are in `UPDATING.md`; the rest of this file is
> kept as the record of how it was set up, and for doing it again on
> another machine.

Your commands were close. Two things need changing before they'll work.

**You can't `cd` into a zip.** Windows shows an archive as if it were a
folder, but the command line can't enter one. It has to be extracted first.

**Don't extract in place.** `Downloads` has everything else you've ever
downloaded in it, and `git add .` would commit the lot. The files need
their own folder.

---

## 1. Extract to its own folder

In File Explorer, right-click `Misu.zip` → **Extract All…** and set the
destination to:

```
C:\Users\richa\Documents\Meal Planner App
```

Anywhere is fine as long as it's an empty folder that isn't Downloads.

Check what landed. You should see exactly this, with `netlify` as a folder
containing a `functions` folder inside it:

```
index.html
manifest.json
sw.js
version.txt
netlify.toml
netlify\functions\fetch-recipe.js
README.md
DEPLOYING.md
```

If extracting produced a single folder with everything nested inside it,
step into that folder instead — `index.html` has to be at the top level or
the published site won't find it.

---

## 2. Push it

Open PowerShell and run these one at a time:

```powershell
cd "C:\Users\richa\Documents\Meal Planner App"

git init -b main
git add .
git commit -m "Mise: recipes, planning and shopping"
git remote add origin https://github.com/Krakle26/Meal-Planner.git
git push -u origin main
```

The account is **Krakle26**, not `Krakle` — both exist on GitHub, and the
wrong one costs you a confusing detour: GitHub answers a repository it
won't show you with a login prompt rather than a 404, so a URL typo looks
exactly like an authentication problem.

If `git push` asks you to sign in, use the browser prompt rather than
typing a password — GitHub stopped accepting account passwords for Git in
2021, so a password will simply be rejected.

If it refuses because the repository already has content, this pulls that
in first:

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 3. Turn on GitHub Pages

In the repository on github.com: **Settings → Pages**. Under *Build and
deployment*, set the source to **Deploy from a branch**, pick `main` and
the `/ (root)` folder, and save.

There is nothing to compile, so no build step or workflow is needed.

---

## 4. Check it worked

```
https://krakle26.github.io/Meal-Planner/version.txt
```

It should read the build string from `version.txt`. If it 404s, Pages
hasn't published yet — the repository's **Actions** tab shows the run.

Note that the recipe fetcher at `/.netlify/functions/fetch-recipe` will
404, and that is expected: Pages serves static files only. Link import
falls back to a public relay and keeps working. See `DEPLOYING.md`.

---

## Afterwards

Deploying becomes three commands:

```powershell
git add .
git commit -m "what changed"
git push
```

GitHub Pages republishes within a minute or so.

Two habits worth keeping:

- **Bump the build string** in `version.txt` and in `index.html` (the line
  `const BUILD = "…"`) whenever you change something. They should always
  match. When they don't, the app is serving a cached copy — and you'll
  know that immediately instead of debugging the wrong thing.
- **Push, don't upload.** Pages publishes whatever is on `main`. Editing a
  file through github.com works too, but then your computer is behind —
  `git pull` before the next change or the push will be rejected.

## One thing not to commit

Nothing in these files holds a secret — your GitHub token and any API key
live in the browser on your phone, not on disk. So this repository is safe
to make public if you want.

Worth remembering as the app grows: if you ever add a file with a key in
it, Git keeps it in the history even after you delete it, so it has to be
kept out from the start.
